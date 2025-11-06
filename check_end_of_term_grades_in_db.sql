-- Check if End of Term results have grades in processed_primary_exam_results
-- This will help us determine if the issue is in the database or the frontend code

-- Replace with your actual school_id and student_id to test
-- Example: Check for a specific student
SELECT 
    student_id,
    student_name,
    exam_set_id,
    exam_set_name,
    subject,
    marks_obtained,
    total_marks,
    grade,
    teacher_remark,
    CASE 
        WHEN (marks_obtained = 0 OR marks_obtained IS NULL) AND teacher_remark = 'MISSED' THEN 'MISSED'
        ELSE 'ACTUAL'
    END as result_type
FROM processed_primary_exam_results
WHERE 
    -- Replace with your actual school_id
    school_id = 'YOUR_SCHOOL_ID'
    -- Replace with your actual student_id (e.g., 'goat Daudi' or student_id)
    AND (student_name ILIKE '%goat%' OR student_id = 'YOUR_STUDENT_ID')
    AND LOWER(exam_set_name) LIKE '%end%'
ORDER BY 
    student_name,
    subject,
    marks_obtained DESC;

-- Check count of End of Term results with and without grades
SELECT 
    exam_set_name,
    COUNT(*) as total_results,
    COUNT(grade) as results_with_grade,
    COUNT(*) - COUNT(grade) as results_without_grade,
    COUNT(CASE WHEN grade IS NOT NULL AND grade != '' THEN 1 END) as results_with_non_empty_grade
FROM processed_primary_exam_results
WHERE 
    -- Replace with your actual school_id
    school_id = 'YOUR_SCHOOL_ID'
    AND LOWER(exam_set_name) LIKE '%end%'
GROUP BY exam_set_name;

-- Check specific subjects for End of Term
SELECT 
    student_name,
    subject,
    exam_set_name,
    marks_obtained,
    grade,
    teacher_remark
FROM processed_primary_exam_results
WHERE 
    -- Replace with your actual school_id
    school_id = 'YOUR_SCHOOL_ID'
    AND LOWER(exam_set_name) LIKE '%end%'
    AND subject IN ('English', 'Mathematics', 'Science', 'Social Studies (S.S.T)')
ORDER BY 
    student_name,
    subject;

