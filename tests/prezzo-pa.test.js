// Prezzo del PA in Tariffazione (v169): stesso lotto e stessa riga PA della
// Preparazione (una sola funzione per calcPrep e sincronizzaTariffazione).
import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from './_app-vm.js';

const UNG = { prep:'unguento', tariff:'semisolida', scheda:'unguento' };

describe('Prezzo PA in Tariffazione', () => {
  let A;
  beforeAll(() => { A = buildApp(); });

  it('prezzo del lotto della riga PA (anche chiuso, se scelto)', () => {
    const inv = [ { nome: 'Olio di jojoba', prezzo: 1.2, lottoInt: 'J1', dataCh: '2026-01-01' },
                  { nome: 'Olio di jojoba', prezzo: 1.0, lottoInt: 'J2' } ];
    A.run(UNG, [ {nome:'Olio di jojoba', qty:'10', unit:'g', isPa:true, lotto:'J1'}, {nome:'Vaselina bianca', qty:'40', unit:'g'} ],
          { 't-fl':'0' }, inv);
    expect(A.byId('t-pa').value).toBe('1.2000');
  });

  it('due righe della stessa sostanza: la riga PA è la stessa della Preparazione (prima con quantità)', () => {
    const inv = [ { nome: 'Olio di jojoba', prezzo: 1.2, lottoInt: 'J1' }, { nome: 'Olio di jojoba', prezzo: 1.0, lottoInt: 'J2' } ];
    A.run(UNG, [ {nome:'Olio di jojoba', qty:'', unit:'g', lotto:'J1'},
                 {nome:'Olio di jojoba', qty:'10', unit:'g', lotto:'J2'},
                 {nome:'Vaselina bianca', qty:'40', unit:'g'} ], { 't-fl':'0' }, inv);
    expect(A.byId('t-pa').value).toBe('1.0000');
  });
});
