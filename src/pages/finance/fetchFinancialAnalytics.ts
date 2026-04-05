import { supabase } from "../../lib/supabase";

export const FINANCIAL_ANALYTICS_QUERY_KEY = ["financial-analytics"] as const;

export type PeriodType = "term" | "week" | "month" | "year" | "custom";

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

/** Local calendar date as YYYY-MM-DD (avoid UTC drift from toISOString for non-UTC users). */
function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function maxDate(a: string, b: string): string {
  return a >= b ? a : b;
}

function minDate(a: string, b: string): string {
  return a <= b ? a : b;
}

function parseIsoLocal(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Calendar-day arithmetic (local) for ISO date strings. */
export function addDays(iso: string, delta: number): string {
  const d = parseIsoLocal(iso);
  d.setDate(d.getDate() + delta);
  return toIsoDate(d);
}

export function daysInclusive(start: string, end: string): number {
  const a = parseIsoLocal(start).getTime();
  const b = parseIsoLocal(end).getTime();
  return Math.round((b - a) / (24 * 60 * 60 * 1000)) + 1;
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

  if (period === "term") {
    return { start: today, end: today };
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

/**
 * Period relative to "now", anchored so "year" means Jan 1 → min(today, FY end) for the selected financial year.
 */
function getPeriodRangeForFinancialYear(
  period: PeriodType,
  custom: { start: string; end: string } | undefined,
  financialYear: number
): { start: string; end: string } {
  const now = new Date();
  const today = toIsoDate(now);
  const fy = financialYearBounds(financialYear);
  const yearEnd = minDate(today, fy.end);

  if (period === "custom" && custom?.start && custom?.end) {
    return { start: custom.start, end: custom.end };
  }

  if (period === "term") {
    return { start: fy.start, end: yearEnd };
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
    return { start: fy.start, end: yearEnd };
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

function clipToFyTerm(
  periodRange: { start: string; end: string },
  financialYear: number,
  terms: SchoolTermRow[],
  termScope: TermScope,
  termId: string | undefined,
  todayStr: string
): { start: string; end: string } {
  const fy = financialYearBounds(financialYear);
  let clipStart = maxDate(periodRange.start, fy.start);
  let clipEnd = minDate(minDate(periodRange.end, fy.end), todayStr);

  if (termScope === "one" && termId) {
    const row = terms.find((t) => t.id === termId);
    if (row) {
      clipStart = maxDate(clipStart, row.start_date);
      clipEnd = minDate(clipEnd, row.end_date);
    }
  }
  return { start: clipStart, end: clipEnd };
}

/** Previous window of the same length (immediately before current start), clipped to FY/term. */
function previousComparableRange(
  currentStart: string,
  currentEnd: string,
  financialYear: number,
  terms: SchoolTermRow[],
  termScope: TermScope,
  termId: string | undefined,
  todayStr: string
): { start: string; end: string } | null {
  const n = daysInclusive(currentStart, currentEnd);
  if (n < 1) return null;
  const prevEnd = addDays(currentStart, -1);
  const prevStart = addDays(prevEnd, -(n - 1));
  const clipped = clipToFyTerm({ start: prevStart, end: prevEnd }, financialYear, terms, termScope, termId, todayStr);
  if (clipped.start > clipped.end) return null;
  return clipped;
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

export type PaymentMethodRow = {
  method: string;
  amount: number;
  pct: number;
  barClass: "bar-green" | "bar-red" | "bar-blue" | "bar-gold";
};

export type PeriodComparison = {
  prevStart: string;
  prevEnd: string;
  prevIncome: number;
  prevSpent: number;
  prevNet: number;
  /** Prior-period operating margin (prevNet ÷ prevIncome), % */
  prevMarginPct: number | null;
  incomeChangePct: number | null;
  spentChangePct: number | null;
  netChangePct: number | null;
  /** Change in margin vs prior period, percentage points (not %) */
  marginChangePp: number | null;
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
  effectiveStart: string;
  effectiveEnd: string;
  paymentMethods: PaymentMethodRow[];
  comparison: PeriodComparison | null;
  /**
   * School-wide outstanding across all terms — same rule as admin **Total overall balance**
   * (`fetchAdminDesignDashboardKpis`: sum of balance where total_fees > 0 and balance > 0).
   */
  ledgerOutstanding: number;
  /** Sum of `student_balances.total_fees` across all terms for the school (invoice totals on record). */
  ledgerTotalFees: number;
};

/**
 * Matches admin dashboard **Total overall balance** plus total fees on ledger (all `student_balances` rows).
 */
export function aggregateLedgerSchoolWide(rows: { total_fees?: number; balance?: number }[]): {
  outstanding: number;
  totalFeesOnLedger: number;
} {
  let outstanding = 0;
  let totalFeesOnLedger = 0;
  for (const r of rows) {
    const tf = Number(r.total_fees ?? 0);
    const bal = Number(r.balance ?? 0);
    totalFeesOnLedger += tf;
    if (tf > 0 && bal > 0) outstanding += Math.max(0, bal);
  }
  return {
    outstanding: Math.round(outstanding),
    totalFeesOnLedger: Math.round(totalFeesOnLedger),
  };
}

const BAR_ROTATION: CategorySpendRow["barClass"][] = ["bar-green", "bar-red", "bar-blue", "bar-gold"];

function formatNetK(n: number): string {
  const sign = n >= 0 ? "+" : "-";
  const v = Math.abs(Math.round(n));
  if (v >= 1_000_000) return `${sign}${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1000) return `${sign}${Math.round(v / 1000)}K`;
  return `${sign}${v}`;
}

function pctChange(curr: number, prev: number): number | null {
  if (prev <= 0) return null;
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

function aggregatePaymentMethods(
  payments: { amount_paid?: number; payment_method?: string | null }[]
): PaymentMethodRow[] {
  const map = new Map<string, number>();
  for (const p of payments) {
    const raw = (p.payment_method || "").trim();
    const key = raw ? raw : "Other";
    map.set(key, (map.get(key) || 0) + Number(p.amount_paid || 0));
  }
  const total = [...map.values()].reduce((a, b) => a + b, 0);
  const rows = [...map.entries()]
    .map(([method, amount]) => ({ method, amount: Math.round(amount) }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 8);
  return rows.map((row, i) => ({
    ...row,
    pct: total > 0 ? Math.round((row.amount / total) * 100) : 0,
    barClass: BAR_ROTATION[i % BAR_ROTATION.length],
  }));
}

function emptyTrend(): TrendMonthRow[] {
  return lastSixMonthRanges().map((r) => ({
    label: r.label,
    income: 0,
    spent: 0,
    net: 0,
    netLabel: formatNetK(0),
  }));
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
    .select("amount_paid, payment_date, payment_method")
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
  termId?: string;
  period: PeriodType;
  customRange?: { start: string; end: string };
  terms: SchoolTermRow[];
}): Promise<FinancialAnalyticsData> {
  const { schoolId, financialYear, termScope, termId, period, customRange, terms } = params;

  const todayStr = toIsoDate(new Date());
  const termRow = termScope === "one" && termId ? terms.find((t) => t.id === termId) : undefined;

  const periodRange =
    period === "term" && termRow
      ? { start: termRow.start_date, end: todayStr }
      : getPeriodRangeForFinancialYear(period, customRange, financialYear);

  const { start: clipStart, end: clipEnd } = clipToFyTerm(
    periodRange,
    financialYear,
    terms,
    termScope,
    termScope === "one" ? termId : undefined,
    todayStr
  );

  const yearTermIds = termIdsForFinancialYear(terms, financialYear);

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
      trend: emptyTrend(),
      effectiveStart: clipStart,
      effectiveEnd: clipEnd,
      paymentMethods: [],
      comparison: null,
      ledgerOutstanding: 0,
      ledgerTotalFees: 0,
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
      trend: emptyTrend(),
      effectiveStart: start,
      effectiveEnd: end,
      paymentMethods: [],
      comparison: null,
      ledgerOutstanding: 0,
      ledgerTotalFees: 0,
    };
  }

  /** All terms: aligns KPIs with admin dashboard total overall balance (not filtered by analytics period/term). */
  const ledgerBalancesPromise = supabase
    .from("student_balances")
    .select("balance, total_fees")
    .eq("school_id", schoolId);

  const prevRange = previousComparableRange(start, end, financialYear, terms, termScope, termScope === "one" ? termId : undefined, todayStr);

  const prevPayPromise =
    prevRange &&
    (() => {
      const pf = buildPaymentFilter(
        schoolId,
        termScope,
        yearTermIds,
        termScope === "one" ? termId : undefined
      );
      return pf
        ? pf.gte("payment_date", prevRange.start).lte("payment_date", prevRange.end)
        : Promise.resolve({ data: [] as { amount_paid?: number }[] });
    })();

  const prevExpPromise =
    prevRange &&
    supabase
      .from("school_expenses")
      .select("amount, expense_date, status")
      .eq("school_id", schoolId)
      .gte("expense_date", prevRange.start)
      .lte("expense_date", prevRange.end);

  const [
    paymentsRes,
    expensesRes,
    discountsRes,
    trendPaymentsRes,
    trendExpensesRes,
    prevPayRes,
    prevExpRes,
    ledgerRes,
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
    prevPayPromise || Promise.resolve({ data: [] }),
    prevExpPromise || Promise.resolve({ data: [] }),
    ledgerBalancesPromise,
  ]);

  const ledgerRows = (ledgerRes.data || []) as { balance?: number; total_fees?: number }[];
  const ledgerAgg = aggregateLedgerSchoolWide(ledgerRows);
  const ledgerOutstanding = ledgerAgg.outstanding;
  const ledgerTotalFees = ledgerAgg.totalFeesOnLedger;

  const payments = (paymentsRes.data || []) as {
    amount_paid?: number;
    payment_date?: string;
    payment_method?: string | null;
  }[];
  const totalIncome = Math.round(payments.reduce((s, p) => s + Number(p.amount_paid || 0), 0));
  const paymentMethods = aggregatePaymentMethods(payments);

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

  let comparison: PeriodComparison | null = null;
  if (prevRange && prevPayRes && prevExpRes) {
    const prevPayments = (prevPayRes as { data?: { amount_paid?: number }[] }).data || [];
    const prevIncome = Math.round(prevPayments.reduce((s, p) => s + Number(p.amount_paid || 0), 0));
    const prevExpRaw = ((prevExpRes as { data?: unknown[] }).data || []) as {
      amount?: number;
      status?: string;
    }[];
    const prevSpent = Math.round(
      prevExpRaw
        .filter((e) => {
          const st = (e.status || "").toLowerCase();
          return st === "approved" || st === "paid";
        })
        .reduce((s, e) => s + Number(e.amount || 0), 0)
    );
    const prevNet = prevIncome - prevSpent;
    const prevMarginPct =
      prevIncome > 0 ? Math.round((prevNet / prevIncome) * 1000) / 10 : null;
    const currMarginPct =
      totalIncome > 0 ? Math.round((net / totalIncome) * 1000) / 10 : null;
    const marginChangePp =
      currMarginPct != null && prevMarginPct != null
        ? Math.round((currMarginPct - prevMarginPct) * 10) / 10
        : null;
    comparison = {
      prevStart: prevRange.start,
      prevEnd: prevRange.end,
      prevIncome,
      prevSpent,
      prevNet,
      prevMarginPct,
      incomeChangePct: pctChange(totalIncome, prevIncome),
      spentChangePct: pctChange(totalSpent, prevSpent),
      netChangePct: pctChange(net, prevNet),
      marginChangePp,
    };
  }

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
    paymentMethods,
    comparison,
    ledgerOutstanding,
    ledgerTotalFees,
  };
}
