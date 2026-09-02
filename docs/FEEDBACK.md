# Agent 反馈清单（数据飞轮）

> 平台开发期，agent 使用中发现的工具/数据/结构问题统一沉淀在这里，由人审阅并维护状态。
> 格式与规则见 `docs/agent-protocol.md` §四。新会话 agent 先扫 `pending`/`accepted` 条目，避免重复报告。

---

## 2026-09-02 · 真实数据中文编码损坏（GBK/UTF-8 混写）

- 触发：人工核查 `im-research/.research` 真实数据时发现；创建途径为 Windows 控制台/管道经 CLI 或 agent 写入中文。
- 问题：`groups/grp-006/meta.json` 的 `purpose`、`ideas/idea-e82c.../meta.json` 的 `hypothesis` 出现替换符乱码，如 `候�?M 上万时`、`把 N² 收缩�?M²`。这是 UTF-8 文件被 GBK 解码再写回的典型损坏（Windows 默认编码）。乱码为**永久失真**，且系统无任何校验层发现。
- 影响：hypothesis/purpose 是科研核心字段，中文场景下每条经管道写入的记录都有风险；"磁盘 JSON 唯一真相"原则下，真相本身烂了。
- 建议：① 所有 CLI/MCP 出入口强制 UTF-8（`PYTHONUTF8=1` 或入口显式编码）；② 写入时校验非法序列（检测 U+FFFD/解码失败的输入直接报错）；③ 写一次性清洗脚本尝试按 GBK→UTF-8 修复现有损坏数据。
- 状态：pending

## 2026-09-02 · update_paper 绕过 service 层直写 JSON

- 触发：代码走查 `ideaforge/mcp_server.py` 时发现。
- 问题：`update_paper`（约 L92-104）直接读 JSON → 改 → `atomic_write_json`，未走 service 层，也未同步 SQLite 索引/事件；其余工具均走 service。
- 影响：若 UI/搜索依赖索引，此工具会造成数据漂移；绕过统一出口使一致性逻辑（索引、事件、乐观锁）失效。
- 建议：确认 service 层是否有 update 方法，统一收口到 service；没有则补一个。
- 状态：pending

## 2026-09-02 · create_idea 的 base_ref 参数被静默丢弃

- 触发：代码走查 `ideaforge/mcp_server.py` 时发现。
- 问题：`create_idea` 工具签名含 `base_ref`，但调用 `service.create_idea(...)` 时未传入（且返回信封里 `git_applied` 恒为 False，git 实际状态与平台记录靠手工同步）。
- 影响：agent 以为指定了分支基线，实际被忽略；"Idea=git 分支"的心智下，平台记录与仓库现实会漂移。
- 建议：要么真正执行 `git branch`（不切工作区）并如实返回 `git_applied`，要么在工具描述里明确声明"当前仅记录分支名，不操作 git"。
- 状态：pending

## 2026-09-02 · 缺"按引用展开"的图查询工具（证据回溯 N+1）

- 触发：设计讨论（消费侧复盘）——agent 回答"某 idea 验证了什么"需 `list_claims` → 逐条 `get_experiment` → 逐条 `get_analyses`，三层嵌套。
- 问题：跨层证据回溯无一次性查询原语；对话越长，agent 越倾向少查几次、凭印象补全，滋生幻觉。
- 影响：跨会话知识恢复（知识库落地前）依赖此类查询；写作/汇报时证据链组装成本高。
- 建议：新增只读原语 `expand_claims(claim_ids, with_evidence_depth=1)`，一次返回 claim + 支撑实验（id/status/metrics）+ analysis 摘要；只做"按引用展开"，不含生成逻辑。
- 状态：pending
