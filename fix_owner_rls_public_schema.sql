-- Secure fix for owner RLS policy using public schema
-- Create function in public schema since auth schema is protected

-- 1. Drop the insecure policy
DROP POLICY IF EXISTS "owner global access" ON public.users;

-- 2. Create a secure function in public schema to check if current user is owner
CREATE OR REPLACE FUNCTION public.is_current_user_owner()
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
USING (public.is_current_user_owner());

-- 4. Ensure users can read their own record (needed for the function to work)
DROP POLICY IF EXISTS "users can read own record" ON public.users;
CREATE POLICY "users can read own record" ON public.users
FOR SELECT TO authenticated 
USING (user_id = auth.uid());

-- 5. Alternative approach: Create a simpler policy that doesn't use functions
-- This checks if the user's ID matches a known owner ID
DROP POLICY IF EXISTS "owner secure global access" ON public.users;
CREATE POLICY "known owner global access" ON public.users
FOR ALL TO authenticated 
USING (auth.uid() = 'a360d879-192c-4b5a-b776-6452849f1102'::uuid);

-- 6. Verify the policies
SELECT 
    'SECURE RLS POLICIES' as check_type,
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'users' 
AND policyname LIKE '%owner%'
ORDER BY policyname;

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