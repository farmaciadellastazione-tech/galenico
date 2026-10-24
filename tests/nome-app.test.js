// Nome del programma (v171): "Benadù" in tutto ciò che l'utente vede (titolo,
// logo, app installata, piè di pagina, licenza). L'indirizzo …/galenico/ e i nomi
// interni (localStorage, file del Gist) restano: cambiarli romperebbe link e dati.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const leggi = f => readFileSync(join(ROOT, f), 'utf8');

describe('Nome Benadù', () => {
  const html = leggi('index.html');
  it('titolo, logo, app installata e piè di pagina', () => {
    expect(html).toContain('<title>Benadù — Preparazione & Tariffazione</title>');
    expect(html).toContain('<meta name="apple-mobile-web-app-title" content="Benadù">');
    expect(html).toMatch(/class="logo"><img[^>]*\/>Benadù <span>/);
    expect(html).toMatch(/<footer>Benadù — /);
    const manifest = JSON.parse(leggi('manifest.json'));
    expect(manifest.short_name).toBe('Benadù');
    expect(manifest.name).toContain('Benadù');
  });
  it('licenza e README', () => {
    expect(leggi('LICENSE').split('\n')[0]).toBe('Benadù — Licenza d\'uso');
    expect(leggi('README.md').split('\n')[0]).toBe('# Benadù');
  });
  it('nomi interni invariati (dati e Gist)', () => {
    expect(html).toContain("const GIST_FILE = 'galenico_inventario.json'");
    expect(html).toContain("const INV_KEY   = 'gal_inventario_v1'");
  });
});
