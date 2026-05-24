-- Fix: next_employee_id_for_school generated duplicate employee IDs.
--
-- Root cause (two compounding bugs):
-- 1. Serial extraction used `substring(id FROM '([0-9]+)$')` which grabbed ALL
--    trailing digits, including the embedded year. For KCOUP26262 it extracted
--    26262 instead of 262.
-- 2. `lpad(26263, 3, '0')` silently TRUNCATED the too-long string to '262',
--    producing the same ID that already existed → 409 Conflict.
--
-- Fix:
-- 1. Use position-based extraction: `substring(id FROM prefix_len + 1)` so only
--    the serial digits (after school_code+year) are parsed.
-- 2. Use GREATEST(3, length(...)) in lpad so it can never truncate.
--    There is no maximum number of teachers — schools are unlimited.
--
-- This affects all schools equally. Mulungi avoided the visible collision only
-- because its teachers had not yet hit the exact serial that triggers the wrap.

CREATE OR REPLACE FUNCTION public.next_employee_id_for_school(school_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
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

-- Revoke direct REST API access (trigger functions bypass this check anyway)
REVOKE EXECUTE ON FUNCTION public.next_employee_id_for_school(uuid) FROM anon, authenticated, PUBLIC;
