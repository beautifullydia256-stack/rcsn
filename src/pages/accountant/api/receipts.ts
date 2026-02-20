import { supabase } from "../../../lib/supabase";

export type PaymentRow = {
  payment_id: string;
  student_id: string;
  term_id: string;
  amount_paid: number;
  receipt_number: string | null;
  payment_date: string | null;
  payment_method: string | null;
  reversed_at: string | null;
};

export type StudentMap = Record<string, { name: string; current_class: string }>;
export type TermMap = Record<string, string>;

export type ReceiptsData = { payments: PaymentRow[]; studentMap: StudentMap; termMap: TermMap };

export const RECEIPTS_QUERY_KEY = ["accountant", "receipts"] as const;

export async function fetchReceipts(schoolId: string): Promise<ReceiptsData> {
  const { data: payData } = await supabase
    .from("student_payments")
    .select("payment_id, student_id, term_id, amount_paid, receipt_number, payment_date, payment_method, reversed_at")
    .eq("school_id", schoolId)
    .is("reversed_at", null)
    .order("payment_date", { ascending: false })
    .order("payment_id", { ascending: false })
    .limit(200);
  const rows = (payData || []) as PaymentRow[];
  const studentIds = [...new Set(rows.map((r) => r.student_id))];
  const termIds = [...new Set(rows.map((r) => r.term_id))];
  let studentMap: StudentMap = {};
  let termMap: TermMap = {};
  if (studentIds.length > 0) {
    const { data: students } = await supabase.from("students").select("student_id, name, current_class").in("student_id", studentIds);
    (students || []).forEach((s: { student_id: string; name: string; current_class: string }) => {
      studentMap[s.student_id] = { name: s.name, current_class: s.current_class || "-" };
    });
  }
  if (termIds.length > 0) {
    const { data: terms } = await supabase.from("school_terms").select("id, term, year").in("id", termIds);
    (terms || []).forEach((t: { id: string; term: number; year: number }) => {
      termMap[t.id] = "Term " + t.term + ", " + t.year;
    });
  }
  return { payments: rows, studentMap, termMap };
}
