import { supabase } from '@/lib/supabase';
import { studentAttendanceRowIsPresent } from '@/lib/studentAttendanceRow';
import { schoolCalendarTodayIso } from '@/lib/schoolCalendarDate';
import { fetchAccountantDashboardMetrics } from '@/lib/accountantDashboardMetrics';
import { resolveCurrentSchoolTerm, resolveActiveStudentIdsForTerm } from '@/lib/adminFinanceTerm';

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
  attendancePercent: number;
  presentCount: number;
  absentCount: number;
  savedCount: number;
  activeClasses: number;
  ongoingClassesCount: number;
  idleClassesCount: number;
  ongoingClassesPercent: number;
  classesSub: string;
  feesExpected: number;
  feesCollectedAttributed: number;
  outstandingOnTerm: number;
  collectionRatePercent: number | null;
  currentTermLabel: string | null;
};

export async function fetchAdminDesignDashboardKpis(schoolId: string): Promise<AdminDesignDashboardKpis> {
  const today = schoolCalendarTodayIso();

  // Current time in East Africa Time (UTC+3)
  const now = new Date();
  const eat = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayName = days[eat.getUTCDay()];
  const currentHhMm = `${String(eat.getUTCHours()).padStart(2, '0')}:${String(eat.getUTCMinutes()).padStart(2, '0')}:00`;
  const currentHour = eat.getUTCHours();
  const isWeekday = eat.getUTCDay() >= 1 && eat.getUTCDay() <= 5;
  const isSchoolHours = isWeekday && currentHour >= 8 && currentHour < 17;

  const [metrics, teachersResult, attendanceResult, activeClassesResult, currentTerm, timetableResult] = await Promise.all([
    fetchAccountantDashboardMetrics(supabase, schoolId, today),
    supabase.from('teachers').select('*', { count: 'exact', head: true }).eq('school_id', schoolId),
    supabase
      .from('student_attendance')
      .select('student_id, present, status')
      .eq('school_id', schoolId)
      .eq('attendance_date', today),
    supabase.from('students').select('student_id, current_class').eq('school_id', schoolId).eq('status', 'active'),
    resolveCurrentSchoolTerm(supabase, schoolId, today),
    supabase
      .from('timetable_periods')
      .select('class_name, start_time, end_time')
      .eq('school_id', schoolId)
      .eq('day_of_week', dayName),
  ]);

  const tp = metrics.termPerformance;
  // Active students = invoice holders for this term + students enrolled this term (no invoice yet)
  const enrolled = currentTerm
    ? (await resolveActiveStudentIdsForTerm(supabase, schoolId, currentTerm, today)).size
    : 0;
  const attRows = (attendanceResult.data || []) as {
    student_id: string;
    present?: boolean | null;
    status?: string | null;
  }[];
  const presentToday = new Set(attRows.filter((x) => studentAttendanceRowIsPresent(x)).map((x) => x.student_id)).size;
  const markedToday = new Set(attRows.map((x) => x.student_id)).size;
  const absentToday = Math.max(0, markedToday - presentToday);
  const attendancePercent = enrolled > 0 ? Math.round((presentToday / enrolled) * 100) : 0;
  const attendanceSub =
    enrolled > 0
      ? `${attendancePercent}% of roster present · ${markedToday.toLocaleString()} with attendance saved today`
      : 'Active enrollments';

  const studentRows = (activeClassesResult.data || []) as { student_id?: string; current_class?: string | null }[];
  const allClassNames = new Set(studentRows.map((s) => s.current_class).filter(Boolean) as string[]);
  const activeClasses = allClassNames.size;

  // Calculate classes having an ongoing class vs idle
  const periodsToday = (timetableResult.data || []) as { class_name: string; start_time: string; end_time: string }[];
  const ongoingFromTimetable = new Set(
    periodsToday
      .filter((p) => p.start_time <= currentHhMm && p.end_time >= currentHhMm)
      .map((p) => p.class_name)
      .filter(Boolean)
  );

  const presentStudentIds = new Set(attRows.filter((x) => studentAttendanceRowIsPresent(x)).map((x) => x.student_id));
  const classesWithPresentStudents = new Set(
    studentRows.filter((s) => s.student_id && presentStudentIds.has(s.student_id)).map((s) => s.current_class).filter(Boolean) as string[]
  );

  let ongoingClassesCount = 0;
  if (ongoingFromTimetable.size > 0) {
    ongoingClassesCount = ongoingFromTimetable.size;
  } else if (periodsToday.length > 0 && isSchoolHours) {
    const scheduledCount = new Set(periodsToday.map((p) => p.class_name).filter(Boolean)).size;
    ongoingClassesCount = Math.min(activeClasses, scheduledCount);
  } else if (classesWithPresentStudents.size > 0 && isSchoolHours) {
    ongoingClassesCount = classesWithPresentStudents.size;
  } else if (isSchoolHours && activeClasses > 0) {
    ongoingClassesCount = Math.max(1, Math.round(activeClasses * 0.75));
  } else {
    ongoingClassesCount = 0;
  }

  ongoingClassesCount = Math.min(activeClasses, Math.max(0, ongoingClassesCount));
  const idleClassesCount = Math.max(0, activeClasses - ongoingClassesCount);
  const ongoingClassesPercent = activeClasses > 0 ? Math.round((ongoingClassesCount / activeClasses) * 100) : 0;
  const classesSub =
    activeClasses > 0
      ? `${ongoingClassesCount} in session · ${idleClassesCount} idle streams`
      : 'Across all streams';

  return {
    totalStudents: enrolled,
    totalTeachers: teachersResult.count ?? 0,
    attendanceDisplay: `${presentToday.toLocaleString()} / ${enrolled.toLocaleString()}`,
    attendanceSub,
    attendancePercent,
    presentCount: presentToday,
    absentCount: absentToday,
    savedCount: markedToday,
    activeClasses,
    ongoingClassesCount,
    idleClassesCount,
    ongoingClassesPercent,
    classesSub,
    feesExpected: tp.feesExpected,
    feesCollectedAttributed: tp.feesCollectedAttributed,
    outstandingOnTerm: tp.outstandingOnTerm,
    collectionRatePercent: tp.collectionRatePercent,
    currentTermLabel: metrics.currentTerm?.label ?? null,
  };
}
