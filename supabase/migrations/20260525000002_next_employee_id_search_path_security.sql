-- Fix: next_employee_id_for_school has a mutable search_path (Supabase security lint 0011).
--
-- SECURITY DEFINER functions must pin their search_path to prevent an attacker
-- from shadowing public objects with identically-named objects in another schema.
-- All references inside this function already use the public. prefix, so
-- adding SET search_path = '' (empty → fully-qualified only) is safe.

CREATE OR REPLACE FUNCTION public.next_employee_id_for_school(school_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $func$
DECLARE
  school_name   text;
  school_code   text;
  current_year  text;
  prefix        text;
  prefix_len    integer;
  max_serial    integer;
  serial_number text;
  next_id       text;
BEGIN
  -- Serialise concurrent inserts for the same school.
  -- hashtext(uuid::text) gives different keys per school; schools don't block each other.
  PERFORM pg_advisory_xact_lock(0, hashtext(school_id_param::text));

  SELECT name INTO school_name FROM public.schools WHERE school_id = school_id_param;
  IF school_name IS NULL THEN
    RAISE EXCEPTION 'School not found for ID: %', school_id_param;
  END IF;

  school_code  := public.generate_school_code(school_name);
  current_year := to_char(CURRENT_DATE, 'YY');
  prefix       := school_code || current_year;
  prefix_len   := length(prefix);

  SELECT COALESCE(MAX(ser), 0) INTO max_serial
  FROM (
    -- Teachers table: current format {school_code}{year}{serial}
    SELECT CASE
      WHEN t.employee_id LIKE prefix || '%'
        AND substring(t.employee_id FROM prefix_len + 1) ~ '^[0-9]+$'
      THEN CAST(substring(t.employee_id FROM prefix_len + 1) AS integer)
      -- Old format {school_code}-{year}-{serial}
      WHEN t.employee_id ~ ('^' || school_code || '-' || current_year || '-[0-9]+$')
      THEN CAST(substring(t.employee_id FROM '([0-9]+)$') AS integer)
      ELSE 0
    END AS ser
    FROM public.teachers t WHERE t.school_id = school_id_param
    UNION ALL
    -- Users table: same format checks
    SELECT CASE
      WHEN u.employee_id LIKE prefix || '%'
        AND substring(u.employee_id FROM prefix_len + 1) ~ '^[0-9]+$'
      THEN CAST(substring(u.employee_id FROM prefix_len + 1) AS integer)
      WHEN u.employee_id ~ ('^' || school_code || '-' || current_year || '-[0-9]+$')
      THEN CAST(substring(u.employee_id FROM '([0-9]+)$') AS integer)
      ELSE 0
    END AS ser
    FROM public.users u
    WHERE u.school_id = school_id_param
      AND u.employee_id IS NOT NULL
      AND TRIM(u.employee_id) <> ''
  ) x;

  -- Pad to at least 3 digits. GREATEST prevents lpad from ever truncating,
  -- so schools with hundreds or thousands of teachers keep getting unique IDs.
  serial_number := lpad((max_serial + 1)::text, GREATEST(3, length((max_serial + 1)::text)), '0');
  next_id       := prefix || serial_number;
  RETURN next_id;
END;
$func$;

-- Re-apply the REVOKE that the previous migration set.
REVOKE EXECUTE ON FUNCTION public.next_employee_id_for_school(uuid) FROM anon, authenticated, PUBLIC;
