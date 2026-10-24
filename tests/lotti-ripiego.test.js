// Ripiego dei lotti (v169, review dei commit 1–6): se la ricerca stretta non
// trova la sostanza, i nomi che contengono tutte le parole scritte, ma solo se
// sono UNA sola sostanza ("Lattosio" → Lattosio monoidrato). Mai "Olio" →
// olio di ricino, "Vaselina" → una delle due, "Macrogol 400" → Macrogol 4000.
// Menu lotti, codice scritto a mano e prezzo usano la stessa funzione.
import { describe, it, expect, beforeAll } from 'vitest';
import { invLottiPerRiga, invTrovaPerPrezzo } from '../pricing.js';
import { buildApp } from './_app-vm.js';

const OLI = [ { nome: 'Olio di ricino', prezzo: 0.03, lottoInt: 'R1', scad: '2026-12' },
              { nome: 'Olio di mandorle dolci', prezzo: 0.02, lottoInt: 'M1', scad: '2027-06' } ];

describe('invLottiPerRiga', () => {
  it('ripiego solo se è una sostanza sola', () => {
    expect(invLottiPerRiga('Lattosio', [ { nome: 'Lattosio monoidrato', lottoInt: 'L1' } ]).map(s => s.lottoInt)).toEqual(['L1']);
    expect(invLottiPerRiga('Olio', OLI)).toEqual([]);
    expect(invLottiPerRiga('Vaselina', [ { nome: 'Vaselina bianca', lottoInt: 'V1' }, { nome: 'Vaselina filante', lottoInt: 'V2' } ])).toEqual([]);
  });
  it('parole intere, non inizio di parola: "Macrogol 400" non trova "Macrogol 4000"', () => {
    expect(invLottiPerRiga('Macrogol 400', [ { nome: 'Macrogol 4000', lottoInt: 'P1' } ])).toEqual([]);
  });
  it('prezzo: il lotto di un\'altra sostanza non vale', () => {
    expect(invTrovaPerPrezzo('Olio', OLI, 'R1')).toBe(null);
  });
});

describe('App — righe con nome generico', () => {
  let A;
  beforeAll(() => { A = buildApp(); });
  const UNG = { prep:'unguento', tariff:'semisolida', scheda:'unguento' };

  it('riga "Olio": nessun lotto proposto e nessun prezzo di un altro olio', () => {
    A.run(UNG, [ {nome:'Olio', qty:'10', unit:'g'}, {nome:'Vaselina bianca', qty:'40', unit:'g'} ], { 't-fl':'0' }, OLI);
    A.ctx.schedaLottiRender(true, true);
    expect(A.ctx.liberaRighe[0].lotto).toBe('');
    A.ctx.calcPrep();
    expect(A.ctx.liberaRigheExtra[0].prezzo).toBe(0);
  });

  it('codice lotto scritto a mano, proposto dal ripiego: ricalcola il prezzo', () => {
    // (burro di mango: non è nell'Allegato A, il prezzo viene dall'inventario)
    A.run(UNG, [ {nome:'Burro di mango', qty:'10', unit:'g'}, {nome:'Vaselina bianca', qty:'40', unit:'g'} ], { 't-fl':'0' },
          [ { nome: 'Burro di mango raffinato', prezzo: 0.09, lottoInt: 'BC1' } ]);
    expect(A.ctx.liberaRigheExtra[0].prezzo).toBe(0);
    A.ctx.schedaLottoInput(0, 'BC1');
    expect(A.ctx.liberaRigheExtra[0].prezzo).toBe(0.09);
  });
});
