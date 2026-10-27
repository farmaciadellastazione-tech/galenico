// Etichette delle field-row (v187): .field-label è flex:1 con base 0, quindi prende
// solo lo spazio avanzato. Una nota lunga accanto (es. "Componenti aggiuntivi" in
// Tariffazione) se lo prendeva tutto e l'etichetta, schiacciata a zero, finiva
// sotto la casella. Serve una larghezza minima garantita all'etichetta.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(ROOT, 'index.html'), 'utf8');

describe('Etichette field-row non schiacciate', () => {
  it('.field-label ha una larghezza minima diversa da 0', () => {
    const regola = html.match(/\.field-label\s*\{([^}]*)\}/)[1];
    const minW = regola.match(/min-width:\s*([^;]+);/)[1].trim();
    expect(minW).not.toBe('0');
  });
  it('nota di "Componenti aggiuntivi" corta', () => {
    const riga = html.match(/<input[^>]*id="t-comp"[^>]*><span class="field-note">([^<]*)<\/span>/)[1];
    expect(riga.length).toBeLessThanOrEqual(50);
  });
});
