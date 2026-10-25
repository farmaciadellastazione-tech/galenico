// Revisione v172–v173 (code review prima del merge): un test per ogni difetto
// trovato. Numeri come nel rapporto di revisione.
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

describe('#1 cancellare il PA', () => {
  it('non riscrive il PA successivo (Finasteride resta 0,1 g) e disattiva la concentrazione voluta', () => {
    ctx.liberaRighe = [R('Minoxidil', '5', 'g', true), R('Finasteride', '0.1'), R('Etanolo 96°', '50'), R('Glicole propilenico', '45')];
    ctx.concRichiestaChanged('5');
    ctx.liberaRemoveRiga(0);
    expect(riga('Finasteride').qty).toBe('0.1');
    expect(ctx.concRichiesta).toBe(null);
  });

  it('cancellare un eccipiente invece ricalcola ancora il PA', () => {
    ctx.liberaRighe = [R('Minoxidil', '5', 'g', true), R('Etanolo 96°', '50'), R('Glicole propilenico', '45')];
    ctx.concRichiestaChanged('5');
    ctx.liberaRemoveRiga(2);
    expect(conc()).toBeCloseTo(5, 3);
  });
});

describe('#5 ricetta importata', () => {
  const imp = (conc, paQty) => ctx.ricettaApplicaJson({ tipoPrep: 'soluzione', concMode: 'pp', concentrazione: conc,
    ingredienti: [ { nome: 'Minoxidil', qty: paQty, unit: 'g', isPa: true }, { nome: 'Etanolo 96°', qty: 97, unit: 'g' } ] });

  it('quantità della ricetta che non tornano con la concentrazione: non si toccano, avviso', () => {
    imp(5, 3);
    expect(riga('Minoxidil').qty).toBe('3');
    expect(ctx.concRichiesta).toBe(null);
    expect(byId('ricetta-status').textContent).toMatch(/verifica/i);
    expect(byId('ricetta-status').textContent).toContain('5');
    expect(byId('ricetta-status').textContent).toContain('3,00');
  });

  it('quantità coerenti: restano identiche e la concentrazione è fissata', () => {
    ctx.ricettaApplicaJson({ tipoPrep: 'soluzione', concMode: 'pp', concentrazione: 5,
      ingredienti: [ { nome: 'Minoxidil', qty: 5, unit: 'g', isPa: true }, { nome: 'Etanolo 96°', qty: 95, unit: 'g' } ] });
    expect(riga('Minoxidil').qty).toBe('5');
    expect(ctx.concRichiesta).toBe(5);
  });

  it('PA senza quantità nella ricetta: si calcola dalla concentrazione', () => {
    imp(3, '');
    expect(qty('Minoxidil')).toBeCloseTo(3, 3);
    expect(conc()).toBeCloseTo(3, 3);
  });
});

describe('#2 #9 aggiornare le righe senza ridisegnarle', () => {
  // DOM finto delle righe: campi quantità, note di conversione e nota PA.
  function stubRighe() {
    const cont = byId('libera-righe');
    const n = ctx.liberaRighe.length;
    const fake = { qty: [], conv: [], 'pa-nota': [] };
    for (let i = 0; i < n; i++) {
      fake.qty.push({ value: ctx.liberaRighe[i].qty });
      fake.conv.push({ textContent: '' });
      fake['pa-nota'].push({ textContent: '' });
    }
    cont.querySelectorAll = (sel) => {
      const m = sel.match(/^\[data-(qty|conv|pa-nota)(?:="(\d+)")?\]$/);
      if (!m) return [];
      return m[2] == null ? fake[m[1]] : [fake[m[1]][+m[2]]];
    };
    cont.innerHTML = 'SENTINELLA';
    return fake;
  }

  beforeEach(() => {
    ctx.liberaRighe = [R('Minoxidil', '5', 'g', true), R('Etanolo 96°', '50'), R('Glicole propilenico', '45')];
    ctx.concRichiestaChanged('5');
  });

  it('cambiare una quantità non ridisegna le righe (il clic su ✕ non si perde): aggiorna solo i valori', async () => {
    const fake = stubRighe();
    ctx.liberaRighe[1].qty = '60';
    await ctx.liberaQtyChanged(1);
    expect(byId('libera-righe').innerHTML).toBe('SENTINELLA');
    expect(parseFloat(fake.qty[0].value)).toBeCloseTo(5 * 105 / 95, 3);
  });

  it('la nota "calcolato per il X%" si aggiorna insieme ai valori', () => {
    const fake = stubRighe();
    ctx.concRichiestaChanged('4');
    expect(byId('libera-righe').innerHTML).toBe('SENTINELLA');
    expect(fake['pa-nota'][0].textContent).toContain('calcolato per il 4%');
    expect(fake['pa-nota'][1].textContent).toBe('');
  });

  it('cambiare unità invece ridisegna (cambia la struttura della riga)', () => {
    stubRighe();
    ctx.liberaCambiaUnita(1, 'ml');
    expect(byId('libera-righe').innerHTML).not.toBe('SENTINELLA');
  });
});

describe('#7 unità della Quantità totale', () => {
  it('unguento forza g; tornando a soluzione torna ml', () => {
    ctx.tipoPrep = 'unguento'; ctx.liberaRenderRighe();
    expect(byId('vol-soluzione-unit').value).toBe('g');
    expect(byId('vol-soluzione-unit').disabled).toBe(true);
    ctx.tipoPrep = 'soluzione'; ctx.liberaRenderRighe();
    expect(byId('vol-soluzione-unit').value).toBe('ml');
    expect(byId('vol-soluzione-unit').disabled).toBe(false);
  });

  it('se per i liquidi avevi scelto g, tornando alla soluzione resta g', () => {
    ctx.tipoPrep = 'soluzione'; byId('vol-soluzione-unit').value = 'g'; ctx.liberaRenderRighe();
    ctx.tipoPrep = 'unguento'; ctx.liberaRenderRighe();
    ctx.tipoPrep = 'soluzione'; ctx.liberaRenderRighe();
    expect(byId('vol-soluzione-unit').value).toBe('g');
  });

  it('si salva nello snapshot e "nuova ricetta" la riporta a ml', () => {
    ctx.liberaRighe = [R('Minoxidil', '5', 'g', true), R('Etanolo 96°', '95')];
    byId('vol-soluzione-unit').value = 'g';
    const snap = JSON.parse(JSON.stringify(ctx.prepSnap()));
    expect(snap.inputs['vol-soluzione-unit']).toBe('g');
    ctx.azzeraRicetta();
    expect(byId('vol-soluzione-unit').value).toBe('ml');
    ctx.prepRestore(snap);
    expect(byId('vol-soluzione-unit').value).toBe('g');
  });
});

describe('#4 p/p o p/v della concentrazione voluta', () => {
  beforeEach(() => {
    ctx.tipoPrep = 'soluzione';
    ctx.liberaRighe = [R('Minoxidil', '5', 'g', true), R('Etanolo 96°', '50', 'ml'), R('Acqua purificata', '45', 'ml')];
  });

  it('5% p/v su soluzione, poi la forma diventa unguento: il PA non viene riscritto come 5% p/p', async () => {
    ctx.setConcMode('pv');
    ctx.concRichiestaChanged('5');
    const paPrima = riga('Minoxidil').qty;
    ctx.tipoPrep = 'unguento';
    ctx.liberaRighe[2].qty = '60';
    await ctx.liberaQtyChanged(2);
    expect(riga('Minoxidil').qty).toBe(paPrima);
  });

  it('snapshot p/p riaperto in un browser rimasto su p/v: torna p/p e mantiene il 5% p/p', () => {
    ctx.concRichiestaChanged('5');
    const snap = JSON.parse(JSON.stringify(ctx.prepSnap()));
    ctx.azzeraRicetta();
    ctx.concMode = 'pv';
    ctx.prepRestore(snap);
    expect(ctx.concMode).toBe('pp');
    byId('grado-alc').value = '30';
    ctx.gradoAlcChanged();
    expect(conc()).toBeCloseTo(5, 3);
  });
});

describe('#8 Quantità totale in g senza liquidi', () => {
  it('solo il PA + grado impostato + 100 g: crea etanolo e acqua, 100 g al 5%', () => {
    ctx.liberaRighe = [R('Minoxidil', '', 'g', true)];
    ctx.concRichiestaChanged('5');
    byId('grado-alc').value = '40';
    byId('vol-soluzione-unit').value = 'g';
    byId('vol-soluzione').value = '100';
    ctx.volSoluzioneChanged();
    expect(riga('Etanolo 96°')).toBeTruthy();
    expect(riga('Acqua purificata')).toBeTruthy();
    expect(totG()).toBeCloseTo(100, 2);
    expect(conc()).toBeCloseTo(5, 3);
  });

  it('solo il PA senza grado: il PA non viene portato a 100 g', () => {
    ctx.liberaRighe = [R('Minoxidil', '5', 'g', true)];
    byId('vol-soluzione-unit').value = 'g';
    byId('vol-soluzione').value = '100';
    ctx.volSoluzioneChanged();
    expect(riga('Minoxidil').qty).toBe('5');
  });
});

describe('#6 stesso PA per calcolo e ricalcolo', () => {
  it('PA non marcato ancora senza quantità: la concentrazione non si misura su un\'altra sostanza', () => {
    ctx.tipoPrep = 'unguento';
    ctx.liberaRighe = [R('Acido salicilico', ''), R('Resorcina', '2'), R('Vaselina filante bianca', '98')];
    expect(conc()).toBe(0);
  });

  it('con la concentrazione voluta il PA calcolato è quello su cui si misura la %', async () => {
    ctx.tipoPrep = 'unguento';
    ctx.liberaRighe = [R('Acido salicilico', ''), R('Resorcina', '2'), R('Vaselina filante bianca', '98')];
    ctx.concRichiestaChanged('2');
    expect(qty('Acido salicilico')).toBeCloseTo(2 * 100 / 98, 3);
    expect(conc()).toBeCloseTo(2, 3);
  });
});

describe('#3 cambio unità in p/v di una sostanza senza densità', () => {
  it('la concentrazione p/v resta quella voluta', () => {
    ctx.tipoPrep = 'soluzione';
    ctx.liberaRighe = [R('Minoxidil', '2', 'g', true), R('Estratto fluido di ortica', '50'), R('Etanolo 96°', '50', 'ml')];
    ctx.setConcMode('pv');
    ctx.concRichiestaChanged('2');
    ctx.liberaCambiaUnita(1, 'ml');
    expect(conc()).toBeCloseTo(2, 3);
  });
});
