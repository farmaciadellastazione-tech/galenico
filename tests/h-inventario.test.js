// Codici H dall'inventario (Art. 8a, €2,50): stessa ricerca a parole intere del
// prezzo, non il "contiene" in entrambe le direzioni — "Fenossietanolo" prendeva
// l'H225 dell'"Etanolo", "Acqua di rose" i codici dell'"Acqua".
import { describe, it, expect } from 'vitest';
import { getHDaInventario, rigaHazardous } from '../pricing.js';

const INV = [
  { nome: 'Etanolo 96°', h: 'H225,H319', prezzo: 0.015 },
  { nome: 'Acqua', h: 'H999', prezzo: 0.002 },
  { nome: 'Acido salicilico', h: 'H302,H318', prezzo: 0.05 },
];

describe('getHDaInventario a parole intere', () => {
  it('non prende i codici H di una sostanza contenuta nel nome', () => {
    expect(getHDaInventario('Fenossietanolo', INV)).toBe('');
    expect(getHDaInventario('Acqua di rose', INV)).toBe('');
    expect(rigaHazardous({ nome: 'Fenossietanolo' }, INV)).toBe(false);
  });
  it('trova la sostanza scritta in modo diverso', () => {
    expect(getHDaInventario('Etanolo', INV)).toBe('H225,H319');
    expect(getHDaInventario('Acido salicilico F.U.', INV)).toBe('H302,H318');
    expect(getHDaInventario('acido  SALICILICO', INV)).toBe('H302,H318');
  });
  it('nome con concentrazione: trova comunque i codici H (Art. 8a non si perde)', () => {
    const inv = [...INV, { nome: 'Idrochinone', h: 'H341,H351', prezzo: 1 }];
    expect(getHDaInventario('Idrochinone 4%', inv)).toBe('H341,H351');
    expect(getHDaInventario('Idrochinone 2,5 %', inv)).toBe('H341,H351');
    expect(rigaHazardous({ nome: 'Idrochinone 4%' }, inv)).toBe(true);
    expect(getHDaInventario('Fenossietanolo 1%', inv)).toBe('');
  });
  it('più lotti della stessa sostanza: i codici H valgono per tutti', () => {
    const inv = [{ nome: 'Etanolo 96°', h: '', prezzo: 0.01 }, { nome: 'Etanolo 96°', h: 'H225', prezzo: 0.02 }];
    expect(getHDaInventario('Etanolo', inv)).toBe('H225');
  });
});
