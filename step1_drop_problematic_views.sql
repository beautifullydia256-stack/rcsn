-- Step 1: Drop the problematic secure views that are causing security definer errors
DROP VIEW IF EXISTS public.secure_owner_dashboard_metrics;
DROP VIEW IF EXISTS public.secure_owner_school_growth_metrics;
DROP VIEW IF EXISTS public.secure_owner_user_growth_metrics;
DROP VIEW IF EXISTS public.secure_owner_revenue_trend_metrics;