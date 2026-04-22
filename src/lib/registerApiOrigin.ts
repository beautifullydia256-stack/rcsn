/** Base URL for Next.js API routes when the UI is not served by the same Next server (Vite SPA, Electron, etc.). */
export function getPwezaCoreApiOrigin(): string {
  const meta =
    typeof import.meta !== 'undefined'
      ? (import.meta as ImportMeta & { env?: Record<string, string> }).env
      : undefined;
  const fromEnv = [meta?.VITE_API_URL, meta?.VITE_API_ORIGIN, meta?.NEXT_PUBLIC_SITE_URL]
    .map((s) => (s == null ? '' : String(s).trim().replace(/\/$/, '')))
    .find(Boolean);
  if (fromEnv) return fromEnv;

  if (typeof window !== 'undefined') {
    const { protocol, origin } = window.location;
    if (protocol !== 'file:' && origin && origin !== 'null') {
      return origin.replace(/\/$/, '');
    }
  }

  return '';
}

/**
 * Absolute URL for Next `/api/*` routes.
 * - Prefer `VITE_API_URL`, then `VITE_API_ORIGIN`, then `NEXT_PUBLIC_SITE_URL` (Vite `envPrefix` exposes both VITE_ and NEXT_PUBLIC_).
 * - Else same browser origin when not `file:` (works with Vite dev proxy to Next).
 * - Else relative path only (e.g. SSR / misconfigured file:// — set VITE_API_ORIGIN in desktop builds).
 */
export function registerApiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const base = getPwezaCoreApiOrigin();
  if (base) return `${base}${p}`;
  return p;
}
