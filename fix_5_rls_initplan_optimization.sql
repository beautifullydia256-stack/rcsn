-- FIX 5: Optimize RLS policies to avoid re-evaluating auth functions per row
-- Wrap auth.uid() calls with (select auth.uid()) to cache the value

-- Fix owner_revenue_trend_metrics
DROP POLICY IF EXISTS owner_revenue_access ON public.owner_revenue_trend_metrics;
CREATE POLICY owner_revenue_access ON public.owner_revenue_trend_metrics
  FOR ALL
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
DROP POLICY IF EXISTS owner_school_access ON public.owner_school_growth_metrics;
CREATE POLICY owner_school_access ON public.owner_school_growth_metrics
  FOR ALL
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
DROP POLICY IF EXISTS owner_user_access ON public.owner_user_growth_metrics;
CREATE POLICY owner_user_access ON public.owner_user_growth_metrics
  FOR ALL
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
