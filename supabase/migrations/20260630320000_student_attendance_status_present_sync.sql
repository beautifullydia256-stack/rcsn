-- Keep `status` and `present` consistent: `status` wins. Fixes UI/API where upsert updated only
-- `status` and PostgREST left stale `present = true`, so learners looked "Present" while marked absent.
-- Default for new/incomplete rows: absent (not counted as present until explicitly marked).

CREATE OR REPLACE FUNCTION public.student_attendance_normalize_present_status_fn()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  st text;
BEGIN
  st := lower(trim(both from coalesce(NEW.status, '')));
  IF st = 'absent' THEN
    NEW.present := false;
    RETURN NEW;
  END IF;
  IF st IN ('present', 'late', 'excused') THEN
    NEW.present := true;
    RETURN NEW;
  END IF;
  IF NEW.present IS TRUE THEN
    NEW.status := 'present';
    RETURN NEW;
  END IF;
  NEW.status := 'absent';
  NEW.present := false;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.student_attendance_normalize_present_status_fn() IS
  'BEFORE INSERT/UPDATE: align present boolean with status; absent is the default when status is missing.';

DROP TRIGGER IF EXISTS student_attendance_normalize_present_status ON public.student_attendance;

CREATE TRIGGER student_attendance_normalize_present_status
BEFORE INSERT OR UPDATE ON public.student_attendance
FOR EACH ROW
EXECUTE FUNCTION public.student_attendance_normalize_present_status_fn();

COMMENT ON TRIGGER student_attendance_normalize_present_status ON public.student_attendance IS
  'Ensures present flag matches status so partial upserts cannot leave misleading present=true on absent rows.';

-- One-time repair of existing inconsistent rows
UPDATE public.student_attendance
SET present = false
WHERE lower(trim(both from coalesce(status, ''))) = 'absent'
  AND present IS DISTINCT FROM false;

UPDATE public.student_attendance
SET present = true
WHERE lower(trim(both from coalesce(status, ''))) = ANY (ARRAY['present', 'late', 'excused'])
  AND present IS NOT TRUE;
