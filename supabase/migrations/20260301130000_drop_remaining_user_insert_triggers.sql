-- Temporarily drop remaining BEFORE INSERT triggers on public.users to fix Create Staff 500.
-- After confirming Create Staff works we can fix and re-add the ones we need.

DROP TRIGGER IF EXISTS trigger_set_user_defaults_and_linking ON public.users;
DROP TRIGGER IF EXISTS users_set_staff_employee_id ON public.users;
