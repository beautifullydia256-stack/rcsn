-- Simple database setup - run this in Supabase SQL Editor

-- 1. Create school
INSERT INTO schools (school_id, name, location, type, subscription_plan, student_count)
VALUES (
  '406bf29b-d7fd-457c-aa56-e29b9ef1a16d',
  'Sample Primary School',
  'Kampala, Uganda',
  'Nursery/Primary',
  'Free (0-20)',
  0
) ON CONFLICT (school_id) DO NOTHING;

-- 2. Create students
INSERT INTO students (school_id, name, current_class, status, admission_number, first_name, last_name, gender, date_of_birth, nationality, address, city, country, guardian_name, guardian_relationship, guardian_phone, admission_date, boarding_type, payment_status, expected_fee_amount)
VALUES 
  ('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'John Doe', 'Primary 2', 'active', 'P2024001', 'John', 'Doe', 'Male', '2010-01-01', 'Ugandan', 'Kampala, Uganda', 'Kampala', 'Uganda', 'John Parent', 'Parent', '0700000000', '2024-01-15', 'Day Scholar', 'Paid', 500000),
  ('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Jane Smith', 'Primary 2', 'active', 'P2024002', 'Jane', 'Smith', 'Female', '2010-02-01', 'Ugandan', 'Kampala, Uganda', 'Kampala', 'Uganda', 'Jane Parent', 'Parent', '0700000001', '2024-01-15', 'Day Scholar', 'Paid', 500000)
ON CONFLICT (student_id) DO NOTHING;

-- 3. Create exam sets
INSERT INTO exam_sets (school_id, name, description, year, term, is_active)
VALUES 
  ('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Mid Term', 'Mid Term Examinations', 2024, 1, true),
  ('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'End of Term', 'End of Term Examinations', 2024, 1, true)
ON CONFLICT DO NOTHING;

-- 4. Create exam results (simplified)
INSERT INTO exam_results (school_id, exam_set_id, student_id, class_name, subject, marks_obtained, total_marks, grade, remarks)
SELECT 
  '406bf29b-d7fd-457c-aa56-e29b9ef1a16d',
  es.id,
  st.student_id,
  st.current_class,
  subj.subject,
  (40 + (random() * 55))::integer,
  100,
  CASE 
    WHEN (40 + (random() * 55))::integer >= 80 THEN 'A'
    WHEN (40 + (random() * 55))::integer >= 70 THEN 'B'
    WHEN (40 + (random() * 55))::integer >= 60 THEN 'C'
    WHEN (40 + (random() * 55))::integer >= 50 THEN 'D'
    ELSE 'E'
  END,
  'Good work'
FROM students st
CROSS JOIN (VALUES ('Mathematics'), ('English'), ('Science'), ('Social Studies')) AS subj(subject)
CROSS JOIN exam_sets es
WHERE st.school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND es.school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
ON CONFLICT DO NOTHING;

-- 5. Show what was created
SELECT 'Schools' as table_name, COUNT(*) as count FROM schools WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
UNION ALL
SELECT 'Students', COUNT(*) FROM students WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
UNION ALL
SELECT 'Exam Sets', COUNT(*) FROM exam_sets WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
UNION ALL
SELECT 'Exam Results', COUNT(*) FROM exam_results WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d';
