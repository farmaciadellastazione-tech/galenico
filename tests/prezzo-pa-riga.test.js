// Prezzo PA in Tariffazione (v169): la riga PA è la prima riga con un nome (con
// quantità se c'è); niente prezzo "per nome" da un prep-pa-nome rimasto da prima.
// Senza righe con nome, anche i nomi del PA si svuotano.
import { describe, it, expect, beforeAll } from 'vitest';
import { buildApp } from './_app-vm.js';

const UNG = { prep:'unguento', tariff:'semisolida', scheda:'unguento' };

describe('Riga PA e nomi del PA', () => {
  let A;
  beforeAll(() => { A = buildApp(); });

  it('prima riga senza nome: il PA è la riga dopo, non la sostanza cancellata', () => {
    A.run(UNG, [ {nome:'Talco', qty:'10', unit:'g', isPa:true}, {nome:'Vaselina bianca', qty:'40', unit:'g'} ], { 't-fl':'0' }, []);
    expect(A.byId('t-pa').readOnly).toBe(true);
    A.ctx.liberaRighe = [ { nome:'', qty:'', unit:'g', lotto:'', prezzoAcq:0, h:'' },
                          { nome:'Burro di mango', qty:'', unit:'g', lotto:'', prezzoAcq:0, h:'' } ];
    A.ctx.calcPrep();
    expect(A.byId('prep-pa-nome').value).toBe('Burro di mango');
    expect(A.byId('t-pa').readOnly).toBe(false);
    expect(A.ctx.tarPADaAllegatoA).toBe(false);
  });

  it('nessuna riga con nome: si svuotano anche i nomi del PA', () => {
    A.run(UNG, [ {nome:'Talco', qty:'10', unit:'g', isPa:true}, {nome:'Vaselina bianca', qty:'40', unit:'g'} ], { 't-fl':'0' }, []);
    A.ctx.liberaRighe = [ { nome:'', qty:'', unit:'g', lotto:'', prezzoAcq:0, h:'' } ];
    A.ctx.calcPrep();
    expect(A.byId('prep-pa-nome').value).toBe('');
    expect(A.byId('t-pa-nome').value).toBe('');
  });
});
