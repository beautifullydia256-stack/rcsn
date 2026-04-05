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
  recorded_by: string | null;
  notes: string | null;
  created_at: string | null;
  receipt_total_remaining_balance: number | string | null;
};

export type StudentMap = Record<string, { name: string; current_class: string }>;
export type TermMap = Record<string, string>;
export type RecorderMap = Record<string, string>;

export type ReceiptsData = {
  payments: PaymentRow[];
  studentMap: StudentMap;
  termMap: TermMap;
  schoolName: string;
  recorderMap: RecorderMap;
};

export const RECEIPTS_QUERY_KEY = ["accountant", "receipts"] as const;

export async function fetchReceipts(schoolId: string): Promise<ReceiptsData> {
  const [{ data: payData }, { data: schoolRow }] = await Promise.all([
    supabase
      .from("student_payments")
      .select(
        "payment_id, student_id, term_id, amount_paid, receipt_number, payment_date, payment_method, reversed_at, recorded_by, notes, created_at, receipt_total_remaining_balance"
      )
      .eq("school_id", schoolId)
      .is("reversed_at", null)
      .order("payment_date", { ascending: false })
      .order("payment_id", { ascending: false })
      .limit(200),
    supabase.from("schools").select("name").eq("school_id", schoolId).maybeSingle(),
  ]);
  const rows = (payData || []) as PaymentRow[];
  const studentIds = [...new Set(rows.map((r) => r.student_id))];
  const termIds = [...new Set(rows.map((r) => r.term_id))];
  const recorderIds = [...new Set(rows.map((r) => r.recorded_by).filter(Boolean))] as string[];
  let studentMap: StudentMap = {};
  let termMap: TermMap = {};
  let recorderMap: RecorderMap = {};
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
  if (recorderIds.length > 0) {
    const { data: users } = await supabase.from("users").select("user_id, name").in("user_id", recorderIds);
    (users || []).forEach((u: { user_id: string; name: string | null }) => {
      if (u.user_id && u.name) recorderMap[u.user_id] = String(u.name).trim();
    });
  }
  return {
    payments: rows,
    studentMap,
    termMap,
    schoolName: String(schoolRow?.name ?? "").trim(),
    recorderMap,
  };
}
