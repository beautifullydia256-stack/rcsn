import { supabase } from "../../../lib/supabase";

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
};

export const OUTSTANDING_QUERY_KEY = ["accountant", "outstanding"] as const;

export async function fetchDebtors(schoolId: string): Promise<OutstandingRow[]> {
  const { data: balances } = await supabase
    .from("student_balances")
    .select("student_id, term_id, total_fees, total_paid, balance")
    .eq("school_id", schoolId)
    .gt("balance", 0);
  if (!balances?.length) return [];
  const termIds = [...new Set((balances as { term_id: string }[]).map((b) => b.term_id))];
  const studentIds = [...new Set((balances as { student_id: string }[]).map((b) => b.student_id))];
  const [termsRes, studentsRes, invoicesRes] = await Promise.all([
    supabase.from("school_terms").select("id, term, year").in("id", termIds),
    supabase.from("students").select("student_id, name, current_class").in("student_id", studentIds),
    supabase
      .from("student_invoices")
      .select("student_id, term_id, invoice_number")
      .eq("school_id", schoolId)
      .in("student_id", studentIds)
      .in("term_id", termIds),
  ]);
  const termMap = new Map((termsRes.data || []).map((t: { id: string; term: number; year: number }) => [t.id, `Term ${t.term}, ${t.year}`]));
  const studentMap = new Map((studentsRes.data || []).map((s: { student_id: string; name: string; current_class: string }) => [s.student_id, { name: s.name, current_class: s.current_class }]));
  const invoiceMap = new Map(
    (invoicesRes.data || []).map((i: { student_id: string; term_id: string; invoice_number: string | null }) => [
      `${i.student_id}:${i.term_id}`,
      i.invoice_number ?? null,
    ])
  );
  return balances.map((b) => {
    const bb = b as { student_id: string; term_id: string; total_fees: number; total_paid: number; balance: number };
    return {
      student_id: bb.student_id,
      term_id: bb.term_id,
      term_label: termMap.get(bb.term_id) ?? "—",
      student_name: studentMap.get(bb.student_id)?.name ?? "—",
      current_class: studentMap.get(bb.student_id)?.current_class ?? "—",
      amount_paid: Number(bb.total_paid || 0),
      balance: Number(bb.balance ?? 0),
      total_fees: Number(bb.total_fees || 0),
      invoice_number: invoiceMap.get(`${bb.student_id}:${bb.term_id}`) ?? null,
    };
  });
}
