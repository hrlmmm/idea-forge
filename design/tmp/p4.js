
/* ══════════════════════════════════════════════════════════════════════════
 * 视图：Version（表格 / 矩阵 / 对比 / 图表）
 * ════════════════════════════════════════════════════════════════════════*/
const STICKY_CSS = `<style>
.sl1{position:sticky;left:0;z-index:2;background:var(--neutral-0);border-right:1px solid var(--border-subtle)}
.sl2{position:sticky;left:104px;z-index:2;background:var(--neutral-0);border-right:1px solid var(--border-subtle)}
thead .sl1,thead .sl2{z-index:4;background:var(--neutral-50)}
tbody tr:hover .sl1,tbody tr:hover .sl2{background:var(--neutral-50)}
tbody tr.selrow .sl1,tbody tr.selrow .sl2{background:var(--accent-50)}
tbody tr.arch .sl1,tbody tr.arch .sl2{background:var(--neutral-0)}
.cellbar{position:absolute;left:0;top:0;bottom:0;width:3px}
</style>`;

function viewVersion(){
  const v = versionById(state.versionId); if(!v) return errState('Version 不存在');
  const i = ideaById(v.ideaId);
  const view = state.query.view || 'table';
  const rows = expsOfVersion(v.id);
  const head = `<div class="row g3 ac mb3 wrap">
      <div class="grow">
        <div class="row g2 ac">
          <span class="mono" style="font-size:var(--fs-lg);font-weight:600;color:var(--neutral-800)">${esc(v.name)}</span>
          <span class="fs-xs muted mono">${esc(v.git)}</span>
          ${v.archived?'<span class="badge neutral">已归档</span>':''}
        </div>
        <div class="fs-sm muted mt1">${esc(v.note||'')} · 创建于 ${esc(v.createdAt)} · <span class="mono">${rows.length}</span> 次实验</div>
      </div>
      ${seg([{v:'table',t:'表格'},{v:'matrix',t:'矩阵'},{v:'diff',t:'对比'},{v:'chart',t:'图表'}], view, 'set-view', 'lg')}
    </div>`;
  let body = '';
  if (view==='table') body = versionTable(v, rows);
  else if (view==='matrix') body = viewMatrix(v);
  else if (view==='diff') body = viewDiff(v);
  else body = viewChart(v);
  return STICKY_CSS + head + body;
}

/* ---------- 筛选条件（键/运算符/值，全部运行时生成） ---------- */
const OPS = [['=','='],['≠','!='],['>','>'],['<','<'],['≥','>='],['≤','<='],['包含','has']];
function matchConds(e){
  return (state.mtx.conds||[]).every(c=>{
    const o = Object.assign({}, e.params, e.metrics);
    if (!(c.key in o)) return false;
    const val = o[c.key];
    if (c.op==='has') return String(val).toLowerCase().includes(String(c.val).toLowerCase());
    if (isNum(val) && isNum(parseFloat(c.val))){
      const n = parseFloat(c.val);
      switch(c.op){ case '=':return val===n; case '!=':return val!==n; case '>':return val>n;
        case '<':return val<n; case '>=':return val>=n; case '<=':return val<=n; }
    }
    switch(c.op){ case '=':return String(val)===String(c.val); case '!=':return String(val)!==String(c.val);
      case '>':return String(val)>String(c.val); case '<':return String(val)<String(c.val);
      case '>=':return String(val)>=String(c.val); case '<=':return String(val)<=String(c.val); }
    return true;
  });
}
function filterRows(rows){
  return rows.filter(e=>{
    if (state.mtx.status && state.mtx.status!=='all' && e.status!==state.mtx.status) return false;
    return matchConds(e);
  });
}
function condBar(rows){
  const conds = state.mtx.conds||[];
  const pk = keyUnion(rows,'params'), mk = keyUnion(rows,'metrics');
  return `<div class="row g2 wrap">
      <button class="btn sm" data-act="add-cond">+ 加条件${conds.length?' ('+conds.length+')':''}</button>
      ${conds.map((c,ci)=>chip(`${c.key} ${c.op} ${c.val}`, {mono:true, x:true, xAct:'del-cond', xVal:String(ci), sm:true})).join('')}
      ${conds.length?`<button class="btn ghost sm" data-act="clear-cond">清除</button>`:''}
      <span class="grow"></span>
      <span class="fs-xs muted" style="align-self:center">可选键：<span class="mono">${pk.length}</span> params · <span class="mono">${mk.length}</span> metrics</span>
    </div>`;
}

/* ---------- 表格视图 ---------- */
function versionTable(v, rowsAll){
  const rows = filterRows(rowsAll);
  const vs = versionsOfIdea(v.ideaId);
  const scope = state.tableScope || 'version';
  const pool = scope==='idea' ? expsOfIdea(v.ideaId) : rowsAll;
  const pKeys = keyUnion(pool,'params').map(x=>x.key);
  const mKeys = keyUnion(pool,'metrics').map(x=>x.key);
  const varyOnly = state.onlyDiffCols!==false;
  const dims = pKeys.filter(k=>!RE_REPEAT.test(k) && cardinality(pool,'params',k)>1);
  const showP = varyOnly ? pKeys.filter(k=>dims.includes(k) || RE_REPEAT.test(k) || cardinality(pool,'params',k)===1 && false) : pKeys;
  const cols = (varyOnly ? dims.concat(pKeys.filter(RE_REPEAT.test.bind(RE_REPEAT))) : pKeys);
  const sort = state.sort || {key:'_order', dir:1};
  const sorted = rows.slice().sort((a,b)=>{
    const av = sort.key==='_order'?a._order : (sort.key==='status'? effStatus(a) : (Object.assign({},a.params,a.metrics))[sort.key]);
    const bv = sort.key==='_order'?b._order : (sort.key==='status'? effStatus(b) : (Object.assign({},b.params,b.metrics))[sort.key]);
    if (isNum(av)&&isNum(bv)) return (av-bv)*sort.dir;
    return String(av==null?'':av).localeCompare(String(bv==null?'':bv))*sort.dir;
  });
  const selCount = state.sel.size;
  return `<div class="toolbar wrap2" style="position:sticky;top:0;z-index:9;background:var(--neutral-0);border:1px solid var(--border);border-radius:var(--r-lg) var(--r-lg) 0 0">
      ${seg([{v:'version',t:'本版本'},{v:'idea',t:'本 Idea 全部版本'}], scope, 'set-scope')}
      <button class="btn sm" data-act="toggle-cols">${varyOnly?'显示全部参数键 ('+pKeys.length+')':'仅显示差异维度 ('+dims.length+')'}</button>
      <select class="sel" data-act="set-status-sel">
        <option value="all">状态：全部</option><option value="pending">待运行</option>
        <option value="running">运行中</option><option value="done">完成</option><option value="failed">失败</option></select>
      <span class="grow"></span>
      <span class="fs-xs muted">${rows.length} / ${rowsAll.length} 行 · 列由 ${pool.length} 条实验的键并集生成</span>
    </div>
    <div style="padding:var(--sp-2) var(--sp-4);background:var(--neutral-0);border:1px solid var(--border);border-top:0">
      ${condBar(rowsAll)}
    </div>
    <div class="tw" style="border-radius:0 0 var(--r-lg) var(--r-lg)">
      <table class="t">
        <thead><tr>
          <th style="width:36px" class="sl1"><span class="ck ${selCount===rows.length&&rows.length?'on':selCount?'mid':''}" data-act="sel-all"></span></th>
          <th class="sl2 sortable" data-act="sort" data-val="_order" style="width:104px">实验 <span class="arrow">${sort.key==='_order'?(sort.dir>0?'↑':'↓'):''}</span></th>
          <th class="sortable" data-act="sort" data-val="status" style="width:88px">状态 <span class="arrow">${sort.key==='status'?(sort.dir>0?'↑':'↓'):''}</span></th>
          ${cols.map(k=>`<th class="num sortable mono" data-act="sort" data-val="${esc(k)}" title="${esc(k)}">${esc(k)} <span class="arrow">${sort.key===k?(sort.dir>0?'↑':'↓'):''}</span></th>`).join('')}
          ${mKeys.map(k=>`<th class="num sortable mono" data-act="sort" data-val="${esc(k)}" title="${esc(k)}">${esc(k)} <span class="arrow">${sort.key===k?(sort.dir>0?'↑':'↓'):''}</span></th>`).join('')}
          <th class="sortable" data-act="sort" data-val="createdAt">创建时间 <span class="arrow">${sort.key==='createdAt'?(sort.dir>0?'↑':'↓'):''}</span></th>
        </tr></thead>
        <tbody>
        ${sorted.map(e=>{
          const o = Object.assign({}, e.params, e.metrics);
          const on = state.sel.has(e.id);
          return `<tr class="${on?'selrow':''}" data-act="open-exp" data-val="${e.id}" style="cursor:pointer;position:relative">
            <td class="sl1"><span class="ck ${on?'on':''}" data-act="sel" data-val="${e.id}"></span></td>
            <td class="sl2 mono">${esc(e.id)}${e._today?' <span class="badge accent">NEW</span>':''}</td>
            <td>${statusBadge(e)}</td>
            ${cols.map(k=>`<td class="num mono">${k in (e.params||{})?esc(fmtNum(e.params[k])):'<span class="dim">—</span>'}</td>`).join('')}
            ${mKeys.map(k=>`<td class="num mono" ${!(k in (e.metrics||{}))?'class="num mono missing" title="该实验未回收此指标"':''}>${k in (e.metrics||{})?esc(fmtNum(e.metrics[k])):'<span class="dim">—</span>'}</td>`).join('')}
            <td class="fs-xs muted nowrap">${esc(fmtTime(e.createdAt))}</td>
          </tr>`;}).join('')}
        </tbody>
      </table>
      ${rows.length?'':`<div style="padding:var(--sp-6)">${emptyState('🔍','没有符合条件的实验','调整筛选条件或状态过滤。',`<button class="btn sm" data-act="clear-cond">清除筛选</button>`)}</div>`}
    </div>
    ${selCount?`<div class="fab-bar"><span>已选 ${selCount} 个</span>
      <button class="btn sm" data-act="do-diff">对比选中的 ${Math.min(selCount,2)} 个</button>
      ${selCount>2?'<span class="fs-xs" style="opacity:.7">对比一次支持 2 个，将只取前 2 个</span>':''}
      <button class="btn ghost sm" style="color:#fff" data-act="clear-sel">清空选择</button></div>`:''}`;
}

/* ---------- 矩阵视图（核心） ---------- */
function bucketOf(e, bucket){
  if (bucket==='batch') return e.batch || '—';
  const d = dOf(e.createdAt);
  if (bucket==='day') return dateOnly(d);
  if (bucket==='month') return dateOnly(d).slice(0,7);
  const dow = (d.getDay()+6)%7;
  d.setDate(d.getDate()-dow);
  return dateOnly(d);
}
function computeMatrix(versions, bucket){
  const all = [];
  versions.forEach(v=>expsOfVersion(v.id).forEach(e=>{ if (filterRows([e]).length) all.push(e); }));
  const colKeys = Array.from(new Set(all.map(e=>bucketOf(e,bucket)))).sort();
  const cells = new Map();
  all.forEach(e=>{
    const k = versionIdOf(e)+'|'+bucketOf(e,bucket);
    if(!cells.has(k)) cells.set(k, []);
    cells.get(k).push(e);
  });
  return { all, colKeys, cells, get:(v,c)=>cells.get(v+'|'+c)||[] };
}
function versionIdOf(e){ return e.versionId; }
function viewMatrix(v, opts){
  const o = opts||{};
  const scope = state.mtx.scope || 'idea';
  const versions = o.versions || (scope==='idea' ? versionsOfIdea(v.ideaId) : [v]);
  const showIdea = !!o.showIdea;
  const pool = [];
  versions.forEach(ver=>expsOfVersion(ver.id).forEach(e=>pool.push(e)));
  const mKeys = metricKeys(pool);
  if (!mKeys.length) return emptyState('▦','还没有可回收的指标','实验完成后由 agent 回收结果文件，指标才会出现在这里。');
  const metric = (mKeys.includes(state.mtx.metric) ? state.mtx.metric : mKeys[0]);
  const agg = state.mtx.agg==='auto' ? defaultAgg(metric) : state.mtx.agg;
  const bucket = state.mtx.bucket || 'week';
  const { all, colKeys, get } = computeMatrix(versions, bucket);
  // 计算每格聚合值
  const vals = [];
  const cellVal = new Map();
  colKeys.forEach(c=>versions.forEach(ver=>{
    const exps = get(ver.id, c);
    if (!exps.length) return;
    const x = aggregate(exps.map(e=>(e.metrics||{})[metric]), agg);
    if (isNum(x)){ vals.push(x); cellVal.set(ver.id+'|'+c, x); }
    else if (exps.length) cellVal.set(ver.id+'|'+c, null);
  }));
  const logVals = state.mtx.norm==='log' ? vals.map(x=>Math.log10(Math.max(1e-9,x))) : vals;
  const globalScale = quantileScale(logVals, 5);
  const rowScales = new Map();
  versions.forEach(ver=>{
    const vs = colKeys.map(c=>cellVal.get(ver.id+'|'+c)).filter(isNum);
    rowScales.set(ver.id, quantileScale(state.mtx.norm==='log'? vs.map(x=>Math.log10(Math.max(1e-9,x))) : vs, 5));
  });
  const scaleFor = vid => state.mtx.norm==='row' ? rowScales.get(vid) : globalScale;
  const thisWeek = bucket==='batch' ? null : bucketOf({createdAt:TODAY+'T09:00',batch:'—'}, bucket);

  const metricSel = `<select class="sel" data-act="set-metric" style="width:210px">
      ${mKeys.map(k=>`<option value="${esc(k)}"${k===metric?' selected':''}>${esc(k)} ×${keyUnion(pool,'metrics').find(x=>x.key===k).count}</option>`).join('')}
    </select>`;
  const aggSel = `<select class="sel" data-act="set-agg" style="width:96px">
      ${[['auto','自动'],['max','最大值'],['min','最小值'],['median','中位数'],['mean','均值'],['count','计数']]
        .map(([v2,t])=>`<option value="${v2}"${agg===(v2==='auto'?agg:v2)||state.mtx.agg===v2?' selected':''}>${t}</option>`).join('')}
    </select>`;
  const normSel = `<select class="sel" data-act="set-norm" style="width:96px">
      ${[['global','全局'],['row','行内'],['log','对数']].map(([v2,t])=>`<option value="${v2}"${state.mtx.norm===v2?' selected':''}>${t}</option>`).join('')}
    </select>`;
  const bucketSel = `<select class="sel" data-act="set-bucket" style="width:110px">
      ${[['day','按天'],['week','按周'],['month','按月'],['batch','按 batch 标签']].map(([v2,t])=>`<option value="${v2}"${bucket===v2?' selected':''}>${t}</option>`).join('')}
    </select>`;
  const legend = globalScale ? `<div class="legend">
      <span class="mono">${esc(sig(state.mtx.norm==='log'?Math.pow(10,globalScale.min):globalScale.min))}</span>
      <span class="bar"></span>
      <span class="mono">${esc(sig(state.mtx.norm==='log'?Math.pow(10,globalScale.max):globalScale.max))}</span>
      <span class="sw missing" style="margin-left:6px"></span><span>缺失</span></div>` : '';

  const noData = !vals.length;
  return `<div class="toolbar wrap2" style="position:sticky;top:0;z-index:9;background:var(--neutral-0);border:1px solid var(--border);border-radius:var(--r-lg) var(--r-lg) 0 0">
      ${metricSel}${aggSel}${normSel}${bucketSel}
      ${o.versions?'':seg([{v:'idea',t:'本 Idea 全部版本'},{v:'version',t:'仅本版本'}], scope, 'set-mxscope')}
      <span class="grow"></span>${legend}
    </div>
    <div style="padding:var(--sp-2) var(--sp-4);background:var(--neutral-0);border:1px solid var(--border);border-top:0">
      ${condBar(pool)}
    </div>
    ${noData?`<div class="banner warn mt3"><span>⚠</span><span>指标「<span class="mono">${esc(metric)}</span>」在当前筛选下没有数据，换一个指标或清除筛选。</span>
      <button class="btn sm" data-act="cycle-metric">切换指标</button></div>`:''}
    <div class="mx-wrap" style="border-radius:0 0 var(--r-lg) var(--r-lg);border-top:0">
      <table class="mx">
        <thead><tr>
          <th class="rh" style="min-width:168px">版本 <span class="fs-xs muted">/ ${bucket==='batch'?'batch':bucket==='month'?'月':bucket==='week'?'周':'日'}</span></th>
          ${colKeys.map(c=>`<th class="${c===thisWeek?'cur':''}" style="min-width:88px">
            <div class="mono" style="font-size:var(--fs-sm);font-weight:600;color:var(--neutral-700)">${esc(c)}</div>
            <div class="fs-xs muted">${versions.reduce((n,ver)=>n+get(ver.id,c).length,0)} 次</div></th>`).join('')}
        </tr></thead>
        <tbody>
        ${versions.map(ver=>{
          const rowsEx = expsOfVersion(ver.id);
          const bestV = bestOf(rowsEx, metric, state.directions[metric]);
          const cnt = countStatus(rowsEx);
          return `<tr class="${ver.archived?'arch':''}">
            <th class="rh">
              <div class="row g2 ac">
                <span style="width:3px;height:22px;border-radius:2px;background:${statusColorOf(cnt)}"></span>
                <span class="mono" style="font-weight:600;color:var(--neutral-800)">${esc(ver.name)}</span>
                ${ver.id===v.id?'<span class="badge accent" style="height:16px">当前</span>':''}
              </div>
              <div class="fs-xs muted" style="margin-left:7px">${esc(ver.git)} · ${rowsEx.length} 实验${bestV!==null?' · 最佳 '+esc(sig(bestV)):''}</div>
            </th>
            ${colKeys.map(c=>{
              const exps = get(ver.id, c);
              if (!exps.length) return `<td class="mx-cell empty"><span class="no">·</span></td>`;
              const val = cellVal.get(ver.id+'|'+c);
              const idx = val===undefined||val===null ? -1 : scaleIndex(scaleFor(ver.id), state.mtx.norm==='log'?Math.log10(Math.max(1e-9,val)):val);
              const c2 = countStatus(exps);
              const top5 = exps.slice(0,5).map(e=>e.id).join('、');
              const bestIn = bestOf(exps, metric, state.directions[metric]);
              const tip = `聚合 ${esc(metric)}（${agg}）= ${val===undefined||val===null?'—':sig(val)}\n${top5}${exps.length>5?'\n还有 '+(exps.length-5)+' 个':''}\n最佳 ${sig(bestIn)}\n点击查看该格实验列表 · ⌘+点击 选中两格对比`;
              return `<td class="mx-cell ${idx>=3?'dark':''} ${val===undefined||val===null?'missing':''}"
                style="background:${val===undefined||val===null?'':heatBg(idx)};${val===undefined||val===null?'':'box-shadow:inset 0 0 0 1px rgba(26,29,40,.03)'}"
                data-act="mx-cell" data-v="${ver.id}" data-c="${esc(c)}" data-tip="${esc(tip)}"
                tabindex="0" role="button" aria-label="${esc(ver.name+' '+c+' '+exps.length+' 次实验')}">
                <span class="n">${exps.length}</span>
                <span class="bb">${c2.done?`<span class="ok">${c2.done}</span>`:''}${c2.failed?`<span class="fail">${c2.failed}</span>`:''}${c2.running?'<span class="live-dot" style="width:5px;height:5px"></span>':''}</span>
                <span class="mini"><span class="sbar" style="height:3px">${[['done','var(--success-500)'],['running','var(--accent-500)'],['failed','var(--danger-500)'],['missing','var(--warning-500)'],['pending','var(--neutral-300)']]
                  .map(([k,col])=>c2[k]?`<i style="width:${c2[k]/exps.length*100}%;background:${col}"></i>`:'').join('')}</span></span>
              </td>`;}).join('')}
          </tr>`;}).join('')}
        </tbody>
        <tfoot><tr>
          <th class="rh">合计</th>
          ${colKeys.map(c=>{
            const n = versions.reduce((a,ver)=>a+get(ver.id,c).length,0);
            const vs2 = versions.map(ver=>cellVal.get(ver.id+'|'+c)).filter(isNum);
            const b = vs2.length? aggregate(vs2, agg) : null;
            return `<td>${n?`<span class="mono strong">${n}</span> <span class="fs-xs muted mono">${b!==null?sig(b):''}</span>`:'<span class="dim">—</span>'}</td>`;}).join('')}
        </tr></tfoot>
      </table>
    </div>
    <div class="row g3 mt3 fs-xs muted wrap">
      <span>行头左侧色条 = 该版本实验状态构成</span>
      <span>单元格底部细条 = 状态构成</span>
      <span>右上角标 = 完成数 / 失败数</span>
      <span class="grow"></span>
      <span>共 ${all.length} 次实验压进 ${versions.length} × ${colKeys.length} 格</span>
    </div>`;
}

/* ---------- 对比视图：变体族 + Param Diff ---------- */
function viewDiff(v){
  const rowsAll = expsOfVersion(v.id);
  const rows = filterRows(rowsAll);
  const cl = clusterFamilies(rows, state.famDims[v.id]);
  if (!rows.length) return emptyState('⇄','没有可对比的实验','当前筛选下没有实验。');
  const mk = topMetricKey(rows) || (metricKeys(rows)[0]);
  // A / B 默认值
  const fam0 = cl.families[0];
  const members = fam0 ? fam0.members : rows;
  const best = members.slice().sort((a,b)=>{
    const av=(a.metrics||{})[mk], bv=(b.metrics||{})[mk];
    if(!isNum(av)) return 1; if(!isNum(bv)) return -1;
    return state.directions[mk]===false ? av-bv : bv-av;
  })[0] || members[0];
  const A = expById(state.diff.a) && rows.some(e=>e.id===state.diff.a) ? expById(state.diff.a) : members[0];
  const B = expById(state.diff.b) && rows.some(e=>e.id===state.diff.b) ? expById(state.diff.b) : (best && best.id!==A.id ? best : members[1]||members[0]);
  state.diff.a = A.id; state.diff.b = B.id;

  const famCards = `<div class="mb4">
    <div class="row between mb2"><div class="fs-sm muted">变体族自动聚类 · 差异维度由 ${rows.length} 条实验的键集合推导
      <span class="chip mono sm ml2">repeat 键已排除</span></div>
      <button class="btn ghost sm" data-act="edit-dims" data-val="${v.id}">调整维度</button></div>
    <div class="row wrap g3">
    ${cl.families.map(f=>{
      const fbest = bestOf(f.members, mk, state.directions[mk]);
      const repeatN = f.groups.length ? Math.max.apply(null, f.groups.map(g=>g.members.length)) : 0;
      const title = f.kind==='repeat' ? '重复实验 ×'+f.members.length
        : f.kind==='wide' ? '广域搜索' : '变体族 #'+f.index;
      const sub = f.kind==='repeat' ? '同一配置，只改随机种子'
        : `${f.members.length} 次实验 · ${f.groups.length} 个配置组${repeatN>1?' × '+repeatN+' 次重复':''}`;
      return `<div class="card pad" style="width:300px;${f.kind==='wide'?'border-color:var(--warning-500)':''}">
        <div class="row between">
          <span class="fs-md">${esc(title)}</span>
          ${f.kind==='wide'?`<span class="chip warn sm">${cl.dims.length} 个差异维度</span>`
            :`<span class="chip ${f.kind==='repeat'?'':'info'} sm">${esc(sub)}</span>`}
        </div>
        <div class="row wrap g1 mt2">${cl.dims.length?cl.dims.map(d=>`<span class="chip mono sm">${esc(d)}</span>`).join(''):'<span class="fs-xs muted">无差异维度（同配置重复）</span>'}</div>
        ${f.kind==='wide'?`<div class="fs-xs mt2" style="color:var(--warning-600)">差异维度 ${cl.dims.length} 个 —— 建议用平行坐标查看，或先固定其中几个维度。</div>
          <div class="fs-xs muted mt1">${esc(sub)}</div>`:''}
        <div class="fs-xs muted mt2">最佳 <span class="mono">${esc(mk||'—')}</span> <span class="mono strong" style="color:var(--neutral-800)">${esc(sig(fbest))}</span></div>
        <div class="row g2 mt3">
          <button class="btn sm" data-act="fam-diff" data-val="${f.id}">族内对比</button>
          <button class="btn ghost sm" data-act="fam-expand" data-val="${f.id}">${state.expandedFam===f.id?'收起成员':'展开成员'}</button>
        </div>
        <div class="mt2" style="display:${state.expandedFam===f.id?'block':'none'}">
          ${f.groups.map((g,gi)=>`<div class="fs-xs muted" style="padding:4px 0 2px;border-top:1px solid var(--border-subtle)">
              配置组 ${gi+1}${g.values.length?' · '+g.values.map(v=>esc(fmtNum(v))).join(' / '):''}${g.members.length>1?' · 重复 '+g.members.length+' 次':''}</div>
            ${g.members.map(m=>`<div class="row between fs-xs" style="padding:2px 0 2px 8px">
              <button class="link mono" data-act="open-exp" data-val="${m.id}">${esc(m.id)}</button>
              <span class="mono">${esc(fmtNum((m.metrics||{})[mk]))}</span></div>`).join('')}`).join('')}
        </div>
      </div>`;}).join('')}
    </div></div>`;

  const diffTable = renderDiffTable(A, B, cl);
  return famCards + diffTable;
}
function renderDiffTable(A, B, cl){
  const onlyDiff = state.diff.onlyDiff;
  const allP = keyUnion([A,B],'params').map(x=>x.key).sort();
  const allM = keyUnion([A,B],'metrics').map(x=>x.key).sort();
  const build = (keys, field, kind) => {
    const same = [], chg = [], only = [];
    keys.forEach(k=>{
      const av = (A[field]||{})[k], bv = (B[field]||{})[k];
      const hasA = k in (A[field]||{}), hasB = k in (B[field]||{});
      if (hasA && hasB){
        if (normVal(av)===normVal(bv)) same.push(k);
        else chg.push(k);
      } else only.push({k, side: hasA?'left':'right'});
    });
    const rowChg = k=>{
      const av=(A[field]||{})[k], bv=(B[field]||{})[k];
      return isMobile()
        ? `<tr class="chg"><td colspan="4" style="white-space:normal">
            <div class="mono" style="color:var(--neutral-500)">${esc(k)}</div>
            <div class="mono mt1"><span class="old">${esc(fmtNum(av))}</span> → <b style="color:var(--accent-700)">${esc(fmtNum(bv))}</b>
              <span class="fs-xs muted ml2">${deltaSpan(av,bv,k,kind)}</span></div></td></tr>`
        : `<tr class="chg"><td class="k">${esc(k)}</td>
            <td><span class="old">${esc(fmtNum(av))}</span></td>
            <td class="b">${esc(fmtNum(bv))}</td>
            <td class="d">${deltaSpan(av,bv,k,kind)}</td></tr>`;
    };
    const rowOnly = o=>{
      const val = o.side==='left' ? (A[field]||{})[o.k] : (B[field]||{})[o.k];
      return isMobile()
        ? `<tr class="only"><td colspan="4" style="white-space:normal"><div class="mono" style="color:var(--neutral-500)">${esc(o.k)}</div>
            <div class="mono mt1">${esc(fmtNum(val))} <span class="badge neutral" style="margin-left:4px">仅${o.side==='left'?'左':'右'}侧</span></div></td></tr>`
        : `<tr class="only"><td class="k">${esc(o.k)}</td>
            <td>${o.side==='left'?esc(fmtNum(val)):'<span class="dim">—</span>'}</td>
            <td>${o.side==='right'?esc(fmtNum(val)):'<span class="dim">—</span>'}</td>
            <td class="d"><span class="badge neutral" style="height:16px">仅${o.side==='left'?'左':'右'}侧</span></td></tr>`;
    };
    const rowSame = k=>`<tr class="same"><td class="k">${esc(k)}</td><td>${esc(fmtNum((A[field]||{})[k]))}</td>
        <td>${esc(fmtNum((B[field]||{})[k]))}</td><td class="d">±</td></tr>`;
    const headCols = isMobile() ? `<th>键 / A → B</th><th style="display:none"></th><th style="display:none"></th><th style="display:none"></th>`
      : `<th style="width:32%">键</th><th style="width:28%">A · ${esc(A.id)}</th><th style="width:28%">B · ${esc(B.id)}</th><th style="width:12%">Δ</th>`;
    return `<table class="dt">
      <thead><tr>${headCols}</tr></thead>
      <tbody>
        ${chg.map(rowChg).join('')}
        ${only.map(rowOnly).join('')}
        ${(onlyDiff||!same.length)?'':`<tr class="foldrow" data-act="toggle-same" data-sec="${field}">
            <td colspan="4">▸ 相同参数（${same.length} 项）</td></tr>`}
        ${(onlyDiff||!same.length)?'':same.map(k=>`<tr class="same" data-same="${field}">${isMobile()
            ? `<td colspan="4"><span class="mono" style="color:var(--neutral-400)">${esc(k)}</span> <span class="mono dim">${esc(fmtNum((A[field]||{})[k]))}</span></td>`
            : `<td class="k" style="padding-left:19px">${esc(k)}</td><td>${esc(fmtNum((A[field]||{})[k]))}</td><td>${esc(fmtNum((B[field]||{})[k]))}</td><td class="d">±</td>`}</tr>`).join('')}
      </tbody></table>`;
  };
  const chgP = allP.filter(k=>normVal((A.params||{})[k])!==normVal((B.params||{})[k]) && k in (A.params||{}) && k in (B.params||{}));
  const chgM = allM.filter(k=>k in (A.metrics||{}) && k in (B.metrics||{}) && (A.metrics||{})[k]!==(B.metrics||{})[k]);
  const summary = `本次差异：<b>${chgP.length}</b> 个参数${chgP.length?'（'+chgP.map(esc).join(' · ')+'）':''} · <b>${chgM.length}</b> 个指标变化${
      chgM.length?'（'+chgM.map(k=>esc(k)+' '+delta((A.metrics||{})[k],(B.metrics||{})[k],k,'metric').text).join(' · ')+'）':''} · 其余 ${Math.max(0,allP.length-chgP.length)} 项相同`;
  return `<div class="toolbar" style="position:sticky;top:0;z-index:9;background:var(--neutral-0);border:1px solid var(--border);border-radius:var(--r-lg) var(--r-lg) 0 0">
      <select class="sel" data-act="set-diffa" style="width:150px">${expsOfVersion(A.versionId).map(e=>
        `<option value="${e.id}"${e.id===A.id?' selected':''}>A · ${esc(e.id)}</option>`).join('')}</select>
      <button class="btn ghost icon sm" data-act="swap-diff" title="交换 A / B">⇄</button>
      <select class="sel" data-act="set-diffb" style="width:150px">${expsOfVersion(B.versionId).map(e=>
        `<option value="${e.id}"${e.id===B.id?' selected':''}>B · ${esc(e.id)}</option>`).join('')}</select>
      <span class="grow"></span>
      <button class="btn sm ${state.diff.onlyDiff?'primary':''}" data-act="toggle-onlydiff">仅看差异</button>
      <button class="btn sm" data-act="copy-md">复制为 Markdown</button>
      <button class="btn sm" data-act="set-baseline" data-val="${A.id}">设为 baseline</button>
    </div>
    <div class="card" style="padding:var(--sp-3);border-radius:0;border-top:0;border-bottom:0">
      <div class="fs-sm" style="color:var(--neutral-600)">${summary}</div>
    </div>
    <div class="card" style="padding:0;border-radius:0 0 var(--r-lg) var(--r-lg)">
      <div class="fs-xs muted" style="padding:var(--sp-2) var(--sp-3);background:var(--neutral-50);letter-spacing:.06em">参数 · params</div>
      ${build(allP,'params','param')}
      <div class="fs-xs muted" style="padding:var(--sp-2) var(--sp-3);background:var(--neutral-50);border-top:1px solid var(--border-strong);letter-spacing:.06em">指标 · metrics
        <span class="ml2">（Δ 默认不染色；声明方向后才染色）</span></div>
      ${build(allM,'metrics','metric')}
    </div>
    ${state.diffNote?`<div class="banner info mt3">${esc(state.diffNote)}</div>`:''}`;
}

/* ---------- 图表视图 ---------- */
function viewChart(v){
  const rowsAll = expsOfVersion(v.id);
  const rows = filterRows(rowsAll);
  const cl = clusterFamilies(rows, state.famDims[v.id]);
  const keysP = keyUnion(rows,'params'), keysM = keyUnion(rows,'metrics');
  const type = state.chart.type || 'line';
  const numeric = (field, k) => isNumericKey(rows, field, k);
  const axisSel = (which, cur, fieldFilter) => {
    const opts = (field, arr)=>`<optgroup label="${field==='params'?'params':'metrics'}">` +
      arr.map(x=>{
        const ok = numeric(field, x.key);
        return `<option value="${field}:${esc(x.key)}"${cur===field+':'+x.key?' selected':''}${ok?'':' disabled'}>
          ${esc(x.key)} · n=${cardinality(rows,field,x.key)}${ok?'':' · 非数值'}</option>`;
      }).join('') + `</optgroup>`;
    const both = fieldFilter==='metric' ? opts('metrics',keysM)
      : fieldFilter==='param' ? opts('params',keysP)
      : opts('params',keysP)+opts('metrics',keysM);
    return `<select class="sel" data-act="set-axis" data-which="${which}" style="max-width:190px">
      <option value="">${which==='x'?'X 轴 ▾':'Y 轴 ▾'}</option>${both}</select>`;
  };
  const numPKeys = keysP.filter(x=>numeric('params',x.key));
  const numMKeys = keysM.filter(x=>numeric('metrics',x.key));
  /* 切换图表类型时自动把轴修正到合法取值（仍然只用运行时键集合） */
  ensureAxes(type, keysP, keysM, numPKeys, numMKeys, rows);
  const pk = (state.chart.x||'').split(':'), mk = (state.chart.y||'').split(':');
  const xField = pk[0]||'params', xKey = pk[1], yField = mk[0]||'metrics', yKey = mk[1];
  const dims = cl.dims;
  const others = dims.filter(k=>k!==xKey);
  let chartBody = '';
  if (type==='line') chartBody = chartLine(rows, xKey, yKey, others);
  else if (type==='heatmap') chartBody = chartHeat(rows, xKey, yKey, others);
  else if (type==='parallel') chartBody = chartParallel(rows, dims, yKey);
  else chartBody = versionTable(v, rowsAll);
  if (type==='heatmap' || type==='parallel') state.chart.metric = type==='heatmap' ? null : yKey;

  const fixedRow = (type==='line'||type==='heatmap') && others.length ? `<div class="row wrap g2 mb3 fs-xs muted">
      <span>固定维度：</span>${others.map(k=>{
        const card = cardinality(rows,'params',k);
        const vals = valuesOf(rows,'params',k);
        const cur = state.chart.fixed[k] || (vals[0]!==undefined?String(vals[0]):'*');
        return `<select class="sel" data-act="set-fixed" data-key="${esc(k)}" style="height:24px;font-size:var(--fs-xs)">
          ${vals.map(v2=>`<option value="${esc(String(v2))}"${cur===String(v2)?' selected':''}>${esc(k)} = ${esc(fmtNum(v2))}</option>`).join('')}
          <option value="*"${cur==='*'?' selected':''}>${esc(k)} = 全部（分 series）</option></select>`;}).join('')}
    </div>` : '';
  return `<div class="toolbar wrap2" style="position:sticky;top:0;z-index:9;background:var(--neutral-0);border:1px solid var(--border);border-radius:var(--r-lg) var(--r-lg) 0 0">
      ${seg([{v:'line',t:'折线'},{v:'heatmap',t:'热力图'},{v:'parallel',t:'平行坐标'},{v:'table',t:'表格'}], type, 'set-chart')}
      ${(type==='table'||type==='parallel')?'':axisSel('x', state.chart.x, type==='heatmap'?'param':'')}
      ${type==='table'?'':axisSel('y', state.chart.y, (type==='line'||type==='parallel')?'metric':'')}
      <span class="grow"></span>
      <span class="fs-xs muted">轴选项 = ${rows.length} 条实验的 <span class="mono">params ∪ metrics</span> 键并集，非数值键自动置灰</span>
    </div>
    <div class="card" style="padding:var(--card-pad);border-radius:0 0 var(--r-lg) var(--r-lg);border-top:0">
      ${fixedRow}
      ${chartBody}
    </div>`;
}
function ensureAxes(type, keysP, keysM, numPKeys, numMKeys, rows){
  const c = state.chart;
  const fk = s => (s||'').split(':')[0], nk = s => (s||'').split(':')[1];
  const isP = k => keysP.some(x=>x.key===k), isM = k => keysM.some(x=>x.key===k);
  const byCard = (a,b)=>cardinality(rows,'params',b.key)-cardinality(rows,'params',a.key);
  const scanP = numPKeys.filter(x=>cardinality(rows,'params',x.key)>=2).sort(byCard)[0] || numPKeys[0] || keysP[0];
  const firstM = numMKeys[0] || keysM[0];
  const px = k => k ? 'params:'+k.key : '';
  const mx = k => k ? 'metrics:'+k.key : '';
  if (type==='line'){
    if (!isP(nk(c.x)) || !numPKeys.some(x=>x.key===nk(c.x))) c.x = px(scanP);
    if (!isM(nk(c.y)) || !numMKeys.some(x=>x.key===nk(c.y))) c.y = mx(firstM);
  } else if (type==='heatmap'){
    if (!isP(nk(c.x))) c.x = px(numPKeys[0]||keysP[0]);
    const alt = numPKeys.filter(x=>x.key!==nk(c.x));
    if (!isP(nk(c.y)) || nk(c.y)===nk(c.x)) c.y = px(alt[0] || numPKeys[0] || keysP[0]);
    c.metric = null;
  } else if (type==='parallel'){
    if (!isM(nk(c.y))) c.y = mx(firstM);
  }
}
/* 折线：单参数扫描 */
function chartLine(rows, xKey, yKey, others){
  if (!xKey || !yKey) return emptyState('📈','选择坐标轴','从右上角选择 X 轴（参数）与 Y 轴（指标）。');
  const card = cardinality(rows,'params',xKey);
  if (!isNumericKey(rows,'params',xKey) || card < 3)
    return `<div class="banner warn"><span>⚠</span><span>「<span class="mono">${esc(xKey)}</span>」只有 ${card} 个取值，样本太少，折线意义不大 —— 试试用「对比」看差异，或换一个维度。</span></div>`;
  const freeDims = others.filter(k=>state.chart.fixed[k]==='*');
  let sub = rows.filter(e=>(e.metrics||{})[yKey]!==undefined && e.params[xKey]!==undefined);
  others.forEach(k=>{
    const vals = valuesOf(rows,'params',k);
    const sel = state.chart.fixed[k]!==undefined ? state.chart.fixed[k] : String(vals[0]);
    if (sel!=='*') sub = sub.filter(e=>normVal(e.params[k])===normVal(parseAuto(sel)));
  });
  const groups = new Map();
  sub.forEach(e=>{
    const gk = freeDims.map(k=>k+'='+fmtNum(e.params[k])).join(', ') || '全部';
    if(!groups.has(gk)) groups.set(gk, []);
    groups.get(gk).push(e);
  });
  const W=900,H=280,P={l:56,r:16,t:16,b:38};
  const xs = sub.map(e=>e.params[xKey]).filter(isNum);
  const ys = sub.map(e=>(e.metrics||{})[yKey]).filter(isNum);
  if (!xs.length||!ys.length) return emptyState('📈','没有可绘制的数据','当前固定维度组合下没有带该指标的实验。');
  const xmin=Math.min.apply(null,xs), xmax=Math.max.apply(null,xs);
  const ymin=Math.min.apply(null,ys), ymax=Math.max.apply(null,ys);
  const ypad=(ymax-ymin)*0.12||Math.abs(ymax)*0.05||1;
  const X=(v)=>P.l+(v-xmin)/((xmax-xmin)||1)*(W-P.l-P.r);
  const Y=(v)=>H-P.b-(v-(ymin-ypad))/((ymax+ypad)-(ymin-ypad))*(H-P.t-P.b);
  const names = Array.from(groups.keys()).slice(0,6);
  let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" class="chart-svg">`;
  for(let i=0;i<=4;i++){
    const yy = P.t + (H-P.t-P.b)*i/4;
    svg += `<line class="grid" x1="${P.l}" y1="${yy}" x2="${W-P.r}" y2="${yy}"/>`;
    const val = (ymax+ypad) - ((ymax+ypad)-(ymin-ypad))*i/4;
    svg += `<text class="axis-t" x="${P.l-8}" y="${yy+3}" text-anchor="end">${esc(sig(val))}</text>`;
  }
  svg += `<line class="axis" x1="${P.l}" y1="${H-P.b}" x2="${W-P.r}" y2="${H-P.b}"/>`;
  const ticks = Array.from(new Set(xs)).sort((a,b)=>a-b);
  ticks.forEach(t=>{ svg += `<line class="grid" x1="${X(t)}" y1="${P.t}" x2="${X(t)}" y2="${H-P.b}" opacity=".5"/>
    <text class="axis-t" x="${X(t)}" y="${H-P.b+16}" text-anchor="middle">${esc(fmtNum(t))}</text>`; });
  svg += `<text class="axis-t" x="${(P.l+W-P.r)/2}" y="${H-4}" text-anchor="middle">${esc(xKey)}</text>`;
  svg += `<text class="axis-t" x="12" y="${P.t+4}">${esc(yKey)}</text>`;
  names.forEach((gname, gi)=>{
    const pts = groups.get(gname).slice().sort((a,b)=>a.params[xKey]-b.params[xKey]);
    const color = catColor(gi);
    if (pts.length>1)
      svg += `<polyline fill="none" stroke="${color}" stroke-width="1.8" opacity=".85" points="${pts.map(p=>X(p.params[xKey])+','+Y(p.metrics[yKey])).join(' ')}"/>`;
    pts.forEach(p=>{
      const cx=X(p.params[xKey]), cy=Y(p.metrics[yKey]);
      if (p.status==='failed') svg += `<g class="pt" data-act="open-exp" data-val="${p.id}"><path d="M${cx-4},${cy-4}L${cx+4},${cy+4}M${cx-4},${cy+4}L${cx+4},${cy-4}" stroke="var(--danger-500)" stroke-width="1.6"/><circle cx="${cx}" cy="${cy}" r="9" fill="transparent"/></g>`;
      else if (p.status==='running') svg += `<g class="pt" data-act="open-exp" data-val="${p.id}"><circle cx="${cx}" cy="${cy}" r="4" fill="none" stroke="var(--accent-500)" stroke-width="1.6"/><circle cx="${cx}" cy="${cy}" r="9" fill="transparent"/></g>`;
      else svg += `<g class="pt" data-act="open-exp" data-val="${p.id}"><circle cx="${cx}" cy="${cy}" r="4" fill="${color}"/><circle cx="${cx}" cy="${cy}" r="9" fill="transparent"/></g>`;
      svg += `<title>${esc(p.id)} · ${esc(xKey)}=${esc(fmtNum(p.params[xKey]))} · ${esc(yKey)}=${esc(fmtNum(p.metrics[yKey]))}</title>`;
    });
  });
  svg += `</svg>`;
  const legend = names.length>1 ? `<div class="lgd mt2">${names.map((n,i)=>
    `<span><i style="background:${catColor(i)}"></i>${esc(n)}</span>`).join('')}</div>` : '';
  return `<div class="chart-box">${svg}</div>${legend}
    <div class="fs-xs muted mt2">共 ${sub.length} 个点 · 点按状态区分：实心=完成，空心叉=失败，空心圈=运行中。点击点可跳转实验详情。</div>`;
}
function parseAuto(s){ const n=parseFloat(s); return isNaN(n)? s : n; }
/* 双参数热力图 */
function chartHeat(rows, xKey, yKey, others){
  const [aKey,bKey] = [xKey, (state.chart.y||'').split(':')[1]];
  const mKeys = keyUnion(rows,'metrics').filter(x=>isNumericKey(rows,'metrics',x.key));
  const metric = mKeys.length? (mKeys.find(m=>state.chart.metric===m.key)||mKeys[0]).key : null;
  if (!metric) return emptyState('▦','没有数值型指标','当前实验集合里没有可回收的数值指标。');
  if (!aKey||!bKey||aKey===bKey)
    return `<div class="banner info"><span>ⓘ</span><span>请在上方分别选择两个不同的参数键作为 X / Y 轴（右侧 Y 轴下拉里选 param 组）。</span></div>`;
  const av = valuesOf(rows,'params',aKey), bv = valuesOf(rows,'params',bKey);
  const agg = defaultAgg(metric);
  const W=Math.min(760, Math.max(360, av.length*92)), H=Math.max(200, bv.length*46+70), P={l:72,r:16,t:26,b:36};
  const cells = new Map(); const vals=[];
  rows.forEach(e=>{
    if(e.params[aKey]===undefined||e.params[bKey]===undefined) return;
    const k = normVal(e.params[aKey])+'|'+normVal(e.params[bKey]);
    if(!cells.has(k)) cells.set(k,[]);
    cells.get(k).push(e);
  });
  av.forEach(a=>bv.forEach(b=>{
    const v = aggregate((cells.get(normVal(a)+'|'+normVal(b))||[]).map(e=>(e.metrics||{})[metric]), agg);
    if (isNum(v)) vals.push(v);
  }));
  const sc = quantileScale(vals,5);
  const cw=(W-P.l-P.r)/av.length, ch=(H-P.t-P.b)/bv.length;
  let svg = `<svg viewBox="0 0 ${W+90} ${H}" preserveAspectRatio="xMidYMid meet">`;
  bv.forEach((b,bi)=>av.forEach((a,ai)=>{
    const exps = cells.get(normVal(a)+'|'+normVal(b))||[];
    const v = aggregate(exps.map(e=>(e.metrics||{})[metric]), agg);
    const idx = isNum(v)? scaleIndex(sc,v) : -1;
    const x=P.l+ai*cw, y=P.t+bi*ch;
    const dark = idx>=3;
    svg += `<g data-act="heat-cell" data-a="${esc(String(a))}" data-b="${esc(String(b))}" class="pt">
      <rect x="${x+1}" y="${y+1}" width="${cw-2}" height="${ch-2}" rx="4"
        fill="${isNum(v)?SEQ[idx]:'transparent'}" class="${isNum(v)?'':'missing'}"
        stroke="${isNum(v)?'rgba(26,29,40,.05)':'var(--neutral-150)'}"/>
      <text x="${x+cw/2}" y="${y+ch/2+4}" text-anchor="middle" class="axis-t"
        style="fill:${dark?'#fff':'var(--neutral-700)'};font-family:var(--font-mono);font-size:11px">${isNum(v)?esc(sig(v)):'—'}</text>
      <title>${esc(aKey)}=${esc(fmtNum(a))} · ${esc(bKey)}=${esc(fmtNum(b))}\n${esc(metric)}（${agg}）= ${isNum(v)?esc(sig(v)):'无数据'}\n${exps.length} 次实验 · 点击下钻</title></g>`;
  }));
  av.forEach((a,ai)=>{ svg+=`<text class="axis-t" x="${P.l+ai*cw+cw/2}" y="${P.t-8}" text-anchor="middle" style="font-family:var(--font-mono)">${esc(fmtNum(a))}</text>`; });
  bv.forEach((b,bi)=>{ svg+=`<text class="axis-t" x="${P.l-8}" y="${P.t+bi*ch+ch/2+4}" text-anchor="end" style="font-family:var(--font-mono)">${esc(fmtNum(b))}</text>`; });
  svg += `<text class="axis-t" x="${P.l}" y="${H-16}">${esc(aKey)} →</text>`;
  svg += `<text class="axis-t" x="${P.l}" y="14">↑ ${esc(bKey)} · 单元格 = ${esc(metric)}（${agg}）</text>`;
  const lx = W+24;
  svg += `<defs><linearGradient id="lg" x1="0" y1="1" x2="0" y2="0">${
    SEQ.map((c,i)=>`<stop offset="${i/(SEQ.length-1)*100}%" stop-color="${c}"/>`).join('')}</linearGradient></defs>`;
  svg += `<rect x="${lx}" y="${P.t}" width="10" height="${H-P.t-P.b}" fill="url(#lg)" rx="3"/>`;
  if(sc){ svg += `<text class="axis-t" x="${lx+14}" y="${H-P.b}">${esc(sig(sc.min))}</text>
    <text class="axis-t" x="${lx+14}" y="${P.t+8}">${esc(sig(sc.max))}</text>`; }
  svg += `</svg>`;
  return `<div class="chart-box">${svg}</div>
    <div class="fs-xs muted mt2">缺失组合显示为斜纹，绝不填 0。点击单元格可下钻该组合下的实验。</div>`;
}
/* 平行坐标 */
function chartParallel(rows, dims, yKey){
  const numDims = dims.filter(k=>isNumericKey(rows,'params',k));
  const mKeys = keyUnion(rows,'metrics').filter(x=>isNumericKey(rows,'metrics',x.key));
  const metric = (yKey && mKeys.some(m=>m.key===yKey)) ? yKey : (mKeys[0]?mKeys[0].key:null);
  const axes = numDims.concat(metric?[metric]:[]);
  if (axes.length<2) return `<div class="banner info"><span>ⓘ</span><span>当前差异维度不足（需 ≥2 个数值型维度），试试换一个版本，或用「折线」看单参数扫描。</span></div>`;
  const W=900,H=300,P={l:52,r:52,t:34,b:44};
  const ranges = axes.map(k=>{
    const vals = rows.map(e=>(k===metric? (e.metrics||{})[k] : (e.params||{})[k])).filter(isNum);
    return {k, min:Math.min.apply(null,vals), max:Math.max.apply(null,vals)};
  });
  const X = i => P.l + i*(W-P.l-P.r)/(axes.length-1);
  const Y = (i,v) => { const r=ranges[i]; return H-P.b - (v-r.min)/((r.max-r.min)||1)*(H-P.t-P.b); };
  let visible = rows;
  if (state.chart.brush){
    visible = rows.filter(e=>axes.every((k,i)=>{
      const b = state.chart.brush[k]; if(!b) return true;
      const val = (k===metric? (e.metrics||{})[k] : (e.params||{})[k]);
      return isNum(val) && val>=b[0] && val<=b[1];
    }));
  }
  let svg = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" id="pcSvg">`;
  axes.forEach((k,i)=>{
    const x=X(i);
    svg += `<line class="axis" x1="${x}" y1="${P.t}" x2="${x}" y2="${H-P.b}"/>`;
    if (state.chart.brush && state.chart.brush[k]){
      const b = state.chart.brush[k];
      svg += `<rect class="pc-brush" x="${x-4}" y="${Y(i,b[1])}" width="8" height="${Math.max(2,Y(i,b[0])-Y(i,b[1]))}" rx="2"/>`;
    }
    svg += `<text class="pc-axis-title" x="${x}" y="${P.t-16}" text-anchor="middle">${esc(k)}</text>`;
    svg += `<text class="pc-axis-mm" x="${x}" y="${H-P.b+16}" text-anchor="middle">${esc(sig(ranges[i].min))}</text>`;
    svg += `<text class="pc-axis-mm" x="${x}" y="${H-P.b+30}" text-anchor="middle">${esc(sig(ranges[i].max))}</text>`;
  });
  if (metric) svg += `<rect x="${X(axes.length-1)-46}" y="${P.t}" width="92" height="${H-P.t-P.b}" fill="var(--accent-50)" opacity=".5" rx="4"/>`;
  visible.forEach(e=>{
    const pts = axes.map((k,i)=>{
      const val = (k===metric? (e.metrics||{})[k] : (e.params||{})[k]);
      return isNum(val) ? X(i)+','+Y(i,val) : null;
    }).filter(Boolean);
    if (pts.length<2) return;
    svg += `<polyline class="pc-line" data-id="${e.id}" data-act="open-exp" data-val="${e.id}" points="${pts.join(' ')}">
      <title>${esc(e.id)}</title></polyline>`;
  });
  svg += `</svg>`;
  const n = visible.length;
  return `<div class="chart-box">${svg}</div>
    <div class="row g2 mt2 wrap">
      ${state.chart.brush?`<span class="banner info" style="padding:4px 10px">已过滤：保留 <b>${n}</b> / ${rows.length}</span>
        <button class="btn sm" data-act="clear-brush">清除刷选</button>`:`<span class="fs-xs muted">在任意轴上纵向拖拽可刷选区间，下方表格会实时过滤。hover 高亮单条实验，点击跳转详情。</span>`}
    </div>
    <div class="mt3">${filteredTable(visible)}</div>`;
}
function filteredTable(rows){
  if (!rows.length) return emptyState('▦','没有符合刷选区间的实验','放宽区间或清除刷选。');
  const pKeys = keyUnion(rows,'params').filter(k=>cardinality(rows,'params',k)>1).map(x=>x.key);
  const mKeys = keyUnion(rows,'metrics').map(x=>x.key);
  return `<div class="tw"><table class="t"><thead><tr><th>实验</th><th style="width:88px">状态</th>
    ${pKeys.map(k=>`<th class="num mono">${esc(k)}</th>`).join('')}
    ${mKeys.map(k=>`<th class="num mono">${esc(k)}</th>`).join('')}</tr></thead><tbody>
    ${rows.map(e=>`<tr data-act="open-exp" data-val="${e.id}" style="cursor:pointer">
      <td class="mono">${esc(e.id)}</td><td>${statusBadge(e)}</td>
      ${pKeys.map(k=>`<td class="num mono">${esc(fmtNum((e.params||{})[k]))}</td>`).join('')}
      ${mKeys.map(k=>`<td class="num mono">${k in (e.metrics||{})?esc(fmtNum(e.metrics[k])):'<span class="dim">—</span>'}</td>`).join('')}
    </tr>`).join('')}</tbody></table></div>`;
}

/* ══════════════════════════════════════════════════════════════════════════
 * 视图：实验详情
 * ════════════════════════════════════════════════════════════════════════*/
function viewExperiment(){
  const e = expById(state.expId); if(!e) return errState('实验不存在');
  const v = versionById(e.versionId); const i = ideaById(e.ideaId);
  const rows = expsOfVersion(e.versionId);
  const base = (state.baseOverride && expById(state.baseOverride)) || baselineOf(e);
  const mKeys = keyUnion(rows,'metrics').map(x=>x.key);
  let pin = state.pinned.filter(k=>mKeys.includes(k) && k in (e.metrics||{}));
  if (!pin.length){
    pin = mKeys.filter(k=>k in (e.metrics||{})).slice(0,4);
  }
  const cl = clusterFamilies(rows, state.famDims[e.versionId]);
  const fam = cl.families.find(f=>f.members.some(m=>m.id===e.id));
  const analyses = analysisOf(e.id);
  const arts = ARTIFACTS[e.id] || [];
  const log = buildLog(e);
  const failed = e.status==='failed';

  const metricCards = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:var(--sp-3)">
    ${pin.map(k=>{
      const val = (e.metrics||{})[k];
      const bv = base? (base.metrics||{})[k] : undefined;
      const d = (isNum(val)&&isNum(bv))? delta(bv,val,k,'metric') : null;
      const col = d? (d.cls==='good'?'var(--success-600)':d.cls==='bad'?'var(--danger-600)':'var(--neutral-500)') : '';
      return `<div class="card pad" style="position:relative">
        <button class="btn ghost icon sm" style="position:absolute;right:6px;top:6px" data-act="metric-menu" data-val="${esc(k)}">⋯</button>
        <div class="fs-xs muted mono trunc">${esc(k)}</div>
        <div class="mono" style="font-size:var(--fs-metric);font-weight:600;color:var(--neutral-900);line-height:var(--lh-metric)">${esc(fmtNum(val))}</div>
        <div class="row g2 ac">${d?`<span class="fs-sm" style="color:${col}">${esc(d.text)}</span>`:''}
          ${k in state.directions?`<span class="chip sm" style="height:16px">${state.directions[k]?'越大越好':'越小越好'}</span>`:''}</div>
      </div>`;}).join('')}
    ${pin.length?'':`<div class="card pad"><div class="fs-sm muted">该实验还没有可回收的指标。</div></div>`}
  </div>`;

  const kvPanel = renderKV(e, base);
  const otherMetrics = mKeys.filter(k=>!pin.includes(k));

  return STICKY_CSS + `
  <div class="row g3 ac mb4 wrap">
    <div class="grow">
      <div class="row g2 ac"><span class="mono fs-lg">${esc(e.id)}</span>${statusBadge(e,'md')}
        ${e._today?'<span class="badge accent">NEW</span>':''}</div>
      <div class="fs-sm muted mt1">${esc(i?i.name:'')} / <span class="mono">${esc(v?v.name+' '+v.git:'')}</span> ·
        创建 ${esc(fmtTime(e.createdAt))} · ${e.finishedAt?`结束 ${esc(fmtTime(e.finishedAt))} · 耗时 ${esc(duration(e.createdAt,e.finishedAt))}`:'尚未结束'}</div>
    </div>
    <button class="btn" data-act="reanalyze" data-val="${e.id}">重新分析</button>
    <button class="btn" data-act="clone-exp" data-val="${e.id}">复制参数新建</button>
    <button class="btn ghost icon" data-act="exp-more" data-val="${e.id}">⋯</button>
  </div>
  ${effStatus(e)==='missing'?`<div class="banner warn mb4"><span>⚠</span><span>已完成但没有回收到指标 —— 检查本地结果文件，或让 agent 重新回收。</span>
    <button class="btn sm" data-act="recollect" data-val="${e.id}">重新回收</button></div>`:''}
  <div class="row g6" style="align-items:flex-start;flex-wrap:wrap">
    <div class="grow" style="min-width:min(100%,520px)">
      <div class="mb4">
        <div class="row between mb2"><div class="fs-md">指标概览</div>
          <span class="fs-xs muted">未 pin 时默认取该版本出现频次最高的键</span></div>
        ${metricCards}
        ${otherMetrics.length?`<div class="card mt3" style="padding:var(--sp-3)">
          <div class="fs-xs muted mb2">其余指标</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px var(--sp-4)">
            ${otherMetrics.map(k=>`<div class="row between fs-sm" style="padding:2px 0">
              <span class="mono muted trunc">${esc(k)}</span>
              <span class="mono ${k in (e.metrics||{})?'':'missing'}" style="padding:0 4px;color:${k in (e.metrics||{})?'var(--neutral-800)':'var(--neutral-300)'}">${esc(k in (e.metrics||{})?fmtNum(e.metrics[k]):'—')}</span>
            </div>`).join('')}</div></div>`:''}
      </div>
      <div class="mb4">
        <div class="card" style="padding:0">
          <div class="toolbar" style="position:static;border-radius:var(--r-lg) var(--r-lg) 0 0">
            <span class="fs-md">参数 · params</span>
            <span class="grow"></span>
            <select class="sel" data-act="set-base" style="max-width:190px">
              <option value="">与前一次实验对比</option>
              ${rows.filter(x=>x.id!==e.id).map(x=>`<option value="${x.id}"${base&&base.id===x.id?' selected':''}>与 ${esc(x.id)} 对比</option>`).join('')}
              <option value="__off__">关闭对比</option></select>
            <button class="btn sm" data-act="copy-json" data-val="${e.id}">复制为 JSON</button>
            <button class="btn sm ${state.onlyDiff?'primary':''}" data-act="toggle-kvdiff">仅看差异</button>
          </div>
          ${kvPanel}
        </div>
      </div>
      <div class="card" style="padding:0">
        <button class="toolbar" data-act="toggle-artifacts" style="width:100%;position:static;border-radius:var(--r-lg);border:0;background:var(--neutral-0);cursor:pointer">
          <span class="fs-md">产物与日志</span>
          <span class="fs-xs muted">${arts.length} 个产物</span>
          <span class="grow"></span>
          <span class="fs-xs muted">${state.openArts||failed?'收起 ▴':'展开 ▾'}</span>
        </button>
        ${(state.openArts||failed)?`<div style="border-top:1px solid var(--border-subtle)">
          ${arts.map(a=>`<div class="row g3" style="padding:8px var(--sp-3);border-bottom:1px solid var(--border-subtle);${a.pruned?'opacity:.5':''}">
            <span style="width:18px;text-align:center;color:var(--neutral-400)">${ART_KIND[a.kind]||'▢'}</span>
            <span class="mono fs-sm" style="color:var(--neutral-800)">${esc(a.name)}</span>
            ${a.large?'<span class="chip warn sm">大产物</span>':''}
            ${a.pruned?'<span class="badge neutral">已清理</span>':''}
            <span class="fs-xs muted mono trunc grow" style="text-align:right">${a.pruned?'（仅保留路径指针）':esc(a.path)}</span>
            <span class="fs-xs muted nowrap">${a.pruned?'—':esc(fmtSize(a.size))}</span>
            <button class="btn ghost sm" data-act="copy-path" data-val="${esc(a.path)}">复制路径</button>
          </div>`).join('')}
          <div style="padding:var(--sp-3)">
            <div class="row g2 mb2">
              <span class="fs-xs muted" style="letter-spacing:.06em">日志 · tail -n 200</span>
              <span class="grow"></span>
              <input class="inp" style="height:24px;width:160px" placeholder="在日志中搜索" data-act="log-search">
              <button class="btn ghost sm" data-act="open-log" data-val="${e.id}">打开完整日志</button>
            </div>
            <pre class="mono" style="margin:0;background:var(--neutral-25);border:1px solid var(--border-subtle);border-radius:var(--r-md);
              padding:var(--sp-3);font-size:var(--fs-sm);line-height:1.65;max-height:200px;overflow:auto;white-space:pre-wrap;color:var(--neutral-700)">${esc(log)}</pre>
          </div>
        </div>`:''}
      </div>
    </div>
    <div style="width:min(100%,380px);flex:none">
      <div class="card pad mb3">
        <div class="row between mb2"><div class="fs-md">Agent 分析</div>${srcBadge(analyses[0]||{source:'agent'})}</div>
        ${state.anLoading===e.id ? `<div class="col g2">${'<div class="sk t"></div>'.repeat(4)}</div>`
        : analyses.length ? analyses.map(a=>`<div>${analysisCardInner(a,e,{noJump:true})}<div class="hr mt3"></div></div>`).join('')
        : `<div style="border:1px dashed var(--border-strong);border-radius:var(--r-md);padding:var(--sp-4);text-align:center">
            <div class="fs-sm muted mb2">还没有分析 —— 让 agent 基于这次结果写一份复盘</div>
            <button class="btn primary sm" data-act="reanalyze" data-val="${e.id}">让 agent 写分析</button></div>`}
      </div>
      <div class="card pad mb3">
        <div class="fs-xs muted mb2" style="letter-spacing:.06em">变体族</div>
        <div class="fs-base strong">${fam?(fam.kind==='repeat'?'重复实验组':fam.kind==='wide'?'广域搜索':'变体族 #'+fam.index):'—'}</div>
        <div class="row wrap g1 mt2">${cl.dims.length?cl.dims.map(d=>`<span class="chip mono sm">${esc(d)}</span>`).join(''):'<span class="fs-xs muted">无差异维度</span>'}</div>
        <div class="fs-xs muted mt2">共 ${fam?fam.members.length:0} 次实验${fam?' · '+fam.groups.length+' 个配置组':''}</div>
        <button class="btn sm mt3" data-act="open-diff" data-val="${e.versionId}">查看族内对比 →</button>
      </div>
      <div class="card pad">
        <div class="fs-xs muted mb2" style="letter-spacing:.06em">关联信息</div>
        <div class="col g2 fs-sm">
          <div class="row between"><span class="muted">所属 Idea</span><button class="link" data-act="open-idea" data-val="${e.ideaId}">${esc(i?i.name:'')}</button></div>
          <div class="row between"><span class="muted">所属 Version</span><button class="link mono" data-act="open-version" data-val="${e.versionId}">${esc(v?v.name+' '+v.git:'')}</button></div>
          <div class="row between"><span class="muted">批次</span><span class="mono">${esc(e.batch)}</span></div>
          <div class="row between"><span class="muted">创建</span><span class="mono">${esc(e.createdAt)}</span></div>
          <div class="row between"><span class="muted">结束</span><span class="mono">${esc(e.finishedAt||'—')}</span></div>
        </div>
      </div>
    </div>
  </div>`;
}
function renderKV(e, base){
  const keys = Object.keys(e.params||{}).sort();
  const onlyDiff = state.onlyDiff;
  const off = state.baseOverride === '__off__';
  const b = off ? null : base;
  const rowsHtml = keys.map(k=>{
    const val = e.params[k];
    const bv = b? (b.params||{})[k] : undefined;
    const hasB = b && k in (b.params||{});
    const same = hasB && normVal(bv)===normVal(val);
    const cls = !b ? '' : (!hasB ? 'only' : same ? 'same' : 'chg');
    if (onlyDiff && b && cls==='same') return '';
    const d = (hasB && !same) ? delta(bv, val, k, 'param') : null;
    return `<tr class="${cls}">
      <td class="k"><span class="ty">${typeIcon(val)}</span>${esc(k)}</td>
      <td class="v">${same?esc(fmtNum(val)):(hasB?`<span class="old">${esc(fmtNum(bv))}</span>${esc(fmtNum(val))}`:esc(fmtNum(val)))}
        ${d?`<div class="delta">${esc(d.text)}</div>`:''}
        ${!hasB&&b?`<span class="badge neutral" style="height:15px;margin-left:6px">仅本实验</span>`:''}</td></tr>`;
  }).join('');
  return `<table class="kv">${rowsHtml||`<tr><td class="k" colspan="2" style="color:var(--neutral-400)">没有差异项</td></tr>`}</table>`;
}

/* ══════════════════════════════════════════════════════════════════════════
 * 视图：实验总览（跨 Idea）
 * ════════════════════════════════════════════════════════════════════════*/
function viewExperiments(){
  const mode = state.query.mode || 'table';
  const rowsAll = EXPERIMENTS.slice();
  const rows = rowsAll.filter(e=>{
    if (state.mtx.status && state.mtx.status!=='all' && e.status!==state.mtx.status) return false;
    return matchConds(e);
  });
  const pKeys = keyUnion(rowsAll,'params').map(x=>x.key);
  const mKeys = keyUnion(rowsAll,'metrics').map(x=>x.key);
  const dims = pKeys.filter(k=>!RE_REPEAT.test(k) && cardinality(rowsAll,'params',k)>1);
  const cols = pKeys.filter(k=>dims.includes(k)||RE_REPEAT.test(k));
  return STICKY_CSS + `<div class="row g3 ac mb4 wrap">
      <div class="grow"><div class="fs-lg">实验总览</div>
        <div class="fs-sm muted">跨 ${IDEAS.length} 个 Idea · ${VERSIONS.length} 个版本 · ${rowsAll.length} 次实验 —— 列由全局键并集生成（不同领域的参数键在此汇合）</div></div>
      ${seg([{v:'table',t:'表格'},{v:'matrix',t:'矩阵'}], mode, 'set-expmode','lg')}
    </div>
    <div class="toolbar wrap2" style="position:sticky;top:0;z-index:9;background:var(--neutral-0);border:1px solid var(--border);border-radius:var(--r-lg) var(--r-lg) 0 0">
      ${seg([{v:'all',t:'全部'},{v:'running',t:'运行中'},{v:'done',t:'完成'},{v:'failed',t:'失败'}], state.mtx.status||'all','set-status')}
      <span class="fs-xs muted">${dims.length} 个跨实验差异维度</span>
      <span class="grow"></span><span class="fs-xs muted">共 ${rows.length} 行</span>
    </div>
    <div style="padding:var(--sp-2) var(--sp-4);background:var(--neutral-0);border:1px solid var(--border);border-top:0">${condBar(rowsAll)}</div>
    <div class="tw" style="border-radius:0 0 var(--r-lg) var(--r-lg);max-height:${effectiveDensity()==='compact'?'calc(100vh - 330px)':'auto'}">
      <table class="t">
        <thead><tr>
          <th class="sl1" style="width:104px">实验</th>
          <th class="sl2" style="width:88px">状态</th>
          <th>Idea / Version</th>
          ${cols.map(k=>`<th class="num mono" title="${esc(k)}">${esc(k)}</th>`).join('')}
          ${mKeys.map(k=>`<th class="num mono" title="${esc(k)}">${esc(k)}</th>`).join('')}
          <th>创建时间</th></tr></thead>
        <tbody>${rows.sort((a,b)=>b._order-a._order).map(e=>{
          const v=versionById(e.versionId), i=ideaById(e.ideaId);
          return `<tr data-act="open-exp" data-val="${e.id}" style="cursor:pointer">
            <td class="sl1 mono">${esc(e.id)}${e._today?' <span class="badge accent">NEW</span>':''}</td>
            <td class="sl2">${statusBadge(e)}</td>
            <td class="fs-xs muted trunc" style="max-width:180px">${esc(i?i.name:'')} / <span class="mono">${esc(v?v.name:'')}</span></td>
            ${cols.map(k=>`<td class="num mono">${k in (e.params||{})?esc(fmtNum(e.params[k])):'<span class="dim">—</span>'}</td>`).join('')}
            ${mKeys.map(k=>`<td class="num mono">${k in (e.metrics||{})?esc(fmtNum(e.metrics[k])):'<span class="dim">—</span>'}</td>`).join('')}
            <td class="fs-xs muted nowrap">${esc(fmtTime(e.createdAt))}</td></tr>`;}).join('')}</tbody>
      </table>
      ${rows.length?'':`<div>${emptyState('🔍','没有符合条件的实验','清除筛选试试。',`<button class="btn sm" data-act="clear-cond">清除筛选</button>`)}</div>`}
    </div>`;
}

/* ══════════════════════════════════════════════════════════════════════════
 * 抽屉 / 弹层 / Toast / Tooltip / 命令面板
 * ════════════════════════════════════════════════════════════════════════*/
function openDrawer(html, opts){
  state.drawer = { html, opts:opts||{} };
  renderLayers();
}
function closeDrawer(){ state.drawer=null; state.modal=null; renderLayers(); }
function openModal(html, opts){ state.modal = { html, opts:opts||{} }; renderLayers(); }
function closeModal(){ state.modal=null; renderLayers(); }
function renderLayers(){
  const L = $('#layers');
  let html = '';
  if (state.modal) html += `<div class="overlay" data-act="close-modal"></div>
    <div class="modal-wrap" style="pointer-events:none"><div class="modal ${state.modal.opts.sm?'sm':''}" style="pointer-events:auto">${state.modal.html}</div></div>`;
  if (state.drawer) html += `<div class="overlay" data-act="close-drawer"></div>
    <aside class="drawer ${state.drawer.opts.wide?'wide':''}">${state.drawer.html}</aside>`;
  L.innerHTML = html;
}
function toast(msg, tone, actLabel, actFn){
  const id = 't'+(++state.toastSeq);
  const el = document.createElement('div');
  el.className = 'toast '+(tone||'info');
  el.innerHTML = `<span class="ti">${tone==='ok'?'✓':tone==='warn'?'⚠':tone==='err'?'!':'ⓘ'}</span>
    <span class="grow">${msg}</span>${actLabel?`<button class="btn sm" data-act="toast-act" data-id="${id}">${esc(actLabel)}</button>`:''}`;
  $('.toasts') || (function(){
    const d=document.createElement('div'); d.className='toasts'; $('#app').appendChild(d);
  })();
  const wrap = $('.toasts');
  wrap.appendChild(el);
  while (wrap.children.length>3) wrap.removeChild(wrap.firstChild);
  if (actFn) state.toastActs = Object.assign(state.toastActs||{}, {[id]:actFn});
  setTimeout(()=>{ el.style.transition='opacity .3s,transform .3s'; el.style.opacity='0'; el.style.transform='translateY(6px)';
    setTimeout(()=>el.remove(), 320); }, 5000);
}
let tipTimer=null;
function initTooltip(){
  const app = $('#app'), tip = document.createElement('div');
  tip.className='tip'; app.appendChild(tip);
  app.addEventListener('mouseover', ev=>{
    const t = ev.target.closest('[data-tip]');
    if (!t) return;
    clearTimeout(tipTimer);
    tipTimer = setTimeout(()=>{
      tip.textContent = t.getAttribute('data-tip');
      tip.classList.add('on');
      const r = t.getBoundingClientRect(), ar = app.getBoundingClientRect();
      let x = r.left - ar.left + r.width/2, y = r.top - ar.top - 8;
      tip.style.left='0px'; tip.style.top='0px';
      const tw = tip.offsetWidth, th = tip.offsetHeight;
      x = Math.max(8, Math.min(x - tw/2, ar.width - tw - 8));
      if (y - th < 8) y = r.bottom - ar.top + 8;
      tip.style.left = x+'px'; tip.style.top = (y-th)+'px';
    }, 300);
  });
  app.addEventListener('mouseout', ev=>{ if(ev.target.closest('[data-tip]')){ clearTimeout(tipTimer); tip.classList.remove('on'); }});
  app.addEventListener('scroll', ()=>tip.classList.remove('on'), true);
}
function qrSvg(text){
  let h=0; for(let i=0;i<text.length;i++) h=(h*31+text.charCodeAt(i))>>>0;
  const rnd = mulberry(h);
  const N=21, cell=6, size=N*cell;
  let r='';
  for(let y=0;y<N;y++) for(let x=0;x<N;x++){
    const edge = (x<7&&y<7)||(x>=N-7&&y<7)||(x<7&&y>=N-7);
    const on = edge ? ((x%6===0||y%6===0||(x>1&&x<5&&y>1&&y<5))||(x>N-6&&y>1&&y<5)||(x>1&&x<5&&y>N-6)) : rnd()>0.52;
    if (on) r += `<rect x="${x*cell}" y="${y*cell}" width="${cell}" height="${cell}"/>`;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="#2C3040">${r}</svg>`;
}
function openCmdK(){
  const q = { text:'' };
  const renderList = ()=>{
    const t = q.text.trim().toLowerCase();
    const hit = (s)=> s.toLowerCase().includes(t);
    const groups = [
      { name:'Idea', items: IDEAS.filter(i=>!t||hit(i.name)||hit(i.hypothesis)).slice(0,6).map(i=>({kind:'Idea', label:i.name, sub:(ideaById(i.parent)||{}).name||'根节点', act:'open-idea', val:i.id})) },
      { name:'文献', items: LITERATURE.filter(l=>!t||hit(l.title)||hit(l.authors)||hit(l.note)).slice(0,6).map(l=>({kind:'文献', label:l.title, sub:l.authors.split(',')[0]+' et al. · '+l.year, act:'open-lit', val:l.id})) },
      { name:'实验', items: EXPERIMENTS.filter(e=>!t||hit(e.id)||Object.entries(e.params).some(([k,v])=>hit(k+'=' + v))).slice(0,8).map(e=>({kind:'实验', label:e.id, sub:Object.entries(e.params).slice(0,3).map(([k,v])=>k+'='+fmtNum(v)).join(' · '), act:'open-exp', val:e.id})) },
    ];
    state.cmdp = { q, groups, sel:0 };
    return groups;
  };
  renderList();
  const draw = ()=>{
    const flat = state.cmdp.groups.flatMap(g=>g.items);
    if (state.cmdp.sel>=flat.length) state.cmdp.sel=Math.max(0,flat.length-1);
    let idx=-1;
    const html = state.cmdp.groups.filter(g=>g.items.length).map(g=>
      `<div class="grp">${g.name}</div>` + g.items.map(it=>{
        idx++;
        return `<div class="it" data-act="cmdp-run" data-i="${idx}" aria-selected="${idx===state.cmdp.sel}">
          <span class="kind">${esc(it.kind)}</span>
          <span class="trunc grow">${esc(it.label)}</span>
          <span class="fs-xs muted trunc" style="max-width:180px">${esc(it.sub)}</span></div>`;
      }).join('')).join('');
    const box = $('#cmdpList');
    if (box) box.innerHTML = html || `<div class="fs-sm muted" style="padding:16px">没有匹配「${esc(state.cmdp.q.text)}」的结果</div>`;
  };
  openModal(`<div class="cmdp">
      <input id="cmdpInput" placeholder="搜索文献 / Idea / 实验 / 参数值" value="${esc(q.text)}">
      <div class="list" id="cmdpList"></div>
      <div class="row g3" style="padding:6px 12px;border-top:1px solid var(--border-subtle);background:var(--neutral-25)">
        <span class="fs-xs muted">↑↓ 选择 · ⏎ 打开 · esc 关闭</span></div>
    </div>`);
  draw();
  const inp = $('#cmdpInput'); if (inp){
    inp.focus();
    inp.addEventListener('input', ()=>{ q.text = inp.value; renderList(); state.cmdp.sel=0; draw(); });
    inp.addEventListener('keydown', ev=>{
      const flat = state.cmdp.groups.flatMap(g=>g.items);
      if (ev.key==='ArrowDown'){ state.cmdp.sel=Math.min(flat.length-1,state.cmdp.sel+1); draw(); ev.preventDefault(); }
      else if (ev.key==='ArrowUp'){ state.cmdp.sel=Math.max(0,state.cmdp.sel-1); draw(); ev.preventDefault(); }
      else if (ev.key==='Enter'){ const it=flat[state.cmdp.sel]; if(it){ closeModal(); runAct(it.act, it.val); } }
    });
  }
}
