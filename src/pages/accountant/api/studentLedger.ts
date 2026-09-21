import { supabase } from '../../../lib/supabase';
import { formatAcademicPeriod, isTertiarySchool } from '../../../lib/academicPeriodTerminology';

export interface StudentLedgerPayment {
  payment_id: string;
  amount_paid: number;
  payment_date: string | null;
  payment_method: string | null;
  receipt_number: string | null;
  term_id: string | null;
  term_name: string;
  notes: string | null;
  recorded_by: string | null;
  recorder_name: string | null;
  created_at: string | null;
  receipt_total_remaining_balance?: number | string | null;
  running_total_paid: number;
}

export interface StudentLedgerInvoice {
  invoice_id: string;
  invoice_number: string | null;
  invoice_label: string | null;
  is_supplementary: boolean | null;
  total_amount: number;
  amount_paid: number;
  balance: number;
  status: string;
  term_id: string | null;
  term_name: string;
  created_at: string | null;
}

export interface StudentLedgerProfile {
  student_id: string;
  name: string;
  admission_number: string | null;
  current_class: string | null;
  boarding_type: string | null;
  gender: string | null;
  schoolpay_payment_code: string | null;
  parent_name: string | null;
  parent_phone: string | null;
}

export interface StudentLedgerSummary {
  totalPaidAllTime: number;
  totalInvoicedAllTime: number;
  netBalance: number;
  isFullyCleared: boolean;
  transactionCount: number;
  firstPaymentDate: string | null;
  latestPaymentDate: string | null;
}

export interface StudentLedgerTermOption {
  id: string;
  name: string;
  year: number;
  term: number;
}

export interface StudentLedgerData {
  student: StudentLedgerProfile;
  payments: StudentLedgerPayment[];
  invoices: StudentLedgerInvoice[];
  summary: StudentLedgerSummary;
  terms: StudentLedgerTermOption[];
  schoolName: string;
  schoolPhone: string | null;
  schoolEmail: string | null;
  schoolAddress: string | null;
  schoolLogo: string | null;
  isTertiary: boolean;
}

export interface StudentSearchResult {
  student_id: string;
  name: string;
  admission_number: string | null;
  current_class: string | null;
  schoolpay_payment_code: string | null;
  total_paid?: number;
  balance?: number;
}

/** Search students within school by name, admission number, class, or SchoolPay code */
export async function searchStudentsForLedger(
  schoolId: string,
  query: string,
  limit = 20
): Promise<StudentSearchResult[]> {
  const cleanQ = query.trim();
  let req = supabase
    .from('students')
    .select('student_id, name, admission_number, current_class, schoolpay_payment_code')
    .eq('school_id', schoolId);

  if (cleanQ) {
    req = req.or(
      `name.ilike.%${cleanQ}%,admission_number.ilike.%${cleanQ}%,current_class.ilike.%${cleanQ}%,schoolpay_payment_code.ilike.%${cleanQ}%`
    );
  }

  const { data, error } = await req.order('name', { ascending: true }).limit(limit);
  if (error) {
    console.warn('[studentLedger] search error:', error.message);
    return [];
  }
  return (data || []) as StudentSearchResult[];
}

/** Fetch recent paying students or debtors as quick-picks when the user hasn't selected a student */
export async function fetchQuickPickStudents(schoolId: string): Promise<StudentSearchResult[]> {
  try {
    const { data: recentPayments } = await supabase
      .from('student_payments')
      .select('student_id, students!inner(student_id, name, admission_number, current_class, schoolpay_payment_code)')
      .eq('school_id', schoolId)
      .is('reversed_at', null)
      .order('payment_date', { ascending: false })
      .limit(30);

    const map = new Map<string, StudentSearchResult>();
    for (const row of recentPayments || []) {
      const s = (row as any).students;
      if (s && !map.has(s.student_id)) {
        map.set(s.student_id, {
          student_id: s.student_id,
          name: s.name,
          admission_number: s.admission_number,
          current_class: s.current_class,
          schoolpay_payment_code: s.schoolpay_payment_code,
        });
      }
      if (map.size >= 10) break;
    }

    if (map.size < 5) {
      const { data: fallback } = await supabase
        .from('students')
        .select('student_id, name, admission_number, current_class, schoolpay_payment_code')
        .eq('school_id', schoolId)
        .order('name', { ascending: true })
        .limit(10);

      for (const s of fallback || []) {
        if (!map.has(s.student_id)) {
          map.set(s.student_id, s);
        }
      }
    }

    return Array.from(map.values());
  } catch (err) {
    console.warn('[studentLedger] quick picks error:', err);
    return [];
  }
}

/** Fetch complete all-time ledger data for a specific student */
export async function fetchStudentLedger(
  schoolId: string,
  studentId: string
): Promise<StudentLedgerData | null> {
  const [
    { data: studentRow, error: studentErr },
    { data: paymentsData, error: paymentsErr },
    { data: invoicesData, error: invoicesErr },
    { data: balancesData },
    { data: schoolRow },
    { data: termsData },
  ] = await Promise.all([
    supabase
      .from('students')
      .select('student_id, name, admission_number, current_class, boarding_type, gender, schoolpay_payment_code, parent_name, parent_phone')
      .eq('school_id', schoolId)
      .eq('student_id', studentId)
      .maybeSingle(),
    supabase
      .from('student_payments')
      .select('payment_id, amount_paid, payment_date, payment_method, receipt_number, term_id, notes, recorded_by, created_at, reversed_at, receipt_total_remaining_balance')
      .eq('school_id', schoolId)
      .eq('student_id', studentId)
      .is('reversed_at', null)
      .order('payment_date', { ascending: true })
      .order('created_at', { ascending: true }),
    supabase
      .from('student_invoices')
      .select('invoice_id, invoice_number, invoice_label, is_supplementary, total_amount, amount_paid, balance, status, term_id, created_at')
      .eq('school_id', schoolId)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false }),
    supabase
      .from('student_balances')
      .select('term_id, total_fees, total_paid, balance')
      .eq('school_id', schoolId)
      .eq('student_id', studentId),
    supabase
      .from('schools')
      .select('name, contact_phone, contact_email, address, logo_url, type')
      .eq('school_id', schoolId)
      .maybeSingle(),
    supabase
      .from('school_terms')
      .select('id, term, year')
      .eq('school_id', schoolId)
      .order('year', { ascending: false })
      .order('term', { ascending: false }),
  ]);

  if (studentErr) throw new Error(studentErr.message);
  if (!studentRow) return null;
  if (paymentsErr) throw new Error(paymentsErr.message);
  if (invoicesErr) throw new Error(invoicesErr.message);

  const isTertiary = isTertiarySchool(schoolRow?.type);

  // Map of terms
  const termMap = new Map<string, string>();
  const termsList: StudentLedgerTermOption[] = [];
  for (const t of termsData || []) {
    const formatted = formatAcademicPeriod(t.term, isTertiary, { year: t.year });
    termMap.set(t.id, formatted);
    termsList.push({
      id: t.id,
      name: formatted,
      year: t.year,
      term: t.term,
    });
  }

  // Get recorder names for payments
  const recorderIds = [
    ...new Set(
      (paymentsData || []).map((p: any) => p.recorded_by).filter(Boolean)
    ),
  ] as string[];
  const recorderMap = new Map<string, string>();
  if (recorderIds.length > 0) {
    const { data: users } = await supabase
      .from('users')
      .select('user_id, name')
      .in('user_id', recorderIds);
    for (const u of users || []) {
      if (u.user_id && u.name) recorderMap.set(u.user_id, String(u.name).trim());
    }
  }

  // Process payments chronologically and compute running total
  let runningPaid = 0;
  const chronologicalPayments: StudentLedgerPayment[] = [];
  for (const p of paymentsData || []) {
    const amt = Number(p.amount_paid || 0);
    runningPaid += amt;
    chronologicalPayments.push({
      payment_id: p.payment_id,
      amount_paid: amt,
      payment_date: p.payment_date,
      payment_method: p.payment_method,
      receipt_number: p.receipt_number,
      term_id: p.term_id,
      term_name: p.term_id && termMap.has(p.term_id) ? termMap.get(p.term_id)! : 'General Account',
      notes: p.notes,
      recorded_by: p.recorded_by,
      recorder_name: p.recorded_by ? recorderMap.get(p.recorded_by) || null : null,
      created_at: p.created_at,
      receipt_total_remaining_balance: p.receipt_total_remaining_balance,
      running_total_paid: runningPaid,
    });
  }

  // Format invoices
  let totalBilledInvoices = 0;
  const invoicesList: StudentLedgerInvoice[] = [];
  for (const inv of invoicesData || []) {
    const totalAmt = Number(inv.total_amount || 0);
    totalBilledInvoices += totalAmt;
    invoicesList.push({
      invoice_id: inv.invoice_id,
      invoice_number: inv.invoice_number,
      invoice_label: inv.invoice_label,
      is_supplementary: inv.is_supplementary,
      total_amount: totalAmt,
      amount_paid: Number(inv.amount_paid || 0),
      balance: Number(inv.balance || 0),
      status: String(inv.status || 'issued'),
      term_id: inv.term_id,
      term_name: inv.term_id && termMap.has(inv.term_id) ? termMap.get(inv.term_id)! : 'Unassigned Term',
      created_at: inv.created_at,
    });
  }

  // Aggregate balance from student_balances if available, or fall back to invoices minus payments
  let aggTotalFees = 0;
  let aggTotalPaid = 0;
  let aggBalance = 0;
  if (balancesData && balancesData.length > 0) {
    for (const b of balancesData) {
      aggTotalFees += Number(b.total_fees || 0);
      aggTotalPaid += Number(b.total_paid || 0);
      aggBalance += Math.max(0, Number(b.balance || 0));
    }
  }

  const effectiveTotalPaid = runningPaid;
  const effectiveTotalBilled = aggTotalFees > 0 ? aggTotalFees : totalBilledInvoices;
  const effectiveBalance = aggTotalFees > 0 ? aggBalance : Math.max(0, effectiveTotalBilled - effectiveTotalPaid);

  const dates = chronologicalPayments
    .map((p) => p.payment_date)
    .filter(Boolean) as string[];

  const summary: StudentLedgerSummary = {
    totalPaidAllTime: effectiveTotalPaid,
    totalInvoicedAllTime: effectiveTotalBilled,
    netBalance: effectiveBalance,
    isFullyCleared: effectiveBalance <= 0,
    transactionCount: chronologicalPayments.length,
    firstPaymentDate: dates.length > 0 ? dates[0] : null,
    latestPaymentDate: dates.length > 0 ? dates[dates.length - 1] : null,
  };

  // We return payments ordered newest first for modern ledger UX, but each record retains its running total
  const displayPayments = [...chronologicalPayments].reverse();

  return {
    student: {
      student_id: studentRow.student_id,
      name: studentRow.name,
      admission_number: studentRow.admission_number,
      current_class: studentRow.current_class,
      boarding_type: studentRow.boarding_type,
      gender: studentRow.gender,
      schoolpay_payment_code: studentRow.schoolpay_payment_code,
      parent_name: studentRow.parent_name,
      parent_phone: studentRow.parent_phone,
    },
    payments: displayPayments,
    invoices: invoicesList,
    summary,
    terms: termsList,
    schoolName: schoolRow?.name || 'School',
    schoolPhone: schoolRow?.contact_phone || null,
    schoolEmail: schoolRow?.contact_email || null,
    schoolAddress: schoolRow?.address || null,
    schoolLogo: schoolRow?.logo_url || null,
    isTertiary,
  };
}
