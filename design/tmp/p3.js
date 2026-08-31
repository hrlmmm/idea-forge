
/* ══════════════════════════════════════════════════════════════════════════
 * 状态与路由
 * ════════════════════════════════════════════════════════════════════════*/
const state = {
  name:'ideas',
  ideaId:null, versionId:null, expId:null,
  query:{},
  device:'desktop', density:'auto', demo:'normal',
  collapsedSidebar:false,
  lit:{ q:'', tags:[], derived:'all', sort:'recent', mode:'list' },
  mtx:{ metric:null, agg:'auto', norm:'global', bucket:'week', status:'all', conds:[] },
  diff:{ a:null, b:null, onlyDiff:false },
  chart:{ type:'line', x:null, y:null, fixed:{}, brush:null, dims:null },
  famDims:{},                 // 手动维度覆盖：versionId -> [keys]
  sel:new Set(),
  directions:Object.assign({}, DIRECTIONS),
  pinned:[],
  drawer:null, modal:null,
  readAn:new Set(),
  adopted:{},
  dismissed:new Set(),
  proposalState:{},
  toastSeq:0,
};

function go(name, ids, query){
  state.name = name;
  state.ideaId = (ids&&ids.ideaId)||null;
  state.versionId = (ids&&ids.versionId)||null;
  state.expId = (ids&&ids.expId)||null;
  state.query = query||{};
  syncHash();
  renderAll();
}
function syncHash(){
  let h = '#/'+state.name;
  if (state.ideaId) h += '/'+state.ideaId;
  if (state.versionId) h += '/'+state.versionId;
  if (state.expId) h += '/'+state.expId;
  const q = new URLSearchParams(state.query).toString();
  if (q) h += '?'+q;
  if (location.hash !== h){
    suppressHash = true; location.hash = h;
    setTimeout(()=>{ suppressHash = false; }, 60);
  }
}
let suppressHash = false;
function parseHash(){
  const h = location.hash.replace(/^#\/?/,'');
  const [path, qs] = h.split('?');
  const seg = path.split('/').filter(Boolean);
  const q = {}; new URLSearchParams(qs||'').forEach((v,k)=>q[k]=v);
  if (!seg.length){ state.name = isMobile() ? 'today' : 'ideas'; state.ideaId=state.versionId=state.expId=null; state.query={}; return; }
  state.name = seg[0]; state.ideaId = seg[1]||null; state.versionId = seg[2]||null; state.expId = seg[3]||null;
  state.query = q;
  if (q.view) state.mtx.view = q.view;
}
function isMobile(){ return state.device === 'mobile'; }
function effectiveDensity(){
  if (state.density!=='auto') return state.density;
  return isMobile() ? 'comfortable' : 'compact';
}

/* ══════════════════════════════════════════════════════════════════════════
 * 通用渲染小工具
 * ════════════════════════════════════════════════════════════════════════*/
const $ = sel => document.querySelector(sel);
const appEl = () => $('#app');

/** §7.1 done 且 metrics 缺失 → 降级为 warning 态 */
function effStatus(e){
  if (e.status==='done' && (!e.metrics || !Object.keys(e.metrics).length)) return 'missing';
  return e.status;
}
const STATUS_TEXT = { pending:'待运行', running:'运行中', done:'完成', missing:'完成·缺指标', failed:'失败' };
function statusBadge(e, size){
  const s = effStatus(e);
  return `<span class="sb-status ${s} ${size==='md'?'md':''}"><i class="dot"></i>${STATUS_TEXT[s]}</span>`;
}
function statusPill(status, size){
  const s = status==='missing' ? 'missing' : status;
  return `<span class="sb-status ${s} ${size==='md'?'md':''}"><i class="dot"></i>${STATUS_TEXT[s]||status}</span>`;
}
function srcBadge(a){
  return a.source==='agent'
    ? `<span class="src agent">🤖 Agent 自动</span>`
    : `<span class="src human">✍ 手动</span>`;
}
function seg(items, cur, act, extra){
  return `<div class="seg ${extra||''}" data-act-seg="${act}">` + items.map(it=>
    `<button data-act="${act}" data-val="${esc(it.v)}" aria-pressed="${it.v===cur}">${esc(it.t)}</button>`).join('') + `</div>`;
}
function chip(txt, opts){
  const o = opts||{};
  return `<span class="chip ${o.mono?'mono':''} ${o.sel?'sel':''} ${o.tone||''} ${o.sm?'sm':''}">${esc(txt)}${o.x?`<button class="x" data-act="${o.xAct}" data-val="${esc(o.xVal||'')}" title="移除">✕</button>`:''}</span>`;
}
function kbd(t){ return `<span class="kbd">${esc(t)}</span>`; }

function emptyState(art, title, desc, actions){
  return `<div class="empty"><div class="art">${art}</div><div class="t">${esc(title)}</div>
    <div class="d">${desc||''}</div><div class="row g2 mt3">${actions||''}</div></div>`;
}
function errState(msg){
  return `<div class="err"><div class="ic">!</div><div class="fs-md">${esc(msg||'加载失败')}</div>
    <div class="fs-sm muted">本地核心没有响应 —— 检查 <span class="mono">idea-forge serve</span> 是否还在运行。</div>
    <div class="row g2 mt3"><button class="btn primary" data-act="demo" data-val="normal">重试</button>
    <button class="btn" data-act="copy-cmd">复制诊断命令</button></div></div>`;
}
function skeletonView(){
  const rows = Array.from({length:10},()=>`<div class="sk r" style="margin-bottom:1px"></div>`).join('');
  return `<div class="mt4"><div class="sk t" style="width:180px;margin-bottom:16px"></div>
    <div class="card" style="padding:0">
      <div class="sk" style="height:32px;border-radius:0"></div>${rows}</div></div>`;
}
/** 极简 Markdown 渲染（标题压制到 h4 以内 + 行内代码 → metric chip） */
function renderMd(md, exp){
  const keys = exp ? Object.keys(exp.metrics||{}) : [];
  let s = esc(md);
  s = s.replace(/^###\s?(.*)$/gm, '<h4 style="font-size:var(--fs-base);font-weight:600;color:var(--neutral-800);margin:10px 0 4px">$1</h4>');
  s = s.replace(/\*\*(.+?)\*\*/g, '<b style="color:var(--neutral-800)">$1</b>');
  s = s.replace(/`([^`]+)`/g, (m,k)=>{
    const hit = keys.indexOf(k)>=0;
    return hit
      ? `<span class="chip mono" style="height:18px;padding:0 5px;background:var(--accent-50);border-color:var(--accent-200);color:var(--accent-700)" data-tip="${esc(k+' = '+fmtNum((exp.metrics||{})[k]))}">${esc(k)}</span>`
      : `<code class="mono" style="background:var(--neutral-100);padding:1px 4px;border-radius:3px;font-size:var(--fs-sm)">${esc(k)}</code>`;
  });
  s = s.replace(/^-\s+(.*)$/gm, '<div style="padding-left:14px;position:relative"><span style="position:absolute;left:2px;color:var(--neutral-400)">·</span>$1</div>');
  s = s.replace(/^(\d+)\.\s+(.*)$/gm, '<div style="padding-left:18px;position:relative"><span style="position:absolute;left:0;color:var(--neutral-400)" class="mono">$1.</span>$2</div>');
  s = s.split(/\n{2,}/).map(para=>/^<h4|^<div/.test(para)?para:`<p style="margin:0 0 6px">${para.replace(/\n/g,'<br>')}</p>`).join('');
  return s;
}
/* Δ 计算：落实 D2 —— 参数永不染色，指标仅声明方向后染色 */
function delta(a, b, key, kind){
  if (!isNum(a) || !isNum(b)) return { sym:'≠', text:'≠', cls:'' };
  const d = b - a;
  const pct = a!==0 ? d/Math.abs(a)*100 : null;
  const rel = a!==0 ? Math.abs(d/Math.abs(a)) : (d===0?0:1);
  const sym = (d===0) ? '±' : rel<0.001 ? '±' : d>0 ? '↑' : '↓';
  let text = sym+' '+sig(Math.abs(d));
  if (pct!==null && d!==0) text += ' ('+(pct>0?'+':'')+pct.toFixed(1)+'%)';
  let cls = '';
  if (kind==='metric' && key in state.directions && d!==0 && rel>=0.001){
    const better = state.directions[key]===true ? d>0 : d<0;
    cls = better ? 'good' : 'bad';
  }
  return { sym, text, cls, raw:d };
}
function deltaSpan(a,b,key,kind){
  const d = delta(a,b,key,kind);
  return `<span class="d ${d.cls}">${esc(d.text)}</span>`;
}

/* ══════════════════════════════════════════════════════════════════════════
 * 外壳：侧边栏 / 顶栏 / 面包屑 / Tab bar
 * ════════════════════════════════════════════════════════════════════════*/
function runningExps(){ return EXPERIMENTS.filter(e=>e.status==='running'); }
function unreadAnalyses(){
  return ANALYSES.filter(a=>a.unread && !state.readAn.has(a.id));
}
function pendingProposals(){
  return PROPOSALS.filter(p=>(state.proposalState[p.id]||p.status)==='pending');
}

function renderSidebar(){
  const running = runningExps().length, unread = unreadAnalyses().length, pend = pendingProposals().length;
  const cur = state.name;
  const roots = IDEAS.filter(i=>!i.parent);
  const item = (act, val, icon, label, badge, extra) =>
    `<button class="sb-item ${extra||''}" data-act="${act}" data-val="${esc(val)}">
      <span class="ico">${icon}</span><span class="sb-label">${esc(label)}</span>
      ${badge?`<span class="sb-dot">${badge}</span>`:''}</button>`;
  const jumpItem = (i, depth) => {
    const vs = versionsOfIdea(i.id);
    const exps = expsOfIdea(i.id);
    const s = ideaStat(i.id);
    const kids = childIdeas(i.id);
    const active = state.ideaId===i.id;
    return `<button class="sb-item ${depth?'sb-sub':'sb-sub2'}" data-act="open-idea" data-val="${i.id}"
        aria-current="${active}" style="${depth?'':'padding-left:8px'}">
        <span class="ico" style="font-size:9px">${i.status==='abandoned'?'○':i.status==='validated'?'✓':'◉'}</span>
        <span class="sb-label trunc">${esc(i.name)}</span>
        ${kids.length?`<span class="sb-caret">▾</span>`:''}
        ${s.unread?`<span class="sb-dot">${s.unread}</span>`:`<span class="sb-meta" style="margin-left:auto;color:var(--neutral-400);font-size:10px">${vs.length}v · ${exps.length}</span>`}
      </button>` + kids.map(k=>jumpItem(k, depth+1)).join('');
  };
  $('#sidebar').innerHTML = `
    <div class="sb-head">
      <div class="sb-logo">⬢</div>
      <button class="btn ghost grow" style="justify-content:flex-start;padding:0 4px;height:28px"
        data-act="project-switch" title="切换项目">
        <span class="trunc" style="font-weight:600;color:var(--neutral-800)">${esc(PROJECT.name)}</span>
        <span class="sb-caret muted">▾</span></button>
      <button class="btn ghost icon sm" data-act="toggle-sidebar" title="折叠侧边栏">≡</button>
    </div>
    <div class="sb-body">
      ${item('nav','today','◷','今日动态', running+unread)}
      ${item('nav','literature','▤','文献库','')}
      ${item('nav','ideas','🌳','Idea 分支树','')}
      ${item('nav','experiments','▦','实验总览','')}
      ${item('nav','inbox','✉','Agent 收件箱', pend+unread)}
      <div class="sb-sec">Idea 快捷跳转</div>
      ${roots.map(i=>jumpItem(i,0)).join('')}
      <div class="hr" style="margin:8px 4px"></div>
      <button class="sb-item" data-act="new-idea"><span class="ico">＋</span><span class="sb-label">新建 Idea</span></button>
    </div>
    <div class="sb-foot">
      <button class="btn ghost sm" data-act="reindex" style="color:var(--neutral-500)">
        <span class="live-dot" style="width:6px;height:6px;background:var(--success-500);animation:none"></span>
        <span>索引已同步 · ${esc(PROJECT.syncedAt)}</span></button>
    </div>`;
  // 选中态注入
  document.querySelectorAll('#sidebar .sb-item').forEach(el=>{
    const a = el.getAttribute('data-act');
    if (a==='nav'){
      const v = el.getAttribute('data-val');
      el.setAttribute('aria-current', String(v===cur || (v==='ideas'&&(cur==='idea'||cur==='version'||cur==='experiment'))));
    }
  });
}
function ideaStat(iid){
  const exps = expsOfIdea(iid);
  const ids = exps.map(e=>e.id);
  const unread = ANALYSES.filter(a=>ids.includes(a.expId) && a.unread && !state.readAn.has(a.id)).length;
  return { exps, unread };
}

function renderTopbar(){
  const q = $('#topbar');
  const mobile = isMobile();
  const running = runningExps().length;
  const title = pageTitle();
  const showStatus = ['experiments','version','experiment'].includes(state.name) ||
    (state.name==='idea' && state.query.tab==='versions');
  q.innerHTML = `
    ${mobile?`<button class="btn ghost icon" data-act="back" title="返回">‹</button>`:''}
    <div class="grow trunc" style="font-size:var(--fs-md);font-weight:600;color:var(--neutral-800)">${esc(title)}</div>
    <div class="tb-search">
      <span class="mag">🔍</span>
      <input id="gsearch" placeholder="搜索文献 / Idea / 实验 / 参数值" data-act="open-cmd" readonly
        value="" aria-label="全局搜索">
      <span class="kbd">⌘K</span>
    </div>
    ${showStatus?`<div class="shrink0">${seg([{v:'all',t:'全部'},{v:'running',t:'运行中'},{v:'done',t:'完成'},{v:'failed',t:'失败'}],
        state.mtx.status||'all','set-status')}</div>`:''}
    ${running?`<button class="btn ghost" data-act="activity" title="运行中的实验">
        <span class="live-dot"></span><span class="mono">${running}</span></button>`:''}
    ${mobile?'':`<button class="btn ghost icon" data-act="qr" title="在手机上打开">▣</button>
    <button class="btn ghost icon" data-act="more" title="更多">⋯</button>`}`;
}

function pageTitle(){
  switch(state.name){
    case 'today': return '今日动态';
    case 'literature': return '文献库';
    case 'ideas': return 'Idea 分支树';
    case 'idea': { const i=ideaById(state.ideaId); return i?i.name:'Idea'; }
    case 'version': { const v=versionById(state.versionId); return v? v.name+' · '+v.git : 'Version'; }
    case 'experiment': { const e=expById(state.expId); return e?e.id:'实验'; }
    case 'experiments': return '实验总览';
    case 'inbox': return 'Agent 收件箱';
    default: return 'Idea Forge';
  }
}
function renderCrumbs(){
  const segs = [];
  segs.push({t:PROJECT.name, act:'nav', v:'ideas'});
  if (state.ideaId){ const i=ideaById(state.ideaId); if(i){ ideaPath(state.ideaId).forEach(p=>segs.push({t:p.name, act:'open-idea', v:p.id})); } }
  if (state.versionId){ const v=versionById(state.versionId); if(v) segs.push({t:v.name+' '+v.git, act:'open-version', v:v.id}); }
  if (state.expId) segs.push({t:state.expId, act:'open-exp', v:state.expId});
  if (segs.length===1){ segs.push({t:pageTitle()}); }
  const show = isMobile() ? segs.slice(-2) : segs;
  $('#crumbs').innerHTML =
    (isMobile()&&segs.length>2?`<button class="btn ghost icon sm" data-act="back">‹</button>`:'') +
    show.map((s,i)=>{
      const last = i===show.length-1;
      return (i?'<span class="sep">/</span>':'') +
        (last?`<span class="cur mono" style="font-family:var(--font-sans)">${esc(s.t)}</span>`
             :`<button class="seg-link" data-act="${s.act}" data-val="${esc(s.v||'')}">${esc(s.t)}</button>`);
    }).join('') +
    `<span class="grow"></span>` +
    (isMobile()?'':`<span class="fs-xs muted mono" style="font-family:var(--font-mono)">${esc(PROJECT.root)}</span>`);
}
function renderTabbar(){
  if (!isMobile()){ $('#tabbar').innerHTML=''; return; }
  const unread = unreadAnalyses().length, pend = pendingProposals().length;
  const running = runningExps().length;
  const items = [
    {v:'today', t:'今日', ic:'◷', b:running+unread},
    {v:'literature', t:'文献', ic:'▤', b:0},
    {v:'ideas', t:'Idea', ic:'🌳', b:0},
    {v:'experiments', t:'实验', ic:'▦', b:0},
    {v:'inbox', t:'收件箱', ic:'✉', b:pend+unread},
  ];
  const cur = ['idea','version','experiment'].includes(state.name)
    ? (state.name==='experiment'?'experiments':'ideas') : state.name;
  $('#tabbar').innerHTML = items.map(it=>
    `<button class="ti ${it.v===cur?'on':''}" data-act="nav" data-val="${it.v}">
      <span class="ic">${it.ic}</span><span>${it.t}</span>
      ${it.b?`<span class="bd">${it.b}</span>`:''}</button>`).join('');
}

/* ══════════════════════════════════════════════════════════════════════════
 * 视图：今日动态（移动端首页 / 桌面也可看）
 * ════════════════════════════════════════════════════════════════════════*/
function viewToday(){
  const running = runningExps();
  const todayDone = EXPERIMENTS.filter(e=>e.finishedAt && e.finishedAt.slice(0,10)===TODAY)
    .sort((a,b)=> (a.status==='failed'?-1:0)-(b.status==='failed'?-1:0) || b.finishedAt.localeCompare(a.finishedAt));
  const unread = unreadAnalyses().sort((a,b)=>b.ts.localeCompare(a.ts));
  if (!running.length && !todayDone.length && !unread.length && state.demo==='empty')
    return emptyState('◔','今天还没有动静','没有运行中的实验，也没有新的结果或分析。');
  let html = '';
  /* 块 1 · 运行中 */
  if (running.length){
    html += `<div><div class="row between mb2"><div class="fs-md">进行中 <span class="muted strong">(${running.length})</span></div>
      <button class="btn ghost sm" data-act="nav" data-val="experiments">查看全部</button></div>
      <div class="mstack">` + running.slice(0,3).map(e=>{
      const v = versionById(e.versionId); const i = ideaById(e.ideaId);
      return `<div class="card pad">
        <div class="fs-xs muted">${esc(i?i.name:'')} / <span class="mono">${esc(v?v.name:'')}</span></div>
        <div class="row between mt1">
          <span class="fs-md">${esc(e.id)}</span>${statusPill('running')}</div>
        <div class="prog mt3"></div>
        <div class="fs-xs dim mt2">已运行 ${esc(e.elapsed||'—')} · 上次心跳 ${e.heartbeat||0} 秒前</div>
      </div>`;}).join('') + (running.length>3?
        `<button class="btn ghost sm" data-act="nav" data-val="experiments">查看全部 ${running.length} 个运行中</button>`:'')
      + `</div></div>`;
  }
  /* 块 2 · 今日结果 */
  html += `<div><div class="row between mb2"><div class="fs-md">今日完成 / 失败 <span class="muted strong">(${todayDone.length})</span></div></div>`;
  if (!todayDone.length){
    html += `<div class="fs-sm muted" style="padding:6px 0">今天还没有完成的实验</div>`;
  } else {
    html += `<div class="mstack">` + todayDone.map(e=>{
      const v = versionById(e.versionId); const i = ideaById(e.ideaId);
      const mk = topMetricKey([e]);
      const val = mk ? (e.metrics||{})[mk] : undefined;
      const base = baselineOf(e);
      const bv = base && mk ? (base.metrics||{})[mk] : undefined;
      const d = (isNum(val)&&isNum(bv)) ? delta(bv,val,mk,'metric') : null;
      const failed = e.status==='failed';
      return `<div class="card pad" data-act="open-exp" data-val="${e.id}" style="${failed?'border-left:3px solid var(--danger-500)':''}">
        <div class="fs-xs muted">${esc(i?i.name:'')} / <span class="mono">${esc(v?v.name:'')}</span></div>
        <div class="row between mt1">
          <span class="fs-md trunc">${esc(e.id)}</span>
          ${statusBadge(e)}
        </div>
        ${failed?`<div class="fs-sm trunc" style="color:var(--danger-600);max-width:100%">RuntimeError: propagation matrix became singular</div>`:''}
        <div class="row between mt3">
          <div>
            <div class="fs-xs muted mono">${esc(mk||'—')}</div>
            <div class="row g2 ac">
              <span class="mono" style="font-size:var(--fs-metric);font-weight:600;color:var(--neutral-900)">${esc(fmtNum(val))}</span>
              ${d?`<span class="fs-sm ${d.cls}" style="color:${d.cls==='good'?'var(--success-600)':d.cls==='bad'?'var(--danger-600)':'var(--neutral-500)'}">${esc(d.text)}</span>`:''}
            </div>
          </div>
          <div class="col end g1">
            ${effStatus(e)==='missing'?`<span class="chip warn sm">指标缺失</span>`:''}
            <span class="fs-xs dim">${esc(fmtTime(e.finishedAt))}</span>
          </div>
        </div>
      </div>`;}).join('') + `</div>`;
  }
  html += `</div>`;
  /* 块 3 · Agent 新分析 */
  html += `<div><div class="row between mb2">
      <div class="fs-md">Agent 新分析 <span class="muted strong">(${unread.length})</span></div>
      ${unread.length?`<button class="btn ghost sm" data-act="read-all">全部已读</button>`:''}</div>`;
  if (!unread.length){
    html += `<div class="fs-sm muted" style="padding:6px 0">暂无新的 agent 分析</div>`;
  } else {
    html += `<div class="mstack">` + unread.map(a=>{
      const e = expById(a.expId);
      const open = state.expandedAn && state.expandedAn.has(a.id);
      return `<div class="card pad" style="position:relative">
        <span style="position:absolute;right:12px;top:14px;width:6px;height:6px;border-radius:50%;background:var(--accent-600)"></span>
        <div class="row g2 ac">${srcBadge(a)}<span class="fs-xs muted">${esc(a.author)} · ${esc(fmtTime(a.ts))}</span></div>
        <div class="fs-xs muted mt2">${esc(e? (ideaById(e.ideaId)||{}).name+' / '+(versionById(e.versionId)||{}).name+' / '+e.id : '')}</div>
        <div class="fs-base mt2 ${open?'':'clamp2'}" style="color:var(--neutral-700);line-height:1.7">
          ${open ? renderMd(a.md, e) : esc(a.md.replace(/[#`*]/g,'').split('\n').filter(Boolean)[1]||a.md.slice(0,80))}
        </div>
        <div class="row g2 mt3">
          <button class="btn ghost sm" data-act="toggle-an" data-val="${a.id}">${open?'收起 ▴':'展开全文 ▾'}</button>
          <button class="btn ghost sm" data-act="open-exp" data-val="${a.expId}">跳转到实验</button>
          <span class="grow"></span>
          <button class="btn ghost sm" data-act="read-an" data-val="${a.id}">标记已读</button>
        </div>
      </div>`;}).join('') + `</div>`;
  }
  html += `</div>`;
  return `<div class="mstack" style="max-width:${isMobile()?'100%':'720px'}">${html}</div>`;
}

/** baseline 选择：同配置组的前一个已完成实验（无配置组则取同版本更早的） */
function baselineOf(e){
  const rows = expsOfVersion(e.versionId);
  const before = rows.filter(x=>x._order < e._order && isNum(Object.values(x.metrics||{})[0]));
  return before.length ? before[before.length-1] : null;
}

/* ══════════════════════════════════════════════════════════════════════════
 * 视图：文献库
 * ════════════════════════════════════════════════════════════════════════*/
function litFiltered(){
  const f = state.lit;
  const q = f.q.trim().toLowerCase();
  let rows = LITERATURE.filter(l=>{
    if (f.tags.length && !f.tags.every(t=>l.tags.includes(t))) return false;
    if (f.derived==='yes' && !l.derived.length) return false;
    if (f.derived==='no' && l.derived.length) return false;
    if (!q) return true;
    return (l.title+' '+l.authors+' '+l.note+' '+l.tags.join(' ')+' '+l.venue+' '+l.year).toLowerCase().includes(q);
  });
  const by = {
    recent:(a,b)=>b.addedAt.localeCompare(a.addedAt),
    title:(a,b)=>a.title.localeCompare(b.title),
    year:(a,b)=>b.year-a.year,
    derived:(a,b)=>b.derived.length-a.derived.length,
  };
  return rows.sort(by[f.sort]||by.recent);
}
function allTags(){
  const m = new Map();
  LITERATURE.forEach(l=>l.tags.forEach(t=>m.set(t,(m.get(t)||0)+1)));
  return Array.from(m).sort((a,b)=>b[1]-a[1]);
}
function hl(text, q){
  if (!q) return esc(text);
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i<0) return esc(text);
  return esc(text.slice(0,i)) + '<mark>' + esc(text.slice(i,i+q.length)) + '</mark>' + esc(text.slice(i+q.length));
}
function viewLiterature(){
  const f = state.lit;
  const rows = litFiltered();
  const tags = allTags();
  const readDot = r => r==='read' ? '<span title="已读" style="width:8px;height:8px;border-radius:50%;background:var(--neutral-400);display:inline-block"></span>'
    : r==='reading' ? '<span title="在读" style="width:8px;height:8px;border-radius:50%;border:2px solid var(--accent-500);border-right-color:transparent;display:inline-block;transform:rotate(45deg)"></span>'
    : '<span title="未读" style="width:8px;height:8px;border-radius:50%;border:1.5px solid var(--neutral-300);display:inline-block"></span>';
  const listHtml = rows.length ? rows.map(l=>`
    <div class="li row g3" style="padding:0 var(--sp-3);height:${effectiveDensity()==='compact'?'40px':'44px'};border-bottom:1px solid var(--border-subtle);position:relative"
      data-act="open-lit" data-val="${l.id}">
      <span style="width:16px;text-align:center;color:var(--neutral-400)">📄</span>
      <span class="grow trunc" style="font-size:var(--fs-md);color:var(--neutral-800);font-weight:500" data-hover-accent>
        ${hl(l.title, f.q)}</span>
      <span class="fs-sm muted nowrap hide-sm">${esc(l.authors.split(',')[0])} et al. · ${l.year} · ${esc(l.venue)}</span>
      <span class="row g1">${l.tags.slice(0,3).map(t=>chip(t,{sm:true})).join('')}${l.tags.length>3?chip('+'+ (l.tags.length-3),{sm:true}):''}</span>
      <span class="nowrap">${l.derived.length
        ? `<span class="chip sel sm" style="border-color:var(--accent-200)">Idea ${l.derived.length}</span>`
        : `<span class="chip sm" style="color:var(--neutral-500);border-color:var(--border)">未衍生</span>`}</span>
      <span style="width:14px;text-align:center">${readDot(l.read)}</span>
      <span class="row g1" style="opacity:0;transition:opacity .12s" data-row-actions>
        <button class="btn ghost sm" data-act="derive-idea" data-val="${l.id}" title="衍生 Idea">+ 衍生 Idea</button>
      </span>
    </div>`).join('') : '';
  const side = `<div style="width:180px;flex:none">
      <div class="fs-xs muted mb2" style="letter-spacing:.06em">标签云</div>
      <div class="row wrap g1">${tags.map(([t,n])=>
        `<button class="chip sm ${f.tags.includes(t)?'sel':''}" data-act="toggle-tag" data-val="${esc(t)}">${esc(t)} <span class="dim">${n}</span></button>`).join('')}</div>
    </div>`;
  const toolbar = `<div class="toolbar wrap2">
      <div class="row g2 grow" style="min-width:280px">
        <div class="rel" style="width:320px;max-width:100%">
          <input class="inp" id="litq" style="width:100%;padding-left:28px" placeholder="搜索标题 / 作者 / 笔记" value="${esc(f.q)}" data-act="lit-input">
          <span style="position:absolute;left:9px;top:8px;color:var(--neutral-400);font-size:12px">🔍</span>
          ${f.q?`<button class="btn ghost icon sm" style="position:absolute;right:4px;top:4px" data-act="lit-clear">✕</button>`:''}
        </div>
        ${f.tags.length?`<div class="row g1 wrap">${f.tags.map(t=>chip(t,{sel:true,x:true,xAct:'toggle-tag',xVal:t,sm:true})).join('')}</div>`:''}
      </div>
      <div class="row g2">
        ${seg([{v:'all',t:'全部'},{v:'yes',t:'已衍生'},{v:'no',t:'未衍生'}], f.derived, 'set-derived')}
        <select class="sel" data-act="lit-sort">
          <option value="recent"${f.sort==='recent'?' selected':''}>最近添加</option>
          <option value="title"${f.sort==='title'?' selected':''}>标题 A-Z</option>
          <option value="year"${f.sort==='year'?' selected':''}>年份倒序</option>
          <option value="derived"${f.sort==='derived'?' selected':''}>派生 Idea 数</option>
        </select>
        ${seg([{v:'list',t:'列表'},{v:'grid',t:'网格'}], f.mode, 'set-litmode')}
      </div>
    </div>`;
  let body;
  if (f.mode==='grid'){
    body = rows.length ? `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:var(--sp-3)">
      ${rows.map(l=>`<div class="card pad hoverable" data-act="open-lit" data-val="${l.id}">
        <div class="row between"><span class="fs-md">${hl(l.title,f.q)}</span>${readDot(l.read)}</div>
        <div class="fs-xs muted mt1">${esc(l.authors)} · ${l.year} · ${esc(l.venue)}</div>
        <div class="row wrap g1 mt2">${l.tags.map(t=>chip(t,{sm:true})).join('')}</div>
        <div class="row between mt3">${l.derived.length?`<span class="chip sel sm">Idea ${l.derived.length}</span>`:`<span class="chip sm" style="color:var(--neutral-500)">未衍生</span>`}
          <button class="btn ghost sm" data-act="derive-idea" data-val="${l.id}">+ 衍生 Idea</button></div>
      </div>`).join('')}</div>`
    : '';
  } else {
    body = `<div class="tw">${listHtml}</div>`;
  }
  const empty = rows.length ? '' : (f.q||f.tags.length||f.derived!=='all'
    ? emptyState('🔍', '没有匹配的文献', `试试更短的关键词，或<button class="link" data-act="lit-reset">清除全部筛选</button>`)
    : emptyState('📚','还没有文献','把 PDF 拖进来，或让 agent 帮你批量导入。',
        `<button class="btn primary" data-act="import-lit">导入文献</button>`));
  return `${toolbar}<div class="view-inner row g4" style="padding:var(--sp-4) var(--sp-6)">
      ${isMobile()?'':side}
      <div class="grow" style="min-width:0">${body}${empty}</div>
    </div>
    <style>.li:hover [data-row-actions]{opacity:1!important}.li:hover [data-hover-accent]{color:var(--accent-700);text-decoration:underline}</style>`;
}

/* ══════════════════════════════════════════════════════════════════════════
 * 视图：Idea 分支树（画布 ≥1024 / 缩进树 <1024）
 * ════════════════════════════════════════════════════════════════════════*/
function ideaMetrics(iid){
  const exps = expsOfIdea(iid);
  const mk = topMetricKey(exps);
  const val = mk ? aggregate(exps.map(e=>(e.metrics||{})[mk]), defaultAgg(mk)) : null;
  return { mk, val, n:exps.length, nv:versionsOfIdea(iid).length };
}
function viewIdeas(){
  const mobile = isMobile();
  const filterOn = state.ideaStatus || ['active','validated','abandoned'];
  const visible = id => filterOn.includes(ideaById(id).status);
  if (mobile || (!isDesktopWide())) return viewIdeaList(visible);
  return `<div class="view flush" style="height:100%;display:flex;flex-direction:column">
    <div class="canvas" id="canvas">
      <div class="canvas-inner" id="canvasInner"></div>
    </div>
    <div style="position:absolute;right:16px;top:${56+32+12}px;display:flex;gap:var(--sp-2);align-items:center">
      <div class="card" style="padding:4px;display:flex;gap:2px;align-items:center;box-shadow:var(--shadow-md)">
        <button class="btn ghost icon sm" data-act="zoom" data-val="out" title="缩小">⊖</button>
        <span class="fs-xs muted mono" id="zoomLabel" style="width:34px;text-align:center">100%</span>
        <button class="btn ghost icon sm" data-act="zoom" data-val="in" title="放大">⊕</button>
        <span class="hr" style="width:1px;height:18px;background:var(--border)"></span>
        <button class="btn ghost icon sm" data-act="zoom" data-val="fit" title="适应画布">⤢</button>
        <span class="hr" style="width:1px;height:18px;background:var(--border)"></span>
        <button class="btn ghost sm" data-act="idea-filter">状态筛选 ▾</button>
        <button class="btn ghost sm" data-act="new-idea">＋ 新建 Idea</button>
      </div>
    </div>
    <div style="position:absolute;left:16px;bottom:16px" class="row g2">
      <span class="badge neutral">单击选中 · 双击折叠/展开 · 滚轮缩放 · 空白处拖拽平移</span>
    </div>
  </div>`;
}
function isDesktopWide(){ return !isMobile() && window.innerWidth >= 1024; }
function viewIdeaList(visible){
  const rows = [];
  const walk = (id, depth) => {
    const i = ideaById(id); if(!i) return;
    if (visible(id)){
      const m = ideaMetrics(i.id);
      const kids = childIdeas(i.id);
      rows.push(`<div class="li" data-act="open-idea" data-val="${i.id}" style="padding-left:${12+depth*20}px">
        <span class="st" style="${statusBarStyle(i.status)}"></span>
        ${kids.length?`<span class="caret">▾</span>`:`<span class="caret dim">·</span>`}
        <span class="nm trunc ${i.status==='abandoned'?'':''}">${esc(i.name)}</span>
        <span class="row g1 ml2">${i.status==='validated'?'<span class="chip ok sm">已验证</span>':''}${i.status==='abandoned'?'<span class="chip sm">已放弃</span>':''}</span>
        <span class="mt"><span class="mono">${m.nv}</span> 版本 · <span class="mono">${m.n}</span> 实验${m.mk?` · 最佳 <span class="mono">${esc(m.mk)}</span> <span class="mono">${esc(sig(m.val))}</span>`:''}</span>
      </div>`);
    }
    childIdeas(i.id).forEach(c=>walk(c.id, depth+1));
  };
  IDEAS.filter(i=>!i.parent).forEach(i=>walk(i.id,0));
  return `<div class="mstack" style="max-width:900px">
    <div class="row between"><div class="fs-sm muted">共 ${IDEAS.length} 个 Idea · 分支按创建顺序排列</div>
      <button class="btn primary sm" data-act="new-idea">＋ 新建 Idea</button></div>
    <div class="card" style="padding:0"><div class="tlist">${rows.join('')}</div></div>
  </div>`;
}
function statusBarStyle(st){
  return st==='validated' ? 'background:var(--success-500)' : st==='abandoned' ? 'background:var(--neutral-300)' : 'background:var(--accent-600)';
}
/** 画布布局：横向树（左→右），支持折叠 */
function descendantCount(id){
  const kids = childIdeas(id);
  return kids.reduce((n,k)=>n+1+descendantCount(k.id), 0);
}
function layoutTree(){
  const NW=200, NH=72, GX=140, GY=88;
  const nodes = []; const links = [];
  const collapsed = state.collapsed || new Set();
  let yCursor = 0;
  const place = (id, depth) => {
    const kids = childIdeas(id);
    const m = ideaMetrics(id);
    const isCollapsed = collapsed.has(id) && kids.length;
    let y;
    if (!kids.length || isCollapsed){ y = yCursor; yCursor += NH + GY; }
    else {
      const ys = kids.map(k=>place(k.id, depth+1));
      y = (Math.min.apply(null,ys) + Math.max.apply(null,ys)) / 2;
    }
    nodes.push({ id, depth, x: depth*(NW+GX), y, m, idea:ideaById(id),
      collapsed:isCollapsed, hidden: isCollapsed ? descendantCount(id) : 0 });
    if (!isCollapsed) kids.forEach(k=>links.push({from:id, to:k.id}));
    return y;
  };
  IDEAS.filter(i=>!i.parent).forEach(i=>{ place(i.id,0); yCursor += 24; });
  return { nodes, links, NW, NH };
}

/* ══════════════════════════════════════════════════════════════════════════
 * 视图：Idea 详情
 * ════════════════════════════════════════════════════════════════════════*/
function viewIdea(){
  const i = ideaById(state.ideaId); if(!i) return errState('Idea 不存在');
  const tab = state.query.tab || 'versions';
  const vs = versionsOfIdea(i.id);
  const exps = expsOfIdea(i.id);
  const mk = topMetricKey(exps);
  const families = vs.map(v=>({v, rows:expsOfVersion(v.id)}));
  const analyses = ANALYSES.filter(a=>exps.some(e=>e.id===a.expId)).sort((a,b)=>b.ts.localeCompare(a.ts));
  const kids = childIdeas(i.id);
  const head = `<div class="row g3 ac mb4 wrap">
      <div class="grow">
        <div class="row g2 ac">
          <span class="fs-lg">${esc(i.name)}</span>
          <span class="chip ${i.status==='validated'?'ok':i.status==='abandoned'?'':'info'} sm">${i.status==='active'?'活跃':i.status==='validated'?'已验证':'已放弃'}</span>
        </div>
        <div class="fs-sm muted mt1">${esc(i.hypothesis)}</div>
      </div>
      ${seg([{v:'versions',t:'版本与实验'},{v:'analysis',t:'分析 ('+analyses.length+')'}], tab, 'set-ideatab')}
      <button class="btn" data-act="matrix-of-idea">矩阵视图</button>
    </div>`;
  let body = '';
  if (tab==='analysis'){
    body = analyses.length ? `<div class="mstack" style="max-width:760px">` + analyses.map(a=>{
      const e = expById(a.expId);
      return `<div class="card pad">${analysisCardInner(a,e)}</div>`;
    }).join('') + `</div>`
    : emptyState('✎','这个 Idea 下还没有分析','实验完成后，agent 会把复盘写回这里。',
       `<button class="btn" data-act="nav" data-val="experiments">去看看实验</button>`);
  } else {
    body = `<div class="row g4 wrap">
      <div class="grow" style="min-width:0">
        ${vs.length? vs.map(v=>{
          const rows = expsOfVersion(v.id);
          const mkv = topMetricKey(rows);
          const best = mkv? aggregate(rows.map(r=>(r.metrics||{})[mkv]), defaultAgg(mkv)) : null;
          const counts = countStatus(rows);
          const cl = clusterFamilies(rows, state.famDims[v.id]);
          return `<div class="card mb3" style="padding:0;position:relative;overflow:hidden">
            <div class="row g3 ac" style="padding:var(--sp-3) var(--sp-4)">
              <div style="width:3px;align-self:stretch;background:${statusColorOf(counts)};margin:-12px 0;border-radius:2px"></div>
              <button class="btn ghost" data-act="open-version" data-val="${v.id}" style="padding:0;height:auto">
                <span class="mono" style="font-size:var(--fs-md);font-weight:600;color:var(--neutral-800)">${esc(v.name)}</span>
              </button>
              <span class="fs-xs muted mono">${esc(v.git)}</span>
              <span class="fs-xs muted">${esc(v.note||'')}</span>
              ${v.archived?'<span class="badge neutral">已归档</span>':''}
              <span class="grow"></span>
              <span class="fs-xs muted">${esc(v.createdAt)} · <span class="mono">${rows.length}</span> 实验</span>
            </div>
            <div style="padding:0 var(--sp-4) var(--sp-3)">
              <div class="row g3 wrap fs-xs muted">
                ${mkv?`<span>最佳 <span class="mono">${esc(mkv)}</span> <span class="mono strong" style="color:var(--neutral-800)">${esc(sig(best))}</span></span>`:''}
                <span>状态构成 ${miniBar(counts, rows.length)}</span>
                <span class="row g1">${cl.dims.length?`<span>差异维度</span>${cl.dims.slice(0,3).map(d=>`<span class="chip mono sm">${esc(d)}</span>`).join('')}`:'<span>单一配置组</span>'}</span>
              </div>
              <div class="row g2 mt3">
                <button class="btn sm" data-act="open-version" data-val="${v.id}">实验表</button>
                <button class="btn sm" data-act="open-matrix" data-val="${v.id}">矩阵</button>
                <button class="btn sm" data-act="open-diff" data-val="${v.id}">参数对比</button>
                <button class="btn sm" data-act="open-chart" data-val="${v.id}">图表</button>
              </div>
            </div>
          </div>`;}).join('')
        : emptyState('🔖','这个 Idea 还没有版本','版本对应一次 git 提交 —— 本地提交后由 agent 回收，或手动创建。',
            `<button class="btn primary" data-act="new-version" data-val="${i.id}">创建 Version</button>`)}
      </div>
      <div style="width:300px;flex:none">
        <div class="card pad mb3">
          <div class="fs-xs muted mb2" style="letter-spacing:.06em">分支概览</div>
          <div class="row g3 wrap">
            ${statBox('版本', vs.length)}${statBox('实验', exps.length)}
            ${mk?statBox('最佳 '+mk, sig(aggregate(exps.map(e=>(e.metrics||{})[mk]), defaultAgg(mk)))):''}
            ${statBox('子 Idea', kids.length)}
          </div>
        </div>
        <div class="card pad mb3">
          <div class="row between mb2"><div class="fs-xs muted" style="letter-spacing:.06em">关联文献</div>
            <button class="btn ghost sm" data-act="add-lit" data-val="${i.id}">+ 添加</button></div>
          <div class="row wrap g1">${i.lit.map(lid=>{
            const l = LITERATURE.find(x=>x.id===lid); if(!l) return '';
            return chip(l.title.slice(0,28)+'…', {x:true, xAct:'unlink-lit', xVal:i.id+'|'+lid});
          }).join('')}</div>
        </div>
        <div class="card pad">
          <div class="fs-xs muted mb2" style="letter-spacing:.06em">子分支</div>
          ${kids.length? kids.map(k=>`<button class="btn ghost sm mb2" style="width:100%;justify-content:flex-start" data-act="open-idea" data-val="${k.id}">
            <span style="width:3px;height:14px;border-radius:2px;${statusBarStyle(k.status)}"></span>${esc(k.name)}</button>`).join('')
          : `<div class="fs-sm muted">还没有分叉 —— 点右上角「新建 Idea」</div>`}
        </div>
      </div>
    </div>`;
  }
  return head + body;
}
function statBox(label, val){
  return `<div style="min-width:88px"><div class="fs-xs muted">${esc(label)}</div>
    <div class="mono" style="font-size:var(--fs-lg);font-weight:600;color:var(--neutral-900);line-height:1.3">${esc(String(val))}</div></div>`;
}
function countStatus(rows){
  const c = {pending:0,running:0,done:0,failed:0,missing:0};
  rows.forEach(r=>c[effStatus(r)]++);
  return c;
}
function statusColorOf(c){
  if (c.failed) return 'var(--danger-500)';
  if (c.running) return 'var(--accent-600)';
  if (c.missing) return 'var(--warning-500)';
  if (c.done) return 'var(--success-500)';
  return 'var(--neutral-300)';
}
function miniBar(c, total){
  const segs = [['done','var(--success-500)'],['running','var(--accent-500)'],['failed','var(--danger-500)'],['missing','var(--warning-500)'],['pending','var(--neutral-300)']];
  if (!total) return '';
  return `<span class="sbar" style="width:56px;display:inline-flex;vertical-align:middle">${segs.map(([k,col])=>
    c[k]?`<i style="width:${c[k]/total*100}%;background:${col}"></i>`:'').join('')}</span>`;
}
function analysisCardInner(a, e, opts){
  const o = opts||{};
  return `<div class="row g2 ac">
      ${srcBadge(a)}
      <span class="fs-xs muted">${esc(a.author)} · ${esc(fmtTime(a.ts))}</span>
      ${a.edited?'<span class="badge neutral">已由你修改</span>':''}
      ${a.unread&&!state.readAn.has(a.id)?'<span class="badge accent">NEW</span>':''}
      <span class="grow"></span>
      <button class="btn ghost icon sm" data-act="an-more" data-val="${a.id}">⋯</button>
    </div>
    <div class="fs-base mt3" style="line-height:1.7;color:var(--neutral-700)">${renderMd(a.md, e)}</div>
    <div class="row g2 mt3">
      <button class="btn sm ${state.adopted[a.id]!==undefined?(state.adopted[a.id]?'ok':'') : (a.adopted?'ok':'')}" data-act="adopt-an" data-val="${a.id}">
        ${(state.adopted[a.id]!==undefined?state.adopted[a.id]:a.adopted)?'✓ 已采纳':'已采纳'}</button>
      <button class="btn sm" data-act="reanalyze" data-val="${a.expId}">让 agent 重新分析</button>
      ${o.noJump?'':`<button class="btn ghost sm" data-act="open-exp" data-val="${a.expId}">跳转到实验</button>`}
    </div>`;
}

/* ══════════════════════════════════════════════════════════════════════════
 * 视图：Agent 收件箱
 * ════════════════════════════════════════════════════════════════════════*/
function viewInbox(){
  const tab = state.query.tab || 'proposals';
  const pend = pendingProposals();
  const unread = unreadAnalyses().sort((a,b)=>b.ts.localeCompare(a.ts));
  const head = `<div class="row g3 ac mb4 wrap">
      <div class="grow"><div class="fs-lg">Agent 收件箱</div></div>
      ${seg([{v:'proposals',t:'待批准提议 ('+pend.length+')'},{v:'analysis',t:'未读分析 ('+unread.length+')'}], tab, 'set-inboxtab')}
    </div>
    <div class="banner neutral mb4" style="align-items:flex-start">
      <span>🔒</span><span>Agent 可以 <b>创建实验记录、写入分析、提出提议</b>；<b>不会</b> 执行代码、删除数据或修改已有实验结果。所有 agent 写入都带 🤖 来源徽章。</span>
    </div>`;
  let body = '';
  if (tab==='proposals'){
    body = pend.length ? `<div class="row g2 mb3"><button class="btn sm" data-act="approve-sel">批准选中的 1 条</button>
        <button class="btn sm" data-act="reject-sel">拒绝选中的 1 条</button></div>` +
      pend.map(p=>proposalCard(p)).join('')
      : emptyState('✉','没有待批准的提议','agent 会在需要你拍板时出现这里。提议不会自动执行，任何时候都由你决定。');
  } else {
    body = unread.length ? `<div class="mstack" style="max-width:760px">` + unread.map(a=>{
      const e = expById(a.expId);
      return `<div class="card pad" data-act="read-an" data-val="${a.id}">
        <div class="row g2 ac">${srcBadge(a)}<span class="fs-xs muted">${esc(a.author)} · ${esc(fmtTime(a.ts))}</span>
          <span class="badge accent">NEW</span></div>
        <div class="fs-xs muted mt2">${esc((ideaById(e.ideaId)||{}).name)} / ${esc((versionById(e.versionId)||{}).name)} / ${esc(e.id)}</div>
        <div class="fs-base mt2 clamp3" style="line-height:1.7">${renderMd(a.md, e)}</div>
        <div class="row g2 mt3"><button class="btn sm" data-act="open-exp" data-val="${a.expId}">跳转到实验</button>
          <button class="btn ghost sm" data-act="read-an" data-val="${a.id}">标记已读</button></div>
      </div>`;}).join('') + `</div>`
      : emptyState('✓','没有未读分析','agent 写回的复盘都会先落在这里，等你过目。');
  }
  return head + body;
}
function proposalCard(p){
  const v = versionById(p.targetVersion);
  const st = state.proposalState[p.id] || p.status;
  const base = expById(p.baseExp);
  return `<div class="card mb3" style="padding:0;overflow:hidden;${st==='rejected'?'opacity:.55':''}${st==='approved'?'border-color:var(--success-500)':''}">
    <div style="width:3px;background:${st==='approved'?'var(--success-500)':st==='rejected'?'var(--neutral-300)':'var(--accent-600)'};position:absolute;left:0;top:0;bottom:0"></div>
    <div style="padding:var(--sp-4) var(--sp-4) var(--sp-3) var(--sp-5)">
      <div class="row g2 ac">
        <span class="src agent">🤖 Agent 自动</span>
        <span class="fs-xs muted">${esc(p.ts)} · 基于 <span class="mono">${esc(p.baseExp)}</span></span>
        ${p.confidence?`<span class="chip sm">置信度 <span class="mono">${p.confidence}</span></span>`:''}
        ${st==='approved'?'<span class="chip ok sm">已批准</span>':''}
        ${st==='rejected'?'<span class="chip sm">已拒绝</span>':''}
        <span class="grow"></span>
        <span class="ck" data-act="pick-prop" data-val="${p.id}"></span>
      </div>
      <div class="fs-md mt3" style="font-weight:600;color:var(--neutral-800)">建议：${esc(p.title)}</div>
      <div class="fs-xs muted mt2" style="letter-spacing:.06em">理由</div>
      <div class="fs-base mt1" style="line-height:1.7">${renderMd(p.reason, base)}</div>
      <div class="fs-xs muted mt3" style="letter-spacing:.06em">拟创建的实验参数</div>
      <div class="mt2" style="border:1px solid var(--border);border-radius:var(--r-md);overflow:hidden">
        <table class="dt" style="width:100%">
          ${p.diff.map(d=>`<tr class="chg">
            <td class="k" style="width:36%">${esc(d.k)}</td>
            <td style="width:28%"><span class="old">${esc(fmtNum(d.from))}</span></td>
            <td class="b" style="width:28%">${esc(fmtNum(d.to))}</td>
            <td class="d" style="width:8%">${deltaSpan(d.from,d.to,d.k,'param')}</td></tr>`).join('')}
          <tr><td colspan="4" style="font-family:var(--font-sans);font-size:var(--fs-xs);color:var(--neutral-500);background:var(--neutral-50)">
            其余 ${p.sameCount} 项与 <span class="mono">${esc(p.baseExp)}</span> 相同</td></tr>
        </table>
      </div>
      <div class="fs-xs muted mt3">目标版本：<span class="mono">${esc(v?v.name:'')} ${esc(v?v.git:'')}</span> · 预计运行 ${esc(p.eta)}</div>
      ${st==='pending'?`<div class="row g2 mt4">
        <button class="btn primary" data-act="approve" data-val="${p.id}">批准并创建</button>
        <button class="btn" data-act="modify-prop" data-val="${p.id}">修改参数</button>
        <button class="btn ghost" data-act="reject" data-val="${p.id}">拒绝</button>
      </div>`:`<div class="row g2 mt4"><button class="btn ghost sm" data-act="copy-cmd">复制运行命令</button></div>`}
    </div>
  </div>`;
}
