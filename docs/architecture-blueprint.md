# Idea Forge —— 开源科研管理平台 · 架构蓝图（v0 规划）

> 由三角色专家团（系统架构 / 实验追踪·MLOps / 前端可视化+开源运营）产出，合成自统一讨论结论。
> 本文档为**蓝图级**：只定模块、数据流、约束与路线，**不写代码、不落具体 JSON 字段**（字段级为后续阶段）。

---

## 0. 一句话定位

**本地优先、领域无关、agent 驱动的科研管理平台。**
文件存你本地磁盘，UI 做可视化归拢，MCP 服务让任意兼容 agent 接管「记录实验 / 设参数 / 分析结果 / 迭代优化」。平台本身**不执行代码**，只管和「看清、归类」有关的一切。

---

## 1. 领域分层模型（自顶向下，全通用）

```
Literature(文献) → Idea(想法分支树) → Version(版本,映射 GitHub ref) → Experiment(实验) → Analysis(分析)
```

- **Literature**：任何研究者都要的文献库（PDF + 笔记 + 标签 + 关联想法）。
- **Idea**：顶层分支树节点，可不断分叉。
- **Version**：一对一映射一个 `git_ref`（commit/branch）。平台不存代码，只记「这次实验基于哪份代码状态」。
- **Experiment**：挂在某个 Version 下的一次运行；携带自己的 `params`（键值）与 `metrics`（键值），**参数名绝不写死**。
- **Analysis**：跑完后由 agent（或人）写回的复盘文本，作为一等公民附着在 Experiment/Version/Idea 上。

**「控制变量变体」（a1/a2…）不做特殊建模**：它们是同一 Version 下 `params` 不同的普通 Experiment，靠「同 Version 内 param-diff 视图」可视化差异。

---

## 2. 模块分解

| 模块 | 职责 | 边界 |
|---|---|---|
| **Storage Layer** | 唯一直接碰磁盘的层；按约定组织文件，原子写入（先写临时再 rename） | 唯一真相在磁盘 |
| **Index Layer** | 轻量 SQLite，只存派生元数据（键值参数/指标、状态、finished_at、文件路径指针），不存大文件 | 由 Storage 写操作时同步更新；可重建 |
| **Domain Model** | 内存中的概念树 + 状态机（pending/running/done/failed），对上给 API、对下不碰盘 | 语义中枢 |
| **MCP Gateway** | 把领域能力暴露为 MCP 工具集；无状态转发 | agent 入口，不持业务状态 |
| **Web/UI Layer** | 薄前端，调用与 MCP 相同的本地核心 API | 只做展示 |
| **Execution Layer（可选）** | 后端 spawn 子进程跑 `python train.py`，捕获退出码/stdout，触发回调 | 后期增强 |
| **Watcher（可选）** | 监听长任务进程，结束写回状态 + finished_at，向订阅 agent 发完成信号 | 配合本地运行模式 |

**核心原则**：磁盘文件是唯一真相；Index 与内存模型均为缓存/视图，可随时从 Storage 重建。

---

## 3. 本地存储与索引哲学

- 一个研究项目 = 仓库根目录，含隐藏目录 `.research/`（平台元数据 + SQLite 索引）；用户科研文件（文献、代码、结果）平铺在普通子目录，**不被平台接管**。
- 目录树按 `idea/version/experiment/` 组织；每个 Version 复用 Git（平台不自己实现版本历史）。
- 大产物（checkpoint、日志）留原处，索引只存路径指针 + 大小；软删除版本只保留小元数据 + 小结果，大 artifact 由 pruning 清理。
- **可移植性**：整目录 `git clone` 即迁移；SQLite 是缓存，丢失可重建。跨机器同步靠 Git，不引入额外同步协议——对开源用户最友好。

---

## 4. MCP 网关设计

- **能力面（工具类别）**：项目/文献管理、Idea 树读写、Version 创建、Experiment 记录（schema-flexible 参数/指标键值）、状态查询、Analysis 写入、异步完成订阅。
- **传输**：默认 **stdio**（agent 直接 spawn 平台 MCP 子进程，零端口零网络，最契合「手机连电脑、agent 跑电脑」）；并行提供 **HTTP/SSE** 供多 agent/手机接收完成回调。
- **多 agent 接入**：网关无状态、本地仅信任本机；任意 MCP 兼容客户端按标准握手即可连，不绑定特定 agent。

---

## 5. 实验追踪与异步自治闭环

**状态机**：`pending → running → done / failed`，终态写 `finished_at`。

**两种完成回调机制**：
- (a) 平台执行自动回调（可选后阶段）：后端子进程退出即回调，天然可靠。
- (b) **本地运行 + 轻量 Watcher（建议先实现）**：你本地 `python train.py`，脚本结束写 `done-sentinel`（结果 JSON / `.done`）；Watcher 监听到后重新调用 agent。零侵入、符合「平台不执行代码」约束。

**Agent 自主研究循环**：
`Agent 提议 → 人类批准 → 异步运行 → 完成回调 → Agent 分析 → 提议下一实验`
平台必须提供契约：状态查询、结果读取（params/metrics 键值）、分析回写、新建 Experiment（指定 version_id + params）。

**键值约定**：Experiment 可声明可选 `metric_schema`（名+类型+单位，仅提示），真正写入的是 `metrics` 键值对；平台只存取、不校验语义，保持领域无关。

**废弃版本保留/剪枝**：软删除 Version 保留轻量元数据 + 其下实验 params/metrics 摘要 + analysis（「探索过此版本」有据可查）；model checkpoint 等大文件标 `large_artifact`，软删时从磁盘 prune，仅留路径指针。

---

## 6. 前端与可视化

**四类核心视图**：
1. **文献库**：搜索/标签/按「是否已衍生 Idea」筛选，显示派生 Idea 数。
2. **Idea 分支树**：Git 图谱式横树，节点色编码状态（活跃/已验证/已放弃半透明），角标显示 Version 数与最佳指标。
3. **Version × Experiment 矩阵**：行为 Version、列为批次/时间轴，单元格为实验数 + 聚合指标热力图——直接把 40–50 个散落结果收敛成一张可扫视的表。
4. **实验详情 + 结果仪表盘**：params 键值动态渲染；可按任意 param 分组、任意 metric 排序画图。

**参数变体可视化**：同 Version 下自动聚为「变体族（Variant Family）」并标注差异维度；选中两个实验并排 Param Diff（同键折叠、异键高亮 + 指标差值）；单参数扫描折线、双参数热力图、多实验平行坐标图——所有轴从实际键集合动态生成，不预设字段。

**人类审阅（手机为主）**：移动端首页仅三块——运行中进度、今日完成/失败结果卡、Agent 新分析摘要（可展开）。长训练完成由本地核心发通知事件，摘要卡自动出现，人无需主动查。

**形态推荐**：本地进程 + 浏览器 Web UI 首选（一套前端同时服务本机 localhost 与手机局域网访问）；必要时用 Tauri 轻量壳打包桌面。MCP 与 UI 的 HTTP API 是同一 local core 的两个适配器。

---

## 7. 技术栈建议

- **后端**：Python + FastAPI（生态成熟、MCP SDK 现成、单人维护友好）。
- **前端**：Web 优先，Tauri 壳共享同一套前端；核心 Domain+Index 编译为库，Web / Tauri / MCP 三者共用，行为一致。

---

## 8. 开源发布路线

- **仓库结构**：`core/`(领域+存储) · `mcp/` · `api/`(UI 用 HTTP) · `web/` · `docs/` · `examples/`。
- **上手三步**：`clone` → 一条命令拉起本地进程 → 把生成的 MCP 配置粘进 Agent 客户端，UI 自动可用；数据目录由单个配置文件指定。
- **贡献者引导**：`CONTRIBUTING.md` 明分层边界（UI 层禁写业务逻辑）、`good-first-issue`、示例数据一键载入。
- **路线图**：
  - **v0.1** 本地核心 + 文献/Idea/Version/Experiment CRUD + MCP server + 极简列表 UI
  - **v0.2** Idea 树 + Version×Experiment 矩阵
  - **v0.3** 参数差异与仪表盘图表
  - **v0.4** 移动端摘要视图 + 通知
  - **v0.5** 桌面打包 + 软删除清理工具
  - **later** 可选执行层（本地 runner 插件）

---

## 9. 风险汇总（需团队后续确认）

- **Git 依赖**：版本层强依赖用户 Git 工作流，需定义「未初始化 Git」降级路径。
- **索引一致性**：进程崩溃可能致索引滞后，需启动 hash 比对重建策略。
- **软删除边界**：「小结果」需量化阈值，避免 prune 误删可恢复数据。
- **MCP 并发写**：多 agent 同写需乐观锁 / 最后写入胜出。
- **Schema 灵活性的代价**：键值无强类型，diff 与可视化需运行时推断，UI 复杂度上升；提供「常用键提示 + 可保存视图预设」缓解。
- **结果缺失**：`finished_at` 后校验 metrics 是否存在，缺失标 warning 而非静默 done。
- **Agent 误读指标**：metrics 带明确单位，analysis 回写强制引用 metric 键名。
- **Watcher 健壮性**：同时监控进程退出码与超时。
- **UI 复杂度蔓延**：每个视图只保留一个核心问题，图表库从简，v0.1 刻意「丑但可用」。
- **移动端暴露安全**：默认绑 localhost，远程访问需显式开启 + token。

---

## 10. 下一步建议（待你定）

1. **字段级设计**：把各 JSON（literature/idea/version/experiment/analysis）的具体字段与 status.json 定下来——这是 v0.1 的直接输入。
2. **或直接 v0.1 骨架**：后端 + 极简 UI + MCP server 最小可用版。
3. （可选）先实现本地运行 + Watcher 闭环，验证 agent 异步自治可行。
