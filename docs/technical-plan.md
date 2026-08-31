# Idea Forge —— 技术方案（v0.1 MVP）

> 由专家团产出（后端架构师 + MCP/API 专家），合成自架构蓝图（`architecture-blueprint.md`）与产品交互规格（`product-design.md`，以 §11 修订为准）。
> 本文档定案：**技术栈 / 目录结构 / 字段级数据模型 / SQLite 索引 / MCP 服务 / REST API / 异步闭环**，是阶段 4 实现的直接输入。

---

## 0. 领域模型基准（§11 修订后，唯一真相）

```
Direction(研究方向 = 一个 GitHub 仓库 + 一个本地目录)
  → Literature(文献，全局库，directions:[] 支持跨方向共用)
  → Idea(= 该方向仓库的一条 git branch，可分叉，软删除保留记录)
    → Version(= 该分支上的某次 commit)
      → Experiment(params/metrics 键值，字段名绝不写死)
        → Analysis(agent 或人写回复盘)
```

- 用户可有多个 Direction；每个 Direction 独立本地目录 + 独立 git 仓库 + 独立 `.research/` 元数据。
- 今日动态 / Agent 收件箱是**跨方向**的。
- 实验状态机 `pending → running → done / failed`，终态写 `finished_at`。
- 废弃版本/想法软删除：保留轻量元数据，大产物（模型 checkpoint 等）标 `large_artifact` 可 prune。
- **移动端已砍**：v0.1 纯桌面 Web UI，无响应式适配。

---

## 1. 技术栈定案

| 项 | 定案 | 一句话理由 |
|---|---|---|
| 后端 | **Python 3.11+（推荐 3.12）+ FastAPI** | 生态成熟、MCP 官方 SDK 同栈、单人多仓维护成本最低 |
| 前端 v0.1 | **原生 HTML/CSS/JS 单文件，FastAPI `StaticFiles` 托管** | 用户已定"凑合"；不引框架/构建工具，零编译、一条命令可跑 |
| 存储 | **本地文件系统（JSON 为唯一真相）+ 单文件 SQLite 索引（可重建缓存）** | 可移植、可 diff、不依赖数据库服务；索引只加速查询 |
| MCP | **官方 `mcp` Python SDK + `FastMCP` 便捷层（stdio 为主）** | 规范同步演进、Pydantic 自动生成 schema；v0.1 只做 stdio |
| Pydantic | **用 v2**（FastAPI 已内建） | 校验快；但 params/metrics 一律 `dict[str, Any]` 透传，绝不套强 schema |
| SQLite 访问 | **标准库 `sqlite3`，不引 SQLAlchemy / Alembic** | 单文件缓存 + 表结构 ≤10 张，`user_version` 管 schema 版本，索引可"删表重建" |
| 异步 | FastAPI async + uvicorn，v0.1 单进程 | 全量操作量小，无并发瓶颈 |
| 推送 | v0.1 **15s 轮询为主**（`/events/poll`）；可选 `sse-starlette` 真 SSE，同游标并存 | 产品设计 §9 明确允许轮询，减复杂度 |

**取舍说明**：放弃 SQLAlchemy 换来零额外依赖、rebuild 即迁移；放弃 Alembic 换来"索引是缓存，坏了就重建"的心智模型——数据迁移压力全部转移到 JSON schema 的 `schemaVersion` 字段上。

---

## 2. 仓库目录结构

```
D:\idea-forge\
├─ pyproject.toml            # 打包 + CLI 入口（ideaforge serve / mcp / index rebuild / watch）
├─ core/                     # 纯库：领域 + 存储 + 索引，无网络入口
│  ├─ domain/                # 实体、状态机（pending/running/done/failed）
│  ├─ storage/               # 目录布局常量、原子写、JSON IO、counters
│  └─ index/                 # SQLite 表定义、查询、rebuild 全量重建
├─ api/                      # FastAPI 应用：REST 路由、SSE、静态托管挂载
├─ mcp/                      # MCP server（官方 SDK + FastMCP）
├─ web/                      # v0.1 前端（index.html / app.js / style.css）
├─ docs/
├─ examples/                 # 示例数据一键载入脚本（含假想 metric 键）
└─ tests/
```

CLI 入口四命令：`ideaforge serve`（拉起 API + 静态托管）、`ideaforge mcp`（stdio 子进程）、`ideaforge index rebuild`、`ideaforge watch`（Watcher 兜底回收，见 §13）。

---

## 3. 用户数据目录布局（双 root 设计）

- **`<data_root>`**（全局真相，默认 `~/.idea-forge`）：方向注册表 + **全局文献库** + **全局 SQLite 索引** + 用户视图预设。文献是跨方向实体，物理上独立于任何 Direction，否则"共用"会变成多份复制。
- **`<direction_root>/.research/`**（每方向真相，随用户工作目录存在）：该方向专属实体（Idea/Version/Experiment/Analysis）的 JSON。`.research/` 加入方向仓库的 `.gitignore`，平台不污染科研仓库。

```
<data_root>/                          ~/.idea-forge/
├─ config.json                        # 全局配置（data_root 自身、token、SSE 端口）
├─ directions.json                    # 方向注册表：id → {name, root_path}
├─ views.json                         # 用户自定义列/视图预设（★不进索引，重建不丢）
├─ literature/                        # 全局文献库
│  └─ <lit_id>/meta.json              # 可选 notes.md、pdf 副本或指针
└─ index.db                           # 全局 SQLite（单文件索引）

<direction_root>/                     用户工作目录（git repo）
├─ .research/
│  ├─ config.json                     # 方向配置（见 §4.1）
│  ├─ counters.json                   # 递增计数器：exp_seq / version_seq / idea_seq
│  ├─ ideas/<idea_id>/meta.json
│  ├─ versions/<version_id>/meta.json
│  ├─ experiments/<exp_id>/
│  │  ├─ meta.json
│  │  ├─ config.json                  # params 键值
│  │  ├─ results.json                 # metrics 键值 + 可选 metricSchema
│  │  ├─ status.json                  # 状态机
│  │  └─ analyses/<analysis_id>.md    # Markdown + YAML front-matter
│  └─ artifacts/                      # 大产物指针记录（不存文件本身）
└─ …用户自己的科研文件（平台绝不接管）
```

**index.db 放全局 `<data_root>`**：今日动态 / 收件箱 / 全局搜索跨方向，单库 + `direction_id` 列过滤最省事；方向级查询只是加 WHERE。方向 `.research/` 内不重复建库。

---

## 4. 字段级 JSON Schema

> 约定：ID 一律无横线 uuid4 hex；时间一律 UTC ISO8601；`schemaVersion` 每文件携带；软删除 = `deletedAt: null|ISO8601`。以下 JSON 即"照此写代码"的字段契约。

### 4.1 `<direction_root>/.research/config.json`（方向配置，唯一真相）

```json
{
  "schemaVersion": 1,
  "id": "dir-9f3c2a1b",
  "name": "IM-复杂网络",
  "repoPath": "/home/user/projects/im-complex-network",
  "gitRemote": "git@github.com:user/im-complex-network.git",
  "createdAt": "2026-08-31T10:00:00Z",
  "defaultParams": ["lr", "dropout"],
  "defaultMetrics": ["influence_spread", "time"],
  "metricDeclarations": {
    "influence_spread": { "type": "float", "unit": "normalized", "higherIsBetter": true }
  }
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `id` / `name` | str | 方向 ID（注册表主键）、显示名 |
| `repoPath` | str\|null | 即 direction_root 绝对路径；**允许 null**（未初始化 git 降级） |
| `gitRemote` | str\|null | GitHub remote URL；仅记录，不强制拉取 |
| `defaultParams` / `defaultMetrics` | str[] | 仅 UI"常用键提示"，**非白名单**，任何键都可写 |
| `metricDeclarations` | object | 用户显式声明的指标方向/单位（驱动 UI Δ 染色），缺省为空对象 |

### 4.2 `<data_root>/literature/<lit_id>/meta.json`（全局文献）

```json
{
  "schemaVersion": 1,
  "id": "lit-b2d4e6f8",
  "title": "Influence Maximization in Complex Networks",
  "authors": ["Kempe", "Kleinberg", "Tardos"],
  "year": 2003,
  "venue": "KDD",
  "tags": ["复杂网络", "影响力最大化"],
  "directions": ["dir-9f3c2a1b", "dir-5a1c2d3e"],
  "readState": "unread",
  "notes": "…markdown…",
  "derivedIdeaIds": ["idea-…"],
  "pdfPath": "literature/b2d4e6f8/paper.pdf",
  "createdAt": "2026-08-31T10:00:00Z",
  "deletedAt": null
}
```

- `directions[]` 是"共用"机制：文献库按当前 direction 过滤 = `directions` 包含当前 id 即显示；`shared` 徽章 = 长度 ≥2。
- `readState`：`unread | reading | read`。
- `derivedIdeaIds` 是派生索引的反向冗余，由 Storage 创建/删除 Idea 时同步维护，供文献库"已衍生"筛选 O(1)。

### 4.3 `.research/ideas/<idea_id>/meta.json`

```json
{
  "schemaVersion": 1,
  "id": "idea-c1a9b2c3",
  "directionId": "dir-9f3c2a1b",
  "parentIdeaId": null,
  "name": "影响力最大化主干",
  "status": "active",
  "hypothesis": "贪心近似在均匀图上有 1-1/e 下界…",
  "gitBranch": "im/influence-max-main",
  "relatedPaperIds": ["lit-b2d4e6f8"],
  "createdAt": "2026-08-31T10:00:00Z",
  "updatedAt": "2026-08-31T10:00:00Z",
  "createdBy": "human",
  "deletedAt": null
}
```

| 字段 | 说明 |
|---|---|
| `status` | `active \| validated \| abandoned`（与 UI 三态一一对应） |
| `gitBranch` | 本 Idea 对应的方向仓库 branch 名；**可 null**（git 降级模式） |
| `parentIdeaId` | null = 根节点；分叉 = 复制父 `meta.json` 后改 id/parent/name/branch |

**Idea 软删除**：置 `status: "abandoned"` + `deletedAt`（不删 branch 历史，UI 半透明展示）。

### 4.4 `.research/versions/<version_id>/meta.json`

```json
{
  "schemaVersion": 1,
  "id": "v-a3f1e2d4",
  "ideaId": "idea-c1a9b2c3",
  "name": "a2",
  "gitRef": "8b1d4f9e",
  "fullGitRef": "8b1d4f9e3c2a1b…(40)",
  "status": "active",
  "message": "add CELF optimization",
  "createdAt": "2026-08-31T10:00:00Z",
  "deletedAt": null
}
```

- `name` 在该 Idea 内自动递增（a1, a2, a3…），由 `counters.json` 提供，UI 矩阵行头显示。
- `gitRef` = commit 短 hash（8 位，UI 用），`fullGitRef` = 完整 hash（校验/追溯用）。
- 软删除：`status: "archived"` + `deletedAt`；其下实验只降级为 `opacity .5` 显示，**不 cascade 删除**。

### 4.5 `.research/experiments/<exp_id>/`（四个文件，生命周期各不同）

**`meta.json`（创建即生成，全生命周期更新）：**

```json
{
  "schemaVersion": 1,
  "id": "exp-048",
  "versionId": "v-a3f1e2d4",
  "name": "lr=0.005 dropout=0.3",
  "status": "pending",
  "createdAt": "2026-08-31T10:00:00Z",
  "finishedAt": null,
  "runtimeS": null,
  "createdBy": "agent",
  "gitRef": "8b1d4f9e",
  "heartbeatAt": null,
  "warning": false
}
```

| 字段 | 何时写 |
|---|---|
| `status` | `pending`（创建）→ `running`（agent 标开始）→ `done \| failed`（终态，不可逆） |
| `finishedAt` / `runtimeS` | **仅终态写**，其余时刻为 null |
| `heartbeatAt` | running 期间由 Watcher 心跳更新（UI"上次心跳"文案的数据源） |
| `warning` | 终态 `done` 但 metrics 为空时置 true（UI 降级为"完成·缺指标"） |
| `gitRef` | 创建时快照当前 HEAD，与结果的可复现绑定 |

**`config.json`（创建即生成 = params 纯键值）：**

```json
{ "lr": 0.005, "dropout": 0.3, "hidden_dim": 128, "seed": 42 }
```

**`results.json`（仅 done 时由 agent/人写入；metrics + 可选 schema 声明）：**

```json
{
  "metricSchema": {
    "influence_spread": { "type": "float", "unit": "normalized", "higherIsBetter": true },
    "time": { "type": "float", "unit": "seconds" }
  },
  "metrics": { "influence_spread": 0.462, "time": 124.3 }
}
```

> **协议冻结（评审修订）**：`results.json` **只含 `metrics` 与可选 `metricSchema`，绝不包含 `params`**（params 归属 `config.json`，创建时已定、运行中不变）。Watcher 回收时从 `config.json` 读 params、从 `results.json` 读 metrics。此协议是 agent 脚本、`suggested_command` 与 Watcher 的**唯一约定**，任何改动必须同步修改 §13 与 `create_experiment` 返回的 `results_file_convention`。

**`status.json`（状态机历史，append-only 审计日志）：**

```json
{
  "state": "done",
  "history": [
    { "state": "pending", "at": "…", "by": "agent" },
    { "state": "running", "at": "…", "by": "agent" },
    { "state": "done",   "at": "…", "by": "agent" }
  ]
}
```

> **状态源规则（评审修订）**：`meta.status` 是**唯一权威状态**（查询 / UI / 索引一律以它为准）；`status.json` 是**不可变审计日志**（append-only，仅用于追溯与崩溃恢复）。Watcher / agent 更新状态时严格两步：① append `status.json` 历史 → ② 原子更新 `meta.status`（若第 ② 步失败则回滚本次状态变更）。**不允许**把 `status.json.state` 当查询源。

### 4.6 `.research/experiments/<exp_id>/analyses/<analysis_id>.md`

```markdown
---
id: an-7d5e3c1b
experimentId: exp-048
source: agent
author: "claude"
createdAt: "2026-08-31T14:22:00Z"
adopted: false
references: ["influence_spread", "time"]
---

## 复盘
lr 从 0.001 提到 0.01 时 **influence_spread** 持续上升…
```

- 用 Markdown + YAML front-matter 而非纯 JSON：可 diff、agent 直接写、Git 友好。
- `references` 引用约定：只允许写该实验实际存在的 `params`/`metrics` 键名（front-matter 与正文中同名键由 UI 渲染为 chip）；引用不存在键 → UI warning。这是"analysis 强制引用 metric 键名"的落地点。
- **未读状态归属（评审修订）**：`is_read` **不写进 agent 的 md**（避免污染来源语义），也**不进 index.db**（避免 rebuild 丢失用户状态），统一存全局 `<data_root>/read_state.json`：`{"an-<id>": {"read": false, "readAt": null}}`。索引 rebuild 不触碰该文件。

### 4.7 "字段不写死"的实现机制

- `params`/`metrics` 是**纯 JSON object**：键任意、值类型任意（str/num/bool/list）。
- `metricSchema` 只是**声明**（提示类型/单位/方向），Storage 与 Index **绝不强校验**——写入成功即接受，未知键照样进索引、照样参与 UI 键集合。
- 平台代码中不出现任何 `lr`、`accuracy` 之类字样（仅 examples/ 示例数据允许）；所有列/轴/筛选器由运行时键集合生成。

---

## 5. SQLite 索引表设计（`<data_root>/index.db`）

用途均为加速：全局搜索 / 筛选 / 键集合并集与基数 / 今日动态 / diff 聚合。`user_version=1`。

| 表 | 关键列 | 用途 |
|---|---|---|
| `directions` | direction_id PK, name, root_path, git_remote | 注册表、方向切换器 |
| `papers` | paper_id PK, title, authors_json, year, venue, tags_json, directions_json, read_state, derived_idea_ids_json, created_at | 文献筛选/排序 |
| `papers_fts` | FTS5(title, authors, notes) | 全文搜索（⌘K 全局搜索） |
| `ideas` | idea_id PK, direction_id, parent_idea_id, name, status, git_branch, updated_at | 分支树、三态过滤 |
| `idea_papers` | idea_id, paper_id（联合 PK） | 文献↔Idea 多对多 |
| `versions` | version_id PK, idea_id, name, git_ref, status | 矩阵行头 |
| `experiments` | exp_id PK, version_id, idea_id, status, created_at, finished_at, runtime_s, created_by, git_ref, warning | 状态机、今日动态、矩阵聚合 |
| `kv`（EAV 倒排） | exp_id, kind('param'\|'metric'), key, value_text, value_num, value_bool | **键并集 / 取值基数 / 数值排序 / 变体族聚类**；`value_num` 供图表与 Δ 计算 |

**kv 类型归一化（评审修订）**：写入 kv 时，仅当值可 `parseFloat` 才填 `value_num`，否则 `value_num=NULL`、原值入 `value_text`；数值聚合 / Δ 计算只作用于 `value_num` 非 NULL 的行——字符串误写进数值键不会静默丢聚合。
| `analyses` | analysis_id PK, experiment_id, source, author, created_at, adopted, references_json | 收件箱列表、来源徽章；未读状态读 `read_state.json`（不在库内） |
| `events` | seq INTEGER PK AUTOINCREMENT, type, data_json, ts | 事件游标（轮询/SSE 用）；**易失**，rebuild 清空后前端以 `since=0` 全量拉取兜底 |
| `proposals` | proposal_id PK, version_id, title, rationale, proposed_params_json, based_on_experiment_ids_json, confidence, status, created_at | 收件箱提议列表与状态流转 |

**重建入口**：CLI `ideaforge index rebuild` = 清空全部表 → 递归遍历 `<data_root>/literature` 与每个 `<direction_root>/.research` 的 JSON 重灌（含 kv 倒排重算）。UI 侧栏"索引状态 → 手动重建"调同一接口。**`views.json` 不属于索引**，重建不丢用户预设。

---

## 6. 一致性规则

1. **原子写**：所有 JSON 写入先写 `.<name>.tmp.<uuid>` 再 `os.replace()` 到目标；目录先 `mkdir(parents=True, exist_ok=True)`。读取遇到 `.tmp` 残留一律忽略。
2. **写路径**：只允许 `Storage → 写文件成功 → 更新 Index` 单向流动；Index 更新失败仅打日志降级（真相已在磁盘），启动时对账补偿。
3. **软删除**：统一 `deletedAt`（null=存在）；查询默认过滤。`large_artifact` 约定：`results.json` 可选 `largeArtifacts: [{path, size, pruned: false}]`，软删时只 prune 该数组内 `pruned:false` 且磁盘存在的文件，随后置 `pruned:true`（保留路径指针 + `已清理` 徽章）。**不做自动猜大**，只清显式标记。
4. **并发写**：v0.1 单进程（API 与 MCP 各自独立进程，共同直连同一 SQLite），冲突面为 Watcher/多 agent——建议 **乐观锁**：每实体 `updatedAt` + 写前比对（传入方带 `expectedUpdatedAt`，不符返回 409）；`counters.json` 这类共享计数器用**文件锁**（POSIX `fcntl` / Win `msvcrt.locking`）包原子读改写。LWW（最后写入胜出）为兜底策略，冲突只丢旧值不丢文件。
5. **状态机终态不可逆**：`status.json` 只 append，done/failed 后拒绝再次转 running。
6. **跨 root 冗余一致性（评审修订）**：`literature.meta.derivedIdeaIds` 只是 `idea_papers` 索引的 UI 快捷缓存，**权威在 `idea_papers`**；Storage 在创建/删除 Idea 关联时单向同步该字段，索引 rebuild 以 meta 重建，不一致时由 Storage 写路径修正。

---

## 7. 风险清单（后端视角）

1. **git branch ↔ idea 元数据漂移**：建 Idea 时分支创建失败 / 用户手动改分支名 → 元数据与仓库不一致。对策：git 操作失败即回滚 meta；提供 `ideaforge sync-git` 扫描仓库分支与 ideas 比对报警。
2. **共享文献引用一致性**：方向软删后其 `directions[]` 残留、文献软删后其他方向仍引用。对策：删方向时批量剥离其 `directions[]` 引用；文献只软删不硬删；`derivedIdeaIds` 由 Storage 单一写路径维护。
3. **SQLite 重建丢状态**：索引是缓存，但 `metricDeclarations`、视图预设等用户配置若混进索引会丢。对策：这些一律存 JSON（`views.json` / `config.json`），重建只动索引。
4. **实验 id 生成**：`exp-048` 需要方向内递增。对策：`counters.json` 文件锁原子递增；崩溃恢复时若目标目录已存在则顺延跳过。
5. **done 缺 metrics**：终态校验 + `warning` 标志（产品已定），不静默 done。
6. **崩溃致索引滞后**：启动时比对 JSON 文件数/时间戳，差异大则提示重建，差异小则增量补。
7. **results.json 失控膨胀**：约定中间日志/原始输出不入 results.json，一律走 `largeArtifacts` 指针。
8. **git 未初始化降级**：`repoPath`/`gitBranch` 可 null，Version 用 `name` 序号降级（`fullGitRef` 填本地短 hash），不阻塞主流程。
9. **`.research/` 与 git 的关系**：默认 gitignore，方向迁移靠目录整体拷贝或后续 export 命令——需在 README 明示，避免用户 clone 后以为元数据会跟着走。

---

## 8. MCP 实现选型

**推荐：官方 `mcp` Python SDK（≥1.2），用其自带 `FastMCP` 便捷层写 server。**

| 方案 | 结论 | 理由 |
|---|---|---|
| 官方 `mcp` SDK + `FastMCP` | ✅ 采用 | 协议由规范维护方同步演进；`FastMCP` 用 Pydantic model 自动生成 JSON schema，正好覆盖"工具入参 schema 化"需求；`server.run(stdio)` 一行跑通 |
| 社区 `fastmcp` 独立包 | ❌ 不用 | 能力已被官方 FastMCP 覆盖，更新节奏与规范有 offset |
| 手写 JSON-RPC | ❌ 不用 | 需自行实现 initialize/能力协商/notifications，纯造轮子且易错 |

**传输：v0.1 只做 stdio。** 理由：产品场景是"agent 在电脑本地"（WorkBuddy 连电脑），stdio spawn 子进程零端口零网络最稳；HTTP/SSE（streamable-http）的唯一动机是多 agent/远程读取，而移动端已砍（§11.6），无此场景。**预留**：server 入口拆成 `run_stdio()` / `run_http()` 两个函数，v0.2 用 `FastMCP.run(transport="streamable-http")` 即可补上，core 不用动。

**进程模型**：MCP server 是独立 CLI 进程 `ideaforge mcp`（`console_scripts` 入口），**不与 FastAPI 同进程**；二者各自直连同一 SQLite 索引（WAL 模式 + 重试）。

---

## 9. MCP 工具清单（24 个，可直接照此实现）

统一规则：① 所有工具返回信封 `{ok, context:{direction_id, ts}, data}`；② `direction_id` 缺省取进程级"当前方向"（由 `switch_direction` 设置），每个返回都回显 context 防 agent 串方向；③ `params`/`metrics` 一律 `dict[str, any]` 透传，平台只存不校验语义；④ **受限变更工具**（`update_paper` / `update_idea_status` / `update_experiment_status` / `set_metrics` / `link_paper_to_idea` / `mark_read`）入参支持可选 `expected_updated_at?: str`（乐观锁），不匹配返回 `{ok:false, error:"conflict", current_updated_at}`（评审修订）。

### A. Direction（研究方向）
| 工具 | 用途 | 入参 schema | 返回 data |
|---|---|---|---|
| `list_directions` | 列出所有研究方向 | `{}`，可选 `{include_archived?: bool=false}` | `{directions:[{direction_id,name,repo_path,branch_count,idea_count,experiment_count,updated_at}], total}` |
| `create_direction` | 新建方向 = mkdir + `git init`（已有仓库则复用）+ 初始化 `.research/` | `{name: str, repo_path: str}` | `{direction_id,name,repo_path,git_init: bool,created_at}` |
| `switch_direction` | 设定"当前方向"上下文 | `{direction_id: str}` | `{current:{direction_id,name,repo_path,git_head,updated_at}}` |

### B. Literature（全局库，`directions:[]` 跨方向共用）
| 工具 | 用途 | 入参 schema | 返回 data |
|---|---|---|---|
| `search_papers` | 标题/作者/笔记/标签全文检索 | `{query: str, tags?: str[], direction_id?: str, limit?: int=20, offset?: int=0}` | `{results:[{paper_id,title,authors,year,venue,tags,directions,derived_idea_ids,read_status}], total}` |
| `add_paper` | 新增文献条目 | `{title: str, authors?: str[], year?: int, venue?: str, doi?: str, url?: str, tags?: str[], directions?: str[], abstract?: str, notes?: str, local_pdf_path?: str}` | `{paper_id, created_at}` |
| `update_paper` | 更新可写字段（**白名单**：title/authors/year/venue/tags/directions/notes/readState；其余字段拒绝，评审修订） | `{paper_id: str, fields: {title?, authors?, year?, venue?, tags?, directions?, notes?, readState?}}` | `{paper_id, changed: str[], updated_at}` |
| `link_paper_to_idea` | 关联文献↔Idea（多对多，可解绑） | `{paper_id: str, idea_id: str, unlink?: bool=false}` | `{paper_id, idea_id, linked: bool, idea_ids: str[]}` |

### C. Idea（= 该方向仓库的一条 git branch）
| 工具 | 用途 | 入参 schema | 返回 data |
|---|---|---|---|
| `create_idea` | 新建 Idea。**v0.1 真做 git**：`git branch <branch> [base_ref]` **只建分支、不切换工作区**（避免把用户正在改的工作区切走，评审修订）；从 `parent_idea_id` 当前分支或 `base_ref` 分叉；git 失败降级为仅写元数据 | `{direction_id?: str, name: str, branch_name?: str, hypothesis?: str, parent_idea_id?: str, base_ref?: str, related_paper_ids?: str[]}` | `{idea_id,name,branch_name,git_applied: bool,base_ref,parent_idea_id,warning?: str}` |
| `list_ideas` | 列出当前方向全部 Idea | `{direction_id?: str, status?: str[], include_archived?: bool=false}` | `{ideas:[{idea_id,name,branch_name,status,parent_idea_id,version_count,experiment_count,best_metric?:{key,value},updated_at}], total}` |
| `update_idea_status` | 改状态 active/validated/abandoned（不删分支） | `{idea_id: str, status: "active"\|"validated"\|"abandoned"}` | `{idea_id, status, updated_at}` |
| `branch_idea` | 从某 Idea 分叉子 Idea（= 从该分支开新 branch） | `{idea_id: str, new_name: str, hypothesis?: str, base_ref?: str}` | `{child_idea_id,name,branch_name,parent_idea_id,git_applied}` |

### D. Version（= 该分支上的某次 commit）
| 工具 | 用途 | 入参 schema | 返回 data |
|---|---|---|---|
| `create_version` | 记录 commit 为版本；commit 缺省时尝试 `git rev-parse HEAD`，失败则要求显式传 hash | `{idea_id: str, commit?: str, branch?: str, note?: str}` | `{version_id,idea_id,commit,short_hash,git_resolved: bool,note,created_at}` |
| `list_versions` | 列出版本 | `{idea_id?: str, limit?: int, offset?: int}` | `{versions:[{version_id,idea_id,commit,short_hash,note,experiment_count,created_at}]}` |

### E. Experiment（核心，schema-flexible）
| 工具 | 用途 | 入参 schema | 返回 data |
|---|---|---|---|
| `create_experiment` | 新建实验，返回建议运行命令 | `{version_id: str, name?: str, params: dict[str,any], metric_schema?: [{key:str,type:"number"\|"string"\|"bool",unit?:str,higher_is_better?:bool}], status?: "pending"="pending"}` | `{experiment_id,name,version_id,status,params,suggested_command: str,results_file_convention: str,created_at}` |
| `update_experiment_status` | 状态机迁移 running/done/failed；终态写 finished_at | `{experiment_id: str, status: "running"\|"done"\|"failed", finished_at?: str(ISO8601), error?: str}` | `{experiment_id,status,finished_at,warning?: "missing_metrics"}` |
| `set_metrics` | 写 metrics + 可选声明 schema。**追加式**：已有键覆盖时保留 metric_history 快照 | `{experiment_id: str, metrics: dict[str,any], metric_schema?: [...]}` | `{experiment_id, metrics_count, added_keys: str[], overwritten_keys: str[], warning?: str}` |
| `list_experiments` | 列表 + **键集合/基数自省** | `{direction_id?: str, idea_id?: str, version_id?: str, status?: str[], since?: str, limit?: int=50, offset?: int=0}` | `{experiments:[{...}], key_stats:{params_keys:[{key,cardinality}], metrics_keys:[{key,cardinality}]}}` |
| `get_experiment` | 单实验全字段 | `{experiment_id: str}` | `{experiment:{…全字段,params,metrics,metric_schema,analyses_count,source}}` |

`create_experiment` 完整返回示例（实现锚点）：
```json
{"ok": true, "context": {"direction_id": "dir_01", "ts": 1785...},
 "data": {
   "experiment_id": "exp_048", "name": "a2 lr=0.005", "version_id": "ver_12",
   "status": "pending",
   "suggested_command": "python train.py --lr 0.005 --dropout 0.3 && python -m ideaforge.cli finalize --exp exp_048 --results .research/experiments/exp_048/results.json",
   "results_file_convention": ".research/experiments/<exp_id>/results.json = {\"params\":{...},\"metrics\":{...}}",
   "created_at": "2026-08-31T14:22:00+08:00"}}
```

### F. Analysis
| 工具 | 用途 | 入参 schema | 返回 data |
|---|---|---|---|
| `write_analysis` | 写复盘；references 为引用的 metric/param **键名列表**（强制引用已有键） | `{experiment_id: str, content: str, references?: str[], source?: "agent"\|"human"="agent"}` | `{analysis_id,experiment_id,source,references,created_at}` |
| `get_analyses` | 取某实验的分析列表 | `{experiment_id: str, include_original?: bool=true}` | `{analyses:[{analysis_id,experiment_id,content,references,source,author,is_read,created_at}]}` |
| `mark_read` | 标记已读 | `{analysis_id: str, read?: bool=true}` | `{analysis_id, is_read}` |

### G. 查询 / 自省 / 提议
| 工具 | 用途 | 入参 schema | 返回 data |
|---|---|---|---|
| `global_search` | 跨文献/Idea/实验/分析搜索 | `{query: str, types?: [...], direction_id?: str, limit?: int=10}` | `{groups:{literature:[...],ideas:[...],experiments:[...],analyses:[...]}}` |
| `get_key_set` | **agent 自省核心**：返回范围内 params/metrics 键并集 + 基数 + 类型推断 + 重复实验键 | `{scope: "direction"\|"idea"\|"version"\|"all", scope_id?: str, direction_id?: str}` | `{scope,scope_id,params_keys:[{key,type_inferred,cardinality,sample_values}],metrics_keys:[...],repeat_keys:str[]}` |
| `propose_experiment` | agent 提议，人批准（只建 proposal，不建实验） | `{version_id: str, title: str, rationale: str, proposed_params: dict[str,any], based_on_experiment_ids?: str[], confidence?: number, estimated_runtime?: str}` | `{proposal_id, status:"pending", created_at}` |
| `list_proposals` | 列出提议（评审修订：补闭环断环，agent 需能查询自己提议的状态） | `{status?: "pending"\|"approved"\|"rejected", limit?: int=20, offset?: int=0}` | `{proposals:[{proposal_id,version_id,title,rationale,proposed_params,based_on_experiment_ids,confidence,status,created_at}], total}` |

---

## 10. 权限边界（工具层面落地）

- **只读（10 个）**：`list_directions` `search_papers` `list_ideas` `list_versions` `list_experiments` `get_experiment` `get_analyses` `global_search` `get_key_set` `list_proposals`
- **只写新建 / append-only（9 个）**：`create_direction` `add_paper` `create_idea` `branch_idea` `create_version` `create_experiment` `write_analysis` `propose_experiment` `set_metrics`（覆盖同键时保留 `metric_history` 快照）
- **受限变更（7 个）**：`switch_direction`（上下文）`update_paper`（**白名单字段**）`update_idea_status` `update_experiment_status`（终态 done/failed 不可逆迁移，纠错需 `force:true` 仅 UI 可用）`mark_read` `link_paper_to_idea` `mark_deleted`（**受限软删除**：置 `deletedAt`，数据保留可 restore，物理清理只留 UI/REST）——**全部支持 `expected_updated_at` 乐观锁**
- **MCP 面不存在**：任何硬删除、执行代码、修改已有实验结果。**软删除存在但受限**（`mark_deleted` 只置 `deletedAt`，可恢复）；物理清理仅走 REST/UI（人操作）。所有 agent 写入带 `source:"agent"`，供 UI SourceBadge 渲染。

---

## 11. REST API 端点清单（与 MCP tool 是同一 local core 的两个适配器）

前缀 `/api/v1`，无状态：方向上下文走 `X-Direction-Id` 头或 query（缺省用 server 当前方向）。

| 资源 | 端点 | 对应 MCP tool |
|---|---|---|
| Direction | `GET/POST /directions` · `PUT /directions/{id}` · `POST /directions/{id}/switch` | list_directions / create_direction / switch_direction |
| Literature | `GET /papers?q=&tags=&direction_id=&derived=&sort=` · `POST /papers` · `PUT /papers/{id}` · `DELETE /papers/{id}`(软删) · `POST /papers/{id}/link-idea` · `DELETE /papers/{id}/link-idea/{idea_id}` | search_papers / add_paper / update_paper / link_paper_to_idea |
| Idea | `GET /ideas?direction_id=&status=` · `POST /ideas` · `GET /ideas/{id}` · `PUT /ideas/{id}` · `POST /ideas/{id}/branch` · `DELETE /ideas/{id}`(→abandoned) | list_ideas / create_idea / update_idea_status / branch_idea |
| Version | `GET /ideas/{idea_id}/versions` · `POST /versions` · `GET /versions/{id}` · `DELETE /versions/{id}`(软删) | list_versions / create_version |
| Experiment | `GET /experiments?direction_id=&idea_id=&version_id=&status=&q=`(全局表) · `GET /ideas/{i}/versions/{v}/experiments` · `POST /experiments` · `GET /experiments/{id}` · `PUT /experiments/{id}/status` · `PUT /experiments/{id}/metrics` · `DELETE /experiments/{id}`(软删) | list_experiments / create_experiment / update_experiment_status / set_metrics / get_experiment |
| Analysis | `GET /experiments/{id}/analyses` · `POST /experiments/{id}/analyses`(source=human) · `PUT /analyses/{id}` · `PUT /analyses/{id}/read` · `DELETE /analyses/{id}`(软删) | get_analyses / write_analysis / mark_read |
| Proposal | `GET /proposals?status=pending` · `POST /proposals/{id}/approve`(人批准→创建 experiment) · `POST /proposals/{id}/reject`{reason} | propose_experiment |
| 工具/事件 | `GET /search?q=` · `GET /key-set?scope=&scope_id=` · `GET /events/poll?since=<seq>` · `GET /events/stream`(SSE) | global_search / get_key_set / 事件推送 |
| 静态 | `GET /` → FastAPI StaticFiles 托管原生单文件前端 | — |

**推送方案**：v0.1 **以 15s 轮询为主**，`GET /events/poll?since=<seq>` 返回 `{events:[{seq,type,data,ts}], next_seq}` 增量拉取；真 SSE 用 `sse-starlette` 提供 `GET /events/stream`，二者并存、同游标，断线后用 `since` 补拉。事件类型：`experiment.finished` / `analysis.created` / `proposal.created`。

---

## 12. MCP 客户端接入示例

安装：`pip install -e .` 提供 `ideaforge` 命令。

**通用 MCP 客户端格式**（Claude Desktop / Cursor / 任意 MCP 客户端同构）：
```json
{
  "mcpServers": {
    "ideaforge": {
      "command": "ideaforge",
      "args": ["mcp", "--stdio"],
      "env": {
        "IDEAFORGE_HOME": "C:/Users/you/.idea-forge",
        "IDEAFORGE_DIRECTION": "dir-9f3c2a1b"
      }
    }
  }
}
```

**Claude Desktop 专用**（Windows 下 command 用绝对路径）：
```json
{
  "mcpServers": {
    "ideaforge": {
      "command": "C:/Users/you/.venvs/ideaforge/Scripts/ideaforge.exe",
      "args": ["mcp"],
      "env": {
        "IDEAFORGE_HOME": "C:/Users/you/.idea-forge",
        "IDEAFORGE_DIRECTION": "dir-9f3c2a1b"
      }
    }
  }
}
```

**环境变量语义**：`IDEAFORGE_HOME` = 全局数据根目录（`~/.idea-forge`，含方向注册表 + 全局文献库 + index.db）；`IDEAFORGE_DIRECTION` = 当前方向 ID（可选，缺省由 `switch_direction` 设置）。方向的实际工作目录在 `directions.json` 注册表里，由平台读取。

---

## 13. 异步完成闭环（MCP 视角）

**v0.1 推荐：agent 显式回写 + 本地 Watcher 兜底回收，无独立订阅机制。**

1. **提交**：agent 调 `create_experiment` → 得 `experiment_id` + `suggested_command`（约定：跑完脚本把 `{metrics}` 与可选 `metricSchema` 写进 `.research/experiments/<exp_id>/results.json`；params 归 config.json，运行中不改）。
2. **离开**：agent 在本地 shell 跑命令（数小时），不阻塞会话。
3. **回收（双保险）**：
   - **主路径**：agent 跑完回来调 `update_experiment_status(id,"done", finished_at)` + `set_metrics(id, …)`；core 校验"done 但 metrics 空"→ 返回 `warning:"missing_metrics"`。
   - **兜底**：`ideaforge watch` 轻量 Watcher（15s 扫 sentinel `results.json`），发现新文件自动 `done` + 解析写入 metrics——覆盖"agent 会话中断/忘了回写"。
   - **双写竞态（评审修订）**：agent 显式 done 与 Watcher 同时发生时，以 `status.json` 追加顺序为准（先到先得）；`set_metrics` 幂等（同键同值重复写不报错），metrics 合并采用"最后写入胜出"，被覆盖值保留在 `metric_history` 快照。
4. **感知"哪个实验完成"**：agent 用 `list_experiments?status=running&since=<cursor>` 增量轮询（返回带 `finished_at` 与 `key_stats`），或逐个 `get_experiment`。SSE 通知（`experiment.finished`）留 v0.2。
5. **回归分析**：`get_experiment` 读 params/metrics → `get_key_set` 自省键集合 → `write_analysis`（references 引用 metric 键）→ `propose_experiment` 提下一实验 → 人等批准（UI §7.3）→ 循环。

此闭环零侵入、符合"平台不执行代码"：执行与回收责任在 agent，Watcher 只是兜底。

---

## 14. 风险清单（MCP/API 视角）

| 风险 | 缓解 |
|---|---|
| **MCP 并发写**（多 agent 同写） | SQLite 单文件天然串行化写事务；core 层"最后写入胜出"；Experiment/Proposal 用自增短 id 防撞；`set_metrics` 覆盖留 `metric_history` 快照 |
| **agent 误填 metric 键**（拼错/单位错） | `metric_schema` 声明 key+type+unit+higher_is_better；`get_key_set` 返回键集+基数供自省；`write_analysis.references` 强制引用已有键；UI 对"该键未见其它实验"给 warning；Δ 默认不染色（D2）防误读 |
| **长任务期间 agent 会话中断** | Watcher 兜底回收 sentinel；状态机允许中断后补迁到终态；记录 `last_seen`/heartbeat，超时未完成标 `stale` warning 而非静默 |
| **stdio 与 UI 同进程冲突** | **v0.1 明确分开**：`ideaforge mcp` 独立进程，FastAPI 独立进程，二者各自直连同一 SQLite 索引（WAL 模式 + 重试）；若未来合进程，FastMCP `run()` 必须放独立线程 |
| **git 操作失败** | `create_idea`/`create_version` 均带 `git_applied/git_resolved` 标志 + 降级"仅记元数据"，不阻断记录 |
| **索引一致性** | 崩溃后启动 hash 比对重建 SQLite |

---

## 15. v0.1 里程碑拆分（实现顺序）

1. **M1 骨架**：pyproject + CLI 入口 + `core/storage`（目录布局、原子写、counters）+ 一个方向可 `create` / `list`。
2. **M2 数据模型落地**：Idea / Version / Experiment（四文件）/ Analysis（md+front-matter）的 Storage 读写 + 字段契约测试。
3. **M2.5 冻结 results 协议**：`results.json`（metrics+metricSchema）与 `config.json`（params）分离契约 + 契约测试（评审建议，防后续返工）。
4. **M3 索引**：SQLite 建表 + kv 倒排 + `index rebuild` + 关键查询（列表/筛选/键集合并集基数）。
5. **M4 MCP server**：官方 SDK + FastMCP，26 工具按类别分步实现（先 Direction/Experiment，再 Idea/Version，再 Literature/Analysis/查询）。
6. **M4.5 异步闭环先行验证**：`ideaforge watch` Watcher + sentinel 回收 + `list_experiments?since` 增量轮询，用示例实验跑通"创建→本地跑→回收→感知完成"（评审建议提前）。
7. **M5 REST API + 事件**：FastAPI 路由（与 core 直连）、`/events/poll`、静态托管。
8. **M6 Web UI**：从 `design/prototype.html` 移植为 `web/`（原生三件套），对接 REST，实现矩阵/表格+自定义列/详情/收件箱。

**依赖**：`mcp`（官方 SDK）、`fastapi`、`uvicorn`、`pydantic>=2`、`sse-starlette`（可选）。开发工具：`pytest`、`ruff`。

---

## 16. 决策点（已确认，2026-08-31）

1. **`create_idea` v0.1 真做 git**：用 `git branch <name> [base_ref]` **只建分支、不切换工作区**；git 失败自动降级为仅写元数据（用户已拍板）。
2. **环境变量命名**：全局数据根目录统一用 **`IDEAFORGE_HOME`**（用户已拍板；方向工作目录在 `directions.json` 注册表，不在 env 里）。
3. **前端移植**：prototype.html 拆为 `web/index.html + app.js + style.css` 三件套（用户已拍板）。

---

## 17. 评审修订记录（2026-08-31，详见 docs/tech-review.md）

- 🔴 **results.json 协议冻结**：只含 `metrics` + 可选 `metricSchema`，不含 params（§4.5 / §13 已改）。
- 🔴 **analysis.is_read 归属**：存 `<data_root>/read_state.json`，不进 md、不进索引（§4.6 / §5 已改）。
- 🔴 **状态源规则**：`meta.status` 权威、`status.json` 审计日志（§4.5 已改）。
- 🔴 **update_paper 字段白名单** + 受限变更加 `expected_updated_at` 乐观锁（§9 / §10 已改）。
- 🟠 create_idea 改 `git branch` 不 checkout（§9 已改）；MCP 补 `list_proposals`（§9 / §10 已改）。
- 🟠 kv 表 `value_num` 类型归一化（§5 已改）；事件 seq 存 index.db（易失，rebuild 后 `since=0` 全量拉取兜底，§5 已加 `events` 表）。
- 🟠 `derivedIdeaIds` 一致性：以 `idea_papers` 索引为权威，Storage 单一写路径维护（§6 已改）。
- 🟠 里程碑调整：M2/M3 之间冻结 results 协议；Watcher 闭环（原 M7）提前到 M4 之后先行验证（§15 已改）。
