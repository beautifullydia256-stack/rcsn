-- Fix Owner Dashboard Functionality Issues
-- Address the 404 and 403 errors in the owner dashboard

-- =============================================================================
-- 1. Check if owner dashboard tables exist
-- =============================================================================
SELECT 'Checking Owner Dashboard Tables' as status;

-- Check if the owner dashboard metric tables exist
SELECT 
    table_name,
    CASE 
        WHEN table_name IS NOT NULL THEN 'EXISTS'
        ELSE 'MISSING'
    END as status
FROM information_schema.tables 
WHERE table_schema = 'public' 
    AND table_name IN (
        'owner_school_growth_metrics',
        'owner_user_growth_metrics', 
        'owner_revenue_trend_metrics',
        'system_health_metrics'
    )
ORDER BY table_name;

-- =============================================================================
-- 2. Create missing owner dashboard tables if they don't exist
-- =============================================================================

-- Create owner_school_growth_metrics table
CREATE TABLE IF NOT EXISTS public.owner_school_growth_metrics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    month_year date NOT NULL,
    total_schools integer DEFAULT 0,
    new_schools integer DEFAULT 0,
    active_schools integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create owner_user_growth_metrics table
CREATE TABLE IF NOT EXISTS public.owner_user_growth_metrics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    month_year date NOT NULL,
    total_users integer DEFAULT 0,
    new_users integer DEFAULT 0,
    active_users integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- Create owner_revenue_trend_metrics table
CREATE TABLE IF NOT EXISTS public.owner_revenue_trend_metrics (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    month_year date NOT NULL,
    total_revenue numeric(10,2) DEFAULT 0,
    new_revenue numeric(10,2) DEFAULT 0,
    recurring_revenue numeric(10,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- =============================================================================
-- 3. Enable RLS and create policies for owner dashboard tables
-- =============================================================================

-- Enable RLS on owner dashboard tables
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
-- 4. Insert sample data for testing (if tables are empty)
-- =============================================================================

-- Insert sample school growth data
INSERT INTO public.owner_school_growth_metrics (month_year, total_schools, new_schools, active_schools)
SELECT 
    date_trunc('month', generate_series(
        date_trunc('month', current_date - interval '11 months'),
        date_trunc('month', current_date),
        interval '1 month'
    )) as month_year,
    (random() * 50 + 10)::integer as total_schools,
    (random() * 5 + 1)::integer as new_schools,
    (random() * 45 + 8)::integer as active_schools
WHERE NOT EXISTS (SELECT 1 FROM public.owner_school_growth_metrics LIMIT 1);

-- Insert sample user growth data
INSERT INTO public.owner_user_growth_metrics (month_year, total_users, new_users, active_users)
SELECT 
    date_trunc('month', generate_series(
        date_trunc('month', current_date - interval '11 months'),
        date_trunc('month', current_date),
        interval '1 month'
    )) as month_year,
    (random() * 1000 + 100)::integer as total_users,
    (random() * 100 + 10)::integer as new_users,
    (random() * 800 + 80)::integer as active_users
WHERE NOT EXISTS (SELECT 1 FROM public.owner_user_growth_metrics LIMIT 1);

-- Insert sample revenue data
INSERT INTO public.owner_revenue_trend_metrics (month_year, total_revenue, new_revenue, recurring_revenue)
SELECT 
    date_trunc('month', generate_series(
        date_trunc('month', current_date - interval '11 months'),
        date_trunc('month', current_date),
        interval '1 month'
    )) as month_year,
    (random() * 10000 + 1000)::numeric(10,2) as total_revenue,
    (random() * 2000 + 200)::numeric(10,2) as new_revenue,
    (random() * 8000 + 800)::numeric(10,2) as recurring_revenue
WHERE NOT EXISTS (SELECT 1 FROM public.owner_revenue_trend_metrics LIMIT 1);

-- =============================================================================
-- 5. Verify the setup
-- =============================================================================
SELECT 'Owner Dashboard Setup Complete' as status;

-- Check table counts
SELECT 
    'owner_school_growth_metrics' as table_name,
    COUNT(*) as record_count
FROM public.owner_school_growth_metrics
UNION ALL
SELECT 
    'owner_user_growth_metrics' as table_name,
    COUNT(*) as record_count
FROM public.owner_user_growth_metrics
UNION ALL
SELECT 
    'owner_revenue_trend_metrics' as table_name,
    COUNT(*) as record_count
FROM public.owner_revenue_trend_metrics
UNION ALL
SELECT 
    'system_health_metrics' as table_name,
    COUNT(*) as record_count
FROM public.system_health_metrics;

-- Check RLS policies
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename LIKE 'owner_%_metrics'
ORDER BY tablename, policyname;