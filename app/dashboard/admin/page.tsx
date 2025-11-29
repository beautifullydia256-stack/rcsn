'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/src/lib/supabase';
import AdminKPICards from './components/KPICards';
import QuickActions from './components/QuickActions';
import PendingExpensesCard from './components/PendingExpensesCard';
import ChartsAnalytics from './components/ChartsAnalytics';
import RecentPaymentsNotifications from './components/RecentPaymentsNotifications';
import AIInsightsPanel from './components/AIInsightsPanel';
import AIForecasting from './components/AIForecasting';
import AIQuickActions from './components/AIQuickActions';
import AITeacherAnalytics from './components/AITeacherAnalytics';
import AIFeeRecoveryAssistant from './components/AIFeeRecoveryAssistant';
import RecentReportsSystemHealth from './components/RecentReportsSystemHealth';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          const returnUrl = encodeURIComponent('/dashboard/admin');
          router.push(`/login?returnUrl=${returnUrl}`);
          return;
        }

        // Check if user is admin
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (userData?.role !== 'admin') {
          router.push('/dashboard');
          return;
        }
      } catch (error) {
        console.error('Error checking auth:', error);
        router.push('/login');
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/30"></div>
          <p className="text-white/85">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Admin Dashboard</h1>
        <p className="text-white/85">Manage your school operations and view insights</p>
      </div>

      {/* KPI Cards */}
      <AdminKPICards />

      {/* Quick Actions */}
      <QuickActions />

      {/* Pending Expense Approvals */}
      <PendingExpensesCard />

      {/* Charts & Analytics */}
      <ChartsAnalytics />

      {/* Recent Payments & Notifications */}
      <RecentPaymentsNotifications />

      {/* AI-Powered Features */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          AI-Powered Features
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <AIInsightsPanel />
          <AIForecasting />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <AIQuickActions />
          <AITeacherAnalytics />
        </div>
        <AIFeeRecoveryAssistant />
      </div>

      {/* Recent Reports & System Health */}
      <RecentReportsSystemHealth />

      {/* Footer */}
      <footer className="mt-12 py-6 text-center text-sm" style={{ color: 'rgba(255, 255, 255, 0.55)' }}>
        <p>© 2025 PwezaCore School Management System. Powered by AI.</p>
      </footer>
    </>
  );
}
