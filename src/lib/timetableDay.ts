/**
 * Timetable designer (`timetable_periods`) stores `day_of_week` as full English names.
 * Teacher UI / WhatsApp use Monday = 0 … Sunday = 6 (same as `todayDbDayOfWeek` in teacher dashboard).
 */
export const WEEKDAYS_MON_FIRST = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
] as const;

export function timetableDayNameToIndex(day: string | null | undefined): number | null {
  const d = String(day || '').trim();
  const i = (WEEKDAYS_MON_FIRST as readonly string[]).indexOf(d);
  return i === -1 ? null : i;
}

export function timetableIndexToDayName(index: number): string | null {
  return WEEKDAYS_MON_FIRST[index] ?? null;
}

/** Normalize TIME / string to HH:MM for display */
export function formatTimetableTime(t: string | null | undefined): string {
  if (t == null || t === '') return '—';
  const s = String(t);
  return s.length >= 5 ? s.slice(0, 5) : s;
}
