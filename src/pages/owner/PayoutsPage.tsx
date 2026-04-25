import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Banknote, 
  TrendingUp, 
  Calendar, 
  Download,
  RefreshCw,
  Eye,
  Search,
  Filter,
  DollarSign,
  Percent,
  Building,
  CreditCard
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Payout {
  payout_id: string;
  period_start: string;
  period_end: string;
  total_revenue: number;
  platform_percentage: number;
  platform_earnings: number;
  school_earnings: number;
  status: 'pending' | 'processed' | 'completed';
  processed_date?: string;
  transaction_count: number;
  schools_count: number;
}

interface PayoutStats {
  total_platform_earnings: number;
  monthly_platform_earnings: number;
  total_payouts: number;
  pending_payouts: number;
  average_platform_percentage: number;
  total_schools_paid: number;
}

interface PayoutTrend {
  month: string;
  platform_earnings: number;
  total_revenue: number;
  percentage: number;
}

const PayoutsPage: React.FC = () => {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [stats, setStats] = useState<PayoutStats | null>(null);
  const [trends, setTrends] = useState<PayoutTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');

  const fetchPayouts = async () => {
    try {
      setLoading(true);

      // Mock data for demonstration - in real implementation, fetch from database
      const mockPayouts: Payout[] = [
        {
          payout_id: '1',
          period_start: '2024-01-01',
          period_end: '2024-01-31',
          total_revenue: 25000,
          platform_percentage: 10,
          platform_earnings: 2500,
          school_earnings: 22500,
          status: 'completed',
          processed_date: '2024-02-01',
          transaction_count: 150,
          schools_count: 25
        },
        {
          payout_id: '2',
          period_start: '2024-02-01',
          period_end: '2024-02-29',
          total_revenue: 28000,
          platform_percentage: 10,
          platform_earnings: 2800,
          school_earnings: 25200,
          status: 'completed',
          processed_date: '2024-03-01',
          transaction_count: 168,
          schools_count: 28
        },
        {
          payout_id: '3',
          period_start: '2024-03-01',
          period_end: '2024-03-31',
          total_revenue: 32000,
          platform_percentage: 10,
          platform_earnings: 3200,
          school_earnings: 28800,
          status: 'processed',
          processed_date: '2024-04-01',
          transaction_count: 192,
          schools_count: 30
        },
        {
          payout_id: '4',
          period_start: '2024-04-01',
          period_end: '2024-04-30',
          total_revenue: 35000,
          platform_percentage: 10,
          platform_earnings: 3500,
          school_earnings: 31500,
          status: 'pending',
          transaction_count: 210,
          schools_count: 32
        }
      ];

      setPayouts(mockPayouts);

      // Calculate statistics
      const totalPlatformEarnings = mockPayouts.reduce((sum, p) => sum + p.platform_earnings, 0);
      const monthlyPlatformEarnings = mockPayouts
        .filter(p => {
          const date = new Date(p.period_start);
          const now = new Date();
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        })
        .reduce((sum, p) => sum + p.platform_earnings, 0);
      
      const totalPayouts = mockPayouts.length;
      const pendingPayouts = mockPayouts.filter(p => p.status === 'pending').length;
      const averagePlatformPercentage = mockPayouts.reduce((sum, p) => sum + p.platform_percentage, 0) / mockPayouts.length;
      const totalSchoolsPaid = Math.max(...mockPayouts.map(p => p.schools_count));

      setStats({
        total_platform_earnings: totalPlatformEarnings,
        monthly_platform_earnings: monthlyPlatformEarnings,
        total_payouts: totalPayouts,
        pending_payouts: pendingPayouts,
        average_platform_percentage: averagePlatformPercentage,
        total_schools_paid: totalSchoolsPaid
      });

      // Generate trend data
      const trendData = mockPayouts.map(payout => ({
        month: new Date(payout.period_start).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        platform_earnings: payout.platform_earnings,
        total_revenue: payout.total_revenue,
        percentage: payout.platform_percentage
      }));

      setTrends(trendData);

    } catch (error) {
      console.error('Error fetching payouts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayouts();
  }, []);

  const filteredPayouts = payouts.filter(payout => {
    const matchesSearch = payout.payout_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         new Date(payout.period_start).toLocaleDateString().includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || payout.status === statusFilter;
    
    let matchesPeriod = true;
    if (periodFilter !== 'all') {
      const payoutDate = new Date(payout.period_start);
      const now = new Date();
      
      switch (periodFilter) {
        case 'this_year':
          matchesPeriod = payoutDate.getFullYear() === now.getFullYear();
          break;
        case 'last_year':
          matchesPeriod = payoutDate.getFullYear() === now.getFullYear() - 1;
          break;
        case 'last_6_months':
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
          matchesPeriod = payoutDate >= sixMonthsAgo;
          break;
      }
    }

    return matchesSearch && matchesStatus && matchesPeriod;
  });

  const exportPayouts = async () => {
    try {
      const csv = [
        ['Period', 'Total Revenue', 'Platform %', 'Platform Earnings', 'School Earnings', 'Status', 'Transactions', 'Schools'].join(','),
        ...filteredPayouts.map(payout => [
          `${new Date(payout.period_start).toLocaleDateString()} - ${new Date(payout.period_end).toLocaleDateString()}`,
          payout.total_revenue,
          `${payout.platform_percentage}%`,
          payout.platform_earnings,
          payout.school_earnings,
          payout.status,
          payout.transaction_count,
          payout.schools_count
        ].join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payouts-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting payouts:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processed': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
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
          <h1 className="text-2xl font-bold text-gray-900">Platform Payouts</h1>
          <p className="text-gray-600">Platform percentage earnings and payout history</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportPayouts}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={fetchPayouts}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-4 rounded-lg shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Total Earnings</p>
                <p className="text-xl font-bold text-green-600">${stats.total_platform_earnings.toLocaleString()}</p>
              </div>
              <Banknote className="w-6 h-6 text-green-600" />
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
                <p className="text-xs font-medium text-gray-600">This Month</p>
                <p className="text-xl font-bold text-blue-600">${stats.monthly_platform_earnings.toLocaleString()}</p>
              </div>
              <Calendar className="w-6 h-6 text-blue-600" />
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
                <p className="text-xs font-medium text-gray-600">Total Payouts</p>
                <p className="text-xl font-bold text-purple-600">{stats.total_payouts}</p>
              </div>
              <CreditCard className="w-6 h-6 text-purple-600" />
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
                <p className="text-xs font-medium text-gray-600">Pending</p>
                <p className="text-xl font-bold text-yellow-600">{stats.pending_payouts}</p>
              </div>
              <Filter className="w-6 h-6 text-yellow-600" />
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
                <p className="text-xs font-medium text-gray-600">Avg %</p>
                <p className="text-xl font-bold text-indigo-600">{stats.average_platform_percentage.toFixed(1)}%</p>
              </div>
              <Percent className="w-6 h-6 text-indigo-600" />
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
                <p className="text-xs font-medium text-gray-600">Schools</p>
                <p className="text-xl font-bold text-teal-600">{stats.total_schools_paid}</p>
              </div>
              <Building className="w-6 h-6 text-teal-600" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Platform Earnings Trend */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Earnings Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Platform Earnings']} />
              <Line 
                type="monotone" 
                dataKey="platform_earnings" 
                stroke="#10B981" 
                strokeWidth={3}
                dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue vs Platform Earnings */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue vs Platform Earnings</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, '']} />
              <Bar dataKey="total_revenue" fill="#3B82F6" name="Total Revenue" />
              <Bar dataKey="platform_earnings" fill="#10B981" name="Platform Earnings" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search payouts..."
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
            <option value="pending">Pending</option>
            <option value="processed">Processed</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={periodFilter}
            onChange={(e) => setPeriodFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Periods</option>
            <option value="this_year">This Year</option>
            <option value="last_year">Last Year</option>
            <option value="last_6_months">Last 6 Months</option>
          </select>
        </div>
      </div>

      {/* Payouts Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Platform %
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Platform Earnings
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Schools
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredPayouts.map((payout) => (
                <motion.tr
                  key={payout.payout_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {new Date(payout.period_start).toLocaleDateString()} - {new Date(payout.period_end).toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {payout.transaction_count} transactions
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${payout.total_revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payout.platform_percentage}%
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-green-600">
                    ${payout.platform_earnings.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payout.status)}`}>
                      {payout.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {payout.schools_count} schools
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        className="text-blue-600 hover:text-blue-900"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        className="text-green-600 hover:text-green-900"
                        title="Download Report"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredPayouts.length === 0 && (
          <div className="text-center py-12">
            <Banknote className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No payouts found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayoutsPage;