-- Auto-assign employee_id when school staff are added (teachers + users with admin/accountant/librarian/head_teacher).
-- Parents and students are excluded. Uses shared pool (next_employee_id_for_school) so IDs never clash.

-- 1) Teachers: use shared pool on INSERT (so new teachers get next ID across teachers + users)
CREATE OR REPLACE FUNCTION public.trigger_generate_employee_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.employee_id IS NULL OR TRIM(NEW.employee_id) = '' THEN
    NEW.employee_id := public.next_employee_id_for_school(NEW.school_id);
  END IF;
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.trigger_generate_employee_id() IS
  'BEFORE INSERT on teachers: set employee_id from shared pool (format RS26001).';

-- 2) Users: set employee_id on INSERT for staff roles (admin, accountant, librarian, head_teacher)
CREATE OR REPLACE FUNCTION public.set_staff_employee_id_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.role IN ('admin', 'accountant', 'librarian', 'head_teacher')
     AND NEW.school_id IS NOT NULL
     AND (NEW.employee_id IS NULL OR TRIM(NEW.employee_id) = '') THEN
    NEW.employee_id := public.next_employee_id_for_school(NEW.school_id);
  END IF;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS users_set_staff_employee_id ON public.users;
CREATE TRIGGER users_set_staff_employee_id
  BEFORE INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.set_staff_employee_id_on_insert();

COMMENT ON FUNCTION public.set_staff_employee_id_on_insert() IS
  'BEFORE INSERT on users: assign employee_id for admin, accountant, librarian, head_teacher (excludes parents, students, teachers).';
