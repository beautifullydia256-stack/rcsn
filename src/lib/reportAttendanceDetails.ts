/**
 * Builds the attendance block for report preview / PDF / generated_reports.
 * Templates expect `summary.attendanceDetails` (presentDays, absentDays, totalSchoolDays, percentage).
 */

export type ReportAttendanceDetails = {
  presentDays: number | null;
  absentDays: number | null;
  totalSchoolDays: number | null;
  percentage: number | null;
};

export function buildReportAttendanceDetails(
  attendancePercentage: unknown,
  frozenData: Record<string, unknown> | null | undefined
): ReportAttendanceDetails {
  const fd = (frozenData || {}) as Record<string, unknown>;
  const presentFromFrozen =
    fd.present_days ??
    fd.days_present ??
    fd.attendance_present ??
    fd.attendance_present_days;
  const absentFromFrozen =
    fd.absent_days ?? fd.days_absent ?? fd.attendance_absent ?? fd.attendance_absent_days;
  const totalDaysFromFrozen = fd.total_school_days ?? fd.attendance_total_days;

  let presentDays: number | null =
    presentFromFrozen != null && presentFromFrozen !== '' ? Number(presentFromFrozen) : null;
  let absentDays: number | null =
    absentFromFrozen != null && absentFromFrozen !== '' ? Number(absentFromFrozen) : null;
  let totalSchoolDays: number | null =
    totalDaysFromFrozen != null && totalDaysFromFrozen !== '' ? Number(totalDaysFromFrozen) : null;

  let pct: number | null = null;
  if (attendancePercentage != null && attendancePercentage !== '') {
    const n = Number(attendancePercentage);
    if (!Number.isNaN(n)) pct = n;
  }

  if (
    totalSchoolDays != null &&
    totalSchoolDays > 0 &&
    pct != null &&
    !Number.isNaN(pct) &&
    presentDays == null
  ) {
    const p = Math.round((pct / 100) * totalSchoolDays);
    presentDays = p;
    absentDays = Math.max(0, totalSchoolDays - p);
  }

  if (
    pct == null &&
    totalSchoolDays != null &&
    totalSchoolDays > 0 &&
    presentDays != null &&
    !Number.isNaN(presentDays)
  ) {
    pct = Math.round((presentDays / totalSchoolDays) * 100);
  }

  const pctMissing =
    pct == null || (typeof pct === 'number' && Number.isNaN(pct));
  if (presentDays == null && absentDays == null && totalSchoolDays == null && pctMissing) {
    return { presentDays: null, absentDays: null, totalSchoolDays: null, percentage: null };
  }

  return {
    presentDays,
    absentDays,
    totalSchoolDays,
    percentage: pct,
  };
}
