"""Idea Forge REST API（本地服务，供 Web UI 使用；与 MCP 同一 local core）。

对齐 docs/technical-plan.md §11。运行：python -m ideaforge.cli serve
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Query
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from core import service
from core.index import Index

app = FastAPI(title="Idea Forge", version="0.1.0")


# ---------------------------------------------------------------- 请求模型

class DirectionIn(BaseModel):
    name: str
    repo_path: str
    git_remote: str | None = None


class PaperIn(BaseModel):
    title: str
    authors: list[str] | None = None
    year: int | None = None
    venue: str | None = None
    tags: list[str] | None = None
    directions: list[str] | None = None
    notes: str | None = None


class IdeaIn(BaseModel):
    direction_id: str
    name: str
    hypothesis: str | None = None
    parent_idea_id: str | None = None
    git_branch: str | None = None
    related_paper_ids: list[str] | None = None


class VersionIn(BaseModel):
    idea_id: str
    commit: str | None = None
    note: str | None = None


class ExperimentIn(BaseModel):
    version_id: str
    params: dict[str, Any] = {}
    name: str | None = None
    description: str | None = None
    group_id: str | None = None


class ExperimentGroupIn(BaseModel):
    idea_id: str
    name: str
    purpose: str | None = None
    status: str | None = None
    depends_on: list[str] | None = None


class ExperimentGroupUpdate(BaseModel):
    name: str | None = None
    purpose: str | None = None
    status: str | None = None
    conclusion: str | None = None
    depends_on: list[str] | None = None


class ClaimIn(BaseModel):
    statement: str
    idea_id: str | None = None
    group_id: str | None = None
    confidence: str = "speculation"
    evidence: list[str] | None = None
    rationale: str | None = None


class ClaimUpdate(BaseModel):
    statement: str | None = None
    confidence: str | None = None
    evidence: list[str] | None = None
    rationale: str | None = None


class SkillIn(BaseModel):
    name: str
    description: str = ""
    body: str = ""
    direction_id: str | None = None
    tags: list[str] | None = None
    params_schema: dict[str, Any] | None = None
    evidence_expectations: list[str] | None = None


class SkillUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    body: str | None = None
    status: str | None = None
    tags: list[str] | None = None
    params_schema: dict[str, Any] | None = None
    evidence_expectations: list[str] | None = None


class StatusIn(BaseModel):
    status: str
    finished_at: str | None = None
    error: str | None = None


class MetricsIn(BaseModel):
    metrics: dict[str, Any]
    metric_schema: list[dict] | None = None


class AnalysisIn(BaseModel):
    content: str
    references: list[str] | None = None
    author: str | None = None


# ---------------------------------------------------------------- 错误处理

def _err(e: Exception) -> HTTPException:
    return HTTPException(status_code=404 if isinstance(e, KeyError) else 400, detail=str(e))


# ---------------------------------------------------------------- Direction

@app.get("/api/v1/directions")
def api_list_directions():
    return {"directions": service.list_directions()}


@app.post("/api/v1/directions")
def api_create_direction(body: DirectionIn):
    try:
        return service.create_direction(body.name, body.repo_path, body.git_remote)
    except Exception as e:
        raise _err(e)


# ---------------------------------------------------------------- Literature

@app.get("/api/v1/papers")
def api_list_papers(direction_id: str | None = None, q: str | None = None,
                    tags: str | None = None):
    return {"papers": service.search_papers(
        direction_id=direction_id, query=q,
        tags=tags.split(",") if tags else None)}


@app.post("/api/v1/papers")
def api_add_paper(body: PaperIn):
    try:
        return service.add_paper(body.title, body.directions, body.authors,
                                 body.year, body.venue, body.tags, body.notes)
    except Exception as e:
        raise _err(e)


@app.put("/api/v1/papers/{paper_id}")
def api_update_paper(paper_id: str, body: dict):
    from core.domain import PAPER_WRITABLE_FIELDS
    allowed = {k: v for k, v in body.items() if k in PAPER_WRITABLE_FIELDS}
    if len(allowed) != len(body):
        raise HTTPException(400, f"非法字段，仅允许: {sorted(PAPER_WRITABLE_FIELDS)}")
    dr = service.DataRoot()
    meta = service.read_json(dr.literature_meta(paper_id))
    if not meta:
        raise HTTPException(404, f"paper not found: {paper_id}")
    meta.update(allowed)
    service.atomic_write_json(dr.literature_meta(paper_id), meta)
    return {"paper_id": paper_id, "changed": sorted(allowed)}


# ---------------------------------------------------------------- Idea

@app.get("/api/v1/ideas")
def api_list_ideas(direction_id: str | None = None, status: str | None = None,
                   include_archived: bool = False):
    ideas = service.list_ideas(direction_id, include_archived)
    if status:
        ideas = [i for i in ideas if i.get("status") == status]
    return {"ideas": ideas}


@app.post("/api/v1/ideas")
def api_create_idea(body: IdeaIn):
    try:
        return service.create_idea(body.direction_id, body.name, body.hypothesis,
                                   body.parent_idea_id, body.git_branch,
                                   body.related_paper_ids)
    except Exception as e:
        raise _err(e)


@app.put("/api/v1/ideas/{idea_id}")
def api_update_idea(idea_id: str, body: dict):
    try:
        if "status" in body:
            return service.update_idea_status(idea_id, body["status"])
        raise HTTPException(400, "仅支持更新 status")
    except Exception as e:
        raise _err(e)


# ---------------------------------------------------------------- Version

@app.get("/api/v1/versions")
def api_list_versions(idea_id: str | None = None):
    return {"versions": service.list_versions(idea_id)}


@app.post("/api/v1/versions")
def api_create_version(body: VersionIn):
    try:
        return service.create_version(body.idea_id, body.commit, body.note)
    except Exception as e:
        raise _err(e)


# ---------------------------------------------------------------- Experiment

@app.get("/api/v1/experiments")
def api_list_experiments(direction_id: str | None = None, idea_id: str | None = None,
                         version_id: str | None = None, status: str | None = None):
    return {"experiments": service.list_experiments(
        direction_id, idea_id, version_id, status)}


@app.post("/api/v1/experiments")
def api_create_experiment(body: ExperimentIn):
    try:
        return service.create_experiment(body.version_id, body.params, body.name,
                                         body.description, created_by="human",
                                         group_id=body.group_id)
    except Exception as e:
        raise _err(e)


# ---------------------------------------------------------------- Experiment Group（实验线）

@app.get("/api/v1/experiment-groups")
def api_list_experiment_groups(idea_id: str | None = None,
                               include_archived: bool = False):
    return {"groups": service.list_experiment_groups(idea_id, include_archived)}


@app.post("/api/v1/experiment-groups")
def api_create_experiment_group(body: ExperimentGroupIn):
    try:
        return service.create_experiment_group(
            body.idea_id, body.name, body.purpose,
            body.status or "planning", body.depends_on)
    except Exception as e:
        raise _err(e)


@app.put("/api/v1/experiment-groups/{group_id}")
def api_update_experiment_group(group_id: str, body: ExperimentGroupUpdate):
    try:
        return service.update_experiment_group(
            group_id, body.name, body.purpose, body.status, body.conclusion,
            body.depends_on)
    except Exception as e:
        raise _err(e)


@app.get("/api/v1/experiments/{exp_id}")
def api_get_experiment(exp_id: str):
    try:
        return service.get_experiment(exp_id)
    except Exception as e:
        raise _err(e)


@app.put("/api/v1/experiments/{exp_id}/status")
def api_update_status(exp_id: str, body: StatusIn):
    try:
        return service.update_experiment_status(exp_id, body.status,
                                                body.finished_at, body.error)
    except Exception as e:
        raise _err(e)


@app.put("/api/v1/experiments/{exp_id}/metrics")
def api_set_metrics(exp_id: str, body: MetricsIn):
    try:
        schema = {m["key"]: {k: v for k, v in m.items() if k != "key"}
                  for m in (body.metric_schema or [])} or None
        return service.set_metrics(exp_id, body.metrics, schema)
    except Exception as e:
        raise _err(e)


# ---------------------------------------------------------------- Analysis

@app.get("/api/v1/experiments/{exp_id}/analyses")
def api_get_analyses(exp_id: str):
    try:
        return {"analyses": service.get_analyses(exp_id)}
    except Exception as e:
        raise _err(e)


@app.post("/api/v1/experiments/{exp_id}/analyses")
def api_write_analysis(exp_id: str, body: AnalysisIn):
    try:
        return service.write_analysis(exp_id, body.content, body.references,
                                      source="human", author=body.author)
    except Exception as e:
        raise _err(e)


# ---------------------------------------------------------------- Claim（结论 + 证据门）

@app.get("/api/v1/claims")
def api_list_claims(idea_id: str | None = None, group_id: str | None = None,
                    confidence: str | None = None, include_archived: bool = False):
    return {"claims": service.list_claims(idea_id, group_id, confidence,
                                          include_archived)}


@app.post("/api/v1/claims")
def api_create_claim(body: ClaimIn):
    try:
        return service.create_claim(body.idea_id, body.group_id, body.statement,
                                    body.confidence, body.evidence, body.rationale)
    except Exception as e:
        raise _err(e)


@app.get("/api/v1/claims/{claim_id}")
def api_get_claim(claim_id: str):
    try:
        return service.get_claim(claim_id)
    except Exception as e:
        raise _err(e)


@app.put("/api/v1/claims/{claim_id}")
def api_update_claim(claim_id: str, body: ClaimUpdate):
    try:
        return service.update_claim(claim_id, body.statement, body.confidence,
                                    body.evidence, body.rationale)
    except Exception as e:
        raise _err(e)


# ---------------------------------------------------------------- Skill（可版本化协议本体）

@app.get("/api/v1/skills")
def api_list_skills(direction_id: str | None = None, status: str | None = None,
                    include_archived: bool = False):
    return {"skills": service.list_skills(direction_id, status, include_archived)}


@app.post("/api/v1/skills")
def api_create_skill(body: SkillIn):
    try:
        return service.create_skill(body.name, body.description, body.body,
                                    body.direction_id, body.tags,
                                    body.params_schema, body.evidence_expectations)
    except Exception as e:
        raise _err(e)


@app.get("/api/v1/skills/{skill_id}")
def api_get_skill(skill_id: str):
    try:
        return service.get_skill(skill_id)
    except Exception as e:
        raise _err(e)


@app.put("/api/v1/skills/{skill_id}")
def api_update_skill(skill_id: str, body: SkillUpdate):
    try:
        return service.update_skill(skill_id, body.name, body.description, body.body,
                                    body.status, body.tags, body.params_schema,
                                    body.evidence_expectations)
    except Exception as e:
        raise _err(e)


# ---------------------------------------------------------------- Proposal / 查询 / 事件

@app.get("/api/v1/proposals")
def api_list_proposals(status: str | None = None):
    return {"proposals": service.list_proposals(status)}


# 软删除（受限）：只有人能删（UI/REST），agent 只能经 MCP mark_deleted
_ENTITY_SINGULAR = {"directions": "direction", "papers": "paper", "ideas": "idea",
                    "versions": "version", "experiments": "experiment",
                    "experiment-groups": "group", "claims": "claim", "skills": "skill"}


@app.delete("/api/v1/{collection}/{entity_id}")
def api_soft_delete(collection: str, entity_id: str):
    singular = _ENTITY_SINGULAR.get(collection)
    if not singular:
        raise HTTPException(404, "unknown resource")
    try:
        return service.mark_deleted(singular, entity_id)
    except Exception as e:
        raise _err(e)


@app.post("/api/v1/proposals/{proposal_id}/approve")
def api_approve_proposal(proposal_id: str):
    try:
        return service.approve_proposal(proposal_id)
    except Exception as e:
        raise _err(e)


@app.post("/api/v1/proposals/{proposal_id}/reject")
def api_reject_proposal(proposal_id: str, body: dict | None = None):
    try:
        return service.reject_proposal(proposal_id, (body or {}).get("reason"))
    except Exception as e:
        raise _err(e)


@app.get("/api/v1/key-set")
def api_key_set(scope: str = "direction", scope_id: str | None = None):
    idx = Index()
    try:
        return idx.key_stats(scope, scope_id)
    finally:
        idx.close()


@app.get("/api/v1/search")
def api_search(q: str, direction_id: str | None = None):
    query = q.lower()
    groups: dict[str, list] = {"literature": [], "ideas": [],
                               "experiments": [], "analyses": []}
    for p in service.search_papers(direction_id=direction_id, query=q):
        groups["literature"].append({"paper_id": p["id"], "title": p["title"]})
    for i in service.list_ideas(direction_id):
        if query in (i.get("name") or "").lower():
            groups["ideas"].append({"idea_id": i["id"], "name": i["name"]})
    for e in service.list_experiments(direction_id):
        if query in e["id"].lower() or query in (e.get("name") or "").lower():
            groups["experiments"].append({"experiment_id": e["id"], "name": e["name"]})
        for a in service.get_analyses(e["id"]):
            if query in (a.get("content") or "").lower():
                groups["analyses"].append({"analysis_id": a["id"],
                                           "experiment_id": e["id"]})
                break
    return {"groups": groups}


@app.get("/api/v1/events/poll")
def api_events_poll(since: int = 0):
    idx = Index()
    try:
        rows = idx._conn.execute(
            "SELECT seq, type, data_json, ts FROM events WHERE seq>? ORDER BY seq",
            (since,)).fetchall()
        events = [{"seq": r["seq"], "type": r["type"],
                   "data": json.loads(r["data_json"]), "ts": r["ts"]} for r in rows]
        next_seq = events[-1]["seq"] if events else since
        return {"events": events, "next_seq": next_seq}
    finally:
        idx.close()


@app.get("/api/v1/events/log")
def api_events_log(limit: int = 50):
    """最近的事件（倒序，供轮询 / 调试 / 执行历史追溯）。"""
    idx = Index()
    try:
        rows = idx._conn.execute(
            "SELECT seq, type, data_json, ts FROM events ORDER BY seq DESC LIMIT ?",
            (min(max(limit, 1), 200),)).fetchall()
        return {"events": [{"seq": r["seq"], "type": r["type"],
                            "data": json.loads(r["data_json"]), "ts": r["ts"]}
                           for r in rows]}
    finally:
        idx.close()


# ---------------------------------------------------------------- 静态托管（web/，M6）

_WEB_DIR = Path(__file__).resolve().parents[1] / "web"
if _WEB_DIR.exists():
    app.mount("/", StaticFiles(directory=str(_WEB_DIR), html=True), name="web")
