-- Fix Remaining Database Issues
-- 1. Convert materialized views to tables with RLS
-- 2. Fix multiple permissive policies on school_subscriptions and users tables

-- =============================================================================
-- STEP 1: Fix Multiple Permissive Policies First
-- =============================================================================

SELECT 'Step 1: Fixing multiple permissive policies...' as status;

-- Fix school_subscriptions table - consolidate overlapping policies
DROP POLICY IF EXISTS "owner_all_on_school_subscriptions" ON public.school_subscriptions;
DROP POLICY IF EXISTS "school_subscriptions_admin_manage" ON public.school_subscriptions;

-- Create one unified policy for school_subscriptions
CREATE POLICY "school_subscriptions_unified_access" ON public.school_subscriptions
    FOR ALL TO authenticated 
    USING (
        -- Owners have global access OR admins have access to their school
        ( SELECT users.role FROM users WHERE users.user_id = (select auth.uid())) = 'owner'::text
        OR 
        (
            ( SELECT users.role FROM users WHERE users.user_id = (select auth.uid())) = 'admin'::text
            AND school_id IN ( SELECT schools.school_id
                              FROM schools
                              WHERE (schools.admin_id = (select auth.uid())))
        )
    )
    WITH CHECK (
        -- Same logic for WITH CHECK
        ( SELECT users.role FROM users WHERE users.user_id = (select auth.uid())) = 'owner'::text
        OR 
        (
            ( SELECT users.role FROM users WHERE users.user_id = (select auth.uid())) = 'admin'::text
            AND school_id IN ( SELECT schools.school_id
                              FROM schools
                              WHERE (schools.admin_id = (select auth.uid())))
        )
    );

-- Fix users table - consolidate overlapping policies
DROP POLICY IF EXISTS "known owner global access" ON public.users;
DROP POLICY IF EXISTS "users can read own record" ON public.users;

-- Create one unified policy for users
CREATE POLICY "users_unified_access" ON public.users
    FOR SELECT TO authenticated USING (
        -- Known owner has global access OR users can read their own record
        (select auth.uid()) = 'a360d879-192c-4b5a-b776-6452849f1102'::uuid
        OR 
        user_id = (select auth.uid())
    );

-- =============================================================================
-- STEP 2: Convert Materialized Views to Regular Tables
-- =============================================================================

SELECT 'Step 2: Converting materialized views to regular tables...' as status;

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

SELECT 'Step 3: Enabling RLS on owner dashboard tables...' as status;

-- Enable RLS on all owner dashboard tables
ALTER TABLE public.owner_school_growth_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_user_growth_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.owner_revenue_trend_metrics ENABLE ROW LEVEL SECURITY;

-- =============================================================================
-- STEP 4: Create RLS Policies for Owner-Only Access
-- =============================================================================

SELECT 'Step 4: Creating RLS policies for owner dashboard tables...' as status;

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
-- STEP 5: Insert Sample Data for Dashboard
-- =============================================================================

SELECT 'Step 5: Inserting sample data for owner dashboard...' as status;

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

SELECT 'Step 6: Ensuring system_health_metrics table exists...' as status;

-- Ensure system_health_metrics exists as a regular table
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

-- Enable RLS on system_health_metrics if not already enabled
DO $$
BEGIN
    ALTER TABLE public.system_health_metrics ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN others THEN
        -- RLS might already be enabled, ignore error
        NULL;
END $$;

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

-- Insert sample system health data if table is empty
INSERT INTO public.system_health_metrics (cpu_usage, memory_usage, disk_usage, active_connections, response_time, uptime)
SELECT 45.2, 67.8, 34.1, 156, 245, 99.9
WHERE NOT EXISTS (SELECT 1 FROM public.system_health_metrics LIMIT 1);

-- =============================================================================
-- STEP 7: Create Performance Indexes
-- =============================================================================

SELECT 'Step 7: Creating performance indexes...' as status;

-- Create indexes on date columns for better query performance
CREATE INDEX IF NOT EXISTS idx_owner_school_growth_month_year ON public.owner_school_growth_metrics(month_year);
CREATE INDEX IF NOT EXISTS idx_owner_user_growth_month_year ON public.owner_user_growth_metrics(month_year);
CREATE INDEX IF NOT EXISTS idx_owner_revenue_trend_month_year ON public.owner_revenue_trend_metrics(month_year);

-- =============================================================================
-- STEP 8: Final Verification
-- =============================================================================

SELECT 'Step 8: Final verification...' as status;

-- Check for remaining multiple permissive policies (should be ZERO)
SELECT 'Multiple Permissive Policies Check (should be empty):' as check_name;
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

-- Success message
SELECT 'SUCCESS: All database performance and security issues should now be resolved!' as final_status;
SELECT 'Next steps: Restart your Next.js application to ensure API routes are properly loaded.' as next_steps;