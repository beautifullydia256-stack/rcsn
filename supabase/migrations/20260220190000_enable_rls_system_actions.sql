-- Fix linter: RLS disabled on public.system_actions (exposed via PostgREST).
-- Table is audit-only; only SECURITY DEFINER functions and this policy allow writes.

ALTER TABLE public.system_actions ENABLE ROW LEVEL SECURITY;

-- No SELECT: do not expose audit rows to API clients
CREATE POLICY "system_actions_no_select"
  ON public.system_actions
  FOR SELECT
  TO authenticated
  USING (false);

CREATE POLICY "system_actions_no_select_anon"
  ON public.system_actions
  FOR SELECT
  TO anon
  USING (false);

-- Allow INSERT only for the known system action (ensure_academic_year) so the
-- SECURITY DEFINER function can write when called from authenticated/school_terms trigger
CREATE POLICY "system_actions_insert_audit_only"
  ON public.system_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (action = 'ensure_academic_year');

-- No UPDATE/DELETE from API
CREATE POLICY "system_actions_no_update"
  ON public.system_actions
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

CREATE POLICY "system_actions_no_delete"
  ON public.system_actions
  FOR DELETE
  TO authenticated
  USING (false);

COMMENT ON TABLE public.system_actions IS 'Audit trail for system-generated actions. RLS: no read; insert only for action=ensure_academic_year.';
