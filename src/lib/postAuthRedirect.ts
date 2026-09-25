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
    const [primaryRes, additionalRes, pendingRes] = await Promise.all([
      supabase
        .from('users')
        .select('role, extra_roles, school_id, is_active')
        .eq('user_id', user.id)
        .limit(1),
      supabase
        .from('user_school_memberships')
        .select('role, extra_roles, school_id')
        .eq('user_id', user.id)
        .eq('is_active', true),
      supabase
        .from('user_school_memberships')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', false)
        .limit(1),
    ]);

    const primaryRows = (primaryRes.data ?? []).filter((r) => r.is_active !== false && r.school_id);
    const additionalRows = (additionalRes.data ?? []).filter((r) => r.school_id);
    const hasPendingInvite = (pendingRes.data ?? []).length > 0;

    // Deduplicate by school_id, merging extra_roles — a user can appear in both
    // `users` (primary) and `user_school_memberships` for the same school (e.g.
    // after a school-switch round-trip) and we must not count that as two schools.
    const membershipMap = new Map<string, { school_id: string; role: string; extra_roles: string[] }>();
    for (const r of [
      ...primaryRows.map((r) => ({ school_id: String(r.school_id), role: String(r.role ?? ''), extra_roles: r.extra_roles ?? [] })),
      ...additionalRows.map((r) => ({ school_id: String(r.school_id), role: String(r.role ?? ''), extra_roles: r.extra_roles ?? [] })),
    ]) {
      const existing = membershipMap.get(r.school_id);
      if (existing) {
        const extras = Array.isArray(r.extra_roles) ? (r.extra_roles as string[]) : [];
        const merged = Array.from(new Set([...existing.extra_roles, r.role, ...extras].filter((x) => x && x !== existing.role)));
        existing.extra_roles = merged;
      } else {
        membershipMap.set(r.school_id, {
          school_id: r.school_id,
          role: r.role,
          extra_roles: Array.isArray(r.extra_roles) ? (r.extra_roles as string[]) : [],
        });
      }
    }
    const allMemberships = Array.from(membershipMap.values());

    if (allMemberships.length === 0) {
      if (hasPendingInvite) return '/select-school';
      // Fallback: trust JWT metadata
      let resolvedRole = String(user.user_metadata?.role ?? '').toLowerCase();
      if (!resolvedRole && (user.user_metadata as { student_id?: string } | undefined)?.student_id) resolvedRole = 'student';
      return roleToPath[resolvedRole] || '/dashboard';
    }

    // Multiple schools, or a pending invite still needing a decision → school picker
    if (allMemberships.length > 1 || hasPendingInvite) return '/select-school';

    // Single school — check for multiple roles within that school
    const only = allMemberships[0];
    const extras = Array.isArray(only.extra_roles) ? (only.extra_roles as string[]) : [];
    if (extras.filter((r) => r && r !== only.role).length > 0) return '/role-picker';

    return roleToPath[only.role.toLowerCase()] || '/dashboard';
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
