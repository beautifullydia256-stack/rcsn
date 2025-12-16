'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bell } from 'lucide-react';

interface Notification {
  notification_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push('/login');
          return;
        }

        const { data: notificationsData } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(50);

        setNotifications(notificationsData as any || []);
      } catch (e) {
        console.error('Failed to load notifications:', e);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
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
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Notifications</h1>
        <p className="text-white/85">View your recent notifications</p>
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg p-12 text-center">
          <Bell className="w-16 h-16 text-white/30 mx-auto mb-4" />
          <p className="text-white/60">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <motion.div
              key={notification.notification_id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl border backdrop-blur-md shadow-lg p-4 ${
                notification.is_read
                  ? 'border-white/10 bg-white/10'
                  : 'border-blue-400/30 bg-blue-500/10'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-white font-medium mb-1">{notification.title}</h3>
                  <p className="text-white/70 text-sm">{notification.message}</p>
                  <p className="text-white/50 text-xs mt-2">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
                {!notification.is_read && (
                  <div className="w-2 h-2 rounded-full bg-blue-400 ml-4"></div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}


