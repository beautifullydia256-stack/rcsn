-- Satisfy linter: RLS enabled with explicit policies (deny client roles).
-- service_role bypasses RLS; these tables are only accessed via Edge/API with service key.
-- https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy

-- affiliates (same pattern as referral_codes)
DROP POLICY IF EXISTS affiliates_deny_anon_authenticated ON public.affiliates;
CREATE POLICY affiliates_deny_anon_authenticated
  ON public.affiliates
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- referral_codes
DROP POLICY IF EXISTS referral_codes_deny_anon_authenticated ON public.referral_codes;
CREATE POLICY referral_codes_deny_anon_authenticated
  ON public.referral_codes
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- schoolpay_school_settings
DROP POLICY IF EXISTS schoolpay_school_settings_deny_anon_authenticated ON public.schoolpay_school_settings;
CREATE POLICY schoolpay_school_settings_deny_anon_authenticated
  ON public.schoolpay_school_settings
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);

-- schoolpay_ingested_events
DROP POLICY IF EXISTS schoolpay_ingested_events_deny_anon_authenticated ON public.schoolpay_ingested_events;
CREATE POLICY schoolpay_ingested_events_deny_anon_authenticated
  ON public.schoolpay_ingested_events
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
