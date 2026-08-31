/* 结构自检：标签平衡、矩阵可读性、diff/Δ 正确性 */
const fs=require('fs'), vm=require('vm');
const makeShim = require('./shim.js');
const ctx = makeShim({setTimeout, clearTimeout, setInterval, clearInterval, console, URLSearchParams});

const code = fs.readFileSync('_check.js','utf8') + `
globalThis.__X={state,renderView,IDEAS,VERSIONS,EXPERIMENTS,expsOfVersion,versionById,keyUnion,cardinality,
  clusterFamilies,metricKeys,topMetricKey,delta,fmtNum,sig,aggregate,quantileScale,scaleIndex,bucketOf,filterRows,defaultAgg,baselineOf,versionsOfIdea,effStatus,isNumericKey,valuesOf};`;
vm.createContext(ctx.sandbox);
vm.runInContext(code, ctx.sandbox, {filename:'p.js'});
const X = ctx.sandbox.__X;

/* ---- 1. 标签平衡 ---- */
const VOID = new Set(['br','hr','img','input','meta','link','path','rect','circle','line','polyline','polygon','text','use','stop','defs'.length&&'defs']);
function balance(html){
  const stack=[]; const errs=[];
  const re=/<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g; let m;
  while((m=re.exec(html))){
    const close=m[1]==='/', tag=m[2].toLowerCase(), attrs=m[3];
    if (attrs.trim().endsWith('/')) continue;
    if (tag==='defs'||tag==='svg'||tag==='g'||tag==='tspan'||tag==='title'||tag==='optgroup'){}
    if (['br','hr','img','input','meta','link','path','rect','circle','line','polyline','polygon','stop','use','col','source'].includes(tag)) continue;
    if (!close) stack.push(tag);
    else {
      const top = stack.pop();
      if (top!==tag) errs.push(`期望 </${top}> 实际 </${tag}>`);
    }
  }
  if (stack.length) errs.push('未闭合: '+stack.slice(0,5).join(','));
  return errs;
}
let bad=0;
function check(label, html){
  const e = balance(html);
  if (e.length){ bad++; console.log('❌', label, e.slice(0,3).join(' | ')); }
  else console.log('✅', label, html.length+' 字符');
}
const S = X.state;
S.device='desktop';
for (const r of [['today',{}],['literature',{}],['ideas',{}],['idea',{ideaId:'i1'}],
  ['version',{ideaId:'i1',versionId:'v2',view:'matrix'}],['version',{ideaId:'i1',versionId:'v2',view:'diff'}],
  ['version',{ideaId:'i5',versionId:'v10',view:'chart'}],['version',{ideaId:'i4',versionId:'v7',view:'chart'}],
  ['experiment',{ideaId:'i1',versionId:'v1',expId:'exp-002'}],['experiments',{}],['inbox',{}]]){
  S.name=r[0]; S.ideaId=r[1].ideaId||null; S.versionId=r[1].versionId||null; S.expId=r[1].expId||null;
  S.query = r[1].view?{view:r[1].view}:{};
  S.chart={type:'line',x:null,y:null,fixed:{},brush:null};
  const el = ctx.sandbox.document.querySelector('#view');
  S.demo='normal'; X.renderView();
  check(r[0]+'/'+(r[1].view||r[1].ideaId||''), el.innerHTML);
}
S.device='mobile'; S.name='today'; X.renderView();
check('mobile/today', ctx.sandbox.document.querySelector('#view').innerHTML);
S.device='desktop';

/* ---- 2. 矩阵可读性 ---- */
console.log('\n—— 矩阵（i1，按周）——');
S.name='version'; S.ideaId='i1'; S.versionId='v2'; S.query={view:'matrix'};
S.mtx={metric:null,agg:'auto',norm:'global',bucket:'week',status:'all',conds:[],scope:'idea'};
X.renderView();
const vs = X.versionsOfIdea('i1');
const all = []; vs.forEach(v=>X.expsOfVersion(v.id).forEach(e=>all.push(e)));
const cols = Array.from(new Set(all.map(e=>X.bucketOf(e,'week')))).sort();
console.log('行(版本) × 列(周) =', vs.length, '×', cols.length, '| 实验', all.length, '| 列:', cols.join(' '));
for (const v of vs){
  const row = cols.map(c=>{
    const n = all.filter(e=>e.versionId===v.id && X.bucketOf(e,'week')===c).length;
    return n ? String(n).padStart(3) : '  ·';
  }).join(' ');
  console.log(' ', v.name.padEnd(3), row);
}
console.log('  合计 ', cols.map(c=>String(all.filter(e=>X.bucketOf(e,'week')===c).length).padStart(3)).join(' '));

/* ---- 3. 动态列：删掉一个字段，UI 应自动跟着变 ---- */
console.log('\n—— 领域无关性自检 ——');
const rows = X.expsOfVersion('v10');
const before = X.keyUnion(rows,'params').map(x=>x.key).length;
const cloned = rows.map(e=>({...e, params:{...e.params}}));
cloned.forEach(e=>delete e.params.dropout);
const after = X.keyUnion(cloned,'params').map(x=>x.key).length;
const dimsBefore = X.clusterFamilies(rows,null).dims.length;
const dimsAfter = X.clusterFamilies(cloned,null).dims.length;
console.log(`删除一个参数键后：params 列 ${before} → ${after}，差异维度 ${dimsBefore} → ${dimsAfter}`,
  (after===before-1 && dimsAfter===dimsBefore-1) ? '✅ 列与维度自动跟随' : '❌ 未跟随');

/* ---- 4. Δ 规则（D2） ---- */
console.log('\n—— Δ 染色规则 ——');
console.log(' param  lr 0.001→0.005 :', X.delta(0.001,0.005,'lr','param').text,
  '| class="'+X.delta(0.001,0.005,'lr','param').cls+'"', '(参数永不染色)');
console.log(' metric 未声明方向       :', X.delta(0.43,0.462,'influence_spread','metric').text,
  '| class="'+X.delta(0.43,0.462,'influence_spread','metric').cls+'"');
S.directions.val_loss = false;
console.log(' metric val_loss 越小越好 :', X.delta(0.45,0.39,'val_loss','metric').text,
  '| class="'+X.delta(0.45,0.39,'val_loss','metric').cls+'" (变好)');
console.log('               反向      :', X.delta(0.39,0.45,'val_loss','metric').text,
  '| class="'+X.delta(0.39,0.45,'val_loss','metric').cls+'" (变差)');
S.directions.val_loss = true;
console.log(' metric val_loss 越大越好 :', X.delta(0.45,0.39,'val_loss','metric').text,
  '| class="'+X.delta(0.45,0.39,'val_loss','metric').cls+'" (变差)');
delete S.directions.val_loss;

/* ---- 5. 缺失值不填 0 ---- */
const missRows = X.expsOfVersion('v5');
const missing = missRows.filter(e=>!Object.keys(e.metrics||{}).length);
console.log('\n—— 缺失值 ——');
console.log(' v5 中 done 但无指标的实验', missing.length, '个 → effStatus =',
  missing.map(e=>X.effStatus? 'n/a':'').length ? (X.EXPERIMENTS.filter(e=>e.status==='done'&&!Object.keys(e.metrics||{}).length).length+' 个全局') : '');
const v1e = X.EXPERIMENTS.find(e=>e.id==='exp-002');
console.log(' exp-002 metrics 键:', Object.keys(v1e.metrics).join(','), '（少一个键 → 该格斜纹）');

/* ---- 6. 分位分档 ---- */
const sc = X.quantileScale([1,1,1,1,1,1,1,1,1,100],5);
console.log('\n—— 分位分档（长尾 9×1 + 1×100）——');
console.log(' 阈值', sc.th.map(x=>x.toFixed(1)).join(' / '),
  '| index(1)=', X.scaleIndex(sc,1), 'index(100)=', X.scaleIndex(sc,100),
  X.scaleIndex(sc,100)!==X.scaleIndex(sc,1)?'✅ 未被长尾压平':'❌');

console.log('\n' + (bad? '❌ 结构问题 '+bad+' 处' : '✅ 所有视图标签平衡'));
process.exit(bad?1:0);
