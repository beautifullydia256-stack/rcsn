import { useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import {
  Wallet,
  CreditCard,
  FileText,
  TrendingUp,
  Receipt,
  FilePlus,
  DollarSign,
  Send,
  Filter,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
import { useUIStore } from "../../store/uiStore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CHART_THEME = {
  light: { grid: "#f1f5f9", axis: "#64748b", refLine: "#94a3b8" },
  dark: { grid: "rgba(255,255,255,0.08)", axis: "rgba(255,255,255,0.6)", refLine: "rgba(255,255,255,0.35)" },
} as const;

const STALE_TIME_MS = 2 * 60 * 1000;
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type CashflowMonth = { month: string; monthLabel: string; cashIn: number; expense: number };

async function fetchCashflowYear(schoolId: string): Promise<{ months: CashflowMonth[]; totalBalance: number }> {
  const now = new Date();
  const year = now.getFullYear();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const [paymentsRes, expensesRes] = await Promise.all([
    supabase
      .from("student_payments")
      .select("amount_paid, payment_date")
      .eq("school_id", schoolId)
      .gte("payment_date", yearStart)
      .lte("payment_date", yearEnd),
    supabase
      .from("school_expenses")
      .select("amount, expense_date, status")
      .eq("school_id", schoolId)
      .gte("expense_date", yearStart)
      .lte("expense_date", yearEnd),
  ]);

  const paymentsRaw = (paymentsRes.data || []).filter((p: Record<string, unknown>) => !p.reversed_at);
  const expensesRaw = expensesRes.data || [];

  const cashInByMonth: number[] = new Array(12).fill(0);
  const expenseByMonth: number[] = new Array(12).fill(0);

  paymentsRaw.forEach((p: { payment_date?: string; amount_paid?: number }) => {
    const d = p.payment_date;
    if (!d) return;
    const monthIndex = parseInt(d.slice(5, 7), 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) cashInByMonth[monthIndex] += Number(p.amount_paid || 0);
  });

  expensesRaw.forEach((e: { expense_date?: string; amount?: number; status?: string }) => {
    if (!["approved", "paid"].includes((e.status || "") as string)) return;
    const d = e.expense_date;
    if (!d) return;
    const monthIndex = parseInt(d.slice(5, 7), 10) - 1;
    if (monthIndex >= 0 && monthIndex < 12) expenseByMonth[monthIndex] += Number(e.amount || 0);
  });

  const months: CashflowMonth[] = MONTHS.map((label, i) => ({
    month: String(i + 1),
    monthLabel: label,
    cashIn: Math.round(cashInByMonth[i]),
    expense: Math.round(expenseByMonth[i]),
  }));

  const totalCashIn = cashInByMonth.reduce((a, b) => a + b, 0);
  const totalExpense = expenseByMonth.reduce((a, b) => a + b, 0);
  const totalBalance = totalCashIn - totalExpense;

  return { months, totalBalance };
}

/** Per-term: expected (invoices), paid this term (cash in), overall balance for current + all older terms */
export type TermStatRow = {
  termLabel: string;
  term: number;
  year: number;
  termId: string;
  expected: number;
  paidThisTerm: number;
  overallBalance: number;
};
export type StatisticData = {
  terms: TermStatRow[];
  /** Total expected from older unpaid + current term invoices (all terms) */
  totalExpected: number;
  /** Total overall balance according to paid this term (all terms) */
  totalOverallBalance: number;
};

async function fetchStatisticData(schoolId: string): Promise<StatisticData> {
  const { data: terms } = await supabase
    .from("school_terms")
    .select("id, term, year")
    .eq("school_id", schoolId)
    .order("year", { ascending: false })
    .order("term", { ascending: false });

  const { data: balances } = await supabase
    .from("student_balances")
    .select("term_id, total_fees, total_paid, balance")
    .eq("school_id", schoolId);

  const byTerm: Record<string, { expected: number; paidThisTerm: number; overallBalance: number }> = {};
  (balances || []).forEach((b: { term_id: string; total_fees?: number; total_paid?: number; balance?: number }) => {
    const tid = b.term_id;
    if (!tid) return;
    if (!byTerm[tid]) byTerm[tid] = { expected: 0, paidThisTerm: 0, overallBalance: 0 };
    byTerm[tid].expected += Number(b.total_fees ?? 0);
    byTerm[tid].paidThisTerm += Number(b.total_paid ?? 0);
    byTerm[tid].overallBalance += Math.max(0, Number(b.balance ?? 0));
  });

  const termsList: TermStatRow[] = (terms || [])
    .filter((t: { id: string }) => byTerm[t.id])
    .map((t: { id: string; term: number; year: number }) => ({
      termId: t.id,
      term: t.term,
      year: t.year,
      termLabel: `Term ${t.term}, ${t.year}`,
      expected: byTerm[t.id].expected,
      paidThisTerm: byTerm[t.id].paidThisTerm,
      overallBalance: byTerm[t.id].overallBalance,
    }));

  const totalExpected = termsList.reduce((s, r) => s + r.expected, 0);
  const totalOverallBalance = termsList.reduce((s, r) => s + r.overallBalance, 0);

  return { terms: termsList, totalExpected, totalOverallBalance };
}

export type RecentTransaction = {
  id: string;
  type: "payment" | "expense";
  name: string;
  sub: string;
  account: string;
  date: string;
  time: string;
  amount: number;
  status: "Completed" | "Pending";
};

async function fetchRecentTransactions(
  schoolId: string,
  period: "month" | "year"
): Promise<RecentTransaction[]> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const monthEnd = new Date(year, month + 1, 0).toISOString().slice(0, 10);
  const start = period === "month" ? monthStart : yearStart;
  const end = period === "month" ? monthEnd : yearEnd;

  const [paymentsRes, expensesRes] = await Promise.all([
    supabase
      .from("student_payments")
      .select("payment_id, student_id, amount_paid, payment_date, payment_method, created_at")
      .eq("school_id", schoolId)
      .gte("payment_date", start)
      .lte("payment_date", end)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(15),
    supabase
      .from("school_expenses")
      .select("expense_id, amount, expense_date, status, category_name, description, created_at")
      .eq("school_id", schoolId)
      .gte("expense_date", start)
      .lte("expense_date", end)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const paymentsRaw = (paymentsRes.data || []).filter((p: Record<string, unknown>) => !(p as { reversed_at?: string }).reversed_at);
  const expensesRaw = expensesRes.data || [];

  const studentIds = [...new Set((paymentsRaw as { student_id: string }[]).map((p) => p.student_id))];
  const { data: studentsData } =
    studentIds.length > 0
      ? await supabase.from("students").select("student_id, name").in("student_id", studentIds)
      : { data: [] };
  const studentMap = new Map(
    (studentsData || []).map((s: { student_id: string; name: string }) => [s.student_id, s.name])
  );

  const paymentRows: RecentTransaction[] = (paymentsRaw as {
    payment_id: string;
    student_id: string;
    amount_paid: number;
    payment_date: string;
    payment_method: string;
    created_at: string;
  }[]).map((p) => {
    const created = p.created_at ? new Date(p.created_at) : new Date(p.payment_date);
    const method = (p.payment_method || "").toLowerCase();
    let account = "Other";
    if (method === "cash") account = "Cash";
    else if (["bank", "cheque", "pos", "online"].includes(method)) account = "Bank / Card";
    else if (method === "mobile_money") account = "Mobile Money";
    const studentName = studentMap.get(p.student_id);
    return {
      id: p.payment_id,
      type: "payment",
      name: "Fee payment",
      sub: "Cash In",
      account: studentName ? `${account} · ${studentName}` : account,
      date: p.payment_date,
      time: created.toTimeString().slice(0, 5),
      amount: Number(p.amount_paid || 0),
      status: "Completed" as const,
    };
  });

  const expenseRows: RecentTransaction[] = (expensesRaw as {
    expense_id: string;
    amount: number;
    expense_date: string;
    status: string;
    category_name: string;
    description: string;
    created_at: string;
  }[]).map((e) => {
    const created = e.created_at ? new Date(e.created_at) : new Date(e.expense_date);
    return {
      id: e.expense_id,
      type: "expense",
      name: e.category_name || "Expense",
      sub: "Expense",
      account: "School",
      date: e.expense_date,
      time: created.toTimeString().slice(0, 5),
      amount: -Number(e.amount || 0),
      status: ["approved", "paid"].includes(e.status || "") ? ("Completed" as const) : ("Pending" as const),
    };
  });

  const merged = [...paymentRows, ...expenseRows].sort((a, b) => {
    const d = b.date.localeCompare(a.date);
    if (d !== 0) return d;
    return b.time.localeCompare(a.time);
  });
  return merged.slice(0, 5);
}

const fmt = (n: number) =>
  n == null || Number.isNaN(n) ? "—" : n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });

interface OverviewData {
  termId: string | null;
  termLabel: string;
  totalFeesExpected: number;
  totalFeesCollected: number;
  outstandingBalances: number;
  todayCollections: number;
  weekCollections: number;
  monthCollections: number;
  scholarshipsDiscounts: number;
  totalExpensesThisTerm: number;
  netPosition: number;
  cashTotal: number;
  bankTotal: number;
  mobileTotal: number;
  otherTotal: number;
  fullyPaidCount: number;
  partiallyPaidCount: number;
  notPaidCount: number;
  recentPayments: {
    student_name: string;
    class: string;
    receipt_number: string | null;
    payment_date: string;
    amount_paid: number;
    payment_method: string;
  }[];
}

async function fetchFinancialOverview(schoolId: string): Promise<OverviewData> {
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  const weekStartStr = weekStart.toISOString().slice(0, 10);
  const monthStart = new Date();
  monthStart.setDate(1);
  const monthStartStr = monthStart.toISOString().slice(0, 10);

  const { data: terms } = await supabase
    .from("school_terms")
    .select("id, start_date, end_date, year, term")
    .eq("school_id", schoolId)
    .order("year", { ascending: false })
    .order("term", { ascending: false });

  const currentTerm =
    (terms || []).find(
      (t: { start_date?: string; end_date: string }) =>
        t.start_date && t.end_date && t.start_date <= today && t.end_date >= today
    ) ?? terms?.[0];
  const termId = (currentTerm as { id: string } | undefined)?.id ?? null;
  const termLabel = currentTerm
    ? `Term ${(currentTerm as { term: number }).term}, ${(currentTerm as { year: number }).year}`
    : "No term";

  const [balancesRes, paymentsRes, expensesRes, discountsRes, recentPaymentsRes] = await Promise.all([
    termId
      ? supabase
          .from("student_balances")
          .select("total_fees, total_paid, balance")
          .eq("school_id", schoolId)
          .eq("term_id", termId)
      : { data: [] as { total_fees: number; total_paid: number; balance: number }[] },
    supabase
      .from("student_payments")
      .select("amount_paid, payment_date, payment_method, student_id, reversed_at, term_id")
      .eq("school_id", schoolId),
    termId
      ? supabase
          .from("school_expenses")
          .select("amount, status")
          .eq("school_id", schoolId)
          .eq("term_id", termId)
      : { data: [] as { amount: number; status: string }[] },
    Promise.resolve(
      supabase.from("student_discounts").select("amount").eq("school_id", schoolId)
    ).then((r) => r, () => ({ data: [] as { amount: number }[] })),
    supabase
      .from("student_payments")
      .select("amount_paid, payment_date, payment_method, receipt_number, student_id")
      .eq("school_id", schoolId)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const balances = balancesRes.data || [];
  const paymentsRaw = paymentsRes.data || [];
  const payments = paymentsRaw.filter((p: Record<string, unknown>) => !p.reversed_at);
  const expenses = expensesRes.data || [];
  const discounts = discountsRes.data || [];
  const recentPaymentsRows = (recentPaymentsRes.data || []).filter((p: Record<string, unknown>) => !p.reversed_at);

  type Bal = { total_fees?: number; total_paid?: number; balance?: number };
  type Pay = { payment_date: string; amount_paid?: number; student_id?: string; term_id?: string };
  type Disc = { amount?: number };
  type Exp = { status: string; amount?: number };

  const totalFeesExpected = balances.reduce((s: number, b: Bal) => s + Number(b.total_fees || 0), 0);

  /** Same as admin design KPIs: attribute collections to school term via term_id (not payment_date alone). */
  const paymentsInTerm = termId
    ? payments.filter((p: Pay) => p.term_id === termId)
    : [];
  const totalFeesCollected = paymentsInTerm.reduce((s: number, p: Pay) => s + Number(p.amount_paid || 0), 0);
  /** Sum of balance rows for this term — matches student_balances snapshot. */
  const outstandingBalances = balances.reduce((s: number, b: Bal) => s + Math.max(0, Number(b.balance ?? 0)), 0);
  const todayCollections = payments
    .filter((p: Pay) => p.payment_date === today)
    .reduce((s: number, p: Pay) => s + Number(p.amount_paid || 0), 0);
  const weekCollections = payments
    .filter((p: Pay) => p.payment_date >= weekStartStr && p.payment_date <= today)
    .reduce((s: number, p: Pay) => s + Number(p.amount_paid || 0), 0);
  const monthCollections = payments
    .filter((p: Pay) => p.payment_date >= monthStartStr && p.payment_date <= today)
    .reduce((s: number, p: Pay) => s + Number(p.amount_paid || 0), 0);

  const scholarshipsDiscounts = discounts.reduce((s: number, d: Disc) => s + Number(d.amount || 0), 0);
  const totalExpensesThisTerm = expenses
    .filter((e: Exp) => ["approved", "paid"].includes(e.status))
    .reduce((s: number, e: Exp) => s + Number(e.amount || 0), 0);
  const netPosition = totalFeesCollected - totalExpensesThisTerm;

  const byMethod = { cash: 0, bank: 0, mobile_money: 0, other: 0 };
  paymentsInTerm.forEach((p: { payment_method?: string; amount_paid: number }) => {
    const m = (p.payment_method || "").toLowerCase();
    const amt = Number(p.amount_paid || 0);
    if (m === "cash") byMethod.cash += amt;
    else if (m === "bank" || m === "cheque" || m === "pos" || m === "online") byMethod.bank += amt;
    else if (m === "mobile_money") byMethod.mobile_money += amt;
    else byMethod.other += amt;
  });

  let fullyPaidCount = 0,
    partiallyPaidCount = 0,
    notPaidCount = 0;
  balances.forEach((b: Bal) => {
    const tf = Number(b.total_fees || 0);
    const bal = Number(b.balance ?? 0);
    if (tf <= 0) return;
    if (bal <= 0) fullyPaidCount++;
    else if (bal >= tf) notPaidCount++;
    else partiallyPaidCount++;
  });

  const studentIds = [...new Set(recentPaymentsRows.map((r: { student_id: string }) => r.student_id))];
  const { data: studentsData } =
    studentIds.length > 0
      ? await supabase.from("students").select("student_id, name, current_class").in("student_id", studentIds)
      : { data: [] };
  const studentMap = new Map(
    (studentsData || []).map((s: { student_id: string; name: string; current_class: string }) => [
      s.student_id,
      { name: s.name, current_class: s.current_class },
    ])
  );

  const recentPayments = recentPaymentsRows.map(
    (r: {
      student_id: string;
      amount_paid: number;
      payment_date: string;
      payment_method: string;
      receipt_number: string | null;
    }) => {
      const st = studentMap.get(r.student_id);
      return {
        student_name: st?.name ?? "—",
        class: st?.current_class ?? "—",
        receipt_number: r.receipt_number ?? null,
        payment_date: r.payment_date,
        amount_paid: Number(r.amount_paid || 0),
        payment_method: r.payment_method ?? "—",
      };
    }
  );

  return {
    termId,
    termLabel,
    totalFeesExpected,
    totalFeesCollected,
    outstandingBalances,
    todayCollections,
    weekCollections,
    monthCollections,
    scholarshipsDiscounts,
    totalExpensesThisTerm,
    netPosition,
    cashTotal: byMethod.cash,
    bankTotal: byMethod.bank,
    mobileTotal: byMethod.mobile_money,
    otherTotal: byMethod.other,
    fullyPaidCount,
    partiallyPaidCount,
    notPaidCount,
    recentPayments,
  };
}

type KPIVariant = "blue" | "green" | "orange" | "teal";

function KPICard({
  icon: Icon,
  label,
  value,
  subline,
  variant = "green",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subline: string;
  variant?: KPIVariant;
}) {
  const borderTopClass: Record<KPIVariant, string> = {
    blue: "border-t-[3px] border-t-blue-400/90",
    green: "border-t-[3px] border-t-emerald-500/90",
    orange: "border-t-[3px] border-t-amber-500/90",
    teal: "border-t-[3px] border-t-teal-500/90",
  };
  const iconClass: Record<KPIVariant, string> = {
    blue: "ac-glass-icon ac-icon-blue",
    green: "ac-glass-icon ac-icon-green",
    orange: "ac-glass-icon ac-icon-orange",
    teal: "ac-glass-icon ac-icon-teal",
  };
  return (
    <div className={`ac-glass-card will-change-transform rounded-[18px] p-5 transition-shadow hover:shadow-[var(--ac-shadow-strong)] ${borderTopClass[variant]}`}>
      <div className="flex items-start justify-between">
        <div className={iconClass[variant]}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className="ac-text-primary mt-3 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="ac-text-secondary mt-0.5 text-sm font-medium">{label}</p>
      <p className="ac-text-muted mt-1 text-xs">{subline}</p>
    </div>
  );
}

type AccountantOutletContext = { openRecordPayment?: () => void };

export default function FinancialOverview() {
  const navigate = useNavigate();
  const theme = useUIStore((s) => s.theme);
  const { openRecordPayment } = useOutletContext<AccountantOutletContext>();
  const schoolId = useAuthStore((s) => s.schoolId);
  const chartColors = CHART_THEME[theme];

  const { data, isLoading } = useQuery({
    queryKey: ["accountant", "financial-overview", schoolId],
    queryFn: () => fetchFinancialOverview(schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_TIME_MS,
  });

  const { data: cashflowData } = useQuery({
    queryKey: ["accountant", "cashflow", schoolId],
    queryFn: () => fetchCashflowYear(schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_TIME_MS,
  });

  const { data: statisticData } = useQuery({
    queryKey: ["accountant", "statistic", schoolId],
    queryFn: () => fetchStatisticData(schoolId!),
    enabled: !!schoolId,
    staleTime: STALE_TIME_MS,
  });

  const [recentPeriod, setRecentPeriod] = useState<"month" | "year">("month");
  const { data: recentTransactions = [] } = useQuery({
    queryKey: ["accountant", "recent-transactions", schoolId, recentPeriod],
    queryFn: () => fetchRecentTransactions(schoolId!, recentPeriod),
    enabled: !!schoolId,
    staleTime: STALE_TIME_MS,
  });

  if (!schoolId) {
    return (
      <div className="ac-text-secondary flex min-h-[40vh] items-center justify-center text-sm">
        Loading your school...
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ background: "var(--ac-page-bg)", backgroundColor: "var(--ac-page-bg)" }}>
        <p className="ac-text-secondary text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ background: "var(--ac-page-bg)", backgroundColor: "var(--ac-page-bg)" }}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="ac-glass-card mb-7 flex flex-col gap-4 rounded-[18px] px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
          <div>
            <h1 className="ac-text-primary text-2xl font-bold tracking-tight">Financial Overview</h1>
            <p className="ac-text-secondary mt-1 flex items-center gap-2 text-[13px]">
              <span className="inline-flex items-center rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-600">
                {data.termLabel}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => openRecordPayment?.()}
              className="ac-glass-btn inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium ac-text-primary"
            >
              <Receipt className="h-4 w-4 shrink-0 text-emerald-600" />
              Record payment
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard/accountant/billing")}
              className="ac-glass-btn-secondary inline-flex items-center gap-2 rounded-[14px] px-4 py-2.5 text-sm font-medium ac-text-primary"
            >
              <FilePlus className="h-4 w-4 shrink-0 text-blue-600" />
              Generate invoice
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard/accountant/expenses")}
              className="ac-glass-btn-secondary inline-flex items-center gap-2 rounded-[14px] px-4 py-2.5 text-sm font-medium ac-text-primary"
            >
              <DollarSign className="h-4 w-4 shrink-0 text-amber-600" />
              Record expense
            </button>
            <button
              type="button"
              className="ac-glass-btn-secondary inline-flex items-center gap-2 rounded-[14px] px-4 py-2.5 text-sm font-medium ac-text-secondary"
            >
              <Send className="h-4 w-4 shrink-0 text-slate-500" />
              Send reminder
            </button>
          </div>
        </div>

        {/* ROW 1 â€” KPI cards (unchanged) */}
        <section className="mb-7" style={{ marginBottom: 28 }}>
          <h2 className="ac-text-muted mb-4 text-sm font-semibold uppercase tracking-wider">Key figures</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              icon={Wallet}
              label="Total fees expected"
              value={fmt(data.totalFeesExpected)}
              subline="This term"
              variant="blue"
            />
            <KPICard
              icon={CreditCard}
              label="Total fees collected"
              value={fmt(data.totalFeesCollected)}
              subline="This term"
              variant="green"
            />
            <KPICard
              icon={FileText}
              label="Outstanding balances"
              value={fmt(data.outstandingBalances)}
              subline="Balance due"
              variant="orange"
            />
            <KPICard
              icon={TrendingUp}
              label="Today's collections"
              value={fmt(data.todayCollections)}
              subline="Payments today"
              variant="teal"
            />
          </div>
        </section>

        {/* Row: Cashflow (left) + Statistic KPI (right) on desktop */}
        <div className="mb-7 grid grid-cols-1 gap-6 lg:grid-cols-2" style={{ marginBottom: 28 }}>
          {/* Cashflow — left */}
          {cashflowData && (
            <section className="w-full">
              <div className="ac-glass-card rounded-[18px] p-6">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="ac-text-primary text-lg font-semibold">Cashflow</h3>
                <div className="flex items-center gap-2">
                  <span className="ac-text-muted text-xs font-medium">This year</span>
                </div>
              </div>
              <p className="ac-text-secondary text-[13px] font-medium">Total Balance</p>
              <p className={`mt-0.5 text-3xl font-bold tracking-tight ${cashflowData.totalBalance >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {fmt(cashflowData.totalBalance)}
              </p>
              <div className="ac-text-secondary mt-4 flex flex-wrap gap-4 text-[13px]">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "#047857" }} />
                  Cash In
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: "#86efac" }} />
                  Expense
                </span>
              </div>
              <div className="mt-4 h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={cashflowData.months.map((m) => ({
                      ...m,
                      expenseNeg: -m.expense,
                    }))}
                    margin={{ top: 8, right: 8, left: 8, bottom: 8 }}
                    barCategoryGap="12%"
                    barGap={4}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                    <ReferenceLine y={0} stroke={chartColors.refLine} strokeWidth={1} />
                    <XAxis
                      dataKey="monthLabel"
                      tick={{ fontSize: 11, fill: chartColors.axis }}
                      axisLine={{ stroke: chartColors.grid }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: chartColors.axis }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(v) => (Math.abs(v) >= 1000 ? (v / 1000) + "K" : String(v))}
                      domain={["auto", "auto"]}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="ac-glass-card rounded-xl px-4 py-3 text-sm shadow-lg">
                            <p className="ac-text-primary mb-2 font-semibold">
                              {MONTHS[Number(d.month) - 1]} {new Date().getFullYear()}
                            </p>
                            <p className="text-emerald-600">Cash In {fmt(d.cashIn)}</p>
                            <p className="text-teal-600">Expense {fmt(d.expense)}</p>
                          </div>
                        );
                      }}
                      cursor={{ fill: theme === "dark" ? "rgba(255,255,255,0.06)" : "rgba(148, 163, 184, 0.08)" }}
                    />
                    <Bar dataKey="cashIn" fill="#047857" radius={[2, 2, 0, 0]} name="Cash In" />
                    <Bar dataKey="expenseNeg" fill="#86efac" radius={[0, 0, 2, 2]} name="Expense" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
          )}

          {/* Statistic — Total expected vs Total overall balance + donut by term */}
          {statisticData && (
            <section className="w-full">
              <div className="ac-glass-card rounded-[18px] p-6">
                <h3 className="ac-text-primary mb-4 text-lg font-semibold">Statistic</h3>
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div className="ac-glass-card rounded-xl p-3">
                    <p className="ac-text-secondary text-xs font-medium">Total expected (all terms)</p>
                    <p className="ac-text-muted mt-0.5 text-[11px]">From older unpaid + current term invoices</p>
                    <p className="ac-text-primary text-xl font-bold">{fmt(statisticData.totalExpected)}</p>
                  </div>
                  <div className="ac-glass-card rounded-xl p-3">
                    <p className="ac-text-secondary text-xs font-medium">Total overall balance (all terms)</p>
                    <p className="ac-text-muted mt-0.5 text-[11px]">According to paid this term</p>
                    <p className="ac-text-primary text-xl font-bold">{fmt(statisticData.totalOverallBalance)}</p>
                  </div>
                </div>
                {/* Donut: outstanding balance by term (replaces BY TERM table) */}
                {statisticData.terms.length > 0 ? (
                  <div className="border-t border-slate-100 pt-4">
                    <div className="flex flex-col items-center sm:flex-row sm:items-start sm:justify-center gap-4">
                      <div className="relative h-[200px] w-[200px] shrink-0">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={statisticData.terms.map((t) => ({ name: t.termLabel, value: Math.max(0, t.overallBalance) }))}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              innerRadius={56}
                              outerRadius={80}
                              paddingAngle={1}
                              stroke="none"
                            >
                              {statisticData.terms.map((_, i) => (
                                <Cell
                                  key={i}
                                  fill={["#166534", "#22c55e", "#bbf7d0", "#d1d5db"][i % 4]}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              formatter={(v: number) => [fmt(v), "Balance"]}
                              contentStyle={{ borderRadius: 8, border: "1px solid var(--ac-border)", background: "var(--ac-card-bg)", color: "var(--ac-text-primary)" }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                          <span className="ac-text-muted text-[11px] font-medium uppercase tracking-wider">Outstanding</span>
                          <span className="ac-text-primary text-lg font-bold">{fmt(statisticData.totalOverallBalance)}</span>
                        </div>
                      </div>
                      <ul className="ac-text-secondary flex flex-col gap-1.5 text-xs">
                        {statisticData.terms.map((t, i) => (
                          <li key={t.termId} className="flex items-center gap-2">
                            <span
                              className="h-2.5 w-2.5 shrink-0 rounded-sm"
                              style={{ backgroundColor: ["#166534", "#22c55e", "#bbf7d0", "#d1d5db"][i % 4] }}
                            />
                            {t.termLabel}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div className="border-t border-slate-200/50 pt-4">
                    <p className="ac-text-muted text-sm">No term data yet.</p>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Recent Transactions — full width below Cashflow/Statistic */}
        <section className="w-full">
          <div className="ac-glass-card rounded-[18px] p-6">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="ac-text-primary text-lg font-semibold">Recent Transactions</h3>
              <div className="flex items-center gap-2">
                <select
                  value={recentPeriod}
                  onChange={(e) => setRecentPeriod(e.target.value as "month" | "year")}
                  className="ac-glass-card ac-text-primary inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="month">This month</option>
                  <option value="year">This year</option>
                </select>
                <button
                  type="button"
                  className="ac-glass-btn-secondary rounded-lg p-2 ac-text-secondary transition-colors hover:opacity-90"
                  title="Filter"
                >
                  <Filter className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="ac-text-muted border-b border-slate-200/80 text-xs font-medium uppercase tracking-wider">
                    <th className="pb-3 pt-1">Transaction Name</th>
                    <th className="pb-3 pt-1">Account</th>
                    <th className="pb-3 pt-1">Date & Time</th>
                    <th className="pb-3 pt-1 text-right">Amount</th>
                    <th className="pb-3 pt-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="ac-text-muted py-8 text-center">
                        No transactions in this period.
                      </td>
                    </tr>
                  ) : (
                    recentTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-slate-200/50 last:border-0">
                        <td className="py-3">
                          <p className="ac-text-primary font-medium">{tx.name}</p>
                          <p className="ac-text-muted text-xs">{tx.sub}</p>
                        </td>
                        <td className="ac-text-secondary py-3">{tx.account}</td>
                        <td className="ac-text-secondary py-3">
                          <p>{tx.date}</p>
                          <p className="ac-text-muted text-xs">{tx.time}</p>
                        </td>
                        <td className="py-3 text-right">
                          <span className={tx.amount >= 0 ? "font-medium text-emerald-600" : "font-medium text-red-600"}>
                            {tx.amount >= 0 ? "+" : ""}{fmt(tx.amount)}
                          </span>
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium text-white ${
                              tx.status === "Completed" ? "bg-emerald-600" : "bg-emerald-400"
                            }`}
                          >
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
