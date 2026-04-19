-- Whole years of age from date_of_birth, relative to "today" in the database session (UTC date).
-- Maintained on INSERT/UPDATE of date_of_birth and refreshed daily via pg_cron so ages advance
-- even when no row is edited (e.g. after a birthday).

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS age_years smallint;

COMMENT ON COLUMN public.students.age_years IS
  'Whole years of age from date_of_birth at current_date (DB). Refreshed on DOB changes and by daily job.';

CREATE OR REPLACE FUNCTION public.students_age_years_from_dob_today(p_dob date)
RETURNS smallint
LANGUAGE sql
STABLE
SET search_path = public, pg_temp
AS $$
  SELECT CASE
    WHEN p_dob IS NULL THEN NULL::smallint
    ELSE (
      CASE
        WHEN (extract(year FROM age (current_date::timestamp, p_dob::timestamp)))::integer < 0 THEN NULL::smallint
        WHEN (extract(year FROM age (current_date::timestamp, p_dob::timestamp)))::integer > 120 THEN NULL::smallint
        ELSE (extract(year FROM age (current_date::timestamp, p_dob::timestamp)))::smallint
      END
    )
  END;
$$;

COMMENT ON FUNCTION public.students_age_years_from_dob_today(date) IS
  'Calendar whole years from DOB to current_date; null if DOB missing or out of range.';

CREATE OR REPLACE FUNCTION public.students_set_age_years_trg_fn()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.age_years := public.students_age_years_from_dob_today(NEW.date_of_birth);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS students_set_age_years_trg ON public.students;

CREATE TRIGGER students_set_age_years_trg
  BEFORE INSERT OR UPDATE OF date_of_birth ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.students_set_age_years_trg_fn();

-- One-time backfill and fix any rows where DOB exists but age is null/out of date.
UPDATE public.students
SET age_years = public.students_age_years_from_dob_today(date_of_birth)
WHERE date_of_birth IS NOT NULL;

CREATE OR REPLACE FUNCTION public.students_refresh_all_age_years()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  n integer;
BEGIN
  UPDATE public.students
  SET age_years = public.students_age_years_from_dob_today(date_of_birth)
  WHERE date_of_birth IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

COMMENT ON FUNCTION public.students_refresh_all_age_years() IS
  'Updates age_years for all students with date_of_birth. Scheduled daily; safe to run manually.';

REVOKE ALL ON FUNCTION public.students_refresh_all_age_years() FROM PUBLIC;

DO $cron$
DECLARE
  j RECORD;
BEGIN
  FOR j IN
    SELECT jobid FROM cron.job
    WHERE command LIKE '%students_refresh_all_age_years()%'
       OR command LIKE '%students_refresh_all_age_years() %'
  LOOP
    PERFORM cron.unschedule(j.jobid);
  END LOOP;

  PERFORM cron.schedule(
    'students_refresh_age_years_daily',
    '13 2 * * *',
    'SELECT public.students_refresh_all_age_years();'
  );
EXCEPTION
  WHEN undefined_table THEN
    RAISE NOTICE 'pg_cron not available; run students_refresh_all_age_years() via scheduler manually.';
  WHEN OTHERS THEN
    RAISE NOTICE 'students age_years cron skipped: %', SQLERRM;
END
$cron$;

NOTIFY pgrst, 'reload schema';
