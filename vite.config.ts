import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

/** Web (Vercel): do not set VITE_DESKTOP_MODE — BrowserRouter + base '/'. Desktop: VITE_DESKTOP_MODE=true + HashRouter + base './'. */
const desktop = process.env.VITE_DESKTOP_MODE === 'true';

export default defineConfig({
  /** Relative asset paths for Electron `file://` loading when building the desktop bundle. */
  base: desktop ? './' : '/',
  plugins: [react()],
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    open: true,
    /** Forward `/api/*` to Next (`npm run dev:next` on 3001) so SchoolPay and other routes work without VITE_API_ORIGIN locally. */
    proxy: {
      '/api': {
        target: process.env.VITE_NEXT_API_TARGET || 'http://127.0.0.1:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (_err, req, res) => {
            if (res && !('headersSent' in res && res.headersSent)) {
              const url = req.url || '';
              if (url.includes('schoolpay/settings')) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(
                  JSON.stringify({
                    enabled: false,
                    schoolpaySchoolCode: '',
                    hasApiPassword: false,
                    webhookUrl: '',
                    webhookToken: '',
                    lastSyncAt: null,
                    lastSyncError: null,
                  })
                );
                return;
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ ok: false, error: 'Next.js dev server (port 3001) is offline' }));
            }
          });
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'ui-vendor': ['framer-motion', 'lucide-react'],
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js'],
  },
});




