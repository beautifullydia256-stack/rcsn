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
