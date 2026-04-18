import type { SupabaseClient } from '@supabase/supabase-js';
import { calendarDateIsoInTimeZone } from './schoolCalendarDate';

export type SchoolTermBrief = {
  id: string;
  start_date?: string | null;
  end_date?: string | null;
  year?: number;
  term?: number;
};

/**
 * Engine “current term” for finance/KPIs: matches `public.global_terms` (nationwide
 * calendar) to this school’s `school_terms` row by (year, term). School display
 * `start_date`/`end_date` do not drive this.
 *
 * Implemented via `public.resolve_current_school_term_id` (with legacy fallback if
 * the calendar row is missing for this school).
 */
export async function resolveCurrentSchoolTerm(
  client: SupabaseClient,
  schoolId: string,
  todayIso = calendarDateIsoInTimeZone(new Date())
): Promise<SchoolTermBrief | null> {
  const { data: termId, error: rpcError } = await client.rpc('resolve_current_school_term_id', {
    p_school_id: schoolId,
    p_today: todayIso,
  });

  if (rpcError && typeof import.meta !== 'undefined' && (import.meta as ImportMeta).env?.DEV) {
    console.warn('[adminFinanceTerm] resolve_current_school_term_id:', rpcError.message);
  }

  if (termId) {
    const { data: row } = await client
      .from('school_terms')
      .select('id, start_date, end_date, year, term')
      .eq('id', termId)
      .maybeSingle();
    if (row) return row as SchoolTermBrief;
  }

  const { data: allTerms } = await client
    .from('school_terms')
    .select('id, start_date, end_date, year, term')
    .eq('school_id', schoolId);

  const terms = (allTerms || []) as SchoolTermBrief[];
  if (!terms.length) return null;

  const byNewest = (a: SchoolTermBrief, b: SchoolTermBrief) =>
    (b.year ?? 0) - (a.year ?? 0) || (b.term ?? 0) - (a.term ?? 0);
  const byOldest = (a: SchoolTermBrief, b: SchoolTermBrief) =>
    (a.year ?? 0) - (b.year ?? 0) || (a.term ?? 0) - (b.term ?? 0);

  const inWindow = terms
    .filter(
      (t) =>
        t.start_date != null &&
        t.start_date <= todayIso &&
        t.end_date != null &&
        String(t.end_date) >= todayIso
    )
    .sort(byNewest);
  if (inWindow.length) return inWindow[0];

  const started = terms.filter((t) => t.start_date != null && t.start_date <= todayIso).sort(byNewest);
  if (started.length) return started[0];

  const chronological = [...terms].sort(byOldest);
  return chronological[0] ?? null;
}

export type BalanceAgg = {
  total_fees: number;
  total_paid: number;
  /** Term balances (all invoiced amounts still due across selected rows). */
  balance: number;
};

/**
 * Per-student aggregates from student_balances for the current term when one is
 * resolved; otherwise all balance rows for the school (matches admin dashboard KPI Sum).
 */
export async function loadOutstandingBalanceAggByStudent(
  client: SupabaseClient,
  schoolId: string,
  todayIso = calendarDateIsoInTimeZone(new Date())
): Promise<Map<string, BalanceAgg>> {
  const term = await resolveCurrentSchoolTerm(client, schoolId, todayIso);
  const termId = term?.id ?? null;

  let q = client
    .from('student_balances')
    .select('student_id, total_fees, total_paid, balance')
    .eq('school_id', schoolId);
  if (termId) q = q.eq('term_id', termId);
  const { data: rows } = await q;

  const byStudent = new Map<string, BalanceAgg>();
  for (const r of rows || []) {
    const sid = (r as { student_id?: string }).student_id;
    if (!sid) continue;
    const cur = byStudent.get(sid) || { total_fees: 0, total_paid: 0, balance: 0 };
    cur.total_fees += Number((r as { total_fees?: number }).total_fees ?? 0);
    cur.total_paid += Number((r as { total_paid?: number }).total_paid ?? 0);
    cur.balance += Math.max(0, Number((r as { balance?: number }).balance ?? 0));
    byStudent.set(sid, cur);
  }
  return byStudent;
}

/** Per-student aggregates across every `student_balances` row for the school (all terms). */
export async function loadOutstandingBalanceAggByStudentAllTerms(
  client: SupabaseClient,
  schoolId: string
): Promise<Map<string, BalanceAgg>> {
  const { data: rows } = await client
    .from('student_balances')
    .select('student_id, total_fees, total_paid, balance')
    .eq('school_id', schoolId);

  const byStudent = new Map<string, BalanceAgg>();
  for (const r of rows || []) {
    const sid = (r as { student_id?: string }).student_id;
    if (!sid) continue;
    const cur = byStudent.get(sid) || { total_fees: 0, total_paid: 0, balance: 0 };
    cur.total_fees += Number((r as { total_fees?: number }).total_fees ?? 0);
    cur.total_paid += Number((r as { total_paid?: number }).total_paid ?? 0);
    cur.balance += Math.max(0, Number((r as { balance?: number }).balance ?? 0));
    byStudent.set(sid, cur);
  }

  return byStudent;
}

/** All `student_balances` rows for one student, aggregated the same way as all-terms school rollups. */
export async function loadStudentBalanceAggAllTerms(
  client: SupabaseClient,
  schoolId: string,
  studentId: string
): Promise<BalanceAgg> {
  const { data: rows, error } = await client
    .from('student_balances')
    .select('total_fees, total_paid, balance')
    .eq('school_id', schoolId)
    .eq('student_id', studentId);

  if (error) {
    if (typeof import.meta !== 'undefined' && (import.meta as ImportMeta).env?.DEV) {
      console.warn('[adminFinanceTerm] loadStudentBalanceAggAllTerms:', error.message);
    }
    return { total_fees: 0, total_paid: 0, balance: 0 };
  }

  const agg: BalanceAgg = { total_fees: 0, total_paid: 0, balance: 0 };
  for (const r of rows || []) {
    agg.total_fees += Number((r as { total_fees?: number }).total_fees ?? 0);
    agg.total_paid += Number((r as { total_paid?: number }).total_paid ?? 0);
    agg.balance += Math.max(0, Number((r as { balance?: number }).balance ?? 0));
  }
  return agg;
}

/**
 * Sum of positive balances across all terms where fees were set (matches accountant
 * dashboard "Outstanding All Time" / FinancialOverview total overall balance).
 */
export async function sumTotalOverallOutstandingBalance(
  client: SupabaseClient,
  schoolId: string
): Promise<number> {
  const { data: rows } = await client.from('student_balances').select('total_fees, balance').eq('school_id', schoolId);

  return (rows || []).reduce((sum, r) => {
    const tf = Number((r as { total_fees?: number }).total_fees ?? 0);
    const bal = Number((r as { balance?: number }).balance ?? 0);
    if (tf > 0 && bal > 0) return sum + Math.max(0, bal);
    return sum;
  }, 0);
}
