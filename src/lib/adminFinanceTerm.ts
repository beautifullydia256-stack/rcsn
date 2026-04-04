import type { SupabaseClient } from '@supabase/supabase-js';

export type SchoolTermBrief = {
  id: string;
  start_date?: string | null;
  end_date?: string | null;
  year?: number;
  term?: number;
};

/** Same calendar rule as admin KPIs / fetchAdminDesignDashboardKpis. */
export async function resolveCurrentSchoolTerm(
  client: SupabaseClient,
  schoolId: string,
  todayIso = new Date().toISOString().slice(0, 10)
): Promise<SchoolTermBrief | null> {
  const { data: allTerms } = await client
    .from('school_terms')
    .select('id, start_date, end_date, year, term')
    .eq('school_id', schoolId)
    .order('year', { ascending: false })
    .order('term', { ascending: false });

  const row =
    (allTerms || []).find((t: SchoolTermBrief) =>
      t.start_date
        ? t.start_date <= todayIso && String(t.end_date ?? '') >= todayIso
        : String(t.end_date ?? '') >= todayIso
    ) ?? allTerms?.[0] ??
    null;
  return row ?? null;
}

export type BalanceAgg = { total_fees: number; total_paid: number; balance: number };

/**
 * Per-student aggregates from student_balances for the current term when one is
 * resolved; otherwise all balance rows for the school (matches admin dashboard KPI Sum).
 */
export async function loadOutstandingBalanceAggByStudent(
  client: SupabaseClient,
  schoolId: string,
  todayIso = new Date().toISOString().slice(0, 10)
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

/**
 * Sum of positive balances across all terms where fees were set (matches accountant
 * dashboard "Outstanding All Time" / FinancialOverview total overall balance).
 */
export async function sumTotalOverallOutstandingBalance(
  client: SupabaseClient,
  schoolId: string
): Promise<number> {
  const { data: rows } = await client
    .from('student_balances')
    .select('total_fees, balance')
    .eq('school_id', schoolId);

  return (rows || []).reduce((sum, r) => {
    const tf = Number((r as { total_fees?: number }).total_fees ?? 0);
    const bal = Number((r as { balance?: number }).balance ?? 0);
    if (tf > 0 && bal > 0) return sum + Math.max(0, bal);
    return sum;
  }, 0);
}
