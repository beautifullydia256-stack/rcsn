-- Refresh all materialized views for owner dashboard
-- Run this after the migrations to populate the views with data

-- Refresh main dashboard metrics
REFRESH MATERIALIZED VIEW public.owner_dashboard_metrics;

-- Refresh growth metrics  
REFRESH MATERIALIZED VIEW public.owner_school_growth_metrics;
REFRESH MATERIALIZED VIEW public.owner_user_growth_metrics;
REFRESH MATERIALIZED VIEW public.owner_revenue_trend_metrics;

-- Verify the views have data
SELECT 'owner_dashboard_metrics' as view_name, COUNT(*) as row_count FROM public.owner_dashboard_metrics
UNION ALL
SELECT 'owner_school_growth_metrics' as view_name, COUNT(*) as row_count FROM public.owner_school_growth_metrics  
UNION ALL
SELECT 'owner_user_growth_metrics' as view_name, COUNT(*) as row_count FROM public.owner_user_growth_metrics
UNION ALL
SELECT 'owner_revenue_trend_metrics' as view_name, COUNT(*) as row_count FROM public.owner_revenue_trend_metrics;

-- Test the RPC function
SELECT * FROM public.get_owner_dashboard_metrics_realtime();