import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Search, 
  Filter, 
  Eye, 
  AlertTriangle, 
  Shield, 
  Globe, 
  Clock,
  User,
  Users,
  MapPin,
  RefreshCw,
  Download,
  Ban,
  CheckCircle
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LoginActivity {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_role: string;
  school_name: string;
  ip_address: string;
  location: string;
  device_info: string;
  login_time: string;
  logout_time?: string;
  session_duration?: number;
  is_suspicious: boolean;
  risk_score: number;
  status: 'active' | 'ended' | 'suspicious';
}

interface SecurityAlert {
  id: string;
  type: 'multiple_locations' | 'unusual_time' | 'new_device' | 'failed_attempts';
  user_id: string;
  user_name: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  created_at: string;
  resolved: boolean;
}

interface ActivityStats {
  total_logins_today: number;
  active_sessions: number;
  suspicious_activities: number;
  unique_users_today: number;
  failed_attempts_today: number;
  new_devices_today: number;
}

const LoginActivityPage: React.FC = () => {
  const [activities, setActivities] = useState<LoginActivity[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [stats, setStats] = useState<ActivityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('today');

  const fetchLoginActivity = async () => {
    try {
      setLoading(true);

      // Fetch login activities
      const { data: activitiesData, error: activitiesError } = await supabase
        .from('login_activities')
        .select(`
          *,
          profiles!inner(
            full_name,
            email,
            role,
            schools(name)
          )
        `)
        .order('login_time', { ascending: false })
        .limit(100);

      if (activitiesError) throw activitiesError;

      const formattedActivities = activitiesData?.map(activity => ({
        ...activity,
        user_name: activity.profiles?.full_name || 'Unknown User',
        user_email: activity.profiles?.email || '',
        user_role: activity.profiles?.role || '',
        school_name: activity.profiles?.schools?.name || 'Unknown School'
      })) || [];

      setActivities(formattedActivities);

      // Fetch security alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('security_alerts')
        .select('*')
        .eq('resolved', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (alertsError) throw alertsError;
      setAlerts(alertsData || []);

      // Fetch activity statistics
      const { data: statsData, error: statsError } = await supabase
        .rpc('get_login_activity_stats');

      if (statsError) throw statsError;
      setStats(statsData);

    } catch (error) {
      console.error('Error fetching login activity:', error);
      
      // Mock data for demonstration
      const mockActivities: LoginActivity[] = [
        {
          id: '1',
          user_id: 'user1',
          user_name: 'John Doe',
          user_email: 'john@school.com',
          user_role: 'admin',
          school_name: 'Green Valley High School',
          ip_address: '192.168.1.100',
          location: 'Nairobi, Kenya',
          device_info: 'Chrome 120.0 on Windows 10',
          login_time: new Date().toISOString(),
          status: 'active',
          is_suspicious: false,
          risk_score: 2
        },
        {
          id: '2',
          user_id: 'user2',
          user_name: 'Jane Smith',
          user_email: 'jane@school.com',
          user_role: 'teacher',
          school_name: 'Sunrise Academy',
          ip_address: '41.90.64.15',
          location: 'Mombasa, Kenya',
          device_info: 'Safari 17.0 on iPhone',
          login_time: new Date(Date.now() - 3600000).toISOString(),
          logout_time: new Date().toISOString(),
          session_duration: 3600,
          status: 'ended',
          is_suspicious: true,
          risk_score: 7
        }
      ];

      const mockAlerts: SecurityAlert[] = [
        {
          id: '1',
          type: 'multiple_locations',
          user_id: 'user2',
          user_name: 'Jane Smith',
          description: 'User logged in from multiple locations within 1 hour',
          severity: 'high',
          created_at: new Date().toISOString(),
          resolved: false
        }
      ];

      const mockStats: ActivityStats = {
        total_logins_today: 156,
        active_sessions: 23,
        suspicious_activities: 3,
        unique_users_today: 89,
        failed_attempts_today: 12,
        new_devices_today: 7
      };

      setActivities(mockActivities);
      setAlerts(mockAlerts);
      setStats(mockStats);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLoginActivity();
  }, []);

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         activity.ip_address?.includes(searchTerm) ||
                         activity.location?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || activity.status === statusFilter;
    const matchesRisk = riskFilter === 'all' || 
                       (riskFilter === 'high' && activity.risk_score >= 7) ||
                       (riskFilter === 'medium' && activity.risk_score >= 4 && activity.risk_score < 7) ||
                       (riskFilter === 'low' && activity.risk_score < 4);

    return matchesSearch && matchesStatus && matchesRisk;
  });

  const handleResolveAlert = async (alertId: string) => {
    try {
      const { error } = await supabase
        .from('security_alerts')
        .update({ resolved: true })
        .eq('id', alertId);

      if (error) throw error;
      
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const handleBlockUser = async (userId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: 'suspended' })
        .eq('id', userId);

      if (error) throw error;
      
      // Refresh activities
      fetchLoginActivity();
    } catch (error) {
      console.error('Error blocking user:', error);
    }
  };

  const exportActivity = async () => {
    try {
      const csv = [
        ['User', 'Email', 'Role', 'School', 'IP Address', 'Location', 'Device', 'Login Time', 'Status', 'Risk Score'].join(','),
        ...filteredActivities.map(activity => [
          activity.user_name || '',
          activity.user_email || '',
          activity.user_role || '',
          activity.school_name || '',
          activity.ip_address || '',
          activity.location || '',
          activity.device_info || '',
          new Date(activity.login_time).toLocaleString(),
          activity.status || '',
          activity.risk_score || 0
        ].join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `login-activity-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting activity:', error);
    }
  };

  const getRiskColor = (score: number) => {
    if (score >= 7) return 'text-red-600 bg-red-100';
    if (score >= 4) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'ended': return <Clock className="w-4 h-4 text-gray-500" />;
      case 'suspicious': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default: return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Login Activity & Security</h1>
          <p className="text-gray-600">Monitor user login patterns and security events</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportActivity}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={fetchLoginActivity}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-4 rounded-lg shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Today's Logins</p>
                <p className="text-xl font-bold text-gray-900">{stats.total_logins_today}</p>
              </div>
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-4 rounded-lg shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Active Sessions</p>
                <p className="text-xl font-bold text-green-600">{stats.active_sessions}</p>
              </div>
              <User className="w-6 h-6 text-green-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-4 rounded-lg shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Suspicious</p>
                <p className="text-xl font-bold text-red-600">{stats.suspicious_activities}</p>
              </div>
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-4 rounded-lg shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Unique Users</p>
                <p className="text-xl font-bold text-purple-600">{stats.unique_users_today}</p>
              </div>
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white p-4 rounded-lg shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Failed Attempts</p>
                <p className="text-xl font-bold text-orange-600">{stats.failed_attempts_today}</p>
              </div>
              <Ban className="w-6 h-6 text-orange-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-white p-4 rounded-lg shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">New Devices</p>
                <p className="text-xl font-bold text-indigo-600">{stats.new_devices_today}</p>
              </div>
              <Shield className="w-6 h-6 text-indigo-600" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Security Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
              Security Alerts ({alerts.length})
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {alerts.map((alert) => (
              <div key={alert.id} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${getSeverityColor(alert.severity)}`}>
                        {alert.severity.toUpperCase()}
                      </span>
                      <span className="text-sm text-gray-600">
                        {new Date(alert.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{alert.user_name}</p>
                    <p className="text-sm text-gray-600">{alert.description}</p>
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleResolveAlert(alert.id)}
                      className="text-green-600 hover:text-green-800"
                      title="Resolve Alert"
                    >
                      <CheckCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleBlockUser(alert.user_id)}
                      className="text-red-600 hover:text-red-800"
                      title="Block User"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search activities..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="ended">Ended</option>
            <option value="suspicious">Suspicious</option>
          </select>

          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Risk Levels</option>
            <option value="low">Low Risk (0-3)</option>
            <option value="medium">Medium Risk (4-6)</option>
            <option value="high">High Risk (7-10)</option>
          </select>

          <select
            value={timeFilter}
            onChange={(e) => setTimeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">All Time</option>
          </select>
        </div>
      </div>

      {/* Activity Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location & Device
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Login Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Risk Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredActivities.map((activity) => (
                <motion.tr
                  key={activity.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {activity.user_name}
                      </div>
                      <div className="text-sm text-gray-500">{activity.user_email}</div>
                      <div className="text-xs text-gray-400">
                        {activity.user_role} • {activity.school_name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm text-gray-900 flex items-center">
                        <Globe className="w-3 h-3 mr-1" />
                        {activity.ip_address}
                      </div>
                      <div className="text-sm text-gray-500 flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {activity.location}
                      </div>
                      <div className="text-xs text-gray-400">{activity.device_info}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {new Date(activity.login_time).toLocaleString()}
                    </div>
                    {activity.session_duration && (
                      <div className="text-xs text-gray-500">
                        Duration: {Math.round(activity.session_duration / 60)}m
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(activity.status)}
                      <span className="ml-2 text-sm text-gray-900 capitalize">
                        {activity.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRiskColor(activity.risk_score)}`}>
                      {activity.risk_score}/10
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      {activity.is_suspicious && (
                        <button
                          onClick={() => handleBlockUser(activity.user_id)}
                          className="text-red-600 hover:text-red-900"
                          title="Block User"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredActivities.length === 0 && (
          <div className="text-center py-12">
            <Activity className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No activity found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginActivityPage;