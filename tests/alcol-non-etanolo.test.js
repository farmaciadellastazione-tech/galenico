// "Alcool cetilico", "Alcool benzilico" ecc. NON sono etanolo, ma il vecchio
// riconoscimento per sottostringa ("contiene alcol/alcool") li trattava come tale
// (densità 0,807, % etanolo, procedura). Test a confronto: la stessa formula con
// l'alcol e con un nome neutro ("Xyzzy" / "Qwyzzk", stessa quantità e
// prezzo 0) deve dare gli stessi risultati — il nome non deve contare.
import { describe, it, expect } from 'vitest';
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
  inline = inline.replace(/\/\/ ── INIT ──[\s\S]*$/, ''); // niente boot di rete
  ['tipoPrep','liberaRighe','liberaRigheExtra','tipoTariff','tipoScheda'].forEach(n => {
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
  ctx.console = { ...console, warn(){} };
  ctx.setTimeout = () => 0; ctx.clearTimeout = () => {}; ctx.requestAnimationFrame = () => 0;
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

  function run(tipo, righe) {
    store.clear();
    ctx.liberaRigheExtra = []; ctx._suppManRighe = [];
    ctx.tipoPrep = tipo.prep; ctx.tipoTariff = tipo.tariff; ctx.tipoScheda = tipo.scheda;
    ctx.liberaRighe = righe.map(r => ({ densita:null, prezzoAcq:0, fonte:null, lotto:'', h:'', ...r }));
    ctx.calcPrep(); ctx.calcTariff(); ctx.aggiornaScheda();
    return {
      tar: prezzoPubblico(), sch: schedaTotale(),
      vol: ctx.liberaSommaVolumeLiquidi(),
      percEt: byId('perc-et').value,
      sEt: byId('s-et').value,
      proc: byId('procedura').innerHTML + ' ' + byId('scheda-preview').innerHTML,
    };
  }
  return { ctx, run };
}

const CREMA = { prep:'unguento', tariff:'semisolida', scheda:'unguento' };
const SOLUZ = { prep:'soluzione', tariff:'liquida', scheda:'soluzione' };

describe('Altri alcoli non sono etanolo', () => {
  it('densità: "Alcool cetilico" / "Alcool benzilico" non hanno la densità dell\'etanolo', () => {
    const { ctx } = buildCtx();
    expect(ctx.getDensita('Alcool cetilico')).not.toBe(0.807);
    expect(ctx.getDensita('Alcool benzilico')).not.toBe(0.807);
    expect(ctx.getDensita('Etanolo 96°')).toBe(0.807);      // l'etanolo resta etanolo
    expect(ctx.getDensita('Alcool etilico')).toBe(0.807);
  });

  it('crema con Alcool cetilico = stessa crema con "Xyzzy" (prezzo, motore unico)', () => {
    const H = buildCtx();
    const base = [ {nome:'Acido salicilico', qty:'2', unit:'g', isPa:true},
                   {nome:'Vaselina', qty:'88', unit:'g'} ];
    const a = H.run(CREMA, [...base, {nome:'Alcool cetilico', qty:'10', unit:'g'}]);
    const b = H.run(CREMA, [...base, {nome:'Xyzzy',          qty:'10', unit:'g'}]);
    expect(a.tar).not.toBeNull();
    expect(a.sch).toBeCloseTo(a.tar, 2);   // motore unico
    expect(a.tar).toBeCloseTo(b.tar, 2);   // il nome "alcool" non cambia il prezzo
    expect(a.sch).toBeCloseTo(b.sch, 2);
  });

  it('soluzione con Alcool benzilico: volume, % etanolo e prezzo come con "Qwyzzk"', () => {
    const H = buildCtx();
    const base = [ {nome:'Minoxidil', qty:'5', unit:'g', isPa:true},
                   {nome:'Acqua purificata', qty:'94', unit:'ml'} ];
    const a = H.run(SOLUZ, [...base, {nome:'Alcool benzilico', qty:'1', unit:'g'}]);
    const b = H.run(SOLUZ, [...base, {nome:'Qwyzzk',   qty:'1', unit:'g'}]);
    expect(a.vol).toBeCloseTo(b.vol, 3);
    expect(a.percEt).toBe(b.percEt);       // nessun etanolo in formula
    expect(a.sEt).toBe(b.sEt);
    expect(a.sch).toBeCloseTo(a.tar, 2);
    expect(a.tar).toBeCloseTo(b.tar, 2);
  });

  it('procedura: un alcol non-etanolo non viene descritto come etanolo', () => {
    const H = buildCtx();
    const a = H.run(SOLUZ, [ {nome:'Minoxidil', qty:'5', unit:'g', isPa:true},
                             {nome:'Alcool benzilico', qty:'1', unit:'g'},
                             {nome:'Acqua purificata', qty:'94', unit:'ml'} ]);
    const b = H.run(SOLUZ, [ {nome:'Minoxidil', qty:'5', unit:'g', isPa:true},
                             {nome:'Qwyzzk', qty:'1', unit:'g'},
                             {nome:'Acqua purificata', qty:'94', unit:'ml'} ]);
    const norm = (s) => s.replace(/alcool benzilico|qwyzzk/gi, 'X');
    expect(norm(a.proc)).toBe(norm(b.proc));
  });

  it('importazione AI: "Alcool cetilico" non è etanolo', () => {
    const { ctx } = buildCtx();
    expect(ctx._aiIsEtanolo('Alcool cetilico')).toBe(false);
    expect(ctx._aiIsEtanolo('Etanolo 96°')).toBe(true);
  });
});

// Review v156: un elenco di esclusioni non basta (ogni alcol non elencato
// diventava etanolo). Ora si accettano SOLO le forme sicure di etanolo.
describe('isEtanoloNome: solo forme sicure di etanolo (review v156)', () => {
  it('alcoli non elencati, punteggiatura: NON etanolo e nessuna densità 0,807', () => {
    const { ctx } = buildCtx();
    for (const n of ['Alcool cetearilico', 'Alcool isostearilico', 'Alcool propilico', 'Alcool behenilico',
                     'Alcool 2-feniletilico', 'Alcool diclorobenzilico', 'Alcool, cetilico', 'Alcool (cetilico)']) {
      expect([n, ctx.isEtanoloNome(n)]).toEqual([n, false]);
      expect([n, ctx.getDensita(n)]).not.toEqual([n, 0.807]);
    }
  });

  it('forme di etanolo riconosciute (anche veicoli idroalcolici)', () => {
    const { ctx } = buildCtx();
    for (const n of ['Etanolo 96°', 'Alcool', 'Alcool 96°', 'Alcool al 96%', 'Alcol 70', 'Alcool etilico',
                     'Alcool etilico denaturato', 'Alcool denaturato', 'Alcool assoluto', 'Etil alcool',
                     'Estratto in etanolo', 'Soluzione idroalcolica 70%', 'Gel idroalcolico'])
      expect([n, ctx.isEtanoloNome(n)]).toEqual([n, true]);
  });

  it('import AI: veicolo idroalcolico riconosciuto come etanolo', () => {
    const { ctx } = buildCtx();
    expect(ctx._aiIsEtanolo('Soluzione idroalcolica 70%')).toBe(true);
    expect(ctx._aiIsEtanolo('Alcool cetearilico')).toBe(false);
  });
});

// Stesso difetto per l'acqua: "contiene acqua" = acqua di riempimento. Acqua di
// rose / hamamelis / termale / ossigenata sono ingredienti, non il riempimento.
describe('Acque aromatiche e acqua ossigenata non sono acqua di riempimento', () => {
  it('isAcquaNome: solo acqua "semplice"', () => {
    const { ctx } = buildCtx();
    for (const n of ['Acqua', 'Acqua purificata', 'Acqua depurata', 'Acqua distillata', 'Acqua bidistillata',
                     'Acqua demineralizzata', 'Acqua deionizzata', 'Acqua sterile', 'Acqua per preparazioni iniettabili'])
      expect([n, ctx.isAcquaNome(n)]).toEqual([n, true]);
    for (const n of ['Acqua di rose', 'Acqua di hamamelis', 'Acqua termale', 'Acqua ossigenata', 'Acqua di calce'])
      expect([n, ctx.isAcquaNome(n)]).toEqual([n, false]);
  });

  it('grado alcolico: "Acqua di rose" (prima dell\'acqua purificata) non viene sovrascritta', () => {
    const H = buildCtx();
    H.run(SOLUZ, [ {nome:'Minoxidil', qty:'5', unit:'g', isPa:true},
                   {nome:'Etanolo 96°', qty:'30', unit:'ml'},
                   {nome:'Acqua di rose', qty:'20', unit:'ml'},
                   {nome:'Acqua purificata', qty:'45', unit:'ml'} ]);
    H.ctx.document.getElementById('vol-soluzione').value = '100';
    H.ctx.document.getElementById('grado-alc').value = '30';
    H.ctx.gradoAlcChanged();
    const righe = H.ctx.liberaRighe;
    expect(righe.find(r => r.nome === 'Acqua di rose').qty).toBe('20');
    expect(H.ctx.liberaSommaVolumeLiquidi()).toBeCloseTo(100, 1);
  });

  it('grado alcolico: "Acqua ossigenata" non viene usata come acqua di riempimento', () => {
    const H = buildCtx();
    H.run(SOLUZ, [ {nome:'Minoxidil', qty:'5', unit:'g', isPa:true},
                   {nome:'Acqua ossigenata', qty:'10', unit:'ml'},
                   {nome:'Etanolo 96°', qty:'30', unit:'ml'} ]);
    H.ctx.document.getElementById('vol-soluzione').value = '100';
    H.ctx.document.getElementById('grado-alc').value = '20';
    H.ctx.gradoAlcChanged();
    const righe = H.ctx.liberaRighe;
    expect(righe.find(r => r.nome === 'Acqua ossigenata').qty).toBe('10');
    expect(righe.some(r => r.nome === 'Acqua purificata')).toBe(true);   // riempimento aggiunto a parte
  });

  it('procedura: "Acqua di rose" compare come ingrediente, come un nome neutro', () => {
    const H = buildCtx();
    const con = (nome) => H.run(SOLUZ, [ {nome:'Minoxidil', qty:'5', unit:'g', isPa:true},
                                         {nome, qty:'20', unit:'ml'},
                                         {nome:'Acqua purificata', qty:'80', unit:'ml'} ]).proc
      .split('Tariffazione — D.M.')[0];   // solo procedura (i prezzi sono un altro tema)
    const norm = (s) => s.replace(/acqua di rose|qwyzzk/gi, 'X');
    expect(norm(con('Acqua di rose'))).toBe(norm(con('Qwyzzk')));
  });

  it('import AI: "Acqua di rose" non è l\'acqua di riempimento', () => {
    const { ctx } = buildCtx();
    expect(ctx._aiIsAcqua('Acqua di rose')).toBe(false);
    expect(ctx._aiIsAcqua('Acqua purificata')).toBe(true);
  });
});

// Review v162: per l'acqua i nomi "semplici" sono moltissimi (abbreviazioni,
// F.U., q.b., quantità, marca): è acqua tutto ciò che inizia con "acqua"
// TRANNE le acque-ingrediente riconoscibili.
describe('isAcquaNome: nomi abbreviati e con sigle (review v162)', () => {
  it('acqua semplice scritta in tanti modi', () => {
    const { ctx } = buildCtx();
    for (const n of ['Acqua depurata F.U.', 'Acqua dep.', 'Acqua dist.', 'Acqua purificata q.b.',
                     'Acqua purificata 1 L', 'acqua p.p.i.', 'Acqua purificata Ph. Eur.', 'Acqua depurata (Farmalabor)'])
      expect([n, ctx.isAcquaNome(n)]).toEqual([n, true]);
    for (const n of ["Acqua d'arancio", 'Acqua distillata di rose', 'Acqua aromatica di menta', 'Acqua termale'])
      expect([n, ctx.isAcquaNome(n)]).toEqual([n, false]);
  });

  it('grado alcolico con "Acqua depurata F.U.": niente falso avviso né doppia riga d\'acqua', () => {
    const H = buildCtx();
    let avviso = '';
    H.ctx.alert = (m) => { avviso = m; };
    H.run(SOLUZ, [ {nome:'Minoxidil', qty:'5', unit:'g', isPa:true},
                   {nome:'Etanolo 96°', qty:'30', unit:'ml'},
                   {nome:'Acqua depurata F.U.', qty:'70', unit:'ml'} ]);
    H.ctx.document.getElementById('vol-soluzione').value = '100';
    H.ctx.document.getElementById('grado-alc').value = '50';
    H.ctx.gradoAlcChanged();
    expect(avviso).toBe('');
    expect(H.ctx.liberaRighe.filter(r => /acqua/i.test(r.nome)).length).toBe(1);
    expect(H.ctx.liberaSommaVolumeLiquidi()).toBeCloseTo(100, 1);
  });
});

// Garanzia richiesta dall'utente (v164, ricerca prezzi): calcoli e ricerche di
// prezzo LEGGONO soltanto. Inventario, archivio e ordini salvati non vengono mai
// scritti né cancellati.
describe('I calcoli non toccano i dati salvati', () => {
  it('calcPrep / calcTariff / aggiornaScheda / invGetPrezzo: nessuna scrittura su inventario, archivio, ordini', () => {
    const H = buildCtx();
    const scritture = [];
    const ls = H.ctx.localStorage;
    const set = ls.setItem, rem = ls.removeItem;
    ls.setItem = (k, v) => { scritture.push(k); return set(k, v); };
    ls.removeItem = (k) => { scritture.push(k); return rem(k); };
    for (const tipo of [SOLUZ, CREMA]) {
      H.run(tipo, [ {nome:'Acido ialuronico', qty:'1', unit:'g', isPa:true},
                    {nome:'Acqua di rose', qty:'20', unit:'ml'},
                    {nome:'Olio di jojoba', qty:'10', unit:'g'},
                    {nome:'Acqua purificata', qty:'69', unit:'ml'} ]);
    }
    H.ctx.invGetPrezzo('Acido ialuronico', H.ctx.invLoadMerged());
    const protette = scritture.filter(k => /gal_(inventario|archivio|ordini)/.test(k));
    expect(protette).toEqual([]);
  });
});
