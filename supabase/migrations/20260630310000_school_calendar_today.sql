-- School calendar "today" for attendance_date and other Uganda-facing dates (East Africa Time, no DST).
-- Application uses `Africa/Kampala` via `schoolCalendarTodayIso()`; this function is the DB counterpart.
--
-- Also: after a batch INSERT into student_attendance (e.g. only "present" rows from the client),
-- automatically INSERT explicit `absent` rows for every other active learner in the same class and date.
-- Nested INSERTs are skipped via pg_trigger_depth() so recursion does not loop.

CREATE OR REPLACE FUNCTION public.school_calendar_today()
RETURNS date
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Kampala')::date;
$$;

COMMENT ON FUNCTION public.school_calendar_today() IS
  'Calendar date in Africa/Kampala. Attendance for a school day uses this date; it rolls at midnight Kampala time, not UTC.';

GRANT EXECUTE ON FUNCTION public.school_calendar_today() TO authenticated;
GRANT EXECUTE ON FUNCTION public.school_calendar_today() TO service_role;

-- ---------------------------------------------------------------------------
-- Explicit absent rows for the rest of the class roster (same school, class, date)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.student_attendance_sync_absent_for_class(
  p_school_id uuid,
  p_class_name text,
  p_attendance_date date,
  p_teacher_id uuid,
  p_include_student_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  n integer;
BEGIN
  INSERT INTO public.student_attendance AS sa (
    school_id,
    class_name,
    student_id,
    teacher_id,
    attendance_date,
    status,
    present
  )
  SELECT
    p_school_id,
    trim(both from p_class_name),
    s.student_id,
    p_teacher_id,
    p_attendance_date,
    'absent'::text,
    false
  FROM public.students s
  WHERE s.school_id = p_school_id
    AND s.status = 'active'
    AND trim(both from coalesce(s.current_class, '')) = trim(both from coalesce(p_class_name, ''))
    AND NOT (
      s.student_id = ANY (coalesce(p_include_student_ids, '{}'::uuid[]))
    )
  ON CONFLICT (student_id, attendance_date) DO UPDATE SET
    class_name = EXCLUDED.class_name,
    teacher_id = COALESCE(EXCLUDED.teacher_id, sa.teacher_id),
    status = CASE
      WHEN lower(trim(both from coalesce(sa.status, ''))) = ANY (ARRAY['present', 'late', 'excused'])
        OR sa.present IS TRUE
      THEN coalesce(nullif(trim(both from sa.status), ''), 'present'::text)
      ELSE EXCLUDED.status
    END,
    present = CASE
      WHEN lower(trim(both from coalesce(sa.status, ''))) = ANY (ARRAY['present', 'late', 'excused'])
        OR sa.present IS TRUE
      THEN coalesce(sa.present, true)
      ELSE EXCLUDED.present
    END;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

COMMENT ON FUNCTION public.student_attendance_sync_absent_for_class(uuid, text, date, uuid, uuid[]) IS
  'Inserts/updates absent rows for active students in the class on attendance_date, except student_ids listed in p_include_student_ids (the batch that was just saved). Does not downgrade existing present/late/excused.';

-- Optional: call from app or SQL console when you only pass present IDs (same effect as trigger after present-only insert).
CREATE OR REPLACE FUNCTION public.sync_class_attendance_for_date(
  p_school_id uuid,
  p_class_name text,
  p_attendance_date date,
  p_teacher_id uuid,
  p_present_student_ids uuid[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN public.student_attendance_sync_absent_for_class(
    p_school_id,
    p_class_name,
    p_attendance_date,
    p_teacher_id,
    coalesce(p_present_student_ids, '{}'::uuid[])
  );
END;
$$;

COMMENT ON FUNCTION public.sync_class_attendance_for_date(uuid, text, date, uuid, uuid[]) IS
  'Backfill explicit absent rows for everyone in the class not listed in p_present_student_ids for that date.';

GRANT EXECUTE ON FUNCTION public.sync_class_attendance_for_date(uuid, text, date, uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_class_attendance_for_date(uuid, text, date, uuid, uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.student_attendance_sync_absent_for_class(uuid, text, date, uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_attendance_sync_absent_for_class(uuid, text, date, uuid, uuid[]) TO service_role;

CREATE OR REPLACE FUNCTION public.student_attendance_fill_absent_after_insert_fn()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  r record;
  v_ids uuid[];
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  FOR r IN
    SELECT DISTINCT
      nt.school_id,
      nt.class_name,
      nt.attendance_date,
      nt.teacher_id
    FROM new_table AS nt
  LOOP
    SELECT coalesce(array_agg(DISTINCT nt2.student_id), '{}'::uuid[])
    INTO v_ids
    FROM new_table AS nt2
    WHERE nt2.school_id IS NOT DISTINCT FROM r.school_id
      AND trim(both from coalesce(nt2.class_name, '')) = trim(both from coalesce(r.class_name, ''))
      AND nt2.attendance_date IS NOT DISTINCT FROM r.attendance_date;

    PERFORM public.student_attendance_sync_absent_for_class(
      r.school_id,
      r.class_name,
      r.attendance_date,
      r.teacher_id,
      v_ids
    );
  END LOOP;

  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS student_attendance_fill_absent_after_insert ON public.student_attendance;

CREATE TRIGGER student_attendance_fill_absent_after_insert
AFTER INSERT ON public.student_attendance
REFERENCING NEW TABLE AS new_table
FOR EACH STATEMENT
EXECUTE FUNCTION public.student_attendance_fill_absent_after_insert_fn();

COMMENT ON TRIGGER student_attendance_fill_absent_after_insert ON public.student_attendance IS
  'After each INSERT batch, writes absent rows for active class members not in that batch (same school, class_name, attendance_date).';
