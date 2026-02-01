/**
 * Proxy to Supabase Edge Function generate-reports-bulk.
 * Avoids CORS: browser calls same-origin /api/generate-reports-bulk; server calls Supabase.
 * In Vercel: add SUPABASE_URL and SUPABASE_ANON_KEY (or VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
 * to Project → Settings → Environment Variables for Production/Preview.
 */
type Req = { method?: string; body?: Record<string, unknown> };
type Res = { setHeader: (k: string, v: string) => void; status: (n: number) => Res; json: (x: unknown) => void; end: () => void };

const ENV_KEYS_URL = ['SUPABASE_URL', 'VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL'] as const;
const ENV_KEYS_ANON = ['SUPABASE_ANON_KEY', 'VITE_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'] as const;

function safeEnv(): Record<string, string | undefined> {
  try {
    return (typeof process !== 'undefined' && process && process.env) ? process.env as Record<string, string | undefined> : {};
  } catch {
    return {};
  }
}

function getEnv(env: Record<string, string | undefined>, key: string): string {
  const candidates = [
    env[key],
    env[`VITE_${key}`],
    env[`NEXT_PUBLIC_${key}`],
  ].filter(Boolean) as string[];
  return (candidates[0] || '').trim();
}

function envDebug(env: Record<string, string | undefined>): string {
  const url = ENV_KEYS_URL.map((k) => `${k}=${env[k] ? 'set' : 'missing'}`).join(', ');
  const anon = ENV_KEYS_ANON.map((k) => `${k}=${env[k] ? 'set' : 'missing'}`).join(', ');
  return `Env in function: ${url}; ${anon}.`;
}

function sendJson(res: Res, status: number, obj: { error?: string; [k: string]: unknown }): void {
  res.setHeader('Content-Type', 'application/json');
  res.status(status).json(obj);
}

export default async function handler(req: Req, res: Res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      return res.status(200).end();
    }

    if (req.method !== 'POST') {
      return sendJson(res, 405, { error: 'Method not allowed' });
    }

    let body = req?.body as {
      snapshotId?: string;
      templateId?: string;
      classNames?: string[];
      studentIds?: string[];
      supabaseUrl?: string;
      supabaseAnonKey?: string;
    } | undefined;
    if (body === undefined || body === null) {
      body = {};
    }
    const snapshotId = body?.snapshotId;
    if (!snapshotId || typeof snapshotId !== 'string') {
      return sendJson(res, 400, { error: 'snapshotId is required' });
    }

    // Prefer URL/key from request body (client sends them so we don't rely on Vercel env)
    const env = safeEnv();
    const supabaseUrl =
      (typeof body.supabaseUrl === 'string' && body.supabaseUrl.trim()) ||
      getEnv(env, 'SUPABASE_URL') ||
      '';
    const supabaseAnonKey =
      (typeof body.supabaseAnonKey === 'string' && body.supabaseAnonKey.trim()) ||
      getEnv(env, 'SUPABASE_ANON_KEY') ||
      '';
    if (!supabaseUrl || !supabaseAnonKey) {
      return sendJson(res, 500, {
        error: 'Missing Supabase URL or anon key. Send supabaseUrl and supabaseAnonKey in the request body, or set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel.',
      });
    }

    const fnRes = await fetch(`${supabaseUrl}/functions/v1/generate-reports-bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        snapshotId,
        templateId: body.templateId,
        classNames: body.classNames,
        studentIds: body.studentIds,
      }),
    });

    const data = await fnRes.json().catch(() => ({}));
    const errMsg = typeof data?.error === 'string' ? data.error : undefined;

    if (!fnRes.ok) {
      const statusHint =
        fnRes.status === 401
          ? ' (Wrong Supabase key? Check SUPABASE_ANON_KEY in Vercel env.)'
          : fnRes.status === 404
            ? ' (Supabase Edge Function not deployed? Run: supabase functions deploy generate-reports-bulk)'
            : fnRes.status >= 500
              ? ' (Supabase or network error. Check Supabase Dashboard → Edge Functions → Logs.)'
              : '';
      return sendJson(res, fnRes.status, {
        error: (errMsg || `Report service returned ${fnRes.status}`) + statusHint,
      });
    }
    return sendJson(res, 200, data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    try {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Content-Type', 'application/json');
      res.status(500).json({
        error: `${message} — Check Vercel → Deployments → [latest] → Functions → Logs for details.`,
      });
    } catch {
      // ignore
    }
  }
}
