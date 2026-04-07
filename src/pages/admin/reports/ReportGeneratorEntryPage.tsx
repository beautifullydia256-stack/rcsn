/**
 * Chooses the report generator from `schools.type` (same source as Settings):
 * Secondary → SPA /reports/generate-secondary; PDF still POST /api/pdf/generate + secondaryPipeline.
 */
import { lazy, Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import ThemedLoadingView from '@/components/ui/ThemedLoadingView';
import { useSchoolType } from '@/hooks/useSchoolType';
import { useAuthStore } from '@/store/authStore';

const GenerateReportsPage = lazy(() => import('./GenerateReportsPage'));

export default function ReportGeneratorEntryPage() {
  const schoolIdFromStore = useAuthStore((s) => s.schoolId);
  const user = useAuthStore((s) => s.user);
  const schoolId =
    schoolIdFromStore ?? (user?.user_metadata?.school_id as string | undefined) ?? null;

  const { data: schoolType, isPending } = useSchoolType();

  if (!schoolId) {
    return <ThemedLoadingView />;
  }

  if (isPending) {
    return <ThemedLoadingView />;
  }

  if (schoolType === 'Secondary') {
    return <Navigate to="/dashboard/admin/reports/generate-secondary" replace />;
  }

  return (
    <Suspense fallback={<ThemedLoadingView />}>
      <GenerateReportsPage />
    </Suspense>
  );
}
