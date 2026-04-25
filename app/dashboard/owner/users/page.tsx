"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
import AllUsersPage from "./components/AllUsersPage";
import AdminsPage from "./components/AdminsPage";
import UserRolesPage from "./components/UserRolesPage";
import LoginActivityPage from "./components/LoginActivityPage";

type TabType = 'all-users' | 'admins' | 'user-roles' | 'login-activity';

interface UserManagementStats {
  totalUsers: number;
  activeUsers: number;
  usersByRole: Record<string, number>;
  recentLogins: number;
}

export default function UsersManagementPage() {
  const [activeTab, setActiveTab] = useState<TabType>('all-users');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UserManagementStats>({
    totalUsers: 0,
    activeUsers: 0,
    usersByRole: {},
    recentLogins: 0,
  });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      
      // Get total users count
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Get active users (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: activeUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', thirtyDaysAgo.toISOString());

      // Get users by role
      const { data: roleData } = await supabase
        .from('users')
        .select('role');

      const usersByRole: Record<string, number> = {};
      (roleData || []).forEach((user: any) => {
        usersByRole[user.role] = (usersByRole[user.role] || 0) + 1;
      });

      // Get recent logins (last 24 hours)
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      
      const { count: recentLogins } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte('updated_at', twentyFourHoursAgo.toISOString());

      setStats({
        totalUsers: totalUsers || 0,
        activeUsers: activeUsers || 0,
        usersByRole,
        recentLogins: recentLogins || 0,
      });

    } catch (error) {
      console.error('Error loading user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'all-users', label: 'All Users', icon: '👥' },
    { id: 'admins', label: 'Admins', icon: '👑' },
    { id: 'user-roles', label: 'User Roles', icon: '🔐' },
    { id: 'login-activity', label: 'Login Activity', icon: '📊' },
  ] as const;

  const renderTabContent = () => {
    switch (activeTab) {
      case 'all-users':
        return <AllUsersPage onStatsUpdate={loadStats} />;
      case 'admins':
        return <AdminsPage onStatsUpdate={loadStats} />;
      case 'user-roles':
        return <UserRolesPage />;
      case 'login-activity':
        return <LoginActivityPage />;
      default:
        return <AllUsersPage onStatsUpdate={loadStats} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-white">Loading user management...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-indigo-700 via-slate-900 to-black">
      <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/40" />
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-4">
            <a
              href="/dashboard/owner"
              className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              ← Back to Dashboard
            </a>
            <div>
              <h1 className="text-3xl font-bold text-white">Users Management</h1>
              <p className="text-white/70 mt-1">Manage users across all schools on the platform</p>
            </div>
          </div>
          <div className="mt-4 sm:mt-0">
            <button
              onClick={loadStats}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors"
            >
              Refresh Stats
            </button>
          </div>
        </motion.div>

        {/* Stats Overview */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Total Users</p>
                <p className="text-2xl font-bold">{stats.totalUsers.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <span className="text-2xl">👥</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Active Users (30d)</p>
                <p className="text-2xl font-bold">{stats.activeUsers.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Admins</p>
                <p className="text-2xl font-bold">{stats.usersByRole.admin || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <span className="text-2xl">👑</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/70 text-sm">Recent Logins (24h)</p>
                <p className="text-2xl font-bold">{stats.recentLogins.toLocaleString()}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <span className="text-2xl">🔄</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Role Distribution */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white"
        >
          <h3 className="text-lg font-semibold mb-4">User Distribution by Role</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {Object.entries(stats.usersByRole).map(([role, count]) => (
              <div key={role} className="text-center">
                <div className="text-2xl font-bold text-blue-400">{count}</div>
                <div className="text-sm text-white/70 capitalize">{role.replace('_', ' ')}</div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-2"
        >
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Tab Content */}
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {renderTabContent()}
        </motion.div>
      </div>
    </div>
  );
}