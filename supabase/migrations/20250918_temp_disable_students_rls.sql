-- Temporarily disable RLS on students table for testing
-- This will help us determine if RLS policies are causing the issue

-- Disable RLS temporarily
ALTER TABLE public.students DISABLE ROW LEVEL SECURITY;

-- Note: This is for testing only. We'll re-enable RLS once we identify the issue.
