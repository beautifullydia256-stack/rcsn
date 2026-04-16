/**
 * UACE % bands per class (school_class_uace_grade_bands.bands).
 * Must match iteration order expectations in Postgres: first matching band wins (configure high grades first).
 */

export type UacePercentBand = {
  grade: string;
  min_pct: number;
  max_pct: number;
};

/** Default UNEB-style bands (same as uace_default_grade_from_percent). */
export const DEFAULT_UACE_PERCENT_BANDS: UacePercentBand[] = [
  { grade: 'A', min_pct: 80, max_pct: 100 },
  { grade: 'B', min_pct: 70, max_pct: 79.999 },
  { grade: 'C', min_pct: 60, max_pct: 69.999 },
  { grade: 'D', min_pct: 50, max_pct: 59.999 },
  { grade: 'E', min_pct: 45, max_pct: 49.999 },
  { grade: 'O', min_pct: 40, max_pct: 44.999 },
  { grade: 'F', min_pct: 0, max_pct: 39.999 },
];

// Hardcoded UACE remarks removed — remarks must come from teacher_remarks_settings in the DB.
// Keeping the map empty so callers that still reference it get an empty string fallback.
const UACE_REMARKS: Record<string, string> = {};

/** Final % labels matching the Grading System / UaceExamBandsReminder table when the band matches defaults. */
const DEFAULT_UACE_FINAL_PCT_LABELS: Record<string, string> = {
  A: '80–100%',
  B: '70–79%',
  C: '60–69%',
  D: '50–59%',
  E: '45–49%',
  O: '40–44%',
  F: 'Below 40%',
};

function formatUaceMinMaxRangeForReport(min_pct: number, max_pct: number): string {
  if (!Number.isFinite(min_pct) || !Number.isFinite(max_pct)) return '';
  if (max_pct < 40 && min_pct <= 0.001) return 'Below 40%';
  const rlo = Math.round(min_pct * 1000) / 1000;
  const rhi = Math.round(max_pct * 1000) / 1000;
  const fmt = (n: number) =>
    Number.isInteger(n) ? String(Math.round(n)) : n.toFixed(2).replace(/\.?0+$/, '');
  return `${fmt(rlo)}–${fmt(rhi)}%`;
}

/**
 * Final % cell for A-Level report PDF — same wording as the teacher Grading System reference when * the row matches `DEFAULT_UACE_PERCENT_BANDS`; otherwise the school’s stored min–max.
 */
export function uaceBandFinalPercentDisplayForReport(b: UacePercentBand): string {
  const g = String(b.grade || '').trim().toUpperCase();
  const defRow = DEFAULT_UACE_PERCENT_BANDS.find((d) => d.grade === g);
  if (
    defRow &&
    Math.abs(Number(b.min_pct) - defRow.min_pct) < 0.02 &&
    Math.abs(Number(b.max_pct) - defRow.max_pct) < 0.02
  ) {
    return DEFAULT_UACE_FINAL_PCT_LABELS[g] ?? formatUaceMinMaxRangeForReport(b.min_pct, b.max_pct);
  }
  return formatUaceMinMaxRangeForReport(b.min_pct, b.max_pct);
}

export function uacePointsFromGrade(grade: string): number {
  const g = String(grade || '').trim().toUpperCase();
  switch (g) {
    case 'A':
      return 6;
    case 'B':
      return 5;
    case 'C':
      return 4;
    case 'D':
      return 3;
    case 'E':
      return 2;
    case 'O':
      return 1;
    case 'F':
      return 0;
    default:
      return 0;
  }
}

/** Alias labels for matching `school_class_uace_grade_bands.class_name` to report `current_class`. */
export function expandAlevelClassNameAliases(label: string): string[] {
  const out = new Set<string>();
  const t = String(label || '').trim();
  if (!t) return [];
  out.add(t);
  if (!/^(senior\s*[56]|s\.?\s*[56])\b/i.test(t)) return [...out];
  const m = t.match(/^senior\s*([56])(?:\s|$)|^s\.?\s*([56])(?:\s|$)/i);
  const n = m ? parseInt(m[1] || m[2], 10) : null;
  if (n === 5 || n === 6) {
    out.add(`Senior ${n}`);
    out.add(`Senior${n}`);
    out.add(`S${n}`);
    out.add(`S.${n}`);
    out.add(`s${n}`);
  }
  return [...out];
}

export function resolveUaceBandsForClass(
  reportCls: string,
  byKey: Map<string, UacePercentBand[]>,
): UacePercentBand[] | undefined {
  const candidates = new Set(expandAlevelClassNameAliases(reportCls));
  for (const [key, bands] of byKey) {
    const k = String(key || '').trim();
    if (candidates.has(k)) return bands;
  }
  for (const [key, bands] of byKey) {
    const keyCands = new Set(expandAlevelClassNameAliases(key));
    for (const c of candidates) {
      if (keyCands.has(c)) return bands;
    }
  }
  if (byKey.size === 1) {
    const first = [...byKey.values()][0];
    if (first?.length) return first;
  }
  return undefined;
}

export function parseUaceBandsFromDb(raw: unknown): UacePercentBand[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const out: UacePercentBand[] = [];
  for (const el of raw) {
    if (!el || typeof el !== 'object') continue;
    const o = el as Record<string, unknown>;
    const grade = String(o.grade ?? '').trim();
    const min_pct = Number(o.min_pct);
    const max_pct = Number(o.max_pct);
    if (!grade || !Number.isFinite(min_pct) || !Number.isFinite(max_pct)) continue;
    out.push({ grade: grade.toUpperCase(), min_pct, max_pct });
  }
  return out.length > 0 ? out : null;
}

/** One-line legend e.g. "80 - A | 70 - B | ..." using integer-ish lower bounds for display. */
export function uaceBandsToSummaryLegend(bands: UacePercentBand[]): string {
  if (!bands.length) return '';
  return bands
    .map((b) => `${Math.round(b.min_pct)} - ${b.grade}`)
    .join(' | ');
}

export function matchUaceGradeFromPercent(percentage: number, bands: UacePercentBand[]): string | null {
  const p = Number(percentage);
  if (!Number.isFinite(p)) return null;
  for (const row of bands) {
    if (p >= row.min_pct && p <= row.max_pct) return row.grade.toUpperCase();
  }
  return null;
}

export function uaceGradeAndPointsFromMarks(
  marks: number,
  totalMarks: number,
  bands?: UacePercentBand[] | null,
): { grade: string; points: number; remark: string } {
  const denom = totalMarks || 100;
  const pct = (marks / denom) * 100;
  const custom = bands && bands.length > 0 ? bands : null;
  let g = custom ? matchUaceGradeFromPercent(pct, custom) : null;
  if (!g) {
    g = matchUaceGradeFromPercent(pct, DEFAULT_UACE_PERCENT_BANDS);
  }
  const grade = (g ?? 'F').toUpperCase();
  return {
    grade,
    points: uacePointsFromGrade(grade),
    remark: UACE_REMARKS[grade] ?? '',
  };
}
