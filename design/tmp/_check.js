
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
function viewMatrix(v){
  const idea = ideaById(v.ideaId);
  const scope = state.mtx.scope || 'idea';
  const versions = scope==='idea' ? versionsOfIdea(v.ideaId) : [v];
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
      ${seg([{v:'idea',t:'本 Idea 全部版本'},{v:'version',t:'仅本版本'}], scope, 'set-mxscope')}
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
