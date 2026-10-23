// Modalità demo (?demo=1): versione di prova da far girare tra colleghi.
// Carica lo script REALE di index.html (boot incluso) in un contesto vm e
// verifica che in demo:
//  - nessuna richiesta vada a api.github.com (né inventario né preventivi),
//    anche se nel browser c'è un token GitHub salvato;
//  - Scheda ed email ordini non riportino i dati della Farmacia della Stazione.
// Senza ?demo=1 il comportamento deve restare quello di produzione.
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

async function boot(search, { token, ls = {} } = {}) {
  const pricingSrc = readFileSync(join(ROOT, 'pricing.js'), 'utf8');
  const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let m, inline = '';
  while ((m = re.exec(html))) inline += '\n' + m[1] + '\n';

  const store = new Map();
  const byId = (id) => { if(!store.has(id)) store.set(id, makeEl(id)); return store.get(id); };
  const lsMap = new Map();
  if (token) lsMap.set('gal_gh_token', token);
  Object.entries(ls).forEach(([k, v]) => lsMap.set(k, v));
  const fetched = [];
  const opened = [];
  const ctx = {};
  ctx.globalThis = ctx; ctx.window = ctx; ctx.self = ctx;
  ctx.document = {
    getElementById: byId, querySelector(){ return null; }, querySelectorAll(){ return []; },
    createElement(t){ return makeEl('_'+t); }, createElementNS(ns,t){ return makeEl('_'+t); },
    createTextNode(t){ return { textContent: t }; }, addEventListener(){}, removeEventListener(){},
    body: makeEl('body'), documentElement: makeEl('html'), head: makeEl('head'),
  };
  ctx.localStorage = { getItem:(k)=>lsMap.has(k)?lsMap.get(k):null, setItem:(k,v)=>lsMap.set(k,String(v)), removeItem:(k)=>lsMap.delete(k), clear:()=>lsMap.clear() };
  ctx.console = { ...console, warn(){}, error(){} };
  ctx.setTimeout = () => 0; ctx.clearTimeout = () => {}; ctx.requestAnimationFrame = () => 0;
  ctx.fetch = async (url) => { fetched.push(String(url)); return { ok:true, status:200, json: async()=>({ files:{} }), text: async()=>'' }; };
  ctx.open = (url) => { opened.push(String(url)); };
  ctx.location = { hash:'', href:'', search };
  ctx.navigator = { language:'it', clipboard:{ writeText: async()=>{} } };
  ctx.alert = () => {}; ctx.confirm = () => true; ctx.prompt = () => null;
  ctx.matchMedia = () => ({ matches:false, addListener(){}, removeListener(){}, addEventListener(){} });
  ctx.getComputedStyle = () => ({ getPropertyValue: () => '' });
  ctx.Image = class {}; ctx.URL = URL; ctx.URLSearchParams = URLSearchParams; ctx.Blob = class {};
  vm.createContext(ctx);
  vm.runInContext(pricingSrc, ctx, { filename: 'pricing.js' });
  vm.runInContext(inline, ctx, { filename: 'index-inline.js' });
  for (let i = 0; i < 20; i++) await new Promise(r => setImmediate(r)); // lascia finire il boot async
  const gh = () => fetched.filter(u => u.includes('api.github.com'));
  const parseEuros = (s) => { const out=[]; const r=/€\s*([0-9]+(?:[.,][0-9]+)?)/g; let mm; while((mm=r.exec(s))) out.push(parseFloat(mm[1].replace('.','').replace(',','.'))); return out; };
  const prezzoPubblico = () => { const h=byId('tariff-totale').innerHTML; const i=h.indexOf('Prezzo al pubblico'); const eu=parseEuros(i>=0?h.slice(i):h); return eu.length?eu[0]:null; };
  const schedaTotale = () => { const eu=parseEuros(byId('scheda-preview').innerHTML); return eu.length?eu[eu.length-1]:null; };
  return { ctx, byId, fetched, gh, opened, lsMap, prezzoPubblico, schedaTotale, eval: (src) => vm.runInContext(src, ctx) };
}

describe('Modalità demo (?demo=1)', () => {
  it('DEMO_MODE è attivo solo con ?demo nel link', async () => {
    expect((await boot('?demo=1')).eval('DEMO_MODE')).toBe(true);
    expect((await boot('')).eval('DEMO_MODE')).toBe(false);
  });

  it('produzione: al boot legge il Gist preventivi (controllo che lo spy funzioni)', async () => {
    const H = await boot('');
    expect(H.gh().length).toBeGreaterThan(0);
  });

  it('demo: nessuna richiesta a GitHub al boot, anche con token salvato', async () => {
    const H = await boot('?demo=1', { token: 'ghp_finto' });
    expect(H.gh()).toEqual([]);
  });

  it('demo: salvare inventario o preventivi non scrive sui Gist', async () => {
    const H = await boot('?demo=1', { token: 'ghp_finto' });
    await H.eval('invSave([])');
    await H.eval('prevSyncToGist()');
    expect(H.gh()).toEqual([]);
  });

  it('demo: la Scheda non riporta i dati della Farmacia della Stazione', async () => {
    const H = await boot('?demo=1');
    H.eval('aggiornaScheda()');
    const out = H.byId('scheda-preview').innerHTML;
    expect(out).not.toMatch(/Stazione|Via Fiume/);
    expect(out).toContain('Farmacia ______');
  });

  it('produzione: la Scheda riporta ancora i dati della farmacia', async () => {
    const H = await boot('');
    H.eval('aggiornaScheda()');
    expect(H.byId('scheda-preview').innerHTML).toContain('Farmacia della Stazione');
  });

  it('demo: etichette e email ordini senza dati della farmacia', async () => {
    const H = await boot('?demo=1');
    expect(H.byId('e-farmacia').value).toBe('Farmacia ______');
    expect(H.byId('e-indirizzo').value).not.toMatch(/Via Fiume/);
    H.ctx.localStorage.setItem('gal_ordini', JSON.stringify([{ nome: 'Minoxidil' }]));
    H.eval('ordinaEmail()');
    const mail = decodeURIComponent(H.opened[0] || '');
    expect(mail).toContain('Minoxidil');
    expect(mail).not.toMatch(/Stazione|Via Fiume|01317570115|6706/);
  });
});

describe('Volume soluzione', () => {
  it('Invio applica il nuovo volume e riscala le righe (non solo uscendo dal campo)', async () => {
    const H = await boot('?demo=1');
    H.eval('caricaEsempioDemo()');
    H.byId('vol-soluzione').value = '100';
    let prevented = false;
    H.eval('volSoluzioneKeydown')({ key: 'Enter', preventDefault(){ prevented = true; } });
    const q = H.eval('liberaRighe').map(r => parseFloat(r.qty));
    expect(q[0]).toBeCloseTo(4.7285, 3);   // Minoxidil scalato da 5 g (105,7 ml → 100 ml)
    expect(q[1]).toBeCloseTo(47.2851, 3);  // Etanolo 96°
    expect(prevented).toBe(true);
  });

  it('altri tasti non riscalano', async () => {
    const H = await boot('?demo=1');
    H.eval('caricaEsempioDemo()');
    H.byId('vol-soluzione').value = '100';
    H.eval('volSoluzioneKeydown')({ key: '0', preventDefault(){} });
    expect(parseFloat(H.eval('liberaRighe')[0].qty)).toBe(5);
  });
});

describe('Grado alcolico', () => {
  // Esempio Minoxidil portato a 100 ml: il veicolo contiene anche Glicole (~32 ml),
  // che il calcolo dell'acqua deve lasciare al suo posto.
  async function esempio100() {
    const H = await boot('?demo=1');
    H.eval('caricaEsempioDemo()');
    H.byId('vol-soluzione').value = '100';
    H.eval('volSoluzioneChanged()');
    return H;
  }
  const stato = (H) => H.eval(`(() => {
    const vol = liberaSommaVolumeLiquidi();
    return { vol, grado: calcSoluzioneInfo(vol, 'ml').grado,
             glicole: parseFloat(liberaRighe.find(r => r.nome.startsWith('Glicole')).qty) };
  })()`);

  it('grado 50 con glicole in formula: volume resta 100 ml e il grado è davvero 50', async () => {
    const H = await esempio100();
    H.byId('grado-alc').value = '50';
    H.eval('gradoAlcChanged()');
    const s = stato(H);
    expect(s.vol).toBeCloseTo(100, 1);
    expect(s.grado).toBeCloseTo(50, 1);
    expect(s.glicole).toBeCloseTo(33.0995, 3);   // glicole non toccato
  });

  it('grado impossibile (non c\'è spazio per etanolo + altri liquidi): formula invariata', async () => {
    const H = await esempio100();
    const prima = JSON.stringify(H.eval('liberaRighe'));
    let avviso = '';
    H.ctx.alert = (m) => { avviso = m; };
    H.byId('grado-alc').value = '90';
    H.eval('gradoAlcChanged()');
    expect(JSON.stringify(H.eval('liberaRighe'))).toBe(prima);
    expect(avviso).toMatch(/massimo/i);
  });

  it('Invio sul campo Grado applica il valore', async () => {
    const H = await esempio100();
    H.byId('grado-alc').value = '50';
    let prevented = false;
    H.eval('gradoAlcKeydown')({ key: 'Enter', preventDefault(){ prevented = true; } });
    expect(stato(H).grado).toBeCloseTo(50, 1);
    expect(prevented).toBe(true);
  });
});

describe('Rotellina sui campi numerici', () => {
  const campo = (type) => { const el = { type, blurred: false, blur(){ this.blurred = true; } }; return el; };

  it('campo numerico con focus: la rotellina lo lascia (non cambia il valore)', async () => {
    const H = await boot('');
    const el = campo('number');
    H.ctx.document.activeElement = el;
    H.eval('numberWheelBlur')({ target: el });
    expect(el.blurred).toBe(true);
  });

  it('campo senza focus o non numerico: nessun effetto', async () => {
    const H = await boot('');
    const num = campo('number'), txt = campo('text');
    H.ctx.document.activeElement = txt;
    H.eval('numberWheelBlur')({ target: num });
    H.eval('numberWheelBlur')({ target: txt });
    expect(num.blurred).toBe(false);
    expect(txt.blurred).toBe(false);
  });
});

describe('Demo: esempio e benvenuto', () => {
  it('"Prova un esempio" compila Minoxidil 5% e Tariffazione = Scheda', async () => {
    const H = await boot('?demo=1');
    H.eval('caricaEsempioDemo()');
    const righe = H.eval('liberaRighe').map(r => r.nome);
    expect(righe).toEqual(['Minoxidil', 'Etanolo 96°', 'Glicole propilenico', 'Acqua purificata']);
    expect(H.eval('tipoPrep')).toBe('soluzione');
    H.eval('calcTariff(); aggiornaScheda()');
    const tar = H.prezzoPubblico(), sch = H.schedaTotale();
    expect(tar).toBeGreaterThan(0);
    expect(sch).toBeCloseTo(tar, 2);
  });

  it('benvenuto visibile in demo, nascosto in produzione', async () => {
    expect((await boot('?demo=1')).byId('demo-benvenuto').style.display).toBe('block');
    expect((await boot('')).byId('demo-benvenuto').style.display).toBe('none');
  });

  it('chiuso con ✕ non ricompare al riavvio', async () => {
    const H = await boot('?demo=1');
    H.eval('demoBenvenutoChiudi()');
    expect(H.byId('demo-benvenuto').style.display).toBe('none');
    const ls = Object.fromEntries(H.lsMap);
    expect((await boot('?demo=1', { ls })).byId('demo-benvenuto').style.display).toBe('none');
  });
});
