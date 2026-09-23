import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveCurrentSchoolTerm } from "./adminFinanceTerm";
import {
  addCalendarDaysToIsoYmd,
  calendarDateIsoInTimeZone,
  firstDayOfMonthIsoYmd,
} from "./schoolCalendarDate";
import { formatAcademicPeriod, isTertiarySchool } from "./academicPeriodTerminology";

export type AccountantTermBrief = {
  id: string;
  label: string;
  term: number;
  year: number;
  start_date?: string | null;
  end_date?: string | null;
};

/** One school term’s slice of receivables (for donut / breakdown). */
export type TermOutstandingSlice = {
  termId: string;
  termLabel: string;
  term: number;
  year: number;
  expectedFees: number;
  totalPaidOnLedger: number;
  outstanding: number;
};

export type AccountantDashboardMetrics = {
  asOfDate: string;
  calendarYear: number;
  isTertiary: boolean;
  periodNoun: string;
  currentTerm: AccountantTermBrief | null;
  termPerformance: {
    feesExpected: number;
    feesCollectedAttributed: number;
    /**
     * All non-reversed fee payments whose payment_date falls within the current term’s
     * [start_date, end_date] window (capped at as-of date), any term_id — cash physically
     * received while this term runs, including clearing older-term balances.
     */
    cashIn: number;
    outstandingOnTerm: number;
    /** 0–100 when feesExpected > 0; else null */
    collectionRatePercent: number | null;
    expensesApproved: number;
    netTermCash: number;
  };
  receivablesAllTerms: {
    totalOutstanding: number;
    onCurrentTerm: number;
    onPriorTerms: number;
    debtorStudentCount: number;
    byTerm: TermOutstandingSlice[];
  };
  /** Fee receipts by payment_date — all terms. */
  cashActivity: {
    todayAllTerms: number;
    last7DaysAllTerms: number;
    monthToDateAllTerms: number;
  };
  /**
   * Lifetime totals on the same basis as “Net cash surplus”: all non-reversed fee receipts vs approved/paid expenses.
   */
  cashflowAllTime: {
    totalFeeReceipts: number;
    totalExpenses: number;
    netCash: number;
  };
  /** Sum of discount amounts recorded for the school (no term filter). */
  discountsSchoolWide: number;
  /**
   * Treasury-style view: every non-reversed fee payment (any term_id) minus every
   * approved/paid expense (any term). Matches “cash still with the school” only if
   * the ledger is complete from day one; does not add a manual opening bank balance.
   */
  schoolCashPosition: {
    netCashSurplus: number;
    /** Approved/paid school expenses for the current academic term only (`term_id` match). */
    totalExpensesApprovedPaidCurrentTerm: number;
  };
  /**
   * Current-term attributed collections by reporting bucket.
   * Bank = bank, mobile money, POS, online, cheque, and other non-gateway methods.
   * School Pay / Sure Pay = respective integrations only.
   */
  collectionsByMethod: {
    cash: number;
    bank: number;
    school_pay: number;
    sure_pay: number;
  };
  recentPayments: Array<{
    payment_id: string;
    student_name: string;
    class: string;
    receipt_number: string | null;
    payment_date: string;
    amount_paid: number;
    payment_method: string;
  }>;
};

type BalanceRow = {
  student_id?: string;
  term_id?: string | null;
  total_fees?: number | string | null;
  total_paid?: number | string | null;
  balance?: number | string | null;
};

type PaymentRow = {
  amount_paid?: number | string | null;
  payment_date?: string | null;
  payment_method?: string | null;
  student_id?: string;
  term_id?: string | null;
};

function num(v: unknown): number {
  if (v == null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

async function fetchAllSchoolBalances(client: SupabaseClient, schoolId: string): Promise<BalanceRow[]> {
  const all: BalanceRow[] = [];
  const chunkSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await client
      .from("student_balances")
      .select("student_id, term_id, total_fees, total_paid, balance")
      .eq("school_id", schoolId)
      .range(from, from + chunkSize - 1);
    if (error || !data || data.length === 0) break;
    all.push(...(data as BalanceRow[]));
    if (data.length < chunkSize) break;
    from += chunkSize;
  }
  return all;
}

async function fetchAllSchoolPayments(
  client: SupabaseClient,
  schoolId: string,
  paymentCutoff: string
): Promise<PaymentRow[]> {
  const all: PaymentRow[] = [];
  const chunkSize = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await client
      .from("student_payments")
      .select("amount_paid, payment_date, payment_method, student_id, term_id, reversed_at")
      .eq("school_id", schoolId)
      .is("reversed_at", null)
      .gte("payment_date", paymentCutoff)
      .order("payment_date", { ascending: false })
      .range(from, from + chunkSize - 1);
    if (error || !data || data.length === 0) break;
    all.push(...(data as PaymentRow[]));
    if (data.length < chunkSize) break;
    from += chunkSize;
  }
  return all;
}

export async function fetchAccountantDashboardMetrics(
  client: SupabaseClient,
  schoolId: string,
  todayIso = calendarDateIsoInTimeZone(new Date())
): Promise<AccountantDashboardMetrics> {
  const calendarYear = Number(todayIso.slice(0, 4));
  const weekStartStr = addCalendarDaysToIsoYmd(todayIso, -7);
  const monthStartStr = firstDayOfMonthIsoYmd(todayIso);

  const currentTermRaw = await resolveCurrentSchoolTerm(client, schoolId, todayIso);
  const currentTermId = currentTermRaw?.id ?? null;

  // Fetch payments going back 2 years — covers all dashboard metrics (today / 7-day /
  // month / term). Schools using the system for < 2 years see no difference.
  const paymentCutoff = addCalendarDaysToIsoYmd(todayIso, -730);

  const [
    termsRes,
    allBalances,
    payments,
    expensesTermRes,
    expensesAllTimeRes,
    discountsRes,
    recentPayRes,
    schoolRes,
  ] = await Promise.all([
    client
      .from("school_terms")
      .select("id, term, year, start_date, end_date")
      .eq("school_id", schoolId)
      .order("year", { ascending: false })
      .order("term", { ascending: false }),
    fetchAllSchoolBalances(client, schoolId),
    fetchAllSchoolPayments(client, schoolId, paymentCutoff),
    currentTermId
      ? client
          .from("school_expenses")
          .select("amount, status")
          .eq("school_id", schoolId)
          .eq("term_id", currentTermId)
      : Promise.resolve({ data: [] as { amount?: number; status?: string }[] }),
    client.from("school_expenses").select("amount, status").eq("school_id", schoolId).limit(2000),
    client.from("student_discounts").select("amount").eq("school_id", schoolId),
    client
      .from("student_payments")
      .select("payment_id, amount_paid, payment_date, payment_method, receipt_number, student_id, reversed_at")
      .eq("school_id", schoolId)
      .is("reversed_at", null)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(10),
    client.from("schools").select("type").eq("school_id", schoolId).maybeSingle(),
  ]);

  const schoolType = (schoolRes.data as { type?: string } | null)?.type;
  const isTertiary = isTertiarySchool(schoolType);
  const periodNoun = isTertiary ? 'Semester' : 'Term';

  const terms = (termsRes.data || []) as {
    id: string;
    term: number;
    year: number;
    start_date?: string | null;
    end_date?: string | null;
  }[];

  const currentTerm: AccountantTermBrief | null = currentTermRaw
    ? {
        id: currentTermRaw.id,
        label: formatAcademicPeriod(currentTermRaw.term ?? 1, isTertiary, { year: currentTermRaw.year ?? calendarYear }),
        term: currentTermRaw.term ?? 1,
        year: currentTermRaw.year ?? calendarYear,
        start_date: currentTermRaw.start_date,
        end_date: currentTermRaw.end_date,
      }
    : null;

  const byTermAgg: Record<
    string,
    { expected: number; paidLedger: number; outstanding: number }
  > = {};

  for (const b of allBalances) {
    const tid = b.term_id;
    if (!tid) continue;
    if (!byTermAgg[tid]) byTermAgg[tid] = { expected: 0, paidLedger: 0, outstanding: 0 };
    const tf = num(b.total_fees);
    const bal = num(b.balance);
    byTermAgg[tid].expected += tf;
    byTermAgg[tid].paidLedger += num(b.total_paid);
    if (tf > 0 && bal > 0) byTermAgg[tid].outstanding += Math.max(0, bal);
  }

  const debtorIds = new Set<string>();
  for (const b of allBalances) {
    const sid = b.student_id;
    if (!sid) continue;
    const tf = num(b.total_fees);
    const bal = num(b.balance);
    if (tf > 0 && bal > 0) debtorIds.add(sid);
  }

  const byTerm: TermOutstandingSlice[] = terms
    .filter((t) => byTermAgg[t.id])
    .map((t) => ({
      termId: t.id,
      termLabel: formatAcademicPeriod(t.term, isTertiary, { year: t.year }),
      term: t.term,
      year: t.year,
      expectedFees: byTermAgg[t.id].expected,
      totalPaidOnLedger: byTermAgg[t.id].paidLedger,
      outstanding: byTermAgg[t.id].outstanding,
    }));

  const totalOutstanding = byTerm.reduce((s, r) => s + r.outstanding, 0);
  const curSlice = currentTermId ? byTerm.find((r) => r.termId === currentTermId) : undefined;
  const onCurrentTerm = curSlice?.outstanding ?? 0;
  const onPriorTerms = Math.max(0, totalOutstanding - onCurrentTerm);

  let feesExpected = 0;
  let outstandingOnTerm = 0;
  if (currentTermId) {
    for (const b of allBalances) {
      if (b.term_id !== currentTermId) continue;
      feesExpected += num(b.total_fees);
      outstandingOnTerm += Math.max(0, num(b.balance));
    }
  }

  const paymentsCurrentTerm = currentTermId
    ? payments.filter((p) => p.term_id === currentTermId)
    : [];
  const feesCollectedAttributed = paymentsCurrentTerm.reduce((s, p) => s + num(p.amount_paid), 0);

  const termStartIso =
    currentTerm?.start_date != null && String(currentTerm.start_date).trim() !== ""
      ? String(currentTerm.start_date).slice(0, 10)
      : null;
  const termEndIso =
    currentTerm?.end_date != null && String(currentTerm.end_date).trim() !== ""
      ? String(currentTerm.end_date).slice(0, 10)
      : null;
  let cashIn = 0;
  if (termStartIso) {
    const windowEnd = termEndIso && termEndIso < todayIso ? termEndIso : todayIso;
    for (const p of payments) {
      const d = p.payment_date;
      if (!d) continue;
      const d0 = d.slice(0, 10);
      if (d0 >= termStartIso && d0 <= windowEnd) cashIn += num(p.amount_paid);
    }
  }

  const collectionRatePercent =
    feesExpected > 0.01 ? Math.min(100, Math.round((feesCollectedAttributed / feesExpected) * 1000) / 10) : null;

  const expensesTerm = (expensesTermRes.data || []) as { amount?: number; status?: string }[];
  const expensesApproved = expensesTerm
    .filter((e) => ["approved", "paid"].includes((e.status || "").toLowerCase()))
    .reduce((s, e) => s + num(e.amount), 0);

  const netTermCash = feesCollectedAttributed - expensesApproved;

  const byMethod = { cash: 0, bank: 0, school_pay: 0, sure_pay: 0 };
  for (const p of paymentsCurrentTerm) {
    const m = (p.payment_method || "").toLowerCase();
    const amt = num(p.amount_paid);
    if (m === "cash") byMethod.cash += amt;
    else if (m === "school_pay") byMethod.school_pay += amt;
    else if (m === "sure_pay") byMethod.sure_pay += amt;
    else byMethod.bank += amt;
  }

  let todayAllTerms = 0;
  let last7DaysAllTerms = 0;
  let monthToDateAllTerms = 0;
  for (const p of payments) {
    const d = p.payment_date;
    if (!d) continue;
    const amt = num(p.amount_paid);
    if (d === todayIso) todayAllTerms += amt;
    if (d >= weekStartStr && d <= todayIso) last7DaysAllTerms += amt;
    if (d >= monthStartStr && d <= todayIso) monthToDateAllTerms += amt;
  }

  const discountsSchoolWide = (discountsRes.data || []).reduce(
    (s, d: { amount?: number | string | null }) => s + num(d.amount),
    0
  );

  const recentRows = (recentPayRes.data || []) as {
    payment_id: string;
    student_id: string;
    amount_paid: number;
    payment_date: string;
    payment_method: string;
    receipt_number: string | null;
  }[];
  const recentStudentIds = [...new Set(recentRows.map((r) => r.student_id))];
  const { data: recentStudents } =
    recentStudentIds.length > 0
      ? await client
          .from("students")
          .select("student_id, name, current_class")
          .in("student_id", recentStudentIds)
      : { data: [] as { student_id: string; name: string; current_class: string }[] };
  const recentStudentMap = new Map(
    (recentStudents || []).map((s) => [s.student_id, { name: s.name, current_class: s.current_class }])
  );
  const recentPayments = recentRows.map((r) => {
    const st = recentStudentMap.get(r.student_id);
    return {
      payment_id: r.payment_id,
      student_name: st?.name ?? "—",
      class: st?.current_class ?? "—",
      receipt_number: r.receipt_number ?? null,
      payment_date: r.payment_date,
      amount_paid: num(r.amount_paid),
      payment_method: r.payment_method ?? "—",
    };
  });

  const totalFeeReceiptsRecorded = payments.reduce((s, p) => s + num(p.amount_paid), 0);
  const totalExpensesApprovedPaidAllTerms = (expensesAllTimeRes.data || []).reduce(
    (s, e: { amount?: number; status?: string }) => {
      if (!["approved", "paid"].includes((e.status || "").toLowerCase())) return s;
      return s + num(e.amount);
    },
    0
  );
  const netCashSurplus = totalFeeReceiptsRecorded - totalExpensesApprovedPaidAllTerms;

  return {
    asOfDate: todayIso,
    calendarYear,
    isTertiary,
    periodNoun,
    currentTerm,
    termPerformance: {
      feesExpected,
      feesCollectedAttributed,
      cashIn,
      outstandingOnTerm,
      collectionRatePercent,
      expensesApproved,
      netTermCash,
    },
    receivablesAllTerms: {
      totalOutstanding: totalOutstanding,
      onCurrentTerm,
      onPriorTerms,
      debtorStudentCount: debtorIds.size,
      byTerm,
    },
    cashActivity: {
      todayAllTerms,
      last7DaysAllTerms,
      monthToDateAllTerms,
    },
    cashflowAllTime: {
      totalFeeReceipts: Math.round(totalFeeReceiptsRecorded),
      totalExpenses: Math.round(totalExpensesApprovedPaidAllTerms),
      netCash: netCashSurplus,
    },
    discountsSchoolWide,
    schoolCashPosition: {
      netCashSurplus,
      totalExpensesApprovedPaidCurrentTerm: expensesApproved,
    },
    collectionsByMethod: byMethod,
    recentPayments,
  };
}

export type RecentAccountantTransaction = {
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

export async function fetchRecentAccountantTransactions(
  client: SupabaseClient,
  schoolId: string,
  period: "month" | "year"
): Promise<RecentAccountantTransaction[]> {
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
    client
      .from("student_payments")
      .select("payment_id, student_id, amount_paid, payment_date, payment_method, created_at, reversed_at")
      .eq("school_id", schoolId)
      .is("reversed_at", null)
      .gte("payment_date", start)
      .lte("payment_date", end)
      .order("payment_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(15),
    client
      .from("school_expenses")
      .select("expense_id, amount, expense_date, status, category_name, description, created_at")
      .eq("school_id", schoolId)
      .gte("expense_date", start)
      .lte("expense_date", end)
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const paymentsRaw = paymentsRes.data || [];
  const studentIds = [...new Set((paymentsRaw as { student_id: string }[]).map((p) => p.student_id))];
  const { data: studentsData } =
    studentIds.length > 0
      ? await client.from("students").select("student_id, name").in("student_id", studentIds)
      : { data: [] };
  const studentMap = new Map(
    (studentsData || []).map((s: { student_id: string; name: string }) => [s.student_id, s.name])
  );

  const paymentRows: RecentAccountantTransaction[] = (paymentsRaw as {
    payment_id: string;
    student_id: string;
    amount_paid: number;
    payment_date: string;
    payment_method: string;
    created_at: string;
  }[]).map((p) => {
    const created = p.created_at ? new Date(p.created_at) : new Date(p.payment_date);
    const method = (p.payment_method || "").toLowerCase();
    let account = "Bank";
    if (method === "cash") account = "Cash";
    else if (method === "school_pay") account = "School Pay";
    else if (method === "sure_pay") account = "Sure Pay";
    else if (["bank", "cheque", "pos", "online", "mobile_money", "other"].includes(method)) account = "Bank";
    const studentName = studentMap.get(p.student_id);
    return {
      id: p.payment_id,
      type: "payment" as const,
      name: "Fee payment",
      sub: "Fee receipt",
      account: studentName ? `${account} · ${studentName}` : account,
      date: p.payment_date,
      time: created.toTimeString().slice(0, 5),
      amount: num(p.amount_paid),
      status: "Completed" as const,
    };
  });

  const expenseRows: RecentAccountantTransaction[] = ((expensesRes.data || []) as {
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
      type: "expense" as const,
      name: e.category_name || "Expense",
      sub: "Expense",
      account: "School",
      date: e.expense_date,
      time: created.toTimeString().slice(0, 5),
      amount: -num(e.amount),
      status: ["approved", "paid"].includes((e.status || "").toLowerCase()) ? ("Completed" as const) : ("Pending" as const),
    };
  });

  const merged = [...paymentRows, ...expenseRows].sort((a, b) => {
    const d = b.date.localeCompare(a.date);
    if (d !== 0) return d;
    return b.time.localeCompare(a.time);
  });
  return merged.slice(0, 5);
}
