/**
 * Vercel serverless: POST /api/webhooks/schoolpay/:token
 * SchoolPay server → PwezaCore (same URL as admin when www is Vite + api/).
 */
import { runSchoolPayWebhookPost } from '../../../src/lib/schoolpay/webhookHttp.js';
import type { SchoolPayWebhookPayload } from '../../../src/lib/schoolpay/types.js';

export const config = { runtime: 'nodejs', maxDuration: 60 };

type Req = {
  method?: string;
  query?: Record<string, string | string[] | undefined>;
  body?: string | Record<string, unknown>;
};
type Res = {
  status: (n: number) => Res;
  json: (x: unknown) => void;
};

function parseBody(req: Req): SchoolPayWebhookPayload | null {
  const b = req.body;
  if (b == null) return null;
  if (typeof b === 'object' && !Array.isArray(b)) return b as SchoolPayWebhookPayload;
  if (typeof b === 'string') {
    try {
      return JSON.parse(b || '{}') as SchoolPayWebhookPayload;
    } catch {
      return null;
    }
  }
  return null;
}

function getToken(req: Req): string | undefined {
  const q = req.query;
  if (!q) return undefined;
  const t = q.token;
  if (Array.isArray(t)) return t[0];
  return typeof t === 'string' ? t : undefined;
}

export default async function handler(req: Req, res: Res) {
  try {
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }
    const body = parseBody(req);
    if (!body) {
      res.status(400).json({ error: 'invalid_json' });
      return;
    }
    const { status, json } = await runSchoolPayWebhookPost(getToken(req), body);
    res.status(status).json(json);
  } catch (e) {
    console.error('[schoolpay webhook vercel]', e);
    res.status(500).json({ error: 'server_error' });
  }
}
