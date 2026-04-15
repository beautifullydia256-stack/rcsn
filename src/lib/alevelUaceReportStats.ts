/**
 * A-Level report headline stats: principal passes, subsidiary passes, total UACE points (/20).
 * Aligns with docs/SECONDARY_REPORT_CARD_TEMPLATES_PLAN.md §7.7 and UACE_ALEVEL_GRADING_LOGIC.md.
 */

import {
  DEFAULT_UACE_PERCENT_BANDS,
  matchUaceGradeFromPercent,
  uacePointsFromGrade,
  type UacePercentBand,
} from './uaceGradeBands';

export function normalizeAlevelReportSubjectKey(name: string): string {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export type AlevelReportResultRowLike = {
  subject?: string;
  final_score?: unknown;
  marks_obtained?: unknown;
  total_marks?: unknown;
  result_missing_placeholder?: boolean;
};

function numOrUndef(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function gradeFromPercent(pct: number, bands: UacePercentBand[] | null | undefined): string {
  const list = bands && bands.length > 0 ? bands : DEFAULT_UACE_PERCENT_BANDS;
  const g = matchUaceGradeFromPercent(pct, list);
  return (g ?? 'F').toUpperCase();
}

/**
 * @param resultsOut Merged exam lines (may include multiple papers per subject).
 * @param expectedOrdered Student roster order from `student_alevel_subjects`.
 * @param roles Map: normalized subject key → principal | subsidiary (from DB).
 * @param customBands School override from `school_class_uace_grade_bands`; null = defaults.
 */
export function computeAlevelUaceReportStats(
  resultsOut: AlevelReportResultRowLike[],
  expectedOrdered: string[] | undefined,
  roles: Record<string, 'principal' | 'subsidiary'> | undefined,
  customBands: UacePercentBand[] | null | undefined,
): {
  principalPasses: number;
  subsidiaryPasses: number;
  totalPointsNumerator: number;
  totalPointsDenominator: number;
} {
  const denom = 20;
  if (!expectedOrdered?.length) {
    return { principalPasses: 0, subsidiaryPasses: 0, totalPointsNumerator: 0, totalPointsDenominator: denom };
  }

  const bands = customBands && customBands.length > 0 ? customBands : null;
  let principalPasses = 0;
  let subsidiaryPasses = 0;
  let totalPoints = 0;

  const roleOf = (subj: string): 'principal' | 'subsidiary' => {
    const k = normalizeAlevelReportSubjectKey(subj);
    const r = roles?.[k];
    return r === 'subsidiary' ? 'subsidiary' : 'principal';
  };

  for (const subj of expectedOrdered) {
    const k = normalizeAlevelReportSubjectKey(subj);
    if (!k) continue;
    const rows = resultsOut.filter(
      (r) => normalizeAlevelReportSubjectKey(String(r.subject ?? '')) === k,
    );
    if (rows.length === 0) continue;

    const vals: number[] = [];
    for (const r of rows) {
      if (r.result_missing_placeholder === true) continue;
      const fs = numOrUndef(r.final_score);
      if (fs != null) {
        vals.push(fs);
        continue;
      }
      const m = numOrUndef(r.marks_obtained);
      const t = Number(r.total_marks ?? 100) || 100;
      if (m != null && t > 0) vals.push((m / t) * 100);
    }

    let grade: string;
    if (vals.length > 0) {
      const pct = vals.reduce((a, b) => a + b, 0) / vals.length;
      grade = gradeFromPercent(pct, bands);
    } else {
      grade = 'F';
    }

    const role = roleOf(subj);
    if (role === 'principal') {
      if (grade !== 'F') principalPasses += 1;
      totalPoints += uacePointsFromGrade(grade);
    } else {
      // Subsidiary subjects: any grade except F = 1 point and 1 subsidiary pass.
      // Grade display stays as-is (A/B/C/D/E/O); only F means no pass/no point.
      if (grade !== 'F') subsidiaryPasses += 1;
      totalPoints += grade !== 'F' ? 1 : 0;
    }
  }

  return {
    principalPasses,
    subsidiaryPasses,
    totalPointsNumerator: totalPoints,
    totalPointsDenominator: denom,
  };
}
