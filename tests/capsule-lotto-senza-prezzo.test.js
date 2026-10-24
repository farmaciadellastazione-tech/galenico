// Capsule vuote (v169): se il lotto aperto non ha ancora un prezzo, vale l'ultimo
// lotto della stessa capsula che ce l'ha (anche chiuso), non €0.
import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from './_app-vm.js';

describe('Capsule vuote: lotto aperto senza prezzo', () => {
  let A;
  beforeAll(() => { A = buildApp(); });

  it('aperto a €0 e chiuso a €0,02 → €0,02', () => {
    // taglia 3: non è nell'inventario di base (lì un lotto senza prezzo eredita quello di base)
    const CAPS3 = 'Capsule gelatina dura taglia 3';
    A.store.clear();
    A.setInv([ { nome: CAPS3, unit: 'pz', prezzo: 0.02, lottoInt: 'C1', dataCh: '2026-05-01' },
               { nome: CAPS3, unit: 'pz', prezzo: 0, lottoInt: 'C2' } ]);
    A.ctx.tipoPrep = 'capsule'; A.ctx.liberaRighe = [];
    A.ctx.capsTagliaChanged('3');
    expect(parseFloat(A.byId('caps-vuote-prezzo').value)).toBe(0.02);
  });
});
