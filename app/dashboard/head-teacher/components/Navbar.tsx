'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Search, User, Settings, LogOut, GraduationCap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HeadTeacherNavbar() {
  const router = useRouter();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState(0);
  const [userName, setUserName] = useState('Head Teacher');
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    // Load user info and notifications
    const loadUserInfo = async () => {
      try {
        const { supabase } = await import('@/src/lib/supabase');
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userData } = await supabase
            .from('users')
            .select('name, email, role')
            .eq('user_id', user.id)
            .single();
          
          if (userData?.name) {
            setUserName(userData.name);
            setUserRole(userData.role);
          }
        }
      } catch (error) {
        console.error('Error loading user info:', error);
      }
    };

    loadUserInfo();
  }, []);

  const handleLogout = async () => {
    const { supabase } = await import('@/src/lib/supabase');
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-30 bg-white/10 backdrop-blur-xl border-b border-white/10">
      <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 py-4">
        {/* Left side - Search */}
        <div className="flex items-center gap-4 flex-1">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-white/50" />
            <input
              type="text"
              placeholder="Search students, teachers, exams..."
              className="w-full pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
            />
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-3">
          {/* Dashboard Switcher */}
          <div className="relative">
            <select
              onChange={(e) => {
                if (e.target.value && e.target.value !== '/dashboard/head-teacher') {
                  router.push(e.target.value);
                }
              }}
              className="rounded-lg border border-white/20 bg-white/10 text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent"
              defaultValue="/dashboard/head-teacher"
            >
              <option value="/dashboard/head-teacher">Head Teacher Dashboard</option>
              {userRole === 'admin' && <option value="/dashboard/admin">Admin Dashboard</option>}
              {(userRole === 'admin' || userRole === 'accountant') && <option value="/dashboard/accountant">Accountant Dashboard</option>}
            </select>
          </div>

          {/* Notifications */}
          <button
            onClick={() => router.push('/dashboard/head-teacher/notifications')}
            className="relative p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors"
          >
            <Bell className="w-5 h-5" />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {notifications > 9 ? '9+' : notifications}
              </span>
            )}
          </button>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                <GraduationCap className="w-4 h-4 text-white" />
              </div>
              <span className="hidden sm:block text-sm font-medium">{userName}</span>
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 top-full mt-2 w-48 bg-white/10 backdrop-blur-xl border border-white/20 rounded-lg shadow-xl overflow-hidden"
                >
                  <div className="p-3 border-b border-white/10">
                    <p className="text-white font-medium text-sm">{userName}</p>
                    <p className="text-white/60 text-xs">Head Teacher</p>
                  </div>
                  
                  <div className="p-1">
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        router.push('/dashboard/head-teacher/profile');
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-left text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <User className="w-4 h-4" />
                      <span className="text-sm">Profile</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        router.push('/dashboard/head-teacher/settings');
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-left text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="text-sm">Settings</span>
                    </button>
                    
                    <hr className="my-1 border-white/10" />
                    
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        handleLogout();
                      }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-left text-red-300 hover:text-red-200 hover:bg-red-500/10 rounded-lg transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      <span className="text-sm">Logout</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Click outside to close menu */}
      {showUserMenu && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setShowUserMenu(false)}
        />
      )}
    </header>
  );
}