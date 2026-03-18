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
import ActivityFeedCard from './components/ActivityFeedCard';
import JobVacanciesCard from './components/JobVacanciesCard';

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
          <div className="text-sm text-white/60 mb-1">
            <span className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400/90" />
              School Overview
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-1">School Overview</h1>
          <p className="text-white/70">Plan, prioritize, and manage your school with full visibility.</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => router.push('/dashboard/admin/students/add')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-[#05080f] bg-[#10d9a8] hover:bg-[#14f0bb] transition-colors"
          >
            + Add Student
          </button>
          <button
            onClick={() => {
              // Placeholder: UI button exists, but no backend/import route is wired yet.
              router.push('#');
            }}
            title="Import Data is a UI-only placeholder for now"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/70 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            Import Data
          </button>
          <button
            onClick={() => router.push('/dashboard/admin/reports/generate')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/70 bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            Generate Report
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

      {/* Activity feed + job vacancies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ActivityFeedCard />
        <JobVacanciesCard />
      </div>

      {/* Staff Overview (optional) */}
      <StaffOverviewCard />

      {/* Recent Reports & System Health */}
      <RecentReportsSystemHealth />

      {/* Footer */}
      <footer className="mt-12 py-6 text-center text-sm text-white/60">
        <p>© {new Date().getFullYear()} PwezaCore School Management System.</p>
      </footer>
    </>
  );
}
