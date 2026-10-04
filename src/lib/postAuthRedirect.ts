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
  secretary: '/dashboard/secretary',
  hr: '/dashboard/hr',
  hr_manager: '/dashboard/hr',
  human_resource: '/dashboard/hr',
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
  if (!user.id) return '/dashboard';

  try {
    // Single-institution system for Rakai Community School of Nursing (RCSN)
    // Direct lookup on users table without multi-school membership joins or invite checks
    const { data: userData } = await supabase
      .from('users')
      .select('role, extra_roles, is_active')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!userData || userData.is_active === false) {
      // Fallback: trust JWT metadata
      let resolvedRole = String(user.user_metadata?.role ?? '').toLowerCase();
      if (!resolvedRole && (user.user_metadata as { student_id?: string } | undefined)?.student_id) resolvedRole = 'student';
      return roleToPath[resolvedRole] || '/dashboard';
    }

    const primaryRole = String(userData.role || '').toLowerCase();
    const extras = Array.isArray(userData.extra_roles) ? (userData.extra_roles as string[]) : [];
    const allRoles = Array.from(new Set([primaryRole, ...extras].filter(Boolean)));

    // If staff member has multiple designated duties within RCSN, let them select duty
    if (allRoles.length > 1) {
      return '/role-picker';
    }

    return roleToPath[primaryRole] || '/dashboard';
  } catch {
    return '/dashboard';
  }
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
