'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Bell, AlertCircle, CheckCircle, Info, AlertTriangle, Clock, X } from 'lucide-react';

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  is_read: boolean; // Changed from 'unread' to match database column 'is_read'
  action_url?: string;
}

interface NotificationsCardProps {
  notifications?: Notification[];
}

export default function NotificationsCard({ notifications = [] }: NotificationsCardProps) {
  const router = useRouter();

  // Mock data if not provided
  const mockNotifications: Notification[] = notifications.length > 0 ? notifications : [
    { id: '1', type: 'info', title: 'New Exam Scheduled', message: 'Mathematics exam for S.1 West is scheduled for next week.', timestamp: '30 minutes ago', is_read: false, action_url: '/dashboard/teacher/exam-results' },
    { id: '2', type: 'success', title: 'Attendance Submitted', message: 'Your attendance for today has been recorded successfully.', timestamp: '2 hours ago', is_read: false },
    { id: '3', type: 'warning', title: 'Assignment Due Soon', message: 'Physics Lab Report for S.2 East is due tomorrow.', timestamp: '5 hours ago', is_read: true, action_url: '/dashboard/teacher/assignments' },
    { id: '4', type: 'info', title: 'Staff Meeting Reminder', message: 'Staff meeting is scheduled for tomorrow at 2 PM.', timestamp: '1 day ago', is_read: true }
  ];

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'info':
        return Info;
      case 'success':
        return CheckCircle;
      case 'warning':
        return AlertTriangle;
      case 'error':
        return AlertCircle;
      default:
        return Bell;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'info':
        return { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-200 dark:border-blue-800', icon: 'text-blue-600 dark:text-blue-400' };
      case 'success':
        return { bg: 'bg-green-50 dark:bg-green-900/20', border: 'border-green-200 dark:border-green-800', icon: 'text-green-600 dark:text-green-400' };
      case 'warning':
        return { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-200 dark:border-yellow-800', icon: 'text-yellow-600 dark:text-yellow-400' };
      case 'error':
        return { bg: 'bg-red-50 dark:bg-red-900/20', border: 'border-red-200 dark:border-red-800', icon: 'text-red-600 dark:text-red-400' };
      default:
        return { bg: 'bg-gray-50 dark:bg-gray-900/20', border: 'border-gray-200 dark:border-gray-800', icon: 'text-gray-600 dark:text-gray-400' };
    }
  };

  const unreadCount = mockNotifications.filter(n => !n.is_read).length;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Notifications</h2>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-medium">
              {unreadCount} new
            </span>
          )}
        </div>
        <button
          onClick={() => router.push('/dashboard/teacher/notifications')}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          View All
        </button>
      </div>

      <div className="space-y-3">
        {mockNotifications.slice(0, 4).map((notification, index) => {
          const Icon = getNotificationIcon(notification.type);
          const colors = getNotificationColor(notification.type);

          return (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ x: 4 }}
              onClick={() => {
                if (notification.action_url) {
                  router.push(notification.action_url);
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
                      <div className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                        {notification.title}
                        {!notification.is_read && (
                          <span className="ml-2 w-2 h-2 bg-blue-600 dark:bg-blue-400 rounded-full inline-block" />
                        )}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {notification.message}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Clock className="w-3 h-3 text-gray-400 dark:text-gray-500" />
                    <span className="text-xs text-gray-500 dark:text-gray-400">{notification.timestamp}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {mockNotifications.length > 4 && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => router.push('/dashboard/teacher/notifications')}
          className="w-full mt-4 py-2 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
        >
          View {mockNotifications.length - 4} more notifications
        </motion.button>
      )}
    </div>
  );
}

