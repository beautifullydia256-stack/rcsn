import { supabase } from "../../../lib/supabase";
import { sortFeeRowsByClassEducationOrder } from "./feeStructure";

export type FeeRow = { id: string; class_name: string; tuition_amount: number };
export type TermRow = { id: string; term: number; year: number; is_closed?: boolean };
export type StudentRow = { student_id: string; name: string; current_class: string };

/** Aggregated prior-system (external) debt per student; last* come from the latest entry by entered_at. */
export type PriorBalanceAgg = {
  sumOutstanding: number;
  lastSourceNote: string | null;
  lastEnteredAt: string | null;
  /** Row id when a single prior entry exists (unique per school+student). */
  entryId: string | null;
};

export type BillingData = {
  fees: FeeRow[];
  terms: TermRow[];
  students: StudentRow[];
  studentsError: string | null;
  /** Sum of invoice balances (total_amount − amount_paid) per student for this school */
  termInvoiceOutstandingByStudent: Record<string, number>;
  priorBalanceByStudent: Record<string, PriorBalanceAgg>;
  /** Students with any invoice on a term where school_terms.is_closed (cannot add one-time prior entry) */
  studentIdsWithClosedTermInvoiceHistory: string[];
};

export const BILLING_QUERY_KEY = ["accountant", "billing"] as const;

function aggregateTermInvoiceOutstanding(
  rows: { student_id: string; balance: number | string | null }[]
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const r of rows) {
    const b = Number(r.balance ?? 0);
    out[r.student_id] = (out[r.student_id] || 0) + (Number.isFinite(b) ? b : 0);
  }
  return out;
}

function aggregatePriorBalances(
  rows: {
    id: string;
    student_id: string;
    amount_outstanding: number | string;
    source_note: string | null;
    entered_at: string;
  }[]
): Record<string, PriorBalanceAgg> {
  const sums = new Map<string, number>();
  const latest = new Map<string, { at: string; note: string | null }>();
  const entryIdByStudent = new Map<string, string>();
  for (const r of rows) {
    const amt = Number(r.amount_outstanding);
    if (!Number.isFinite(amt)) continue;
    sums.set(r.student_id, (sums.get(r.student_id) || 0) + amt);
    entryIdByStudent.set(r.student_id, r.id);
    const prev = latest.get(r.student_id);
    if (!prev || r.entered_at > prev.at) {
      latest.set(r.student_id, { at: r.entered_at, note: r.source_note });
    }
  }
  const out: Record<string, PriorBalanceAgg> = {};
  for (const [studentId, sumOutstanding] of sums) {
    const l = latest.get(studentId);
    out[studentId] = {
      sumOutstanding,
      lastSourceNote: l?.note ?? null,
      lastEnteredAt: l?.at ?? null,
      entryId: entryIdByStudent.get(studentId) ?? null,
    };
  }
  return out;
}

export async function fetchBillingData(schoolId: string): Promise<BillingData> {
  const [fRes, tRes, sRes, invRes, priorRes] = await Promise.all([
    supabase.from("school_fee_structure").select("id, class_name, tuition_amount").eq("school_id", schoolId),
    supabase
      .from("school_terms")
      .select("id, term, year, is_closed")
      .eq("school_id", schoolId)
      .order("year", { ascending: false })
      .order("term", { ascending: false }),
    supabase.from("students").select("student_id, name, current_class").eq("school_id", schoolId).neq("status", "graduated").order("name"),
    supabase
      .from("student_invoices")
      .select("student_id, balance")
      .eq("school_id", schoolId)
      .neq("status", "cancelled"),
    supabase
      .from("prior_system_balance_entries")
      .select("id, student_id, amount_outstanding, source_note, entered_at")
      .eq("school_id", schoolId)
      .order("entered_at", { ascending: true }),
  ]);
  const fees = sortFeeRowsByClassEducationOrder((fRes.data || []) as FeeRow[]);
  const termList = (tRes.data || []) as TermRow[];
  let students: StudentRow[] = [];
  let studentsError: string | null = null;
  if (sRes.error) {
    studentsError = sRes.error.message || "Failed to load students";
  } else {
    students = ((sRes.data || []) as StudentRow[]).sort((a, b) => a.name.localeCompare(b.name));
  }

  const termInvoiceOutstandingByStudent =
    invRes.error || !invRes.data ? {} : aggregateTermInvoiceOutstanding(invRes.data as { student_id: string; balance: number | string | null }[]);
  const priorBalanceByStudent =
    priorRes.error || !priorRes.data ? {} : aggregatePriorBalances(priorRes.data as Parameters<typeof aggregatePriorBalances>[0]);

  const closedTermIds = termList.filter((t) => Boolean(t.is_closed)).map((t) => t.id);
  let studentIdsWithClosedTermInvoiceHistory: string[] = [];
  if (closedTermIds.length > 0) {
    const invClosedRes = await supabase
      .from("student_invoices")
      .select("student_id")
      .eq("school_id", schoolId)
      .in("term_id", closedTermIds);
    if (!invClosedRes.error && invClosedRes.data) {
      studentIdsWithClosedTermInvoiceHistory = [
        ...new Set((invClosedRes.data as { student_id: string }[]).map((r) => r.student_id)),
      ];
    }
  }

  return {
    fees,
    terms: termList,
    students,
    studentsError,
    termInvoiceOutstandingByStudent,
    priorBalanceByStudent,
    studentIdsWithClosedTermInvoiceHistory,
  };
}
