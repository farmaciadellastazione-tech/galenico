// Demo (v170): avviso di responsabilità e link alla licenza per chi prova l'app.
// Niente "Calcoli conformi": i calcoli vanno sempre verificati dal farmacista.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const HTML = readFileSync(join(ROOT, 'index.html'), 'utf8');
const LICENZA = 'https://github.com/farmaciadellastazione-tech/galenico/blob/root/LICENSE';
const blocco = (id) => { const i = HTML.indexOf('id="' + id + '"'); return i < 0 ? '' : HTML.slice(i, HTML.indexOf('</div>', HTML.indexOf('Prova un esempio', i)) + 6); };

describe('Demo: avviso e licenza', () => {
  it('la striscia in alto non promette "conformi" e rimanda alla licenza', () => {
    const banner = blocco('demo-banner');
    expect(banner).not.toContain('Calcoli conformi');
    expect(banner).toContain('da verificare sempre');
    expect(banner).toContain(LICENZA);
  });
  it('il benvenuto contiene l\'avviso di responsabilità, i dati dei pazienti e la licenza', () => {
    const i = HTML.indexOf('id="demo-benvenuto"');
    const benvenuto = HTML.slice(i, HTML.indexOf('caricaEsempioDemo()', i));
    expect(benvenuto).toContain('Strumento di supporto, senza garanzia');
    expect(benvenuto).toContain('dati dei pazienti');
    expect(benvenuto).toContain(LICENZA);
  });
  it('il file LICENSE esiste con il titolare', () => {
    expect(readFileSync(join(ROOT, 'LICENSE'), 'utf8')).toContain('Copyright © 2026 Dino Storti');
  });
});
