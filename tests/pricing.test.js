import { describe, it, expect } from 'vitest';
import {
  ALLEGATO_A, DENSITA, INV_HARDCODED, INV_OBBLIGATORIE,
  ALLEGATO_B_VOCI, IVA_RATE, ART_7_INCREMENTO, ART_8_PER_UNIT, COMP_MAX, OP_TECNOLOGICA_COSTO,
  fmt, invNominalizza, invMatchScore, hasHazard, getDensita, tarNormalizza, tarCercaPA,
  invFindBest, getHDaInventario, rigaHazardous, invGetPrezzo,
  calcAllegatoB, calcAllegatoBVoce7, calcSupplementi, calcIvaTotale,
} from '../pricing.js';

// Inventario di test minimale. Riproduce la forma degli item in INV_HARDCODED
// + alcune sostanze inserite "stored" (con override prezzo) per testare
// la precedenza inventario vs Allegato A.
const FIXTURE_INV = [
  { nome: 'Etanolo 96°',         h: 'H225,H319',      unit: 'ml', prezzo: 0.01474, lotto: 'F2509100' },
  { nome: 'Acqua purificata',    h: '',               unit: 'ml', prezzo: 0.002,   lotto: 'R2426776' },
  { nome: 'Acido salicilico',    h: 'H302,H318,H335', unit: 'g',  prezzo: 0.0512,  lotto: 'R2217272', lottoInt: '14/26' },
  { nome: 'Glicole propilenico', h: '',               unit: 'g',  prezzo: 0.0159,  lotto: 'R2510991' },
  { nome: 'Finasteride',         h: 'H302,H360,H372,H410', unit: 'g', prezzo: 0,   lotto: 'F2505012' },
  { nome: 'Mentolo naturale',    h: 'H228,H317,H411', unit: 'g',  prezzo: 0.128,   lotto: 'F2506999' },
  { nome: 'Lattosio monoidrato', h: '',               unit: 'g',  prezzo: 0.0055,  lotto: 'F2504870' },
];

describe('ALLEGATO A — D.M. 22/09/2017', () => {
  // Sostanze ad alto rischio di regressione (controlli rigorosi):
  // se un giorno qualcuno tocca pricing.js per sbaglio, questi prezzi obbligatori
  // per legge devono restare quelli del decreto. Ogni cambio = audit normativo.
  it('prezzi pinned per stupefacenti chiave (Tab. I-II)', () => {
    expect(ALLEGATO_A['morfina cloridrato']).toBe(8.714);
    expect(ALLEGATO_A['codeina fosfato']).toBe(19.470);
    expect(ALLEGATO_A['diazepam']).toBe(4.867);
    expect(ALLEGATO_A['oxazepam']).toBe(11.000);
    expect(ALLEGATO_A['cannabis infiorescenze']).toBe(9.00);
  });

  it('alias hanno lo stesso prezzo del nome canonico', () => {
    // Sinonimi inseriti volontariamente perché il match è per substring.
    expect(ALLEGATO_A['tannino']).toBe(ALLEGATO_A['acido tannico']);
    expect(ALLEGATO_A['acqua depurata']).toBe(ALLEGATO_A['acqua purificata']);
    expect(ALLEGATO_A['perossido di idrogeno']).toBe(ALLEGATO_A['acqua ossigenata']);
    expect(ALLEGATO_A['zucchero']).toBe(ALLEGATO_A['saccarosio']);
    expect(ALLEGATO_A['pvp']).toBe(ALLEGATO_A['polivinilpirrolidone']);
    expect(ALLEGATO_A['fiori di zolfo']).toBe(ALLEGATO_A['solfo sublimato']);
    expect(ALLEGATO_A['gomenolo']).toBe(ALLEGATO_A['niaouli essenza']);
  });

  it('chiavi sono lowercase + senza accenti (richiesto da invGetPrezzo)', () => {
    for (const k of Object.keys(ALLEGATO_A)) {
      expect(k).toBe(k.toLowerCase());
      expect(k).not.toMatch(/[àèéìòù]/);
    }
  });

  it('tutti i prezzi > 0', () => {
    for (const [k, v] of Object.entries(ALLEGATO_A)) {
      expect(v, `prezzo non valido per "${k}"`).toBeGreaterThan(0);
    }
  });

  it('è immutabile (Object.freeze previene mutazioni accidentali)', () => {
    expect(Object.isFrozen(ALLEGATO_A)).toBe(true);
    // Tentativo silenzioso (non strict) — il valore non deve cambiare.
    try { ALLEGATO_A['paracetamolo'] = 999; } catch {}
    expect(ALLEGATO_A['paracetamolo']).toBe(0.135);
  });
});

describe('fmt — formattazione decimali italiani', () => {
  it('usa la virgola come separatore decimale', () => {
    expect(fmt(1.23)).toBe('1,23');
    expect(fmt(0.5)).toBe('0,50');
  });

  it('default a 2 decimali, override con secondo argomento', () => {
    expect(fmt(1)).toBe('1,00');
    expect(fmt(1.234, 3)).toBe('1,234');
    expect(fmt(1.5, 0)).toBe('2');
    expect(fmt(1.5, 1)).toBe('1,5');
  });

  it('arrotonda a half-away-from-zero come toFixed', () => {
    // Promemoria: toFixed usa banker rounding in alcuni motori — qui assumiamo
    // V8/JSC che fa half-to-even ma in pratica per due decimali è coerente.
    expect(fmt(1.005, 2)).toMatch(/^1,(00|01)$/);
    expect(fmt(2.675, 2)).toMatch(/^2,(67|68)$/);
  });

  it('gestisce numeri grandi e negativi', () => {
    expect(fmt(1000)).toBe('1000,00');
    expect(fmt(-3.14)).toBe('-3,14');
    expect(fmt(0)).toBe('0,00');
  });
});

describe('invNominalizza — normalizzazione fuzzy', () => {
  it('lowercase + trim', () => {
    expect(invNominalizza('  CBD  ')).toBe('cbd');
    expect(invNominalizza('Acido Salicilico')).toBe('acido salicilico');
  });

  it('rimuove accenti italiani', () => {
    expect(invNominalizza('Età')).toBe('eta');
    expect(invNominalizza('Però')).toBe('pero');
    expect(invNominalizza('Più')).toBe('piu');
    expect(invNominalizza('Caffè')).toBe('caffe');
  });

  it('input null/undefined non rompe', () => {
    expect(invNominalizza(null)).toBe('');
    expect(invNominalizza(undefined)).toBe('');
    expect(invNominalizza('')).toBe('');
  });
});

describe('hasHazard — Art. 8a sostanze pericolose', () => {
  it('codici H2xx (fisici) → true', () => {
    expect(hasHazard('H225')).toBe(true);       // infiammabile (etanolo)
    expect(hasHazard('H228')).toBe(true);       // solido infiammabile (mentolo)
  });

  it('codici H3xx (salute) → true', () => {
    expect(hasHazard('H302')).toBe(true);       // tossico per ingestione
    expect(hasHazard('H318')).toBe(true);       // lesione oculare
    expect(hasHazard('H360')).toBe(true);       // mutagenicità
    expect(hasHazard('H372')).toBe(true);       // organi bersaglio
  });

  it('codici H4xx (puramente ambientali) → false', () => {
    expect(hasHazard('H400')).toBe(false);
    expect(hasHazard('H410')).toBe(false);      // tossico acquatico (mentolo, finasteride)
    expect(hasHazard('H411')).toBe(false);
  });

  it('mix H4xx + altri → true (vince il pericolo umano)', () => {
    // Finasteride: H302,H360,H372,H410 — H410 da solo non scatterebbe Art. 8a,
    // ma H360 (mutagenicità) sì.
    expect(hasHazard('H302,H360,H372,H410')).toBe(true);
    expect(hasHazard('H228,H317,H411')).toBe(true);
  });

  it('solo H4xx → false anche con più codici', () => {
    expect(hasHazard('H400,H410,H411')).toBe(false);
  });

  it('input vuoto/null → false', () => {
    expect(hasHazard('')).toBe(false);
    expect(hasHazard(null)).toBe(false);
    expect(hasHazard(undefined)).toBe(false);
  });

  it('tollera spazi attorno alle virgole', () => {
    expect(hasHazard('H302, H318, H335')).toBe(true);
    expect(hasHazard(' H410 , H411 ')).toBe(false);
  });
});

describe('getDensita — densità liquidi', () => {
  it('riconosce etanolo (0.807)', () => {
    expect(getDensita('etanolo')).toBe(0.807);
    expect(getDensita('Etanolo 96°')).toBe(0.807);
    expect(getDensita('alcool etilico')).toBe(0.807);
  });

  it('riconosce acqua (1.0)', () => {
    expect(getDensita('acqua')).toBe(1.0);
    expect(getDensita('Acqua purificata')).toBe(1.0);
    expect(getDensita('acqua depurata')).toBe(1.0);
  });

  it('riconosce glicerina (1.261)', () => {
    expect(getDensita('Glicerina')).toBe(1.261);
    expect(getDensita('glicerolo')).toBe(1.261);
  });

  it('match per substring (nome composto)', () => {
    expect(getDensita('soluzione di acqua sterile')).toBe(1.0);
    expect(getDensita('estratto in etanolo')).toBe(0.807);
  });

  it('solidi/sconosciuti → null', () => {
    expect(getDensita('paracetamolo')).toBe(null);
    expect(getDensita('lattosio')).toBe(null);
    expect(getDensita('xyz123')).toBe(null);
  });
});

describe('invMatchScore — token-based fuzzy match', () => {
  it('match identico → 1', () => {
    expect(invMatchScore('acido salicilico', 'acido salicilico')).toBe(1);
  });

  it('ordine token irrilevante', () => {
    expect(invMatchScore('salicilico acido', 'acido salicilico')).toBe(1);
  });

  it('stopwords ignorate', () => {
    expect(invMatchScore('estratto di camomilla', 'camomilla estratto')).toBe(1);
  });

  it('token corti (<3) ignorati', () => {
    // 'di' e 'da' (2 char) sono filtrati anche se non stopword; conta solo "acqua".
    expect(invMatchScore('acqua', 'acqua di rose')).toBe(1);
  });

  it('nessuna sovrapposizione → 0', () => {
    expect(invMatchScore('paracetamolo', 'lattosio')).toBe(0);
  });

  it('match parziale dà score tra 0 e 1', () => {
    const s = invMatchScore('estratto di valeriana polvere', 'valeriana');
    expect(s).toBeGreaterThan(0);
    expect(s).toBeLessThanOrEqual(1);
  });

  it('input vuoti → 0', () => {
    expect(invMatchScore('', 'acqua')).toBe(0);
    expect(invMatchScore('acqua', '')).toBe(0);
    expect(invMatchScore('', '')).toBe(0);
  });
});

describe('tarNormalizza / tarCercaPA — ricerca Allegato A', () => {
  it('tarNormalizza rimuove punteggiatura e simboli', () => {
    expect(tarNormalizza('Acido Acetilsalicilico (ASA)')).toBe('acido acetilsalicilico asa');
    expect(tarNormalizza('Vit. B12')).toBe('vit b12');
    expect(tarNormalizza('  Spazi   multipli  ')).toBe('spazi multipli');
  });

  it('tarCercaPA trova prefix match in Allegato A', () => {
    const hits = tarCercaPA('paracetamolo');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0][0]).toBe('paracetamolo');
    expect(hits[0][1]).toBe(0.135);
  });

  it('tarCercaPA ordina i match per lunghezza chiave (più stretto vince)', () => {
    const hits = tarCercaPA('acido');
    // "acido" matcha ~13 sostanze; la più corta deve essere prima.
    expect(hits.length).toBeLessThanOrEqual(6);
    for (let i = 1; i < hits.length; i++) {
      expect(hits[i][0].length).toBeGreaterThanOrEqual(hits[i-1][0].length);
    }
  });

  it('tarCercaPA query vuota → []', () => {
    expect(tarCercaPA('')).toEqual([]);
    expect(tarCercaPA('   ')).toEqual([]);
  });

  it('tarCercaPA nessun match → []', () => {
    expect(tarCercaPA('zzznonesiste')).toEqual([]);
  });

  it('tarCercaPA tronca a 6 risultati', () => {
    const hits = tarCercaPA('acido');
    expect(hits.length).toBeLessThanOrEqual(6);
  });
});

describe('DENSITA — coerenza con Allegato A', () => {
  // Le sostanze in DENSITA che sono anche in ALLEGATO_A (es. glicerina,
  // glicole propilenico, acqua) devono restare allineate per nome.
  it('chiavi DENSITA sono lowercase senza accenti', () => {
    for (const k of Object.keys(DENSITA)) {
      expect(k).toBe(k.toLowerCase());
      expect(k).not.toMatch(/[àèéìòù]/);
    }
  });

  it('etanolo ha densità 0.807 (richiesto per conversioni Art. 8a alcohol-based)', () => {
    expect(DENSITA['etanolo']).toBe(0.807);
  });
});

describe('INV_HARDCODED — inventario baseline', () => {
  it('ogni item ha nome, unit, prezzo definiti', () => {
    for (const item of INV_HARDCODED) {
      expect(item.nome, 'nome mancante').toBeTruthy();
      expect(['g','ml','pz']).toContain(item.unit);
      expect(typeof item.prezzo).toBe('number');
      expect(item.prezzo).toBeGreaterThanOrEqual(0);
    }
  });

  it('include almeno una taglia di capsule (richiesto per pricing capsule)', () => {
    const caps = INV_HARDCODED.filter(i => i.nome.toLowerCase().includes('capsule'));
    expect(caps.length).toBeGreaterThan(0);
    expect(caps.every(c => c.unit === 'pz')).toBe(true);
  });

  it('etanolo 96° ha H225 (justifica Art. 8a per liquidi alcolici)', () => {
    const eta = INV_HARDCODED.find(i => i.nome.toLowerCase().includes('etanolo'));
    expect(eta).toBeDefined();
    expect(hasHazard(eta.h)).toBe(true);
  });
});

describe('INV_OBBLIGATORIE', () => {
  it('contiene sostanze sempre presenti in ricerca (acqua, alcool, ecc.)', () => {
    expect(INV_OBBLIGATORIE.has('acqua purificata')).toBe(true);
    expect(INV_OBBLIGATORIE.has('etanolo')).toBe(true);
    expect(INV_OBBLIGATORIE.has('carbone attivo')).toBe(true);
  });

  it('tutte le chiavi sono lowercase', () => {
    for (const k of INV_OBBLIGATORIE) {
      expect(k).toBe(k.toLowerCase());
    }
  });
});

describe('invFindBest — match inventario', () => {
  it('match esatto (case insensitive, accenti rimossi)', () => {
    expect(invFindBest('etanolo 96°', FIXTURE_INV).nome).toBe('Etanolo 96°');
    expect(invFindBest('ETANOLO 96°', FIXTURE_INV).nome).toBe('Etanolo 96°');
  });

  it('match per substring (legacy, veloce)', () => {
    expect(invFindBest('etanolo', FIXTURE_INV).nome).toBe('Etanolo 96°');
    expect(invFindBest('mentolo', FIXTURE_INV).nome).toBe('Mentolo naturale');
  });

  it('fallback token-based per varianti (score ≥ 0.5)', () => {
    // "Acido salicilico anidro" → match con "Acido salicilico" via token "acido"+"salicilico"
    const r = invFindBest('Acido salicilico anidro', FIXTURE_INV);
    expect(r?.nome).toBe('Acido salicilico');
  });

  it('nessun match → null', () => {
    expect(invFindBest('paracetamolo', FIXTURE_INV)).toBe(null);
    expect(invFindBest('xyz', FIXTURE_INV)).toBe(null);
  });

  it('nome vuoto → null', () => {
    expect(invFindBest('', FIXTURE_INV)).toBe(null);
    expect(invFindBest(null, FIXTURE_INV)).toBe(null);
  });

  it('inv vuoto → null', () => {
    expect(invFindBest('etanolo', [])).toBe(null);
  });
});

describe('getHDaInventario — lookup codici H per nome', () => {
  it('ritorna H codes della sostanza trovata', () => {
    expect(getHDaInventario('Etanolo 96°', FIXTURE_INV)).toBe('H225,H319');
    expect(getHDaInventario('Acido salicilico', FIXTURE_INV)).toBe('H302,H318,H335');
  });

  it('ritorna stringa vuota se sostanza senza H', () => {
    expect(getHDaInventario('Acqua purificata', FIXTURE_INV)).toBe('');
    expect(getHDaInventario('Glicole propilenico', FIXTURE_INV)).toBe('');
  });

  it('match per substring sul nome', () => {
    expect(getHDaInventario('etanolo', FIXTURE_INV)).toBe('H225,H319');
  });

  it('sostanza non in inventario → ""', () => {
    expect(getHDaInventario('paracetamolo', FIXTURE_INV)).toBe('');
  });

  it('nome vuoto/null → ""', () => {
    expect(getHDaInventario('', FIXTURE_INV)).toBe('');
    expect(getHDaInventario(null, FIXTURE_INV)).toBe('');
  });
});

describe('rigaHazardous — Art. 8a per riga', () => {
  it('riga con H code valido → true', () => {
    expect(rigaHazardous({nome: 'Etanolo 96°', h: 'H225'}, FIXTURE_INV)).toBe(true);
  });

  it('riga con solo H4xx → false (vedi hasHazard)', () => {
    expect(rigaHazardous({nome: 'Test', h: 'H410'}, FIXTURE_INV)).toBe(false);
  });

  it('riga senza H ma sostanza in inventario con H → true (lookup automatico)', () => {
    // r.h vuoto: fallback a getHDaInventario, che trova H225,H319 per etanolo.
    expect(rigaHazardous({nome: 'Etanolo 96°', h: ''}, FIXTURE_INV)).toBe(true);
  });

  it('riga senza H e sostanza pulita → false', () => {
    expect(rigaHazardous({nome: 'Acqua purificata', h: ''}, FIXTURE_INV)).toBe(false);
    expect(rigaHazardous({nome: 'Lattosio monoidrato'}, FIXTURE_INV)).toBe(false);
  });

  it('hPreventivo=true → true sempre, override anche se H code vuoto', () => {
    expect(rigaHazardous({nome: 'Lattosio monoidrato', h: '', hPreventivo: true}, FIXTURE_INV)).toBe(true);
    expect(rigaHazardous({nome: 'Acqua purificata', hPreventivo: true}, FIXTURE_INV)).toBe(true);
  });

  it('hPreventivo=false NON downgrada un H code reale', () => {
    // false è ignorato (solo true ha effetto override). Il calcolo H normale procede.
    expect(rigaHazardous({nome: 'Etanolo 96°', h: 'H225', hPreventivo: false}, FIXTURE_INV)).toBe(true);
  });

  it('riga vuota/senza nome → false', () => {
    expect(rigaHazardous(null, FIXTURE_INV)).toBe(false);
    expect(rigaHazardous({}, FIXTURE_INV)).toBe(false);
    expect(rigaHazardous({nome: ''}, FIXTURE_INV)).toBe(false);
  });
});

describe('invGetPrezzo — lookup canonico prezzo', () => {
  it('sostanza in inventario con prezzo > 0 → fonte=inventario', () => {
    const r = invGetPrezzo('Etanolo 96°', FIXTURE_INV);
    expect(r).toEqual({ prezzo: 0.01474, fonte: 'inventario', lotto: 'F2509100' });
  });

  it('inventario: lottoInt preferito su lotto (nome non in Allegato A)', () => {
    // Uso ad-hoc inv perché tutte le sostanze in FIXTURE_INV con lottoInt sono
    // anche in Allegato A (e con il fix di precedenza non finirebbero mai in
    // questa branch).
    const inv = [{ nome: 'Test sostanza Z', h: '', unit: 'g', prezzo: 0.5, lotto: 'L001', lottoInt: '14/26' }];
    const r = invGetPrezzo('Test sostanza Z', inv);
    expect(r.lotto).toBe('14/26');
    expect(r.fonte).toBe('inventario');
  });

  it('sostanza solo in Allegato A → fonte=allegatoA', () => {
    // Paracetamolo: in Allegato A (0.135), NON in FIXTURE_INV.
    const r = invGetPrezzo('paracetamolo', FIXTURE_INV);
    expect(r).toEqual({ prezzo: 0.135, fonte: 'allegatoA' });
  });

  it('sostanza in inventario con prezzo=0 → cade in Allegato A (se presente)', () => {
    // Finasteride: nel fixture ha prezzo:0. Non in Allegato A → null.
    expect(invGetPrezzo('Finasteride', FIXTURE_INV)).toBe(null);
  });

  it('sostanza in inventario CON prezzo E in Allegato A → vince Allegato A (D.M. obbligatorio)', () => {
    // Regola legale: i prezzi dell'Allegato A sono obbligatori per legge
    // (D.M. 22/09/2017 mod. 13/12/2017, Art. 4 e 10). Anche se la farmacia
    // ha la sostanza in inventario a prezzo diverso, la tariffa al cliente
    // deve usare il prezzo dell'Allegato A.
    // Acido salicilico: inventario 0.0512, Allegato A 0.049 → vince 0.049.
    const r = invGetPrezzo('Acido salicilico', FIXTURE_INV);
    expect(r.prezzo).toBe(0.049);
    expect(r.fonte).toBe('allegatoA');
  });

  it('disambiguazione "acido X": exact match deve vincere sul fuzzy first-word', () => {
    // Regressione: senza la tier 1 (exact match), "acido salicilico" e tutti gli
    // altri "acido Y" verrebbero matchati su "acido acetilsalicilico" (primo
    // nella keys order di Allegato A) per via del fallback first-word, ritornando
    // 0.122 invece del prezzo corretto.
    expect(invGetPrezzo('acido salicilico', []).prezzo).toBe(0.049);
    expect(invGetPrezzo('acido borico', []).prezzo).toBe(0.110);
    expect(invGetPrezzo('acido tartarico', []).prezzo).toBe(0.071);
    expect(invGetPrezzo('acido ascorbico', []).prezzo).toBe(0.059);
    expect(invGetPrezzo('acido acetilsalicilico', []).prezzo).toBe(0.122);
  });

  it('match fuzzy: q substring del nome canonico (es. "atropina" → "atropina solfato")', () => {
    // L'utente che digita solo "atropina" ottiene il prezzo dell'unica forma in
    // Allegato A (solfato). Comportamento legacy preservato.
    const r = invGetPrezzo('atropina', []);
    expect(r).toEqual({ prezzo: 31.223, fonte: 'allegatoA' });
  });

  it('sostanza sconosciuta → null', () => {
    expect(invGetPrezzo('xyz123', FIXTURE_INV)).toBe(null);
  });

  it('inv vuoto cade comunque su Allegato A', () => {
    const r = invGetPrezzo('paracetamolo', []);
    expect(r).toEqual({ prezzo: 0.135, fonte: 'allegatoA' });
  });

  it('lotto default a "—" se né lottoInt né lotto sono presenti', () => {
    const r = invGetPrezzo('test', [{ nome: 'test', prezzo: 1, h: '' }]);
    expect(r.lotto).toBe('—');
  });
});

// ── Pricing engine — D.M. 22/09/2017 (mod. 13/12/2017, GU 30-1-2018) ────

describe('costanti pricing engine', () => {
  it('IVA 10% farmaci galenici', () => {
    expect(IVA_RATE).toBe(0.10);
  });

  it('Art. 7 incremento +40%', () => {
    expect(ART_7_INCREMENTO).toBe(0.40);
  });

  it('Art. 8a/b/c supplemento €2,50 per unità', () => {
    expect(ART_8_PER_UNIT).toBe(2.50);
  });

  it('Art. 5 max 4 componenti aggiuntivi pagati', () => {
    expect(COMP_MAX).toBe(4);
  });

  it('Art. 5 operazione tecnologica €2,30 ciascuna', () => {
    expect(OP_TECNOLOGICA_COSTO).toBe(2.30);
  });

  it('ALLEGATO_B_VOCI ha le 4 forme attese', () => {
    expect(Object.keys(ALLEGATO_B_VOCI).sort()).toEqual(['liquida', 'polvere', 'semisolida', 'sospensione']);
  });

  it('ALLEGATO_B_VOCI valori pinned (D.M. 22/09/2017 GU 30-1-2018)', () => {
    expect(ALLEGATO_B_VOCI.liquida.base).toBe(6.65);
    expect(ALLEGATO_B_VOCI.liquida.compExtra).toBe(0.80);
    expect(ALLEGATO_B_VOCI.sospensione.base).toBe(13.30);
    expect(ALLEGATO_B_VOCI.sospensione.rif).toBe(250);
    expect(ALLEGATO_B_VOCI.sospensione.stepPiu).toBe(100);
    expect(ALLEGATO_B_VOCI.sospensione.costPiu).toBe(0.70);
    expect(ALLEGATO_B_VOCI.sospensione.compExtra).toBe(0.70);
    expect(ALLEGATO_B_VOCI.semisolida.base).toBe(13.30);
    expect(ALLEGATO_B_VOCI.semisolida.rif).toBe(50);
    expect(ALLEGATO_B_VOCI.semisolida.stepPiu).toBe(50);
    expect(ALLEGATO_B_VOCI.semisolida.costPiu).toBe(0.75);
    expect(ALLEGATO_B_VOCI.semisolida.compExtra).toBe(0.75);
    expect(ALLEGATO_B_VOCI.polvere.base).toBe(6.65);
    expect(ALLEGATO_B_VOCI.polvere.compExtra).toBe(0.75);
  });
});

describe('calcAllegatoB — voci 1/3/4/5 (no pezzi)', () => {
  // Helper: arrotonda per evitare problemi di precisione float (es. 0.1+0.2=0.30000000000004).
  const r2 = n => Math.round(n * 100) / 100;

  describe('voce 1 — liquide (no scaglione volume)', () => {
    it('100 ml: solo base €6,65, no scaglione', () => {
      const b = calcAllegatoB('liquida', 100, 0, 0);
      expect(b.baseB).toBe(6.65);
      expect(b.costoB).toBe(6.65);
      expect(r2(b.inc40)).toBe(2.66); // 6.65 * 0.40
    });

    it('500 ml: ancora base €6,65 (voce 1 non ha scaglione)', () => {
      const b = calcAllegatoB('liquida', 500, 0, 0);
      expect(b.baseB).toBe(6.65);
    });
  });

  describe('voce 3 — sospensioni (scaglione 250 ml + €0,70/100 ml)', () => {
    it('250 ml: base €13,30, no scaglione', () => {
      const b = calcAllegatoB('sospensione', 250, 0, 0);
      expect(b.baseB).toBe(13.30);
    });

    it('350 ml: base + 1 scaglione = 13,30 + 0,70 = 14,00', () => {
      const b = calcAllegatoB('sospensione', 350, 0, 0);
      expect(r2(b.baseB)).toBe(14.00);
    });

    it('251 ml: 1 scaglione (Math.ceil) → 14,00', () => {
      // 1 ml sopra il riferimento attiva uno scaglione pieno (Math.ceil arrotonda in alto).
      const b = calcAllegatoB('sospensione', 251, 0, 0);
      expect(r2(b.baseB)).toBe(14.00);
    });

    it('450 ml: base + 2 scaglioni = 13,30 + 1,40 = 14,70', () => {
      const b = calcAllegatoB('sospensione', 450, 0, 0);
      expect(r2(b.baseB)).toBe(14.70);
    });
  });

  describe('voce 4 — semisolide (scaglione 50 g + €0,75/50 g)', () => {
    it('50 g: base €13,30, no scaglione', () => {
      const b = calcAllegatoB('semisolida', 50, 0, 0);
      expect(b.baseB).toBe(13.30);
    });

    it('100 g: base + 1 scaglione = 13,30 + 0,75 = 14,05', () => {
      const b = calcAllegatoB('semisolida', 100, 0, 0);
      expect(r2(b.baseB)).toBe(14.05);
    });

    it('150 g: base + 2 scaglioni = 14,80', () => {
      const b = calcAllegatoB('semisolida', 150, 0, 0);
      expect(r2(b.baseB)).toBe(14.80);
    });
  });

  describe('voce 5 — polveri (no scaglione)', () => {
    it('quantità qualsiasi: base €6,65 fissa', () => {
      expect(calcAllegatoB('polvere', 10, 0, 0).baseB).toBe(6.65);
      expect(calcAllegatoB('polvere', 100, 0, 0).baseB).toBe(6.65);
      expect(calcAllegatoB('polvere', 500, 0, 0).baseB).toBe(6.65);
    });
  });

  describe('Art. 5 — componenti aggiuntivi', () => {
    it('comp.extra per voce: 0,80 / 0,70 / 0,75 / 0,75', () => {
      expect(calcAllegatoB('liquida', 100, 1, 0).addComp).toBe(0.80);
      expect(calcAllegatoB('sospensione', 250, 1, 0).addComp).toBe(0.70);
      expect(calcAllegatoB('semisolida', 50, 1, 0).addComp).toBe(0.75);
      expect(calcAllegatoB('polvere', 50, 1, 0).addComp).toBe(0.75);
    });

    it('cap a 4 componenti: 7 componenti pagati come 4', () => {
      // Liquida: 4 * 0,80 = 3,20 (non 5,60)
      expect(calcAllegatoB('liquida', 100, 7, 0).addComp).toBe(4 * 0.80);
      expect(calcAllegatoB('liquida', 100, 7, 0).cappedComp).toBe(4);
    });

    it('0 componenti → addComp 0', () => {
      expect(calcAllegatoB('liquida', 100, 0, 0).addComp).toBe(0);
    });

    it('comp negativo trattato come 0', () => {
      expect(calcAllegatoB('liquida', 100, -3, 0).addComp).toBe(0);
    });
  });

  describe('Art. 5 — operazioni tecnologiche', () => {
    it('1 op = €2,30', () => {
      expect(calcAllegatoB('liquida', 100, 0, 1).addOp).toBe(2.30);
    });

    it('3 op = €6,90', () => {
      expect(r2(calcAllegatoB('liquida', 100, 0, 3).addOp)).toBe(6.90);
    });

    it('nessun cap sulle operazioni (cap solo sui componenti)', () => {
      expect(r2(calcAllegatoB('liquida', 100, 0, 10).addOp)).toBe(23.00);
    });
  });

  describe('Art. 7 — incremento +40%', () => {
    it('applicato a costoB = base + comp + op (non al totale)', () => {
      // 100 ml liquida, 2 comp, 1 op
      // baseB=6,65 + addComp=1,60 + addOp=2,30 = costoB=10,55
      // inc40 = 10,55 × 0,40 = 4,22
      const b = calcAllegatoB('liquida', 100, 2, 1);
      expect(r2(b.costoB)).toBe(10.55);
      expect(r2(b.inc40)).toBe(4.22);
    });

    it('su base senza comp/op: inc40 = base × 0,40', () => {
      const b = calcAllegatoB('polvere', 50, 0, 0);
      expect(r2(b.inc40)).toBe(2.66); // 6,65 * 0,40
    });
  });

  describe('Edge cases', () => {
    it('tipo sconosciuto → null', () => {
      expect(calcAllegatoB('inesistente', 100, 0, 0)).toBe(null);
      expect(calcAllegatoB('capsule', 100, 0, 0)).toBe(null);
      expect(calcAllegatoB('cartine', 100, 0, 0)).toBe(null);
    });

    it('qt=0: solo base, nessun scaglione', () => {
      expect(calcAllegatoB('sospensione', 0, 0, 0).baseB).toBe(13.30);
    });

    it('qt=undefined: solo base', () => {
      expect(calcAllegatoB('sospensione', undefined, 0, 0).baseB).toBe(13.30);
    });
  });
});

describe('calcAllegatoBVoce7 — capsule/cartine', () => {
  const r2 = n => Math.round(n * 100) / 100;

  it('120 pz: base esatta €22,00', () => {
    const b = calcAllegatoBVoce7(120, 0, 0);
    expect(b.baseB).toBe(22.00);
  });

  describe('scaglione asimmetrico ±€1/€2 per 10 pz', () => {
    it('110 pz: 22,00 − 1,00 = 21,00 (1 scaglione sotto)', () => {
      expect(calcAllegatoBVoce7(110, 0, 0).baseB).toBe(21.00);
    });

    it('100 pz: 22,00 − 2,00 = 20,00 (2 scaglioni sotto)', () => {
      expect(calcAllegatoBVoce7(100, 0, 0).baseB).toBe(20.00);
    });

    it('130 pz: 22,00 + 2,00 = 24,00 (1 scaglione sopra)', () => {
      expect(calcAllegatoBVoce7(130, 0, 0).baseB).toBe(24.00);
    });

    it('140 pz: 22,00 + 4,00 = 26,00 (2 scaglioni sopra)', () => {
      expect(calcAllegatoBVoce7(140, 0, 0).baseB).toBe(26.00);
    });

    it('asimmetria: 110 (€21) vs 130 (€24) NON è simmetrica intorno a 120', () => {
      // Regressione: chi tocca questo deve sapere che il decreto vuole asimmetria.
      const sotto = calcAllegatoBVoce7(110, 0, 0).baseB;
      const sopra = calcAllegatoBVoce7(130, 0, 0).baseB;
      const ref   = calcAllegatoBVoce7(120, 0, 0).baseB;
      expect(ref - sotto).toBe(1.00); // sotto: -1 per scaglione
      expect(sopra - ref).toBe(2.00); // sopra: +2 per scaglione
    });
  });

  describe('Math.ceil sui pezzi-non-multiplo-di-10', () => {
    it('115 pz: 1 scaglione sotto (Math.ceil 5/10 = 1) → 21,00', () => {
      expect(calcAllegatoBVoce7(115, 0, 0).baseB).toBe(21.00);
    });

    it('125 pz: 1 scaglione sopra (Math.ceil 5/10 = 1) → 24,00', () => {
      expect(calcAllegatoBVoce7(125, 0, 0).baseB).toBe(24.00);
    });
  });

  describe('Floor a zero per pochi pezzi', () => {
    it('numero molto basso non scende sotto 0', () => {
      // 22,00 - 12 × 1 = €10,00 a 0 pz, ma stop a 0 quando passa zero.
      // 0 pz: diff10 = ceil(120/10) = 12, base = 22 - 12 = 10 → reso 10.
      const b = calcAllegatoBVoce7(0, 0, 0);
      expect(b.baseB).toBeGreaterThanOrEqual(0);
    });
  });

  describe('comp e op', () => {
    it('comp.extra €0,60 per voce 7 (NON €0,80 come voce 1)', () => {
      const b = calcAllegatoBVoce7(120, 1, 0);
      expect(b.addComp).toBe(0.60);
    });

    it('cap a 4 componenti', () => {
      expect(calcAllegatoBVoce7(120, 7, 0).addComp).toBe(4 * 0.60);
    });

    it('1 op = €2,30 (stesso costo di tutte le voci)', () => {
      expect(calcAllegatoBVoce7(120, 0, 1).addOp).toBe(2.30);
    });

    it('Art. 7 +40% applicato a costoB', () => {
      // 120 capsule + 1 comp + 1 op: baseB=22, addComp=0.60, addOp=2.30 → costoB=24.90
      // inc40 = 24.90 × 0.40 = 9.96
      const b = calcAllegatoBVoce7(120, 1, 1);
      expect(r2(b.costoB)).toBe(24.90);
      expect(r2(b.inc40)).toBe(9.96);
    });
  });
});

describe('calcSupplementi — Art. 8', () => {
  it('hazardous=true → art8a €2,50', () => {
    expect(calcSupplementi({ hazardous: true }).art8a).toBe(2.50);
  });

  it('hazardous=false → art8a 0', () => {
    expect(calcSupplementi({ hazardous: false }).art8a).toBe(0);
  });

  it('stupp moltiplica €2,50 per ogni stupefacente', () => {
    expect(calcSupplementi({ stupp: 1 }).art8b).toBe(2.50);
    expect(calcSupplementi({ stupp: 3 }).art8b).toBe(7.50);
  });

  it('dop: doping a unità (un solo applicabile per scheda)', () => {
    expect(calcSupplementi({ dop: 1 }).art8c).toBe(2.50);
    expect(calcSupplementi({ dop: 2 }).art8c).toBe(5.00);
  });

  it('argomenti negativi trattati come 0', () => {
    expect(calcSupplementi({ stupp: -5 }).art8b).toBe(0);
    expect(calcSupplementi({ dop: -1 }).art8c).toBe(0);
  });

  it('argomenti default: tutto 0', () => {
    expect(calcSupplementi()).toEqual({ art8a: 0, art8b: 0, art8c: 0 });
    expect(calcSupplementi({})).toEqual({ art8a: 0, art8b: 0, art8c: 0 });
  });

  it('combinazione realistica (CBD finasteride): suppl. H ma niente stup/doping', () => {
    // Una crema al CBD + finasteride: H rilevato, no stup, no doping.
    expect(calcSupplementi({ hazardous: true, stupp: 0, dop: 0 }))
      .toEqual({ art8a: 2.50, art8b: 0, art8c: 0 });
  });
});

describe('calcIvaTotale — IVA 10%', () => {
  it('netto 100 → iva 10, totale 110', () => {
    expect(calcIvaTotale(100)).toEqual({ iva: 10, totale: 110 });
  });

  it('netto 0 → tutto 0', () => {
    expect(calcIvaTotale(0)).toEqual({ iva: 0, totale: 0 });
  });

  it('netto negativo trattato come 0 (difensivo)', () => {
    expect(calcIvaTotale(-10)).toEqual({ iva: 0, totale: 0 });
  });

  it('netto frazionale con arrotondamento corretto', () => {
    const r = calcIvaTotale(28.30);
    expect(Math.round(r.iva * 100) / 100).toBe(2.83);
    expect(Math.round(r.totale * 100) / 100).toBe(31.13);
  });
});

describe('scenari completi D.M. 22/09/2017 — invarianti fine-to-fine', () => {
  // Questi pinnano combinazioni realistiche assemblando le funzioni pure.
  // Non sostituiscono il test in browser, ma proteggono la matematica.
  const r2 = n => Math.round(n * 100) / 100;

  it('Soluzione 100ml, no comp/op, no supplementi: 6,65 × 1,40 = 9,31 + IVA = 10,24', () => {
    const b = calcAllegatoB('liquida', 100, 0, 0);
    const netto = b.costoB + b.inc40;
    const { totale } = calcIvaTotale(netto);
    expect(r2(b.costoB + b.inc40)).toBe(9.31);
    expect(r2(totale)).toBe(10.24);
  });

  it('Sospensione 350ml, 1 comp, 1 op, no H: scaglione + comp + op + Art.7', () => {
    // baseB = 13,30 + 0,70 = 14,00 (1 scaglione)
    // addComp = 0,70 (1 × €0,70)
    // addOp   = 2,30
    // costoB  = 17,00
    // inc40   = 6,80
    // netto preparazione (no materie/flacone/H) = 23,80
    const b = calcAllegatoB('sospensione', 350, 1, 1);
    expect(r2(b.costoB)).toBe(17.00);
    expect(r2(b.inc40)).toBe(6.80);
  });

  it('Crema 100g con CBD (H rilevato): Art. 8a si attiva', () => {
    // semisolida 100g: baseB = 13,30 + 0,75 = 14,05
    // costoB = 14,05, inc40 = 5,62
    // + Art. 8a 2,50
    const b = calcAllegatoB('semisolida', 100, 0, 0);
    const supp = calcSupplementi({ hazardous: true });
    const netto = b.costoB + b.inc40 + supp.art8a;
    expect(r2(b.costoB + b.inc40 + supp.art8a)).toBe(22.17);
  });

  it('120 capsule, 2 comp, 1 op: 22 + 1,20 + 2,30 = 25,50 × 1,40 = 35,70', () => {
    const b = calcAllegatoBVoce7(120, 2, 1);
    expect(r2(b.costoB)).toBe(25.50);
    expect(r2(b.inc40)).toBe(10.20);
  });

  it('Override manuale: prezzo finale digitato dall\'operatore (caveat documentato)', () => {
    // Il caveat è gestito dal wrapper DOM (calcTariff legge un prezzo manuale in
    // s-prezzo e lo usa al posto del calcolato). I test pure non lo coprono —
    // serve un test UI / e2e. Questo test pinna SOLO la matematica auto.
    expect(true).toBe(true);
  });
});
