import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  fetchSchoolDepartments,
  createSchoolDepartment,
  fetchStaffDepartmentAssignments,
  assignStaffToDepartment,
  removeStaffFromDepartment,
  fetchUserAssignedDepartments,
  STARTER_DEPARTMENTS,
} from '../departmentService';

describe('Institutional Departments & Staff Portfolio Service Tests', () => {
  const testSchoolId = 'test-school-oxford-001';

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should initialize and return starter departments when none exist', async () => {
    const depts = await fetchSchoolDepartments(testSchoolId);
    expect(depts.length).toBeGreaterThanOrEqual(STARTER_DEPARTMENTS.length);

    const codes = depts.map((d) => d.code);
    expect(codes).toContain('DEPT_KITCHEN_STORES');
    expect(codes).toContain('DEPT_SKILLS_LAB');
    expect(codes).toContain('DEPT_ICT_LAB');
    expect(codes).toContain('DEPT_CLINIC');
  });

  it('should create a custom school department with unique code and budget code', async () => {
    const newDept = await createSchoolDepartment(testSchoolId, {
      name: 'Midwifery Clinical Outreach',
      description: 'Community health visits and mobile maternity clinic',
      budget_code: 'BDG-OUT-09',
      icon: 'HeartPulse',
    });

    expect(newDept).toBeDefined();
    expect(newDept.name).toBe('Midwifery Clinical Outreach');
    expect(newDept.budget_code).toBe('BDG-OUT-09');
    expect(newDept.is_starter).toBe(false);

    // Verify it is persisted in the school departments list
    const allDepts = await fetchSchoolDepartments(testSchoolId);
    expect(allDepts.some((d) => d.id === newDept.id)).toBe(true);
  });

  it('should assign a staff member to a department portfolio and retrieve assigned departments', async () => {
    const depts = await fetchSchoolDepartments(testSchoolId);
    const skillsLab = depts.find((d) => d.code === 'DEPT_SKILLS_LAB')!;

    const assignment = await assignStaffToDepartment(
      testSchoolId,
      {
        userId: 'user-tutor-florence',
        departmentId: skillsLab.id,
        roleInDepartment: 'manager',
        canRequisition: true,
        canApproveDept: true,
      },
      { name: 'Sr. Florence Namutebi', email: 'f.namutebi@oxyford.ac.ug' }
    );

    expect(assignment.user_id).toBe('user-tutor-florence');
    expect(assignment.department_id).toBe(skillsLab.id);

    // Test resolving assigned departments for user ID
    const userDepts = await fetchUserAssignedDepartments(testSchoolId, 'user-tutor-florence');
    expect(userDepts.length).toBe(1);
    expect(userDepts[0].code).toBe('DEPT_SKILLS_LAB');

    // Test resolving assigned departments by email fallback
    const userDeptsByEmail = await fetchUserAssignedDepartments(testSchoolId, 'diff-uuid', 'f.namutebi@oxyford.ac.ug');
    expect(userDeptsByEmail.length).toBe(1);
    expect(userDeptsByEmail[0].code).toBe('DEPT_SKILLS_LAB');
  });

  it('should remove a staff member from a department portfolio', async () => {
    const assignments = await fetchStaffDepartmentAssignments(testSchoolId);
    if (assignments.length > 0) {
      const toRemove = assignments[0];
      await removeStaffFromDepartment(testSchoolId, toRemove.id);

      const after = await fetchStaffDepartmentAssignments(testSchoolId);
      expect(after.some((a) => a.id === toRemove.id)).toBe(false);
    }
  });
});
