/** IANA zone for school-facing calendar dates (Uganda, East Africa Time, no DST). */
export const SCHOOL_CALENDAR_TIMEZONE = "Africa/Kampala";

/**
 * Calendar YYYY-MM-DD in the given IANA timezone, for `date`'s instant in time.
 * Used instead of `toISOString().slice(0, 10)` so “today” matches local school date.
 */
export function calendarDateIsoInTimeZone(
  date: Date,
  timeZone: string = SCHOOL_CALENDAR_TIMEZONE
): string {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = dtf.formatToParts(date);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  const d = parts.find((p) => p.type === "day")?.value;
  if (!y || !m || !d) {
    throw new Error("calendarDateIsoInTimeZone: incomplete date parts");
  }
  return `${y}-${m}-${d}`;
}

/** Today's YYYY-MM-DD in `SCHOOL_CALENDAR_TIMEZONE` (matches Postgres `school_calendar_today()`). */
export function schoolCalendarTodayIso(date: Date = new Date()): string {
  return calendarDateIsoInTimeZone(date);
}

/**
 * Monday–Sunday range (YYYY-MM-DD) for the calendar week that contains `date`'s school calendar day.
 * Week starts Monday (ISO). Pure date arithmetic — safe with Uganda (no DST).
 */
export function schoolCalendarWeekRangeIso(date: Date = new Date()): { monday: string; sunday: string } {
  const today = schoolCalendarTodayIso(date);
  const [y0, m0, d0] = today.split("-").map(Number);
  const t = Date.UTC(y0, m0 - 1, d0);
  const dow = new Date(t).getUTCDay();
  const delta = dow === 0 ? -6 : 1 - dow;
  const monT = t + delta * 86400000;
  const mon = new Date(monT);
  const monday = `${mon.getUTCFullYear()}-${String(mon.getUTCMonth() + 1).padStart(2, "0")}-${String(mon.getUTCDate()).padStart(2, "0")}`;
  const sunday = addCalendarDaysToIsoYmd(monday, 6);
  return { monday, sunday };
}

/** Add signed calendar days to YYYY-MM-DD (Gregorian; safe for Uganda date-only strings). */
export function addCalendarDaysToIsoYmd(isoYmd: string, deltaDays: number): string {
  const [y0, m0, d0] = isoYmd.split("-").map(Number);
  const t = Date.UTC(y0, m0 - 1, d0 + deltaDays);
  const y = new Date(t).getUTCFullYear();
  const m = String(new Date(t).getUTCMonth() + 1).padStart(2, "0");
  const d = String(new Date(t).getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** First calendar day of the month that contains `isoYmd` (YYYY-MM-DD). */
export function firstDayOfMonthIsoYmd(isoYmd: string): string {
  return `${isoYmd.slice(0, 7)}-01`;
}

/** Day of the week name (e.g. 'Monday', 'Tuesday') in school calendar timezone */
export function todayDbDayOfWeek(date: Date = new Date()): string {
  const dow = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const todayIso = schoolCalendarTodayIso(date);
  const [y, m, d] = todayIso.split('-').map(Number);
  const dayIndex = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return dow[dayIndex] || 'Monday';
}

