// Capsule vuote (v169): senza lotti aperti con prezzo, l'ultimo lotto per data di
// inserimento (ts), non per ordine nella lista.
import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from './_app-vm.js';

describe('Capsule vuote: lotto più recente per data', () => {
  let A;
  beforeAll(() => { A = buildApp(); });

  it('lotti chiusi salvati fuori ordine: vale quello inserito per ultimo', () => {
    const CAPS3 = 'Capsule gelatina dura taglia 3';
    A.store.clear();
    A.setInv([ { nome: CAPS3, unit: 'pz', prezzo: 0.03, lottoInt: 'B', dataCh: '2025-12-01', ts: Date.UTC(2025, 0, 1) },
               { nome: CAPS3, unit: 'pz', prezzo: 0.02, lottoInt: 'A', dataCh: '2023-12-01', ts: Date.UTC(2023, 0, 1) },
               { nome: CAPS3, unit: 'pz', prezzo: 0, lottoInt: 'C', ts: Date.UTC(2026, 0, 1) } ]);
    A.ctx.tipoPrep = 'capsule'; A.ctx.liberaRighe = [];
    A.ctx.capsTagliaChanged('3');
    expect(parseFloat(A.byId('caps-vuote-prezzo').value)).toBe(0.03);
  });
});
