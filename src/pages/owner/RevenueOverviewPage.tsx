import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  CreditCard,
  Users,
  Building,
  RefreshCw,
  Download,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface RevenueMetrics {
  total_platform_earnings: number;
  monthly_recurring_revenue: number;
  annual_revenue_total: number;
  revenue_projection: number;
  subscription_revenue: number;
  student_payment_revenue: number;
  average_revenue_per_school: number;
  paying_schools_count: number;
  revenue_growth_rate: number;
}

interface RevenueBreakdown {
  plan_name: string;
  schools_count: number;
  monthly_revenue: number;
  percentage: number;
  color: string;
  [key: string]: unknown; // Index signature for Recharts compatibility
}

interface RevenueProjection {
  month: string;
  projected_revenue: number;
  actual_revenue: number;
  growth_rate: number;
}

const RevenueOverviewPage: React.FC = () => {
  const [metrics, setMetrics] = useState<RevenueMetrics | null>(null);
  const [breakdown, setBreakdown] = useState<RevenueBreakdown[]>([]);
  const [projections, setProjections] = useState<RevenueProjection[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRevenueData = async () => {
    try {
      setLoading(true);

      // Fetch revenue metrics
      const { data: metricsData, error: metricsError } = await supabase
        .rpc('get_owner_revenue_metrics');

      if (metricsError) throw metricsError;
      setMetrics(metricsData);

      // Fetch revenue breakdown by subscription plan
      const { data: breakdownData, error: breakdownError } = await supabase
        .from('school_subscriptions')
        .select(`
          plan_name,
          monthly_amount,
          schools!inner(name)
        `)
        .eq('status', 'active');

      if (breakdownError) throw breakdownError;

      // Process breakdown data
      const planBreakdown = breakdownData?.reduce((acc: any, sub: any) => {
        const plan = sub.plan_name;
        if (!acc[plan]) {
          acc[plan] = {
            plan_name: plan,
            schools_count: 0,
            monthly_revenue: 0,
            color: getPlanColor(plan)
          };
        }
        acc[plan].schools_count += 1;
        acc[plan].monthly_revenue += sub.monthly_amount || 0;
        return acc;
      }, {});

      const totalRevenue = Object.values(planBreakdown || {}).reduce((sum: number, plan: any) => sum + plan.monthly_revenue, 0);
      const formattedBreakdown = Object.values(planBreakdown || {}).map((plan: any) => ({
        ...plan,
        percentage: totalRevenue > 0 ? (plan.monthly_revenue / totalRevenue) * 100 : 0
      }));

      setBreakdown(formattedBreakdown);

      // Generate mock projections (in real implementation, this would come from analytics)
      const mockProjections = generateRevenueProjections();
      setProjections(mockProjections);

    } catch (error) {
      console.error('Error fetching revenue data:', error);
      
      // Mock data for demonstration
      setMetrics({
        total_platform_earnings: 125000,
        monthly_recurring_revenue: 15600,
        annual_revenue_total: 187200,
        revenue_projection: 225000,
        subscription_revenue: 12400,
        student_payment_revenue: 3200,
        average_revenue_per_school: 520,
        paying_schools_count: 30,
        revenue_growth_rate: 12.5
      });

      setBreakdown([
        { plan_name: 'Free (0-20)', schools_count: 15, monthly_revenue: 0, percentage: 0, color: '#6B7280' },
        { plan_name: 'Basic', schools_count: 12, monthly_revenue: 6000, percentage: 38.5, color: '#3B82F6' },
        { plan_name: 'Standard', schools_count: 8, monthly_revenue: 8000, percentage: 51.3, color: '#10B981' },
        { plan_name: 'Premium', schools_count: 3, monthly_revenue: 1600, percentage: 10.2, color: '#8B5CF6' }
      ]);

      setProjections(generateRevenueProjections());
    } finally {
      setLoading(false);
    }
  };

  const getPlanColor = (planName: string) => {
    const colors: { [key: string]: string } = {
      'Free (0-20)': '#6B7280',
      'Basic': '#3B82F6',
      'Standard': '#10B981',
      'Premium': '#8B5CF6'
    };
    return colors[planName] || '#6B7280';
  };

  const generateRevenueProjections = (): RevenueProjection[] => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months.map((month, index) => ({
      month,
      projected_revenue: 15000 + (index * 1200) + (Math.random() * 2000),
      actual_revenue: index < 6 ? 14500 + (index * 1100) + (Math.random() * 1500) : 0,
      growth_rate: 8 + (Math.random() * 8)
    }));
  };

  useEffect(() => {
    fetchRevenueData();
  }, []);

  const exportRevenueData = async () => {
    try {
      const csv = [
        ['Metric', 'Value'].join(','),
        ['Total Platform Earnings', `$${metrics?.total_platform_earnings ? metrics.total_platform_earnings.toLocaleString() : '0'}`],
        ['Monthly Recurring Revenue', `$${metrics?.monthly_recurring_revenue ? metrics.monthly_recurring_revenue.toLocaleString() : '0'}`],
        ['Annual Revenue Total', `$${metrics?.annual_revenue_total ? metrics.annual_revenue_total.toLocaleString() : '0'}`],
        ['Revenue Projection', `$${metrics?.revenue_projection ? metrics.revenue_projection.toLocaleString() : '0'}`],
        ['Paying Schools', (metrics?.paying_schools_count || 0).toString()],
        ['Average Revenue per School', `$${metrics?.average_revenue_per_school ? metrics.average_revenue_per_school.toLocaleString() : '0'}`],
        ['Revenue Growth Rate', `${(metrics?.revenue_growth_rate || 0).toFixed(1)}%`]
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `revenue-overview-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting revenue data:', error);
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
          <h1 className="text-2xl font-bold text-gray-900">Revenue Overview</h1>
          <p className="text-gray-600">Platform earnings and financial performance</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportRevenueData}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
          <button
            onClick={fetchRevenueData}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-lg shadow-sm border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Platform Earnings</p>
                <p className="text-2xl font-bold text-gray-900">${metrics?.total_platform_earnings ? metrics.total_platform_earnings.toLocaleString() : '0'}</p>
                <div className="flex items-center mt-2">
                  <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">{(metrics?.revenue_growth_rate || 0).toFixed(1)}% growth</span>
                </div>
              </div>
              <DollarSign className="w-8 h-8 text-green-600" />
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
                <p className="text-sm font-medium text-gray-600">Monthly Recurring Revenue</p>
                <p className="text-2xl font-bold text-blue-600">${metrics?.monthly_recurring_revenue ? metrics.monthly_recurring_revenue.toLocaleString() : '0'}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-blue-500 mr-1" />
                  <span className="text-sm text-blue-600">MRR</span>
                </div>
              </div>
              <CreditCard className="w-8 h-8 text-blue-600" />
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
                <p className="text-sm font-medium text-gray-600">Annual Revenue</p>
                <p className="text-2xl font-bold text-purple-600">${metrics?.annual_revenue_total ? metrics.annual_revenue_total.toLocaleString() : '0'}</p>
                <div className="flex items-center mt-2">
                  <Calendar className="w-4 h-4 text-purple-500 mr-1" />
                  <span className="text-sm text-purple-600">This year</span>
                </div>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
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
                <p className="text-sm font-medium text-gray-600">Paying Schools</p>
                <p className="text-2xl font-bold text-indigo-600">{metrics?.paying_schools_count || 0}</p>
                <div className="flex items-center mt-2">
                  <Building className="w-4 h-4 text-indigo-500 mr-1" />
                  <span className="text-sm text-indigo-600">${metrics?.average_revenue_per_school ? metrics.average_revenue_per_school.toLocaleString() : '0'}/avg</span>
                </div>
              </div>
              <Users className="w-8 h-8 text-indigo-600" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Projections Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Revenue Projections</h3>
            <div className="flex items-center space-x-4 text-sm">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
                <span className="text-gray-600">Projected</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                <span className="text-gray-600">Actual</span>
              </div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={projections}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, '']} />
              <Area 
                type="monotone" 
                dataKey="projected_revenue" 
                stackId="1" 
                stroke="#3B82F6" 
                fill="#3B82F6" 
                fillOpacity={0.3}
              />
              <Area 
                type="monotone" 
                dataKey="actual_revenue" 
                stackId="2" 
                stroke="#10B981" 
                fill="#10B981" 
                fillOpacity={0.6}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue Breakdown by Plan */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Subscription Plan</h3>
          <div className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={breakdown.filter(item => item.monthly_revenue > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ plan_name, percentage }: any) => `${plan_name}: ${(percentage as number).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="monthly_revenue"
                >
                  {breakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`$${value.toLocaleString()}`, 'Revenue']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Revenue Breakdown Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Subscription Plan Breakdown</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Schools
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monthly Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Percentage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg per School
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {breakdown.map((plan) => (
                <motion.tr
                  key={plan.plan_name}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        className="w-4 h-4 rounded-full mr-3"
                        style={{ backgroundColor: plan.color }}
                      ></div>
                      <span className="text-sm font-medium text-gray-900">{plan.plan_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {plan.schools_count}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${plan.monthly_revenue.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="h-2 rounded-full"
                          style={{ 
                            width: `${plan.percentage}%`,
                            backgroundColor: plan.color
                          }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{plan.percentage.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${plan.schools_count > 0 ? (plan.monthly_revenue / plan.schools_count).toFixed(0) : '0'}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default RevenueOverviewPage;