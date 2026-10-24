// Allegato A e dose nel nome (v169): per il prezzo di legge (per grammo) una dose
// in mg non cambia la sostanza ("Acido salicilico 5 mg" → acido salicilico);
// per l'inventario sì ("Melatonina 5 mg" non è "Melatonina").
import { describe, it, expect } from 'vitest';
import { trovaVoceAllegatoA, invTrovaPerPrezzo } from '../pricing.js';

describe('Dose in mg', () => {
  it('Allegato A: la dose non toglie il prezzo di legge', () => {
    expect(trovaVoceAllegatoA('Acido salicilico 5 mg')).toBe('acido salicilico');
    expect(trovaVoceAllegatoA('Acido ascorbico 500 mg')).toBe('acido ascorbico');
  });
  it('inventario: la dose resta un altro prodotto', () => {
    expect(invTrovaPerPrezzo('Melatonina 5 mg', [ { nome: 'Melatonina', prezzo: 2 } ])).toBe(null);
  });
});
