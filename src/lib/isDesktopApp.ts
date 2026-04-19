/** True when built with `VITE_DESKTOP_MODE=true` (Electron school desktop build). */
export const isDesktopApp = import.meta.env.VITE_DESKTOP_MODE === 'true';
