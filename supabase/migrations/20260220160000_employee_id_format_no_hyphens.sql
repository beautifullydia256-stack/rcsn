-- Employee ID format: no hyphens (e.g. RS26001 instead of RS-26-001).
-- When computing next serial we consider both old (RS-26-001) and new (RS26001) formats.

CREATE OR REPLACE FUNCTION public.generate_employee_id(school_id_param uuid)
RETURNS text
LANGUAGE plpgsql
AS $function$
DECLARE
    school_name text;
    school_code text;
    current_year text;
    serial_number text;
    employee_id text;
    max_serial integer;
BEGIN
    SELECT name INTO school_name
    FROM public.schools
    WHERE school_id = school_id_param;

    IF school_name IS NULL THEN
        RAISE EXCEPTION 'School not found for ID: %', school_id_param;
    END IF;

    school_code := public.generate_school_code(school_name);
    current_year := to_char(CURRENT_DATE, 'YY');

    SELECT COALESCE(MAX(
        CASE
            WHEN t.employee_id ~ ('^' || school_code || current_year || '[0-9]+$')
                THEN CAST(substring(t.employee_id from '([0-9]+)$') AS integer)
            WHEN t.employee_id ~ ('^' || school_code || '-' || current_year || '-[0-9]+$')
                THEN CAST(substring(t.employee_id from '([0-9]+)$') AS integer)
            ELSE 0
        END
    ), 0) INTO max_serial
    FROM public.teachers t
    WHERE t.school_id = school_id_param;

    serial_number := lpad((max_serial + 1)::text, 3, '0');
    employee_id := school_code || current_year || serial_number;

    RETURN employee_id;
END;
$function$;

COMMENT ON FUNCTION public.generate_employee_id(uuid) IS 'Generate teacher employee ID: SCHOOLCODE + YY + NNN e.g. RS26001 (no hyphens).';
