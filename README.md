# Research Platform（科研管理平台）

本地优先、领域无关、agent 驱动的科研管理平台。

- 文件存你本地磁盘，UI 做可视化归拢（文献 / 想法分支 / 版本 / 实验 / 分析）
- 通过 **MCP 服务**让任意兼容 agent 接管：记录实验、设置参数、分析结果、迭代优化
- 平台**不执行代码**；执行留在本地 `python train.py`
- 领域无关：适用于任何研究方向，参数/指标以键值存储、绝不写死

详见架构蓝图：[docs/architecture-blueprint.md](docs/architecture-blueprint.md)

## 分层模型

```
Literature → Idea(分支树) → Version(GitHub ref) → Experiment → Analysis
```

## 技术栈

- 后端：Python + FastAPI
- 前端：Web UI（Tauri 桌面壳可选）
- 三者共用同一 local core（Domain + Index 编译为库）

## 状态

规划阶段。当前仅有架构蓝图，v0.1 待实现。

## 许可证

待定（计划开源）。
