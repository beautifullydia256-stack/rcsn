/**
 * PwezaCore - Tertiary Student Semester Progress Calculation Service
 * 
 * Computes active academic journey, percentage completion, and remaining semesters
 * for health training programmes (Nursing & Midwifery):
 * - Certificates (CN, CM): 2.5 Years = 5 Semesters (Y1S1 -> Y3S1)
 * - Diplomas (DN, DM): 3.0 Years = 6 Semesters (Y1S1 -> Y3S2)
 */

export interface TertiaryProgress {
  isTertiaryCourse: boolean;
  programmeCode: 'CN' | 'CM' | 'DN' | 'DM' | string;
  programmeTitle: string;
  totalSemesters: number;
  currentSemesterNumber: number;
  stageCode: string;
  stageLabel: string;
  percentage: number;
  remainingSemesters: number;
  isFinalSemester: boolean;
  isCompleted: boolean;
  formattedBadge: string;
  shortPill: string;
}

const STAGE_LABELS: Record<string, string> = {
  Y1S1: 'Year 1 Semester 1',
  Y1S2: 'Year 1 Semester 2',
  Y2S1: 'Year 2 Semester 1',
  Y2S2: 'Year 2 Semester 2',
  Y3S1: 'Year 3 Semester 1',
  Y3S2: 'Year 3 Semester 2',
  COMPLETED: 'Completed / Graduating',
};

/**
 * Computes progress information from a raw class string or stage code:
 * Examples:
 * - "CN22 Year 2 Semester 2"
 * - "DN23 Y1S1"
 * - "CM22 - Year 2 Semester 1"
 * - "Certificate in Nursing Y2S2"
 */
export function computeTertiaryProgress(classOrStageRaw?: string | null): TertiaryProgress {
  const str = String(classOrStageRaw || '').trim().toUpperCase();

  // Detect Programme Code
  let programmeCode = 'CN';
  let programmeTitle = 'Certificate in Nursing';
  let totalSemesters = 5;

  if (/\bDN\d*|\bDIPLOMA IN NURSING\b/.test(str)) {
    programmeCode = 'DN';
    programmeTitle = 'Diploma in Nursing';
    totalSemesters = 6;
  } else if (/\bDM\d*|\bDIPLOMA IN MIDWIFERY\b/.test(str)) {
    programmeCode = 'DM';
    programmeTitle = 'Diploma in Midwifery';
    totalSemesters = 6;
  } else if (/\bCM\d*|\bCERTIFICATE IN MIDWIFERY\b/.test(str)) {
    programmeCode = 'CM';
    programmeTitle = 'Certificate in Midwifery';
    totalSemesters = 5;
  } else if (/\bCN\d*|\bCERTIFICATE IN NURSING\b/.test(str)) {
    programmeCode = 'CN';
    programmeTitle = 'Certificate in Nursing';
    totalSemesters = 5;
  } else if (/YEAR\s*3\s*SEM(ESTER)?\s*2|Y3S2/.test(str)) {
    // Has Y3S2, must be a diploma
    programmeCode = 'DN';
    programmeTitle = 'Diploma Programme';
    totalSemesters = 6;
  }

  // Detect Stage Number
  let currentSemesterNumber = 1;
  let stageCode = 'Y1S1';

  if (/COMPLETED|GRADUAT/.test(str)) {
    currentSemesterNumber = totalSemesters;
    stageCode = 'COMPLETED';
  } else if (/Y3S2|YEAR\s*3\s*SEM(ESTER)?\s*2/.test(str)) {
    currentSemesterNumber = 6;
    stageCode = 'Y3S2';
  } else if (/Y3S1|YEAR\s*3\s*SEM(ESTER)?\s*1/.test(str)) {
    currentSemesterNumber = 5;
    stageCode = 'Y3S1';
  } else if (/Y2S2|YEAR\s*2\s*SEM(ESTER)?\s*2/.test(str)) {
    currentSemesterNumber = 4;
    stageCode = 'Y2S2';
  } else if (/Y2S1|YEAR\s*2\s*SEM(ESTER)?\s*1/.test(str)) {
    currentSemesterNumber = 3;
    stageCode = 'Y2S1';
  } else if (/Y1S2|YEAR\s*1\s*SEM(ESTER)?\s*2/.test(str)) {
    currentSemesterNumber = 2;
    stageCode = 'Y1S2';
  } else {
    currentSemesterNumber = 1;
    stageCode = 'Y1S1';
  }

  const isCompleted = stageCode === 'COMPLETED' || (currentSemesterNumber === totalSemesters && /FINAL|CLEAR/.test(str));
  const remainingSemesters = isCompleted ? 0 : Math.max(0, totalSemesters - currentSemesterNumber);
  const percentage = isCompleted ? 100 : Math.min(100, Math.round((currentSemesterNumber / totalSemesters) * 100));
  const isFinalSemester = currentSemesterNumber === totalSemesters;
  const stageLabel = STAGE_LABELS[stageCode] || `Semester ${currentSemesterNumber}`;

  let formattedBadge = '';
  if (isCompleted) {
    formattedBadge = `All ${totalSemesters} Semesters Completed (100%) — Eligible for UNMEB Licensing`;
  } else if (remainingSemesters === 0) {
    formattedBadge = `Final Semester ${currentSemesterNumber} of ${totalSemesters} (${percentage}%) — Graduating Cohort`;
  } else {
    formattedBadge = `Semester ${currentSemesterNumber} of ${totalSemesters} (${percentage}%) — ${remainingSemesters} ${
      remainingSemesters === 1 ? 'Semester' : 'Semesters'
    } Remaining`;
  }

  const shortPill = `Sem ${currentSemesterNumber}/${totalSemesters} (${percentage}%)`;

  const isTertiaryCourse = Boolean(
    /CN|DN|CM|DM|NURS|MIDWIF|HEALTH|COLLEGE|SEM|Y1S|Y2S|Y3S/.test(str)
  );

  return {
    isTertiaryCourse,
    programmeCode,
    programmeTitle,
    totalSemesters,
    currentSemesterNumber,
    stageCode,
    stageLabel,
    percentage,
    remainingSemesters,
    isFinalSemester,
    isCompleted,
    formattedBadge,
    shortPill,
  };
}
