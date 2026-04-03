import { lazy, Suspense } from 'react';
import ThemedLoadingView from '@/components/ui/ThemedLoadingView';

const DesignTeacherDashboard = lazy(() => import('./DesignTeacherDashboard'));

/**
 * Single teacher home for all school types (Nursery/Primary and Secondary).
 * Primary vs secondary differences belong on exam entry only (see ExamResultsSubjectPage / PrePrimaryHolisticExamGrid).
 */
export default function TeacherDashboardHome() {
  return (
    <Suspense fallback={<ThemedLoadingView />}>
      <DesignTeacherDashboard />
    </Suspense>
  );
}
