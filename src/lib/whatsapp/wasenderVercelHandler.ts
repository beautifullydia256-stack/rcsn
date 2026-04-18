/**
 * Vercel serverless entry (bundled to api/webhooks/wasender.mjs — see scripts/bundle-wasender-webhook.cjs).
 * POST /api/webhooks/wasender
 *
 * Do not add app/api/webhooks/wasender/route.ts: Vercel can compile it to api/webhooks/wasender.js
 * with broken ../../src imports and shadow this bundle.
 */
import { createWasenderProvider } from './wasenderClient';
import { processInboundMessage } from './botEngine';
import { toUgandaE164FromDigits } from './normalizePhone';
import { extractInboundPayload } from './parseInboundPayload';
import { getSupabaseAdmin } from './supabaseAdmin';

export const config = { runtime: 'nodejs', maxDuration: 60 };

type VercelReq = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: unknown;
};

type VercelRes = {
  status: (n: number) => VercelRes;
  setHeader: (k: string, v: string) => void;
  json: (x: unknown) => void;
  end: (s?: string) => void;
};

function headerValue(req: VercelReq, name: string): string | undefined {
  const h = req.headers;
  if (!h) return undefined;
  const v = h[name.toLowerCase()] ?? h[name];
  if (Array.isArray(v)) return v[0];
  return v;
}

function parseJsonBody(req: VercelReq): unknown {
  const raw = req.body;
  if (raw == null) return undefined;
  if (typeof raw === 'object' && !Buffer.isBuffer(raw)) return raw;
  const s = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw);
  return JSON.parse(s);
}

export default async function handler(req: VercelReq, res: VercelRes) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secret = process.env.WASENDER_WEBHOOK_SECRET;
  if (secret) {
    const sig = headerValue(req, 'x-webhook-signature');
    if (sig !== secret) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  let body: unknown;
  try {
    body = parseJsonBody(req);
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const inbound = extractInboundPayload(body);
  if (!inbound) {
    return res.status(200).json({ ok: true, ignored: true });
  }

  const { fromDigits, text } = inbound;
  const waE164 = toUgandaE164FromDigits(fromDigits);

  try {
    const admin = getSupabaseAdmin();
    const msgs = await processInboundMessage(admin, fromDigits, waE164, text);
    const wa = createWasenderProvider();
    for (const m of msgs) {
      if (m.type === 'text') {
        const r = await wa.sendText({ toE164: waE164, text: m.text });
        if (!r.ok) console.warn('[wasender] sendText failed', r.error);
      } else {
        const r = await wa.sendDocument({
          toE164: waE164,
          documentUrl: m.url,
          fileName: m.fileName,
          caption: m.caption,
        });
        if (!r.ok) console.warn('[wasender] sendDocument failed', r.error);
      }
    }
  } catch (e) {
    console.error('[wasender webhook]', e);
  }

  return res.status(200).json({ ok: true });
}
