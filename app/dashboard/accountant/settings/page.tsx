'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { User, Lock, Bell } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: userRow } = await supabase
          .from('users')
          .select('*')
          .eq('user_id', user.id)
          .single();

        setUserData(userRow);
      } catch (e) {
        console.error('Failed to load user data:', e);
      } finally {
        setLoading(false);
      }
    };

    loadUserData();
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/30 border-t-white"></div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Settings</h1>
        <p className="text-white/85">Manage your account settings</p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-6">
        {/* Profile Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <User className="w-5 h-5 text-white/70" />
            <h2 className="text-xl font-semibold text-white">Profile Information</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-white/70 text-sm mb-2">Name</label>
              <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white">
                {userData?.name || 'N/A'}
              </div>
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">Email</label>
              <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white">
                {userData?.email || 'N/A'}
              </div>
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">Phone</label>
              <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white">
                {userData?.phone || 'N/A'}
              </div>
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">Department</label>
              <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white">
                {userData?.department || 'N/A'}
              </div>
            </div>
            <div>
              <label className="block text-white/70 text-sm mb-2">Position</label>
              <div className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white">
                {userData?.position || 'N/A'}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Security Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Lock className="w-5 h-5 text-white/70" />
            <h2 className="text-xl font-semibold text-white">Security</h2>
          </div>
          <p className="text-white/60 text-sm mb-4">
            Password management is handled through Supabase Auth. Contact your administrator to change your password.
          </p>
        </motion.div>

        {/* Notifications Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <Bell className="w-5 h-5 text-white/70" />
            <h2 className="text-xl font-semibold text-white">Notifications</h2>
          </div>
          <p className="text-white/60 text-sm">
            Notification preferences are managed system-wide. Contact your administrator for changes.
          </p>
        </motion.div>
      </div>
    </div>
  );
}


