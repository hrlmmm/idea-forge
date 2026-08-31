"""core 层最小闭环测试（对齐 docs/technical-plan.md §4 / §13）。

运行：cd D:/idea-forge && python -m pytest tests/ -q
（需 dev 依赖：pip install -e ".[dev]"）
"""
from __future__ import annotations

import json
import os

import pytest

from core import service, storage


def _setup(tmp_path):
    os.environ["IDEAFORGE_HOME"] = str(tmp_path / "home")
    repo = tmp_path / "repo"
    repo.mkdir()
    return str(repo)


def test_minimal_loop(tmp_path):
    repo = _setup(tmp_path)
    d = service.create_direction("IM", repo, git_remote="git@github.com:x/im.git")
    did = d["direction_id"]
    assert service.list_directions()[0]["id"] == did

    idea = service.create_idea(did, "主干", git_branch="im/main")
    iid = idea["id"]
    assert service.list_ideas(did)[0]["id"] == iid

    ver = service.create_version(iid, commit="8b1d4f9e")
    vid = ver["id"]

    exp = service.create_experiment(vid, {"lr": 0.005, "dropout": 0.3}, name="r1")
    eid = exp["id"]

    # results 协议冻结：创建时不生成 results.json；params 归 config.json
    layout = storage.DirectionLayout(repo)
    assert not layout.exp_results(eid).exists()
    cfg = json.loads(layout.exp_config(eid).read_text(encoding="utf-8"))
    assert cfg["lr"] == 0.005

    service.update_experiment_status(eid, "running")
    service.set_metrics(eid, {"influence_spread": 0.462, "time": 124.3})
    service.update_experiment_status(eid, "done")

    got = service.get_experiment(eid)
    assert got["status"] == "done"
    assert got["warning"] is False
    assert got["metrics"]["influence_spread"] == 0.462
    assert got["params"]["lr"] == 0.005

    # 状态机：终态不可逆
    with pytest.raises(ValueError):
        service.update_experiment_status(eid, "running")


def test_done_missing_metrics_warns(tmp_path):
    repo = _setup(tmp_path)
    d = service.create_direction("IM", repo)
    idea = service.create_idea(d["direction_id"], "主干")
    ver = service.create_version(idea["id"], commit="abc")
    exp = service.create_experiment(ver["id"], {})
    service.update_experiment_status(exp["id"], "done")
    got = service.get_experiment(exp["id"])
    assert got["status"] == "done"
    assert got["warning"] is True


def test_analysis_write_roundtrip(tmp_path):
    repo = _setup(tmp_path)
    d = service.create_direction("IM", repo)
    idea = service.create_idea(d["direction_id"], "主干")
    ver = service.create_version(idea["id"], commit="abc")
    exp = service.create_experiment(ver["id"], {})

    an = service.write_analysis(exp["id"], "lr 提到 0.005 后 spread 上升。",
                                references=["influence_spread"], author="claude")
    assert an["references"] == ["influence_spread"]

    listed = service.get_analyses(exp["id"])
    assert len(listed) == 1
    assert listed[0]["references"] == ["influence_spread"]
    assert listed[0]["author"] == "claude"
    assert "spread" in listed[0]["content"]


def test_metrics_history_snapshot(tmp_path):
    repo = _setup(tmp_path)
    d = service.create_direction("IM", repo)
    idea = service.create_idea(d["direction_id"], "主干")
    ver = service.create_version(idea["id"], commit="abc")
    exp = service.create_experiment(ver["id"], {})
    service.set_metrics(exp["id"], {"a": 1})
    service.set_metrics(exp["id"], {"a": 2})
    got = service.get_experiment(exp["id"])
    assert got["metrics"]["a"] == 2
    assert got["metric_history"][-1]["metrics"] == {"a": 1}


def test_counter_increments(tmp_path):
    """回归：计数器必须递增，两个实验 id 不能相同。"""
    repo = _setup(tmp_path)
    d = service.create_direction("IM", repo)
    idea = service.create_idea(d["direction_id"], "主干")
    ver = service.create_version(idea["id"], commit="abc")
    e1 = service.create_experiment(ver["id"], {"lr": 0.005})
    e2 = service.create_experiment(ver["id"], {"lr": 0.01})
    assert e1["id"] != e2["id"]
    assert e1["id"].startswith("exp-")
    assert e2["id"] > e1["id"]


def test_soft_delete_and_restore(tmp_path):
    """受限软删除：置 deletedAt 后查询默认过滤，restore 后可见。"""
    repo = _setup(tmp_path)
    d = service.create_direction("IM", repo)
    idea = service.create_idea(d["direction_id"], "主干")
    ver = service.create_version(idea["id"], commit="abc")
    exp = service.create_experiment(ver["id"], {"lr": 0.005})

    # 软删实验 → list 不可见
    r = service.mark_deleted("experiment", exp["id"])
    assert r["deleted_at"] is not None
    assert all(e["id"] != exp["id"] for e in service.list_experiments(d["direction_id"]))

    # 恢复 → 可见
    service.mark_deleted("experiment", exp["id"], restore=True)
    assert any(e["id"] == exp["id"] for e in service.list_experiments(d["direction_id"]))

    # 软删 idea / version / direction
    service.mark_deleted("idea", idea["id"])
    assert all(i["id"] != idea["id"] for i in service.list_ideas(d["direction_id"]))
    service.mark_deleted("version", ver["id"])
    assert all(v["id"] != ver["id"] for v in service.list_versions())
    service.mark_deleted("direction", d["direction_id"])
    assert all(x["id"] != d["direction_id"] for x in service.list_directions())

    # 未知类型拒绝
    import pytest
    with pytest.raises(ValueError):
        service.mark_deleted("unknown", "x")
