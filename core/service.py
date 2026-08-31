"""领域服务：Direction / Idea / Version / Experiment / Literature 的高层读写。

对齐 docs/technical-plan.md §4（字段 schema）与 §13（results 协议冻结：
results.json 只含 metrics + 可选 metricSchema，params 归 config.json）。
"""
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from . import domain
from .storage import (
    CounterStore,
    DataRoot,
    DirectionLayout,
    atomic_write_json,
    atomic_write_text,
    read_json,
)

SCHEMA_VERSION = 1


# ---------------------------------------------------------------- 定位辅助

def _iter_directions() -> list[tuple[str, DirectionLayout, dict]]:
    """返回 [(direction_id, layout, entry)]。"""
    dr = DataRoot()
    reg = read_json(dr.directions_file, {}) or {}
    out = []
    for did, entry in reg.items():
        if entry.get("deletedAt"):
            continue
        out.append((did, DirectionLayout(entry["root_path"]), entry))
    return out


def _find_idea_root(idea_id: str) -> DirectionLayout:
    for _did, layout, _entry in _iter_directions():
        if layout.idea_meta(idea_id).exists():
            return layout
    raise KeyError(f"idea not found: {idea_id}")


def _find_version_root(version_id: str) -> DirectionLayout:
    for _did, layout, _entry in _iter_directions():
        if layout.version_meta(version_id).exists():
            return layout
    raise KeyError(f"version not found: {version_id}")


def _find_exp_root(exp_id: str) -> DirectionLayout:
    for _did, layout, _entry in _iter_directions():
        if layout.exp_dir(exp_id).exists():
            return layout
    raise KeyError(f"experiment not found: {exp_id}")


def _alpha_name(seq: int) -> str:
    """1 -> a1, 2 -> a2 …（version 命名）"""
    return f"a{seq}"


# ---------------------------------------------------------------- Direction

def create_direction(name: str, repo_path: str | Path, git_remote: str | None = None) -> dict:
    dr = DataRoot()
    did = domain.new_id("dir")
    now = domain.utc_now()
    cfg = {
        "schemaVersion": SCHEMA_VERSION,
        "id": did,
        "name": name,
        "repoPath": str(repo_path),
        "gitRemote": git_remote,
        "createdAt": now,
        "defaultParams": [],
        "defaultMetrics": [],
        "metricDeclarations": {},
    }
    layout = DirectionLayout(repo_path)
    layout.init(cfg)
    dr.register_direction({
        "id": did, "name": name, "root_path": str(repo_path),
        "git_remote": git_remote, "createdAt": now,
    })
    return {"direction_id": did, "name": name, "repo_path": str(repo_path), "createdAt": now}


def list_directions(include_archived: bool = False) -> list[dict]:
    dr = DataRoot()
    reg = read_json(dr.directions_file, {}) or {}
    out = []
    for did, entry in reg.items():
        if not include_archived and entry.get("deletedAt"):
            continue
        out.append({"id": did, **entry})
    return out


def get_direction(direction_id: str) -> dict:
    dr = DataRoot()
    reg = read_json(dr.directions_file, {}) or {}
    entry = reg.get(direction_id)
    if not entry:
        raise KeyError(f"direction not found: {direction_id}")
    return {"id": direction_id, **entry}


# ---------------------------------------------------------------- Literature（M1 先建最小 CRUD）

def add_paper(title: str, directions: list[str] | None = None, authors: list[str] | None = None,
              year: int | None = None, venue: str | None = None, tags: list[str] | None = None,
              notes: str | None = None, pdf_path: str | None = None) -> dict:
    dr = DataRoot()
    lit_id = domain.new_id("lit")
    meta = {
        "schemaVersion": SCHEMA_VERSION,
        "id": lit_id,
        "title": title,
        "authors": authors or [],
        "year": year,
        "venue": venue,
        "tags": tags or [],
        "directions": directions or [],
        "readState": "unread",
        "notes": notes or "",
        "derivedIdeaIds": [],
        "pdfPath": pdf_path,
        "createdAt": domain.utc_now(),
        "deletedAt": None,
    }
    atomic_write_json(dr.literature_meta(lit_id), meta)
    return meta


def search_papers(direction_id: str | None = None, query: str | None = None,
                  tags: list[str] | None = None, limit: int = 100) -> list[dict]:
    dr = DataRoot()
    if not dr.literature_dir.exists():
        return []
    out = []
    for meta_path in sorted(dr.literature_dir.glob("*/meta.json")):
        meta = read_json(meta_path)
        if not meta or meta.get("deletedAt"):
            continue
        if direction_id and direction_id not in (meta.get("directions") or []):
            continue
        if tags:
            if not set(tags) <= set(meta.get("tags") or []):
                continue
        if query:
            hay = " ".join([meta.get("title", ""), " ".join(meta.get("authors") or []),
                            meta.get("notes", "")])
            if query.lower() not in hay.lower():
                continue
        out.append(meta)
        if len(out) >= limit:
            break
    return out


# ---------------------------------------------------------------- Idea（= 方向仓库的一条 git 分支）

def create_idea(direction_id: str, name: str, hypothesis: str | None = None,
                parent_idea_id: str | None = None, git_branch: str | None = None,
                related_paper_ids: list[str] | None = None, git_applied: bool = False) -> dict:
    """v0.1 记录 git_branch 字符串；git 真操作由 mcp 层负责（git branch 只建不切）。"""
    get_direction(direction_id)  # 校验存在
    iid = domain.new_id("idea")
    if not git_branch:
        git_branch = f"idea/{iid[:8]}"
    now = domain.utc_now()
    meta = {
        "schemaVersion": SCHEMA_VERSION,
        "id": iid,
        "directionId": direction_id,
        "parentIdeaId": parent_idea_id,
        "name": name,
        "status": domain.IDEA_ACTIVE,
        "hypothesis": hypothesis or "",
        "gitBranch": git_branch,
        "relatedPaperIds": related_paper_ids or [],
        "createdAt": now,
        "updatedAt": now,
        "createdBy": "human",
        "deletedAt": None,
    }
    layout = DirectionLayout(get_direction(direction_id)["root_path"])
    atomic_write_json(layout.idea_meta(iid), meta)
    # 同步 literature.derivedIdeaIds（单一写路径维护）
    for pid in meta["relatedPaperIds"]:
        _link_paper_to_idea(pid, iid, write_back=True)
    return meta


def list_ideas(direction_id: str | None = None, include_archived: bool = False) -> list[dict]:
    out = []
    for did, layout, _entry in _iter_directions():
        if direction_id and did != direction_id:
            continue
        ideas_dir = layout.research / "ideas"
        if not ideas_dir.exists():
            continue
        for meta_path in sorted(ideas_dir.glob("*/meta.json")):
            meta = read_json(meta_path)
            if meta and (include_archived or not meta.get("deletedAt")):
                out.append(meta)
    return out


def update_idea_status(idea_id: str, status: str) -> dict:
    if status not in domain.IDEA_ALL_STATUS:
        raise ValueError(f"invalid idea status: {status}")
    layout = _find_idea_root(idea_id)
    meta = read_json(layout.idea_meta(idea_id))
    meta["status"] = status
    meta["updatedAt"] = domain.utc_now()
    if status == domain.IDEA_ABANDONED:
        meta["deletedAt"] = domain.utc_now()
    atomic_write_json(layout.idea_meta(idea_id), meta)
    return meta


# ---------------------------------------------------------------- Version（= 某分支上的某次 commit）

def create_version(idea_id: str, commit: str | None = None, note: str | None = None,
                   git_resolved: bool = False) -> dict:
    layout = _find_idea_root(idea_id)
    cs = CounterStore(layout.counters)
    name = _alpha_name(cs.bump("version_seq"))
    vid = domain.new_id("v")
    meta = {
        "schemaVersion": SCHEMA_VERSION,
        "id": vid,
        "ideaId": idea_id,
        "name": name,
        "gitRef": (commit or "")[:8] or None,
        "fullGitRef": commit or None,
        "status": "active",
        "message": note or "",
        "createdAt": domain.utc_now(),
        "deletedAt": None,
        "gitResolved": git_resolved,
    }
    atomic_write_json(layout.version_meta(vid), meta)
    return meta


def list_versions(idea_id: str | None = None, include_archived: bool = False) -> list[dict]:
    out = []
    for _did, layout, _entry in _iter_directions():
        vdir = layout.research / "versions"
        if not vdir.exists():
            continue
        for meta_path in sorted(vdir.glob("*/meta.json")):
            meta = read_json(meta_path)
            if not meta or (not include_archived and meta.get("deletedAt")):
                continue
            if idea_id and meta.get("ideaId") != idea_id:
                continue
            out.append(meta)
    return out


# ---------------------------------------------------------------- Experiment（params 键值，字段不写死）

def create_experiment(version_id: str, params: dict[str, Any] | None = None,
                      name: str | None = None, created_by: str = "agent",
                      git_ref: str | None = None) -> dict:
    layout = _find_version_root(version_id)
    # 实验 id 用全局计数器（跨方向唯一），避免 _find_exp_root 跨方向歧义
    cs = CounterStore(DataRoot().counters)
    seq = cs.bump("exp_seq")
    eid = f"exp-{seq:03d}"
    now = domain.utc_now()
    meta = {
        "schemaVersion": SCHEMA_VERSION,
        "id": eid,
        "versionId": version_id,
        "name": name or f"run-{seq:03d}",
        "status": domain.STATUS_PENDING,
        "createdAt": now,
        "finishedAt": None,
        "runtimeS": None,
        "createdBy": created_by,
        "gitRef": git_ref,
        "heartbeatAt": None,
        "warning": False,
    }
    atomic_write_json(layout.exp_meta(eid), meta)
    atomic_write_json(layout.exp_config(eid), params or {})   # params 归 config.json
    atomic_write_json(layout.exp_status(eid), {
        "state": domain.STATUS_PENDING,
        "history": [{"state": domain.STATUS_PENDING, "at": now, "by": created_by}],
    })
    # results.json 由 agent / Watcher 写，创建时不生成
    return {**meta, "params": params or {}}


def update_experiment_status(exp_id: str, status: str, finished_at: str | None = None,
                             error: str | None = None) -> dict:
    if status not in domain.ALL_STATUS:
        raise ValueError(f"invalid status: {status}")
    layout = _find_exp_root(exp_id)
    meta = read_json(layout.exp_meta(exp_id))
    cur = meta["status"]
    if not domain.can_transition(cur, status):
        raise ValueError(f"invalid transition {cur} -> {status}")
    # 先 append status.json（审计日志），再更新 meta（权威状态）
    hist = read_json(layout.exp_status(exp_id)) or {"state": cur, "history": []}
    now = domain.utc_now()
    hist["state"] = status
    hist["history"].append({"state": status, "at": now, "by": "agent", "error": error})
    atomic_write_json(layout.exp_status(exp_id), hist)
    meta["status"] = status
    if status in domain.TERMINAL_STATUS:
        meta["finishedAt"] = finished_at or now
        if status == domain.STATUS_DONE:
            res = read_json(layout.exp_results(exp_id))
            meta["warning"] = not (res and res.get("metrics"))
        else:
            meta["warning"] = False
        # 事件（供 /events/poll；索引是缓存，写失败不阻断主流程）
        try:
            from .index import append_event
            append_event(None, "experiment.finished",
                         {"experiment_id": exp_id, "status": status,
                          "finished_at": meta["finishedAt"]})
        except Exception:
            pass
    if error:
        meta["error"] = error
    atomic_write_json(layout.exp_meta(exp_id), meta)
    return meta


def set_metrics(exp_id: str, metrics: dict[str, Any],
                metric_schema: dict[str, Any] | None = None) -> dict:
    layout = _find_exp_root(exp_id)
    res = read_json(layout.exp_results(exp_id)) or {}
    old = res.get("metrics") or {}
    # metric_history 快照（评审修订：覆盖保留历史）
    res.setdefault("metric_history", []).append({"at": domain.utc_now(), "metrics": old})
    res["metrics"] = metrics
    if metric_schema:
        res["metricSchema"] = metric_schema
    atomic_write_json(layout.exp_results(exp_id), res)
    return {
        "experiment_id": exp_id,
        "metrics_count": len(metrics),
        "overwritten_keys": sorted(set(old) & set(metrics)),
    }


def get_experiment(exp_id: str) -> dict:
    layout = _find_exp_root(exp_id)
    meta = read_json(layout.exp_meta(exp_id))
    params = read_json(layout.exp_config(exp_id), {})
    results = read_json(layout.exp_results(exp_id), {})
    return {**meta, "params": params, **results}


def list_experiments(direction_id: str | None = None, idea_id: str | None = None,
                     version_id: str | None = None, status: str | None = None,
                     limit: int = 100) -> list[dict]:
    out = []
    for did, layout, _entry in _iter_directions():
        if direction_id and did != direction_id:
            continue
        edir = layout.research / "experiments"
        if not edir.exists():
            continue
        for exp_dir in sorted(edir.iterdir()):
            meta = read_json(exp_dir / "meta.json")
            if not meta or meta.get("deletedAt"):
                continue
            if idea_id:
                vm = read_json(layout.version_meta(meta.get("versionId", ""))) or {}
                if vm.get("ideaId") != idea_id:
                    continue
            if version_id and meta.get("versionId") != version_id:
                continue
            if status and meta.get("status") != status:
                continue
            out.append(meta)
            if len(out) >= limit:
                break
        if len(out) >= limit:
            break
    return out


# ---------------------------------------------------------------- Analysis（Markdown + front-matter）

def write_analysis(exp_id: str, content: str, references: list[str] | None = None,
                   source: str = "agent", author: str | None = None) -> dict:
    layout = _find_exp_root(exp_id)
    an_id = domain.new_id("an")
    now = domain.utc_now()
    refs = references or []
    front = (
        "---\n"
        f"id: {an_id}\n"
        f"experimentId: {exp_id}\n"
        f"source: {source}\n"
        f"author: \"{author or source}\"\n"
        f"createdAt: \"{now}\"\n"
        "adopted: false\n"
        f"references: {json.dumps(refs, ensure_ascii=False)}\n"
        "---\n\n"
    )
    path = layout.exp_analyses(exp_id) / f"{an_id}.md"
    atomic_write_text(path, front + content.strip() + "\n")
    return {"analysis_id": an_id, "experiment_id": exp_id,
            "source": source, "references": refs, "createdAt": now}


def get_analyses(exp_id: str) -> list[dict]:
    layout = _find_exp_root(exp_id)
    adir = layout.exp_analyses(exp_id)
    if not adir.exists():
        return []
    out = []
    for md in sorted(adir.glob("*.md")):
        text = md.read_text(encoding="utf-8")
        front = {}
        m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
        if m:
            for line in m.group(1).splitlines():
                if ":" in line:
                    k, _, v = line.partition(":")
                    front[k.strip()] = v.strip().strip('"')
        out.append({"id": front.get("id", md.stem),
                    "experimentId": front.get("experimentId", exp_id),
                    "source": front.get("source", "agent"),
                    "author": front.get("author", "agent"),
                    "createdAt": front.get("createdAt", ""),
                    "adopted": front.get("adopted", "false") == "true",
                    "references": json.loads(front.get("references", "[]")),
                    "content": text})
    # 未读状态来自全局 read_state.json（不进 md、不进索引，rebuild 不丢）
    dr = DataRoot()
    rs = read_json(dr.read_state, {}) or {}
    for item in out:
        item["is_read"] = bool((rs.get(item["id"]) or {}).get("read"))
    return out


def mark_analysis_read(analysis_id: str, read: bool = True) -> dict:
    dr = DataRoot()
    rs = read_json(dr.read_state, {}) or {}
    rs[analysis_id] = {"read": read, "readAt": domain.utc_now() if read else None}
    atomic_write_json(dr.read_state, rs)
    return {"analysis_id": analysis_id, "is_read": read}


# ---------------------------------------------------------------- Proposal（agent 提议，人批准）

def create_proposal(version_id: str, title: str, rationale: str,
                    proposed_params: dict[str, Any] | None = None,
                    based_on_experiment_ids: list[str] | None = None,
                    confidence: float | None = None,
                    estimated_runtime: str | None = None) -> dict:
    layout = _find_version_root(version_id)
    pid = domain.new_id("pro")
    now = domain.utc_now()
    prop = {
        "schemaVersion": SCHEMA_VERSION,
        "id": pid,
        "versionId": version_id,
        "title": title,
        "rationale": rationale,
        "proposedParams": proposed_params or {},
        "basedOnExperimentIds": based_on_experiment_ids or [],
        "confidence": confidence,
        "estimatedRuntime": estimated_runtime,
        "status": "pending",
        "createdAt": now,
    }
    atomic_write_json(layout.research / "proposals" / f"{pid}.json", prop)
    return prop


def list_proposals(status: str | None = None) -> list[dict]:
    out = []
    for _did, layout, _entry in _iter_directions():
        pdir = layout.research / "proposals"
        if not pdir.exists():
            continue
        for f in sorted(pdir.glob("*.json")):
            p = read_json(f)
            if p and (not status or p.get("status") == status):
                out.append(p)
    return out


# ---------------------------------------------------------------- 受限软删除（agent 可标记，物理清理只留人/UI）

def mark_deleted(entity_type: str, entity_id: str, restore: bool = False) -> dict:
    """受限软删除 / 恢复：置 `deletedAt`（数据保留、查询默认过滤、可恢复）。

    entity_type ∈ {direction, paper, idea, version, experiment}。
    物理清理不在 agent 权限内（只留给 UI/REST 的显式 prune）。
    """
    now = domain.utc_now()
    target = None if restore else now

    if entity_type == "paper":
        dr = DataRoot()
        path = dr.literature_meta(entity_id)
    elif entity_type == "idea":
        layout = _find_idea_root(entity_id)
        path = layout.idea_meta(entity_id)
    elif entity_type == "version":
        layout = _find_version_root(entity_id)
        path = layout.version_meta(entity_id)
    elif entity_type == "experiment":
        layout = _find_exp_root(entity_id)
        path = layout.exp_meta(entity_id)
    elif entity_type == "direction":
        dr = DataRoot()
        reg = read_json(dr.directions_file, {}) or {}
        entry = reg.get(entity_id)
        if not entry:
            raise KeyError(f"direction not found: {entity_id}")
        entry["deletedAt"] = target
        atomic_write_json(dr.directions_file, reg)
        return {"entity_type": entity_type, "entity_id": entity_id,
                "deleted_at": target, "restored": restore}
    else:
        raise ValueError(f"unknown entity_type: {entity_type}")

    meta = read_json(path)
    if not meta:
        raise KeyError(f"{entity_type} not found: {entity_id}")
    meta["deletedAt"] = target
    atomic_write_json(path, meta)
    return {"entity_type": entity_type, "entity_id": entity_id,
            "deleted_at": target, "restored": restore}


# ---------------------------------------------------------------- 文献 ↔ Idea 关联（单一写路径维护 derivedIdeaIds）

def _link_paper_to_idea(paper_id: str, idea_id: str, write_back: bool = True) -> None:
    dr = DataRoot()
    meta = read_json(dr.literature_meta(paper_id))
    if not meta:
        return
    ids = list(meta.get("derivedIdeaIds") or [])
    if idea_id not in ids:
        ids.append(idea_id)
    meta["derivedIdeaIds"] = ids
    if write_back:
        atomic_write_json(dr.literature_meta(paper_id), meta)
