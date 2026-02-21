-- User login creation flow: users.is_active for activate/deactivate; parents allow one parent linked to many students.

-- 1) users.is_active (default true) for activate/deactivate without deleting
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.users.is_active IS 'When false, user cannot log in; prefer deactivate over delete.';

-- 2) parents: allow same parent (parent_id = auth.uid()) to link to multiple students
--    - Add phone if missing (guardian phone)
--    - Drop UNIQUE on email so same parent can appear for multiple children
--    - Replace PK with (parent_id, student_id) so we can have multiple rows per parent_id

-- Add phone if not exists (used by AddStudentPage / guardian)
ALTER TABLE public.parents
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- Drop unique on email (same person may be guardian for multiple students)
ALTER TABLE public.parents
  DROP CONSTRAINT IF EXISTS parents_email_key;

-- Replace single-column PK with composite (parent_id, student_id)
-- parent_id = auth.uid() in RLS; one parent can have many rows (one per student).
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'parents' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE public.parents DROP CONSTRAINT parents_pkey;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public' AND table_name = 'parents' AND constraint_name = 'parents_parent_id_student_id_pkey'
  ) THEN
    ALTER TABLE public.parents ADD PRIMARY KEY (parent_id, student_id);
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- If parents already has composite or different structure, add unique constraint so (parent_id, student_id) is unique
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE table_schema = 'public' AND table_name = 'parents' AND constraint_name = 'parents_parent_id_student_id_key'
    ) THEN
      CREATE UNIQUE INDEX IF NOT EXISTS parents_parent_id_student_id_key ON public.parents (parent_id, student_id);
    END IF;
END $$;
