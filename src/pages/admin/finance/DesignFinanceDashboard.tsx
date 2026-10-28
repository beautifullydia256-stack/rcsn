import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  TrendingDown,
  TrendingUp,
  Scale,
  Wallet,
  CircleDollarSign,
  ArrowRight,
  RefreshCw,
  Plus,
  Users,
  CreditCard,
  Building2,
  FileText,
  BarChart3,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import { ADMIN_GC_TIME_MS, ADMIN_STALE_TIME_MS } from '@/lib/adminQueryDefaults';
import { adminQueryKeys } from '@/pages/admin/api/adminQueryKeys';
import { GovPageLoader } from '@/components/ui/GovLoadingIndicator';
import '@/styles/government-system.css';

function fmt(n: number): string {
  return `UGX ${Math.round(n).toLocaleString()}`;
}

export type FinanceDashboardData = {
  totalExpected: number;
  totalCollected: number;
  totalOutstanding: number;
  totalExpenses: number;
  netPosition: number;
  collectionRate: number;
  studentsCleared: number;
  studentsOwing: number;
  monthlyPayments: Record<number, number>;
  monthlyExpenses: Record<number, number>;
  recentPayments: {
    amount_paid: number;
    payment_date: string | null;
    payment_method: string | null;
    student_id: string;
    student_name: string;
  }[];
  recentExpenses: {
    amount: number;
    expense_date: string | null;
    category_name: string | null;
    description: string | null;
    status: string | null;
  }[];
  topOutstanding: { student_id: string; name: string; current_class: string; balance: number }[];
};

export async function fetchFinanceDashboard(userId: string): Promise<FinanceDashboardData> {
  const { data: me } = await supabase.from('users').select('school_id').eq('user_id', userId).single();
  const schoolId = me?.school_id as string | undefined;
  if (!schoolId) {
    return {
      totalExpected: 0,
      totalCollected: 0,
      totalOutstanding: 0,
      totalExpenses: 0,
      netPosition: 0,
      collectionRate: 0,
      studentsCleared: 0,
      studentsOwing: 0,
      monthlyPayments: {},
      monthlyExpenses: {},
      recentPayments: [],
      recentExpenses: [],
      topOutstanding: [],
    };
  }

  const year = new Date().getFullYear();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const [balancesRes, paysRes, expensesRes, studsRes, paysRecentRes, expRecentRes] = await Promise.all([
    supabase.from('student_balances').select('student_id, total_fees, total_paid, balance').eq('school_id', schoolId),
    supabase
      .from('student_payments')
      .select('amount_paid, payment_date')
      .eq('school_id', schoolId)
      .gte('payment_date', yearStart)
      .lte('payment_date', yearEnd),
    supabase
      .from('school_expenses')
      .select('amount, expense_date, status')
      .eq('school_id', schoolId)
      .gte('expense_date', yearStart)
      .lte('expense_date', yearEnd),
    supabase.from('students').select('student_id, name, current_class, status, expected_fee_amount').eq('school_id', schoolId).eq('status', 'active'),
    supabase
      .from('student_payments')
      .select('amount_paid, payment_date, payment_method, student_id')
      .eq('school_id', schoolId)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('school_expenses')
      .select('amount, expense_date, status, category_name, description')
      .eq('school_id', schoolId)
      .order('expense_date', { ascending: false })
      .limit(8),
  ]);

  const balances = balancesRes.data || [];
  const paysYear = paysRes.data || [];
  const expensesYear = expensesRes.data || [];
  const students = studsRes.data || [];

  let totalExpected = 0;
  let totalCollected = 0;
  let totalOutstanding = 0;

  if (balances.length > 0) {
    for (const b of balances) {
      totalExpected += Number((b as { total_fees?: number }).total_fees ?? 0);
      totalCollected += Number((b as { total_paid?: number }).total_paid ?? 0);
      totalOutstanding += Math.max(0, Number((b as { balance?: number }).balance ?? 0));
    }
  } else {
    const allPays = await supabase.from('student_payments').select('student_id, amount_paid').eq('school_id', schoolId);
    const paidByStudent: Record<string, number> = {};
    for (const p of allPays.data || []) {
      const sid = (p as { student_id: string }).student_id;
      paidByStudent[sid] = (paidByStudent[sid] || 0) + Number((p as { amount_paid?: number }).amount_paid ?? 0);
    }
    for (const s of students) {
      const sid = (s as { student_id: string }).student_id;
      const exp = Number((s as { expected_fee_amount?: number }).expected_fee_amount ?? 0);
      const paid = paidByStudent[sid] || 0;
      totalExpected += exp;
      totalCollected += paid;
      totalOutstanding += Math.max(0, exp - paid);
    }
  }

  const expenseApproved = expensesYear.filter((e) => ['approved', 'paid'].includes(String((e as { status?: string }).status || '')));
  const totalExpenses = expenseApproved.reduce((s, e) => s + Number((e as { amount?: number }).amount ?? 0), 0);

  const owingByStudent = new Map<string, number>();
  if (balances.length > 0) {
    for (const b of balances) {
      const sid = (b as { student_id: string }).student_id;
      const bal = Math.max(0, Number((b as { balance?: number }).balance ?? 0));
      owingByStudent.set(sid, (owingByStudent.get(sid) || 0) + bal);
    }
  }

  let studentsCleared = 0;
  let studentsOwing = 0;
  students.forEach((s) => {
    const sid = (s as { student_id: string }).student_id;
    const bal = owingByStudent.get(sid) ?? 0;
    if (bal <= 0) studentsCleared++;
    else studentsOwing++;
  });

  const netPosition = totalCollected - totalExpenses;
  const collectionRate = totalExpected > 0 ? Math.min(100, Math.round((totalCollected / totalExpected) * 100)) : 0;

  const monthlyPayments: Record<number, number> = {};
  for (const p of paysYear) {
    const dt = (p as { payment_date?: string }).payment_date;
    if (dt) {
      const m = new Date(dt).getMonth();
      monthlyPayments[m] = (monthlyPayments[m] || 0) + Number((p as { amount_paid?: number }).amount_paid ?? 0);
    }
  }

  const monthlyExpenses: Record<number, number> = {};
  for (const e of expenseApproved) {
    const dt = (e as { expense_date?: string }).expense_date;
    if (dt) {
      const m = new Date(dt).getMonth();
      monthlyExpenses[m] = (monthlyExpenses[m] || 0) + Number((e as { amount?: number }).amount ?? 0);
    }
  }

  const studentMap = new Map(students.map((s) => [(s as { student_id: string }).student_id, (s as { name?: string }).name || 'Student']));
  const recentPayments = (paysRecentRes.data || []).map((p) => {
    const sid = (p as { student_id: string }).student_id;
    return {
      amount_paid: Number((p as { amount_paid?: number }).amount_paid ?? 0),
      payment_date: (p as { payment_date?: string | null }).payment_date ?? null,
      payment_method: (p as { payment_method?: string | null }).payment_method ?? 'Cash',
      student_id: sid,
      student_name: studentMap.get(sid) || 'Student',
    };
  });

  const recentExpenses = (expRecentRes.data || []).map((e) => ({
    amount: Number((e as { amount?: number }).amount ?? 0),
    expense_date: (e as { expense_date?: string | null }).expense_date ?? null,
    category_name: (e as { category_name?: string | null }).category_name ?? null,
    description: (e as { description?: string | null }).description ?? null,
    status: (e as { status?: string | null }).status ?? null,
  }));

  const topOutstanding: { student_id: string; name: string; current_class: string; balance: number }[] = [];
  if (balances.length > 0) {
    const studInfoMap = new Map(students.map((s) => [(s as { student_id: string }).student_id, s]));
    for (const b of balances) {
      const bal = Number((b as { balance?: number }).balance ?? 0);
      if (bal > 0) {
        const sid = (b as { student_id: string }).student_id;
        const info = studInfoMap.get(sid) as { name?: string; current_class?: string } | undefined;
        topOutstanding.push({
          student_id: sid,
          name: info?.name || sid.slice(0, 8),
          current_class: info?.current_class || '—',
          balance: bal,
        });
      }
    }
  }

  topOutstanding.sort((a, b) => b.balance - a.balance);
  const top5 = topOutstanding.slice(0, 6);

  return {
    totalExpected,
    totalCollected,
    totalOutstanding,
    totalExpenses,
    netPosition,
    collectionRate,
    studentsCleared,
    studentsOwing,
    monthlyPayments,
    monthlyExpenses,
    recentPayments,
    recentExpenses,
    topOutstanding: top5,
  };
}

export default function DesignFinanceDashboard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data, isPending, refetch, isFetching } = useQuery({
    queryKey: adminQueryKeys.financeDashboard(user?.id ?? ''),
    queryFn: () => fetchFinanceDashboard(user!.id),
    enabled: !!user?.id,
    staleTime: ADMIN_STALE_TIME_MS,
    gcTime: ADMIN_GC_TIME_MS,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const now = new Date();
  const currentMonth = now.getMonth();

  const maxMonthValue = useMemo(() => {
    if (!data) return 1;
    const mp = data.monthlyPayments || {};
    const me = data.monthlyExpenses || {};
    return Math.max(1, ...months.map((_, i) => Math.max(mp[i] || 0, me[i] || 0)));
  }, [data]);

  if (isPending && !data) {
    return <GovPageLoader message="LOADING TREASURY & FINANCIAL OPERATIONS HUB..." minHeight="min-h-[50vh]" />;
  }

  const d = data;
  const totalBilled = (d?.totalCollected ?? 0) + (d?.totalOutstanding ?? 0);
  const recoveryPct = totalBilled > 0 ? Math.round(((d?.totalCollected ?? 0) / totalBilled) * 100) : 0;
  const expenseRatio = (d?.totalCollected ?? 0) > 0 ? Math.min(100, Math.round(((d?.totalExpenses ?? 0) / (d?.totalCollected ?? 1)) * 100)) : 0;

  return (
    <div className="admin-terminal-page space-y-5">
      {/* ── 1. TOP INSTITUTIONAL HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#CCCCCC] pb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[17px] font-bold tracking-tight text-[#111111] uppercase font-sans">
            INSTITUTIONAL FINANCIAL OPERATIONS HUB
          </h1>
          <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-mono font-bold bg-[#EAEAEA] text-[#222222] border border-[#CCCCCC]">
            TREASURY
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refetch()}
            className="gov-btn gov-btn-sm"
            title="Refresh Financial Ledger"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>REFRESH</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/admin/finance/financial-analytics')}
            className="gov-btn gov-btn-sm"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-700" />
            <span>ANALYTICS & AUDIT</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard/accountant')}
            className="gov-btn gov-btn-sm gov-btn-primary"
          >
            <CircleDollarSign className="w-3.5 h-3.5" />
            <span>ACCOUNTS PORTAL</span>
          </button>
        </div>
      </div>

      {/* ── 2. FIVE ELEVATED MONEY-COLORED KPI CARDS WITH PROGRESS BARS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Total Expected (Target Billed) */}
        <div className="gov-card p-4 rounded-lg border border-[#CCCCCC] bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#555555]">
              Total Billed Fees
            </span>
            <span className="p-1 bg-[#F5F5F5] text-[#333333] border border-[#CCCCCC] rounded">
              <Building2 className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl font-mono font-bold text-[#111111] mt-2">
            {fmt(d?.totalExpected ?? 0)}
          </div>
          <div className="text-[10px] text-[#666666] font-mono mt-0.5">
            Total accredited fee revenue billed
          </div>
          {/* Target Realization Bar */}
          <div className="mt-2.5">
            <div className="flex justify-between text-[10px] font-mono font-bold text-[#555555] mb-1">
              <span>ACTIVE COHORTS</span>
              <span>{d?.studentsCleared ?? 0 + (d?.studentsOwing ?? 0)} TRAINEES</span>
            </div>
            <div className="h-1.5 bg-[#EAEAEA] rounded overflow-hidden">
              <div className="h-full bg-[#111111]" style={{ width: '100%' }} />
            </div>
          </div>
        </div>

        {/* Card 2: Total Collections (Inflow - Emerald) */}
        <div className="gov-card p-4 rounded-lg border border-[#CCCCCC] border-l-4 border-l-emerald-600 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#555555]">
              Total Collections Banked
            </span>
            <span className="p-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded">
              <TrendingUp className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl font-mono font-bold text-emerald-700 mt-2">
            {fmt(d?.totalCollected ?? 0)}
          </div>
          <div className="text-[10px] text-[#666666] font-mono mt-0.5">
            Realized tuition & material fees
          </div>
          {/* Collection Progress Bar */}
          <div className="mt-2.5">
            <div className="flex justify-between text-[10px] font-mono font-bold text-[#555555] mb-1">
              <span>REALIZED</span>
              <span className="text-emerald-700">{d?.collectionRate ?? 0}%</span>
            </div>
            <div className="h-1.5 bg-[#EAEAEA] rounded overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-300"
                style={{ width: `${Math.min(100, d?.collectionRate ?? 0)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 3: Fee Arrears (Debt - Crimson Red) */}
        <div className="gov-card p-4 rounded-lg border border-[#CCCCCC] border-l-4 border-l-red-600 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#555555]">
              Total Outstanding Arrears
            </span>
            <span className="p-1 bg-red-50 text-red-700 border border-red-200 rounded">
              <Wallet className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl font-mono font-bold text-red-700 mt-2">
            {fmt(d?.totalOutstanding ?? 0)}
          </div>
          <div className="text-[10px] text-[#666666] font-mono mt-0.5">
            Unsettled ledger balances ({d?.studentsOwing ?? 0} students)
          </div>
          {/* Arrears Exposure Meter */}
          <div className="mt-2.5">
            <div className="flex justify-between text-[10px] font-mono font-bold text-[#555555] mb-1">
              <span>OWING RATE</span>
              <span className="text-red-700">{100 - (d?.collectionRate ?? 0)}%</span>
            </div>
            <div className="h-1.5 bg-[#EAEAEA] rounded overflow-hidden">
              <div
                className="h-full bg-red-600 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, 100 - (d?.collectionRate ?? 0)))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 4: Operating Expenses (Outflow - Amber) */}
        <div className="gov-card p-4 rounded-lg border border-[#CCCCCC] border-l-4 border-l-amber-600 bg-white">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#555555]">
              Operating Expenses
            </span>
            <span className="p-1 bg-amber-50 text-amber-700 border border-amber-200 rounded">
              <TrendingDown className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xl font-mono font-bold text-amber-700 mt-2">
            {fmt(d?.totalExpenses ?? 0)}
          </div>
          <div className="text-[10px] text-[#666666] font-mono mt-0.5">
            Approved requisitions & vouchers
          </div>
          {/* Expenditure Ratio Bar */}
          <div className="mt-2.5">
            <div className="flex justify-between text-[10px] font-mono font-bold text-[#555555] mb-1">
              <span>OF INFLOW</span>
              <span className="text-amber-700">{expenseRatio}%</span>
            </div>
            <div className="h-1.5 bg-[#EAEAEA] rounded overflow-hidden">
              <div
                className="h-full bg-amber-600 transition-all duration-300"
                style={{ width: `${Math.min(100, expenseRatio)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Card 5: Net Operating Margin (Surplus - Dynamic) */}
        <div
          className={`gov-card p-4 rounded-lg border border-[#CCCCCC] border-l-4 bg-white ${
            (d?.netPosition ?? 0) >= 0 ? 'border-l-emerald-600' : 'border-l-red-600'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#555555]">
              Net Operating Margin
            </span>
            <span
              className={`p-1 rounded border ${
                (d?.netPosition ?? 0) >= 0
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              <Scale className="w-3.5 h-3.5" />
            </span>
          </div>
          <div
            className={`text-xl font-mono font-bold mt-2 ${
              (d?.netPosition ?? 0) >= 0 ? 'text-[#111111]' : 'text-red-700'
            }`}
          >
            {(d?.netPosition ?? 0) < 0 ? '-' : '+'}
            {fmt(Math.abs(d?.netPosition ?? 0))}
          </div>
          <div className="text-[10px] text-[#666666] font-mono mt-0.5">
            {(d?.netPosition ?? 0) >= 0 ? 'Net Cashflow Surplus' : 'Operating Deficit'}
          </div>
          {/* Surplus Ratio Meter */}
          <div className="mt-2.5">
            <div className="flex justify-between text-[10px] font-mono font-bold text-[#555555] mb-1">
              <span>POSITION</span>
              <span className={(d?.netPosition ?? 0) >= 0 ? 'text-emerald-700' : 'text-red-700'}>
                {(d?.netPosition ?? 0) >= 0 ? 'SOLVENT' : 'DEFICIT'}
              </span>
            </div>
            <div className="h-1.5 bg-[#EAEAEA] rounded overflow-hidden">
              <div
                className={`h-full ${
                  (d?.netPosition ?? 0) >= 0 ? 'bg-emerald-600' : 'bg-red-600'
                }`}
                style={{ width: '100%' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── 3. ANNUAL CASH FLOW TRAJECTORY BARS ── */}
      <div className="gov-card p-4 rounded-lg border border-[#CCCCCC] bg-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#EAEAEA] pb-3 mb-3">
          <div>
            <h3 className="text-xs font-mono font-bold text-[#111111] uppercase tracking-wide">
              ANNUAL CASH FLOW COMPARISON · COLLECTIONS VS. EXPENDITURES ({now.getFullYear()})
            </h3>
            <p className="text-[10px] text-[#666666] font-mono mt-0.5">
              Monthly breakdown of fee deposits (emerald) vs operating disbursements (amber).
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono font-bold">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-600 inline-block" />
              <span className="text-[#111111]">COLLECTIONS</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-amber-600 inline-block" />
              <span className="text-[#111111]">EXPENDITURES</span>
            </div>
          </div>
        </div>

        {/* 12-Month Bar Visualizer */}
        <div className="grid grid-cols-6 sm:grid-cols-12 gap-2 items-end h-40 border-b border-[#CCCCCC] pb-1 pt-2">
          {months.map((m, i) => {
            const inc = d?.monthlyPayments?.[i] || 0;
            const exp = d?.monthlyExpenses?.[i] || 0;
            const incH = Math.max(4, Math.round((inc / maxMonthValue) * 110));
            const expH = Math.max(4, Math.round((exp / maxMonthValue) * 110));
            const isFuture = i > currentMonth;

            return (
              <div
                key={m}
                className="flex flex-col items-center justify-end h-full gap-1 p-1 hover:bg-[#F9FAFB] rounded"
              >
                <div className="flex items-end gap-1 h-28">
                  {/* Collections Bar */}
                  <div
                    title={`${m} Collections: ${fmt(inc)}`}
                    className={`w-2.5 sm:w-3.5 bg-emerald-600 rounded-t ${
                      isFuture ? 'opacity-30' : 'opacity-100'
                    }`}
                    style={{ height: `${incH}px` }}
                  />
                  {/* Expense Bar */}
                  <div
                    title={`${m} Expenses: ${fmt(exp)}`}
                    className={`w-2.5 sm:w-3.5 bg-amber-600 rounded-t ${
                      isFuture ? 'opacity-30' : 'opacity-100'
                    }`}
                    style={{ height: `${expH}px` }}
                  />
                </div>
                <span className="text-[10px] font-mono font-bold text-[#555555] uppercase">
                  {m}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 4. TWO-COLUMN HIGH-DENSITY PAPER TABLES ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Recent Verified Receipts */}
        <div className="gov-card p-4 rounded-lg border border-[#CCCCCC] bg-white">
          <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3 mb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-700" />
              <h3 className="text-xs font-mono font-bold text-[#111111] uppercase tracking-wide">
                RECENT VERIFIED FEE RECEIPTS
              </h3>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard/accountant/receipts')}
              className="gov-btn gov-btn-sm text-[10px]"
            >
              <span>VIEW ALL RECEIPTS</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {(!d?.recentPayments || d.recentPayments.length === 0) ? (
            <div className="py-8 text-center text-xs font-mono text-[#777777]">
              NO RECENT PAYMENTS LOGGED.
            </div>
          ) : (
            <div className="gov-table-container">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Method</th>
                    <th>Date</th>
                    <th className="text-right">Amount (UGX)</th>
                  </tr>
                </thead>
                <tbody>
                  {d.recentPayments.map((p, idx) => (
                    <tr key={`${p.student_id}-${idx}`}>
                      <td className="font-semibold text-[#111111] text-xs">
                        {p.student_name}
                      </td>
                      <td className="font-mono text-[11px] text-[#555555]">
                        <span className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold bg-[#F0FDF4] text-emerald-800 border border-emerald-300 rounded">
                          {p.payment_method || 'CASH'}
                        </span>
                      </td>
                      <td className="font-mono text-[11px] text-[#666666]">
                        {p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-UG', { day: '2-digit', month: 'short' }) : '—'}
                      </td>
                      <td className="font-mono font-bold text-xs text-right text-emerald-800">
                        +{fmt(p.amount_paid)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Priority Tuition Debtors (Top Outstanding) */}
        <div className="gov-card p-4 rounded-lg border border-[#CCCCCC] bg-white">
          <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3 mb-3">
            <div className="flex items-center gap-2">
              <Wallet className="w-4 h-4 text-red-700" />
              <h3 className="text-xs font-mono font-bold text-[#111111] uppercase tracking-wide">
                TOP TUITION ARREARS (PRIORITY DEBTORS)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => navigate('/dashboard/admin/finance/outstanding')}
              className="gov-btn gov-btn-sm text-[10px]"
            >
              <span>DEBTOR ROSTER</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {(!d?.topOutstanding || d.topOutstanding.length === 0) ? (
            <div className="py-8 text-center text-xs font-mono text-emerald-700">
              ALL STUDENTS HAVE SETTLED CURRENT FEES.
            </div>
          ) : (
            <div className="gov-table-container">
              <table className="gov-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Cohort / Class</th>
                    <th className="text-right">Outstanding (UGX)</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {d.topOutstanding.map((s) => (
                    <tr key={s.student_id}>
                      <td className="font-semibold text-[#111111] text-xs">
                        {s.name}
                      </td>
                      <td className="font-mono text-[11px] text-[#555555]">
                        {s.current_class}
                      </td>
                      <td className="font-mono font-bold text-xs text-right text-red-700">
                        {fmt(s.balance)}
                      </td>
                      <td className="text-center">
                        <button
                          type="button"
                          onClick={() => navigate(`/dashboard/admin/students/${s.student_id}`)}
                          className="gov-btn gov-btn-sm text-[10px] px-2 py-0.5"
                        >
                          PROFILE
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
