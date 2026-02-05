'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/src/lib/supabase';
import { Calendar, Clock } from 'lucide-react';

export default function RemindersCard() {
  const router = useRouter();
  const [reminder, setReminder] = useState<{
    title: string;
    message?: string;
    created_at: string;
    id?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadReminder = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: u } = await supabase
          .from('users')
          .select('school_id')
          .eq('user_id', user.id)
          .single();
        if (!u?.school_id) return;

        const { data: notifications } = await supabase
          .from('notifications')
          .select('id, title, message, created_at')
          .eq('school_id', u.school_id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (notifications && notifications.length > 0) {
          const n = notifications[0];
          setReminder({
            title: n.title || 'Notification',
            message: n.message,
            created_at: n.created_at,
            id: n.id,
          });
        }
      } catch (error) {
        console.error('Error loading reminder:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReminder();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-green-600" />
          Reminders
        </h3>
      </div>
      {loading ? (
        <div className="h-24 flex items-center justify-center">
          <div className="text-gray-500 text-sm">Loading...</div>
        </div>
      ) : reminder ? (
        <>
          <div className="mb-3">
            <p className="text-gray-900 font-medium">{reminder.title}</p>
            {reminder.message && (
              <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{reminder.message}</p>
            )}
            <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {new Date(reminder.created_at).toLocaleString()}
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push('/dashboard/admin/notifications')}
            className="w-full py-2.5 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
          >
            View calendar
          </button>
        </>
      ) : (
        <>
          <p className="text-gray-500 text-sm mb-4">No upcoming reminders.</p>
          <button
            type="button"
            onClick={() => router.push('/dashboard/admin/notifications')}
            className="w-full py-2.5 rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 transition-colors"
          >
            View notifications
          </button>
        </>
      )}
    </div>
  );
}
