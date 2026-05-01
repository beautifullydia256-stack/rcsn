import { describe, it, expect } from 'vitest';
import { normalizeRole, hasRole, ROLE_GROUPS, roleToDashboard } from '../rbac';

describe('RBAC Module', () => {
  describe('normalizeRole', () => {
    it('should normalize role strings', () => {
      expect(normalizeRole('Admin')).toBe('admin');
      expect(normalizeRole('  TEACHER  ')).toBe('teacher');
      expect(normalizeRole('Head_Teacher')).toBe('head_teacher');
    });

    it('should handle null and undefined', () => {
      expect(normalizeRole(null)).toBe('');
      expect(normalizeRole(undefined)).toBe('');
    });
  });

  describe('hasRole', () => {
    it('should allow owner to access owner dashboard', () => {
      expect(hasRole('owner', ROLE_GROUPS.OWNER_DASHBOARD)).toBe(true);
    });

    it('should deny admin from owner dashboard', () => {
      expect(hasRole('admin', ROLE_GROUPS.OWNER_DASHBOARD)).toBe(false);
    });

    it('should allow admin to access teacher dashboard', () => {
      expect(hasRole('admin', ROLE_GROUPS.TEACHER_DASHBOARD)).toBe(true);
    });

    it('should allow admin to access accountant dashboard', () => {
      expect(hasRole('admin', ROLE_GROUPS.ACCOUNTANT_DASHBOARD)).toBe(true);
    });

    it('should allow admin to access head teacher dashboard', () => {
      expect(hasRole('admin', ROLE_GROUPS.HEADTEACHER_DASHBOARD)).toBe(true);
    });

    it('should allow teacher to access teacher dashboard', () => {
      expect(hasRole('teacher', ROLE_GROUPS.TEACHER_DASHBOARD)).toBe(true);
    });

    it('should deny teacher from accountant dashboard', () => {
      expect(hasRole('teacher', ROLE_GROUPS.ACCOUNTANT_DASHBOARD)).toBe(false);
    });

    it('should handle case-insensitive roles', () => {
      expect(hasRole('ADMIN', ROLE_GROUPS.TEACHER_DASHBOARD)).toBe(true);
      expect(hasRole('  Admin  ', ROLE_GROUPS.ACCOUNTANT_DASHBOARD)).toBe(true);
    });
  });

  describe('roleToDashboard', () => {
    it('should map roles to correct dashboards', () => {
      expect(roleToDashboard('owner')).toBe('/dashboard/owner');
      expect(roleToDashboard('admin')).toBe('/dashboard/admin');
      expect(roleToDashboard('teacher')).toBe('/dashboard/teacher');
      expect(roleToDashboard('accountant')).toBe('/dashboard/accountant');
      expect(roleToDashboard('head_teacher')).toBe('/dashboard/head-teacher');
      expect(roleToDashboard('student')).toBe('/dashboard/student');
      expect(roleToDashboard('parent')).toBe('/dashboard/parent');
    });

    it('should handle invalid roles', () => {
      expect(roleToDashboard('invalid')).toBe('/login');
      expect(roleToDashboard(null)).toBe('/login');
      expect(roleToDashboard(undefined)).toBe('/login');
    });

    it('should handle case-insensitive roles', () => {
      expect(roleToDashboard('OWNER')).toBe('/dashboard/owner');
      expect(roleToDashboard('  Admin  ')).toBe('/dashboard/admin');
    });
  });

  describe('Access Policy Matrix', () => {
    const testCases = [
      // Owner dashboard - only owner
      { role: 'owner', dashboard: ROLE_GROUPS.OWNER_DASHBOARD, expected: true },
      { role: 'admin', dashboard: ROLE_GROUPS.OWNER_DASHBOARD, expected: false },
      { role: 'teacher', dashboard: ROLE_GROUPS.OWNER_DASHBOARD, expected: false },
      
      // Teacher dashboard - teacher and admin
      { role: 'teacher', dashboard: ROLE_GROUPS.TEACHER_DASHBOARD, expected: true },
      { role: 'admin', dashboard: ROLE_GROUPS.TEACHER_DASHBOARD, expected: true },
      { role: 'owner', dashboard: ROLE_GROUPS.TEACHER_DASHBOARD, expected: false },
      
      // Accountant dashboard - accountant and admin
      { role: 'accountant', dashboard: ROLE_GROUPS.ACCOUNTANT_DASHBOARD, expected: true },
      { role: 'admin', dashboard: ROLE_GROUPS.ACCOUNTANT_DASHBOARD, expected: true },
      { role: 'teacher', dashboard: ROLE_GROUPS.ACCOUNTANT_DASHBOARD, expected: false },
      
      // Head Teacher dashboard - head_teacher and admin
      { role: 'head_teacher', dashboard: ROLE_GROUPS.HEADTEACHER_DASHBOARD, expected: true },
      { role: 'admin', dashboard: ROLE_GROUPS.HEADTEACHER_DASHBOARD, expected: true },
      { role: 'teacher', dashboard: ROLE_GROUPS.HEADTEACHER_DASHBOARD, expected: false },
    ];

    testCases.forEach(({ role, dashboard, expected }) => {
      it(`should ${expected ? 'allow' : 'deny'} ${role} access to ${dashboard}`, () => {
        expect(hasRole(role, dashboard)).toBe(expected);
      });
    });
  });
});
