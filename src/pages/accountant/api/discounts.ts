import { supabase } from "../../../lib/supabase";
import { formatAcademicPeriod, isTertiarySchool } from "../../../lib/academicPeriodTerminology";

export interface StudentDiscountAuditRow {
  student_id: string;
  name: string;
  admission_number: string;
  current_class: string;
  term_id: string;
  term_label: string;
  year: number;
  term: number;

  gross_fee: number;
  discount_type: 'full_bursary' | 'percentage' | 'fixed';
  discount_percentage?: number;
  discount_amount: number;
  discount_reason?: string;

  net_billed: number;
  amount_paid: number;
  balance: number;
  is_100_percent: boolean;
  status: 'fully_cleared' | 'partial' | 'pending';
}

export const DISCOUNTS_AUDIT_QUERY_KEY = ["accountant", "discounts-audit"] as const;

export async function fetchDiscountsAudit(schoolId: string): Promise<StudentDiscountAuditRow[]> {
  // 1. Fetch terms, fee structures, discounts, invoices, students, and balances
  const [termsRes, feeRes, discountsRes, invoicesRes, studentsRes, balancesRes, schoolRes] = await Promise.all([
    supabase
      .from("school_terms")
      .select("id, term, year, is_current")
      .eq("school_id", schoolId)
      .order("year", { ascending: false })
      .order("term", { ascending: false }),
    supabase
      .from("school_fee_structure")
      .select("class_name, tuition_amount, boarding_tuition_amount")
      .eq("school_id", schoolId),
    supabase
      .from("student_discounts")
      .select("student_id, term_id, amount, percentage, reason, created_at")
      .eq("school_id", schoolId),
    supabase
      .from("student_invoices")
      .select("student_id, term_id, total_amount, bursary_discount, invoice_number")
      .eq("school_id", schoolId)
      .gt("bursary_discount", 0)
      .neq("status", "cancelled"),
    supabase
      .from("students")
      .select("student_id, name, admission_number, current_class, boarding_type")
      .eq("school_id", schoolId)
      .is("deleted_at", null),
    supabase
      .from("student_balances")
      .select("student_id, term_id, total_fees, total_paid, balance")
      .eq("school_id", schoolId),
    supabase
      .from("schools")
      .select("type")
      .eq("school_id", schoolId)
      .maybeSingle(),
  ]);

  const isTertiary = isTertiarySchool((schoolRes.data as { type?: string } | null)?.type);

  const termMap = new Map<string, { term: number; year: number; label: string }>();
  (termsRes.data || []).forEach((t: { id: string; term: number; year: number }) => {
    termMap.set(t.id, {
      term: t.term,
      year: t.year,
      label: formatAcademicPeriod(t.term, isTertiary, { year: t.year }),
    });
  });

  const studentMap = new Map<string, { name: string; admission_number: string; current_class: string; boarding_type?: string }>();
  (studentsRes.data || []).forEach((s: any) => {
    studentMap.set(s.student_id, {
      name: s.name,
      admission_number: s.admission_number || "—",
      current_class: s.current_class || "—",
      boarding_type: s.boarding_type || "Day Scholar",
    });
  });

  const standardFeeMap = new Map<string, { day: number; boarding: number }>();
  (feeRes.data || []).forEach((f: any) => {
    const cName = (f.class_name || "").trim().toLowerCase();
    standardFeeMap.set(cName, {
      day: Number(f.tuition_amount || 0),
      boarding: Number(f.boarding_tuition_amount || f.tuition_amount || 0),
    });
  });

  const balanceMap = new Map<string, { total_paid: number; balance: number; total_fees: number }>();
  (balancesRes.data || []).forEach((b: any) => {
    balanceMap.set(`${b.student_id}:${b.term_id}`, {
      total_paid: Number(b.total_paid || 0),
      balance: Number(b.balance || 0),
      total_fees: Number(b.total_fees || 0),
    });
  });

  // Track aggregated discounts keyed by student_id:term_id
  const auditMap = new Map<string, StudentDiscountAuditRow>();

  // A. Process invoices with bursary_discount > 0
  (invoicesRes.data || []).forEach((inv: any) => {
    const key = `${inv.student_id}:${inv.term_id}`;
    const student = studentMap.get(inv.student_id);
    if (!student) return;

    const term = termMap.get(inv.term_id) || { term: 1, year: new Date().getFullYear(), label: "Current Period" };
    const stdFee = standardFeeMap.get(student.current_class.trim().toLowerCase());
    const isBoarding = student.boarding_type?.toLowerCase().includes("board") || false;
    const baseFee = stdFee ? (isBoarding ? stdFee.boarding : stdFee.day) : Number(inv.total_amount || 0);

    const bursaryPct = Number(inv.bursary_discount || 0);
    const netBilled = Number(inv.total_amount || 0);
    const grossFee = bursaryPct < 100 && bursaryPct > 0 
      ? Math.round(netBilled / (1 - bursaryPct / 100))
      : (baseFee > 0 ? baseFee : netBilled);
    const discountAmount = Math.max(0, grossFee - netBilled);

    const balInfo = balanceMap.get(key) || { total_paid: 0, balance: netBilled, total_fees: netBilled };
    const is100 = bursaryPct >= 100 || (grossFee > 0 && netBilled === 0);

    auditMap.set(key, {
      student_id: inv.student_id,
      name: student.name,
      admission_number: student.admission_number,
      current_class: student.current_class,
      term_id: inv.term_id,
      term_label: term.label,
      year: term.year,
      term: term.term,
      gross_fee: grossFee,
      discount_type: is100 ? 'full_bursary' : 'percentage',
      discount_percentage: bursaryPct,
      discount_amount: discountAmount,
      discount_reason: is100 ? '100% Full Bursary Waiver' : `${bursaryPct}% Institutional Scholarship`,
      net_billed: netBilled,
      amount_paid: balInfo.total_paid,
      balance: balInfo.balance,
      is_100_percent: is100,
      status: balInfo.balance <= 0 ? 'fully_cleared' : balInfo.total_paid > 0 ? 'partial' : 'pending',
    });
  });

  // B. Process student_discounts table rows
  (discountsRes.data || []).forEach((dsc: any) => {
    const key = `${dsc.student_id}:${dsc.term_id}`;
    const student = studentMap.get(dsc.student_id);
    if (!student) return;

    const term = termMap.get(dsc.term_id) || { term: 1, year: new Date().getFullYear(), label: "Current Period" };
    const stdFee = standardFeeMap.get(student.current_class.trim().toLowerCase());
    const isBoarding = student.boarding_type?.toLowerCase().includes("board") || false;
    const baseFee = stdFee ? (isBoarding ? stdFee.boarding : stdFee.day) : 0;

    const existing = auditMap.get(key);
    const dscAmt = Number(dsc.amount || 0);
    const dscPct = Number(dsc.percentage || 0);

    if (existing) {
      if (dsc.reason && !existing.discount_reason?.includes(dsc.reason)) {
        existing.discount_reason = `${existing.discount_reason} (${dsc.reason})`;
      }
      return;
    }

    const balInfo = balanceMap.get(key) || { total_paid: 0, balance: 0, total_fees: 0 };
    const grossFee = baseFee > 0 ? baseFee : (balInfo.total_fees + dscAmt);
    const discountAmount = dscAmt > 0 ? dscAmt : Math.round(grossFee * (dscPct / 100));
    const netBilled = Math.max(0, grossFee - discountAmount);
    const is100 = dscPct >= 100 || (grossFee > 0 && discountAmount >= grossFee);

    auditMap.set(key, {
      student_id: dsc.student_id,
      name: student.name,
      admission_number: student.admission_number,
      current_class: student.current_class,
      term_id: dsc.term_id,
      term_label: term.label,
      year: term.year,
      term: term.term,
      gross_fee: grossFee,
      discount_type: is100 ? 'full_bursary' : (dscPct > 0 ? 'percentage' : 'fixed'),
      discount_percentage: dscPct > 0 ? dscPct : (grossFee > 0 ? Math.round((discountAmount / grossFee) * 100) : 0),
      discount_amount: discountAmount,
      discount_reason: dsc.reason || (is100 ? '100% Full Bursary Waiver' : 'Fee Concession'),
      net_billed: netBilled,
      amount_paid: balInfo.total_paid,
      balance: balInfo.balance,
      is_100_percent: is100,
      status: balInfo.balance <= 0 ? 'fully_cleared' : balInfo.total_paid > 0 ? 'partial' : 'pending',
    });
  });

  return Array.from(auditMap.values()).sort((a, b) => {
    if (a.is_100_percent !== b.is_100_percent) return a.is_100_percent ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
}
