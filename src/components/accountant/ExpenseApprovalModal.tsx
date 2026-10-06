import { useState } from 'react';
import { CheckCircle2, XCircle, Clock, DollarSign, Calendar, User, CreditCard, Tag, AlertCircle, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { sendExpenseNotification } from '@/lib/sendExpenseNotification';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens, SORA, INTER } from '@/styles/posThemeTokens';
import { queryClient } from '@/lib/queryClient';
import { invalidateAllFinancialQueries, broadcastFinanceUpdate } from '@/lib/realtimeFinanceSync';
import NativeModal from '../NativeModal';

export interface ExpenseApprovalData {
  expense_id: string;
  category_name?: string | null;
  description?: string | null;
  amount: number | string;
  reference_number?: string | null;
  recorded_by?: string | null;
  recorded_by_name?: string | null;
  payment_method?: string | null;
  expense_date?: string | null;
  created_at?: string | null;
  status?: string | null;
  salary_period_label?: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  expense: ExpenseApprovalData | null;
  onSuccess?: (action: 'approve' | 'decline') => void;
}

function fmt(n: number) {
  return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function ExpenseApprovalModal({ open, onClose, expense, onSuccess }: Props) {
  const schoolId = useAuthStore((s) => s.schoolId);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const t = getTokens(isDark);

  const [loadingAction, setLoadingAction] = useState<'approve' | 'decline' | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open || !expense) return null;

  const numAmount = Number(expense.amount || 0);
  const isPending = !expense.status || expense.status === 'pending';

  const handleAction = async (action: 'approve' | 'decline') => {
    if (!expense?.expense_id) return;
    setLoadingAction(action);
    setErrorMsg(null);

    try {
      const newStatus = action === 'approve' ? 'approved' : 'declined';
      const { error } = await supabase
        .from('school_expenses')
        .update({
          status: newStatus,
        })
        .eq('expense_id', expense.expense_id);

      if (error) throw error;

      const activeSchoolId = schoolId || useAuthStore.getState().schoolId;

      // Invalidate queries immediately so all screens and dashboards update seamlessly
      queryClient.invalidateQueries({ queryKey: ['accountant', 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-kpis'] });
      if (activeSchoolId) {
        invalidateAllFinancialQueries(queryClient, activeSchoolId);
      }
      broadcastFinanceUpdate({
        type: 'expense',
        schoolId: activeSchoolId,
        id: expense.expense_id,
        amount: numAmount,
        status: newStatus,
      });

      // Dispatch global window events for instant UI synchronization
      window.dispatchEvent(
        new CustomEvent('pweza:expense-updated', {
          detail: { expenseId: expense.expense_id, status: newStatus, amount: numAmount },
        })
      );
      window.dispatchEvent(
        new CustomEvent('pweza:finance-mutated', {
          detail: { type: 'expense', schoolId: activeSchoolId },
        })
      );

      // Send in-app notification in the background without blocking UI
      if (activeSchoolId) {
        void sendExpenseNotification(expense.expense_id, action, activeSchoolId).catch((notifErr) => {
          console.warn('Failed to send notification:', notifErr);
        });
      }

      onSuccess?.(action);
      onClose();
    } catch (err: any) {
      console.error('Error updating expense status:', err);
      setErrorMsg(err?.message || 'Failed to update expense status. Please try again.');
    } finally {
      setLoadingAction(null);
    }
  };

  if (!open || !expense) return null;

  return (
    <NativeModal
      isOpen={open && !!expense}
      onClose={onClose}
      title="Review Expense Voucher"
      icon={Clock}
      size="md"
    >
      <div className="space-y-4">
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-2xl p-3 text-xs font-semibold bg-rose-500/15 text-rose-200 border border-rose-400/30">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Voucher Reference & Header Information */}
        <div className="flex items-center justify-between text-xs text-white/70 px-1">
          <span>
            Voucher Reference: <strong className="font-mono text-white">{expense.reference_number || '—'}</strong>
          </span>
          {expense.salary_period_label && (
            <span className="text-emerald-300 font-semibold">{expense.salary_period_label}</span>
          )}
        </div>

        {/* Amount Card */}
        <div className="rounded-2xl border border-white/20 bg-black/25 backdrop-blur-sm p-4 text-center shadow-[inset_0_1px_3px_rgba(0,0,0,0.25)] text-white">
          <div className="text-[11px] font-bold text-white/70 uppercase tracking-wider">
            Disbursement Amount
          </div>
          <div className="mt-1 text-2xl sm:text-3xl font-black tabular-nums text-amber-300 drop-shadow-sm font-mono">
            UGX {fmt(numAmount)}
          </div>
          <div className="mt-2 flex items-center justify-center gap-2">
            <span
              className={`inline-flex rounded-full px-3 py-0.5 text-[10.5px] font-bold uppercase tracking-wider border ${
                isPending
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/40'
                  : expense.status === 'approved'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-400/40'
              }`}
            >
              {expense.status || 'Pending Clearance'}
            </span>
          </div>
        </div>

        {/* Itemized Grid Details */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-xl border border-white/15 bg-white/5 p-3 backdrop-blur-sm text-white">
            <div className="flex items-center gap-1.5 mb-1 text-white/60">
              <Tag className="h-3.5 w-3.5 text-emerald-300" />
              <span className="font-semibold text-[10px] uppercase tracking-wider">Category</span>
            </div>
            <div className="font-bold truncate text-white">
              {expense.category_name || 'Operating Expense'}
            </div>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/5 p-3 backdrop-blur-sm text-white">
            <div className="flex items-center gap-1.5 mb-1 text-white/60">
              <CreditCard className="h-3.5 w-3.5 text-emerald-300" />
              <span className="font-semibold text-[10px] uppercase tracking-wider">Payment Method</span>
            </div>
            <div className="font-bold capitalize truncate text-white">
              {expense.payment_method || 'Cash / Voucher'}
            </div>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/5 p-3 backdrop-blur-sm text-white">
            <div className="flex items-center gap-1.5 mb-1 text-white/60">
              <Calendar className="h-3.5 w-3.5 text-emerald-300" />
              <span className="font-semibold text-[10px] uppercase tracking-wider">Expense Date</span>
            </div>
            <div className="font-bold tabular-nums text-white">
              {expense.expense_date || (expense.created_at ? new Date(expense.created_at).toLocaleDateString() : '—')}
            </div>
          </div>

          <div className="rounded-xl border border-white/15 bg-white/5 p-3 backdrop-blur-sm text-white">
            <div className="flex items-center gap-1.5 mb-1 text-white/60">
              <User className="h-3.5 w-3.5 text-emerald-300" />
              <span className="font-semibold text-[10px] uppercase tracking-wider">Recorded By</span>
            </div>
            <div className="font-bold truncate text-white">
              {expense.recorded_by_name || 'Accounts Staff'}
            </div>
          </div>
        </div>

        {/* Purpose & Description */}
        <div className="rounded-xl border border-white/15 bg-white/5 p-3.5 space-y-1 backdrop-blur-sm text-white">
          <div className="text-[10px] font-bold text-white/60 uppercase tracking-wider">
            Description &amp; Purpose
          </div>
          <p className="text-xs font-medium leading-relaxed text-white/90">
            {expense.description || 'No detailed purpose notes provided.'}
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/15">
          <button
            type="button"
            onClick={onClose}
            disabled={loadingAction !== null}
            className="px-4 py-2 rounded-xl text-xs font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-md transition-all active:scale-[0.98]"
          >
            Close
          </button>

          {isPending ? (
            <>
              <button
                type="button"
                onClick={() => handleAction('decline')}
                disabled={loadingAction !== null}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-rose-300 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-400/30 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loadingAction === 'decline' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                <span>Decline Expense</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction('approve')}
                disabled={loadingAction !== null}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold text-emerald-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:brightness-110 border border-emerald-300/60 shadow-[0_4px_16px_rgba(16,185,129,0.35)] transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loadingAction === 'approve' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>Approve Expense</span>
              </button>
            </>
          ) : (
            <span
              className={`text-xs font-semibold px-3 py-1 rounded-xl border ${
                expense.status === 'approved'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                  : 'bg-rose-500/20 text-rose-300 border-rose-400/30'
              }`}
            >
              This expense has been {expense.status}.
            </span>
          )}
        </div>
      </div>
    </NativeModal>
  );
}
