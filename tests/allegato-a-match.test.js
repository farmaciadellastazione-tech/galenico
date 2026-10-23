// Ricerca del prezzo di legge (Allegato A): il vecchio ultimo tentativo
// confrontava solo la PRIMA PAROLA della voce ("acido", "olio", "cera"...), così
// "acido ialuronico" riceveva il prezzo dell'acido acetilsalicilico, "olio di
// jojoba" quello dell'olio di arachidi, ecc. — come prezzo di legge, bloccato.
import { describe, it, expect } from 'vitest';
import { ALLEGATO_A, INV_HARDCODED, invGetPrezzo, trovaVoceAllegatoA } from '../pricing.js';

describe('trovaVoceAllegatoA', () => {
  it('ogni voce dell\'Allegato A scritta esattamente dà sé stessa (nessuna regressione)', () => {
    for (const k of Object.keys(ALLEGATO_A)) expect([k, trovaVoceAllegatoA(k)]).toEqual([k, k]);
  });

  it('sostanze NON in Allegato A non vengono agganciate per la prima parola', () => {
    for (const n of ['Acido glicolico', 'Acido azelaico', 'Acido mandelico', 'Acido ialuronico', 'Acido retinoico',
                     'Sodio fluoruro', 'Olio di jojoba', 'Olio di argan', 'Burro di karite', "Cera d'api",
                     'Cera emulsionante', 'Acqua di rose', 'Acqua di hamamelis', 'Menta piperita olio essenziale',
                     'Aloe vera gel', 'Eucalipto olio essenziale'])
      expect([n, trovaVoceAllegatoA(n)]).toEqual([n, null]);
  });

  it('nomi con aggiunte legittime trovano la voce giusta', () => {
    expect(trovaVoceAllegatoA('Acido salicilico F.U.')).toBe('acido salicilico');
    expect(trovaVoceAllegatoA('Talco ventilato')).toBe('talco');
    expect(trovaVoceAllegatoA('Zinco ossido 99%')).toBe('zinco ossido');
    expect(trovaVoceAllegatoA('Vaselina bianca')).toBe('vaselina bianca');
  });

  it('nome contenuto in una sola voce: la trova (mentolo → mentolo naturale)', () => {
    expect(trovaVoceAllegatoA('Mentolo')).toBe('mentolo naturale');
    expect(trovaVoceAllegatoA('Lanolina')).toBe('lanolina anidra');
  });

  it('nome generico contenuto in più voci con prezzi diversi: nessuna voce', () => {
    expect(trovaVoceAllegatoA('Acido')).toBe(null);
    expect(trovaVoceAllegatoA('Olio')).toBe(null);
  });
});

describe('invGetPrezzo senza aggancio per prima parola', () => {
  it('acido ialuronico: niente prezzo di legge di un\'altra sostanza', () => {
    const r = invGetPrezzo('Acido ialuronico', INV_HARDCODED);
    expect(r === null || r.fonte !== 'allegatoA').toBe(true);
  });

  it('acqua di rose: niente prezzo dell\'acqua (né Allegato A né inventario)', () => {
    const inv = [{ nome: 'Acqua purificata', prezzo: 0.002, unit: 'ml' }];
    expect(invGetPrezzo('Acqua di rose', inv)).toBe(null);
  });

  it('inventario: il prezzo arriva se il nome è quello dell\'inventario', () => {
    const inv = [{ nome: 'Acido ialuronico', prezzo: 4.5, unit: 'g', lotto: 'L1' }];
    expect(invGetPrezzo('Acido ialuronico', inv)).toMatchObject({ prezzo: 4.5, fonte: 'inventario' });
    // 'basso PM' può essere un prodotto diverso (prezzo diverso): niente prezzo altrui (riscritto in v166, review v165)
    expect(invGetPrezzo('Acido ialuronico basso PM', inv)).toBe(null);
  });

  it('Allegato A resta prioritario sull\'inventario', () => {
    const inv = [{ nome: 'Acido salicilico', prezzo: 9.99, unit: 'g' }];
    expect(invGetPrezzo('Acido salicilico', inv)).toMatchObject({ fonte: 'allegatoA', prezzo: ALLEGATO_A['acido salicilico'] });
  });
});

// Review v164: casi che la prima versione sbagliava o perdeva.
import { tarCercaPA, invTrovaPerPrezzo } from '../pricing.js';

describe('trovaVoceAllegatoA — review v164', () => {
  it('"Acqua" (anche abbreviata) → acqua depurata, prezzo di legge', () => {
    expect(trovaVoceAllegatoA('Acqua')).toBe('acqua depurata');
    expect(trovaVoceAllegatoA('Acqua dep.')).toBe('acqua depurata');
    expect(trovaVoceAllegatoA('Acqua purificata')).toBe('acqua purificata');
    expect(trovaVoceAllegatoA('Acqua ossigenata')).toBe('acqua ossigenata');
  });

  it('parole in altro ordine: "Ossido di zinco" → zinco ossido', () => {
    expect(trovaVoceAllegatoA('Ossido di zinco')).toBe('zinco ossido');
    expect(trovaVoceAllegatoA('Cloruro di sodio')).toBe('sodio cloruro');
    expect(trovaVoceAllegatoA('Bicarbonato di sodio')).toBe('sodio bicarbonato');
  });

  it('punteggiatura: "Lidocaina." → lidocaina (non lidocaina cloridrato)', () => {
    expect(trovaVoceAllegatoA('Lidocaina.')).toBe('lidocaina');
  });

  it('parola in più che cambia sostanza: "Olio di ricino idrogenato" → nessuna voce', () => {
    expect(trovaVoceAllegatoA('Olio di ricino idrogenato')).toBe(null);
  });

  it('aggiunte innocue: sigle, purezza, numeri', () => {
    expect(trovaVoceAllegatoA('Acido salicilico Ph. Eur.')).toBe('acido salicilico');
    expect(trovaVoceAllegatoA('Zinco ossido 99,5%')).toBe('zinco ossido');
    expect(trovaVoceAllegatoA('Talco ventilato')).toBe('talco');
  });
});

describe('tarCercaPA — suggerimenti senza prima parola (review v164)', () => {
  it('"acido ialuronico" non propone altri acidi', () => {
    expect(tarCercaPA('acido ialuronico')).toEqual([]);
  });
  it('parole in altro ordine: "ossido zinco" propone zinco ossido', () => {
    expect(tarCercaPA('ossido zinco').map(([k]) => k)).toContain('zinco ossido');
  });
});

describe('invTrovaPerPrezzo — inventario senza somiglianza vaga (review v164)', () => {
  const inv = [ { nome: 'Acido acetilsalicilico', prezzo: 0.5, unit: 'g' },
                { nome: 'Acqua purificata', prezzo: 0.002, unit: 'ml' },
                { nome: 'Acido ialuronico', prezzo: 4.5, unit: 'g' } ];
  it('acido ialuronico trova sé stesso, non l\'acetilsalicilico', () => {
    expect(invTrovaPerPrezzo('Acido ialuronico', inv).nome).toBe('Acido ialuronico');
    expect(invTrovaPerPrezzo('Acido ialuronico', inv.slice(0, 2))).toBe(null);
  });
  it('acqua di rose non trova l\'acqua purificata', () => {
    expect(invTrovaPerPrezzo('Acqua di rose', inv)).toBe(null);
  });
});

// Review v165.
import { invGetPrezzo as _ig } from '../pricing.js';
describe('trovaVoceAllegatoA — review v165', () => {
  it('nomi corti non diventano un\'altra sostanza (parole intere, voce che inizia col nome)', () => {
    for (const n of ['Timo', 'Cacao', 'Gel', 'Caff', 'Limone'])
      expect([n, trovaVoceAllegatoA(n)]).toEqual([n, null]);
    expect(trovaVoceAllegatoA('Mentolo')).toBe('mentolo naturale');      // restano
    expect(trovaVoceAllegatoA('Lanolina')).toBe('lanolina anidra');
  });

  it('numeri: purezza o quantità innocue, concentrazioni no', () => {
    expect(trovaVoceAllegatoA('Zinco ossido 99,5%')).toBe('zinco ossido');
    expect(trovaVoceAllegatoA('Talco 500 g')).toBe('talco');
    expect(trovaVoceAllegatoA('Sorbitolo 70%')).toBe(null);
    expect(trovaVoceAllegatoA('Sodio cloruro 0,9%')).toBe(null);
    expect(trovaVoceAllegatoA('Fenolo 5%')).toBe(null);
  });

  it('"Ac." si legge "acido"', () => {
    expect(trovaVoceAllegatoA('Ac. salicilico')).toBe('acido salicilico');
  });
});

describe('invTrovaPerPrezzo — review v165', () => {
  it('voce d\'inventario contenuta nel nome: solo aggiunte innocue', () => {
    expect(invTrovaPerPrezzo('Acqua di rose', [{ nome: 'Acqua', prezzo: 0.002 }])).toBe(null);
    expect(invTrovaPerPrezzo('Olio di ricino idrogenato', [{ nome: 'Olio di ricino', prezzo: 0.02 }])).toBe(null);
    expect(invTrovaPerPrezzo('Minoxidil F.U.', [{ nome: 'Minoxidil', prezzo: 0.39 }]).nome).toBe('Minoxidil');
  });

  it('nome generico contenuto in più voci con prezzi diversi: nessuna', () => {
    const inv = [{ nome: 'Olio di jojoba', prezzo: 0.1 }, { nome: 'Olio di argan', prezzo: 0.2 }];
    expect(invTrovaPerPrezzo('Olio', inv)).toBe(null);
    expect(invTrovaPerPrezzo('Etanolo', [{ nome: 'Etanolo 96°', prezzo: 0.015 }]).nome).toBe('Etanolo 96°');
  });
});

describe('tarCercaPA / vociAllegatoAPerRicerca — review v165', () => {
  it('suggerimenti a parole intere o inizio parola, da 3 lettere', () => {
    expect(tarCercaPA('tal').map(([k]) => k)).toContain('talco');
    expect(tarCercaPA('ossido di zinco').map(([k]) => k)).toContain('zinco ossido');
  });
});
