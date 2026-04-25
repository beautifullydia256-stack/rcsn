import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Database, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  HardDrive,
  Zap,
  RefreshCw,
  Download,
  TrendingUp,
  Server
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface DatabaseMetrics {
  database_size: string;
  total_tables: number;
  total_rows: number;
  active_connections: number;
  slow_queries_count: number;
  avg_query_time: number;
  cache_hit_ratio: number;
  disk_usage: number;
  cpu_usage: number;
  memory_usage: number;
}

interface TableInfo {
  table_name: string;
  school_count: number;
  row_count: number;
  size_mb: number;
  last_updated: string;
}

interface SlowQuery {
  query_id: string;
  query_text: string;
  execution_time: number;
  calls: number;
  avg_time: number;
  school_id?: string;
  timestamp: string;
}

const DatabaseHealthPage: React.FC = () => {
  const [metrics, setMetrics] = useState<DatabaseMetrics | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [slowQueries, setSlowQueries] = useState<SlowQuery[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDatabaseHealth = async () => {
    try {
      setLoading(true);

      // Mock data for demonstration - in real implementation, fetch from database monitoring
      const mockMetrics: DatabaseMetrics = {
        database_size: '2.4 GB',
        total_tables: 45,
        total_rows: 1250000,
        active_connections: 12,
        slow_queries_count: 3,
        avg_query_time: 45.2,
        cache_hit_ratio: 98.5,
        disk_usage: 65,
        cpu_usage: 23,
        memory_usage: 78
      };

      const mockTables: TableInfo[] = [
        {
          table_name: 'students',
          school_count: 30,
          row_count: 45000,
          size_mb: 125.5,
          last_updated: new Date().toISOString()
        },
        {
          table_name: 'student_payments',
          school_count: 28,
          row_count: 180000,
          size_mb: 89.2,
          last_updated: new Date().toISOString()
        },
        {
          table_name: 'users',
          school_count: 32,
          row_count: 8500,
          size_mb: 15.8,
          last_updated: new Date().toISOString()
        },
        {
          table_name: 'schools',
          school_count: 1,
          row_count: 32,
          size_mb: 2.1,
          last_updated: new Date().toISOString()
        },
        {
          table_name: 'exam_results',
          school_count: 25,
          row_count: 320000,
          size_mb: 245.7,
          last_updated: new Date().toISOString()
        }
      ];

      const mockSlowQueries: SlowQuery[] = [
        {
          query_id: '1',
          query_text: 'SELECT * FROM students WHERE school_id = ? AND status = ? ORDER BY created_at DESC',
          execution_time: 2500,
          calls: 45,
          avg_time: 2100,
          school_id: 'school_123',
          timestamp: new Date().toISOString()
        },
        {
          query_id: '2',
          query_text: 'SELECT COUNT(*) FROM student_payments WHERE payment_date BETWEEN ? AND ?',
          execution_time: 1800,
          calls: 23,
          avg_time: 1650,
          timestamp: new Date().toISOString()
        },
        {
          query_id: '3',
          query_text: 'UPDATE exam_results SET grade = ? WHERE student_id IN (...)',
          execution_time: 3200,
          calls: 12,
          avg_time: 2900,
          school_id: 'school_456',
          timestamp: new Date().toISOString()
        }
      ];

      setMetrics(mockMetrics);
      setTables(mockTables);
      setSlowQueries(mockSlowQueries);

    } catch (error) {
      console.error('Error fetching database health:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDatabaseHealth();
  }, []);

  const exportHealthReport = async () => {
    try {
      const report = `
DATABASE HEALTH REPORT
Generated: ${new Date().toLocaleString()}

OVERVIEW METRICS:
- Database Size: ${metrics?.database_size}
- Total Tables: ${metrics?.total_tables}
- Total Rows: ${metrics?.total_rows?.toLocaleString()}
- Active Connections: ${metrics?.active_connections}
- Cache Hit Ratio: ${metrics?.cache_hit_ratio}%
- Average Query Time: ${metrics?.avg_query_time}ms

TABLE INFORMATION:
${tables.map(table => 
  `${table.table_name}: ${table.row_count.toLocaleString()} rows, ${table.size_mb} MB`
).join('\n')}

SLOW QUERIES:
${slowQueries.map(query => 
  `${query.query_text.substring(0, 80)}... - ${query.execution_time}ms (${query.calls} calls)`
).join('\n')}
      `;

      const blob = new Blob([report], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `database-health-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting health report:', error);
    }
  };

  const getHealthStatus = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) return { color: 'text-green-600', icon: CheckCircle, status: 'Good' };
    if (value <= thresholds.warning) return { color: 'text-yellow-600', icon: Clock, status: 'Warning' };
    return { color: 'text-red-600', icon: AlertTriangle, status: 'Critical' };
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
          <h1 className="text-2xl font-bold text-gray-900">Database Health</h1>
          <p className="text-gray-600">Monitor database performance and health metrics</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportHealthReport}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
          <button
            onClick={fetchDatabaseHealth}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* System Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-4 rounded-lg shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Database Size</p>
                <p className="text-xl font-bold text-gray-900">{metrics.database_size}</p>
              </div>
              <Database className="w-6 h-6 text-blue-600" />
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
                <p className="text-xs font-medium text-gray-600">Active Connections</p>
                <p className="text-xl font-bold text-green-600">{metrics.active_connections}</p>
              </div>
              <Activity className="w-6 h-6 text-green-600" />
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
                <p className="text-xs font-medium text-gray-600">Cache Hit Ratio</p>
                <p className="text-xl font-bold text-purple-600">{metrics.cache_hit_ratio}%</p>
              </div>
              <Zap className="w-6 h-6 text-purple-600" />
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
                <p className="text-xs font-medium text-gray-600">CPU Usage</p>
                <p className={`text-xl font-bold ${getHealthStatus(metrics.cpu_usage, { good: 50, warning: 80 }).color}`}>
                  {metrics.cpu_usage}%
                </p>
              </div>
              <Server className="w-6 h-6 text-indigo-600" />
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
                <p className="text-xs font-medium text-gray-600">Memory Usage</p>
                <p className={`text-xl font-bold ${getHealthStatus(metrics.memory_usage, { good: 60, warning: 85 }).color}`}>
                  {metrics.memory_usage}%
                </p>
              </div>
              <HardDrive className="w-6 h-6 text-orange-600" />
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
                <p className="text-xs font-medium text-gray-600">Avg Query Time</p>
                <p className={`text-xl font-bold ${getHealthStatus(metrics.avg_query_time, { good: 50, warning: 100 }).color}`}>
                  {metrics.avg_query_time}ms
                </p>
              </div>
              <TrendingUp className="w-6 h-6 text-teal-600" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Tables Information */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Table Information</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Table Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Schools
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Row Count
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size (MB)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tables.map((table) => (
                <motion.tr
                  key={table.table_name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {table.table_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {table.school_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {table.row_count.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {table.size_mb.toFixed(1)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(table.last_updated).toLocaleString()}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slow Queries */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Slow Queries</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {slowQueries.map((query) => (
            <motion.div
              key={query.query_id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-6 hover:bg-gray-50"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 mb-2">
                    {query.query_text}
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                    <span>Execution: {query.execution_time}ms</span>
                    <span>Calls: {query.calls}</span>
                    <span>Avg: {query.avg_time}ms</span>
                    {query.school_id && <span>School: {query.school_id}</span>}
                  </div>
                </div>
                <div className="flex items-center ml-4">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    query.execution_time > 2000 ? 'bg-red-100 text-red-800' :
                    query.execution_time > 1000 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {query.execution_time > 2000 ? 'Critical' :
                     query.execution_time > 1000 ? 'Warning' : 'Normal'}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {slowQueries.length === 0 && (
          <div className="text-center py-12">
            <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No slow queries detected</h3>
            <p className="mt-1 text-sm text-gray-500">
              All queries are performing within acceptable limits.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseHealthPage;