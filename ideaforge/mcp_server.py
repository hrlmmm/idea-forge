"""Idea Forge MCP server（官方 mcp SDK + FastMCP，v0.1 仅 stdio）。

对齐 docs/technical-plan.md §9-§10：25 个工具分 7 类；
- 返回信封 {ok, context:{direction_id, ts}, data}
- params/metrics 一律 dict 透传，不校验具体键名
- 权限：只读 / 只写新建 / 受限变更；无 delete、无执行代码

运行：python -m ideaforge.cli mcp   （stdio）
"""
from __future__ import annotations

from typing import Any

from core import service
from core.index import Index
from core.storage import DirectionLayout, read_json

from mcp.server.fastmcp import FastMCP

mcp = FastMCP("idea-forge")

_current_direction: str | None = None


def _ts() -> str:
    from core.domain import utc_now
    return utc_now()


def _data(data: Any) -> dict:
    return {"ok": True,
            "context": {"direction_id": _current_direction, "ts": _ts()},
            "data": data}


def _locate_exp(exp_id: str) -> DirectionLayout:
    from core.service import get_experiment  # noqa: F401  # 触发 KeyError 校验存在
    for _did, layout, _entry in service._iter_directions():
        if layout.exp_dir(exp_id).exists():
            return layout
    raise KeyError(f"experiment not found: {exp_id}")


# ================================================================ A. Direction

@mcp.tool()
def list_directions(include_archived: bool = False) -> dict:
    """列出所有研究方向（一个方向 = 一个仓库）。"""
    dirs = service.list_directions(include_archived)
    return _data({"directions": dirs, "total": len(dirs)})


@mcp.tool()
def create_direction(name: str, repo_path: str, git_remote: str | None = None) -> dict:
    """新建研究方向：初始化本地目录（.research/）并注册。"""
    return _data(service.create_direction(name, repo_path, git_remote))


@mcp.tool()
def switch_direction(direction_id: str) -> dict:
    """设定"当前方向"上下文（后续工具缺省作用于此方向）。"""
    global _current_direction
    _current_direction = direction_id
    return _data({"current": service.get_direction(direction_id)})


# ================================================================ B. Literature

@mcp.tool()
def search_papers(query: str = "", tags: list[str] | None = None,
                  direction_id: str | None = None, limit: int = 20) -> dict:
    """全文检索文献（标题/作者/笔记/标签），可按方向过滤。"""
    res = service.search_papers(direction_id=direction_id, query=query or None,
                                tags=tags, limit=limit)
    return _data({"results": res, "total": len(res)})


@mcp.tool()
def add_paper(title: str, authors: list[str] | None = None, year: int | None = None,
              venue: str | None = None, doi: str | None = None, url: str | None = None,
              tags: list[str] | None = None, directions: list[str] | None = None,
              abstract: str | None = None, notes: str | None = None,
              local_pdf_path: str | None = None) -> dict:
    """新增文献条目（全局库，可多方向共用）。"""
    meta = service.add_paper(title, directions=directions, authors=authors,
                             year=year, venue=venue, tags=tags, notes=notes,
                             pdf_path=local_pdf_path)
    return _data({"paper_id": meta["id"], "created_at": meta["createdAt"]})


@mcp.tool()
def update_paper(paper_id: str, fields: dict) -> dict:
    """更新文献可写字段（白名单：title/authors/year/venue/tags/directions/notes/readState）。"""
    from core.domain import PAPER_WRITABLE_FIELDS
    allowed = {k: v for k, v in fields.items() if k in PAPER_WRITABLE_FIELDS}
    if len(allowed) != len(fields):
        raise ValueError(f"非法字段，仅允许: {sorted(PAPER_WRITABLE_FIELDS)}")
    dr = service.DataRoot()
    meta = read_json(dr.literature_meta(paper_id))
    if not meta:
        raise KeyError(f"paper not found: {paper_id}")
    meta.update(allowed)
    service.atomic_write_json(dr.literature_meta(paper_id), meta)
    return _data({"paper_id": paper_id, "changed": sorted(allowed), "updated_at": service.domain.utc_now()})


@mcp.tool()
def link_paper_to_idea(paper_id: str, idea_id: str, unlink: bool = False) -> dict:
    """关联/解绑文献↔Idea（多对多）。"""
    layout = service._find_idea_root(idea_id)
    meta = read_json(layout.idea_meta(idea_id))
    rel = list(meta.get("relatedPaperIds") or [])
    if unlink:
        rel = [x for x in rel if x != paper_id]
    elif paper_id not in rel:
        rel.append(paper_id)
    meta["relatedPaperIds"] = rel
    service.atomic_write_json(layout.idea_meta(idea_id), meta)
    service._link_paper_to_idea(paper_id, idea_id)
    return _data({"paper_id": paper_id, "idea_id": idea_id,
                  "linked": not unlink, "idea_ids": rel})


# ================================================================ C. Idea

@mcp.tool()
def create_idea(direction_id: str | None = None, name: str = "", branch_name: str | None = None,
                hypothesis: str | None = None, parent_idea_id: str | None = None,
                base_ref: str | None = None,
                related_paper_ids: list[str] | None = None) -> dict:
    """新建 Idea（= 该方向仓库的一条 git 分支；v0.1 记录分支名，git 真操作降级可关）。"""
    dir_id = direction_id or _current_direction
    if not dir_id:
        raise ValueError("需要 direction_id 或先 switch_direction")
    meta = service.create_idea(dir_id, name, hypothesis, parent_idea_id,
                               branch_name, related_paper_ids)
    return _data({"idea_id": meta["id"], "name": meta["name"],
                  "branch_name": meta["gitBranch"], "git_applied": False,
                  "base_ref": base_ref, "parent_idea_id": parent_idea_id})


@mcp.tool()
def list_ideas(direction_id: str | None = None, status: list[str] | None = None,
               include_archived: bool = False) -> dict:
    """列出当前方向的全部 Idea。"""
    dir_id = direction_id or _current_direction
    ideas = service.list_ideas(dir_id, include_archived)
    if status:
        ideas = [i for i in ideas if i.get("status") in status]
    for i in ideas:
        i["experiment_count"] = len(service.list_experiments(idea_id=i["id"]))
        i["version_count"] = len(service.list_versions(idea_id=i["id"]))
    return _data({"ideas": ideas, "total": len(ideas)})


@mcp.tool()
def update_idea_status(idea_id: str, status: str) -> dict:
    """改 Idea 状态（active/validated/abandoned；不删分支）。"""
    return _data(service.update_idea_status(idea_id, status))


@mcp.tool()
def branch_idea(idea_id: str, new_name: str, hypothesis: str | None = None,
                base_ref: str | None = None) -> dict:
    """从某 Idea 分叉子 Idea（= 新开一条分支）。"""
    parent = read_json(service._find_idea_root(idea_id).idea_meta(idea_id))
    meta = service.create_idea(parent["directionId"], new_name, hypothesis,
                               parent_idea_id=idea_id, git_branch=base_ref)
    return _data({"child_idea_id": meta["id"], "name": meta["name"],
                  "branch_name": meta["gitBranch"], "parent_idea_id": idea_id,
                  "git_applied": False})


# ================================================================ D. Version

@mcp.tool()
def create_version(idea_id: str, commit: str | None = None, note: str | None = None) -> dict:
    """记录 commit 为版本（= 该分支上的某次提交）。"""
    meta = service.create_version(idea_id, commit, note)
    return _data({"version_id": meta["id"], "idea_id": idea_id,
                  "commit": commit, "short_hash": meta.get("gitRef"),
                  "git_resolved": bool(commit), "note": note,
                  "created_at": meta["createdAt"]})


@mcp.tool()
def list_versions(idea_id: str | None = None, limit: int = 100) -> dict:
    """列出版本。"""
    vers = service.list_versions(idea_id)[:limit]
    for v in vers:
        v["experiment_count"] = len(service.list_experiments(version_id=v["id"]))
    return _data({"versions": vers})


# ================================================================ E. Experiment

@mcp.tool()
def create_experiment(version_id: str, params: dict[str, Any], name: str | None = None,
                      description: str | None = None,
                      metric_schema: list[dict] | None = None,
                      status: str = "pending") -> dict:
    """新建实验（params 键值透传）。返回建议运行命令与结果文件约定。

    description：一句话说明这次实验想验证什么（agent 应尽量生成）；
    git commit 默认继承该 Version 的 commit（代码关联）。
    """
    meta = service.create_experiment(version_id, params, name, description,
                                     created_by="agent")
    layout = _locate_exp(meta["id"])
    results_file = str(layout.exp_results(meta["id"]))
    return _data({
        "experiment_id": meta["id"], "name": meta["name"],
        "description": meta.get("description") or "",
        "version_id": version_id, "status": meta["status"], "params": params,
        "git_ref": meta.get("gitRef"),
        "metric_schema": metric_schema or [],
        "suggested_command": (
            f"python train.py && python -m ideaforge.cli finalize "
            f"--exp {meta['id']} --results \"{results_file}\""),
        "results_file_convention": (
            f"results.json = {{\"metrics\": {{...}}, \"metricSchema\": {{...}}}} "
            f"@ {results_file}"),
        "created_at": meta["createdAt"]})


@mcp.tool()
def update_experiment_status(experiment_id: str, status: str,
                             finished_at: str | None = None,
                             error: str | None = None) -> dict:
    """状态机迁移 running/done/failed；终态写 finished_at；done 缺 metrics 给 warning。"""
    meta = service.update_experiment_status(experiment_id, status,
                                            finished_at, error)
    return _data({"experiment_id": experiment_id, "status": meta["status"],
                  "finished_at": meta.get("finishedAt"),
                  "warning": "missing_metrics" if meta.get("warning") else None})


@mcp.tool()
def set_metrics(experiment_id: str, metrics: dict[str, Any],
                metric_schema: list[dict] | None = None) -> dict:
    """写 metrics + 可选声明 schema（键值透传，覆盖保留 metric_history 快照）。"""
    schema = {m["key"]: {k: v for k, v in m.items() if k != "key"}
              for m in (metric_schema or [])} or None
    res = service.set_metrics(experiment_id, metrics, schema)
    return _data({"experiment_id": experiment_id, "metrics_count": len(metrics),
                  "overwritten_keys": res["overwritten_keys"]})


@mcp.tool()
def list_experiments(direction_id: str | None = None, idea_id: str | None = None,
                     version_id: str | None = None, status: str | None = None,
                     since: str | None = None, limit: int = 50) -> dict:
    """实验列表 + 键集合/基数自省（key_stats）。"""
    dir_id = direction_id or _current_direction
    exps = service.list_experiments(dir_id, idea_id, version_id, status, limit)
    if since:
        exps = [e for e in exps if (e.get("finishedAt") or "") > since]
    idx = Index()
    ks = idx.key_stats("direction", dir_id)
    idx.close()
    return _data({"experiments": exps, "key_stats": ks})


@mcp.tool()
def get_experiment(experiment_id: str) -> dict:
    """单实验全字段（params/metrics/metric_schema/analyses_count/source）。"""
    got = service.get_experiment(experiment_id)
    got["analyses_count"] = len(service.get_analyses(experiment_id))
    got["source"] = got.get("createdBy")
    return _data({"experiment": got})


# ================================================================ F. Analysis

@mcp.tool()
def write_analysis(experiment_id: str, content: str, references: list[str] | None = None,
                   source: str = "agent") -> dict:
    """写复盘（Markdown）。references 须引用实验实际存在的键名。"""
    res = service.write_analysis(experiment_id, content, references, source=source)
    return _data(res)


@mcp.tool()
def get_analyses(experiment_id: str, include_original: bool = True) -> dict:
    """取某实验的分析列表（含 is_read 未读状态）。"""
    return _data({"analyses": service.get_analyses(experiment_id)})


@mcp.tool()
def mark_read(analysis_id: str, read: bool = True) -> dict:
    """标记分析已读/未读（状态存全局 read_state.json，rebuild 不丢）。"""
    return _data(service.mark_analysis_read(analysis_id, read))


# ================================================================ G. 查询 / 自省 / 提议

@mcp.tool()
def global_search(query: str, types: list[str] | None = None,
                  direction_id: str | None = None, limit: int = 10) -> dict:
    """跨文献/Idea/实验/分析搜索。"""
    q = query.lower()
    groups: dict[str, list] = {"literature": [], "ideas": [], "experiments": [], "analyses": []}
    types = types or list(groups)

    if "literature" in types:
        for p in service.search_papers(direction_id=direction_id, query=q, limit=limit):
            groups["literature"].append({"paper_id": p["id"], "title": p["title"]})
    if "ideas" in types:
        for i in service.list_ideas(direction_id or _current_direction):
            if q in (i.get("name") or "").lower():
                groups["ideas"].append({"idea_id": i["id"], "name": i["name"]})
    if "experiments" in types:
        for e in service.list_experiments(direction_id or _current_direction, limit=limit * 3):
            if q in e["id"].lower() or q in (e.get("name") or "").lower():
                groups["experiments"].append({"experiment_id": e["id"], "name": e["name"]})
    if "analyses" in types:
        for e in service.list_experiments(direction_id or _current_direction, limit=limit * 3):
            for a in service.get_analyses(e["id"]):
                if q in (a.get("content") or "").lower():
                    groups["analyses"].append({"analysis_id": a["id"],
                                               "experiment_id": e["id"]})
                    break
    return _data({"groups": {k: v[:limit] for k, v in groups.items()}})


@mcp.tool()
def get_key_set(scope: str = "direction", scope_id: str | None = None,
                direction_id: str | None = None) -> dict:
    """键集合自省：返回范围内 params/metrics 键并集 + 基数 + 重复实验键。"""
    sid = scope_id or (direction_id or _current_direction if scope == "direction" else None)
    idx = Index()
    try:
        ks = idx.key_stats(scope, sid)
        ids = idx._scope_exp_ids(scope, sid)
        # 补类型推断：抽样一个值
        for group in ("params_keys", "metrics_keys"):
            for k in ks[group]:
                if not ids:
                    continue
                ph = ",".join("?" * len(ids))
                row = idx._conn.execute(
                    "SELECT value_text, value_num FROM kv WHERE kind=? AND key=? "
                    f"AND exp_id IN ({ph}) LIMIT 1",
                    ["param" if group == "params_keys" else "metric", k["key"], *ids]).fetchone()
                if row:
                    from core.domain import infer_value_type
                    v = row["value_num"] if row["value_num"] is not None else row["value_text"]
                    k["type_inferred"] = infer_value_type(v)
                    k["sample_values"] = v
    finally:
        idx.close()
    return _data({"scope": scope, "scope_id": sid, **ks})


@mcp.tool()
def propose_experiment(version_id: str, title: str, rationale: str,
                       proposed_params: dict[str, Any],
                       based_on_experiment_ids: list[str] | None = None,
                       confidence: float | None = None,
                       estimated_runtime: str | None = None) -> dict:
    """agent 提议实验，人批准（只建 proposal，不建实验）。"""
    res = service.create_proposal(version_id, title, rationale, proposed_params,
                                  based_on_experiment_ids, confidence, estimated_runtime)
    return _data({"proposal_id": res["id"], "status": "pending",
                  "created_at": res["createdAt"]})


@mcp.tool()
def list_proposals(status: str | None = None, limit: int = 20) -> dict:
    """列出提议（待批准/已批准/已拒绝）。"""
    props = service.list_proposals(status)[:limit]
    return _data({"proposals": props, "total": len(props)})


@mcp.tool()
def approve_proposal(proposal_id: str) -> dict:
    """批准提议并创建实验（**须在对话中已获用户明确同意后调用**，决策在对话，这里只执行）。"""
    return _data(service.approve_proposal(proposal_id))


@mcp.tool()
def reject_proposal(proposal_id: str, reason: str | None = None) -> dict:
    """拒绝提议（**须在对话中已获用户明确拒绝后调用**）。"""
    return _data(service.reject_proposal(proposal_id, reason))


@mcp.tool()
def mark_deleted(entity_type: str, entity_id: str, restore: bool = False) -> dict:
    """受限软删除/恢复：对 direction/paper/idea/version/experiment 置 deletedAt。

    数据保留、查询默认过滤、可 restore 恢复。物理清理不在 agent 权限内（只留给 UI/REST）。
    """
    return _data(service.mark_deleted(entity_type, entity_id, restore))


def run(transport: str = "stdio") -> None:
    mcp.run(transport=transport)


if __name__ == "__main__":
    run()
