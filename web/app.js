/* Idea Forge Web UI —— 对接本地 REST API（/api/v1） */
"use strict";

// ---------------------------------------------------------------- 状态与工具
const state = {
  route: "ideas",
  directionId: null,
  directionName: "",
  ideaId: null,
  expId: null,
  eventSeq: 0,
  experiments: [],
  ideas: [],
  directions: [],
  versions: [],
  proposals: [],
  papers: [],
};

const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = (s) => String(s ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
const fmtDate = (ts) => { if (!ts) return "—"; const d = new Date(ts); return `${d.getMonth() + 1}-${String(d.getDate()).padStart(2, "0")}`; };
const fmtNum = (v) => { if (v == null) return "—"; if (typeof v !== "number") return v; return Math.abs(v) >= 1 ? v.toFixed(3) : v.toFixed(4); };

const API = {
  async req(method, path, body) {
    const r = await fetch("/api/v1" + path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  get: (p) => API.req("GET", p),
  post: (p, b) => API.req("POST", p, b),
  put: (p, b) => API.req("PUT", p, b),
};

// ---------------------------------------------------------------- 数据加载
async function loadAll() {
  const d = await API.get("/directions");
  state.directions = d.directions || [];
  if (!state.directionId && state.directions.length) state.directionId = state.directions[0].id;
  if (state.directionId) {
    const dir = state.directions.find((x) => x.id === state.directionId);
    state.directionName = dir ? dir.name : "";
    const [ideas, exps, vers, papers] = await Promise.all([
      API.get(`/ideas?direction_id=${state.directionId}`),
      API.get(`/experiments?direction_id=${state.directionId}`),
      API.get("/versions"),
      API.get(`/papers?direction_id=${state.directionId}`),
    ]);
    state.ideas = ideas.ideas || [];
    state.experiments = exps.experiments || [];
    state.versions = vers.versions || [];
    state.papers = papers.papers || [];
    if (!state.ideaId || !state.ideas.some((i) => i.id === state.ideaId)) {
      state.ideaId = state.ideas[0] ? state.ideas[0].id : null;
    }
  } else {
    state.ideas = state.experiments = state.versions = state.papers = [];
  }
  const p = await API.get("/proposals").catch(() => ({ proposals: [] }));
  state.proposals = p.proposals || [];
}

// ---------------------------------------------------------------- 渲染骨架
function render() {
  $$(".sb-item[data-route]").forEach((e) => e.classList.toggle("active", e.dataset.route === state.route));
  $("#dir-name").textContent = state.directionName || "未创建方向";
  renderDirMenu();
  renderSidebarIdeas();
  renderCrumb();
  renderBadges();
  const c = $("#content");
  const r = state.route;
  if (r === "literature") c.innerHTML = vLiterature();
  else if (r === "ideas") c.innerHTML = vIdeas();
  else if (r === "experiments") c.innerHTML = vExperiments();
  else if (r === "exp-detail") c.innerHTML = vExpDetail();
  else if (r === "inbox") c.innerHTML = vInbox();
  else c.innerHTML = vToday();
  bindView();
}

function renderCrumb() {
  const d = state.directionName;
  const crumb = $("#crumb");
  if (state.route === "exp-detail" && state.expId) {
    const e = state.experiments.find((x) => x.id === state.expId);
    const idea = state.ideas.find((i) => i.id === state.ideaId);
    crumb.innerHTML = `<span style="font-weight:600">${esc(d)}</span><span class="sep">/</span><span style="cursor:pointer" data-go="experiments">${esc(idea ? idea.name : "")}</span><span class="sep">/</span><span class="mono">${esc(e ? e.id : "")}</span>`;
  } else {
    const names = { today: "今日动态", literature: "文献库", ideas: "Idea 分支树", experiments: "实验总览", inbox: "Agent 收件箱" };
    crumb.innerHTML = `<span style="font-weight:600">${esc(d)}</span><span class="sep">/</span><span class="cur">${names[state.route] || ""}</span>`;
  }
}

function renderBadges() {
  const running = state.experiments.filter((e) => e.status === "running").length;
  const bt = $("#badge-today");
  if (running) { bt.style.display = "flex"; bt.textContent = running; } else bt.style.display = "none";
  const pending = state.proposals.filter((p) => p.status === "pending").length;
  const bi = $("#badge-inbox");
  if (pending) { bi.style.display = "flex"; bi.textContent = pending; } else bi.style.display = "none";
  const ind = $("#act-ind");
  if (running) { ind.style.display = "flex"; $("#act-cnt").textContent = running; } else ind.style.display = "none";
}

function renderDirMenu() {
  $("#dir-menu").innerHTML = state.directions.map((d) => `
    <div class="dir-opt" data-dir="${d.id}" style="padding:8px 10px;border-radius:var(--r-md);cursor:pointer;${d.id === state.directionId ? "background:var(--accent-50)" : ""}">
      <div style="font-weight:600;color:var(--neutral-800);font-size:var(--fs-sm)">${esc(d.name)}${d.id === state.directionId ? ' <span style="color:var(--accent-600);font-size:10px">当前</span>' : ""}</div>
      <div style="font-size:10px;color:var(--neutral-400);font-family:var(--font-mono)">${esc(d.root_path || "")}</div>
    </div>`).join("") || '<div style="padding:10px;font-size:var(--fs-sm);color:var(--neutral-400)">还没有方向</div>';
}

function renderSidebarIdeas() {
  const roots = state.ideas.filter((i) => !i.parent_idea_id);
  const tree = (list, depth) => list.map((n) => {
    const ch = state.ideas.filter((i) => i.parent_idea_id === n.id);
    return `<div class="sb-sub" style="${depth ? "padding-left:" + (24 + depth * 16) + "px" : ""}">
      <div class="sb-item" data-jump-idea="${n.id}"><span>·</span><span class="sb-label">${esc(n.name)}</span></div>
    </div>` + tree(ch, depth + 1);
  }).join("");
  $("#sb-ideas").innerHTML = tree(roots, 0) || '<div class="sb-sub"><span class="sb-label" style="color:var(--neutral-400);font-size:var(--fs-xs)">本方向暂无 Idea</span></div>';
}

// ---------------------------------------------------------------- 视图：今日动态
function vToday() {
  const running = state.experiments.filter((e) => e.status === "running");
  const done = state.experiments.filter((e) => e.status === "done" || e.status === "failed").slice(0, 8);
  let h = `<div class="view"><div class="page-title">今日动态</div>`;
  if (running.length) {
    h += `<div class="section-title">进行中 (${running.length})</div>`;
    running.forEach((e) => { h += `<div class="card" style="padding:var(--sp-4);margin-bottom:var(--sp-3)"><div style="display:flex;justify-content:space-between"><b>${esc(e.name)}</b><span class="status-badge sb-running"><span class="dot"></span>运行中</span></div><div class="m-progress"></div></div>`; });
  }
  h += `<div class="section-title">最近完成 / 失败 (${done.length})</div>`;
  done.forEach((e) => { h += `<div class="card" style="padding:var(--sp-4);margin-bottom:var(--sp-3);border-left:4px solid ${e.status === "failed" ? "var(--danger-500)" : "var(--success-500)"};cursor:pointer" data-open-exp="${e.id}"><div style="display:flex;justify-content:space-between"><b>${esc(e.name)}</b><span class="status-badge ${e.status === "failed" ? "sb-failed" : "sb-done"}"><span class="dot"></span>${e.status === "failed" ? "失败" : "完成"}</span></div><div class="mono" style="font-size:var(--fs-xs);color:var(--neutral-400)">${e.id} · ${fmtDate(e.finished_at)}</div></div>`; });
  return h + `</div>`;
}

// ---------------------------------------------------------------- 视图：文献库
function vLiterature() {
  if (!state.papers.length) return `<div class="view"><div class="empty"><div class="ic">📄</div><div class="t">本方向还没有文献</div></div></div>`;
  const rows = state.papers.map((p) => `
    <div class="lit-row">
      <div><div class="lit-title">${esc(p.title)}</div><div class="lit-meta">${esc((p.authors || []).join(", "))} · ${p.year || "?"} · ${esc(p.venue || "")}</div></div>
      <div style="display:flex;gap:4px">${(p.tags || []).slice(0, 3).map((t) => `<span class="chip">${esc(t)}</span>`).join("")}</div>
      <div>${p.derived_idea_ids && p.derived_idea_ids.length ? `<span class="badge badge-accent">Idea ${p.derived_idea_ids.length}</span>` : `<span class="badge badge-neutral">未衍生</span>`}</div>
    </div>`).join("");
  return `<div class="view"><div class="page-title">文献库 <span style="font-size:var(--fs-sm);color:var(--neutral-400);font-weight:400">${state.papers.length} 篇</span></div><div class="card">${rows}</div></div>`;
}

// ---------------------------------------------------------------- 视图：Idea 树（缩进列表 + 状态）
function vIdeas() {
  if (!state.ideas.length) return `<div class="view"><div class="empty"><div class="ic">🌳</div><div class="t">这个方向还没有 Idea</div><div>从文献点『+ 衍生 Idea』创建</div></div></div>`;
  const tree = (list, depth) => list.map((n) => {
    const ch = state.ideas.filter((i) => i.parent_idea_id === n.id);
    const exps = state.experiments.filter((e) => { const v = state.versions.find((x) => x.id === e.version_id); return v && v.idea_id === n.id; });
    const st = n.status === "validated" ? "sb-done" : n.status === "abandoned" ? "sb-pending" : "sb-running";
    const stTxt = n.status === "validated" ? "已验证" : n.status === "abandoned" ? "已放弃" : "活跃";
    return `<div style="padding:${depth ? 10 + depth * 18 : 10}px 16px;border-bottom:1px solid var(--border-subtle);cursor:pointer;opacity:${n.status === "abandoned" ? ".5" : "1"}" data-open-idea="${n.id}">
      <div style="display:flex;align-items:center;gap:10px">
        <b style="color:var(--neutral-800)">${esc(n.name)}</b>
        <span class="status-badge ${st}"><span class="dot"></span>${stTxt}</span>
        <span class="mono" style="font-size:10px;color:var(--accent-500)">⎇ ${esc(n.git_branch || "")}</span>
        <span class="mono" style="margin-left:auto;font-size:var(--fs-xs);color:var(--neutral-400)">${exps.length} 实验</span>
      </div>
      ${n.hypothesis ? `<div style="font-size:var(--fs-sm);color:var(--neutral-500);margin-top:4px">${esc(n.hypothesis)}</div>` : ""}
    </div>` + tree(ch, depth + 1);
  }).join("");
  return `<div class="view"><div class="page-title">Idea 分支树</div><div class="card">${tree(state.ideas.filter((i) => !i.parent_idea_id), 0)}</div></div>`;
}

// ---------------------------------------------------------------- 视图：实验总览（按版本分组的紧凑表）
function vExperiments() {
  if (!state.ideas.length) return `<div class="view"><div class="empty"><div class="ic">∅</div><div class="t">这个方向还没有 Idea</div></div></div>`;
  const idea = state.ideas.find((i) => i.id === state.ideaId) || state.ideas[0];
  const versions = state.versions.filter((v) => v.idea_id === idea.id);
  const exps = state.experiments.filter((e) => versions.some((v) => v.id === e.version_id));
  const rows = versions.map((v) => {
    const ve = exps.filter((e) => e.version_id === v.id);
    const list = ve.map((e) => `
      <tr style="cursor:pointer" data-open-exp="${e.id}">
        <td class="mono" style="font-size:var(--fs-sm)">${esc(e.id)}</td>
        <td>${esc(e.name)}${e.description ? `<div style="font-size:var(--fs-xs);color:var(--neutral-500);margin-top:2px">${esc(e.description)}</div>` : ""}</td>
        <td><span class="status-badge ${e.status === "done" ? "sb-done" : e.status === "failed" ? "sb-failed" : e.status === "running" ? "sb-running" : "sb-pending"}"><span class="dot"></span>${e.status === "done" ? "完成" : e.status === "failed" ? "失败" : e.status === "running" ? "运行中" : "待运行"}</span></td>
        <td class="mono" style="font-size:var(--fs-xs);color:var(--accent-500)">#${esc(e.gitRef || v.git_ref || "")}</td>
        <td style="font-size:var(--fs-xs);color:var(--neutral-400)">${fmtDate(e.created_at)}</td>
      </tr>`).join("");
    return `<div class="card" style="margin-bottom:var(--sp-3)">
      <div style="padding:var(--sp-3) var(--sp-4);display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border-subtle)">
        <span class="mono" style="font-weight:600;color:var(--neutral-800)">${esc(v.name)}</span>
        <span class="mono" style="font-size:10px;color:var(--neutral-400)">#${esc(v.git_ref || "")}</span>
        <span style="margin-left:auto;font-size:var(--fs-xs);color:var(--neutral-500)">${ve.length} 个实验</span>
      </div>
      <table class="tbl"><thead><tr><th>实验</th><th>名称</th><th>状态</th><th>代码 commit</th><th>创建</th></tr></thead><tbody>${list || `<tr><td colspan="5" style="color:var(--neutral-400)">还没有实验</td></tr>`}</tbody></table>
    </div>`;
  }).join("");
  const switchIdeas = state.ideas.map((i) => `<button class="${i.id === idea.id ? "on" : ""}" data-idea-sel="${i.id}">${esc(i.name)}</button>`).join("");
  return `<div class="view">
    <div class="page-title">实验总览</div>
    <div class="seg" style="margin-bottom:var(--sp-3);flex-wrap:wrap">${switchIdeas}</div>
    ${rows}
    <div style="font-size:var(--fs-xs);color:var(--neutral-400)">共 ${exps.length} 个实验 · 点击行查看详情</div>
  </div>`;
}

// ---------------------------------------------------------------- 视图：实验详情
function vExpDetail() {
  const e = state.experiments.find((x) => x.id === state.expId);
  if (!e) return `<div class="view"><div class="empty"><div class="ic">∅</div><div class="t">实验不存在</div></div></div>`;
  let h = `<div class="view">
    <div class="exp-head">
      <div><h1>${esc(e.name)}</h1>
        ${e.description ? `<div style="font-size:var(--fs-sm);color:var(--neutral-600);margin-top:2px">${esc(e.description)}</div>` : ""}
        <div class="meta-line">${esc(e.id)} · 代码 <span class="mono" style="color:var(--accent-500)">#${esc(e.gitRef || "")}</span> · 创建 ${fmtDate(e.created_at)} · ${e.finished_at ? "完成 " + fmtDate(e.finished_at) : ""}</div>
      </div>
      <span class="status-badge ${e.status === "done" ? (e.warning ? "sb-warn" : "sb-done") : e.status === "failed" ? "sb-failed" : e.status === "running" ? "sb-running" : "sb-pending"}"><span class="dot"></span>${e.status === "done" ? (e.warning ? "完成·缺指标" : "完成") : e.status === "failed" ? "失败" : e.status === "running" ? "运行中" : "待运行"}</span>
    </div>
    <div id="exp-detail-body" style="color:var(--neutral-500)">加载详情…</div>
  </div>`;
  API.get(`/experiments/${e.id}`).then((g) => {
    const body = $("#exp-detail-body");
    if (!body) return;
    const params = Object.entries(g.params || {}).map(([k, v]) => `<tr><td class="kv-key">${esc(k)}</td><td class="kv-val">${esc(String(v))}</td></tr>`).join("");
    const metrics = Object.entries(g.metrics || {}).map(([k, v]) => `<tr><td class="kv-key">${esc(k)}</td><td class="kv-val">${esc(String(v))}</td></tr>`).join("");
    body.innerHTML = `
      <div class="grid-2">
        <div>
          <div class="section-title">params</div>
          <div class="kv-panel"><table class="tbl"><tbody>${params || "<tr><td class='kv-key'>无参数</td></tr>"}</tbody></table></div>
          <div class="section-title" style="margin-top:var(--sp-4)">metrics</div>
          <div class="kv-panel"><table class="tbl"><tbody>${metrics || "<tr><td class='kv-key'>无指标</td></tr>"}</tbody></table></div>
        </div>
        <div id="ana-col">
          <div class="section-title">Agent 分析</div>
          <div class="analysis-card"><div class="ac-body" style="color:var(--neutral-400)">加载分析…</div></div>
        </div>
      </div>`;
    API.get(`/experiments/${e.id}/analyses`).then((a) => {
      const col = $("#ana-col");
      if (!col) return;
      const list = (a.analyses || []).map((an) => `
        <div class="analysis-card" style="margin-bottom:var(--sp-3)">
          <div class="ac-head"><span class="source-badge ${an.source === "agent" ? "src-agent" : "src-human"}">${an.source === "agent" ? "🤖 Agent 自动" : "✍ 手动"}</span> · ${esc(an.author || "")} · ${fmtDate(an.created_at)} ${an.is_read ? "" : '<span class="badge badge-new">NEW</span>'}</div>
          <div class="ac-body">${esc(an.content).replace(/\n/g, "<br>")}</div>
        </div>`).join("");
      col.innerHTML = `<div class="section-title">Agent 分析</div>` + (list || `<div class="analysis-card"><div class="ac-body" style="color:var(--neutral-400)">还没有分析</div></div>`);
    }).catch(() => {});
  }).catch(() => {});
  return h;
}

// ---------------------------------------------------------------- 视图：收件箱
function vInbox() {
  const pending = state.proposals.filter((p) => p.status === "pending");
  const cards = pending.map((p) => `
    <div class="proposal">
      <div class="pr-head">🤖 Agent 自动 · ${fmtDate(p.created_at)}</div>
      <div class="pr-title">${esc(p.title)}</div>
      <div class="pr-body">${esc(p.rationale)}</div>
      <div class="mini-diff" style="font-family:var(--font-mono);font-size:var(--fs-xs);color:var(--neutral-500)">拟创建参数：${esc(JSON.stringify(p.proposed_params || {}))}</div>
      <div style="display:flex;gap:var(--sp-2)"><button class="btn btn-primary" data-approve="${p.id}">批准并创建</button><button class="btn btn-ghost">拒绝</button></div>
    </div>`).join("");
  return `<div class="view">
    <div class="page-title">Agent 收件箱</div>
    <div class="permission-bar">Agent 可以<b>创建实验记录、写入分析、提出提议</b>；<b>不会</b>执行代码、删除数据或修改已有实验结果。</div>
    <div class="section-title">待批准提议 (${pending.length})</div>
    ${cards || `<div class="empty"><div class="ic">📥</div><div class="t">没有待批准的提议</div></div>`}
  </div>`;
}

// ---------------------------------------------------------------- 绑定
function bindView() {
  $$(".sb-item[data-route]").forEach((e) => e.onclick = () => { state.route = e.dataset.route; render(); });
  $$("[data-jump-idea]").forEach((e) => e.onclick = () => { state.ideaId = e.dataset.jumpIdea; state.route = "experiments"; render(); });
  $$("[data-open-idea]").forEach((e) => e.onclick = () => { state.ideaId = e.dataset.openIdea; state.route = "experiments"; render(); });
  $$("[data-open-exp]").forEach((e) => e.onclick = () => { state.expId = e.dataset.openExp; state.route = "exp-detail"; render(); });
  $$("[data-idea-sel]").forEach((e) => e.onclick = () => { state.ideaId = e.dataset.ideaSel; render(); });
  $$("[data-go]").forEach((e) => e.onclick = () => { state.route = e.dataset.go; render(); });
  $$(".dir-opt").forEach((e) => e.onclick = () => { state.directionId = e.dataset.dir; state.ideaId = null; render(); });
  $("#dir-switch").onclick = (ev) => { ev.stopPropagation(); const m = $("#dir-menu"); m.style.display = m.style.display === "block" ? "none" : "block"; };
  $$("[data-approve]").forEach((b) => b.onclick = async () => {
    await API.post(`/proposals/${b.dataset.approve}/approve`, {});
    toast("已批准并创建实验");
    await refresh();
  });
  if (state.route === "exp-detail") {
    // 返回上一级
    $$("#crumb [data-go]").forEach((b) => b.onclick = () => { state.route = "experiments"; render(); });
  }
}

// ---------------------------------------------------------------- 事件轮询 + Toast
function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  $("#toast-wrap").appendChild(t);
  setTimeout(() => t.remove(), 5000);
}

let pollTimer = null;
function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(async () => {
    try {
      const res = await API.get(`/events/poll?since=${state.eventSeq}`);
      if (res.events && res.events.length) {
        state.eventSeq = res.next_seq;
        res.events.forEach((ev) => {
          if (ev.type === "experiment.finished") toast(`${ev.data.experiment_id} 已完成`);
        });
        refresh();
      }
    } catch (_) { /* 忽略轮询错误 */ }
  }, 15000);
}

async function refresh() {
  await loadAll();
  render();
}

// ---------------------------------------------------------------- 启动
(async function init() {
  await refresh();
  startPolling();
})();

document.addEventListener("click", () => { $("#dir-menu").style.display = "none"; });
$("#drawer-close").onclick = () => { $("#drawer").classList.remove("open"); $("#drawer-overlay").classList.remove("open"); };
$("#drawer-overlay").onclick = () => { $("#drawer").classList.remove("open"); $("#drawer-overlay").classList.remove("open"); };
