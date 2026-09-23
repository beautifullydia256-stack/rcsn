/**
 * Service to automatically infer a student's expected academic stage and
 * completion/graduate standing based on their Course, Intake Year, Intake Session,
 * and the elapsed calendar semesters.
 */

export interface TertiaryStageInferenceResult {
  stageCode: 'Y1S1' | 'Y1S2' | 'Y2S1' | 'Y2S2' | 'Y3S1' | 'Y3S2' | 'GRADUATED';
  isCompleted: boolean;
  semesterIndex: number;
  totalSemesters: number;
  suggestedAdmissionDate: string;
}

export function inferTertiaryAcademicStage(
  courseCode: string,
  intakeYear: number,
  intakeBatch: string,
  referenceDate: Date = new Date(),
): TertiaryStageInferenceResult {
  const normCourse = (courseCode || '').toUpperCase();
  const isDiploma = normCourse.startsWith('D') || normCourse.includes('DIPLOMA');
  const totalSemesters = isDiploma ? 6 : 5; // 3.0 yrs (6 sems) for Diploma vs 2.5 yrs (5 sems) for Certificate

  const isMarch = (intakeBatch || '').toLowerCase().includes('march');
  const startMonth = isMarch ? 2 : 7; // March (0-indexed 2) vs August (0-indexed 7)
  const suggestedAdmissionDate = `${intakeYear}-${isMarch ? '03-01' : '08-15'}`;

  const currentYear = referenceDate.getFullYear();
  const currentMonth = referenceDate.getMonth();

  const elapsedMonths = (currentYear - intakeYear) * 12 + (currentMonth - startMonth);

  if (elapsedMonths < 0) {
    // Intake is in the future
    return {
      stageCode: 'Y1S1',
      isCompleted: false,
      semesterIndex: 1,
      totalSemesters,
      suggestedAdmissionDate,
    };
  }

  // Each semester represents approximately 6 calendar months
  const semesterIndex = Math.floor(elapsedMonths / 6) + 1;

  if (semesterIndex > totalSemesters) {
    return {
      stageCode: 'GRADUATED',
      isCompleted: true,
      semesterIndex,
      totalSemesters,
      suggestedAdmissionDate,
    };
  }

  let stageCode: 'Y1S1' | 'Y1S2' | 'Y2S1' | 'Y2S2' | 'Y3S1' | 'Y3S2' | 'GRADUATED';
  switch (semesterIndex) {
    case 1:
      stageCode = 'Y1S1';
      break;
    case 2:
      stageCode = 'Y1S2';
      break;
    case 3:
      stageCode = 'Y2S1';
      break;
    case 4:
      stageCode = 'Y2S2';
      break;
    case 5:
      stageCode = 'Y3S1';
      break;
    case 6:
      stageCode = isDiploma ? 'Y3S2' : 'GRADUATED';
      break;
    default:
      stageCode = 'GRADUATED';
      break;
  }

  return {
    stageCode,
    isCompleted: stageCode === 'GRADUATED',
    semesterIndex,
    totalSemesters,
    suggestedAdmissionDate,
  };
}
