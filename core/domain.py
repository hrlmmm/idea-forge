"""领域实体与常量（对齐 docs/technical-plan.md §4，字段契约以 schema 为准）。

原则：params/metrics 是纯键值 dict，平台不预设任何字段名。
"""
from __future__ import annotations

import re
import uuid
from datetime import datetime, timezone
from typing import Any

# ---------------------------------------------------------------- 基础工具

def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid.uuid4().hex}"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


# ---------------------------------------------------------------- 实验状态机

STATUS_PENDING = "pending"
STATUS_RUNNING = "running"
STATUS_DONE = "done"
STATUS_FAILED = "failed"
TERMINAL_STATUS = {STATUS_DONE, STATUS_FAILED}
ALL_STATUS = {STATUS_PENDING, STATUS_RUNNING, STATUS_DONE, STATUS_FAILED}

_TRANSITIONS: dict[str, set[str]] = {
    STATUS_PENDING: {STATUS_RUNNING, STATUS_DONE, STATUS_FAILED},
    STATUS_RUNNING: {STATUS_DONE, STATUS_FAILED},
    STATUS_DONE: set(),
    STATUS_FAILED: set(),
}


def can_transition(current: str, target: str) -> bool:
    return target in _TRANSITIONS.get(current, set())


# ---------------------------------------------------------------- Idea 状态

IDEA_ACTIVE = "active"
IDEA_VALIDATED = "validated"
IDEA_ABANDONED = "abandoned"
IDEA_ALL_STATUS = {IDEA_ACTIVE, IDEA_VALIDATED, IDEA_ABANDONED}

# ---------------------------------------------------------------- 文献可写字段白名单（评审修订）

PAPER_WRITABLE_FIELDS = {"title", "authors", "year", "venue", "tags",
                         "directions", "notes", "readState"}

# ---------------------------------------------------------------- 变体族 repeat 键（product-design §5.1）

REPEAT_KEY_RE = re.compile(r"^(.*_)?(seed|random_seed|repeat|run_id|trial|idx)$", re.I)


# ---------------------------------------------------------------- 键值类型推断 / kv 归一化

def infer_value_type(v: Any) -> str:
    if isinstance(v, bool):
        return "bool"
    if isinstance(v, (int, float)):
        return "num"
    if isinstance(v, (list, tuple)):
        return "list"
    return "str"


def infer_num(v: Any) -> float | None:
    """kv 类型归一化（评审修订）：仅可 parseFloat 才返回数值，否则 None。"""
    if isinstance(v, bool):
        return None
    if isinstance(v, (int, float)):
        return float(v)
    if isinstance(v, str):
        try:
            return float(v.strip())
        except ValueError:
            return None
    return None
