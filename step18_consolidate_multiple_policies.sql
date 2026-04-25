-- Step 18: Consolidate multiple permissive policies to improve performance
-- This addresses the "multiple_permissive_policies" warnings

-- Fix users table - consolidate multiple policies for authenticated role
-- Remove redundant policies and keep the most comprehensive one

-- Keep the "known owner global access" policy as it's most specific
-- Remove the redundant "optimized_authenticated_access" policy for users table
DROP POLICY IF EXISTS "optimized_authenticated_access" ON public.users;

-- Fix profiles table - consolidate SELECT policies
-- Combine "Admins can view all profiles" and "Users can view their own profile" into one policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users and admins can view profiles" ON public.profiles
    FOR SELECT USING (
        -- Users can view their own profile OR admins/owners can view all profiles
        (id = (select auth.uid())) OR 
        EXISTS (
            SELECT 1 FROM profiles p2 
            WHERE p2.id = (select auth.uid()) 
            AND p2.role = ANY (ARRAY['admin'::text, 'owner'::text])
        )
    );

-- Fix profiles table - consolidate UPDATE policies  
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users and admins can update profiles" ON public.profiles
    FOR UPDATE 
    USING (
        -- Users can update their own profile OR admins/owners can update all profiles
        (id = (select auth.uid())) OR 
        EXISTS (
            SELECT 1 FROM profiles p2 
            WHERE p2.id = (select auth.uid()) 
            AND p2.role = ANY (ARRAY['admin'::text, 'owner'::text])
        )
    )
    WITH CHECK (
        -- Same check for WITH CHECK clause
        (id = (select auth.uid())) OR 
        EXISTS (
            SELECT 1 FROM profiles p2 
            WHERE p2.id = (select auth.uid()) 
            AND p2.role = ANY (ARRAY['admin'::text, 'owner'::text])
        )
    );

-- Fix school_subscriptions table - consolidate overlapping policies
-- The two policies "owner_all_on_school_subscriptions" and "school_subscriptions_admin_manage" 
-- can be combined since owners have global access anyway
-- Keep both for now but we could consolidate if needed

-- Note: Other tables with multiple policies may need similar treatment
-- Run step16_check_multiple_permissive_policies.sql after this to see remaining conflicts