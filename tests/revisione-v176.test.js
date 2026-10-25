// Terza revisione (code review su v171→v175): un test per ogni difetto.
// Scelta dell'utente sul #1: il ricalcolo automatico tocca SOLO la riga con il
// bottone PA acceso, mai una riga indovinata (che può essere un eccipiente).
import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from './_app-vm.js';

let app, ctx, byId, modalCalls, risposta;
const conc = () => ctx.liberaCalcTotale().conc;
const totG = () => ctx.liberaCalcTotale().totG;
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

describe('#1 solo il PA marcato viene ricalcolato', () => {
  beforeEach(() => {
    ctx.tipoPrep = 'unguento';
    ctx.liberaRighe = [R('Vaselina filante bianca', '98'), R('Acido salicilico', '2')];
  });

  it('nessuna riga marcata: la Vaselina non viene toccata, e la nota dice di premere PA', async () => {
    ctx.concRichiestaChanged('2');
    ctx.liberaRighe[1].qty = '3';
    await ctx.liberaQtyChanged(1);
    byId('vol-soluzione').value = '50';
    ctx.volSoluzioneChanged();
    expect(qty('Vaselina filante bianca')).toBeCloseTo(98 * 50 / 101, 3); // solo scalata col totale
    expect(byId('libera-conc-note').textContent).toMatch(/premi PA/i);
  });

  it('premuto PA sull\'acido salicilico, è lui a seguire la concentrazione', async () => {
    ctx.concRichiestaChanged('2');
    ctx.liberaSetPa(1);
    ctx.liberaRighe[0].qty = '196';
    await ctx.liberaQtyChanged(0);
    expect(qty('Acido salicilico')).toBeCloseTo(4, 3);
    expect(qty('Vaselina filante bianca')).toBe(196);
    expect(conc()).toBeCloseTo(2, 3);
  });

  // v177: liberaSetPa chiede prima di riscrivere una quantità (risposta qui: sì) → async.
  it('premere PA applica subito la concentrazione voluta (la nota "fissata" non mente)', async () => {
    ctx.liberaRighe[1].qty = '3';
    ctx.concRichiestaChanged('2');
    await ctx.liberaSetPa(1);
    expect(qty('Acido salicilico')).toBeCloseTo(2, 3);
    expect(conc()).toBeCloseTo(2, 3);
    expect(byId('libera-conc-note').textContent).toMatch(/fissata/);
  });

  it('polvere [Lattosio 95, PA 5] senza marcatura: il lattosio resta 95', () => {
    ctx.tipoPrep = 'polvere';
    ctx.liberaRighe = [R('Lattosio monoidrato', '95'), R('Melatonina', '5')];
    ctx.concRichiestaChanged('5');
    expect(riga('Lattosio monoidrato').qty).toBe('95');
  });
});

describe('#2 snapshot riaperto e PA rinominato', () => {
  it('rinominare il PA dopo aver riaperto la scheda non fa riscrivere la nuova sostanza', () => {
    ctx.liberaRighe = [R('Minoxidil', '5', 'g', true), R('Etanolo 96°', '50'), R('Glicole propilenico', '45')];
    ctx.concRichiestaChanged('5');
    const snap = JSON.parse(JSON.stringify(ctx.prepSnap()));
    ctx.azzeraRicetta();
    ctx.prepRestore(snap);
    ctx.liberaNomeInput(0, 'Finasteride');
    byId('vol-soluzione-unit').value = 'g';
    byId('vol-soluzione').value = '200';
    ctx.volSoluzioneChanged();
    expect(conc()).toBeCloseTo(5, 3); // scalata in proporzione, non riscritta al 5% di qualcos'altro
    expect(ctx.concRichiesta).toBe(null);
  });
});

describe('#3 p/v con PA in ml senza densità', () => {
  it('il volume del PA conta: la % calcolata è quella voluta', () => {
    ctx.tipoPrep = 'soluzione';
    ctx.liberaRighe = [R('Estratto fluido di ortica', '5', 'ml', true), R('Acqua purificata', '100', 'ml')];
    ctx.setConcMode('pv');
    ctx.concRichiestaChanged('5');
    expect(conc()).toBeCloseTo(5, 3);
  });
});

describe('#4 import di capsule', () => {
  it('"concentrazione" di una capsula (mg/cps) non diventa una % voluta', () => {
    ctx.ricettaApplicaJson({ tipoPrep: 'capsule', concentrazione: 25,
      ingredienti: [ { nome: 'Melatonina', qty: 25, unit: 'mg', isPa: true }, { nome: 'Lattosio monoidrato', qty: 200, unit: 'mg' } ] });
    expect(ctx.concRichiesta).toBe(null);
  });
});

describe('#5 finestra chiusa senza scegliere (Esc, clic fuori)', () => {
  it('non cambia la concentrazione voluta e rimette il PA al suo valore', async () => {
    ctx.liberaRighe = [R('Minoxidil', '5', 'g', true), R('Etanolo 96°', '50'), R('Glicole propilenico', '45')];
    ctx.concRichiestaChanged('5');
    risposta = null; // showModal chiusa senza scelta
    ctx.liberaRighe[0].qty = '6';
    await ctx.liberaQtyChanged(0);
    expect(modalCalls.length).toBe(1);
    expect(ctx.concRichiesta).toBe(5);
    expect(qty('Minoxidil')).toBeCloseTo(5, 3);
  });
});

describe('#6 leggere la formula non cambia lo stato', () => {
  it('liberaCalcTotale (Tariffazione, Scheda) non toglie la concentrazione voluta', () => {
    ctx.liberaRighe = [R('Minoxidil', '5', 'g', true), R('Etanolo 96°', '95')];
    ctx.concRichiestaChanged('5');
    ctx.liberaRighe[0].nome = 'Altro'; // cambiato senza passare dalle funzioni dell'interfaccia
    ctx.liberaCalcTotale(); ctx.calcTariff(); ctx.aggiornaScheda();
    expect(ctx.concRichiesta).toBe(5);
    expect(ctx.concRichiestaAttiva()).toBe(false); // ma non si applica a un'altra sostanza
  });
});

describe('#7 righe in % non si moltiplicano', () => {
  it('Quantità totale in g: la riga "Mentolo 1 %" resta 1 %', () => {
    ctx.tipoPrep = 'unguento';
    byId('totale-prep').value = '100';
    ctx.liberaRighe = [R('Acido salicilico', '2', 'g', true), R('Vaselina filante bianca', '97'), R('Mentolo', '1', '%')];
    expect(totG()).toBeCloseTo(100, 6);
    byId('vol-soluzione').value = '200';
    ctx.volSoluzioneChanged();
    expect(riga('Mentolo').qty).toBe('1');
    expect(totG()).toBeCloseTo(200, 3);
  });
});

describe('#8 la nota "fissata" solo se si può mantenere', () => {
  it('PA passato in %: niente "fissata"', () => {
    ctx.liberaRighe = [R('Minoxidil', '5', 'g', true), R('Etanolo 96°', '95')];
    ctx.concRichiestaChanged('5');
    ctx.liberaCambiaUnita(0, '%');
    expect(byId('libera-conc-note').textContent).not.toMatch(/fissata/);
  });
});

describe('#9 unità della Quantità totale dopo aver riaperto un unguento', () => {
  it('riaperto un unguento e passati alla soluzione, torna ml', () => {
    ctx.tipoPrep = 'unguento';
    ctx.liberaRighe = [R('Acido salicilico', '2', 'g', true), R('Vaselina filante bianca', '98')];
    ctx.liberaRenderRighe();
    const snap = JSON.parse(JSON.stringify(ctx.prepSnap()));
    ctx.azzeraRicetta();
    byId('vol-soluzione-unit').disabled = false;
    ctx.prepRestore(snap);
    ctx.tipoPrep = 'soluzione'; ctx.liberaRenderRighe();
    expect(byId('vol-soluzione-unit').value).toBe('ml');
  });
});

describe('#10 una sola formula per la densità idroalcolica', () => {
  it('densitaIdroalcolica(40) = 1 − 0,211 × 0,40', () => {
    expect(ctx.densitaIdroalcolica(40)).toBeCloseTo(1 - 0.211 * 0.4, 10);
  });
});
