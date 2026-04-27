import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Bell, CheckCircle, AlertCircle, Info, AlertTriangle, Clock, Filter, MarkAsRead } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../store/authStore';
import type { AccountantNotification } from './components/AccountantNotificationsCard';

type FilterType = 'all' | 'unread' | 'success' | 'warning' | 'error' | 'info';

export default function AccountantNotificationsPage() {
  const { user, schoolId } = useAuthStore();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<FilterType>('all');

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['accountant-notifications-full', user?.id, schoolId],
    queryFn: async () => {
      if (!user?.id || !schoolId) return [];
      
      const { data } = await supabase
        .from('user_in_app_notifications')
        .select('*')
        .eq('user_id', user.id)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });
      
      return (data || []).map(notification => ({
        id: notification.id,
        type: notification.type || 'info',
        title: notification.title,
        message: notification.message,
        timestamp: formatTimestamp(notification.created_at),
        is_read: notification.is_read || false,
        action_url: notification.action_url,
        expense_id: notification.metadata?.expense_id,
        created_at: notification.created_at,
      })) as (AccountantNotification & { created_at: string })[];
    },
    enabled: !!user?.id && !!schoolId,
  });

  const filteredNotifications = notifications.filter(notification => {
    if (filter === 'all') return true;
    if (filter === 'unread') return !notification.is_read;
    return notification.type === filter;
  });

  const markAsRead = async (notificationId: string) => {
    if (!user?.id) return;
    
    await supabase
      .from('user_in_app_notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', user.id);
    
    queryClient.invalidateQueries({ queryKey: ['accountant-notifications-full'] });
    queryClient.invalidateQueries({ queryKey: ['accountant-notifications'] });
  };

  const markAllAsRead = async () => {
    if (!user?.id || !schoolId) return;
    
    await supabase
      .from('user_in_app_notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('school_id', schoolId)
      .eq('is_read', false);
    
    queryClient.invalidateQueries({ queryKey: ['accountant-notifications-full'] });
    queryClient.invalidateQueries({ queryKey: ['accountant-notifications'] });
  };

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

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="ac-glass-card rounded-xl border border-[var(--ac-border)]/60 p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 ac-text-muted bg-opacity-20 rounded w-1/3" />
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 ac-text-muted bg-opacity-10 rounded" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Bell className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h1 className="text-2xl font-bold ac-text-primary">Notification Center</h1>
          {unreadCount > 0 && (
            <span className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-sm font-medium">
              {unreadCount} unread
            </span>
          )}
        </div>
        <p className="ac-text-secondary text-sm">
          Stay updated on expense approvals and important account activities.
        </p>
      </div>

      <div className="ac-glass-card rounded-xl border border-[var(--ac-border)]/60 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 ac-text-muted" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterType)}
              className="ac-glass-card ac-text-primary rounded-lg border border-[var(--ac-border)]/60 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All notifications</option>
              <option value="unread">Unread only</option>
              <option value="success">Approved</option>
              <option value="error">Rejected</option>
              <option value="warning">Warnings</option>
              <option value="info">Information</option>
            </select>
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
            >
              <MarkAsRead className="w-4 h-4" />
              Mark all as read
            </button>
          )}
        </div>

        <div className="space-y-3">
          {filteredNotifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 mx-auto mb-4 ac-text-muted opacity-50" />
              <h3 className="text-lg font-medium ac-text-primary mb-2">No notifications</h3>
              <p className="ac-text-muted">
                {filter === 'unread' 
                  ? "You're all caught up! No unread notifications."
                  : filter === 'all'
                  ? "You don't have any notifications yet."
                  : `No ${filter} notifications found.`
                }
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification, index) => {
              const Icon = getNotificationIcon(notification.type);
              const colors = getNotificationColor(notification.type);

              return (
                <motion.div
                  key={notification.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className={`${colors.bg} ${colors.border} border rounded-lg p-4 transition-all ${
                    !notification.is_read ? 'ring-2 ring-blue-500/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`${colors.icon} flex-shrink-0 mt-1`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold ac-text-primary mb-1">
                            {notification.title}
                            {!notification.is_read && (
                              <span className="ml-2 w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full inline-block" />
                            )}
                          </h3>
                          <p className="ac-text-secondary text-sm leading-relaxed">
                            {notification.message}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <button
                            onClick={() => markAsRead(notification.id)}
                            className="text-xs text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap"
                          >
                            Mark as read
                          </button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3 h-3 ac-text-muted" />
                        <span className="text-xs ac-text-muted">{notification.timestamp}</span>
                        <span className="text-xs ac-text-muted">
                          • {new Date(notification.created_at).toLocaleDateString('en-UG', { 
                            day: 'numeric', 
                            month: 'short', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
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