# Idea Forge v0.1 技术方案评审

> 评审对象：`docs/technical-plan.md`（v0.1 MVP）
> 对照：`product-design.md`（§11 修订为准）、`architecture-blueprint.md`、`README.md`
> 评审性质：交叉技术评审（挑刺、验证可行性、找遗漏）
> 日期：2026-08-31

---

## 1. 总体结论

**有条件通过。** 方案骨架扎实：双 root 存储方向正确、索引"可重建缓存"的心智模型成立、权限边界有清晰意识、MCP/REST 同 core 的架构干净。但有 4 个**阻塞级**问题必须先修：`results.json` 格式自相矛盾（§4.5 与 §13 两种结构并存）、`analysis.is_read` 未读状态无真相归属（rebuild 会丢用户数据）、`meta.status` 与 `status.json.state` 双状态源无同步规则、`update_paper` 的 `fields:dict` 无字段白名单造成权限越界。另有 6 个重要级 gap（git 切分支副作用、跨 root 双向冗余一致性、乐观锁未落到 MCP 工具、proposals 查询工具缺失、kv 类型归一化缺失、事件 seq 持久化缺失）。修完上述问题后即可进入实现。

---

## 2. 问题清单

### 🔴 阻塞级

**[🔴] `results.json` 格式自相矛盾** | §4.5 定义 `{metricSchema, metrics}`，而 §13 与 `create_experiment` 返回示例的 `results_file_convention` 是 `{params, metrics}`。Watcher 与 agent 回写按哪套格式解析？两套并存会直接导致回收失败或丢 params。 | 统一为 `{params?: object, metrics: object, metricSchema?: object}`（params 冗余一份进 results 便于脚本自包含，config.json 仍为真相）；在 §4.5 与 §13 两处同步改，并加 schema 校验测试锁定格式。

**[🔴] `analysis` 的 `is_read`（未读数）没有真相归属** | `mark_read` 工具存在，但索引表 `analyses` 无 `is_read` 列；若放 index.db 则 rebuild 即丢未读状态（违反"重建不丢用户数据"承诺），若写进 agent 生成的 `.md` front-matter 则污染"analysis 由 agent 写"的真相语义。产品收件箱"未读分析(n)"依赖它。 | 在 `.research/experiments/<exp_id>/analyses/<analysis_id>.meta.json` 放独立小文件（`{isRead, readAt, updatedBy}`），不进 md、不进索引；rebuild 重扫该目录不丢。

**[🔴] `meta.status` 与 `status.json.state` 双状态源** | meta.json 存 `status`，status.json 存 `state`+`history`。Watcher"独立原子追加 status.json"，但谁同步 meta.status？若 Watcher 只写 status.json，meta.status 落后导致矩阵/筛选读错；双写则"独立追加"优势丧失。方案未定义同步规则与失败处理。 | 定 status.json 为唯一状态真相（含 history），meta.status 改为派生缓存字段（rebuild/读时回填），所有状态迁移走同一 Storage 方法（内部先锁 status.json 读改写，再更新 meta）。

**[🔴] `update_paper` 的 `fields:dict` 无白名单，权限越界** | 声明为"受限变更"却接受任意 dict，agent 可改 `deletedAt`、`id`、`createdAt` 等只读字段，与权限边界声明（§10）自相矛盾。 | `fields` 改为显式白名单校验：仅允许 `{tags, directions, notes, read_state, year, venue, abstract}`；`id/createdAt/deletedAt` 一律拒绝，返回 `unknown_fields:[]` 回显。

### 🟠 重要

**[🟠] `create_idea` 的 `git checkout -b` 会切换用户工作区** | 新建 Idea 是 agent 高频操作，每次切分支会惊扰用户正在改的代码（甚至丢未提交上下文），git 副作用比预期大；§16 决策点 a 若维持"真做 git"，此实现细节必须先定。 | 默认改为 `git branch <name> <base>` **只创建不切换**；`checkout: bool` 参数显式开启切换；任何 git 写操作前先查 `git status --porcelain`，工作区非空则降级为纯元数据 + `git_applied:false`。

**[🟠] `derivedIdeaIds` 与 `relatedPaperIds` 是跨 root 双向冗余，无一致性机制** | 文献在 `<data_root>`，Idea 在 `<direction_root>`，两文件互为反向索引；创建/删除 Idea 时任一写失败即永久不一致，且不在索引里（重建救不回来）。 | 引入"反向引用补偿队列"：创建 Idea 后异步补写 `derivedIdeaIds`（写失败进 `data_root/pending_refs.json`，下次启动重放）；或退化为查询时实时推导（`idea_papers` 索引表已能算，JSON 里仅存缓存）。

**[🟠] 乐观锁未落地到 MCP 工具层** | §6 声称"写前比对 `expectedUpdatedAt` 返回 409"，但 §9 全部 24 个工具入参 schema 均无 `expected_updated_at`，agent 无法使用乐观锁；多 agent + Watcher 同时迁移状态时只能靠"最后写入胜出"，与方案声明不符。 | 在 `update_experiment_status`、`set_metrics`、`update_paper`、`update_idea_status` 增加可选 `expected_updated_at`；终态重复迁移改为幂等返回当前状态（不报 409），避免 agent 误判。

**[🟠] MCP 缺 proposals 查询工具，agent 闭环断环** | `propose_experiment` 创建提议后，agent 无法查询提议被批准/拒绝——人批准后 agent 不知道何时该 `create_experiment`，§13 步骤 5 的循环在"人等批准"处断掉（REST 有 `GET /proposals`，MCP 没有）。 | 补 `list_proposals`（`{status?: "pending"|"approved"|"rejected", direction_id?, since?}`）与 `get_proposal` 两个只读工具；`propose_experiment` 返回的 `proposal_id` 即轮询句柄。

**[🟠] `kv` 表类型归一化规则缺失** | 值写入 `value_text/value_num/value_bool` 三列的策略未定义。agent 把 `"0.462"`（字符串）写进数值键时，若 value_num 为空，矩阵聚合/排序/Δ 计算会静默漏掉该实验——这正是"零强校验"承诺下的数据腐坏点。 | 定义归一化规则：完整 `parseFloat` 解析成功且无尾随字符 → 同时写 text+num；布尔写 bool；否则只写 text。`get_key_set` 的 `type_inferred` 用多数投票（该键 ≥80% 可解析为数值才推断 number）。

**[🟠] 事件系统落地缺失** | `/events/poll?since=<seq>` 需要持久化事件日志，方案未定义事件存哪、seq 是否跨重启连续、事件表结构。仅靠内存 emit，重启后 `since` 失效，今日动态/角标增量拉取断裂。 | index.db 加 `events` 表（`seq INTEGER PK AUTOINCREMENT, type, data_json, ts`），Storage 写操作成功后 emit；rebuild 时保留 events（或明确今日动态退化为按 `finished_at/created_at` 全量查询）。

**[🟠] 方向目录移动后 index 失效，无修复机制** | `directions.json` 记录旧 `root_path`，用户 clone/移动方向目录后 rebuild 仍读旧路径；方案只写"README 明示"，没有运行时的感知与修复。 | 提供 `ideaforge directions scan <path>`（或启动时校验 root_path 存在性并告警）；方向迁移流程写进 README：复制目录 → 更新 directions.json → `index rebuild`。

**[🟠] `set_metrics` 归类"append-only"却允许覆盖，且 `metric_history` 落点未定义** | §10 将 `set_metrics` 列为 append-only，§9 又允许"已有键覆盖并保留快照"，自相矛盾；快照存哪（results.json 内膨胀？单独文件？）未说。 | 归类改为"受限变更"；快照写入 `results.json` 的 `metricHistory: [{key, oldValue, at, by}]`（上限 20 条，超出截断）；已 done 的实验 `set_metrics` 禁止新增键、仅允许带快照覆盖。

### 🟡 建议

**[🟡] `kv` 表未给索引定义** | EAV 表典型查询是 `(exp_id, kind)` 与 `(kind, key)`，无索引则矩阵聚合/键集合并集退化全表扫。 | 明确 `CREATE INDEX kv_exp ON kv(exp_id, kind)` 与 `CREATE INDEX kv_key ON kv(kind, key)`。

**[🟡] `branch_idea` 与 `create_idea(parent_idea_id)` 功能重复** | 两个工具都是"分叉子 Idea"，agent 难以区分，维护两套参数。 | 收敛：`create_idea` 去掉 `parent_idea_id`（保留 `branch_name/base_ref`），分叉统一走 `branch_idea`。

**[🟡] `get_key_set` 缺 scope 校验与实验级范围** | scope/scope_id 不匹配时（传 `idea` 却给 `version_id`）无错误语义；缺 `experiment` 级范围（单实验键集，Proposal mini-diff 场景需要）。 | 加枚举校验 + 明确 409；可后补 `scope:"experiment"`。

**[🟡] `write_analysis` 的 references 服务端不校验，"强制引用"名不副实** | §4.6 写"只允许已有键"，但实现是"UI warning 才提示"。 | 服务端校验：不存在的键不进 references 并回显 `unknown_references:[]`，UI 与 agent 都能拿到。

**[🟡] 缺幂等机制** | agent 网络重试可能重复 `create_experiment`/`write_analysis`，污染矩阵数据。 | `create_experiment` 加可选 `client_ref`（`<uuid>`，索引建唯一约束，重复调用返回既有记录）。

**[🟡] `meta.status` 用 `abandoned` 表达 Idea 废弃，与统一 `deletedAt` 语义重叠** | 两套软删标识并存，查询过滤需双条件，易漏。 | 统一为 `status` 三态驱动（abandoned 即软删），`deletedAt` 仅作时间戳记录，不参与过滤判断。

---

## 3. 对 §16 三个待决策点的建议

**a. `create_idea` v0.1 真做 git：推荐做，但改"不切分支"。** Idea=git branch 是 §11.2 的产品核心心智，v0.1 不做则矩阵行头、分支树 branch 全是假数据，产品验证价值打折；且 git 失败已有降级路径，风险可控。但实现上必须用 `git branch`（创建不动 HEAD）而非 `git checkout -b`，并把切换工作区做成显式 `checkout` 参数——这是 agent 高频调用下的基本 git 安全。同时保留 `git_applied` 标志与降级。

**b. 前端拆三件套：推荐拆。** 矩阵/热力/自定义列复杂度高，单文件会膨胀到难以维护；原生三件套不引入任何构建工具（`<script type="module">` + FastAPI StaticFiles 即可），拆零成本。建议顺带把 js 按模块再切（view/router/api），但别引框架。

**c. `IDEAFORGE_DATA` 语义：方案正确，但名字有歧义。** 用户易误解为"指向我自己的研究数据目录"，实际它放平台元数据。建议改名 `IDEAFORGE_HOME`（或 `IDEAFORGE_ROOT`）并在 README 明确："这里只存平台元数据（方向注册表/全局文献/索引），你的研究文件在各自工作目录"。语义本身（全局数据根 + 方向工作目录在注册表）确认无误。

---

## 4. 实现顺序调整建议

1. **M2 与 M3 之间必须冻结 sentinel/results 协议**：先解决 §2 阻塞级问题 1 的格式冲突，否则 M3 的 kv 倒排、M7 的 Watcher 全部建立在错误契约上。
2. **Watcher 闭环从 M7 提前到 M4 之后**（与 M5 并行）：异步闭环是产品核心卖点，也是并发竞态（agent 回写 vs Watcher）最集中的地方，越晚验证返工面越大。用最小实现验证"create_experiment → 本地跑 → sentinel → Watcher done+metrics → write_analysis"端到端链路，再铺 UI；矩阵/今日动态的正确性依赖它。
3. **M4 MCP 需同步补 `list_proposals`**（问题清单 🟠），否则闭环验收不完整。
4. M6 UI 依赖 M3 key_set + M5 REST，顺序不动；但自定义列预设（views.json）的最小结构（`{id, name, scope, columns[]}`）应在 M3 前定义，避免 UI 返工。
5. M2 阶段补两组测试：kv 类型归一化规则、status.json 双写同步——这两个是数据腐坏与一致性的重灾区。

---

## 5. 摘要

**结论：有条件通过**，修完 4 个阻塞级问题后可进实现。最关键三点：① `results.json` 格式（`{metricSchema,metrics}` vs `{params,metrics}`）自相矛盾，Watcher/agent 回收会失效，必须统一；② `analysis.is_read` 未读状态无真相归属，落 index.db 则 rebuild 丢数据，需独立 meta 文件；③ `update_paper` 的 `fields:dict` 无白名单，agent 可越权改只读字段。次关键：`git checkout -b` 改 `git branch` 不切工作区、MCP 补 proposals 查询工具、kv 类型归一化规则需定义；Watcher 闭环建议提前验证。
