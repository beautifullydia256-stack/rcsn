import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Mail, Bell, Calendar, Inbox } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { GlassCard } from '../../components/Glass/GlassCard';
import { GlassPanel } from '../../components/Glass/GlassPanel';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  source: string;
  created_at: string;
  read: boolean;
  action_url?: string;
  metadata?: any;
}

interface NotificationMetrics {
  total: number;
  unread: number;
  urgent: number;
  todayCount: number;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [metrics, setMetrics] = useState<NotificationMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'unread' | 'urgent'>('all');

  const fetchNotifications = async () => {
    try {
      setLoading(true);

      // Fetch real notifications from audit_logs and system events
      const { data: auditLogs } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      // Fetch system health alerts
      const { data: systemAlerts } = await supabase
        .from('system_health_metrics')
        .select('*')
        .eq('status', 'error')
        .order('created_at', { ascending: false })
        .limit(20);

      // Convert audit logs to notifications
      const auditNotifications: Notification[] = (auditLogs || []).map(log => ({
        id: log.id,
        title: `${log.action} by ${log.user_role}`,
        message: `${log.action} performed on ${log.table_name}${log.record_id ? ` (ID: ${log.record_id})` : ''}`,
        type: log.action.includes('DELETE') ? 'warning' : 'info' as any,
        priority: log.action.includes('DELETE') ? 'high' : 'medium' as any,
        source: 'Audit System',
        created_at: log.created_at,
        read: false,
        metadata: log.changes
      }));

      // Convert system alerts to notifications
      const systemNotifications: Notification[] = (systemAlerts || []).map(alert => ({
        id: `system-${alert.id}`,
        title: `System Alert: ${alert.metric_type}`,
        message: `${alert.metric_type} reported an issue. Value: ${alert.value}`,
        type: 'error',
        priority: 'urgent',
        source: 'System Monitor',
        created_at: alert.created_at,
        read: false,
        metadata: { value: alert.value, metric_type: alert.metric_type }
      }));

      // Fetch recent school registrations
      const { data: recentSchools } = await supabase
        .from('schools')
        .select('school_id, name, created_at')
        .order('created_at', { ascending: false })
        .limit(10);

      const schoolNotifications: Notification[] = (recentSchools || []).map(school => ({
        id: `school-${school.school_id}`,
        title: 'New School Registration',
        message: `${school.name} has registered on the platform`,
        type: 'success',
        priority: 'medium',
        source: 'School Management',
        created_at: school.created_at,
        read: false,
        action_url: `/dashboard/owner/schools`
      }));

      // Fetch recent user registrations
      const { data: recentUsers } = await supabase
        .from('users')
        .select('user_id, name, role, created_at')
        .order('created_at', { ascending: false })
        .limit(15);

      const userNotifications: Notification[] = (recentUsers || []).map(user => ({
        id: `user-${user.user_id}`,
        title: 'New User Registration',
        message: `${user.name || 'New user'} registered as ${user.role}`,
        type: 'info',
        priority: 'low',
        source: 'User Management',
        created_at: user.created_at,
        read: false,
        action_url: `/dashboard/owner/users`
      }));

      // Combine all notifications
      const allNotifications = [
        ...systemNotifications,
        ...auditNotifications,
        ...schoolNotifications,
        ...userNotifications
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setNotifications(allNotifications);

      // Calculate metrics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayCount = allNotifications.filter(n => 
        new Date(n.created_at) >= today
      ).length;

      const urgentCount = allNotifications.filter(n => 
        n.priority === 'urgent'
      ).length;

      setMetrics({
        total: allNotifications.length,
        unread: allNotifications.filter(n => !n.read).length,
        urgent: urgentCount,
        todayCount
      });

    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const markAsRead = async (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    if (metrics) {
      setMetrics({ ...metrics, unread: 0 });
    }
  };

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.read;
      case 'urgent':
        return notification.priority === 'urgent';
      default:
        return true;
    }
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'error': return 'text-red-400 bg-red-900/20 border-red-500/30';
      case 'warning': return 'text-amber-400 bg-amber-900/20 border-amber-500/30';
      case 'success': return 'text-emerald-400 bg-emerald-900/20 border-emerald-500/30';
      default: return 'text-blue-400 bg-blue-900/20 border-blue-500/30';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'error': return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-400" />;
      case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
      default: return <Info className="w-5 h-5 text-blue-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Notifications</h1>
          <p className="text-slate-400">Loading platform notifications...</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <GlassPanel key={i} className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-slate-700 rounded w-24"></div>
                <div className="h-8 bg-slate-700 rounded w-16"></div>
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div 
      className="p-8 space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <motion.div 
        className="space-y-2"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Notifications</h1>
            <p className="text-slate-400">
              Real-time platform notifications and system alerts
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={markAllAsRead}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
            >
              Mark All Read
            </button>
            <button
              onClick={fetchNotifications}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </motion.div>

      {/* Metrics */}
      {metrics && (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <GlassPanel className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm font-medium">Total</span>
                <Mail className="w-6 h-6 text-slate-400" />
              </div>
              <div className="text-3xl font-bold text-white">{metrics.total}</div>
              <div className="text-xs text-slate-500">All notifications</div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm font-medium">Unread</span>
                <Bell className="w-6 h-6 text-amber-400" />
              </div>
              <div className="text-3xl font-bold text-amber-400">{metrics.unread}</div>
              <div className="text-xs text-slate-500">Need attention</div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm font-medium">Urgent</span>
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <div className="text-3xl font-bold text-red-400">{metrics.urgent}</div>
              <div className="text-xs text-slate-500">High priority</div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm font-medium">Today</span>
                <Calendar className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="text-3xl font-bold text-emerald-400">{metrics.todayCount}</div>
              <div className="text-xs text-slate-500">New today</div>
            </div>
          </GlassPanel>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div 
        className="flex gap-2"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {['all', 'unread', 'urgent'].map((filterType) => (
          <button
            key={filterType}
            onClick={() => setFilter(filterType as any)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === filterType
                ? 'bg-cyan-600 text-white'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            }`}
          >
            {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
          </button>
        ))}
      </motion.div>

      {/* Notifications List */}
      <motion.div 
        className="space-y-4"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <GlassPanel className="p-6">
          <GlassCard title="Recent Notifications" subtitle={`${filteredNotifications.length} notifications`}>
            <div className="space-y-4">
              {filteredNotifications.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Inbox className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <div className="font-medium">No notifications found</div>
                  <div className="text-sm">All caught up!</div>
                </div>
              ) : (
                filteredNotifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                      notification.read 
                        ? 'bg-slate-800/30 border-slate-700/50' 
                        : `${getTypeColor(notification.type)} border`
                    }`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => markAsRead(notification.id)}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <span className="w-5 h-5 flex items-center justify-center">{getTypeIcon(notification.type)}</span>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-white truncate">{notification.title}</h3>
                          <div className={`w-2 h-2 rounded-full ${getPriorityColor(notification.priority)}`}></div>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                          )}
                        </div>
                        
                        <p className="text-slate-300 text-sm mb-2">{notification.message}</p>
                        
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span>{notification.source}</span>
                          <span>{new Date(notification.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      
                      {notification.action_url && (
                        <div className="flex-shrink-0">
                          <button 
                            className="text-cyan-400 hover:text-cyan-300 text-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.location.href = notification.action_url!;
                            }}
                          >
                            View →
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </GlassCard>
        </GlassPanel>
      </motion.div>
    </motion.div>
  );
}