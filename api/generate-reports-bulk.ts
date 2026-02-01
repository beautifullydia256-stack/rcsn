/**
 * Proxy to Supabase Edge Function generate-reports-bulk.
 * Avoids CORS: browser calls same-origin /api/generate-reports-bulk; server calls Supabase.
 * Set SUPABASE_URL and SUPABASE_ANON_KEY in Vercel (or VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).
 */
type Req = { method?: string; body?: Record<string, unknown> };
type Res = { setHeader: (k: string, v: string) => void; status: (n: number) => Res; json: (x: unknown) => void; end: () => void };

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY;

export default async function handler(req: Req, res: Res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return res.status(500).json({
      error: 'Server missing SUPABASE_URL or SUPABASE_ANON_KEY',
    });
  }

  const body = req.body as { snapshotId?: string; templateId?: string; classNames?: string[]; studentIds?: string[] };
  const snapshotId = body?.snapshotId;
  if (!snapshotId) {
    return res.status(400).json({ error: 'snapshotId is required' });
  }

  try {
    const fnRes = await fetch(`${SUPABASE_URL}/functions/v1/generate-reports-bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        snapshotId,
        templateId: body.templateId,
        classNames: body.classNames,
        studentIds: body.studentIds,
      }),
    });

    const data = await fnRes.json().catch(() => ({}));
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (!fnRes.ok) {
      return res.status(fnRes.status).json(data?.error ? { error: data.error } : data);
    }
    return res.status(200).json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Proxy request failed';
    return res.status(500).json({ error: message });
  }
}
