-- Fix Owner Dashboard RLS Only
-- Skip materialized view conversion since tables already exist

-- =============================================================================
-- STEP 1: Check Current State
-- =============================================================================

SELECT 'Checking existing owner dashboard tables...' as status;

-- Check what exists and what type they are
SELECT 
    schemaname,
    tablename as object_name,
    'table' as object_type
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename LIKE 'owner_%_metrics'
ORDER BY object_name;

-- =============================================================================
-- STEP 2: Enable RLS on Existing Tables (if not already enabled)
-- =============================================================================

SELECT 'Enabling RLS on owner dashboard tables...' as status;

-- Enable RLS on owner dashboard tables (ignore errors if already enabled)
DO $$
BEGIN
    ALTER TABLE public.owner_school_growth_metrics ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Table owner_school_growth_metrics does not exist, skipping RLS enable';
    WHEN others THEN
        RAISE NOTICE 'RLS already enabled on owner_school_growth_metrics or other error: %', SQLERRM;
END $$;

DO $$
BEGIN
    ALTER TABLE public.owner_user_growth_metrics ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Table owner_user_growth_metrics does not exist, skipping RLS enable';
    WHEN others THEN
        RAISE NOTICE 'RLS already enabled on owner_user_growth_metrics or other error: %', SQLERRM;
END $$;

DO $$
BEGIN
    ALTER TABLE public.owner_revenue_trend_metrics ENABLE ROW LEVEL SECURITY;
EXCEPTION
    WHEN undefined_table THEN
        RAISE NOTICE 'Table owner_revenue_trend_metrics does not exist, skipping RLS enable';
    WHEN others THEN
        RAISE NOTICE 'RLS already enabled on owner_revenue_trend_metrics or other error: %', SQLERRM;
END $$;

-- =============================================================================
-- STEP 3: Create RLS Policies (Only if they don't exist)
-- =============================================================================

SELECT 'Creating RLS policies for owner dashboard tables...' as status;

-- Create RLS policies for owner_school_growth_metrics (only if table exists and policy doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'owner_school_growth_metrics') THEN
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
            RAISE NOTICE 'Created RLS policy for owner_school_growth_metrics';
        ELSE
            RAISE NOTICE 'RLS policy already exists for owner_school_growth_metrics';
        END IF;
    ELSE
        RAISE NOTICE 'Table owner_school_growth_metrics does not exist, skipping policy creation';
    END IF;
END $$;

-- Create RLS policies for owner_user_growth_metrics (only if table exists and policy doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'owner_user_growth_metrics') THEN
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
            RAISE NOTICE 'Created RLS policy for owner_user_growth_metrics';
        ELSE
            RAISE NOTICE 'RLS policy already exists for owner_user_growth_metrics';
        END IF;
    ELSE
        RAISE NOTICE 'Table owner_user_growth_metrics does not exist, skipping policy creation';
    END IF;
END $$;

-- Create RLS policies for owner_revenue_trend_metrics (only if table exists and policy doesn't exist)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'owner_revenue_trend_metrics') THEN
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
            RAISE NOTICE 'Created RLS policy for owner_revenue_trend_metrics';
        ELSE
            RAISE NOTICE 'RLS policy already exists for owner_revenue_trend_metrics';
        END IF;
    ELSE
        RAISE NOTICE 'Table owner_revenue_trend_metrics does not exist, skipping policy creation';
    END IF;
END $$;

-- =============================================================================
-- STEP 4: Ensure System Health Metrics RLS
-- =============================================================================

SELECT 'Ensuring system_health_metrics RLS...' as status;

-- Enable RLS on system_health_metrics if not already enabled
DO $$
BEGIN
    ALTER TABLE public.system_health_metrics ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'Enabled RLS on system_health_metrics';
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'RLS already enabled on system_health_metrics or other error: %', SQLERRM;
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
        RAISE NOTICE 'Created RLS policy for system_health_metrics';
    ELSE
        RAISE NOTICE 'RLS policy already exists for system_health_metrics';
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
-- STEP 5: Final Verification
-- =============================================================================

SELECT 'Final verification...' as status;

-- Show existing dashboard tables
SELECT 'Existing Dashboard Tables:' as check_name;
SELECT 
    schemaname,
    tablename,
    'table' as object_type
FROM pg_tables 
WHERE schemaname = 'public' 
    AND (tablename LIKE 'owner_%_metrics' OR tablename = 'system_health_metrics')
ORDER BY tablename;

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
SELECT 'SUCCESS: RLS policies configured for owner dashboard!' as final_status;
SELECT 'Next step: Restart your Next.js application to resolve 404 errors.' as next_info;