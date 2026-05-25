import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Fase 1: tutto puro, niente DOM. Node basta ed è più veloce di jsdom.
    // Quando aggiungeremo test che dipendono da DOM (es. calcTariff refactored),
    // valutare 'jsdom' o environment per-file con il commento `// @vitest-environment jsdom`.
    environment: 'node',
    include: ['tests/**/*.test.js'],
  },
});
