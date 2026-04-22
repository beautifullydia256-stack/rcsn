import type { SupabaseClient } from '@supabase/supabase-js';

function normalizeClassLabel(name: string): string {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Resolve `classes.class_id` for admin report publish paths (class name = UI `selectedClass`). */
export async function fetchClassIdBySchoolAndName(
  supabase: SupabaseClient,
  schoolId: string,
  className: string
): Promise<string | null> {
  const label = normalizeClassLabel(className);
  if (!label) return null;

  const { data: exact, error: err1 } = await supabase
    .from('classes')
    .select('class_id')
    .eq('school_id', schoolId)
    .eq('class_name', label)
    .maybeSingle();
  if (err1) throw err1;
  const row1 = exact as { class_id: string } | null;
  if (row1?.class_id) return row1.class_id;

  const want = label.toLowerCase();
  const { data: rows, error: err2 } = await supabase
    .from('classes')
    .select('class_id, class_name')
    .eq('school_id', schoolId);
  if (err2) throw err2;
  const list = (rows ?? []) as { class_id: string; class_name: string | null }[];
  const hit = list.find((r) => normalizeClassLabel(String(r.class_name ?? '')).toLowerCase() === want);
  return hit?.class_id ?? null;
}
