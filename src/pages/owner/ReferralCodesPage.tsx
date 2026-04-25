import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { GlassCard } from '../../components/Glass/GlassCard';
import { GlassPanel } from '../../components/Glass/GlassPanel';

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

        setCodes(sampleCodes);

        // Calculate metrics
        const activeCodes = sampleCodes.filter(c => c.is_active);
        const totalUses = sampleCodes.reduce((sum, c) => sum + c.current_uses, 0);
        const totalSavings = sampleCodes.reduce((sum, c) => {
          if (c.discount_type === 'percentage') {
            return sum + (c.current_uses * 50 * (c.discount_value / 100)); // Assuming avg $50 subscription
          } else if (c.discount_type === 'fixed_amount') {
            return sum + (c.current_uses * c.discount_value);
          } else {
            return sum + (c.current_uses * 50); // Free month = $50 value
          }
        }, 0);

        const topCode = sampleCodes.reduce((top, current) => 
          current.current_uses > top.current_uses ? current : top
        );

        setMetrics({
          totalCodes: sampleCodes.length,
          activeCodes: activeCodes.length,
          totalUses,
          totalSavings,
          conversionRate: 68, // Sample conversion rate
          topPerformingCode: topCode.code
        });

      } else {
        // Use real data from database
        setCodes(existingCodes || []);
        
        // Calculate real metrics
        const activeCodes = (existingCodes || []).filter(c => c.is_active);
        const totalUses = (existingCodes || []).reduce((sum, c) => sum + c.current_uses, 0);
        
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
      // In a real implementation, this would insert into the database
      const newReferralCode: ReferralCode = {
        id: Date.now().toString(),
        ...newCode,
        current_uses: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        created_by: 'admin'
      };

      setCodes(prev => [newReferralCode, ...prev]);
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
    }
  };

  const toggleCodeStatus = async (codeId: string) => {
    setCodes(prev => prev.map(code => 
      code.id === codeId 
        ? { ...code, is_active: !code.is_active }
        : code
    ));
  };

  const deleteCode = async (codeId: string) => {
    setCodes(prev => prev.filter(code => code.id !== codeId));
    if (metrics) {
      setMetrics({
        ...metrics,
        totalCodes: metrics.totalCodes - 1
      });
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
                <span className="text-2xl">🎫</span>
              </div>
              <div className="text-3xl font-bold text-white">{metrics.totalCodes}</div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm font-medium">Active</span>
                <span className="text-2xl">✅</span>
              </div>
              <div className="text-3xl font-bold text-emerald-400">{metrics.activeCodes}</div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm font-medium">Total Uses</span>
                <span className="text-2xl">📊</span>
              </div>
              <div className="text-3xl font-bold text-cyan-400">{metrics.totalUses}</div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm font-medium">Total Savings</span>
                <span className="text-2xl">💰</span>
              </div>
              <div className="text-3xl font-bold text-yellow-400">${metrics.totalSavings.toLocaleString()}</div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm font-medium">Conversion</span>
                <span className="text-2xl">📈</span>
              </div>
              <div className="text-3xl font-bold text-purple-400">{metrics.conversionRate}%</div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-sm font-medium">Top Code</span>
                <span className="text-2xl">🏆</span>
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
                  <div className="text-4xl mb-3">🎫</div>
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
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            className="bg-slate-800 rounded-lg p-6 w-full max-w-md"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <h2 className="text-xl font-bold text-white mb-4">Create Referral Code</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newCode.code}
                    onChange={(e) => setNewCode(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                    placeholder="Enter code"
                  />
                  <button
                    onClick={generateRandomCode}
                    className="px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm"
                  >
                    Generate
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <input
                  type="text"
                  value={newCode.description}
                  onChange={(e) => setNewCode(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  placeholder="Code description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Discount Type</label>
                  <select
                    value={newCode.discount_type}
                    onChange={(e) => setNewCode(prev => ({ ...prev, discount_type: e.target.value as any }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed_amount">Fixed Amount</option>
                    <option value="free_months">Free Months</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Value</label>
                  <input
                    type="number"
                    value={newCode.discount_value}
                    onChange={(e) => setNewCode(prev => ({ ...prev, discount_value: Number(e.target.value) }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Max Uses</label>
                  <input
                    type="number"
                    value={newCode.max_uses || ''}
                    onChange={(e) => setNewCode(prev => ({ ...prev, max_uses: e.target.value ? Number(e.target.value) : null }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                    placeholder="Unlimited"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Expires At</label>
                  <input
                    type="date"
                    value={newCode.expires_at}
                    onChange={(e) => setNewCode(prev => ({ ...prev, expires_at: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Target Audience</label>
                <select
                  value={newCode.target_audience}
                  onChange={(e) => setNewCode(prev => ({ ...prev, target_audience: e.target.value as any }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                >
                  <option value="all">All Users</option>
                  <option value="new_schools">New Schools Only</option>
                  <option value="existing_schools">Existing Schools Only</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={createReferralCode}
                className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
              >
                Create Code
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}