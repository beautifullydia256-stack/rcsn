/**
 * PwezaCore - Tertiary Institutions & Health Training (Nursing & Midwifery)
 * Domain Models and Type Definitions
 */

export type AwardLevel = 'certificate' | 'diploma' | 'higher_diploma' | 'bachelor';

export type SemesterStage =
  | 'Y1S1'
  | 'Y1S2'
  | 'Y2S1'
  | 'Y2S2'
  | 'Y3S1'
  | 'Y3S2'
  | 'COMPLETED';

export type CourseUnitType = 'theory' | 'practical' | 'clinical' | 'blended';

export type AlphabeticalGrade = 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D+' | 'D' | 'F';

export type AcademicStanding =
  | 'NORMAL_PROGRESS'
  | 'PROBATION'
  | 'DISCONTINUED'
  | 'COMPLETED_AWAITING_GRADUATION';

export type AwardClassification =
  | 'CLASS_I_DISTINCTION'
  | 'CLASS_II_CREDIT_UPPER'
  | 'CLASS_II_CREDIT_LOWER'
  | 'PASS'
  | 'FAIL';

export interface GradeScaleEntry {
  minScore: number;
  maxScore: number;
  grade: AlphabeticalGrade;
  gradePoint: number;
  remarks: string;
}

export interface Programme {
  id: string;
  schoolId: string;
  code: string; // e.g. "CN", "CM", "DN", "DM"
  title: string; // e.g. "Certificate in Nursing"
  awardLevel: AwardLevel;
  durationYears: number; // e.g. 2.5
  totalSemesters: number; // e.g. 5
  department?: string; // e.g. "Nursing"
  createdAt?: string;
  updatedAt?: string;
}

export interface Cohort {
  id: string;
  schoolId: string;
  programmeId: string;
  intakeName: string; // e.g. "January 2024 Intake", "August 2024 Intake"
  intakeYear: number; // e.g. 2024
  intakeMonth: string; // e.g. "Jan", "Aug"
  currentStage: SemesterStage; // e.g. "Y1S2"
  expectedCompletionDate?: string; // e.g. "Jun-2026"
  isActive: boolean;
  studentCount?: number;
}

export interface CourseUnit {
  id: string;
  schoolId: string;
  programmeId?: string; // specific programme or null for shared
  code: string; // e.g. "CN 111"
  title: string; // e.g. "Anatomy and Physiology I and First Aid"
  creditUnits: number; // e.g. 4.0
  unitType: CourseUnitType;
  defaultSemester: SemesterStage; // e.g. "Y1S1"
  passMark: number; // default 50.0
  isCore: boolean;
}

export interface TertiaryStudentProfile {
  id: string; // internal UUID / student_id
  schoolId: string;
  fullName: string;
  gender?: 'male' | 'female' | string;
  dateOfBirth?: string;
  nationality?: string;
  collegeRegNo: string; // e.g. "CNS/2024/018"
  unmebExamNo?: string; // e.g. "U025/004"
  nsinNumber?: string; // e.g. "JAN22/U025/CN/004"
  photoUrl?: string;
  programmeId: string;
  programmeName?: string;
  programmeCode?: string;
  cohortId: string;
  cohortName?: string;
  currentStage: SemesterStage;
  academicStanding: AcademicStanding;
  sponsorName?: string;
  sponsorPhone?: string;
  sponsorEmail?: string;
  feesBalance?: number;
  feesCleared?: boolean;
}

/** Tier 1: School Internal Continuous Assessment */
export interface InternalAssessmentRecord {
  id: string;
  studentId: string;
  schoolId: string;
  cohortId: string;
  semesterStage: SemesterStage;
  courseUnitId: string;
  courseUnitCode: string;
  courseUnitTitle: string;
  creditUnits: number;
  courseworkScore?: number; // e.g. 22/30
  examScore?: number; // e.g. 46/70
  totalScore: number; // out of 100
  grade: AlphabeticalGrade;
  gradePoint: number;
  isRetake: boolean;
  remarks?: string;
  updatedAt: string;
}

/** Tier 2: Official UNMEB Board Semester Examination Result */
export interface UnmebResultRecord {
  id: string;
  studentId: string;
  schoolId: string;
  unmebExamNo: string;
  nsinNumber?: string;
  semesterStage: SemesterStage;
  courseUnitCode: string;
  courseUnitTitle: string;
  creditUnits: number;
  gradePoint: number; // e.g. 5.0
  letterGrade: AlphabeticalGrade; // e.g. "A"
  isRetake: boolean;
  academicYearSession?: string; // e.g. "2024/2025 Semester 1"
  importedAt: string;
}

export interface SemesterResultSummary {
  semesterStage: SemesterStage;
  semesterLabel: string;
  courseUnits: {
    code: string;
    title: string;
    creditUnits: number;
    catScore?: number;
    examScore?: number;
    totalScore?: number;
    grade: AlphabeticalGrade;
    gradePoint: number;
    status: 'PASS' | 'RETAKE';
  }[];
  totalCreditUnits: number;
  totalGradePoints: number;
  semesterGPA: number;
  cumulativeCGPA: number;
  academicStanding: AcademicStanding;
  retakeUnitsCount: number;
}

export interface HospitalWardPosting {
  id: string;
  schoolId: string;
  cohortId?: string;
  studentId?: string;
  hospitalName: string;
  wardName: string; // e.g. "Maternity / Labour Ward", "Surgical Ward"
  startDate: string;
  endDate: string;
  requiredHours?: number; // e.g. 120
  completedHours?: number;
  physicalLogbookVerified: boolean;
  clinicalInstructorSignoff?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cleared';
}

export interface AcademicCalendarSession {
  id: string;
  schoolId: string;
  sessionName: string; // e.g. "2025/2026 Academic Year – Semester 1"
  academicYear: string; // e.g. "2025/2026"
  sessionNumber: 1 | 2; // Semester 1 or 2
  startDate: string;
  teachingEndDate?: string;
  examsStartDate?: string;
  examsEndDate?: string;
  officialEndDate: string;
  isActive: boolean;
}
