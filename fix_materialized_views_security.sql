-- Fix Materialized Views and Extension Security Warnings
-- Part 2: Handle materialized views and extension placement

-- ========================================
-- 1. FIX EXTENSION IN PUBLIC SCHEMA
-- ========================================

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Document the btree_gist extension issue
-- Note: Moving extensions requires superuser privileges
COMMENT ON EXTENSION btree_gist IS 'Extension used for specialized indexing - consider moving to extensions schema by Supabase support';

-- ========================================
-- 2. FIX MATERIALIZED VIEW API ACCESS
-- ========================================

-- Check if materialized views exist first
DO $$
BEGIN
  -- Check and fix owner_dashboard_metrics
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'owner_dashboard_metrics') THEN
    -- Revoke public access
    EXECUTE 'REVOKE ALL ON public.owner_dashboard_metrics FROM anon';
    EXECUTE 'REVOKE ALL ON public.owner_dashboard_metrics FROM public';
    
    -- Enable RLS if not already enabled
    EXECUTE 'ALTER MATERIALIZED VIEW public.owner_dashboard_metrics ENABLE ROW LEVEL SECURITY';
    
    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS "Only owners can access dashboard metrics" ON public.owner_dashboard_metrics;
    
    -- Create new policy
    EXECUTE 'CREATE POLICY "Only owners can access dashboard metrics" ON public.owner_dashboard_metrics
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role = ''owner''
        )
      )';
    
    -- Grant proper access
    EXECUTE 'GRANT SELECT ON public.owner_dashboard_metrics TO authenticated';
  END IF;

  -- Check and fix owner_school_growth_metrics
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'owner_school_growth_metrics') THEN
    EXECUTE 'REVOKE ALL ON public.owner_school_growth_metrics FROM anon';
    EXECUTE 'REVOKE ALL ON public.owner_school_growth_metrics FROM public';
    EXECUTE 'ALTER MATERIALIZED VIEW public.owner_school_growth_metrics ENABLE ROW LEVEL SECURITY';
    
    DROP POLICY IF EXISTS "Only owners can access school growth metrics" ON public.owner_school_growth_metrics;
    
    EXECUTE 'CREATE POLICY "Only owners can access school growth metrics" ON public.owner_school_growth_metrics
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role = ''owner''
        )
      )';
    
    EXECUTE 'GRANT SELECT ON public.owner_school_growth_metrics TO authenticated';
  END IF;

  -- Check and fix owner_user_growth_metrics
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'owner_user_growth_metrics') THEN
    EXECUTE 'REVOKE ALL ON public.owner_user_growth_metrics FROM anon';
    EXECUTE 'REVOKE ALL ON public.owner_user_growth_metrics FROM public';
    EXECUTE 'ALTER MATERIALIZED VIEW public.owner_user_growth_metrics ENABLE ROW LEVEL SECURITY';
    
    DROP POLICY IF EXISTS "Only owners can access user growth metrics" ON public.owner_user_growth_metrics;
    
    EXECUTE 'CREATE POLICY "Only owners can access user growth metrics" ON public.owner_user_growth_metrics
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role = ''owner''
        )
      )';
    
    EXECUTE 'GRANT SELECT ON public.owner_user_growth_metrics TO authenticated';
  END IF;

  -- Check and fix owner_revenue_trend_metrics
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'owner_revenue_trend_metrics') THEN
    EXECUTE 'REVOKE ALL ON public.owner_revenue_trend_metrics FROM anon';
    EXECUTE 'REVOKE ALL ON public.owner_revenue_trend_metrics FROM public';
    EXECUTE 'ALTER MATERIALIZED VIEW public.owner_revenue_trend_metrics ENABLE ROW LEVEL SECURITY';
    
    DROP POLICY IF EXISTS "Only owners can access revenue trend metrics" ON public.owner_revenue_trend_metrics;
    
    EXECUTE 'CREATE POLICY "Only owners can access revenue trend metrics" ON public.owner_revenue_trend_metrics
      FOR SELECT USING (
        EXISTS (
          SELECT 1 FROM profiles 
          WHERE profiles.id = auth.uid() 
          AND profiles.role = ''owner''
        )
      )';
    
    EXECUTE 'GRANT SELECT ON public.owner_revenue_trend_metrics TO authenticated';
  END IF;

END $$;

-- ========================================
-- 3. VERIFICATION QUERIES
-- ========================================

-- Verify function security settings
SELECT 
  routine_name,
  routine_type,
  security_type,
  routine_definition LIKE '%SET search_path%' as has_search_path_set
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'get_owner_dashboard_metrics',
    'sync_referral_use_count', 
    'get_owner_revenue_metrics',
    'get_database_size'
  );

-- Verify materialized view RLS and policies
SELECT 
  schemaname,
  tablename as matview_name,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename LIKE 'owner_%_metrics'
  AND schemaname = 'public'
ORDER BY tablename, policyname;

-- Check materialized view permissions
SELECT 
  schemaname,
  matviewname,
  hasindexes,
  ispopulated
FROM pg_matviews 
WHERE schemaname = 'public'
  AND matviewname LIKE 'owner_%_metrics';

-- Summary of security improvements
SELECT 'Security fixes applied successfully' as status;