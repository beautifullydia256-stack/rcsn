import { registerApiUrl } from './registerApiOrigin';

/**
 * Base URL for AI planner / exam / PDF API calls.
 * Delegates to registerApiUrl() so it also resolves correctly under Electron's
 * `file:` protocol (desktop app), not just when VITE_API_URL/VITE_API_ORIGIN is set.
 */
export function aiPlannerApiUrl(path: string): string {
  return registerApiUrl(path);
}
