import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Repeat,
  Zap,
  Droplets,
  Wifi,
  ShieldCheck,
  Trash2,
  Building2,
  Flame,
  Truck,
  Plus,
  Search,
  Filter,
  Calendar,
  CheckCircle2,
  Clock,
  AlertTriangle,
  History,
  Edit3,
  ExternalLink,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  Download,
  DollarSign,
  FileText,
  Banknote,
  X,
  CreditCard,
  Check,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { useUIStore } from '@/store/uiStore';
import { getTokens, cardGrad, SORA, INTER } from '@/styles/posThemeTokens';
import {
  fetchRecurringExpenses,
  createRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
  recordRecurringExpensePayment,
  fetchProfilePaymentHistory,
} from '@/features/recurring-expenses/services/recurringExpenseService';
import { fetchStaffSalaryObligations } from '@/features/payroll-obligations/services/salaryObligationService';
import type {
  RecurringExpense,
  RecurringExpenseWithCycle,
  RecurringExpenseCategory,
  RecurringExpenseFrequency,
  RecurringPaymentStatus,
  PreferredPaymentMethod,
  CreateRecurringExpenseInput,
  RecordRecurringPaymentInput,
  RecurringExpenseCyclePayment,
} from '@/features/recurring-expenses/types';
import AdminContentSkeleton from '@/components/layout/AdminContentSkeleton';
import { exportToExcel } from '@/lib/exportUtils';
import { invalidateAllFinancialQueries, broadcastFinanceUpdate } from '@/lib/realtimeFinanceSync';

function fmtUGX(amount: number): string {
  return `UGX ${Math.round(amount).toLocaleString('en-US')}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function getCategoryIcon(cat: RecurringExpenseCategory) {
  switch (cat) {
    case 'electricity':
      return <Zap className="w-4 h-4 text-amber-500" />;
    case 'water':
      return <Droplets className="w-4 h-4 text-cyan-500" />;
    case 'internet':
      return <Wifi className="w-4 h-4 text-blue-500" />;
    case 'security':
      return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
    case 'waste':
      return <Trash2 className="w-4 h-4 text-lime-600" />;
    case 'rent':
      return <Building2 className="w-4 h-4 text-purple-500" />;
    case 'generator':
      return <Flame className="w-4 h-4 text-orange-500" />;
    case 'transport':
      return <Truck className="w-4 h-4 text-indigo-500" />;
    default:
      return <Repeat className="w-4 h-4 text-slate-500" />;
  }
}

function getCategoryLabel(cat: RecurringExpenseCategory): string {
  switch (cat) {
    case 'electricity':
      return 'Electricity & Power';
    case 'water':
      return 'Water & Sanitation';
    case 'internet':
      return 'Internet & Wi-Fi';
    case 'security':
      return 'Security Services';
    case 'waste':
      return 'Waste & Refuse';
    case 'rent':
      return 'Rent & Lease';
    case 'software':
      return 'Software & Digital';
    case 'generator':
      return 'Generator Fuel';
    case 'transport':
      return 'Transport Retainers';
    default:
      return 'General Standing';
  }
}

function getStatusBadge(status: RecurringPaymentStatus, isDark: boolean) {
  switch (status) {
    case 'paid':
      return (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
          style={{
            background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#ecfdf5',
            color: isDark ? '#34d399' : '#059669',
            border: `1px solid ${isDark ? 'rgba(16, 185, 129, 0.3)' : '#a7f3d0'}`,
          }}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Paid</span>
        </span>
      );
    case 'due_soon':
      return (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
          style={{
            background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fffbeb',
            color: isDark ? '#fbbf24' : '#d97706',
            border: `1px solid ${isDark ? 'rgba(245, 158, 11, 0.3)' : '#fde68a'}`,
          }}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Due Soon</span>
        </span>
      );
    case 'overdue':
      return (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
          style={{
            background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fef2f2',
            color: isDark ? '#f87171' : '#dc2626',
            border: `1px solid ${isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca'}`,
          }}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Overdue</span>
        </span>
      );
    default:
      return (
        <span
          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
          style={{
            background: isDark ? 'rgba(148, 163, 184, 0.15)' : '#f8fafc',
            color: isDark ? '#94a3b8' : '#64748b',
            border: `1px solid ${isDark ? 'rgba(148, 163, 184, 0.3)' : '#e2e8f0'}`,
          }}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Pending</span>
        </span>
      );
  }
}

export default function RecurringExpensesPage() {
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);
  const userId = useAuthStore((s) => s.user?.id);
  const theme = useUIStore((s) => s.theme);
  const isDark = theme === 'dark';
  const tRaw = getTokens(isDark);
  const t = {
    ...tRaw,
    pageBg: tRaw.screenBg,
    inputBg: tRaw.fieldBg,
    inputBorder: tRaw.stroke,
    textMuted: tRaw.textMid,
  };
  const queryClient = useQueryClient();

  const now = new Date();
  const [currentYear, setCurrentYear] = useState(() => now.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => now.getMonth());

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState<RecurringExpense | null>(null);
  const [payingItem, setPayingItem] = useState<RecurringExpenseWithCycle | null>(null);
  const [historyItem, setHistoryItem] = useState<RecurringExpense | null>(null);

  // 1. Fetch recurring expenses
  const { data: recurringData, isLoading: isRecurringLoading } = useQuery({
    queryKey: ['recurring-expenses', schoolId, currentYear, currentMonth],
    queryFn: () => (schoolId ? fetchRecurringExpenses(schoolId, currentYear, currentMonth) : Promise.resolve({ items: [], summary: {} as any })),
    enabled: Boolean(schoolId),
  });

  // 2. Fetch staff salary obligations for the same month to compute combined commitments
  const { data: salaryData } = useQuery({
    queryKey: ['salary-obligations', schoolId, currentYear, currentMonth],
    queryFn: () => (schoolId ? fetchStaffSalaryObligations(schoolId, currentYear, currentMonth) : Promise.resolve({ rows: [], summary: {} as any })),
    enabled: Boolean(schoolId),
  });

  const { items = [], summary } = recurringData || {};
  const monthlyPayroll = salaryData?.summary?.total_monthly_payroll_obligation || 0;
  const combinedMonthlyObligations = (summary?.total_monthly_recurring_budget || 0) + monthlyPayroll;

  // Filtered rows
  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        it.title.toLowerCase().includes(q) ||
        it.provider_name.toLowerCase().includes(q) ||
        (it.account_or_meter_no && it.account_or_meter_no.toLowerCase().includes(q));

      const matchesCat = categoryFilter === 'all' || it.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || it.current_cycle_status === statusFilter;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [items, searchQuery, categoryFilter, statusFilter]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (input: CreateRecurringExpenseInput) => {
      if (!schoolId) throw new Error('Missing schoolId');
      return createRecurringExpense(schoolId, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
      setAddModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<CreateRecurringExpenseInput> }) => {
      if (!schoolId) throw new Error('Missing schoolId');
      return updateRecurringExpense(schoolId, id, input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
      setEditingProfile(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => {
      if (!schoolId) throw new Error('Missing schoolId');
      return deleteRecurringExpense(schoolId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
    },
  });

  const payMutation = useMutation({
    mutationFn: (input: RecordRecurringPaymentInput) => {
      if (!schoolId || !payingItem) throw new Error('Missing context');
      return recordRecurringExpensePayment(schoolId, input, payingItem, userId);
    },
    onSuccess: (res, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
      queryClient.invalidateQueries({ queryKey: ['salary-obligations'] });
      if (schoolId) {
        invalidateAllFinancialQueries(queryClient, schoolId);
        broadcastFinanceUpdate({
          type: 'expense',
          schoolId,
          id: res?.expenseId,
          amount: variables.amount_paid,
          status: 'approved',
        });
      }
      window.dispatchEvent(
        new CustomEvent('pweza:expense-updated', {
          detail: { expenseId: res?.expenseId, amount: variables.amount_paid, status: 'approved' },
        })
      );
      window.dispatchEvent(
        new CustomEvent('pweza:finance-mutated', {
          detail: { type: 'expense', schoolId },
        })
      );
      setPayingItem(null);
    },
  });

  // Export handlers
  const handleExportExcel = () => {
    exportToExcel({
      title: `School Recurring Expenses & Utility Obligations - ${MONTH_NAMES[currentMonth]} ${currentYear}`,
      subtitle: `Monthly fixed operational commitments audit sheet`,
      filename: `Recurring_Expenses_${MONTH_NAMES[currentMonth]}_${currentYear}`,
      columns: [
        { header: 'Title', key: 'title' },
        { header: 'Category', key: 'category' },
        { header: 'Provider', key: 'provider' },
        { header: 'Account / Meter No', key: 'account_no' },
        { header: 'Frequency', key: 'frequency' },
        { header: 'Billing Due Day', key: 'billing_day' },
        { header: 'Budget (UGX)', key: 'budget' },
        { header: 'Paid This Cycle (UGX)', key: 'paid' },
        { header: 'Balance Due (UGX)', key: 'balance' },
        { header: 'Cycle Status', key: 'status' },
        { header: 'Last Payment Date', key: 'last_payment' },
      ],
      rows: filteredItems.map((it) => ({
        title: it.title,
        category: getCategoryLabel(it.category),
        provider: it.provider_name,
        account_no: it.account_or_meter_no || '-',
        frequency: it.frequency,
        billing_day: `Day ${it.billing_day}`,
        budget: it.estimated_amount,
        paid: it.amount_paid_this_cycle,
        balance: it.balance_due_this_cycle,
        status: it.current_cycle_status.toUpperCase(),
        last_payment: it.last_payment_date || '-',
      })),
    });
  };

  if (isRecurringLoading) {
    return (
      <div className="w-full min-h-screen px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <AdminContentSkeleton />
      </div>
    );
  }

  return (
    <div
      className="w-full min-h-screen px-4 py-6 sm:px-6 lg:px-8 space-y-6"
      style={{
        background: t.pageBg,
        color: t.textPrimary,
        fontFamily: INTER,
      }}
    >
      {/* Top Header & Navigation */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-500 mb-1">
            <Repeat className="w-4 h-4" />
            <span>Standing Operational Commitments & Utilities</span>
          </div>
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight"
            style={{ fontFamily: SORA, color: t.textPrimary }}
          >
            Recurring Expenses & Utility Obligations
          </h1>
          <p className="text-sm mt-1" style={{ color: t.textMuted }}>
            Schedule, budget, and 1-click pay regular monthly bills (Internet, Electricity, Water, Security, Waste, and Rent) with direct expense ledger posting.
          </p>
        </div>

        {/* Month Picker & Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div
            className="flex items-center gap-1.5 p-1 rounded-xl shadow-xs"
            style={{
              background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
            }}
          >
            <Calendar className="w-4 h-4 ml-2" style={{ color: t.textMuted }} />
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(Number(e.target.value))}
              className="px-2 py-1.5 text-xs font-semibold rounded-lg bg-transparent focus:outline-none"
              style={{ color: t.textPrimary }}
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx} style={{ background: t.cardBg, color: t.textPrimary }}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(Number(e.target.value))}
              className="px-2 py-1.5 text-xs font-semibold rounded-lg bg-transparent focus:outline-none"
              style={{ color: t.textPrimary }}
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y} style={{ background: t.cardBg, color: t.textPrimary }}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors"
            style={{
              background: t.cardBg,
              border: `1px solid ${t.cardBorder}`,
              color: t.textPrimary,
            }}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white shadow-md transition-transform active:scale-95"
            style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            }}
          >
            <Plus className="w-4 h-4" />
            <span>Add Recurring Bill</span>
          </button>
        </div>
      </div>

      {/* KPI Cards: Operational Commitments & Combined Break-Even */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Monthly Recurring Budget */}
        <div
          className="rounded-2xl p-5 shadow-sm transition-all"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.cardBorder}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textMuted }}>
              Monthly Utility Budget
            </span>
            <div
              className="p-2 rounded-xl"
              style={{
                background: isDark ? 'rgba(245, 158, 11, 0.15)' : '#fef3c7',
                color: '#f59e0b',
              }}
            >
              <Repeat className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold" style={{ fontFamily: SORA, color: t.textPrimary }}>
            {fmtUGX(summary?.total_monthly_recurring_budget || 0)}
          </div>
          <div className="mt-1 text-xs" style={{ color: t.textMuted }}>
            {summary?.total_active_profiles || 0} active standing profiles for {MONTH_NAMES[currentMonth]}
          </div>
        </div>

        {/* KPI 2: Paid This Month & Progress */}
        <div
          className="rounded-2xl p-5 shadow-sm transition-all"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.cardBorder}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textMuted }}>
              Settled This Month
            </span>
            <div
              className="p-2 rounded-xl"
              style={{
                background: isDark ? 'rgba(16, 185, 129, 0.15)' : '#d1fae5',
                color: '#10b981',
              }}
            >
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold" style={{ fontFamily: SORA, color: '#10b981' }}>
            {fmtUGX(summary?.total_paid_this_month || 0)}
          </div>
          <div className="mt-2 w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${summary?.percent_paid || 0}%` }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-xs" style={{ color: t.textMuted }}>
            <span>{summary?.paid_bills_count || 0} bills paid</span>
            <span className="font-semibold">{summary?.percent_paid || 0}%</span>
          </div>
        </div>

        {/* KPI 3: Pending & Overdue Liabilities */}
        <div
          className="rounded-2xl p-5 shadow-sm transition-all"
          style={{
            background: cardGrad(isDark),
            border: `1px solid ${t.cardBorder}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: t.textMuted }}>
              Pending Liabilities
            </span>
            <div
              className="p-2 rounded-xl"
              style={{
                background: isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2',
                color: '#ef4444',
              }}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold" style={{ fontFamily: SORA, color: '#ef4444' }}>
            {fmtUGX(summary?.total_pending_this_month || 0)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs" style={{ color: t.textMuted }}>
            <span>{summary?.overdue_bills_count || 0} overdue</span>
            <span>{summary?.due_soon_count || 0} due soon</span>
          </div>
        </div>

        {/* KPI 4: Total Fixed Operating Obligations (Payroll + Utilities) */}
        <div
          className="rounded-2xl p-5 shadow-sm transition-all"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.8), rgba(15, 23, 42, 0.9))'
              : 'linear-gradient(135deg, #f0fdfa, #e0f2fe)',
            border: `1px solid ${isDark ? 'rgba(56, 189, 248, 0.3)' : '#bae6fd'}`,
          }}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
              Total Fixed School Liabilities
            </span>
            <div
              className="p-2 rounded-xl"
              style={{
                background: isDark ? 'rgba(56, 189, 248, 0.15)' : '#e0f2fe',
                color: '#0284c7',
              }}
            >
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-sky-700 dark:text-sky-300" style={{ fontFamily: SORA }}>
            {fmtUGX(combinedMonthlyObligations)}
          </div>
          <div className="mt-1 text-xs flex items-center justify-between" style={{ color: t.textMuted }}>
            <span>Payroll: {fmtUGX(monthlyPayroll)}</span>
            <span>Bills: {fmtUGX(summary?.total_monthly_recurring_budget || 0)}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        className="p-3 sm:p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs"
        style={{
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
        }}
      >
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: t.textMuted }} />
          <input
            type="text"
            placeholder="Search utility name, vendor/provider, meter or account number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl focus:outline-none transition-all"
            style={{
              background: t.inputBg,
              border: `1px solid ${t.inputBorder}`,
              color: t.textPrimary,
            }}
          />
        </div>

        {/* Filter Pills & View Mode */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl focus:outline-none cursor-pointer"
            style={{
              background: t.inputBg,
              border: `1px solid ${t.inputBorder}`,
              color: t.textPrimary,
            }}
          >
            <option value="all">All Categories</option>
            <option value="internet">Internet & Wi-Fi</option>
            <option value="electricity">Electricity & Power</option>
            <option value="water">Water & Sanitation</option>
            <option value="security">Security Services</option>
            <option value="waste">Waste & Sanitation</option>
            <option value="rent">Rent & Lease</option>
            <option value="software">Software & Digital</option>
            <option value="generator">Generator Fuel</option>
            <option value="transport">Transport Retainers</option>
          </select>

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs font-semibold rounded-xl focus:outline-none cursor-pointer"
            style={{
              background: t.inputBg,
              border: `1px solid ${t.inputBorder}`,
              color: t.textPrimary,
            }}
          >
            <option value="all">All Statuses</option>
            <option value="paid">Paid</option>
            <option value="due_soon">Due Soon</option>
            <option value="overdue">Overdue</option>
            <option value="pending">Pending</option>
          </select>

          {/* Table / Grid Toggle */}
          <div
            className="flex items-center p-1 rounded-xl"
            style={{
              background: t.inputBg,
              border: `1px solid ${t.inputBorder}`,
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'table' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredItems.length === 0 ? (
        <div
          className="p-12 rounded-2xl text-center flex flex-col items-center justify-center space-y-3"
          style={{
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
          }}
        >
          <div className="p-4 rounded-2xl bg-amber-500/10 text-amber-500">
            <Repeat className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold" style={{ color: t.textPrimary }}>
            No recurring expense profiles found
          </h3>
          <p className="text-xs max-w-sm" style={{ color: t.textMuted }}>
            {searchQuery
              ? 'Try modifying your search or filter criteria.'
              : 'Add your school regular commitments (Internet, Power, Water, Security) to track and 1-click pay each month.'}
          </p>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create First Recurring Profile</span>
          </button>
        </div>
      ) : viewMode === 'table' ? (
        /* DENSE TABLE VIEW */
        <div
          className="rounded-2xl overflow-hidden shadow-xs"
          style={{
            background: t.cardBg,
            border: `1px solid ${t.cardBorder}`,
          }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr
                  style={{
                    background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                    borderBottom: `1px solid ${t.cardBorder}`,
                    color: t.textMuted,
                  }}
                >
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Utility / Obligation</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Category & Provider</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Account / Meter</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider">Due Schedule</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Budget (UGX)</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Paid (UGX)</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-center">Status</th>
                  <th className="py-3 px-4 font-semibold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: t.cardBorder }}>
                {filteredItems.map((it) => (
                  <tr
                    key={it.id}
                    className="hover:bg-amber-500/5 transition-colors"
                    style={{ borderBottom: `1px solid ${t.cardBorder}` }}
                  >
                    {/* Title */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="p-2 rounded-xl"
                          style={{
                            background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc',
                            border: `1px solid ${t.cardBorder}`,
                          }}
                        >
                          {getCategoryIcon(it.category)}
                        </div>
                        <div>
                          <div className="font-bold text-sm" style={{ color: t.textPrimary }}>
                            {it.title}
                          </div>
                          {it.notes && (
                            <div className="text-[11px] truncate max-w-xs" style={{ color: t.textMuted }}>
                              {it.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category & Provider */}
                    <td className="py-3 px-4">
                      <div className="font-semibold" style={{ color: t.textPrimary }}>
                        {it.provider_name}
                      </div>
                      <div className="text-[11px]" style={{ color: t.textMuted }}>
                        {getCategoryLabel(it.category)}
                      </div>
                    </td>

                    {/* Account / Meter */}
                    <td className="py-3 px-4">
                      {it.account_or_meter_no ? (
                        <span
                          className="px-2 py-0.5 rounded-md text-[11px] font-mono font-semibold"
                          style={{
                            background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
                            color: t.textPrimary,
                          }}
                        >
                          {it.account_or_meter_no}
                        </span>
                      ) : (
                        <span style={{ color: t.textMuted }}>-</span>
                      )}
                    </td>

                    {/* Due Schedule */}
                    <td className="py-3 px-4">
                      <div className="font-semibold capitalize" style={{ color: t.textPrimary }}>
                        {it.frequency}
                      </div>
                      <div className="text-[11px]" style={{ color: t.textMuted }}>
                        Due on day {it.billing_day}
                      </div>
                    </td>

                    {/* Budget */}
                    <td className="py-3 px-4 text-right font-bold" style={{ color: t.textPrimary }}>
                      {fmtUGX(it.estimated_amount)}
                    </td>

                    {/* Paid */}
                    <td
                      className="py-3 px-4 text-right font-bold"
                      style={{
                        color: it.amount_paid_this_cycle > 0 ? '#10b981' : t.textMuted,
                      }}
                    >
                      {fmtUGX(it.amount_paid_this_cycle)}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3 px-4 text-center">{getStatusBadge(it.current_cycle_status, isDark)}</td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {it.current_cycle_status !== 'paid' && (
                          <button
                            type="button"
                            onClick={() => setPayingItem(it)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors"
                          >
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Pay / Record</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setHistoryItem(it)}
                          className="p-1.5 rounded-lg hover:bg-slate-500/10 transition-colors"
                          style={{ color: t.textMuted }}
                          title="Payment History"
                        >
                          <History className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setEditingProfile(it)}
                          className="p-1.5 rounded-lg hover:bg-slate-500/10 transition-colors"
                          style={{ color: t.textMuted }}
                          title="Edit Profile"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to remove recurring bill "${it.title}"?`)) {
                              deleteMutation.mutate(it.id);
                            }
                          }}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors"
                          title="Delete Bill"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* VISUAL GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((it) => (
            <div
              key={it.id}
              className="rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-4 transition-all hover:shadow-md"
              style={{
                background: t.cardBg,
                border: `1px solid ${t.cardBorder}`,
              }}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="p-2.5 rounded-xl"
                      style={{
                        background: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f8fafc',
                        border: `1px solid ${t.cardBorder}`,
                      }}
                    >
                      {getCategoryIcon(it.category)}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm leading-snug" style={{ color: t.textPrimary }}>
                        {it.title}
                      </h4>
                      <div className="text-xs" style={{ color: t.textMuted }}>
                        {it.provider_name}
                      </div>
                    </div>
                  </div>
                  {getStatusBadge(it.current_cycle_status, isDark)}
                </div>

                {it.account_or_meter_no && (
                  <div className="mt-3 flex items-center gap-1.5 text-xs">
                    <span style={{ color: t.textMuted }}>Account/Meter:</span>
                    <span
                      className="px-2 py-0.5 rounded font-mono font-semibold text-[11px]"
                      style={{
                        background: isDark ? 'rgba(255, 255, 255, 0.06)' : '#f1f5f9',
                        color: t.textPrimary,
                      }}
                    >
                      {it.account_or_meter_no}
                    </span>
                  </div>
                )}

                {it.notes && (
                  <p className="mt-2 text-xs leading-relaxed" style={{ color: t.textMuted }}>
                    {it.notes}
                  </p>
                )}
              </div>

              {/* Financial Status Box */}
              <div
                className="p-3 rounded-xl space-y-1.5"
                style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.02)',
                  border: `1px solid ${t.cardBorder}`,
                }}
              >
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: t.textMuted }}>Monthly Budget:</span>
                  <span className="font-bold" style={{ color: t.textPrimary }}>
                    {fmtUGX(it.estimated_amount)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span style={{ color: t.textMuted }}>Paid for {MONTH_NAMES[currentMonth]}:</span>
                  <span
                    className="font-bold"
                    style={{ color: it.amount_paid_this_cycle > 0 ? '#10b981' : t.textMuted }}
                  >
                    {fmtUGX(it.amount_paid_this_cycle)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/50 dark:border-slate-800/50">
                  <span style={{ color: t.textMuted }}>Billing Due Day:</span>
                  <span className="font-semibold" style={{ color: t.textPrimary }}>
                    Day {it.billing_day} of month
                  </span>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setHistoryItem(it)}
                    className="p-2 rounded-lg hover:bg-slate-500/10 transition-colors"
                    style={{ color: t.textMuted }}
                    title="Payment History"
                  >
                    <History className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingProfile(it)}
                    className="p-2 rounded-lg hover:bg-slate-500/10 transition-colors"
                    style={{ color: t.textMuted }}
                    title="Edit Profile"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to remove recurring bill "${it.title}"?`)) {
                        deleteMutation.mutate(it.id);
                      }
                    }}
                    className="p-2 rounded-lg hover:bg-rose-500/10 text-rose-500 transition-colors"
                    title="Delete Bill"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {it.current_cycle_status !== 'paid' ? (
                  <button
                    type="button"
                    onClick={() => setPayingItem(it)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Pay / Record</span>
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-emerald-500 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Paid</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---------------- MODALS ---------------- */}

      {/* 1. Add / Edit Recurring Expense Modal */}
      {(addModalOpen || editingProfile) && (
        <AddOrEditProfileModal
          isDark={isDark}
          t={t}
          initialProfile={editingProfile}
          onClose={() => {
            setAddModalOpen(false);
            setEditingProfile(null);
          }}
          onSave={(input) => {
            if (editingProfile) {
              updateMutation.mutate({ id: editingProfile.id, input });
            } else {
              createMutation.mutate(input as CreateRecurringExpenseInput);
            }
          }}
        />
      )}

      {/* 2. Record Payment & Post Expense Modal */}
      {payingItem && (
        <PayRecurringExpenseModal
          isDark={isDark}
          t={t}
          item={payingItem}
          year={currentYear}
          month={currentMonth}
          onClose={() => setPayingItem(null)}
          onConfirm={(input) => payMutation.mutate(input)}
          isSubmitting={payMutation.isPending}
        />
      )}

      {/* 3. History Modal */}
      {historyItem && schoolId && (
        <HistoryModal
          isDark={isDark}
          t={t}
          schoolId={schoolId}
          profile={historyItem}
          onClose={() => setHistoryItem(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
// SUBCOMPONENT: Add or Edit Profile Modal
// ---------------------------------------------------------------------

function AddOrEditProfileModal({
  isDark,
  t,
  initialProfile,
  onClose,
  onSave,
}: {
  isDark: boolean;
  t: any;
  initialProfile: RecurringExpense | null;
  onClose: () => void;
  onSave: (input: Partial<CreateRecurringExpenseInput>) => void;
}) {
  const [title, setTitle] = useState(initialProfile?.title || '');
  const [category, setCategory] = useState<RecurringExpenseCategory>(initialProfile?.category || 'internet');
  const [providerName, setProviderName] = useState(initialProfile?.provider_name || '');
  const [accountOrMeterNo, setAccountOrMeterNo] = useState(initialProfile?.account_or_meter_no || '');
  const [frequency, setFrequency] = useState<RecurringExpenseFrequency>(initialProfile?.frequency || 'monthly');
  const [billingDay, setBillingDay] = useState(initialProfile?.billing_day || 1);
  const [estimatedAmount, setEstimatedAmount] = useState(initialProfile?.estimated_amount || 350000);
  const [paymentMethod, setPaymentMethod] = useState<PreferredPaymentMethod>(
    initialProfile?.payment_method_preferred || 'bank'
  );
  const [notes, setNotes] = useState(initialProfile?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !providerName.trim() || estimatedAmount <= 0) {
      alert('Please provide title, service provider, and a valid estimated amount.');
      return;
    }

    onSave({
      title,
      category,
      provider_name: providerName,
      account_or_meter_no: accountOrMeterNo || null,
      frequency,
      billing_day: Number(billingDay),
      estimated_amount: Number(estimatedAmount),
      payment_method_preferred: paymentMethod,
      notes: notes || null,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/30 overflow-y-auto"
      onClick={onClose}
    >
      {/* Apple iOS Liquid Glass Card - Same as Login Page */}
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-lg p-5 sm:p-7 rounded-[28px] 
          bg-slate-950/70 dark:bg-black/75 
          backdrop-blur-xl backdrop-saturate-[160%] 
          border border-white/30 border-t-white/60 border-l-white/40 border-b-white/20 
          shadow-[0_24px_60px_rgba(0,0,0,0.5),inset_0_1.5px_2px_rgba(255,255,255,0.45),inset_0_-1px_1px_rgba(255,255,255,0.15)] 
          my-auto overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Liquid Glass Specular Sheen (iOS Liquid Edge) */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
        {/* Subtle diagonal liquid light rays */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/15 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/25 flex items-center justify-center text-emerald-300 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] shrink-0">
              <Repeat className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight drop-shadow-sm">
                {initialProfile ? 'Edit Recurring Bill Profile' : 'Add New Recurring Bill / Utility'}
              </h3>
              <p className="text-[11px] text-white/70">
                Regular institutional operational commitment
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white/70 hover:text-white transition active:scale-95"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs relative z-10">
          <div>
            <label className="block mb-1 text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm">
              Bill / Commitment Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Campus Wi-Fi & Dedicated Internet"
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/25 bg-black/30 hover:border-white/40 focus:border-white/80 focus:bg-black/45 backdrop-blur-md text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] transition"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm">
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as RecurringExpenseCategory)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/25 bg-black/30 hover:border-white/40 focus:border-white/80 focus:bg-black/45 backdrop-blur-md text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] transition"
              >
                <option value="internet" className="bg-slate-900 text-white">Internet & Wi-Fi</option>
                <option value="electricity" className="bg-slate-900 text-white">Electricity & Power</option>
                <option value="water" className="bg-slate-900 text-white">Water & Sanitation</option>
                <option value="security" className="bg-slate-900 text-white">Security Guard Services</option>
                <option value="waste" className="bg-slate-900 text-white">Waste & Sanitation</option>
                <option value="rent" className="bg-slate-900 text-white">Rent & Campus Ground Lease</option>
                <option value="software" className="bg-slate-900 text-white">Software & Digital</option>
                <option value="generator" className="bg-slate-900 text-white">Generator Fuel & Maintenance</option>
                <option value="transport" className="bg-slate-900 text-white">Transport Retainers</option>
                <option value="other" className="bg-slate-900 text-white">Other Standing Commitment</option>
              </select>
            </div>

            <div>
              <label className="block mb-1 text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm">
                Vendor / Service Provider *
              </label>
              <input
                type="text"
                required
                value={providerName}
                onChange={(e) => setProviderName(e.target.value)}
                placeholder="e.g. MTN Business, UMEME, NWSC"
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/25 bg-black/30 hover:border-white/40 focus:border-white/80 focus:bg-black/45 backdrop-blur-md text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm">
                Account / Meter / Contract Number
              </label>
              <input
                type="text"
                value={accountOrMeterNo}
                onChange={(e) => setAccountOrMeterNo(e.target.value)}
                placeholder="e.g. YAKA-99482910"
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/25 bg-black/30 hover:border-white/40 focus:border-white/80 focus:bg-black/45 backdrop-blur-md text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] transition font-mono"
              />
            </div>

            <div>
              <label className="block mb-1 text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm">
                Billing Due Day (1-31) *
              </label>
              <input
                type="number"
                min={1}
                max={31}
                required
                value={billingDay}
                onChange={(e) => setBillingDay(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/25 bg-black/30 hover:border-white/40 focus:border-white/80 focus:bg-black/45 backdrop-blur-md text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm">
                Estimated Budget Amount (UGX) *
              </label>
              <input
                type="number"
                min={0}
                required
                value={estimatedAmount}
                onChange={(e) => setEstimatedAmount(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/25 bg-black/30 hover:border-white/40 focus:border-white/80 focus:bg-black/45 backdrop-blur-md text-emerald-300 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] transition"
              />
            </div>

            <div>
              <label className="block mb-1 text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm">
                Preferred Payment Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PreferredPaymentMethod)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/25 bg-black/30 hover:border-white/40 focus:border-white/80 focus:bg-black/45 backdrop-blur-md text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] transition"
              >
                <option value="bank" className="bg-slate-900 text-white">Bank Transfer</option>
                <option value="mobile_money" className="bg-slate-900 text-white">Mobile Money (MTN / Airtel)</option>
                <option value="cash" className="bg-slate-900 text-white">Cash Voucher</option>
                <option value="cheque" className="bg-slate-900 text-white">Cheque</option>
                <option value="other" className="bg-slate-900 text-white">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block mb-1 text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm">
              Notes / Account Specification
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. 50Mbps fiber optic router located in main office server rack."
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/25 bg-black/30 hover:border-white/40 focus:border-white/80 focus:bg-black/45 backdrop-blur-md text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] transition"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/15">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-md transition-all active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-[#00873E] to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-xs tracking-wide shadow-[0_10px_24px_rgba(0,135,62,0.45),inset_0_1.5px_1px_rgba(255,255,255,0.45)] border border-emerald-300/30 transition-all active:scale-[0.98] flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{initialProfile ? 'Save Changes' : 'Create Profile'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------
// SUBCOMPONENT: Pay Recurring Expense Modal
// ---------------------------------------------------------------------

function PayRecurringExpenseModal({
  isDark,
  t,
  item,
  year,
  month,
  onClose,
  onConfirm,
  isSubmitting,
}: {
  isDark: boolean;
  t: any;
  item: RecurringExpenseWithCycle;
  year: number;
  month: number;
  onClose: () => void;
  onConfirm: (input: RecordRecurringPaymentInput) => void;
  isSubmitting: boolean;
}) {
  const [amountPaid, setAmountPaid] = useState(item.estimated_amount);
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PreferredPaymentMethod>(
    item.payment_method_preferred || 'bank'
  );
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (amountPaid <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    onConfirm({
      recurring_expense_id: item.id,
      period_year: year,
      period_month: month,
      amount_paid: Number(amountPaid),
      payment_date: paymentDate,
      payment_method: paymentMethod,
      reference_no: referenceNo || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/30 overflow-y-auto"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="relative z-10 w-full max-w-md p-5 sm:p-7 rounded-[28px] 
          bg-slate-950/70 dark:bg-black/75 
          backdrop-blur-xl backdrop-saturate-[160%] 
          border border-white/30 border-t-white/60 border-l-white/40 border-b-white/20 
          shadow-[0_24px_60px_rgba(0,0,0,0.5),inset_0_1.5px_2px_rgba(255,255,255,0.45),inset_0_-1px_1px_rgba(255,255,255,0.15)] 
          my-auto overflow-hidden text-white space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Liquid Glass Specular Sheen (iOS Liquid Edge) */}
        <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none" />
        {/* Subtle diagonal liquid light rays */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-emerald-400/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between pb-3 border-b border-white/15 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/25 flex items-center justify-center text-emerald-300 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)] shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight drop-shadow-sm">
                Pay & Record Expense
              </h3>
              <p className="text-[11px] text-white/70">
                Posts directly to school expense ledger
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white/70 hover:text-white transition active:scale-95"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Bill Summary Glass Banner */}
        <div className="p-3.5 rounded-2xl bg-white/10 border border-white/20 text-xs text-white space-y-1 backdrop-blur-md relative z-10 shadow-[inset_0_1px_2px_rgba(255,255,255,0.15)]">
          <div className="font-bold text-sm text-white">
            {item.title}
          </div>
          <div className="flex items-center justify-between text-white/75 text-[11px]">
            <span>Provider: {item.provider_name}</span>
            <span>Period: {MONTH_NAMES[month]} {year}</span>
          </div>
          {item.account_or_meter_no && (
            <div className="font-mono text-[11px] text-emerald-300">
              Account/Meter: {item.account_or_meter_no}
            </div>
          )}
        </div>

        <form onSubmit={handlePay} className="space-y-3.5 text-xs relative z-10">
          <div>
            <label className="block mb-1 text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm">
              Actual Paid Amount (UGX) *
            </label>
            <input
              type="number"
              min={1}
              required
              value={amountPaid}
              onChange={(e) => setAmountPaid(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/25 bg-black/30 hover:border-white/40 focus:border-white/80 focus:bg-black/45 backdrop-blur-md text-emerald-300 font-bold text-base focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block mb-1 text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm">
                Payment Date *
              </label>
              <input
                type="date"
                required
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/25 bg-black/30 hover:border-white/40 focus:border-white/80 focus:bg-black/45 backdrop-blur-md text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] transition"
              />
            </div>

            <div>
              <label className="block mb-1 text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm">
                Payment Method *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PreferredPaymentMethod)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/25 bg-black/30 hover:border-white/40 focus:border-white/80 focus:bg-black/45 backdrop-blur-md text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] transition"
              >
                <option value="bank" className="bg-slate-900 text-white">Bank Transfer</option>
                <option value="mobile_money" className="bg-slate-900 text-white">Mobile Money</option>
                <option value="cash" className="bg-slate-900 text-white">Cash Voucher</option>
                <option value="cheque" className="bg-slate-900 text-white">Cheque</option>
                <option value="other" className="bg-slate-900 text-white">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block mb-1 text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm">
              Transaction / Reference Number
            </label>
            <input
              type="text"
              value={referenceNo}
              onChange={(e) => setReferenceNo(e.target.value)}
              placeholder="e.g. YAKA Token #, MoMo Ref, Bank Slip #"
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/25 bg-black/30 hover:border-white/40 focus:border-white/80 focus:bg-black/45 backdrop-blur-md text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] transition font-mono"
            />
          </div>

          <div>
            <label className="block mb-1 text-[11px] font-bold text-white/90 uppercase tracking-wider drop-shadow-sm">
              Payment Voucher Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Units purchased: 580kWh / 1 month renewal"
              className="w-full px-3.5 py-2.5 rounded-xl border border-white/25 bg-black/30 hover:border-white/40 focus:border-white/80 focus:bg-black/45 backdrop-blur-md text-white placeholder-white/40 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.3)] transition"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/15">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-white/80 hover:text-white bg-white/10 hover:bg-white/15 border border-white/20 backdrop-blur-md transition-all active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 via-[#00873E] to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-black text-xs tracking-wide shadow-[0_10px_24px_rgba(0,135,62,0.45),inset_0_1.5px_1px_rgba(255,255,255,0.45)] border border-emerald-300/30 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSubmitting ? 'Posting Expense...' : 'Confirm & Post to Expenses'}</span>
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------
// SUBCOMPONENT: Payment History Audit Modal
// ---------------------------------------------------------------------

function HistoryModal({
  isDark,
  t,
  schoolId,
  profile,
  onClose,
}: {
  isDark: boolean;
  t: any;
  schoolId: string;
  profile: RecurringExpense;
  onClose: () => void;
}) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['recurring-history', schoolId, profile.id],
    queryFn: () => fetchProfilePaymentHistory(schoolId, profile.id),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col"
        style={{
          background: t.cardBg,
          border: `1px solid ${t.cardBorder}`,
          color: t.textPrimary,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-500">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ fontFamily: SORA }}>
                Payment Audit History
              </h3>
              <p className="text-xs" style={{ color: t.textMuted }}>
                {profile.title} ({profile.provider_name})
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-slate-500/10 text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 text-xs">
          {isLoading ? (
            <div className="p-6 text-center" style={{ color: t.textMuted }}>
              Loading payment history...
            </div>
          ) : history.length === 0 ? (
            <div className="p-8 text-center" style={{ color: t.textMuted }}>
              No recorded payments yet for this utility.
            </div>
          ) : (
            history.map((h) => (
              <div
                key={h.id}
                className="p-3 rounded-xl flex items-center justify-between"
                style={{
                  background: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
                  border: `1px solid ${t.cardBorder}`,
                }}
              >
                <div>
                  <div className="font-bold text-sm" style={{ color: t.textPrimary }}>
                    {h.period_label}
                  </div>
                  <div className="text-[11px] flex items-center gap-2" style={{ color: t.textMuted }}>
                    <span>Paid on {h.payment_date}</span>
                    <span>via {h.payment_method}</span>
                    {h.reference_no && <span>(Ref: {h.reference_no})</span>}
                  </div>
                  {h.notes && (
                    <div className="text-[11px] mt-0.5" style={{ color: t.textMuted }}>
                      {h.notes}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-500 text-sm">
                    {fmtUGX(h.amount_paid)}
                  </div>
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Settled</span>
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
