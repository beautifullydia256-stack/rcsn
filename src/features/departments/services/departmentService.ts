import { supabase } from '@/lib/supabase';
import type {
  SchoolDepartment,
  StaffDepartmentAssignment,
  CreateDepartmentInput,
  AssignStaffInput,
} from '../types';

const LOCAL_STORAGE_DEPTS_KEY = 'pwezacore_school_departments';
const LOCAL_STORAGE_ASSIGNMENTS_KEY = 'pwezacore_staff_dept_assignments';

export const STARTER_DEPARTMENTS = [
  {
    code: 'DEPT_KITCHEN_STORES',
    name: 'Stores & Kitchen Management',
    description: 'Central food storage, student catering, consumables and cleaning supplies',
    icon: 'Utensils',
    is_starter: true,
    budget_code: 'BDG-STR-01',
  },
  {
    code: 'DEPT_SKILLS_LAB',
    name: 'Science & Clinical Skills Lab',
    description: 'Clinical simulation laboratory, anatomical models, reagents, needles & clinical equipment',
    icon: 'FlaskConical',
    is_starter: true,
    budget_code: 'BDG-LAB-02',
  },
  {
    code: 'DEPT_ICT_LAB',
    name: 'Computer Laboratory & ICT',
    description: 'Computer lab hardware, network infrastructure, software licenses and accessories',
    icon: 'Monitor',
    is_starter: true,
    budget_code: 'BDG-ICT-03',
  },
  {
    code: 'DEPT_LIBRARY',
    name: 'Library & Academic Resources',
    description: 'Books, nursing references, medical journals and cataloging materials',
    icon: 'BookOpen',
    is_starter: true,
    budget_code: 'BDG-LIB-04',
  },
  {
    code: 'DEPT_CLINIC',
    name: 'Health Services & Sickbay',
    description: 'Student medical clinic, emergency first aid, pharmaceuticals and basic triage',
    icon: 'HeartPulse',
    is_starter: true,
    budget_code: 'BDG-CLN-05',
  },
  {
    code: 'DEPT_ESTATES',
    name: 'Estates, Maintenance & Security',
    description: 'Compound sanitation, facility repairs, plumbing, electricals and security services',
    icon: 'Wrench',
    is_starter: true,
    budget_code: 'BDG-EST-06',
  },
  {
    code: 'DEPT_ACADEMICS',
    name: 'Academic Affairs & Practicum',
    description: 'Curriculum, clinical ward attachment supervision, exam materials & logbooks',
    icon: 'GraduationCap',
    is_starter: true,
    budget_code: 'BDG-ACD-07',
  },
  {
    code: 'DEPT_HR_WELFARE',
    name: 'Human Resources & Staff Welfare',
    description: 'Staff development, tutor logistics, welfare requisitions and administration',
    icon: 'Users',
    is_starter: true,
    budget_code: 'BDG-HR-08',
  },
];

function getLocalDepartments(schoolId: string): SchoolDepartment[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_DEPTS_KEY}_${schoolId}`);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Error reading local departments:', err);
  }
  // Initialize with starter defaults
  const starters: SchoolDepartment[] = STARTER_DEPARTMENTS.map((s, idx) => ({
    id: `starter-${s.code}-${schoolId}`,
    school_id: schoolId,
    code: s.code,
    name: s.name,
    description: s.description,
    icon: s.icon,
    is_starter: true,
    is_active: true,
    budget_code: s.budget_code,
    created_at: new Date(Date.now() - (idx + 1) * 3600000).toISOString(),
    updated_at: new Date().toISOString(),
  }));
  saveLocalDepartments(schoolId, starters);
  return starters;
}

function saveLocalDepartments(schoolId: string, list: SchoolDepartment[]) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_DEPTS_KEY}_${schoolId}`, JSON.stringify(list));
  } catch (err) {
    console.warn('Error saving local departments:', err);
  }
}

function getLocalAssignments(schoolId: string): StaffDepartmentAssignment[] {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_ASSIGNMENTS_KEY}_${schoolId}`);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.warn('Error reading local assignments:', err);
  }

  // Pre-seed realistic institutional portfolio assignments for Oxford School tutors
  const starters: StaffDepartmentAssignment[] = [
    {
      id: `assign-namutebi-${schoolId}`,
      school_id: schoolId,
      user_id: 't-namutebi',
      user_name: 'Sr. Florence Namutebi',
      user_email: 'f.namutebi@oxyford.ac.ug',
      department_id: `starter-DEPT_SKILLS_LAB-${schoolId}`,
      role_in_department: 'manager',
      can_requisition: true,
      can_approve_dept: true,
      created_at: new Date().toISOString(),
    },
    {
      id: `assign-ssenyonjo-${schoolId}`,
      school_id: schoolId,
      user_id: 't-ssenyonjo',
      user_name: 'Dr. Patrick Ssenyonjo',
      user_email: 'p.ssenyonjo@oxyford.ac.ug',
      department_id: `starter-DEPT_ACADEMICS-${schoolId}`,
      role_in_department: 'manager',
      can_requisition: true,
      can_approve_dept: true,
      created_at: new Date().toISOString(),
    },
    {
      id: `assign-catering-${schoolId}`,
      school_id: schoolId,
      user_id: 't-chef-kigozi',
      user_name: 'Mr. Kigozi James (Head Chef)',
      user_email: 'catering@oxyford.ac.ug',
      department_id: `starter-DEPT_KITCHEN_STORES-${schoolId}`,
      role_in_department: 'manager',
      can_requisition: true,
      can_approve_dept: false,
      created_at: new Date().toISOString(),
    },
    {
      id: `assign-ict-${schoolId}`,
      school_id: schoolId,
      user_id: 't-ict-mugisha',
      user_name: 'Eng. Brian Mugisha',
      user_email: 'ict@oxyford.ac.ug',
      department_id: `starter-DEPT_ICT_LAB-${schoolId}`,
      role_in_department: 'manager',
      can_requisition: true,
      can_approve_dept: true,
      created_at: new Date().toISOString(),
    },
  ];

  saveLocalAssignments(schoolId, starters);
  return starters;
}

function saveLocalAssignments(schoolId: string, list: StaffDepartmentAssignment[]) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_ASSIGNMENTS_KEY}_${schoolId}`, JSON.stringify(list));
  } catch (err) {
    console.warn('Error saving local assignments:', err);
  }
}

let remoteDepartmentsTableAvailable: boolean | null = null;

export async function fetchSchoolDepartments(schoolId: string): Promise<SchoolDepartment[]> {
  try {
    if (remoteDepartmentsTableAvailable === false) {
      return getLocalDepartments(schoolId);
    }

    const { data, error } = await supabase
      .from('school_departments')
      .select('*')
      .eq('school_id', schoolId)
      .order('is_starter', { ascending: false })
      .order('name');

    if (error) {
      const isMissing =
        error.code === '42P01' ||
        error.message?.includes('schema cache') ||
        error.message?.includes('does not exist') ||
        (error as { status?: number }).status === 404;
      if (isMissing) {
        remoteDepartmentsTableAvailable = false;
      }
    } else if (data && data.length > 0) {
      remoteDepartmentsTableAvailable = true;
      saveLocalDepartments(schoolId, data as SchoolDepartment[]);
      return data as SchoolDepartment[];
    }
  } catch {
    // Silent fallback
  }

  return getLocalDepartments(schoolId);
}

/**
 * Creates a new custom department for the school.
 */
export async function createSchoolDepartment(
  schoolId: string,
  input: CreateDepartmentInput
): Promise<SchoolDepartment> {
  const code =
    input.code ||
    `DEPT_${input.name.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 16)}_${Date.now().toString().slice(-4)}`;

  const newDept: SchoolDepartment = {
    id: crypto.randomUUID ? crypto.randomUUID() : `dept-${Date.now()}`,
    school_id: schoolId,
    code,
    name: input.name.trim(),
    description: input.description?.trim() || null,
    icon: input.icon || 'Folder',
    is_starter: false,
    is_active: true,
    budget_code: input.budget_code?.trim() || `BDG-${code.slice(5, 11)}`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from('school_departments')
      .insert({
        school_id: schoolId,
        code: newDept.code,
        name: newDept.name,
        description: newDept.description,
        icon: newDept.icon,
        is_starter: false,
        is_active: true,
        budget_code: newDept.budget_code,
      })
      .select()
      .single();

    if (!error && data) {
      const saved = data as SchoolDepartment;
      const current = getLocalDepartments(schoolId);
      saveLocalDepartments(schoolId, [...current, saved]);
      return saved;
    }
  } catch (err) {
    console.warn('Supabase createSchoolDepartment fallback to local:', err);
  }

  const current = getLocalDepartments(schoolId);
  const updated = [...current, newDept];
  saveLocalDepartments(schoolId, updated);
  return newDept;
}

/**
 * Updates a department's active state or details.
 */
export async function updateSchoolDepartment(
  schoolId: string,
  departmentId: string,
  updates: Partial<SchoolDepartment>
): Promise<void> {
  try {
    await supabase.from('school_departments').update(updates).eq('id', departmentId);
  } catch (err) {
    console.warn('Supabase updateSchoolDepartment error:', err);
  }

  const current = getLocalDepartments(schoolId);
  const updated = current.map((d) => (d.id === departmentId ? { ...d, ...updates, updated_at: new Date().toISOString() } : d));
  saveLocalDepartments(schoolId, updated);
}

/**
 * Fetches staff assignments across departments for a school.
 */
export async function fetchStaffDepartmentAssignments(
  schoolId: string
): Promise<StaffDepartmentAssignment[]> {
  try {
    if (remoteDepartmentsTableAvailable === false) {
      return getLocalAssignments(schoolId);
    }

    const { data, error } = await supabase
      .from('staff_department_assignments')
      .select('*, department:school_departments(*)')
      .eq('school_id', schoolId);

    if (!error && data && data.length > 0) {
      saveLocalAssignments(schoolId, data as StaffDepartmentAssignment[]);
      return data as StaffDepartmentAssignment[];
    }
  } catch {
    // Silent fallback
  }

  return getLocalAssignments(schoolId);
}

/**
 * Assigns a staff member to manage or participate in a department.
 */
export async function assignStaffToDepartment(
  schoolId: string,
  input: AssignStaffInput,
  staffMeta?: { name?: string; email?: string }
): Promise<StaffDepartmentAssignment> {
  const newAssignment: StaffDepartmentAssignment = {
    id: crypto.randomUUID ? crypto.randomUUID() : `assign-${Date.now()}`,
    school_id: schoolId,
    user_id: input.userId,
    department_id: input.departmentId,
    role_in_department: input.roleInDepartment || 'manager',
    can_requisition: input.canRequisition ?? true,
    can_approve_dept: input.canApproveDept ?? false,
    created_at: new Date().toISOString(),
    user_name: staffMeta?.name,
    user_email: staffMeta?.email,
  };

  try {
    const { data, error } = await supabase
      .from('staff_department_assignments')
      .upsert({
        school_id: schoolId,
        user_id: input.userId,
        department_id: input.departmentId,
        role_in_department: newAssignment.role_in_department,
        can_requisition: newAssignment.can_requisition,
        can_approve_dept: newAssignment.can_approve_dept,
      })
      .select('*, department:school_departments(*)')
      .single();

    if (!error && data) {
      const saved = data as StaffDepartmentAssignment;
      const current = getLocalAssignments(schoolId).filter(
        (a) => !(a.user_id === input.userId && a.department_id === input.departmentId)
      );
      saveLocalAssignments(schoolId, [...current, saved]);
      return saved;
    }
  } catch (err) {
    console.warn('Supabase assignStaffToDepartment fallback:', err);
  }

  const current = getLocalAssignments(schoolId).filter(
    (a) => !(a.user_id === input.userId && a.department_id === input.departmentId)
  );
  const updated = [...current, newAssignment];
  saveLocalAssignments(schoolId, updated);
  return newAssignment;
}

/**
 * Removes a staff member from a department assignment.
 */
export async function removeStaffFromDepartment(
  schoolId: string,
  assignmentId: string
): Promise<void> {
  try {
    await supabase.from('staff_department_assignments').delete().eq('id', assignmentId);
  } catch (err) {
    console.warn('Supabase removeStaffFromDepartment error:', err);
  }

  const current = getLocalAssignments(schoolId);
  const updated = current.filter((a) => a.id !== assignmentId);
  saveLocalAssignments(schoolId, updated);
}

/**
 * Resolves all departments assigned to a specific user (used by unified dynamic sidebar).
 */
export async function fetchUserAssignedDepartments(
  schoolId: string,
  userId: string,
  userEmail?: string
): Promise<SchoolDepartment[]> {
  const [allDepts, assignments] = await Promise.all([
    fetchSchoolDepartments(schoolId),
    fetchStaffDepartmentAssignments(schoolId),
  ]);

  const assignedDeptIds = new Set(
    assignments
      .filter(
        (a) =>
          a.user_id === userId ||
          (userEmail && a.user_email && a.user_email.toLowerCase() === userEmail.toLowerCase())
      )
      .map((a) => a.department_id)
  );

  return allDepts.filter((d) => assignedDeptIds.has(d.id) && d.is_active);
}
