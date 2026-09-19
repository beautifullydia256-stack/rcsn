// ─── Shared design-token system for the Dashboard & Sidebar ───────────────────
// Ported 1:1 from UGbased POS (posTokens.ts).
// Supports both the signature Light/White Mode and Deep Dark Mode.

export interface PosTokens {
  screenBg: string;
  panel: string;
  glowA: string;
  glowB: string;
  cardGradA: string;
  cardGradB: string;
  stroke: string;
  strokeHi: string;
  divider: string;
  textHi: string;
  textMid: string;
  textLow: string;
  mint: string;
  mintInk: string;
  mintDim: string;
  mintRing: string;
  gold: string;
  goldDim: string;
  moneyGlow: string;
  blue: string;
  blueDim: string;
  red: string;
  redDim: string;
  deep: string;
  deepDim: string;
  warn: string;
  warnDim: string;
  track: string;
  fieldBg: string;
  chipOn: string;
  gridLine: string;
  // Mode-invariant brand tokens
  ctaGradA: string;
  ctaGradB: string;
  ctaText: string;
  // Sidebar specific tokens
  sidebarBg: string;
  sidebarBorder: string;
  sidebarActiveBg: string;
  sidebarActiveText: string;
  sidebarHoverBg: string;
  sidebarSectionLabel: string;
}

export const DARK_TOKENS: PosTokens = {
  screenBg:  '#070B09',
  panel:     '#0D1512',
  glowA:     'rgba(61,232,160,0.10)',
  glowB:     'rgba(245,192,68,0.04)',
  cardGradA: 'rgba(255,255,255,0.055)',
  cardGradB: 'rgba(255,255,255,0.015)',
  stroke:    'rgba(255,255,255,0.07)',
  strokeHi:  'rgba(255,255,255,0.13)',
  divider:   'rgba(255,255,255,0.05)',
  textHi:    '#F2F7F4',
  textMid:   'rgba(235,245,240,0.62)',
  textLow:   'rgba(235,245,240,0.38)',
  mint:      '#3DE8A0',
  mintInk:   '#3DE8A0',
  mintDim:   'rgba(61,232,160,0.14)',
  mintRing:  'rgba(61,232,160,0.25)',
  gold:      '#F5C044',
  goldDim:   'rgba(245,192,68,0.12)',
  moneyGlow: '0 0 26px rgba(245,192,68,0.30)',
  blue:      '#78AAFF',
  blueDim:   'rgba(120,170,255,0.12)',
  red:       '#F87171',
  redDim:    'rgba(248,113,113,0.12)',
  deep:      '#C0392B',
  deepDim:   'rgba(192,57,43,0.18)',
  warn:      '#E8843D',
  warnDim:   'rgba(232,132,61,0.13)',
  track:     'rgba(255,255,255,0.08)',
  fieldBg:   'rgba(255,255,255,0.05)',
  chipOn:    'rgba(61,232,160,0.16)',
  gridLine:  'rgba(255,255,255,0.05)',
  ctaGradA:  '#46F0A8',
  ctaGradB:  '#17B577',
  ctaText:   '#03140C',
  sidebarBg: '#070B09',
  sidebarBorder: 'rgba(255,255,255,0.07)',
  sidebarActiveBg: 'rgba(139,92,246,0.85)',
  sidebarActiveText: '#FFFFFF',
  sidebarHoverBg: 'rgba(255,255,255,0.055)',
  sidebarSectionLabel: '#475569',
};

export const LIGHT_TOKENS: PosTokens = {
  screenBg:  '#F7F9F7',
  panel:     '#FFFFFF',
  glowA:     'rgba(61,232,160,0.08)',
  glowB:     'rgba(245,192,68,0.06)',
  cardGradA: '#FFFFFF',
  cardGradB: '#FDFEFD',
  stroke:    'rgba(10,40,28,0.09)',
  strokeHi:  'rgba(10,40,28,0.16)',
  divider:   'rgba(10,40,28,0.07)',
  textHi:    '#0C1F17',
  textMid:   'rgba(12,31,23,0.62)',
  textLow:   'rgba(12,31,23,0.42)',
  mint:      '#12B476',
  mintInk:   '#0B8A59',
  mintDim:   'rgba(18,180,118,0.10)',
  mintRing:  'rgba(18,180,118,0.28)',
  gold:      '#C9820A',
  goldDim:   'rgba(201,130,10,0.11)',
  moneyGlow: 'none',
  blue:      '#2E6FD8',
  blueDim:   'rgba(46,111,216,0.10)',
  red:       '#D6403F',
  redDim:    'rgba(214,64,63,0.10)',
  deep:      '#8E2420',
  deepDim:   'rgba(142,36,32,0.14)',
  warn:      '#D96F26',
  warnDim:   'rgba(217,111,38,0.11)',
  track:     'rgba(10,40,28,0.10)',
  fieldBg:   '#FFFFFF',
  chipOn:    'rgba(18,180,118,0.13)',
  gridLine:  'rgba(10,40,28,0.06)',
  ctaGradA:  '#46F0A8',
  ctaGradB:  '#17B577',
  ctaText:   '#03140C',
  sidebarBg: '#FFFFFF',
  sidebarBorder: '#ececef',
  sidebarActiveBg: '#8b5cf6',
  sidebarActiveText: '#FFFFFF',
  sidebarHoverBg: '#f2f3f5',
  sidebarSectionLabel: '#9aa0ab',
};

export function getTokens(isDark: boolean): PosTokens {
  return isDark ? DARK_TOKENS : LIGHT_TOKENS;
}

export const cardGrad = (t: PosTokens) => `linear-gradient(165deg, ${t.cardGradA}, ${t.cardGradB})`;

export const SORA = "'Sora', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";
export const INTER = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

export function fmtUGX(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '0';
  return Math.round(n).toLocaleString('en-UG');
}

export function fmtUGXCompact(n: number | null | undefined): string {
  if (n == null || Number.isNaN(n)) return '0';
  const v = Math.round(n);
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return v.toLocaleString('en-UG');
}

/** Largest-remainder rounding so percentages sum to exactly 100. */
export function largestRemainderPercentages(values: number[]): number[] {
  const total = values.reduce((a, b) => a + b, 0);
  if (total <= 0) return values.map(() => 0);
  const raw = values.map(v => (v / total) * 100);
  const floors = raw.map(v => Math.floor(v));
  const remainder = 100 - floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((v, i) => ({ i, frac: v - floors[i] }))
    .sort((a, b) => b.frac - a.frac)
    .map(x => x.i);
  const result = [...floors];
  for (let k = 0; k < remainder; k++) result[order[k]] += 1;
  return result;
}

/** Smooth Bezier curve generator for SVG charts */
export function bezierPath(pts: [number, number][]): string {
  if (pts.length < 2) return '';
  const d = [`M ${pts[0][0]} ${pts[0][1]}`];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    const t = 0.22;
    const cp1x = p1[0] + (p2[0] - p0[0]) * t;
    const cp1y = p1[1] + (p2[1] - p0[1]) * t;
    const cp2x = p2[0] - (p3[0] - p1[0]) * t;
    const cp2y = p2[1] - (p3[1] - p1[1]) * t;
    d.push(`C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)},${cp2x.toFixed(1)} ${cp2y.toFixed(1)},${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`);
  }
  return d.join(' ');
}
