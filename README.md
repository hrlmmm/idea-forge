# Idea Forge

> **The local forge where your agent crafts science.**

本地优先、领域无关、由 agent 驱动的科研管理平台。

你的 agent 负责跑实验、记参数、分析结果、迭代优化；你只管看，或只管聊。

- 📚 **文献库** — 收集、标注、关联到想法
- 🌳 **想法分支树** — 顶层实体，灵感不断分叉
- 🔖 **版本（挂 GitHub）** — 每次实验基于哪份代码状态，一目了然
- 🧪 **实验** — 键值参数 / 键值指标，参数名绝不写死
- 📝 **分析** — 跑完由 agent（或人）写回复盘
- 🖥️ **文件全存本地磁盘**，UI 只做可视化归拢
- 🔌 **暴露 MCP 服务**，任意兼容 agent 克隆下来配一下即可上手

平台**不执行代码**：执行留在本地 `python train.py`，agent 负责把结果回收归档。

## 它解决什么

研究生的真实痛点：文献、代码、四五十次实验结果、版本变更散落在各个目录，只靠打印参数区分，重要产出靠手动复制到别处。

Idea Forge 不挪动你的文件，只是按约定把它们理顺，并在 UI 上渲染成「哪个结果属于哪个想法、哪两次实验只差了哪几个参数」。

## 分层模型

```
Literature → Idea(分支树) → Version(GitHub ref) → Experiment → Analysis
```

「控制变量变体」（a1 / a2 …）不做特殊建模 —— 它们是同一 Version 下 `params` 不同的普通 Experiment，靠「同 Version 内 param-diff 视图」体现差异。

## 技术栈（规划）

- 后端：Python + FastAPI
- 前端：Web UI（Tauri 桌面壳可选）
- 三者共用同一 local core（Domain + Index 编译为库）

## 状态

规划阶段。当前仅有架构蓝图，v0.1 待实现。详见 [docs/architecture-blueprint.md](docs/architecture-blueprint.md)。

## 许可证

待定（计划开源，目标：广大科研人员的 agent 助手必备）。
