-- trigger_generate_employee_id is a trigger function — it must never be
-- callable directly via the REST API (rpc/ endpoint).
-- Supabase security advisor was flagging it as publicly executable.
-- Triggers bypass role EXECUTE checks, so the function continues to work
-- normally; only the direct REST call is blocked.

REVOKE EXECUTE ON FUNCTION public.trigger_generate_employee_id() FROM anon, authenticated;
