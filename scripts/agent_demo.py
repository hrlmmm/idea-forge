"""agent_demo.py —— 模拟一个科研 agent 通过 MCP 使用 Idea Forge 的完整工作流。

这既是"实际连接 MCP 使用"的演示，也是 README 中 agent 用法的活示例：
方向 → 文献 → Idea(分支) → Version(commit) → 实验网格 → 指标回收 → 分析 → 提议。

运行（venv，数据落到 IDEAFORGE_HOME）：
  export IDEAFORGE_HOME=D:/idea-forge-data
  D:/idea-forge/.venv/Scripts/python.exe scripts/agent_demo.py
"""
from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

REPO = str(Path(os.environ.get("IDEAFORGE_HOME", str(Path.home() / ".idea-forge"))) / "multilayer-im")
PROJECT_ROOT = Path(__file__).resolve().parents[1]
Path(REPO).mkdir(parents=True, exist_ok=True)


def _text(res) -> str:
    return "".join(c.text for c in res.content if hasattr(c, "text"))


async def main() -> None:
    params = StdioServerParameters(
        command=sys.executable,
        args=["-m", "ideaforge.cli", "mcp"],
        cwd=str(PROJECT_ROOT),
        env={**os.environ},
    )
    async with stdio_client(params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = sorted(t.name for t in (await session.list_tools()).tools)
            print(f"[connected] MCP server 就绪，{len(tools)} 个工具可用")
            print(f"[tools] {', '.join(tools)}\n")

            async def call(name: str, args: dict, note: str):
                res = await session.call_tool(name, args)
                text = _text(res)
                try:
                    data = json.loads(text)
                    print(f"  ✔ {name}  → {note}")
                    return data["data"]
                except Exception:
                    print(f"  ✘ {name}  → {text[:200]}")
                    return None

            # 1. 建立研究方向（= 一个仓库）
            d = await call("create_direction", {
                "name": "多层网络影响力最大化",
                "repo_path": REPO,
                "git_remote": "git@github.com:hrlmmm/multilayer-im.git",
            }, "建立研究方向")
            did = d["direction_id"]
            await call("switch_direction", {"direction_id": did}, "切换当前方向")

            # 2. 收录文献
            papers = [
                ("Influence Maximization in Complex Networks", ["Kempe", "Kleinberg", "Tardos"], 2003, "KDD", ["影响力最大化", "复杂网络"]),
                ("Multi-layer Influence Maximization in Social Networks", ["Zhang L."], 2022, "WWW", ["多层网络", "影响力最大化"]),
                ("Attention Is All You Need", ["Vaswani A."], 2017, "NeurIPS", ["Transformer"]),
                ("Learning to Maximize Influence with Transformers", ["Park S."], 2023, "AAAI", ["Transformer", "影响力最大化"]),
            ]
            for title, authors, year, venue, tags in papers:
                await call("add_paper", {
                    "title": title, "authors": authors, "year": year,
                    "venue": venue, "tags": tags, "directions": [did],
                }, f"收录文献：{title}")

            # 3. 建 Idea（= 新 git 分支）
            idea = await call("create_idea", {
                "direction_id": did, "name": "DeepIS 主干",
                "branch_name": "im/deepis",
                "hypothesis": "用 Transformer 学节点影响力向量，结合 IC 模型选种子集",
            }, "建立 Idea")
            iid = idea["idea_id"]

            # 4. 记版本（= commit）
            ver = await call("create_version", {
                "idea_id": iid, "commit": "8b1d4f9e", "note": "baseline: GNN encoder",
            }, "记录版本")
            vid = ver["version_id"]

            # 5. 实验网格：lr × dropout
            exps = []
            for lr, dp in [(0.0005, 0.0), (0.001, 0.1), (0.005, 0.1), (0.005, 0.3)]:
                e = await call("create_experiment", {
                    "version_id": vid, "name": f"lr{lr}-dp{dp}",
                    "params": {"lr": lr, "dropout": dp, "hidden_dim": 128,
                               "num_layers": 2, "seed": 1},
                }, f"新建实验 lr={lr} dropout={dp}")
                eid = e["experiment_id"]
                await call("update_experiment_status", {"experiment_id": eid, "status": "running"}, "标记运行中")
                spread = round(0.18 + lr * 22 + dp * 0.06, 3)
                await call("set_metrics", {"experiment_id": eid, "metrics": {
                    "influence_spread": spread, "convergence_step": 20, "time": 120,
                }}, f"写回指标 influence_spread={spread}")
                await call("update_experiment_status", {"experiment_id": eid, "status": "done"}, "完成")
                exps.append((eid, spread))

            # 6. agent 写复盘（分析）
            best = max(exps, key=lambda x: x[1])
            await call("write_analysis", {
                "experiment_id": best[0],
                "content": (f"lr 扫描显示 lr=0.005 时 influence_spread={best[1]} 最高。"
                            f"建议固定 lr=0.005 并继续扫 dropout，下一步加宽 hidden_dim 到 256。"),
                "references": ["influence_spread"],
            }, "agent 写复盘")

            # 7. agent 提议下一实验（人等批准）
            await call("propose_experiment", {
                "version_id": vid,
                "title": "试 hidden_dim=256 + dropout=0.3",
                "rationale": "在 best 配置基础上加宽模型，验证是否继续提升",
                "proposed_params": {"lr": 0.005, "dropout": 0.3, "hidden_dim": 256},
                "confidence": 0.72,
            }, "agent 提议下一实验")

            print("\n[agent demo] 完成 —— 打开 http://127.0.0.1:8530 可查看这组真实数据")


if __name__ == "__main__":
    asyncio.run(main())
