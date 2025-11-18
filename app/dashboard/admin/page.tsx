'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/src/lib/supabase';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import GlassBackground from './components/GlassBackground';
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
import AcademicReportGenerator from './components/AcademicReportGenerator';

export default function AdminDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);

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
      <div className="min-h-screen relative" style={{ background: 'linear-gradient(135deg, #0f0f16 0%, #1a1a23 50%, #1e1e28 100%)' }}>
        <GlassBackground />
        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/30"></div>
            <p className="text-white/85">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" style={{ background: 'linear-gradient(135deg, #0f0f16 0%, #1a1a23 50%, #1e1e28 100%)' }}>
      {/* Glassmorphism Background */}
      <GlassBackground />

      {/* Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        onCollapse={setIsSidebarCollapsed}
      />

      {/* Main Content */}
      <div className={`transition-all duration-300 relative z-10 ${
        isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-72'
      }`}>
        {/* Navbar */}
        <Navbar
          onSearch={(query) => {
            setSearchQuery(query);
            setShowSearchResults(query.trim().length > 0);
          }}
          searchQuery={searchQuery}
          showSearchResults={showSearchResults}
          onCloseSearch={() => setShowSearchResults(false)}
        />

        {/* Dashboard Content */}
        <main className="p-4 sm:p-6 lg:p-8 relative z-10">
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

          {/* Report Generators */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <span className="text-2xl">📊</span>
              Report Generators
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <AcademicReportGenerator />
              <div className="text-white/70 text-sm p-4 bg-white/5 rounded-lg border border-white/10">
                <p className="mb-2">📋 <strong>Attendance Analysis Report</strong></p>
                <p className="text-xs">Available in AI Quick Actions section below</p>
              </div>
            </div>
          </div>

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
        </main>
      </div>
    </div>
  );
}
