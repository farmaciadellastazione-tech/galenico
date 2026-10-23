// Email ordini: scelta del fornitore. Farmalabor resta il predefinito (stesso
// testo di prima); si possono aggiungere altri fornitori (nome + email), che
// cambiano destinatario e saluto dell'email.
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
  ctx.localStorage.setItem('gal_ordini', JSON.stringify([{ nome: 'Minoxidil' }]));
  const mail = () => {
    const u = opened[opened.length - 1] || '';
    const [, to, q] = u.match(/^mailto:([^?]*)\?(.*)$/) || [];
    const p = Object.fromEntries((q || '').split('&').map(s => s.split('=')).map(([k, v]) => [k, decodeURIComponent(v || '')]));
    return { to, subject: p.subject, body: p.body };
  };
  return { ctx, byId, lsMap, avvisi, mail };
}

describe('Fornitore per l\'email ordini', () => {
  it('predefinito: Farmalabor, come prima', () => {
    const H = buildCtx();
    H.ctx.ordinaEmail();
    const m = H.mail();
    expect(m.to).toBe('ordini@farmalabor.it');
    expect(m.body).toMatch(/^Spett\.le Farmalabor,/);
    expect(m.body).toContain('- Minoxidil');
  });

  it('fornitore aggiunto: diventa il selezionato, cambia destinatario e saluto', () => {
    const H = buildCtx();
    expect(H.ctx.fornitoreAggiungi('Acef', 'ordini@acef.it')).toBe(true);
    expect(H.ctx.fornitoreSelezionato().email).toBe('ordini@acef.it');
    H.ctx.ordinaEmail();
    const m = H.mail();
    expect(m.to).toBe('ordini@acef.it');
    expect(m.body).toMatch(/^Spett\.le Acef,/);
  });

  it('email non valida o nome vuoto: rifiutato con avviso, nessun fornitore aggiunto', () => {
    const H = buildCtx();
    expect(H.ctx.fornitoreAggiungi('Acef', 'non-una-email')).toBe(false);
    expect(H.ctx.fornitoreAggiungi('', 'ordini@acef.it')).toBe(false);
    expect(H.ctx.fornitoriLoad().map(f => f.nome)).toEqual(['Farmalabor']);
    expect(H.avvisi.length).toBe(2);
  });

  it('Farmalabor non si elimina; un fornitore aggiunto sì (e si torna a Farmalabor)', () => {
    const H = buildCtx();
    H.ctx.fornitoreAggiungi('Acef', 'ordini@acef.it');
    H.ctx.fornitoreElimina('ordini@farmalabor.it');
    expect(H.ctx.fornitoriLoad().map(f => f.nome)).toEqual(['Farmalabor', 'Acef']);
    H.ctx.fornitoreElimina('ordini@acef.it');
    expect(H.ctx.fornitoriLoad().map(f => f.nome)).toEqual(['Farmalabor']);
    expect(H.ctx.fornitoreSelezionato().nome).toBe('Farmalabor');
  });

  it('il fornitore scelto resta selezionato alla riapertura', () => {
    const H = buildCtx();
    H.ctx.fornitoreAggiungi('Acef', 'ordini@acef.it');
    const H2 = buildCtx(Object.fromEntries(H.lsMap));
    expect(H2.ctx.fornitoreSelezionato().nome).toBe('Acef');
  });

  it('il pulsante mostra il nome del fornitore scelto', () => {
    const H = buildCtx();
    H.ctx.fornitoreAggiungi('Acef', 'ordini@acef.it');
    expect(H.byId('btn-email-ordini').textContent).toBe('✉ Email Acef');
  });
});

describe('Fornitori: review v158', () => {
  it('email con caratteri che rompono il link (?, &, #, =) rifiutata', () => {
    const H = buildCtx();
    for (const e of ['ordini@acme.it?cc=x', 'ordini@acme.it#a', 'a&b@acme.it', 'ordini=x@acme.it'])
      expect([e, H.ctx.fornitoreAggiungi('Acme', e)]).toEqual([e, false]);
    expect(H.ctx.fornitoreAggiungi('Acme', 'ordini+gal@acme.it')).toBe(true);   // indirizzo valido normale
  });

  it('email di Farmalabor non si può aggiungere come altro fornitore (doppione)', () => {
    const H = buildCtx();
    expect(H.ctx.fornitoreAggiungi('Farmalabor Milano', 'ordini@farmalabor.it')).toBe(false);
    expect(H.ctx.fornitoriLoad().length).toBe(1);
  });

  it('se il browser non salva: avviso e risultato false', () => {
    const H = buildCtx();
    H.ctx.localStorage.setItem = () => { throw new Error('QuotaExceeded'); };
    expect(H.ctx.fornitoreAggiungi('Acef', 'ordini@acef.it')).toBe(false);
    expect(H.avvisi.some(a => /salvare/i.test(a))).toBe(true);
  });

  it('voci rovinate nell\'elenco salvato vengono ignorate (niente errori)', () => {
    const H = buildCtx({ gal_fornitori: '[null,"x",{"nome":"A"},{"nome":"Acef","email":"ordini@acef.it"}]',
                         gal_fornitore_sel: 'ordini@acef.it' });
    expect(H.ctx.fornitoriLoad().map(f => f.nome)).toEqual(['Farmalabor', 'Acef']);
    expect(H.ctx.fornitoreSelezionato().nome).toBe('Acef');
  });

  it('✕ chiede conferma: se annullato il fornitore resta', () => {
    const H = buildCtx();
    H.ctx.fornitoreAggiungi('Acef', 'ordini@acef.it');
    H.ctx.confirm = () => false;
    H.ctx.fornitoreEliminaSelezionato();
    expect(H.ctx.fornitoriLoad().map(f => f.nome)).toEqual(['Farmalabor', 'Acef']);
    H.ctx.confirm = () => true;
    H.ctx.fornitoreEliminaSelezionato();
    expect(H.ctx.fornitoriLoad().map(f => f.nome)).toEqual(['Farmalabor']);
  });

  it('Annulla svuota i campi; Invio nel campo email salva', () => {
    const H = buildCtx();
    H.byId('fornitore-nome').value = 'Acef';
    H.byId('fornitore-email').value = 'ordini@acef.it';
    H.ctx.fornitoreAnnulla();
    expect(H.byId('fornitore-nome').value).toBe('');
    expect(H.byId('fornitore-email').value).toBe('');
    H.byId('fornitore-nome').value = 'Acef';
    H.byId('fornitore-email').value = 'ordini@acef.it';
    H.ctx.fornitoreCampoKeydown({ key: 'Enter', preventDefault(){} });
    expect(H.ctx.fornitoreSelezionato().nome).toBe('Acef');
  });
});
