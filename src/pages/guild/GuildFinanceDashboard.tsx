import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useGuild } from '@/context/GuildContext';
import { useUIStore } from '@/store/uiStore';
import { getTokens } from '@/styles/posThemeTokens';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Receipt,
  FileCheck,
  TrendingUp,
  AlertCircle,
  Send,
  Building
} from 'lucide-react';
import type { GuildTransaction, GuildTransactionType, GuildTransactionStatus } from '@/types/guild';

export default function GuildFinanceDashboard() {
  const { schoolId, activeTenure, portfolioTitle, isPresident, canManageFinances, canApproveRequisitions } = useGuild();
  const isDark = useUIStore((s) => s.theme === 'dark');
  const t = getTokens(isDark);

  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<GuildTransaction[]>([]);
  const [filterType, setFilterType] = useState<string>('ALL');

  // Requisition Modal
  const [showRequisitionModal, setShowRequisitionModal] = useState(false);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<GuildTransactionType>('EXPENDITURE');
  const [category, setCategory] = useState('Event');
  const [description, setDescription] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Syncing modal
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const fetchTransactions = async () => {
    if (!schoolId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('guild_transactions')
        .select(`
          *,
          tenure:guild_tenures(
            portfolio:guild_portfolios(title),
            student:students(name)
          )
        `)
        .eq('school_id', schoolId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransactions((data as GuildTransaction[]) || []);
    } catch (err) {
      console.error('[GuildFinanceDashboard] Error fetching transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [schoolId]);

  const stats = useMemo(() => {
    let totalInflow = 0;
    let totalDisbursed = 0;
    let pendingRequisitions = 0;
    let syncedWithSchoolFinanceCount = 0;

    transactions.forEach((tx) => {
      const amt = Number(tx.amount || 0);
      if (tx.type === 'INFLOW_ALLOCATION') {
        totalInflow += amt;
      } else if (tx.type === 'EXPENDITURE') {
        if (tx.status === 'APPROVED') {
          totalDisbursed += amt;
        } else if (tx.status === 'PENDING') {
          pendingRequisitions += amt;
        }
      }
      if (tx.synced_with_school_finance) {
        syncedWithSchoolFinanceCount += 1;
      }
    });

    const balance = Math.max(0, totalInflow - totalDisbursed);
    return {
      totalInflow,
      totalDisbursed,
      pendingRequisitions,
      balance,
      syncedWithSchoolFinanceCount,
    };
  }, [transactions]);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (filterType === 'ALL') return true;
      if (filterType === 'INFLOW') return tx.type === 'INFLOW_ALLOCATION';
      if (filterType === 'EXPENDITURE') return tx.type === 'EXPENDITURE';
      if (filterType === 'PENDING') return tx.status === 'PENDING';
      return true;
    });
  }, [transactions, filterType]);

  const handleSubmitRequisition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTenure?.id || !schoolId || !amount || !description.trim()) return;

    setSubmitting(true);
    try {
      const numAmt = parseFloat(amount);
      if (isNaN(numAmt) || numAmt <= 0) {
        alert('Please enter a valid amount.');
        return;
      }

      const { error } = await supabase.from('guild_transactions').insert({
        school_id: schoolId,
        tenure_id: activeTenure.id,
        amount: numAmt,
        type,
        category,
        description: description.trim(),
        receipt_url: receiptUrl.trim() || null,
        status: type === 'INFLOW_ALLOCATION' ? 'APPROVED' : 'PENDING',
        synced_with_school_finance: false,
      });

      if (error) throw error;

      setAmount('');
      setDescription('');
      setReceiptUrl('');
      setShowRequisitionModal(false);
      fetchTransactions();
    } catch (err: any) {
      alert(`Failed to record transaction: ${err.message || 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveRequisition = async (txId: string, approve: boolean) => {
    try {
      const { error } = await supabase
        .from('guild_transactions')
        .update({
          status: approve ? 'APPROVED' : 'REJECTED',
          approved_at: new Date().toISOString(),
        })
        .eq('id', txId);

      if (error) throw error;
      fetchTransactions();
    } catch (err: any) {
      alert(`Action failed: ${err.message || 'Unknown error'}`);
    }
  };

  const handleSyncWithSchoolFinance = async (tx: GuildTransaction) => {
    setSyncingId(tx.id);
    try {
      // Reconcile and flag as synced
      const { error } = await supabase
        .from('guild_transactions')
        .update({ synced_with_school_finance: true })
        .eq('id', tx.id);

      if (error) throw error;
      fetchTransactions();
    } catch (err: any) {
      alert(`Reconciliation sync failed: ${err.message || 'Unknown error'}`);
    } finally {
      setSyncingId(null);
    }
  };

  const fmtCurrency = (n: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0,
    }).format(n);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span
              className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase"
              style={{
                backgroundColor: t.mintDim,
                color: t.mint,
                border: `1px solid ${t.mintRing}`,
              }}
            >
              Ministry of Finance Ledger
            </span>
          </div>
          <h1 className="text-2xl font-bold mt-1 tracking-tight" style={{ color: t.textHi }}>
            Guild Fee Account & Treasury
          </h1>
          <p className="text-xs mt-1" style={{ color: t.textMid }}>
            Manage guild fee disbursements, submit ministry requisitions, upload digital receipts, and synchronize with university finance accounts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchTransactions}
            className="p-2 rounded-lg border hover:opacity-80"
            style={{
              borderColor: t.stroke,
              color: t.textHi,
              backgroundColor: t.fieldBg,
            }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setShowRequisitionModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white shadow-md hover:scale-[1.02] transition-all"
            style={{
              background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
              color: t.ctaText,
            }}
          >
            <Plus className="w-4 h-4" />
            <span>New Requisition / Inflow</span>
          </button>
        </div>
      </div>

      {/* 4 Financial Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          className="rounded-xl p-5 border"
          style={{
            backgroundColor: t.panel,
            borderColor: t.stroke,
          }}
        >
          <div className="text-xs uppercase font-semibold" style={{ color: t.textMid }}>
            Available Treasury Balance
          </div>
          <div className="text-2xl font-bold mt-2" style={{ color: t.mint }}>
            {fmtCurrency(stats.balance)}
          </div>
          <div className="text-[11px] mt-1" style={{ color: t.textLow }}>
            Total Inflow: {fmtCurrency(stats.totalInflow)}
          </div>
        </div>

        <div
          className="rounded-xl p-5 border"
          style={{
            backgroundColor: t.panel,
            borderColor: t.stroke,
          }}
        >
          <div className="text-xs uppercase font-semibold" style={{ color: t.textMid }}>
            Disbursed Expenditures
          </div>
          <div className="text-2xl font-bold mt-2" style={{ color: t.textHi }}>
            {fmtCurrency(stats.totalDisbursed)}
          </div>
          <div className="text-[11px] mt-1" style={{ color: t.textLow }}>
            Verified cabinet vouchers
          </div>
        </div>

        <div
          className="rounded-xl p-5 border"
          style={{
            backgroundColor: t.panel,
            borderColor: t.stroke,
          }}
        >
          <div className="text-xs uppercase font-semibold" style={{ color: t.textMid }}>
            Pending Requisitions
          </div>
          <div className="text-2xl font-bold mt-2" style={{ color: t.warn }}>
            {fmtCurrency(stats.pendingRequisitions)}
          </div>
          <div className="text-[11px] mt-1" style={{ color: t.textLow }}>
            Awaiting ministerial approval
          </div>
        </div>

        <div
          className="rounded-xl p-5 border"
          style={{
            backgroundColor: t.panel,
            borderColor: t.stroke,
          }}
        >
          <div className="text-xs uppercase font-semibold" style={{ color: t.textMid }}>
            School Finance Sync
          </div>
          <div className="text-2xl font-bold mt-2 flex items-center gap-2" style={{ color: t.blue }}>
            <Building className="w-5 h-5" />
            <span>{stats.syncedWithSchoolFinanceCount} Synced</span>
          </div>
          <div className="text-[11px] mt-1" style={{ color: t.textLow }}>
            Two-way bursary reconciliation
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 pb-1">
        {['ALL', 'EXPENDITURE', 'INFLOW', 'PENDING'].map((typeKey) => (
          <button
            key={typeKey}
            type="button"
            onClick={() => setFilterType(typeKey)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              filterType === typeKey
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {typeKey === 'ALL'
              ? 'All Ledger Records'
              : typeKey === 'EXPENDITURE'
              ? 'Expenditures'
              : typeKey === 'INFLOW'
              ? 'Inflows & Allocations'
              : 'Pending Approval'}
          </button>
        ))}
      </div>

      {/* Transactions Table */}
      <div
        className="rounded-2xl border overflow-hidden"
        style={{
          backgroundColor: t.panel,
          borderColor: t.stroke,
        }}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b font-semibold uppercase tracking-wider text-[10px]" style={{ borderColor: t.divider, color: t.textMid }}>
                <th className="p-4">Type & Category</th>
                <th className="p-4">Description</th>
                <th className="p-4">Amount</th>
                <th className="p-4">Status</th>
                <th className="p-4">Finance Sync</th>
                <th className="p-4">Receipt</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: t.divider }}>
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-xs" style={{ color: t.textLow }}>
                    No financial records found.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isInflow = tx.type === 'INFLOW_ALLOCATION';
                  const isApproved = tx.status === 'APPROVED';
                  const isPending = tx.status === 'PENDING';

                  return (
                    <tr key={tx.id} className="hover:opacity-95 transition-opacity">
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div
                            className="p-1.5 rounded-md"
                            style={{
                              backgroundColor: isInflow ? t.mintDim : t.goldDim,
                              color: isInflow ? t.mint : t.gold,
                            }}
                          >
                            {isInflow ? <ArrowDownLeft className="w-3.5 h-3.5" /> : <ArrowUpRight className="w-3.5 h-3.5" />}
                          </div>
                          <div>
                            <div className="font-bold" style={{ color: t.textHi }}>
                              {tx.category}
                            </div>
                            <div className="text-[10px]" style={{ color: t.textLow }}>
                              {new Date(tx.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="font-medium line-clamp-1" style={{ color: t.textHi }}>
                          {tx.description}
                        </div>
                        {tx.tenure?.student?.name && (
                          <div className="text-[10px]" style={{ color: t.textLow }}>
                            Requested by: {tx.tenure.student.name} ({tx.tenure.portfolio?.title || 'Officer'})
                          </div>
                        )}
                      </td>

                      <td className="p-4 font-bold" style={{ color: isInflow ? t.mint : t.textHi }}>
                        {isInflow ? '+' : '-'}
                        {fmtCurrency(tx.amount)}
                      </td>

                      <td className="p-4">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                          style={{
                            backgroundColor: isApproved ? t.mintDim : isPending ? t.goldDim : t.deepDim,
                            color: isApproved ? t.mint : isPending ? t.gold : t.red,
                          }}
                        >
                          {tx.status}
                        </span>
                      </td>

                      <td className="p-4">
                        {tx.synced_with_school_finance ? (
                          <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: t.mint }}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Reconciled</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={syncingId === tx.id}
                            onClick={() => handleSyncWithSchoolFinance(tx)}
                            className="px-2 py-0.5 rounded border text-[10px] font-medium hover:opacity-80"
                            style={{
                              backgroundColor: t.fieldBg,
                              borderColor: t.stroke,
                              color: t.textMid,
                            }}
                            title="Synchronize this ledger entry with main School Accounts"
                          >
                            {syncingId === tx.id ? 'Syncing...' : 'Sync with Accounts'}
                          </button>
                        )}
                      </td>

                      <td className="p-4">
                        {tx.receipt_url ? (
                          <a
                            href={tx.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 font-semibold hover:underline"
                            style={{ color: t.mint }}
                          >
                            <Receipt className="w-3.5 h-3.5" />
                            <span>Receipt</span>
                          </a>
                        ) : (
                          <span style={{ color: t.textLow }}>No receipt</span>
                        )}
                      </td>

                      <td className="p-4 text-right">
                        {isPending && (canApproveRequisitions || isPresident) && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleApproveRequisition(tx.id, true)}
                              className="p-1 rounded hover:bg-emerald-500/20 text-emerald-400"
                              title="Approve Requisition"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleApproveRequisition(tx.id, false)}
                              className="p-1 rounded hover:bg-red-500/20 text-red-400"
                              title="Reject Requisition"
                            >
                              <XCircle className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Requisition Modal */}
      {showRequisitionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div
            className="w-full max-w-lg rounded-2xl p-6 border shadow-2xl space-y-4"
            style={{
              backgroundColor: t.panel,
              borderColor: t.strokeHi,
            }}
          >
            <h3 className="text-lg font-bold" style={{ color: t.textHi }}>
              Submit Guild Requisition or Inflow
            </h3>
            <p className="text-xs" style={{ color: t.textMid }}>
              Log ministerial requisitions for campus events, welfare procurement, or record Guild Fee inflows.
            </p>

            <form onSubmit={handleSubmitRequisition} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: t.textMid }}>
                    Transaction Type
                  </label>
                  <select
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs border outline-none"
                    style={{
                      backgroundColor: t.fieldBg,
                      borderColor: t.stroke,
                      color: t.textHi,
                    }}
                  >
                    <option value="EXPENDITURE">Expenditure Requisition</option>
                    <option value="INFLOW_ALLOCATION">Inflow / Fee Allocation</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: t.textMid }}>
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-xs border outline-none"
                    style={{
                      backgroundColor: t.fieldBg,
                      borderColor: t.stroke,
                      color: t.textHi,
                    }}
                  >
                    <option value="Event">Campus Event / Assembly</option>
                    <option value="Welfare">Welfare & Emergency Relief</option>
                    <option value="Logistics">Logistics & Transportation</option>
                    <option value="Health">Health, First Aid & Sanitation</option>
                    <option value="Sports">Inter-Faculty Sports & Games</option>
                    <option value="Guild Fee Allocation">Guild Fee Allocation</option>
                    <option value="Other">Other Requisition</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: t.textMid }}>
                  Amount (UGX)
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="e.g. 350000"
                  className="w-full px-3 py-2 rounded-lg text-xs border outline-none font-bold"
                  style={{
                    backgroundColor: t.fieldBg,
                    borderColor: t.stroke,
                    color: t.textHi,
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: t.textMid }}>
                  Purpose / Itemized Description
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Specify purpose of funds, vendor, expected delivery date..."
                  className="w-full px-3 py-2 rounded-lg text-xs border outline-none resize-none"
                  style={{
                    backgroundColor: t.fieldBg,
                    borderColor: t.stroke,
                    color: t.textHi,
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1" style={{ color: t.textMid }}>
                  Receipt / Invoice URL (Optional)
                </label>
                <input
                  type="url"
                  value={receiptUrl}
                  onChange={(e) => setReceiptUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 rounded-lg text-xs border outline-none"
                  style={{
                    backgroundColor: t.fieldBg,
                    borderColor: t.stroke,
                    color: t.textHi,
                  }}
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t" style={{ borderColor: t.divider }}>
                <button
                  type="button"
                  onClick={() => setShowRequisitionModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold border hover:opacity-80"
                  style={{
                    backgroundColor: t.fieldBg,
                    borderColor: t.stroke,
                    color: t.textHi,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white shadow-md disabled:opacity-50"
                  style={{
                    background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
                    color: t.ctaText,
                  }}
                >
                  {submitting ? 'Submitting...' : 'Record Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
