// Revisione mirata della v178, più controlli su Scheda e Tariffazione per ogni
// forma: le correzioni sulla Preparazione non devono cambiare ciò che si stampa.
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

describe('#1 Scheda e Tariffazione per forma', () => {
  it('capsule: la riga delle capsule vuote dice 120 pz (non 0 pz), Tariffazione = Scheda', () => {
    const out = app.run({ prep: 'capsule', tariff: 'capsule', scheda: 'capsule' },
      [R('Melatonina', '3', 'mg', true), R('Lattosio monoidrato', '200', 'mg')],
      { 'caps-ncaps-lib': '120', 'caps-vuote-nome': 'Capsule gelatina dura taglia 0', 'caps-vuote-prezzo': '0.045' });
    const cps = out.extra.find(r => r.isCapsule);
    expect(ctx.formatMateriaRow(cps).name).toContain('120 pz');
    expect(byId('scheda-preview').innerHTML).not.toMatch(/>\s*0 pz|— 0 pz/);
    expect(out.sch).toBe(out.tar);
  });

  it('cartine: Tariffazione = Scheda, nessuna riga "0 pz"', () => {
    const out = app.run({ prep: 'cartine', tariff: 'cartine', scheda: 'cartine' },
      [R('Sodio bicarbonato', '3', 'g', true)], { 'cart-ncart-lib': '30' });
    expect(byId('scheda-preview').innerHTML).not.toMatch(/— 0 pz/);
    expect(out.sch).toBe(out.tar);
  });

  it('unguento con barattolo: 1 pz, costo del barattolo incluso, Tariffazione = Scheda', () => {
    const out = app.run({ prep: 'unguento', tariff: 'semisolida', scheda: 'unguento' },
      [R('Acido salicilico', '2', 'g', true), R('Vaselina filante bianca', '98'), { ...R('Barattolo 100 g', '1', 'pz'), prezzoAcq: 1.55 }], {});
    const bar = out.extra.find(r => r.nome === 'Barattolo 100 g');
    expect(ctx.formatMateriaRow(bar).name).toContain('1 pz');
    expect(bar.costo).toBeCloseTo(1.55, 6);
    expect(out.sch).toBe(out.tar);
  });

  it('soluzione (esempio Minoxidil): Tariffazione = Scheda', () => {
    const out = app.run({ prep: 'soluzione', tariff: 'liquida', scheda: 'soluzione' },
      [R('Minoxidil', '5', 'g', true), R('Etanolo 96°', '50'), R('Glicole propilenico', '35'), R('Acqua purificata', '10')], {});
    expect(out.tar).toBeGreaterThan(0);
    expect(out.sch).toBe(out.tar);
  });
});

describe('#2 capsule e cartine: premere PA non propone mai di riscrivere la dose', () => {
  it('concentrazione rimasta da un unguento, poi capsule: PA su Clobazam 4 mg non chiede e non cambia', async () => {
    ctx.tipoPrep = 'unguento';
    ctx.liberaRighe = [R('Vaselina filante bianca', '98'), R('Acido salicilico', '2')];
    ctx.concRichiestaChanged('2');
    ctx.tipoPrep = 'capsule';
    ctx.liberaRighe = [R('Clobazam', '4', 'mg'), R('Lattosio monoidrato', '200', 'mg')];
    await ctx.liberaSetPa(0);
    expect(modalCalls.length).toBe(0);
    expect(riga('Clobazam').qty).toBe('4');
  });
});

describe('#3 "Applica" usa i dati del momento', () => {
  let rispondi;
  beforeEach(() => {
    ctx.tipoPrep = 'unguento';
    ctx.liberaRighe = [R('Vaselina filante bianca', '98'), R('Acido salicilico', '3')];
    ctx.concRichiestaChanged('2');
    ctx.showModal = (o) => { modalCalls.push(o); return new Promise(res => { rispondi = res; }); };
  });

  it('Vaselina cambiata a finestra aperta: l\'acido è calcolato su 196 g, non su 98', async () => {
    const p = ctx.liberaSetPa(1);
    ctx.liberaRighe[0].qty = '196';
    rispondi(true);
    await p;
    expect(qty('Acido salicilico')).toBeCloseTo(4, 3);
    expect(conc()).toBeCloseTo(2, 3);
  });

  it('riga tolta a finestra aperta: nessuna scrittura, nessun PA', async () => {
    const p = ctx.liberaSetPa(1);
    ctx.liberaRighe.splice(1, 1);
    rispondi(true);
    await p;
    expect(ctx.liberaRighe.some(r => r.isPa)).toBe(false);
    expect(riga('Vaselina filante bianca').qty).toBe('98');
  });
});

describe('#4 "Applica" su una riga senza unità', () => {
  it('la quantità calcolata in grammi porta anche l\'unità g', async () => {
    ctx.tipoPrep = 'unguento';
    ctx.liberaRighe = [R('Vaselina filante bianca', '98'), { ...R('Acido salicilico', '3'), unit: '' }];
    ctx.concRichiestaChanged('2');
    await ctx.liberaSetPa(1);
    expect(riga('Acido salicilico').unit).toBe('g');
  });
});

describe('#9 #10 bottone PA sempre utilizzabile e sempre una promessa', () => {
  it('se la finestra fallisce, PA non resta bloccato', async () => {
    ctx.tipoPrep = 'unguento';
    ctx.liberaRighe = [R('Vaselina filante bianca', '98'), R('Acido salicilico', '3')];
    ctx.concRichiestaChanged('2');
    ctx.showModal = () => Promise.reject(new Error('finestra chiusa male'));
    await ctx.liberaSetPa(1).catch(() => {});
    ctx.showModal = async (o) => { modalCalls.push(o); return true; };
    await ctx.liberaSetPa(1);
    expect(modalCalls.length).toBe(1);
  });

  it('anche senza domanda restituisce una promessa', () => {
    ctx.liberaRighe = [R('Minoxidil', '5'), R('Etanolo 96°', '95')];
    const p = ctx.liberaSetPa(0);
    expect(typeof (p && p.then)).toBe('function');
  });
});

describe('#8 nota p/v', () => {
  it('tornati in p/p e poi di nuovo in p/v, la vecchia nota non ricompare', () => {
    ctx.tipoPrep = 'soluzione';
    ctx.liberaRighe = [R('Minoxidil', '2', 'g', true), R('Estratto secco di ortica', '98')];
    ctx.concRichiestaChanged('2');
    ctx.setConcMode('pv');
    ctx.setConcMode('pp');
    ctx.setConcMode('pv');
    expect(byId('libera-conc-note').textContent).not.toMatch(/tolta/);
  });
});

describe('#6 #7 sostanze in mg: nessun volume (come prima della v178)', () => {
  it('Glicerolo 5000 mg non aggiunge volume', () => {
    expect(ctx.volMlRiga(R('Glicerolo', '5000', 'mg'))).toBe(0);
  });
});
