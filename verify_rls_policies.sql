-- Verify RLS policies are created and active
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('user_sessions', 'login_activities', 'school_requests')
  AND schemaname = 'public'
ORDER BY tablename, policyname;