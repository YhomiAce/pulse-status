import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import { parseEnv } from './src/env-schema.ts';

const DEV_PORT = 5107;

export default defineConfig(({ mode }) => {
  // Fail fast (dev server and build) when VITE_API_URL is missing or invalid.
  // loadEnv reads .env files and lets real environment variables win.
  parseEnv(loadEnv(mode, process.cwd(), 'VITE_'));

  return {
    plugins: [vue()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: { host: '0.0.0.0', port: DEV_PORT, strictPort: true },
    preview: { host: '0.0.0.0', port: DEV_PORT, strictPort: true },
  };
});
