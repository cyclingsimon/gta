// P-A Testseiten ab Lauf 8 (tests/par/pa_*). Bau: npx vite build -c tests/par/pa_vite.config.mjs → dist_pa_lm/ (nicht committen)
import { defineConfig } from 'vite';
import { resolve } from 'path';
export default defineConfig({
  root: resolve(import.meta.dirname), base: './', publicDir: false,
  build: { outDir: resolve(import.meta.dirname, '../../dist_pa_lm'), emptyOutDir: true, rollupOptions: { input: { landmarks: resolve(import.meta.dirname, 'pa_landmarks.html') } }, chunkSizeWarningLimit: 4000 },
});
