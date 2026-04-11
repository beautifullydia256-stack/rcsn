/**
 * Chooses the report generator from `schools.type` (same source as Settings):
 * Secondary → SPA /reports/generate-secondary; PDF still POST /api/pdf/generate + secondaryPipeline.
 */
import { lazy, Suspense } from 'react';
import { Link, Navigate } from 'react-router-dom';
import AdminPageWrapper, { adminCardClass } from '@/components/layout/AdminPageWrapper';
import ThemedLoadingView from '@/components/ui/ThemedLoadingView';
import { useSchoolType } from '@/hooks/useSchoolType';
import { useAuthStore } from '@/store/authStore';

const GenerateReportsPage = lazy(() => import('./GenerateReportsPage'));

export default function ReportGeneratorEntryPage() {
  const schoolIdFromStore = useAuthStore((s) => s.schoolId);
  const user = useAuthStore((s) => s.user);
  const schoolId =
    schoolIdFromStore ?? (user?.user_metadata?.school_id as string | undefined) ?? null;

  const { data: schoolType, isPending, isError } = useSchoolType();

  if (!schoolId) {
    return <ThemedLoadingView />;
  }

  if (isPending) {
    return <ThemedLoadingView />;
  }

  if (schoolType === 'Secondary') {
    return <Navigate to="/dashboard/admin/reports/generate-secondary" replace />;
  }

  /** Any value other than the two known enums falls through here — otherwise O-Level schools see the primary “Upper Section” preview by mistake. */
  if (schoolType !== 'Nursery/Primary') {
    return (
      <AdminPageWrapper
        eyebrow="Academic reports"
        title="Report generator"
        subtitle="Choose the correct school type to load the right templates."
      >
        <div
          className={`${adminCardClass} rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm ac-text-primary`}
        >
          <p className="mb-2 font-medium">
            This school’s type is not set to Nursery/Primary or Secondary{isError ? ', or it could not be loaded' : ''}.
          </p>
          <p className="ac-text-secondary mb-3">
            Secondary schools (Senior classes / O-Level reports) must use <strong>Secondary</strong> in Admin → School
            settings. Until then, this page would load the <em>primary</em> report preview (e.g. “Upper Section”, MID/END
            columns), which is not your O-Level template mapping.
          </p>
          <Link
            to="/dashboard/admin/settings"
            className="inline-block font-medium text-emerald-600 underline underline-offset-2 hover:text-emerald-700"
          >
            Open school settings
          </Link>
        </div>
      </AdminPageWrapper>
    );
  }

  return (
    <Suspense fallback={<ThemedLoadingView />}>
      <GenerateReportsPage />
    </Suspense>
  );
}
