// Lotti fissi della Scheda (PA, eccipiente) (v169): se non si sceglie un lotto in
// automatico il campo si svuota (niente lotto della scheda precedente stampato);
// eccipiente con più sostanze: prima i lotti certi, poi quelli per ripiego.
import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from './_app-vm.js';

const UNG = { prep:'unguento', tariff:'semisolida', scheda:'unguento' };

describe('Lotti fissi della Scheda', () => {
  let A;
  beforeAll(() => { A = buildApp(); });

  it('PA con solo lotti per ripiego: il lotto della scheda precedente non resta', () => {
    A.run(UNG, [ {nome:'Olio', qty:'10', unit:'g', isPa:true}, {nome:'Vaselina bianca', qty:'40', unit:'g'} ], { 't-fl':'0' },
          [ { nome: 'Olio di ricino', prezzo: 0.03, lottoInt: 'R1', scad: '2026-12' } ]);
    A.byId('s-lotto-as').value = 'L123';
    A.ctx.compilaScheda();
    expect(A.byId('s-lotto-as').value).toBe('');
  });

  it('eccipiente "Cera emulsionante/Olio": vale il lotto certo, anche se il ripiego scade prima', () => {
    A.run(UNG, [ {nome:'Acido mandelico', qty:'5', unit:'g', isPa:true}, {nome:'Vaselina bianca', qty:'45', unit:'g'} ],
          { 't-fl':'0', 's-eccip':'Cera emulsionante/Olio' },
          [ { nome: 'Cera emulsionante', prezzo: 0.05, lottoInt: 'CE1', scad: '2028-01' },
            { nome: 'Olio di ricino', prezzo: 0.03, lottoInt: 'R1', scad: '2026-12' } ]);
    A.ctx.compilaScheda();
    expect(A.byId('s-lotto-eccip').value).toBe('CE1');
  });
});
