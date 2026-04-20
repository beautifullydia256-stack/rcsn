import { lazy, Suspense } from 'react';
import ThemedLoadingView from '@/components/ui/ThemedLoadingView';
import DesignTeacherDashboardEager from './DesignTeacherDashboard';

const isDesktop = import.meta.env.VITE_DESKTOP_MODE === 'true';
const DesignTeacherDashboardLazy = lazy(() => import('./DesignTeacherDashboard'));

/**
 * Single teacher home for all school types (Nursery/Primary and Secondary).
 * Primary vs secondary differences belong on exam entry only (see ExamResultsSubjectPage / PrePrimaryHolisticExamGrid).
 */
export default function TeacherDashboardHome() {
  if (isDesktop) {
    return <DesignTeacherDashboardEager />;
  }
  return (
    <Suspense fallback={<ThemedLoadingView />}>
      <DesignTeacherDashboardLazy />
    </Suspense>
  );
}
