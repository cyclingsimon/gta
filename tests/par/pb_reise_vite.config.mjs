// P-B Testszene Schnellreise. Bau: npx vite build -c tests/par/pb_reise_vite.config.mjs → dist_pb_reise/ (nicht committen); danach karte.* hineinkopieren
import { defineConfig } from 'vite';
import { resolve } from 'path';
export default defineConfig({
  root: resolve(import.meta.dirname), base: './', publicDir: false,
  build: { outDir: resolve(import.meta.dirname, '../../dist_pb_reise'), emptyOutDir: true, rollupOptions: { input: resolve(import.meta.dirname, 'pb_reise.html') } },
});
