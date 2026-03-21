-- Parents / guardians: single canonical table (`public.parents`).
-- `students.guardian_*` becomes a denormalized mirror of the primary parent row, kept by trigger.

-- 1) Columns used for “primary” contact and relationship label
ALTER TABLE public.parents
  ADD COLUMN IF NOT EXISTS relationship text;

ALTER TABLE public.parents
  ADD COLUMN IF NOT EXISTS is_primary_contact boolean NOT NULL DEFAULT true;

COMMENT ON TABLE public.parents IS
  'Canonical parent/guardian contacts per student. parent_id = auth user when portal login exists; name/phone/email are the contact record.';

COMMENT ON COLUMN public.parents.relationship IS
  'e.g. Father, Mother, Guardian — same idea as legacy students.guardian_relationship.';

COMMENT ON COLUMN public.parents.is_primary_contact IS
  'When multiple rows exist for one student, the primary row drives students.guardian_* mirror.';

COMMENT ON COLUMN public.students.guardian_name IS
  'Denormalized mirror of the primary row in public.parents; maintained by trigger trg_parents_sync_student_guardian. Prefer public.parents for source of truth.';

COMMENT ON COLUMN public.students.guardian_phone IS
  'Denormalized mirror of public.parents.phone for the primary contact; maintained by trigger.';

COMMENT ON COLUMN public.students.guardian_email IS
  'Denormalized mirror of public.parents.email for the primary contact; maintained by trigger.';

COMMENT ON COLUMN public.students.guardian_relationship IS
  'Denormalized mirror of public.parents.relationship for the primary contact; maintained by trigger.';

-- 2) Backfill: student has guardian email matching an existing parent user, but no parents row yet
INSERT INTO public.parents (parent_id, student_id, school_id, name, email, phone, relationship, is_primary_contact)
SELECT
  u.user_id,
  s.student_id,
  s.school_id,
  COALESCE(NULLIF(trim(s.guardian_name), ''), 'Guardian'),
  lower(trim(s.guardian_email)),
  NULLIF(trim(s.guardian_phone), ''),
  NULLIF(trim(s.guardian_relationship), ''),
  true
FROM public.students s
INNER JOIN public.users u
  ON lower(trim(u.email)) = lower(trim(s.guardian_email))
  AND u.role = 'parent'
WHERE s.guardian_email IS NOT NULL
  AND trim(s.guardian_email) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM public.parents p
    WHERE p.student_id = s.student_id
      AND p.parent_id = u.user_id
  );

-- 3) Keep students.guardian_* in sync with the primary parents row
CREATE OR REPLACE FUNCTION public.apply_student_guardian_mirror_from_parents(p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_phone text;
  v_email text;
  v_rel text;
BEGIN
  SELECT p.name, p.phone, p.email, p.relationship
  INTO v_name, v_phone, v_email, v_rel
  FROM public.parents p
  WHERE p.student_id = p_student_id
  ORDER BY
    CASE WHEN COALESCE(p.is_primary_contact, true) THEN 0 ELSE 1 END,
    p.parent_id
  LIMIT 1;

  IF NOT FOUND THEN
    UPDATE public.students
    SET
      guardian_name = NULL,
      guardian_phone = NULL,
      guardian_email = NULL,
      guardian_relationship = NULL
    WHERE student_id = p_student_id;
    RETURN;
  END IF;

  UPDATE public.students
  SET
    guardian_name = v_name,
    guardian_phone = v_phone,
    guardian_email = v_email,
    guardian_relationship = COALESCE(NULLIF(trim(v_rel), ''), 'Guardian')
  WHERE student_id = p_student_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_parents_sync_student_guardian()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.apply_student_guardian_mirror_from_parents(COALESCE(NEW.student_id, OLD.student_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_parents_sync_student_guardian ON public.parents;
CREATE TRIGGER trg_parents_sync_student_guardian
  AFTER INSERT OR UPDATE OR DELETE ON public.parents
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_parents_sync_student_guardian();

-- 4) One-time: refresh mirror for all students that already have parent rows
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN SELECT DISTINCT student_id FROM public.parents
  LOOP
    PERFORM public.apply_student_guardian_mirror_from_parents(r.student_id);
  END LOOP;
END $$;
