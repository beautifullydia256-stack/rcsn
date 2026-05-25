import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export const roleToPath: Record<string, string> = {
  owner: '/dashboard/owner',
  admin: '/dashboard/admin',
  teacher: '/dashboard/teacher',
  parent: '/dashboard/parent',
  student: '/dashboard/student',
  librarian: '/dashboard/librarian',
  lab_technician: '/dashboard/lab-technician',
  clinician: '/dashboard/clinician',
  accountant: '/dashboard/accountant',
  head_teacher: '/dashboard/head-teacher',
  deputy_head_teacher: '/dashboard/head-teacher',
  dos: '/dashboard/dos',
  deputy_dos: '/dashboard/dos',
};

/** JWT user_metadata (and legacy raw_user_meta_data on some paths). */
export function userMustChangePassword(user: User | null | undefined): boolean {
  if (!user) return false;
  const meta = (user.user_metadata ?? (user as { raw_user_meta_data?: Record<string, unknown> }).raw_user_meta_data) as Record<
    string,
    unknown
  >;
  const v = meta?.must_change_password;
  return v === true || v === 'true' || v === 1;
}

export async function resolvePostLoginPath(user: User): Promise<string> {
  let resolvedRole = String(user.user_metadata?.role ?? '').toLowerCase();
  let extraRoles: string[] = [];
  if (user.id) {
    try {
      const { data: userRows } = await supabase.from('users').select('role, extra_roles').eq('user_id', user.id).limit(1);
      const dbRole = userRows?.[0]?.role;
      const dbExtraRoles = userRows?.[0]?.extra_roles;
      if (!resolvedRole) resolvedRole = String(dbRole ?? '').toLowerCase();
      extraRoles = Array.isArray(dbExtraRoles) ? (dbExtraRoles as string[]) : [];
    } catch {
      /* ignore */
    }
  }
  if (!resolvedRole && (user.user_metadata as { student_id?: string } | undefined)?.student_id) {
    resolvedRole = 'student';
  }
  if (extraRoles.length > 0) {
    return '/role-picker';
  }
  return roleToPath[resolvedRole] || '/dashboard';
}

/** Safe deep-link after login: `?returnUrl=` must not point back to /login. */
export function applyReturnUrlOverride(preferred: string, search?: string): string {
  try {
    const q = search ?? (typeof window !== 'undefined' ? window.location.search : '') ?? '';
    const params = new URLSearchParams(q);
    const returnUrl = params.get('returnUrl');
    if (returnUrl) {
      const decoded = decodeURIComponent(returnUrl);
      if (!decoded.startsWith('/login')) return decoded;
    }
  } catch {
    /* ignore */
  }
  return preferred;
}
