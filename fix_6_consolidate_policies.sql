-- FIX 6: Consolidate duplicate permissive policies on owner metrics tables
-- Merge the two authenticated policies into one combined policy

-- Fix owner_revenue_trend_metrics
DROP POLICY IF EXISTS "Owners can access revenue metrics" ON public.owner_revenue_trend_metrics;
DROP POLICY IF EXISTS owner_revenue_access ON public.owner_revenue_trend_metrics;

CREATE POLICY owner_revenue_access ON public.owner_revenue_trend_metrics
  FOR ALL
  TO authenticated
  USING (
    (select auth.uid()) IN (
      SELECT user_id FROM public.user_school_permissions
      WHERE permission_key = 'owner'
    )
  )
  WITH CHECK (
    (select auth.uid()) IN (
      SELECT user_id FROM public.user_school_permissions
      WHERE permission_key = 'owner'
    )
  );

-- Fix owner_school_growth_metrics
DROP POLICY IF EXISTS "Owners can access school growth metrics" ON public.owner_school_growth_metrics;
DROP POLICY IF EXISTS owner_school_access ON public.owner_school_growth_metrics;

CREATE POLICY owner_school_access ON public.owner_school_growth_metrics
  FOR ALL
  TO authenticated
  USING (
    (select auth.uid()) IN (
      SELECT user_id FROM public.user_school_permissions
      WHERE permission_key = 'owner'
    )
  )
  WITH CHECK (
    (select auth.uid()) IN (
      SELECT user_id FROM public.user_school_permissions
      WHERE permission_key = 'owner'
    )
  );

-- Fix owner_user_growth_metrics
DROP POLICY IF EXISTS "Owners can access user growth metrics" ON public.owner_user_growth_metrics;
DROP POLICY IF EXISTS owner_user_access ON public.owner_user_growth_metrics;

CREATE POLICY owner_user_access ON public.owner_user_growth_metrics
  FOR ALL
  TO authenticated
  USING (
    (select auth.uid()) IN (
      SELECT user_id FROM public.user_school_permissions
      WHERE permission_key = 'owner'
    )
  )
  WITH CHECK (
    (select auth.uid()) IN (
      SELECT user_id FROM public.user_school_permissions
      WHERE permission_key = 'owner'
    )
  );
