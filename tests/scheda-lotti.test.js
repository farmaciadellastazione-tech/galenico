// Lotti proposti dalla Scheda (v169): solo della sostanza (non per prima parola:
// "Acido mandelico" non prende il lotto dell'acido glicolico), ma con le parole
// scritte a inizio parola se la ricerca stretta non trova niente ("Lattosio" →
// lotti di "Lattosio monoidrato"). Eccipiente come testo libero: ogni sostanza.
import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from './_app-vm.js';

const UNG = { prep:'unguento', tariff:'semisolida', scheda:'unguento' };

describe('Lotti della Scheda', () => {
  let A;
  beforeAll(() => { A = buildApp(); });

  it('PA: lotto solo della sua sostanza (non per prima parola)', () => {
    A.run(UNG, [ {nome:'Acido mandelico', qty:'5', unit:'g', isPa:true}, {nome:'Vaselina bianca', qty:'45', unit:'g'} ],
          { 't-fl':'0' }, [ { nome: 'Acido glicolico', prezzo: 0.2, lottoInt: 'G1', scad: '2027-01' } ]);
    expect(A.ctx.trovaLottiSostanza('Acido mandelico').map(c => c.lotto)).toEqual([]);
    A.ctx.compilaScheda();
    expect(A.byId('s-lotto-as').value).toBe('');
  });

  it('riga "Burro di karite": lotti di "Burro di karite raffinato" proposti; scelto, il prezzo segue il lotto', () => {
    const inv = [ { nome: 'Burro di karite raffinato', prezzo: 0.08, lottoInt: 'K1', scad: '2027-01' } ];
    expect(A.run(UNG, [ {nome:'Burro di karite', qty:'10', unit:'g'}, {nome:'Vaselina bianca', qty:'40', unit:'g'} ],
                 { 't-fl':'0' }, inv) && A.ctx.trovaLottiSostanza('Burro di karite').map(c => c.lotto)).toEqual(['K1']);
    // Lotto di ripiego: proposto ma non scelto in automatico (decisione dell'utente,
    // 2026-10-24; prima di v169 (13) veniva preselezionato FEFO).
    A.ctx.schedaLottiRender(true, true);
    expect(A.ctx.liberaRighe[0].lotto).toBe('');
    A.ctx.schedaLottoInput(0, 'K1');
    expect(A.ctx.liberaRigheExtra[0].prezzo).toBe(0.08);
  });

  it('eccipiente come testo libero ("Burro di karite/Cera emulsionante"): lotti di ogni sostanza', () => {
    A.run(UNG, [ {nome:'Acido mandelico', qty:'5', unit:'g', isPa:true}, {nome:'Vaselina bianca', qty:'45', unit:'g'} ],
          { 't-fl':'0', 's-eccip':'Burro di karite/Cera emulsionante' },
          [ { nome: 'Burro di karite', prezzo: 0.08, lottoInt: 'K1', scad: '2027-01' },
            { nome: 'Cera emulsionante', prezzo: 0.05, lottoInt: 'E1', scad: '2027-06' } ]);
    A.ctx.compilaScheda();
    expect(['K1', 'E1']).toContain(A.byId('s-lotto-eccip').value);
  });
});
