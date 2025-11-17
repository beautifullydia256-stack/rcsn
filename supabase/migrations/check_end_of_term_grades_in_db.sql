-- Check if End of Term results have grades in processed_primary_exam_results
-- This will help us determine if the issue is in the database or the frontend code

-- Step 1: First, find your school_id (run this first to get the UUID)
SELECT 
    school_id,
    name as school_name,
    type
FROM schools
WHERE type = 'Nursery/Primary'
ORDER BY name
LIMIT 10;

-- Step 2: Check for a specific student (replace 'goat Daudi' with your student name)
-- This will show all End of Term results for that student
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
    student_name ILIKE '%goat%'
    AND LOWER(exam_set_name) LIKE '%end%'
ORDER BY 
    student_name,
    subject,
    marks_obtained DESC;

-- Step 3: Check count of End of Term results with and without grades for all primary schools
-- This shows the overall status
SELECT 
    exam_set_name,
    COUNT(*) as total_results,
    COUNT(grade) as results_with_grade,
    COUNT(*) - COUNT(grade) as results_without_grade,
    COUNT(CASE WHEN grade IS NOT NULL AND grade != '' THEN 1 END) as results_with_non_empty_grade,
    ROUND(100.0 * COUNT(CASE WHEN grade IS NOT NULL AND grade != '' THEN 1 END) / COUNT(*), 2) as percentage_with_grade
FROM processed_primary_exam_results
WHERE 
    LOWER(exam_set_name) LIKE '%end%'
GROUP BY exam_set_name
ORDER BY exam_set_name;

-- Step 4: Check specific subjects for End of Term (for student 'goat Daudi')
-- Replace 'goat Daudi' with your student name
SELECT 
    student_name,
    subject,
    exam_set_name,
    marks_obtained,
    grade,
    teacher_remark,
    CASE 
        WHEN grade IS NULL OR grade = '' THEN 'NO GRADE'
        ELSE 'HAS GRADE'
    END as grade_status
FROM processed_primary_exam_results
WHERE 
    student_name ILIKE '%goat%'
    AND LOWER(exam_set_name) LIKE '%end%'
    AND subject IN ('English', 'Mathematics', 'Science', 'Social Studies (S.S.T)')
ORDER BY 
    student_name,
    subject;

-- Step 5: Compare Mid Term vs End of Term grades for the same student
-- This will show if Mid Term has grades but End of Term doesn't
SELECT 
    student_name,
    exam_set_name,
    subject,
    marks_obtained,
    grade,
    CASE 
        WHEN grade IS NULL OR grade = '' THEN 'NO GRADE'
        ELSE 'HAS GRADE'
    END as grade_status
FROM processed_primary_exam_results
WHERE 
    student_name ILIKE '%goat%'
    AND (LOWER(exam_set_name) LIKE '%mid%' OR LOWER(exam_set_name) LIKE '%end%')
    AND subject IN ('English', 'Mathematics', 'Science', 'Social Studies (S.S.T)')
ORDER BY 
    student_name,
    exam_set_name,
    subject;

