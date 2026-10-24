// Prezzo del PA in Tariffazione senza PA (v169): cancellate le righe, il prezzo di
// legge di prima non resta bloccato; senza prezzo, l'etichetta "Allegato A" sparisce.
import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from './_app-vm.js';

const UNG = { prep:'unguento', tariff:'semisolida', scheda:'unguento' };

describe('Prezzo PA senza PA', () => {
  let A;
  beforeAll(() => { A = buildApp(); });

  it('tutte le righe cancellate: t-pa vuoto e sbloccato', () => {
    A.run(UNG, [ {nome:'Acido salicilico', qty:'2', unit:'g', isPa:true}, {nome:'Vaselina bianca', qty:'48', unit:'g'} ], { 't-fl':'0' }, []);
    expect(A.byId('t-pa').readOnly).toBe(true);
    A.ctx.liberaRighe = [ { nome:'', qty:'', unit:'g', lotto:'', prezzoAcq:0, h:'' } ];
    A.ctx.calcPrep();
    expect(A.byId('t-pa').value).toBe('');
    expect(A.byId('t-pa').readOnly).toBe(false);
    expect(A.ctx.tarPADaAllegatoA).toBe(false);
  });

  it('PA senza prezzo dopo uno di legge: niente etichetta "Allegato A"', () => {
    A.run(UNG, [ {nome:'Acido salicilico', qty:'2', unit:'g', isPa:true}, {nome:'Vaselina bianca', qty:'48', unit:'g'} ], { 't-fl':'0' }, []);
    expect(A.byId('t-pa-fonte').innerHTML).toContain('Allegato A');
    A.ctx.liberaRighe[0].nome = 'Olio di argan';
    A.ctx.calcPrep();
    expect(A.byId('t-pa').value).toBe('');
    expect(A.byId('t-pa-fonte').innerHTML).not.toContain('Allegato A');
  });
});
