// La quantità totale passa da Preparazione (campo nascosto 'qt') a Tariffazione
// ('t-qt', <input type="number">). Nel browser un input number SCARTA un valore
// con la virgola ("99,50" → ""): la Tariffazione vedeva qt = 0 e applicava solo
// la base dell'Allegato B, senza scaglioni (semisolide >50 g, sospensioni >250 ml),
// mentre la Scheda contava il peso reale → totali diversi.
//
// Qui il DOM finto si comporta come il browser per gli input number dichiarati
// in index.html (engines-consistency accetta qualunque stringa e non lo vedeva).
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(join(ROOT, 'index.html'), 'utf8');

// id degli <input type="number"> statici di index.html
const NUMBER_IDS = new Set();
for (const m of HTML.matchAll(/<input\b[^>]*>/gi)) {
  const tag = m[0];
  if (!/\btype="number"/i.test(tag)) continue;
  const id = tag.match(/\bid="([^"]+)"/i);
  if (id) NUMBER_IDS.add(id[1]);
}
// "valid floating-point number" dell'HTML: altrimenti il browser mette value = ''
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
    remove(){}, focus(){}, blur(){}, click(){}, closest(){ return null; },
    cloneNode(){ return makeEl(id); },
    getBoundingClientRect(){ return {top:0,left:0,width:0,height:0,bottom:0,right:0}; },
  };
  const isNumber = NUMBER_IDS.has(id);
  Object.defineProperty(el, 'value', {
    get(){ return this._value; },
    set(v){
      const s = v==null ? '' : String(v);
      this._value = isNumber && s !== '' && !NUMERO_VALIDO.test(s) ? '' : s;
    },
  });
  return el;
}

function buildCtx() {
  const pricingSrc = readFileSync(join(ROOT, 'pricing.js'), 'utf8');
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m, inline = '';
  while ((m = re.exec(HTML))) inline += '\n' + m[1] + '\n';
  inline = inline.replace(/\/\/ ── INIT ──[\s\S]*$/, ''); // togli il boot di rete
  ['tipoPrep','concMode','liberaCostoExtra','liberaRigheExtra','liberaRighe',
   'tipoTariff','tipoScheda'].forEach(n => {
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
    body: makeEl('body'), documentElement: makeEl('html'), head: makeEl('head'),
  };
  ctx.localStorage = { getItem:(k)=>lsMap.has(k)?lsMap.get(k):null, setItem:(k,v)=>lsMap.set(k,String(v)), removeItem:(k)=>lsMap.delete(k), clear:()=>lsMap.clear() };
  ctx.console = console; ctx.setTimeout = () => 0; ctx.clearTimeout = () => {}; ctx.requestAnimationFrame = () => 0;
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

  const parseEuros = (s) => { const out=[]; const r=/€\s*([0-9]+(?:[.,][0-9]+)?)/g; let mm; while((mm=r.exec(s))) out.push(parseFloat(mm[1].replace('.','').replace(',','.'))); return out; };
  const prezzoPubblico = () => { const h=byId('tariff-totale').innerHTML; const i=h.indexOf('Prezzo al pubblico'); const eu=parseEuros(i>=0?h.slice(i):h); return eu.length?eu[0]:null; };
  const schedaTotale = () => { const eu=parseEuros(byId('scheda-preview').innerHTML); return eu.length?eu[eu.length-1]:null; };

  function run(tipo, righe, fields) {
    store.clear();
    ctx.liberaRighe = []; ctx.liberaRigheExtra = []; ctx.liberaCostoExtra = 0; ctx._suppManRighe = [];
    ctx.tipoPrep = tipo.prep; ctx.tipoTariff = tipo.tariff; ctx.tipoScheda = tipo.scheda;
    ctx.liberaRighe = righe.map(r => ({ densita:null, prezzoAcq:0, fonte:null, lotto:'', h:'', ...r }));
    Object.entries(fields||{}).forEach(([k,v]) => { byId(k).value = v; });
    ctx.calcPrep(); ctx.calcTariff(); ctx.aggiornaScheda();
    return { tar: prezzoPubblico(), sch: schedaTotale(), qt: byId('t-qt').value, dett: byId('tariff-detail').innerHTML };
  }
  return { run };
}

describe('Quantità totale → Tariffazione (input number, virgola italiana)', () => {
  let H;
  beforeAll(() => { H = buildCtx(); });

  it('il DOM finto scarta la virgola come il browser (controllo del test)', () => {
    expect(NUMBER_IDS.has('t-qt')).toBe(true);
    const el = makeEl('t-qt');
    el.value = '99,50'; expect(el.value).toBe('');
    el.value = '99.50'; expect(el.value).toBe('99.50');
  });

  it('Unguento 99,5 g con righe in grammi: Tariffazione conta lo scaglione >50 g come la Scheda', () => {
    const r = H.run(
      { prep:'unguento', tariff:'semisolida', scheda:'unguento' },
      [ {nome:'Acido salicilico', qty:'2', unit:'g', isPa:true},
        {nome:'Vaselina bianca', qty:'97.5', unit:'g'} ],
      { 't-fl':'0' });
    expect(parseFloat(r.qt)).toBeCloseTo(99.5, 2);
    expect(r.dett).toContain('+0,75');        // base €13,30 + 1 scaglione da 50 g
    expect(r.sch).toBeCloseTo(r.tar, 2);
  });

  it('Sospensione 300 ml: Tariffazione conta lo scaglione >250 ml come la Scheda', () => {
    const r = H.run(
      { prep:'sospensione', tariff:'sospensione', scheda:'sospensione' },
      [ {nome:'Paracetamolo', qty:'12', unit:'g', isPa:true},
        {nome:'Sodio carbossimetilcellulosa', qty:'3', unit:'g'},
        {nome:'Acqua purificata', qty:'300', unit:'ml'} ],
      { 't-fl':'1.55', 'totale-prep':'300' });
    expect(parseFloat(r.qt)).toBeCloseTo(300, 2);
    expect(r.dett).toContain('+0,70');        // base €13,30 + 1 scaglione da 100 ml
    expect(r.sch).toBeCloseTo(r.tar, 2);
  });

  it('Unguento 40 g (sotto i 50 g): nessuno scaglione, motori coincidono', () => {
    const r = H.run(
      { prep:'unguento', tariff:'semisolida', scheda:'unguento' },
      [ {nome:'Acido salicilico', qty:'1', unit:'g', isPa:true},
        {nome:'Vaselina bianca', qty:'39', unit:'g'} ],
      { 't-fl':'0' });
    expect(parseFloat(r.qt)).toBeCloseTo(40, 2);
    expect(r.dett).not.toContain('+0,75');
    expect(r.sch).toBeCloseTo(r.tar, 2);
  });
});
