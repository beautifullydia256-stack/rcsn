/** Defaults for admin list/dashboard queries — align with accountant pages (~2 min fresh window). */
export const ADMIN_STALE_TIME_MS = 2 * 60 * 1000;
/** Keep directory-sized payloads after idle navigation (matches prior per-page gc). */
export const ADMIN_GC_TIME_MS = 1000 * 60 * 60 * 24;
