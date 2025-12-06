-- Diagnostic queries to check why accountant dashboard shows no data
-- Run these queries in Supabase SQL Editor to diagnose the issue

-- 1. Check if accounting tables exist
SELECT 
  table_name,
  table_schema
FROM information_schema.tables
WHERE table_name IN ('student_balances', 'student_payments', 'school_expenses', 'classes', 'school_terms')
  AND table_schema = 'public'
ORDER BY table_name;

-- 2. Check if there are any school_terms for your school
-- Replace 'YOUR_SCHOOL_ID' with your actual school_id
SELECT 
  id,
  school_id,
  year,
  term,
  start_date,
  end_date,
  academic_year
FROM school_terms
ORDER BY year DESC, term DESC
LIMIT 10;

-- 3. Check if there are any classes set up
SELECT 
  class_id,
  school_id,
  class_name,
  total_fees
FROM classes
ORDER BY school_id, class_name
LIMIT 10;

-- 4. Check if there are any student_balances
SELECT 
  balance_id,
  student_id,
  school_id,
  term_id,
  total_fees,
  total_paid,
  balance
FROM student_balances
ORDER BY school_id, term_id
LIMIT 10;

-- 5. Check if there are any student_payments
SELECT 
  payment_id,
  student_id,
  school_id,
  term_id,
  amount_paid,
  payment_date
FROM student_payments
ORDER BY payment_date DESC
LIMIT 10;

-- 6. Check if there are any school_expenses
SELECT 
  expense_id,
  school_id,
  term_id,
  category_name,
  amount,
  status,
  expense_date
FROM school_expenses
ORDER BY expense_date DESC
LIMIT 10;

-- 7. Check RLS policies for accountant role
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
WHERE tablename IN ('student_balances', 'student_payments', 'school_expenses')
  AND schemaname = 'public'
ORDER BY tablename, policyname;

