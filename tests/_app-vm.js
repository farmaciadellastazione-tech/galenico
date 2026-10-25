// Carica lo script REALE di index.html (con pricing.js) in un contesto vm con un
// DOM finto, come engines-consistency e quantita-tariffazione, ma:
//  - gli <input type="number"> di index.html scartano i valori non numerici
//    ("99,50" → "") come fa il browser;
//  - setTimeout esegue subito (i menu suggerimenti usano un debounce);
//  - l'inventario si passa a run() e finisce in localStorage come nell'app.
// Non è un file di test (non finisce in .test.js): lo importano i test.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(join(ROOT, 'index.html'), 'utf8');

export const NUMBER_IDS = new Set();
for (const m of HTML.matchAll(/<input\b[^>]*>/gi)) {
  if (!/\btype="number"/i.test(m[0])) continue;
  const id = m[0].match(/\bid="([^"]+)"/i);
  if (id) NUMBER_IDS.add(id[1]);
}
const NUMERO_VALIDO = /^-?(?:\d+(?:\.\d+)?|\.\d+)(?:[eE][-+]?\d+)?$/;

function makeEl(id) {
  const el = {
    id, _value: '', innerHTML: '', textContent: '', readOnly: false, checked: false,
    style: {}, dataset: {}, children: [], className: '', selectedIndex: 0, options: [],
    classList: { add(){}, remove(){}, contains(){return false}, toggle(){} },
    appendChild(c){ this.children.push(c); return c; },
    insertBefore(c){ this.children.unshift(c); return c; },
    removeChild(c){ return c; },
    querySelector(){ return null; }, querySelectorAll(){ return []; },
    addEventListener(){}, removeEventListener(){},
    setAttribute(){}, getAttribute(){ return null; }, removeAttribute(){},
    remove(){}, focus(){}, blur(){}, click(){}, closest(){ return null; }, contains(){ return false; },
    cloneNode(){ return makeEl(id); },
    getBoundingClientRect(){ return {top:0,left:0,width:0,height:0,bottom:0,right:0}; },
  };
  const isNumber = NUMBER_IDS.has(id);
  Object.defineProperty(el, 'value', {
    get(){ return this._value; },
    set(v){ const s = v==null ? '' : String(v); this._value = isNumber && s !== '' && !NUMERO_VALIDO.test(s) ? '' : s; },
  });
  return el;
}

export function buildApp() {
  const pricingSrc = readFileSync(join(ROOT, 'pricing.js'), 'utf8');
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m, inline = '';
  while ((m = re.exec(HTML))) inline += '\n' + m[1] + '\n';
  inline = inline.replace(/\/\/ ── INIT ──[\s\S]*$/, ''); // togli il boot di rete
  ['tipoPrep','concMode','concRichiesta','liberaCostoExtra','liberaRigheExtra','liberaRighe',
   'tipoTariff','tipoScheda','tarPADaAllegatoA'].forEach(n => {
    inline = inline.replace(new RegExp('^let '+n+'(\\b)', 'm'), 'var '+n+'$1');
  });

  const store = new Map();
  const byId = (id) => { if(!store.has(id)) store.set(id, makeEl(id)); return store.get(id); };
  const lsMap = new Map();
  const ctx = {};
  ctx.globalThis = ctx; ctx.window = ctx; ctx.self = ctx;
  ctx.document = {
    getElementById: byId, querySelector(){ return null; }, querySelectorAll(){ return []; },
    createElement(t){ return makeEl('_'+t); }, createElementNS(ns,t){ return makeEl('_'+t); },
    createTextNode(t){ return { textContent: t }; }, addEventListener(){}, removeEventListener(){},
    body: makeEl('body'), documentElement: makeEl('html'), head: makeEl('head'), activeElement: null,
  };
  ctx.localStorage = { getItem:(k)=>lsMap.has(k)?lsMap.get(k):null, setItem:(k,v)=>lsMap.set(k,String(v)), removeItem:(k)=>lsMap.delete(k), clear:()=>lsMap.clear() };
  ctx.console = console; ctx.setTimeout = (fn) => { fn(); return 0; }; ctx.clearTimeout = () => {}; ctx.requestAnimationFrame = () => 0;
  ctx.fetch = async () => ({ ok:false, status:0, json: async()=>({}), text: async()=>'' });
  ctx.location = { hash:'', href:'', search:'' };
  ctx.navigator = { language:'it', clipboard:{ writeText: async()=>{} } };
  ctx.alert = () => {}; ctx.confirm = () => true; ctx.prompt = () => null;
  ctx.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){}, addEventListener(){} });
  ctx.getComputedStyle = () => ({ getPropertyValue: () => '' });
  ctx.Image = class {}; ctx.URL = URL; ctx.Blob = class {};
  vm.createContext(ctx);
  vm.runInContext(pricingSrc, ctx, { filename: 'pricing.js' });
  vm.runInContext(inline, ctx, { filename: 'index-inline.js' });
  ctx.showPage = () => {};
  const INV_KEY = vm.runInContext('INV_KEY', ctx);

  const parseEuros = (s) => { const out=[]; const r=/€\s*([0-9]+(?:[.,][0-9]+)?)/g; let mm; while((mm=r.exec(s))) out.push(parseFloat(mm[1].replace('.','').replace(',','.'))); return out; };
  const prezzoPubblico = () => { const h=byId('tariff-totale').innerHTML; const i=h.indexOf('Prezzo al pubblico'); const eu=parseEuros(i>=0?h.slice(i):h); return eu.length?eu[0]:null; };
  const schedaTotale = () => { const eu=parseEuros(byId('scheda-preview').innerHTML); return eu.length?eu[eu.length-1]:null; };

  // Inventario locale (localStorage) senza toccare il resto dello stato.
  function setInv(inv) { lsMap.set(INV_KEY, JSON.stringify(inv || [])); }

  function run(tipo, righe, fields, inv) {
    store.clear();
    setInv(inv);
    ctx.liberaRighe = []; ctx.liberaRigheExtra = []; ctx.liberaCostoExtra = 0; ctx._suppManRighe = [];
    ctx.tipoPrep = tipo.prep; ctx.tipoTariff = tipo.tariff; ctx.tipoScheda = tipo.scheda;
    ctx.liberaRighe = righe.map(r => ({ densita:null, prezzoAcq:0, fonte:null, lotto:'', h:'', ...r }));
    Object.entries(fields||{}).forEach(([k,v]) => { byId(k).value = v; });
    ctx.calcPrep(); ctx.calcTariff(); ctx.aggiornaScheda();
    return { tar: prezzoPubblico(), sch: schedaTotale(), dett: byId('tariff-detail').innerHTML, extra: ctx.liberaRigheExtra };
  }
  return { run, ctx, byId, setInv, store };
}
