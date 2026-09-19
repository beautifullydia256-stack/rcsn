import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '../../components/Glass/GlassCard';
import { GlassPanel } from '../../components/Glass/GlassPanel';
import { supabase } from '../../lib/supabase';
import { registerApiUrl } from '../../lib/registerApiOrigin';
import SchoolGrowthChart from '../../components/charts/SchoolGrowthChart';
import UserGrowthChart from '../../components/charts/UserGrowthChart';
import RevenueChart from '../../components/charts/RevenueChart';
import StorageUsageChart from '../../components/charts/StorageUsageChart';
import {
  School,
  CheckCircle2,
  Users,
  Wallet,
  Database,
  Folder,
  RefreshCw,
  Activity,
  Zap,
  Plug,
  Undo2,
  AlertCircle,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface DashboardMetrics {
  totalSchools: number;
  activeSchools: number;
  totalUsers: number;
  monthlyRevenue: number;
  databaseSize: string;
  totalStorage: number;
  apiCallsToday: number;
  activeSessions: number;
  // Real Supabase Prometheus metrics
  cacheHitRate: number | null;
  activeDbConnections: number | null;
  committedTransactions: number | null;
  rolledBackTransactions: number | null;
  prometheusAvailable: boolean;
  lastUpdated: string;
}

interface MetricChange {
  value: number;
  type: 'increase' | 'decrease';
  period: string;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: MetricChange;
  loading?: boolean;
  color?: 'default' | 'success' | 'warning' | 'error';
}

function MetricCard({ title, value, icon, change, loading, color = 'default' }: MetricCardProps) {
  const colorClasses = {
    default: 'text-white',
    success: 'text-emerald-400',
    warning: 'text-amber-400',
    error: 'text-red-400',
  };

  const changeColorClasses = {
    increase: 'text-emerald-400',
    decrease: 'text-red-400',
  };

  if (loading) {
    return (
      <GlassPanel className="p-6">
        <div className="animate-pulse space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 bg-slate-700 rounded w-24"></div>
            <div className="h-6 w-6 bg-slate-700 rounded"></div>
          </div>
          <div className="h-8 bg-slate-700 rounded w-20"></div>
          <div className="h-3 bg-slate-700 rounded w-16"></div>
        </div>
      </GlassPanel>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      whileHover={{ scale: 1.02, y: -2 }}
    >
      <GlassPanel className="p-6 cursor-pointer">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-sm font-medium">{title}</span>
            <motion.span 
              className="text-2xl"
              whileHover={{ scale: 1.1, rotate: [0, -10, 10, 0] }}
              transition={{ duration: 0.3 }}
            >
              {icon}
            </motion.span>
          </div>
          <motion.div 
            className={`text-3xl font-bold ${colorClasses[color]}`}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </motion.div>
          {change && (
            <motion.div 
              className={`text-xs flex items-center gap-1 ${changeColorClasses[change.type]}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <span>{change.type === 'increase' ? '↗' : '↘'}</span>
              <span>{Math.abs(change.value)}% {change.period}</span>
            </motion.div>
          )}
        </div>
      </GlassPanel>
    </motion.div>
  );
}

export default function DashboardHome() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [realTimeEnabled, setRealTimeEnabled] = useState(false);

  const fetchMetrics = async () => {
    try {
      const response = await fetch(registerApiUrl('/api/owner/dashboard-metrics'), {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setMetrics(result.data);
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to fetch metrics');
      }
    } catch (err) {
      console.error('Dashboard metrics error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load dashboard metrics');
    }
  };

  useEffect(() => {
    const loadMetrics = async () => {
      setLoading(true);
      await fetchMetrics();
      setLoading(false);
    };

    loadMetrics();

    // Set up real-time updates
    const channel = supabase
      .channel('owner-dashboard-updates')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'schools'
      }, () => {
        if (realTimeEnabled) {
          fetchMetrics();
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'users'
      }, () => {
        if (realTimeEnabled) {
          fetchMetrics();
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'student_payments'
      }, () => {
        if (realTimeEnabled) {
          fetchMetrics();
        }
      })
      .subscribe();

    setRealTimeEnabled(true);

    // Refresh metrics every 5 minutes
    const interval = setInterval(fetchMetrics, 5 * 60 * 1000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [realTimeEnabled]);

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Platform Dashboard</h1>
          <p className="text-slate-400">Loading real-time platform metrics...</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <MetricCard key={i} title="" value="" icon="" loading={true} />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
          <h2 className="text-red-400 font-semibold mb-2">Error Loading Dashboard</h2>
          <p className="text-red-300 mb-4">{error}</p>
          <div className="flex gap-3">
            <button 
              onClick={() => {
                setError(null);
                setLoading(true);
                fetchMetrics().finally(() => setLoading(false));
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Retry
            </button>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Calculate metric changes - show 0% when we don't have historical data
  const getMetricChange = (current: number, type: 'increase' | 'decrease' = 'increase'): MetricChange => ({
    value: 0, // Show 0% change when no historical data available
    type,
    period: 'vs last month'
  });

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
            <h1 className="text-3xl font-bold text-white">Platform Dashboard</h1>
            <p className="text-slate-400">
              Real-time overview of your PwezaCore platform performance and metrics
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-slate-400">
              <div className={`w-2 h-2 rounded-full ${realTimeEnabled ? 'bg-emerald-400' : 'bg-slate-500'}`}></div>
              {realTimeEnabled ? 'Live Updates' : 'Offline'}
            </div>
            <button
              onClick={fetchMetrics}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
        {metrics?.lastUpdated && (
          <p className="text-xs text-slate-500 flex items-center gap-2">
            <span>Last updated: {new Date(metrics.lastUpdated).toLocaleString()}</span>
            {metrics.prometheusAvailable && (
              <span className="text-emerald-500/70">· Prometheus metrics active</span>
            )}
          </p>
        )}
      </motion.div>

      {/* Key Metrics Grid */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, staggerChildren: 0.1 }}
      >
        <MetricCard
          title="Total Schools"
          value={metrics?.totalSchools || 0}
          icon={<School className="w-6 h-6 text-emerald-400" />}
          change={getMetricChange(metrics?.totalSchools || 0)}
          color="success"
        />

        <MetricCard
          title="Active Schools"
          value={metrics?.activeSchools || 0}
          icon={<CheckCircle2 className="w-6 h-6 text-emerald-400" />}
          change={getMetricChange(metrics?.activeSchools || 0)}
          color="success"
        />

        <MetricCard
          title="Total Users"
          value={metrics?.totalUsers || 0}
          icon={<Users className="w-6 h-6 text-blue-400" />}
          change={getMetricChange(metrics?.totalUsers || 0)}
        />

        <MetricCard
          title="Monthly Revenue"
          value={`$${(metrics?.monthlyRevenue || 0).toLocaleString()}`}
          icon={<Wallet className="w-6 h-6 text-emerald-400" />}
          change={getMetricChange(metrics?.monthlyRevenue || 0)}
          color="success"
        />

        <MetricCard
          title="Database Size"
          value={metrics?.databaseSize || '0 GB'}
          icon={<Database className="w-6 h-6 text-indigo-400" />}
          change={getMetricChange(0, 'increase')}
        />

        <MetricCard
          title="Storage Usage"
          value={`${metrics?.totalStorage || 0} GB`}
          icon={<Folder className="w-6 h-6 text-purple-400" />}
          change={getMetricChange(metrics?.totalStorage || 0)}
        />

        <MetricCard
          title="API Calls Today"
          value={metrics?.apiCallsToday || 0}
          icon={<RefreshCw className="w-6 h-6 text-amber-400" />}
          change={getMetricChange(metrics?.apiCallsToday || 0)}
        />

        <MetricCard
          title="Active Sessions"
          value={metrics?.activeSessions || 0}
          icon={<Activity className="w-6 h-6 text-emerald-400" />}
          change={getMetricChange(metrics?.activeSessions || 0)}
          color="success"
        />
      </motion.div>

      {/* Database Health Section — powered by Supabase Prometheus metrics */}
      {metrics?.prometheusAvailable && (
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.35 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <span className="text-slate-300 font-semibold text-lg">Database Health</span>
            <span className="text-xs bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full px-2 py-0.5">
              Live · Supabase Metrics
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Cache Hit Rate"
              value={`${(metrics.cacheHitRate ?? 0).toFixed(1)}%`}
              icon={<Zap className="w-6 h-6 text-amber-400" />}
              color={(metrics.cacheHitRate ?? 0) >= 95 ? 'success' : (metrics.cacheHitRate ?? 0) >= 80 ? 'warning' : 'error'}
            />
            <MetricCard
              title="Active DB Connections"
              value={metrics.activeDbConnections ?? 0}
              icon={<Plug className="w-6 h-6 text-blue-400" />}
              color={(metrics.activeDbConnections ?? 0) > 80 ? 'warning' : 'default'}
            />
            <MetricCard
              title="Committed Transactions"
              value={(metrics.committedTransactions ?? 0).toLocaleString()}
              icon={<CheckCircle2 className="w-6 h-6 text-emerald-400" />}
              color="success"
            />
            <MetricCard
              title="Rolled Back Transactions"
              value={(metrics.rolledBackTransactions ?? 0).toLocaleString()}
              icon={<Undo2 className="w-6 h-6 text-rose-400" />}
              color={(metrics.rolledBackTransactions ?? 0) > 100 ? 'warning' : 'default'}
            />
          </div>
        </motion.div>
      )}

      {/* Charts Section */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <GlassPanel className="p-6">
          <GlassCard title="School Growth" subtitle="New schools per month (12 months)">
            <SchoolGrowthChart />
          </GlassCard>
        </GlassPanel>

        <GlassPanel className="p-6">
          <GlassCard title="User Growth" subtitle="New users by role over time">
            <UserGrowthChart />
          </GlassCard>
        </GlassPanel>

        <GlassPanel className="p-6">
          <GlassCard title="Revenue Trend" subtitle="Monthly recurring revenue trend">
            <RevenueChart />
          </GlassCard>
        </GlassPanel>

        <GlassPanel className="p-6">
          <GlassCard title="Storage Usage" subtitle="Platform storage distribution">
            <StorageUsageChart />
          </GlassCard>
        </GlassPanel>
      </motion.div>

      {/* System Alerts Section */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <GlassPanel className="p-6">
          <GlassCard title="System Alerts" subtitle="Recent notifications and warnings">
            <SystemAlertsPanel />
          </GlassCard>
        </GlassPanel>
      </motion.div>

      {/* Schools Snapshot Section */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
      >
        <GlassPanel className="p-6">
          <GlassCard title="Schools Snapshot" subtitle="Quick overview of all schools">
            <SchoolsSnapshotTable />
          </GlassCard>
        </GlassPanel>
      </motion.div>
    </motion.div>
  );
}

function SystemAlertsPanel() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await fetch(registerApiUrl('/api/owner/system-health'), {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          setAlerts(result.data?.alerts || []);
        }
      } catch (error) {
        console.error('Failed to fetch alerts:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAlerts();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse flex items-center gap-3 p-3 bg-slate-800/30 rounded-lg">
            <div className="w-6 h-6 bg-slate-700 rounded"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-700 rounded w-3/4"></div>
              <div className="h-3 bg-slate-700 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
        <div className="font-medium">All Systems Operational</div>
        <div className="text-sm">No alerts or warnings at this time</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {alerts.slice(0, 5).map((alert, index) => (
        <motion.div
          key={alert.id || index}
          className={`flex items-center gap-3 p-3 rounded-lg border ${
            alert.type === 'critical' ? 'bg-red-900/20 border-red-500/30' :
            alert.type === 'warning' ? 'bg-amber-900/20 border-amber-500/30' :
            'bg-blue-900/20 border-blue-500/30'
          }`}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: index * 0.1 }}
        >
          <span className={`text-xl ${
            alert.type === 'critical' ? 'text-red-400' :
            alert.type === 'warning' ? 'text-amber-400' :
            'text-blue-400'
          }`}>
            {alert.type === 'critical' ? (
              <AlertCircle className="w-5 h-5 text-red-400" />
            ) : alert.type === 'warning' ? (
              <AlertTriangle className="w-5 h-5 text-amber-400" />
            ) : (
              <Info className="w-5 h-5 text-blue-400" />
            )}
          </span>
          <div className="flex-1">
            <div className={`font-medium ${
              alert.type === 'critical' ? 'text-red-300' :
              alert.type === 'warning' ? 'text-amber-300' :
              'text-blue-300'
            }`}>
              {alert.message}
            </div>
            <div className={`text-sm ${
              alert.type === 'critical' ? 'text-red-400/80' :
              alert.type === 'warning' ? 'text-amber-400/80' :
              'text-blue-400/80'
            }`}>
              {new Date(alert.timestamp).toLocaleString()}
            </div>
          </div>
        </motion.div>
      ))}
      
      {alerts.length > 5 && (
        <div className="text-center pt-3">
          <button className="text-sm text-slate-400 hover:text-white transition-colors">
            View all {alerts.length} alerts →
          </button>
        </div>
      )}
    </div>
  );
}

function SchoolsSnapshotTable() {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSchools = async () => {
      try {
        const response = await fetch(registerApiUrl('/api/owner/schools?limit=10'), {
          headers: {
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
          },
        });

        if (response.ok) {
          const result = await response.json();
          setSchools(result.data?.schools || []);
        }
      } catch (error) {
        console.error('Failed to fetch schools:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSchools();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse flex items-center gap-4 p-3 bg-slate-800/30 rounded-lg">
            <div className="w-10 h-10 bg-slate-700 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-slate-700 rounded w-1/3"></div>
              <div className="h-3 bg-slate-700 rounded w-1/2"></div>
            </div>
            <div className="w-20 h-6 bg-slate-700 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (schools.length === 0) {
    return (
      <div className="text-center py-8 text-slate-400">
        <School className="w-10 h-10 text-slate-400 mx-auto mb-3" />
        <div className="font-medium">No Schools Found</div>
        <div className="text-sm">Schools will appear here once added to the platform</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {schools.map((school, index) => (
        <motion.div
          key={school.schoolId}
          className="flex items-center gap-4 p-3 bg-slate-800/30 hover:bg-slate-800/50 rounded-lg transition-colors cursor-pointer"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ scale: 1.01 }}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
            {school.name.charAt(0)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="font-medium text-white truncate">{school.name}</div>
            <div className="text-sm text-slate-400">
              {school.studentCount} students • {school.subscriptionPlan} • {school.location}
            </div>
          </div>
          
          <div className="text-right">
            <div className={`text-sm font-medium ${
              school.subscriptionStatus === 'active' ? 'text-emerald-400' :
              school.subscriptionStatus === 'trial' ? 'text-amber-400' :
              'text-red-400'
            }`}>
              {school.subscriptionStatus}
            </div>
            <div className="text-xs text-slate-500">
              {new Date(school.lastActivity).toLocaleDateString()}
            </div>
          </div>
          
          <div className="flex gap-1">
            <button className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white transition-colors">
              View
            </button>
            <button className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded text-xs text-white transition-colors">
              Manage
            </button>
          </div>
        </motion.div>
      ))}
      
      <div className="text-center pt-3">
        <button className="text-sm text-slate-400 hover:text-white transition-colors">
          View all schools →
        </button>
      </div>
    </div>
  );
}