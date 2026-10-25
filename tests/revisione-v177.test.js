// Quarta revisione (code review su v171→v176): i 5 punti corretti in v177.
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

describe('#1 premere PA con la concentrazione già scritta chiede prima di riscrivere', () => {
  beforeEach(() => {
    ctx.tipoPrep = 'unguento';
    ctx.liberaRighe = [R('Vaselina filante bianca', '98'), R('Acido salicilico', '3')];
    ctx.concRichiestaChanged('2');
  });

  it('PA sulla Vaselina per sbaglio, Esc: la Vaselina resta 98 g', async () => {
    risposta = null;
    await ctx.liberaSetPa(0);
    expect(modalCalls.length).toBe(1);
    expect(riga('Vaselina filante bianca').qty).toBe('98');
  });

  it('"Lascia" sulla Vaselina, poi PA spostato sull\'acido: nessuna quantità rovinata', async () => {
    risposta = false;
    await ctx.liberaSetPa(0);
    risposta = true;
    await ctx.liberaSetPa(1);
    expect(riga('Vaselina filante bianca').qty).toBe('98');
    expect(riga('Acido salicilico').qty).toBe('3');
  });

  it('"Applica" sull\'acido salicilico: 3 g → 2 g', async () => {
    risposta = true;
    await ctx.liberaSetPa(1);
    expect(modalCalls.length).toBe(1);
    expect(qty('Acido salicilico')).toBeCloseTo(2, 3);
    expect(conc()).toBeCloseTo(2, 3);
  });

  it('PA ancora senza quantità: si calcola senza chiedere (non riscrive nulla)', async () => {
    ctx.liberaRighe[1].qty = '';
    await ctx.liberaSetPa(1);
    expect(modalCalls.length).toBe(0);
    expect(qty('Acido salicilico')).toBeCloseTo(2, 3);
  });
});

describe('#5 riga a pezzi in Scheda/Tariffazione', () => {
  it('"Barattolo 1 pz" si legge in pezzi, non "1,00 g", e il suo costo resta', () => {
    ctx.tipoPrep = 'unguento';
    ctx.liberaRighe = [R('Acido salicilico', '2', 'g', true), R('Vaselina filante bianca', '98'),
      { ...R('Barattolo 100 g', '1', 'pz'), prezzoAcq: 1.55 }];
    ctx.calcPrep();
    const extra = ctx.liberaRigheExtra.find(r => r.nome === 'Barattolo 100 g');
    expect(extra.costo).toBeCloseTo(1.55, 6);
    const testo = ctx.formatMateriaRow(extra).name;
    expect(testo).toContain('1 pz');
    expect(testo).not.toContain(' g ×');
  });
});

describe('#2 Quantità totale in ml: righe in % non si moltiplicano', () => {
  it('sospensione: "Conservante 0,1 %" resta 0,1 % portando il volume a 200 ml', () => {
    ctx.tipoPrep = 'sospensione';
    byId('totale-prep').value = '100';
    ctx.liberaRighe = [R('Minoxidil', '5', 'g', true), R('Acqua purificata', '100', 'ml'), R('Conservante', '0.1', '%')];
    byId('vol-soluzione').value = '200';
    ctx.volSoluzioneChanged();
    expect(riga('Conservante').qty).toBe('0.1');
    expect(qty('Acqua purificata')).toBeCloseTo(200, 3);
  });
});

describe('#6 p/v senza liquidi', () => {
  it('la concentrazione voluta tolta passando a p/v lo dice nella nota', () => {
    ctx.tipoPrep = 'soluzione';
    ctx.liberaRighe = [R('Minoxidil', '2', 'g', true), R('Estratto secco di ortica', '98')];
    ctx.concRichiestaChanged('2');
    ctx.setConcMode('pv');
    expect(ctx.concRichiesta).toBe(null);
    expect(byId('libera-conc-note').textContent).toMatch(/senza liquidi/);
  });
});

describe('#4 p/v con il PA in mg e densità nota', () => {
  it('la % calcolata è quella voluta', () => {
    ctx.tipoPrep = 'soluzione';
    ctx.liberaRighe = [R('Glicerolo', '5000', 'mg', true), R('Acqua purificata', '100', 'ml')];
    ctx.setConcMode('pv');
    ctx.concRichiestaChanged('5');
    expect(conc()).toBeCloseTo(5, 3);
  });
});
