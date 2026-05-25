/**
 * Shared RBAC (Role-Based Access Control) module
 * 
 * This module provides centralized role normalization and access control checks
 * to ensure consistent authorization across the application.
 * 
 * Source of truth: public.users.role
 */

/**
 * Normalizes a role string by trimming whitespace and converting to lowercase
 * @param role - The role string to normalize (can be null or undefined)
 * @returns Normalized role string (empty string if null/undefined)
 */
export function normalizeRole(role: string | null | undefined): string {
  return (role ?? '').trim().toLowerCase();
}

/**
 * Role group definitions for dashboard access control
 * Each dashboard has a list of roles that are allowed to access it
 */
export const ROLE_GROUPS = {
  OWNER_DASHBOARD: ['owner'],
  ADMIN_DASHBOARD: ['owner', 'admin'],
  TEACHER_DASHBOARD: ['teacher', 'admin'],
  ACCOUNTANT_DASHBOARD: ['accountant', 'admin'],
  HEADTEACHER_DASHBOARD: ['head_teacher', 'deputy_head_teacher', 'admin'],
  SECRETARY_DASHBOARD: ['secretary', 'admin'],
  STUDENT_DASHBOARD: ['student'],
  PARENT_DASHBOARD: ['parent'],
  LIBRARIAN_DASHBOARD: ['librarian'],
  DOS_DASHBOARD: ['dos', 'deputy_dos', 'admin'],
} as const;

/**
 * Checks if a role is allowed to access a specific resource
 * @param role - The user's role (will be normalized)
 * @param allowed - Array of allowed roles for the resource
 * @returns true if the role is in the allowed list, false otherwise
 */
export function hasRole(
  role: string | null | undefined,
  allowed: readonly string[]
): boolean {
  const normalized = normalizeRole(role);
  return allowed.includes(normalized);
}

/**
 * Gets the default dashboard path for a given role
 * @param role - The user's role
 * @returns The dashboard path for the role
 */
export function roleToDashboard(role: string | null | undefined): string {
  const normalized = normalizeRole(role);
  
  switch (normalized) {
    case 'owner':
      return '/dashboard/owner';
    case 'admin':
      return '/dashboard/admin';
    case 'teacher':
      return '/dashboard/teacher';
    case 'student':
      return '/dashboard/student';
    case 'parent':
      return '/dashboard/parent';
    case 'accountant':
      return '/dashboard/accountant';
    case 'librarian':
      return '/dashboard/librarian';
    case 'lab_technician':
      return '/dashboard/lab-technician';
    case 'clinician':
      return '/dashboard/clinician';
    case 'head_teacher':
    case 'deputy_head_teacher':
      return '/dashboard/head-teacher';
    case 'secretary':
      return '/dashboard/secretary';
    case 'dos':
    case 'deputy_dos':
      return '/dashboard/dos';
    default:
      return '/login';
  }
}

/**
 * Debug logging helper for RBAC decisions
 * @param context - Description of where the check is happening
 * @param pathname - The route being checked
 * @param rawRole - The raw role value
 * @param normalizedRole - The normalized role value
 * @param allowedRoles - The list of allowed roles
 * @param result - Whether access was granted
 */
export function logRbacDecision(
  _context: string,
  _pathname: string,
  _rawRole: string | null | undefined,
  _normalizedRole: string,
  _allowedRoles: readonly string[],
  _result: boolean
): void {
  // No-op in production. Enable locally by setting VITE_RBAC_DEBUG=true.
  if (
    typeof import.meta !== "undefined" &&
    (import.meta as { env?: { DEV?: boolean; VITE_RBAC_DEBUG?: string } }).env?.DEV &&
    (import.meta as { env?: { VITE_RBAC_DEBUG?: string } }).env?.VITE_RBAC_DEBUG === "true"
  ) {
    console.log(`[RBAC ${_context}]`, {
      pathname: _pathname,
      rawRole: _rawRole,
      normalizedRole: _normalizedRole,
      allowedRoles: [..._allowedRoles],
      result: _result ? "ALLOW" : "DENY",
    });
  }
}
