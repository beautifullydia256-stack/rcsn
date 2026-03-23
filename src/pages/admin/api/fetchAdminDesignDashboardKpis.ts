import { supabase } from '@/lib/supabase';

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

export async function fetchAdminDesignDashboardKpis(schoolId: string): Promise<AdminDesignDashboardKpis> {
  const todayIso = new Date().toISOString().slice(0, 10);

  const { data: terms } = await supabase
    .from('school_terms')
    .select('id, start_date, end_date')
    .eq('school_id', schoolId)
    .order('year', { ascending: false })
    .order('term', { ascending: false });

  const currentTerm =
    (terms || []).find((t: any) =>
      t.start_date ? t.start_date <= todayIso && t.end_date >= todayIso : t.end_date >= todayIso
    ) || terms?.[0] || null;

  const termStart = currentTerm?.start_date || '1900-01-01';
  const termEnd = currentTerm?.end_date || '2100-12-31';

  const [
    studentsCountRes,
    teachersCountRes,
    attendanceRes,
    paymentsRes,
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
    supabase
      .from('student_payments')
      .select('student_id, amount_paid')
      .eq('school_id', schoolId)
      .gte('payment_date', termStart)
      .lte('payment_date', termEnd),
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
  const present = (attendanceRes.data || []).filter((r: any) => r.present === true).length;
  const totalAttendance = (attendanceRes.data || []).length;
  const attendancePct = totalAttendance > 0 ? Math.round((present / totalAttendance) * 100) : 0;

  const balances = await supabase
    .from('students')
    .select('student_id, expected_fee_amount')
    .eq('school_id', schoolId)
    .eq('status', 'active');

  const payments = (paymentsRes.data || []) as any[];
  const paidByStudent: Record<string, number> = {};
  payments.forEach((p: any) => {
    paidByStudent[p.student_id] = (paidByStudent[p.student_id] || 0) + Number(p.amount_paid || 0);
  });

  const feesCollected = payments.reduce((sum, p) => sum + Number(p.amount_paid || 0), 0);

  const outstanding = (balances.data || [])
    .map((s: any) => Math.max(0, Number(s.expected_fee_amount || 0) - (paidByStudent[s.student_id] || 0)))
    .reduce((sum: number, b: number) => sum + b, 0);

  const expensesCount = pendingExpensesCountRes.count ?? 0;
  const activeClasses = new Set((activeClassesRowsRes.data || []).map((r: any) => r.current_class).filter(Boolean)).size;

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
