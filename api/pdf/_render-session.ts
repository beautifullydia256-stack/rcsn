/**
 * GET /api/pdf/render-session?sessionId=&token=
 * Returns staged JSON for the SPA print route, then deletes the row (one-time read).
 * Used by /print/heritage-pdf so Puppeteer never POSTs large HTML (avoids 413).
 */

import { createClient } from '@supabase/supabase-js';

export const config = { maxDuration: 60 };

type Req = { method?: string; query?: Record<string, string | string[] | undefined> };
type Res = {
  setHeader: (k: string, v: string) => void;
  status: (n: number) => Res;
  json: (x: unknown) => void;
  end: (body?: string) => void;
};

export default async function handler(req: Req, res: Res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Missing Supabase configuration' });
  }

  const q = req.query || {};
  const sessionId = typeof q.sessionId === 'string' ? q.sessionId : Array.isArray(q.sessionId) ? q.sessionId[0] : '';
  const token = typeof q.token === 'string' ? q.token : Array.isArray(q.token) ? q.token[0] : '';
  if (!sessionId || !token) {
    return res.status(400).json({ error: 'sessionId and token are required' });
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from('pdf_render_sessions')
    .delete()
    .eq('id', sessionId)
    .eq('read_token', token)
    .select('payload, expires_at')
    .maybeSingle();

  if (error) {
    console.error('pdf_render_sessions delete/select:', error.message);
    return res.status(500).json({ error: 'Failed to load render session' });
  }

  if (!data) {
    return res.status(404).json({ error: 'Session not found or already used' });
  }

  const exp = data.expires_at ? new Date(data.expires_at as string).getTime() : 0;
  if (exp && exp < Date.now()) {
    return res.status(410).json({ error: 'Session expired' });
  }

  return res.status(200).json(data.payload);
}
