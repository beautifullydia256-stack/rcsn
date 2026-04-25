-- Add Sample Data to Owner Dashboard Tables
-- Skip table creation since they already exist

-- =============================================================================
-- Insert sample data for the last 12 months (only if tables are empty)
-- =============================================================================

-- Insert sample school growth data
INSERT INTO public.owner_school_growth_metrics (month_year, total_schools, new_schools, active_schools)
SELECT 
    date_trunc('month', generate_series(
        date_trunc('month', current_date - interval '11 months'),
        date_trunc('month', current_date),
        interval '1 month'
    )) as month_year,
    (row_number() OVER () * 3 + 10)::integer as total_schools,
    (random() * 5 + 1)::integer as new_schools,
    (row_number() OVER () * 3 + 8)::integer as active_schools
ON CONFLICT (month_year) DO NOTHING;

-- Insert sample user growth data
INSERT INTO public.owner_user_growth_metrics (month_year, total_users, new_users, active_users)
SELECT 
    date_trunc('month', generate_series(
        date_trunc('month', current_date - interval '11 months'),
        date_trunc('month', current_date),
        interval '1 month'
    )) as month_year,
    (row_number() OVER () * 50 + 100)::integer as total_users,
    (random() * 100 + 20)::integer as new_users,
    (row_number() OVER () * 40 + 80)::integer as active_users
ON CONFLICT (month_year) DO NOTHING;

-- Insert sample revenue data
INSERT INTO public.owner_revenue_trend_metrics (month_year, total_revenue, new_revenue, recurring_revenue)
SELECT 
    date_trunc('month', generate_series(
        date_trunc('month', current_date - interval '11 months'),
        date_trunc('month', current_date),
        interval '1 month'
    )) as month_year,
    (row_number() OVER () * 1000 + 5000)::numeric(12,2) as total_revenue,
    (random() * 2000 + 500)::numeric(12,2) as new_revenue,
    (row_number() OVER () * 800 + 4000)::numeric(12,2) as recurring_revenue
ON CONFLICT (month_year) DO NOTHING;

-- =============================================================================
-- Verification
-- =============================================================================

SELECT 'Sample Data Added Successfully!' as status;

-- Show data counts
SELECT 
    'Data Summary:' as info,
    (SELECT COUNT(*) FROM public.owner_school_growth_metrics) as school_metrics,
    (SELECT COUNT(*) FROM public.owner_user_growth_metrics) as user_metrics,
    (SELECT COUNT(*) FROM public.owner_revenue_trend_metrics) as revenue_metrics;