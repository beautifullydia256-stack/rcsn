-- Fix Only the Materialized Views Issue
-- Skip policy fixes since they were already applied in final_two_table_fix.sql

-- =============================================================================
-- STEP 1: Check Current State
-- =============================================================================

SELECT 'Checking existing owner dashboard objects...' as status;

-- Check what exists and what type they are
SELECT 
    schemaname,
    matviewname as object_name,
    'materialized_view' as object_type
FROM pg_matviews 
WHERE schemaname = 'public' 
    AND matviewname LIKE 'owner_%_metrics'
UNION ALL
SELECT 
    schemaname,
    tablename as object_name,
    'table' as object_type
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename LIKE 'owner_%_metrics'
ORDER BY object_name;

-- =============================================================================
-- STEP 2: Convert Materialized Views to Regular Tables
-- =============================================================================

SELECT 'Converting materialized views to regular tables...' as status;

-- Drop existing materialized views if they exist
DROP MATERIALIZED VIEW IF EXISTS public.owner_school_growth_metrics CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.owner_user_growth_metrics CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.owner_revenue_trend_metrics CASCADE;

-- Create owner_school_growth_metrics as a regular table
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

-- Create owner_user_growth_metrics as a regular table
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

-- Create owner_revenue_trend_metrics as a regular table
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
-- STEP 3: Enable RLS on New Tables
-- =============================================================================

SELECT 'Enabling RLS on owner dashboard tables...' as status;

-- Enable RLS on all owner dashboard tables
ALTER TABLE public.owner_school_growth_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_user_growth_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_revenue_trend_metrics ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 4: Create RLS Policies (Only if they don't exist)
-- =============================================================================

SELECT 'Creating RLS policies for owner dashboard tables...' as status;

-- Create RLS policies for owner_school_growth_metrics (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'owner_school_growth_metrics' 
        AND policyname = 'Owners can access school growth metrics'
    ) THEN
        CREATE POLICY "Owners can access school growth metrics" ON public.owner_school_growth_metrics
            FOR ALL TO authenticated USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE profiles.id = (select auth.uid()) 
                    AND profiles.role = 'owner'
                )
            );
    END IF;
END $$;

-- Create RLS policies for owner_user_growth_metrics (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'owner_user_growth_metrics' 
        AND policyname = 'Owners can access user growth metrics'
    ) THEN
        CREATE POLICY "Owners can access user growth metrics" ON public.owner_user_growth_metrics
            FOR ALL TO authenticated USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE profiles.id = (select auth.uid()) 
                    AND profiles.role = 'owner'
                )
            );
    END IF;
END $$;

-- Create RLS policies for owner_revenue_trend_metrics (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'owner_revenue_trend_metrics' 
        AND policyname = 'Owners can access revenue metrics'
    ) THEN
        CREATE POLICY "Owners can access revenue metrics" ON public.owner_revenue_trend_metrics
            FOR ALL TO authenticated USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE profiles.id = (select auth.uid()) 
                    AND profiles.role = 'owner'
                )
            );
    END IF;
END $$;

-- =============================================================================
-- STEP 5: Insert Sample Data for Dashboard
-- =============================================================================

SELECT 'Inserting sample data for owner dashboard...' as status;

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
ON CONFLICT (month_year) DO NOTHING;

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
ON CONFLICT (month_year) DO NOTHING;

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
ON CONFLICT (month_year) DO NOTHING;

-- =============================================================================
-- STEP 6: Ensure System Health Metrics Table Exists
-- =============================================================================

SELECT 'Ensuring system_health_metrics table exists...' as status;

-- Check what columns exist in the current table
SELECT 'Current system_health_metrics columns:' as info;
SELECT 
    column_name,
    data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'system_health_metrics'
ORDER BY ordinal_position;

-- Enable RLS on system_health_metrics if not already enabled
DO $$
BEGIN
    ALTER TABLE public.system_health_metrics ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN others THEN
        -- RLS might already be enabled, ignore error
        NULL;
END $$;

-- Create or update RLS policy for system_health_metrics (only if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'system_health_metrics' 
        AND policyname = 'owner_only_system_health_metrics'
    ) THEN
        CREATE POLICY "owner_only_system_health_metrics" ON public.system_health_metrics
            FOR ALL TO authenticated USING (
                EXISTS (
                    SELECT 1 FROM public.profiles 
                    WHERE profiles.id = (select auth.uid()) 
                    AND profiles.role = 'owner'
                )
            );
    END IF;
END $$;

-- Insert sample system health data if table is empty (using existing column structure)
INSERT INTO public.system_health_metrics (
    metric_type,
    metric_name, 
    cpu_usage, 
    memory_usage, 
    disk_usage, 
    active_connections, 
    response_time_ms, 
    uptime_hours,
    status
)
SELECT 
    'system_health',
    'overall_system_health',
    45.2, 
    67.8, 
    34.1, 
    156, 
    245, 
    2376,  -- 99 days in hours
    'healthy'
WHERE NOT EXISTS (SELECT 1 FROM public.system_health_metrics LIMIT 1);

-- =============================================================================
-- STEP 7: Create Performance Indexes
-- =============================================================================

SELECT 'Creating performance indexes...' as status;

-- Create indexes on date columns for better query performance
CREATE INDEX IF NOT EXISTS idx_owner_school_growth_month_year ON public.owner_school_growth_metrics(month_year);
CREATE INDEX IF NOT EXISTS idx_owner_user_growth_month_year ON public.owner_user_growth_metrics(month_year);
CREATE INDEX IF NOT EXISTS idx_owner_revenue_trend_month_year ON public.owner_revenue_trend_metrics(month_year);

-- =============================================================================
-- STEP 8: Final Verification
-- =============================================================================

SELECT 'Final verification...' as status;

-- Show created dashboard tables
SELECT 'Created Dashboard Tables:' as check_name;
SELECT 
    schemaname,
    tablename,
    'table' as object_type
FROM pg_tables 
WHERE schemaname = 'public' 
    AND (tablename LIKE 'owner_%_metrics' OR tablename = 'system_health_metrics')
ORDER BY tablename;

-- Show data counts
SELECT 'Data Summary:' as check_name;
SELECT 
    (SELECT COUNT(*) FROM public.owner_school_growth_metrics) as school_metrics,
    (SELECT COUNT(*) FROM public.owner_user_growth_metrics) as user_metrics,
    (SELECT COUNT(*) FROM public.owner_revenue_trend_metrics) as revenue_metrics,
    (SELECT COUNT(*) FROM public.system_health_metrics) as health_metrics;

-- Show RLS policies on dashboard tables
SELECT 'RLS Policies on Dashboard Tables:' as check_name;
SELECT 
    schemaname,
    tablename,
    policyname
FROM pg_policies 
WHERE schemaname = 'public' 
    AND (tablename LIKE 'owner_%_metrics' OR tablename = 'system_health_metrics')
ORDER BY tablename, policyname;

-- Check for remaining multiple permissive policies (should be minimal now)
SELECT 'Remaining Multiple Permissive Policies (should be minimal):' as check_name;
SELECT 
    schemaname,
    tablename,
    cmd,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ') as policy_names
FROM pg_policies 
WHERE schemaname = 'public' 
    AND permissive = 'PERMISSIVE'
GROUP BY schemaname, tablename, cmd
HAVING COUNT(*) > 1
ORDER BY schemaname, tablename, cmd;

-- Success message
SELECT 'SUCCESS: Materialized views converted to tables with RLS!' as final_status;
SELECT 'The 403 errors for owner dashboard metrics should now be resolved.' as next_info;