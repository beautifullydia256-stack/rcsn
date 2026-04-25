-- Fix Security Warnings - Safe Approach
-- Step 1: Check existing functions first, then drop and recreate safely

-- ========================================
-- 1. CHECK EXISTING FUNCTIONS
-- ========================================

-- Check current function signatures
SELECT 
  routine_name,
  routine_type,
  data_type,
  routine_definition LIKE '%SET search_path%' as has_search_path_set
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'get_owner_dashboard_metrics',
    'sync_referral_use_count', 
    'get_owner_revenue_metrics',
    'get_database_size'
  );

-- ========================================
-- 2. SAFELY DROP AND RECREATE FUNCTIONS
-- ========================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.get_owner_dashboard_metrics();
DROP FUNCTION IF EXISTS public.get_owner_revenue_metrics();
DROP FUNCTION IF EXISTS public.get_database_size();

-- Note: sync_referral_use_count is a trigger function, handle separately
DROP TRIGGER IF EXISTS sync_referral_use_count_trigger ON referral_codes;
DROP FUNCTION IF EXISTS public.sync_referral_use_count();

-- ========================================
-- 3. RECREATE FUNCTIONS WITH SECURE SEARCH PATH
-- ========================================

-- Recreate get_owner_dashboard_metrics with secure search path
CREATE OR REPLACE FUNCTION public.get_owner_dashboard_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_schools', COALESCE((SELECT COUNT(*) FROM schools), 0),
    'active_schools', COALESCE((SELECT COUNT(*) FROM schools WHERE status = 'active'), 0),
    'total_users', COALESCE((SELECT COUNT(*) FROM profiles), 0),
    'active_users', COALESCE((SELECT COUNT(*) FROM profiles WHERE last_seen > NOW() - INTERVAL '30 days'), 0),
    'total_revenue', COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'completed'), 0),
    'monthly_revenue', COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'completed' AND created_at >= DATE_TRUNC('month', NOW())), 0),
    'storage_used_gb', COALESCE((SELECT storage_used_bytes / (1024.0 * 1024.0 * 1024.0) FROM system_health_metrics ORDER BY created_at DESC LIMIT 1), 0),
    'api_calls_today', COALESCE((SELECT api_calls FROM system_health_metrics WHERE DATE(created_at) = CURRENT_DATE ORDER BY created_at DESC LIMIT 1), 0)
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Recreate sync_referral_use_count with secure search path
CREATE OR REPLACE FUNCTION public.sync_referral_use_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Update use_count to match current_uses for compatibility
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    UPDATE referral_codes 
    SET use_count = current_uses 
    WHERE id = NEW.id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER sync_referral_use_count_trigger
  AFTER INSERT OR UPDATE OR DELETE ON referral_codes
  FOR EACH ROW
  EXECUTE FUNCTION sync_referral_use_count();

-- Recreate get_owner_revenue_metrics with secure search path
CREATE OR REPLACE FUNCTION public.get_owner_revenue_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result JSON;
  current_month_revenue NUMERIC;
  previous_month_revenue NUMERIC;
  growth_rate NUMERIC;
BEGIN
  -- Calculate current month revenue
  SELECT COALESCE(SUM(amount), 0) INTO current_month_revenue
  FROM payments 
  WHERE status = 'completed' 
    AND created_at >= DATE_TRUNC('month', NOW());
  
  -- Calculate previous month revenue
  SELECT COALESCE(SUM(amount), 0) INTO previous_month_revenue
  FROM payments 
  WHERE status = 'completed' 
    AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month'
    AND created_at < DATE_TRUNC('month', NOW());
  
  -- Calculate growth rate
  IF previous_month_revenue > 0 THEN
    growth_rate := ((current_month_revenue - previous_month_revenue) / previous_month_revenue) * 100;
  ELSE
    growth_rate := 0;
  END IF;

  SELECT json_build_object(
    'total_revenue', COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'completed'), 0),
    'monthly_revenue', current_month_revenue,
    'yearly_revenue', COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'completed' AND created_at >= DATE_TRUNC('year', NOW())), 0),
    'revenue_growth_rate', growth_rate
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Recreate get_database_size with secure search path
CREATE OR REPLACE FUNCTION public.get_database_size()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  result JSON;
  largest_table_info RECORD;
BEGIN
  -- Get largest table info
  SELECT 
    schemaname||'.'||tablename as table_name,
    pg_total_relation_size(schemaname||'.'||tablename) / (1024.0 * 1024.0) as size_mb
  INTO largest_table_info
  FROM pg_tables 
  WHERE schemaname = 'public' 
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
  LIMIT 1;

  SELECT json_build_object(
    'database_size_mb', COALESCE(pg_database_size(current_database()) / (1024.0 * 1024.0), 0),
    'table_count', COALESCE((SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'), 0),
    'largest_table', COALESCE(largest_table_info.table_name, 'N/A'),
    'largest_table_size_mb', COALESCE(largest_table_info.size_mb, 0)
  ) INTO result;
  
  RETURN result;
END;
$$;