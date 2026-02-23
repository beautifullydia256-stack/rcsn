'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/src/lib/supabase';
import AdminKPICards from './components/KPICards';
import QuickActions from './components/QuickActions';
import PendingExpensesCard from './components/PendingExpensesCard';
import ChartsAnalytics from './components/ChartsAnalytics';
import RemindersCard from './components/RemindersCard';
import UpcomingDueCard from './components/UpcomingDueCard';
import StaffOverviewCard from './components/StaffOverviewCard';
import RecentPaymentsNotifications from './components/RecentPaymentsNotifications';
import RecentReportsSystemHealth from './components/RecentReportsSystemHealth';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingSchoolId, setMissingSchoolId] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          const returnUrl = encodeURIComponent('/dashboard/admin');
          router.push(`/login?returnUrl=${returnUrl}`);
          return;
        }

        // Check if user is admin and has school_id
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role, school_id')
          .eq('user_id', user.id)
          .single();

        if (userError || !userData) {
          console.error('Error fetching user data:', userError);
          setError('Unable to load user data. Please contact support.');
          setLoading(false);
          return;
        }

        if (userData.role !== 'admin') {
          router.push('/dashboard');
          return;
        }

        // Check if school_id is missing
        if (!userData.school_id) {
          setMissingSchoolId(true);
          setError('Your account is not linked to a school. Please contact support to complete your account setup.');
          setLoading(false);
          return;
        }

        // Verify school exists
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

        // All checks passed
        setError(null);
      } catch (error) {
        console.error('Error checking auth:', error);
        setError('An unexpected error occurred. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-gray-200 border-t-green-600"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4 max-w-md text-center">
          <div className="text-red-500 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Account Setup Required</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          {missingSchoolId && (
            <button
              onClick={() => router.push('/auth/setup-school')}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Complete School Setup
            </button>
          )}
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Page Header: Title, subtitle, CTAs */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Dashboard</h1>
          <p className="text-gray-600">Plan, prioritize, and manage your school with ease.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => router.push('/dashboard/admin/students/add')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
          >
            + Add Student
          </button>
          <button
            onClick={() => router.push('#')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 transition-colors"
          >
            Import Data
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <AdminKPICards />

      {/* Quick Actions */}
      <QuickActions />

      {/* Pending Expense Approvals */}
      <PendingExpensesCard />

      {/* Charts & Analytics (hero + secondary) */}
      <ChartsAnalytics />

      {/* Reminders + Upcoming (two-column) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <RemindersCard />
        <UpcomingDueCard />
      </div>

      {/* Recent Payments & Notifications */}
      <RecentPaymentsNotifications />

      {/* Staff Overview (optional) */}
      <StaffOverviewCard />

      {/* Recent Reports & System Health */}
      <RecentReportsSystemHealth />

      {/* Footer */}
      <footer className="mt-12 py-6 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} PwezaCore School Management System.</p>
      </footer>
    </>
  );
}
