import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Ticket, CheckCircle2, BarChart3, Wallet, TrendingUp, Trophy, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { GlassCard } from '../../components/Glass/GlassCard';
import { GlassPanel } from '../../components/Glass/GlassPanel';
import { NativeModal } from '@/components/NativeModal';
import { LiquidGlassSelect } from '@/components/ui/LiquidGlassSelect';

const DISCOUNT_TYPE_OPTIONS = [
  { value: 'percentage', label: 'Percentage (%)' },
  { value: 'fixed_amount', label: 'Fixed Amount (UGX)' },
  { value: 'free_months', label: 'Free Months' },
];

const AUDIENCE_OPTIONS = [
  { value: 'all', label: 'All Users' },
  { value: 'new_schools', label: 'New Schools Only' },
  { value: 'existing_schools', label: 'Existing Schools Only' },
];


interface ReferralCode {
  id: string;
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed_amount' | 'free_months';
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
  created_by: string;
  target_audience: 'all' | 'new_schools' | 'existing_schools';
  minimum_subscription_months?: number;
}

interface ReferralMetrics {
  totalCodes: number;
  activeCodes: number;
  totalUses: number;
  totalSavings: number;
  conversionRate: number;
  topPerformingCode: string;
}

export default function ReferralCodesPage() {
  const [codes, setCodes] = useState<ReferralCode[]>([]);
  const [metrics, setMetrics] = useState<ReferralMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newCode, setNewCode] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as const,
    discount_value: 0,
    max_uses: null as number | null,
    expires_at: '',
    target_audience: 'all' as const,
    minimum_subscription_months: 1
  });

  const fetchReferralCodes = async () => {
    try {
      setLoading(true);

      // Check if referral_codes table exists, if not create sample data
      const { data: existingCodes, error } = await supabase
        .from('referral_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error && error.code === '42P01') {
        // Table doesn't exist, create sample data
        const sampleCodes: ReferralCode[] = [
          {
            id: '1',
            code: 'WELCOME2024',
            description: 'Welcome discount for new schools',
            discount_type: 'percentage',
            discount_value: 20,
            max_uses: 100,
            current_uses: 23,
            expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
            is_active: true,
            created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            created_by: 'admin',
            target_audience: 'new_schools',
            minimum_subscription_months: 6
          },
          {
            id: '2',
            code: 'SUMMER50',
            description: 'Summer promotion - 50% off first month',
            discount_type: 'percentage',
            discount_value: 50,
            max_uses: 50,
            current_uses: 31,
            expires_at: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
            is_active: true,
            created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
            created_by: 'admin',
            target_audience: 'all'
          },
          {
            id: '3',
            code: 'FREEMONTH',
            description: 'One month free for annual subscriptions',
            discount_type: 'free_months',
            discount_value: 1,
            max_uses: null,
            current_uses: 8,
            expires_at: null,
            is_active: true,
            created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            created_by: 'admin',
            target_audience: 'all',
            minimum_subscription_months: 12
          },
          {
            id: '4',
            code: 'EXPIRED2023',
            description: 'Old year-end promotion',
            discount_type: 'fixed_amount',
            discount_value: 100,
            max_uses: 25,
            current_uses: 25,
            expires_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            is_active: false,
            created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
            created_by: 'admin',
            target_audience: 'existing_schools'
          }
        ];

        setCodes(existingCodes || []);

        // Calculate metrics from real data
        const realCodes: ReferralCode[] = existingCodes || [];
        const activeCodes = realCodes.filter((c: ReferralCode) => c.is_active);
        const totalUses = realCodes.reduce((sum: number, c: ReferralCode) => sum + (c.current_uses || 0), 0);
        const totalSavings = realCodes.reduce((sum: number, c: ReferralCode) => {
          const uses = c.current_uses || 0;
          if (c.discount_type === 'percentage') {
            return sum + (uses * 50 * (c.discount_value / 100)); // Assuming avg $50 subscription
          } else if (c.discount_type === 'fixed_amount') {
            return sum + (uses * c.discount_value);
          } else {
            return sum + (uses * 50); // Free month = $50 value
          }
        }, 0);

        const topCode = realCodes.length > 0 ? realCodes.reduce((top: ReferralCode, current: ReferralCode) => 
          (current.current_uses || 0) > (top.current_uses || 0) ? current : top
        ) : null;

        setMetrics({
          totalCodes: realCodes.length,
          activeCodes: activeCodes.length,
          totalUses,
          totalSavings,
          conversionRate: 68, // Sample conversion rate
          topPerformingCode: topCode?.code || ''
        });

      } else {
        // Use real data from database
        setCodes(existingCodes || []);
        
        // Calculate real metrics
        const activeCodes = (existingCodes || [] as ReferralCode[]).filter((c: ReferralCode) => c.is_active);
        const totalUses = (existingCodes || [] as ReferralCode[]).reduce((sum: number, c: ReferralCode) => sum + c.current_uses, 0);
        
        setMetrics({
          totalCodes: existingCodes?.length || 0,
          activeCodes: activeCodes.length,
          totalUses,
          totalSavings: 0, // Would need to calculate from actual usage
          conversionRate: 0,
          topPerformingCode: ''
        });
      }

    } catch (error) {
      console.error('Error fetching referral codes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferralCodes();
  }, []);

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewCode(prev => ({ ...prev, code: result }));
  };

  const createReferralCode = async () => {
    try {
      setSaving(true);
      
      // Insert into the database
      const { data, error } = await supabase
        .from('referral_codes')
        .insert([{
          code: newCode.code,
          description: newCode.description,
          discount_type: newCode.discount_type,
          discount_value: newCode.discount_value,
          max_uses: newCode.max_uses,
          expires_at: newCode.expires_at || null,
          target_audience: newCode.target_audience,
          minimum_subscription_months: newCode.minimum_subscription_months,
          current_uses: 0,
          use_count: 0, // Set both for compatibility
          is_active: true,
          created_by: 'admin',
          // Set type field for compatibility with validation system
          type: 'ADMIN', // Admin-created codes are always ADMIN type
          affiliate_id: null // Admin codes don't have affiliate_id
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating referral code:', error);
        alert('Failed to create referral code. Please try again.');
        return;
      }

      // Add to local state
      setCodes(prev => [data, ...prev]);
      setShowCreateModal(false);
      setNewCode({
        code: '',
        description: '',
        discount_type: 'percentage',
        discount_value: 0,
        max_uses: null,
        expires_at: '',
        target_audience: 'all',
        minimum_subscription_months: 1
      });

      // Update metrics
      if (metrics) {
        setMetrics({
          ...metrics,
          totalCodes: metrics.totalCodes + 1,
          activeCodes: metrics.activeCodes + 1
        });
      }

    } catch (error) {
      console.error('Error creating referral code:', error);
      alert('Failed to create referral code. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const toggleCodeStatus = async (codeId: string) => {
    try {
      // Find the current code to get its current status
      const currentCode = codes.find(code => code.id === codeId);
      if (!currentCode) return;

      // Update in database
      const { error } = await supabase
        .from('referral_codes')
        .update({ 
          is_active: !currentCode.is_active,
          updated_at: new Date().toISOString()
        })
        .eq('id', codeId);

      if (error) {
        console.error('Error updating referral code status:', error);
        alert('Failed to update code status. Please try again.');
        return;
      }

      // Update local state
      setCodes(prev => prev.map(code => 
        code.id === codeId 
          ? { ...code, is_active: !code.is_active }
          : code
      ));
    } catch (error) {
      console.error('Error toggling code status:', error);
      alert('Failed to update code status. Please try again.');
    }
  };

  const deleteCode = async (codeId: string) => {
    try {
      // Delete from database
      const { error } = await supabase
        .from('referral_codes')
        .delete()
        .eq('id', codeId);

      if (error) {
        console.error('Error deleting referral code:', error);
        alert('Failed to delete code. Please try again.');
        return;
      }

      // Update local state
      setCodes(prev => prev.filter(code => code.id !== codeId));
      if (metrics) {
        setMetrics({
          ...metrics,
          totalCodes: metrics.totalCodes - 1
        });
      }
    } catch (error) {
      console.error('Error deleting code:', error);
      alert('Failed to delete code. Please try again.');
    }
  };

  const getDiscountDisplay = (code: ReferralCode) => {
    switch (code.discount_type) {
      case 'percentage':
        return `${code.discount_value}% off`;
      case 'fixed_amount':
        return `$${code.discount_value} off`;
      case 'free_months':
        return `${code.discount_value} month${code.discount_value > 1 ? 's' : ''} free`;
      default:
        return 'Unknown';
    }
  };

  const getUsagePercentage = (code: ReferralCode) => {
    if (!code.max_uses) return 0;
    return Math.min((code.current_uses / code.max_uses) * 100, 100);
  };

  const isExpired = (code: ReferralCode) => {
    return code.expires_at && new Date(code.expires_at) < new Date();
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">Referral Codes</h1>
          <p className="text-slate-400">Loading referral codes...</p>
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
            <h1 className="text-3xl font-bold text-white">Referral Codes</h1>
            <p className="text-slate-400">
              Manage promotional codes and track their performance
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
            >
              Create Code
            </button>
            <button
              onClick={fetchReferralCodes}
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
                <span className="text-slate-400 text-sm font-medium">Total Codes</span>
                <Ticket className="w-6 h-6 text-slate-400" />
              </div>
              <div className="text-3xl font-bold text-white">{metrics.totalCodes}</div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm font-medium">Active</span>
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="text-3xl font-bold text-emerald-400">{metrics.activeCodes}</div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm font-medium">Total Uses</span>
                <BarChart3 className="w-6 h-6 text-cyan-400" />
              </div>
              <div className="text-3xl font-bold text-cyan-400">{metrics.totalUses}</div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm font-medium">Total Savings</span>
                <Wallet className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="text-3xl font-bold text-yellow-400">${metrics.totalSavings.toLocaleString()}</div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm font-medium">Conversion</span>
                <TrendingUp className="w-6 h-6 text-purple-400" />
              </div>
              <div className="text-3xl font-bold text-purple-400">{metrics.conversionRate}%</div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm font-medium">Top Code</span>
                <Trophy className="w-6 h-6 text-orange-400" />
              </div>
              <div className="text-lg font-bold text-orange-400">{metrics.topPerformingCode}</div>
            </div>
          </GlassPanel>
        </motion.div>
      )}

      {/* Codes List */}
      <motion.div 
        className="space-y-4"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <GlassPanel className="p-6">
          <GlassCard title="Referral Codes" subtitle={`${codes.length} codes created`}>
            <div className="space-y-4">
              {codes.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Ticket className="w-10 h-10 text-slate-500 mx-auto mb-3" />
                  <div className="font-medium">No referral codes found</div>
                  <div className="text-sm">Create your first referral code to get started</div>
                </div>
              ) : (
                codes.map((code, index) => (
                  <motion.div
                    key={code.id}
                    className={`p-4 rounded-lg border transition-colors ${
                      !code.is_active || isExpired(code)
                        ? 'bg-slate-800/30 border-slate-700/50 opacity-60'
                        : 'bg-slate-800/50 border-slate-600/50 hover:border-slate-500/50'
                    }`}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-mono text-lg font-bold text-cyan-400">{code.code}</h3>
                          <span className="px-2 py-1 bg-cyan-900/30 text-cyan-300 text-xs rounded">
                            {getDiscountDisplay(code)}
                          </span>
                          {isExpired(code) && (
                            <span className="px-2 py-1 bg-red-900/30 text-red-300 text-xs rounded">
                              Expired
                            </span>
                          )}
                          {!code.is_active && (
                            <span className="px-2 py-1 bg-gray-900/30 text-gray-300 text-xs rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        
                        <p className="text-slate-300 text-sm mb-3">{code.description}</p>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-slate-500">Target:</span>
                            <div className="text-white capitalize">{code.target_audience.replace('_', ' ')}</div>
                          </div>
                          <div>
                            <span className="text-slate-500">Uses:</span>
                            <div className="text-white">
                              {code.current_uses}{code.max_uses ? ` / ${code.max_uses}` : ' (unlimited)'}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500">Expires:</span>
                            <div className="text-white">
                              {code.expires_at ? new Date(code.expires_at).toLocaleDateString() : 'Never'}
                            </div>
                          </div>
                          <div>
                            <span className="text-slate-500">Created:</span>
                            <div className="text-white">{new Date(code.created_at).toLocaleDateString()}</div>
                          </div>
                        </div>

                        {code.max_uses && (
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-slate-400 mb-1">
                              <span>Usage Progress</span>
                              <span>{getUsagePercentage(code).toFixed(0)}%</span>
                            </div>
                            <div className="w-full bg-slate-700 rounded-full h-2">
                              <div 
                                className="bg-cyan-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${getUsagePercentage(code)}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col gap-2 ml-4">
                        <button
                          onClick={() => toggleCodeStatus(code.id)}
                          className={`px-3 py-1 text-xs rounded transition-colors ${
                            code.is_active
                              ? 'bg-red-600 hover:bg-red-700 text-white'
                              : 'bg-green-600 hover:bg-green-700 text-white'
                          }`}
                        >
                          {code.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        <button
                          onClick={() => deleteCode(code.id)}
                          className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs rounded transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </GlassCard>
        </GlassPanel>
      </motion.div>

      {/* Create Modal */}
      <NativeModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Promo / Referral Code"
        subtitle="Configure institution campaign discounts and referral terms"
        icon={Ticket}
        size="lg"
      >
        <div className="space-y-4">
          <div className="relative z-[45] focus-within:z-[50]">
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
              Referral Code *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newCode.code}
                onChange={(e) => setNewCode(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                className="flex-1 bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:outline-none font-mono font-bold tracking-wider transition-all"
                placeholder="e.g. RCSN2026"
              />
              <button
                type="button"
                onClick={generateRandomCode}
                className="px-4 py-2.5 bg-white/10 hover:bg-white/15 border border-white/15 text-white/90 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Generate</span>
              </button>
            </div>
          </div>

          <div className="relative z-[40] focus-within:z-[50]">
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
              Campaign Description
            </label>
            <input
              type="text"
              value={newCode.description}
              onChange={(e) => setNewCode(prev => ({ ...prev, description: e.target.value }))}
              className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:outline-none transition-all"
              placeholder="e.g. Rakai Health Sciences Intake Promo 2026"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 relative z-[35] focus-within:z-[50]">
            <div>
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Discount Type
              </label>
              <LiquidGlassSelect
                value={newCode.discount_type}
                onChange={(val) => setNewCode(prev => ({ ...prev, discount_type: val as any }))}
                options={DISCOUNT_TYPE_OPTIONS}
                placeholder="Select Discount Type"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Discount Value
              </label>
              <input
                type="number"
                value={newCode.discount_value}
                onChange={(e) => setNewCode(prev => ({ ...prev, discount_value: Number(e.target.value) }))}
                className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:outline-none font-bold transition-all"
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 relative z-[30] focus-within:z-[50]">
            <div>
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Max Redemptions
              </label>
              <input
                type="number"
                value={newCode.max_uses || ''}
                onChange={(e) => setNewCode(prev => ({ ...prev, max_uses: e.target.value ? Number(e.target.value) : null }))}
                className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:outline-none transition-all"
                placeholder="Leave blank for unlimited"
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
                Expiration Date
              </label>
              <input
                type="date"
                value={newCode.expires_at}
                onChange={(e) => setNewCode(prev => ({ ...prev, expires_at: e.target.value }))}
                className="w-full bg-black/25 border border-white/20 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/40 focus:border-emerald-400 focus:bg-black/35 focus:outline-none transition-all"
              />
            </div>
          </div>

          <div className="relative z-[25] focus-within:z-[50]">
            <label className="text-[11px] font-bold text-white/70 uppercase tracking-wider block mb-1.5">
              Target Audience
            </label>
            <LiquidGlassSelect
              value={newCode.target_audience}
              onChange={(val) => setNewCode(prev => ({ ...prev, target_audience: val as any }))}
              options={AUDIENCE_OPTIONS}
              placeholder="Select Target Audience"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              disabled={saving}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/80 bg-white/10 hover:bg-white/15 border border-white/15 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={createReferralCode}
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/40 border border-emerald-400/30 disabled:opacity-50 transition-all"
            >
              {saving ? 'Creating...' : 'Create Promo Code'}
            </button>
          </div>
        </div>
      </NativeModal>
    </motion.div>
  );
}