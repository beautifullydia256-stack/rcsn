import { supabase } from '@/lib/supabase';
import { studentAttendanceRowIsPresent } from '@/lib/studentAttendanceRow';
import { fetchAccountantDashboardMetrics } from '@/lib/accountantDashboardMetrics';

/**
 * KPI payload for the admin design dashboard HTML shell (`.pa-kpi` cards, applied via DOM).
 * Finance fields match accountant “Current term performance” (`fetchAccountantDashboardMetrics`).
 */
export type AdminDesignDashboardKpis = {
  totalStudents: number;
  totalTeachers: number;
  /** e.g. "3 / 7" */
  attendanceDisplay: string;
  attendanceSub: string;
  activeClasses: number;
  feesExpected: number;
  feesCollectedAttributed: number;
  outstandingOnTerm: number;
  collectionRatePercent: number | null;
  currentTermLabel: string | null;
};

export async function fetchAdminDesignDashboardKpis(schoolId: string): Promise<AdminDesignDashboardKpis> {
  const today = new Date().toISOString().slice(0, 10);

  const [metrics, studentsResult, teachersResult, attendanceResult, activeClassesResult] = await Promise.all([
    fetchAccountantDashboardMetrics(supabase, schoolId, today),
    supabase.from('students').select('*', { count: 'exact', head: true }).eq('school_id', schoolId).eq('status', 'active'),
    supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
    supabase
      .from('student_attendance')
      .select('student_id, present, status')
      .eq('school_id', schoolId)
      .eq('attendance_date', today),
    supabase.from('students').select('current_class').eq('school_id', schoolId).eq('status', 'active'),
  ]);

  const tp = metrics.termPerformance;
  const enrolled = studentsResult.count ?? 0;
  const attRows = (attendanceResult.data || []) as {
    student_id: string;
    present?: boolean | null;
    status?: string | null;
  }[];
  const presentToday = new Set(attRows.filter((x) => studentAttendanceRowIsPresent(x)).map((x) => x.student_id)).size;
  const markedToday = new Set(attRows.map((x) => x.student_id)).size;
  const pctOfEnrolled = enrolled > 0 ? Math.round((presentToday / enrolled) * 100) : 0;
  const attendanceSub =
    enrolled > 0
      ? `${pctOfEnrolled}% of roster present · ${markedToday.toLocaleString()} with attendance saved today`
      : 'Active enrollments';

  const activeClasses = new Set(
    (activeClassesResult.data || []).map((s: { current_class?: string | null }) => s.current_class).filter(Boolean)
  ).size;

  return {
    totalStudents: enrolled,
    totalTeachers: teachersResult.count ?? 0,
    attendanceDisplay: `${presentToday.toLocaleString()} / ${enrolled.toLocaleString()}`,
    attendanceSub,
    activeClasses,
    feesExpected: tp.feesExpected,
    feesCollectedAttributed: tp.feesCollectedAttributed,
    outstandingOnTerm: tp.outstandingOnTerm,
    collectionRatePercent: tp.collectionRatePercent,
    currentTermLabel: metrics.currentTerm?.label ?? null,
  };
}
