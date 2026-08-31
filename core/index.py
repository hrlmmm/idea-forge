"""SQLite 索引（缓存，可重建）。磁盘 JSON 是唯一真相，索引坏了就重建。

对齐 docs/technical-plan.md §5：
- kv 为 EAV 倒排，value_num 仅存可 parse 的数值（评审修订：字符串误写数值键不丢聚合）。
- events 表存事件游标（易失，rebuild 后前端 since=0 全量拉取兜底）。
- read_state.json（未读状态）不在索引里，rebuild 不丢。
"""
from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from . import domain
from .storage import DataRoot, DirectionLayout, read_json

_SCHEMA = """
CREATE TABLE IF NOT EXISTS directions(
  direction_id TEXT PRIMARY KEY, name TEXT, root_path TEXT, git_remote TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS papers(
  paper_id TEXT PRIMARY KEY, title TEXT, authors_json TEXT, year INTEGER, venue TEXT,
  tags_json TEXT, directions_json TEXT, read_state TEXT, derived_idea_ids_json TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS ideas(
  idea_id TEXT PRIMARY KEY, direction_id TEXT, parent_idea_id TEXT, name TEXT, status TEXT,
  git_branch TEXT, updated_at TEXT
);
CREATE TABLE IF NOT EXISTS idea_papers(
  idea_id TEXT, paper_id TEXT, PRIMARY KEY(idea_id, paper_id)
);
CREATE TABLE IF NOT EXISTS versions(
  version_id TEXT PRIMARY KEY, idea_id TEXT, name TEXT, git_ref TEXT, status TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS experiments(
  exp_id TEXT PRIMARY KEY, version_id TEXT, idea_id TEXT, status TEXT, created_at TEXT,
  finished_at TEXT, runtime_s REAL, created_by TEXT, git_ref TEXT, warning INTEGER
);
CREATE TABLE IF NOT EXISTS kv(
  exp_id TEXT, kind TEXT, key TEXT, value_text TEXT, value_num REAL, value_bool INTEGER,
  PRIMARY KEY(exp_id, kind, key)
);
CREATE INDEX IF NOT EXISTS kv_kind_key ON kv(kind, key);
CREATE TABLE IF NOT EXISTS proposals(
  proposal_id TEXT PRIMARY KEY, version_id TEXT, title TEXT, rationale TEXT,
  proposed_params_json TEXT, based_on_experiment_ids_json TEXT, confidence REAL,
  status TEXT, created_at TEXT
);
CREATE TABLE IF NOT EXISTS events(
  seq INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, data_json TEXT, ts TEXT
);
"""

_ALL_TABLES = ["directions", "papers", "ideas", "idea_papers", "versions",
               "experiments", "kv", "proposals", "events"]


class Index:
    """SQLite 索引句柄。连接对象供查询复用。"""

    def __init__(self, root: Path | str | None = None):
        self.dr = DataRoot(root)
        self._conn = sqlite3.connect(str(self.dr.index_db))
        self._conn.row_factory = sqlite3.Row
        self._conn.execute("PRAGMA journal_mode=WAL")
        # 确保表存在（幂等；rebuild 会先 DROP 再建）
        self._conn.executescript(_SCHEMA)

    # ------------------------------------------------------------ 重建

    def rebuild(self) -> int:
        con = self._conn
        for t in _ALL_TABLES:
            con.execute(f"DROP TABLE IF EXISTS {t}")
        con.executescript(_SCHEMA)
        con.execute("PRAGMA user_version = 1")

        count = 0
        reg = read_json(self.dr.directions_file, {}) or {}
        for did, entry in reg.items():
            if entry.get("deletedAt"):
                continue
            con.execute(
                "INSERT OR REPLACE INTO directions VALUES (?,?,?,?,?)",
                (did, entry.get("name"), entry.get("root_path"),
                 entry.get("git_remote"), entry.get("createdAt")))
            count += self._index_direction(con, DirectionLayout(entry["root_path"]), did)
        self._index_papers(con)
        con.commit()
        return count

    def _index_direction(self, con, layout: DirectionLayout, direction_id: str) -> int:
        n = 0
        ideas_dir = layout.research / "ideas"
        if ideas_dir.exists():
            for meta_path in ideas_dir.glob("*/meta.json"):
                meta = read_json(meta_path)
                if not meta or meta.get("deletedAt"):
                    continue
                con.execute(
                    "INSERT OR REPLACE INTO ideas VALUES (?,?,?,?,?,?,?)",
                    (meta["id"], direction_id, meta.get("parentIdeaId"), meta.get("name"),
                     meta.get("status"), meta.get("gitBranch"), meta.get("updatedAt")))
                for pid in meta.get("relatedPaperIds") or []:
                    con.execute("INSERT OR IGNORE INTO idea_papers VALUES (?,?)",
                                (meta["id"], pid))

        versions_dir = layout.research / "versions"
        if versions_dir.exists():
            for meta_path in versions_dir.glob("*/meta.json"):
                meta = read_json(meta_path)
                if not meta or meta.get("deletedAt"):
                    continue
                con.execute(
                    "INSERT OR REPLACE INTO versions VALUES (?,?,?,?,?,?)",
                    (meta["id"], meta.get("ideaId"), meta.get("name"),
                     meta.get("gitRef"), meta.get("status"), meta.get("createdAt")))

        exps_dir = layout.research / "experiments"
        if exps_dir.exists():
            for exp_dir in exps_dir.iterdir():
                meta = read_json(exp_dir / "meta.json")
                if not meta:
                    continue
                vid = meta.get("versionId")
                idea_id = self._idea_of_version(con, vid)
                con.execute(
                    "INSERT OR REPLACE INTO experiments VALUES (?,?,?,?,?,?,?,?,?,?)",
                    (meta["id"], vid, idea_id, meta.get("status"), meta.get("createdAt"),
                     meta.get("finishedAt"), meta.get("runtimeS"), meta.get("createdBy"),
                     meta.get("gitRef"), int(bool(meta.get("warning")))))
                params = read_json(exp_dir / "config.json", {}) or {}
                for k, v in params.items():
                    self._insert_kv(con, meta["id"], "param", k, v)
                results = read_json(exp_dir / "results.json", {}) or {}
                for k, v in (results.get("metrics") or {}).items():
                    self._insert_kv(con, meta["id"], "metric", k, v)
                n += 1
        return n

    def _index_papers(self, con) -> None:
        if not self.dr.literature_dir.exists():
            return
        for meta_path in self.dr.literature_dir.glob("*/meta.json"):
            p = read_json(meta_path)
            if not p or p.get("deletedAt"):
                continue
            con.execute(
                "INSERT OR REPLACE INTO papers VALUES (?,?,?,?,?,?,?,?,?,?)",
                (p["id"], p.get("title"),
                 json.dumps(p.get("authors") or [], ensure_ascii=False),
                 p.get("year"), p.get("venue"),
                 json.dumps(p.get("tags") or [], ensure_ascii=False),
                 json.dumps(p.get("directions") or [], ensure_ascii=False),
                 p.get("readState"),
                 json.dumps(p.get("derivedIdeaIds") or [], ensure_ascii=False),
                 p.get("createdAt")))

    # ------------------------------------------------------------ 查询

    def _idea_of_version(self, con, version_id: str | None) -> str | None:
        if not version_id:
            return None
        row = con.execute(
            "SELECT idea_id FROM versions WHERE version_id=?", (version_id,)).fetchone()
        return row["idea_id"] if row else None

    def _insert_kv(self, con, exp_id: str, kind: str, key: str, value) -> None:
        num = domain.infer_num(value)
        text = value if isinstance(value, str) else json.dumps(value, ensure_ascii=False)
        con.execute(
            "INSERT OR REPLACE INTO kv VALUES (?,?,?,?,?,?)",
            (exp_id, kind, key, text, num,
             value if isinstance(value, bool) else None))

    def key_stats(self, scope: str = "all", scope_id: str | None = None) -> dict:
        """键并集 + 取值基数 + repeat 键（get_key_set 的数据源，§9 G）。"""
        exp_ids = self._scope_exp_ids(scope, scope_id)
        if not exp_ids:
            return {"params_keys": [], "metrics_keys": [], "repeat_keys": []}
        ph = ",".join("?" * len(exp_ids))
        params_keys, metrics_keys = [], []
        for kind, out in (("param", params_keys), ("metric", metrics_keys)):
            rows = self._conn.execute(
                f"SELECT key, COUNT(DISTINCT value_text) card "
                f"FROM kv WHERE kind=? AND exp_id IN ({ph}) "
                f"GROUP BY key ORDER BY key",
                [kind, *exp_ids]).fetchall()
            for r in rows:
                out.append({"key": r["key"], "cardinality": r["card"], "type_inferred": None})
        repeat = [k["key"] for k in params_keys + metrics_keys
                  if domain.REPEAT_KEY_RE.match(k["key"])]
        return {"params_keys": params_keys, "metrics_keys": metrics_keys,
                "repeat_keys": repeat}

    def aggregate_metric(self, metric_key: str, scope: str = "all",
                         scope_id: str | None = None, agg: str = "max") -> float | None:
        """矩阵/图表聚合：对 scope 内实验的某个数值指标做聚合（仅 value_num 非 NULL）。"""
        exp_ids = self._scope_exp_ids(scope, scope_id)
        if not exp_ids:
            return None
        ph = ",".join("?" * len(exp_ids))
        fn = {"max": "MAX", "min": "MIN", "avg": "AVG", "count": "COUNT"}.get(agg, "MAX")
        row = self._conn.execute(
            f"SELECT {fn}(value_num) v FROM kv "
            f"WHERE kind='metric' AND key=? AND exp_id IN ({ph}) "
            f"AND value_num IS NOT NULL",
            [metric_key, *exp_ids]).fetchone()
        return row["v"]

    def _scope_exp_ids(self, scope: str, scope_id: str | None) -> list[str]:
        q = "SELECT exp_id FROM experiments e"
        conds, params = [], []
        if scope == "direction" and scope_id:
            conds.append("e.idea_id IN (SELECT idea_id FROM ideas WHERE direction_id=?)")
            params.append(scope_id)
        elif scope == "idea" and scope_id:
            conds.append("e.idea_id=?")
            params.append(scope_id)
        elif scope == "version" and scope_id:
            conds.append("e.version_id=?")
            params.append(scope_id)
        if conds:
            q += " WHERE " + " AND ".join(conds)
        return [r[0] for r in self._conn.execute(q, params).fetchall()]

    def close(self) -> None:
        self._conn.close()
