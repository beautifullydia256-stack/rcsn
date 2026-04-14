// Deno-compatible port of reportUtils for primary report grading.
// Used by reportDataBuilder for consistent grades (D1–F9) and division/aggregate.

const PRIMARY_GRADE_SCALE: { min: number; max: number; grade: string }[] = [
  { min: 75, max: 100, grade: 'D1' },
  { min: 70, max: 74, grade: 'D2' },
  { min: 65, max: 69, grade: 'C3' },
  { min: 60, max: 64, grade: 'C4' },
  { min: 55, max: 59, grade: 'C5' },
  { min: 50, max: 54, grade: 'C6' },
  { min: 45, max: 49, grade: 'P7' },
  { min: 40, max: 44, grade: 'P8' },
  { min: 0, max: 39, grade: 'F9' },
];

const UGANDA_GRADE_SCALE: { min: number; max: number; grade: string; points: number }[] = [
  { min: 80, max: 100, grade: 'A', points: 6 },
  { min: 70, max: 79, grade: 'B', points: 5 },
  { min: 60, max: 69, grade: 'C', points: 4 },
  { min: 50, max: 59, grade: 'D', points: 3 },
  { min: 0, max: 49, grade: 'E', points: 1 },
];

export function calculatePrimaryGrade(marks: number, totalMarks: number): { grade: string; remark: string } {
  const percentage = totalMarks > 0 ? (marks / totalMarks) * 100 : 0;
  const scale = PRIMARY_GRADE_SCALE.find((s) => percentage >= s.min && percentage <= s.max);
  const grade = scale?.grade ?? 'F9';
  const remark = grade === 'F9' ? 'Fail' : 'Pass';
  return { grade, remark };
}

export function calculateDivision(average: number): string {
  if (average >= 80) return 'Division 1';
  if (average >= 60) return 'Division 2';
  if (average >= 40) return 'Division 3';
  if (average >= 20) return 'Division 4';
  return 'Ungraded';
}

export function calculateGradeOLevel(marks: number, totalMarks: number): { grade: string; points: number } {
  const percentage = totalMarks > 0 ? (marks / totalMarks) * 100 : 0;
  const gradeInfo = UGANDA_GRADE_SCALE.find((scale) => percentage >= scale.min && percentage <= scale.max);
  return gradeInfo || { grade: 'E', points: 1 };
}

export function calculateAggregate(results: { marks_obtained: number; total_marks: number }[]): number {
  let totalPoints = 0;
  let totalSubjects = 0;
  for (const r of results) {
    const g = calculateGradeOLevel(r.marks_obtained, r.total_marks);
    totalPoints += g.points;
    totalSubjects += 1;
  }
  return totalSubjects > 0 ? totalPoints / totalSubjects : 0;
}

/** Default UNEB-style UACE % → letter (matches `uace_default_grade_from_percent` / app DEFAULT_UACE_PERCENT_BANDS). */
const UACE_DEFAULT_PCT_BANDS: { min: number; max: number; grade: string }[] = [
  { min: 80, max: 100, grade: 'A' },
  { min: 70, max: 79.999, grade: 'B' },
  { min: 60, max: 69.999, grade: 'C' },
  { min: 50, max: 59.999, grade: 'D' },
  { min: 45, max: 49.999, grade: 'E' },
  { min: 40, max: 44.999, grade: 'O' },
  { min: 0, max: 39.999, grade: 'F' },
];

export function uaceGradeFromPercentDefault(percentage: number): string {
  const p = Number(percentage);
  if (!Number.isFinite(p)) return 'F';
  for (const row of UACE_DEFAULT_PCT_BANDS) {
    if (p >= row.min && p <= row.max) return row.grade;
  }
  return 'F';
}

/** UACE principal grade points; F = 0, O = 1 (subsidiary band letter). */
export function uacePointsFromGrade(grade: string): number {
  const g = String(grade || '')
    .trim()
    .toUpperCase();
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
    default:
      return 0;
  }
}
