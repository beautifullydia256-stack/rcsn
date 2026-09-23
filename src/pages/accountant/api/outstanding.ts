import { supabase } from "../../../lib/supabase";
import { formatAcademicPeriod, isTertiarySchool } from "../../../lib/academicPeriodTerminology";

export type OutstandingTermBreakdown = {
  term_id: string;
  term_label: string;
  term_number: number;
  year: number;
  total_fees: number;
  amount_paid: number;
  balance: number;
  days_overdue: number;
  invoice_number: string | null;
  term_end_date: string | null;
  is_current?: boolean;
};

export type OutstandingRow = {
  student_id: string;
  term_id: string;
  term_label: string;
  student_name: string;
  current_class: string;
  amount_paid: number;
  balance: number;
  total_fees: number;
  invoice_number: string | null;
  /** Term end_date (YYYY-MM-DD) for aging */
  term_end_date: string | null;
  /** Days overdue (0 if not past end_date) */
  days_overdue: number;
  parent_name?: string | null;
  parent_phone?: string | null;
  guardian_phone?: string | null;
  student_phone?: string | null;
  /** Term-by-term breakdown when student owes across multiple academic periods */
  terms: OutstandingTermBreakdown[];
};

export const OUTSTANDING_QUERY_KEY = ["accountant", "outstanding"] as const;

/**
 * Helper to fetch all rows across PostgREST pagination limits (which default to 1,000 rows max).
 */
async function fetchAllPages<T>(
  fetcher: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>
): Promise<T[]> {
  const all: T[] = [];
  let page = 0;
  const size = 1000;
  while (true) {
    const from = page * size;
    const to = from + size - 1;
    const { data, error } = await fetcher(from, to);
    if (error || !data || data.length === 0) break;
    all.push(...data);
    if (data.length < size) break;
    page++;
  }
  return all;
}

export async function fetchDebtors(schoolId: string): Promise<OutstandingRow[]> {
  // 1. Fetch all student balances with positive overdue balance (paginated to avoid 1,000 row cap)
  const balances = await fetchAllPages<{
    student_id: string;
    term_id: string;
    total_fees: number | null;
    total_paid: number | null;
    balance: number | null;
  }>((from, to) =>
    supabase
      .from("student_balances")
      .select("student_id, term_id, total_fees, total_paid, balance")
      .eq("school_id", schoolId)
      .gt("balance", 0)
      .range(from, to)
  );

  if (!balances?.length) return [];

  const termIds = [...new Set(balances.map((b) => b.term_id).filter(Boolean))];

  // 2. Fetch terms, students, invoices, school type, and parents in parallel
  // NOTE: Scoped purely by school_id without huge .in('student_id', array) to prevent HTTP 400 URL length limits!
  const [termsRes, students, invoices, schoolRes, parents] = await Promise.all([
    supabase
      .from("school_terms")
      .select("id, term, year, end_date, is_current")
      .in("id", termIds),
    fetchAllPages<{
      student_id: string;
      name: string;
      current_class: string | null;
      student_phone: string | null;
      guardian_name: string | null;
      guardian_phone: string | null;
    }>((from, to) =>
      supabase
        .from("students")
        .select("student_id, name, current_class, student_phone, guardian_name, guardian_phone")
        .eq("school_id", schoolId)
        .range(from, to)
    ),
    fetchAllPages<{
      student_id: string;
      term_id: string;
      invoice_number: string | null;
    }>((from, to) =>
      supabase
        .from("student_invoices")
        .select("student_id, term_id, invoice_number")
        .eq("school_id", schoolId)
        .in("term_id", termIds)
        .range(from, to)
    ),
    supabase.from("schools").select("type").eq("school_id", schoolId).maybeSingle(),
    fetchAllPages<{
      student_id: string;
      name: string | null;
      phone: string | null;
    }>((from, to) =>
      supabase
        .from("parents")
        .select("student_id, name, phone")
        .eq("school_id", schoolId)
        .range(from, to)
    ),
  ]);

  const isTertiary = isTertiarySchool((schoolRes.data as { type?: string } | null)?.type);

  const termMap = new Map<
    string,
    { label: string; term: number; year: number; end_date: string | null; is_current: boolean }
  >();
  (termsRes.data || []).forEach((t: { id: string; term: number; year: number; end_date?: string | null; is_current?: boolean }) => {
    termMap.set(t.id, {
      label: formatAcademicPeriod(t.term, isTertiary, { year: t.year }),
      term: t.term,
      year: t.year,
      end_date: t.end_date ?? null,
      is_current: Boolean(t.is_current),
    });
  });

  const studentMap = new Map(
    students.map((s) => [
      s.student_id,
      {
        name: s.name,
        current_class: s.current_class || "—",
        student_phone: s.student_phone || null,
        guardian_name: s.guardian_name || null,
        guardian_phone: s.guardian_phone || null,
      },
    ])
  );

  const parentMap = new Map<string, { name: string | null; phone: string | null }>();
  parents.forEach((row) => {
    if (row.student_id) {
      parentMap.set(row.student_id, {
        name: row.name ?? null,
        phone: row.phone ?? null,
      });
    }
  });

  const invoiceMap = new Map<string, string | null>();
  invoices.forEach((i) => {
    invoiceMap.set(`${i.student_id}:${i.term_id}`, i.invoice_number ?? null);
  });

  // 3. Group balances by student_id to consolidate multi-term arrears into true cumulative student debt
  const balancesByStudent = new Map<string, typeof balances>();
  for (const b of balances) {
    if (!balancesByStudent.has(b.student_id)) {
      balancesByStudent.set(b.student_id, []);
    }
    balancesByStudent.get(b.student_id)!.push(b);
  }

  const today = new Date().toISOString().slice(0, 10);
  const rows: OutstandingRow[] = [];

  for (const [studentId, studentBalList] of balancesByStudent.entries()) {
    const st = studentMap.get(studentId);
    const parent = parentMap.get(studentId);

    // Sort term balances: oldest term first so payments & aging flow correctly
    studentBalList.sort((a, b) => {
      const tA = termMap.get(a.term_id);
      const tB = termMap.get(b.term_id);
      const yA = tA?.year ?? 0;
      const yB = tB?.year ?? 0;
      if (yA !== yB) return yA - yB;
      return (tA?.term ?? 0) - (tB?.term ?? 0);
    });

    let total_fees = 0;
    let amount_paid = 0;
    let total_balance = 0;
    let max_overdue = 0;
    const termBreakdowns: OutstandingTermBreakdown[] = [];
    const invoiceNumbers: string[] = [];

    for (const b of studentBalList) {
      const termInfo = termMap.get(b.term_id);
      const termLabel = termInfo?.label ?? "—";
      const endDate = termInfo?.end_date ?? null;
      let days_overdue = 0;
      if (endDate && endDate < today) {
        const end = new Date(endDate);
        const t = new Date(today);
        days_overdue = Math.floor((t.getTime() - end.getTime()) / (24 * 60 * 60 * 1000));
      }
      if (days_overdue > max_overdue) {
        max_overdue = days_overdue;
      }

      const invNumber = invoiceMap.get(`${studentId}:${b.term_id}`) ?? null;
      if (invNumber && !invoiceNumbers.includes(invNumber)) {
        invoiceNumbers.push(invNumber);
      }

      const bFees = Number(b.total_fees || 0);
      const bPaid = Number(b.total_paid || 0);
      const bBal = Number(b.balance || 0);

      total_fees += bFees;
      amount_paid += bPaid;
      total_balance += bBal;

      termBreakdowns.push({
        term_id: b.term_id,
        term_label: termLabel,
        term_number: termInfo?.term ?? 1,
        year: termInfo?.year ?? new Date().getFullYear(),
        total_fees: bFees,
        amount_paid: bPaid,
        balance: bBal,
        days_overdue,
        invoice_number: invNumber,
        term_end_date: endDate,
        is_current: termInfo?.is_current,
      });
    }

    if (total_balance <= 0) continue;

    // Primary term: newest term
    const primaryTerm = termBreakdowns[termBreakdowns.length - 1];
    let displayTermLabel = primaryTerm.term_label;
    if (termBreakdowns.length > 1) {
      const semNoun = isTertiary ? "Semesters" : "Terms";
      const shortTerms = termBreakdowns
        .map((tb) => (isTertiary ? `Sem ${tb.term_number}` : `Term ${tb.term_number}`))
        .join(", ");
      displayTermLabel = `${termBreakdowns.length} ${semNoun} (${shortTerms})`;
    }

    const pName = parent?.name || st?.guardian_name || null;
    const pPhone = parent?.phone || st?.guardian_phone || st?.student_phone || null;

    rows.push({
      student_id: studentId,
      term_id: primaryTerm.term_id,
      term_label: displayTermLabel,
      student_name: st?.name ?? "—",
      current_class: st?.current_class ?? "—",
      amount_paid,
      balance: total_balance,
      total_fees,
      invoice_number: invoiceNumbers.length > 0 ? invoiceNumbers.join(", ") : null,
      term_end_date: primaryTerm.term_end_date,
      days_overdue: max_overdue,
      parent_name: pName,
      parent_phone: pPhone,
      guardian_phone: st?.guardian_phone || null,
      student_phone: st?.student_phone || null,
      terms: termBreakdowns,
    });
  }

  // Sort debtors descending by total balance owed
  return rows.sort((a, b) => b.balance - a.balance);
}
