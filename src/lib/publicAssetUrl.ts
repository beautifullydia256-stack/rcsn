/**
 * URL for static files from `public/` (copied to `dist/` root by Vite).
 * Required for Electron desktop builds where `base` is `./` and absolute `/foo` paths break under `file://`.
 */
export function publicAssetUrl(pathFromPublicRoot: string): string {
  const trimmed = pathFromPublicRoot.replace(/^\/+/, '');
  const base = import.meta.env.BASE_URL || '/';
  if (base.endsWith('/')) {
    return `${base}${trimmed}`;
  }
  return `${base}/${trimmed}`;
}
