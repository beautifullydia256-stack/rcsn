import { supabase } from "../../lib/supabase";

export const FINANCIAL_ANALYTICS_QUERY_KEY = ["financial-analytics"] as const;

export type PeriodType = "week" | "month" | "year" | "custom";

export type SchoolTermOption = {
  id: string;
  term: number;
  year: number;
  label: string;
};

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Monday-start week in local time; end is today if week includes today. */
export function getDateRange(
  period: PeriodType,
  custom?: { start: string; end: string }
): { start: string; end: string } {
  const now = new Date();
  const today = toIsoDate(now);

  if (period === "custom" && custom?.start && custom?.end) {
    return { start: custom.start, end: custom.end };
  }

  if (period === "week") {
    const copy = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const day = copy.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    copy.setDate(copy.getDate() + diff);
    return { start: toIsoDate(copy), end: today };
  }

  if (period === "month") {
    const start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    return { start, end: today };
  }

  if (period === "year") {
    const start = `${now.getFullYear()}-01-01`;
    return { start, end: today };
  }

  return { start: today, end: today };
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const PAYROLL_CATEGORY_RE = /salary|payroll|wage|staff pay|remuneration/i;

function isPayrollRow(e: {
  linked_teacher_id?: string | null;
  linked_other_staff_id?: string | null;
  category_name?: string | null;
}): boolean {
  if (e.linked_teacher_id || e.linked_other_staff_id) return true;
  const c = e.category_name || "";
  return PAYROLL_CATEGORY_RE.test(c);
}

export type CategorySpendRow = {
  category: string;
  subtitle: string;
  amount: number;
  pct: number;
  barClass: "bar-green" | "bar-red" | "bar-blue" | "bar-gold";
};

export type TrendMonthRow = {
  label: string;
  income: number;
  spent: number;
  net: number;
  netLabel: string;
};

export type FinancialAnalyticsData = {
  totalIncome: number;
  totalSpent: number;
  net: number;
  payroll: number;
  scholarships: number;
  incomeBarPct: number;
  expenseBarPct: number;
  payrollBarPct: number;
  scholarshipBarPct: number;
  verdict: string;
  categories: CategorySpendRow[];
  trend: TrendMonthRow[];
};

const BAR_ROTATION: CategorySpendRow["barClass"][] = ["bar-green", "bar-red", "bar-blue", "bar-gold"];

function formatNetK(n: number): string {
  const sign = n >= 0 ? "+" : "-";
  const v = Math.abs(Math.round(n));
  if (v >= 1_000_000) return `${sign}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${sign}${Math.round(v / 1000)}K`;
  return `${sign}${v}`;
}

export async function fetchSchoolTerms(schoolId: string): Promise<SchoolTermOption[]> {
  const { data } = await supabase
    .from("school_terms")
    .select("id, term, year")
    .eq("school_id", schoolId)
    .order("year", { ascending: false })
    .order("term", { ascending: false });

  const rows = (data || []) as { id: string; term: number; year: number }[];
  return rows.map((t) => ({
    id: t.id,
    term: t.term,
    year: t.year,
    label: `Term ${t.term}, ${t.year}`,
  }));
}

/** Last 6 calendar months (oldest first), with start/end date strings per month. */
function lastSixMonthRanges(): { label: string; start: string; end: string }[] {
  const out: { label: string; start: string; end: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const y = d.getFullYear();
    const m = d.getMonth();
    const start = `${y}-${String(m + 1).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const end = `${y}-${String(m + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    const label = MONTHS_SHORT[m];
    out.push({ label, start, end });
  }
  return out;
}

export async function fetchFinancialAnalytics(params: {
  schoolId: string;
  termId: string;
  period: PeriodType;
  customRange?: { start: string; end: string };
}): Promise<FinancialAnalyticsData> {
  const { schoolId, termId, period, customRange } = params;
  const { start, end } = getDateRange(period, customRange);

  const startTs = `${start}T00:00:00.000Z`;
  const endTs = `${end}T23:59:59.999Z`;

  const trendRanges = lastSixMonthRanges();
  const trendStart = trendRanges[0]?.start ?? start;
  const todayStr = toIsoDate(new Date());

  const [
    paymentsRes,
    expensesRes,
    discountsRes,
    trendPaymentsRes,
    trendExpensesRes,
  ] = await Promise.all([
    supabase
      .from("student_payments")
      .select("amount_paid, payment_date")
      .eq("school_id", schoolId)
      .eq("term_id", termId)
      .is("reversed_at", null)
      .gte("payment_date", start)
      .lte("payment_date", end),
    supabase
      .from("school_expenses")
      .select("amount, expense_date, status, category_name, description, linked_teacher_id, linked_other_staff_id")
      .eq("school_id", schoolId)
      .gte("expense_date", start)
      .lte("expense_date", end),
    supabase
      .from("student_discounts")
      .select("amount, created_at")
      .eq("school_id", schoolId)
      .gte("created_at", startTs)
      .lte("created_at", endTs),
    supabase
      .from("student_payments")
      .select("amount_paid, payment_date")
      .eq("school_id", schoolId)
      .eq("term_id", termId)
      .is("reversed_at", null)
      .gte("payment_date", trendStart)
      .lte("payment_date", todayStr),
    supabase
      .from("school_expenses")
      .select("amount, expense_date, status")
      .eq("school_id", schoolId)
      .gte("expense_date", trendStart)
      .lte("expense_date", todayStr),
  ]);

  const payments = (paymentsRes.data || []) as { amount_paid?: number; payment_date?: string }[];
  const totalIncome = Math.round(payments.reduce((s, p) => s + Number(p.amount_paid || 0), 0));

  const expensesRaw = (expensesRes.data || []) as {
    amount?: number;
    expense_date?: string;
    status?: string;
    category_name?: string | null;
    description?: string | null;
    linked_teacher_id?: string | null;
    linked_other_staff_id?: string | null;
  }[];

  const expenses = expensesRaw.filter((e) => {
    const s = (e.status || "").toLowerCase();
    return s === "approved" || s === "paid";
  });
  const totalSpent = Math.round(expenses.reduce((s, e) => s + Number(e.amount || 0), 0));

  const payroll = Math.round(
    expenses.filter((e) => isPayrollRow(e)).reduce((s, e) => s + Number(e.amount || 0), 0)
  );

  const discounts = (discountsRes.data || []) as { amount?: number }[];
  const scholarships = Math.round(discounts.reduce((s, d) => s + Number(d.amount || 0), 0));

  const net = totalIncome - totalSpent;

  const denom = totalIncome > 0 ? totalIncome : 1;
  const incomeBarPct = 100;
  const expenseBarPct = Math.min(100, Math.round((totalSpent / denom) * 100));
  const payrollBarPct = Math.min(100, Math.round((payroll / denom) * 100));
  const scholarshipBarPct = Math.min(100, Math.round((scholarships / denom) * 100));

  const verdict =
    net >= 0
      ? `You kept UGX ${net.toLocaleString()} this period — ${net > 0 ? "on track" : "break-even"}.`
      : `Net outflow of UGX ${Math.abs(net).toLocaleString()} this period — review expenses.`;

  const byCat = new Map<string, { amount: number; sampleDesc: string }>();
  for (const e of expenses) {
    const cat = (e.category_name || "Uncategorized").trim() || "Uncategorized";
    const amt = Number(e.amount || 0);
    const desc = (e.description || "").trim().split("\n")[0] || "";
    const prev = byCat.get(cat) || { amount: 0, sampleDesc: "" };
    prev.amount += amt;
    if (!prev.sampleDesc && desc) prev.sampleDesc = desc;
    byCat.set(cat, prev);
  }

  const sortedCats = [...byCat.entries()]
    .map(([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.amount - a.amount);

  const categories: CategorySpendRow[] = sortedCats.slice(0, 6).map((row, i) => {
    const pct = totalSpent > 0 ? Math.round((row.amount / totalSpent) * 100) : 0;
    return {
      category: row.category,
      subtitle: row.sampleDesc || "Various",
      amount: Math.round(row.amount),
      pct,
      barClass: BAR_ROTATION[i % BAR_ROTATION.length],
    };
  });

  const trendPayments = (trendPaymentsRes.data || []) as { amount_paid?: number; payment_date?: string }[];
  const trendExpensesAll = (trendExpensesRes.data || []) as {
    amount?: number;
    expense_date?: string;
    status?: string;
  }[];

  const trend: TrendMonthRow[] = trendRanges.map((r) => {
    const monthEnd = r.end > todayStr ? todayStr : r.end;
    let income = 0;
    for (const p of trendPayments) {
      const d = p.payment_date;
      if (!d || d < r.start || d > monthEnd) continue;
      income += Number(p.amount_paid || 0);
    }
    let spent = 0;
    for (const e of trendExpensesAll) {
      const st = (e.status || "").toLowerCase();
      if (st !== "approved" && st !== "paid") continue;
      const d = e.expense_date;
      if (!d || d < r.start || d > monthEnd) continue;
      spent += Number(e.amount || 0);
    }
    income = Math.round(income);
    spent = Math.round(spent);
    const netM = income - spent;
    return {
      label: r.label,
      income,
      spent,
      net: netM,
      netLabel: formatNetK(netM),
    };
  });

  return {
    totalIncome,
    totalSpent,
    net,
    payroll,
    scholarships,
    incomeBarPct,
    expenseBarPct,
    payrollBarPct,
    scholarshipBarPct,
    verdict,
    categories,
    trend,
  };
}
