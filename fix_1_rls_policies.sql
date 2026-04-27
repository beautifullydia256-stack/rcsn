-- FIX 1: Restrict RLS policies on owner metrics tables
-- Replace overly permissive USING (true) and WITH CHECK (true) with proper auth checks

-- Fix owner_revenue_trend_metrics
DROP POLICY IF EXISTS "temp_owner_revenue_access" ON public.owner_revenue_trend_metrics;
CREATE POLICY "owner_revenue_access" ON public.owner_revenue_trend_metrics
  FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM public.user_school_permissions WHERE permission_key = 'owner'))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.user_school_permissions WHERE permission_key = 'owner'));

-- Fix owner_school_growth_metrics
DROP POLICY IF EXISTS "temp_owner_school_access" ON public.owner_school_growth_metrics;
CREATE POLICY "owner_school_access" ON public.owner_school_growth_metrics
  FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM public.user_school_permissions WHERE permission_key = 'owner'))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.user_school_permissions WHERE permission_key = 'owner'));

-- Fix owner_user_growth_metrics
DROP POLICY IF EXISTS "temp_owner_user_access" ON public.owner_user_growth_metrics;
CREATE POLICY "owner_user_access" ON public.owner_user_growth_metrics
  FOR ALL
  USING (auth.uid() IN (SELECT user_id FROM public.user_school_permissions WHERE permission_key = 'owner'))
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.user_school_permissions WHERE permission_key = 'owner'));
