/**
 * Vercel serverless: GET/POST /api/integrations/schoolpay/settings
 * Same behavior as app/api/.../settings (Vite www deploy does not bundle Next app routes).
 */
import schoolPaySession from '../../../src/lib/schoolpayResolveSession.js';
import settingsHttp from '../../../src/lib/schoolpay/settingsHttp.js';

const { resolveSchoolPayApiSession } = schoolPaySession;
const { runSchoolPaySettingsGet, runSchoolPaySettingsPost, schoolPayPublicOriginFromHeaders } = settingsHttp;

export const config = { runtime: 'nodejs' };

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

function requestPublicOrigin(req: Req): string | undefined {
  return schoolPayPublicOriginFromHeaders((name) => getHeader(req, name));
}

export default async function handler(req: Req, res: Res) {
  const origin = process.env.CORS_ORIGIN || 'https://www.pwezacore.com';
  const cors: Record<string, string> = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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

    const resolved = await resolveSchoolPayApiSession({
      authorizationHeader: getHeader(req, 'authorization'),
      cookieHeader: getHeader(req, 'cookie'),
    });
    if (!resolved.ok) {
      setCors();
      res.status(resolved.status).json(resolved.body);
      return;
    }

    const originCtx = { publicOriginHint: requestPublicOrigin(req) };

    if (req.method === 'GET') {
      setCors();
      res.status(200).json(await runSchoolPaySettingsGet(resolved.session, originCtx));
      return;
    }

    if (req.method === 'POST') {
      const body = parseBody(req) as Parameters<typeof runSchoolPaySettingsPost>[1];
      const { status, json } = await runSchoolPaySettingsPost(resolved.session, body, originCtx);
      setCors();
      res.status(status).json(json);
      return;
    }

    setCors();
    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('[schoolpay settings vercel]', e);
    setCors();
    res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
  }
}
