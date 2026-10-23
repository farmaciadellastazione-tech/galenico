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

// Invio sui campi Volume/Grado: fa uscire dal campo (blur), così il ricalcolo
// passa SOLO da onchange, come con un clic altrove. Nessuna doppia applicazione
// e nessun ricalcolo se il valore non è cambiato (il browser non lancia change).
describe('Invio esce dal campo', () => {
  it('Invio fa blur del campo (il ricalcolo lo fa onchange)', async () => {
    const H = await boot('?demo=1');
    let blurred = false, prevented = false;
    H.eval('invioEsce')({ key: 'Enter', preventDefault(){ prevented = true; }, target: { blur(){ blurred = true; } } });
    expect(blurred).toBe(true);
    expect(prevented).toBe(true);
  });

  it('altri tasti: nessun effetto', async () => {
    const H = await boot('?demo=1');
    let blurred = false;
    H.eval('invioEsce')({ key: '0', preventDefault(){}, target: { blur(){ blurred = true; } } });
    expect(blurred).toBe(false);
  });
});

describe('Volume soluzione', () => {
  it('nuovo volume (onchange) riscala tutte le righe', async () => {
    const H = await boot('?demo=1');
    H.eval('caricaEsempioDemo()');
    H.byId('vol-soluzione').value = '100';
    H.eval('volSoluzioneChanged()');
    const q = H.eval('liberaRighe').map(r => parseFloat(r.qty));
    expect(q[0]).toBeCloseTo(4.7285, 3);   // Minoxidil scalato da 5 g (105,7 ml → 100 ml)
    expect(q[1]).toBeCloseTo(47.2851, 3);  // Etanolo 96°
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
});

describe('Grado alcolico: calcolato e bloccato se la formula ha già etanolo', () => {
  async function esempio() {
    const H = await boot('?demo=1');
    H.eval('caricaEsempioDemo()');
    return H;
  }

  it('esempio Minoxidil: campo Grado in sola lettura', async () => {
    const H = await esempio();
    expect(H.byId('grado-alc').readOnly).toBe(true);
  });

  it('✎ sblocca; dopo l\'applicazione il campo si riblocca', async () => {
    const H = await esempio();
    H.eval('gradoAlcSblocca()');
    expect(H.byId('grado-alc').readOnly).toBe(false);
    H.byId('grado-alc').value = '50';
    H.eval('gradoAlcChanged()');
    const etanolo = H.eval('liberaRighe').find(r => r.nome.startsWith('Etanolo'));
    expect(etanolo.unit).toBe('ml');                 // ricalcolato dal grado
    expect(H.byId('grado-alc').readOnly).toBe(true);
  });

  it('dopo ✎ uscire dal campo (anche dopo un grado impossibile) riblocca e mostra il grado calcolato', async () => {
    const H = await esempio();
    H.ctx.alert = () => {};
    H.eval('gradoAlcSblocca()');
    H.byId('grado-alc').value = '95';
    H.eval('gradoAlcChanged()');                     // impossibile: resta sbloccato
    H.eval('gradoAlcBlur()');
    expect(H.byId('grado-alc').readOnly).toBe(true);
    expect(H.byId('grado-alc').value).toBe('56.2');
  });

  it('formula senza etanolo: campo modificabile (veicolo da costruire)', async () => {
    const H = await boot('?demo=1');
    H.eval(`liberaRighe = [{ nome:'Acqua purificata', qty:'100', unit:'ml', isPa:false, densita:null }]; calcPrep();`);
    expect(H.byId('grado-alc').readOnly).toBe(false);
  });
});

describe('Riconoscimento etanolo (isEtanoloNome)', () => {
  it('etanolo sì, altri alcoli e derivati no', async () => {
    const H = await boot('');
    const f = H.eval('isEtanoloNome');
    for (const n of ['etanolo 96°', 'etanolo', 'alcool 96°', 'alcol 70', 'alcool', 'alcol etilico', 'alcool etilico denaturato'])
      expect([n, f(n)]).toEqual([n, true]);
    for (const n of ['fenossietanolo', 'etere etilico', 'alcol benzilico', 'alcol cetilico', 'alcool cetostearilico', 'alcool feniletilico'])
      expect([n, f(n)]).toEqual([n, false]);
  });

  it('"Alcol benzilico" non è etanolo: campo non bloccato e riga non sovrascritta', async () => {
    const H = await boot('?demo=1');
    H.eval(`liberaRighe = [
      { nome:'Alcol benzilico', qty:'1', unit:'g', isPa:false, densita:null },
      { nome:'Acqua purificata', qty:'100', unit:'ml', isPa:false, densita:null }]; calcPrep();`);
    expect(H.byId('grado-alc').readOnly).toBe(false);
    H.byId('vol-soluzione').value = '100';
    H.byId('grado-alc').value = '40';
    H.eval('gradoAlcChanged()');
    const righe = H.eval('liberaRighe');
    const benz = righe.find(r => r.nome === 'Alcol benzilico');
    expect(benz.qty).toBe('1');
    expect(benz.unit).toBe('g');
    expect(righe.some(r => r.nome.startsWith('Etanolo'))).toBe(true);
  });

  it('"Fenossietanolo" non è etanolo: riga non sovrascritta', async () => {
    const H = await boot('?demo=1');
    H.eval(`liberaRighe = [
      { nome:'Fenossietanolo', qty:'1', unit:'g', isPa:false, densita:null },
      { nome:'Acqua purificata', qty:'100', unit:'ml', isPa:false, densita:null }]; calcPrep();`);
    expect(H.byId('grado-alc').readOnly).toBe(false);
    H.byId('vol-soluzione').value = '100';
    H.byId('grado-alc').value = '30';
    H.eval('gradoAlcChanged()');
    const fen = H.eval('liberaRighe').find(r => r.nome === 'Fenossietanolo');
    expect(fen.qty).toBe('1');
    expect(fen.unit).toBe('g');
  });

  it('"Alcool 96°" è etanolo: campo bloccato', async () => {
    const H = await boot('?demo=1');
    H.eval(`liberaRighe = [
      { nome:'Alcool 96°', qty:'50', unit:'ml', isPa:false, densita:null },
      { nome:'Acqua purificata', qty:'50', unit:'ml', isPa:false, densita:null }]; calcPrep();`);
    expect(H.byId('grado-alc').readOnly).toBe(true);
  });
});

describe('Riconoscimento etanolo: nomi comuni (review 3)', () => {
  it('"Alcool al 96%", "Etil alcool", "Alcool denaturato" sono etanolo; isopropilico/laurilico no', async () => {
    const H = await boot('');
    const f = H.eval('isEtanoloNome');
    for (const n of ['alcool al 96%', 'alcol al 70%', 'etil alcool', 'alcool denaturato', 'alcool etilico 96°'])
      expect([n, f(n)]).toEqual([n, true]);
    for (const n of ['alcool isopropilico', 'alcol laurilico', 'alcool stearilico', 'alcool oleilico', 'alcol polivinilico'])
      expect([n, f(n)]).toEqual([n, false]);
  });
});

describe('Rotellina: zoom e scorrimento orizzontale (review 3)', () => {
  it('Ctrl+rotellina (zoom) non viene bloccata', async () => {
    const H = await boot('');
    const el = { type: 'number', blur(){} };
    H.ctx.document.activeElement = el;
    H.ctx.scrollBy = () => {};
    const e = { target: el, ctrlKey: true, deltaX: 0, deltaY: 100, deltaMode: 0, prevented: false, preventDefault(){ this.prevented = true; } };
    H.eval('numberWheel')(e);
    expect(e.prevented).toBe(false);
  });

  it('scorrimento orizzontale passato alla pagina', async () => {
    const H = await boot('');
    const el = { type: 'number', blur(){} };
    H.ctx.document.activeElement = el;
    let sx = 0, sy = 0;
    H.ctx.scrollBy = (x, y) => { sx += x; sy += y; };
    H.eval('numberWheel')({ target: el, ctrlKey: false, deltaX: 40, deltaY: 0, deltaMode: 0, preventDefault(){} });
    expect(sx).toBe(40);
    expect(sy).toBe(0);
  });
});

describe('Attivazione demo', () => {
  it('?demo=0 non attiva la demo; ?demo e ?demo=1 sì', async () => {
    expect((await boot('?demo=0')).eval('DEMO_MODE')).toBe(false);
    expect((await boot('?demo')).eval('DEMO_MODE')).toBe(true);
    expect((await boot('?x=1&demo=1')).eval('DEMO_MODE')).toBe(true);
  });
});

// La demo può essere aperta nel browser dove si usa l'app vera (stesso sito,
// stesso localStorage): in demo tutte le chiavi gal_* diventano gal_demo_*.
describe('Demo isolata dai dati veri', () => {
  const veri = { gal_archivio_schede_v1: '[{"num":"2026/007","paz":"Rossi"}]', gal_scheda_counter_2026: '7',
                 gal_inventario_v1: '[{"nome":"Sostanza vera"}]' };

  it('in demo archivio e contatore veri non si vedono', async () => {
    const H = await boot('?demo=1', { ls: veri });
    expect(H.eval('archLoad()').length).toBe(0);
    expect(H.ctx.localStorage.getItem('gal_scheda_counter_2026')).toBe(null);
  });

  it('in demo le scritture vanno su gal_demo_* e i dati veri restano intatti', async () => {
    const H = await boot('?demo=1', { ls: veri });
    H.ctx.localStorage.setItem('gal_scheda_counter_2026', '99');
    expect(H.lsMap.get('gal_scheda_counter_2026')).toBe('7');
    expect(H.lsMap.get('gal_demo_scheda_counter_2026')).toBe('99');
  });

  it('in produzione nessun cambiamento', async () => {
    const H = await boot('', { ls: veri });
    expect(H.eval('archLoad()').length).toBe(1);
    H.ctx.localStorage.setItem('gal_scheda_counter_2026', '8');
    expect(H.lsMap.get('gal_scheda_counter_2026')).toBe('8');
  });
});

describe('Prova un esempio: conferma e ricetta pulita', () => {
  it('formula in corso + annulla: niente cambia', async () => {
    const H = await boot('?demo=1');
    H.eval(`liberaRighe = [{ nome:'Acido salicilico', qty:'2', unit:'g', isPa:true, densita:null }];`);
    H.ctx.confirm = () => false;
    H.eval('caricaEsempioDemo()');
    expect(H.eval('liberaRighe').map(r => r.nome)).toEqual(['Acido salicilico']);
  });

  it('formula in corso + conferma: residui azzerati (supplementi, prezzo manuale)', async () => {
    const H = await boot('?demo=1');
    H.eval(`liberaRighe = [{ nome:'Acido salicilico', qty:'2', unit:'g', isPa:true, densita:null }];
            _suppManRighe = [{ desc:'extra', importo: 5 }];`);
    H.byId('s-prezzo').value = '99';
    let chiesto = false;
    H.ctx.confirm = () => { chiesto = true; return true; };
    H.eval('caricaEsempioDemo()');
    expect(chiesto).toBe(true);
    expect(H.eval('liberaRighe').map(r => r.nome)[0]).toBe('Minoxidil');
    expect(H.eval('_suppManRighe').length).toBe(0);
    expect(H.byId('s-prezzo').value).toBe('');
  });

  it('formula vuota: nessuna domanda', async () => {
    const H = await boot('?demo=1');
    let chiesto = false;
    H.ctx.confirm = () => { chiesto = true; return true; };
    H.eval('caricaEsempioDemo()');
    expect(chiesto).toBe(false);
  });
});

describe('Scheda: intestazione per forma', () => {
  it('tintura: niente "undefined" nel tipo di preparato', async () => {
    const H = await boot('');
    H.eval(`tipoScheda = 'tintura'; aggiornaScheda();`);
    const out = H.byId('scheda-preview').innerHTML;
    expect(out).not.toContain('Preparato magistrale · undefined');
    expect(out).toMatch(/Preparato magistrale · Tintura/);
  });
});

// Rotellina su un campo numerico con focus: il valore non deve cambiare e il
// campo NON deve essere lasciato (blur applicherebbe un valore scritto a metà);
// la pagina scorre comunque.
describe('Rotellina sui campi numerici', () => {
  const campo = (type) => ({ type, blurred: false, blur(){ this.blurred = true; } });
  const evento = (target) => ({ target, deltaY: 120, deltaMode: 0, prevented: false, preventDefault(){ this.prevented = true; } });

  it('campo numerico con focus: valore bloccato, campo non lasciato, pagina scorre', async () => {
    const H = await boot('');
    let scroll = 0;
    H.ctx.scrollBy = (x, y) => { scroll += y; };
    const el = campo('number');
    H.ctx.document.activeElement = el;
    const e = evento(el);
    H.eval('numberWheel')(e);
    expect(e.prevented).toBe(true);
    expect(el.blurred).toBe(false);
    expect(scroll).toBe(120);
  });

  it('campo senza focus o non numerico: nessun effetto', async () => {
    const H = await boot('');
    H.ctx.scrollBy = () => { throw new Error('non deve scorrere a mano'); };
    const num = campo('number'), txt = campo('text');
    H.ctx.document.activeElement = txt;
    const e1 = evento(num), e2 = evento(txt);
    H.eval('numberWheel')(e1);
    H.eval('numberWheel')(e2);
    expect(e1.prevented || e2.prevented).toBe(false);
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
