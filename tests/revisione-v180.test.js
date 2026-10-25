// Revisione mirata della v179 — meno stato invece di più controlli:
//  · cambiare forma toglie la concentrazione voluta;
//  · cambiare unità converte e basta, non ricalcola mai il PA;
//  · "Applica" ricontrolla tutto al momento del clic.
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

describe('#1 cambiare forma toglie la concentrazione voluta', () => {
  it('setTipo: tolta, con la nota', () => {
    ctx.tipoPrep = 'unguento';
    ctx.liberaRighe = [R('Acido salicilico', '2', 'g', true), R('Vaselina filante bianca', '98')];
    ctx.concRichiestaChanged('2');
    ctx.setTipo('capsule', byId('btn-finto'));
    expect(ctx.concRichiesta).toBe(null);
    ctx.setTipo('unguento', byId('btn-finto'));
    expect(byId('libera-conc-note').textContent).toMatch(/forma/);
  });

  it('unguento 2% → capsule, PA su Clobazam 4 mg → di nuovo unguento: Clobazam resta 4 mg', async () => {
    ctx.tipoPrep = 'unguento';
    ctx.liberaRighe = [R('Vaselina filante bianca', '98'), R('Acido salicilico', '2')];
    ctx.concRichiestaChanged('2');
    ctx.tipoPrep = 'capsule'; // anche senza passare da setTipo
    ctx.liberaRighe = [R('Clobazam', '4', 'mg'), R('Lattosio monoidrato', '200', 'mg')];
    await ctx.liberaSetPa(0);
    ctx.tipoPrep = 'unguento';
    ctx.liberaRighe[1].qty = '300';
    await ctx.liberaQtyChanged(1);
    ctx.liberaCambiaUnita(1, 'g');
    expect(riga('Clobazam').qty).toBe('4');
    expect(riga('Clobazam').unit).toBe('mg');
  });
});

describe('#3 cambiare unità non ricalcola mai il PA', () => {
  it('p/v 2%: Glicerolo da g a mg, il Minoxidil non cambia e la nota dice com\'è ora', () => {
    ctx.tipoPrep = 'soluzione';
    ctx.liberaRighe = [R('Minoxidil', '', 'g', true), R('Glicerolo', '50'), R('Acqua purificata', '50', 'ml')];
    ctx.setConcMode('pv');
    ctx.concRichiestaChanged('2');
    const pa = riga('Minoxidil').qty;
    ctx.liberaCambiaUnita(1, 'mg');
    expect(riga('Glicerolo').qty).toBe('50000');
    expect(riga('Minoxidil').qty).toBe(pa);
    expect(byId('libera-conc-note').textContent).toMatch(/ora/);
  });
});

describe('#2 #5 "Applica" ricontrolla al momento del clic', () => {
  let rispondi;
  beforeEach(() => {
    ctx.tipoPrep = 'unguento';
    ctx.liberaRighe = [R('Vaselina filante bianca', '98'), R('Acido salicilico', '3')];
    ctx.concRichiestaChanged('2');
    ctx.showModal = (o) => { modalCalls.push(o); return new Promise(res => { rispondi = res; }); };
  });

  it('riga rinominata a finestra aperta: non applica e lo dice', async () => {
    const p = ctx.liberaSetPa(1);
    ctx.liberaRighe[1].nome = 'Resorcina';
    rispondi(true);
    await p;
    expect(ctx.liberaRighe[1].isPa).toBe(false);
    expect(ctx.liberaRighe[1].qty).toBe('3');
    expect(byId('libera-conc-note').textContent).toMatch(/non applicat/);
  });

  it('forma cambiata a finestra aperta: non applica', async () => {
    const p = ctx.liberaSetPa(1);
    ctx.tipoPrep = 'capsule';
    rispondi(true);
    await p;
    expect(ctx.liberaRighe[1].isPa).toBe(false);
    expect(ctx.liberaRighe[1].qty).toBe('3');
  });

  it('concentrazione cambiata a finestra aperta: non applica', async () => {
    const p = ctx.liberaSetPa(1);
    ctx.concRichiestaChanged('4');
    rispondi(true);
    await p;
    expect(ctx.liberaRighe[1].isPa).toBe(false);
  });
});

describe('#4 nessun errore non gestito', () => {
  it('se la finestra fallisce, la promessa di liberaSetPa non viene rifiutata', async () => {
    ctx.tipoPrep = 'unguento';
    ctx.liberaRighe = [R('Vaselina filante bianca', '98'), R('Acido salicilico', '3')];
    ctx.concRichiestaChanged('2');
    ctx.showModal = () => Promise.reject(new Error('finestra'));
    await expect(ctx.liberaSetPa(1)).resolves.toBeUndefined();
  });
});

describe('#6 #7 indicatore della nota p/v', () => {
  beforeEach(() => {
    ctx.tipoPrep = 'soluzione';
    ctx.liberaRighe = [R('Minoxidil', '2', 'g', true), R('Estratto secco di ortica', '98')];
    ctx.concRichiestaChanged('2');
    ctx.setConcMode('pv');
  });

  it('nuova concentrazione, ricetta azzerata o scheda riaperta: indicatore azzerato', () => {
    expect(ctx.concRichiestaToltaPv).toBe(true);
    ctx.concRichiestaChanged('3');
    expect(ctx.concRichiestaToltaPv).toBe(false);
    ctx.setConcMode('pp'); ctx.concRichiestaChanged('2'); ctx.setConcMode('pv');
    ctx.azzeraRicetta();
    expect(ctx.concRichiestaToltaPv).toBe(false);
  });

  it('p/v richiesto di nuovo, sempre senza liquidi: la nota resta', () => {
    ctx.setConcMode('pv', false);
    expect(byId('libera-conc-note').textContent).toMatch(/senza liquidi/);
  });
});

describe('#8 la riga delle capsule vuote ha i pezzi dove li hanno le altre', () => {
  it('grams = numero di capsule', () => {
    const out = app.run({ prep: 'capsule', tariff: 'capsule', scheda: 'capsule' },
      [R('Melatonina', '3', 'mg', true)], { 'caps-ncaps-lib': '120', 'caps-vuote-prezzo': '0.045' });
    expect(out.extra.find(r => r.isCapsule).grams).toBe(120);
  });
});
