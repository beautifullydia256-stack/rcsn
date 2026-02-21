-- Fix linter: Function Search Path Mutable (security best practice).
-- Set immutable search_path on functions that lacked it.

ALTER FUNCTION public.generate_unique_school_code(text, text)
  SET search_path = public;

ALTER FUNCTION public.generate_admission_number_for_student(uuid, date, int)
  SET search_path = public;

ALTER FUNCTION public.generate_admission_number(uuid, text, text, text, date)
  SET search_path = public;

ALTER FUNCTION public.next_employee_id_for_school(uuid)
  SET search_path = public;

ALTER FUNCTION public.generate_employee_id(uuid)
  SET search_path = public;
