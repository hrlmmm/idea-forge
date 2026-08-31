# Idea Forge

> **The local forge where your agent crafts science.**

本地优先、领域无关、由 agent 驱动的开源科研管理平台。

你的 agent 负责跑实验、记参数、分析结果、迭代优化；你只管看，或只管聊。

- 📚 **文献库** — 收集、标注、跨方向共用
- 🌳 **研究方向（Direction）** — 一个方向 = 一个独立 git 仓库
- 🔖 **Idea** — 灵感分支树，每个 Idea 对应该仓库的一条 git 分支
- 🧪 **实验** — 键值参数 / 键值指标，字段名绝不写死
- 📝 **分析** — 跑完由 agent（或人）写回复盘
- 🖥️ **文件全存本地磁盘**，UI 只做可视化归拢
- 🔌 **MCP 服务** — 任意兼容 agent 克隆下来配一行就能上手

平台**不执行代码**：执行留在本地 `python train.py`，agent 负责把结果回收归档。

## 分层模型

```
Direction(研究方向 = 一个 git 仓库)
  → Literature(文献，全局库，directions[] 支持跨方向共用)
  → Idea(= 该仓库的一条 git 分支)
    → Version(= 分支上的某次 commit)
      → Experiment(params/metrics 键值)
        → Analysis(agent 或人写回复盘)
```

「控制变量变体」（a1 / a2 …）不做特殊建模 —— 它们是同一 Version 下 `params` 不同的普通 Experiment。

## 快速上手

要求：Python 3.11+。

```bash
git clone git@github.com:hrlmmm/idea-forge.git
cd idea-forge
python -m venv .venv
.venv/Scripts/activate            # Windows；macOS/Linux 用 .venv/bin/activate
pip install -e ".[mcp,dev]"       # 装 CLI + MCP + 测试依赖

# 数据根目录（所有科研数据都放这里；默认 ~/.idea-forge）
export IDEAFORGE_HOME=D:/ideaforge-home      # Windows 示例，D 盘
```

**三个入口：**

| 命令 | 作用 |
|---|---|
| `ideaforge serve` | 启动本地 Web UI + REST API → http://127.0.0.1:8530 |
| `ideaforge mcp` | 启动 MCP server（stdio），给 agent 用 |
| `ideaforge watch` | Watcher：兜底回收长任务（扫到 results.json 自动 done） |

其他：`ideaforge direction/paper/idea/version/exp/analysis ...` 命令行 CRUD；`ideaforge index rebuild` 重建 SQLite 索引。

## 给 agent 配置 MCP

在任意 MCP 兼容客户端（Claude Desktop / Cursor / WorkBuddy 等）里加一段配置：

```json
{
  "mcpServers": {
    "ideaforge": {
      "command": "D:/idea-forge/.venv/Scripts/ideaforge.exe",
      "args": ["mcp"],
      "env": { "IDEAFORGE_HOME": "D:/ideaforge-home" }
    }
  }
}
```

连上后 agent 获得 **26 个工具**（7 类）：Direction / Literature / Idea / Version / Experiment / Analysis / 查询自省。核心流程：

```
create_direction → add_paper → create_idea(新分支) → create_version(commit)
  → create_experiment(params 键值) → 本地 python train.py
  → set_metrics + update_experiment_status(done)
  → write_analysis → propose_experiment(人等批准)
```

> agent 只会创建记录、写分析、提提议、**受限软删除**（`mark_deleted`，置 `deletedAt` 可恢复）；**不会**执行代码、硬删除数据、覆盖已有结果。名称（方向/Idea/实验 name）由 agent 起，**ID 一律平台生成**（实验 `exp-NNN` 全局唯一）。

**完整的 agent 工作流示例**（活代码）：`scripts/agent_demo.py`

```bash
export IDEAFORGE_HOME=D:/ideaforge-home
python scripts/agent_demo.py     # 自动建方向→文献→Idea→版本→实验网格→分析→提议
```

## 数据存储（双 root）

```
<IDEAFORGE_HOME>/                    全局：方向注册表 + 全局文献库 + index.db + read_state.json
<方向工作目录>/.research/           每方向：ideas / versions / experiments / proposals 的 JSON
```

- **磁盘 JSON 是唯一真相**，SQLite 索引只是缓存，`ideaforge index rebuild` 可随时重建。
- params/metrics 是纯键值，平台不预设任何字段名，适用于任何研究方向。
- 实验四文件：`meta.json`（状态机，权威）· `config.json`（params）· `results.json`（metrics，协议冻结：只含 metrics+metricSchema）· `status.json`（审计日志）。

## 测试

```bash
python -m pytest tests/ -q          # core 层单元测试
python tests/mcp_smoke.py           # MCP 冒烟（连 stdio 调部分工具）
python tests/mcp_full.py            # MCP 全量（25 个工具逐个调用 + 权限拒绝场景）
```

## 技术栈与状态

- 后端：**Python 3.12 + FastAPI**；前端：**原生 HTML/CSS/JS（web/ 三件套）**；MCP：**官方 `mcp` SDK（`mcp>=1.2,<2`）**；索引：标准库 SQLite。
- **v0.1 MVP 已实现**（M1–M6）：core 领域模型 / 双 root 存储 / SQLite 索引 / MCP 25 工具 / Watcher 异步回收 / REST API / Web UI。
- 详细设计与评审：`docs/architecture-blueprint.md` · `docs/product-design.md` · `docs/technical-plan.md` · `docs/tech-review.md`。

## 路线图（v0.2+）

- 前端矩阵热力 / Param Diff / 变体族可视化（需给 experiment 列表接口补 metrics）
- 实验指标聚合端点、图表视图
- `create_idea` 真实 git 建分支（当前仅记录分支名）
- 提议二次确认、索引状态 UI

## 许可证

待定（计划开源）。
