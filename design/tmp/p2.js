/* ============================================================================
 * Idea Forge · 可交互原型
 * ----------------------------------------------------------------------------
 * 领域无关原则：本文件里所有「字段名」只出现在【MOCK DATA】区块（含数据生成函数）。
 * 表格列 / 图表轴 / 筛选器 / 聚类维度，全部由运行时从数据的实际键集合推导。
 * ==========================================================================*/
'use strict';

/* ══════════════════════════════════════════════════════════════════════════
 * 【MOCK DATA】真实替换时，只需把这一段换成 API 返回值
 * ════════════════════════════════════════════════════════════════════════*/

const PROJECT = {
  name: 'IM-复杂网络',
  root: '~/research/im-multilayer',
  syncedAt: '2 分钟前',
  lanUrl: 'http://192.168.1.24:8777',
};

const TODAY = '2026-08-31';

/* ---- 文献 ---- */
const LITERATURE = [
  { id:'L01', title:'Maximizing the Spread of Influence through a Social Network', authors:'Kempe, Kleinberg, Tardos', year:2003, venue:'KDD', tags:['复杂网络','传播模型','经典'], derived:['i1','i2'], read:'read', addedAt:'2026-06-27', note:'贪心 + 次模性保证的奠基工作，蒙特卡洛模拟次数是本组实验的主要开销来源。' },
  { id:'L02', title:'Cost-effective Outbreak Detection in Networks', authors:'Leskovec et al.', year:2007, venue:'KDD', tags:['复杂网络','优化'], derived:['i3'], read:'reading', addedAt:'2026-06-27', note:'CELF 惰性求值。实测在小 seed_ratio 下收益最大。' },
  { id:'L03', title:'Influence Maximization in Multilayer Networks: A Community-based Approach', authors:'Zhang & Wu', year:2023, venue:'IEEE TNSE', tags:['多层网络','复杂网络'], derived:['i4'], read:'read', addedAt:'2026-06-30', note:'跨层传播需要重新定义层间耦合强度，本工作的 beta 参数化方式可直接复用。' },
  { id:'L04', title:'Attention Is All You Need', authors:'Vaswani et al.', year:2017, venue:'NeurIPS', tags:['Transformer','基础'], derived:['i5'], read:'read', addedAt:'2026-07-02', note:'结构上用 attention 替代传播模拟的动机来源。' },
  { id:'L05', title:'Graph Transformer with Laplacian Positional Encoding', authors:'Chen, Li, Zhou', year:2024, venue:'ICLR', tags:['Transformer','位置编码','图学习'], derived:['i5','i6'], read:'read', addedAt:'2026-07-05', note:'拉普拉斯位置编码在稀疏图上优于 RWSE，与我们 num_heads 扫描结论互相印证。' },
  { id:'L06', title:'Efficient Influence Maximization under Independent Cascade Revisited', authors:'Tang & Yuan', year:2022, venue:'WWW', tags:['传播模型','复杂网络'], derived:[], read:'unread', addedAt:'2026-07-11', note:'' },
  { id:'L07', title:'Sparse Attention for Large Graph Structured Data', authors:'Park et al.', year:2024, venue:'NeurIPS', tags:['Transformer','注意力稀疏化'], derived:['i6'], read:'reading', addedAt:'2026-07-19', note:'稀疏化后 head 数不宜再增加，否则欠拟合。' },
  { id:'L08', title:'A Comparison of IC, LT and SIR Models on Real-world Graphs', authors:'Iwata & Mori', year:2021, venue:'Applied Network Science', tags:['传播模型','对比'], derived:['i7'], read:'read', addedAt:'2026-07-24', note:'三种传播模型在同一数据集上的系统性对照，可作为 baseline 集合。' },
  { id:'L09', title:'Budgeted Influence Maximization with Node Costs', authors:'Goyal & Wang', year:2025, venue:'KDD', tags:['复杂网络','优化'], derived:[], read:'unread', addedAt:'2026-08-06', note:'' },
  { id:'L10', title:'Rethinking Negative Sampling in Graph Representation Learning', authors:'Sun et al.', year:2025, venue:'ICML', tags:['图学习','对比学习'], derived:[], read:'unread', addedAt:'2026-08-19', note:'' },
];

/* ---- Idea 分支树 ---- */
const IDEAS = [
  { id:'i1', name:'影响力最大化主干', parent:null, status:'active', createdAt:'2026-06-28',
    hypothesis:'在同一份图上，把「选谁」和「怎么估传播」解耦，先固定传播模型，只扫选择策略；形成可复用的评测基线后再谈模型创新。',
    lit:['L01','L02','L03'] },
  { id:'i2', name:'贪心 + 度中心性', parent:'i1', status:'validated', createdAt:'2026-07-01',
    hypothesis:'贪心在候选池缩小到 200–1000 时，效果损失是否可接受？若可接受，就能把蒙特卡洛预算省下来做更多重复。',
    lit:['L01','L03'] },
  { id:'i3', name:'CELF 惰性求值优化', parent:'i1', status:'abandoned', createdAt:'2026-07-08',
    hypothesis:'CELF 的惰性收益随 propagation_beta 上升而消失——我们的图上耦合太强，边际增益几乎不递减。',
    lit:['L02'] },
  { id:'i4', name:'多层网络跨层传播', parent:'i1', status:'active', createdAt:'2026-08-03',
    hypothesis:'把层间耦合做成可学习/可扫描的超参，看跨层放大效应是否存在阈值。',
    lit:['L03'] },
  { id:'i5', name:'Transformer 结构编码', parent:null, status:'active', createdAt:'2026-07-26',
    hypothesis:'用 Transformer 直接回归影响力得分，能否在 1/20 的 runtime 内逼近贪心的 spread？',
    lit:['L04','L05'] },
  { id:'i6', name:'注意力稀疏化', parent:'i5', status:'active', createdAt:'2026-08-22',
    hypothesis:'稀疏注意力下 head 数与位置编码的交互：头数优势是否依赖 RWSE 提供的随机游走先验？',
    lit:['L05','L07'] },
  { id:'i7', name:'传播模型对比', parent:null, status:'validated', createdAt:'2026-07-02',
    hypothesis:'IC / LT 两套传播假设下，同一批种子集的排序稳定性如何？决定后续是否继续用单一模型。',
    lit:['L08'] },
];

/* ---- 参数模板（两套领域，证明领域无关） ---- */
const PARAM_SETS = {
  N: { graph_name:'email-eu-core', seed_ratio:0.05, num_layers:2, propagation_beta:0.15,
       candidate_pool_size:500, monte_carlo:2000, optimizer:'greedy', use_celf:false,
       weight_decay:0.0001, seed:42 },
  T: { d_model:128, num_heads:4, num_layers:2, lr:0.001, dropout:0.1, batch_size:32,
       epochs:50, warmup_steps:400, pos_encoding:'laplacian', seed:42 },
};

/* ---- 指标计算（仅用于把 mock 数据做得可信；平台本身不做任何语义假设） ---- */
const clamp = (v,a,b)=>Math.max(a,Math.min(b,v));
function computeN(p, rnd){
  const sr=p.seed_ratio, nl=p.num_layers, beta=p.propagation_beta;
  const mc=p.monte_carlo, cps=p.candidate_pool_size;
  const optBonus = p.optimizer==='celf' ? 0.011 : p.optimizer==='degree' ? -0.058 : 0;
  let spread = 0.152 + 3.05*sr + 0.021*(nl-1) + 1.10*beta - 1.85*beta*beta + optBonus
             + (p.use_celf?0.004:0) + 0.019*Math.log10(cps/100) + (rnd()-0.5)*0.015;
  const conv  = Math.round(34 + 190*sr + 7*(nl-1) + 150*Math.abs(beta-0.15) + (rnd()-0.5)*14);
  const rt    = 38 + mc*0.42 + 430*sr + 26*(nl-1) + (p.use_celf?-0.35*mc*0.42:0) + (rnd()-0.5)*20;
  const std   = 0.0031 + 0.026*sr + 0.0042/Math.sqrt(mc/1000) + (rnd()-0.5)*0.0016;
  return { influence_spread: r4(clamp(spread,0.05,0.95)),
           convergence_step: Math.max(6, conv),
           runtime_s: r1(Math.max(8, rt)),
           spread_std: r4(Math.max(0.0009, std)) };
}
function computeT(p, rnd){
  const lrPen = Math.abs(Math.log10(p.lr/0.002));
  const drPen = p.dropout>0.2 ? (p.dropout-0.2)*0.17 : (0.2-p.dropout)*0.05;
  let spread = 0.213 + 0.072*Math.log2(p.d_model/32) + 0.017*(p.num_layers-2)
             + 0.012*Math.log2(p.num_heads/2) - 0.058*lrPen - drPen
             + (p.pos_encoding==='rwse'?0.008:0) + (rnd()-0.5)*0.013;
  const loss = 0.443 + 0.056*lrPen - 0.022*Math.log2(p.d_model/32) + 0.095*(p.dropout-0.1)
             - 0.006*(p.num_layers-2) + (rnd()-0.5)*0.011;
  const ndcg = clamp(spread*1.28 + 0.086 + (rnd()-0.5)*0.010, 0.05, 0.99);
  const rt   = 24 + p.epochs*(p.d_model/128)*1.9 + (p.num_layers-2)*22 + (rnd()-0.5)*13;
  const conv = Math.round(p.epochs*(0.72-0.30*Math.min(1,p.lr/0.008)) + (rnd()-0.5)*4);
  return { influence_spread: r4(clamp(spread,0.05,0.95)),
           'ndcg@10': r4(ndcg),
           val_loss: r4(Math.max(0.08, loss)),
           runtime_s: r1(Math.max(9, rt)),
           convergence_step: clamp(conv, 4, p.epochs) };
}
const r1 = v => Math.round(v*10)/10;
const r4 = v => Math.round(v*10000)/10000;

/* ---- Version 定义（含实验生成配置） ---- */
const VERSION_SPECS = [
  { id:'v1',  ideaId:'i1', name:'a1', git:'#3f2a1c', createdAt:'2026-06-29', set:'N', batch:'sweep-seed',
    note:'建立基线：只扫种子比例', vary:[{key:'seed_ratio', values:[0.01,0.03,0.05,0.08]}], repeat:1,
    missing:{1:'partial'} },
  { id:'v12', ideaId:'i7', name:'c1', git:'#9ad0e5', createdAt:'2026-07-01', set:'N', batch:'baseline',
    note:'传播模型对照（已归档）', vary:[{key:'optimizer', values:['greedy','degree']}], repeat:1, archived:true },
  { id:'v2',  ideaId:'i1', name:'a2', git:'#8b1d4f', createdAt:'2026-07-06', set:'N', batch:'sweep-beta',
    note:'耦合强度扫描 + 稳定性重复', vary:[{key:'propagation_beta', values:[0.05,0.15,0.25]}], repeat:2 },
  { id:'v6',  ideaId:'i3', name:'a6', git:'#51c2a8', createdAt:'2026-07-08', set:'N', batch:'ablation-celf',
    note:'CELF 惰性收益复现（随 Idea 一起搁置）', vary:[{key:'propagation_beta', values:[0.10,0.20]}], repeat:1,
    archived:true, missing:{0:'all'} },
  { id:'v3',  ideaId:'i1', name:'a3', git:'#c07e2a', createdAt:'2026-07-13', set:'N', batch:'ablation-optim',
    note:'一次扫了太多维度 —— 事后被判定为广域搜索', vary:[{key:'optimizer', values:['greedy','celf']},
    {key:'num_layers', values:[1,2]},{key:'use_celf', values:[false,true]},{key:'monte_carlo', values:[1000,2000]}],
    repeat:1, limit:4, failed:[2] },
  { id:'v4',  ideaId:'i2', name:'a4', git:'#d95f6c', createdAt:'2026-07-16', set:'N', batch:'sweep-pool',
    note:'候选池大小的代价曲线', vary:[{key:'candidate_pool_size', values:[200,500,1000]}], repeat:1, pending:[2] },
  { id:'v5',  ideaId:'i2', name:'a5', git:'#e0a12b', createdAt:'2026-07-22', set:'N', batch:'ablation-celf',
    note:'CELF 开关 × 种子比例', vary:[{key:'use_celf', values:[false,true]},{key:'seed_ratio', values:[0.03,0.08]}], repeat:1,
    missing:{1:'all'} },
  { id:'v9',  ideaId:'i5', name:'b1', git:'#6f42c1', createdAt:'2026-07-28', set:'T', batch:'sweep-lr',
    note:'学习率扫描，确定量级', vary:[{key:'lr', values:[0.0005,0.001,0.005,0.01]}], repeat:1, pending:[3] },
  { id:'v7',  ideaId:'i4', name:'a7', git:'#2f8fd6', createdAt:'2026-08-03', set:'N', batch:'sweep-multilayer',
    note:'三维扫描：层数 × 种子比例 × CELF', vary:[{key:'num_layers', values:[2,3]},{key:'seed_ratio', values:[0.05,0.10]},{key:'use_celf', values:[false,true]}],
    repeat:1, failed:[5] },
  { id:'v8',  ideaId:'i4', name:'a8', git:'#4b8f6a', createdAt:'2026-08-08', set:'N', batch:'sweep-beta',
    note:'跨层放大效应复扫', vary:[{key:'propagation_beta', values:[0.10,0.20]},{key:'seed_ratio', values:[0.05,0.10]}], repeat:1,
    running:[2] },
  { id:'v10', ideaId:'i5', name:'b2', git:'#b5651d', createdAt:'2026-08-15', set:'T', batch:'ablation-arch',
    note:'模型宽度 × dropout', vary:[{key:'d_model', values:[64,128,256]},{key:'dropout', values:[0.1,0.3]}], repeat:1,
    failed:[2], running:[5] },
  { id:'v11', ideaId:'i6', name:'b3', git:'#0f9b8e', createdAt:'2026-08-24', set:'T', batch:'ablation-attn',
    note:'注意力头数扫描（稀疏化之后）', vary:[{key:'num_heads', values:[2,4,8]}], repeat:1, running:[2] },
];

/* ---- 今日强排（让「今天」这一屏有内容） ---- */
const TODAY_PLAN = [
  { v:'v11', idx:0, status:'done',   time:'09:12', unread:true  },
  { v:'v11', idx:1, status:'done',   time:'11:40', unread:true  },
  { v:'v10', idx:3, status:'done',   time:'13:05', unread:true  },
  { v:'v10', idx:4, status:'failed', time:'15:22', unread:true  },
  { v:'v7',  idx:6, status:'done',   time:'10:20', unread:false },
  { v:'v8',  idx:3, status:'done',   time:'16:05', unread:false },
  { v:'v9',  idx:0, status:'done',   time:'14:40', unread:false },
];
/* ---- 运行中实验的运行时信息（心跳 / 已运行时长） ---- */
const RUNNING_INFO = {
  'v11:2': { startedAt:'2026-08-31T14:10', elapsed:'2 小时 14 分', heartbeat:12 },
  'v10:5': { startedAt:'2026-08-31T16:30', elapsed:'45 分',        heartbeat:8  },
  'v8:2':  { startedAt:'2026-08-30T22:00', elapsed:'14 小时 6 分', heartbeat:34 },
};

/* ---- 用户在设置里显式声明过的指标方向（唯一允许染 Δ 的情形） ---- */
const DIRECTIONS = { val_loss: false };

/* ══════════════════════════════════════════════════════════════════════════
 * 数据构建
 * ════════════════════════════════════════════════════════════════════════*/
function mulberry(a){ return function(){ a |= 0; a = a + 0x6D2B79F5 | 0;
  let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function cartesian(lists){ return lists.reduce((acc,l)=>acc.flatMap(a=>l.map(v=>a.concat([v]))),[[]]); }

const DAY = 86400000;
function dOf(s){ return new Date(s.length<=10 ? s+'T09:00:00' : s); }
function iso(d){ const p=n=>String(n).padStart(2,'0');
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate())+'T'+p(d.getHours())+':'+p(d.getMinutes()); }
function dateOnly(d){ const p=n=>String(n).padStart(2,'0');
  return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate()); }
function mmdd(s){ return s.slice(5,10); }

const VERSIONS = VERSION_SPECS.map(s=>{
  const v = Object.assign({}, s);
  delete v.vary; delete v.repeat; delete v.missing; delete v.failed; delete v.pending; delete v.running;
  return v;
});

function buildExperiments(){
  const out = []; let n = 0;
  VERSION_SPECS.forEach(spec=>{
    const allCombos = cartesian(spec.vary.map(x=>x.values.map(v=>({key:x.key, val:v}))));
    // limit：在笛卡尔积上等距取样，保证每个维度都取到 ≥2 个值（用于「广域搜索」场景）
    const combos = spec.limit && allCombos.length > spec.limit
      ? Array.from({length:spec.limit}, (_,i)=> allCombos[Math.round(i*(allCombos.length-1)/(spec.limit-1))])
      : allCombos;
    combos.forEach((combo, ci)=>{
      for (let rep=0; rep<spec.repeat; rep++){
        const localIdx = countIn(out, spec.id);
        n++;
        const id = 'exp-' + String(n).padStart(3,'0');
        const params = Object.assign({}, PARAM_SETS[spec.set]);
        combo.forEach(c=>{ params[c.key] = c.val; });
        params.seed = 42 + rep;
        const rnd = mulberry(n*7919 + rep*31 + ci*17);
        let metrics = (spec.set==='N' ? computeN : computeT)(params, rnd);
        const miss = (spec.missing||{})[localIdx];
        if (miss==='all') metrics = {};
        if (miss==='partial'){ const ks=Object.keys(metrics); delete metrics[ks[ks.length-1]]; }

        const dayOff = Math.floor(localIdx*1.5) + (localIdx%2);
        const created = new Date(dOf(spec.createdAt).getTime() + dayOff*DAY + ((localIdx*7)%9)*3600000);
        let status = 'done';
        if ((spec.failed||[]).includes(localIdx)) status='failed';
        if ((spec.pending||[]).includes(localIdx)) status='pending';
        if ((spec.running||[]).includes(localIdx)) status='running';
        let finishedAt = null;
        if (status==='done' || status==='failed'){
          finishedAt = new Date(created.getTime() + (status==='failed'? 14 : 47 + (localIdx%5)*23) * 60000);
        }
        out.push({
          id, versionId:spec.id, ideaId:spec.ideaId, name:id, status,
          createdAt: iso(created), finishedAt: finishedAt? iso(finishedAt):null,
          batch: spec.batch, params, metrics,
          _order: n,
        });
      }
    });
  });
  // 今日强排
  TODAY_PLAN.forEach(tp=>{
    const list = out.filter(e=>e.versionId===tp.v);
    const e = list[tp.idx]; if(!e) return;
    e.status = tp.status;
    e.createdAt = TODAY+'T'+tp.time;
    e.finishedAt = statusTerminal(tp.status)
      ? iso(new Date(dOf(TODAY+'T'+tp.time).getTime() + (tp.status==='failed'?18:63)*60000)) : null;
    e._today = true; e._unread = !!tp.unread;
  });
  // 运行中：心跳与已运行时长
  Object.keys(RUNNING_INFO).forEach(k=>{
    const [vid, i] = k.split(':');
    const list = out.filter(e=>e.versionId===vid);
    const e = list[Number(i)]; if(!e) return;
    const info = RUNNING_INFO[k];
    e.status='running'; e.startedAt=info.startedAt; e.elapsed=info.elapsed;
    e.heartbeat=info.heartbeat; e.finishedAt=null;
  });
  return out;
}
function statusTerminal(s){ return s==='done'||s==='failed'; }
function countIn(arr, vid){ let c=0; for(const e of arr) if(e.versionId===vid) c++; return c; }

const EXPERIMENTS = buildExperiments();

/* ---- 产物 / 日志 ---- */
const ART_KIND = { model:'◈', image:'▣', table:'▤', log:'≡', other:'▢' };
function buildArtifacts(){
  const map = {};
  EXPERIMENTS.forEach((e,i)=>{
    const rnd = mulberry(i*104729+7);
    const dir = '.research/'+e.ideaId+'/'+e.versionId+'/'+e.id;
    const mKeys = Object.keys(e.metrics);
    const items = [
      { kind:'table', name:'metrics.json', path:dir+'/metrics.json', size: 1024+Math.round(rnd()*3072) },
      { kind:'image', name: mKeys.length? (mKeys[0].replace(/[^a-z0-9]/gi,'_')+'_curve.png') : 'curve.png',
        path:dir+'/curve.png', size: 48000+Math.round(rnd()*90000) },
      { kind:'log',   name:'train.log', path:dir+'/train.log', size: 120000+Math.round(rnd()*620000) },
    ];
    if (e.status==='done' && mKeys.length){
      items.push({ kind:'model', name:'checkpoint.pt', path:dir+'/checkpoint.pt',
        size: 780000000+Math.round(rnd()*900000000), large:true });
    }
    if (versionById(e.versionId).archived) items[items.length-1] && (items[items.length-1].pruned = true);
    map[e.id] = items;
  });
  return map;
}
const ARTIFACTS = buildArtifacts();

function buildLog(e){
  const keys = Object.keys(e.params);
  const L = [];
  L.push('[INFO] 2026-08-31 00:00:11  run dir: .research/'+e.ideaId+'/'+e.versionId+'/'+e.id);
  L.push('[INFO] git ref '+(versionById(e.versionId).git)+'  uid='+e.id);
  L.push('[INFO] resolved '+keys.length+' params from config');
  keys.slice(0,4).forEach(k=>L.push('[INFO]   '+k+' = '+JSON.stringify(e.params[k])));
  L.push('[INFO] loading graph cache ... hit (1.8s)');
  L.push('[INFO] epoch 001  '+(Object.keys(e.metrics)[0]||'metric')+' = '+(fmtNum(Object.values(e.metrics)[0])||'—'));
  L.push('[INFO] epoch 010  '+(Object.keys(e.metrics)[0]||'metric')+' = '+(fmtNum(Object.values(e.metrics)[1])||'—'));
  if (e.status==='failed'){
    L.push('[WARN] numerical instability detected, retrying with clamped gradient');
    L.push('[ERROR] RuntimeError: propagation matrix became singular at step 128');
    L.push('Traceback (most recent call last):');
    L.push('  File "train.py", line 214, in <module>');
    L.push('    spread = simulate(graph, seeds, beta=cfg.beta)');
    L.push('  File "core/sim.py", line 88, in simulate');
    L.push('    raise RuntimeError("propagation matrix became singular")');
    L.push('[ERROR] exit code 1');
  } else {
    L.push('[INFO] converged, writing metrics.json');
    L.push('[INFO] done. exit code 0');
  }
  return L.join('\n');
}

/* ---- Analysis（agent / 人写回，一等公民） ---- */
const ANALYSIS_TEXT = {
  'exp-002':'### 结论\n种子比例是这个版本**唯一真正起作用**的旋钮。\n\n- `seed_ratio` 从 0.01 提到 0.08，`influence_spread` 单调上升，**没有出现拐点**；\n- `spread_std` 同步变大，说明高比例下收益的方差也在变大——后续必须做重复；\n- `runtime_s` 随比例近似线性增长，0.08 时已经是 0.01 的 3.4 倍。\n\n建议下一步固定中间档，把预算让给重复次数。',
  'exp-005':'### 结论\n两套选择策略的差距**稳定且方向一致**。\n\n- 简单度中心性比贪心低约 0.055，且这个差距在不同 `seed_ratio` 下都成立；\n- 但 `runtime_s` 只有贪心的 1/40。\n\n结论：度中心性不能作为主策略，但适合做**快速预筛**，给贪心缩小候选池。',
  'exp-009':'### 结论\n耦合强度在 0.15 附近存在**明显的收益拐点**。\n\n- 0.05 → 0.15：`influence_spread` 快速上升；\n- 0.15 → 0.25：几乎持平，且 `convergence_step` 变长 21%。\n\n同配置两次重复的 `spread_std` 都在 0.005 以内，**这个趋势可信**。建议把中间档写进后续版本的默认值。',
  'exp-021':'### 结论\n候选池缩小到最小的代价比预期小。\n\n- `candidate_pool_size` 从最大缩到最小，`influence_spread` 只掉 0.011；\n- 但 `runtime_s` 省下 61%，**性价比很高**。\n\n因此本 Idea 的假设成立：可以把采样预算挪去做更多重复实验。',
  'exp-028':'### 结论\n学习率的量级比想象中敏感。\n\n- 第三档时 `val_loss` 最低，但 `influence_spread` 与第二档几乎打平；\n- 第四档出现明显震荡，`convergence_step` 反而变长（典型的过大步长）。\n\n建议以中间为中心再插一档，同时把 `dropout` 提高 0.2 抑制过拟合。',
  'exp-034':'### 结论\n三维扫描里，**层深与惰性优化存在交互**。\n\n- 深层时开启惰性优化收益为 +0.006；\n- 浅层时开启只有 +0.001，接近噪声。\n\n也就是说惰性收益依赖更深的层结构。这一条推翻了被搁置分支的原始假设（当时只在浅层上试过），建议恢复该分支。',
  'exp-030':'### 结论\n跨层放大效应在**较高的种子比例**下才出现。\n\n- 低比例时两档耦合强度几乎无差别；\n- 高比例时差距拉开到 0.043，且 `convergence_step` 只增加 11%。\n\n**阈值行为值得单独做一条分支**：在阈值区间内再密扫一次。',
  'exp-045':'### 结论\n模型宽度与 `dropout` 是**此消彼长**的关系。\n\n- 最宽 + 高 `dropout` 的组合反而优于最宽 + 低 `dropout`，说明宽模型在这里过拟合；\n- 中间宽度 + 低 `dropout` 是性价比最优点：`runtime_s` 只有最宽的 52%，`influence_spread` 只低 0.018。\n\n若追求极限值，选最宽 + 高 `dropout`；若追求迭代速度，选中间宽度。',
  'exp-047':'### 结论（人补充）\n同意 agent 的判断，但补充一点：\n\n排序指标与主指标在这个版本上相关性 0.93，**没有提供额外信息**，后续可以只盯一个。\n\n另外最宽模型的 checkpoint 已经 1.4 GB，本地磁盘吃紧，默认走中间宽度。',
  'exp-049':'### 结论\n稀疏化之后，**注意力头数不再是越多越好**。\n\n- 头数翻倍的第一段有 +0.012；第二段只有 +0.002，落在该配置标准差的两倍区间内；\n- `val_loss` 在最多头数时反而回升。\n\n与文献 L07 的报告一致。建议把头数封顶，把参数量让给模型宽度。',
  'exp-046':'### 结论\n本次运行**失败在传播矩阵奇异**，不是参数问题。\n\n最宽的那一档在高 `dropout` 下矩阵条件数爆炸。建议：\n\n1. 在模拟前加一步对角扰动（+1e-6）；\n2. 或者把该维度上限锁死在倒数第二档。\n\n在这两点修好前，这个组合不要再排进队列。',
};
function buildAnalyses(){
  const out = [];
  Object.keys(ANALYSIS_TEXT).forEach((expId, i)=>{
    const e = expById(expId); if(!e) return;
    const human = expId === 'exp-047';
    out.push({
      id:'an-'+(i+1), expId, source: human ? 'human' : 'agent',
      author: human ? '你' : 'local-agent · claude',
      ts: e.finishedAt ? iso(new Date(dOf(e.finishedAt).getTime()+90000)) : e.createdAt,
      md: ANALYSIS_TEXT[expId],
      adopted: !human && i%3===0,
      edited: human,
      unread: !!e._unread,
    });
  });
  // 给今天完成但没写好的实验补两条未读分析
  EXPERIMENTS.filter(e=>e._unread && e.status==='done').forEach((e,i)=>{
    if (out.some(a=>a.expId===e.id)) return;
    const mk = Object.keys(e.metrics);
    out.push({
      id:'an-t'+i, expId:e.id, source:'agent', author:'local-agent · claude',
      ts: iso(new Date(dOf(e.finishedAt).getTime()+120000)),
      md:'### 结论\n本次结果与同版本同配置的历史重复**一致**，`'+mk[0]+'` 落在均值 ±1σ 内，没有新信息。\n\n已把它并入该配置组的统计量，无需额外动作。',
      adopted:false, edited:false, unread:true,
    });
  });
  return out;
}
const ANALYSES = buildAnalyses();

/* ---- Agent 提议 ---- */
const PROPOSALS = [
  { id:'p1', status:'pending', ts:'2026-08-31 16:40', confidence:0.72, targetVersion:'v10', ideaId:'i5',
    title:'在 b2 上试一组更窄的 d_model 中间档',
    reason:'`d_model` 64→128 的收益（+0.031）远大于 128→256（+0.011），但 256 + `dropout=0.3` 又反超。说明最优点在 128–256 之间且依赖 `dropout`。建议插入 192 一档，与 `dropout` 0.2 / 0.3 各配一次。参考 exp-036 的 `val_loss`=0.397。',
    diff:[ {k:'d_model', from:128, to:192}, {k:'dropout', from:0.1, to:0.3} ],
    sameCount:15, baseExp:'exp-045', eta:'约 2 小时' },
  { id:'p2', status:'pending', ts:'2026-08-31 15:58', confidence:0.61, targetVersion:'v11', ideaId:'i6',
    title:'把 num_heads 扫描扩展到 pos_encoding=rwse',
    reason:'exp-044 显示 `num_heads` 4→8 收益归零。怀疑是 `pos_encoding` 用 laplacian 时头间冗余。若换成 rwse，头数上限可能被抬高。这是一个**证伪成本很低**的对照，只需 3 次运行。',
    diff:[ {k:'pos_encoding', from:'laplacian', to:'rwse'} ],
    sameCount:17, baseExp:'exp-049', eta:'约 1 小时' },
  { id:'p3', status:'approved', ts:'2026-08-30 21:12', confidence:0.83, targetVersion:'v8', ideaId:'i4',
    title:'在 a8 上密扫 seed_ratio 0.10–0.16',
    reason:'exp-030 观察到跨层放大的阈值行为。为定位阈值位置，建议在 0.10 / 0.12 / 0.14 / 0.16 上各跑一次，`propagation_beta` 固定 0.20。',
    diff:[ {k:'seed_ratio', from:0.10, to:0.12} ],
    sameCount:16, baseExp:'exp-030', eta:'约 3 小时' },
];

/* ══════════════════════════════════════════════════════════════════════════
 * 运行时推导工具（领域无关：绝不假设任何键名）
 * ════════════════════════════════════════════════════════════════════════*/
const RE_REPEAT = /^(.*_)?(seed|random_seed|repeat|run_id|trial|idx)$/i;

function expById(id){ return EXPERIMENTS.find(e=>e.id===id); }
function versionById(id){ return VERSIONS.find(v=>v.id===id); }
function ideaById(id){ return IDEAS.find(i=>i.id===id); }
function expsOfVersion(vid){ return EXPERIMENTS.filter(e=>e.versionId===vid); }
function expsOfIdea(iid){
  const vs = VERSIONS.filter(v=>v.ideaId===iid).map(v=>v.id);
  return EXPERIMENTS.filter(e=>vs.includes(e.versionId));
}
function versionsOfIdea(iid){ return VERSIONS.filter(v=>v.ideaId===iid)
  .sort((a,b)=>a.createdAt.localeCompare(b.createdAt)); }
function childIdeas(iid){ return IDEAS.filter(i=>i.parent===iid); }
function ideaPath(iid){ const p=[]; let c=iid; while(c){ const i=ideaById(c); if(!i) break; p.unshift(i); c=i.parent; } return p; }
function analysisOf(expId){ return ANALYSES.filter(a=>a.expId===expId); }

/** 键并集：返回 [{key, count}]，count = 出现次数 */
function keyUnion(rows, field){
  const m = new Map();
  rows.forEach(r=>{ const o = r[field]||{}; Object.keys(o).forEach(k=>m.set(k,(m.get(k)||0)+1)); });
  return Array.from(m, ([key,count])=>({key,count})).sort((a,b)=>
    b.count-a.count || a.key.localeCompare(b.key));
}
function cardinality(rows, field, key){
  const s = new Set();
  rows.forEach(r=>{ const o=r[field]||{}; if(key in o) s.add(normVal(o[key])); });
  return s.size;
}
function normVal(v){ return typeof v==='object'&&v!==null ? JSON.stringify(v) : String(v); }
function isNum(v){ return typeof v==='number' && isFinite(v); }
function numRate(rows, field, key){
  let tot=0, ok=0;
  rows.forEach(r=>{ const o=r[field]||{}; if(key in o){ tot++; if(isNum(o[key])) ok++; }});
  return tot? ok/tot : 0;
}
/** 数值型判定：≥80% 出现次数可 parseFloat */
function isNumericKey(rows, field, key){
  return numRate(rows, field, key) >= 0.8;
}
function valuesOf(rows, field, key){
  const s = new Set();
  rows.forEach(r=>{ const o=r[field]||{}; if(key in o) s.add(o[key]); });
  return Array.from(s).sort((a,b)=> (isNum(a)&&isNum(b)) ? a-b : String(a).localeCompare(String(b)));
}
function typeIcon(v){
  if (typeof v==='boolean') return '☑';
  if (Array.isArray(v)) return '[]';
  if (typeof v==='number') return '#';
  return '"';
}
function fmtNum(v, digits){
  if (v===null||v===undefined||v==='') return '—';
  if (typeof v!=='number'){
    const n = parseFloat(v);
    if (!isFinite(n)) return String(v);
    v = n;
  }
  const a = Math.abs(v);
  let s;
  if (a!==0 && (a<0.001 || a>=100000)) s = v.toExponential(2);
  else if (Number.isInteger(v)) s = String(v);
  else s = String(Math.round(v*10000)/10000);
  return s;
}
function sig(v){
  if (!isNum(v)) return '—';
  const a = Math.abs(v);
  if (a===0) return '0';
  if (a>=1000) return v.toFixed(0);
  if (a>=10) return v.toFixed(2);
  if (a>=1) return v.toFixed(3);
  if (a>=0.001) return v.toFixed(4);
  return v.toExponential(2);
}
function fmtSize(b){
  if (b>=1073741824) return (b/1073741824).toFixed(2)+' GB';
  if (b>=1048576) return (b/1048576).toFixed(1)+' MB';
  if (b>=1024) return (b/1024).toFixed(0)+' KB';
  return b+' B';
}
function fmtTime(s){
  if(!s) return '—';
  const d = dOf(s); const p=n=>String(n).padStart(2,'0');
  return (s.slice(0,10)===TODAY) ? '今天 '+p(d.getHours())+':'+p(d.getMinutes())
       : (s.slice(0,10)===prevDay(TODAY) ? '昨天 '+p(d.getHours())+':'+p(d.getMinutes())
       : s.slice(5,10)+' '+p(d.getHours())+':'+p(d.getMinutes()));
}
function prevDay(s){ return dateOnly(new Date(dOf(s).getTime()-DAY)); }
function duration(a,b){
  if(!a||!b) return '—';
  const ms = dOf(b)-dOf(a); if(ms<0) return '—';
  const m = Math.round(ms/60000);
  if (m<60) return m+' 分';
  const h = Math.floor(m/60); return h+' 小时 '+(m%60)+' 分';
}
function esc(s){ return String(s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }

/** 默认聚合方式的唯一启发式：键名含 loss|error 取最小值 */
function defaultAgg(metricKey){
  return /loss|error/i.test(metricKey) ? 'min' : 'max';
}
function aggregate(vals, how){
  const arr = vals.filter(isNum);
  if (!arr.length) return null;
  switch(how){
    case 'min': return Math.min.apply(null, arr);
    case 'median': { const s=arr.slice().sort((a,b)=>a-b); const m=Math.floor(s.length/2);
      return s.length%2 ? s[m] : (s[m-1]+s[m])/2; }
    case 'mean': return arr.reduce((a,b)=>a+b,0)/arr.length;
    case 'count': return arr.length;
    default: return Math.max.apply(null, arr);
  }
}
/** 分位分档（避免长尾数据全挤一档） */
function quantileScale(values, steps){
  const arr = Array.from(new Set(values.filter(isNum))).sort((a,b)=>a-b);
  if (!arr.length) return null;
  if (arr.length===1){ const v=arr[0]; return {min:v,max:v,th:Array.from({length:steps-1},()=>v)}; }
  const th=[];
  for(let i=1;i<steps;i++){ const q=(arr.length-1)*i/steps; const lo=Math.floor(q), hi=Math.ceil(q);
    th.push(lo===hi? arr[lo] : arr[lo]+(arr[hi]-arr[lo])*(q-lo)); }
  return {min:arr[0], max:arr[arr.length-1], th};
}
function scaleIndex(scale, v){
  if (scale===null || !isNum(v)) return -1;
  if (scale.min===scale.max) return 2;
  let i=0; while(i<scale.th.length && v>=scale.th[i]) i++;
  return i; // 0..4
}
const SEQ = ['#F1F3FE','#C3CBFB','#9DA9F7','#5563EA','#333CA8'];
const CAT = ['#D97757','#5B9E8A','#C9A227','#7E9BC7','#B07AA1','#8A8F98'];
function catColor(i){ return CAT[i%CAT.length]; }
function heatBg(i){ return i<0 ? 'transparent' : SEQ[i]; }

/** §5.1 变体族聚类：纯运行时推导 */
function clusterFamilies(rows, manualDims){
  const params = keyUnion(rows, 'params');
  const keys = params.map(p=>p.key);
  let dims;
  if (manualDims && manualDims.length){
    dims = manualDims.slice();
  } else {
    dims = keys.filter(k=>!RE_REPEAT.test(k) && cardinality(rows,'params',k) >= 2);
  }
  const groups = new Map();
  rows.forEach(e=>{
    const sigKey = dims.map(k=>k+'='+normVal((e.params||{})[k])).join('|');
    if(!groups.has(sigKey)) groups.set(sigKey, []);
    groups.get(sigKey).push(e);
  });
  const mk = metricKeys(rows);
  /* §5.1：取值组合相同 → 同一「配置组」；整组实验构成一个「变体族」 */
  const groupsList = Array.from(groups.values()).map((members, i)=>({
    id:'cfg-'+(i+1), members, values: dims.map(k=>members[0].params[k]),
  }));
  const kind = dims.length===0 ? 'repeat' : (dims.length>3 ? 'wide' : 'family');
  const families = rows.length ? [{
    id:'fam-1', index:1, dims, members:rows, groups:groupsList, kind,
  }] : [];
  return { dims, families, groups:groupsList, allKeys:keys, metricKeys:mk };
}
/** 该集合下出现频次最高的 metric 键 */
function metricKeys(rows){
  return keyUnion(rows,'metrics').map(m=>m.key);
}
function topMetricKey(rows){
  const ks = metricKeys(rows);
  if (!ks.length) return null;
  return ks[0];
}
function bestOf(rows, metricKey, dir){
  const vals = rows.map(e=>(e.metrics||{})[metricKey]).filter(isNum);
  if (!vals.length) return null;
  return dir===false ? Math.min.apply(null,vals) : Math.max.apply(null,vals);
}
