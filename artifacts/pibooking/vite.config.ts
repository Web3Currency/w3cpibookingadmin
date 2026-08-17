import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';
import { cartographer } from '@replit/vite-plugin-cartographer';
import { devBanner } from '@replit/vite-plugin-dev-banner';

const projectRoot = path.resolve(import.meta.dirname, '..', '..');
const frontendRoot = path.resolve(import.meta.dirname);

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, projectRoot, '');
  const port = Number(env.PORT || process.env.PORT || '3000');
  const basePath = env.BASE_PATH || '/';
  const apiTarget = env.VITE_API_URL || 'http://localhost:8080';

  return {
    base: basePath,
    envDir: projectRoot,
    plugins: [
      react(),
      tailwindcss(),
      runtimeErrorOverlay(),
      ...(mode !== 'production' && process.env.REPL_ID !== undefined
        ? [
            cartographer({ root: projectRoot }),
            devBanner(),
          ]
        : []),
    ],
    resolve: {
      alias: {
        '@': path.resolve(frontendRoot, 'src'),
        '@assets': path.resolve(projectRoot, 'attached_assets'),
      },
      dedupe: ['react', 'react-dom'],
    },
    root: frontendRoot,
    build: {
      outDir: path.resolve(frontendRoot, 'dist/public'),
      emptyOutDir: true,
    },
    server: {
      port,
      strictPort: true,
      host: '0.0.0.0',
      allowedHosts: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
      fs: {
        strict: true,
      },
    },
    preview: {
      port,
      host: '0.0.0.0',
      allowedHosts: true,
    },
  };
});
