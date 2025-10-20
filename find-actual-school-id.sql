-- Find the actual school_id that was used when creating the data
-- Run this in Supabase SQL Editor

-- Get the actual school_id from the data
SELECT DISTINCT school_id, COUNT(*) as record_count
FROM exam_results 
GROUP BY school_id
ORDER BY record_count DESC;

-- Get school details for the school_id with the most records
SELECT s.school_id, s.name, s.type, COUNT(er.id) as exam_results_count
FROM schools s
LEFT JOIN exam_results er ON s.school_id = er.school_id
GROUP BY s.school_id, s.name, s.type
ORDER BY exam_results_count DESC;

-- Show sample data from the school with exam results
SELECT 'Sample Exam Results' as info, school_id, student_id, subject, marks_obtained, class_name
FROM exam_results 
LIMIT 5;
