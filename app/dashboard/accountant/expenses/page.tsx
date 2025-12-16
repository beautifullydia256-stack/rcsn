'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/src/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Plus } from 'lucide-react';

interface Expense {
  expense_id: string;
  category_name: string;
  description: string;
  amount: number;
  payment_method: string;
  expense_date: string;
  reference_number: string;
  status: string;
  recorded_by: string;
  approved_by: string | null;
  approved_at: string | null;
}

interface ExpenseCategory {
  category_id: string;
  category_name: string;
  description: string;
}

export default function ExpensesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string>('');
  const [currentTermId, setCurrentTermId] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<ExpenseCategory[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: userRow } = await supabase
        .from('users')
        .select('school_id, role, user_id')
        .eq('user_id', user.id)
        .single();

      if (!userRow?.school_id) {
        setError('School not found for user');
        return;
      }

      setSchoolId(userRow.school_id);
      setUserId(userRow.user_id);

      if (userRow.role !== 'accountant' && userRow.role !== 'admin') {
        setError('Access denied. Accountant or Admin only.');
        return;
      }

      // Get current term
      const today = new Date().toISOString().slice(0, 10);
      const { data: allTerms } = await supabase
        .from('school_terms')
        .select('id, start_date, end_date, year, term')
        .eq('school_id', userRow.school_id)
        .order('year', { ascending: false })
        .order('term', { ascending: false });

      let currentTerm = (allTerms || []).find((t: any) =>
        t.start_date && t.end_date &&
        t.start_date <= today && t.end_date >= today
      );

      if (!currentTerm && allTerms && allTerms.length > 0) {
        currentTerm = allTerms[0];
      }

      if (currentTerm) {
        setCurrentTermId(currentTerm.id);
      }

      // Load expense categories
      const { data: categoriesData } = await supabase
        .from('expense_categories')
        .select('category_id, category_name, description')
        .eq('school_id', userRow.school_id)
        .eq('is_active', true)
        .order('category_name');
      setExpenseCategories(categoriesData as any || []);

      // Load expenses
      let expensesQuery = supabase
        .from('school_expenses')
        .select('*')
        .eq('school_id', userRow.school_id);

      if (currentTerm?.id) {
        expensesQuery = expensesQuery.eq('term_id', currentTerm.id);
      }

      const { data: expensesData } = await expensesQuery
        .order('expense_date', { ascending: false });

      setExpenses(expensesData as any || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [router]);

  const filteredExpenses = useMemo(() => {
    const q = search.toLowerCase();
    return expenses.filter(e => {
      const matchCategory = categoryFilter ? (e.category_name === categoryFilter) : true;
      const matchStatus = statusFilter ? (e.status === statusFilter) : true;
      const matchSearch = !q ||
        e.description.toLowerCase().includes(q) ||
        e.category_name.toLowerCase().includes(q) ||
        (e.reference_number || '').toLowerCase().includes(q);
      const matchDateFrom = !dateFrom || e.expense_date >= dateFrom;
      const matchDateTo = !dateTo || e.expense_date <= dateTo;
      return matchCategory && matchStatus && matchSearch && matchDateFrom && matchDateTo;
    });
  }, [expenses, search, categoryFilter, statusFilter, dateFrom, dateTo]);

  const totalAmount = filteredExpenses
    .filter(e => e.status === 'approved' || e.status === 'paid')
    .reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const exportToCSV = () => {
    const headers = ['Date', 'Category', 'Description', 'Amount', 'Method', 'Status', 'Reference', 'Approved By'];
    const rows = filteredExpenses.map(e => [
      e.expense_date,
      e.category_name,
      e.description,
      e.amount.toString(),
      e.payment_method,
      e.status,
      e.reference_number || '',
      e.approved_by || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/30 border-t-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-400/30 bg-red-500/10 p-6 text-red-400">
        {error}
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Page Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Expenses</h1>
            <p className="text-white/85">Track and manage school expenses</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white shadow-lg font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Record Expense
            </button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg p-4">
          <div className="text-white/60 text-xs uppercase tracking-wide mb-2">Total Expenses</div>
          <div className="text-2xl font-semibold text-white">{filteredExpenses.length}</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg p-4">
          <div className="text-white/60 text-xs uppercase tracking-wide mb-2">Approved Amount</div>
          <div className="text-2xl font-semibold text-white">
            {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(totalAmount)}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg p-4">
          <div className="text-white/60 text-xs uppercase tracking-wide mb-2">Pending</div>
          <div className="text-2xl font-semibold text-yellow-400">
            {filteredExpenses.filter(e => e.status === 'pending').length}
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg p-4">
          <div className="text-white/60 text-xs uppercase tracking-wide mb-2">Approved</div>
          <div className="text-2xl font-semibold text-emerald-400">
            {filteredExpenses.filter(e => e.status === 'approved' || e.status === 'paid').length}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            type="text"
            placeholder="Search by description or reference"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/60"
          />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
          >
            <option value="" className="bg-slate-800">All Categories</option>
            {expenseCategories.map(cat => (
              <option key={cat.category_id} value={cat.category_name} className="bg-slate-800">{cat.category_name}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
          >
            <option value="" className="bg-slate-800">All Status</option>
            <option value="pending" className="bg-slate-800">Pending</option>
            <option value="approved" className="bg-slate-800">Approved</option>
            <option value="paid" className="bg-slate-800">Paid</option>
            <option value="rejected" className="bg-slate-800">Rejected</option>
          </select>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="From Date"
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="To Date"
            className="rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
          />
        </div>
      </div>

      {/* Expenses Table */}
      <div className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left font-medium px-4 py-3 text-white/90">Date</th>
                <th className="text-left font-medium px-4 py-3 text-white/90">Category</th>
                <th className="text-left font-medium px-4 py-3 text-white/90">Description</th>
                <th className="text-right font-medium px-4 py-3 text-white/90">Amount</th>
                <th className="text-left font-medium px-4 py-3 text-white/90">Method</th>
                <th className="text-left font-medium px-4 py-3 text-white/90">Status</th>
                <th className="text-left font-medium px-4 py-3 text-white/90">Reference</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-white/60">
                    No expenses found
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => (
                  <tr key={expense.expense_id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white/90">{new Date(expense.expense_date).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-white/90">{expense.category_name}</td>
                    <td className="px-4 py-3 text-white/90">{expense.description}</td>
                    <td className="px-4 py-3 text-right text-white/90 font-medium">
                      {new Intl.NumberFormat(undefined, { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(expense.amount)}
                    </td>
                    <td className="px-4 py-3 text-white/90 capitalize">{expense.payment_method}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        expense.status === 'approved' || expense.status === 'paid' ? 'bg-emerald-500/20 text-emerald-400' :
                        expense.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                        'bg-red-500/20 text-red-400'
                      }`}>
                        {expense.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/90 text-sm">{expense.reference_number || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Expense Modal */}
      {showExpenseModal && (
        <RecordExpenseModal
          isOpen={showExpenseModal}
          onClose={() => setShowExpenseModal(false)}
          expenseCategories={expenseCategories}
          schoolId={schoolId}
          termId={currentTermId}
          userId={userId}
          onSuccess={() => {
            setShowExpenseModal(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}

// Record Expense Modal Component
function RecordExpenseModal({
  isOpen,
  onClose,
  expenseCategories,
  schoolId,
  termId,
  userId,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  expenseCategories: ExpenseCategory[];
  schoolId: string | null;
  termId: string | null;
  userId: string;
  onSuccess: () => void;
}) {
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!category || !description || !amount || !paymentMethod || !schoolId || !termId) {
        setError('Please fill all required fields');
        return;
      }

      if (isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
        setError('Please enter a valid amount');
        return;
      }

      const response = await fetch('/api/accountant/record-expense', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_name: category,
          description,
          amount: parseFloat(amount),
          payment_method: paymentMethod,
          expense_date: expenseDate,
          reference_number: referenceNumber || null,
          term_id: termId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to record expense');
      }

      setCategory('');
      setDescription('');
      setAmount('');
      setPaymentMethod('cash');
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setReferenceNumber('');

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to record expense');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="rounded-xl border border-white/10 bg-white/10 backdrop-blur-md p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Record Expense</h3>
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-400/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-white/80 text-sm mb-2">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
              >
                <option value="" className="bg-slate-800">Select category</option>
                {expenseCategories.map(cat => (
                  <option key={cat.category_id} value={cat.category_name} className="bg-slate-800">{cat.category_name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Description *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the expense..."
                rows={3}
                required
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/60"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Amount (UGX) *</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="0"
                step="0.01"
                required
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/60"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Payment Method *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                required
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
              >
                <option value="cash" className="bg-slate-800">Cash</option>
                <option value="bank" className="bg-slate-800">Bank</option>
                <option value="mobile_money" className="bg-slate-800">Mobile Money</option>
                <option value="cheque" className="bg-slate-800">Cheque</option>
                <option value="other" className="bg-slate-800">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Expense Date *</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                required
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white"
              />
            </div>

            <div>
              <label className="block text-white/80 text-sm mb-2">Reference Number</label>
              <input
                type="text"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                placeholder="Optional reference number"
                className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/60"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-medium transition-colors disabled:opacity-50"
              >
                {submitting ? 'Recording...' : 'Record Expense'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


