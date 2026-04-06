"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/src/lib/supabase";
import { motion } from "framer-motion";
import { Clock, CheckCircle, XCircle, DollarSign } from "lucide-react";

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

export function PendingExpenses() {
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

      // Get user names for recorded_by
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
        // Remove from list
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

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6"
      >
        <div className="animate-pulse flex space-x-4">
          <div className="flex-1 space-y-4 py-1">
            <div className="h-4 bg-white/20 rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-white/20 rounded"></div>
              <div className="h-4 bg-white/20 rounded w-5/6"></div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (expenses.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Pending Expense Approvals</h3>
            <p className="text-sm text-white/60">Review and approve school expenses</p>
          </div>
        </div>
        <div className="text-center py-8 text-white/60">
          <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No pending expenses to approve</p>
        </div>
      </motion.div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-md p-6"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Clock className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Pending Expense Approvals</h3>
            <p className="text-sm text-white/60">{expenses.length} expense{expenses.length !== 1 ? 's' : ''} awaiting approval</p>
          </div>
        </div>
      </div>

      <div className="space-y-3 max-h-[500px] overflow-y-auto">
        {expenses.map((expense) => (
          <motion.div
            key={expense.expense_id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-white/5 rounded-lg p-4 border border-white/10 hover:border-white/20 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-start gap-3 mb-2">
                  <DollarSign className="w-5 h-5 text-red-400 mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium">{expense.category_name}</span>
                      <span className="text-xs text-white/40">•</span>
                      <span className="text-xs text-white/60">{expense.reference_number}</span>
                    </div>
                    <p className="text-sm text-white/70 mb-2">{expense.description}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-white/50">
                      <span>Amount: <span className="text-red-400 font-semibold">{formatCurrency(expense.amount)}</span></span>
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
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleApproval(expense.expense_id, 'approve')}
                  disabled={processing === expense.expense_id}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <CheckCircle className="w-4 h-4" />
                  Approve
                </button>
                <button
                  onClick={() => handleApproval(expense.expense_id, 'reject')}
                  disabled={processing === expense.expense_id}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <XCircle className="w-4 h-4" />
                  Reject
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

