import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const projectRoot = path.resolve(import.meta.dirname, '..', '..');
const frontendRoot = path.resolve(import.meta.dirname);

export default defineConfig(({ mode }) => {
  // The repository root is the canonical environment location. This keeps
  // local Termux, Replit, Google AI Studio, and Vercel builds consistent.
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
      ...(mode !== 'production' &&
      process.env.REPL_ID !== undefined
        ? [
            await import('@replit/vite-plugin-cartographer').then((m) =>
              m.cartographer({
                root: projectRoot,
              }),
            ),
            await import('@replit/vite-plugin-dev-banner').then((m) =>
              m.devBanner(),
            ),
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
