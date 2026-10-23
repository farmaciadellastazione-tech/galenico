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

  it('inventario: il prezzo arriva se il nome è quello dell\'inventario (anche con aggiunte)', () => {
    const inv = [{ nome: 'Acido ialuronico', prezzo: 4.5, unit: 'g', lotto: 'L1' }];
    expect(invGetPrezzo('Acido ialuronico', inv)).toMatchObject({ prezzo: 4.5, fonte: 'inventario' });
    expect(invGetPrezzo('Acido ialuronico basso PM', inv)).toMatchObject({ prezzo: 4.5, fonte: 'inventario' });
  });

  it('Allegato A resta prioritario sull\'inventario', () => {
    const inv = [{ nome: 'Acido salicilico', prezzo: 9.99, unit: 'g' }];
    expect(invGetPrezzo('Acido salicilico', inv)).toMatchObject({ fonte: 'allegatoA', prezzo: ALLEGATO_A['acido salicilico'] });
  });
});
