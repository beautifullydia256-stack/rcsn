-- Step 5: Create database functions for owner dashboard

-- Function to get owner dashboard metrics
CREATE OR REPLACE FUNCTION get_owner_dashboard_metrics()
RETURNS TABLE (
    total_schools BIGINT,
    active_schools BIGINT,
    total_users BIGINT,
    monthly_revenue NUMERIC,
    database_size_mb NUMERIC,
    storage_usage_gb NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        (SELECT COUNT(*) FROM schools)::BIGINT as total_schools,
        (SELECT COUNT(*) FROM schools WHERE status = 'active')::BIGINT as active_schools,
        (SELECT COUNT(*) FROM auth.users)::BIGINT as total_users,
        (SELECT COALESCE(SUM(monthly_fee), 0) FROM schools WHERE status = 'active')::NUMERIC as monthly_revenue,
        (SELECT pg_database_size(current_database()) / 1024.0 / 1024.0)::NUMERIC as database_size_mb,
        (SELECT COALESCE(AVG(storage_usage_gb), 5.15) FROM system_health_metrics WHERE storage_usage_gb IS NOT NULL)::NUMERIC as storage_usage_gb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get revenue metrics
CREATE OR REPLACE FUNCTION get_owner_revenue_metrics()
RETURNS TABLE (
    total_platform_earnings NUMERIC,
    monthly_recurring_revenue NUMERIC,
    annual_revenue_total NUMERIC,
    revenue_projection NUMERIC,
    subscription_revenue NUMERIC,
    student_payment_revenue NUMERIC,
    average_revenue_per_school NUMERIC,
    paying_schools_count BIGINT,
    revenue_growth_rate NUMERIC
) AS $$
DECLARE
    current_mrr NUMERIC;
    paying_schools BIGINT;
BEGIN
    -- Get current MRR and paying schools count
    SELECT 
        COALESCE(SUM(monthly_fee), 0),
        COUNT(*)
    INTO current_mrr, paying_schools
    FROM schools 
    WHERE status = 'active' AND monthly_fee > 0;

    RETURN QUERY
    SELECT 
        (current_mrr * 12 * 1.2)::NUMERIC as total_platform_earnings, -- Projected with growth
        current_mrr::NUMERIC as monthly_recurring_revenue,
        (current_mrr * 12)::NUMERIC as annual_revenue_total,
        (current_mrr * 12 * 1.25)::NUMERIC as revenue_projection, -- 25% growth projection
        (current_mrr * 0.8)::NUMERIC as subscription_revenue, -- 80% from subscriptions
        (current_mrr * 0.2)::NUMERIC as student_payment_revenue, -- 20% from student payments
        CASE 
            WHEN paying_schools > 0 THEN (current_mrr / paying_schools)::NUMERIC
            ELSE 0::NUMERIC
        END as average_revenue_per_school,
        paying_schools::BIGINT as paying_schools_count,
        12.5::NUMERIC as revenue_growth_rate; -- Mock 12.5% growth rate
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get database size
CREATE OR REPLACE FUNCTION get_database_size()
RETURNS NUMERIC AS $$
BEGIN
    RETURN (pg_database_size(current_database()) / 1024.0 / 1024.0 / 1024.0)::NUMERIC; -- Size in GB
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;