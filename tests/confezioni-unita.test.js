// Confezioni (v169): solo "N g" / "N kg" sono la confezione della stessa
// sostanza; dosi in mg e volumi in ml distinguono i prodotti.
import { describe, it, expect } from 'vitest';
import { invLottiSostanza } from '../pricing.js';

describe('Confezioni in peso, non dosi né volumi', () => {
  it('Melatonina 1 mg ≠ 5 mg', () => {
    const inv = [ { nome: 'Melatonina 1 mg', prezzo: 0.1 }, { nome: 'Melatonina 5 mg', prezzo: 0.1 } ];
    expect(invLottiSostanza('Melatonina 1 mg', inv).map(s => s.nome)).toEqual(['Melatonina 1 mg']);
  });
  it('Flacone 100 ml ≠ 250 ml', () => {
    const inv = [ { nome: 'Flacone 100 ml', prezzo: 1 }, { nome: 'Flacone 250 ml', prezzo: 1 } ];
    expect(invLottiSostanza('Flacone 250 ml', inv).map(s => s.nome)).toEqual(['Flacone 250 ml']);
  });
  it('Talco 500 g = Talco 1 kg (confezioni)', () => {
    const inv = [ { nome: 'Talco 500 g', prezzo: 0.02 }, { nome: 'Talco 1 kg', prezzo: 0.015 } ];
    expect(invLottiSostanza('Talco 500 g', inv).length).toBe(2);
  });
});
