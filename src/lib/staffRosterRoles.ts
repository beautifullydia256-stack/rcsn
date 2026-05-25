/** Dashboard roles for non-teacher staff on the Staff page (teachers use Teachers). */
export const STAFF_ROSTER_ROLES = [
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
