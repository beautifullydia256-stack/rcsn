/**
 * PwezaCore Tertiary / Nursing & Midwifery Grading Engine
 * Computes GP, AG, Semester GPA, Cumulative CGPA, Academic Standing, and Award Classification
 * Aligned with the national UHPAB (formerly UNMEB) 5.0 Scale & strict 50% pass mark rule.
 */

import {
  AlphabeticalGrade,
  GradeScaleEntry,
  AcademicStanding,
  AwardClassification,
  SemesterStage,
} from '../types';
import { UHPAB_STANDARD_GRADING_SCALE, UNMEB_STANDARD_GRADING_SCALE, STAGE_LABELS } from '../data/unmebCurriculumDefaults';

export interface ScoreGradeResult {
  grade: AlphabeticalGrade;
  gradePoint: number;
  remarks: string;
  isRetake: boolean;
}

/**
 * Translates a numerical score percentage into an Alphabetical Grade (AG) and Grade Point (GP).
 * Default pass mark is 50.0%. Any score below 50.0% is an automatic Retake.
 */
export function calculateGradeAndGP(
  score: number,
  scale: GradeScaleEntry[] = UHPAB_STANDARD_GRADING_SCALE,
  customPassMark: number = 50.0
): ScoreGradeResult {
  const rounded = Math.round(score * 100) / 100;

  // Strict pass mark check
  if (rounded < customPassMark) {
    return {
      grade: 'F',
      gradePoint: 0.0,
      remarks: 'Fail (Automatic Retake Required)',
      isRetake: true,
    };
  }

  for (const entry of scale) {
    if (rounded >= entry.minScore && rounded <= entry.maxScore) {
      return {
        grade: entry.grade,
        gradePoint: entry.gradePoint,
        remarks: entry.remarks,
        isRetake: entry.grade === 'F' || entry.gradePoint < 2.0,
      };
    }
  }

  // Fallback if out of range
  if (rounded >= 80) {
    return { grade: 'A', gradePoint: 5.0, remarks: 'Excellent Distinction', isRetake: false };
  }
  return { grade: 'F', gradePoint: 0.0, remarks: 'Fail (Automatic Retake Required)', isRetake: true };
}

/**
 * Calculates the Semester Grade Point Average (GPA).
 * GPA = Sum(GP * CU) / Sum(CU)
 */
export function calculateSemesterGPA(
  units: { creditUnits: number; gradePoint: number }[]
): number {
  if (!units || units.length === 0) return 0.0;

  let totalWeightedPoints = 0;
  let totalCreditUnits = 0;

  for (const u of units) {
    const cu = Number(u.creditUnits) || 1.0;
    const gp = Number(u.gradePoint) || 0.0;
    totalWeightedPoints += gp * cu;
    totalCreditUnits += cu;
  }

  if (totalCreditUnits === 0) return 0.0;
  const gpa = totalWeightedPoints / totalCreditUnits;
  return Math.round(gpa * 100) / 100;
}

/**
 * Calculates the Cumulative Grade Point Average (CGPA) across all completed semesters.
 * CGPA = Sum of all (GP * CU) across all completed semesters / Total CU completed.
 */
export function calculateCumulativeCGPA(
  allHistoricalUnits: { creditUnits: number; gradePoint: number }[]
): number {
  return calculateSemesterGPA(allHistoricalUnits);
}

/**
 * Determines academic standing for a semester:
 * - NORMAL_PROGRESS: All course units passed (>= 50%, GP >= 2.0) and GPA >= 2.0
 * - PROBATION: 1 or more failed units, or GPA < 2.0
 */
export function determineAcademicStanding(
  units: { isRetake?: boolean; gradePoint: number }[],
  semesterGPA: number
): AcademicStanding {
  const hasRetake = units.some((u) => u.isRetake || u.gradePoint < 2.0);
  if (hasRetake || semesterGPA < 2.0) {
    return 'PROBATION';
  }
  return 'NORMAL_PROGRESS';
}

/**
 * Determines the Final Graduation Award Classification based on final cumulative CGPA:
 * 4.40 - 5.00: Class I (Distinction)
 * 3.60 - 4.39: Class II (Credit - Upper Division)
 * 2.80 - 3.59: Class II (Credit - Lower Division)
 * 2.00 - 2.79: Pass
 * Below 2.00: Fail / Did Not Qualify
 */
export function determineAwardClassification(finalCGPA: number): AwardClassification {
  if (finalCGPA >= 4.4) return 'CLASS_I_DISTINCTION';
  if (finalCGPA >= 3.6) return 'CLASS_II_CREDIT_UPPER';
  if (finalCGPA >= 2.8) return 'CLASS_II_CREDIT_LOWER';
  if (finalCGPA >= 2.0) return 'PASS';
  return 'FAIL';
}

export function formatAwardLabel(award: AwardClassification): string {
  switch (award) {
    case 'CLASS_I_DISTINCTION':
      return 'CLASS I (DISTINCTION)';
    case 'CLASS_II_CREDIT_UPPER':
      return 'CLASS II (CREDIT - UPPER DIVISION)';
    case 'CLASS_II_CREDIT_LOWER':
      return 'CLASS II (CREDIT - LOWER DIVISION)';
    case 'PASS':
      return 'PASS';
    case 'FAIL':
      return 'FAILED / DID NOT QUALIFY';
  }
}

export function formatStageLabel(stage: SemesterStage | string): string {
  return STAGE_LABELS[stage] ?? stage;
}
