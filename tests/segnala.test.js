// Demo (v188): chi prova l'app può segnalare errori o mandare richieste con
// un'email già compilata (versione, pagina, schermo, browser, ultimi errori).
// Il pulsante sta nella fascia demo: nella versione reale non compare.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildApp } from './_app-vm.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(join(ROOT, 'index.html'), 'utf8');
const EMAIL = 'farmaciadellastazione@gmail.com';
const V = HTML.match(/const APP_VERSION = (\d+);/)[1];

const decodifica = (mailto) => {
  const [dest, query] = mailto.replace(/^mailto:/, '').split('?');
  const p = Object.fromEntries(query.split('&').map(kv => { const i = kv.indexOf('='); return [kv.slice(0, i), decodeURIComponent(kv.slice(i + 1))]; }));
  return { dest, subject: p.subject, body: p.body };
};

describe('Segnala (demo)', () => {
  it('il pulsante sta nella fascia demo, che nella versione reale è nascosta', () => {
    const i = HTML.indexOf('<div id="demo-banner">');
    const banner = HTML.slice(i, HTML.indexOf('</div>', i));
    expect(banner).toContain('segnalaApri()');
    expect(HTML).toMatch(/#demo-banner \{ display:none;/);
    expect(HTML).toContain('id="segnala-dialog"');
  });

  it('l\'email va all\'indirizzo giusto con versione e tipo nell\'oggetto', () => {
    const { ctx } = buildApp();
    const err = decodifica(ctx.segnalaMailto('errore'));
    expect(err.dest).toBe(EMAIL);
    expect(err.subject).toBe('Benadù v' + V + ' – Errore');
    const ric = decodifica(ctx.segnalaMailto('richiesta'));
    expect(ric.subject).toBe('Benadù v' + V + ' – Richiesta / idea');
  });

  it('il testo contiene versione, pagina, preventivo, schermo e browser', () => {
    const { ctx } = buildApp();
    ctx.navigator.userAgent = 'BrowserDiProva/1.0';
    ctx.screen = { width: 1366, height: 768 };
    ctx.innerWidth = 1200; ctx.innerHeight = 650;
    const { body } = decodifica(ctx.segnalaMailto('errore', 'tariffazione'));
    expect(body).toContain('Versione: v' + V);
    expect(body).toContain('Pagina: Tariffazione');
    expect(body).toContain('Preventivo: no');
    expect(body).toContain('Schermo: 1366×768 (finestra 1200×650)');
    expect(body).toContain('Browser: BrowserDiProva/1.0');
    expect(body).toContain('Ultimi errori: nessuno');
  });

  it('tiene solo gli ultimi 5 errori, accorciati, e li mette nel testo', () => {
    const { ctx } = buildApp();
    for (let n = 1; n <= 7; n++) ctx.segnalaRegistraErrore('errore numero ' + n);
    ctx.segnalaRegistraErrore('x'.repeat(500));
    const { body } = decodifica(ctx.segnalaMailto('errore'));
    expect(body).toContain('- errore numero 4');
    expect(body).toContain('- errore numero 7');
    expect(body).not.toContain('errore numero 3');
    expect(body).toContain('x'.repeat(140));
    expect(body).not.toContain('x'.repeat(151));
  });

  it('il link resta corto anche con 5 errori lunghi (i client tagliano oltre ~2000 caratteri)', () => {
    const { ctx } = buildApp();
    ctx.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';
    for (let n = 0; n < 5; n++) ctx.segnalaRegistraErrore('TypeError: Cannot read properties of undefined ' + 'y'.repeat(300));
    expect(ctx.segnalaMailto('errore').length).toBeLessThan(2000);
  });
});

// Revisione v188 → v189.
describe('Segnala (demo): correzioni dopo la revisione', () => {
  it('"Apri email" usa il link diretto e lascia aperta la finestra con l\'indirizzo da copiare', () => {
    const { ctx, byId } = buildApp();
    let aperto = null;
    ctx.window.open = (u) => { aperto = u; return null; };
    ctx.segnalaApri();
    ctx.segnalaInvia();
    expect(aperto).toBeNull();
    expect(ctx.location.href).toMatch(/^mailto:farmaciadellastazione@gmail\.com\?/);
    expect(byId('segnala-dialog').style.display).toBe('flex');
  });

  it('il link codificato resta sotto i 2000 caratteri anche con errori pieni di spazi e accenti, togliendo i più vecchi', () => {
    const { ctx } = buildApp();
    ctx.navigator.userAgent = 'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/130.0.6723.58 Mobile Safari/537.36 Instagram 350.0.0.0';
    for (let n = 1; n <= 5; n++) ctx.segnalaRegistraErrore('errore ' + n + ' ' + 'è à – × '.repeat(30));
    const url = ctx.segnalaMailto('errore');
    expect(url.length).toBeLessThan(2000);
    const { body } = decodifica(url);
    expect(body).toContain('- errore 5 ');
    expect(body).not.toContain('- errore 1 ');
    expect(body).toMatch(/errori più vecchi tolti/);
  });

  it('la finestra non promette che i dati non ci sono: invita a rileggere prima di inviare', () => {
    const i = HTML.indexOf('id="segnala-dialog"');
    const dlg = HTML.slice(i, HTML.indexOf('segnalaCopiaEmail()', i));
    expect(dlg).not.toContain('i dati delle ricette no');
    expect(dlg).toContain('rileggere');
  });

  it('riaprendo la finestra la scelta torna su "Errore", e "Richiesta" va nell\'oggetto', () => {
    const { ctx, byId } = buildApp();
    ctx.segnalaApri();
    byId('segnala-tipo-errore').checked = false;
    byId('segnala-tipo-richiesta').checked = true;
    ctx.segnalaInvia();
    expect(decodifica(ctx.location.href).subject).toMatch(/Richiesta \/ idea$/);
    ctx.segnalaApri();
    expect(byId('segnala-tipo-errore').checked).toBe(true);
    expect(byId('segnala-tipo-richiesta').checked).toBe(false);
  });

  it('i motivi dei Promise rifiutati diventano testo leggibile, non "[object Object]"', () => {
    const { ctx } = buildApp();
    expect(ctx.segnalaDescriviMotivo(new Error('rete giù'))).toBe('Error: rete giù');
    expect(ctx.segnalaDescriviMotivo({ name: 'AbortError', message: '' })).toBe('AbortError');
    expect(ctx.segnalaDescriviMotivo({ status: 401 })).toBe('{"status":401}');
    expect(ctx.segnalaDescriviMotivo('testo')).toBe('testo');
    expect(ctx.segnalaDescriviMotivo(undefined)).toBe('undefined');
  });
});
