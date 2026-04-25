import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Download,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  Zap,
  Clock,
  Shield,
  Globe,
  Database
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface APIMetrics {
  totalCalls: number;
  callsToday: number;
  averageResponseTime: number;
  errorRate: number;
  rateLimitHits: number;
  uniqueSchools: number;
  peakHour: string;
  growthRate: number;
}

interface SchoolAPIUsage {
  schoolId: string;
  schoolName: string;
  subscriptionPlan: string;
  dailyCalls: number;
  monthlyCalls: number;
  averageResponseTime: number;
  errorCount: number;
  rateLimitHits: number;
  lastActivity: string;
  status: 'normal' | 'warning' | 'critical';
  trend: 'increasing' | 'stable' | 'decreasing';
}

interface APIAlert {
  id: string;
  schoolId: string;
  schoolName: string;
  alertType: 'rate_limit' | 'high_usage' | 'error_spike' | 'anomaly';
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
}

interface HourlyUsage {
  hour: string;
  calls: number;
  errors: number;
}

const APIUsagePage: React.FC = () => {
  const [metrics, setMetrics] = useState<APIMetrics | null>(null);
  const [schools, setSchools] = useState<SchoolAPIUsage[]>([]);
  const [alerts, setAlerts] = useState<APIAlert[]>([]);
  const [hourlyData, setHourlyData] = useState<HourlyUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'normal' | 'warning' | 'critical'>('all');
  const [sortBy, setSortBy] = useState<'calls' | 'errors' | 'name'>('calls');

  const fetchAPIData = async () => {
    try {
      setLoading(true);

      // Fetch all schools first
      const { data: schoolsData } = await supabase
        .from('schools')
        .select('school_id, name, subscription_plan, created_at')
        .order('name');

      if (schoolsData) {
        // Get real API usage data from audit logs or create empty data structure
        const { data: apiUsageData, error: apiError } = await supabase
          .from('audit_logs')
          .select('school_id, created_at, action')
          .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days
          .order('created_at', { ascending: false });

        // Process real API usage data
        const schoolsWithAPI: SchoolAPIUsage[] = schoolsData.map(school => {
          const schoolApiCalls = (apiUsageData || []).filter(call => call.school_id === school.school_id);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          const dailyCalls = schoolApiCalls.filter(call => new Date(call.created_at) >= today).length;
          const monthlyCalls = schoolApiCalls.length;
          const errorCount = schoolApiCalls.filter(call => call.action?.includes('ERROR')).length;
          
          return {
            schoolId: school.school_id,
            schoolName: school.name,
            subscriptionPlan: school.subscription_plan || 'Free',
            dailyCalls,
            monthlyCalls,
            averageResponseTime: 0, // Would need performance monitoring to get real response times
            errorCount,
            rateLimitHits: 0, // Would need rate limiting system to track this
            lastActivity: schoolApiCalls.length > 0 ? schoolApiCalls[0].created_at : school.created_at,
            status: errorCount > dailyCalls * 0.1 ? 'critical' : 
                   errorCount > dailyCalls * 0.05 ? 'warning' : 'normal',
            trend: 'stable'
          };
        });

        setSchools(schoolsWithAPI);

        // Calculate overall metrics from real data
        const totalCalls = schoolsWithAPI.reduce((sum, school) => sum + school.dailyCalls, 0);
        const totalErrors = schoolsWithAPI.reduce((sum, school) => sum + school.errorCount, 0);
        const totalRateLimits = schoolsWithAPI.reduce((sum, school) => sum + school.rateLimitHits, 0);

        setMetrics({
          totalCalls: schoolsWithAPI.reduce((sum, school) => sum + school.monthlyCalls, 0),
          callsToday: totalCalls,
          averageResponseTime: 0, // Would need performance monitoring
          errorRate: totalCalls > 0 ? Math.round((totalErrors / totalCalls) * 100 * 100) / 100 : 0,
          rateLimitHits: totalRateLimits,
          uniqueSchools: schoolsWithAPI.filter(s => s.dailyCalls > 0).length,
          peakHour: '14:00', // Would need hourly analysis
          growthRate: 0 // Would need historical comparison
        });

        // Generate hourly usage data from real data
        const hours = Array.from({ length: 24 }, (_, i) => {
          const hour = i.toString().padStart(2, '0') + ':00';
          const hourStart = new Date();
          hourStart.setHours(i, 0, 0, 0);
          const hourEnd = new Date();
          hourEnd.setHours(i + 1, 0, 0, 0);
          
          const hourCalls = (apiUsageData || []).filter(call => {
            const callTime = new Date(call.created_at);
            return callTime >= hourStart && callTime < hourEnd;
          });
          
          const calls = hourCalls.length;
          const errors = hourCalls.filter(call => call.action?.includes('ERROR')).length;
          
          return { hour, calls, errors };
        });
        setHourlyData(hours);

        // Generate alerts from real data
        const apiAlerts: APIAlert[] = schoolsWithAPI
          .filter(school => school.status !== 'normal')
          .map(school => ({
            id: `alert_${school.schoolId}`,
            schoolId: school.schoolId,
            schoolName: school.schoolName,
            alertType: school.errorCount > school.dailyCalls * 0.1 ? 'error_spike' : 'high_usage',
            message: school.errorCount > school.dailyCalls * 0.1
              ? `High error rate: ${Math.round((school.errorCount / Math.max(school.dailyCalls, 1)) * 100)}%`
              : `High API usage: ${school.dailyCalls.toLocaleString()} calls today`,
            severity: school.status === 'critical' ? 'high' : 'medium',
            timestamp: new Date().toISOString()
          }));

        setAlerts(apiAlerts);
      }

    } catch (error) {
      console.error('Error fetching API data:', error);
      setSchools([]);
      setMetrics({
        totalCalls: 0,
        callsToday: 0,
        averageResponseTime: 0,
        errorRate: 0,
        rateLimitHits: 0,
        uniqueSchools: 0,
        peakHour: '00:00',
        growthRate: 0
      });
      setHourlyData([]);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAPIData();
  }, []);

  const filteredAndSortedSchools = schools
    .filter(school => {
      const matchesSearch = school.schoolName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'all' || school.status === filterStatus;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'calls':
          return b.dailyCalls - a.dailyCalls;
        case 'errors':
          return b.errorCount - a.errorCount;
        case 'name':
          return a.schoolName.localeCompare(b.schoolName);
        default:
          return 0;
      }
    });

  const exportAPIReport = async () => {
    try {
      const report = `
API USAGE REPORT
Generated: ${new Date().toLocaleString()}

OVERVIEW METRICS:
- Total Monthly Calls: ${metrics?.totalCalls?.toLocaleString()}
- Calls Today: ${metrics?.callsToday?.toLocaleString()}
- Average Response Time: ${metrics?.averageResponseTime}ms
- Error Rate: ${metrics?.errorRate}%
- Rate Limit Hits: ${metrics?.rateLimitHits}
- Active Schools: ${metrics?.uniqueSchools}
- Peak Hour: ${metrics?.peakHour}
- Growth Rate: ${metrics?.growthRate?.toFixed(1)}%

SCHOOL BREAKDOWN:
${filteredAndSortedSchools.map(school => 
  `${school.schoolName} (${school.subscriptionPlan}): ${school.dailyCalls.toLocaleString()} calls/day, ${school.errorCount} errors, ${school.averageResponseTime}ms avg`
).join('\n')}

ALERTS:
${alerts.map(alert => 
  `${alert.schoolName}: ${alert.message} - ${alert.severity.toUpperCase()}`
).join('\n')}
      `;

      const blob = new Blob([report], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `api-usage-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting API report:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-green-600 bg-green-50';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
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
          <h1 className="text-2xl font-bold text-gray-900">API Usage</h1>
          <p className="text-gray-600">Monitor API calls, rate limits, and usage patterns across all schools</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportAPIReport}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
          <button
            onClick={fetchAPIData}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* API Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Calls Today</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.callsToday.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{metrics.totalCalls.toLocaleString()} this month</p>
              </div>
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-green-600">{metrics.averageResponseTime}ms</p>
                <p className="text-xs text-gray-500">across all endpoints</p>
              </div>
              <Zap className="w-8 h-8 text-green-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Error Rate</p>
                <p className="text-2xl font-bold text-red-600">{metrics.errorRate}%</p>
                <p className="text-xs text-gray-500">of total requests</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Rate Limit Hits</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.rateLimitHits}</p>
                <p className="text-xs text-gray-500">today across all schools</p>
              </div>
              <Shield className="w-8 h-8 text-orange-600" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Hourly Usage Chart */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">24-Hour API Usage Pattern</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={hourlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="calls" stroke="#3B82F6" strokeWidth={2} name="API Calls" />
              <Line type="monotone" dataKey="errors" stroke="#EF4444" strokeWidth={2} name="Errors" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* API Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">API Alerts</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {alerts.map((alert) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className={`w-5 h-5 ${
                      alert.severity === 'high' ? 'text-red-500' : 
                      alert.severity === 'medium' ? 'text-yellow-500' : 'text-blue-500'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-900">{alert.schoolName}</p>
                      <p className="text-sm text-gray-600">{alert.message}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      alert.severity === 'high' ? 'bg-red-100 text-red-800' :
                      alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {alert.alertType.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(alert.timestamp).toLocaleString()}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search schools..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="normal">Normal</option>
              <option value="warning">Warning</option>
              <option value="critical">Critical</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="calls">Sort by Calls</option>
              <option value="errors">Sort by Errors</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* Schools API Usage Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">School API Usage</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  School
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Daily Calls
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monthly Calls
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Errors
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Response
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate Limits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAndSortedSchools.map((school) => (
                <motion.tr
                  key={school.schoolId}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{school.schoolName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      school.subscriptionPlan === 'Premium' ? 'bg-purple-100 text-purple-800' :
                      school.subscriptionPlan === 'Standard' ? 'bg-blue-100 text-blue-800' :
                      school.subscriptionPlan === 'Basic' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {school.subscriptionPlan}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {school.dailyCalls.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {school.monthlyCalls.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={school.errorCount > 0 ? 'text-red-600' : 'text-gray-900'}>
                      {school.errorCount}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={
                      school.averageResponseTime > 200 ? 'text-red-600' :
                      school.averageResponseTime > 100 ? 'text-yellow-600' : 'text-green-600'
                    }>
                      {school.averageResponseTime}ms
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={school.rateLimitHits > 0 ? 'text-red-600' : 'text-gray-900'}>
                      {school.rateLimitHits}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(school.status)}`}>
                      {school.status === 'critical' && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {school.status === 'warning' && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {school.status === 'normal' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {school.status.charAt(0).toUpperCase() + school.status.slice(1)}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredAndSortedSchools.length === 0 && (
          <div className="text-center py-12">
            <Globe className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No schools found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default APIUsagePage;