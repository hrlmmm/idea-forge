
/* ══════════════════════════════════════════════════════════════════════════
 * 抽屉内容：文献详情 / 衍生 Idea / 矩阵下钻 / 加条件 / 调整维度 / 指标菜单
 * ════════════════════════════════════════════════════════════════════════*/
function drawerLit(l){
  return `<div class="drawer-head"><div class="grow">
      <div class="fs-md">${esc(l.title)}</div>
      <div class="fs-sm muted mt1">${esc(l.authors)} · ${l.year} · ${esc(l.venue)}</div></div>
      <button class="btn ghost icon" data-act="close-drawer">✕</button></div>
    <div class="drawer-body">
      <div class="row wrap g1 mb3">${l.tags.map(t=>chip(t)).join('')}
        <span class="chip ${l.derived.length?'sel':''}">${l.derived.length?'已衍生 '+l.derived.length+' 个 Idea':'未衍生'}</span></div>
      <div class="fs-xs muted mb2" style="letter-spacing:.06em">笔记</div>
      <div class="fs-base" style="line-height:1.75;color:var(--neutral-700);background:var(--neutral-50);padding:var(--sp-3);border-radius:var(--r-md)">
        ${l.note?esc(l.note):'<span class="muted">还没有笔记 —— 让 agent 帮你读一遍并写摘要。</span>'}</div>
      ${l.derived.length?`<div class="fs-xs muted mt4 mb2" style="letter-spacing:.06em">已衍生的 Idea</div>
        <div class="col g1">${l.derived.map(id=>`<button class="btn ghost sm" style="justify-content:flex-start" data-act="open-idea" data-val="${id}">🌳 ${esc((ideaById(id)||{}).name||id)}</button>`).join('')}</div>`:''}
      <div class="fs-xs muted mt4">添加于 ${esc(l.addedAt)} · <span class="mono">papers/${esc(l.id)}.pdf</span></div>
    </div>
    <div class="drawer-foot">
      <button class="btn" data-act="copy-path" data-val="papers/${esc(l.id)}.pdf">复制路径</button>
      <button class="btn primary" data-act="derive-idea" data-val="${l.id}">+ 衍生 Idea</button>
    </div>`;
}
function drawerDerive(l){
  const roots = IDEAS.filter(i=>!i.parent);
  return `<div class="drawer-head"><div class="grow"><div class="fs-md">从文献衍生 Idea</div>
      <div class="fs-sm muted mt1 trunc">${esc(l.title)}</div></div>
      <button class="btn ghost icon" data-act="close-drawer">✕</button></div>
    <div class="drawer-body">
      <div class="mb3"><div class="fs-xs muted mb1">① Idea 名称</div>
        <input class="inp" style="width:100%" value="${esc(l.title.slice(0,40))}" id="newIdeaName"></div>
      <div class="mb3"><div class="fs-xs muted mb1">② 父节点</div>
        <select class="sel" style="width:100%;height:32px" id="newIdeaParent">
          <option value="">未分类 Idea（根）</option>
          ${IDEAS.map(i=>`<option value="${i.id}">${'　'.repeat(depthOf(i.id))}${esc(i.name)}</option>`).join('')}
        </select></div>
      <div class="mb3"><div class="fs-xs muted mb1">③ 关联文献</div>
        <div class="row wrap g1">${chip(l.title.slice(0,28)+'…')}<button class="chip" data-act="noop">+ 添加</button></div></div>
      <div class="mb3"><div class="fs-xs muted mb1">④ 一句话假设</div>
        <textarea class="inp" rows="4" id="newIdeaHyp" placeholder="这个想法想验证什么？">基于《${esc(l.title.slice(0,20))}》的方法，在 …</textarea></div>
    </div>
    <div class="drawer-foot">
      <button class="btn" data-act="close-drawer">取消</button>
      <button class="btn primary" data-act="create-idea" data-val="${l.id}">创建 Idea</button>
    </div>`;
}
function depthOf(id){ let d=0,c=id; while(c){ const i=ideaById(c); if(!i||!i.parent) break; d++; c=i.parent; } return d; }

function drawerMatrixCell(vid, col){
  const v = versionById(vid);
  const bucket = state.mtx.bucket||'week';
  const exps = [];
  EXPERIMENTS.forEach(e=>{ if (e.versionId===vid && bucketOf(e,bucket)===col && filterRows([e]).length) exps.push(e); });
  const mk = topMetricKey(exps);
  return `<div class="drawer-head"><div class="grow">
      <div class="fs-md mono">${esc(v?v.name:'')} · ${esc(col)}</div>
      <div class="fs-sm muted mt1">${exps.length} 次实验 · ${bucket==='batch'?'batch 分桶':'按'+({day:'天',week:'周',month:'月'}[bucket])+'分桶'}</div></div>
      <button class="btn ghost icon" data-act="close-drawer">✕</button></div>
    <div class="drawer-body" style="padding:0">
      <div class="row g2" style="padding:var(--sp-2) var(--sp-3);border-bottom:1px solid var(--border-subtle)">
        <button class="btn ghost sm" data-act="new-page" data-val="${vid}">在新页打开完整列表 ↗</button>
        <span class="grow"></span><span class="fs-xs muted">点击行进入实验详情</span></div>
      <table class="t"><thead><tr><th>实验</th><th style="width:88px">状态</th>
        <th class="num mono">${esc(mk||'主指标')}</th><th>创建时间</th></tr></thead><tbody>
      ${exps.map(e=>`<tr data-act="open-exp" data-val="${e.id}" style="cursor:pointer">
        <td class="mono">${esc(e.id)}</td><td>${statusBadge(e)}</td>
        <td class="num mono">${esc(fmtNum((e.metrics||{})[mk]))}</td>
        <td class="fs-xs muted">${esc(fmtTime(e.createdAt))}</td></tr>`).join('')}
      </tbody></table>
    </div>`;
}
function drawerHeatCell(aKey, bKey, a, b){
  const metric = state.chart.metric || (keyUnion(EXPERIMENTS,'metrics')[0]||{}).key;
  const vid = state.versionId;
  const exps = expsOfVersion(vid).filter(e=>normVal(e.params[aKey])===a && normVal(e.params[bKey])===b);
  return `<div class="drawer-head"><div class="grow">
      <div class="fs-md mono">${esc(aKey)}=${esc(a)} · ${esc(bKey)}=${esc(b)}</div>
      <div class="fs-sm muted mt1">${exps.length} 次实验</div></div>
      <button class="btn ghost icon" data-act="close-drawer">✕</button></div>
    <div class="drawer-body" style="padding:0">
      <table class="t"><thead><tr><th>实验</th><th style="width:88px">状态</th><th class="num mono">${esc(metric||'')}</th></tr></thead>
      <tbody>${exps.map(e=>`<tr data-act="open-exp" data-val="${e.id}" style="cursor:pointer">
        <td class="mono">${esc(e.id)}</td><td>${statusBadge(e)}</td>
        <td class="num mono">${esc(fmtNum((e.metrics||{})[metric]))}</td></tr>`).join('')}</tbody></table>
    </div>`;
}
function drawerAddCond(rows){
  const pk = keyUnion(rows,'params').map(x=>x.key), mk = keyUnion(rows,'metrics').map(x=>x.key);
  return `<div class="drawer-head"><div class="grow"><div class="fs-md">加筛选条件</div>
      <div class="fs-sm muted mt1">键下拉来自当前实验集合的 params / metrics 键并集</div></div>
      <button class="btn ghost icon" data-act="close-drawer">✕</button></div>
    <div class="drawer-body">
      <div class="row g2 mb3">
        <select class="sel" id="condKey" data-act="cond-key" style="height:32px;flex:1">
          <optgroup label="params">${pk.map(k=>`<option value="params:${esc(k)}">${esc(k)} · ${cardinality(rows,'params',k)} 个取值</option>`).join('')}</optgroup>
          <optgroup label="metrics">${mk.map(k=>`<option value="metrics:${esc(k)}">${esc(k)} · ${cardinality(rows,'metrics',k)} 个取值</option>`).join('')}</optgroup>
        </select>
        <select class="sel" id="condOp" style="height:32px;width:88px">${OPS.map(([t,v])=>`<option value="${v}">${t}</option>`).join('')}</select>
      </div>
      <div class="fs-xs muted mb2">值控件：该键取值 ≤ 8 个 → 多选 chips；否则输入框</div>
      <div id="condVal"></div>
      <div class="banner neutral mt3"><span>ⓘ</span><span>多个条件之间为 AND。条件会同步进 URL，可分享、刷新保持。</span></div>
    </div>
    <div class="drawer-foot"><button class="btn" data-act="close-drawer">取消</button>
      <button class="btn primary" data-act="commit-cond">添加条件</button></div>`;
}
/** 值控件：基数 ≤ 8 → 多选 chips；否则输入框 */
function renderCondVal(){
  const box = document.querySelector('#condVal'); if(!box) return;
  const keySel = document.querySelector('#condKey'); if(!keySel) return;
  const [field, key] = keySel.value.split(':');
  const rows = state.condRows || EXPERIMENTS;
  const vals = valuesOf(rows, field, key);
  if (vals.length && vals.length <= 8){
    box.innerHTML = `<div class="row wrap g1">${vals.map(v=>
      `<button class="chip mono" data-act="cond-pick" data-v="${esc(String(v))}"><span class="ck" data-v="${esc(String(v))}"></span>${esc(fmtNum(v))}</button>`).join('')}</div>`;
  } else {
    box.innerHTML = `<input class="inp" style="width:100%" placeholder="输入值（当前键有 ${vals.length} 个不同取值）">`;
  }
}
function drawerEditDims(vid){
  const rows = expsOfVersion(vid);
  const all = keyUnion(rows,'params');
  const cur = state.famDims[vid] || all.filter(x=>!RE_REPEAT.test(x.key) && cardinality(rows,'params',x.key)>1).map(x=>x.key);
  return `<div class="drawer-head"><div class="grow"><div class="fs-md">调整差异维度</div>
      <div class="fs-sm muted mt1">勾选参与分组的键 · 本地重算，不写库</div></div>
      <button class="btn ghost icon" data-act="close-drawer">✕</button></div>
    <div class="drawer-body" style="padding:0">
      ${all.map(x=>{
        const isRep = RE_REPEAT.test(x.key);
        const card = cardinality(rows,'params',x.key);
        const on = cur.includes(x.key);
        return `<label class="row g3" style="padding:8px var(--sp-4);border-bottom:1px solid var(--border-subtle);cursor:pointer">
          <span class="ck ${on?'on':''}" data-act="dim-toggle" data-val="${esc(x.key)}"></span>
          <span class="mono grow">${esc(x.key)}</span>
          ${isRep?'<span class="chip sm">repeat 键 · 默认排除</span>':''}
          <span class="fs-xs muted">${card} 个取值</span></label>`;}).join('')}
    </div>
    <div class="drawer-foot"><button class="btn" data-act="reset-dims" data-val="${vid}">恢复自动</button>
      <button class="btn primary" data-act="close-drawer">完成</button></div>`;
}

/* ══════════════════════════════════════════════════════════════════════════
 * Popover
 * ════════════════════════════════════════════════════════════════════════*/
function openPopover(anchor, html, width){
  closePopover();
  const app = $('#app');
  const d = document.createElement('div');
  d.className = 'popover card';
  d.style.cssText = `position:absolute;z-index:75;width:${width||260}px;box-shadow:var(--shadow-lg);padding:var(--sp-3);animation:fadeIn .14s`;
  d.innerHTML = html;
  app.appendChild(d);
  const ar = app.getBoundingClientRect(), r = anchor.getBoundingClientRect();
  let x = r.left - ar.left, y = r.bottom - ar.top + 6;
  x = Math.max(8, Math.min(x, ar.width - (width||260) - 8));
  d.style.left = x+'px'; d.style.top = y+'px';
  setTimeout(()=>document.addEventListener('click', closePopover, {once:true}), 0);
  return d;
}
function closePopover(){ document.querySelectorAll('#app .popover').forEach(n=>n.remove()); }

/* ══════════════════════════════════════════════════════════════════════════
 * 动作分发
 * ════════════════════════════════════════════════════════════════════════*/
function runAct(act, val, el, ev){
  switch(act){
    /* ---- 导航 ---- */
    case 'nav': state.sel.clear(); go(val, {}); break;
    case 'open-idea': go('idea', {ideaId:val}); break;
    case 'open-version': { const v=versionById(val); go('version', {ideaId:v?v.ideaId:null, versionId:val}, {view:state.query.view||'table'}); break; }
    case 'open-exp': { const e=expById(val); go('experiment', {ideaId:e.ideaId, versionId:e.versionId, expId:val}); break; }
    case 'open-matrix': { const v=versionById(val); go('version', {ideaId:v.ideaId, versionId:val}, {view:'matrix'}); break; }
    case 'open-diff': { const v=versionById(val); go('version', {ideaId:v.ideaId, versionId:val}, {view:'diff'}); break; }
    case 'open-chart': { const v=versionById(val); go('version', {ideaId:v.ideaId, versionId:val}, {view:'chart'}); break; }
    case 'back': history.back(); break;
    case 'new-page': { const v=versionById(val); go('version',{ideaId:v.ideaId,versionId:val},{view:'table'}); closeDrawer(); break; }

    /* ---- 视图切换（同步进 query） ---- */
    case 'set-view': state.query.view=val; syncHash(); renderAll(); break;
    case 'set-ideatab': state.query.tab=val; syncHash(); renderAll(); break;
    case 'set-inboxtab': state.query.tab=val; syncHash(); renderAll(); break;
    case 'set-expmode': state.query.mode=val; syncHash(); renderAll(); break;
    case 'set-scope': state.tableScope=val; renderAll(); break;
    case 'set-mxscope': state.mtx.scope=val; renderAll(); break;
    case 'set-chart': state.chart.type=val; state.chart.brush=null; renderAll(); break;
    case 'set-status': case 'set-status-sel': state.mtx.status=val; renderAll(); break;
    case 'set-metric': state.mtx.metric=val; state.mtx.agg='auto'; renderAll(); break;
    case 'cycle-metric': {
      const v=versionById(state.versionId); const rows=expsOfVersion(v.id);
      const ks=metricKeys(rows); const i=ks.indexOf(state.mtx.metric);
      state.mtx.metric=ks[(i+1)%ks.length]; state.mtx.agg='auto'; renderAll(); break; }
    case 'set-agg': state.mtx.agg=val; renderAll(); break;
    case 'set-norm': state.mtx.norm=val; renderAll(); break;
    case 'set-bucket': state.mtx.bucket=val; renderAll(); break;
    case 'toggle-cols': state.onlyDiffCols = state.onlyDiffCols===false; renderAll(); break;
    case 'sort': {
      const k=val;
      state.sort = (state.sort&&state.sort.key===k) ? {key:k, dir:-state.sort.dir} : {key:k, dir:1};
      renderAll(); break; }

    /* ---- 文献 ---- */
    case 'open-lit': { const l=LITERATURE.find(x=>x.id===val); if(l) openDrawer(drawerLit(l)); break; }
    case 'derive-idea': { const l=LITERATURE.find(x=>x.id===val); if(l) openDrawer(drawerDerive(l)); break; }
    case 'create-idea': {
      const name = ($('#newIdeaName')||{}).value || '未命名 Idea';
      closeDrawer(); toast(`已创建 Idea「<b>${esc(name)}</b>」，并关联 1 篇文献`,'ok');
      break; }
    case 'toggle-tag': { const t=val; const i=state.lit.tags.indexOf(t);
      if(i>=0) state.lit.tags.splice(i,1); else state.lit.tags.push(t); renderAll(); break; }
    case 'lit-clear': state.lit.q=''; renderAll(); break;
    case 'lit-reset': state.lit={q:'',tags:[],derived:'all',sort:'recent',mode:state.lit.mode}; renderAll(); break;
    case 'set-derived': state.lit.derived=val; renderAll(); break;
    case 'set-litmode': state.lit.mode=val; renderAll(); break;
    case 'import-lit': toast('已打开系统文件选择器（原型不执行真实导入）','info'); break;
    case 'add-lit': toast('可搜索本地文献库后关联（原型示意）','info'); break;
    case 'unlink-lit': { const [iid,lid]=val.split('|'); const i=ideaById(iid);
      i.lit = i.lit.filter(x=>x!==lid); toast('已解绑该文献','ok'); renderAll(); break; }

    /* ---- 矩阵 ---- */
    case 'mx-cell': {
      const vid = el.getAttribute('data-v'), col = el.getAttribute('data-c');
      if (ev && (ev.ctrlKey||ev.metaKey)){
        state.cmpCells = state.cmpCells||[];
        const k = vid+'|'+col;
        if (state.cmpCells.includes(k)) state.cmpCells = state.cmpCells.filter(x=>x!==k);
        else state.cmpCells.push(k);
        if (state.cmpCells.length>=2){
          toast(`已选中 2 格，进入实验集合对比`,'ok');
          state.cmpCells=[]; renderAll();
        } else renderAll();
      } else openDrawer(drawerMatrixCell(vid,col));
      break; }
    case 'heat-cell': openDrawer(drawerHeatCell(state.chart.x.split(':')[1], state.chart.y.split(':')[1],
        el.getAttribute('data-a'), el.getAttribute('data-b'))); break;

    /* ---- 表格多选 + diff ---- */
    case 'sel': { if(state.sel.has(val)) state.sel.delete(val); else state.sel.add(val); renderAll(); break; }
    case 'sel-all': {
      const v=versionById(state.versionId); const rows=filterRows(expsOfVersion(v.id));
      if (state.sel.size===rows.length) state.sel.clear(); else rows.forEach(e=>state.sel.add(e.id));
      renderAll(); break; }
    case 'clear-sel': state.sel.clear(); renderAll(); break;
    case 'do-diff': {
      const arr = Array.from(state.sel).slice(0,2);
      if (arr.length<2){ toast('请至少勾选 2 个实验','warn'); break; }
      state.diff.a=arr[0]; state.diff.b=arr[1]; state.sel.clear();
      const v=versionById(state.versionId); go('version',{ideaId:v.ideaId,versionId:v.id},{view:'diff'}); break; }
    case 'set-diffa': state.diff.a=val; renderAll(); break;
    case 'set-diffb': state.diff.b=val; renderAll(); break;
    case 'swap-diff': { const a=state.diff.a; state.diff.a=state.diff.b; state.diff.b=a; renderAll(); break; }
    case 'toggle-onlydiff': state.diff.onlyDiff=!state.diff.onlyDiff; renderAll(); break;
    case 'set-baseline': toast('已设为该版本的 baseline（原型仅记录视图预设）','ok'); break;
    case 'copy-md': {
      const A=expById(state.diff.a), B=expById(state.diff.b);
      const keys=keyUnion([A,B],'params').map(x=>x.key).sort();
      const lines=['| 键 | '+A.id+' | '+B.id+' | Δ |','|---|---|---|---|'];
      keys.forEach(k=>{ const av=A.params[k], bv=B.params[k];
        if (normVal(av)===normVal(bv)) return;
        lines.push(`| \`${k}\` | ${fmtNum(av)} | ${fmtNum(bv)} | ${delta(av,bv,k,'param').text} |`); });
      copyText(lines.join('\n')); toast('已复制 Markdown 表格','ok'); break; }
    case 'toggle-same': {
      const sec=el.getAttribute('data-sec');
      document.querySelectorAll(`[data-same="${sec}"]`).forEach(n=>n.style.display = n.style.display==='none'?'':'none');
      break; }
    case 'fam-diff': {
      const rows=expsOfVersion(state.versionId);
      const cl=clusterFamilies(rows, state.famDims[state.versionId]);
      const f=cl.families.find(x=>x.id===val); if(!f) break;
      const mk=topMetricKey(rows);
      const sorted=f.members.slice().sort((a,b)=>{
        const av=(a.metrics||{})[mk],bv=(b.metrics||{})[mk];
        if(!isNum(av))return 1; if(!isNum(bv))return -1;
        return state.directions[mk]===false? av-bv : bv-av; });
      state.diff.a=sorted[0].id; state.diff.b=(sorted[1]||sorted[0]).id; renderAll(); break; }
    case 'fam-expand': state.expandedFam = state.expandedFam===val?null:val; renderAll(); break;
    case 'edit-dims': openDrawer(drawerEditDims(val)); break;
    case 'dim-toggle': {
      const vid=state.versionId; const rows=expsOfVersion(vid);
      const cur = state.famDims[vid] || keyUnion(rows,'params').filter(x=>!RE_REPEAT.test(x.key)&&cardinality(rows,'params',x.key)>1).map(x=>x.key);
      const i=cur.indexOf(val); if(i>=0) cur.splice(i,1); else cur.push(val);
      state.famDims[vid]=cur; state.diffNote='已按手动维度重算（仅存为视图预设，不写库）';
      openDrawer(drawerEditDims(vid)); renderAll(); break; }
    case 'reset-dims': { delete state.famDims[val]; state.diffNote=null; closeDrawer(); renderAll(); break; }

    /* ---- 筛选条件 ---- */
    case 'add-cond': {
      state.condRows = state.versionId ? expsOfVersion(state.versionId) : EXPERIMENTS;
      openDrawer(drawerAddCond(state.condRows)); renderCondVal(); break; }
    case 'cond-key': renderCondVal(); break;
    case 'cond-pick': {
      const ck = el.querySelector('.ck') || el;
      const was = ck.classList.contains('on');
      document.querySelectorAll('#condVal .ck').forEach(n=>n.classList.remove('on'));
      if (!was) ck.classList.add('on');
      break; }
    case 'del-cond': state.mtx.conds.splice(Number(val),1); renderAll(); break;
    case 'clear-cond': state.mtx.conds=[]; state.mtx.status='all'; renderAll(); break;
    case 'commit-cond': {
      const k=($('#condKey')||{}).value, op=($('#condOp')||{}).value;
      const vin=document.querySelector('#condVal .ck.on');
      const v2 = vin ? vin.getAttribute('data-v') : (($('#condVal input')||{}).value||'');
      if (k&&op&&String(v2)!==''){ state.mtx.conds.push({key:k.split(':')[1], field:k.split(':')[0], op, val:v2}); closeDrawer(); renderAll(); }
      else toast('请选择键与值','warn');
      break; }

    /* ---- 图表 ---- */
    case 'set-axis': {
      const which = el.getAttribute('data-which');
      if (which==='x') state.chart.x=val; else state.chart.y=val;
      state.chart.brush=null; renderAll(); break; }
    case 'set-fixed': { const k=el.getAttribute('data-key'); state.chart.fixed[k]=val; renderAll(); break; }
    case 'clear-brush': state.chart.brush=null; renderAll(); break;

    /* ---- 实验详情 ---- */
    case 'set-base': state.baseOverride = val; renderAll(); break;
    case 'toggle-kvdiff': state.onlyDiff=!state.onlyDiff; renderAll(); break;
    case 'toggle-artifacts': state.openArts=!state.openArts; renderAll(); break;
    case 'copy-json': copyText(JSON.stringify(expById(val).params,null,2)); toast('参数 JSON 已复制','ok'); break;
    case 'copy-path': copyText(val); toast('路径已复制','ok'); break;
    case 'copy-cmd': toast('已复制：python train.py --config …（平台不执行代码）','info'); break;
    case 'open-log': toast('已在默认编辑器打开完整日志（原型示意）','info'); break;
    case 'clone-exp': {
      const e=expById(val);
      openDrawer(`<div class="drawer-head"><div class="grow"><div class="fs-md">复制参数新建实验</div>
          <div class="fs-sm muted mt1">基于 ${esc(e.id)} · 差异键已高亮</div></div>
          <button class="btn ghost icon" data-act="close-drawer">✕</button></div>
        <div class="drawer-body"><table class="kv">${Object.keys(expById(val).params).sort().slice(0,6).map((k,i)=>
          `<tr class="${i<3?'chg':''}"><td class="k">${esc(k)}</td><td class="v">${esc(fmtNum(expById(val).params[k]))}</td></tr>`).join('')}</table>
          <div class="banner info mt3"><span>ⓘ</span><span>你改了 3 个参数。平台不执行代码 —— 创建后复制命令到本地运行。</span></div></div>
        <div class="drawer-foot"><button class="btn" data-act="close-drawer">取消</button>
          <button class="btn primary" data-act="create-exp">创建（待运行）</button></div>`);
      break; }
    case 'create-exp': closeDrawer(); toast('已在当前版本下创建实验（pending）','ok','复制运行命令',()=>toast('python train.py --config exp-new.yaml','info')); break;
    case 'recollect': toast('已向 agent 下发「重新回收指标」任务','info'); break;
    case 'reanalyze': {
      state.anLoading=val; renderAll();
      setTimeout(()=>{ state.anLoading=null; renderAll();
        toast('Agent 已写回一份新的分析','ok','查看',()=>{ go('experiment',{ideaId:expById(val).ideaId,versionId:expById(val).versionId,expId:val}); });
      }, 1400); break; }
    case 'exp-more': openPopover(el, `<div class="col g1">
        <button class="btn ghost sm" style="justify-content:flex-start" data-act="copy-json" data-val="${val}">复制 params 为 JSON</button>
        <button class="btn ghost sm" style="justify-content:flex-start" data-act="set-baseline" data-val="${val}">设为该版本 baseline</button>
        <button class="btn ghost sm" style="justify-content:flex-start;color:var(--danger-600)" data-act="archive-exp" data-val="${val}">软删除此实验</button></div>`); break;
    case 'archive-exp': closePopover(); toast('已软删除（元数据保留，可恢复）','ok'); break;
    case 'metric-menu': {
      const k=val; const cur=state.directions[k];
      openPopover(el, `<div class="col g1">
          <button class="btn ghost sm" style="justify-content:flex-start" data-act="pin-metric" data-val="${esc(k)}">${state.pinned.includes(k)?'取消 pin':'📌 pin 到概览'}</button>
          <button class="btn ghost sm" style="justify-content:flex-start" data-act="dir-metric" data-val="${esc(k)}|true">声明：越大越好${cur===true?' ✓':''}</button>
          <button class="btn ghost sm" style="justify-content:flex-start" data-act="dir-metric" data-val="${esc(k)}|false">声明：越小越好${cur===false?' ✓':''}</button>
          <button class="btn ghost sm" style="justify-content:flex-start" data-act="dir-metric" data-val="${esc(k)}|none">不声明方向（Δ 保持中性灰）</button></div>`, 240);
      break; }
    case 'pin-metric': { const i=state.pinned.indexOf(val);
      if(i>=0) state.pinned.splice(i,1); else state.pinned.push(val); closePopover(); renderAll(); break; }
    case 'dir-metric': { const [k,d]=val.split('|');
      if (d==='none') delete state.directions[k]; else state.directions[k]=(d==='true');
      closePopover(); renderAll();
      toast(d==='none'?`已取消「<span class="mono">${esc(k)}</span>」的方向声明，Δ 恢复中性灰`
        :`已声明「<span class="mono">${esc(k)}</span>」${d==='true'?'越大越好':'越小越好'}，Δ 开始染色`,'ok'); break; }

    /* ---- 分析 ---- */
    case 'toggle-an': { state.expandedAn=state.expandedAn||new Set();
      if(state.expandedAn.has(val)) state.expandedAn.delete(val); else state.expandedAn.add(val); renderAll(); break; }
    case 'read-an': state.readAn.add(val); renderAll(); break;
    case 'read-all': unreadAnalyses().forEach(a=>state.readAn.add(a.id)); renderAll(); break;
    case 'adopt-an': { const a=ANALYSES.find(x=>x.id===val);
      const cur = state.adopted[val]!==undefined? state.adopted[val] : a.adopted;
      state.adopted[val]=!cur; renderAll(); break; }
    case 'an-more': openPopover(el, `<div class="col g1">
        <button class="btn ghost sm" style="justify-content:flex-start" data-act="copy-md">复制为 Markdown</button>
        <button class="btn ghost sm" style="justify-content:flex-start" data-act="view-history" data-val="${val}">查看历史版本</button>
        <button class="btn ghost sm" style="justify-content:flex-start" data-act="copy-cmd">复制链接</button></div>`); break;
    case 'view-history': closePopover(); toast('v0.1 只保留原文快照，不做富文本 diff','info'); break;

    /* ---- 收件箱 ---- */
    case 'approve': { state.proposalState[val]='approved'; renderAll();
      toast('已批准 —— 在 b2 下创建 exp-051（待运行）','ok','复制运行命令',()=>toast('python train.py --config exp-051.yaml','info')); break; }
    case 'reject': openModal(`<div style="padding:var(--sp-4)">
        <div class="fs-md mb2">拒绝这条提议</div>
        <div class="fs-sm muted mb3">（可选）告诉 agent 为什么拒绝 —— 内容会作为下次提议的约束回写。</div>
        <textarea class="inp" rows="4" style="width:100%" placeholder="例如：这个组合上周已经试过，条件数会爆炸"></textarea>
        <div class="row g2 mt4" style="justify-content:flex-end">
          <button class="btn" data-act="close-modal">取消</button>
          <button class="btn danger" data-act="reject-confirm" data-val="${val}">拒绝</button></div></div>`, {sm:true}); break;
    case 'reject-confirm': state.proposalState[val]='rejected'; closeModal(); renderAll(); toast('已拒绝，理由已回写给 agent','ok'); break;
    case 'modify-prop': closePopover(); toast('已打开参数编辑抽屉（差异键高亮）','info'); break;
    case 'approve-sel': case 'reject-sel': toast('批处理操作条（原型示意）','info'); break;
    case 'pick-prop': el.classList.toggle('on'); break;

    /* ---- 顶栏 / 外壳 ---- */
    case 'open-cmd': openCmdK(); break;
    case 'cmdp-run': { const flat=state.cmdp.groups.flatMap(g=>g.items); const it=flat[Number(val)];
      if(it){ closeModal(); runAct(it.act, it.val); } break; }
    case 'activity': {
      const rs = runningExps();
      openPopover(el, `<div class="fs-xs muted mb2">运行中的实验 ${rs.length}</div>` + rs.map(e=>
        `<button class="btn ghost sm mb1" style="width:100%;justify-content:flex-start" data-act="open-exp" data-val="${e.id}">
          <span class="live-dot"></span><span class="mono">${esc(e.id)}</span>
          <span class="grow"></span><span class="fs-xs muted">${esc(e.elapsed||'')}</span></button>`).join(''), 260);
      break; }
    case 'qr': openPopover(el, `<div class="center col g2" style="align-items:center">
        <div style="background:#fff;padding:8px;border-radius:8px;border:1px solid var(--border)">${qrSvg(PROJECT.lanUrl)}</div>
        <div class="fs-sm strong">在手机上打开</div>
        <div class="fs-xs muted mono">${esc(PROJECT.lanUrl)}</div>
        <div class="fs-xs muted">同一 local core · token 已附在 URL 中</div></div>`, 240); break;
    case 'more': openPopover(el, `<div class="col g1">
        <button class="btn ghost sm" style="justify-content:flex-start" data-act="reindex">重建索引</button>
        <button class="btn ghost sm" style="justify-content:flex-start" data-act="copy-cmd">复制 MCP 配置</button>
        <button class="btn ghost sm" style="justify-content:flex-start" data-act="noop">设置</button></div>`); break;
    case 'reindex': closePopover(); toast('索引重建完成 · 扫描 50 个实验、10 篇文献','ok'); break;
    case 'toggle-sidebar': state.collapsedSidebar=!state.collapsedSidebar; renderAll(); break;
    case 'project-switch': openPopover(el, `<div class="fs-xs muted mb2">本地项目（仓库根目录）</div>
        <button class="btn ghost sm mb1" style="width:100%;justify-content:flex-start">⬢ IM-复杂网络 · 当前</button>
        <button class="btn ghost sm" style="width:100%;justify-content:flex-start" data-act="noop">⬢ 图表示学习综述</button>`, 240); break;
    case 'new-idea': toast('新建 Idea 表单（原型示意）','info'); break;
    case 'new-version': toast('创建 Version 需要一次 git 提交 —— 平台只记 ref，不存代码','info'); break;
    case 'idea-filter': openPopover(el, `<div class="fs-xs muted mb2">状态筛选</div>
      ${['active','validated','abandoned'].map(s=>`<label class="row g2" style="padding:3px 0;cursor:pointer">
        <span class="ck on" data-act="noop"></span><span class="fs-sm">${{active:'活跃',validated:'已验证',abandoned:'已放弃'}[s]}</span></label>`).join('')}`, 200); break;
    case 'zoom': { const c=state.tree||(state.tree={x:40,y:24,s:1});
      if(val==='in') c.s=Math.min(2,c.s*1.2); else if(val==='out') c.s=Math.max(.5,c.s/1.2); else { c.s=1; c.x=40; c.y=24; }
      applyTree(); break; }
    case 'matrix-of-idea': { const vs=versionsOfIdea(state.ideaId);
      if(!vs.length){ toast('这个 Idea 还没有版本','warn'); break; }
      go('version',{ideaId:state.ideaId,versionId:vs[vs.length-1].id},{view:'matrix'}); break; }

    /* ---- 弹层 ---- */
    case 'close-drawer': closeDrawer(); break;
    case 'close-modal': closeModal(); break;
    case 'toast-act': { const fn=(state.toastActs||{})[val]; if(fn) fn(); break; }
    case 'noop': break;
    default: break;
  }
}
function copyText(t){
  try{
    if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(t); return; }
  }catch(e){}
  const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta);
  ta.select(); try{ document.execCommand('copy'); }catch(e){} ta.remove();
}

/* ══════════════════════════════════════════════════════════════════════════
 * 渲染主循环
 * ════════════════════════════════════════════════════════════════════════*/
function renderView(){
  const v = $('#view');
  v.className = 'view';
  if (state.demo==='loading'){ v.innerHTML = skeletonView(); return; }
  if (state.demo==='error'){ v.innerHTML = errState('无法读取本地索引'); return; }
  if (state.demo==='empty' && state.name!=='literature'){
    v.innerHTML = emptyState('◻','这里还没有数据','当前视图没有可展示的内容 —— 这是空态示意。',
      `<button class="btn primary" data-act="demo" data-val="normal">恢复正常</button>`);
    return;
  }
  switch(state.name){
    case 'today': v.innerHTML = viewToday(); break;
    case 'literature': v.innerHTML = viewLiterature(); break;
    case 'ideas': v.className='view flush'; v.innerHTML = viewIdeas(); postTree(); break;
    case 'idea': v.innerHTML = viewIdea(); break;
    case 'version': v.innerHTML = viewVersion(); break;
    case 'experiment': v.innerHTML = viewExperiment(); break;
    case 'experiments': v.innerHTML = viewExperiments(); break;
    case 'inbox': v.innerHTML = viewInbox(); break;
    default: v.innerHTML = errState('未知路由');
  }
  postCharts();
}
function renderAll(){
  const app = $('#app');
  app.setAttribute('data-density', effectiveDensity());
  app.setAttribute('data-device', state.device);
  app.setAttribute('data-sidebar', state.collapsedSidebar?'collapsed':'expanded');
  renderSidebar(); renderTopbar(); renderCrumbs(); renderTabbar();
  renderView(); renderLayers();
  syncDemoBar();
}

/* ---- Idea 画布 ---- */
function postTree(){
  const cv = $('#canvas'); if(!cv) return;
  const inner = $('#canvasInner');
  const { nodes, links, NW, NH } = layoutTree();
  const scale = (state.tree&&state.tree.s)||1;
  let svg = `<svg width="4000" height="3000">`;
  links.forEach(l=>{
    const a = nodes.find(n=>n.id===l.from), b = nodes.find(n=>n.id===l.to);
    if(!a||!b) return;
    const x1=a.x+NW, y1=a.y+NH/2, x2=b.x, y2=b.y+NH/2;
    const mx=(x1+x2)/2;
    svg += `<path d="M${x1},${y1} C${mx},${y1} ${mx},${y2} ${x2},${y2}" fill="none" stroke="var(--neutral-300)" stroke-width="2"/>`;
  });
  svg += `</svg>`;
  const mk = topMetricKey(EXPERIMENTS);
  inner.innerHTML = svg + nodes.map(n=>{
    const i = n.idea; const m = n.m; const st = i.status;
    const running = expsOfIdea(i.id).some(e=>e.status==='running');
    const failed = expsOfIdea(i.id).some(e=>e.status==='failed');
    return `<div class="tnode ${st} ${state.ideaId===i.id?'sel':''}" data-node="${i.id}"
        style="left:${n.x}px;top:${n.y}px" tabindex="0" role="button"
        data-tip="${esc(i.name+'\n'+m.nv+' 个版本 · '+m.n+' 次实验'+(m.mk?'\n最佳 '+m.mk+' '+sig(m.val):''))}">
      <span class="st" style="background:${st==='validated'?'var(--success-500)':st==='abandoned'?'var(--neutral-300)':'var(--accent-600)'}"></span>
      ${st==='validated'?'<span class="v">✓</span>':''}
      <div class="t">${esc(i.name)}</div>
      <div class="m">${m.nv} 版本 · ${m.n} 实验${m.mk?` · 最佳 ${esc(m.mk)} ${esc(sig(m.val))}`:''}</div>
      ${running?'<span class="dotr"></span>':failed?'<span class="dotf"></span>':''}
      <button class="ham" data-act="node-menu" data-val="${i.id}">⋯</button>
    </div>`;}).join('');
  applyTree();
  // 交互
  let dragging=false, sx=0, sy=0, ox=0, oy=0;
  cv.onmousedown = ev=>{ if(ev.target.closest('.tnode')) return;
    dragging=true; cv.classList.add('drag');
    sx=ev.clientX; sy=ev.clientY; ox=(state.tree&&state.tree.x)||40; oy=(state.tree&&state.tree.y)||24; };
  window.addEventListener('mouseup', ()=>{ dragging=false; cv && cv.classList.remove('drag'); });
  cv.onmousemove = ev=>{ if(!dragging) return;
    state.tree = state.tree||{x:40,y:24,s:1};
    state.tree.x = ox + (ev.clientX-sx); state.tree.y = oy + (ev.clientY-sy); applyTree(); };
  cv.onwheel = ev=>{ ev.preventDefault(); state.tree=state.tree||{x:40,y:24,s:1};
    const k = ev.deltaY<0?1.08:1/1.08;
    state.tree.s = Math.max(.5, Math.min(2, state.tree.s*k)); applyTree(); };
  inner.querySelectorAll('.tnode').forEach(n=>{
    n.addEventListener('click', ev=>{ if(ev.target.closest('.ham')) return;
      state.ideaId = n.getAttribute('data-node'); syncHash();
      openDrawer(drawerIdea(state.ideaId)); applyTreeSel(); });
    n.addEventListener('dblclick', ev=>{ ev.preventDefault();
      const id=n.getAttribute('data-node');
      state.collapsed = state.collapsed||new Set();
      if(state.collapsed.has(id)) state.collapsed.delete(id); else state.collapsed.add(id);
      renderView(); });
  });
}
function applyTree(){
  const inner = $('#canvasInner'); if(!inner) return;
  const c = state.tree||{x:40,y:24,s:1};
  inner.style.transform = `translate(${c.x}px,${c.y}px) scale(${c.s})`;
  const lab = $('#zoomLabel'); if(lab) lab.textContent = Math.round(c.s*100)+'%';
}
function applyTreeSel(){
  document.querySelectorAll('.tnode').forEach(n=>
    n.classList.toggle('sel', n.getAttribute('data-node')===state.ideaId));
}
function drawerIdea(id){
  const i = ideaById(id); if(!i) return '';
  const m = ideaMetrics(id); const vs = versionsOfIdea(id);
  const kids = childIdeas(id);
  return `<div class="drawer-head"><div class="grow">
      <div class="fs-md">${esc(i.name)}</div>
      <div class="row g2 ac mt1"><span class="chip ${i.status==='validated'?'ok':i.status==='abandoned'?'':'info'} sm">
        ${i.status==='active'?'活跃':i.status==='validated'?'已验证':'已放弃'}</span>
        <span class="fs-xs muted">创建于 ${esc(i.createdAt)}</span></div></div>
      <button class="btn ghost icon" data-act="close-drawer">✕</button></div>
    <div class="drawer-body">
      <div class="fs-xs muted mb1" style="letter-spacing:.06em">假设</div>
      <div class="fs-base" style="line-height:1.75;background:var(--neutral-50);padding:var(--sp-3);border-radius:var(--r-md)">${esc(i.hypothesis)}</div>
      <div class="row g4 mt4">
        ${statBox('版本', vs.length)}${statBox('实验', m.n)}
        ${m.mk?statBox('最佳 '+m.mk, sig(m.val)):''}${statBox('子 Idea', kids.length)}
      </div>
      <div class="fs-xs muted mt4 mb2" style="letter-spacing:.06em">关联文献</div>
      <div class="row wrap g1">${i.lit.map(lid=>{ const l=LITERATURE.find(x=>x.id===lid); if(!l) return '';
        return chip(l.title.slice(0,26)+'…',{x:true,xAct:'unlink-lit',xVal:id+'|'+lid}); }).join('')}
        <button class="chip" data-act="add-lit" data-val="${id}">+ 添加</button></div>
      <div class="fs-xs muted mt4 mb2" style="letter-spacing:.06em">版本</div>
      ${vs.map(v=>`<button class="btn ghost sm mb1" style="width:100%;justify-content:flex-start" data-act="open-version" data-val="${v.id}">
        <span class="mono">${esc(v.name)}</span> <span class="fs-xs muted mono">${esc(v.git)}</span>
        <span class="grow"></span><span class="fs-xs muted">${expsOfVersion(v.id).length} 实验</span></button>`).join('')}
    </div>
    <div class="drawer-foot"><button class="btn" data-act="new-version" data-val="${id}">新建 Version</button>
      <button class="btn primary" data-act="open-idea" data-val="${id}">进入 Idea 详情</button></div>`;
}

/* ---- 平行坐标刷选 ---- */
function postCharts(){
  const svg = $('#pcSvg'); if(!svg || !state.versionId) return;
  const W=900,H=300,P={l:52,r:52,t:34,b:44};
  const v = versionById(state.versionId); const rows = expsOfVersion(v.id);
  const cl = clusterFamilies(rows, state.famDims[v.id]);
  const mKeys = keyUnion(rows,'metrics').filter(x=>isNumericKey(rows,'metrics',x.key));
  const yKey = (state.chart.y||'').split(':')[1];
  const metric = (state.chart.metric && mKeys.some(m=>m.key===state.chart.metric)) ? state.chart.metric
    : ((yKey && mKeys.some(m=>m.key===yKey)) ? yKey : (mKeys[0]?mKeys[0].key:null));
  const axes = cl.dims.filter(k=>isNumericKey(rows,'params',k)).concat(metric?[metric]:[]);
  if (axes.length<2) return;
  const ranges = axes.map(k=>{
    const vals = rows.map(e=>(k===metric? (e.metrics||{})[k] : (e.params||{})[k])).filter(isNum);
    return {k, min:Math.min.apply(null,vals), max:Math.max.apply(null,vals)};
  });
  const X = i => P.l + i*(W-P.l-P.r)/(axes.length-1);
  const Y = (i,val) => { const r=ranges[i]; return H-P.b - (val-r.min)/((r.max-r.min)||1)*(H-P.t-P.b); };
  const toLocal = ev=>{
    const r = svg.getBoundingClientRect();
    return { x:(ev.clientX-r.left)/r.width*W, y:(ev.clientY-r.top)/r.height*H };
  };
  const valAt = (i, y) => { const r=ranges[i];
    return r.min + (H-P.b-y)/(H-P.t-P.b)*(r.max-r.min); };
  let active=null, start=0;
  svg.addEventListener('pointerdown', ev=>{
    const p = toLocal(ev);
    axes.forEach((k,i)=>{ if(Math.abs(p.x-X(i))<12){ active=i; start=p.y; } });
    if (active!==null){ svg.setPointerCapture(ev.pointerId); ev.preventDefault(); }
  });
  svg.addEventListener('pointermove', ev=>{
    if (active===null) return;
    const p = toLocal(ev);
    const lo = Math.min(valAt(active,start), valAt(active,p.y));
    const hi = Math.max(valAt(active,start), valAt(active,p.y));
    state.chart.brush = Object.assign({}, state.chart.brush, {[axes[active]]:[lo,hi]});
    paintBrush();
  });
  svg.addEventListener('pointerup', ev=>{ if(active!==null){ active=null; renderView(); } });
  function paintBrush(){
    document.querySelectorAll('#pcSvg .pc-brush').forEach(n=>n.remove());
    axes.forEach((k,i)=>{
      const b = state.chart.brush && state.chart.brush[k]; if(!b) return;
      const rect = document.createElementNS('http://www.w3.org/2000/svg','rect');
      rect.setAttribute('class','pc-brush');
      rect.setAttribute('x', X(i)-4); rect.setAttribute('width', 8);
      rect.setAttribute('y', Y(i,b[1])); rect.setAttribute('height', Math.max(2, Y(i,b[0])-Y(i,b[1])));
      rect.setAttribute('rx',2); svg.appendChild(rect);
    });
  }
  // hover 高亮
  svg.querySelectorAll('.pc-line').forEach(l=>{
    l.addEventListener('mouseenter', ()=>{
      svg.querySelectorAll('.pc-line').forEach(o=>{ o.classList.add('pc-dim'); o.classList.remove('hi'); });
      l.classList.remove('pc-dim'); l.classList.add('hi');
    });
    l.addEventListener('mouseleave', ()=>{
      svg.querySelectorAll('.pc-line').forEach(o=>o.classList.remove('pc-dim','hi'));
    });
  });
}

/* ══════════════════════════════════════════════════════════════════════════
 * 演示控制条 + 事件绑定 + 启动
 * ════════════════════════════════════════════════════════════════════════*/
function syncDemoBar(){
  document.querySelectorAll('#devSeg button').forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.dev===state.device)));
  document.querySelectorAll('#stateSeg button').forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.st===state.demo)));
  document.querySelectorAll('#densSeg button').forEach(b=>b.setAttribute('aria-pressed', String(b.dataset.ds===state.density)));
}
function bindDemoBar(){
  $('#devSeg').addEventListener('click', ev=>{
    const b = ev.target.closest('button'); if(!b) return;
    state.device = b.dataset.dev;
    if (state.device==='mobile' && state.name==='ideas') state.name='today';
    renderAll();
  });
  $('#stateSeg').addEventListener('click', ev=>{
    const b = ev.target.closest('button'); if(!b) return;
    state.demo = b.dataset.st; renderAll();
  });
  $('#densSeg').addEventListener('click', ev=>{
    const b = ev.target.closest('button'); if(!b) return;
    state.density = b.dataset.ds; renderAll();
  });
}
let litTimer=null;
function bindApp(){
  const app = $('#app');
  app.addEventListener('click', ev=>{
    const t = ev.target.closest('[data-act]');
    if (!t) return;
    const act = t.getAttribute('data-act');
    if (act==='lit-input') return;
    // 行内复选框不触发行点击
    if (act==='sel' || act==='sel-all' || act==='dim-toggle') ev.stopPropagation();
    runAct(act, t.getAttribute('data-val'), t, ev);
  });
  app.addEventListener('change', ev=>{
    const t = ev.target.closest('[data-act]');
    if (!t) return;
    const act = t.getAttribute('data-act');
    if (act==='lit-sort'){ state.lit.sort = t.value; renderAll(); return; }
    runAct(act, t.value, t, ev);
  });
  app.addEventListener('input', ev=>{
    const t = ev.target.closest('[data-act]');
    if (!t) return;
    if (t.getAttribute('data-act')==='lit-input'){
      clearTimeout(litTimer);
      const v = t.value;
      litTimer = setTimeout(()=>{ state.lit.q = v; renderAll();
        const el = $('#litq'); if(el){ el.focus(); el.setSelectionRange(v.length,v.length); } }, 200);
    }
  });
  app.addEventListener('keydown', ev=>{
    if (ev.key==='Enter' || ev.key===' '){
      const t = ev.target.closest('.mx-cell');
      if (t){ ev.preventDefault(); runAct('mx-cell', null, t, ev); }
    }
  });
  document.addEventListener('keydown', ev=>{
    if ((ev.metaKey||ev.ctrlKey) && ev.key.toLowerCase()==='k'){ ev.preventDefault(); closePopover(); openCmdK(); return; }
    if (ev.key==='Escape'){ closePopover(); if(state.modal) closeModal(); else if(state.drawer) closeDrawer(); }
  });
  window.addEventListener('hashchange', ()=>{ if(suppressHash){ suppressHash=false; return; } parseHash(); renderAll(); });
  let rt=null;
  window.addEventListener('resize', ()=>{ clearTimeout(rt); rt=setTimeout(()=>{ if(state.name==='ideas') renderView(); }, 160); });
}

/* 补充样式（移动端降级 + 少量状态变体） */
const MOBILE_CSS = document.createElement('style');
MOBILE_CSS.textContent = `
.btn.ok{background:var(--success-50);border-color:var(--success-500);color:var(--success-600)}
.btn.ok:hover{background:var(--success-50);border-color:var(--success-600)}
.li:hover [data-row-actions]{opacity:1}
.li:hover [data-hover-accent]{color:var(--accent-700);text-decoration:underline}
.app[data-device="mobile"] table.mx tbody th.rh{width:96px;min-width:96px;padding-left:8px}
.app[data-device="mobile"] table.mx thead th.rh{width:96px;min-width:96px}
.app[data-device="mobile"] .mx-cell .mini{display:none}
.app[data-device="mobile"] .mx-cell{min-width:60px}
.app[data-device="mobile"] .card-title{font-size:var(--fs-md)}
.app[data-device="mobile"] .tb-search .kbd{display:none}
.app[data-device="mobile"] .view{padding-bottom:var(--sp-8)}
@media (max-width:768px){
  .app table.mx tbody th.rh{width:96px;min-width:96px}
  .app .mx-cell .mini{display:none}
}
`;
document.head.appendChild(MOBILE_CSS);

/* ---- 启动 ---- */
parseHash();
if (!location.hash) syncHash();
renderAll();
initTooltip();
bindApp();
bindDemoBar();
setTimeout(()=>{
  toast('原型已就绪 · <b>50</b> 次实验 / <b>12</b> 个版本 / <b>7</b> 个 Idea 均为本地 mock','info');
}, 500);
