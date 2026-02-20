import { supabase } from "../../../lib/supabase";

export type ReportRow = { class_name: string; expected: number; collected: number; outstanding: number };

export const REPORTS_FEE_COLLECTION_QUERY_KEY = ["accountant", "reports", "fee_collection"] as const;

export async function fetchFeeCollectionReport(schoolId: string): Promise<ReportRow[]> {
  const today = new Date().toISOString().slice(0, 10);
  const [tRes, bRes, sRes] = await Promise.all([
    supabase.from("school_terms").select("id, start_date, end_date").eq("school_id", schoolId).order("year", { ascending: false }).order("term", { ascending: false }),
    supabase.from("student_balances").select("student_id, total_fees, total_paid, balance").eq("school_id", schoolId),
    supabase.from("students").select("student_id, current_class").eq("school_id", schoolId),
  ]);
  const terms = tRes.data || [];
  const current =
    (terms as { start_date?: string; end_date: string }[]).find(
      (x) => x.start_date && x.end_date && x.start_date <= today && x.end_date >= today
    ) ?? terms[0];
  const balances = (bRes.data || []) as { student_id: string; total_fees: number; total_paid: number; balance: number }[];
  const studentClass = new Map(
    ((sRes.data || []) as { student_id: string; current_class: string }[]).map((x) => [x.student_id, x.current_class])
  );
  const byClass: Record<string, { expected: number; collected: number; outstanding: number }> = {};
  balances.forEach((row) => {
    const c = studentClass.get(row.student_id) ?? "Other";
    if (!byClass[c]) byClass[c] = { expected: 0, collected: 0, outstanding: 0 };
    byClass[c].expected += Number(row.total_fees || 0);
    byClass[c].collected += Number(row.total_paid || 0);
    byClass[c].outstanding += Math.max(0, Number(row.balance ?? 0));
  });
  return Object.entries(byClass).map(([class_name, v]) => ({
    class_name,
    expected: v.expected,
    collected: v.collected,
    outstanding: v.outstanding,
  }));
}
