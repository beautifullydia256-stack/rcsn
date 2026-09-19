import { isTertiarySchool } from '@/hooks/useSchoolType';
import { normalizeRole } from '@/lib/rbac';

/**
 * Maps database roles (e.g. 'head_teacher', 'dos', 'teacher') to their institutional
 * display title based on whether the institution is Tertiary (e.g. Nursing & Midwifery,
 * Health Training, College) or Primary / Secondary.
 */
export function getRoleTitle(role: string | null | undefined, schoolType?: string | null): string {
  const norm = normalizeRole(role);
  const isTertiary = isTertiarySchool(schoolType);

  if (isTertiary) {
    switch (norm) {
      case 'head_teacher':
        return 'Principal';
      case 'deputy_head_teacher':
        return 'Deputy Principal';
      case 'dos':
        return 'Academic Registrar';
      case 'deputy_dos':
        return 'Deputy Academic Registrar';
      case 'teacher':
        return 'Tutor / Instructor';
      case 'student':
        return 'Student / Trainee';
      case 'parent':
        return 'Parent / Sponsor';
      case 'secretary':
        return 'Admissions Secretary';
      case 'accountant':
        return 'Bursar / Finance Officer';
      case 'clinician':
        return 'Clinical Instructor / Preceptor';
      case 'lab_technician':
        return 'Skills Lab Technologist';
      case 'librarian':
        return 'Librarian';
      case 'admin':
        return 'Institutional Administrator';
      case 'owner':
        return 'Director / Governing Council';
      default:
        return norm ? norm.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Staff';
    }
  }

  // Primary & Secondary defaults
  switch (norm) {
    case 'head_teacher':
      return 'Head Teacher';
    case 'deputy_head_teacher':
      return 'Deputy Head Teacher';
    case 'dos':
      return 'Director of Studies';
    case 'deputy_dos':
      return 'Deputy Director of Studies';
    case 'teacher':
      return 'Teacher';
    case 'student':
      return 'Student';
    case 'parent':
      return 'Parent / Guardian';
    case 'secretary':
      return 'Secretary';
    case 'accountant':
      return 'Accountant';
    case 'clinician':
      return 'School Clinician';
    case 'lab_technician':
      return 'Lab Technician';
    case 'librarian':
      return 'Librarian';
    case 'admin':
      return 'School Administrator';
    case 'owner':
      return 'School Owner / Director';
    default:
      return norm ? norm.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Staff';
  }
}

/**
 * Short badge / pill title for compact UI elements.
 */
export function getRoleShortTitle(role: string | null | undefined, schoolType?: string | null): string {
  const norm = normalizeRole(role);
  const isTertiary = isTertiarySchool(schoolType);

  if (isTertiary) {
    switch (norm) {
      case 'head_teacher':
        return 'Principal';
      case 'deputy_head_teacher':
        return 'Dep. Principal';
      case 'dos':
        return 'Academic Registrar';
      case 'deputy_dos':
        return 'Dep. Registrar';
      case 'teacher':
        return 'Tutor';
      case 'student':
        return 'Trainee';
      case 'parent':
        return 'Sponsor';
      case 'secretary':
        return 'Admissions';
      case 'accountant':
        return 'Bursar';
      case 'clinician':
        return 'Clinical Inst.';
      case 'lab_technician':
        return 'Lab Tech';
      case 'librarian':
        return 'Librarian';
      case 'admin':
        return 'Admin';
      case 'owner':
        return 'Director';
      default:
        return norm || 'Staff';
    }
  }

  // Primary / Secondary defaults
  switch (norm) {
    case 'head_teacher':
      return 'Head Teacher';
    case 'deputy_head_teacher':
      return 'Deputy HT';
    case 'dos':
      return 'Dir. of Studies';
    case 'deputy_dos':
      return 'Deputy DOS';
    case 'teacher':
      return 'Teacher';
    case 'student':
      return 'Student';
    case 'parent':
      return 'Parent';
    case 'secretary':
      return 'Secretary';
    case 'accountant':
      return 'Accounts';
    case 'clinician':
      return 'Clinician';
    case 'lab_technician':
      return 'Lab Tech';
    case 'librarian':
      return 'Librarian';
    case 'admin':
      return 'Admin';
    case 'owner':
      return 'Owner';
    default:
      return norm || 'Staff';
  }
}

/**
 * Institutional terminology map for navigation and portal labels.
 */
export function getNavTerminology(schoolType?: string | null) {
  const isTertiary = isTertiarySchool(schoolType);
  return {
    isTertiary,
    studentsLabel: isTertiary ? 'Students & Trainees' : 'Students',
    studentSingle: isTertiary ? 'Trainee' : 'Student',
    teachersLabel: isTertiary ? 'Tutors & Instructors' : 'Teachers',
    teacherSingle: isTertiary ? 'Tutor' : 'Teacher',
    classesLabel: isTertiary ? 'Programmes & Cohorts' : 'Classes',
    classSingle: isTertiary ? 'Programme / Cohort' : 'Class',
    termLabel: isTertiary ? 'Semester' : 'Term',
    examSetsLabel: isTertiary ? 'Semester Assessments' : 'Exam Sets',
    examResultsLabel: isTertiary ? 'UNMEB & Semester Results' : 'Exam Results',
    reportsLabel: isTertiary ? 'Result Slips & Transcripts' : 'Reports',
    generateReportsLabel: isTertiary ? 'Generate UNMEB Slips & Transcripts' : 'Generate reports',
    timetableLabel: isTertiary ? 'Lecture & Clinical Timetable' : 'Timetable',
    attendanceLabel: isTertiary ? 'Attendance & Practicum Log' : 'Attendance',
    wardPostingsLabel: 'Ward Postings & Clinical',
    parentPortalLabel: isTertiary ? 'Parent & Sponsor Portal' : 'Parent Portal',
    parentRoleLabel: isTertiary ? 'Parent / Sponsor / Guardian' : 'Parent / Guardian',
    myChildrenLabel: isTertiary ? 'Sponsored Students / Trainees' : 'My Children',
    myChildLabel: isTertiary ? 'Student / Trainee' : 'My Child',
    feeStructureLabel: isTertiary ? 'Semester Tuition & Levies' : 'Fee Structure',
    bursarLabel: isTertiary ? 'Bursar & Finance' : 'Accounts',
    secretaryLabel: isTertiary ? 'Admissions & Registry' : 'Secretary',
    appointLeaderLabel: isTertiary ? 'Appoint Principal / Academic Registrar' : 'Appoint Head Teacher',
    appointLeaderTitle: isTertiary ? 'Appoint Principal' : 'Appoint Head Teacher',
  };
}

/**
 * Returns dynamic staff roster roles for directory and user management.
 */
export function getStaffRosterRoles(schoolType?: string | null) {
  const isTertiary = isTertiarySchool(schoolType);
  if (isTertiary) {
    return [
      { value: 'secretary', label: 'Admissions Secretary' },
      { value: 'accountant', label: 'Bursar / Accounts Officer' },
      { value: 'librarian', label: 'Librarian' },
      { value: 'lab_technician', label: 'Skills Lab Technologist' },
      { value: 'clinician', label: 'Clinical Instructor / Preceptor' },
      { value: 'head_teacher', label: 'Principal' },
      { value: 'deputy_head_teacher', label: 'Deputy Principal' },
      { value: 'dos', label: 'Academic Registrar' },
      { value: 'deputy_dos', label: 'Deputy Academic Registrar' },
      { value: 'admin', label: 'Institutional Administrator' },
    ] as const;
  }

  return [
    { value: 'secretary', label: 'Secretary' },
    { value: 'accountant', label: 'Accountant' },
    { value: 'librarian', label: 'Librarian' },
    { value: 'lab_technician', label: 'Lab technician' },
    { value: 'clinician', label: 'School clinician' },
    { value: 'head_teacher', label: 'Head teacher' },
    { value: 'deputy_head_teacher', label: 'Deputy head teacher' },
    { value: 'dos', label: 'Director of Studies (DOS)' },
    { value: 'deputy_dos', label: 'Deputy Director of Studies' },
    { value: 'admin', label: 'School admin' },
  ] as const;
}

/**
 * All assignable roles including teacher and parent.
 */
export function getAllAssignableRoles(schoolType?: string | null) {
  const isTertiary = isTertiarySchool(schoolType);
  if (isTertiary) {
    return [
      { value: 'admin', label: 'Institutional Administrator' },
      { value: 'head_teacher', label: 'Principal' },
      { value: 'deputy_head_teacher', label: 'Deputy Principal' },
      { value: 'dos', label: 'Academic Registrar' },
      { value: 'deputy_dos', label: 'Deputy Academic Registrar' },
      { value: 'teacher', label: 'Tutor / Clinical Instructor' },
      { value: 'accountant', label: 'Bursar / Finance Officer' },
      { value: 'secretary', label: 'Admissions Secretary' },
      { value: 'librarian', label: 'Librarian' },
      { value: 'lab_technician', label: 'Skills Lab Technologist' },
      { value: 'clinician', label: 'Clinical Instructor / Preceptor' },
      { value: 'parent', label: 'Parent / Sponsor' },
    ] as const;
  }

  return [
    { value: 'admin', label: 'School Admin' },
    { value: 'head_teacher', label: 'Head Teacher' },
    { value: 'deputy_head_teacher', label: 'Deputy Head Teacher' },
    { value: 'dos', label: 'Director of Studies (DOS)' },
    { value: 'deputy_dos', label: 'Deputy Director of Studies' },
    { value: 'teacher', label: 'Teacher' },
    { value: 'accountant', label: 'Accountant' },
    { value: 'secretary', label: 'Secretary' },
    { value: 'librarian', label: 'Librarian' },
    { value: 'lab_technician', label: 'Lab Technician' },
    { value: 'clinician', label: 'School Clinician' },
    { value: 'parent', label: 'Parent' },
  ] as const;
}
