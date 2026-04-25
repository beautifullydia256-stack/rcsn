import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  CreditCard, 
  Calendar, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock,
  Search,
  Filter,
  Edit,
  Eye,
  RefreshCw,
  Download,
  DollarSign,
  Building
} from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface Subscription {
  subscription_id: string;
  school_id: string;
  school_name: string;
  plan_name: string;
  monthly_amount: number;
  status: 'active' | 'expired' | 'trial' | 'cancelled';
  start_date: string;
  end_date?: string;
  trial_end_date?: string;
  created_at: string;
  days_until_expiry?: number;
  is_overdue: boolean;
}

interface SubscriptionStats {
  total_subscriptions: number;
  active_subscriptions: number;
  trial_subscriptions: number;
  expired_subscriptions: number;
  total_mrr: number;
  overdue_accounts: number;
}

const SubscriptionsPage: React.FC = () => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [stats, setStats] = useState<SubscriptionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');
  const [editingSubscription, setEditingSubscription] = useState<string | null>(null);

  const plans = ['Free (0-20)', 'Basic', 'Standard', 'Premium'];

  const fetchSubscriptions = async () => {
    try {
      setLoading(true);

      // Fetch subscriptions with school information
      const { data: subscriptionsData, error: subscriptionsError } = await supabase
        .from('school_subscriptions')
        .select(`
          subscription_id,
          school_id,
          plan_name,
          monthly_amount,
          status,
          start_date,
          end_date,
          trial_end_date,
          created_at,
          schools!inner(name)
        `)
        .order('created_at', { ascending: false });

      if (subscriptionsError) throw subscriptionsError;

      const formattedSubscriptions = subscriptionsData?.map(sub => {
        const endDate = sub.end_date ? new Date(sub.end_date) : null;
        const trialEndDate = sub.trial_end_date ? new Date(sub.trial_end_date) : null;
        const now = new Date();
        
        let daysUntilExpiry = null;
        let isOverdue = false;

        if (endDate) {
          daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          isOverdue = daysUntilExpiry < 0;
        } else if (trialEndDate && sub.status === 'trial') {
          daysUntilExpiry = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          isOverdue = daysUntilExpiry < 0;
        }

        return {
          ...sub,
          school_name: sub.schools?.name || 'Unknown School',
          days_until_expiry: daysUntilExpiry,
          is_overdue: isOverdue
        };
      }) || [];

      setSubscriptions(formattedSubscriptions);

      // Calculate statistics
      const totalSubscriptions = formattedSubscriptions.length;
      const activeSubscriptions = formattedSubscriptions.filter(s => s.status === 'active').length;
      const trialSubscriptions = formattedSubscriptions.filter(s => s.status === 'trial').length;
      const expiredSubscriptions = formattedSubscriptions.filter(s => s.status === 'expired').length;
      const totalMrr = formattedSubscriptions
        .filter(s => s.status === 'active')
        .reduce((sum, s) => sum + (s.monthly_amount || 0), 0);
      const overdueAccounts = formattedSubscriptions.filter(s => s.is_overdue).length;

      setStats({
        total_subscriptions: totalSubscriptions,
        active_subscriptions: activeSubscriptions,
        trial_subscriptions: trialSubscriptions,
        expired_subscriptions: expiredSubscriptions,
        total_mrr: totalMrr,
        overdue_accounts: overdueAccounts
      });

    } catch (error) {
      console.error('Error fetching subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscriptions();
  }, []);

  const filteredSubscriptions = subscriptions.filter(subscription => {
    const matchesSearch = subscription.school_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         subscription.plan_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || subscription.status === statusFilter;
    const matchesPlan = planFilter === 'all' || subscription.plan_name === planFilter;

    return matchesSearch && matchesStatus && matchesPlan;
  });

  const handleModifySubscription = async (subscriptionId: string, newPlan: string, newAmount: number) => {
    try {
      const { error } = await supabase
        .from('school_subscriptions')
        .update({ 
          plan_name: newPlan, 
          monthly_amount: newAmount,
          updated_at: new Date().toISOString()
        })
        .eq('subscription_id', subscriptionId);

      if (error) throw error;
      
      setEditingSubscription(null);
      fetchSubscriptions();
    } catch (error) {
      console.error('Error modifying subscription:', error);
    }
  };

  const handleCancelSubscription = async (subscriptionId: string) => {
    try {
      const { error } = await supabase
        .from('school_subscriptions')
        .update({ 
          status: 'cancelled',
          end_date: new Date().toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('subscription_id', subscriptionId);

      if (error) throw error;
      
      fetchSubscriptions();
    } catch (error) {
      console.error('Error cancelling subscription:', error);
    }
  };

  const exportSubscriptions = async () => {
    try {
      const csv = [
        ['School', 'Plan', 'Status', 'Monthly Amount', 'Start Date', 'End Date', 'Days Until Expiry'].join(','),
        ...filteredSubscriptions.map(sub => [
          sub.school_name || '',
          sub.plan_name || '',
          sub.status || '',
          sub.monthly_amount || 0,
          new Date(sub.start_date).toLocaleDateString(),
          sub.end_date ? new Date(sub.end_date).toLocaleDateString() : 'N/A',
          sub.days_until_expiry || 'N/A'
        ].join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `subscriptions-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting subscriptions:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'trial': return <Clock className="w-4 h-4 text-blue-500" />;
      case 'expired': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-gray-500" />;
      default: return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trial': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getPlanAmount = (planName: string) => {
    const amounts: { [key: string]: number } = {
      'Free (0-20)': 0,
      'Basic': 50,
      'Standard': 100,
      'Premium': 200
    };
    return amounts[planName] || 0;
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
          <h1 className="text-2xl font-bold text-gray-900">Subscriptions Management</h1>
          <p className="text-gray-600">Manage school subscription plans and billing</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportSubscriptions}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={fetchSubscriptions}
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
                <p className="text-xs font-medium text-gray-600">Total</p>
                <p className="text-xl font-bold text-gray-900">{stats.total_subscriptions}</p>
              </div>
              <Building className="w-6 h-6 text-gray-600" />
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
                <p className="text-xs font-medium text-gray-600">Active</p>
                <p className="text-xl font-bold text-green-600">{stats.active_subscriptions}</p>
              </div>
              <CheckCircle className="w-6 h-6 text-green-600" />
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
                <p className="text-xs font-medium text-gray-600">Trial</p>
                <p className="text-xl font-bold text-blue-600">{stats.trial_subscriptions}</p>
              </div>
              <Clock className="w-6 h-6 text-blue-600" />
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
                <p className="text-xs font-medium text-gray-600">Expired</p>
                <p className="text-xl font-bold text-red-600">{stats.expired_subscriptions}</p>
              </div>
              <XCircle className="w-6 h-6 text-red-600" />
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
                <p className="text-xs font-medium text-gray-600">MRR</p>
                <p className="text-xl font-bold text-purple-600">${stats.total_mrr.toLocaleString()}</p>
              </div>
              <DollarSign className="w-6 h-6 text-purple-600" />
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
                <p className="text-xs font-medium text-gray-600">Overdue</p>
                <p className="text-xl font-bold text-orange-600">{stats.overdue_accounts}</p>
              </div>
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
          </motion.div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search schools or plans..."
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
            <option value="trial">Trial</option>
            <option value="expired">Expired</option>
            <option value="cancelled">Cancelled</option>
          </select>

          <select
            value={planFilter}
            onChange={(e) => setPlanFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Plans</option>
            {plans.map(plan => (
              <option key={plan} value={plan}>{plan}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Subscriptions Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
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
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Monthly Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expiry
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSubscriptions.map((subscription) => (
                <motion.tr
                  key={subscription.subscription_id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {subscription.school_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingSubscription === subscription.subscription_id ? (
                      <select
                        defaultValue={subscription.plan_name}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                        onChange={(e) => {
                          const newPlan = e.target.value;
                          const newAmount = getPlanAmount(newPlan);
                          handleModifySubscription(subscription.subscription_id, newPlan, newAmount);
                        }}
                      >
                        {plans.map(plan => (
                          <option key={plan} value={plan}>{plan}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-sm text-gray-900">{subscription.plan_name}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {getStatusIcon(subscription.status)}
                      <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(subscription.status)}`}>
                        {subscription.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${subscription.monthly_amount?.toLocaleString() || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {subscription.days_until_expiry !== null ? (
                      <div className={`text-sm ${subscription.is_overdue ? 'text-red-600 font-semibold' : 
                        subscription.days_until_expiry <= 7 ? 'text-orange-600' : 'text-gray-900'}`}>
                        {subscription.is_overdue ? 
                          `${Math.abs(subscription.days_until_expiry)} days overdue` :
                          `${subscription.days_until_expiry} days left`
                        }
                      </div>
                    ) : (
                      <span className="text-sm text-gray-500">No expiry</span>
                    )}
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
                        onClick={() => setEditingSubscription(
                          editingSubscription === subscription.subscription_id ? null : subscription.subscription_id
                        )}
                        className="text-green-600 hover:text-green-900"
                        title="Edit Subscription"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {subscription.status === 'active' && (
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to cancel this subscription?')) {
                              handleCancelSubscription(subscription.subscription_id);
                            }
                          }}
                          className="text-red-600 hover:text-red-900"
                          title="Cancel Subscription"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSubscriptions.length === 0 && (
          <div className="text-center py-12">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No subscriptions found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubscriptionsPage;