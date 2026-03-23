import { supabase } from "../../lib/supabase";

export const FINANCIAL_ANALYTICS_QUERY_KEY = ["financial-analytics"] as const;

export type PeriodType = "week" | "month" | "year" | "custom";

/** Calendar financial year (Jan–Dec), aligned to school_terms.year */
export type SchoolTermRow = {
  id: string;
  term: number;
  year: number;
  label: string;
  start_date: string;
  end_date: string;
  is_current: boolean | null;
};

export type TermScope = "one" | "all";

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function maxDate(a: string, b: string): string {
  return a >= b ? a : b;
}

function minDate(a: string, b: string): string {
  return a <= b ? a : b;
}

/** Monday-start week in local time; end is today. */
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

/** Jan 1 – Dec 31 for the given calendar year. */
export function financialYearBounds(year: number): { start: string; end: string } {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
}

export function currentCalendarYear(): number {
  return new Date().getFullYear();
}

/** Prefer term containing today; else is_current; else latest year/term. */
export function pickCurrentTermId(terms: SchoolTermRow[], today: string): string | null {
  if (!terms.length) return null;
  const inRange = terms.filter((t) => t.start_date <= today && t.end_date >= today);
  if (inRange.length) {
    const sorted = [...inRange].sort((a, b) => b.year - a.year || b.term - a.term);
    return sorted[0].id;
  }
  const flagged = terms.filter((t) => t.is_current === true);
  if (flagged.length) return flagged[0].id;
  const sorted = [...terms].sort((a, b) => b.year - a.year || b.term - a.term);
  return sorted[0]?.id ?? null;
}

export function termIdsForFinancialYear(terms: SchoolTermRow[], financialYear: number): string[] {
  return terms.filter((t) => t.year === financialYear).map((t) => t.id);
}

export function financialYearOptionsFromTerms(terms: SchoolTermRow[]): number[] {
  const years = new Set<number>();
  terms.forEach((t) => years.add(t.year));
  years.add(currentCalendarYear());
  return [...years].sort((a, b) => b - a);
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
  /** Effective date window after FY / term / period clipping */
  effectiveStart: string;
  effectiveEnd: string;
};

const BAR_ROTATION: CategorySpendRow["barClass"][] = ["bar-green", "bar-red", "bar-blue", "bar-gold"];

function formatNetK(n: number): string {
  const sign = n >= 0 ? "+" : "-";
  const v = Math.abs(Math.round(n));
  if (v >= 1_000_000) return `${sign}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${sign}${Math.round(v / 1000)}K`;
  return `${sign}${v}`;
}

export async function fetchSchoolTerms(schoolId: string): Promise<SchoolTermRow[]> {
  const { data } = await supabase
    .from("school_terms")
    .select("id, term, year, start_date, end_date, is_current")
    .eq("school_id", schoolId)
    .order("year", { ascending: false })
    .order("term", { ascending: false });

  const rows = (data || []) as {
    id: string;
    term: number;
    year: number;
    start_date: string;
    end_date: string;
    is_current: boolean | null;
  }[];
  return rows.map((t) => ({
    id: t.id,
    term: t.term,
    year: t.year,
    label: `Term ${t.term}, ${t.year}`,
    start_date: t.start_date,
    end_date: t.end_date,
    is_current: t.is_current,
  }));
}

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

function buildPaymentFilter(
  schoolId: string,
  termScope: TermScope,
  termIds: string[],
  singleTermId: string | undefined
) {
  let q = supabase
    .from("student_payments")
    .select("amount_paid, payment_date")
    .eq("school_id", schoolId)
    .is("reversed_at", null);
  if (termScope === "all") {
    if (!termIds.length) return null;
    q = q.in("term_id", termIds);
  } else if (singleTermId) {
    q = q.eq("term_id", singleTermId);
  } else {
    return null;
  }
  return q;
}

export async function fetchFinancialAnalytics(params: {
  schoolId: string;
  financialYear: number;
  termScope: TermScope;
  /** Required when termScope === 'one' */
  termId?: string;
  period: PeriodType;
  customRange?: { start: string; end: string };
  terms: SchoolTermRow[];
}): Promise<FinancialAnalyticsData> {
  const { schoolId, financialYear, termScope, termId, period, customRange, terms } = params;

  const fy = financialYearBounds(financialYear);
  const todayStr = toIsoDate(new Date());
  const periodRange = getDateRange(period, customRange);

  let clipStart = maxDate(periodRange.start, fy.start);
  let clipEnd = minDate(minDate(periodRange.end, fy.end), todayStr);

  const yearTermIds = termIdsForFinancialYear(terms, financialYear);

  if (termScope === "one" && termId) {
    const row = terms.find((t) => t.id === termId);
    if (row) {
      clipStart = maxDate(clipStart, row.start_date);
      clipEnd = minDate(clipEnd, row.end_date);
    }
  }

  if (clipStart > clipEnd) {
    return {
      totalIncome: 0,
      totalSpent: 0,
      net: 0,
      payroll: 0,
      scholarships: 0,
      incomeBarPct: 100,
      expenseBarPct: 0,
      payrollBarPct: 0,
      scholarshipBarPct: 0,
      verdict: "No data in this date range.",
      categories: [],
      trend: lastSixMonthRanges().map((r) => ({
        label: r.label,
        income: 0,
        spent: 0,
        net: 0,
        netLabel: formatNetK(0),
      })),
      effectiveStart: clipStart,
      effectiveEnd: clipEnd,
    };
  }

  const start = clipStart;
  const end = clipEnd;
  const startTs = `${start}T00:00:00.000Z`;
  const endTs = `${end}T23:59:59.999Z`;

  const trendRanges = lastSixMonthRanges();
  const trendStart = trendRanges[0]?.start ?? start;

  const mainPayFilter = buildPaymentFilter(
    schoolId,
    termScope,
    yearTermIds,
    termScope === "one" ? termId : undefined
  );
  const trendPayFilter = buildPaymentFilter(
    schoolId,
    termScope,
    yearTermIds,
    termScope === "one" ? termId : undefined
  );

  if (!mainPayFilter || !trendPayFilter) {
    return {
      totalIncome: 0,
      totalSpent: 0,
      net: 0,
      payroll: 0,
      scholarships: 0,
      incomeBarPct: 100,
      expenseBarPct: 0,
      payrollBarPct: 0,
      scholarshipBarPct: 0,
      verdict: "Select a financial year with configured terms.",
      categories: [],
      trend: lastSixMonthRanges().map((r) => ({
        label: r.label,
        income: 0,
        spent: 0,
        net: 0,
        netLabel: formatNetK(0),
      })),
      effectiveStart: start,
      effectiveEnd: end,
    };
  }

  const [
    paymentsRes,
    expensesRes,
    discountsRes,
    trendPaymentsRes,
    trendExpensesRes,
  ] = await Promise.all([
    mainPayFilter.gte("payment_date", start).lte("payment_date", end),
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
    trendPayFilter.gte("payment_date", trendStart).lte("payment_date", todayStr),
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
    const st = (e.status || "").toLowerCase();
    return st === "approved" || st === "paid";
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
    effectiveStart: start,
    effectiveEnd: end,
  };
}
