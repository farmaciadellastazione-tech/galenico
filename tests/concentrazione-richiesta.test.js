// Concentrazione richiesta (v172): partendo dall'esempio Minoxidil 5% p/p della
// demo, cambiare unità (g ↔ ml), grado alcolico o volume NON deve spostare la
// concentrazione reale (g PA / g totali, calcolata dal motore, non forzata).
// Una quantità modificata a mano chiede: mantenere la concentrazione
// (ricalcola le altre quantità) o tenere le quantità (cambia la concentrazione).
import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from './_app-vm.js';

let app, ctx, byId, modalCalls;
const conc = () => ctx.liberaCalcTotale().conc;
const riga = (nome) => ctx.liberaRighe.find(r => r.nome === nome);
const parseEuros = (s) => { const out=[]; const r=/€\s*([0-9]+(?:[.,][0-9]+)?)/g; let m; while((m=r.exec(s))) out.push(parseFloat(m[1].replace('.','').replace(',','.'))); return out; };

function esempio() {
  ctx.caricaEsempioDemo();
}
function rispondi(mantieni) {
  modalCalls = [];
  ctx.showModal = async (opts) => { modalCalls.push(opts); return mantieni; };
}

beforeEach(() => {
  app = buildApp(); ctx = app.ctx; byId = app.byId;
  app.setInv([]);
  ctx.concMode = 'pv'; // un browser che aveva lasciato p/v: l'esempio è p/p
  rispondi(true);
  esempio();
});

describe('Esempio Minoxidil 5% p/p', () => {
  it('parte al 5% p/p con concentrazione richiesta 5', () => {
    expect(ctx.concMode).toBe('pp');
    expect(ctx.concRichiesta).toBe(5);
    expect(conc()).toBeCloseTo(5, 3);
  });

  it('etanolo g → ml converte la quantità con la densità: la concentrazione resta 5%', () => {
    const i = ctx.liberaRighe.indexOf(riga('Etanolo 96°'));
    ctx.liberaCambiaUnita(i, 'ml');
    expect(riga('Etanolo 96°').unit).toBe('ml');
    expect(parseFloat(riga('Etanolo 96°').qty)).toBeCloseTo(50 / 0.807, 3);
    expect(conc()).toBeCloseTo(5, 3);
  });

  it('tutti i liquidi g → ml → g: tornano esattamente i valori di partenza', () => {
    const prima = ctx.liberaRighe.map(r => r.qty + r.unit);
    [1, 2, 3].forEach(i => ctx.liberaCambiaUnita(i, 'ml'));
    expect(conc()).toBeCloseTo(5, 3);
    [1, 2, 3].forEach(i => ctx.liberaCambiaUnita(i, 'g'));
    expect(ctx.liberaRighe.map(r => r.qty + r.unit)).toEqual(prima);
    expect(conc()).toBeCloseTo(5, 3);
  });

  it('grado alcolico 40°: etanolo e acqua cambiano, la concentrazione resta 5%', () => {
    byId('grado-alc').value = '40';
    ctx.gradoAlcChanged();
    expect(riga('Etanolo 96°').unit).toBe('ml');
    expect(conc()).toBeCloseTo(5, 3);
  });

  it('volume soluzione 200 ml: scala tutto, la concentrazione resta 5%', () => {
    byId('vol-soluzione').value = '200';
    ctx.volSoluzioneChanged();
    expect(ctx.liberaSommaVolumeLiquidi()).toBeCloseTo(200, 1);
    expect(conc()).toBeCloseTo(5, 3);
  });

  it('combinazione unità → grado → volume: sempre 5%', () => {
    [1, 2, 3].forEach(i => ctx.liberaCambiaUnita(i, 'ml'));
    byId('grado-alc').value = '30';
    ctx.gradoAlcChanged();
    byId('vol-soluzione').value = '150';
    ctx.volSoluzioneChanged();
    expect(conc()).toBeCloseTo(5, 3);
  });

  it('Tariffazione e Scheda danno lo stesso totale dopo le modifiche', () => {
    byId('grado-alc').value = '40';
    ctx.gradoAlcChanged();
    ctx.calcTariff(); ctx.aggiornaScheda();
    const h = byId('tariff-totale').innerHTML;
    const tar = parseEuros(h.slice(Math.max(0, h.indexOf('Prezzo al pubblico'))))[0];
    const sch = parseEuros(byId('scheda-preview').innerHTML).pop();
    expect(tar).toBeGreaterThan(0);
    expect(sch).toBe(tar);
  });
});

describe('Quantità modificata a mano: scelta esplicita', () => {
  it('etanolo a 60 g, "mantieni": ricalcola il Minoxidil, resta 5%', async () => {
    rispondi(true);
    const i = ctx.liberaRighe.indexOf(riga('Etanolo 96°'));
    ctx.liberaRighe[i].qty = '60';
    await ctx.liberaQtyChanged(i);
    expect(modalCalls.length).toBe(1);
    expect(riga('Etanolo 96°').qty).toBe('60');
    expect(parseFloat(riga('Minoxidil').qty)).toBeCloseTo(5 * 105 / 95, 3);
    expect(conc()).toBeCloseTo(5, 3);
  });

  it('etanolo a 60 g, "tieni le quantità": la concentrazione diventa 4,545% e resta quella richiesta', async () => {
    rispondi(false);
    const i = ctx.liberaRighe.indexOf(riga('Etanolo 96°'));
    ctx.liberaRighe[i].qty = '60';
    await ctx.liberaQtyChanged(i);
    expect(riga('Minoxidil').qty).toBe('5');
    expect(conc()).toBeCloseTo(5 / 110 * 100, 3);
    expect(ctx.concRichiesta).toBeCloseTo(5 / 110 * 100, 6);
    // da qui in poi è la nuova concentrazione a restare fissa
    byId('grado-alc').value = '40';
    ctx.gradoAlcChanged();
    expect(conc()).toBeCloseTo(5 / 110 * 100, 3);
  });

  it('"tieni le quantità": il riquadro formula mostra 4,55% (non 4,00% da parseFloat("4,55"))', async () => {
    rispondi(false);
    const i = ctx.liberaRighe.indexOf(riga('Etanolo 96°'));
    ctx.liberaRighe[i].qty = '60';
    await ctx.liberaQtyChanged(i);
    expect(byId('libera-conc').value).toBe('4,55');
    expect(byId('formula-grid').innerHTML).toContain('4,55');
    expect(byId('formula-grid').innerHTML).not.toContain('4,00');
  });

  it('Minoxidil a 6 g, "mantieni": scala gli altri ingredienti, resta 5%', async () => {
    rispondi(true);
    const i = ctx.liberaRighe.indexOf(riga('Minoxidil'));
    ctx.liberaRighe[i].qty = '6';
    await ctx.liberaQtyChanged(i);
    expect(riga('Minoxidil').qty).toBe('6');
    expect(parseFloat(riga('Glicole propilenico').qty)).toBeCloseTo(35 * 1.2, 3);
    expect(conc()).toBeCloseTo(5, 3);
  });

  it('senza concentrazione richiesta non chiede nulla', async () => {
    ctx.azzeraRicetta();
    expect(ctx.concRichiesta).toBe(null);
    ctx.liberaRighe = [
      { nome:'Minoxidil', qty:'5', unit:'g', isPa:true, densita:null },
      { nome:'Etanolo 96°', qty:'50', unit:'g', isPa:false, densita:null },
    ];
    rispondi(true);
    ctx.liberaRighe[1].qty = '60';
    await ctx.liberaQtyChanged(1);
    expect(modalCalls.length).toBe(0);
    expect(riga('Minoxidil').qty).toBe('5');
  });

  it('nessuna domanda se la concentrazione non cambia (es. stesso valore)', async () => {
    rispondi(true);
    await ctx.liberaQtyChanged(1);
    expect(modalCalls.length).toBe(0);
  });
});

describe('Campo Concentrazione modificabile', () => {
  it('scrivere 4 (anche "4,0") ricalcola il Minoxidil al 4% p/p', () => {
    ctx.concRichiestaChanged('4,0');
    expect(ctx.concRichiesta).toBe(4);
    expect(parseFloat(riga('Minoxidil').qty)).toBeCloseTo(4 * 95 / 96, 3);
    expect(conc()).toBeCloseTo(4, 3);
  });

  it('svuotarlo toglie la concentrazione richiesta', () => {
    ctx.concRichiestaChanged('');
    expect(ctx.concRichiesta).toBe(null);
    expect(conc()).toBeCloseTo(5, 3);
  });

  it('passando a p/v la richiesta diventa la p/v attuale, e il grado la mantiene', () => {
    ctx.setConcMode('pv');
    const pv = conc();
    expect(ctx.concRichiesta).toBeCloseTo(pv, 6);
    byId('grado-alc').value = '40';
    ctx.gradoAlcChanged();
    expect(conc()).toBeCloseTo(pv, 3);
  });
});
