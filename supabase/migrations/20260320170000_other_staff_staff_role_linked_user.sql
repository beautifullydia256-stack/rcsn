-- Staff roster: dashboard role + link to auth user after invite accepts
ALTER TABLE public.other_staff_members
  ADD COLUMN IF NOT EXISTS staff_role TEXT,
  ADD COLUMN IF NOT EXISTS linked_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL;

COMMENT ON COLUMN public.other_staff_members.staff_role IS
  'Intended dashboard role (accountant, lab_technician, …). Not teacher/student — teachers use teachers table.';

COMMENT ON COLUMN public.other_staff_members.linked_user_id IS
  'Set when an invitation login is created for this roster row.';

CREATE INDEX IF NOT EXISTS idx_other_staff_members_linked_user ON public.other_staff_members (linked_user_id)
  WHERE linked_user_id IS NOT NULL;
