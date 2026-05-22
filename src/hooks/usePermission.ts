import { useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { PERMISSION_KEYS, type PermissionKey, hasPermission } from '@/lib/permissions';

const ELEVATED = new Set(['admin', 'owner', 'head_teacher']);

/** True if the signed-in user may perform actions for this permission (role bypass + delegated grants). */
export function usePermission(key: PermissionKey): boolean {
  const role = useAuthStore((s) => s.role);
  const permissions = useAuthStore((s) => s.permissions);

  return useMemo(() => {
    if (role && ELEVATED.has(role)) return true;
    if (key === PERMISSION_KEYS.studentsManage && (role === 'accountant' || role === 'secretary')) return true;
    if (key === PERMISSION_KEYS.accountingFull && role === 'accountant') return true;
    // Matches RLS hr_user_can_payroll: hr.manage grants payroll access.
    if (key === PERMISSION_KEYS.hrPayroll && hasPermission(permissions, PERMISSION_KEYS.hrManage)) return true;
    return hasPermission(permissions, key);
  }, [role, permissions, key]);
}

/** School workforce nav: HR module and/or payroll-only role. */
export function useWorkforceNavVisible(): boolean {
  return usePermission(PERMISSION_KEYS.hrManage) || usePermission(PERMISSION_KEYS.hrPayroll);
}

export function useCanAccessAccountantDashboard(): boolean {
  const role = useAuthStore((s) => s.role);
  const permissions = useAuthStore((s) => s.permissions);
  return useMemo(() => {
    if (role && ELEVATED.has(role)) return true;
    if (role === 'accountant') return true;
    return hasPermission(permissions, PERMISSION_KEYS.accountingFull);
  }, [role, permissions]);
}

export function useCanManageStudentsEnrollment(): boolean {
  return usePermission(PERMISSION_KEYS.studentsManage);
}
