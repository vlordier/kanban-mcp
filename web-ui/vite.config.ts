import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Main Vite config for development and build
// Note: Unit tests use vitest.config.ts, E2E tests use playwright.config.ts
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    // Only enable proxy when not running E2E tests (which use mocked APIs)
    proxy: process.env.PLAYWRIGHT_TEST
      ? {}
      : {
          '/api': {
            target: 'http://localhost:8221',
            changeOrigin: true,
          },
        },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    minify: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@headlessui/react', '@heroicons/react'],
          dnd: ['@dnd-kit/core', '@dnd-kit/utilities'],
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
