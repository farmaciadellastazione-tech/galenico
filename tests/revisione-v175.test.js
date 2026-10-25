// Seconda revisione (code review su v171→v174): un test per ogni difetto.
// Numeri come nel rapporto di revisione.
import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from './_app-vm.js';

let app, ctx, byId, modalCalls;
const conc = () => ctx.liberaCalcTotale().conc;
const totG = () => ctx.liberaCalcTotale().totG;
const riga = (nome) => ctx.liberaRighe.find(r => r.nome === nome);
const qty = (nome) => parseFloat(riga(nome).qty);
const R = (nome, q, unit = 'g', isPa = false) => ({ nome, qty: q, unit, isPa, densita: null });

beforeEach(() => {
  app = buildApp(); ctx = app.ctx; byId = app.byId;
  app.setInv([]);
  modalCalls = [];
  ctx.showModal = async (o) => { modalCalls.push(o); return true; };
  ctx.azzeraRicetta();
  ctx.concMode = 'pp';
});

describe('#2/#9 la concentrazione voluta è legata alla riga del PA', () => {
  beforeEach(() => {
    ctx.liberaRighe = [R('Minoxidil', '5', 'g', true), R('Finasteride', '0.1'), R('Etanolo 96°', '50'), R('Glicole propilenico', '45')];
    ctx.concRichiestaChanged('5');
  });

  it('spostare il bottone PA sulla Finasteride non la riscrive (resta 0,1 g) e lo dice', async () => {
    ctx.liberaSetPa(1);
    ctx.liberaRighe[2].qty = '60';
    await ctx.liberaQtyChanged(2);
    ctx.liberaCambiaUnita(2, 'ml');
    expect(riga('Finasteride').qty).toBe('0.1');
    expect(ctx.concRichiesta).toBe(null);
    expect(byId('libera-conc-note').textContent).toContain('Minoxidil');
  });

  it('rinominare la riga del PA non riscrive la nuova sostanza', async () => {
    const prima = ctx.liberaRighe[0].qty;
    ctx.liberaNomeInput(0, 'Clobetasolo');
    ctx.liberaRighe[2].qty = '60';
    await ctx.liberaQtyChanged(2);
    expect(ctx.liberaRighe[0].qty).toBe(prima);
    expect(ctx.concRichiesta).toBe(null);
  });

  it('il flusso normale funziona ancora: concentrazione prima, poi il nome del PA scritto a mano e scelto', async () => {
    ctx.azzeraRicetta();
    ctx.concRichiestaChanged('5');
    ctx.liberaRighe = [R('', ''), R('Etanolo 96°', '50'), R('Glicole propilenico', '45')];
    ctx.liberaNomeInput(0, 'Mino');
    ctx.liberaNomeInput(0, 'Minoxid');
    ctx.liberaSelComp(0, 'Minoxidil', 0.39, 'inv', '', '');
    expect(qty('Minoxidil')).toBeCloseTo(5, 3);
    ctx.liberaRighe[1].qty = '60';
    await ctx.liberaQtyChanged(1);
    expect(qty('Minoxidil')).toBeCloseTo(5 * 105 / 95, 3);
    expect(ctx.concRichiesta).toBe(5);
  });
});

describe('#4 contenitori a pezzi', () => {
  beforeEach(() => {
    ctx.tipoPrep = 'unguento';
    ctx.liberaRighe = [R('Acido salicilico', '2', 'g', true), R('Vaselina filante bianca', '98'), R('Barattolo 100 g', '1', 'pz')];
  });

  it('il barattolo non pesa: totale 100 g, e la Tariffazione riceve 100 g', () => {
    expect(totG()).toBeCloseTo(100, 6);
    ctx.calcPrep();
    expect(parseFloat(byId('qt').value)).toBeCloseTo(100, 6);
  });

  it('PA ricalcolato e Quantità totale ignorano il barattolo', () => {
    ctx.concRichiestaChanged('2');
    expect(qty('Acido salicilico')).toBeCloseTo(2, 3);
    byId('vol-soluzione').value = '50';
    ctx.volSoluzioneChanged();
    expect(qty('Acido salicilico')).toBeCloseTo(1, 3);
    expect(qty('Vaselina filante bianca')).toBeCloseTo(49, 3);
    expect(riga('Barattolo 100 g').qty).toBe('1');
    expect(totG()).toBeCloseTo(50, 3);
  });
});

describe('#1 p/v senza liquidi', () => {
  it('passare a p/v quando non c\'è ancora volume non fissa un p/p come se fosse p/v', async () => {
    ctx.tipoPrep = 'soluzione';
    ctx.liberaRighe = [R('Minoxidil', '5', 'g', true), R('Estratto secco di ortica', '95')];
    ctx.concRichiestaChanged('5');
    ctx.setConcMode('pv');
    expect(ctx.concRichiesta).toBe(null);
    ctx.liberaRighe.push(R('Etanolo 96°', '50', 'ml'));
    await ctx.liberaQtyChanged(2);
    expect(riga('Minoxidil').qty).toBe('5');
  });
});

describe('#10 forme solide: ml → g convertito', () => {
  it('soluzione → polvere: Etanolo 50 ml diventa 40,35 g, non 50 g', () => {
    ctx.tipoPrep = 'soluzione';
    ctx.liberaRighe = [R('Minoxidil', '5', 'g', true), R('Etanolo 96°', '50', 'ml')];
    ctx.tipoPrep = 'polvere';
    ctx.liberaRenderRighe();
    expect(riga('Etanolo 96°').unit).toBe('g');
    expect(qty('Etanolo 96°')).toBeCloseTo(50 * 0.807, 3);
  });
});

describe('#5 la preferenza p/p · p/v del browser non cambia', () => {
  it('riaprire uno snapshot p/p in un browser su p/v', () => {
    ctx.tipoPrep = 'soluzione';
    ctx.liberaRighe = [R('Minoxidil', '5', 'g', true), R('Etanolo 96°', '95')];
    ctx.concRichiestaChanged('5');
    const snap = JSON.parse(JSON.stringify(ctx.prepSnap()));
    ctx.azzeraRicetta();
    ctx.setConcMode('pv');
    ctx.prepRestore(snap);
    expect(ctx.concMode).toBe('pp');
    expect(ctx.localStorage.getItem('gal_conc_mode')).toBe('pv');
  });

  it('l\'esempio demo (e l\'import ricetta) non cambiano la preferenza salvata', () => {
    ctx.setConcMode('pv');
    ctx.caricaEsempioDemo();
    expect(ctx.concMode).toBe('pp');
    expect(ctx.localStorage.getItem('gal_conc_mode')).toBe('pv');
  });
});

describe('#6 Quantità totale non applicabile', () => {
  it('il campo torna al totale vero invece di mostrare il valore scritto', () => {
    ctx.liberaRighe = [R('Minoxidil', '5', 'g', true)];
    byId('vol-soluzione-unit').value = 'g';
    byId('vol-soluzione').value = '100';
    ctx.volSoluzioneChanged();
    expect(byId('vol-soluzione').value).toBe('5');
  });

  it('anche in ml senza liquidi e senza grado', () => {
    ctx.liberaRighe = [R('Minoxidil', '5', 'g', true)];
    byId('vol-soluzione').value = '100';
    ctx.volSoluzioneChanged();
    expect(byId('vol-soluzione').value).toBe('');
  });
});

describe('#7 sospensione con un grado rimasto', () => {
  it('la Quantità totale in ml non aggiunge etanolo e acqua', () => {
    ctx.tipoPrep = 'sospensione';
    ctx.liberaRighe = [R('Minoxidil', '5', 'g', true)];
    byId('grado-alc').value = '40';
    byId('vol-soluzione').value = '100';
    ctx.volSoluzioneChanged();
    expect(riga('Etanolo 96°')).toBeUndefined();
    expect(riga('Acqua purificata')).toBeUndefined();
  });
});

describe('#3 import di capsule', () => {
  it('niente falso avviso "Verifica" sulla concentrazione', () => {
    ctx.ricettaApplicaJson({ tipoPrep: 'capsule', concentrazione: 4,
      ingredienti: [ { nome: 'Melatonina', qty: 3, unit: 'mg', isPa: true }, { nome: 'Lattosio monoidrato', qty: 200, unit: 'mg' } ] });
    expect(byId('ricetta-status').textContent).not.toMatch(/verifica:/i);
  });
});
