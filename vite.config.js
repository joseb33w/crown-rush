import { defineConfig } from 'vite';

// Relative base so the build works when served from a sub-path (R2 preview, GH Pages, etc.).
export default defineConfig({
  base: './',
  build: {
    target: 'es2019',
    assetsInlineLimit: 0,
  },
});
