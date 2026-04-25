-- Step 3: Remove permissions from materialized views to fix the warnings
-- This will stop the "Materialized View in API" warnings

REVOKE ALL ON public.owner_dashboard_metrics FROM anon;
REVOKE ALL ON public.owner_dashboard_metrics FROM authenticated;

REVOKE ALL ON public.owner_school_growth_metrics FROM anon;
REVOKE ALL ON public.owner_school_growth_metrics FROM authenticated;

REVOKE ALL ON public.owner_user_growth_metrics FROM anon;
REVOKE ALL ON public.owner_user_growth_metrics FROM authenticated;

REVOKE ALL ON public.owner_revenue_trend_metrics FROM anon;
REVOKE ALL ON public.owner_revenue_trend_metrics FROM authenticated;