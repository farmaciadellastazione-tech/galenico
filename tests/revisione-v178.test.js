// Revisione mirata della v177: "Lascia" deve essere innocuo, più i punti minori.
import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from './_app-vm.js';

let app, ctx, byId, modalCalls, risposta;
const conc = () => ctx.liberaCalcTotale().conc;
const riga = (nome) => ctx.liberaRighe.find(r => r.nome === nome);
const qty = (nome) => parseFloat(riga(nome).qty);
const R = (nome, q, unit = 'g', isPa = false) => ({ nome, qty: q, unit, isPa, densita: null });

beforeEach(() => {
  app = buildApp(); ctx = app.ctx; byId = app.byId;
  app.setInv([]);
  modalCalls = []; risposta = true;
  ctx.showModal = async (o) => { modalCalls.push(o); return risposta; };
  ctx.azzeraRicetta();
  ctx.concMode = 'pp';
});

describe('#1 "Lascia" annulla il clic su PA', () => {
  beforeEach(() => {
    ctx.tipoPrep = 'unguento';
    ctx.liberaRighe = [R('Vaselina filante bianca', '98'), R('Acido salicilico', '3')];
    ctx.concRichiestaChanged('2');
  });

  it('PA sulla Vaselina, "Lascia", poi l\'acido cambiato: la Vaselina resta 98 g e non è PA', async () => {
    risposta = false;
    await ctx.liberaSetPa(0);
    expect(riga('Vaselina filante bianca').isPa).toBe(false);
    ctx.liberaRighe[1].qty = '4';
    await ctx.liberaQtyChanged(1);
    expect(riga('Vaselina filante bianca').qty).toBe('98');
    expect(riga('Acido salicilico').qty).toBe('4');
  });

  it('dopo "Lascia" il 2% resta scritto, in attesa del PA giusto', async () => {
    risposta = null; // Esc
    await ctx.liberaSetPa(0);
    expect(ctx.concRichiesta).toBe(2);
    risposta = true;
    await ctx.liberaSetPa(1);
    expect(qty('Acido salicilico')).toBeCloseTo(2, 3);
    expect(conc()).toBeCloseTo(2, 3);
  });
});

describe('#2/#3 durante la domanda non cambia nulla', () => {
  it('finestra aperta: il PA non è ancora acceso e un secondo clic su PA è ignorato', async () => {
    ctx.tipoPrep = 'unguento';
    ctx.liberaRighe = [R('Vaselina filante bianca', '98'), R('Acido salicilico', '3')];
    ctx.concRichiestaChanged('2');
    let rispondi;
    ctx.showModal = (o) => { modalCalls.push(o); return new Promise(res => { rispondi = res; }); };
    const p = ctx.liberaSetPa(1);
    expect(riga('Acido salicilico').isPa).toBe(false);
    expect(riga('Acido salicilico').qty).toBe('3');
    ctx.liberaSetPa(1); // secondo clic (Invio sul bottone dietro la finestra)
    expect(modalCalls.length).toBe(1);
    rispondi(true);
    await p;
    expect(riga('Acido salicilico').isPa).toBe(true);
    expect(qty('Acido salicilico')).toBeCloseTo(2, 3);
  });
});

describe('#4 righe a pezzi in cartine', () => {
  it('il testo mostra i pezzi su cui si calcola il costo', () => {
    const extra = { nome: 'Bustina', unit: 'pz', qty: 1, grams: 30, prezzo: 0.1, costo: 3, isLiquido: false };
    expect(ctx.formatMateriaRow(extra).name).toContain('30 pz');
  });
});

describe('#5 la nota "p/v senza liquidi" non resta dopo', () => {
  it('tornando in p/p la nota sparisce', () => {
    ctx.tipoPrep = 'soluzione';
    ctx.liberaRighe = [R('Minoxidil', '2', 'g', true), R('Estratto secco di ortica', '98')];
    ctx.concRichiestaChanged('2');
    ctx.setConcMode('pv');
    expect(byId('libera-conc-note').textContent).toMatch(/senza liquidi/);
    ctx.setConcMode('pp');
    expect(byId('libera-conc-note').textContent).not.toMatch(/senza liquidi/);
  });
});

// v179 (approvato dall'utente): annullato il volume delle righe in mg introdotto
// in v178 — il calcolo dei costi le tratta come solide; in mg il volume resta 0.
describe('#6 volume di una sostanza in mg con densità nota', () => {
  it('Glicerolo 5000 mg non aggiunge volume (come il calcolo dei costi)', () => {
    expect(ctx.volMlRiga(R('Glicerolo', '5000', 'mg'))).toBe(0);
  });
});

describe('#9 testo dell\'utente nella finestra', () => {
  it('nome e quantità sono protetti (niente HTML)', async () => {
    ctx.tipoPrep = 'unguento';
    ctx.liberaRighe = [R('Vaselina filante bianca', '98'), R('<b>Acido</b>', '3')];
    ctx.concRichiestaChanged('2');
    risposta = false;
    await ctx.liberaSetPa(1);
    expect(modalCalls[0].body).not.toContain('<b>');
    expect(modalCalls[0].body).toContain('&lt;b&gt;');
  });
});

describe('#10 decimali all\'italiana nella finestra', () => {
  it('"0.0612" si legge "0,0612"', async () => {
    ctx.tipoPrep = 'unguento';
    ctx.liberaRighe = [R('Vaselina filante bianca', '98'), R('Acido salicilico', '3')];
    ctx.concRichiestaChanged('2');
    risposta = false;
    await ctx.liberaSetPa(0);
    expect(modalCalls[0].body).toContain('0,0612');
    expect(ctx.numIt('61.9579')).toBe('61,9579');
  });
});
