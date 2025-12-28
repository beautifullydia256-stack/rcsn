-- Diagnostic SQL to compare old vs new accounts
-- Run this in Supabase SQL Editor to identify differences
-- Run ONE query at a time and share results before moving to next

-- QUERY 1: Compare basic user data and school linkage
-- This is the safest query - only uses public.users and public.schools tables
SELECT 
  u.user_id,
  u.email,
  u.role,
  u.school_id,
  u.created_at,
  s.school_id as school_exists,
  s.name as school_name,
  s.admin_id as school_admin_id,
  CASE 
    WHEN u.school_id IS NULL THEN 'MISSING school_id'
    WHEN s.school_id IS NULL THEN 'INVALID school_id (orphaned)'
    WHEN s.admin_id != u.user_id AND u.role = 'admin' THEN 'MISMATCHED admin_id'
    ELSE 'OK'
  END as status
FROM users u
LEFT JOIN schools s ON u.school_id = s.school_id
WHERE u.email IN ('trnamyalosarah@gmail.com', 'kandi@gmail.com')
ORDER BY u.created_at;

-- Check auth.users table for these accounts
SELECT 
  au.id as auth_user_id,
  au.email,
  au.created_at as auth_created_at,
  au.user_metadata,
  au.raw_user_meta_data,
  u.user_id as public_user_id,
  u.school_id,
  u.role
FROM auth.users au
LEFT JOIN users u ON au.id = u.user_id
WHERE au.email IN ('trnamyalosarah@gmail.com', 'kandi@gmail.com')
ORDER BY au.created_at;

-- Check if schools exist for these users
SELECT 
  u.email,
  u.user_id,
  u.school_id,
  s.school_id as school_exists,
  s.name as school_name,
  s.admin_id,
  CASE 
    WHEN u.school_id IS NULL THEN 'MISSING school_id in users table'
    WHEN s.school_id IS NULL THEN 'school_id points to non-existent school'
    WHEN s.admin_id IS NULL THEN 'School has no admin_id'
    WHEN s.admin_id != u.user_id AND u.role = 'admin' THEN 'School admin_id does not match user_id'
    ELSE 'OK - School properly linked'
  END as linkage_status
FROM users u
LEFT JOIN schools s ON u.school_id = s.school_id
WHERE u.email IN ('trnamyalosarah@gmail.com', 'kandi@gmail.com');

-- Find all new accounts (created in last 30 days) with missing school_id
SELECT 
  u.user_id,
  u.email,
  u.role,
  u.school_id,
  u.created_at,
  CASE 
    WHEN u.role = 'admin' AND u.school_id IS NULL THEN 'ADMIN WITHOUT SCHOOL - CRITICAL'
    WHEN u.role != 'admin' AND u.school_id IS NULL THEN 'Non-admin without school_id'
    ELSE 'Has school_id'
  END as issue_type
FROM users u
WHERE u.created_at > NOW() - INTERVAL '30 days'
ORDER BY u.created_at DESC;

