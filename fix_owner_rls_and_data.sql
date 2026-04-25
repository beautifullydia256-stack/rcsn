-- Fix OWNER user to be a true super admin with global access
-- OWNER should have NULL school_id and special RLS policies

-- 1. Fix the owner user data - REMOVE school_id (should be NULL for global access)
UPDATE public.users 
SET 
    school_id = NULL,  -- OWNER has no specific school - oversees ALL
    role = 'owner',
    name = 'Kimuli Daudi',
    is_active = true
WHERE user_id = 'a360d879-192c-4b5a-b776-6452849f1102';

-- 2. Fix the circular dependency in RLS policies
-- The current "owner all on users" policy has a circular reference
DROP POLICY IF EXISTS "owner all on users" ON public.users;

-- Create a better owner policy that doesn't create circular dependency
-- Use auth.jwt() to get role from JWT token instead of querying users table
CREATE POLICY "owner global access" ON public.users
FOR ALL TO authenticated 
USING (
    COALESCE(
        (auth.jwt() ->> 'user_metadata')::jsonb ->> 'role',
        (auth.jwt() ->> 'raw_user_meta_data')::jsonb ->> 'role'
    ) = 'owner'
);

-- 3. Ensure the auth.users has the role in metadata
UPDATE auth.users 
SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "owner"}'::jsonb
WHERE id = 'a360d879-192c-4b5a-b776-6452849f1102';

-- 4. Verify the fix
SELECT 
    'OWNER USER VERIFICATION' as status,
    user_id,
    email,
    name,
    role,
    school_id,  -- Should be NULL for global access
    is_active
FROM public.users 
WHERE user_id = 'a360d879-192c-4b5a-b776-6452849f1102';

-- 5. Test that owner can access all users (global access)
SELECT 
    'OWNER GLOBAL ACCESS TEST' as test,
    COUNT(*) as total_users_accessible
FROM public.users;

-- 6. Show all schools that owner should have access to
SELECT 
    'SCHOOLS UNDER OWNER' as info,
    school_id,
    name as school_name,
    created_at
FROM public.schools
ORDER BY created_at;