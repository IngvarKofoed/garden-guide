import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const apiTarget = process.env['VITE_API_TARGET'] ?? 'http://localhost:5600';
const devPort = Number(process.env['VITE_PORT'] ?? 5601);
const devHostEnv = process.env['VITE_HOST'];
const devHost: string | boolean = devHostEnv ? devHostEnv : true;

export default defineConfig({
  plugins: [react()],
  server: {
    host: devHost,
    port: devPort,
    strictPort: true,
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
      '/healthz': { target: apiTarget, changeOrigin: true },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
