import type { SupabaseClient } from '@supabase/supabase-js';

/** PostgREST commonly caps responses (~1000 rows); snapshot rows = students × subjects — must page. */
const PAGE_SIZE = 1000;

export type ReportSnapshotDataFilters = {
  classNames?: string[];
  studentIds?: string[];
};

/**
 * Load every `report_snapshot_data` row for a snapshot (ordered by `id` for stable paging).
 * Required for classes with many students where a single `.select()` would truncate.
 */
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

/** Paginate `generated_reports` for a snapshot (class sizes 1000+). */
export async function fetchAllGeneratedReportsForSnapshot(
  supabase: SupabaseClient,
  snapshotId: string
): Promise<Record<string, unknown>[]> {
  const out: Record<string, unknown>[] = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from('generated_reports')
      .select('id, snapshot_id, student_id, report_data, generated_at, pdf_url, template_id')
      .eq('snapshot_id', snapshotId)
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const rows = (data ?? []) as Record<string, unknown>[];
    out.push(...rows);
    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return out;
}
