// Allegato A (v169): "N mg" è una dose innocua solo da solo; "20 mg/ml" o
// "50 mg/g" sono concentrazioni (un'altra forma), come "2%": niente prezzo di
// legge della sostanza pura.
import { describe, it, expect } from 'vitest';
import { trovaVoceAllegatoA } from '../pricing.js';

describe('mg/ml e mg/g sono concentrazioni', () => {
  it('niente voce dell\'Allegato A per una concentrazione', () => {
    for (const n of ['Lidocaina 20 mg/ml', 'Lidocaina cloridrato 20 mg/ml', 'Caffeina 50 mg/g', 'Lidocaina 2%'])
      expect([n, trovaVoceAllegatoA(n)]).toEqual([n, null]);
  });
  it('la dose da sola resta innocua', () => {
    expect(trovaVoceAllegatoA('Caffeina 50 mg')).toBe('caffeina');
  });
});
