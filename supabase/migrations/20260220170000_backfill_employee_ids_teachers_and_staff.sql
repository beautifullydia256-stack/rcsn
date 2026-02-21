-- Ensure every school employee has an employee_id: Teachers (teachers table) and
-- staff in users (Accountant, Librarian, Admin, Head teacher). Format: RS26001 (no hyphens).
-- One serial pool per school per year across teachers and users so IDs never clash.

-- 1) Backfill teachers with NULL or empty employee_id (one-by-one so serials don't clash)
DO $$
DECLARE
  r RECORD;
  next_id text;
BEGIN
  FOR r IN
    SELECT teacher_id, school_id
    FROM public.teachers
    WHERE employee_id IS NULL OR TRIM(employee_id) = ''
  LOOP
    next_id := public.generate_employee_id(r.school_id);
    UPDATE public.teachers SET employee_id = next_id WHERE teacher_id = r.teacher_id;
  END LOOP;
END $$;

-- 2) Add employee_id to users for staff roles
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS employee_id TEXT;

CREATE INDEX IF NOT EXISTS idx_users_employee_id ON public.users(employee_id) WHERE employee_id IS NOT NULL;

-- 3) Function: next employee_id for a school (considers both teachers and users, same format)
CREATE OR REPLACE FUNCTION public.next_employee_id_for_school(school_id_param uuid)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
  school_name text;
  school_code text;
  current_year text;
  max_serial integer;
  serial_number text;
  next_id text;
  pattern_new text;
  pattern_old text;
BEGIN
  SELECT name INTO school_name
  FROM public.schools
  WHERE school_id = school_id_param;

  IF school_name IS NULL THEN
    RAISE EXCEPTION 'School not found for ID: %', school_id_param;
  END IF;

  school_code := public.generate_school_code(school_name);
  current_year := to_char(CURRENT_DATE, 'YY');
  pattern_new := '^' || school_code || current_year || '[0-9]+$';
  pattern_old := '^' || school_code || '-' || current_year || '-[0-9]+$';

  SELECT COALESCE(MAX(ser), 0) INTO max_serial
  FROM (
    SELECT
      CASE
        WHEN t.employee_id ~ pattern_new OR t.employee_id ~ pattern_old
        THEN CAST(substring(t.employee_id from '([0-9]+)$') AS integer)
        ELSE 0
      END AS ser
    FROM public.teachers t
    WHERE t.school_id = school_id_param
    UNION ALL
    SELECT
      CASE
        WHEN u.employee_id ~ pattern_new OR u.employee_id ~ pattern_old
        THEN CAST(substring(u.employee_id from '([0-9]+)$') AS integer)
        ELSE 0
      END AS ser
    FROM public.users u
    WHERE u.school_id = school_id_param AND u.employee_id IS NOT NULL AND TRIM(u.employee_id) <> ''
  ) x;

  serial_number := lpad((max_serial + 1)::text, 3, '0');
  next_id := school_code || current_year || serial_number;
  RETURN next_id;
END;
$function$;

COMMENT ON FUNCTION public.next_employee_id_for_school(uuid) IS
  'Next employee ID for school (format RS26001). Uses one serial pool across teachers and users.';

-- 4) Backfill users: accountant, librarian, admin, head_teacher (same school)
DO $$
DECLARE
  r RECORD;
  next_id text;
BEGIN
  FOR r IN
    SELECT user_id, school_id
    FROM public.users
    WHERE role IN ('accountant', 'librarian', 'admin', 'head_teacher')
      AND school_id IS NOT NULL
      AND (employee_id IS NULL OR TRIM(employee_id) = '')
  LOOP
    next_id := public.next_employee_id_for_school(r.school_id);
    UPDATE public.users
    SET employee_id = next_id
    WHERE user_id = r.user_id;
  END LOOP;
END $$;
</think>
Fixing the migration file: the closing `$$` was incorrect.
<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
Read