-- Fix: trigger_generate_employee_id must be SECURITY DEFINER
--
-- After the security hardening in step 4, next_employee_id_for_school() was
-- revoked from PUBLIC and anon/authenticated — only service_role/postgres can
-- call it.  But trigger_generate_employee_id() was NOT SECURITY DEFINER, so
-- it ran as the calling role (authenticated).  When any INSERT into teachers
-- fired the trigger, PostgreSQL checked whether authenticated had EXECUTE on
-- next_employee_id_for_school → "permission denied".
--
-- Fix: rebuild the function with SECURITY DEFINER so it runs as its owner
-- (postgres), which already has EXECUTE on next_employee_id_for_school.
-- SET search_path prevents search-path injection (Supabase best practice).

CREATE OR REPLACE FUNCTION public.trigger_generate_employee_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.employee_id IS NULL OR TRIM(NEW.employee_id) = '' THEN
    NEW.employee_id := public.next_employee_id_for_school(NEW.school_id);
  END IF;
  RETURN NEW;
END;
$$;
