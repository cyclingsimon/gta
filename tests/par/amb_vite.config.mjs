// P-B Pegeltest (OfflineAudioContext). Bau: npx vite build -c tests/par/amb_vite.config.mjs → dist_pb_amb/ (nicht committen)
// Lauf: python3 tests/par/amb_offline.py
import { defineConfig } from 'vite';
import { resolve } from 'path';
export default defineConfig({
  root: resolve(import.meta.dirname),
  base: './',
  publicDir: false,
  build: { outDir: resolve(import.meta.dirname, '../../dist_pb_amb'), emptyOutDir: true, rollupOptions: { input: resolve(import.meta.dirname, 'amb.html') } },
});
