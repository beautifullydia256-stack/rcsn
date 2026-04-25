import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  HardDrive, 
  AlertTriangle, 
  CheckCircle, 
  TrendingUp,
  Download,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  PieChart,
  Database,
  Cloud,
  Zap
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface StorageMetrics {
  totalUsage: number;
  totalLimit: number;
  usagePercentage: number;
  averageUsagePerSchool: number;
  schoolsNearLimit: number;
  storageGrowthRate: number;
}

interface SchoolStorageInfo {
  schoolId: string;
  schoolName: string;
  subscriptionPlan: string;
  currentUsage: number;
  storageLimit: number;
  usagePercentage: number;
  filesCount: number;
  lastUpdated: string;
  growthTrend: 'increasing' | 'stable' | 'decreasing';
  status: 'normal' | 'warning' | 'critical';
}

interface StorageAlert {
  id: string;
  schoolId: string;
  schoolName: string;
  alertType: 'approaching_limit' | 'limit_exceeded' | 'rapid_growth';
  message: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: string;
}

const StorageUsagePage: React.FC = () => {
  const [metrics, setMetrics] = useState<StorageMetrics | null>(null);
  const [schools, setSchools] = useState<SchoolStorageInfo[]>([]);
  const [alerts, setAlerts] = useState<StorageAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'normal' | 'warning' | 'critical'>('all');
  const [sortBy, setSortBy] = useState<'usage' | 'percentage' | 'name'>('percentage');

  const fetchStorageData = async () => {
    try {
      setLoading(true);

      // Fetch system health data which includes storage information
      const response = await fetch('/api/owner/system-health');
      const result = await response.json();

      if (result.success) {
        const storageData = result.data.storage;
        
        // Set metrics
        setMetrics({
          totalUsage: storageData.totalUsage,
          totalLimit: storageData.totalLimit,
          usagePercentage: storageData.usagePercentage,
          averageUsagePerSchool: storageData.totalUsage / Math.max(storageData.schoolsNearLimit.length, 1),
          schoolsNearLimit: storageData.schoolsNearLimit.length,
          storageGrowthRate: 0 // Would need historical data to calculate real growth rate
        });

        // Fetch all schools with storage data
        const { data: schoolsData } = await supabase
          .from('schools')
          .select('school_id, name, subscription_plan, created_at')
          .order('name');

        if (schoolsData) {
          const schoolsWithStorage: SchoolStorageInfo[] = schoolsData.map(school => {
            const limit = school.subscription_plan === 'Premium' ? 10000 : 
                         school.subscription_plan === 'Standard' ? 5000 : 
                         school.subscription_plan === 'Basic' ? 2000 : 500;
            
            // Use real storage data - would need to query actual file storage
            const usage = 0; // Would need real storage calculation per school
            const percentage = 0;
            
            return {
              schoolId: school.school_id,
              schoolName: school.name,
              subscriptionPlan: school.subscription_plan || 'Free',
              currentUsage: usage,
              storageLimit: limit,
              usagePercentage: percentage,
              filesCount: 0, // Would need real file count
              lastUpdated: new Date().toISOString(),
              growthTrend: 'stable', // Would need historical data
              status: 'normal'
            };
          });

          setSchools(schoolsWithStorage);

          // Generate alerts for schools near limit
          const storageAlerts: StorageAlert[] = schoolsWithStorage
            .filter(school => school.usagePercentage > 75)
            .map(school => ({
              id: `alert_${school.schoolId}`,
              schoolId: school.schoolId,
              schoolName: school.schoolName,
              alertType: school.usagePercentage > 90 ? 'limit_exceeded' : 'approaching_limit',
              message: school.usagePercentage > 90 
                ? `Storage limit exceeded (${school.usagePercentage}% used)`
                : `Approaching storage limit (${school.usagePercentage}% used)`,
              severity: school.usagePercentage > 90 ? 'high' : 'medium',
              timestamp: new Date().toISOString()
            }));

          setAlerts(storageAlerts);
        }
      }

    } catch (error) {
      console.error('Error fetching storage data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStorageData();
  }, []);

  const filteredAndSortedSchools = schools
    .filter(school => {
      const matchesSearch = school.schoolName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesFilter = filterStatus === 'all' || school.status === filterStatus;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'usage':
          return b.currentUsage - a.currentUsage;
        case 'percentage':
          return b.usagePercentage - a.usagePercentage;
        case 'name':
          return a.schoolName.localeCompare(b.schoolName);
        default:
          return 0;
      }
    });

  const exportStorageReport = async () => {
    try {
      const report = `
STORAGE USAGE REPORT
Generated: ${new Date().toLocaleString()}

OVERVIEW METRICS:
- Total Usage: ${metrics?.totalUsage?.toLocaleString()} MB
- Total Limit: ${metrics?.totalLimit?.toLocaleString()} MB
- Usage Percentage: ${metrics?.usagePercentage}%
- Schools Near Limit: ${metrics?.schoolsNearLimit}
- Growth Rate: ${metrics?.storageGrowthRate?.toFixed(1)}%

SCHOOL BREAKDOWN:
${filteredAndSortedSchools.map(school => 
  `${school.schoolName} (${school.subscriptionPlan}): ${school.currentUsage.toLocaleString()} MB / ${school.storageLimit.toLocaleString()} MB (${school.usagePercentage}%)`
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
      a.download = `storage-usage-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting storage report:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'warning': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-green-600 bg-green-50';
    }
  };

  const getUsageBarColor = (percentage: number) => {
    if (percentage > 90) return 'bg-red-500';
    if (percentage > 75) return 'bg-yellow-500';
    return 'bg-green-500';
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
          <h1 className="text-2xl font-bold text-gray-900">Storage Usage</h1>
          <p className="text-gray-600">Monitor storage usage across all schools and manage quotas</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportStorageReport}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
          <button
            onClick={fetchStorageData}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Storage Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Usage</p>
                <p className="text-2xl font-bold text-gray-900">{metrics.totalUsage.toLocaleString()} MB</p>
                <p className="text-xs text-gray-500">of {metrics.totalLimit.toLocaleString()} MB</p>
              </div>
              <HardDrive className="w-8 h-8 text-blue-600" />
            </div>
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${getUsageBarColor(metrics.usagePercentage)}`}
                  style={{ width: `${Math.min(metrics.usagePercentage, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-600 mt-1">{metrics.usagePercentage}% used</p>
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
                <p className="text-sm font-medium text-gray-600">Schools Near Limit</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.schoolsNearLimit}</p>
                <p className="text-xs text-gray-500">requiring attention</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-orange-600" />
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
                <p className="text-sm font-medium text-gray-600">Average per School</p>
                <p className="text-2xl font-bold text-purple-600">{Math.round(metrics.averageUsagePerSchool).toLocaleString()} MB</p>
                <p className="text-xs text-gray-500">across all schools</p>
              </div>
              <BarChart3 className="w-8 h-8 text-purple-600" />
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
                <p className="text-sm font-medium text-gray-600">Growth Rate</p>
                <p className="text-2xl font-bold text-green-600">+{metrics.storageGrowthRate.toFixed(1)}%</p>
                <p className="text-xs text-gray-500">monthly growth</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Storage Alerts */}
      {alerts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Storage Alerts</h3>
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
                      {alert.severity.toUpperCase()}
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
              <option value="percentage">Sort by Usage %</option>
              <option value="usage">Sort by Usage MB</option>
              <option value="name">Sort by Name</option>
            </select>
          </div>
        </div>
      </div>

      {/* Schools Storage Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">School Storage Usage</h3>
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
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Limit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Files
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trend
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
                    {school.currentUsage.toLocaleString()} MB
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {school.storageLimit.toLocaleString()} MB
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className={`h-2 rounded-full ${getUsageBarColor(school.usagePercentage)}`}
                          style={{ width: `${Math.min(school.usagePercentage, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-900">{school.usagePercentage}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {school.filesCount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {school.growthTrend === 'increasing' && <TrendingUp className="w-4 h-4 text-red-500" />}
                      {school.growthTrend === 'stable' && <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>}
                      {school.growthTrend === 'decreasing' && <TrendingUp className="w-4 h-4 text-green-500 transform rotate-180" />}
                      <span className="ml-1 text-xs text-gray-600 capitalize">{school.growthTrend}</span>
                    </div>
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
            <Database className="mx-auto h-12 w-12 text-gray-400" />
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

export default StorageUsagePage;