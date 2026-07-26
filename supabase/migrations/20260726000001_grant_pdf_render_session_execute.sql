-- Grant EXECUTE on insert_pdf_render_session to authenticated role.
-- The function is SECURITY DEFINER so it executes as its owner (postgres) —
-- granting EXECUTE to authenticated does not bypass any RLS checks; it only
-- allows PostgREST to route the RPC call correctly.
-- Previously revoked by step_6_revoke_authenticated_batch_2.sql, which caused
-- 403 "permission denied for function insert_pdf_render_session" for all
-- authenticated users attempting to generate PDF reports.
GRANT EXECUTE ON FUNCTION public.insert_pdf_render_session(text, jsonb) TO authenticated;
