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
  status: 'ACTIVE' | 'DISABLED' | 'PENDING';
  payment_info?: string;
  created_at: string;
  total_referrals?: number;
  total_earned_ugx?: number;
  referral_codes?: { id: string; code: string; use_count: number; is_active: boolean }[];
}

interface ReferralCode {
  id: string;
  code: string;
  type: string;
  affiliate_id: string | null;
  is_active: boolean;
  use_count: number;
}

const emptyNew = { name: '', email: '', phone: '', payment_info: '' };

export default function AffiliatesPage() {
  const [affiliates, setAffiliates] = useState<Affiliate[]>([]);
  const [availableCodes, setAvailableCodes] = useState<ReferralCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ACTIVE' | 'DISABLED' | 'PENDING'>('all');
  const [inviting, setInviting] = useState<string | null>(null); // affiliate_id being invited
  const [inviteMsg, setInviteMsg] = useState<{ id: string; ok: boolean; text: string } | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAffiliate, setNewAffiliate] = useState(emptyNew);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const [assignTarget, setAssignTarget] = useState<Affiliate | null>(null);
  const [assignCodeId, setAssignCodeId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);

      const [{ data: affiliatesData }, { data: codesData }] = await Promise.all([
        supabase
          .from('affiliates')
          .select('affiliate_id, name, email, phone, status, payment_info, created_at')
          .order('created_at', { ascending: false }),
        supabase
          .from('referral_codes')
          .select('id, code, type, affiliate_id, is_active, use_count')
          .order('created_at', { ascending: false }),
      ]);

      const codes = (codesData || []) as ReferralCode[];
      setAvailableCodes(codes);

      const byAffiliate = new Map<string, { id: string; code: string; use_count: number; is_active: boolean }[]>();
      for (const c of codes) {
        if (c.affiliate_id) {
          const list = byAffiliate.get(c.affiliate_id) || [];
          list.push({ id: c.id, code: c.code, use_count: c.use_count, is_active: c.is_active });
          byAffiliate.set(c.affiliate_id, list);
        }
      }

      // Fetch school counts per affiliate code
      const codeIdToAffiliateId: Record<string, string> = {};
      for (const c of codes) {
        if (c.affiliate_id) codeIdToAffiliateId[c.id] = c.affiliate_id;
      }

      const { data: schoolRows } = await supabase
        .from('schools')
        .select('referral_code_id')
        .in(
          'referral_code_id',
          codes.filter((c) => c.affiliate_id).map((c) => c.id)
        );

      const schoolsByAffiliate = new Map<string, number>();
      for (const s of schoolRows || []) {
        const cid = (s as { referral_code_id?: string }).referral_code_id;
        if (cid && codeIdToAffiliateId[cid]) {
          const affId = codeIdToAffiliateId[cid];
          schoolsByAffiliate.set(affId, (schoolsByAffiliate.get(affId) || 0) + 1);
        }
      }

      // Fetch earnings
      const { data: earningsRows } = await supabase
        .from('affiliate_earnings')
        .select('affiliate_id, amount_cents, status');

      const earnedByAffiliate = new Map<string, number>();
      for (const e of earningsRows || []) {
        const r = e as { affiliate_id?: string; amount_cents?: number; status?: string };
        if (r.affiliate_id && r.status !== 'cancelled') {
          earnedByAffiliate.set(r.affiliate_id, (earnedByAffiliate.get(r.affiliate_id) || 0) + (r.amount_cents ?? 0));
        }
      }

      const processed: Affiliate[] = (affiliatesData || []).map((a: Affiliate) => ({
        ...a,
        total_referrals: schoolsByAffiliate.get(a.affiliate_id) || 0,
        total_earned_ugx: earnedByAffiliate.get(a.affiliate_id) || 0,
        referral_codes: byAffiliate.get(a.affiliate_id) || [],
      }));

      setAffiliates(processed);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredAffiliates = affiliates.filter((a) => {
    const matchSearch =
      a.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === 'all' || a.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const updateStatus = async (affiliateId: string, newStatus: string) => {
    const { error } = await supabase.from('affiliates').update({ status: newStatus }).eq('affiliate_id', affiliateId);
    if (error) { alert('Failed to update status.'); return; }
    setAffiliates((prev) => prev.map((a) => (a.affiliate_id === affiliateId ? { ...a, status: newStatus as 'ACTIVE' | 'DISABLED' } : a)));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError('');
    if (!newAffiliate.name.trim() || !newAffiliate.email.trim()) {
      setCreateError('Name and email are required.');
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('affiliates')
        .insert({
          name: newAffiliate.name.trim(),
          email: newAffiliate.email.trim().toLowerCase(),
          phone: newAffiliate.phone.trim() || null,
          payment_info: newAffiliate.payment_info.trim() || null,
          status: 'ACTIVE',
        })
        .select()
        .single();
      if (error) { setCreateError(error.message); return; }
      setAffiliates((prev) => [{ ...(data as Affiliate), total_referrals: 0, total_earned_ugx: 0, referral_codes: [] }, ...prev]);
      setShowCreateModal(false);
      setNewAffiliate(emptyNew);
    } finally {
      setCreating(false);
    }
  };

  const openAssign = (affiliate: Affiliate) => {
    setAssignTarget(affiliate);
    const current = affiliate.referral_codes?.[0];
    setAssignCodeId(current?.id || '');
    setAssignError('');
  };

  const handleAssignCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignTarget) return;
    setAssignError('');
    setAssigning(true);
    try {
      if (!assignCodeId) {
        setAssignError('Select a referral code to assign.');
        return;
      }
      // Change code type to AFFILIATE and set affiliate_id
      const { error } = await supabase
        .from('referral_codes')
        .update({ type: 'AFFILIATE', affiliate_id: assignTarget.affiliate_id })
        .eq('id', assignCodeId);
      if (error) { setAssignError(error.message); return; }
      setAssignTarget(null);
      await fetchData();
    } finally {
      setAssigning(false);
    }
  };

  const unassignCode = async (codeId: string) => {
    if (!confirm('Remove this code from the affiliate? It will become an ADMIN code with no affiliate.')) return;
    const { error } = await supabase
      .from('referral_codes')
      .update({ type: 'ADMIN', affiliate_id: null })
      .eq('id', codeId);
    if (error) { alert('Failed: ' + error.message); return; }
    await fetchData();
  };

  const handleInvite = async (affiliate: Affiliate) => {
    if (!confirm(`Send a login invitation to ${affiliate.email}? They will receive an email to set their password and access the affiliate portal.`)) return;
    setInviting(affiliate.affiliate_id);
    setInviteMsg(null);
    try {
      const res = await fetch(`/api/owner/affiliates/${affiliate.affiliate_id}/invite`, { method: 'POST' });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setInviteMsg({ id: affiliate.affiliate_id, ok: true, text: `Invitation sent to ${affiliate.email}` });
        // Upgrade status to ACTIVE if currently PENDING
        if (affiliate.status === 'PENDING') {
          await supabase.from('affiliates').update({ status: 'ACTIVE' }).eq('affiliate_id', affiliate.affiliate_id);
          setAffiliates((prev) => prev.map((a) => a.affiliate_id === affiliate.affiliate_id ? { ...a, status: 'ACTIVE' } : a));
        }
      } else {
        setInviteMsg({ id: affiliate.affiliate_id, ok: false, text: json.error || 'Failed to send invitation.' });
      }
    } catch {
      setInviteMsg({ id: affiliate.affiliate_id, ok: false, text: 'Network error. Try again.' });
    } finally {
      setInviting(null);
    }
  };

  const statusColor = (s: string) =>
    s === 'ACTIVE' ? 'bg-green-100 text-green-800'
    : s === 'PENDING' ? 'bg-amber-100 text-amber-800'
    : 'bg-red-100 text-red-800';

  const totalAffiliates = affiliates.length;
  const activeCount = affiliates.filter((a) => a.status === 'ACTIVE').length;
  const totalReferrals = affiliates.reduce((s, a) => s + (a.total_referrals || 0), 0);
  const totalEarned = affiliates.reduce((s, a) => s + (a.total_earned_ugx || 0), 0);

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <h1 className="text-3xl font-bold text-white">Affiliates</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <GlassPanel key={i} className="p-6">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-slate-700 rounded w-24" />
                <div className="h-8 bg-slate-700 rounded w-16" />
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div className="p-8 space-y-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Affiliates</h1>
          <p className="text-slate-400">Manage affiliate partners and track their performance</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setShowCreateModal(true); setNewAffiliate(emptyNew); setCreateError(''); }} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors">
            Add Affiliate
          </button>
          <button onClick={fetchData} className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded-lg transition-colors">
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Affiliates', value: totalAffiliates, color: 'text-white' },
          { label: 'Active', value: activeCount, color: 'text-emerald-400' },
          { label: 'Schools Referred', value: totalReferrals, color: 'text-cyan-400' },
          { label: 'Total Earned (UGX)', value: totalEarned.toLocaleString(), color: 'text-yellow-400' },
        ].map((m) => (
          <GlassPanel key={m.label} className="p-5">
            <div className="text-slate-400 text-sm mb-1">{m.label}</div>
            <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
          </GlassPanel>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="text"
          placeholder="Search affiliates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:border-cyan-500 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'ACTIVE' | 'DISABLED')}
          className="px-4 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white focus:border-cyan-500 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="ACTIVE">Active</option>
          <option value="DISABLED">Disabled</option>
        </select>
      </div>

      {/* Affiliates list */}
      <GlassPanel className="p-6">
        <GlassCard title="Affiliates" subtitle={`${filteredAffiliates.length} found`}>
          <div className="space-y-4">
            {filteredAffiliates.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <div className="text-4xl mb-3">👥</div>
                <div className="font-medium">No affiliates found</div>
              </div>
            ) : (
              filteredAffiliates.map((affiliate, index) => (
                <motion.div
                  key={affiliate.affiliate_id}
                  className="p-4 rounded-lg border bg-slate-800/50 border-slate-600/50 hover:border-slate-500/50 transition-colors"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.04 }}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-lg font-bold text-white">{affiliate.name}</h3>
                        <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${statusColor(affiliate.status)}`}>
                          {affiliate.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-3">
                        <div>
                          <span className="text-slate-500">Email</span>
                          <div className="text-white truncate">{affiliate.email}</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Phone</span>
                          <div className="text-white">{affiliate.phone || '—'}</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Schools Referred</span>
                          <div className="text-cyan-400 font-semibold">{affiliate.total_referrals || 0}</div>
                        </div>
                        <div>
                          <span className="text-slate-500">Earned</span>
                          <div className="text-yellow-400 font-semibold">UGX {(affiliate.total_earned_ugx || 0).toLocaleString()}</div>
                        </div>
                      </div>

                      {/* Referral codes */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {(affiliate.referral_codes || []).length === 0 ? (
                          <span className="text-xs text-slate-500 italic">No referral code assigned</span>
                        ) : (
                          (affiliate.referral_codes || []).map((rc) => (
                            <span key={rc.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-700 rounded text-xs">
                              <span className="font-mono text-cyan-300">{rc.code}</span>
                              <span className="text-slate-400">({rc.use_count} uses)</span>
                              <button
                                onClick={() => unassignCode(rc.id)}
                                className="text-red-400 hover:text-red-300 leading-none"
                                title="Unassign code"
                              >
                                ×
                              </button>
                            </span>
                          ))
                        )}
                      </div>

                      <div className="mt-1 text-xs text-slate-500">
                        Joined {new Date(affiliate.created_at).toLocaleDateString()}
                        {affiliate.payment_info && <> · Payout: {affiliate.payment_info}</>}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => handleInvite(affiliate)}
                        disabled={inviting === affiliate.affiliate_id}
                        className="px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded transition-colors font-semibold"
                        title="Send login invitation email"
                      >
                        {inviting === affiliate.affiliate_id ? 'Sending…' : 'Invite'}
                      </button>
                      <button
                        onClick={() => openAssign(affiliate)}
                        className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
                      >
                        Assign Code
                      </button>
                      <select
                        value={affiliate.status}
                        onChange={(e) => updateStatus(affiliate.affiliate_id, e.target.value)}
                        className="px-2 py-1 text-xs bg-slate-700 border border-slate-600 rounded text-white"
                      >
                        <option value="PENDING">Pending</option>
                        <option value="ACTIVE">Active</option>
                        <option value="DISABLED">Disabled</option>
                      </select>
                      {inviteMsg?.id === affiliate.affiliate_id && (
                        <p className={`text-xs ${inviteMsg.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                          {inviteMsg.text}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </GlassCard>
      </GlassPanel>

      {/* Add Affiliate Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div className="bg-slate-800 rounded-xl p-6 w-full max-w-md" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <h2 className="text-xl font-bold text-white mb-4">Add Affiliate</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Full Name *</label>
                <input
                  value={newAffiliate.name}
                  onChange={(e) => setNewAffiliate((p) => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Email *</label>
                <input
                  type="email"
                  value={newAffiliate.email}
                  onChange={(e) => setNewAffiliate((p) => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  placeholder="john@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Phone</label>
                <input
                  type="tel"
                  value={newAffiliate.phone}
                  onChange={(e) => setNewAffiliate((p) => ({ ...p, phone: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  placeholder="+256 700 000 000"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-300 mb-1">Payment Info</label>
                <input
                  value={newAffiliate.payment_info}
                  onChange={(e) => setNewAffiliate((p) => ({ ...p, payment_info: e.target.value }))}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                  placeholder="Mobile money / Bank account"
                />
              </div>
              {createError && <p className="text-sm text-red-400">{createError}</p>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={creating} className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-60 text-white rounded transition-colors">
                  {creating ? 'Creating...' : 'Create Affiliate'}
                </button>
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Assign Code Modal */}
      {assignTarget && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <motion.div className="bg-slate-800 rounded-xl p-6 w-full max-w-sm" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
            <h2 className="text-xl font-bold text-white mb-1">Assign Referral Code</h2>
            <p className="text-sm text-slate-400 mb-4">Assigning to <strong className="text-white">{assignTarget.name}</strong>. The code will be converted to type AFFILIATE.</p>
            <form onSubmit={handleAssignCode} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-1">Select Code</label>
                <select
                  value={assignCodeId}
                  onChange={(e) => setAssignCodeId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white"
                >
                  <option value="">— Select a code —</option>
                  {availableCodes
                    .filter((c) => !c.affiliate_id || c.affiliate_id === assignTarget.affiliate_id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} ({c.type}) — {c.use_count} uses
                      </option>
                    ))}
                </select>
              </div>
              {assignError && <p className="text-sm text-red-400">{assignError}</p>}
              <div className="flex gap-3">
                <button type="submit" disabled={assigning || !assignCodeId} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded transition-colors">
                  {assigning ? 'Assigning...' : 'Assign Code'}
                </button>
                <button type="button" onClick={() => setAssignTarget(null)} className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
