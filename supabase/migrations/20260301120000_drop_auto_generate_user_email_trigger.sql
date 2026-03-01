-- Remove auto email generation on users insert (was causing Create Staff 500)
-- Create Staff / API provides email explicitly; trigger overwrote it and could fail

DROP TRIGGER IF EXISTS trigger_auto_generate_user_email ON public.users;
