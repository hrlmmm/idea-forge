"""ideaforge CLI：M1 最小闭环（direction / paper / idea / version / exp 的 create·list）。

用法：python -m ideaforge.cli <sub> ...  （或 pip install -e . 后 ideaforge ...）
环境变量 IDEAFORGE_HOME 指定全局数据根目录（默认 ~/.idea-forge）。
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

# console script 不保证 cwd 在 sys.path，把项目根显式加入，保证 core/api/ideaforge 可导入
_PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(_PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(_PROJECT_ROOT))

from core import service

CONSOLE = sys.stdout


def _emit(obj: Any) -> None:
    print(json.dumps(obj, ensure_ascii=False, indent=2))


def _add_common(p: argparse.ArgumentParser) -> None:
    p.add_argument("--home", help="覆盖 IDEAFORGE_HOME")


def _set_home(args) -> None:
    if getattr(args, "home", None):
        import os
        os.environ["IDEAFORGE_HOME"] = args.home


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(prog="ideaforge", description="Idea Forge CLI")
    sub = p.add_subparsers(dest="cmd", required=True)

    # direction
    d = sub.add_parser("direction", help="研究方向（一个方向 = 一个仓库）")
    dsub = d.add_subparsers(dest="sub", required=True)
    dc = dsub.add_parser("create")
    _add_common(dc)
    dc.add_argument("name")
    dc.add_argument("repo_path")
    dc.add_argument("--git-remote", default=None)
    dl = dsub.add_parser("list")
    _add_common(dl)
    dl.add_argument("--include-archived", action="store_true")

    # paper
    pp = sub.add_parser("paper", help="文献（全局库）")
    psub = pp.add_subparsers(dest="sub", required=True)
    pc = psub.add_parser("add")
    _add_common(pc)
    pc.add_argument("title")
    pc.add_argument("--directions", nargs="*", default=None)
    pc.add_argument("--authors", nargs="*", default=None)
    pc.add_argument("--year", type=int, default=None)
    pc.add_argument("--venue", default=None)
    pc.add_argument("--tags", nargs="*", default=None)
    pl = psub.add_parser("list")
    _add_common(pl)
    pl.add_argument("--direction", default=None)
    pl.add_argument("--query", default=None)

    # idea
    i = sub.add_parser("idea", help="Idea（= 该方向仓库的一条 git 分支）")
    isub = i.add_subparsers(dest="sub", required=True)
    ic = isub.add_parser("create")
    _add_common(ic)
    ic.add_argument("direction_id")
    ic.add_argument("name")
    ic.add_argument("--hypothesis", default=None)
    ic.add_argument("--parent-idea-id", default=None)
    ic.add_argument("--git-branch", default=None)
    ic.add_argument("--related-papers", nargs="*", default=None)
    il = isub.add_parser("list")
    _add_common(il)
    il.add_argument("--direction", default=None)
    il.add_argument("--include-archived", action="store_true")

    # version
    v = sub.add_parser("version", help="Version（= 分支上的某次 commit）")
    vsub = v.add_subparsers(dest="sub", required=True)
    vc = vsub.add_parser("create")
    _add_common(vc)
    vc.add_argument("idea_id")
    vc.add_argument("--commit", default=None)
    vc.add_argument("--note", default=None)
    vl = vsub.add_parser("list")
    _add_common(vl)
    vl.add_argument("--idea", default=None)

    # experiment
    e = sub.add_parser("exp", help="Experiment（params/metrics 键值）")
    esub = e.add_subparsers(dest="sub", required=True)
    ec = esub.add_parser("create")
    _add_common(ec)
    ec.add_argument("version_id")
    ec.add_argument("--params", default="{}", help="JSON 字符串，如 '{\"lr\":0.005,\"dropout\":0.3}'")
    ec.add_argument("--name", default=None)
    ec.add_argument("--created-by", default="agent")
    el = esub.add_parser("list")
    _add_common(el)
    el.add_argument("--direction", default=None)
    el.add_argument("--idea", default=None)
    el.add_argument("--version", default=None)
    el.add_argument("--status", default=None)
    eg = esub.add_parser("get")
    _add_common(eg)
    eg.add_argument("experiment_id")
    es = esub.add_parser("status")
    _add_common(es)
    es.add_argument("experiment_id")
    es.add_argument("status", choices=["pending", "running", "done", "failed"])
    es.add_argument("--finished-at", default=None)
    em = esub.add_parser("metrics")
    _add_common(em)
    em.add_argument("experiment_id")
    em.add_argument("--metrics", default="{}")

    # analysis
    an = sub.add_parser("analysis", help="Analysis（复盘，Markdown）")
    ansub = an.add_subparsers(dest="sub", required=True)
    aw = ansub.add_parser("write")
    _add_common(aw)
    aw.add_argument("experiment_id")
    aw.add_argument("content")
    aw.add_argument("--references", nargs="*", default=None)
    aw.add_argument("--author", default=None)

    # index
    ix = sub.add_parser("index", help="SQLite 索引")
    ixsub = ix.add_subparsers(dest="sub", required=True)
    ixr = ixsub.add_parser("rebuild")
    _add_common(ixr)

    # mcp
    mc = sub.add_parser("mcp", help="启动 MCP server（stdio）")
    _add_common(mc)
    mc.add_argument("--transport", default="stdio", choices=["stdio"])

    # serve
    sv = sub.add_parser("serve", help="启动本地服务（REST + 静态托管）")
    _add_common(sv)
    sv.add_argument("--host", default="127.0.0.1")
    sv.add_argument("--port", type=int, default=8530)

    # watch
    wt = sub.add_parser("watch", help="Watcher：兜底回收长任务")
    _add_common(wt)
    wt.add_argument("--interval", type=float, default=15.0)

    return p


def main(argv: list[str] | None = None) -> int:
    p = build_parser()
    args = p.parse_args(argv)
    _set_home(args)
    try:
        _dispatch(p, args)
    except KeyError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    except ValueError as e:
        print(f"error: {e}", file=sys.stderr)
        return 1
    return 0


def _dispatch(p: argparse.ArgumentParser, args) -> None:
    cmd = args.cmd
    sub = getattr(args, "sub", None)

    if cmd == "direction":
        if sub == "create":
            _emit(service.create_direction(args.name, args.repo_path, args.git_remote))
        elif sub == "list":
            _emit(service.list_directions(args.include_archived))
    elif cmd == "paper":
        if sub == "add":
            _emit(service.add_paper(args.title, args.directions, args.authors,
                                    args.year, args.venue, args.tags))
        elif sub == "list":
            _emit(service.search_papers(direction_id=args.direction, query=args.query))
    elif cmd == "idea":
        if sub == "create":
            _emit(service.create_idea(args.direction_id, args.name, args.hypothesis,
                                      args.parent_idea_id, args.git_branch,
                                      args.related_papers))
        elif sub == "list":
            _emit(service.list_ideas(args.direction, args.include_archived))
    elif cmd == "version":
        if sub == "create":
            _emit(service.create_version(args.idea_id, args.commit, args.note))
        elif sub == "list":
            _emit(service.list_versions(args.idea))
    elif cmd == "exp":
        if sub == "create":
            params = json.loads(args.params)
            _emit(service.create_experiment(args.version_id, params, args.name, args.created_by))
        elif sub == "list":
            _emit(service.list_experiments(args.direction, args.idea, args.version, args.status))
        elif sub == "get":
            _emit(service.get_experiment(args.experiment_id))
        elif sub == "status":
            _emit(service.update_experiment_status(args.experiment_id, args.status,
                                                   args.finished_at))
        elif sub == "metrics":
            _emit(service.set_metrics(args.experiment_id, json.loads(args.metrics)))
    elif cmd == "analysis":
        if sub == "write":
            _emit(service.write_analysis(args.experiment_id, args.content,
                                         args.references, author=args.author))
    elif cmd == "index":
        if sub == "rebuild":
            from core.index import Index
            idx = Index()
            n = idx.rebuild()
            idx.close()
            _emit({"indexed_experiments": n, "db": str(Index().dr.index_db)})
    elif cmd == "mcp":
        from ideaforge.mcp_server import run
        run(args.transport)
    elif cmd == "serve":
        import uvicorn
        from api.server import app
        uvicorn.run(app, host=args.host, port=args.port, log_level="warning")
    elif cmd == "watch":
        from core.watcher import watch
        watch(args.interval)
    else:
        p.print_help()
        return


if __name__ == "__main__":
    raise SystemExit(main())
