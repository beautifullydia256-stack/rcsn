import { supabase } from '@/lib/supabase';
import { resolveCurrentSchoolTerm } from '@/lib/adminFinanceTerm';

/** Serializable KPI payload for the admin design dashboard HTML shell (applied via DOM). */
export type AdminDesignDashboardKpis = {
  totalStudents: number;
  totalTeachers: number;
  feesCollected: number;
  outstanding: number;
  attendancePct: number;
  present: number;
  totalAttendance: number;
  expensesCount: number;
  activeClasses: number;
  jobApps: number;
};

/**
 * Finance KPIs for the current school term:
 * - feesCollected: sum of student_payments.amount_paid for this term_id (excludes reversals).
 * - outstanding: sum of student_balances.balance for this term_id.
 * This matches the ledger + balance snapshot and stays aligned with accountant when both use term_id.
 */
export async function fetchAdminDesignDashboardKpis(schoolId: string): Promise<AdminDesignDashboardKpis> {
  const todayIso = new Date().toISOString().slice(0, 10);

  const currentTerm = await resolveCurrentSchoolTerm(supabase, schoolId, todayIso);

  const termId = currentTerm?.id ?? null;

  const [
    studentsCountRes,
    teachersCountRes,
    attendanceRes,
    paymentsRes,
    balanceRowsRes,
    pendingExpensesCountRes,
    activeClassesRowsRes,
    jobsCountRes,
  ] = await Promise.all([
    supabase
      .from('students')
      .select('student_id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('status', 'active'),
    supabase
      .from('teachers')
      .select('teacher_id', { count: 'exact', head: true })
      .eq('school_id', schoolId),
    supabase
      .from('student_attendance')
      .select('student_id, present')
      .eq('school_id', schoolId)
      .eq('date', todayIso),
    termId
      ? supabase
          .from('student_payments')
          .select('amount_paid')
          .eq('school_id', schoolId)
          .eq('term_id', termId)
          .is('reversed_at', null)
      : Promise.resolve({ data: [] as { amount_paid: number }[] }),
    termId
      ? supabase
          .from('student_balances')
          .select('balance')
          .eq('school_id', schoolId)
          .eq('term_id', termId)
      : Promise.resolve({ data: [] as { balance: number }[] }),
    supabase
      .from('school_expenses')
      .select('expense_id', { count: 'exact', head: true })
      .eq('school_id', schoolId)
      .eq('status', 'pending'),
    supabase
      .from('students')
      .select('current_class')
      .eq('school_id', schoolId)
      .eq('status', 'active')
      .limit(5000),
    supabase
      .from('jobs')
      .select('job_id', { count: 'exact', head: true })
      .eq('school_id', schoolId),
  ]);

  const totalStudents = studentsCountRes.count ?? 0;
  const totalTeachers = teachersCountRes.count ?? 0;
  const present = (attendanceRes.data || []).filter((r: { present?: boolean }) => r.present === true).length;
  const totalAttendance = (attendanceRes.data || []).length;
  const attendancePct = totalAttendance > 0 ? Math.round((present / totalAttendance) * 100) : 0;

  const payments = (paymentsRes.data || []) as { amount_paid?: number }[];
  const feesCollected = payments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);

  const balanceRows = (balanceRowsRes.data || []) as { balance?: number }[];
  const outstanding = balanceRows.reduce((sum, r) => sum + Math.max(0, Number(r.balance ?? 0)), 0);

  const expensesCount = pendingExpensesCountRes.count ?? 0;
  const activeClasses = new Set(
    (activeClassesRowsRes.data || []).map((r: { current_class?: string }) => r.current_class).filter(Boolean)
  ).size;

  const jobApps = jobsCountRes.count ?? 0;

  return {
    totalStudents,
    totalTeachers,
    feesCollected,
    outstanding,
    attendancePct,
    present,
    totalAttendance,
    expensesCount,
    activeClasses,
    jobApps,
  };
}
