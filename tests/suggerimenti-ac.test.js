// Suggerimenti (v169): "ac" scritto come parola è l'inizio di una parola che si
// sta scrivendo, non l'abbreviazione di "acido" ("cellulosa ac…" → acetoftalato).
// Nel prezzo "Ac. salicilico" resta acido salicilico.
import { describe, it, expect } from 'vitest';
import { vociAllegatoAPerRicerca, invVociPerRicerca, trovaVoceAllegatoA } from '../pricing.js';

describe('"ac" nei suggerimenti', () => {
  it('Allegato A: "cellulosa ac" → cellulosa acetoftalato; "ac salicilico" → acido salicilico', () => {
    expect(vociAllegatoAPerRicerca('cellulosa ac')).toContain('cellulosa acetoftalato');
    expect(vociAllegatoAPerRicerca('ac salicilico')).toContain('acido salicilico');
  });
  it('inventario: "zinco ac" → Zinco acetato', () => {
    expect(invVociPerRicerca('zinco ac', [ { nome: 'Zinco acetato', prezzo: 0.1 } ]).map(s => s.nome)).toEqual(['Zinco acetato']);
  });
  it('prezzo: "Ac. salicilico" resta acido salicilico', () => {
    expect(trovaVoceAllegatoA('Ac. salicilico')).toBe('acido salicilico');
  });
});
