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
