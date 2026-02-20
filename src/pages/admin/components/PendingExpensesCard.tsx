import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Clock, CheckCircle, XCircle, DollarSign } from 'lucide-react';

interface PendingExpense {
  expense_id: string;
  category_name: string;
  description: string;
  amount: number;
  expense_date: string;
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRow } = await supabase
        .from('users')
        .select('school_id, role')
        .eq('user_id', user.id)
        .single();

      if (!userRow?.school_id || !['admin', 'head_teacher'].includes(userRow.role ?? '')) return;

      const { data: expensesData } = await supabase
        .from('school_expenses')
        .select('expense_id, category_name, description, amount, expense_date, reference_number, recorded_by, payment_method, created_at')
        .eq('school_id', userRow.school_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      if (expensesData?.length) {
        const userIds = expensesData.map((e) => e.recorded_by);
        const { data: userData } = await supabase.from('users').select('user_id, name').in('user_id', userIds);
        const userMap = new Map(userData?.map((u) => [u.user_id, u.name]) || []);
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

  const handleApproval = async (expenseId: string, action: 'approve' | 'reject') => {
    setProcessing(expenseId);
    try {
      const response = await fetch('/api/accountant/approve-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expense_id: expenseId,
          action,
          notes: action === 'approve' ? 'Approved by admin' : 'Rejected by admin',
        }),
      });
      if (response.ok) {
        setExpenses((prev) => prev.filter((e) => e.expense_id !== expenseId));
      } else {
        const data = await response.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error processing expense:', error);
      alert('Failed to process expense');
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
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-xl bg-amber-100">
          <Clock className="w-6 h-6 text-amber-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold ac-text-primary">Pending Expense Approvals</h2>
          <p className="text-sm ac-text-muted">
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''} awaiting approval
          </p>
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="py-8 text-center">
          <CheckCircle className="w-12 h-12 mx-auto mb-2 ac-text-muted" />
          <p className="ac-text-muted">No pending expenses to approve</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {expenses.map((expense) => (
            <div key={expense.expense_id} className="p-4 rounded-xl bg-white/5 border border-white/10">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-red-500" />
                    <span className="font-medium ac-text-primary">{expense.category_name}</span>
                    <span className="text-xs ac-text-muted">•</span>
                    <span className="text-xs ac-text-secondary">{expense.reference_number}</span>
                  </div>
                  <p className="text-sm ac-text-secondary mb-2">{expense.description}</p>
                  <div className="flex flex-wrap gap-3 text-xs ac-text-muted">
                    <span>Amount: <span className="font-semibold text-red-600">{formatCurrency(expense.amount)}</span></span>
                    <span>•</span>
                    <span>Date: {new Date(expense.expense_date).toLocaleDateString()}</span>
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
                    className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApproval(expense.expense_id, 'reject')}
                    disabled={processing === expense.expense_id}
                    className="flex items-center gap-1 rounded-lg bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
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
