import { isDesktopApp } from '../lib/isDesktopApp';

/** Paths reachable without a Supabase session (desktop ERP only). */
const DESKTOP_PUBLIC_PATHS = new Set([
  '/',
  '/login',
  '/login/complete-password',
  '/auth/forgot',
  '/auth/recovery-code',
  '/auth/update-password',
  '/auth/callback',
  '/update',
  /** Token-based PDF print; Puppeteer has no Supabase session */
  '/print/heritage-pdf',
]);

function normalizePath(pathname: string): string {
  if (!pathname || pathname === '') return '/';
  const t = pathname.replace(/\/+$/, '');
  return t === '' ? '/' : t;
}

export function isDesktopPublicPath(pathname: string): boolean {
  if (!isDesktopApp) return false;
  return DESKTOP_PUBLIC_PATHS.has(normalizePath(pathname));
}
