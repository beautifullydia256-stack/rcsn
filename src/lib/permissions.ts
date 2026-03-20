/**
 * Delegated permissions (admin grants extra capabilities beyond the user's primary role).
 * Keys must match public.user_school_permissions.permission_key and DB helpers.
 */
export const PERMISSION_KEYS = {
  studentsManage: 'students.manage',
  accountingFull: 'accounting.full',
} as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[keyof typeof PERMISSION_KEYS];

export const PERMISSION_CATALOG: { key: PermissionKey; label: string; description: string }[] = [
  {
    key: PERMISSION_KEYS.studentsManage,
    label: 'Enrol & edit students',
    description: 'Add new students and update student records (normally admin/accountant).',
  },
  {
    key: PERMISSION_KEYS.accountingFull,
    label: 'Finance & accounting',
    description: 'Use the full accountant dashboard (fees, payments, expenses, reports).',
  },
];

export function hasPermission(permissions: string[] | null | undefined, key: PermissionKey): boolean {
  if (!permissions?.length) return false;
  return permissions.includes(key);
}
