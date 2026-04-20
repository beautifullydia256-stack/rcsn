import type { SupabaseClient } from '@supabase/supabase-js';

export type SchoolPaySettingsRow = {
  id: string;
  school_id: string;
  enabled: boolean;
  schoolpay_school_code: string;
  api_password_encrypted: string;
  webhook_token: string;
  last_sync_at: string | null;
  last_sync_error: string | null;
};

export async function ensureSchoolPaySettingsRow(
  service: SupabaseClient,
  schoolId: string
): Promise<SchoolPaySettingsRow> {
  const { data: existing } = await service
    .from('schoolpay_school_settings')
    .select('*')
    .eq('school_id', schoolId)
    .maybeSingle();

  if (existing) return existing as SchoolPaySettingsRow;

  const { data: created, error } = await service
    .from('schoolpay_school_settings')
    .insert({ school_id: schoolId })
    .select('*')
    .single();

  if (error) {
    const { data: again } = await service.from('schoolpay_school_settings').select('*').eq('school_id', schoolId).maybeSingle();
    if (again) return again as SchoolPaySettingsRow;
    throw error;
  }
  return created as SchoolPaySettingsRow;
}

export async function getSchoolPaySettingsByWebhookToken(
  service: SupabaseClient,
  webhookToken: string
): Promise<SchoolPaySettingsRow | null> {
  const { data } = await service
    .from('schoolpay_school_settings')
    .select('*')
    .eq('webhook_token', webhookToken)
    .maybeSingle();
  return (data as SchoolPaySettingsRow) ?? null;
}
