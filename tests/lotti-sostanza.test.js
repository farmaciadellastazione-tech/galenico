// Lotti della stessa sostanza in inventario (v169): confezioni nel nome ("500 g",
// "1 kg") non dividono la sostanza; gradi e purezze sì (Macrogol 400 ≠ 4000,
// Carbopol 940 ≠ 980, Etanolo 96° ≠ 99,9%). Un nome scritto uguale a un lotto vale
// quel lotto. Un lotto scelto vale anche se il nome della riga è più corto.
import { describe, it, expect } from 'vitest';
import { invLottiSostanza, invTrovaPerPrezzo, invGetPrezzo, getHDaInventario, rigaHazardous } from '../pricing.js';

describe('Confezioni nel nome', () => {
  const talco = [ { nome: 'Talco 500 g', prezzo: 0.02, lottoInt: 'T1', h: '' },
                  { nome: 'Talco 1 kg', prezzo: 0.015, lottoInt: 'T2', h: 'H373' } ];
  it('"Talco 500 g" e "Talco 1 kg" sono lotti di Talco', () => {
    expect(invLottiSostanza('Talco', talco).map(s => s.lottoInt)).toEqual(['T1', 'T2']);
    expect(invTrovaPerPrezzo('Talco', talco, 'T2').prezzo).toBe(0.015);
    expect(getHDaInventario('Talco', talco)).toBe('H373');
  });
  it('nome scritto uguale a un lotto: vale quel lotto anche senza codice', () => {
    expect(invTrovaPerPrezzo('Talco 500 g', talco).prezzo).toBe(0.02);
    expect(invTrovaPerPrezzo('Talco', talco)).toBe(null);   // generico: va scelto il lotto
    // fuori dall'Allegato A anche invGetPrezzo (per il talco vince il prezzo di legge)
    const karite = [ { nome: 'Burro di karite 500 g', prezzo: 0.08 }, { nome: 'Burro di karite 1 kg', prezzo: 0.06 } ];
    expect(invGetPrezzo('Burro di karite 1 kg', karite).prezzo).toBe(0.06);
    expect(invGetPrezzo('Talco 1 kg', talco).fonte).toBe('allegatoA');
  });
});

describe('Gradi e purezze: sostanze diverse', () => {
  it('Macrogol 400 ≠ Macrogol 4000, Carbopol 940 ≠ 980', () => {
    const inv = [ { nome: 'Macrogol 400', prezzo: 0.02 }, { nome: 'Macrogol 4000', prezzo: 0.03 },
                  { nome: 'Carbopol 940', prezzo: 0.5 }, { nome: 'Carbopol 980', prezzo: 0.6 } ];
    expect(invTrovaPerPrezzo('Macrogol 400', inv).prezzo).toBe(0.02);
    expect(invTrovaPerPrezzo('Macrogol 4000', inv).prezzo).toBe(0.03);
    expect(invLottiSostanza('Carbopol 940', inv).map(s => s.nome)).toEqual(['Carbopol 940']);
  });
  it('Macrogol 4000 non prende il prezzo di "Macrogol" (4000 non è una purezza)', () => {
    expect(invTrovaPerPrezzo('Macrogol 4000', [ { nome: 'Macrogol', prezzo: 0.02 } ])).toBe(null);
  });
  it('Etanolo 96° ≠ Etanolo 99,9%', () => {
    const inv = [ { nome: 'Etanolo 96°', prezzo: 0.015 }, { nome: 'Etanolo 99,9%', prezzo: 0.05 } ];
    expect(invTrovaPerPrezzo('Etanolo 96°', inv).prezzo).toBe(0.015);
    expect(invLottiSostanza('Etanolo 96°', inv).map(s => s.nome)).toEqual(['Etanolo 96°']);
  });
  it('la concentrazione resta un\'altra sostanza per il prezzo', () => {
    expect(invTrovaPerPrezzo('Idrochinone 4%', [ { nome: 'Idrochinone', h: 'H341', prezzo: 1.2 } ])).toBe(null);
  });
});

describe('Codici H (Art. 8a): purezza nel nome', () => {
  it('"Acido salicilico 99%" senza codici H prende quelli di "Acido salicilico"', () => {
    const inv = [ { nome: 'Acido salicilico', h: 'H302', prezzo: 0.05 },
                  { nome: 'Acido salicilico 99%', h: '', prezzo: 0.05 } ];
    expect(getHDaInventario('Acido salicilico 99%', inv)).toBe('H302');
    expect(rigaHazardous({ nome: 'Acido salicilico 99%' }, inv)).toBe(true);
  });
});

describe('Lotto scelto con nome della riga più corto', () => {
  it('"Burro di karite" con il lotto di "Burro di karite raffinato": prezzo di quel lotto', () => {
    const inv = [ { nome: 'Burro di karite raffinato', prezzo: 0.08, lottoInt: 'K1' } ];
    expect(invTrovaPerPrezzo('Burro di karite', inv)).toBe(null);
    expect(invTrovaPerPrezzo('Burro di karite', inv, 'K1').prezzo).toBe(0.08);
    expect(invTrovaPerPrezzo('Burro di cacao', inv, 'K1')).toBe(null);   // lotto di un'altra sostanza
  });
});
