/**
 * Sends a one-off test email via Resend.
 * Usage: node scripts/test-resend.mjs you@example.com
 * Loads RESEND_API_KEY from .env.local if present (same keys as production).
 */
import { readFileSync, existsSync } from 'fs';
import { createRequire } from 'module';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const { buildEmailHtml } = require(join(dirname(fileURLToPath(import.meta.url)), '..', 'lib', 'emailHtml.js'));

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env.local');
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (k && !process.env[k]) process.env[k] = v;
  }
}

const to = process.argv[2];
if (!to) {
  console.error('Usage: npm run test:resend -- your@email.com');
  process.exit(1);
}

const apiKey = process.env.RESEND_API_KEY?.trim();
const from = process.env.RESEND_FROM?.trim() || 'PwezaCore <noreply@pwezacore.com>';
if (!apiKey) {
  console.error('Missing RESEND_API_KEY. Add to .env.local: RESEND_API_KEY=re_...');
  process.exit(1);
}

const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from,
    to: [to],
    subject: 'PwezaCore — Resend test',
    html: buildEmailHtml('<p>If you received this, Resend is configured correctly.</p>'),
  }),
});

const data = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(res.status, data);
  process.exit(1);
}
console.log('Sent. Resend id:', data.id || data);
