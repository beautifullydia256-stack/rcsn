/**
 * Vercel serverless: POST /api/integrations/schoolpay/sync
 */
import schoolPaySession from '../../../src/lib/schoolpayResolveSession.js';
import syncHttp from '../../../src/lib/schoolpay/syncHttp.js';

const { resolveSchoolPayApiSession } = schoolPaySession;
const { runSchoolPaySyncPost } = syncHttp;

export const config = { runtime: 'nodejs', maxDuration: 60 };

type Req = {
  method?: string;
  headers?: Record<string, string | string[] | undefined> & { get?: (name: string) => string | null };
  body?: string | Record<string, unknown>;
};
type Res = {
  setHeader: (k: string, v: string | number) => void;
  status: (n: number) => Res;
  json: (x: unknown) => void;
  end: (body?: string) => void;
};

function getHeader(req: Req, name: string): string | undefined {
  const h = req.headers;
  if (!h) return undefined;
  const lower = name.toLowerCase();
  const direct = h[lower] ?? h[name];
  if (Array.isArray(direct)) return direct[0];
  if (typeof direct === 'string') return direct;
  if (typeof h.get === 'function') {
    const v = h.get(name) ?? h.get(lower);
    return v ?? undefined;
  }
  return undefined;
}

function parseBody(req: Req): Record<string, unknown> {
  const b = req.body;
  if (b == null) return {};
  if (typeof b === 'object' && !Array.isArray(b)) return b as Record<string, unknown>;
  if (typeof b === 'string') {
    try {
      return JSON.parse(b || '{}') as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  return {};
}

export default async function handler(req: Req, res: Res) {
  const origin = process.env.CORS_ORIGIN || 'https://www.pwezacore.com';
  const cors: Record<string, string> = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
  const setCors = () => Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));

  try {
    if (req.method === 'OPTIONS') {
      setCors();
      res.status(204).end();
      return;
    }
    if (req.method !== 'POST') {
      setCors();
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const resolved = await resolveSchoolPayApiSession({
      authorizationHeader: getHeader(req, 'authorization'),
      cookieHeader: getHeader(req, 'cookie'),
    });
    if (!resolved.ok) {
      setCors();
      res.status(resolved.status).json(resolved.body);
      return;
    }

    const body = parseBody(req) as { transactionDate?: string; fromDate?: string; toDate?: string };
    const { status, json } = await runSchoolPaySyncPost(resolved.session, body);
    setCors();
    res.status(status).json(json);
  } catch (e) {
    console.error('[schoolpay sync vercel]', e);
    setCors();
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
}
