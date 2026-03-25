-- 1) Portal ↔ staff: link teacher logins to roster rows; keep emails in sync.
-- 2) teacher_class_subjects: subject_teacher (primary) vs co_teacher; one primary per class+subject.

-- ---------------------------------------------------------------------------
-- A. users.linked_teacher_id
-- ---------------------------------------------------------------------------
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS linked_teacher_id uuid REFERENCES public.teachers (teacher_id) ON DELETE SET NULL;

-- At most one portal login per staff row (also serves lookup index)
CREATE UNIQUE INDEX IF NOT EXISTS users_one_portal_per_teacher_uq
  ON public.users (linked_teacher_id)
  WHERE linked_teacher_id IS NOT NULL;

COMMENT ON COLUMN public.users.linked_teacher_id IS
  'When role=teacher, points to public.teachers row for this login (portal ↔ staff).';

-- Backfill: match portal teacher users to staff by email + school
UPDATE public.users u
SET linked_teacher_id = t.teacher_id
FROM public.teachers t
WHERE u.role = 'teacher'
  AND u.linked_teacher_id IS NULL
  AND u.school_id IS NOT NULL
  AND u.school_id = t.school_id
  AND u.email IS NOT NULL
  AND t.email IS NOT NULL
  AND lower(trim(u.email)) = lower(trim(t.email));

-- Keep teachers.email aligned when the portal email changes (requires linked_teacher_id set)
CREATE OR REPLACE FUNCTION public.sync_teacher_email_from_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'teacher'
     AND NEW.linked_teacher_id IS NOT NULL
     AND NEW.email IS NOT NULL THEN
    UPDATE public.teachers
    SET email = lower(trim(NEW.email))
    WHERE teacher_id = NEW.linked_teacher_id
      AND (school_id IS NOT DISTINCT FROM NEW.school_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_users_sync_teacher_email ON public.users;
CREATE TRIGGER tr_users_sync_teacher_email
AFTER INSERT OR UPDATE OF email, linked_teacher_id, school_id ON public.users
FOR EACH ROW
WHEN (NEW.role = 'teacher')
EXECUTE FUNCTION public.sync_teacher_email_from_user();

COMMENT ON FUNCTION public.sync_teacher_email_from_user() IS
  'When a teacher user email or link changes, mirror email onto public.teachers.';

-- ---------------------------------------------------------------------------
-- B. teacher_class_subjects.assignment_role
-- ---------------------------------------------------------------------------
ALTER TABLE public.teacher_class_subjects
  ADD COLUMN IF NOT EXISTS assignment_role text NOT NULL DEFAULT 'subject_teacher'
  CHECK (assignment_role IN ('subject_teacher', 'co_teacher'));

COMMENT ON COLUMN public.teacher_class_subjects.assignment_role IS
  'subject_teacher = primary teacher for this class+subject; co_teacher = additional teacher.';

-- If multiple rows exist for the same (school, class, subject), keep one primary; mark others co-teacher
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY school_id, class_name, subject
      ORDER BY created_at ASC NULLS LAST, id ASC
    ) AS rn
  FROM public.teacher_class_subjects
)
UPDATE public.teacher_class_subjects t
SET assignment_role = 'co_teacher'
FROM ranked r
WHERE t.id = r.id
  AND r.rn > 1;

-- Replace uniqueness: same person cannot be twice with same role; co-teachers allowed alongside primary
ALTER TABLE public.teacher_class_subjects
  DROP CONSTRAINT IF EXISTS teacher_class_subjects_teacher_id_class_name_subject_key;

ALTER TABLE public.teacher_class_subjects
  ADD CONSTRAINT teacher_class_subjects_teacher_class_subject_role_uniq
  UNIQUE (teacher_id, class_name, subject, assignment_role);

-- Exactly one subject_teacher per (school, class, subject)
CREATE UNIQUE INDEX IF NOT EXISTS tcs_one_subject_teacher_per_class_subject_uq
  ON public.teacher_class_subjects (school_id, class_name, subject)
  WHERE assignment_role = 'subject_teacher';
