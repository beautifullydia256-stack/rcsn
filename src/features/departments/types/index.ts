export interface SchoolDepartment {
  id: string;
  school_id: string;
  code: string;
  name: string;
  description?: string | null;
  icon?: string;
  is_starter: boolean;
  is_active: boolean;
  budget_code?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface StaffDepartmentAssignment {
  id: string;
  school_id: string;
  user_id: string;
  department_id: string;
  role_in_department: 'manager' | 'assistant' | 'member';
  can_requisition: boolean;
  can_approve_dept: boolean;
  assigned_by?: string | null;
  created_at?: string;
  // Joined fields
  department?: SchoolDepartment;
  user_name?: string;
  user_email?: string;
}

export interface CreateDepartmentInput {
  name: string;
  code?: string;
  description?: string;
  icon?: string;
  budget_code?: string;
}

export interface AssignStaffInput {
  userId: string;
  departmentId: string;
  roleInDepartment?: 'manager' | 'assistant' | 'member';
  canRequisition?: boolean;
  canApproveDept?: boolean;
}
