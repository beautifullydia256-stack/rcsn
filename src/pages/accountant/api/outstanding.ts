import { supabase } from "../../../lib/supabase";
import { formatAcademicPeriod, isTertiarySchool } from "../../../lib/academicPeriodTerminology";

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
  const [termsRes, studentsRes, invoicesRes, schoolRes, parentsRes] = await Promise.all([
    supabase.from("school_terms").select("id, term, year, end_date").in("id", termIds),
    supabase.from("students").select("student_id, name, current_class").in("student_id", studentIds),
    supabase
      .from("student_invoices")
      .select("student_id, term_id, invoice_number")
      .eq("school_id", schoolId)
      .in("student_id", studentIds)
      .in("term_id", termIds),
    supabase.from("schools").select("type").eq("school_id", schoolId).maybeSingle(),
    supabase
      .from("parents")
      .select("student_id, name, phone")
      .eq("school_id", schoolId)
      .in("student_id", studentIds),
  ]);
  const isTertiary = isTertiarySchool((schoolRes.data as { type?: string } | null)?.type);
  const termMap = new Map(
    (termsRes.data || []).map((t: { id: string; term: number; year: number; end_date?: string | null }) => [
      t.id,
      { label: formatAcademicPeriod(t.term, isTertiary, { year: t.year }), end_date: t.end_date ?? null },
    ])
  );
  const studentMap = new Map((studentsRes.data || []).map((s: { student_id: string; name: string; current_class: string }) => [s.student_id, { name: s.name, current_class: s.current_class }]));
  const parentMap = new Map();
  (parentsRes.data || []).forEach((row: any) => {
    if (row.student_id) {
      parentMap.set(row.student_id, {
        name: row.name ?? null,
        phone: row.phone ?? null,
      });
    }
  });
  const invoiceMap = new Map(
    (invoicesRes.data || []).map((i: { student_id: string; term_id: string; invoice_number: string | null }) => [
      `${i.student_id}:${i.term_id}`,
      i.invoice_number ?? null,
    ])
  );
  const today = new Date().toISOString().slice(0, 10);
  const rows: OutstandingRow[] = balances.map((b) => {
    const bb = b as { student_id: string; term_id: string; total_fees: number; total_paid: number; balance: number };
    const termInfo = termMap.get(bb.term_id);
    const termLabel = termInfo ? (typeof termInfo === "string" ? termInfo : termInfo.label) : "—";
    const endDate = termInfo && typeof termInfo === "object" ? termInfo.end_date : null;
    let days_overdue = 0;
    if (endDate && endDate < today) {
      const end = new Date(endDate);
      const t = new Date(today);
      days_overdue = Math.floor((t.getTime() - end.getTime()) / (24 * 60 * 60 * 1000));
    }
    const pInfo = parentMap.get(bb.student_id);
    return {
      student_id: bb.student_id,
      term_id: bb.term_id,
      term_label: termLabel,
      student_name: studentMap.get(bb.student_id)?.name ?? "—",
      current_class: studentMap.get(bb.student_id)?.current_class ?? "—",
      amount_paid: Number(bb.total_paid || 0),
      balance: Number(bb.balance ?? 0),
      total_fees: Number(bb.total_fees || 0),
      invoice_number: invoiceMap.get(`${bb.student_id}:${bb.term_id}`) ?? null,
      term_end_date: endDate,
      days_overdue,
      parent_name: pInfo?.name ?? null,
      parent_phone: pInfo?.phone ?? null,
    };
  });
  return rows.sort((a, b) => b.balance - a.balance);
}
