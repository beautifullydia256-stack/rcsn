-- Check 1: What End of Term results exist in exam_results (source table - where teachers enter data)
-- This shows what teachers have actually entered
SELECT 
  'Source Table (exam_results)' as table_name,
  subject,
  exam_set_name,
  COUNT(DISTINCT student_id) as students_with_results,
  COUNT(*) as total_entries
FROM exam_results er
JOIN exam_sets es ON er.exam_set_id = es.id
WHERE er.school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND er.class_name = 'Primary 7'
  AND es.name LIKE '%End%'
GROUP BY subject, exam_set_name
ORDER BY exam_set_name, subject;

-- Check 2: What End of Term results exist in processed_primary_exam_results (processed table - used for reports)
-- This shows what's available for reports (includes MISSED entries)
SELECT 
  'Processed Table (processed_primary_exam_results)' as table_name,
  subject,
  exam_set_name,
  COUNT(DISTINCT student_id) as students_with_entries,
  COUNT(*) as total_entries,
  COUNT(CASE WHEN teacher_remark = 'MISSED' THEN 1 END) as missed_entries,
  COUNT(CASE WHEN teacher_remark != 'MISSED' THEN 1 END) as actual_entries
FROM processed_primary_exam_results
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND class_name = 'Primary 7'
  AND exam_set_name LIKE '%End%'
GROUP BY subject, exam_set_name
ORDER BY exam_set_name, subject;

-- Check 3: Compare - Show the difference
-- This shows which subjects have MISSED entries vs actual entries for End of Term
SELECT 
  subject,
  exam_set_name,
  COUNT(CASE WHEN teacher_remark = 'MISSED' THEN 1 END) as missed_count,
  COUNT(CASE WHEN teacher_remark != 'MISSED' THEN 1 END) as actual_count,
  COUNT(DISTINCT student_id) as total_students
FROM processed_primary_exam_results
WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'
  AND class_name = 'Primary 7'
  AND exam_set_name LIKE '%End%'
GROUP BY subject, exam_set_name
ORDER BY exam_set_name, subject;

