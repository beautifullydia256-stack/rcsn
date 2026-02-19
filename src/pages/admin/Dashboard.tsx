import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import AdminContentSkeleton from '@/components/layout/AdminContentSkeleton';
import AdminKPICards from './components/AdminKPICards';
import QuickActions from './components/QuickActions';
import PendingExpensesCard from './components/PendingExpensesCard';
import ChartsAnalytics from './components/ChartsAnalytics';
import RemindersCard from './components/RemindersCard';
import UpcomingDueCard from './components/UpcomingDueCard';
import StaffOverviewCard from './components/StaffOverviewCard';
import RecentPaymentsNotifications from './components/RecentPaymentsNotifications';
import RecentReportsSystemHealth from './components/RecentReportsSystemHealth';

const STALE_TIME_MS = 5 * 60 * 1000; // 5 min

async function fetchDashboardAuth(userId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('role, school_id')
    .eq('user_id', user.id)
    .single();

  if (userError || !userData) throw new Error('Unable to load user data. Please contact support.');
  if (userData.role !== 'admin') throw new Error('Not admin');
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
  };
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const rolloverFired = useRef(false);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard', 'admin', 'auth', user?.id ?? ''],
    queryFn: () => fetchDashboardAuth(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
    retry: false,
  });

  useEffect(() => {
    if (!data?.schoolId || rolloverFired.current) return;
    rolloverFired.current = true;
    void (async () => {
      try {
        const nextYear = new Date().getFullYear() + 1;
        const { ensureAcademicYearExists } = await import('@/lib/ensureAcademicYear');
        await ensureAcademicYearExists(nextYear); // Rollover integration: next year must exist
        const { error } = await supabase.rpc('automatic_term3_rollover');
        if (error) throw error;
      } catch {
        // Silent fail
      }
    })();
  }, [data?.schoolId]);

  if ((!user?.id || isLoading) && !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 border-t-green-600" />
          <p className="text-gray-600">Loading dashboard...</p>
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
      navigate(`/login?returnUrl=${encodeURIComponent('/dashboard/admin')}`);
      return null;
    }
    if (message === 'Not admin') {
      navigate('/dashboard');
      return null;
    }

    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <div className="mb-4 text-4xl text-red-500">⚠️</div>
          <h2 className="mb-2 text-xl font-bold text-gray-900">Account Setup Required</h2>
          <p className="mb-6 text-gray-600">{displayMessage}</p>
          {missingSchoolId && (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="rounded-lg bg-green-600 px-6 py-3 text-white transition-colors hover:bg-green-700"
            >
              Complete School Setup
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Dashboard</h1>
          <p className="text-gray-600">Plan, prioritize, and manage your school with ease.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/students/add')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
          >
            + Add Student
          </button>
          <button
            type="button"
            onClick={() => {}}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Import Data
          </button>
        </div>
      </div>

      <div className="space-y-6">
        <AdminKPICards schoolId={data.schoolId} />

        <QuickActions />

        <PendingExpensesCard />

        <ChartsAnalytics />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RemindersCard />
          <UpcomingDueCard />
        </div>

        <RecentPaymentsNotifications />

        <StaffOverviewCard />

        <RecentReportsSystemHealth />
      </div>

      <footer className="mt-12 py-6 text-center text-sm text-gray-500">
        <p>© 2025 PwezaCore School Management System.</p>
      </footer>
    </>
  );
}
