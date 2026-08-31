"""Watcher：兜底回收长任务（对齐 technical-plan §13 / §17，M4.5）。

扫描所有 running 实验：若 results.json 已含 metrics（agent 跑完写了 sentinel），
自动补迁到 done——覆盖"agent 会话中断 / 忘了回写"。
"""
from __future__ import annotations

import time

from . import domain, service
from .storage import read_json


def scan_once() -> list[str]:
    """扫一次，返回本次自动回收的实验 id 列表。"""
    completed: list[str] = []
    for _did, layout, _entry in service._iter_directions():
        edir = layout.research / "experiments"
        if not edir.exists():
            continue
        for exp_dir in edir.iterdir():
            meta = read_json(exp_dir / "meta.json")
            if not meta or meta.get("status") != domain.STATUS_RUNNING:
                continue
            results = read_json(exp_dir / "results.json")
            if results and results.get("metrics"):
                service.update_experiment_status(
                    meta["id"], domain.STATUS_DONE)
                completed.append(meta["id"])
    return completed


def watch(interval: float = 15.0) -> None:
    print(f"[ideaforge watch] 每 {interval}s 扫描一次（Ctrl+C 停止）")
    while True:
        done = scan_once()
        if done:
            print(f"[ideaforge watch] 自动回收完成: {done}")
        time.sleep(interval)
