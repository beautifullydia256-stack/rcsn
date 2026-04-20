const WEB_ADMIN_STALE_MS = 2 * 60 * 1000;

/**
 * Electron desktop: longer stale window so route switches reuse React Query cache (tab-like UX).
 * Supabase realtime + `pwezaStore` refresh paths still update when data changes.
 */
export const DESKTOP_DEFAULT_STALE_TIME_MS = 10 * 60 * 1000;

/**
 * Admin list/dashboard queries — web ~2 min; desktop 10 min (aligned with `queryClient` defaults).
 */
export const ADMIN_STALE_TIME_MS =
  import.meta.env.VITE_DESKTOP_MODE === 'true' ? DESKTOP_DEFAULT_STALE_TIME_MS : WEB_ADMIN_STALE_MS;

/** Keep directory-sized payloads after idle navigation (matches prior per-page gc). */
export const ADMIN_GC_TIME_MS = 1000 * 60 * 60 * 24;
