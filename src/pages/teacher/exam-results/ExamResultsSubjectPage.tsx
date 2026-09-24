import { useSchoolType } from '@/hooks/useSchoolType';
import LegacyExamResultsFullPage from './LegacyExamResultsFullPage';
import TertiaryContinuousAssessmentPage from './TertiaryContinuousAssessmentPage';

export default function ExamResultsSubjectPage() {
  const { isTertiary } = useSchoolType();

  if (isTertiary) {
    return <TertiaryContinuousAssessmentPage />;
  }

  return <LegacyExamResultsFullPage />;
}
