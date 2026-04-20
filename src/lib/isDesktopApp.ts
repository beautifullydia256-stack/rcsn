/**
 * True when built with `VITE_DESKTOP_MODE=true` (Electron school desktop build).
 * Desktop shares the same `/dashboard/**` routes and permissions as web; `App.tsx` only gates
 * marketing/public/registration routes when this is true.
 */
export const isDesktopApp = import.meta.env.VITE_DESKTOP_MODE === 'true';
