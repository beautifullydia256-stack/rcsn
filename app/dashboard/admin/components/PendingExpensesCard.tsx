'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { motion } from 'framer-motion';
import { Clock, CheckCircle, XCircle, DollarSign } from 'lucide-react';

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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userRow } = await supabase
        .from("users")
        .select("school_id, role")
        .eq("user_id", user.id)
        .single();

      if (!userRow?.school_id || !['admin', 'head_teacher'].includes(userRow.role)) {
        return;
      }

      const { data: expensesData } = await supabase
        .from("school_expenses")
        .select(`
          expense_id,
          category_name,
          description,
          amount,
          reference_number,
          recorded_by,
          payment_method,
          created_at
        `)
        .eq("school_id", userRow.school_id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);

      if (expensesData && expensesData.length > 0) {
        const userIds = expensesData.map(e => e.recorded_by);
        const { data: userData } = await supabase
          .from("users")
          .select("user_id, name")
          .in("user_id", userIds);

        const userMap = new Map(userData?.map(u => [u.user_id, u.name]) || []);
        
        const enrichedExpenses = expensesData.map(e => ({
          ...e,
          recorded_by_name: userMap.get(e.recorded_by) || 'Unknown'
        }));

        setExpenses(enrichedExpenses as any);
      } else {
        setExpenses([]);
      }
    } catch (error) {
      console.error("Error loading pending expenses:", error);
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
          action: action,
          notes: action === 'approve' ? 'Approved by admin' : 'Rejected by admin'
        })
      });

      if (response.ok) {
        setExpenses(prev => prev.filter(e => e.expense_id !== expenseId));
      } else {
        const data = await response.json();
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("Error processing expense:", error);
      alert("Failed to process expense");
    } finally {
      setProcessing(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-[#101828] rounded-xl border border-white/10 p-6 mb-6">
        <div className="animate-pulse space-y-3">
          <div className="h-6 bg-white/10 rounded w-1/3" />
          <div className="h-4 bg-white/10 rounded w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#101828] rounded-xl border border-white/10 p-6 mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 rounded-xl bg-[#f5a623]/15">
          <Clock className="w-6 h-6 text-amber-600" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-white">Pending Expense Approvals</h2>
          <p className="text-sm text-white/60">
            {expenses.length} expense{expenses.length !== 1 ? 's' : ''} awaiting approval
          </p>
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="w-12 h-12 mx-auto mb-2 text-white/20" />
          <p className="text-white/60">No pending expenses to approve</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[500px] overflow-y-auto">
          {expenses.map((expense) => (
            <motion.div
              key={expense.expense_id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 rounded-xl bg-white/5 border border-white/10"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <DollarSign className="w-5 h-5 text-red-500" />
                    <span className="font-medium text-white">{expense.category_name}</span>
                    <span className="text-xs text-white/40">•</span>
                    <span className="text-xs text-white/60">{expense.reference_number}</span>
                  </div>
                  <p className="text-sm text-white/70 mb-2">{expense.description}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-white/60">
                    <span>
                      Amount: <span className="font-semibold text-[#f75c5c]">{formatCurrency(expense.amount)}</span>
                    </span>
                    <span className="text-white/40">•</span>
                    <span>
                      Submitted:{' '}
                      {new Date(expense.created_at).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' })}
                    </span>
                    <span className="text-white/40">•</span>
                    <span>Method: {expense.payment_method}</span>
                    <span className="text-white/40">•</span>
                    <span>By: {expense.recorded_by_name}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleApproval(expense.expense_id, 'approve')}
                    disabled={processing === expense.expense_id}
                    className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-[#10d9a8]/30 bg-[#10d9a8]/15 text-[#10d9a8] hover:bg-[#10d9a8]/25 disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApproval(expense.expense_id, 'reject')}
                    disabled={processing === expense.expense_id}
                    className="flex items-center gap-1 text-sm px-3 py-1.5 rounded-lg border border-[#f75c5c]/30 bg-[#f75c5c]/15 text-[#f75c5c] hover:bg-[#f75c5c]/25 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

