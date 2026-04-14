/**
 * UACE (A-Level) grading footer for report cards — aligned with
 * `public.uace_default_grade_from_percent`, `calculateUacePrincipalGradeFromMarks`,
 * and `UaceExamBandsReminder`.
 */

export type UaceReportBandRow = {
  grade: string;
  rangeLabel: string;
  points: number;
  achievementLevel: string;
  defaultDescriptor: string;
};

/** Order matches UNEB-style default bands (principal + O/F). */
export const UACE_REPORT_DEFAULT_BANDS: UaceReportBandRow[] = [
  {
    grade: 'A',
    rangeLabel: '80–100%',
    points: 6,
    achievementLevel: 'Excellent',
    defaultDescriptor:
      'Demonstrates an excellent level of competence by applying knowledge and skills effectively in line with UACE expectations.',
  },
  {
    grade: 'B',
    rangeLabel: '70–79%',
    points: 5,
    achievementLevel: 'Very good',
    defaultDescriptor:
      'Demonstrates a very good level of competence with strong application of knowledge and skills.',
  },
  {
    grade: 'C',
    rangeLabel: '60–69%',
    points: 4,
    achievementLevel: 'Good',
    defaultDescriptor:
      'Demonstrates a good level of competence; continues to strengthen application of knowledge and skills.',
  },
  {
    grade: 'D',
    rangeLabel: '50–59%',
    points: 3,
    achievementLevel: 'Pass',
    defaultDescriptor:
      'Demonstrates a credit-level pass; meets basic expectations with room for further improvement.',
  },
  {
    grade: 'E',
    rangeLabel: '45–49%',
    points: 2,
    achievementLevel: 'Minimum pass',
    defaultDescriptor:
      'Demonstrates a minimum pass; should work systematically to improve understanding and performance.',
  },
  {
    grade: 'O',
    rangeLabel: '40–44%',
    points: 1,
    achievementLevel: 'Subsidiary pass',
    defaultDescriptor:
      'Subsidiary / ordinary pass band; typical for some subsidiary subjects under default school mapping.',
  },
  {
    grade: 'F',
    rangeLabel: 'Below 40%',
    points: 0,
    achievementLevel: 'Fail',
    defaultDescriptor:
      'Does not meet the minimum standard; requires targeted support and sustained effort.',
  },
];

/** One-line legend matching the Standard O-Level template style (lower bound → grade). */
export function uaceGradingSummaryLegendLine(): string {
  return '80 - A | 70 - B | 60 - C | 50 - D | 45 - E | 40 - O | 0 - F';
}

export type UacePercentBandLike = { grade: string; min_pct: number; max_pct: number };

function fmtPctBound(n: number): string {
  if (!Number.isFinite(n)) return '';
  const r = Math.round(n * 1000) / 1000;
  return Number.isInteger(r) ? String(r) : r.toFixed(1).replace(/\.0$/, '');
}

/** Final % column for a row as stored in `school_class_uace_grade_bands.bands` (min–max). */
export function formatUaceSavedBandPercentRange(b: UacePercentBandLike): string {
  const lo = fmtPctBound(b.min_pct);
  const hi = fmtPctBound(b.max_pct);
  return lo && hi ? `${lo}–${hi}%` : '';
}

/** Legend from saved bands (same order as stored; first match wins on server). */
export function uaceGradingSummaryLegendFromBands(bands: UacePercentBandLike[]): string {
  return bands
    .map((b) => `${fmtPctBound(b.min_pct)} - ${String(b.grade || '').trim().toUpperCase()}`)
    .join(' | ');
}
