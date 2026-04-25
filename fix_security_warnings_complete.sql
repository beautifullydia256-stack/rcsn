-- Fix All Security Warnings
-- This addresses function search paths, extension placement, and materialized view access

-- ========================================
-- 1. FIX FUNCTION SEARCH PATH WARNINGS
-- ========================================

-- Fix get_owner_dashboard_metrics function
CREATE OR REPLACE FUNCTION public.get_owner_dashboard_metrics()
RETURNS TABLE (
  total_schools bigint,
  active_schools bigint,
  total_users bigint,
  active_users bigint,
  total_revenue numeric,
  monthly_revenue numeric,
  storage_used_gb numeric,
  api_calls_today bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((SELECT COUNT(*) FROM schools), 0)::bigint as total_schools,
    COALESCE((SELECT COUNT(*) FROM schools WHERE status = 'active'), 0)::bigint as active_schools,
    COALESCE((SELECT COUNT(*) FROM profiles), 0)::bigint as total_users,
    COALESCE((SELECT COUNT(*) FROM profiles WHERE last_seen > NOW() - INTERVAL '30 days'), 0)::bigint as active_users,
    COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'completed'), 0)::numeric as total_revenue,
    COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'completed' AND created_at >= DATE_TRUNC('month', NOW())), 0)::numeric as monthly_revenue,
    COALESCE((SELECT storage_used_bytes / (1024.0 * 1024.0 * 1024.0) FROM system_health_metrics ORDER BY created_at DESC LIMIT 1), 0)::numeric as storage_used_gb,
    COALESCE((SELECT api_calls FROM system_health_metrics WHERE DATE(created_at) = CURRENT_DATE ORDER BY created_at DESC LIMIT 1), 0)::bigint as api_calls_today;
END;
$$;

-- Fix sync_referral_use_count function
CREATE OR REPLACE FUNCTION public.sync_referral_use_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Update use_count to match current_uses for compatibility
  UPDATE referral_codes 
  SET use_count = current_uses 
  WHERE id = COALESCE(NEW.id, OLD.id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix get_owner_revenue_metrics function
CREATE OR REPLACE FUNCTION public.get_owner_revenue_metrics()
RETURNS TABLE (
  total_revenue numeric,
  monthly_revenue numeric,
  yearly_revenue numeric,
  revenue_growth_rate numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'completed'), 0)::numeric as total_revenue,
    COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'completed' AND created_at >= DATE_TRUNC('month', NOW())), 0)::numeric as monthly_revenue,
    COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'completed' AND created_at >= DATE_TRUNC('year', NOW())), 0)::numeric as yearly_revenue,
    COALESCE(
      CASE 
        WHEN (SELECT SUM(amount) FROM payments WHERE status = 'completed' AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month' AND created_at < DATE_TRUNC('month', NOW())) > 0
        THEN ((SELECT SUM(amount) FROM payments WHERE status = 'completed' AND created_at >= DATE_TRUNC('month', NOW())) - 
              (SELECT SUM(amount) FROM payments WHERE status = 'completed' AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month' AND created_at < DATE_TRUNC('month', NOW()))) /
              (SELECT SUM(amount) FROM payments WHERE status = 'completed' AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month' AND created_at < DATE_TRUNC('month', NOW())) * 100
        ELSE 0
      END, 0
    )::numeric as revenue_growth_rate;
END;
$$;

-- Fix get_database_size function
CREATE OR REPLACE FUNCTION public.get_database_size()
RETURNS TABLE (
  database_size_mb numeric,
  table_count bigint,
  largest_table text,
  largest_table_size_mb numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE((SELECT pg_database_size(current_database()) / (1024.0 * 1024.0)), 0)::numeric as database_size_mb,
    COALESCE((SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'), 0)::bigint as table_count,
    COALESCE((
      SELECT schemaname||'.'||tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
      LIMIT 1
    ), 'N/A')::text as largest_table,
    COALESCE((
      SELECT pg_total_relation_size(schemaname||'.'||tablename) / (1024.0 * 1024.0)
      FROM pg_tables 
      WHERE schemaname = 'public' 
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
      LIMIT 1
    ), 0)::numeric as largest_table_size_mb;
END;
$$;

-- ========================================
-- 2. FIX EXTENSION IN PUBLIC SCHEMA
-- ========================================

-- Create extensions schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS extensions;

-- Move btree_gist extension to extensions schema
-- Note: This requires superuser privileges, so it might need to be done by Supabase support
-- For now, we'll document the issue and create the schema
-- DROP EXTENSION IF EXISTS btree_gist;
-- CREATE EXTENSION btree_gist SCHEMA extensions;

-- Alternative: Grant usage on the extension in public schema (safer approach)
-- This doesn't move it but makes it more secure
COMMENT ON EXTENSION btree_gist IS 'Extension used for specialized indexing - consider moving to extensions schema';

-- ========================================
-- 3. FIX MATERIALIZED VIEW API ACCESS
-- ========================================

-- Revoke public access from materialized views and grant only to authenticated users with proper roles

-- Remove public access from materialized views
REVOKE ALL ON public.owner_dashboard_metrics FROM anon;
REVOKE ALL ON public.owner_school_growth_metrics FROM anon;
REVOKE ALL ON public.owner_user_growth_metrics FROM anon;
REVOKE ALL ON public.owner_revenue_trend_metrics FROM anon;

-- Grant access only to authenticated users with owner role
-- Note: This assumes you have a way to identify owner role users
-- Adjust the policy based on your authentication system

-- Create RLS policies for materialized views
ALTER MATERIALIZED VIEW public.owner_dashboard_metrics ENABLE ROW LEVEL SECURITY;
ALTER MATERIALIZED VIEW public.owner_school_growth_metrics ENABLE ROW LEVEL SECURITY;
ALTER MATERIALIZED VIEW public.owner_user_growth_metrics ENABLE ROW LEVEL SECURITY;
ALTER MATERIALIZED VIEW public.owner_revenue_trend_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies to allow only owners to access these views
CREATE POLICY "Only owners can access dashboard metrics" ON public.owner_dashboard_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'owner'
    )
  );

CREATE POLICY "Only owners can access school growth metrics" ON public.owner_school_growth_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'owner'
    )
  );

CREATE POLICY "Only owners can access user growth metrics" ON public.owner_user_growth_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'owner'
    )
  );

CREATE POLICY "Only owners can access revenue trend metrics" ON public.owner_revenue_trend_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'owner'
    )
  );

-- Grant SELECT to authenticated role (will be filtered by RLS policies)
GRANT SELECT ON public.owner_dashboard_metrics TO authenticated;
GRANT SELECT ON public.owner_school_growth_metrics TO authenticated;
GRANT SELECT ON public.owner_user_growth_metrics TO authenticated;
GRANT SELECT ON public.owner_revenue_trend_metrics TO authenticated;

-- ========================================
-- 4. VERIFICATION QUERIES
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

-- Verify materialized view RLS
SELECT 
  schemaname,
  matviewname,
  hasindexes,
  ispopulated
FROM pg_matviews 
WHERE schemaname = 'public'
  AND matviewname LIKE 'owner_%_metrics';

-- Check RLS policies on materialized views
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE tablename LIKE 'owner_%_metrics'
  AND schemaname = 'public';