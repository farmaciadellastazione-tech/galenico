// Revisione mirata della v180: import dal Formulario AI e punti minori.
import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from './_app-vm.js';

let app, ctx, byId, modalCalls, risposta;
const riga = (nome) => ctx.liberaRighe.find(r => r.nome === nome);
const R = (nome, q, unit = 'g', isPa = false) => ({ nome, qty: q, unit, isPa, densita: null });
const nota = () => byId('libera-conc-note').textContent;

beforeEach(() => {
  app = buildApp(); ctx = app.ctx; byId = app.byId;
  app.setInv([]);
  modalCalls = []; risposta = true;
  ctx.showModal = async (o) => { modalCalls.push(o); return risposta; };
  ctx.azzeraRicetta();
  ctx.concMode = 'pp';
});

describe('#4 formula importata dal Formulario AI', () => {
  it('la concentrazione voluta della formula di prima non si applica a quella nuova', async () => {
    ctx.tipoPrep = 'unguento';
    ctx.liberaRighe = [R('Acido salicilico', '2', 'g', true), R('Vaselina filante bianca', '98')];
    ctx.concRichiestaChanged('2');
    ctx.aiImportaTutti([
      { nome: 'Urea', qty: '10', unit: 'g' },
      { nome: 'Vaselina filante bianca', qty: '90', unit: 'g' },
    ], 'unguento');
    expect(ctx.concRichiesta).toBe(null);
    expect(nota()).not.toMatch(/tolta/);
    ctx.liberaSetPa(0);
    ctx.liberaRighe[1].qty = '190';
    await ctx.liberaQtyChanged(1);
    expect(riga('Urea').qty).toBe('10');
  });
});

describe('#1 "Applica" con un altro PA già marcato ma non legato', () => {
  it('sposta il PA invece di dire "non applicato"', async () => {
    ctx.tipoPrep = 'soluzione';
    ctx.liberaRighe = [R('Minoxidil', '', 'g', true), R('Finasteride', '0.5')];
    ctx.setConcMode('pv');
    ctx.concRichiestaChanged('1'); // p/v senza liquidi: nessun legame
    ctx.liberaRighe.push(R('Acqua purificata', '100', 'ml'));
    await ctx.liberaSetPa(1);
    expect(modalCalls.length).toBe(1);
    expect(riga('Finasteride').isPa).toBe(true);
    expect(nota()).not.toMatch(/non applicat/);
  });
});

describe('#3 la nota "PA non applicato" non copre le note dopo', () => {
  it('alla modifica successiva torna la nota normale', async () => {
    ctx.tipoPrep = 'unguento';
    ctx.liberaRighe = [R('Vaselina filante bianca', '98'), R('Acido salicilico', '3')];
    ctx.concRichiestaChanged('2');
    let rispondi;
    ctx.showModal = (o) => { modalCalls.push(o); return new Promise(res => { rispondi = res; }); };
    const p = ctx.liberaSetPa(1);
    ctx.liberaRighe[1].nome = 'Resorcina';
    rispondi(true);
    await p;
    expect(nota()).toMatch(/non applicat/);
    ctx.liberaRighe[0].qty = '97';
    await ctx.liberaQtyChanged(0);
    expect(nota()).not.toMatch(/non applicat/);
  });
});

describe('#2 forme liquide tra loro', () => {
  it('da soluzione a tintura la concentrazione voluta resta e vale', () => {
    ctx.tipoPrep = 'soluzione';
    ctx.liberaRighe = [R('Minoxidil', '5', 'g', true), R('Etanolo 96°', '95')];
    ctx.concRichiestaChanged('5');
    ctx.setTipo('tintura', byId('btn-finto'));
    expect(ctx.concRichiesta).toBe(5);
    expect(ctx.concRichiestaAttiva()).toBe(true);
  });

  it('da soluzione a unguento invece si toglie', () => {
    ctx.tipoPrep = 'soluzione';
    ctx.liberaRighe = [R('Minoxidil', '5', 'g', true), R('Etanolo 96°', '95')];
    ctx.concRichiestaChanged('5');
    ctx.setTipo('unguento', byId('btn-finto'));
    expect(ctx.concRichiesta).toBe(null);
  });
});

describe('#6 preparazioni minuscole', () => {
  it('0,025% su 0,5 g: subito dopo il calcolo nessun falso "ora X%"', () => {
    ctx.tipoPrep = 'unguento';
    ctx.liberaRighe = [R('Tretinoina', '', 'g', true), R('Vaselina filante bianca', '0.5')];
    ctx.concRichiestaChanged('0.025');
    expect(nota()).not.toMatch(/ ora /);
    expect(nota()).toMatch(/fissata/);
  });
});
