/**
 * Bundles the Wasender Vercel handler into a single ESM file so runtime does not
 * need /src on disk (Vercel transpiles api/*.ts but does not ship src/ imports).
 */
const esbuild = require('esbuild');
const path = require('path');

esbuild
  .build({
    entryPoints: [path.join(__dirname, '../src/lib/whatsapp/wasenderVercelHandler.ts')],
    bundle: true,
    platform: 'node',
    target: 'node18',
    format: 'esm',
    outfile: path.join(__dirname, '../api/webhooks/wasender.mjs'),
    logLevel: 'info',
  })
  .catch(() => process.exit(1));
