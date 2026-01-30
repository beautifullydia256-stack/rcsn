import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import AdminContentSkeleton from '@/components/layout/AdminContentSkeleton';
import AdminKPICards from './components/AdminKPICards';
import QuickActions from './components/QuickActions';
import PendingExpensesCard from './components/PendingExpensesCard';
import ChartsAnalytics from './components/ChartsAnalytics';
import RecentPaymentsNotifications from './components/RecentPaymentsNotifications';
import AISection from './components/AISection';
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

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['dashboard', 'admin', 'auth', user?.id ?? ''],
    queryFn: () => fetchDashboardAuth(user!.id),
    enabled: !!user?.id,
    staleTime: STALE_TIME_MS,
    retry: false,
  });

  if ((!user?.id || isLoading) && !data) {
    return <AdminContentSkeleton />;
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
          <div className="mb-4 text-4xl text-red-400">⚠️</div>
          <h2 className="mb-2 text-xl font-bold text-white">Account Setup Required</h2>
          <p className="mb-6 text-white/85">{displayMessage}</p>
          {missingSchoolId && (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="rounded-lg bg-blue-600 px-6 py-3 text-white transition-colors hover:bg-blue-700"
            >
              Complete School Setup
            </button>
          )}
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="text-white/70 transition-colors hover:text-white"
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
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold text-white sm:text-3xl">Admin Dashboard</h1>
        <p className="text-white/85">Manage your school operations and view insights</p>
      </div>

      <AdminKPICards schoolId={data.schoolId} />

      <QuickActions />

      <PendingExpensesCard />

      <ChartsAnalytics />

      <RecentPaymentsNotifications />

      <AISection />

      <RecentReportsSystemHealth />

      <footer className="mt-12 py-6 text-center text-sm" style={{ color: 'rgba(255, 255, 255, 0.55)' }}>
        <p>© 2025 PwezaCore School Management System. Powered by AI.</p>
      </footer>
    </>
  );
}
