-- Test direct insert into exam_results table to see if there are any constraint issues

-- First, let's check the structure of the exam_results table
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'exam_results' 
ORDER BY ordinal_position;

-- Then try a direct insert to see if it works
INSERT INTO exam_results (
    school_id,
    exam_set_id,
    student_id,
    class_name,
    subject,
    marks_obtained,
    total_marks,
    grade,
    remarks,
    teacher_id,
    teacher_comment,
    created_at,
    updated_at
) VALUES (
    '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'::uuid,
    '76d20463-f6e0-4b97-b8fd-f09e5de18936'::uuid,
    'test-student-id'::uuid,
    'Primary 7',
    'English',
    85,
    100,
    'A',
    'Good work',
    '7455931c-e96b-4204-8350-74f52e38d3fd',
    'Well done',
    NOW(),
    NOW()
);

-- Check if the insert worked
SELECT * FROM exam_results WHERE student_id = 'test-student-id';

-- Clean up the test record
DELETE FROM exam_results WHERE student_id = 'test-student-id';
