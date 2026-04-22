/**
 * Delegated permissions (admin grants extra capabilities beyond the user's primary role).
 * Keys must match public.user_school_permissions.permission_key and DB helpers.
 */
export const PERMISSION_KEYS = {
  studentsManage: 'students.manage',
  accountingFull: 'accounting.full',
  /** When granted, user may record an expense as approved immediately (default is pending until admin approves). */
  expensesDirectApprove: 'accounting.expenses_direct_approve',
  /** Workforce: leave, recruitment, onboarding, performance (RLS hr.manage). */
  hrManage: 'hr.manage',
  /** Payroll periods and payslips (RLS hr.payroll or hr.manage for elevated roles). */
  hrPayroll: 'hr.payroll',
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
  {
    key: PERMISSION_KEYS.expensesDirectApprove,
    label: 'Approve expenses on entry',
    description:
      'Allow recording expenses as approved immediately. Without this, new expenses stay pending until an admin approves them (default off).',
  },
  {
    key: PERMISSION_KEYS.hrManage,
    label: 'Workforce & HR',
    description:
      'Manage leave, job applications, onboarding, and staff reviews without full admin access.',
  },
  {
    key: PERMISSION_KEYS.hrPayroll,
    label: 'Payroll',
    description: 'Create payroll periods, payslips, and view pay data for the school.',
  },
];

export function hasPermission(permissions: string[] | null | undefined, key: PermissionKey): boolean {
  if (!permissions?.length) return false;
  return permissions.includes(key);
}
