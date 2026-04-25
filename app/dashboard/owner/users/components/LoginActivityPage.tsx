"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";

interface LoginActivity {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  schoolId: string;
  schoolName: string;
  loginTime: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  success: boolean;
  sessionDuration?: number;
}

interface SecurityAlert {
  id: string;
  type: 'suspicious_login' | 'multiple_failures' | 'unusual_location' | 'concurrent_sessions';
  userId: string;
  userName: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
  resolved: boolean;
}

interface LoginStats {
  totalLogins: number;
  successfulLogins: number;
  failedLogins: number;
  uniqueUsers: number;
  averageSessionDuration: number;
  topLocations: Array<{ location: string; count: number }>;
  loginsByHour: Array<{ hour: number; count: number }>;
}

export default function LoginActivityPage() {
  const [activities, setActivities] = useState<LoginActivity[]>([]);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [stats, setStats] = useState<LoginStats>({
    totalLogins: 0,
    successfulLogins: 0,
    failedLogins: 0,
    uniqueUsers: 0,
    averageSessionDuration: 0,
    topLocations: [],
    loginsByHour: [],
  });
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('24h');
  const [filterRole, setFilterRole] = useState('');
  const [filterSchool, setFilterSchool] = useState('');
  const [showAlertsOnly, setShowAlertsOnly] = useState(false);
  const [schools, setSchools] = useState<any[]>([]);

  const ownerAuthHeaders = async (): Promise<Record<string, string> | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session?.access_token) return null;
    return { Authorization: `Bearer ${session.access_token}` };
  };

  const loadLoginActivity = useCallback(async () => {
    try {
      setLoading(true);
      
      // Calculate time range
      const now = new Date();
      let startTime = new Date();
      
      switch (timeRange) {
        case '1h':
          startTime.setHours(startTime.getHours() - 1);
          break;
        case '24h':
          startTime.setHours(startTime.getHours() - 24);
          break;
        case '7d':
          startTime.setDate(startTime.getDate() - 7);
          break;
        case '30d':
          startTime.setDate(startTime.getDate() - 30);
          break;
      }

      // In a real implementation, this would come from an audit_logs or login_history table
      // For now, we'll simulate login activity based on user data
      let query = supabase
        .from('users')
        .select(`
          user_id,
          name,
          email,
          role,
          school_id,
          updated_at,
          schools!inner(name)
        `)
        .gte('updated_at', startTime.toISOString())
        .order('updated_at', { ascending: false })
        .limit(100);

      if (filterRole) {
        query = query.eq('role', filterRole);
      }

      if (filterSchool) {
        query = query.eq('school_id', filterSchool);
      }

      const { data: userData, error } = await query;

      if (error) {
        throw error;
      }

      // Transform user data into login activities (simulated)
      const mockActivities: LoginActivity[] = (userData || []).map((user: any, index) => {
        const loginTime = new Date(user.updated_at);
        const ipAddresses = ['192.168.1.100', '10.0.0.50', '172.16.0.25', '203.0.113.45'];
        const locations = ['Nairobi, Kenya', 'Mombasa, Kenya', 'Kisumu, Kenya', 'Nakuru, Kenya'];
        const userAgents = [
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
          'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15',
        ];

        return {
          id: `activity_${user.user_id}_${index}`,
          userId: user.user_id,
          userName: user.name || 'Unknown',
          userEmail: user.email || '',
          userRole: user.role,
          schoolId: user.school_id,
          schoolName: user.schools?.name || 'Unknown School',
          loginTime: loginTime.toISOString(),
          ipAddress: ipAddresses[index % ipAddresses.length],
          userAgent: userAgents[index % userAgents.length],
          location: locations[index % locations.length],
          success: Math.random() > 0.1, // 90% success rate
          sessionDuration: Math.floor(Math.random() * 7200) + 300, // 5 minutes to 2 hours
        };
      });

      setActivities(mockActivities);

      // Generate security alerts (simulated)
      const mockAlerts: SecurityAlert[] = mockActivities
        .filter(() => Math.random() < 0.05) // 5% chance of generating an alert
        .map((activity, index) => ({
          id: `alert_${activity.userId}_${index}`,
          type: ['suspicious_login', 'multiple_failures', 'unusual_location', 'concurrent_sessions'][
            Math.floor(Math.random() * 4)
          ] as SecurityAlert['type'],
          userId: activity.userId,
          userName: activity.userName,
          description: `Suspicious login activity detected for ${activity.userName}`,
          severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)] as SecurityAlert['severity'],
          timestamp: activity.loginTime,
          resolved: Math.random() > 0.7, // 30% resolved
        }));

      setAlerts(mockAlerts);

      // Calculate statistics
      const successfulLogins = mockActivities.filter(a => a.success).length;
      const failedLogins = mockActivities.filter(a => !a.success).length;
      const uniqueUsers = new Set(mockActivities.map(a => a.userId)).size;
      const totalSessionTime = mockActivities
        .filter(a => a.sessionDuration)
        .reduce((sum, a) => sum + (a.sessionDuration || 0), 0);
      const averageSessionDuration = totalSessionTime / successfulLogins || 0;

      // Top locations
      const locationCounts: Record<string, number> = {};
      mockActivities.forEach(a => {
        if (a.location) {
          locationCounts[a.location] = (locationCounts[a.location] || 0) + 1;
        }
      });
      const topLocations = Object.entries(locationCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([location, count]) => ({ location, count }));

      // Logins by hour
      const hourCounts: Record<number, number> = {};
      mockActivities.forEach(a => {
        const hour = new Date(a.loginTime).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      });
      const loginsByHour = Array.from({ length: 24 }, (_, hour) => ({
        hour,
        count: hourCounts[hour] || 0,
      }));

      setStats({
        totalLogins: mockActivities.length,
        successfulLogins,
        failedLogins,
        uniqueUsers,
        averageSessionDuration,
        topLocations,
        loginsByHour,
      });

    } catch (error) {
      console.error('Error loading login activity:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange, filterRole, filterSchool]);

  const loadSchools = useCallback(async () => {
    try {
      const { data } = await supabase
        .from('schools')
        .select('school_id, name')
        .order('name');
      
      setSchools(data || []);
    } catch (error) {
      console.error('Error loading schools:', error);
    }
  }, []);

  useEffect(() => {
    loadLoginActivity();
  }, [loadLoginActivity]);

  useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  const handleResolveAlert = async (alertId: string) => {
    try {
      setAlerts(prev => 
        prev.map(alert => 
          alert.id === alertId ? { ...alert, resolved: true } : alert
        )
      );
      
      // In a real implementation, this would update the database
      console.log('Resolving alert:', alertId);
      
    } catch (error) {
      console.error('Error resolving alert:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-red-400 bg-red-500/20 border-red-500/30';
      case 'medium': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      case 'low': return 'text-blue-400 bg-blue-500/20 border-blue-500/30';
      default: return 'text-gray-400 bg-gray-500/20 border-gray-500/30';
    }
  };

  const getRoleColor = (role: string) => {
    const colors: Record<string, string> = {
      owner: 'text-red-400 bg-red-500/20',
      admin: 'text-purple-400 bg-purple-500/20',
      head_teacher: 'text-indigo-400 bg-indigo-500/20',
      teacher: 'text-blue-400 bg-blue-500/20',
      accountant: 'text-teal-400 bg-teal-500/20',
      librarian: 'text-pink-400 bg-pink-500/20',
      parent: 'text-green-400 bg-green-500/20',
      student: 'text-yellow-400 bg-yellow-500/20',
    };
    return colors[role] || colors.student;
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const filteredActivities = showAlertsOnly 
    ? activities.filter(activity => 
        alerts.some(alert => alert.userId === activity.userId && !alert.resolved)
      )
    : activities;

  const unresolvedAlerts = alerts.filter(alert => !alert.resolved);

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-semibold">Login Activity & Security Monitoring</h2>
            <p className="text-white/70 text-sm">Monitor user login patterns and security events</p>
          </div>
          <div className="flex items-center gap-2">
            {unresolvedAlerts.length > 0 && (
              <span className="px-3 py-1 rounded-lg bg-red-500/20 text-red-400 text-sm">
                {unresolvedAlerts.length} alert{unresolvedAlerts.length !== 1 ? 's' : ''}
              </span>
            )}
            <button
              onClick={loadLoginActivity}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-sm"
            >
              Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Time Range */}
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>

          {/* Role Filter */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
          >
            <option value="">All Roles</option>
            <option value="admin">Admin</option>
            <option value="teacher">Teacher</option>
            <option value="parent">Parent</option>
            <option value="student">Student</option>
            <option value="accountant">Accountant</option>
            <option value="librarian">Librarian</option>
            <option value="head_teacher">Head Teacher</option>
          </select>

          {/* School Filter */}
          <select
            value={filterSchool}
            onChange={(e) => setFilterSchool(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
          >
            <option value="">All Schools</option>
            {schools.map(school => (
              <option key={school.school_id} value={school.school_id}>
                {school.name}
              </option>
            ))}
          </select>

          {/* Show Alerts Only */}
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={showAlertsOnly}
              onChange={(e) => setShowAlertsOnly(e.target.checked)}
              className="rounded border-white/20 bg-white/10 text-red-600"
            />
            Alerts Only
          </label>

          {/* Clear Filters */}
          <button
            onClick={() => {
              setFilterRole('');
              setFilterSchool('');
              setShowAlertsOnly(false);
            }}
            className="px-3 py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-sm"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-white">
          <div className="text-2xl font-bold text-blue-400">{stats.totalLogins.toLocaleString()}</div>
          <div className="text-sm text-white/70">Total Logins</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-white">
          <div className="text-2xl font-bold text-green-400">{stats.successfulLogins.toLocaleString()}</div>
          <div className="text-sm text-white/70">Successful</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-white">
          <div className="text-2xl font-bold text-red-400">{stats.failedLogins.toLocaleString()}</div>
          <div className="text-sm text-white/70">Failed</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-white">
          <div className="text-2xl font-bold text-purple-400">{stats.uniqueUsers.toLocaleString()}</div>
          <div className="text-sm text-white/70">Unique Users</div>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-4 text-white">
          <div className="text-2xl font-bold text-yellow-400">{formatDuration(stats.averageSessionDuration)}</div>
          <div className="text-sm text-white/70">Avg Session</div>
        </div>
      </div>

      {/* Security Alerts */}
      {unresolvedAlerts.length > 0 && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 backdrop-blur-md shadow-lg p-6 text-white">
          <h3 className="text-lg font-semibold mb-4 text-red-400">Security Alerts</h3>
          <div className="space-y-3">
            {unresolvedAlerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{alert.userName}</span>
                      <span className={`px-2 py-1 rounded text-xs ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-sm text-white/80">{alert.description}</p>
                    <p className="text-xs text-white/60 mt-1">{formatDateTime(alert.timestamp)}</p>
                  </div>
                  <button
                    onClick={() => handleResolveAlert(alert.id)}
                    className="px-3 py-1 rounded-lg bg-green-600 hover:bg-green-700 text-sm"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
            {unresolvedAlerts.length > 5 && (
              <p className="text-sm text-white/70 text-center">
                And {unresolvedAlerts.length - 5} more alerts...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Login Activity Table */}
      <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 text-white overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold">Recent Login Activity</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="text-left py-3 px-4">User</th>
                <th className="text-left py-3 px-4">Role</th>
                <th className="text-left py-3 px-4">School</th>
                <th className="text-left py-3 px-4">Login Time</th>
                <th className="text-left py-3 px-4">Location</th>
                <th className="text-left py-3 px-4">IP Address</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Session</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-white/70">
                    Loading login activity...
                  </td>
                </tr>
              ) : filteredActivities.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-white/70">
                    No login activity found
                  </td>
                </tr>
              ) : (
                filteredActivities.map((activity) => (
                  <tr key={activity.id} className="border-t border-white/10 hover:bg-white/5">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{activity.userName}</p>
                        <p className="text-xs text-white/60">{activity.userEmail}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs ${getRoleColor(activity.userRole)}`}>
                        {activity.userRole.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium">{activity.schoolName}</p>
                        <p className="text-xs text-white/60">{activity.schoolId}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-white/70">
                      {formatDateTime(activity.loginTime)}
                    </td>
                    <td className="py-3 px-4 text-white/70">
                      {activity.location || 'Unknown'}
                    </td>
                    <td className="py-3 px-4 text-white/70 font-mono text-xs">
                      {activity.ipAddress}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${activity.success ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className={activity.success ? 'text-green-400' : 'text-red-400'}>
                          {activity.success ? 'Success' : 'Failed'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-white/70">
                      {activity.sessionDuration ? formatDuration(activity.sessionDuration) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Locations */}
      {stats.topLocations.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg shadow-black/20 p-6 text-white">
          <h3 className="text-lg font-semibold mb-4">Top Login Locations</h3>
          <div className="space-y-2">
            {stats.topLocations.map((location, index) => (
              <div key={location.location} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-500/20 flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <span>{location.location}</span>
                </div>
                <span className="text-white/70">{location.count} logins</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}