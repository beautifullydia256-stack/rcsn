import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  Building2,
  Calendar,
  Layers,
  TrendingUp,
  FileCheck2,
  Lock,
  Printer,
  Sparkles,
  Users,
  AlertCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  fetchMonthlyConsolidatedBudget,
  signAndApproveConsolidatedBudget,
} from '@/features/budget-requisitions/services/budgetRequisitionService';
import type { MonthlyConsolidatedBudget } from '@/features/budget-requisitions/types';
import { useToast } from '@/components/Toast';
import NativeModal from '@/components/NativeModal';
import LiquidGlassSelect from '@/components/ui/LiquidGlassSelect';

function fmtUGX(amount: number) {
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    maximumFractionDigits: 0,
  }).format(amount);
}

export default function ConsolidatedBudgetApprovalPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const schoolId = useAuthStore((s) => s.schoolId);
  const user = useAuthStore((s) => s.user);

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  });

  const [signModalOpen, setSignModalOpen] = useState(false);
  const [adminTitle, setAdminTitle] = useState('Principal / Managing Director');
  const [comments, setComments] = useState('');
  const [expandedReqId, setExpandedReqId] = useState<string | null>(null);

  const {
    data: budget,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['consolidated-budget', schoolId, selectedMonth],
    queryFn: () =>
      schoolId ? fetchMonthlyConsolidatedBudget(schoolId, selectedMonth) : Promise.resolve(null),
    enabled: Boolean(schoolId),
  });

  const approvals = budget?.approvals || [];
  const quorumCount = budget?.required_admin_approvals || 3;
  const currentCount = approvals.length;
  const isConfirmed = budget?.status === 'confirmed';

  const alreadySignedByUser = approvals.some((a) => a.admin_user_id === user?.id);

  // Sign mutation
  const signMutation = useMutation({
    mutationFn: async () => {
      if (!schoolId || !budget) return;
      return signAndApproveConsolidatedBudget(
        schoolId,
        budget.id,
        {
          id: user?.id || 'admin-user-id',
          name: user?.user_metadata?.name || user?.email || 'School Administrator',
          title: adminTitle,
        },
        comments
      );
    },
    onSuccess: (result) => {
      if (result?.newlyConfirmed) {
        toast.success(
          '🎉 Quorum reached! Master Institutional Budget is officially locked and active for spending!'
        );
      } else {
        toast.success('Digital signature recorded successfully towards board quorum.');
      }
      queryClient.invalidateQueries({ queryKey: ['consolidated-budget', schoolId, selectedMonth] });
      setSignModalOpen(false);
      setComments('');
    },
    onError: (err: any) => {
      toast.error(err.message || 'Failed to sign budget');
    },
  });

  const handlePrint = () => {
    window.print();
  };

  const netBalance = (budget?.total_inflow_projected || 0) - (budget?.total_budget_approved || 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ShieldCheck className="w-5 h-5" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">
              Consolidated Monthly Budget & Board Quorum
            </h1>
          </div>
          <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Executive oversight governance requiring a 3-of-N Administrator quorum before monthly funds are activated.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <input
            type="date"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs sm:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 font-semibold"
          />

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Budget Voucher</span>
          </button>

          {!isConfirmed && (
            <button
              type="button"
              disabled={alreadySignedByUser}
              onClick={() => setSignModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-purple-600/20 transition-colors disabled:opacity-50"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>{alreadySignedByUser ? 'You Have Signed' : 'Digitally Sign & Endorse'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Quorum Progress Alert Banner */}
      <div
        className={`p-5 rounded-2xl border ${
          isConfirmed
            ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
            : 'bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800'
        } backdrop-blur-md space-y-4`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`p-3 rounded-2xl ${
                isConfirmed
                  ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30'
                  : 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
              }`}
            >
              {isConfirmed ? <Lock className="w-6 h-6" /> : <Users className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
                  {isConfirmed
                    ? 'Master Institutional Budget Confirmed & Locked'
                    : `Multi-Admin Quorum Progress (${currentCount} of ${quorumCount} Signatures)`}
                </h3>
                {isConfirmed && (
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                {isConfirmed
                  ? `Confirmed on ${new Date(budget?.confirmed_at || '').toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}. All department spending caps are unlocked.`
                  : `Requires at least ${quorumCount} executive administrator signatures before funds can be disbursed.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {[1, 2, 3].map((step) => {
              const hasSigned = currentCount >= step;
              return (
                <div
                  key={step}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                    hasSigned
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                      : 'bg-white/80 dark:bg-slate-900/80 text-slate-400 border-slate-300 dark:border-slate-700'
                  }`}
                >
                  {hasSigned ? (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  ) : (
                    <Clock className="w-4 h-4 text-slate-400" />
                  )}
                  <span>Admin {step}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Existing Signatures List */}
        {approvals.length > 0 && (
          <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {approvals.map((appr, idx) => (
              <div
                key={appr.id}
                className="p-3 rounded-xl bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 text-xs shadow-xs"
              >
                <div className="flex items-center justify-between text-slate-500">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Signatory #{idx + 1}
                  </span>
                  <span className="font-mono text-[10px] text-purple-600 dark:text-purple-400">
                    {appr.digital_signature_hash}
                  </span>
                </div>
                <div className="mt-1 font-bold text-slate-900 dark:text-slate-100">{appr.admin_name}</div>
                <div className="text-slate-600 dark:text-slate-400 text-[11px]">{appr.admin_title}</div>
                {appr.comments && (
                  <div className="mt-1 text-[11px] text-slate-500 italic bg-slate-50 dark:bg-slate-800 p-1.5 rounded">
                    &ldquo;{appr.comments}&rdquo;
                  </div>
                )}
                <div className="mt-1 text-[10px] text-slate-400">
                  {new Date(appr.approved_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KPI Cards: Inflows vs Requested vs Net */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Projected Tuition Inflow
            </span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {fmtUGX(budget?.total_inflow_projected || 0)}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Based on current term billings
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Consolidated Outflow Request
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-purple-600 dark:text-purple-400">
            {fmtUGX(budget?.total_budget_requested || 0)}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Sum of all accepted department items
          </p>
        </div>

        <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Net Surplus / Cash Reserve
            </span>
            <div
              className={`p-2 rounded-xl ${
                netBalance >= 0
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : 'bg-rose-500/10 text-rose-600'
              }`}
            >
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`mt-2 text-2xl font-bold ${
              netBalance >= 0
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {fmtUGX(netBalance)}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Operational liquidity margin
          </p>
        </div>
      </div>

      {/* Breakdown by Department Requisitions */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <span>Endorsed Departmental Components for {selectedMonth}</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {(budget?.requisitions || []).length} Requisitions
          </span>
        </h2>

        {(budget?.requisitions || []).length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40">
            <Building2 className="w-10 h-10 mx-auto text-slate-400 mb-3" />
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-300">
              No Endorsed Requisitions Yet
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              Requisitions must be verified by Accounts Tier 1 and endorsed by the Chief Bursar before appearing in this master budget.
            </p>
          </div>
        ) : (
          (budget?.requisitions || []).map((req) => {
            const isExpanded = expandedReqId === req.id;

            return (
              <div
                key={req.id}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-sm overflow-hidden"
              >
                <div
                  onClick={() => setExpandedReqId(isExpanded ? null : req.id)}
                  className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm font-bold text-slate-900 dark:text-slate-100">
                          {req.requisition_number}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {req.department?.name}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                        Initiated by {req.creator_name} · Endorsed by {req.tier2_reviewer_name}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4">
                    <div className="text-right">
                      <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {fmtUGX(req.total_amount)}
                      </div>
                      <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        ✓ Bursar Endorsed
                      </div>
                    </div>

                    <div className="p-1 rounded-lg text-slate-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 dark:border-slate-800 p-4 bg-slate-50/40 dark:bg-slate-900/40">
                    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                          <tr>
                            <th className="py-2.5 px-3">Item</th>
                            <th className="py-2.5 px-3">Category</th>
                            <th className="py-2.5 px-3 text-right">Quantity</th>
                            <th className="py-2.5 px-3 text-right">Unit Cost</th>
                            <th className="py-2.5 px-3 text-right">Total (UGX)</th>
                            <th className="py-2.5 px-3">Justification</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {(req.items || []).map((item) => (
                            <tr key={item.id}>
                              <td className="py-2.5 px-3 font-medium text-slate-900 dark:text-slate-100">
                                {item.item_name}
                              </td>
                              <td className="py-2.5 px-3 text-slate-600 dark:text-slate-400">
                                {item.category}
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-800 dark:text-slate-200">
                                {item.quantity_requested} {item.unit_of_measure}
                              </td>
                              <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                                {fmtUGX(item.estimated_unit_cost)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-900 dark:text-slate-100">
                                {fmtUGX(item.total_estimated_cost)}
                              </td>
                              <td className="py-2.5 px-3 text-slate-500 dark:text-slate-400">
                                {item.justification || '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modal: Sign & Endorse */}
      <NativeModal
        isOpen={signModalOpen}
        onClose={() => setSignModalOpen(false)}
        title="Digital Board Signature & Endorsement"
        subtitle="Authorize the consolidated monthly institutional budget allocation."
        icon={FileCheck2}
        size="md"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/15 backdrop-blur-sm space-y-1">
            <span className="text-white/70 block text-xs leading-relaxed">
              By executing this digital signature, you approve the proposed monthly budget of{' '}
              <strong className="text-emerald-400 font-mono font-bold">
                {fmtUGX(budget?.total_budget_requested || 0)}
              </strong>{' '}
              towards reaching the institutional 3-admin quorum.
            </span>
          </div>

          <div className="relative z-[35] focus-within:z-[50]">
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Your Administrative Capacity / Title *
            </label>
            <LiquidGlassSelect
              value={adminTitle}
              onChange={(val) => setAdminTitle(val)}
              options={[
                { value: 'Principal / Managing Director', label: 'Principal / Managing Director' },
                { value: 'Deputy Principal / Academic Registrar', label: 'Deputy Principal / Academic Registrar' },
                { value: 'Chairman, Board of Governors', label: 'Chairman, Board of Governors' },
                { value: 'Director of Finance & Administration', label: 'Director of Finance & Administration' },
                { value: 'School Proprietor / Owner', label: 'School Proprietor / Owner' },
              ]}
              placeholder="Select administrative title..."
            />
          </div>

          <div className="relative z-[20] focus-within:z-[30]">
            <label className="block text-[11px] font-bold text-white/70 uppercase tracking-wider mb-1.5">
              Endorsement Remarks / Directives (optional)
            </label>
            <textarea
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder="e.g. Approved. Prioritize clinical consumables and laboratory reagents."
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/25 border border-white/20 text-white placeholder-white/40 text-xs focus:outline-none focus:border-emerald-400 focus:bg-black/35 transition-all shadow-inner resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setSignModalOpen(false)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white/75 hover:text-white bg-white/5 hover:bg-white/10 border border-white/15 transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={signMutation.isPending}
              onClick={() => signMutation.mutate()}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg shadow-emerald-500/25 border border-emerald-400/30 transition-all disabled:opacity-50"
            >
              {signMutation.isPending ? 'Signing...' : 'Execute Digital Signature'}
            </button>
          </div>
        </div>
      </NativeModal>
    </div>
  );
}
