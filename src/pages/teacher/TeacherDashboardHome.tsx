import { lazy, Suspense } from 'react';
import ThemedLoadingView from '@/components/ui/ThemedLoadingView';
import { useSchoolType } from '@/hooks/useSchoolType';
import { useAuthStore } from '@/store/authStore';

const DesignTeacherDashboard = lazy(() => import('./DesignTeacherDashboard'));
const LegacyTeacherDashboard = lazy(() => import('./Dashboard'));

/**
 * Nursery/Primary schools use the HTML design dashboard; Secondary keeps the legacy React dashboard.
 */
export default function TeacherDashboardHome() {
  const user = useAuthStore((s) => s.user);
  const schoolId =
    useAuthStore((s) => s.schoolId) ?? (user?.user_metadata?.school_id as string | undefined) ?? null;
  const { data: schoolType, isLoading, isError, refetch, isFetching } = useSchoolType();

  if (!schoolId || isLoading) {
    return <ThemedLoadingView />;
  }

  if (isError) {
    return (
      <div className="ac-glass-card mx-auto max-w-md p-8 text-center border border-[var(--ac-border)]">
        <p className="ac-text-primary font-medium mb-2">Could not load school type</p>
        <p className="ac-text-muted text-sm mb-4">Check your connection and try again.</p>
        <button
          type="button"
          className="ac-glass-btn-primary rounded-xl px-4 py-2 text-sm font-medium"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          {isFetching ? 'Retrying…' : 'Retry'}
        </button>
      </div>
    );
  }

  const isPrimary = schoolType === 'Nursery/Primary';

  return (
    <Suspense fallback={<ThemedLoadingView />}>
      {isPrimary ? <DesignTeacherDashboard /> : <LegacyTeacherDashboard />}
    </Suspense>
  );
}
