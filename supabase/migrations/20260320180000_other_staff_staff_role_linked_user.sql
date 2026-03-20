-- Staff roster: dashboard role for non-teacher staff + link to auth user after invite
ALTER TABLE public.other_staff_members
  ADD COLUMN IF NOT EXISTS staff_role TEXT,
  ADD COLUMN IF NOT EXISTS linked_user_id UUID REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_other_staff_members_linked_user ON public.other_staff_members (linked_user_id)
  WHERE linked_user_id IS NOT NULL;

COMMENT ON COLUMN public.other_staff_members.staff_role IS
  'App role for login (accountant, lab_technician, …). Not teacher/student — teachers use teachers table.';
COMMENT ON COLUMN public.other_staff_members.linked_user_id IS
  'Set when this person accepts an invite and public.users row exists.';
