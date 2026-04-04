/**
 * Helpers for report template selection (from older app report generators).
 * Used to decide which template to render for a given class.
 */

export function isSecondaryClass(className: string): boolean {
  if (!className) return false;
  return /^S\d/i.test(className.trim());
}

export function isOLevelClass(className: string): boolean {
  if (!className) return false;
  const trimmed = className.trim();
  return /^(senior\s*[1-4]|s\.?\s*[1-4])/i.test(trimmed);
}

/** Senior 5–6 / S.5–S.6 — A-Level (UACE-style) stream; matches leading class label before stream suffix. */
export function isALevelClass(className: string): boolean {
  if (!className) return false;
  const trimmed = className.trim();
  return /^(senior\s*[56]|s\.?\s*[56])/i.test(trimmed);
}

/**
 * For secondary schools only: which exam-entry track applies from the class name.
 * Defaults to O-Level when the name does not clearly match S1–4 nor S5–6 (e.g. custom labels).
 */
export function getSecondaryExamEntryTrack(className: string): 'olevel' | 'alevel' {
  if (isALevelClass(className)) return 'alevel';
  if (isOLevelClass(className)) return 'olevel';
  return 'olevel';
}

export function isLowerSectionPrimary(className: string): boolean {
  if (!className) return false;
  return /(primary\s*1|primary\s*2|primary\s*3|^p\.?\s*1$|^p\.?\s*2$|^p\.?\s*3$)/i.test(className.trim());
}

export function lightenColor(hex: string): string {
  hex = hex.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const lighten = (color: number) => Math.min(255, Math.round(color + (255 - color) * 0.5));
  const toHex = (n: number) => {
    const h = n.toString(16);
    return h.length === 1 ? '0' + h : h;
  };
  return `#${toHex(lighten(r))}${toHex(lighten(g))}${toHex(lighten(b))}`;
}
