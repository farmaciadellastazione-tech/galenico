// Concentrazione voluta (v173): si parte da "Minoxidil al 5%". La concentrazione
// resta fissa, la quantità totale si sceglie, i componenti seguono.
//  1. Con la concentrazione impostata, modificare un eccipiente ricalcola il PA
//     da solo (nessuna domanda); modificare il PA chiede (v172).
//  2. "Quantità totale" in g o ml, per tutte le forme tranne capsule/cartine:
//     scala i componenti e la concentrazione resta quella voluta.
//  3. La concentrazione voluta si salva (archivio/preventivi) e arriva dalla
//     ricetta importata (campo "concentrazione" del JSON).
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

describe('1. Eccipienti modificati: il PA segue la concentrazione voluta', () => {
  beforeEach(() => {
    ctx.concRichiestaChanged('5');
    ctx.liberaRighe = [R('Minoxidil', '', 'g', true), R('Etanolo 96°', '50'), R('Glicole propilenico', '35'), R('Acqua purificata', '')];
  });

  it('scrivendo l\'ultimo eccipiente il Minoxidil si calcola da solo, senza domande', async () => {
    ctx.liberaRighe[3].qty = '10';
    await ctx.liberaQtyChanged(3);
    expect(modalCalls.length).toBe(0);
    expect(qty('Minoxidil')).toBeCloseTo(5 * 95 / 95, 3); // PA = 5·95/(100−5) = 5 g su 100 g
    expect(conc()).toBeCloseTo(5, 3);
  });

  it('cambiare un eccipiente già scritto ricalcola il PA, sempre senza domande', async () => {
    ctx.liberaRighe[3].qty = '10';
    await ctx.liberaQtyChanged(3);
    ctx.liberaRighe[1].qty = '60';
    await ctx.liberaQtyChanged(1);
    expect(modalCalls.length).toBe(0);
    expect(qty('Minoxidil')).toBeCloseTo(5 * 105 / 95, 3);
    expect(conc()).toBeCloseTo(5, 3);
  });

  it('funziona anche se il PA non è marcato (riconosciuto: non è un solvente)', async () => {
    ctx.liberaRighe[0].isPa = false;
    ctx.liberaRighe[3].qty = '10';
    await ctx.liberaQtyChanged(3);
    expect(conc()).toBeCloseTo(5, 3);
  });

  it('modificare il PA invece chiede (Mantieni / Tieni)', async () => {
    ctx.liberaRighe[3].qty = '10';
    await ctx.liberaQtyChanged(3);
    ctx.liberaRighe[0].qty = '8';
    await ctx.liberaQtyChanged(0);
    expect(modalCalls.length).toBe(1);
    expect(conc()).toBeCloseTo(5, 3);
  });

  it('togliere un eccipiente ricalcola il PA', async () => {
    ctx.liberaRighe[3].qty = '10';
    await ctx.liberaQtyChanged(3);
    ctx.liberaRemoveRiga(2); // glicole
    expect(qty('Minoxidil')).toBeCloseTo(5 * 60 / 95, 3);
    expect(conc()).toBeCloseTo(5, 3);
  });

  it('togliere il PA non trasforma un solvente in PA', async () => {
    ctx.liberaRighe[3].qty = '10';
    await ctx.liberaQtyChanged(3);
    ctx.liberaRemoveRiga(0);
    expect(ctx.liberaRighe.map(r => r.qty)).toEqual(['50', '35', '10']);
  });

  it('scegliere il PA dalla ricerca dopo gli eccipienti gli dà subito la quantità', () => {
    ctx.liberaRighe = [R('Etanolo 96°', '50'), R('Glicole propilenico', '35'), R('Acqua purificata', '10'), R('', '')];
    ctx.liberaSelComp(3, 'Minoxidil', 0.39, 'inv', '', '');
    expect(qty('Minoxidil')).toBeCloseTo(5 * 95 / 95, 3);
    expect(conc()).toBeCloseTo(5, 3);
  });

  it('la riga del PA dice che è calcolato per la concentrazione voluta', async () => {
    ctx.liberaRighe[3].qty = '10';
    await ctx.liberaQtyChanged(3);
    ctx.liberaRenderRighe();
    expect(byId('libera-righe').innerHTML).toContain('calcolato per il 5%');
  });

  it('senza concentrazione voluta nessun ricalcolo', async () => {
    ctx.concRichiestaChanged('');
    ctx.liberaRighe[0].qty = '5';
    ctx.liberaRighe[3].qty = '10';
    await ctx.liberaQtyChanged(3);
    expect(riga('Minoxidil').qty).toBe('5');
  });
});

describe('2. Quantità totale in g o ml', () => {
  it('soluzione: 200 g scala tutto, 5% resta 5%', () => {
    ctx.caricaEsempioDemo();
    byId('vol-soluzione-unit').value = 'g';
    byId('vol-soluzione').value = '200';
    ctx.volSoluzioneChanged();
    expect(totG()).toBeCloseTo(200, 2);
    expect(qty('Minoxidil')).toBeCloseTo(10, 3);
    expect(conc()).toBeCloseTo(5, 3);
  });

  it('soluzione in g: il campo mostra il totale in g', () => {
    ctx.caricaEsempioDemo();
    byId('vol-soluzione-unit').value = 'g';
    ctx.calcPrep();
    expect(byId('vol-soluzione').value).toBe('100');
  });

  it('soluzione: 150 ml (default ml) scala sul volume, 5% resta 5%', () => {
    ctx.caricaEsempioDemo();
    byId('vol-soluzione').value = '150';
    ctx.volSoluzioneChanged();
    expect(ctx.liberaSommaVolumeLiquidi()).toBeCloseTo(150, 1);
    expect(conc()).toBeCloseTo(5, 3);
  });

  it('grado alcolico con totale in g: il totale resta 100 g e la concentrazione 5%', () => {
    ctx.caricaEsempioDemo();
    byId('vol-soluzione-unit').value = 'g';
    byId('vol-soluzione').value = '100';
    byId('grado-alc').value = '40';
    ctx.gradoAlcChanged();
    expect(totG()).toBeCloseTo(100, 2);
    expect(conc()).toBeCloseTo(5, 3);
  });

  it('unguento: la riga è visibile, solo in g; 50 g dimezza tutto e la concentrazione resta', () => {
    ctx.tipoPrep = 'unguento';
    ctx.liberaRighe = [R('Acido salicilico', '2', 'g', true), R('Vaselina filante bianca', '98')];
    ctx.concRichiestaChanged('2');
    byId('vol-soluzione-unit').value = 'ml'; // residuo da una soluzione: per l'unguento vale g
    ctx.calcPrep();
    expect(byId('row-vol-soluzione').style.display).toBe('');
    expect(byId('vol-soluzione-unit').value).toBe('g');
    byId('vol-soluzione').value = '50';
    ctx.volSoluzioneChanged();
    expect(qty('Acido salicilico')).toBeCloseTo(1, 3);
    expect(qty('Vaselina filante bianca')).toBeCloseTo(49, 3);
    expect(conc()).toBeCloseTo(2, 3);
  });

  it('capsule: nessuna quantità totale', () => {
    ctx.tipoPrep = 'capsule';
    ctx.liberaRighe = [R('Minoxidil', '2.5', 'mg', true)];
    ctx.liberaRenderRighe();
    expect(byId('row-vol-soluzione').style.display).toBe('none');
  });
});

describe('3. Concentrazione voluta salvata e importata', () => {
  it('archivio/preventivo: prepSnap la salva e prepRestore la rimette', () => {
    ctx.caricaEsempioDemo();
    const snap = JSON.parse(JSON.stringify(ctx.prepSnap()));
    ctx.azzeraRicetta();
    expect(ctx.concRichiesta).toBe(null);
    ctx.prepRestore(snap);
    expect(ctx.concRichiesta).toBe(5);
    byId('grado-alc').value = '40';
    ctx.gradoAlcChanged();
    expect(conc()).toBeCloseTo(5, 3);
  });

  it('snapshot vecchi (senza il campo): nessuna concentrazione voluta', () => {
    ctx.caricaEsempioDemo();
    const snap = JSON.parse(JSON.stringify(ctx.prepSnap()));
    delete snap.concRichiesta;
    ctx.prepRestore(snap);
    expect(ctx.concRichiesta).toBe(null);
  });

  // v174 (revisione #5): il PA si calcola solo se la ricetta non ne dà la quantità;
  // una quantità che non torna non viene riscritta (tests/revisione-v174.test.js).
  it('ricetta importata con "concentrazione": 3 → voluta 3%, PA ricalcolato', () => {
    ctx.ricettaApplicaJson({ tipoPrep: 'soluzione', concMode: 'pp', concentrazione: 3,
      ingredienti: [ { nome: 'Minoxidil', qty: '', unit: 'g', isPa: true }, { nome: 'Etanolo 96°', qty: 97, unit: 'g' } ] });
    expect(ctx.concRichiesta).toBe(3);
    expect(qty('Minoxidil')).toBeCloseTo(3, 3);
    expect(conc()).toBeCloseTo(3, 3);
  });

  it('ricetta senza concentrazione: nessuna concentrazione voluta, quantità intatte', () => {
    ctx.ricettaApplicaJson({ tipoPrep: 'soluzione', concentrazione: null,
      ingredienti: [ { nome: 'Minoxidil', qty: 5, unit: 'g', isPa: true }, { nome: 'Etanolo 96°', qty: 97, unit: 'g' } ] });
    expect(ctx.concRichiesta).toBe(null);
    expect(riga('Minoxidil').qty).toBe('5');
  });
});
