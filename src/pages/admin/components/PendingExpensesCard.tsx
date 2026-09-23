import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { sendExpenseNotification } from '@/lib/sendExpenseNotification';
import { useAuthStore } from '@/store/authStore';

interface PendingExpense {
  expense_id: string;
  category_name: string;
  description: string;
  amount: number;
  reference_number: string;
  recorded_by: string;
  payment_method: string;
  created_at: string;
  recorded_by_name?: string;
}

export default function PendingExpensesCard() {
  const [expenses, setExpenses] = useState<PendingExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  const loadPendingExpenses = async () => {
    try {
      const authState = useAuthStore.getState();
      let schoolId = authState.schoolId || (authState.user as any)?.school_id;

      if (!schoolId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        const { data: userRow } = await supabase
          .from('users')
          .select('school_id')
          .eq('user_id', user.id)
          .maybeSingle();
        schoolId = userRow?.school_id;
      }

      if (!schoolId) return;

      const { data: expensesData } = await supabase
        .from('school_expenses')
        .select('expense_id, category_name, description, amount, reference_number, recorded_by, payment_method, created_at')
        .eq('school_id', schoolId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      if (expensesData?.length) {
        const userIds = expensesData.map((e) => e.recorded_by).filter(Boolean);
        let userMap = new Map<string, string>();
        if (userIds.length > 0) {
          try {
            const { data: userData } = await supabase.from('users').select('user_id, name').in('user_id', userIds);
            userMap = new Map(userData?.map((u) => [u.user_id, u.name]) || []);
          } catch {
            // Optional user names lookup
          }
        }
        const enriched = expensesData.map((e) => ({
          ...e,
          recorded_by_name: userMap.get(e.recorded_by) || 'Unknown',
        }));
        setExpenses(enriched as PendingExpense[]);
      } else {
        setExpenses([]);
      }
    } catch (error) {
      console.error('Error loading pending expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPendingExpenses();
  }, []);

  const handleApproval = async (expenseId: string, action: 'approve' | 'decline') => {
    setProcessing(expenseId);
    try {
      const newStatus = action === 'approve' ? 'approved' : 'declined';
      const { error: updateErr } = await supabase
        .from('school_expenses')
        .update({
          status: newStatus,
        })
        .eq('expense_id', expenseId);

      if (updateErr) throw updateErr;

      const schoolId = useAuthStore.getState().schoolId;
      if (schoolId) {
        sendExpenseNotification(expenseId, action, schoolId).catch((err) => {
          console.warn('Failed to send notification:', err);
        });
      }

      setExpenses((prev) => prev.filter((e) => e.expense_id !== expenseId));
      window.dispatchEvent(
        new CustomEvent('pweza:expense-updated', {
          detail: { expenseId, status: newStatus },
        })
      );
    } catch (error: any) {
      console.error('Error processing expense:', error);
      alert(`Failed to ${action} expense: ${error?.message || 'Database update error'}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleBulkApproval = async (action: 'approve' | 'decline') => {
    if (expenses.length === 0) return;

    const confirmMessage = action === 'approve' 
      ? `Approve all ${expenses.length} pending expenses?`
      : `Decline all ${expenses.length} pending expenses?`;

    if (!confirm(confirmMessage)) return;

    setProcessing('bulk');
    try {
      const newStatus = action === 'approve' ? 'approved' : 'declined';
      const ids = expenses.map((e) => e.expense_id);
      const { error: updateErr } = await supabase
        .from('school_expenses')
        .update({
          status: newStatus,
        })
        .in('expense_id', ids);

      if (updateErr) throw updateErr;

      const schoolId = useAuthStore.getState().schoolId;
      if (schoolId) {
        for (const id of ids) {
          sendExpenseNotification(id, action, schoolId).catch(() => {});
        }
      }

      setExpenses([]);
      window.dispatchEvent(
        new CustomEvent('pweza:expense-updated', {
          detail: { status: newStatus },
        })
      );
    } catch (error: any) {
      console.error('Error processing bulk expenses:', error);
      alert(`Failed to ${action} expenses: ${error?.message || 'Database error'}`);
      loadPendingExpenses();
    } finally {
      setProcessing(null);
    }
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(amount);

  if (loading) {
    return (
      <div className="ac-glass-card p-6 mb-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 ac-skeleton-block w-1/3" />
          <div className="h-4 ac-skeleton-block w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="ac-glass-card p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-[#f5a623]/15 border border-[#f5a623]/25">
            <Clock className="w-6 h-6 text-[#f5a623]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold ac-text-primary">Pending Expense Approvals</h2>
            <p className="text-sm ac-text-muted">
              {expenses.length} expense{expenses.length !== 1 ? 's' : ''} awaiting approval
            </p>
          </div>
        </div>
        
        {expenses.length > 1 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleBulkApproval('approve')}
              disabled={processing === 'bulk'}
              className="flex items-center gap-1 rounded-lg border border-[#10d9a8]/30 bg-[#10d9a8]/15 px-3 py-2 text-sm font-medium text-[#10d9a8] hover:bg-[#10d9a8]/25 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              Approve All
            </button>
            <button
              type="button"
              onClick={() => handleBulkApproval('decline')}
              disabled={processing === 'bulk'}
              className="flex items-center gap-1 rounded-lg border border-[#f75c5c]/30 bg-[#f75c5c]/15 px-3 py-2 text-sm font-medium text-[#f75c5c] hover:bg-[#f75c5c]/25 disabled:opacity-50"
            >
              <XCircle className="w-4 h-4" />
              Decline All
            </button>
          </div>
        )}
      </div>

      {expenses.length === 0 ? (
        <div className="py-8 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-2 ac-text-muted" />
          <p className="ac-text-muted">No pending expenses to approve</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {expenses.map((expense) => (
            <div
              key={expense.expense_id}
              className="p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/[0.07] transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium ac-text-primary">{expense.category_name}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-white/10 ac-text-muted">
                      {expense.reference_number}
                    </span>
                  </div>
                  <p className="text-sm ac-text-secondary mb-2">{expense.description}</p>
                  <div className="flex flex-wrap gap-3 text-xs ac-text-muted">
                    <span>Amount: <span className="font-semibold text-red-600">{formatCurrency(expense.amount)}</span></span>
                    <span>•</span>
                    <span>
                      Submitted:{' '}
                      {new Date(expense.created_at).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                    <span>•</span>
                    <span>Method: {expense.payment_method}</span>
                    <span>•</span>
                    <span>By: {expense.recorded_by_name}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleApproval(expense.expense_id, 'approve')}
                    disabled={processing === expense.expense_id}
                    className="flex items-center gap-1 rounded-lg border border-[#10d9a8]/30 bg-[#10d9a8]/15 px-3 py-2 text-sm font-medium text-[#10d9a8] hover:bg-[#10d9a8]/25 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApproval(expense.expense_id, 'decline')}
                    disabled={processing === expense.expense_id}
                    className="flex items-center gap-1 rounded-lg border border-[#f75c5c]/30 bg-[#f75c5c]/15 px-3 py-2 text-sm font-medium text-[#f75c5c] hover:bg-[#f75c5c]/25 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Decline
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
