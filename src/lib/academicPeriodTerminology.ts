import { isTertiarySchool, useSchoolType } from '../hooks/useSchoolType';

export interface AcademicPeriodLabels {
  /** Singular noun: "Semester" vs "Term" */
  periodNoun: string;
  /** Plural noun: "Semesters" vs "Terms" */
  periodNounPlural: string;
  /** "Current Semester" vs "Current Term" */
  currentPeriod: string;
  /** "Semester Fees" vs "Term Fees" */
  periodFees: string;
  /** "Semester Tuition" vs "Term Tuition" */
  periodTuition: string;
  /** "Semester Invoice" vs "Term Invoice" */
  periodInvoice: string;
  /** "Semester Invoices" vs "Term Invoices" */
  periodInvoices: string;
  /** "Semester to date" vs "Term to date" */
  periodToDate: string;
  /** "Semester Settings" vs "Term Settings" */
  periodSettings: string;
  /** "Next Semester Begins" vs "Next Term Begins" */
  nextPeriodBegins: string;
  /** "End of Semester" vs "End of Term" */
  endOfPeriod: string;
  /** "Select Semester" vs "Select Term" */
  selectPeriod: string;
  /** "All Semesters" vs "All Terms" */
  allPeriods: string;
  /** "Semester Assessments" vs "Term Exams" */
  periodAssessments: string;
  /** "Semester Reports & Slips" vs "Term Reports" */
  periodReports: string;
  /** "Semester Dates" vs "Term Dates" */
  periodDates: string;
}

/**
 * Returns dynamic terminology labels based on whether the institution is tertiary
 * (Tertiary, Nursing & Midwifery, Health Training, College, Polytechnic) vs secondary/primary/nursery.
 */
export function getAcademicPeriodLabels(isTertiary: boolean): AcademicPeriodLabels {
  if (isTertiary) {
    return {
      periodNoun: 'Semester',
      periodNounPlural: 'Semesters',
      currentPeriod: 'Current Semester',
      periodFees: 'Semester Fees',
      periodTuition: 'Semester Tuition & Levies',
      periodInvoice: 'Semester Invoice',
      periodInvoices: 'Semester Invoices',
      periodToDate: 'Semester to date',
      periodSettings: 'Semester Settings',
      nextPeriodBegins: 'Next Semester Begins',
      endOfPeriod: 'End of Semester',
      selectPeriod: 'Select Semester',
      allPeriods: 'All Semesters',
      periodAssessments: 'Semester Assessments',
      periodReports: 'Result Slips & Transcripts',
      periodDates: 'Semester Dates',
    };
  }

  return {
    periodNoun: 'Term',
    periodNounPlural: 'Terms',
    currentPeriod: 'Current Term',
    periodFees: 'Term Fees',
    periodTuition: 'School Fees',
    periodInvoice: 'Term Invoice',
    periodInvoices: 'Term Invoices',
    periodToDate: 'Term to date',
    periodSettings: 'Term Settings',
    nextPeriodBegins: 'Next Term Begins',
    endOfPeriod: 'End of Term',
    selectPeriod: 'Select Term',
    allPeriods: 'All Terms',
    periodAssessments: 'Exam Sets',
    periodReports: 'Term Reports',
    periodDates: 'Term Dates',
  };
}

/**
 * Formats an academic period number into human-readable text:
 * - For Tertiary: period 1 -> "Semester 1", period 2 -> "Semester 2", period 3 -> "Recess Term" or "Semester 3".
 * - For Non-Tertiary: period 1 -> "Term 1", period 2 -> "Term 2", period 3 -> "Term 3".
 * Optional year can be appended: e.g. "Semester 1, 2026" or "Term 1, 2026".
 */
export function formatAcademicPeriod(
  periodNumber: number | string | null | undefined,
  isTertiary: boolean,
  options?: {
    year?: number | string | null;
    short?: boolean;
    includeYearComma?: boolean;
  }
): string {
  if (periodNumber == null || periodNumber === '' || periodNumber === 0) {
    return options?.year ? String(options.year) : (isTertiary ? 'Current Semester' : 'Current Term');
  }

  const num = Number(periodNumber);
  const isShort = options?.short ?? false;
  const withComma = options?.includeYearComma ?? true;

  let base = '';
  if (isTertiary) {
    if (num === 3) {
      base = isShort ? 'Recess' : 'Recess Semester';
    } else {
      base = isShort ? `Sem ${num}` : `Semester ${num}`;
    }
  } else {
    base = isShort ? `T${num}` : `Term ${num}`;
  }

  if (options?.year) {
    return withComma ? `${base}, ${options.year}` : `${base} ${options.year}`;
  }

  return base;
}

/**
 * React hook that automatically resolves the institution type and provides
 * reactive labels and formatting helpers for academic periods.
 */
export function useAcademicPeriod() {
  const schoolTypeHook = useSchoolType();
  const isTertiary = schoolTypeHook.isTertiary;
  const labels = getAcademicPeriodLabels(isTertiary);

  const formatPeriod = (
    periodNumber?: number | string | null,
    year?: number | string | null,
    opts?: { short?: boolean; includeYearComma?: boolean }
  ) => {
    return formatAcademicPeriod(periodNumber, isTertiary, {
      year,
      short: opts?.short,
      includeYearComma: opts?.includeYearComma,
    });
  };

  return {
    ...schoolTypeHook,
    isTertiary,
    labels,
    formatPeriod,
    periodNoun: labels.periodNoun,
    periodNounPlural: labels.periodNounPlural,
    currentPeriodLabel: labels.currentPeriod,
  };
}

export { isTertiarySchool };
