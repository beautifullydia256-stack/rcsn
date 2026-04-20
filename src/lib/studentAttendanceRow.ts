/**
 * Production `student_attendance` uses attendance_date + status ('present' | 'absent' | 'late' | 'excused').
 * Older or local schemas may still have boolean `present` and/or `date`.
 */

export function studentAttendanceRowIsPresent(row: {
  present?: boolean | null;
  status?: string | null;
}): boolean {
  const s = String(row.status || '').toLowerCase();
  if (s === 'absent') return false;
  if (s === 'present' || s === 'late' || s === 'excused') return true;
  if (typeof row.present === 'boolean') return row.present;
  return false;
}
