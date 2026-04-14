import { supabase } from '@/lib/supabase';

/** Match `useSchoolType` — school row rarely changes during a session. */
export const ADMIN_SETTINGS_SCHOOL_ROW_STALE_MS = 5 * 60 * 1000;

export function adminSettingsSchoolRowQueryKey(schoolId: string) {
  return ['admin', 'settings', 'schoolRow', schoolId] as const;
}

export type AdminSettingsSchoolRow = {
  type?: string | null;
  name?: string | null;
  logo_url?: string | null;
  subtitle?: string | null;
};

export async function fetchAdminSettingsSchoolRow(schoolId: string): Promise<AdminSettingsSchoolRow> {
  const { data, error } = await supabase
    .from('schools')
    .select('type, name, logo_url, subtitle')
    .eq('school_id', schoolId)
    .single();
  if (error) throw error;
  return data as AdminSettingsSchoolRow;
}
