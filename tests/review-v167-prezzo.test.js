// Review v164–v167 della ricerca prezzo (v168): nomi generici agganciati a un
// sale, decimali scambiati per purezza, più lotti della stessa sostanza, blocco
// del PA in Tariffazione, quantità con la virgola dai preventivi vecchi, menu
// suggerimenti (ordine, parole in altro ordine, lotti), lotti della Scheda presi
// da un'altra sostanza per la prima parola.
import { describe, it, expect, beforeAll } from 'vitest';
import { ALLEGATO_A, trovaVoceAllegatoA, invTrovaPerPrezzo, invLottiSostanza, invVociPerRicerca,
         invLottiPrezziDiversi, vociAllegatoAPerRicerca } from '../pricing.js';
import { buildApp } from './_app-vm.js';

describe('Allegato A — nome generico con più voci a prezzi diversi', () => {
  it('nessuna voce: il nome da solo non sceglie il sale', () => {
    for (const n of ['Zinco', 'Magnesio', 'Calcio', 'Sodio solfato'])
      expect([n, trovaVoceAllegatoA(n)]).toEqual([n, null]);
  });
  it('"cera" da sola non è cera bianca (cera d\'api naturale ≠ cera FU sbiancata)', () => {
    expect(trovaVoceAllegatoA('Cera')).toBe(null);
    expect(trovaVoceAllegatoA('Cera bianca F.U.')).toBe('cera bianca');
  });
  it('"lanolina" → lanolina anidra (unica voce)', () => {
    expect(trovaVoceAllegatoA('Lanolina')).toBe('lanolina anidra');
  });
  it('i sali scritti per intero restano', () => {
    expect(trovaVoceAllegatoA('Zinco ossido')).toBe('zinco ossido');
    expect(trovaVoceAllegatoA('Sodio solfato decaidrato')).toBe('sodio solfato decaidrato');
  });
});

describe('Allegato A — decimali: concentrazione ≠ purezza', () => {
  it('concentrazioni con lo zero finale non prendono il prezzo della sostanza pura', () => {
    for (const n of ['Acido salicilico 2,00%', 'Sodio cloruro 9,0%', 'Zinco ossido 0,95%', 'Acido salicilico 2.0%'])
      expect([n, trovaVoceAllegatoA(n)]).toEqual([n, null]);
  });
  it('purezze ≥ 90 restano innocue', () => {
    expect(trovaVoceAllegatoA('Zinco ossido 99,5%')).toBe('zinco ossido');
    expect(trovaVoceAllegatoA('Zinco ossido 99%')).toBe('zinco ossido');
  });
});

describe('Inventario — più lotti della stessa sostanza', () => {
  const inv = [
    { nome: 'Olio di mandorle dolci', prezzo: 0.02, lottoInt: 'M1' },
    { nome: 'Etanolo 96°', prezzo: 0.015, lottoInt: 'E1' },
    { nome: 'Etanolo 96°', prezzo: 0.020, lottoInt: 'E2' },
    { nome: 'Glicerolo', prezzo: 0.01, lottoInt: 'G1' },
    { nome: 'Glicerolo', prezzo: 0.01, lottoInt: 'G2' },
  ];
  it('tutti i lotti della sostanza, non quelli di altre', () => {
    expect(invLottiSostanza('Etanolo', inv).map(s => s.lottoInt)).toEqual(['E1', 'E2']);
    expect(invLottiSostanza('Fenossietanolo', inv)).toEqual([]);
  });
  it('prezzo del lotto usato nella preparazione', () => {
    expect(invTrovaPerPrezzo('Etanolo', inv, 'E2').prezzo).toBe(0.020);
    expect(invTrovaPerPrezzo('Etanolo 96°', inv, 'E1').prezzo).toBe(0.015);
  });
  it('lotti a prezzi diversi e nessun lotto scelto: nessun prezzo automatico', () => {
    expect(invTrovaPerPrezzo('Etanolo', inv)).toBe(null);
    expect(invTrovaPerPrezzo('Etanolo', inv, 'X9')).toBe(null);
  });
  it('lotti allo stesso prezzo: va bene quello', () => {
    expect(invTrovaPerPrezzo('Glicerolo', inv).prezzo).toBe(0.01);
  });
  it('suggerimenti: parole in qualunque ordine e a inizio parola', () => {
    expect(invVociPerRicerca('olio mandorle', inv).map(s => s.nome)).toContain('Olio di mandorle dolci');
    expect(invVociPerRicerca('mandorle olio', inv).map(s => s.nome)).toContain('Olio di mandorle dolci');
    expect(invVociPerRicerca('olio', inv).map(s => s.nome)).not.toContain('Etanolo 96°');
  });
});

describe('Review v168 — lotti chiusi, nomi diversi della stessa sostanza, vaselina', () => {
  it('un lotto chiuso non rende ambiguo il prezzo (e non viene proposto)', () => {
    const inv = [ { nome: 'Olio di ricino', prezzo: 0.10, lottoInt: 'R1', dataCh: '2026-09-01' },
                  { nome: 'Olio di ricino', prezzo: 0.12, lottoInt: 'R2' } ];
    expect(invTrovaPerPrezzo('Olio di ricino', inv).lottoInt).toBe('R2');
    expect(invLottiPrezziDiversi('Olio di ricino', inv)).toBe(false);
    expect(invTrovaPerPrezzo('Olio di ricino', inv, 'R1').prezzo).toBe(0.10);   // scelto esplicitamente: vale
  });
  it('aggiunte innocue (fornitore, F.U.) non dividono i lotti della stessa sostanza', () => {
    const inv = [ { nome: 'Etanolo 96°', prezzo: 0.015, lottoInt: 'E1' },
                  { nome: 'Etanolo 96° Farmalabor', prezzo: 0.015, lottoInt: 'E2' },
                  { nome: 'Etanolo 70°', prezzo: 0.012, lottoInt: 'E3' } ];
    expect(invLottiSostanza('Etanolo 96°', inv).map(s => s.lottoInt)).toEqual(['E1', 'E2']);
    expect(invTrovaPerPrezzo('Etanolo 96° F.U.', inv).prezzo).toBe(0.015);
  });
  it('"Vaselina": le voci che iniziano così hanno tutte lo stesso prezzo → prezzo di legge', () => {
    expect(ALLEGATO_A[trovaVoceAllegatoA('Vaselina')]).toBe(0.023);
    expect(trovaVoceAllegatoA('Cera')).toBe(null);      // una sola voce, e il colore la distingue
    expect(trovaVoceAllegatoA('Zinco')).toBe(null);     // prezzi diversi
  });
});

describe('App (index.html) — lotti, PA, quantità, menu', () => {
  let A;
  beforeAll(() => { A = buildApp(); });
  const UNG = { prep:'unguento', tariff:'semisolida', scheda:'unguento' };
  const INV_LOTTI = [
    { nome: 'Olio di jojoba', prezzo: 0.10, lottoInt: 'J1', scad: '2027-01' },
    { nome: 'Olio di jojoba', prezzo: 0.14, lottoInt: 'J2', scad: '2028-01' },
  ];

  it('invLoadMerged tiene tutti i lotti con lo stesso nome (anche di sostanze di base)', () => {
    A.setInv([...INV_LOTTI,
      { nome: 'Etanolo 96°', prezzo: 0.015, lottoInt: 'E1' }, { nome: 'Etanolo 96°', prezzo: 0.02, lottoInt: 'E2' }]);
    const m = A.ctx.invLoadMerged();
    expect(m.filter(s => s.nome === 'Olio di jojoba').map(s => s.lottoInt)).toEqual(['J1', 'J2']);
    const et = m.filter(s => s.nome === 'Etanolo 96°');
    expect(et.map(s => s.lottoInt)).toEqual(['E1', 'E2']);
    expect(et.every(s => s.h === 'H225,H319')).toBe(true);   // codici H di base conservati
  });

  it('riga con lotto scelto: prezzo di quel lotto', () => {
    for (const [lotto, prezzo] of [['J1', 0.10], ['J2', 0.14]]) {
      const r = A.run(UNG, [ {nome:'Olio di jojoba', qty:'10', unit:'g', lotto},
                             {nome:'Vaselina bianca', qty:'30', unit:'g'} ], { 't-fl':'0' }, INV_LOTTI);
      expect([lotto, r.extra[0].prezzo]).toEqual([lotto, prezzo]);
    }
  });

  it('riga senza lotto e lotti a prezzi diversi: prezzo 0 e avviso "scegli il lotto"', () => {
    const r = A.run(UNG, [ {nome:'Olio di jojoba', qty:'10', unit:'g'},
                           {nome:'Vaselina bianca', qty:'30', unit:'g'} ], { 't-fl':'0' }, INV_LOTTI);
    expect(r.extra[0].prezzo).toBe(0);
    expect(r.dett).toContain('scegli il lotto');
  });

  it('lotto scelto nella Scheda → il prezzo della riga si aggiorna', () => {
    A.run(UNG, [ {nome:'Olio di jojoba', qty:'10', unit:'g'},
                 {nome:'Vaselina bianca', qty:'30', unit:'g'} ], { 't-fl':'0' }, INV_LOTTI);
    A.ctx.schedaLottoInput(0, 'J1');
    expect(A.ctx.liberaRigheExtra[0].prezzo).toBe(0.10);
  });

  it('lotti senza codice a prezzi diversi: vale il prezzo scelto dal menu (prezzoAcq)', () => {
    const inv = [ { nome: 'Olio di jojoba', prezzo: 0.10 }, { nome: 'Olio di jojoba', prezzo: 0.14 } ];
    const r = A.run(UNG, [ {nome:'Olio di jojoba', qty:'10', unit:'g', prezzoAcq:0.14, fonte:'inventario'},
                           {nome:'Vaselina bianca', qty:'30', unit:'g'} ], { 't-fl':'0' }, inv);
    expect(r.extra[0].prezzo).toBe(0.14);
    expect(r.dett).not.toContain('scegli il lotto');
  });

  it('codice lotto scritto a mano: il prezzo cambia solo quando corrisponde a un lotto', () => {
    A.run(UNG, [ {nome:'Olio di jojoba', qty:'10', unit:'g', lotto:'J1'},
                 {nome:'Vaselina bianca', qty:'30', unit:'g'} ], { 't-fl':'0' }, INV_LOTTI);
    A.ctx.schedaLottoInput(0, 'J');
    expect(A.ctx.liberaRigheExtra[0].prezzo).toBe(0.10);
    A.ctx.schedaLottoInput(0, 'J2');
    expect(A.ctx.liberaRigheExtra[0].prezzo).toBe(0.14);
  });

  it('importazione AI: con più lotti aperti non prescrive un lotto (lo sceglie la Scheda)', () => {
    A.store.clear();
    A.setInv(INV_LOTTI);
    A.ctx.aiImportaTutti([ { nome:'Olio di jojoba', qty:'10', unit:'g' }, { nome:'Vaselina bianca', qty:'30', unit:'g' } ], 'unguento');
    expect(A.ctx.liberaRighe[0].lotto).toBe('');
  });

  it('prompt AI: una riga per sostanza anche con più lotti a prezzi diversi', () => {
    A.setInv(INV_LOTTI);
    const p = A.ctx.aiGetSystemPrompt();
    expect((p.match(/- Olio di jojoba/g) || []).length).toBe(1);
  });

  it('menu lotti della Scheda: niente lotti di un\'altra sostanza con la stessa prima parola', () => {
    A.run(UNG, [ {nome:'Acido mandelico', qty:'5', unit:'g'},
                 {nome:'Vaselina bianca', qty:'30', unit:'g'} ], { 't-fl':'0' },
          [ { nome: 'Acido glicolico', prezzo: 0.2, lottoInt: 'G1', scad: '2027-01' } ]);
    A.ctx.schedaLottiRender(true, true);
    expect(A.ctx.liberaRighe[0].lotto).toBe('');
  });

  it('riga: cambiare il nome scrivendo azzera lotto, prezzo d\'acquisto e codici H della sostanza di prima', () => {
    A.setInv(INV_LOTTI);
    A.ctx.liberaRighe = [{ nome:'Olio di jojoba', qty:'10', unit:'g', lotto:'J2', prezzoAcq:0.14, fonte:'inventario', h:'H999' }];
    A.ctx.liberaNomeInput(0, 'Acido mandelico');
    const r = A.ctx.liberaRighe[0];
    expect([r.nome, r.lotto, r.prezzoAcq, r.fonte, r.h]).toEqual(['Acido mandelico', '', 0, null, '']);
  });

  it('menu suggerimenti: un bottone per lotto se i prezzi sono diversi, con il lotto', () => {
    A.setInv(INV_LOTTI);
    A.ctx.liberaRighe = [{ nome:'', qty:'', unit:'g', lotto:'' }];
    A.ctx.liberaCercaComp(0, 'jojoba');
    const html = A.byId('libera-sug-0').innerHTML;
    expect(html).toContain("'J1'");
    expect(html).toContain("'J2'");
  });

  it('menu suggerimenti: Allegato A nell\'ordine di vicinanza (come Tariffazione)', () => {
    A.setInv([]);
    A.ctx.liberaRighe = [{ nome:'', qty:'', unit:'g', lotto:'' }];
    A.ctx.liberaCercaComp(0, 'acido');
    const html = A.byId('libera-sug-0').innerHTML;
    const attese = vociAllegatoAPerRicerca('acido').slice(0, 6);
    const pos = attese.map(k => html.toLowerCase().indexOf("liberaselcomp(0,'" + k));
    expect(pos.every(p => p >= 0)).toBe(true);
    expect([...pos].sort((a, b) => a - b)).toEqual(pos);
  });

  it('menu suggerimenti: inventario con parole in altro ordine; lotto di "Ossido di zinco" per la voce zinco ossido', () => {
    A.setInv([ { nome: 'Burro di karite', prezzo: 0.05, lottoInt: 'K1' },
               { nome: 'Ossido di zinco', prezzo: 0.03, lottoInt: 'Z1' } ]);
    A.ctx.liberaRighe = [{ nome:'', qty:'', unit:'g', lotto:'' }];
    A.ctx.liberaCercaComp(0, 'karite burro');
    expect(A.byId('libera-sug-0').innerHTML).toContain('Burro di karite');
    A.ctx.liberaCercaComp(0, 'zinco ossido');
    expect(A.byId('libera-sug-0').innerHTML).toContain("'Z1'");
  });

  it('Tariffazione PA: nome che non trova più la voce sblocca e svuota il prezzo di legge', () => {
    A.store.clear();
    A.byId('t-pa-nome').value = 'Zinco ossido';
    A.ctx.tarRicercaPA();
    expect(A.byId('t-pa').readOnly).toBe(true);
    A.byId('t-pa-nome').value = 'Zinco oss';
    A.ctx.tarRicercaPA();
    expect(A.byId('t-pa').readOnly).toBe(false);
    expect(A.byId('t-pa').value).toBe('');
    expect(A.ctx.tarPADaAllegatoA).toBe(false);
    A.byId('t-pa-nome').value = 'Zinco ossido';
    A.ctx.tarRicercaPA();
    A.byId('t-pa-nome').value = '';
    A.ctx.tarRicercaPA();
    expect(A.byId('t-pa').readOnly).toBe(false);
    expect(A.byId('t-pa').value).toBe('');
  });

  it('quantità con la virgola (preventivi salvati prima della v167) arriva in Tariffazione', () => {
    A.store.clear();
    A.ctx.tipoPrep = 'sospensione';
    A.ctx.liberaRigheExtra = [];
    A.byId('qt').value = '300,00';
    A.byId('conc').value = '4,00';
    A.ctx.sincronizzaTariffazione();
    expect(parseFloat(A.byId('t-qt').value)).toBe(300);
    expect(parseFloat(A.byId('t-conc').value)).toBe(4);
  });
});
