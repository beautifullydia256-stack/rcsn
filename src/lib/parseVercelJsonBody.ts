/** Best-effort JSON body for Vercel Node serverless (string, object, or Buffer). */
export function parseVercelJsonBody(req: { body?: unknown }): Record<string, unknown> {
  const raw = req.body;
  if (raw == null) return {};
  if (typeof raw === 'object' && !Buffer.isBuffer(raw)) {
    return raw as Record<string, unknown>;
  }
  const s = Buffer.isBuffer(raw) ? raw.toString('utf8') : String(raw);
  if (!s.trim()) return {};
  try {
    const v = JSON.parse(s) as unknown;
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
