module.exports = function(nodeGlobs){
const {setTimeout,clearTimeout,setInterval,clearInterval,console,URLSearchParams} = nodeGlobs;
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
return {sandbox, document, window, location, history, navigator};
};
