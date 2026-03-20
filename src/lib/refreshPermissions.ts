import type { SupabaseClient } from '@supabase/supabase-js';

/** Reload delegated permission keys for the current session into the auth store. */
export async function refreshPermissionsForSession(
  supabase: SupabaseClient,
  setPermissions: (keys: string[]) => void
): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user?.id) {
    setPermissions([]);
    return;
  }
  const { data: row } = await supabase.from('users').select('school_id').eq('user_id', session.user.id).maybeSingle();
  const sid = row?.school_id as string | undefined;
  if (!sid) {
    setPermissions([]);
    return;
  }
  const { data } = await supabase
    .from('user_school_permissions')
    .select('permission_key')
    .eq('user_id', session.user.id)
    .eq('school_id', sid);
  setPermissions((data || []).map((r: { permission_key: string }) => r.permission_key));
}
