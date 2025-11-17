-- Complete database setup script for PwezaCore
-- Run this in your Supabase SQL Editor

-- Insert a sample school
INSERT INTO schools (school_id, name, location, type, subscription_plan, student_count)
VALUES (
  '406bf29b-d7fd-457c-aa56-e29b9ef1a16d',
  'Sample Primary School',
  'Kampala, Uganda',
  'Nursery/Primary',
  'Free (0-20)',
  0
) ON CONFLICT (school_id) DO NOTHING;

-- Insert sample students
INSERT INTO students (school_id, name, current_class, status, admission_number, first_name, last_name, gender, date_of_birth, nationality, address, city, country, guardian_name, guardian_relationship, guardian_phone, admission_date, boarding_type, payment_status, expected_fee_amount)
VALUES 
  ('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'John Doe', 'Primary 2', 'active', 'P2024001', 'John', 'Doe', 'Male', '2010-01-01', 'Ugandan', 'Kampala, Uganda', 'Kampala', 'Uganda', 'John Parent', 'Parent', '0700000000', '2024-01-15', 'Day Scholar', 'Paid', 500000),
  ('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Jane Smith', 'Primary 2', 'active', 'P2024002', 'Jane', 'Smith', 'Female', '2010-02-01', 'Ugandan', 'Kampala, Uganda', 'Kampala', 'Uganda', 'Jane Parent', 'Parent', '0700000001', '2024-01-15', 'Day Scholar', 'Paid', 500000),
  ('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Peter Johnson', 'Primary 3', 'active', 'P2024003', 'Peter', 'Johnson', 'Male', '2009-03-01', 'Ugandan', 'Kampala, Uganda', 'Kampala', 'Uganda', 'Peter Parent', 'Parent', '0700000002', '2024-01-15', 'Day Scholar', 'Paid', 500000)
ON CONFLICT (student_id) DO NOTHING;

-- Insert exam sets
INSERT INTO exam_sets (school_id, name, description, year, term, is_active)
VALUES 
  ('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Mid Term', 'Mid Term Examinations', 2024, 1, true),
  ('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'End of Term', 'End of Term Examinations', 2024, 1, true)
ON CONFLICT DO NOTHING;

-- Insert sample exam results for all students and subjects
WITH subjects AS (
  SELECT unnest(ARRAY['Mathematics', 'English', 'Science', 'Social Studies']) as subject
),
students AS (
  SELECT student_id, current_class FROM students WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
),
exam_sets AS (
  SELECT id FROM exam_sets WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
)
INSERT INTO exam_results (school_id, exam_set_id, student_id, class_name, subject, marks_obtained, total_marks, grade, remarks)
SELECT 
  '406bf29b-d7fd-457c-aa56-e29b9ef1a16d' as school_id,
  es.id as exam_set_id,
  st.student_id,
  st.current_class,
  subj.subject,
  (40 + (random() * 55))::integer as marks_obtained, -- Random marks between 40-95
  100 as total_marks,
  CASE 
    WHEN (40 + (random() * 55))::integer >= 80 THEN 'A'
    WHEN (40 + (random() * 55))::integer >= 70 THEN 'B'
    WHEN (40 + (random() * 55))::integer >= 60 THEN 'C'
    WHEN (40 + (random() * 55))::integer >= 50 THEN 'D'
    ELSE 'E'
  END as grade,
  CASE 
    WHEN (40 + (random() * 55))::integer >= 80 THEN 'Excellent work!'
    WHEN (40 + (random() * 55))::integer >= 60 THEN 'Good work'
    ELSE 'Needs improvement'
  END as remarks
FROM students st
CROSS JOIN subjects subj
CROSS JOIN exam_sets es
ON CONFLICT DO NOTHING;

-- Insert teacher comment rules
INSERT INTO teacher_comment_rules (school_id, class_name, min_avg, max_avg, comment)
VALUES 
  ('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Primary 2', 80, 100, 'Excellent performance! Keep up the good work.'),
  ('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Primary 2', 60, 79, 'Good performance. Continue working hard.'),
  ('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Primary 2', 40, 59, 'Satisfactory performance. More effort needed.'),
  ('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Primary 2', 0, 39, 'Needs more effort. Try harder next time.'),
  ('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Primary 3', 80, 100, 'Excellent performance! Keep up the good work.'),
  ('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Primary 3', 60, 79, 'Good performance. Continue working hard.'),
  ('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Primary 3', 40, 59, 'Satisfactory performance. More effort needed.'),
  ('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Primary 3', 0, 39, 'Needs more effort. Try harder next time.')
ON CONFLICT DO NOTHING;

-- Insert sample attendance records
INSERT INTO student_attendance (school_id, class_name, student_id, teacher_id, date, present, remarks)
SELECT 
  '406bf29b-d7fd-457c-aa56-e29b9ef1a16d' as school_id,
  st.current_class,
  st.student_id,
  NULL as teacher_id,
  CURRENT_DATE - (random() * 30)::integer as date,
  (random() > 0.1) as present, -- 90% attendance rate
  CASE WHEN (random() > 0.1) THEN 'Present' ELSE 'Absent' END as remarks
FROM students st
WHERE st.school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
ON CONFLICT DO NOTHING;

-- Insert sample fees records
INSERT INTO student_fees (school_id, student_id, term, year, total_fees, paid_amount, balance, status)
SELECT 
  '406bf29b-d7fd-457c-aa56-e29b9ef1a16d' as school_id,
  st.student_id,
  1 as term,
  2024 as year,
  500000 as total_fees,
  500000 as paid_amount,
  0 as balance,
  'Paid' as status
FROM students st
WHERE st.school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
ON CONFLICT DO NOTHING;

-- Update school student count
UPDATE schools 
SET student_count = (
  SELECT COUNT(*) 
  FROM students 
  WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d' 
  AND status = 'active'
)
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d';

-- Show summary
SELECT 
  'Setup Complete!' as status,
  (SELECT COUNT(*) FROM schools WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d') as schools,
  (SELECT COUNT(*) FROM students WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d') as students,
  (SELECT COUNT(*) FROM exam_sets WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d') as exam_sets,
  (SELECT COUNT(*) FROM exam_results WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d') as exam_results;
