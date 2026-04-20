/**
 * Base URL for AI planner / exam / PDF API calls.
 * When VITE_API_URL or VITE_API_ORIGIN is set (API on another host), use it; otherwise same-origin.
 */
export function aiPlannerApiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const raw =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_ORIGIN) ||
    '';
  const base = String(raw).replace(/\/$/, '').trim();
  return base ? `${base}${p}` : p;
}
