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
  // Convenience aliases for flexible UI styling
  surface: string;
  surfaceSubtle: string;
  border: string;
  brand: string;
  textPrimary: string;
  textSecondary: string;
  card: string;
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  bg: string;
  brandBlue: string;
  brandMint: string;
  brandGold: string;
  textMuted: string;
  textSub: string;
  text: string;
  subText: string;
  teal: string;
}

export const DARK_TOKENS: PosTokens = {
  screenBg:  '#070B09',
  panel:     '#0D1512',
  glowA:     'rgba(61,232,160,0.10)',
  glowB:     'transparent',
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
  moneyGlow: 'none',
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
  sidebarBg: 'rgba(7, 11, 9, 0.70)',
  sidebarBorder: 'rgba(255, 255, 255, 0.12)',
  sidebarActiveBg: 'rgba(139, 92, 246, 0.25)',
  sidebarActiveText: '#FFFFFF',
  sidebarHoverBg: 'rgba(255, 255, 255, 0.06)',
  sidebarSectionLabel: '#94a3b8',
  surface: '#0D1512',
  surfaceSubtle: 'rgba(255,255,255,0.05)',
  border: 'rgba(255,255,255,0.07)',
  brand: '#3DE8A0',
  textPrimary: '#F2F7F4',
  textSecondary: 'rgba(235,245,240,0.62)',
  card: '#0D1512',
  cardBg: '#0D1512',
  cardBorder: 'rgba(255,255,255,0.07)',
  cardShadow: '0 4px 16px rgba(0,0,0,0.35)',
  bg: '#070B09',
  brandBlue: '#3b82f6',
  brandMint: '#10b981',
  brandGold: '#f59e0b',
  textMuted: 'rgba(235,245,240,0.62)',
  textSub: 'rgba(235,245,240,0.38)',
  text: '#F2F7F4',
  subText: 'rgba(235,245,240,0.62)',
  teal: '#10d9a8',
};

export const LIGHT_TOKENS: PosTokens = {
  screenBg:  '#F7F9F7',
  panel:     '#FFFFFF',
  glowA:     'rgba(61,232,160,0.08)',
  glowB:     'transparent',
  cardGradA: '#FFFFFF',
  cardGradB: '#FDFEFD',
  stroke:    'rgba(15,23,42,0.16)',
  strokeHi:  'rgba(15,23,42,0.26)',
  divider:   'rgba(15,23,42,0.09)',
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
  blue:      '#2563EB',
  blueDim:   'rgba(37,99,235,0.10)',
  red:       '#DC2626',
  redDim:    'rgba(220,38,38,0.10)',
  deep:      '#991B1B',
  deepDim:   'rgba(153,27,27,0.15)',
  warn:      '#D97706',
  warnDim:   'rgba(217,119,6,0.10)',
  track:     'rgba(10,40,28,0.08)',
  fieldBg:   'rgba(10,40,28,0.04)',
  chipOn:    'rgba(18,180,118,0.14)',
  gridLine:  'rgba(10,40,28,0.05)',
  ctaGradA:  '#12B476',
  ctaGradB:  '#0B8A59',
  ctaText:   '#FFFFFF',
  sidebarBg: 'rgba(255, 255, 255, 0.75)',
  sidebarBorder: 'rgba(255, 255, 255, 0.85)',
  sidebarActiveBg: 'rgba(139, 92, 246, 0.12)',
  sidebarActiveText: '#6d28d9',
  sidebarHoverBg: 'rgba(0, 0, 0, 0.04)',
  sidebarSectionLabel: '#64748b',
  surface: '#FFFFFF',
  surfaceSubtle: 'rgba(10,40,28,0.04)',
  border: 'rgba(15,23,42,0.16)',
  brand: '#12B476',
  textPrimary: '#0C1F17',
  textSecondary: 'rgba(12,31,23,0.62)',
  card: '#FFFFFF',
  cardBg: '#FFFFFF',
  cardBorder: 'rgba(15,23,42,0.16)',
  cardShadow: '0 12px 32px rgba(0,0,0,0.06), 0 2px 6px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.95)',
  bg: '#F7F9F7',
  brandBlue: '#2563eb',
  brandMint: '#059669',
  brandGold: '#d97706',
  textMuted: 'rgba(12,31,23,0.62)',
  textSub: 'rgba(12,31,23,0.42)',
  text: '#0C1F17',
  subText: 'rgba(12,31,23,0.62)',
  teal: '#0d9488',
};

export function getTokens(isDark: boolean): PosTokens {
  return isDark ? DARK_TOKENS : LIGHT_TOKENS;
}

export const cardGrad = (tOrIsDark: PosTokens | boolean, accent?: string) => {
  const t = typeof tOrIsDark === 'boolean' ? getTokens(tOrIsDark) : tOrIsDark;
  if (accent === 'emerald' || accent === 'mint') {
    return `linear-gradient(165deg, ${t.mintDim}, ${t.cardGradB})`;
  }
  if (accent === 'blue') {
    return `linear-gradient(165deg, ${t.blueDim}, ${t.cardGradB})`;
  }
  if (accent === 'purple') {
    return `linear-gradient(165deg, rgba(168,85,247,0.12), ${t.cardGradB})`;
  }
  if (accent === 'amber' || accent === 'gold') {
    return `linear-gradient(165deg, ${t.goldDim}, ${t.cardGradB})`;
  }
  return `linear-gradient(165deg, ${t.cardGradA}, ${t.cardGradB})`;
};

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
