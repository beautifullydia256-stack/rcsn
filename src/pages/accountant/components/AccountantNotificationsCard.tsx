'use client';

import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bell, AlertCircle, CheckCircle, Info, AlertTriangle, Clock, XCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../store/authStore';

export interface AccountantNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  is_read: boolean;
  action_url?: string;
  expense_id?: string;
}

interface AccountantNotificationsCardProps {
  notifications?: AccountantNotification[];
}

export default function AccountantNotificationsCard({ notifications = [] }: AccountantNotificationsCardProps) {
  const navigate = useNavigate();
  const { user, schoolId } = useAuthStore();

  // Fetch notifications from database
  const { data: dbNotifications = [] } = useQuery({
    queryKey: ['accountant-notifications', user?.id, schoolId],
    queryFn: async () => {
      if (!user?.id || !schoolId) return [];
      
      const { data } = await supabase
        .from('user_in_app_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      return (data || []).map(notification => ({
        id: notification.id,
        type: notification.type || 'info',
        title: notification.title,
        message: notification.message,
        timestamp: formatTimestamp(notification.created_at),
        is_read: notification.is_read || false,
        action_url: notification.action_url,
        expense_id: notification.metadata?.expense_id,
      })) as AccountantNotification[];
    },
    enabled: !!user?.id && !!schoolId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Use database notifications if available, otherwise fall back to props
  const allNotifications = dbNotifications.length > 0 ? dbNotifications : notifications;

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'info': return Info;
      case 'success': return CheckCircle;
      case 'warning': return AlertTriangle;
      case 'error': return AlertCircle;
      default: return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'info': return { 
        bg: 'bg-blue-50/80 dark:bg-blue-900/20', 
        border: 'border-blue-200/60 dark:border-blue-800/40', 
        icon: 'text-blue-600 dark:text-blue-400' 
      };
      case 'success': return { 
        bg: 'bg-green-50/80 dark:bg-green-900/20', 
        border: 'border-green-200/60 dark:border-green-800/40', 
        icon: 'text-green-600 dark:text-green-400' 
      };
      case 'warning': return { 
        bg: 'bg-yellow-50/80 dark:bg-yellow-900/20', 
        border: 'border-yellow-200/60 dark:border-yellow-800/40', 
        icon: 'text-yellow-600 dark:text-yellow-400' 
      };
      case 'error': return { 
        bg: 'bg-red-50/80 dark:bg-red-900/20', 
        border: 'border-red-200/60 dark:border-red-800/40', 
        icon: 'text-red-600 dark:text-red-400' 
      };
      default: return { 
        bg: 'bg-gray-50/80 dark:bg-gray-900/20', 
        border: 'border-gray-200/60 dark:border-gray-800/40', 
        icon: 'text-gray-600 dark:text-gray-400' 
      };
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!user?.id) return;
    
    await supabase
      .from('user_in_app_notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);
  };

  const handleNotificationClick = async (notification: AccountantNotification) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    
    if (notification.action_url) {
      navigate(notification.action_url);
    } else if (notification.expense_id) {
      navigate(`/dashboard/accountant/expenses`);
    }
  };

  const unreadCount = allNotifications.filter(n => !n.is_read).length;

  return (
    <div className="ac-glass-card relative overflow-hidden rounded-xl border border-[var(--ac-border)]/60 p-4 shadow-sm">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
      
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold ac-text-primary">Notifications</h2>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium">
              {unreadCount} new
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => navigate('/dashboard/accountant/notifications')}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          View All
        </button>
      </div>

      <div className="relative z-10 space-y-3">
        {allNotifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-12 h-12 mx-auto mb-2 ac-text-muted opacity-50" />
            <p className="ac-text-muted">No notifications yet</p>
          </div>
        ) : (
          allNotifications.slice(0, 4).map((notification, index) => {
            const Icon = getNotificationIcon(notification.type);
            const colors = getNotificationColor(notification.type);

            return (
              <motion.div
                key={notification.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ x: 4 }}
                role="button"
                tabIndex={0}
                onClick={() => handleNotificationClick(notification)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    handleNotificationClick(notification);
                  }
                }}
                className={`${colors.bg} ${colors.border} border rounded-lg p-3 cursor-pointer transition-all ${
                  !notification.is_read ? 'ring-2 ring-blue-500/20' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`${colors.icon} flex-shrink-0 mt-0.5`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1">
                        <div className="font-medium ac-text-primary text-sm mb-1">
                          {notification.title}
                          {!notification.is_read && (
                            <span className="ml-2 w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full inline-block" />
                          )}
                        </div>
                        <div className="text-xs ac-text-secondary line-clamp-2">
                          {notification.message}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock className="w-3 h-3 ac-text-muted" />
                      <span className="text-xs ac-text-muted">{notification.timestamp}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}

        {allNotifications.length > 4 && (
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/dashboard/accountant/notifications')}
            className="w-full mt-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            View {allNotifications.length - 4} more notifications
          </motion.button>
        )}
      </div>
    </div>
  );
}

function formatTimestamp(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  
  return date.toLocaleDateString('en-UG', { 
    day: 'numeric', 
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
  });
}