-- Align app roles with New Designs dashboards (lab technician, clinician) and support
-- non-teaching staff records + payroll linkage for expenditure tracking.

-- 1) Extend users.role allowed values
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE public.users ADD CONSTRAINT users_role_check CHECK (
  role IN (
    'owner',
    'admin',
    'teacher',
    'parent',
    'student',
    'accountant',
    'librarian',
    'head_teacher',
    'lab_technician',
    'clinician'
  )
);

-- 2) Teacher payroll: how often salary is paid (for budgeting / expense patterns)
ALTER TABLE public.teachers ADD COLUMN IF NOT EXISTS pay_frequency TEXT;
ALTER TABLE public.teachers DROP CONSTRAINT IF EXISTS teachers_pay_frequency_check;
ALTER TABLE public.teachers ADD CONSTRAINT teachers_pay_frequency_check CHECK (
  pay_frequency IS NULL OR pay_frequency IN ('monthly', 'biweekly', 'weekly', 'termly', 'annual', 'custom')
);

-- 3) Other staff: KYC-style records on file; most will NOT have login accounts
CREATE TABLE IF NOT EXISTS public.other_staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  job_title TEXT,
  department TEXT,
  national_id TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  notes TEXT,
  hire_date DATE,
  salary_amount NUMERIC(12, 2),
  pay_frequency TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT other_staff_members_pay_frequency_check CHECK (
    pay_frequency IS NULL OR pay_frequency IN ('monthly', 'biweekly', 'weekly', 'termly', 'annual', 'custom')
  )
);

CREATE INDEX IF NOT EXISTS idx_other_staff_members_school_id ON public.other_staff_members (school_id);

COMMENT ON TABLE public.other_staff_members IS
  'Non-teaching staff on file (drivers, security, etc.). Optional login via users table separately; most records are no-login.';

-- 3b) School location read (attendance / maps): include lab tech + clinician like other staff
DROP POLICY IF EXISTS "school staff can read school location" ON public.schools;
CREATE POLICY "school staff can read school location" ON public.schools
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.role IN (
          'teacher',
          'accountant',
          'librarian',
          'head_teacher',
          'lab_technician',
          'clinician'
        )
        AND u.school_id = schools.school_id
    )
  );

-- 4) Link salary/expense rows to a specific teacher or other staff member (when recording payroll)
ALTER TABLE public.school_expenses ADD COLUMN IF NOT EXISTS linked_teacher_id UUID REFERENCES public.teachers (teacher_id) ON DELETE SET NULL;
ALTER TABLE public.school_expenses ADD COLUMN IF NOT EXISTS linked_other_staff_id UUID REFERENCES public.other_staff_members (id) ON DELETE SET NULL;

ALTER TABLE public.school_expenses DROP CONSTRAINT IF EXISTS school_expenses_payroll_link_exclusive;
ALTER TABLE public.school_expenses ADD CONSTRAINT school_expenses_payroll_link_exclusive CHECK (
  NOT (
    linked_teacher_id IS NOT NULL
    AND linked_other_staff_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_school_expenses_linked_teacher ON public.school_expenses (linked_teacher_id)
  WHERE linked_teacher_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_school_expenses_linked_other_staff ON public.school_expenses (linked_other_staff_id)
  WHERE linked_other_staff_id IS NOT NULL;

-- 5) RLS: admin / owner / head_teacher read + write; accountant read-only (for payroll / expenses context)
ALTER TABLE public.other_staff_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "other_staff_manage_school" ON public.other_staff_members;
CREATE POLICY "other_staff_manage_school"
  ON public.other_staff_members
  FOR ALL
  TO authenticated
  USING (
    school_id IN (
      SELECT u.school_id
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'owner', 'head_teacher')
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT u.school_id
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.role IN ('admin', 'owner', 'head_teacher')
    )
  );

DROP POLICY IF EXISTS "other_staff_select_accountant" ON public.other_staff_members;
CREATE POLICY "other_staff_select_accountant"
  ON public.other_staff_members
  FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT u.school_id
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.role IN ('accountant', 'admin', 'owner', 'head_teacher')
    )
  );
