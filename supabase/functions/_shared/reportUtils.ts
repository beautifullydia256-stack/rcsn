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

function calculateGradeOLevel(marks: number, totalMarks: number): { grade: string; points: number } {
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
