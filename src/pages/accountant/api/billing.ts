import { supabase } from "../../../lib/supabase";
import { sortFeeRowsByClassEducationOrder } from "./feeStructure";

export type FeeRow = { id: string; class_name: string; tuition_amount: number };
export type TermRow = { id: string; term: number; year: number; is_closed?: boolean };
export type StudentRow = { student_id: string; name: string; current_class: string };

export type BillingData = {
  fees: FeeRow[];
  terms: TermRow[];
  students: StudentRow[];
  studentsError: string | null;
  /** Sum of invoice balances (total_amount − amount_paid) per student for this school */
  termInvoiceOutstandingByStudent: Record<string, number>;
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

export async function fetchBillingData(schoolId: string): Promise<BillingData> {
  const [fRes, tRes, sRes, invRes] = await Promise.all([
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

  return {
    fees,
    terms: termList,
    students,
    studentsError,
    termInvoiceOutstandingByStudent,
  };
}
