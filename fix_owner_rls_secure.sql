-- Secure fix for owner RLS policy
-- Instead of using user_metadata (insecure), we'll use a different approach

-- 1. Drop the insecure policy
DROP POLICY IF EXISTS "owner global access" ON public.users;

-- 2. Create a secure function to check if current user is owner
-- This function uses SECURITY DEFINER to bypass RLS when checking role
CREATE OR REPLACE FUNCTION auth.is_owner()
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE user_id = auth.uid() 
    AND role = 'owner'
    AND is_active = true
  );
$$;

-- 3. Create secure owner policy using the function
CREATE POLICY "owner secure global access" ON public.users
FOR ALL TO authenticated 
USING (auth.is_owner());

-- 4. Also ensure owner can always read their own record (for the function to work)
CREATE POLICY "users can read own record" ON public.users
FOR SELECT TO authenticated 
USING (user_id = auth.uid());

-- 5. Verify the policies
SELECT 
    'SECURE RLS POLICIES' as check_type,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname;

-- 6. Test the function works
SELECT 
    'OWNER FUNCTION TEST' as test,
    auth.is_owner() as is_current_user_owner;

-- 7. Verify owner user is still configured correctly
SELECT 
    'OWNER USER FINAL CHECK' as test,
    user_id,
    email,
    name,
    role,
    school_id,  -- Should be NULL
    is_active
FROM public.users 
WHERE user_id = 'a360d879-192c-4b5a-b776-6452849f1102';