# 同类开源项目调研 · Idea Forge 定位校准

> 调研日期：2026-09-01
> 调研范围：GitHub 检索（`topic:ai-scientist` / `automated-research` / `research-workspace` / `experiment-management` / `mcp research`）+ 6 个项目 README 精读
> 目的：确认 Idea Forge 的差异化是否成立，提炼可直接借鉴的设计模式

---

## 一、一句话结论

**生态已经很挤，但挤的不是我们的位置。**

2026 年"自主科研 agent"这一侧已经红海化（几百个项目，从 karpathy 的极简版到全流程多智能体都有），而"**结构化数据平台 × 人在对话中决策**"这个象限里只有寥寥几家（Principia、Open Science Desktop、我们）。

同时有一个必须正视的问题：**为什么这一象限人少？** 因为对大多数人来说 markdown + git 已经够用了。Idea Forge 必须能一句话回答"结构化平台给了什么 markdown 给不了的东西"，否则会变成一个没人需要的东西。见第六节。

---

## 二、生态全景

| 象限 | 代表项目 | 共同特征 |
|---|---|---|
| **自主 × 文件** | karpathy/autoresearch、labrat、ScienceClaw、NanoResearch、ARIS | 一夜跑完，产物是 markdown + logs，人的输入是 `program.md` |
| **自主 × 平台** | FAROS（3k★，几乎唯一） | 全流程多智能体 + 结构化契约 + 人工闸门 |
| **人主导 × 文件** | claude-scholar（5.3k★）、phd-skills（380★） | Obsidian/Markdown 知识库 + Skills + Gate |
| **人主导 × 平台** | Principia（704★）、Open Science Desktop（1.5k★）、**Idea Forge** | 有数据模型、有索引、有 UI，人保留关键判断 |

---

## 三、六个项目的精读要点

### 1. karpathy/autoresearch —— 最小范式，值得全文抄的设计哲学

只有三个文件：

```
prepare.py   # 常量 + 数据准备 + 评估工具。不改。
train.py     # 模型 + 优化器 + 训练循环。agent 改这个。
program.md   # 给 agent 的指令。人改这个。
```

两个关键设计：

- **固定 5 分钟时间预算**（wall clock）。不管 agent 改了什么（模型大小、batch、架构），一次实验永远是 5 分钟 → 约 12 次/小时，一晚上约 100 次。
- **单一指标 `val_bpb`**（validation bits per byte）。选它是因为**与词表大小无关**，所以架构改动也能公平比较。

> 启示：实验的**可比性**来自"预算固定 + 主指标唯一"，不是来自记录得多详细。

另外：`results.tsv` 明确**不提交进 git**（`.gitignore`）——大结果不进版本库。这与我们"软删除时清理大体积产物"的思路一致。

### 2. labrat（238★）—— 跟"想法分支树"概念最接近的一个

> "Autonomous multi-branch research lab. Branches compete for compute budget."

核心概念：

- **idea families（想法族群）** 竞争**计算预算 credits**。预算不是平均分配的，是靠产出真实信号赚来的。
- **Decisive challenge（决定性挑战）**：`evaluation.yaml` 里必须至少有一个 held-out 的 `prediction_tests`。一个族群只有在**没被本地爬坡指标污染的硬挑战**上赢了，才获得额外 funding 和 status。
  > "区分'把已知指标拟合得好一点'和'这个族群真的预测到了某件难的事'。"
- **Lakatos 研究纲领论**作为收敛判据：一个 programme "progressive if theoretically and empirically progressive, degenerating if not"。翻译成操作：一个方向不能只在已知指标上进步，还得赢下对手赢不了的 held-out 测试；否则就该升级到 audit 或 **frame break（换框架）**。
- **File-as-Bus**：状态靠文件（`state/frontier.json`、`branches.yaml`、`dead_ends.md`、`runtime.yaml`）+ append-only logs 承载，supervisor 对"厚状态"保持"薄控制"。
- Phase 0 必须先产出 6 个文件：`branches.yaml`、`dead_ends.md`、`research_brief.md`、`research_sources.md`、`evaluation.yaml`、`runtime.yaml`。

> 对我们最有用的一条：**`dead_ends.md`**。失败的方向要显式记录，不是静默删除。

### 3. FAROS（3k★）—— 唯一做全流程结构化平台的

`研究兴趣 → Idea（证据支撑）→ PlanPackage → Code → Experiment → Paper → ReviewX → 人工审核/打回`

最强的设计是 **`PlanPackage`**：模块之间交接的不是一段自然语言，而是固化了**假设、变量、步骤、验收条件、证据引用**的结构化对象。下游 Code 不需要猜上游意图，ReviewX 也能追溯每条结论。

`ReviewX` 也不只是打分，而是检查 **claim / evidence / measurement 三者是否一致**，并把真实实验结果反馈回下一轮计划。

> 启示：**跨模块的结构化契约**是这类系统值钱的地方。我们的 Version（带 gitRef）已经是雏形，但还缺"假设 + 验收条件"。

### 4. claude-scholar（5.3k★）—— 人主导侧的标杆，人在回路机制最完整

存储：**Obsidian vault 里的 Markdown，无数据库**。配置/绑定是 JSON，代码版本是 git。

```
Research/{project}/
├── Sources/Papers/     # 论文阅读笔记（Zotero 导入先落这里）
├── Knowledge/          # 已提升的持久主张
├── Experiments/        # hypotheses / experiment lines / run history / findings
├── Results/Reports/
├── Writing/
└── Maps/literature.canvas
```

三道闸门值得直接借鉴：

- **Evidence Gate**：claim 想升级进 `Knowledge`/`Writing`/proposal，必须先显式声明 weak sources、假设、缺失证据。证据不足时只出 `research direction`，不出 `project proposal`。
- **Blocker-First Gate**（做分析前先锁死）：`unit of analysis`、`primary metric`、`seeds/folds/runs`、`provenance`、`comparison family`。锁不完就输出 blocker summary 而不是结论。
- **Claim Ledger**：每个 contribution/result/对比都要能 trace 到 evidence，否则保持 **explicitly speculative**。rebuttal 里 unresolved points 是 **marked instead of hidden**。

### 5. Open Science Desktop（1.5k★）—— 形态最接近的（Tauri 桌面 + MCP + Skills）

架构分层：

```
apps/desktop (Tauri 2 + React)  →  packages/sdk (OpenCodeClient)  →
crates/osd-core + osd-cli (Rust, 可 headless)  →  pinned OpenCode sidecar  →
runtime/mcp (arXiv/PubMed/Semantic Scholar/...) + runtime/skills
```

可复现性做法（**双写**）：

- SQLite：会话 store + **global run index**（支持 search/facets/pagination）
- `.openscience/provenance.jsonl`：把 figures/tables/reports/notebooks **链接回产生它的 exact code、inputs、环境、模型输出与对话**
- headless 模式下不写 provenance，退回 **git snapshots**
- 凭据写 app-private runtime config，**不进 workspace / provenance / git / exports**

UI 上有个细节很好：打开任意 artifact，Inspector 里能看到它的 **generating script + data files + 产生它的那段对话**（"No black boxes"）。

### 6. Principia（704★）—— 想法是怎么"长出来"的

> "autonomous scientific discovery needs an intermediate scientific language between papers and hypotheses"

对象模型：

```
Work（文献，带 provenance）
   ↓
Literature Principle（证据链接的主张：argument/scope/conditions/boundaries/falsifier/revisions/relations）
   ↓ typed relations
Meta-Principle（跨领域的高阶规律、约束、不可能性、trade-off）
   ↓ 显式选定的推理上下文
Derived / virtual artifact（候选连接、派生原则）→ validation / revision / rejection
```

关键立场：

- 想法是**组合出来的**，不是 brainstorm 出来的。
- Meta-grounding **故意不具权威性**：一个 Meta-Principle 可以解释一个 claim，但**不能拯救没有证据支持的 claim**。
- 派生产物保持本地、视觉上可区分、可删除、在用户控制之下。
- 分布方式很有意思：canonical JSON 云 + 客户端校验 hash/schema 后**原子激活**，保留上一代用于回滚，语义向量不可用时**可见地降级**到 SQLite FTS。

> 对我们：Literature → Idea 之间其实可以插一层"可复用机制"。对多层网络影响力最大化尤其合适（"注意力融合""learning-to-rank""可扩展性瓶颈""有向建模"这些机制是可跨方法迁移的）。

---

## 四、提炼出的 8 条设计模式

1. **固定评估契约优于详尽记录**。预算固定 + 主指标唯一 = 实验可比。（autoresearch）
2. **Decisive challenge 优于本地爬坡**。在 held-out 硬挑战上赢才算真进步。（labrat）
3. **死胡同要显式记录**（`dead_ends.md`），不是静默删除。（labrat）
4. **Claim 升级必须挂证据**，无证据的保持 explicitly speculative。（claude-scholar）
5. **分析前先锁评估口径**（unit of analysis / primary metric / seeds / provenance），锁不完不出结论。（claude-scholar）
6. **Provenance 双写**：SQLite 索引 + 落盘 JSONL，产物可回溯到代码与环境。（open-science）
7. **跨模块交接用结构化契约**，不要传自然语言。（FAROS 的 PlanPackage）
8. **人的批准放在对话/CLI/Slash Command 里，不放网页按钮**。（全部 6 个项目，无一例外）

第 8 条特别重要：**这验证了之前"实验是否进行在与 agent 对话中确认"的决策是对的**。整个生态里没有一个高星项目把"批准实验"做成网页按钮。

---

## 五、对 Idea Forge 的具体建议

### 立刻能做（低成本、高收益）

| # | 改动 | 解决什么问题 |
|---|---|---|
| A | Version 增加 `primary_metric` + `budget` 两个必填字段（仍是自由键值，但强制声明主指标与时间/算力预算） | 实验之间目前不可比 |
| B | 软删除时**强制填 `reason`**，并落一份 `dead_ends.md`（或 dead_ends 表 + 前端视图） | 只记了"删了什么"，没记"为什么死" |
| C | events 双写：SQLite 之外再落 `.ideaforge/provenance.jsonl` | 事件目前在 DB 里，不可 diff、不可 git 追踪、不好迁移 |
| D | Experiment 增加 `track` 字段：`main` / `held_out`；held_out 上赢的实验在前端单独高亮 | 缺"决定性挑战"这一层，容易过拟合本地指标 |

### 中期考虑

| # | 改动 | 说明 |
|---|---|---|
| E | 加第 5 层实体 **Finding / Claim**：从 experiment 提升，必须 cite experiment id，无证据的标 speculative | 现在链条止于 Experiment，结论仍散落在对话里 |
| F | Idea 分支树**物化成文件**（`branches.yaml` 或 `ideas.json`），不只存 DB | 让 agent 能用纯文本直接编辑树，也便于 git 版本化 |
| G | Literature → **Mechanism/Principle** → Idea，加一层中间表示 | 对多层网络 IM 特别合适，让想法"组合"而非"拍脑袋" |

### 明确不要做

- **不要做全自动科研 agent**。红海，几百个项目在卷，我们的价值不在这。
- **不要做网页审批**（已验证：生态里没人这么干，用户也不想要）。
- **不要急着做论文写作模块**。FAROS / claude-scholar 那块已经很成熟，且不是当前痛点。

---

## 六、必须回答的一个问题

"人主导 × 结构化平台"这个象限人少，有两种可能：

1. **空白 = 机会**：markdown + git 在规模化后就撑不住了，需要结构化。
2. **空白 = 没人需要**：markdown + git 其实一直够用，结构化平台是过度设计。

要赌的是 (1)，但 README 第一屏必须给出结构化平台的**不可替代价值**。目前最有说服力的三个候选：

- **跨实验参数谱系对比**：几十上百次实验后，能回答"哪一组参数改动真正带来了提升"——markdown 做不到。
- **规模化检索**：实验数量到几百量级时，grep 失效，结构化索引才有效。
- **可视化**：想法分支树、实验谱系、指标演化，这些天然需要数据模型支撑。

建议在下一次迭代里，把这三件事做成 Idea Forge 的"存在理由"，而不是把"文献管理/实验记录"当卖点——后者 markdown 也能做。

---

## 附：本次检索到的项目清单（按相关性排序）

| 项目 | ★ | 定位 | 借鉴点 |
|---|---|---|---|
| karpathy/autoresearch | 高 | 最小自主实验循环 | 固定预算 + 单指标 |
| Galaxy-Dawn/claude-scholar | 5.3k | 半自动研究助手 | Evidence Gate、Claim Ledger |
| assafelovic/gpt-researcher | 29k | deep research agent | — |
| MODSetter/SurfSense | 16k | NotebookLM 替代 | — |
| wanshuiyin/Auto-...-in-sleep (ARIS) | 15.5k | overnight 研究循环 | checkpoint + task queue |
| ai4s-research/open-science | 1.5k | 本地优先科研工作台 | provenance.jsonl 双写 |
| OpenNSWM-Lab/FAROS | 3.0k | 全流程多智能体 | PlanPackage 结构化契约 |
| pzqpzq/Principia | 704 | 原则云 + 想法派生 | 中间表示层、可追溯 idea |
| ProjectDXAI/labrat | 238 | 分支竞争算力 | decisive challenge、dead_ends.md |
| fcakyon/phd-skills | 380 | 博士研究 skills | — |
| 54yyyu/zotero-mcp | 4.9k | Zotero × MCP | 文献侧可对接 |
| blazickjp/arxiv-mcp-server | 3.1k | arXiv × MCP | 文献侧可对接 |
| openags/paper-search-mcp | 2.5k | 多源论文检索 | 文献侧可对接 |
| liuyibo/expmonkey | 12 | git worktree 并行实验 | 思路可参考 |
| awesome-mlops/awesome-ml-experiment-management | 161 | MLOps 实验管理清单 | 传统方案参照系 |
