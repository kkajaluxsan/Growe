import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        timeout: 60_000,
        proxyTimeout: 60_000,
      },
      '/uploads': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
        timeout: 60_000,
        proxyTimeout: 60_000,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:5001',
        ws: true,
      },
    },
  },
});
