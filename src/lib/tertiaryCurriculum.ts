import {
  UNMEB_CERTIFICATE_NURSING_UNITS,
  DEFAULT_PROGRAMMES,
  STAGE_LABELS,
} from '@/features/tertiary/data/unmebCurriculumDefaults';

export type TertiarySemester = {
  code: string; // e.g. 'Y1S1'
  label: string; // e.g. 'Year 1 Semester 1'
  short: string; // e.g. 'Y1 S1'
  year: number;
  semester: number;
};

export type TertiaryProgramme = {
  code: string; // 'CN' | 'DN' | 'CM' | 'DM'
  name: string; // 'Certificate in Nursing'
  fullName: string; // 'Certificate in Nursing (CN)'
  awardLevel: 'certificate' | 'diploma';
  durationYears: number;
  totalSemesters: number;
  department: string;
  semesters: TertiarySemester[];
};

const SEMESTERS_5: TertiarySemester[] = [
  { code: 'Y1S1', label: 'Year 1 Semester 1', short: 'Y1 S1', year: 1, semester: 1 },
  { code: 'Y1S2', label: 'Year 1 Semester 2', short: 'Y1 S2', year: 1, semester: 2 },
  { code: 'Y2S1', label: 'Year 2 Semester 1', short: 'Y2 S1', year: 2, semester: 1 },
  { code: 'Y2S2', label: 'Year 2 Semester 2', short: 'Y2 S2', year: 2, semester: 2 },
  { code: 'Y3S1', label: 'Year 3 Semester 1', short: 'Y3 S1', year: 3, semester: 1 },
];

const SEMESTERS_6: TertiarySemester[] = [
  ...SEMESTERS_5,
  { code: 'Y3S2', label: 'Year 3 Semester 2', short: 'Y3 S2', year: 3, semester: 2 },
];

export const TERTIARY_PROGRAMMES: TertiaryProgramme[] = [
  {
    code: 'CN',
    name: 'Certificate in Nursing',
    fullName: 'Certificate in Nursing (CN)',
    awardLevel: 'certificate',
    durationYears: 2.5,
    totalSemesters: 5,
    department: 'Nursing',
    semesters: SEMESTERS_5,
  },
  {
    code: 'DN',
    name: 'Diploma in Nursing',
    fullName: 'Diploma in Nursing (DN)',
    awardLevel: 'diploma',
    durationYears: 3.0,
    totalSemesters: 6,
    department: 'Nursing',
    semesters: SEMESTERS_6,
  },
  {
    code: 'CM',
    name: 'Certificate in Midwifery',
    fullName: 'Certificate in Midwifery (CM)',
    awardLevel: 'certificate',
    durationYears: 2.5,
    totalSemesters: 5,
    department: 'Midwifery',
    semesters: SEMESTERS_5,
  },
  {
    code: 'DM',
    name: 'Diploma in Midwifery',
    fullName: 'Diploma in Midwifery (DM)',
    awardLevel: 'diploma',
    durationYears: 3.0,
    totalSemesters: 6,
    department: 'Midwifery',
    semesters: SEMESTERS_6,
  },
];

export function getProgrammeByCode(code: string | null | undefined): TertiaryProgramme | undefined {
  if (!code) return undefined;
  const upper = code.trim().toUpperCase();
  return TERTIARY_PROGRAMMES.find((p) => p.code === upper || p.fullName.toUpperCase().includes(upper));
}

export function getSemestersForProgramme(code: string | null | undefined): TertiarySemester[] {
  const prog = getProgrammeByCode(code);
  return prog ? prog.semesters : SEMESTERS_5;
}

/**
 * Standardized database cohort key representation.
 * Format: "${courseCode} – ${semesterLabel}" (e.g. "CN – Year 1 Semester 1")
 */
export function buildCohortKey(courseCode: string, semesterLabel: string): string {
  return `${courseCode.trim()} – ${semesterLabel.trim()}`;
}

export function parseCohortKey(cohortKey: string): {
  courseCode: string;
  semesterLabel: string;
  semesterCode?: string;
  short?: string;
  isValid: boolean;
} {
  if (!cohortKey || !cohortKey.includes(' – ')) {
    // Check if it's a plain course code or plain full name
    const prog = getProgrammeByCode(cohortKey);
    return {
      courseCode: prog?.code || cohortKey,
      semesterLabel: '',
      isValid: false,
    };
  }

  const [code, semLabel] = cohortKey.split(' – ').map((s) => s.trim());
  const prog = getProgrammeByCode(code);
  const sem = prog?.semesters.find((s) => s.label.toLowerCase() === semLabel.toLowerCase() || s.code.toLowerCase() === semLabel.toLowerCase());

  return {
    courseCode: prog?.code || code,
    semesterLabel: sem?.label || semLabel,
    semesterCode: sem?.code,
    short: sem?.short,
    isValid: !!sem,
  };
}

/**
 * All 22 canonical tertiary cohorts for tertiary institutions
 */
export const ALL_TERTIARY_COHORTS: string[] = TERTIARY_PROGRAMMES.flatMap((prog) =>
  prog.semesters.map((sem) => buildCohortKey(prog.code, sem.label))
);

/**
 * Helper to fetch pre-loaded UNMEB curriculum default units for a specific semester
 */
export function getUnmebDefaultUnitsForSemester(courseCode: string, semesterCode: string): string[] {
  const upperCode = courseCode.toUpperCase();
  if (upperCode === 'CN') {
    return UNMEB_CERTIFICATE_NURSING_UNITS
      .filter((u) => u.defaultSemester === semesterCode)
      .map((u) => u.title);
  }
  // Midwifery / Diploma defaults (can expand or fallback to common modules)
  if (upperCode === 'CM') {
    if (semesterCode === 'Y1S1') {
      return [
        'Anatomy and Physiology I and First Aid',
        'Foundations of Midwifery and Basic Computer',
        'Personal and Communal Health and Microbiology',
        'Practical I (Skills Lab & Hospital Placement)',
      ];
    }
    if (semesterCode === 'Y1S2') {
      return [
        'Anatomy and Physiology II',
        'Foundations of Midwifery II, Sociology and Psychology',
        'Primary Health Care and Health Education',
        'Practical II (Clinical Ward & Antenatal Placement)',
      ];
    }
  }
  if (upperCode === 'DN' || upperCode === 'DM') {
    if (semesterCode === 'Y1S1') {
      return [
        'Advanced Anatomy & Physiology I',
        'Foundations of Professional Nursing & Information Technology',
        'Biochemistry & Microbiology',
        'Clinical Practice I',
      ];
    }
    if (semesterCode === 'Y1S2') {
      return [
        'Advanced Anatomy & Physiology II',
        'Pharmacology & Therapeutics I',
        'Sociology & Behavioural Sciences',
        'Clinical Practice II (Medical & Surgical Wards)',
      ];
    }
  }
  return [];
}
