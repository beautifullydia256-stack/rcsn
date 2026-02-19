import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import {
  Wallet,
  CreditCard,
  FileText,
  TrendingUp,
  Receipt,
  DollarSign,
  FilePlus,
  Send,
  Filter,
} from "lucide-react";
import { useAuthStore } from "../../store/authStore";
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

export type TopExpense = { category_name: string; amount: number; percentage: number };
export type StatisticData = {
  cashInTotal: number;
  expenseTotal: number;
  top5Expenses: TopExpense[];
  expenseDonut: { name: string; value: number; color: string }[];
  cashInDonut: { name: string; value: number; color: string }[];
};

const DONUT_COLORS = ["#059669", "#34d399", "#6ee7b7", "#a7f3d0", "#d1fae5", "#e5e7eb"];

async function fetchStatisticData(
  schoolId: string,
  period: "month" | "year"
): Promise<StatisticData> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
  const monthEnd = new Date(year, month + 1, 0).toISOString().slice(0, 10);

  const isMonth = period === "month";
  const start = isMonth ? monthStart : yearStart;
  const end = isMonth ? monthEnd : yearEnd;

  const [paymentsRes, expensesRes] = await Promise.all([
    supabase
      .from("student_payments")
      .select("amount_paid, payment_date, payment_method")
      .eq("school_id", schoolId)
      .gte("payment_date", start)
      .lte("payment_date", end),
    supabase
      .from("school_expenses")
      .select("amount, expense_date, status, category_name")
      .eq("school_id", schoolId)
      .gte("expense_date", start)
      .lte("expense_date", end),
  ]);

  const paymentsRaw = (paymentsRes.data || []).filter((p: Record<string, unknown>) => !p.reversed_at);
  const expensesRaw = (expensesRes.data || []) as { amount: number; status: string; category_name: string }[];

  const approvedExpenses = expensesRaw.filter((e) => ["approved", "paid"].includes(e.status));
  const expenseTotal = approvedExpenses.reduce((s, e) => s + Number(e.amount || 0), 0);

  const byCategory: Record<string, number> = {};
  approvedExpenses.forEach((e) => {
    const cat = e.category_name || "Other";
    byCategory[cat] = (byCategory[cat] || 0) + Number(e.amount || 0);
  });
  const sortedCategories = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  const top5Expenses: TopExpense[] = sortedCategories.map(([name, amount]) => ({
    category_name: name,
    amount,
    percentage: expenseTotal > 0 ? Math.round((amount / expenseTotal) * 100) : 0,
  }));

  const expenseDonut = sortedCategories.length
    ? sortedCategories.map(([name, value], i) => ({
        name,
        value,
        color: DONUT_COLORS[i] ?? DONUT_COLORS[5],
      }))
    : [{ name: "No data", value: 1, color: "#e5e7eb" }];

  const cashInTotal = paymentsRaw.reduce((s, p: { amount_paid?: number }) => s + Number(p.amount_paid || 0), 0);
  const byMethod: Record<string, number> = { cash: 0, bank: 0, mobile_money: 0, other: 0 };
  paymentsRaw.forEach((p: { payment_method?: string; amount_paid?: number }) => {
    const m = (p.payment_method || "").toLowerCase();
    const amt = Number(p.amount_paid || 0);
    if (m === "cash") byMethod.cash += amt;
    else if (m === "bank" || m === "cheque" || m === "pos" || m === "online") byMethod.bank += amt;
    else if (m === "mobile_money") byMethod.mobile_money += amt;
    else byMethod.other += amt;
  });
  const cashInDonut = [
    { name: "Cash", value: byMethod.cash, color: "#059669" },
    { name: "Bank / Card", value: byMethod.bank, color: "#34d399" },
    { name: "Mobile Money", value: byMethod.mobile_money, color: "#6ee7b7" },
    { name: "Other", value: byMethod.other, color: "#a7f3d0" },
  ].filter((d) => d.value > 0);
  if (cashInDonut.length === 0) cashInDonut.push({ name: "No data", value: 1, color: "#e5e7eb" });

  return { cashInTotal, expenseTotal, top5Expenses, expenseDonut, cashInDonut };
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
  const termStart = (currentTerm as { start_date?: string })?.start_date ?? "1900-01-01";
  const termEnd = (currentTerm as { end_date: string })?.end_date ?? "2100-12-31";

  const [balancesRes, paymentsRes, expensesRes, discountsRes, recentPaymentsRes] = await Promise.all([
    termId
      ? supabase
          .from("student_balances")
          .select("total_fees, total_paid, balance")
          .eq("school_id", schoolId)
          .eq("term_id", termId)
      : { data: [] as { total_fees: number; total_paid: number; balance: number }[] },
    supabase.from("student_payments").select("amount_paid, payment_date, payment_method").eq("school_id", schoolId),
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
  type Pay = { payment_date: string; amount_paid?: number };
  type Disc = { amount?: number };
  type Exp = { status: string; amount?: number };

  const totalFeesExpected = balances.reduce((s: number, b: Bal) => s + Number(b.total_fees || 0), 0);
  const totalFeesCollected = balances.reduce((s: number, b: Bal) => s + Number(b.total_paid || 0), 0);
  const outstandingBalances = balances.reduce((s: number, b: Bal) => s + Math.max(0, Number(b.balance ?? 0)), 0);

  const paymentsInTerm = payments.filter((p: Pay) => p.payment_date >= termStart && p.payment_date <= termEnd);
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
  const iconBgClass: Record<KPIVariant, string> = {
    blue: "bg-blue-500/10 text-blue-600",
    green: "bg-emerald-500/10 text-emerald-600",
    orange: "bg-amber-500/10 text-amber-600",
    teal: "bg-teal-500/10 text-teal-600",
  };
  const valueColorClass: Record<KPIVariant, string> = {
    blue: "text-slate-900",
    green: "text-emerald-700",
    orange: "text-amber-700",
    teal: "text-teal-700",
  };
  return (
    <div className={`rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md ${borderTopClass[variant]}`}>
      <div className="flex items-start justify-between">
        <div className={`rounded-lg p-2.5 ${iconBgClass[variant]}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <p className={`mt-3 text-2xl font-semibold tracking-tight ${valueColorClass[variant]}`}>{value}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-600">{label}</p>
      <p className="mt-1 text-xs text-slate-400">{subline}</p>
    </div>
  );
}

export default function FinancialOverview() {
  const navigate = useNavigate();
  const schoolId = useAuthStore((s) => s.schoolId);

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

  const [statPeriod, setStatPeriod] = useState<"month" | "year">("month");
  const [statTab, setStatTab] = useState<"cashIn" | "expense">("expense");
  const { data: statisticData } = useQuery({
    queryKey: ["accountant", "statistic", schoolId, statPeriod],
    queryFn: () => fetchStatisticData(schoolId!, statPeriod),
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
      <div className="flex min-h-[40vh] items-center justify-center text-slate-500 text-sm">
        Loading your school...
      </div>
    );
  }

  if (isLoading || !data) {
    return (
      <div className="min-h-full flex items-center justify-center" style={{ backgroundColor: "#F6F8FB" }}>
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-full" style={{ backgroundColor: "#F6F8FB" }}>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div
          className="mb-7 flex flex-col gap-4 rounded-xl px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5"
          style={{ background: "linear-gradient(135deg, #f7fafc, #eef6ff)" }}
        >
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Financial Overview</h1>
            <p className="mt-1 flex items-center gap-2 text-[13px] text-[#6b7280]">
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                {data.termLabel}
              </span>
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/dashboard/accountant/payments")}
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
            >
              <Receipt className="h-4 w-4 shrink-0 text-emerald-600" />
              Record payment
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard/accountant/billing")}
              className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            >
              <FilePlus className="h-4 w-4 shrink-0 text-blue-600" />
              Generate invoice
            </button>
            <button
              type="button"
              onClick={() => navigate("/dashboard/accountant/expenses")}
              className="inline-flex items-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
            >
              <DollarSign className="h-4 w-4 shrink-0 text-amber-600" />
              Record expense
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600"
            >
              <Send className="h-4 w-4 shrink-0 text-slate-500" />
              Send reminder
            </button>
          </div>
        </div>

        {/* ROW 1 â€” KPI cards (unchanged) */}
        <section className="mb-7" style={{ marginBottom: 28 }}>
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Key figures</h2>
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
              <div className="rounded-[14px] border border-[#eef1f4] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold text-[#1f2933]">Cashflow</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-500">This year</span>
                </div>
              </div>
              <p className="text-[13px] font-medium text-[#6b7280]">Total Balance</p>
              <p className={`mt-0.5 text-3xl font-bold tracking-tight ${cashflowData.totalBalance >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                {fmt(cashflowData.totalBalance)}
              </p>
              <div className="mt-4 flex flex-wrap gap-4 text-[13px] text-[#6b7280]">
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
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <ReferenceLine y={0} stroke="#94a3b8" strokeWidth={1} />
                    <XAxis
                      dataKey="monthLabel"
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: "#64748b" }}
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
                          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-lg">
                            <p className="mb-2 font-semibold text-slate-800">
                              {MONTHS[Number(d.month) - 1]} {new Date().getFullYear()}
                            </p>
                            <p className="text-slate-600" style={{ color: "#047857" }}>Cash In {fmt(d.cashIn)}</p>
                            <p className="text-slate-600" style={{ color: "#0d9488" }}>Expense {fmt(d.expense)}</p>
                          </div>
                        );
                      }}
                      cursor={{ fill: "rgba(148, 163, 184, 0.08)" }}
                    />
                    <Bar dataKey="cashIn" fill="#047857" radius={[2, 2, 0, 0]} name="Cash In" />
                    <Bar dataKey="expenseNeg" fill="#86efac" radius={[0, 0, 2, 2]} name="Expense" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>
          )}

          {/* Statistic KPI — right (donut, Cash in / Expense tabs, five biggest expenses) */}
          {statisticData && (
            <section className="w-full">
              <div className="rounded-[14px] border border-[#eef1f4] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-semibold text-[#1f2933]">Statistic</h3>
                  <select
                    value={statPeriod}
                    onChange={(e) => setStatPeriod(e.target.value as "month" | "year")}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="month">This month</option>
                    <option value="year">This year</option>
                  </select>
                </div>
                {/* Tabs: Cash in / Expense */}
                <div className="mb-4 flex gap-6 border-b border-slate-200">
                  <button
                    type="button"
                    onClick={() => setStatTab("cashIn")}
                    className={`pb-2 text-sm font-medium transition-colors ${
                      statTab === "cashIn"
                        ? "border-b-2 border-emerald-600 text-emerald-600"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Cash in ({fmt(statisticData.cashInTotal)})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatTab("expense")}
                    className={`pb-2 text-sm font-medium transition-colors ${
                      statTab === "expense"
                        ? "border-b-2 border-emerald-600 text-emerald-600"
                        : "text-slate-500 hover:text-slate-700"
                    }`}
                  >
                    Expense ({fmt(statisticData.expenseTotal)})
                  </button>
                </div>
                {/* Donut + center total */}
                <div className="relative flex justify-center">
                  <div className="h-[200px] w-full max-w-[240px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statTab === "expense" ? statisticData.expenseDonut : statisticData.cashInDonut}
                          cx="50%"
                          cy="50%"
                          innerRadius={56}
                          outerRadius={72}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {(statTab === "expense" ? statisticData.expenseDonut : statisticData.cashInDonut).map(
                            (entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            )
                          )}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => fmt(value)}
                          content={({ active, payload }) =>
                            active && payload?.[0] ? (
                              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
                                {payload[0].name}: {fmt(Number(payload[0].value))}
                              </div>
                            ) : null
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
                    <span className="text-xs font-medium text-slate-500">
                      {statTab === "expense" ? "Total expense" : "Total cash in"}
                    </span>
                    <span className="text-xl font-bold text-[#1f2933]">
                      {statTab === "expense"
                        ? fmt(statisticData.expenseTotal)
                        : fmt(statisticData.cashInTotal)}
                    </span>
                  </div>
                </div>
                {/* Five biggest expenses */}
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Five biggest expenses
                  </p>
                  <ul className="space-y-2">
                    {statisticData.top5Expenses.length === 0 ? (
                      <li className="text-sm text-slate-400">No expenses in this period.</li>
                    ) : (
                      statisticData.top5Expenses.map((row, i) => (
                        <li
                          key={row.category_name}
                          className="flex items-center justify-between gap-2 text-sm"
                        >
                          <span className="inline-flex items-center gap-2">
                            <span
                              className="rounded px-1.5 py-0.5 text-xs font-medium text-white"
                              style={{ backgroundColor: DONUT_COLORS[i] ?? DONUT_COLORS[5] }}
                            >
                              {row.percentage}%
                            </span>
                            <span className="text-slate-700">{row.category_name}</span>
                          </span>
                          <span className="font-medium text-slate-900">{fmt(row.amount)}</span>
                        </li>
                      ))
                    )}
                </ul>
              </div>
            </div>
          </section>
          )}
        </div>

        {/* Recent Transactions — full width below Cashflow/Statistic */}
        <section className="w-full">
          <div className="rounded-[14px] border border-[#eef1f4] bg-white p-6 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-lg font-semibold text-[#1f2933]">Recent Transactions</h3>
              <div className="flex items-center gap-2">
                <select
                  value={recentPeriod}
                  onChange={(e) => setRecentPeriod(e.target.value as "month" | "year")}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm font-medium text-slate-700 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="month">This month</option>
                  <option value="year">This year</option>
                </select>
                <button
                  type="button"
                  className="rounded-lg border border-slate-200 bg-slate-50/80 p-2 text-slate-600 transition-colors hover:bg-slate-100"
                  title="Filter"
                >
                  <Filter className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-xs font-medium uppercase tracking-wider text-slate-500">
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
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No transactions in this period.
                      </td>
                    </tr>
                  ) : (
                    recentTransactions.map((tx) => (
                      <tr key={tx.id} className="border-b border-slate-100 last:border-0">
                        <td className="py-3">
                          <p className="font-medium text-slate-800">{tx.name}</p>
                          <p className="text-xs text-slate-500">{tx.sub}</p>
                        </td>
                        <td className="py-3 text-slate-600">{tx.account}</td>
                        <td className="py-3 text-slate-600">
                          <p>{tx.date}</p>
                          <p className="text-xs text-slate-500">{tx.time}</p>
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
