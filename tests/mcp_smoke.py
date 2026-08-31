"""MCP server 冒烟测试：用官方 mcp 客户端走 stdio 调用工具。

运行（需 venv，含 mcp 依赖）：
  export IDEAFORGE_HOME=/d/idea-forge-test-home
  D:/idea-forge/.venv/Scripts/python.exe tests/mcp_smoke.py
"""
from __future__ import annotations

import os
import sys
import tempfile
from pathlib import Path

# 隔离数据根到临时目录
_HOME = Path(tempfile.mkdtemp(prefix="ideaforge-mcp-"))
os.environ["IDEAFORGE_HOME"] = str(_HOME)

from core import service  # noqa: E402

# 用 service 直接 seed 数据
repo = _HOME / "repo"
repo.mkdir()
d = service.create_direction("MCP 测试", str(repo))
idea = service.create_idea(d["direction_id"], "主干", git_branch="im/main")
ver = service.create_version(idea["id"], commit="abc123")

import asyncio  # noqa: E402

from mcp import ClientSession, StdioServerParameters  # noqa: E402
from mcp.client.stdio import stdio_client  # noqa: E402

PYTHON = sys.executable


def _val(res):
    return [c.text for c in res.content if hasattr(c, "text")]


async def main():
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
            print(f"[tools] {len(names)}: {names}")
            assert len(names) == 26, f"期望 26 个工具，实际 {len(names)}"

            # 方向
            res = await session.call_tool("switch_direction", {"direction_id": d["direction_id"]})
            print("[switch_direction]", _val(res)[0][:80])
            assert d["direction_id"] in _val(res)[0]

            res = await session.call_tool("list_directions", {})
            print("[list_directions]", _val(res)[0][:80])

            # 实验（键值透传）
            res = await session.call_tool("create_experiment", {
                "version_id": ver["id"],
                "params": {"lr": 0.005, "dropout": 0.3, "seed": 1},
                "name": "mcp-run",
            })
            exp_out = _val(res)[0]
            print("[create_experiment]", exp_out[:120])
            assert "suggested_command" in exp_out and "exp-" in exp_out

            exp_id = exp_out.split('"experiment_id": "')[1].split('"')[0]
            await session.call_tool("update_experiment_status",
                                    {"experiment_id": exp_id, "status": "running"})
            await session.call_tool("set_metrics",
                                    {"experiment_id": exp_id,
                                     "metrics": {"influence_spread": 0.462}})
            res = await session.call_tool("update_experiment_status",
                                          {"experiment_id": exp_id, "status": "done"})
            print("[done]", _val(res)[0][:120])
            assert '"status": "done"' in _val(res)[0]

            res = await session.call_tool("get_experiment", {"experiment_id": exp_id})
            print("[get_experiment]", _val(res)[0][:120])
            assert "influence_spread" in _val(res)[0]

            # 键集合自省
            res = await session.call_tool("get_key_set", {"scope": "direction",
                                                          "scope_id": d["direction_id"]})
            print("[get_key_set]", _val(res)[0][:160])
            assert "params_keys" in _val(res)[0]

            # 分析
            res = await session.call_tool("write_analysis", {
                "experiment_id": exp_id,
                "content": "lr 提升后 spread 上升。",
                "references": ["influence_spread"],
            })
            an_out = _val(res)[0]
            print("[write_analysis]", an_out[:100])
            assert "analysis_id" in an_out

            # 提议
            res = await session.call_tool("propose_experiment", {
                "version_id": ver["id"], "title": "试 lr=0.01",
                "rationale": "继续提升", "proposed_params": {"lr": 0.01},
                "confidence": 0.72,
            })
            print("[propose_experiment]", _val(res)[0][:100])
            assert "proposal_id" in _val(res)[0]
            res = await session.call_tool("list_proposals", {})
            print("[list_proposals]", _val(res)[0][:100])

    print("\n=== MCP SMOKE OK ===")


if __name__ == "__main__":
    asyncio.run(main())
