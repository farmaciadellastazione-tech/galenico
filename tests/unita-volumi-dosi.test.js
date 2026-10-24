// Unità nel nome (v169): g, kg, ml, l sono confezioni (stessa sostanza), tranne
// per i contenitori a pezzi (Flacone 100 ml ≠ 250 ml); mg è una dose: non è mai
// un'aggiunta innocua ("Melatonina 5 mg" non è "Melatonina").
import { describe, it, expect } from 'vitest';
import { invLottiSostanza, invTrovaPerPrezzo, getHDaInventario } from '../pricing.js';

describe('Volumi e dosi', () => {
  it('"Glicerolo 1 l" e "Glicerolo 500 ml" sono lotti di Glicerolo', () => {
    const inv = [ { nome: 'Glicerolo 1 l', prezzo: 0.01, unit: 'ml' }, { nome: 'Glicerolo 500 ml', prezzo: 0.012, unit: 'ml' } ];
    expect(invLottiSostanza('Glicerolo', inv).length).toBe(2);
  });
  it('contenitori a pezzi: Flacone 100 ml ≠ 250 ml', () => {
    const inv = [ { nome: 'Flacone 100 ml', prezzo: 1, unit: 'pz' }, { nome: 'Flacone 250 ml', prezzo: 1, unit: 'pz' } ];
    expect(invLottiSostanza('Flacone 250 ml', inv).map(s => s.nome)).toEqual(['Flacone 250 ml']);
  });
  it('"Melatonina 5 mg" non prende il prezzo di "Melatonina"', () => {
    expect(invTrovaPerPrezzo('Melatonina 5 mg', [ { nome: 'Melatonina', prezzo: 2 } ])).toBe(null);
  });
  it('codici H: "Melatonina 10 mg" prende quelli di una dose in inventario (Art. 8a non si perde)', () => {
    const inv = [ { nome: 'Melatonina 1 mg', h: 'H302', prezzo: 0.1 }, { nome: 'Melatonina 5 mg', h: '', prezzo: 0.1 } ];
    expect(getHDaInventario('Melatonina 10 mg', inv)).toBe('H302');
  });
});
