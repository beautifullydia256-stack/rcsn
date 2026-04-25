-- Fix Owner Dashboard Access Issues
-- The 500 errors suggest RLS is blocking access to the dashboard tables

-- =============================================================================
-- 1. Check current user and role
-- =============================================================================

SELECT 'Current Authentication Status:' as info;
SELECT 
    (select auth.uid()) as current_user_id,
    (SELECT role FROM profiles WHERE id = (select auth.uid())) as current_role;

-- =============================================================================
-- 2. Check if owner dashboard tables exist and have data
-- =============================================================================

SELECT 'Dashboard Tables Status:' as info;

-- Check if tables exist
SELECT 
    tablename,
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND tablename = t.tablename) as table_exists
FROM (VALUES 
    ('owner_school_growth_metrics'),
    ('owner_user_growth_metrics'), 
    ('owner_revenue_trend_metrics')
) AS t(tablename);

-- Check data counts
SELECT 'Data Counts:' as info;
SELECT 
    (SELECT COUNT(*) FROM public.owner_school_growth_metrics) as school_metrics,
    (SELECT COUNT(*) FROM public.owner_user_growth_metrics) as user_metrics,
    (SELECT COUNT(*) FROM public.owner_revenue_trend_metrics) as revenue_metrics;

-- =============================================================================
-- 3. Check RLS policies
-- =============================================================================

SELECT 'RLS Policies on Dashboard Tables:' as info;
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE schemaname = 'public' 
    AND tablename LIKE 'owner_%_metrics'
ORDER BY tablename, policyname;

-- =============================================================================
-- 4. Test direct access to tables (this will show RLS errors if any)
-- =============================================================================

SELECT 'Testing Direct Table Access:' as info;

-- Test school growth metrics
SELECT 'School Growth Metrics - First Row:' as test;
SELECT * FROM public.owner_school_growth_metrics LIMIT 1;

-- Test user growth metrics  
SELECT 'User Growth Metrics - First Row:' as test;
SELECT * FROM public.owner_user_growth_metrics LIMIT 1;

-- Test revenue metrics
SELECT 'Revenue Metrics - First Row:' as test;
SELECT * FROM public.owner_revenue_trend_metrics LIMIT 1;

-- =============================================================================
-- 5. Create temporary bypass policies for testing (REMOVE AFTER TESTING)
-- =============================================================================

-- TEMPORARY: Create permissive policies for testing
-- WARNING: These are for testing only - remove after confirming access works

DROP POLICY IF EXISTS "temp_owner_school_access" ON public.owner_school_growth_metrics;
CREATE POLICY "temp_owner_school_access" ON public.owner_school_growth_metrics
    FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "temp_owner_user_access" ON public.owner_user_growth_metrics;  
CREATE POLICY "temp_owner_user_access" ON public.owner_user_growth_metrics
    FOR ALL TO authenticated USING (true);

DROP POLICY IF EXISTS "temp_owner_revenue_access" ON public.owner_revenue_trend_metrics;
CREATE POLICY "temp_owner_revenue_access" ON public.owner_revenue_trend_metrics
    FOR ALL TO authenticated USING (true);

SELECT 'TEMPORARY bypass policies created for testing. REMOVE these after confirming dashboard works!' as warning;

-- =============================================================================
-- 6. Test access again with bypass policies
-- =============================================================================

SELECT 'Testing Access with Bypass Policies:' as info;

SELECT 'School Growth Data:' as test;
SELECT month_year, total_schools, new_schools FROM public.owner_school_growth_metrics ORDER BY month_year DESC LIMIT 3;

SELECT 'User Growth Data:' as test;  
SELECT month_year, total_users, new_users FROM public.owner_user_growth_metrics ORDER BY month_year DESC LIMIT 3;

SELECT 'Revenue Data:' as test;
SELECT month_year, total_revenue, new_revenue FROM public.owner_revenue_trend_metrics ORDER BY month_year DESC LIMIT 3;