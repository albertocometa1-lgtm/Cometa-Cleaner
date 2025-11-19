import { defineConfig } from 'vite';
import { getBuildHash } from './scripts/get-build-hash.js';

const buildHash = getBuildHash();

export default defineConfig({
  server: {
    host: true,
    port: 5173
  },
  preview: {
    host: true,
    port: 4173
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'esnext'
  },
  define: {
    __BUILD_HASH__: JSON.stringify(buildHash)
  },
  publicDir: 'public'
});
