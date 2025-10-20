-- Debug script to see what's actually in the database
-- Run this in Supabase SQL Editor

-- Check all schools
SELECT 'All Schools' as info, school_id, name, type FROM schools LIMIT 5;

-- Check all students
SELECT 'All Students' as info, school_id, name, current_class FROM students LIMIT 5;

-- Check all exam sets
SELECT 'All Exam Sets' as info, school_id, name, year, term FROM exam_sets LIMIT 5;

-- Check all exam results
SELECT 'All Exam Results' as info, school_id, student_id, subject, marks_obtained FROM exam_results LIMIT 5;

-- Check if our specific school_id exists
SELECT 'Our School Check' as info, COUNT(*) as count FROM schools WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d';

-- Check if there are any schools at all
SELECT 'Total Schools' as info, COUNT(*) as count FROM schools;

-- Check if there are any students at all
SELECT 'Total Students' as info, COUNT(*) as count FROM students;

-- Check if there are any exam results at all
SELECT 'Total Exam Results' as info, COUNT(*) as count FROM exam_results;
