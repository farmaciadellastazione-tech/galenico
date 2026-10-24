// Capsule vuote e flaconi con più lotti (v169): la taglia sceglie il lotto aperto
// più recente CON prezzo (non il primo, magari chiuso); i menu mostrano un nome
// una volta per prezzo.
import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from './_app-vm.js';

const CAPS0 = 'Capsule gelatina dura taglia 0';

describe('Capsule vuote e flaconi', () => {
  let A;
  beforeAll(() => { A = buildApp(); });
  const taglia = (t, inv) => {
    A.store.clear(); A.setInv(inv);
    A.ctx.tipoPrep = 'capsule'; A.ctx.liberaRighe = [];
    A.ctx.capsTagliaChanged(t);
    return parseFloat(A.byId('caps-vuote-prezzo').value);
  };
  const taglia0 = (inv) => taglia('0', inv);

  it('lotto aperto più recente, non il vecchio chiuso (e resta la capsula in gelatina)', () => {
    expect(taglia0([ { nome: CAPS0, unit: 'pz', prezzo: 0.03, lottoInt: 'C1', dataCh: '2026-05-01' },
                     { nome: CAPS0, unit: 'pz', prezzo: 0.04, lottoInt: 'C2' } ])).toBe(0.04);
  });

  it('lotto più recente ancora senza prezzo: vale l\'ultimo aperto con prezzo', () => {
    // taglia 3: non è nell'inventario di base (lì un lotto senza prezzo eredita quello di base)
    const CAPS3 = 'Capsule gelatina dura taglia 3';
    expect(taglia('3', [ { nome: CAPS3, unit: 'pz', prezzo: 0.04, lottoInt: 'C1' },
                         { nome: CAPS3, unit: 'pz', prezzo: 0, lottoInt: 'C2' } ])).toBe(0.04);
  });

  it('menu capsule vuote e flaconi: un nome una volta per prezzo', () => {
    A.store.clear();
    A.setInv([ { nome: CAPS0, unit: 'pz', prezzo: 0.04, lottoInt: 'C1' }, { nome: CAPS0, unit: 'pz', prezzo: 0.04, lottoInt: 'C2' },
               { nome: 'Flacone ambrato 125ml', unit: 'pz', prezzo: 1.55, lottoInt: 'F1' },
               { nome: 'Flacone ambrato 125ml', unit: 'pz', prezzo: 1.55, lottoInt: 'F2' } ]);
    A.ctx.capsVuoteCerca('gelatina dura taglia 0');
    expect((A.byId('caps-vuote-sug').innerHTML.match(/Capsule gelatina dura taglia 0 —/g) || []).length).toBe(1);
    A.byId('t-fl-cerca').value = 'flacone ambrato';
    A.ctx.tarCercaFlacone();
    expect((A.byId('t-fl-suggerimenti').innerHTML.match(/Flacone ambrato 125ml —/g) || []).length).toBe(1);
  });
});
