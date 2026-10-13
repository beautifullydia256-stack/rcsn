import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import dotenv from 'dotenv';

try {
  dotenv.config();
  dotenv.config({ path: '.env.local' });
} catch (_) {}

/** Web (Vercel): do not set VITE_DESKTOP_MODE — BrowserRouter + base '/'. Desktop: VITE_DESKTOP_MODE=true + HashRouter + base './'. */
const desktop = process.env.VITE_DESKTOP_MODE === 'true';

function admissionsDevEmailPlugin() {
  return {
    name: 'admissions-dev-email-plugin',
    configureServer(server: any) {
      server.middlewares.use(async (req: any, res: any, next: any) => {
        // Decorate res with Express/Vercel helper methods if missing in raw Node http server
        if (typeof res.status !== 'function') {
          res.status = function (code: number) {
            res.statusCode = code;
            return res;
          };
        }
        if (typeof res.json !== 'function') {
          res.json = function (payload: any) {
            if (!res.headersSent) {
              res.setHeader('Content-Type', 'application/json');
            }
            res.end(JSON.stringify(payload));
            return res;
          };
        }
        if (typeof res.send !== 'function') {
          res.send = function (payload: any) {
            if (!res.headersSent) {
              res.setHeader('Content-Type', 'text/plain');
            }
            res.end(typeof payload === 'object' ? JSON.stringify(payload) : String(payload));
            return res;
          };
        }

        if (req.url && req.url.startsWith('/api/admissions/send-email') && req.method === 'POST') {
          const chunks: any[] = [];
          req.on('data', (c: any) => chunks.push(c));
          req.on('end', async () => {
            try {
              const bodyStr = Buffer.concat(chunks).toString();
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const handler = require(path.resolve(__dirname, './api/admissions/_send-email.js'));
              req.body = JSON.parse(bodyStr || '{}');
              await handler(req, res);
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: String(err) }));
            }
          });
          return;
        }
        if (req.url && req.url.startsWith('/api/misc')) {
          const chunks: any[] = [];
          req.on('data', (c: any) => chunks.push(c));
          req.on('end', async () => {
            try {
              const bodyStr = Buffer.concat(chunks).toString();
              delete require.cache[path.resolve(__dirname, './api/misc.js')];
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const handler = require(path.resolve(__dirname, './api/misc.js'));
              req.body = bodyStr ? JSON.parse(bodyStr || '{}') : {};
              const parsedUrl = new URL(req.url, 'http://localhost:3000');
              req.query = Object.fromEntries(parsedUrl.searchParams.entries());
              await handler(req, res);
            } catch (err) {
              res.writeHead(500, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: String(err) }));
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  /** Relative asset paths for Electron `file://` loading when building the desktop bundle. */
  base: desktop ? './' : '/',
  plugins: [react(), admissionsDevEmailPlugin()],
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




