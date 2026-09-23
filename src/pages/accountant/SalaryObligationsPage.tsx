import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useOutletContext, useNavigate } from 'react-router-dom';
import {
  Banknote,
  Users,
  Calendar,
  DollarSign,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  ArrowUpRight,
  UtensilsCrossed,
  Layers,
  LayoutGrid,
  Table as TableIcon,
  Phone,
  ShieldCheck,
  Repeat,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import {
  fetchStaffSalaryObligations,
  type StaffObligationRow,
} from '@/features/payroll-obligations/services/salaryObligationService';
import { fetchRecurringExpenses } from '@/features/recurring-expenses/services/recurringExpenseService';
import { fetchStoreItems, computeStoreKpis } from '@/features/store-inventory/services/storeInventoryService';
import AdminContentSkeleton from '@/components/layout/AdminContentSkeleton';

function fmtUGX(amount: number): string {
  return `UGX ${Math.round(amount).toLocaleString('en-US')}`;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

type OutletContextType = {
  openRecordExpense?: () => void;
};

export default function SalaryObligationsPage() {
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);
  const { openRecordExpense } = useOutletContext<OutletContextType>() || {};

  const [currentYear, setCurrentYear] = useState(() => new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(() => new Date().getMonth());
  const [activeTab, setActiveTab] = useState<'all' | 'teachers' | 'non_teaching'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [frequencyFilter, setFrequencyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  // Fetch store items to get daily food burn rate
  const { data: storeItems = [] } = useQuery({
    queryKey: ['store-items', schoolId],
    queryFn: () => (schoolId ? fetchStoreItems(schoolId) : Promise.resolve([])),
    enabled: Boolean(schoolId),
  });

  const dailyFoodBurn = useMemo(() => {
    const kpis = computeStoreKpis(storeItems);
    return kpis.daily_food_burn_rate;
  }, [storeItems]);

  // Fetch salary obligations
  const {
    data: salaryData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['salary-obligations', schoolId, currentYear, currentMonth, dailyFoodBurn],
    queryFn: () =>
      schoolId
        ? fetchStaffSalaryObligations(schoolId, currentYear, currentMonth, dailyFoodBurn)
        : Promise.resolve({ rows: [], summary: {} as any }),
    enabled: Boolean(schoolId),
  });

  const { rows = [], summary } = salaryData || {};

  // Fetch recurring operational expenses for the same period
  const { data: recurringData } = useQuery({
    queryKey: ['recurring-expenses', schoolId, currentYear, currentMonth],
    queryFn: () =>
      schoolId
        ? fetchRecurringExpenses(schoolId, currentYear, currentMonth)
        : Promise.resolve({ items: [], summary: {} as any }),
    enabled: Boolean(schoolId),
  });

  const recurringSummary = recurringData?.summary;
  const totalCombinedFixedCommitments =
    (summary?.total_monthly_payroll_obligation || 0) + (recurringSummary?.total_monthly_recurring_budget || 0);

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      const matchQ =
        !searchQuery.trim() ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.role_or_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.department && r.department.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchTab = true;
      if (activeTab === 'teachers') matchTab = r.kind === 'teacher';
      if (activeTab === 'non_teaching') matchTab = r.kind === 'other_staff';

      let matchStatus = true;
      if (statusFilter !== 'all') matchStatus = r.payment_status === statusFilter;

      let matchFreq = true;
      if (frequencyFilter !== 'all') matchFreq = r.pay_frequency === frequencyFilter;

      return matchQ && matchTab && matchStatus && matchFreq;
    });
  }, [rows, searchQuery, activeTab, statusFilter, frequencyFilter]);

  if (isLoading) {
    return (
      <div className="w-full min-h-screen px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <AdminContentSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-500 mb-1">
            <Banknote className="w-4 h-4" />
            <span>Workforce Expenditure & Liquidity Planning</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Staff Salary Obligations & Cash Flow
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Expected salary commitments for teachers and non-teaching staff (daily, weekly, monthly) alongside daily operational burn rates.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Month & Year Selectors */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
            <select
              value={currentMonth}
              onChange={(e) => setCurrentMonth(Number(e.target.value))}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              {MONTH_NAMES.map((m, idx) => (
                <option key={m} value={idx}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={currentYear}
              onChange={(e) => setCurrentYear(Number(e.target.value))}
              className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-transparent text-slate-800 dark:text-slate-200 focus:outline-none"
            >
              {[2024, 2025, 2026, 2027].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => {
              if (openRecordExpense) {
                openRecordExpense();
              } else {
                navigate('/dashboard/accountant/expenses');
              }
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md transition-colors"
          >
            <Banknote className="w-4 h-4" />
            <span>Pay Salary / Record Expense</span>
          </button>
        </div>
      </div>

      {/* Module Switcher Tab Bar */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 w-fit">
        <button
          type="button"
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-white dark:bg-slate-900 text-teal-600 dark:text-teal-400 shadow-xs"
        >
          <Banknote className="w-3.5 h-3.5" />
          <span>Staff Salary Obligations</span>
        </button>
        <button
          type="button"
          onClick={() => navigate('/dashboard/accountant/recurring-expenses')}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
        >
          <Repeat className="w-3.5 h-3.5 text-amber-500" />
          <span>Recurring Utilities & Standing Bills</span>
          {recurringSummary && recurringSummary.total_pending_this_month > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold">
              {recurringSummary.overdue_bills_count + recurringSummary.due_soon_count > 0
                ? `${recurringSummary.overdue_bills_count + recurringSummary.due_soon_count} due`
                : `${recurringSummary.total_active_profiles} active`}
            </span>
          )}
        </button>
      </div>

      {/* Combined Fixed School Operating Liabilities Banner */}
      <div className="p-4 rounded-2xl border border-teal-200/80 dark:border-teal-900/60 bg-gradient-to-r from-teal-500/10 via-sky-500/10 to-amber-500/10 dark:from-teal-950/30 dark:via-sky-950/30 dark:to-amber-950/30 backdrop-blur-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-teal-500/20 text-teal-600 dark:text-teal-400">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
              Total Fixed Monthly Operating Commitments ({MONTH_NAMES[currentMonth]} {currentYear})
            </div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
              <span>{fmtUGX(totalCombinedFixedCommitments)}</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                (Staff Payroll: {fmtUGX(summary?.total_monthly_payroll_obligation || 0)} + Standing Utilities: {fmtUGX(recurringSummary?.total_monthly_recurring_budget || 0)})
              </span>
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/dashboard/accountant/recurring-expenses')}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-xs transition-colors self-start md:self-auto"
        >
          <Repeat className="w-3.5 h-3.5 text-amber-500" />
          <span>Review Standing Bills</span>
          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* KPI Cards: Operational & Salary Commitments */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Monthly Total Salary Obligation */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-5 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Total Monthly Payroll Bill
            </span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400">
              <Banknote className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
            {fmtUGX(summary?.total_monthly_payroll_obligation || 0)}
          </div>
          <div className="mt-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Teachers: {fmtUGX(summary?.teachers_monthly_obligation || 0)}</span>
            <span>Support: {fmtUGX(summary?.other_staff_monthly_obligation || 0)}</span>
          </div>
        </div>

        {/* KPI 2: Daily Casual Wage Commitment */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-5 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Daily Casual Wage Obligation
            </span>
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-blue-600 dark:text-blue-400">
            {fmtUGX(summary?.daily_wage_obligation || 0)}
            <span className="text-xs font-normal text-slate-500 dark:text-slate-400"> /day</span>
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Daily cash required for casual/day-rate staff
          </div>
        </div>

        {/* KPI 3: Combined Daily Operational Burn Rate */}
        <div className="rounded-2xl border border-amber-300 dark:border-amber-900/60 bg-amber-50/70 dark:bg-amber-950/20 p-5 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
              Combined Daily Burn Rate
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-900 dark:text-amber-200">
            {fmtUGX(summary?.combined_daily_burn_rate || 0)}
            <span className="text-xs font-normal text-amber-700/80 dark:text-amber-400/80"> /day</span>
          </div>
          <div className="mt-1 text-xs text-amber-700/80 dark:text-amber-400/80 flex items-center justify-between">
            <span>Kitchen food: {fmtUGX(dailyFoodBurn)}</span>
            <span>+ Daily wages: {fmtUGX(summary?.daily_wage_obligation || 0)}</span>
          </div>
        </div>

        {/* KPI 4: Pending Salary Liability This Month */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-5 shadow-sm backdrop-blur-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Pending Salary Liability
            </span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">
            {fmtUGX(summary?.total_pending_liability_this_month || 0)}
          </div>
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Paid so far: <span className="font-semibold text-emerald-600">{fmtUGX(summary?.total_paid_this_month || 0)}</span>
          </div>
        </div>
      </div>

      {/* Tabs & Filters Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white/60 dark:bg-slate-900/50 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 backdrop-blur-md">
        {/* Tab Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            All Staff ({summary?.total_staff_count || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('teachers')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'teachers'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Teachers ({summary?.total_teachers_count || 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('non_teaching')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'non_teaching'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
            }`}
          >
            Support & Non-Teaching ({summary?.total_other_staff_count || 0})
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap flex-1 justify-end">
          <div className="relative max-w-xs flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search staff by name or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
            />
          </div>

          <select
            value={frequencyFilter}
            onChange={(e) => setFrequencyFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Pay Frequencies</option>
            <option value="daily">Daily Paid</option>
            <option value="weekly">Weekly Paid</option>
            <option value="monthly">Monthly Paid</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Payment Statuses</option>
            <option value="unpaid">Unpaid This Month</option>
            <option value="partial">Partially Paid</option>
            <option value="paid">Fully Paid</option>
          </select>

          {/* View Toggle */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
              title="Table View"
            >
              <TableIcon className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content: Table or Cards */}
      {filteredRows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
            No staff records matched
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
            Try adjusting your search query, tab, or frequency filter to view staff salary commitments.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 overflow-hidden shadow-sm backdrop-blur-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Staff Member</th>
                  <th className="px-4 py-3.5">Department & Role</th>
                  <th className="px-4 py-3.5">Pay Frequency</th>
                  <th className="px-4 py-3.5">Agreed Base Salary</th>
                  <th className="px-4 py-3.5">Monthly Equivalent</th>
                  <th className="px-4 py-3.5">Paid This Month</th>
                  <th className="px-4 py-3.5">Balance Pending</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredRows.map((staff) => {
                  const isPaid = staff.payment_status === 'paid';
                  const isPartial = staff.payment_status === 'partial';

                  return (
                    <tr
                      key={staff.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {staff.name}
                        </div>
                        {staff.phone && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{staff.phone}</span>
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-800 dark:text-slate-200">
                          {staff.role_or_title}
                        </div>
                        <div className="text-[11px] text-slate-400">{staff.department || '—'}</div>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            staff.pay_frequency === 'daily'
                              ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-300'
                              : staff.pay_frequency === 'weekly'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950/40 dark:text-purple-300'
                              : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                          }`}
                        >
                          {staff.pay_frequency}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-semibold text-slate-900 dark:text-slate-100">
                        {fmtUGX(staff.base_salary)}
                        <span className="text-[10px] text-slate-400 font-normal">
                          {' '}
                          /{staff.pay_frequency}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 font-bold text-slate-800 dark:text-slate-200">
                        {fmtUGX(staff.monthly_equivalent)}
                      </td>

                      <td className="px-4 py-3.5 text-emerald-600 dark:text-emerald-400 font-semibold">
                        {fmtUGX(staff.amount_paid_this_month)}
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`font-bold ${
                            staff.balance_due > 0
                              ? 'text-rose-600 dark:text-rose-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {fmtUGX(staff.balance_due)}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                            isPaid
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                              : isPartial
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                          }`}
                        >
                          {isPaid ? (
                            <>
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Paid</span>
                            </>
                          ) : isPartial ? (
                            <>
                              <Clock className="w-3 h-3" />
                              <span>Partial</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3 h-3" />
                              <span>Unpaid</span>
                            </>
                          )}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            if (openRecordExpense) {
                              openRecordExpense();
                            } else {
                              navigate('/dashboard/accountant/expenses');
                            }
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 transition-colors"
                        >
                          <Banknote className="w-3 h-3" />
                          <span>Pay Salary</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRows.map((staff) => {
            const isPaid = staff.payment_status === 'paid';
            const isPartial = staff.payment_status === 'partial';

            return (
              <div
                key={staff.id}
                className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-900/70 p-5 shadow-sm backdrop-blur-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                        {staff.kind === 'teacher' ? 'Teaching Staff' : 'Support Staff'}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                        {staff.name}
                      </h3>
                      <div className="text-xs text-slate-500">{staff.role_or_title}</div>
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        isPaid
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300'
                          : isPartial
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
                      }`}
                    >
                      {isPaid ? 'Fully Paid' : isPartial ? 'Partially Paid' : 'Unpaid'}
                    </span>
                  </div>

                  <div className="mt-4 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">
                        Agreed Wage
                      </div>
                      <div className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {fmtUGX(staff.base_salary)}
                        <span className="text-xs font-normal text-slate-400">
                          {' '}
                          /{staff.pay_frequency}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">
                        Monthly Total
                      </div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200">
                        {fmtUGX(staff.monthly_equivalent)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Paid this month:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {fmtUGX(staff.amount_paid_this_month)}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Remaining balance:</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        {fmtUGX(staff.balance_due)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      if (openRecordExpense) {
                        openRecordExpense();
                      } else {
                        navigate('/dashboard/accountant/expenses');
                      }
                    }}
                    className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors"
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    <span>Pay Salary Line</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
