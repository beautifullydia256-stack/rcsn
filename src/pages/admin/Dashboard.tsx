import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import AdminKPICards from './components/AdminKPICards';
import QuickActions from './components/QuickActions';
import PendingExpensesCard from './components/PendingExpensesCard';
import ChartsAnalytics from './components/ChartsAnalytics';
import RecentPaymentsNotifications from './components/RecentPaymentsNotifications';
import AISection from './components/AISection';
import RecentReportsSystemHealth from './components/RecentReportsSystemHealth';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingSchoolId, setMissingSchoolId] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate(`/login?returnUrl=${encodeURIComponent('/dashboard/admin')}`);
          return;
        }

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, school_id')
          .eq('user_id', user.id)
          .single();

        if (userError || !userData) {
          setError('Unable to load user data. Please contact support.');
          setLoading(false);
          return;
        }

        if (userData.role !== 'admin') {
          navigate('/dashboard');
          return;
        }

        if (!userData.school_id) {
          setMissingSchoolId(true);
          setError('Your account is not linked to a school. Please contact support to complete your account setup.');
          setLoading(false);
          return;
        }

        const { data: schoolData, error: schoolError } = await supabase
          .from('schools')
          .select('school_id, name')
          .eq('school_id', userData.school_id)
          .single();

        if (schoolError || !schoolData) {
          setError('Your school record could not be found. Please contact support.');
          setLoading(false);
          return;
        }

        setError(null);
      } catch (err) {
        console.error('Error checking auth:', err);
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-white/30" />
          <p className="text-white/85">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <div className="mb-4 text-4xl text-red-400">⚠️</div>
          <h2 className="mb-2 text-xl font-bold text-white">Account Setup Required</h2>
          <p className="mb-6 text-white/85">{error}</p>
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

  return (
    <>
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold text-white sm:text-3xl">Admin Dashboard</h1>
        <p className="text-white/85">Manage your school operations and view insights</p>
      </div>

      <AdminKPICards />

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
