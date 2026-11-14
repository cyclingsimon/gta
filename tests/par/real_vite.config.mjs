// Kleine Testszene P-A (nur Bausteine, keine Welt). Bau: npx vite build -c tests/par/real_vite.config.mjs
// Ergebnis: dist_pa_szene/ (nicht committen), Server: python3 -m http.server 8771 --directory dist_pa_szene
import { defineConfig } from 'vite';
import { resolve } from 'path';
export default defineConfig({
  root: resolve(import.meta.dirname),
  base: './',
  publicDir: false,
  build: { outDir: resolve(import.meta.dirname, '../../dist_pa_szene'), emptyOutDir: true, rollupOptions: { input: resolve(import.meta.dirname, 'real_szene.html') }, chunkSizeWarningLimit: 4000 },
});
