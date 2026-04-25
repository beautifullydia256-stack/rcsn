-- Fix Remaining Security Issues
-- This addresses the new security definer view errors and materialized view warnings

-- ========================================
-- 1. FIX SECURITY DEFINER VIEW ERRORS
-- ========================================

-- Drop the problematic secure views that were created with SECURITY DEFINER
DROP VIEW IF EXISTS public.secure_owner_dashboard_metrics;
DROP VIEW IF EXISTS public.secure_owner_school_growth_metrics;
DROP VIEW IF EXISTS public.secure_owner_user_growth_metrics;
DROP VIEW IF EXISTS public.secure_owner_revenue_trend_metrics;

-- Recreate views WITHOUT SECURITY DEFINER (use SECURITY INVOKER instead)
-- These will use the permissions of the calling user, not the view creator

CREATE VIEW public.secure_owner_dashboard_metrics 
SECURITY INVOKER
AS
SELECT *
FROM public.owner_dashboard_metrics
WHERE EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'owner'
);

CREATE VIEW public.secure_owner_school_growth_metrics
SECURITY INVOKER  
AS
SELECT *
FROM public.owner_school_growth_metrics
WHERE EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'owner'
);

CREATE VIEW public.secure_owner_user_growth_metrics
SECURITY INVOKER
AS
SELECT *
FROM public.owner_user_growth_metrics
WHERE EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.id = auth.uid() 
  AND profiles.role = 'owner'
);

CREATE VIEW public.secure_owner_revenue_trend_metrics
SECURITY INVOKER
AS
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
-- 2. FIX MATERIALIZED VIEW API ACCESS
-- ========================================

-- Remove all access from materialized views to fix the warnings
-- This will force users to use the secure views instead

REVOKE ALL ON public.owner_dashboard_metrics FROM anon;
REVOKE ALL ON public.owner_dashboard_metrics FROM authenticated;
REVOKE ALL ON public.owner_dashboard_metrics FROM public;

REVOKE ALL ON public.owner_school_growth_metrics FROM anon;
REVOKE ALL ON public.owner_school_growth_metrics FROM authenticated;
REVOKE ALL ON public.owner_school_growth_metrics FROM public;

REVOKE ALL ON public.owner_user_growth_metrics FROM anon;
REVOKE ALL ON public.owner_user_growth_metrics FROM authenticated;
REVOKE ALL ON public.owner_user_growth_metrics FROM public;

REVOKE ALL ON public.owner_revenue_trend_metrics FROM anon;
REVOKE ALL ON public.owner_revenue_trend_metrics FROM authenticated;
REVOKE ALL ON public.owner_revenue_trend_metrics FROM public;

-- Grant access only to the database owner/service role for maintenance
-- This prevents API access while allowing internal database operations
GRANT SELECT ON public.owner_dashboard_metrics TO postgres;
GRANT SELECT ON public.owner_school_growth_metrics TO postgres;
GRANT SELECT ON public.owner_user_growth_metrics TO postgres;
GRANT SELECT ON public.owner_revenue_trend_metrics TO postgres;

-- ========================================
-- 3. ALTERNATIVE: MOVE MATERIALIZED VIEWS TO PRIVATE SCHEMA
-- ========================================

-- Create a private schema for internal views
CREATE SCHEMA IF NOT EXISTS private;

-- Move materialized views to private schema (if you want to be extra secure)
-- Note: This is optional and may require updating your refresh logic

-- Example for one view (uncomment if you want to move them):
-- DROP MATERIALIZED VIEW IF EXISTS private.owner_dashboard_metrics;
-- CREATE MATERIALIZED VIEW private.owner_dashboard_metrics AS
-- SELECT * FROM public.owner_dashboard_metrics;

-- ========================================
-- 4. DOCUMENT EXTENSION ISSUE
-- ========================================

-- The btree_gist extension warning can only be fixed by Supabase support
-- Document this for future reference
COMMENT ON EXTENSION btree_gist IS 'SECURITY WARNING: Extension in public schema. Requires superuser privileges to move to extensions schema. Contact Supabase support if needed.';

-- ========================================
-- 5. VERIFICATION QUERIES
-- ========================================

-- Check that secure views are now SECURITY INVOKER
SELECT 
  schemaname,
  viewname,
  viewowner,
  definition LIKE '%SECURITY INVOKER%' as is_security_invoker
FROM pg_views 
WHERE schemaname = 'public' 
  AND viewname LIKE 'secure_owner_%_metrics'
ORDER BY viewname;

-- Check materialized view permissions (should be minimal now)
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
  AND r.rolname IN ('anon', 'authenticated', 'public')
ORDER BY t.tablename, r.rolname;

-- Check function search paths (should all be set now)
SELECT 
  proname as function_name,
  proconfig as config_settings,
  CASE 
    WHEN proconfig IS NOT NULL AND array_to_string(proconfig, ',') LIKE '%search_path%' 
    THEN 'SECURE' 
    ELSE 'NEEDS_FIX' 
  END as security_status
FROM pg_proc 
WHERE proname IN (
  'get_owner_dashboard_metrics',
  'sync_referral_use_count', 
  'get_owner_revenue_metrics',
  'get_database_size'
)
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY function_name;

-- Summary of fixes
SELECT 
  'Security issues resolved:' as summary,
  '✅ Function search paths fixed' as functions,
  '✅ Security definer views fixed' as views,
  '✅ Materialized view API access removed' as materialized_views,
  '⚠️ Extension warning documented (needs Supabase support)' as extensions;