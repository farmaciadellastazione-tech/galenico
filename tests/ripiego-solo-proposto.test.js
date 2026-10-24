// Lotti per ripiego (decisione dell'utente, 2026-10-24): compaiono nel menu della
// Scheda ma non vengono mai scelti in automatico; il prezzo li usa solo se il
// lotto lo sceglie l'operatore. "Olio" con in magazzino solo olio di ricino non
// diventa olio di ricino da solo.
import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from './_app-vm.js';

const UNG = { prep:'unguento', tariff:'semisolida', scheda:'unguento' };
const SOLO_RICINO = [ { nome: 'Olio di ricino', prezzo: 0.03, lottoInt: 'R1', scad: '2026-12' } ];

describe('Ripiego: lotti solo proposti', () => {
  let A;
  beforeAll(() => { A = buildApp(); });

  it('riga "Olio", in magazzino solo olio di ricino: nessun lotto scelto, nessun prezzo', () => {
    A.run(UNG, [ {nome:'Olio', qty:'10', unit:'g'}, {nome:'Vaselina bianca', qty:'40', unit:'g'} ], { 't-fl':'0' }, SOLO_RICINO);
    A.ctx.schedaLottiRender(true, true);
    expect(A.ctx.liberaRighe[0].lotto).toBe('');
    A.ctx.calcPrep();
    expect(A.ctx.liberaRigheExtra[0].prezzo).toBe(0);
  });

  it('il lotto è comunque proposto, e se l\'operatore lo sceglie vale il suo prezzo', () => {
    A.run(UNG, [ {nome:'Olio', qty:'10', unit:'g'}, {nome:'Vaselina bianca', qty:'40', unit:'g'} ], { 't-fl':'0' }, SOLO_RICINO);
    expect(A.ctx.trovaLottiSostanza('Olio').map(c => c.lotto)).toEqual(['R1']);
    A.ctx.schedaLottoInput(0, 'R1');
    expect(A.ctx.liberaRigheExtra[0].prezzo).toBe(0.03);
  });

  it('PA della Scheda compilata: il lotto di ripiego non viene preselezionato', () => {
    A.run(UNG, [ {nome:'Olio', qty:'10', unit:'g', isPa:true}, {nome:'Vaselina bianca', qty:'40', unit:'g'} ], { 't-fl':'0' }, SOLO_RICINO);
    A.ctx.compilaScheda();
    expect(A.byId('s-lotto-as').value).toBe('');
  });

  it('corrispondenza certa del nome: il lotto resta scelto in automatico (FEFO)', () => {
    A.run(UNG, [ {nome:'Olio di ricino', qty:'10', unit:'g'}, {nome:'Vaselina bianca', qty:'40', unit:'g'} ], { 't-fl':'0' }, SOLO_RICINO);
    A.ctx.schedaLottiRender(true, true);
    expect(A.ctx.liberaRighe[0].lotto).toBe('R1');
  });
});
