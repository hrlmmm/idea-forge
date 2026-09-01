"""本地文件系统存储：双 root（全局 data_root + 每方向 .research/）、原子写、计数器。

对齐 docs/technical-plan.md §3 / §6：
- 磁盘 JSON 是唯一真相；SQLite 索引只是缓存（见 core/index.py）。
- 原子写：先写 .tmp.<uuid> 再 os.replace。
- counters.json 用文件锁原子递增。
"""
from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any

DEFAULT_HOME_ENV = "IDEAFORGE_HOME"
RESEARCH_DIRNAME = ".research"


def home() -> Path:
    env = os.environ.get(DEFAULT_HOME_ENV)
    if env:
        return Path(env).expanduser()
    return Path.home() / ".idea-forge"


# ---------------------------------------------------------------- JSON IO

def read_json(path: Path, default: Any = None) -> Any:
    if not path.exists():
        return default
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def atomic_write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=f".{path.name}.tmp.")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def atomic_write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(path.parent), prefix=f".{path.name}.tmp.")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            f.write(text)
            f.flush()
            os.fsync(f.fileno())
        os.replace(tmp, path)
    except BaseException:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


# ---------------------------------------------------------------- 计数器（文件锁原子递增）

class CounterStore:
    def __init__(self, path: Path):
        self.path = Path(path)

    def _lock(self, f) -> None:
        try:
            import msvcrt  # Windows
            f.seek(0)
            msvcrt.locking(f.fileno(), msvcrt.LK_LOCK, 1)
        except ImportError:
            import fcntl  # POSIX
            fcntl.flock(f.fileno(), fcntl.LOCK_EX)

    def _unlock(self, f) -> None:
        try:
            import msvcrt
            f.seek(0)
            msvcrt.locking(f.fileno(), msvcrt.LK_UNLCK, 1)
        except ImportError:
            import fcntl
            fcntl.flock(f.fileno(), fcntl.LOCK_UN)

    def bump(self, key: str) -> int:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.path, "a+", encoding="utf-8") as f:
            self._lock(f)
            try:
                f.seek(0)
                first = f.read(1)
                f.seek(0)
                data = json.load(f) if first else {}
            except (json.JSONDecodeError, ValueError):
                data = {}
            val = int(data.get(key, 0)) + 1
            data[key] = val
            f.seek(0)
            f.truncate()
            json.dump(data, f, ensure_ascii=False, indent=2)
            self._unlock(f)
            return val


# ---------------------------------------------------------------- 全局 data_root

class DataRoot:
    def __init__(self, root: Path | None = None):
        self.root = Path(root) if root else home()

    # 文件路径
    @property
    def directions_file(self) -> Path:
        return self.root / "directions.json"

    @property
    def literature_dir(self) -> Path:
        return self.root / "literature"

    @property
    def index_db(self) -> Path:
        return self.root / "index.db"

    @property
    def read_state(self) -> Path:
        return self.root / "read_state.json"

    @property
    def counters(self) -> Path:
        """全局计数器：实验 id 全局唯一（跨方向不撞，修复 _find_exp_root 歧义）。"""
        return self.root / "counters.json"

    def literature_meta(self, lit_id: str) -> Path:
        return self.literature_dir / lit_id / "meta.json"

    def register_direction(self, entry: dict) -> None:
        reg = read_json(self.directions_file, {}) or {}
        reg[entry["id"]] = entry
        atomic_write_json(self.directions_file, reg)


# ---------------------------------------------------------------- 每方向 .research/ 布局

class DirectionLayout:
    def __init__(self, root: Path | str):
        self.root = Path(root)
        self.research = self.root / RESEARCH_DIRNAME

    # 路径
    @property
    def config(self) -> Path:
        return self.research / "config.json"

    @property
    def counters(self) -> Path:
        return self.research / "counters.json"

    def idea_dir(self, idea_id: str) -> Path:
        return self.research / "ideas" / idea_id

    def idea_meta(self, idea_id: str) -> Path:
        return self.idea_dir(idea_id) / "meta.json"

    def version_dir(self, version_id: str) -> Path:
        return self.research / "versions" / version_id

    def version_meta(self, version_id: str) -> Path:
        return self.version_dir(version_id) / "meta.json"

    def exp_dir(self, exp_id: str) -> Path:
        return self.research / "experiments" / exp_id

    def exp_meta(self, exp_id: str) -> Path:
        return self.exp_dir(exp_id) / "meta.json"

    def exp_config(self, exp_id: str) -> Path:
        return self.exp_dir(exp_id) / "config.json"

    def exp_results(self, exp_id: str) -> Path:
        return self.exp_dir(exp_id) / "results.json"

    def exp_status(self, exp_id: str) -> Path:
        return self.exp_dir(exp_id) / "status.json"

    def exp_analyses(self, exp_id: str) -> Path:
        return self.exp_dir(exp_id) / "analyses"

    def group_dir(self, group_id: str) -> Path:
        return self.research / "groups" / group_id

    def group_meta(self, group_id: str) -> Path:
        return self.group_dir(group_id) / "meta.json"

    def init(self, direction_config: dict) -> None:
        """初始化 .research/（幂等）。"""
        atomic_write_json(self.config, direction_config)
        atomic_write_json(self.counters, {"exp_seq": 0, "version_seq": 0, "idea_seq": 0})
