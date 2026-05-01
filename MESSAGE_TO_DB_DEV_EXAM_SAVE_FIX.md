# URGENT: Fix exam_topic_key Update Constraint Breaking Exam Saves

## Problem
Teachers cannot save exam results. Error: **"column exam_topic_key can only be updated to DEFAULT"**

This is caused by the constraint you added to prevent duplicate exam results. The constraint blocks UPDATE operations on `exam_topic_key`, but the RPC functions are doing UPSERT (which includes UPDATE).

## Solution Required

Modify these RPC functions to use **DELETE + INSERT** instead of **UPDATE**:

1. `teacher_upsert_exam_result_primary`
2. `teacher_upsert_exam_result_secondary` 
3. `teacher_upsert_exam_result_alevel`

## Current Logic (BROKEN)
```sql
-- Current approach (doesn't work with your constraint)
INSERT INTO exam_results (...)
VALUES (...)
ON CONFLICT (...) DO UPDATE SET
  marks_obtained = EXCLUDED.marks_obtained,
  exam_topic_key = EXCLUDED.exam_topic_key,  -- ❌ This fails!
  ...
```

## New Logic (REQUIRED)
```sql
-- Step 1: Delete existing result for this student/exam/subject/topic
DELETE FROM exam_results
WHERE school_id = p_school_id
  AND exam_set_id = p_exam_set_id
  AND student_id = p_student_id
  AND subject = p_subject
  AND (exam_topic_key = p_topic OR (exam_topic_key IS NULL AND p_topic IS NULL));

-- Step 2: Insert fresh result
INSERT INTO exam_results (
  school_id,
  exam_set_id,
  student_id,
  subject,
  marks_obtained,
  exam_topic_key,
  ...
) VALUES (
  p_school_id,
  p_exam_set_id,
  p_student_id,
  p_subject,
  p_marks_obtained,
  p_exam_topic_key,
  ...
);
```

## Why This Works

1. **DELETE removes the old result** - No conflict with existing data
2. **INSERT creates fresh result** - `exam_topic_key` is set on INSERT (allowed by your constraint)
3. **No UPDATE needed** - Avoids the constraint that blocks updates
4. **Same end result** - Teacher saves replace old data with new data

## Which Functions Need This Change

### 1. `teacher_upsert_exam_result_primary`
- Used for: Primary school exam results
- DELETE WHERE: `school_id, exam_set_id, student_id, subject`
- Then INSERT

### 2. `teacher_upsert_exam_result_secondary` (O-Level)
- Used for: O-Level exam results
- DELETE WHERE: `school_id, exam_set_id, student_id, subject, exam_topic_key`
- Then INSERT
- **IMPORTANT**: Match on `exam_topic_key` because O-Level has multiple topics per subject

### 3. `teacher_upsert_exam_result_alevel` (A-Level)
- Used for: A-Level exam results  
- DELETE WHERE: `school_id, exam_set_id, student_id, subject, exam_paper_key`
- Then INSERT
- **IMPORTANT**: Match on `exam_paper_key` for A-Level papers

## Expected Behavior

When teacher saves exam results:
1. Old results for that student/exam/subject/topic are deleted
2. New results are inserted fresh
3. No duplicate prevention needed - DELETE ensures clean slate
4. Your unique constraint still prevents accidental duplicates from other sources

## Urgency

**This is blocking ALL exam result saves across the entire system.** Teachers cannot input any exam results until this is fixed.

Please implement this change immediately and confirm when done.
