-- Fix Materialized Views Security - Alternative Approach
-- Since materialized views don't support RLS, we'll use permission-based security

-- ========================================
-- MATERIALIZED VIEWS SECURITY FIX
-- ========================================

-- Note: Materialized views don't support RLS in PostgreSQL
-- Instead, we'll use permission-based security

-- 1. Revoke all public access from materialized views
DO $$
BEGIN
  -- Remove anonymous access from all owner metrics materialized views
  IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'owner_dashboard_metrics') THEN
    REVOKE ALL ON public.owner_dashboard_metrics FROM anon;
    REVOKE ALL ON public.owner_dashboard_metrics FROM public;
    -- Grant only to authenticated users (will be filtered by application logic)
    GRANT SELECT ON public.owner_dashboard_metrics TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'owner_school_growth_metrics') THEN
    REVOKE ALL ON public.owner_school_growth_metrics FROM anon;
    REVOKE ALL ON public.owner_school_growth_metrics FROM public;
    GRANT SELECT ON public.owner_school_growth_metrics TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'owner_user_growth_metrics') THEN
    REVOKE ALL ON public.owner_user_growth_metrics FROM anon;
    REVOKE ALL ON public.owner_user_growth_metrics FROM public;
    GRANT SELECT ON public.owner_user_growth_metrics TO authenticated;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_matviews WHERE schemaname = 'public' AND matviewname = 'owner_revenue_trend_metrics') THEN
    REVOKE ALL ON public.owner_revenue_trend_metrics FROM anon;
    REVOKE ALL ON public.owner_revenue_trend_metrics FROM public;
    GRANT SELECT ON public.owner_revenue_trend_metrics TO authenticated;
  END IF;

END $$;

-- ========================================
-- ALTERNATIVE: CREATE SECURE VIEWS
-- ========================================

-- Create secure views that wrap the materialized views with RLS-like behavior
-- These views will only show data to users with owner role

-- Secure wrapper for owner_dashboard_metrics
CREATE OR REPLACE VIEW public.secure_owner_dashboard_metrics AS
SELECT *
FROM public.owner_dashboard_metrics
WHERE EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'owner'
);

-- Secure wrapper for owner_school_growth_metrics  
CREATE OR REPLACE VIEW public.secure_owner_school_growth_metrics AS
SELECT *
FROM public.owner_school_growth_metrics
WHERE EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'owner'
);

-- Secure wrapper for owner_user_growth_metrics
CREATE OR REPLACE VIEW public.secure_owner_user_growth_metrics AS
SELECT *
FROM public.owner_user_growth_metrics
WHERE EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'owner'
);

-- Secure wrapper for owner_revenue_trend_metrics
CREATE OR REPLACE VIEW public.secure_owner_revenue_trend_metrics AS
SELECT *
FROM public.owner_revenue_trend_metrics
WHERE EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'owner'
);

-- Grant access to the secure views
GRANT SELECT ON public.secure_owner_dashboard_metrics TO authenticated;
GRANT SELECT ON public.secure_owner_school_growth_metrics TO authenticated;
GRANT SELECT ON public.secure_owner_user_growth_metrics TO authenticated;
GRANT SELECT ON public.secure_owner_revenue_trend_metrics TO authenticated;

-- ========================================
-- EXTENSION DOCUMENTATION
-- ========================================

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Document the btree_gist extension issue
COMMENT ON EXTENSION btree_gist IS 'Extension used for specialized indexing - requires superuser to move to extensions schema';

-- ========================================
-- VERIFICATION
-- ========================================

-- Check materialized view permissions
SELECT 
  schemaname,
  matviewname,
  hasindexes,
  ispopulated,
  'Materialized View' as object_type
FROM pg_matviews 
WHERE schemaname = 'public'
  AND matviewname LIKE 'owner_%_metrics'

UNION ALL

-- Check secure view permissions  
SELECT 
  schemaname,
  viewname as matviewname,
  false as hasindexes,
  true as ispopulated,
  'Secure View Wrapper' as object_type
FROM pg_views
WHERE schemaname = 'public'
  AND viewname LIKE 'secure_owner_%_metrics'
ORDER BY matviewname;

-- Check permissions on materialized views
SELECT 
  t.schemaname,
  t.tablename,
  r.rolname,
  p.privilege_type
FROM information_schema.table_privileges p
JOIN pg_tables t ON t.tablename = p.table_name AND t.schemaname = p.table_schema
JOIN pg_roles r ON r.rolname = p.grantee
WHERE t.schemaname = 'public' 
  AND t.tablename LIKE 'owner_%_metrics'
ORDER BY t.tablename, r.rolname;

-- Summary
SELECT 'Materialized views security improved - use secure_* views for owner-only access' as status;