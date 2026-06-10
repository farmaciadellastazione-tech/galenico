// Test di integrazione: carica lo script REALE di index.html in un contesto vm
// con DOM/localStorage/fetch finti, esegue i veri calcPrep()/calcTariff()/
// aggiornaScheda() e verifica che Tariffazione e Scheda diano lo STESSO prezzo
// per soluzione, sospensione e capsule (i due motori non devono divergere).
//
// Anchor: Minoxidil 5% ≈ €21,84 (cross-check indipendente con le funzioni pure),
// così il test fallisce sia se i due motori divergono sia se il valore assoluto
// cambia inaspettatamente.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

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
  Object.defineProperty(el, 'value', { get(){ return this._value; }, set(v){ this._value = v==null?'':String(v); } });
  return el;
}

function buildCtx() {
  const pricingSrc = readFileSync(join(ROOT, 'pricing.js'), 'utf8');
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m, inline = '';
  while ((m = re.exec(html))) inline += '\n' + m[1] + '\n';
  inline = inline.replace(/\/\/ ── INIT ──[\s\S]*$/, ''); // togli il boot di rete
  ['tipoPrep','concMode','liberaCostoExtra','liberaRigheExtra','liberaRighe',
   'tipoTariff','tipoScheda'].forEach(n => {
    inline = inline.replace(new RegExp('^let '+n+'(\\b)', 'm'), 'var '+n+'$1');
  });

  const store = new Map();
  const byId = (id) => { if(!store.has(id)) store.set(id, makeEl(id)); return store.get(id); };
  const lsMap = new Map();
  const documentStub = {
    getElementById: byId, querySelector(){ return null; }, querySelectorAll(){ return []; },
    createElement(t){ return makeEl('_'+t); }, createElementNS(ns,t){ return makeEl('_'+t); },
    createTextNode(t){ return { textContent: t }; }, addEventListener(){}, removeEventListener(){},
    body: makeEl('body'), documentElement: makeEl('html'), head: makeEl('head'),
  };
  const ctx = {};
  ctx.globalThis = ctx; ctx.window = ctx; ctx.self = ctx;
  ctx.document = documentStub;
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
  ctx.showPage = () => {}; // querySelectorAll è finto: evita il crash di showPage nei flussi archivio

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
    return { tar: prezzoPubblico(), sch: schedaTotale(), comp: byId('t-comp').value, op: byId('t-op').value };
  }
  const read = () => ({ tar: prezzoPubblico(), sch: schedaTotale(), comp: byId('t-comp').value, op: byId('t-op').value });
  return { run, ctx, read, byId };
}

describe('Tariffazione ↔ Scheda: stesso prezzo (motore unico)', () => {
  let H;
  beforeAll(() => { H = buildCtx(); });

  it('Soluzione — Minoxidil 5% (anchor ≈ €21,84, filtrazione NON conteggiata)', () => {
    const r = H.run(
      { prep:'soluzione', tariff:'liquida', scheda:'soluzione' },
      [ {nome:'Minoxidil', qty:'5', unit:'g', isPa:true},
        {nome:'Etanolo 96°', qty:'50', unit:'g'},
        {nome:'Glicole propilenico', qty:'35', unit:'g'},
        {nome:'Acqua purificata', qty:'10', unit:'g'} ],
      { 't-fl':'1.55', 'totale-prep':'100' });
    expect(r.tar).not.toBeNull();
    expect(r.sch).toBeCloseTo(r.tar, 2);   // i due motori coincidono
    expect(r.tar).toBeCloseTo(21.84, 2);   // valore atteso (op=0: la filtrazione non è nel default, v129)
    expect(r.comp).toBe('2');
    expect(r.op).toBe('0');                // soluzione: nessuna op. tecnologica di default
  });

  it('Sospensione — 300 ml: scaglione volume >250 e op. omogeneizzazione', () => {
    const r = H.run(
      { prep:'sospensione', tariff:'sospensione', scheda:'sospensione' },
      [ {nome:'Paracetamolo', qty:'12', unit:'g', isPa:true},
        {nome:'Sodio carbossimetilcellulosa', qty:'3', unit:'g'},
        {nome:'Acqua purificata', qty:'300', unit:'ml'} ],
      { 't-fl':'1.55', 'totale-prep':'300' });
    expect(r.sch).toBeCloseTo(r.tar, 2);
    expect(r.op).toBe('1');                 // omogeneizzazione auto per sospensione
    expect(r.comp).toBe('1');               // 3 sostanze − 2
  });

  it('Unguento — 100 g: scaglione peso >50 g (voce 4) e op. emulsionamento', () => {
    const r = H.run(
      { prep:'unguento', tariff:'semisolida', scheda:'unguento' },
      [ {nome:'Acido salicilico', qty:'3', unit:'g', isPa:true},
        {nome:'Vaselina filante bianca', qty:'97', unit:'g'} ],
      { 't-fl':'1.55', 'totale-prep':'100' });
    expect(r.sch).toBeCloseTo(r.tar, 2);
    expect(r.op).toBe('1');                 // emulsionamento auto per semisolida
    expect(r.comp).toBe('0');               // 2 sostanze − 2
  });

  it('Capsule — 30 pz: base voce 7 sul numero reale (non su 0)', () => {
    const r = H.run(
      { prep:'capsule', tariff:'capsule', scheda:'capsule' },
      [ {nome:'Clobazam', qty:'300', unit:'mg', isPa:true},
        {nome:'Amido di riso', qty:'5', unit:'g'} ],
      { 't-fl':'0', 'caps-vuote-prezzo':'0.045', 'caps-vuote-nome':'Capsule gelatina dura taglia 0',
        'n-caps':'30', 'mg-pa-cps':'10', 'caps-taglia-lib':'0', 'caps-ncaps-lib':'30' });
    expect(r.sch).toBeCloseTo(r.tar, 2);
    expect(r.comp).toBe('0');               // 2 sostanze − 2
    expect(r.op).toBe('2');                 // setacciatura + polverizzazione (Clobazam cristallino) auto
  });

  it('Capsule — override manuale delle op. tecnologiche (campo sbloccato)', () => {
    H.run(
      { prep:'capsule', tariff:'capsule', scheda:'capsule' },
      [ {nome:'Clobazam', qty:'300', unit:'mg', isPa:true},
        {nome:'Amido di riso', qty:'5', unit:'g'} ],
      { 't-fl':'0', 'caps-vuote-prezzo':'0.045', 'caps-vuote-nome':'Capsule gelatina dura taglia 0',
        'n-caps':'30', 'mg-pa-cps':'10', 'caps-taglia-lib':'0', 'caps-ncaps-lib':'30' });
    // L'utente forza 4 operazioni: deve vincere sull'auto e riflettersi su entrambe le viste.
    H.ctx.opOnManualEdit('4');
    const r = H.read();
    expect(r.op).toBe('4');
    expect(r.sch).toBeCloseTo(r.tar, 2);
  });

  it('Cartine — 20 pz: base voce 7 sul numero reale (non su 0)', () => {
    // liberaRighe per cartine = quantità PER SINGOLA CARTINA.
    const r = H.run(
      { prep:'cartine', tariff:'cartine', scheda:'cartine' },
      [ {nome:'Paracetamolo', qty:'250', unit:'mg', isPa:true},
        {nome:'Lattosio monoidrato', qty:'100', unit:'mg'} ],
      { 't-fl':'0', 'cart-ncart-lib':'20' });
    expect(r.sch).toBeCloseTo(r.tar, 2);
    expect(r.op).toBe('2');                 // setacciatura + polverizzazione (Paracetamolo cristallino) auto
    expect(r.comp).toBe('0');               // 2 sostanze − 2
  });

  it('Capsule — recupero da archivio: Riapri ripristina la preparazione', () => {
    // 1. Prepara e salva in archivio una preparazione in capsule.
    const orig = H.run(
      { prep:'capsule', tariff:'capsule', scheda:'capsule' },
      [ {nome:'Clobazam', qty:'300', unit:'mg', isPa:true},
        {nome:'Amido di riso', qty:'5', unit:'g'} ],
      { 't-fl':'0', 'caps-vuote-prezzo':'0.045', 'caps-vuote-nome':'Capsule gelatina dura taglia 0',
        'n-caps':'30', 'mg-pa-cps':'10', 'caps-taglia-lib':'0', 'caps-ncaps-lib':'30',
        's-prep':'Clobazam 10 mg/cps', 's-farm':'Test' });
    H.ctx.salvaInArchivio();
    const arch = JSON.parse(H.ctx.localStorage.getItem('gal_archivio_schede_v1') || '[]');
    expect(arch.length).toBeGreaterThan(0);
    const id = arch[0].id;

    // 1b. Simula una scheda VECCHIA con prezzo memorizzato ERRATO (bug pre-v122).
    arch[0].prezzo = '99.99';
    H.ctx.localStorage.setItem('gal_archivio_schede_v1', JSON.stringify(arch));

    // 2. Carica una preparazione DIVERSA (stato sporco), come capita all'utente dopo.
    H.run(
      { prep:'soluzione', tariff:'liquida', scheda:'soluzione' },
      [ {nome:'Acido salicilico', qty:'3', unit:'g', isPa:true},
        {nome:'Etanolo 96°', qty:'50', unit:'g'} ],
      { 't-fl':'1.55', 'totale-prep':'100' });

    // 3. Riapri la scheda capsule: deve ripristinare la PREPARAZIONE (non lasciare la soluzione)
    //    e RICALCOLARE il prezzo (non tenere il 99,99 memorizzato).
    H.ctx.archRiapri(id);
    H.ctx.calcTariff();
    const r = H.read();
    expect(H.byId('caps-ncaps-lib').value).toBe('30');     // formula capsule ripristinata
    expect(H.byId('s-ncaps').value).toBe('30');
    expect(H.byId('s-prezzo').value).not.toBe('99.99');    // il prezzo errato NON sopravvive come override
    // Prova sostanziale: il totale della scheda è quello RICALCOLATO (≈32,03), non il 99,99
    // memorizzato (che, se sopravvivesse come override, comparirebbe qui come totale).
    expect(r.sch).toBeCloseTo(orig.sch, 2);
    expect(r.sch).not.toBeCloseTo(99.99, 1);
  });
});
