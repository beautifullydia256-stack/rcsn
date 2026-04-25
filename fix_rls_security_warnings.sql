-- Fix RLS Security Warnings
-- Enable Row Level Security on tables that are missing it

-- 1. Enable RLS on user_sessions table
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for user_sessions (only allow users to see their own sessions)
CREATE POLICY "Users can only see their own sessions" ON public.user_sessions
  FOR ALL USING (auth.uid() = user_id);

-- 2. Enable RLS on login_activities table  
ALTER TABLE public.login_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for login_activities (only allow users to see their own login activities)
CREATE POLICY "Users can only see their own login activities" ON public.login_activities
  FOR ALL USING (auth.uid() = user_id);

-- 3. Enable RLS on school_requests table
ALTER TABLE public.school_requests ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for school_requests (only allow admins/owners to see school requests)
CREATE POLICY "Only admins and owners can see school requests" ON public.school_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('admin', 'owner')
    )
  );

-- Alternative policy if you want users to see their own school requests
-- CREATE POLICY "Users can see their own school requests" ON public.school_requests
--   FOR ALL USING (auth.uid() = requested_by_user_id);

-- Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE tablename IN ('user_sessions', 'login_activities', 'school_requests')
  AND schemaname = 'public';