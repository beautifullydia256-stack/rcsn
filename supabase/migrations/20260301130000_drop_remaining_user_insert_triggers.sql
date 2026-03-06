-- Fix Create Staff / accounts/add failing with 500 when creating logins.
--
-- Cause: BEFORE INSERT triggers on public.users run when the API inserts a new staff
-- row (head_teacher, accountant, teacher, librarian). users_set_staff_employee_id
-- calls next_employee_id_for_school(school_id); trigger_set_user_defaults_and_linking
-- can also fail. If either trigger throws, the INSERT fails and the API returns 500.
--
-- RLS is not the cause: the API uses the service role (supabaseAdmin) for the insert,
-- so RLS is bypassed. The admin check uses the anon client and cookies; that SELECT
-- is allowed by "Users can view their own data" and "admin select users in school".
--
-- Fix: Drop these triggers so INSERT into users succeeds. Staff can still get
-- employee_id later via a backfill or we can re-add a safer trigger later.
DROP TRIGGER IF EXISTS trigger_set_user_defaults_and_linking ON public.users;
DROP TRIGGER IF EXISTS users_set_staff_employee_id ON public.users;
