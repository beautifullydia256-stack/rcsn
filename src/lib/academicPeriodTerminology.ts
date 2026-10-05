import { isTertiarySchool, useSchoolType } from '../hooks/useSchoolType';

export interface AcademicVocabularyLabels {
  // Academic Periods
  periodNoun: string;
  periodNounPlural: string;
  currentPeriod: string;
  periodFees: string;
  periodTuition: string;
  periodInvoice: string;
  periodInvoices: string;
  periodToDate: string;
  periodSettings: string;
  nextPeriodBegins: string;
  endOfPeriod: string;
  selectPeriod: string;
  allPeriods: string;
  periodAssessments: string;
  periodReports: string;
  periodDates: string;

  // Finance & Ledger
  financePeriod: string;
  financePeriodPlural: string;
  financeCurrentPeriod: string;
  financeCurrentPeriodAttributed: string;
  financeOlderPeriodArrears: string;
  financeLedger: string;
  financePerformance: string;
  financeBreakdownSubtitle: string;

  // Student Context
  studentPeriodNoun: string;
  studentPeriodNounPlural: string;

  // Academic Structure
  classNoun: string;
  classNounPlural: string;
  selectClass: string;
  subjectNoun: string;
  subjectNounPlural: string;
  selectSubject: string;
  teacherNoun: string;
  teacherNounPlural: string;
  selectTeacher: string;
  studentNoun: string;
  studentNounPlural: string;
  streamNoun: string;
  streamNounPlural: string;

  // Settings Tabs
  subjectsPerClassTitle: string;
  subjectsPerClassDesc: string;
  teacherAssignmentTitle: string;
  teacherAssignmentDesc: string;
  timetableTitle: string;
  timetableDesc: string;
  examSetsTitle: string;
  examSetsDesc: string;
  streamsTitle: string;
  streamsDesc: string;
}

/**
 * Returns dynamic terminology labels based on whether the institution is tertiary
 * (Tertiary, Nursing & Midwifery, Health Training, College, Institute, Polytechnic) vs secondary/primary/nursery.
 */
export function getAcademicPeriodLabels(isTertiary: boolean): AcademicVocabularyLabels {
  if (isTertiary) {
    return {
      // Academic Periods
      periodNoun: 'Academic Period',
      periodNounPlural: 'Academic Periods',
      currentPeriod: 'Current Academic Period',
      periodFees: 'Academic Period Fees',
      periodTuition: 'Tuition & Functional Fees',
      periodInvoice: 'Period Invoice',
      periodInvoices: 'Period Invoices',
      periodToDate: 'Period to date',
      periodSettings: 'Academic Period Settings',
      nextPeriodBegins: 'Next Academic Period Begins',
      endOfPeriod: 'End of Academic Period',
      selectPeriod: 'Select Academic Period',
      allPeriods: 'All Academic Periods',
      periodAssessments: 'Period Assessments',
      periodReports: 'Result Slips & Transcripts',
      periodDates: 'Academic Period Dates',

      // Finance & Ledger
      financePeriod: 'Academic Period',
      financePeriodPlural: 'Academic Periods',
      financeCurrentPeriod: 'Current Academic Period',
      financeCurrentPeriodAttributed: 'Attributed to Current Academic Period',
      financeOlderPeriodArrears: 'Arrears from Previous Semesters',
      financeLedger: 'Current Academic Period Ledger',
      financePerformance: 'Current Academic Period Performance',
      financeBreakdownSubtitle: 'Proportional breakdown of current academic period fees ledger',

      // Student Context
      studentPeriodNoun: 'Semester',
      studentPeriodNounPlural: 'Semesters',

      // Academic Structure
      classNoun: 'Course & Stage',
      classNounPlural: 'Courses & Stages',
      selectClass: 'Select Course & Stage',
      subjectNoun: 'Course Unit',
      subjectNounPlural: 'Course Units',
      selectSubject: 'Select Course Unit',
      teacherNoun: 'Tutor',
      teacherNounPlural: 'Tutors',
      selectTeacher: 'Select Tutor',
      studentNoun: 'Student',
      studentNounPlural: 'Students',
      streamNoun: 'Set / Intake',
      streamNounPlural: 'Sets & Intakes',

      // Settings Tabs
      subjectsPerClassTitle: 'Course Units per Programme',
      subjectsPerClassDesc: 'Curriculum course units and credit units (CU)',
      teacherAssignmentTitle: 'Tutor ↔ Course Unit ↔ Programme',
      teacherAssignmentDesc: 'Assign tutors to course units',
      timetableTitle: 'Timetable & Clinical Schedule',
      timetableDesc: 'Build lecture periods and ward rotation schedules',
      examSetsTitle: 'Assessment & Examination Types',
      examSetsDesc: 'Continuous assessment (CAT), internal semester, OSCE & UHPAB sets',
      streamsTitle: 'Intakes & Sets',
      streamsDesc: 'Manage student cohorts (e.g. Set 22, Set 23, March/Sept Intakes)',
    };
  }

  return {
    // Academic Periods
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

    // Finance & Ledger
    financePeriod: 'Term',
    financePeriodPlural: 'Terms',
    financeCurrentPeriod: 'Current Term',
    financeCurrentPeriodAttributed: 'Attributed to Current Term',
    financeOlderPeriodArrears: 'Balances from Older Terms',
    financeLedger: 'Current Term Ledger',
    financePerformance: 'Current Term Performance',
    financeBreakdownSubtitle: 'Proportional breakdown of current term fees ledger',

    // Student Context
    studentPeriodNoun: 'Term',
    studentPeriodNounPlural: 'Terms',

    // Academic Structure
    classNoun: 'Class',
    classNounPlural: 'Classes',
    selectClass: 'Select Class',
    subjectNoun: 'Subject',
    subjectNounPlural: 'Subjects',
    selectSubject: 'Select Subject',
    teacherNoun: 'Teacher',
    teacherNounPlural: 'Teachers',
    selectTeacher: 'Select Teacher',
    studentNoun: 'Pupil / Student',
    studentNounPlural: 'Students',
    streamNoun: 'Stream',
    streamNounPlural: 'Streams',

    // Settings Tabs
    subjectsPerClassTitle: 'Subjects per Class',
    subjectsPerClassDesc: 'Class subjects and UCE/UACE options',
    teacherAssignmentTitle: 'Teacher ↔ Subject ↔ Class',
    teacherAssignmentDesc: 'Assign teachers to classes',
    timetableTitle: 'Timetable Designer',
    timetableDesc: 'Build periods and schedules',
    examSetsTitle: 'Exam Sets',
    examSetsDesc: 'Exam seasons and sets',
    streamsTitle: 'Class Streams',
    streamsDesc: 'Split a class into streams (e.g. P7 West / East)',
  };
}

/**
 * Formats an academic period into a student's actual tertiary programme stage:
 * E.g. for Acan Hassan (DM – Year 2 Semester 2), formats current term as "DM – Year 2 Semester 2 (2026)"
 * and older semesters as "DM – Year 2 Semester 1 (2025)", etc.
 * When studentClass is not available or generic, ALWAYS formats as "Semester 1, 2026" / "Semester 2, 2025".
 * This ensures student billing, payments, receipts, and debtor ledgers NEVER display "Academic Period".
 */
export function formatTertiaryStudentPeriod(
  periodNumber: number | string | null | undefined,
  options?: {
    year?: number | string | null;
    studentClass?: string | null;
    currentTerm?: { term?: number; year?: number } | null;
    short?: boolean;
  }
): string {
  const num = Number(periodNumber || 1);
  const isShort = options?.short ?? false;
  const genericBase = num === 3
    ? (isShort ? 'Recess' : 'Recess Practicum')
    : (isShort ? `Sem ${num}` : `Semester ${num}`);
  const fallbackWithYear = options?.year ? `${genericBase}, ${options.year}` : genericBase;

  if (!options?.studentClass) {
    return fallbackWithYear;
  }

  const match = options.studentClass.match(/(?:Year\s*(\d+)\s*Semester\s*(\d+)|Y(\d+)S(\d+))/i);
  if (!match) {
    const cleanClass = options.studentClass.trim();
    if (cleanClass) {
      return `${cleanClass} – ${genericBase}${options?.year ? ` (${options.year})` : ''}`;
    }
    return fallbackWithYear;
  }

  const curYear = Number(match[1] || match[3]);
  const curSem = Number(match[2] || match[4]);
  const parts = options.studentClass.split(/[–-]/);
  const progPrefix = parts.length > 1 ? parts[0].trim() : '';
  const hasPrefix = Boolean(progPrefix && progPrefix !== options.studentClass && progPrefix.length <= 8);

  if (options.currentTerm?.year && options.currentTerm?.term && options.year && periodNumber) {
    const curTermYear = Number(options.currentTerm.year);
    const curTermNum = Number(options.currentTerm.term);
    const targetYear = Number(options.year);
    const targetTermNum = Number(periodNumber);
    const periodsAgo = (curTermYear - targetYear) * 2 + (curTermNum - targetTermNum);
    const currentTotalSem = (curYear - 1) * 2 + curSem;
    const targetTotalSem = currentTotalSem - periodsAgo;
    if (targetTotalSem >= 1 && targetTotalSem <= 10) {
      const calcYear = Math.floor((targetTotalSem - 1) / 2) + 1;
      const calcSem = ((targetTotalSem - 1) % 2) + 1;
      const stageStr = options.short ? `Y${calcYear}S${calcSem}` : `Year ${calcYear} Semester ${calcSem}`;
      const prefixStr = hasPrefix ? `${progPrefix} – ` : '';
      return `${prefixStr}${stageStr} (${targetYear})`;
    }
  }

  const stageStr = options.short ? `Y${curYear}S${curSem}` : `Year ${curYear} Semester ${curSem}`;
  const prefixStr = hasPrefix ? `${progPrefix} – ` : '';
  return `${prefixStr}${stageStr}${options.year ? ` (${options.year})` : ''}`;
}

/**
 * Formats a student fee period or semester.
 * For tertiary institutions:
 * - If studentClass has a cohort stage (e.g. "Year 2 Semester 1" or "DM – Year 2 Semester 2"):
 *   computes the exact semester stage for that year/period (e.g. "Year 2 Semester 1 (2026)").
 *   For prior periods, computes past semesters (e.g. "Year 1 Semester 2 (2025)").
 * - If studentClass is missing or generic:
 *   returns "Semester 1, 2026", "Semester 2, 2025", or "Recess Practicum, 2026".
 * - NEVER displays "Academic Period" for student billing or fee receipts.
 * For non-tertiary:
 * - returns "Term 1, 2026", "Term 2, 2025", etc.
 */
export function formatStudentSemester(
  periodNumber: number | string | null | undefined,
  isTertiary: boolean,
  options?: {
    year?: number | string | null;
    studentClass?: string | null;
    currentTerm?: { term?: number; year?: number } | null;
    short?: boolean;
  }
): string {
  if (isTertiary) {
    return formatTertiaryStudentPeriod(periodNumber, options);
  }
  const num = Number(periodNumber || 1);
  const base = options?.short ? `T${num}` : `Term ${num}`;
  return options?.year ? `${base}, ${options.year}` : base;
}

/**
 * Formats an academic period number into human-readable text:
 * - For Tertiary: period 1 -> "Semester 1", period 2 -> "Semester 2", period 3 -> "Recess Semester".
 *   If studentClass is provided, formats as e.g. "Year 2 Semester 2 (2026)" or "DM – Year 2 Semester 2 (2026)".
 * - For Non-Tertiary: period 1 -> "Term 1", period 2 -> "Term 2", period 3 -> "Term 3".
 */
export function formatAcademicPeriod(
  periodNumber: number | string | null | undefined,
  isTertiary: boolean,
  options?: {
    year?: number | string | null;
    short?: boolean;
    includeYearComma?: boolean;
    studentClass?: string | null;
    currentTerm?: { term?: number; year?: number } | null;
  }
): string {
  if (isTertiary && options?.studentClass) {
    return formatTertiaryStudentPeriod(periodNumber, options);
  }

  if (periodNumber == null || periodNumber === '' || periodNumber === 0) {
    return options?.year ? String(options.year) : (isTertiary ? 'Current Academic Period' : 'Current Term');
  }

  const num = Number(periodNumber);
  const isShort = options?.short ?? false;
  const withComma = options?.includeYearComma ?? true;

  let base = '';
  if (isTertiary) {
    if (num === 3) {
      base = isShort ? 'Recess' : 'Recess Practicum';
    } else {
      base = isShort ? `Period ${num}` : `Academic Period ${num}`;
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
 * reactive labels and formatting helpers for academic periods and finance vocabulary.
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
    studentPeriodNoun: labels.studentPeriodNoun,
    studentPeriodNounPlural: labels.studentPeriodNounPlural,
    currentPeriodLabel: labels.currentPeriod,
  };
}

export type AcademicPeriodLabels = AcademicVocabularyLabels;
export { isTertiarySchool };
export default useAcademicPeriod;
