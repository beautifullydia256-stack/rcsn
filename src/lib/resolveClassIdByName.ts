import type { SupabaseClient } from '@supabase/supabase-js';

export async function resolveClassIdForSchoolByName(
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
  const id = (data as { class_id?: string } | null)?.class_id;
  return id ?? null;
}
