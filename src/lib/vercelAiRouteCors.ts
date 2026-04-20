/**
 * CORS for Vercel api/ai/* when the SPA is on www and API is on another host
 * (same idea as app/api/admin/create-user-account).
 */
export function applyAiRouteCorsHeaders(res: any): void {
  const origin = process.env.CORS_ORIGIN || 'https://www.pwezacore.com';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS, GET');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

/** Call after applyAiRouteCorsHeaders. Returns true if response was sent (OPTIONS). */
export function handleAiRouteOptions(req: { method?: string }, res: any): boolean {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
