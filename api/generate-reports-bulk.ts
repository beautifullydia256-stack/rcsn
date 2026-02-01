/**
 * Proxy to Supabase Edge Function generate-reports-bulk.
 * Avoids CORS: browser calls same-origin /api/generate-reports-bulk; server calls Supabase.
 * In Vercel: add SUPABASE_URL and SUPABASE_ANON_KEY (or VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)
 * to Project → Settings → Environment Variables for Production/Preview.
 */
type Req = { method?: string; body?: Record<string, unknown> };
type Res = { setHeader: (k: string, v: string) => void; status: (n: number) => Res; json: (x: unknown) => void; end: () => void };

function getEnv(name: string): string {
  return (
    process.env[name] ||
    process.env[`VITE_${name}`] ||
    ''
  ).trim();
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = getEnv('SUPABASE_URL');
  const supabaseAnonKey = getEnv('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({
      error: 'API missing Supabase config. In Vercel, set SUPABASE_URL and SUPABASE_ANON_KEY (or VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) in Environment Variables.',
    });
  }

  let body = req.body as { snapshotId?: string; templateId?: string; classNames?: string[]; studentIds?: string[] } | undefined;
  if (body === undefined || body === null) {
    body = {};
  }
  const snapshotId = body?.snapshotId;
  if (!snapshotId || typeof snapshotId !== 'string') {
    return res.status(400).json({ error: 'snapshotId is required' });
  }

  try {
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
      return res.status(fnRes.status).json({ error: errMsg || `Supabase function returned ${fnRes.status}` });
    }
    return res.status(200).json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Proxy request failed';
    return res.status(500).json({ error: message });
  }
}
