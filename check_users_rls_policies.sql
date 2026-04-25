-- Check RLS policies on users table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY policyname;

-- Test the exact query that's failing from the client perspective
-- This simulates what ProtectedRoute is trying to do
SET role authenticated;
SELECT 
    'CLIENT QUERY TEST' as test_type,
    role,
    school_id,
    is_active
FROM public.users 
WHERE user_id = 'a360d879-192c-4b5a-b776-6452849f1102';

-- Reset role
RESET role;