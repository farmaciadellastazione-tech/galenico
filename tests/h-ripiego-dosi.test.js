// Codici H per ripiego (v169): solo da prodotti che differiscono per numeri e
// unità (dosi), non da una sostanza con altre parole nel nome — "Idrochinone 4%"
// non prende i codici H di "Idrochinone monometiletere" (Art. 8a non dovuto).
import { describe, it, expect } from 'vitest';
import { getHDaInventario } from '../pricing.js';

describe('Ripiego dei codici H solo tra dosi', () => {
  it('"Idrochinone 4%" non prende i codici H di "Idrochinone monometiletere"', () => {
    const inv = [ { nome: 'Idrochinone', h: '', prezzo: 1 }, { nome: 'Idrochinone monometiletere', h: 'H317,H319', prezzo: 1 } ];
    expect(getHDaInventario('Idrochinone 4%', inv)).toBe('');
  });
  it('"Olio 10%" non prende i codici H di "Olio essenziale di menta"', () => {
    expect(getHDaInventario('Olio 10%', [ { nome: 'Olio essenziale di menta', h: 'H304', prezzo: 1 } ])).toBe('');
  });
  it('tra dosi sì: "Melatonina 10 mg" → codici H di "Melatonina 1 mg"', () => {
    const inv = [ { nome: 'Melatonina 1 mg', h: 'H302', prezzo: 0.1 } ];
    expect(getHDaInventario('Melatonina 10 mg', inv)).toBe('H302');
  });
});
