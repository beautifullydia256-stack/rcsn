-- Fix Function Search Path Warnings Only
-- This addresses the function security warnings by adding SET search_path

-- ========================================
-- 1. FIX FUNCTION SEARCH PATHS
-- ========================================

-- Fix get_owner_dashboard_metrics function - just add search_path
ALTER FUNCTION public.get_owner_dashboard_metrics() SET search_path = public, pg_temp;

-- Fix sync_referral_use_count function - just add search_path  
ALTER FUNCTION public.sync_referral_use_count() SET search_path = public, pg_temp;

-- Fix get_owner_revenue_metrics function - just add search_path
ALTER FUNCTION public.get_owner_revenue_metrics() SET search_path = public, pg_temp;

-- Fix get_database_size function - just add search_path
ALTER FUNCTION public.get_database_size() SET search_path = public, pg_temp;

-- ========================================
-- 2. VERIFICATION
-- ========================================

-- Verify function security settings
SELECT 
  routine_name,
  routine_type,
  prosecdef as security_definer,
  proconfig as function_config
FROM information_schema.routines r
JOIN pg_proc p ON p.proname = r.routine_name
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'get_owner_dashboard_metrics',
    'sync_referral_use_count', 
    'get_owner_revenue_metrics',
    'get_database_size'
  );

-- Check if search_path is set
SELECT 
  proname as function_name,
  proconfig as config_settings
FROM pg_proc 
WHERE proname IN (
  'get_owner_dashboard_metrics',
  'sync_referral_use_count', 
  'get_owner_revenue_metrics',
  'get_database_size'
)
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');