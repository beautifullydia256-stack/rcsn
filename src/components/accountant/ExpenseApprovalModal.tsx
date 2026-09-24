import { useState } from 'react';
import { CheckCircle2, XCircle, Clock, DollarSign, Calendar, User, CreditCard, Tag, AlertCircle, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { sendExpenseNotification } from '@/lib/sendExpenseNotification';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens, SORA, INTER } from '@/styles/posThemeTokens';
import { queryClient } from '@/lib/queryClient';
import { invalidateAllFinancialQueries, broadcastFinanceUpdate } from '@/lib/realtimeFinanceSync';

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
      if (activeSchoolId) {
        try {
          await sendExpenseNotification(expense.expense_id, action, activeSchoolId);
        } catch (notifErr) {
          console.warn('Failed to send notification:', notifErr);
        }
      }

      // Invalidate queries so all screens update seamlessly
      queryClient.invalidateQueries({ queryKey: ['accountant', 'expenses'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard-kpis'] });
      invalidateAllFinancialQueries(queryClient, activeSchoolId);
      broadcastFinanceUpdate({
        type: 'expense',
        schoolId: activeSchoolId,
        id: expense.expense_id,
        amount: numAmount,
        status: newStatus,
      });

      // Dispatch global window event for components without queryClient
      window.dispatchEvent(
        new CustomEvent('pweza:expense-updated', {
          detail: { expenseId: expense.expense_id, status: newStatus, amount: numAmount },
        })
      );

      onSuccess?.(action);
      onClose();
    } catch (err: any) {
      console.error('Error updating expense status:', err);
      setErrorMsg(err?.message || 'Failed to update expense status. Please try again.');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      style={{ fontFamily: INTER }}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        style={{
          background: t.panel,
          border: `1px solid ${t.stroke}`,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: t.divider, background: t.fieldBg }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: t.goldDim, color: t.gold }}
            >
              <Clock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold" style={{ color: t.textHi, fontFamily: SORA }}>
                Review Expense Voucher
              </h2>
              <p className="text-[11px]" style={{ color: t.textMid }}>
                Reference: <span className="font-mono font-semibold">{expense.reference_number || '—'}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: t.textMid }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div
              className="flex items-center gap-2 rounded-xl p-3 text-xs font-semibold"
              style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)' }}
            >
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Amount Card */}
          <div
            className="rounded-xl p-4 text-center"
            style={{
              background: t.fieldBg,
              border: `1px solid ${t.stroke}`,
            }}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Disbursement Amount
            </div>
            <div
              className="mt-1 text-2xl font-black tabular-nums"
              style={{ color: t.gold, fontFamily: SORA }}
            >
              UGX {fmt(numAmount)}
            </div>
            <div className="mt-1 flex items-center justify-center gap-2">
              <span
                className="inline-flex rounded-full px-2.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wider"
                style={{
                  background: isPending ? t.goldDim : expense.status === 'approved' ? t.mintDim : 'rgba(239, 68, 68, 0.15)',
                  color: isPending ? t.gold : expense.status === 'approved' ? t.mint : '#ef4444',
                  border: `1px solid ${isPending ? t.gold : expense.status === 'approved' ? t.mintRing : '#ef4444'}`,
                }}
              >
                {expense.status || 'Pending Clearance'}
              </span>
            </div>
          </div>

          {/* Itemized Grid Details */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div
              className="rounded-xl p-3"
              style={{ background: t.fieldBg, border: `1px solid ${t.stroke}` }}
            >
              <div className="flex items-center gap-1.5 mb-1" style={{ color: t.textLow }}>
                <Tag className="h-3.5 w-3.5" />
                <span className="font-semibold text-[10.5px] uppercase">Category</span>
              </div>
              <div className="font-bold truncate" style={{ color: t.textHi }}>
                {expense.category_name || 'Operating Expense'}
              </div>
            </div>

            <div
              className="rounded-xl p-3"
              style={{ background: t.fieldBg, border: `1px solid ${t.stroke}` }}
            >
              <div className="flex items-center gap-1.5 mb-1" style={{ color: t.textLow }}>
                <CreditCard className="h-3.5 w-3.5" />
                <span className="font-semibold text-[10.5px] uppercase">Payment Method</span>
              </div>
              <div className="font-bold capitalize truncate" style={{ color: t.textHi }}>
                {expense.payment_method || 'Cash / Voucher'}
              </div>
            </div>

            <div
              className="rounded-xl p-3"
              style={{ background: t.fieldBg, border: `1px solid ${t.stroke}` }}
            >
              <div className="flex items-center gap-1.5 mb-1" style={{ color: t.textLow }}>
                <Calendar className="h-3.5 w-3.5" />
                <span className="font-semibold text-[10.5px] uppercase">Expense Date</span>
              </div>
              <div className="font-bold tabular-nums" style={{ color: t.textHi }}>
                {expense.expense_date || (expense.created_at ? new Date(expense.created_at).toLocaleDateString() : '—')}
              </div>
            </div>

            <div
              className="rounded-xl p-3"
              style={{ background: t.fieldBg, border: `1px solid ${t.stroke}` }}
            >
              <div className="flex items-center gap-1.5 mb-1" style={{ color: t.textLow }}>
                <User className="h-3.5 w-3.5" />
                <span className="font-semibold text-[10.5px] uppercase">Recorded By</span>
              </div>
              <div className="font-bold truncate" style={{ color: t.textHi }}>
                {expense.recorded_by_name || 'Accounts Staff'}
              </div>
            </div>
          </div>

          {/* Purpose & Description */}
          <div
            className="rounded-xl p-3.5 space-y-1"
            style={{ background: t.fieldBg, border: `1px solid ${t.stroke}` }}
          >
            <div className="text-[10.5px] font-semibold uppercase tracking-wider" style={{ color: t.textLow }}>
              Description &amp; Purpose
            </div>
            <p className="text-xs font-medium leading-relaxed" style={{ color: t.textHi }}>
              {expense.description || 'No detailed purpose notes provided.'}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div
          className="flex items-center justify-end gap-2.5 px-6 py-4 border-t"
          style={{ borderColor: t.divider, background: t.fieldBg }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={loadingAction !== null}
            className="rounded-xl px-4 py-2 text-xs font-semibold transition-all hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: t.textMid }}
          >
            Close
          </button>

          {isPending ? (
            <>
              <button
                type="button"
                onClick={() => handleAction('decline')}
                disabled={loadingAction !== null}
                className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-bold transition-all disabled:opacity-50"
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                }}
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
                className="inline-flex items-center gap-1.5 rounded-xl px-5 py-2 text-xs font-bold transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${t.ctaGradA}, ${t.ctaGradB})`,
                  color: t.ctaText,
                  boxShadow: `0 4px 14px ${t.glowA}`,
                }}
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
              className="text-xs font-semibold"
              style={{ color: expense.status === 'approved' ? t.mint : '#ef4444' }}
            >
              This expense has been {expense.status}.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
