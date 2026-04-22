import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ADMIN_GC_TIME_MS, ADMIN_STALE_TIME_MS } from '@/lib/adminQueryDefaults';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import DesignAdminDashboard from '@/pages/admin/components/DesignAdminDashboard';
import AdminWorkforceSummaryStrip from '@/pages/admin/workforce/AdminWorkforceSummaryStrip';

const HT_HOME = '/dashboard/head-teacher';

function normalizeRole(role: string | null | undefined) {
  return String(role ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

export async function fetchHeadTeacherDashboardAuth(userId: string) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role, school_id, name')
    .eq('user_id', user.id)
    .single();

  if (userError || !userData) throw new Error('Unable to load user data. Please contact support.');
  if (normalizeRole(userData.role as string) !== 'head_teacher') throw new Error('Not head teacher');
  if (!userData.school_id) throw new Error('MISSING_SCHOOL_ID');

  const { data: schoolData, error: schoolError } = await supabase
    .from('schools')
    .select('school_id, name')
    .eq('school_id', userData.school_id)
    .single();

  if (schoolError || !schoolData) throw new Error('Your school record could not be found. Please contact support.');

  return {
    schoolId: userData.school_id as string,
    schoolName: schoolData.name as string,
    role: userData.role as string,
    displayName: (userData.name as string | null) || null,
  };
}

export default function HeadTeacherDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const schoolIdFromStore = useAuthStore((s) => s.schoolId);
  const rolloverFired = useRef(false);

  const schoolId = schoolIdFromStore ?? undefined;

  const { data: authData, isPending, isError, error } = useQuery({
    queryKey: ['dashboard', 'head-teacher', 'auth', user?.id ?? ''],
    queryFn: () => fetchHeadTeacherDashboardAuth(user!.id),
    enabled: !!user?.id,
    staleTime: ADMIN_STALE_TIME_MS,
    gcTime: ADMIN_GC_TIME_MS,
    retry: false,
  });

  useEffect(() => {
    const sid = schoolId ?? authData?.schoolId;
    if (!sid || rolloverFired.current) return;
    rolloverFired.current = true;
    void (async () => {
      try {
        const nextYear = new Date().getFullYear() + 1;
        const { ensureAcademicYearExists } = await import('@/lib/ensureAcademicYear');
        await ensureAcademicYearExists(nextYear);
        const { error: rpcError } = await supabase.rpc('automatic_term3_rollover');
        if (rpcError) throw rpcError;
      } catch {
        // Silent fail
      }
    })();
  }, [schoolId, authData?.schoolId]);

  if (!user?.id) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-[var(--ac-border)] border-t-emerald-500" />
          <p className="ac-text-secondary">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (isError && error) {
    const message = error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.';
    const missingSchoolId = message === 'MISSING_SCHOOL_ID';
    const displayMessage = missingSchoolId
      ? 'Your account is not linked to a school. Please contact support to complete your account setup.'
      : message;

    if (message === 'Not authenticated') {
      navigate(`/login?returnUrl=${encodeURIComponent(HT_HOME)}`);
      return null;
    }
    if (message === 'Not head teacher') {
      navigate('/dashboard');
      return null;
    }

    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <div className="mb-4 text-4xl text-red-500">⚠️</div>
          <h2 className="mb-2 text-xl font-bold ac-text-primary">Account Setup Required</h2>
          <p className="mb-6 ac-text-secondary">{displayMessage}</p>
          {missingSchoolId && (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="rounded-lg bg-emerald-600 px-6 py-3 text-white transition-colors hover:bg-emerald-700"
            >
              Complete School Setup
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="ac-text-secondary hover:opacity-100 opacity-80 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (isPending || !authData?.schoolId) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-[var(--ac-border)] border-t-emerald-500" />
          <p className="ac-text-secondary">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <AdminWorkforceSummaryStrip schoolId={authData.schoolId} />
      <DesignAdminDashboard
        schoolId={authData.schoolId}
        adminName={authData.displayName ?? ''}
        basePath={HT_HOME}
      />
    </div>
  );
}
