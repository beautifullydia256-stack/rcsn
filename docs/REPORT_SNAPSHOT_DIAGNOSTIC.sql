-- Run this in Supabase SQL Editor to check why report tables (subjects, marks, teacher initials) might be empty.
-- Replace YOUR_SNAPSHOT_ID with a real snapshot UUID from report_snapshots, or use the last one.

-- 1) Latest snapshots (copy an id for step 2)
SELECT id, school_id, term, year, exam_set_id, status, student_count, class_count, created_at
FROM report_snapshots
ORDER BY created_at DESC
LIMIT 5;

-- 2) Snapshot data for one snapshot: subject, marks, teacher_initials per student
-- Replace 'YOUR_SNAPSHOT_ID' with an id from step 1
SELECT snapshot_id, student_id, class_name, subject, marks_obtained, total_marks, grade, remarks, teacher_initials, teacher_comment
FROM report_snapshot_data
WHERE snapshot_id = 'YOUR_SNAPSHOT_ID'
ORDER BY student_id, subject
LIMIT 100;

-- 3) One generated report's report_data.students[0].results (subjects table source)
-- Replace 'YOUR_SNAPSHOT_ID' with same id
SELECT id, snapshot_id, student_id,
  jsonb_array_length(report_data->'students'->0->'results') AS results_count,
  report_data->'students'->0->'results' AS results_sample
FROM generated_reports
WHERE snapshot_id = 'YOUR_SNAPSHOT_ID'
LIMIT 3;

-- 4) exam_results for the same exam_set (source of snapshot data)
-- Get exam_set_id from step 1, then:
SELECT er.student_id, er.class_name, er.subject, er.marks_obtained, er.total_marks, er.grade, er.remarks, er.teacher_initials, er.teacher_comment
FROM exam_results er
WHERE er.exam_set_id = (SELECT exam_set_id FROM report_snapshots WHERE id = 'YOUR_SNAPSHOT_ID')
ORDER BY er.student_id, er.subject
LIMIT 50;

-- 5) Counts: snapshot rows vs exam_results rows (should be similar)
-- Replace YOUR_SNAPSHOT_ID and optionally YOUR_EXAM_SET_ID
SELECT
  (SELECT COUNT(*) FROM report_snapshot_data WHERE snapshot_id = 'YOUR_SNAPSHOT_ID') AS snapshot_data_rows,
  (SELECT COUNT(*) FROM exam_results WHERE exam_set_id = (SELECT exam_set_id FROM report_snapshots WHERE id = 'YOUR_SNAPSHOT_ID')) AS exam_results_rows;

-- 6) Report table source: results AND subjects (Template4 uses students[0].subjects; others use students[0].results)
-- Replace YOUR_SNAPSHOT_ID
SELECT id, snapshot_id, student_id,
  jsonb_array_length(COALESCE(report_data->'students'->0->'results', '[]'::jsonb)) AS results_count,
  jsonb_array_length(COALESCE(report_data->'students'->0->'subjects', '[]'::jsonb)) AS subjects_count,
  report_data->'students'->0->'results' AS results_sample,
  report_data->'students'->0->'subjects' AS subjects_sample
FROM generated_reports
WHERE snapshot_id = 'YOUR_SNAPSHOT_ID'
LIMIT 3;
