/* 轻量 DOM shim，用来跑一遍所有视图的渲染路径，捕获运行时错误 */
const fs = require('fs');
const vm = require('vm');

const cache = new Map();
function mkEl(sel){
  const el = {
    _sel: sel, innerHTML:'', textContent:'', value:'', className:'', children:[],
    style:{ setProperty(){}, removeProperty(){} },
    dataset:{},
    classList:{ _s:new Set(),
      add(...c){c.forEach(x=>this._s.add(x))}, remove(...c){c.forEach(x=>this._s.delete(x))},
      toggle(c,f){ const has=this._s.has(c); const on = f===undefined? !has : !!f; on?this._s.add(c):this._s.delete(c); return on; },
      contains(c){return this._s.has(c)} },
    setAttribute(k,v){ this['_attr_'+k]=String(v); },
    getAttribute(k){ return this['_attr_'+k]===undefined? null : this['_attr_'+k]; },
    removeAttribute(k){ delete this['_attr_'+k]; },
    addEventListener(){}, removeEventListener(){}, setPointerCapture(){},
    appendChild(c){ this.children.push(c); return c; },
    removeChild(c){ this.children = this.children.filter(x=>x!==c); },
    remove(){},
    focus(){}, select(){}, setSelectionRange(){},
    querySelector(s){ return mkEl(sel+' '+s); },
    querySelectorAll(){ return []; },
    closest(){ return null; },
    getBoundingClientRect(){ return {left:0,top:0,right:100,bottom:100,width:100,height:100}; },
    offsetWidth:100, offsetHeight:40,
  };
  return el;
}
const KNOWN = new Set(['#app','#sidebar','#topbar','#crumbs','#tabbar','#view','#layers','#canvas',
  '#canvasInner','#zoomLabel','#cmdpList','#cmdpInput','#condKey','#condOp','#condVal',
  '#newIdeaName','#newIdeaParent','#newIdeaHyp','#litq','#gsearch','#demo','#devSeg','#stateSeg',
  '#densSeg','.toasts']);
function q(sel){
  const base = sel.split(' ')[0];
  if (!KNOWN.has(base)) return null;
  if(!cache.has(sel)) cache.set(sel, mkEl(sel)); return cache.get(sel);
}
const document = {
  head: mkEl('head'), body: mkEl('body'),
  querySelector: q,
  querySelectorAll(){ return []; },
  createElement(t){ return mkEl('<'+t+'>'); },
  createElementNS(ns,t){ return mkEl('<'+t+'>'); },
  addEventListener(){}, removeEventListener(){},
  execCommand(){},
};
const window = { addEventListener(){}, removeEventListener(){}, innerWidth:1440, innerHeight:900 };
const location = { hash: '' };
const history = { back(){} };
const navigator = {};
const sandbox = { document, window, location, history, navigator, setTimeout, clearTimeout, setInterval, clearInterval,
  console, Math, Date, JSON, URLSearchParams, Map, Set, Object, Array, String, Number, isFinite, parseFloat, parseInt, RegExp, Error };
sandbox.globalThis = sandbox;
vm.createContext(sandbox);

const code = fs.readFileSync('_check.js','utf8') + `
globalThis.__X = { state, renderView, renderAll, IDEAS, VERSIONS, EXPERIMENTS, LITERATURE, ANALYSES,
  expsOfVersion, versionById, ideaById, keyUnion, cardinality, clusterFamilies, effStatus,
  versionsOfIdea, expsOfIdea, metricKeys, topMetricKey, heatBg, quantileScale, scaleIndex, delta };
`;
try { vm.runInContext(code, sandbox, {filename:'prototype.js'}); }
catch(e){ console.error('INIT ERROR:', e.stack); process.exit(1); }
const X = sandbox.__X;
Object.assign(sandbox, X);

// 逐个路由渲染
const routes = [
  ['ideas', {}, {}],
  ['today', {}, {}],
  ['literature', {}, {}],
  ['idea', {ideaId:'i1'}, {}],
  ['idea', {ideaId:'i2'}, {tab:'analysis'}],
  ['version', {ideaId:'i1',versionId:'v1'}, {view:'table'}],
  ['version', {ideaId:'i1',versionId:'v2'}, {view:'matrix'}],
  ['version', {ideaId:'i1',versionId:'v2'}, {view:'diff'}],
  ['version', {ideaId:'i5',versionId:'v9'}, {view:'chart'}],
  ['version', {ideaId:'i4',versionId:'v7'}, {view:'chart'}],
  ['version', {ideaId:'i5',versionId:'v10'}, {view:'chart'}],
  ['experiment', {ideaId:'i1',versionId:'v1',expId:'exp-002'}, {}],
  ['experiment', {ideaId:'i5',versionId:'v10',expId:'exp-046'}, {}],
  ['experiments', {}, {}],
  ['inbox', {}, {tab:'proposals'}],
  ['inbox', {}, {tab:'analysis'}],
];
let fails = 0;
for (const [name, ids, q] of routes){
  try {
    sandbox.state.name = name; sandbox.state.ideaId = ids.ideaId||null;
    sandbox.state.versionId = ids.versionId||null; sandbox.state.expId = ids.expId||null;
    sandbox.state.query = q;
    sandbox.state.chart = { type:'line', x:null, y:null, fixed:{}, brush:null };
    sandbox.state.demo = 'normal';
    sandbox.renderView();
  } catch(e){ fails++; console.error('ROUTE FAIL', name, JSON.stringify(ids), JSON.stringify(q), '\n  ', e.stack.split('\n').slice(0,4).join('\n   ')); }
}
// 图表三种类型
for (const v of ['v1','v2','v3','v7','v8','v9','v10','v11']){
  for (const t of ['line','heatmap','parallel','table']){
    try {
      sandbox.state.name='version';
      const ver = sandbox.versionById(v);
      sandbox.state.ideaId = ver.ideaId; sandbox.state.versionId = v; sandbox.state.query={view:'chart'};
      sandbox.state.chart = { type:t, x:null, y:null, fixed:{}, brush:null };
      sandbox.renderView();
    } catch(e){ fails++; console.error('CHART FAIL', v, t, '\n  ', e.stack.split('\n').slice(0,4).join('\n   ')); }
  }
}
// 矩阵：所有 idea
for (const i of sandbox.IDEAS.map(x=>x.id)){
  for (const b of ['day','week','month','batch']){
    try{
      const vs = sandbox.versionsOfIdea(i); if(!vs.length) continue;
      sandbox.state.name='version'; sandbox.state.ideaId=i; sandbox.state.versionId=vs[vs.length-1].id;
      sandbox.state.query={view:'matrix'}; sandbox.state.mtx.bucket=b; sandbox.state.mtx.scope='idea';
      sandbox.renderView();
    }catch(e){ fails++; console.error('MATRIX FAIL', i, b, '\n  ', e.stack.split('\n').slice(0,4).join('\n   ')); }
  }
}
// diff / 表格 / 实验详情 全覆盖
for (const v of sandbox.VERSIONS.map(x=>x.id)){
  try{
    const ver = sandbox.versionById(v);
    sandbox.state.name='version'; sandbox.state.ideaId=ver.ideaId; sandbox.state.versionId=v;
    sandbox.state.query={view:'diff'}; sandbox.state.diff={a:null,b:null,onlyDiff:false};
    sandbox.renderView();
    sandbox.state.query={view:'table'}; sandbox.state.sort=null; sandbox.renderView();
  }catch(e){ fails++; console.error('VER FAIL', v, '\n  ', e.stack.split('\n').slice(0,4).join('\n   ')); }
}
for (const e of sandbox.EXPERIMENTS){
  try{
    sandbox.state.name='experiment'; sandbox.state.ideaId=e.ideaId; sandbox.state.versionId=e.versionId;
    sandbox.state.expId=e.id; sandbox.state.query={}; sandbox.state.baseOverride=null;
    sandbox.renderView();
  }catch(err){ fails++; console.error('EXP FAIL', e.id, '\n  ', err.stack.split('\n').slice(0,4).join('\n   ')); }
}
// 移动端
try{
  sandbox.state.device='mobile'; sandbox.renderAll();
  sandbox.state.name='today'; sandbox.renderView();
  sandbox.state.name='literature'; sandbox.renderView();
  sandbox.state.name='ideas'; sandbox.renderView();
  sandbox.state.demo='loading'; sandbox.renderView();
  sandbox.state.demo='error'; sandbox.renderView();
  sandbox.state.demo='empty'; sandbox.renderView();
  sandbox.state.device='desktop';
}catch(e){ fails++; console.error('MOBILE FAIL\n  ', e.stack.split('\n').slice(0,4).join('\n   ')); }

// 数据自检
const E = sandbox.EXPERIMENTS, V = sandbox.VERSIONS, I = sandbox.IDEAS;
console.log('文献', sandbox.LITERATURE.length, '| Idea', I.length, '| 版本', V.length, '| 实验', E.length);
const st = {}; E.forEach(e=>{ const s=sandbox.effStatus(e); st[s]=(st[s]||0)+1; });
console.log('状态构成', JSON.stringify(st));
console.log('运行中', E.filter(e=>e.status==='running').length,
            '| 今日完成/失败', E.filter(e=>e.finishedAt && e.finishedAt.slice(0,10)==='2026-08-31').length,
            '| 分析', sandbox.ANALYSES.length, '| 未读', sandbox.ANALYSES.filter(a=>a.unread).length);
console.log('归档版本', V.filter(v=>v.archived).length);
// 键并集自检
const pu = sandbox.keyUnion(E,'params'), mu = sandbox.keyUnion(E,'metrics');
console.log('全局 params 键', pu.length, JSON.stringify(pu.map(x=>x.key)));
console.log('全局 metrics 键', mu.length, JSON.stringify(mu.map(x=>x.key)));
// 聚类自检
for (const v of V.map(x=>x.id)){
  const rows = sandbox.expsOfVersion(v);
  const cl = sandbox.clusterFamilies(rows, null);
  const sizes = cl.families.map(f=>f.members.length).join('+');
  console.log(' ', v, String(rows.length).padStart(2), '实验 | 维度', cl.dims.length, JSON.stringify(cl.dims), '| 分组', sizes, cl.dims.length>3?'[广域搜索]':'');
}
console.log(fails? ('\n❌ 失败 '+fails+' 处') : '\n✅ 全部视图渲染通过');
process.exit(fails?1:0);
