-- Complete Owner Dashboard Fix
-- This addresses both database issues and prepares data for the frontend

-- =============================================================================
-- 1. Ensure system_health_metrics table exists and has proper structure
-- =============================================================================

-- Check if system_health_metrics table exists, if not create it
CREATE TABLE IF NOT EXISTS public.system_health_metrics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    cpu_usage numeric(5,2) DEFAULT 0,
    memory_usage numeric(5,2) DEFAULT 0,
    disk_usage numeric(5,2) DEFAULT 0,
    active_connections integer DEFAULT 0,
    response_time integer DEFAULT 0,
    uptime numeric(5,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS if not already enabled
ALTER TABLE public.system_health_metrics ENABLE ROW LEVEL SECURITY;

-- Create or update RLS policy for system_health_metrics
DROP POLICY IF EXISTS "owner_only_system_health_metrics" ON public.system_health_metrics;
CREATE POLICY "owner_only_system_health_metrics" ON public.system_health_metrics
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (select auth.uid()) 
            AND profiles.role = 'owner'
        )
    );

-- =============================================================================
-- 2. Create owner dashboard metric tables
-- =============================================================================

-- Create owner_school_growth_metrics table
CREATE TABLE IF NOT EXISTS public.owner_school_growth_metrics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    month_year date NOT NULL,
    total_schools integer DEFAULT 0,
    new_schools integer DEFAULT 0,
    active_schools integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(month_year)
);

-- Create owner_user_growth_metrics table
CREATE TABLE IF NOT EXISTS public.owner_user_growth_metrics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    month_year date NOT NULL,
    total_users integer DEFAULT 0,
    new_users integer DEFAULT 0,
    active_users integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(month_year)
);

-- Create owner_revenue_trend_metrics table
CREATE TABLE IF NOT EXISTS public.owner_revenue_trend_metrics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    month_year date NOT NULL,
    total_revenue numeric(12,2) DEFAULT 0,
    new_revenue numeric(12,2) DEFAULT 0,
    recurring_revenue numeric(12,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    UNIQUE(month_year)
);

-- =============================================================================
-- 3. Enable RLS and create policies for all owner dashboard tables
-- =============================================================================

-- Enable RLS on all owner dashboard tables
ALTER TABLE public.owner_school_growth_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_user_growth_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_revenue_trend_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for owner_school_growth_metrics
DROP POLICY IF EXISTS "Owners can access school growth metrics" ON public.owner_school_growth_metrics;
CREATE POLICY "Owners can access school growth metrics" ON public.owner_school_growth_metrics
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (select auth.uid()) 
            AND profiles.role = 'owner'
        )
    );

-- Create RLS policies for owner_user_growth_metrics
DROP POLICY IF EXISTS "Owners can access user growth metrics" ON public.owner_user_growth_metrics;
CREATE POLICY "Owners can access user growth metrics" ON public.owner_user_growth_metrics
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (select auth.uid()) 
            AND profiles.role = 'owner'
        )
    );

-- Create RLS policies for owner_revenue_trend_metrics
DROP POLICY IF EXISTS "Owners can access revenue metrics" ON public.owner_revenue_trend_metrics;
CREATE POLICY "Owners can access revenue metrics" ON public.owner_revenue_trend_metrics
    FOR ALL TO authenticated USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = (select auth.uid()) 
            AND profiles.role = 'owner'
        )
    );

-- =============================================================================
-- 4. Insert sample data for testing (only if tables are empty)
-- =============================================================================

-- Insert sample system health data
INSERT INTO public.system_health_metrics (cpu_usage, memory_usage, disk_usage, active_connections, response_time, uptime)
SELECT 45.2, 67.8, 34.1, 156, 245, 99.9
WHERE NOT EXISTS (SELECT 1 FROM public.system_health_metrics LIMIT 1);

-- Insert sample school growth data for the last 12 months
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
WHERE NOT EXISTS (SELECT 1 FROM public.owner_school_growth_metrics LIMIT 1);

-- Insert sample user growth data for the last 12 months
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
WHERE NOT EXISTS (SELECT 1 FROM public.owner_user_growth_metrics LIMIT 1);

-- Insert sample revenue data for the last 12 months
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
WHERE NOT EXISTS (SELECT 1 FROM public.owner_revenue_trend_metrics LIMIT 1);

-- =============================================================================
-- 5. Create indexes for better performance
-- =============================================================================

-- Create indexes on date columns for better query performance
CREATE INDEX IF NOT EXISTS idx_owner_school_growth_month_year ON public.owner_school_growth_metrics(month_year);
CREATE INDEX IF NOT EXISTS idx_owner_user_growth_month_year ON public.owner_user_growth_metrics(month_year);
CREATE INDEX IF NOT EXISTS idx_owner_revenue_trend_month_year ON public.owner_revenue_trend_metrics(month_year);
CREATE INDEX IF NOT EXISTS idx_system_health_created_at ON public.system_health_metrics(created_at);

-- =============================================================================
-- 6. Verification and summary
-- =============================================================================

SELECT 'Owner Dashboard Setup Complete!' as status;

-- Show table counts
SELECT 
    'Tables Created and Data Populated:' as summary,
    (SELECT COUNT(*) FROM public.owner_school_growth_metrics) as school_metrics,
    (SELECT COUNT(*) FROM public.owner_user_growth_metrics) as user_metrics,
    (SELECT COUNT(*) FROM public.owner_revenue_trend_metrics) as revenue_metrics,
    (SELECT COUNT(*) FROM public.system_health_metrics) as health_metrics;

-- Show sample data from each table
SELECT 'Sample School Growth Data:' as info;
SELECT month_year, total_schools, new_schools, active_schools 
FROM public.owner_school_growth_metrics 
ORDER BY month_year DESC 
LIMIT 3;

SELECT 'Sample User Growth Data:' as info;
SELECT month_year, total_users, new_users, active_users 
FROM public.owner_user_growth_metrics 
ORDER BY month_year DESC 
LIMIT 3;

SELECT 'Sample Revenue Data:' as info;
SELECT month_year, total_revenue, new_revenue, recurring_revenue 
FROM public.owner_revenue_trend_metrics 
ORDER BY month_year DESC 
LIMIT 3;

SELECT 'System Health Data:' as info;
SELECT cpu_usage, memory_usage, disk_usage, active_connections, response_time, uptime, created_at
FROM public.system_health_metrics 
ORDER BY created_at DESC 
LIMIT 1;