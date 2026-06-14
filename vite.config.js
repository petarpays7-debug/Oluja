import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  build: {
    target: 'es2019',
    outDir: 'dist',
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          gsap: ['gsap'],
          three: ['three']
        }
      }
    }
  },
  server: {
    host: true,
    port: 5173
  }
});
