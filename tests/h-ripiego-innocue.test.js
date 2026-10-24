// Codici H per ripiego (v169): stessa regola delle aggiunte innocue del resto
// della ricerca — fornitore e F.U. nel nome dell'inventario non bloccano (Art. 8a
// non si perde); altre parole sì ("monometiletere").
import { describe, it, expect } from 'vitest';
import { getHDaInventario } from '../pricing.js';

describe('Ripiego dei codici H con aggiunte innocue', () => {
  it('"Melatonina 10 mg" → H di "Melatonina 1 mg Farmalabor"', () => {
    expect(getHDaInventario('Melatonina 10 mg', [ { nome: 'Melatonina 1 mg Farmalabor', h: 'H302', prezzo: 0.1 } ])).toBe('H302');
  });
  it('"Idrochinone 4%" → H di "Idrochinone FU", non di "Idrochinone monometiletere"', () => {
    const inv = [ { nome: 'Idrochinone FU', h: 'H341', prezzo: 1 }, { nome: 'Idrochinone monometiletere', h: 'H317', prezzo: 1 } ];
    expect(getHDaInventario('Idrochinone 4%', inv)).toBe('H341');
  });
});
