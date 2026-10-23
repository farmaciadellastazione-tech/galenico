// Etichette: quello che si vede in anteprima è quello che si stampa (anteprima,
// Stampa browser, testo per DYMO). Intestazione dai campi "Farmacia"/"Indirizzo",
// indirizzo breve per l'etichetta 2 ricavato togliendo CAP e telefono, e
// intestazione ricordata nel browser se modificata.
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

function buildCtx(ls = {}) {
  const pricingSrc = readFileSync(join(ROOT, 'pricing.js'), 'utf8');
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m, inline = '';
  while ((m = re.exec(html))) inline += '\n' + m[1] + '\n';
  inline = inline.replace(/\/\/ ── INIT ──[\s\S]*$/, ''); // niente boot di rete
  const store = new Map();
  const byId = (id) => { if(!store.has(id)) store.set(id, makeEl(id)); return store.get(id); };
  const lsMap = new Map(Object.entries(ls));
  const opened = [], avvisi = [];
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
  ctx.alert = (m) => { avvisi.push(String(m)); }; ctx.confirm = () => true; ctx.prompt = () => null;
  ctx.open = (u) => { opened.push(String(u)); };
  ctx.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){}, addEventListener(){} });
  ctx.getComputedStyle = () => ({ getPropertyValue: () => '' });
  ctx.Image = class {}; ctx.URL = URL; ctx.Blob = class {};
  vm.createContext(ctx);
  vm.runInContext(pricingSrc, ctx, { filename: 'pricing.js' });
  vm.runInContext(inline, ctx, { filename: 'index-inline.js' });
  const mail = () => {
    const u = opened[opened.length - 1] || '';
    const [, to, q] = u.match(/^mailto:([^?]*)\?(.*)$/) || [];
    const p = Object.fromEntries((q || '').split('&').map(s => s.split('=')).map(([k, v]) => [k, decodeURIComponent(v || '')]));
    return { to, subject: p.subject, body: p.body };
  };
  return { ctx, byId, lsMap, avvisi, mail };
}

const imposta = (H, farmacia, indirizzo) => {
  H.byId('e-farmacia').value = farmacia;
  H.byId('e-indirizzo').value = indirizzo;
  H.byId('e-nome').value = 'Lozione Minoxidil 5%';
};

describe('Etichette: anteprima = stampa', () => {
  it('indirizzo breve: toglie CAP e telefono', () => {
    const H = buildCtx();
    expect(H.ctx.etiqIndirizzoBreve('Via Fiume 75 — 19122 La Spezia — Tel. 0187-706147')).toBe('Via Fiume 75 — La Spezia');
    expect(H.ctx.etiqIndirizzoBreve('Via Roma 1, 20100 Milano')).toBe('Via Roma 1, Milano');
    expect(H.ctx.etiqIndirizzoBreve('Corso Italia 3 — Torino')).toBe('Corso Italia 3 — Torino');
  });

  it('campi modificati: etichetta 1 e 2 in anteprima e testo Dymo usano gli stessi dati', () => {
    const H = buildCtx();
    imposta(H, 'Farmacia Rossi', 'Via Roma 1 — 20100 Milano — Tel. 02-123');
    H.ctx.etiqAggiorna();
    expect(H.byId('ev-farmacia').textContent).toBe('Farmacia Rossi');
    expect(H.byId('ev2-farmacia').textContent).toBe('Farmacia Rossi');
    expect(H.byId('ev2-indirizzo').textContent).toBe('Via Roma 1 — Milano');
    const t = H.ctx.etiqTesti();
    expect(t.testo1.startsWith('Farmacia Rossi\nVia Roma 1 — 20100 Milano — Tel. 02-123\n')).toBe(true);
    expect(t.testo2.startsWith('Farmacia Rossi — Via Roma 1 — Milano\n')).toBe(true);
    expect(t.testo1 + t.testo2).not.toMatch(/Stazione|Via Fiume|______/);
  });

  it('senza modifiche: testi della tua farmacia come oggi', () => {
    const H = buildCtx();
    imposta(H, 'Farmacia Della Stazione', 'Via Fiume 75 — 19122 La Spezia — Tel. 0187-706147');
    const t = H.ctx.etiqTesti();
    expect(t.testo1.startsWith('Farmacia Della Stazione\nVia Fiume 75 — 19122 La Spezia — Tel. 0187-706147\n')).toBe(true);
    expect(t.testo2.startsWith('Farmacia Della Stazione — Via Fiume 75 — La Spezia\n')).toBe(true);
  });

  it('messaggio Dymo: testo da copiare, nessuna promessa di stampa automatica', async () => {
    const H = buildCtx();
    imposta(H, 'Farmacia Rossi', 'Via Roma 1 — Milano');
    H.ctx.stampaDymo();
    for (let i = 0; i < 5; i++) await new Promise(r => setImmediate(r));
    const msg = H.avvisi.join('\n');
    expect(msg).toContain('Farmacia Rossi');
    expect(msg).toMatch(/copia/i);
    expect(msg).not.toMatch(/versione completa/i);
  });
});

describe('Etichette: intestazione ricordata', () => {
  it('modificata dall\'utente: salvata e ripristinata alla riapertura', () => {
    const H = buildCtx();
    imposta(H, 'Farmacia Rossi', 'Via Roma 1 — Milano');
    H.ctx.etiqIntestazioneModificata();
    const H2 = buildCtx(Object.fromEntries(H.lsMap));
    H2.byId('e-farmacia').value = 'Farmacia Della Stazione';        // default HTML
    H2.byId('e-indirizzo').value = 'Via Fiume 75 — La Spezia';
    H2.ctx.etiqCaricaIntestazione();
    expect(H2.byId('e-farmacia').value).toBe('Farmacia Rossi');
    expect(H2.byId('e-indirizzo').value).toBe('Via Roma 1 — Milano');
  });

  it('mai modificata: i default restano (niente salvataggio automatico)', () => {
    const H = buildCtx();
    H.byId('e-farmacia').value = 'Farmacia Della Stazione';
    H.ctx.etiqAggiorna();
    H.ctx.etiqCaricaIntestazione();
    expect(H.byId('e-farmacia').value).toBe('Farmacia Della Stazione');
    expect([...H.lsMap.keys()].some(k => k.startsWith('gal_etichetta'))).toBe(false);
  });
});

describe('Etichette: review v160', () => {
  it('salva solo il campo modificato; vuoto o uguale al predefinito → torna al predefinito', () => {
    const H = buildCtx();
    H.byId('e-farmacia').value = 'Farmacia Rossi';
    H.byId('e-indirizzo').value = 'Via Fiume 75 — 19122 La Spezia — Tel. 0187-706147';
    H.ctx.etiqIntestazioneModificata('farmacia');
    expect(H.lsMap.get('gal_etichetta_farmacia')).toBe('Farmacia Rossi');
    expect(H.lsMap.has('gal_etichetta_indirizzo')).toBe(false);          // non toccato → non salvato
    H.byId('e-farmacia').value = '';
    H.ctx.etiqIntestazioneModificata('farmacia');
    expect(H.lsMap.has('gal_etichetta_farmacia')).toBe(false);
    expect(H.byId('e-farmacia').value).toBe('Farmacia Della Stazione');   // ripristinato
    H.byId('e-farmacia').value = 'Farmacia Della Stazione';
    H.ctx.etiqIntestazioneModificata('farmacia');
    expect(H.lsMap.has('gal_etichetta_farmacia')).toBe(false);
  });

  it('indirizzo breve: altri modi di scrivere il telefono; CAP solo prima della città', () => {
    const H = buildCtx();
    const b = H.ctx.etiqIndirizzoBreve;
    expect(b('Via Roma 1 — 20100 Milano — Telefono 02-123')).toBe('Via Roma 1 — Milano');
    expect(b('Via Roma 1 20100 Milano Tel. 02-123')).toBe('Via Roma 1 Milano');
    expect(b('Via Roma 1 — 20100 Milano ☎ 02 123')).toBe('Via Roma 1 — Milano');
    expect(b('Via T. Tasso 12 — 20100 Milano')).toBe('Via T. Tasso 12 — Milano');
  });

  it('anteprima e testo Dymo dalla stessa fonte (righe vuote, H ripulite, stessi dati etichetta 2)', () => {
    const H = buildCtx();
    H.byId('e-farmacia').value = 'Farmacia Rossi';
    H.byId('e-indirizzo').value = 'Via Roma 1 — 20100 Milano';
    H.byId('e-nome').value = 'Crema';
    H.byId('e-qty').value = '50 g';
    H.byId('e-h').value = '   ';
    H.ctx.etiqAggiorna();
    const t = H.ctx.etiqTesti();
    const r1 = t.testo1.split('\n'), r2 = t.testo2.split('\n');
    expect(H.byId('ev-paziente').textContent).toBe('');           // niente "sig. —" in stampa
    expect(r1).not.toContain('sig. —');
    expect(r1).toContain(H.byId('ev-nome').textContent);          // stessa riga nome+quantità
    expect(r2[0]).toBe(H.byId('ev2-farmacia').textContent + ' — ' + H.byId('ev2-indirizzo').textContent);
    expect(r2.some(r => r.trim() === '' )).toBe(false);           // H solo spazi → nessuna riga
  });
});
