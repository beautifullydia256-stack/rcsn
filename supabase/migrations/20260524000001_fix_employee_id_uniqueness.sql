-- ─────────────────────────────────────────────────────────────────────────────
-- Fix employee_id uniqueness for teachers
--
-- Problem 1 (cross-school): The global UNIQUE(employee_id) constraint can fire
--   when two schools happen to share the same abbreviation prefix (e.g. two
--   "Infant Primary" schools both generate "RIPS").  Employee IDs only need to
--   be unique within a school.
--
-- Problem 2 (race condition): next_employee_id_for_school() reads MAX(serial)
--   then returns a new value without holding any lock.  Two concurrent INSERTs
--   for the same school can read the same MAX and produce identical IDs.
--
-- Fix 1: swap the global unique constraint for a per-school one.
-- Fix 2: acquire a per-school advisory lock before reading MAX so concurrent
--   calls for the same school are serialised (different schools are unaffected).
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Swap the constraint ────────────────────────────────────────────────────
ALTER TABLE public.teachers
  DROP CONSTRAINT IF EXISTS teachers_employee_id_key;

ALTER TABLE public.teachers
  ADD CONSTRAINT teachers_school_employee_id_key
  UNIQUE (school_id, employee_id);

-- ── 2. Replace the generator with a locked version ───────────────────────────
CREATE OR REPLACE FUNCTION public.next_employee_id_for_school(school_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  school_name   text;
  school_code   text;
  current_year  text;
  max_serial    integer;
  serial_number text;
  next_id       text;
  pattern_new   text;
  pattern_old   text;
BEGIN
  -- Serialise concurrent inserts for the same school.
  -- hashtext returns int4; the two-arg form avoids int8 overflow.
  -- Different schools get different lock keys and do not block each other.
  PERFORM pg_advisory_xact_lock(0, hashtext(school_id_param::text));

  SELECT name INTO school_name
  FROM public.schools
  WHERE school_id = school_id_param;

  IF school_name IS NULL THEN
    RAISE EXCEPTION 'School not found for ID: %', school_id_param;
  END IF;

  school_code  := public.generate_school_code(school_name);
  current_year := to_char(CURRENT_DATE, 'YY');
  pattern_new  := '^' || school_code || current_year || '[0-9]+$';
  pattern_old  := '^' || school_code || '-' || current_year || '-[0-9]+$';

  SELECT COALESCE(MAX(ser), 0) INTO max_serial
  FROM (
    SELECT
      CASE
        WHEN t.employee_id ~ pattern_new OR t.employee_id ~ pattern_old
        THEN CAST(substring(t.employee_id FROM '([0-9]+)$') AS integer)
        ELSE 0
      END AS ser
    FROM public.teachers t
    WHERE t.school_id = school_id_param
    UNION ALL
    SELECT
      CASE
        WHEN u.employee_id ~ pattern_new OR u.employee_id ~ pattern_old
        THEN CAST(substring(u.employee_id FROM '([0-9]+)$') AS integer)
        ELSE 0
      END AS ser
    FROM public.users u
    WHERE u.school_id = school_id_param
      AND u.employee_id IS NOT NULL
      AND TRIM(u.employee_id) <> ''
  ) x;

  serial_number := lpad((max_serial + 1)::text, 3, '0');
  next_id       := school_code || current_year || serial_number;
  RETURN next_id;
END;
$$;
