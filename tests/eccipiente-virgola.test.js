// Eccipiente come testo libero (v169): la virgola decimale non divide il nome
// ("Etanolo 99,9%"), la virgola tra due sostanze sì.
import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from './_app-vm.js';

describe('Eccipiente con virgola decimale', () => {
  let A;
  beforeAll(() => { A = buildApp(); });
  const UNG = { prep:'unguento', tariff:'semisolida', scheda:'unguento' };

  it('"Etanolo 99,9%": lotto di Etanolo 99,9%, non di Etanolo 96°', () => {
    A.run(UNG, [ {nome:'Acido mandelico', qty:'5', unit:'g', isPa:true}, {nome:'Vaselina bianca', qty:'45', unit:'g'} ],
          { 't-fl':'0', 's-eccip':'Etanolo 99,9%' },
          [ { nome: 'Etanolo 96°', prezzo: 0.015, lottoInt: 'E6', scad: '2026-12' },
            { nome: 'Etanolo 99,9%', prezzo: 0.05, lottoInt: 'E9', scad: '2028-01' } ]);
    A.ctx.compilaScheda();
    expect(A.byId('s-lotto-eccip').value).toBe('E9');
  });

  it('"Burro di karite, Cera emulsionante": la virgola tra sostanze divide ancora', () => {
    A.run(UNG, [ {nome:'Acido mandelico', qty:'5', unit:'g', isPa:true}, {nome:'Vaselina bianca', qty:'45', unit:'g'} ],
          { 't-fl':'0', 's-eccip':'Burro di karite, Cera emulsionante' },
          [ { nome: 'Cera emulsionante', prezzo: 0.05, lottoInt: 'CE1', scad: '2027-06' } ]);
    A.ctx.compilaScheda();
    expect(A.byId('s-lotto-eccip').value).toBe('CE1');
  });
});
