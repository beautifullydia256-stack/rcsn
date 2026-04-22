// Shared by Edge Functions: paginate report_snapshot_data (avoid PostgREST default max-rows truncation).

import type { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const PAGE_SIZE = 1000;

export type ReportSnapshotDataFilters = {
  classNames?: string[];
  studentIds?: string[];
};

export async function fetchAllReportSnapshotDataRows(
  supabase: SupabaseClient,
  snapshotId: string,
  filters?: ReportSnapshotDataFilters
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    let q = supabase
      .from('report_snapshot_data')
      .select('*')
      .eq('snapshot_id', snapshotId)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (filters?.classNames?.length) {
      q = q.in('class_name', filters.classNames);
    }
    if (filters?.studentIds?.length) {
      q = q.in('student_id', filters.studentIds);
    }
    const { data, error } = await q;
    if (error) throw error;
    const rows = (data ?? []) as Record<string, unknown>[];
    out.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return out;
}
