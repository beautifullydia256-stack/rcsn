import type { SupabaseClient } from '@supabase/supabase-js';

/** Resolve `classes.class_id` for admin report publish paths (class name = UI `selectedClass`). */
export async function fetchClassIdBySchoolAndName(
  supabase: SupabaseClient,
  schoolId: string,
  className: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('classes')
    .select('class_id')
    .eq('school_id', schoolId)
    .eq('class_name', className)
    .maybeSingle();
  if (error) throw error;
  const row = data as { class_id: string } | null;
  return row?.class_id ?? null;
}
