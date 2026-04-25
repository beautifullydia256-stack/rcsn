import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  User, 
  Settings,
  Trash2,
  Edit,
  Plus,
  Download,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Clock,
  Eye,
  AlertTriangle,
  CheckCircle,
  Database,
  FileText
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface AuditMetrics {
  totalActions: number;
  actionsToday: number;
  uniqueUsers: number;
  criticalActions: number;
  deletions: number;
  modifications: number;
  creations: number;
  systemChanges: number;
}

interface AuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'config_change' | 'permission_change' | 'data_export' | 'system_action';
  resource: string;
  resourceId?: string;
  resourceName?: string;
  schoolId?: string;
  schoolName?: string;
  details: string;
  metadata: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  success: boolean;
}

interface ActionSummary {
  action: string;
  count: number;
  percentage: number;
  trend: 'increasing' | 'stable' | 'decreasing';
}

const AuditLogPage: React.FC = () => {
  const [metrics, setMetrics] = useState<AuditMetrics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [summary, setSummary] = useState<ActionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | 'create' | 'update' | 'delete' | 'login' | 'logout' | 'config_change' | 'permission_change' | 'data_export' | 'system_action'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');
  const [userFilter, setUserFilter] = useState('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');

  const fetchAuditData = async () => {
    try {
      setLoading(true);

      // Fetch real audit logs from database
      const { data: auditLogs, error: logsError } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logsError) {
        console.error('Error fetching audit logs:', logsError);
        setAuditLogs([]);
        setMetrics({
          totalActions: 0,
          actionsToday: 0,
          uniqueUsers: 0,
          criticalActions: 0,
          deletions: 0,
          modifications: 0,
          creations: 0,
          systemChanges: 0
        });
        setSummary([]);
        return;
      }

      // Transform audit logs to expected format
      const transformedLogs: AuditLog[] = (auditLogs || []).map(log => ({
        id: log.id,
        timestamp: log.created_at,
        userId: log.user_id || 'system',
        userName: log.metadata?.user_name || 'System User',
        userRole: log.user_role || 'system',
        action: log.action?.toLowerCase() || 'system_action',
        resource: log.metadata?.resource || 'system',
        resourceId: log.metadata?.resource_id,
        resourceName: log.metadata?.resource_name,
        schoolId: log.school_id,
        schoolName: log.metadata?.school_name,
        details: log.details || 'System action performed',
        metadata: log.metadata || {},
        ipAddress: log.metadata?.ip_address || 'Unknown',
        userAgent: log.metadata?.user_agent || 'Unknown',
        severity: log.metadata?.severity || 'low',
        success: log.metadata?.success !== false
      }));

      setAuditLogs(transformedLogs);

      // Calculate real metrics
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const actionsToday = transformedLogs.filter(log => new Date(log.timestamp) >= today).length;
      const uniqueUsers = new Set(transformedLogs.map(log => log.userId)).size;
      const criticalActions = transformedLogs.filter(log => log.severity === 'critical').length;
      const deletions = transformedLogs.filter(log => log.action === 'delete').length;
      const modifications = transformedLogs.filter(log => log.action === 'update').length;
      const creations = transformedLogs.filter(log => log.action === 'create').length;
      const systemChanges = transformedLogs.filter(log => log.action === 'config_change' || log.action === 'system_action').length;

      setMetrics({
        totalActions: transformedLogs.length,
        actionsToday,
        uniqueUsers,
        criticalActions,
        deletions,
        modifications,
        creations,
        systemChanges
      });

      // Calculate action summary
      const actions = ['create', 'update', 'delete', 'login', 'logout', 'config_change', 'permission_change', 'data_export', 'system_action'];
      const actionCounts = actions.map(action => {
        const count = transformedLogs.filter(log => log.action === action).length;
        
        return {
          action: action.replace('_', ' ').toUpperCase(),
          count,
          percentage: transformedLogs.length > 0 ? Math.round((count / transformedLogs.length) * 100) : 0,
          trend: 'stable' as ActionSummary['trend']
        };
      });

      setSummary(actionCounts);

    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setAuditLogs([]);
      setMetrics({
        totalActions: 0,
        actionsToday: 0,
        uniqueUsers: 0,
        criticalActions: 0,
        deletions: 0,
        modifications: 0,
        creations: 0,
        systemChanges: 0
      });
      setSummary([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditData();
  }, []);

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.schoolName?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    const matchesSeverity = severityFilter === 'all' || log.severity === severityFilter;
    const matchesUser = userFilter === 'all' || log.userId === userFilter;

    // Date range filter
    const logDate = new Date(log.timestamp);
    const now = new Date();
    let matchesDate = true;
    
    if (dateRange === 'today') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      matchesDate = logDate >= today;
    } else if (dateRange === 'week') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      matchesDate = logDate >= weekAgo;
    } else if (dateRange === 'month') {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      matchesDate = logDate >= monthAgo;
    }

    return matchesSearch && matchesAction && matchesSeverity && matchesUser && matchesDate;
  });

  const exportAuditReport = async () => {
    try {
      const report = `
AUDIT LOG REPORT
Generated: ${new Date().toLocaleString()}
Date Range: ${dateRange}

OVERVIEW METRICS:
- Total Actions: ${metrics?.totalActions}
- Actions Today: ${metrics?.actionsToday}
- Unique Users: ${metrics?.uniqueUsers}
- Critical Actions: ${metrics?.criticalActions}
- Deletions: ${metrics?.deletions}
- Modifications: ${metrics?.modifications}
- Creations: ${metrics?.creations}
- System Changes: ${metrics?.systemChanges}

ACTION BREAKDOWN:
${summary.map(s => `${s.action}: ${s.count} (${s.percentage}%) - ${s.trend}`).join('\n')}

DETAILED AUDIT LOG:
${filteredLogs.map(log => 
  `[${log.timestamp}] ${log.userName} (${log.userRole}) - ${log.action.toUpperCase()}
  Resource: ${log.resource} (${log.resourceName || 'N/A'})
  School: ${log.schoolName || 'System-wide'}
  Details: ${log.details}
  IP: ${log.ipAddress}
  Success: ${log.success ? 'Yes' : 'No'}
  Severity: ${log.severity.toUpperCase()}
  ---`
).join('\n')}
      `;

      const blob = new Blob([report], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit-log-${dateRange}-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting audit report:', error);
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'create': return <Plus className="w-4 h-4 text-green-500" />;
      case 'update': return <Edit className="w-4 h-4 text-blue-500" />;
      case 'delete': return <Trash2 className="w-4 h-4 text-red-500" />;
      case 'login': return <User className="w-4 h-4 text-green-500" />;
      case 'logout': return <User className="w-4 h-4 text-gray-500" />;
      case 'config_change': return <Settings className="w-4 h-4 text-orange-500" />;
      case 'permission_change': return <Shield className="w-4 h-4 text-purple-500" />;
      case 'data_export': return <Download className="w-4 h-4 text-blue-500" />;
      case 'system_action': return <Database className="w-4 h-4 text-gray-500" />;
      default: return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-100 text-purple-800';
      case 'admin': return 'bg-blue-100 text-blue-800';
      case 'teacher': return 'bg-green-100 text-green-800';
      case 'accountant': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
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
          <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-gray-600">Track all system actions, changes, and user activities</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportAuditReport}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
          <button
            onClick={fetchAuditData}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Audit Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Actions</p>
                <p className="text-2xl font-bold text-blue-600">{metrics.totalActions.toLocaleString()}</p>
                <p className="text-xs text-gray-500">{metrics.actionsToday} today</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
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
                <p className="text-sm font-medium text-gray-600">Critical Actions</p>
                <p className="text-2xl font-bold text-red-600">{metrics.criticalActions}</p>
                <p className="text-xs text-gray-500">requiring attention</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
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
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-green-600">{metrics.uniqueUsers}</p>
                <p className="text-xs text-gray-500">performed actions</p>
              </div>
              <User className="w-8 h-8 text-green-600" />
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
                <p className="text-sm font-medium text-gray-600">Deletions</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.deletions}</p>
                <p className="text-xs text-gray-500">data removed</p>
              </div>
              <Trash2 className="w-8 h-8 text-orange-600" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Action Summary */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Action Distribution</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {summary.slice(0, 6).map((item) => (
            <div key={item.action} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                {getActionIcon(item.action.toLowerCase().replace(' ', '_'))}
                <div>
                  <p className="font-medium text-gray-900">{item.action}</p>
                  <p className="text-sm text-gray-600">{item.count} actions ({item.percentage}%)</p>
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
              placeholder="Search audit logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Actions</option>
            <option value="create">Create</option>
            <option value="update">Update</option>
            <option value="delete">Delete</option>
            <option value="login">Login</option>
            <option value="logout">Logout</option>
            <option value="config_change">Config Change</option>
            <option value="permission_change">Permission Change</option>
            <option value="data_export">Data Export</option>
            <option value="system_action">System Action</option>
          </select>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
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
            Showing {filteredLogs.length} of {auditLogs.length} logs
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Audit Trail</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resource
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  School
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLogs.slice(0, 100).map((log) => (
                <motion.tr
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{log.userName}</div>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(log.userRole)}`}>
                        {log.userRole}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getActionIcon(log.action)}
                      <span className="ml-2 text-sm text-gray-900 capitalize">{log.action.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 font-medium">{log.resource}</div>
                    <div className="text-sm text-gray-500">{log.resourceName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.schoolName || 'System-wide'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {log.ipAddress}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(log.severity)}`}>
                      {log.severity.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      log.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {log.success ? <CheckCircle className="w-3 h-3 mr-1" /> : <AlertTriangle className="w-3 h-3 mr-1" />}
                      {log.success ? 'Success' : 'Failed'}
                    </span>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredLogs.length === 0 && (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No audit logs found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}

        {filteredLogs.length > 100 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Showing first 100 of {filteredLogs.length} audit logs. Use filters to narrow down results.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogPage;