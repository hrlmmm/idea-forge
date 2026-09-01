"""全量 MCP 工具测试：官方 mcp 客户端走 stdio，逐工具调用 32 个工具 + 权限拒绝场景。

运行（venv，含 mcp 依赖）：
  D:/idea-forge/.venv/Scripts/python.exe tests/mcp_full.py
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
import tempfile
from pathlib import Path

_HOME = Path(tempfile.mkdtemp(prefix="ideaforge-mcpfull-"))
os.environ["IDEAFORGE_HOME"] = str(_HOME)

from core import service  # noqa: E402

repo = _HOME / "repo"
repo.mkdir()
d = service.create_direction("全量测试", str(repo))
idea = service.create_idea(d["direction_id"], "主干", git_branch="im/main")
ver = service.create_version(idea["id"], commit="abc123")
pid = service.add_paper("Test Paper", directions=[d["direction_id"]], authors=["A"])["id"]
exp = service.create_experiment(ver["id"], {"lr": 0.005}, name="e1")

from mcp import ClientSession, StdioServerParameters  # noqa: E402
from mcp.client.stdio import stdio_client  # noqa: E402

PYTHON = sys.executable
FAILED: list[str] = []


def check(name: str, cond: bool, detail: str = "") -> None:
    tag = "PASS" if cond else "FAIL"
    print(f"[{tag}] {name}" + (f"  ({detail})" if detail else ""))
    if not cond:
        FAILED.append(name)


async def main() -> int:
    params = StdioServerParameters(
        command=PYTHON,
        args=["-m", "ideaforge.cli", "mcp"],
        cwd=str(Path(__file__).resolve().parents[1]),
        env={**os.environ},
    )
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = await session.list_tools()
            names = sorted(t.name for t in tools.tools)
            check("31 个工具", len(names) == 31, f"实际 {len(names)}")

            async def call(name, args):
                res = await session.call_tool(name, args)
                return "".join(c.text for c in res.content if hasattr(c, "text"))

            # ---- A. Direction
            t = await call("list_directions", {})
            check("list_directions", d["direction_id"] in t)
            t = await call("create_direction", {"name": "MCP新建", "repo_path": str(repo / "d2")})
            check("create_direction", '"direction_id"' in t)
            t = await call("switch_direction", {"direction_id": d["direction_id"]})
            check("switch_direction", d["direction_id"] in t)

            # ---- B. Literature
            t = await call("add_paper", {"title": "Paper2", "authors": ["B"], "year": 2023, "tags": ["x"]})
            check("add_paper", '"paper_id"' in t)
            t = await call("search_papers", {"query": "Test"})
            check("search_papers", '"Test Paper"' in t)
            t = await call("update_paper", {"paper_id": pid, "fields": {"notes": "n1", "readState": "read"}})
            check("update_paper 白名单字段", '"notes"' in t, t[:400])
            t = await call("update_paper", {"paper_id": pid, "fields": {"id": "hack"}})
            check("update_paper 拒绝非法字段", "非法字段" in t, t[:120])
            t = await call("link_paper_to_idea", {"paper_id": pid, "idea_id": idea["id"]})
            check("link_paper_to_idea", '"linked": true' in t, t[:120])

            # ---- C. Idea
            t = await call("list_ideas", {"direction_id": d["direction_id"]})
            check("list_ideas", idea["id"] in t)
            t = await call("create_idea", {"direction_id": d["direction_id"], "name": "分支A", "branch_name": "im/a"})
            check("create_idea", '"idea_id"' in t)
            t = await call("update_idea_status", {"idea_id": idea["id"], "status": "validated"})
            check("update_idea_status", '"validated"' in t)
            t = await call("branch_idea", {"idea_id": idea["id"], "new_name": "子分支"})
            check("branch_idea", '"child_idea_id"' in t)

            # ---- D. Version
            t = await call("list_versions", {"idea_id": idea["id"]})
            check("list_versions", ver["id"] in t)
            t = await call("create_version", {"idea_id": idea["id"], "commit": "def456"})
            check("create_version", '"version_id"' in t)

            # ---- E. Experiment
            t = await call("list_experiments", {"direction_id": d["direction_id"]})
            check("list_experiments", '"key_stats"' in t)
            t = await call("create_experiment", {"version_id": ver["id"], "params": {"lr": 0.01, "dropout": 0.1}, "name": "e2"})
            check("create_experiment", '"suggested_command"' in t)
            t = await call("update_experiment_status", {"experiment_id": exp["id"], "status": "running"})
            check("update_experiment_status", '"running"' in t)
            t = await call("set_metrics", {"experiment_id": exp["id"], "metrics": {"spread": 0.5}})
            check("set_metrics", '"metrics_count": 1' in t)
            t = await call("update_experiment_status", {"experiment_id": exp["id"], "status": "done"})
            check("done", '"done"' in t and "missing_metrics" not in t)
            t = await call("get_experiment", {"experiment_id": exp["id"]})
            check("get_experiment", '"spread"' in t)

            # ---- E2. Experiment Group（实验线）
            t = await call("create_experiment_group", {"idea_id": idea["id"], "name": "feasibility", "purpose": "小数据验证可行性"})
            check("create_experiment_group", '"group_id"' in t)
            try:
                gid = json.loads(t)["data"]["group_id"]
            except Exception:
                gid = None
            if gid:
                t = await call("list_experiment_groups", {"idea_id": idea["id"]})
                check("list_experiment_groups", gid in t)
                t = await call("create_experiment", {"version_id": ver["id"], "params": {"lr": 0.03}, "name": "e3", "group_id": gid})
                check("create_experiment 挂组", gid in t)
                t = await call("update_experiment_group", {"group_id": gid, "status": "done", "conclusion": "方向可行"})
                check("update_experiment_group", '"done"' in t)
            else:
                check("list_experiment_groups", False, "group_id 未解析")

            # ---- F. Analysis
            t = await call("write_analysis", {"experiment_id": exp["id"], "content": "lr 提升后 spread 上升", "references": ["spread"]})
            check("write_analysis", '"analysis_id"' in t)
            t = await call("get_analyses", {"experiment_id": exp["id"]})
            check("get_analyses", "spread" in t)
            an_id = None
            try:
                an_id = json.loads(t)["data"]["analyses"][0]["id"]
            except Exception:
                pass
            if an_id:
                t = await call("mark_read", {"analysis_id": an_id})
                check("mark_read", '"is_read": true' in t)
            else:
                check("mark_read", False, "analysis_id 未解析")

            # ---- G. 查询 / 自省 / 提议
            t = await call("global_search", {"query": "Test"})
            check("global_search", '"literature"' in t)
            t = await call("get_key_set", {"scope": "direction", "scope_id": d["direction_id"]})
            check("get_key_set", '"params_keys"' in t and "repeat_keys" in t)
            t = await call("propose_experiment", {"version_id": ver["id"], "title": "试 lr=0.01", "rationale": "继续提升", "proposed_params": {"lr": 0.01}})
            check("propose_experiment", '"proposal_id"' in t)
            t = await call("list_proposals", {})
            check("list_proposals", '"试 lr=0.01"' in t)

            # ---- 受限软删除
            t = await call("mark_deleted", {"entity_type": "experiment", "entity_id": exp["id"]})
            check("mark_deleted 软删", '"deleted_at"' in t and "null" not in t)
            t = await call("list_experiments", {"direction_id": d["direction_id"]})
            check("软删后列表过滤", exp["id"] not in t)
            t = await call("mark_deleted", {"entity_type": "experiment", "entity_id": exp["id"], "restore": True})
            check("mark_deleted 恢复", '"restored": true' in t)
            t = await call("mark_deleted", {"entity_type": "nope", "entity_id": "x"})
            check("mark_deleted 拒绝未知类型", "unknown entity_type" in t)

            # ---- 对话确认：批准 / 拒绝提议
            t = await call("propose_experiment", {"version_id": ver["id"], "title": "待批准实验",
                                                  "rationale": "用于测试 approve", "proposed_params": {"lr": 0.02}})
            check("propose_experiment2", '"proposal_id"' in t)
            import json as _json
            pid2 = _json.loads(t)["data"]["proposal_id"]
            t = await call("approve_proposal", {"proposal_id": pid2})
            check("approve_proposal", '"experiment_id"' in t and '"approved"' in t)
            t = await call("propose_experiment", {"version_id": ver["id"], "title": "待拒绝实验",
                                                  "rationale": "用于测试 reject", "proposed_params": {"lr": 0.9}})
            pid3 = _json.loads(t)["data"]["proposal_id"]
            t = await call("reject_proposal", {"proposal_id": pid3, "reason": "lr 过高"})
            check("reject_proposal", '"rejected"' in t)

    passed = 31 - len(FAILED)
    print(f"\n=== 通过 {passed}/31，失败 {len(FAILED)}: {FAILED} ===")
    return 1 if FAILED else 0


if __name__ == "__main__":
    raise SystemExit(asyncio.run(main()))
