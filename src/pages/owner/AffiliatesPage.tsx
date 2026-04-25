import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { GlassCard } from '../../components/Glass/GlassCard';
import { GlassPanel } from '../../components/Glass/GlassPanel';

interface Affiliate {
  affiliate_id: string;
  name: string;
  email: string;
  phone?: string;
  username?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'PENDING';
  payment_info?: string;
  created_at: string;
  // Calculated fields
  total_referrals?: number;
  active_referrals?: number;
  total_earnings?: number;
}

interface AffiliateMetrics {
  totalAffiliates: number;
  activeAffiliates: number;
  totalReferrals: number;
  totalEarnings: number;
  averageEarningsPerAffiliate: number;
  topAffiliate: string;
}

export default function AffiliatesPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [metrics, setMetrics] = useState<AffiliateMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'INACTIVE' | 'PENDING'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchAffiliates = async () => {
    try {
      setLoading(true);

      // Fetch affiliates with their referral statistics
      const { data: affiliatesData, error: affiliatesError } = await supabase
        .from('affiliates')
        .select(`
          *,
          referral_codes (
            id,
            is_active,
            current_uses
          )
        `)
        .order('created_at', { ascending: false });

      if (affiliatesError) {
        console.error('Error fetching affiliates:', affiliatesError);
        setAffiliates([]);
        setMetrics({
          totalAffiliates: 0,
          activeAffiliates: 0,
          totalReferrals: 0,
          totalEarnings: 0,
          averageEarningsPerAffiliate: 0,
          topAffiliate: ''
        });
        return;
      }

      // Process affiliates data and calculate metrics
      const processedAffiliates = (affiliatesData || []).map((affiliate: any) => {
        const referralCodes = affiliate.referral_codes || [];
        const totalReferrals = referralCodes.reduce((sum: number, code: any) => sum + (code.current_uses || 0), 0);
        const activeReferrals = referralCodes.filter((code: any) => code.is_active).length;
        
        return {
          ...affiliate,
          total_referrals: totalReferrals,
          active_referrals: activeReferrals,
          total_earnings: totalReferrals * 50 // Assuming $50 commission per referral
        };
      });

      setAffiliates(processedAffiliates);

      // Calculate metrics
      const activeAffiliates = processedAffiliates.filter(a => a.status === 'ACTIVE');
      const totalReferrals = processedAffiliates.reduce((sum, a) => sum + (a.total_referrals || 0), 0);
      const totalEarnings = processedAffiliates.reduce((sum, a) => sum + (a.total_earnings || 0), 0);
      const topAffiliate = processedAffiliates.length > 0 
        ? processedAffiliates.reduce((top, current) => 
            (current.total_referrals || 0) > (top.total_referrals || 0) ? current : top
          )
        : null;

      setMetrics({
        totalAffiliates: processedAffiliates.length,
        activeAffiliates: activeAffiliates.length,
        totalReferrals,
        totalEarnings,
        averageEarningsPerAffiliate: processedAffiliates.length > 0 ? totalEarnings / processedAffiliates.length : 0,
        topAffiliate: topAffiliate?.name || ''
      });

    } catch (error) {
      console.error('Error fetching affiliates:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAffiliates();
  }, []);

  const filteredAffiliates = affiliates.filter(affiliate => {
    const matchesSearch = affiliate.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         affiliate.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         affiliate.username?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || affiliate.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'bg-green-100 text-green-800';
      case 'INACTIVE': return 'bg-red-100 text-red-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const updateAffiliateStatus = async (affiliateId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('affiliates')
        .update({ status: newStatus })
        .eq('affiliate_id', affiliateId);

      if (error) {
        console.error('Error updating affiliate status:', error);
        alert('Failed to update affiliate status. Please try again.');
        return;
      }

      // Update local state
      setAffiliates(prev => prev.map(affiliate => 
        affiliate.affiliate_id === affiliateId 
          ? { ...affiliate, status: newStatus as any }
          : affiliate
      ));
    } catch (error) {
      console.error('Error updating affiliate status:', error);
      alert('Failed to update affiliate status. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Affiliates</h1>
          <p className="text-slate-400">Loading affiliates...</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <GlassPanel key={i} className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-slate-700 rounded w-24"></div>
                <div className="h-8 bg-slate-700 rounded w-16"></div>
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>
    );
  }

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
            <h1 className="text-3xl font-bold text-white">Affiliates</h1>
            <p className="text-slate-400">
              Manage affiliate partners and track their performance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
            >
              Add Affiliate
            </button>
            <button
              onClick={fetchAffiliates}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors"
            >
              Refresh
            </button>
          </div>
        </div>
      </motion.div>

      {/* Metrics */}
      {metrics && (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <GlassPanel className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm font-medium">Total Affiliates</span>
                <span className="text-2xl">👥</span>
              </div>
              <div className="text-3xl font-bold text-white">{metrics.totalAffiliates}</div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm font-medium">Active</span>
                <span className="text-2xl">✅</span>
              </div>
              <div className="text-3xl font-bold text-emerald-400">{metrics.activeAffiliates}</div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm font-medium">Total Referrals</span>
                <span className="text-2xl">📊</span>
              </div>
              <div className="text-3xl font-bold text-cyan-400">{metrics.totalReferrals}</div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm font-medium">Total Earnings</span>
                <span className="text-2xl">💰</span>
              </div>
              <div className="text-3xl font-bold text-yellow-400">${metrics.totalEarnings.toLocaleString()}</div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm font-medium">Avg Earnings</span>
                <span className="text-2xl">📈</span>
              </div>
              <div className="text-3xl font-bold text-purple-400">${Math.round(metrics.averageEarningsPerAffiliate).toLocaleString()}</div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm font-medium">Top Affiliate</span>
                <span className="text-2xl">🏆</span>
              </div>
              <div className="text-lg font-bold text-orange-400">{metrics.topAffiliate || 'None'}</div>
            </div>
          </GlassPanel>
        </motion.div>
      )}

      {/* Filters */}
      <motion.div 
        className="flex flex-col sm:flex-row gap-4"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search affiliates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="PENDING">Pending</option>
        </select>
      </motion.div>

      {/* Affiliates List */}
      <motion.div 
        className="space-y-4"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <GlassPanel className="p-6">
          <GlassCard title="Affiliates" subtitle={`${filteredAffiliates.length} affiliates found`}>
            <div className="space-y-4">
              {filteredAffiliates.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <div className="text-4xl mb-3">👥</div>
                  <div className="font-medium">No affiliates found</div>
                  <div className="text-sm">Add your first affiliate to get started</div>
                </div>
              ) : (
                filteredAffiliates.map((affiliate, index) => (
                  <motion.div
                    key={affiliate.affiliate_id}
                    className="p-4 rounded-lg border bg-slate-800/50 border-slate-600/50 hover:border-slate-500/50 transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-bold text-white">{affiliate.name || 'Unnamed Affiliate'}</h3>
                          <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(affiliate.status)}`}>
                            {affiliate.status}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">Email:</span>
                            <div className="text-white">{affiliate.email}</div>
                          </div>
                          <div>
                            <span className="text-slate-500">Username:</span>
                            <div className="text-white">{affiliate.username || 'Not set'}</div>
                          </div>
                          <div>
                            <span className="text-slate-500">Referrals:</span>
                            <div className="text-white">{affiliate.total_referrals || 0}</div>
                          </div>
                          <div>
                            <span className="text-slate-500">Earnings:</span>
                            <div className="text-white">${(affiliate.total_earnings || 0).toLocaleString()}</div>
                          </div>
                        </div>

                        <div className="mt-2 text-xs text-slate-400">
                          Joined: {new Date(affiliate.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        <select
                          value={affiliate.status}
                          onChange={(e) => updateAffiliateStatus(affiliate.affiliate_id, e.target.value)}
                          className="px-3 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-white"
                        >
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                          <option value="PENDING">Pending</option>
                        </select>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </GlassCard>
        </GlassPanel>
      </motion.div>
    </motion.div>
  );
}