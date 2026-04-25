import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  XCircle, 
  AlertCircle,
  Info,
  Download,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Clock,
  Database,
  Server,
  Code,
  Zap
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ErrorMetrics {
  totalErrors: number;
  errorsToday: number;
  criticalErrors: number;
  resolvedErrors: number;
  errorRate: number;
  avgResolutionTime: number;
  topErrorType: string;
  affectedSchools: number;
}

interface ErrorLog {
  id: string;
  timestamp: string;
  level: 'critical' | 'error' | 'warning' | 'info';
  category: 'database' | 'api' | 'authentication' | 'payment' | 'system' | 'integration';
  message: string;
  details: string;
  schoolId?: string;
  schoolName?: string;
  userId?: string;
  stackTrace?: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  occurrences: number;
}

interface ErrorSummary {
  category: string;
  count: number;
  percentage: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

const ErrorLogsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<ErrorMetrics | null>(null);
  const [errors, setErrors] = useState<ErrorLog[]>([]);
  const [summary, setSummary] = useState<ErrorSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<'all' | 'critical' | 'error' | 'warning' | 'info'>('all');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'database' | 'api' | 'authentication' | 'payment' | 'system' | 'integration'>('all');
  const [resolvedFilter, setResolvedFilter] = useState<'all' | 'resolved' | 'unresolved'>('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');

  const fetchErrorData = async () => {
    try {
      setLoading(true);

      // Generate realistic error log data
      const errorCategories = ['database', 'api', 'authentication', 'payment', 'system', 'integration'];
      const errorLevels = ['critical', 'error', 'warning', 'info'];
      
      const generatedErrors: ErrorLog[] = Array.from({ length: 150 }, (_, i) => {
        const category = errorCategories[Math.floor(Math.random() * errorCategories.length)] as any;
        const level = errorLevels[Math.floor(Math.random() * errorLevels.length)] as any;
        const timestamp = new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString();
        const resolved = Math.random() > 0.3; // 70% resolved
        
        const errorMessages: Record<string, string[]> = {
          database: ['Connection timeout', 'Query execution failed', 'Deadlock detected', 'Table lock timeout'],
          api: ['Rate limit exceeded', 'Invalid API key', 'Endpoint not found', 'Request timeout'],
          authentication: ['Invalid credentials', 'Session expired', 'Token validation failed', 'Permission denied'],
          payment: ['Payment gateway error', 'Transaction failed', 'Invalid payment method', 'Refund processing error'],
          system: ['Memory limit exceeded', 'Disk space low', 'Service unavailable', 'Configuration error'],
          integration: ['Third-party service error', 'Webhook delivery failed', 'Data sync error', 'External API timeout']
        };

        return {
          id: `error_${i}`,
          timestamp,
          level,
          category,
          message: errorMessages[category][Math.floor(Math.random() * errorMessages[category].length)],
          details: `Error occurred in ${category} module. Stack trace and additional context available.`,
          schoolId: Math.random() > 0.3 ? `school_${Math.floor(Math.random() * 50)}` : undefined,
          schoolName: Math.random() > 0.3 ? `School ${Math.floor(Math.random() * 50) + 1}` : undefined,
          userId: Math.random() > 0.5 ? `user_${Math.floor(Math.random() * 1000)}` : undefined,
          stackTrace: 'Stack trace details would be shown here...',
          resolved,
          resolvedAt: resolved ? new Date(Date.parse(timestamp) + Math.random() * 24 * 60 * 60 * 1000).toISOString() : undefined,
          resolvedBy: resolved ? `admin_${Math.floor(Math.random() * 5)}` : undefined,
          occurrences: Math.floor(Math.random() * 10) + 1
        };
      });

      setErrors(generatedErrors);

      // Calculate metrics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const errorsToday = generatedErrors.filter(e => new Date(e.timestamp) >= today).length;
      const criticalErrors = generatedErrors.filter(e => e.level === 'critical').length;
      const resolvedErrors = generatedErrors.filter(e => e.resolved).length;
      const uniqueSchools = new Set(generatedErrors.filter(e => e.schoolId).map(e => e.schoolId)).size;

      setMetrics({
        totalErrors: generatedErrors.length,
        errorsToday,
        criticalErrors,
        resolvedErrors,
        errorRate: Math.round((generatedErrors.length / 10000) * 100 * 100) / 100, // Assuming 10k total operations
        avgResolutionTime: 4.2, // hours
        topErrorType: 'Database Connection',
        affectedSchools: uniqueSchools
      });

      // Calculate error summary by category
      const categoryCounts = errorCategories.map(category => {
        const count = generatedErrors.filter(e => e.category === category).length;
        const trendValue = Math.random();
        const trend: 'increasing' | 'stable' | 'decreasing' = 
          trendValue > 0.6 ? 'increasing' : 
          trendValue > 0.3 ? 'stable' : 'decreasing';
        
        return {
          category: category.charAt(0).toUpperCase() + category.slice(1),
          count,
          percentage: Math.round((count / generatedErrors.length) * 100),
          trend
        };
      });

      setSummary(categoryCounts);

    } catch (error) {
      console.error('Error fetching error logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchErrorData();
  }, []);

  const filteredErrors = errors.filter(error => {
    const matchesSearch = error.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         error.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         error.schoolName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesLevel = levelFilter === 'all' || error.level === levelFilter;
    const matchesCategory = categoryFilter === 'all' || error.category === categoryFilter;
    const matchesResolved = resolvedFilter === 'all' || 
                           (resolvedFilter === 'resolved' && error.resolved) ||
                           (resolvedFilter === 'unresolved' && !error.resolved);

    // Date range filter
    const errorDate = new Date(error.timestamp);
    const now = new Date();
    let matchesDate = true;
    
    if (dateRange === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      matchesDate = errorDate >= today;
    } else if (dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchesDate = errorDate >= weekAgo;
    } else if (dateRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      matchesDate = errorDate >= monthAgo;
    }

    return matchesSearch && matchesLevel && matchesCategory && matchesResolved && matchesDate;
  });

  const exportErrorReport = async () => {
    try {
      const report = `
ERROR LOGS REPORT
Generated: ${new Date().toLocaleString()}
Date Range: ${dateRange}

OVERVIEW METRICS:
- Total Errors: ${metrics?.totalErrors}
- Errors Today: ${metrics?.errorsToday}
- Critical Errors: ${metrics?.criticalErrors}
- Resolved Errors: ${metrics?.resolvedErrors}
- Error Rate: ${metrics?.errorRate}%
- Avg Resolution Time: ${metrics?.avgResolutionTime} hours
- Affected Schools: ${metrics?.affectedSchools}

ERROR BREAKDOWN BY CATEGORY:
${summary.map(s => `${s.category}: ${s.count} (${s.percentage}%) - ${s.trend}`).join('\n')}

DETAILED ERROR LOG:
${filteredErrors.map(error => 
  `[${error.timestamp}] ${error.level.toUpperCase()} - ${error.category}: ${error.message}
  School: ${error.schoolName || 'N/A'}
  Resolved: ${error.resolved ? 'Yes' : 'No'}
  Occurrences: ${error.occurrences}
  Details: ${error.details}
  ---`
).join('\n')}
      `;

      const blob = new Blob([report], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `error-logs-${dateRange}-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting error report:', error);
    }
  };

  const getLevelIcon = (level: string) => {
    switch (level) {
      case 'critical': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'info': return <Info className="w-4 h-4 text-blue-500" />;
      default: return <Info className="w-4 h-4 text-gray-500" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'info': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'database': return <Database className="w-4 h-4" />;
      case 'api': return <Server className="w-4 h-4" />;
      case 'authentication': return <Zap className="w-4 h-4" />;
      case 'payment': return <Code className="w-4 h-4" />;
      case 'system': return <Server className="w-4 h-4" />;
      case 'integration': return <Zap className="w-4 h-4" />;
      default: return <AlertTriangle className="w-4 h-4" />;
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
          <h1 className="text-2xl font-bold text-gray-900">Error Logs</h1>
          <p className="text-gray-600">Monitor system errors, failed transactions, and error patterns</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportErrorReport}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
          <button
            onClick={fetchErrorData}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Error Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Errors</p>
                <p className="text-2xl font-bold text-red-600">{metrics.totalErrors.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{metrics.errorsToday} today</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
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
                <p className="text-sm font-medium text-gray-600">Critical Errors</p>
                <p className="text-2xl font-bold text-red-700">{metrics.criticalErrors}</p>
                <p className="text-xs text-gray-500">requiring immediate attention</p>
              </div>
              <XCircle className="w-8 h-8 text-red-700" />
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
                <p className="text-sm font-medium text-gray-600">Resolution Rate</p>
                <p className="text-2xl font-bold text-green-600">{Math.round((metrics.resolvedErrors / metrics.totalErrors) * 100)}%</p>
                <p className="text-xs text-gray-500">{metrics.resolvedErrors} resolved</p>
              </div>
              <Clock className="w-8 h-8 text-green-600" />
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
                <p className="text-sm font-medium text-gray-600">Avg Resolution</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.avgResolutionTime}h</p>
                <p className="text-xs text-gray-500">average time to resolve</p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Error Summary by Category */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Error Distribution by Category</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summary.map((item) => (
            <div key={item.category} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {getCategoryIcon(item.category.toLowerCase())}
                <div>
                  <p className="font-medium text-gray-900">{item.category}</p>
                  <p className="text-sm text-gray-600">{item.count} errors ({item.percentage}%)</p>
                </div>
              </div>
              <div className="text-right">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  item.trend === 'increasing' ? 'bg-red-100 text-red-800' :
                  item.trend === 'stable' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {item.trend}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search errors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Levels</option>
            <option value="critical">Critical</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
            <option value="info">Info</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            <option value="database">Database</option>
            <option value="api">API</option>
            <option value="authentication">Authentication</option>
            <option value="payment">Payment</option>
            <option value="system">System</option>
            <option value="integration">Integration</option>
          </select>

          <select
            value={resolvedFilter}
            onChange={(e) => setResolvedFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="resolved">Resolved</option>
            <option value="unresolved">Unresolved</option>
          </select>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="today">Today</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>

          <div className="text-sm text-gray-600 flex items-center">
            Showing {filteredErrors.length} of {errors.length} errors
          </div>
        </div>
      </div>

      {/* Error Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Error Details</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Level
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  School
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Occurrences
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredErrors.slice(0, 50).map((error) => (
                <motion.tr
                  key={error.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(error.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getLevelIcon(error.level)}
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getLevelColor(error.level)}`}>
                        {error.level.toUpperCase()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getCategoryIcon(error.category)}
                      <span className="ml-2 text-sm text-gray-900 capitalize">{error.category}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900 font-medium">{error.message}</div>
                    <div className="text-sm text-gray-500 truncate max-w-xs">{error.details}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {error.schoolName || 'System-wide'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      error.occurrences > 5 ? 'bg-red-100 text-red-800' :
                      error.occurrences > 2 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {error.occurrences}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      error.resolved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {error.resolved ? 'Resolved' : 'Open'}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredErrors.length === 0 && (
          <div className="text-center py-12">
            <AlertTriangle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No errors found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}

        {filteredErrors.length > 50 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing first 50 of {filteredErrors.length} errors. Use filters to narrow down results.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorLogsPage;