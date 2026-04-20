/** Base URL for registration API routes (Next server). Defaults to current origin. */
export function registerApiUrl(path: string): string {
  const p = path.startsWith('/') ? path : `/${path}`;
  const fromEnv =
    (typeof import.meta !== 'undefined' &&
      (import.meta as ImportMeta & { env?: Record<string, string> }).env?.VITE_API_ORIGIN) ||
    (typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_SITE_URL : undefined);
  const base = (fromEnv || (typeof window !== 'undefined' ? window.location.origin : '') || '').replace(
    /\/$/,
    ''
  );
  return `${base}${p}`;
}
