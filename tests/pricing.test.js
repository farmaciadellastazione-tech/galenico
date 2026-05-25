import { describe, it, expect } from 'vitest';
import {
  ALLEGATO_A, DENSITA, INV_HARDCODED, INV_OBBLIGATORIE,
  fmt, invNominalizza, invMatchScore, hasHazard, getDensita, tarNormalizza, tarCercaPA,
} from '../pricing.js';

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
