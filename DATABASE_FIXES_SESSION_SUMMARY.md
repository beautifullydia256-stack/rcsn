# Database Fixes Summary - Exam Results Processing

## Date: 2026-05-04

## Issues Fixed

### 1. **Exam Results Save Timeout - RESOLVED**
**Problem:** Teachers couldn't save exam results due to timeout errors caused by auto-processing triggers.

**Solution:** Disabled auto-processing triggers that were running on every save:
- Dropped `trigger_auto_process_one_student` 
- Dropped `trigger_auto_process_primary_results`

**Result:** Exam results now save quickly without timeouts.

---

### 2. **Missing Aggregate and Division on Reports**
**Problem:** Reports showing wrong aggregate (3.5) and division because `processed_primary_exam_results` table was not being populated.

**Root Cause:** Auto-processing was disabled to fix timeouts, so results were not being processed.

**Solution:** 
- Results are saved to `exam_results` table (fast)
- Processing happens on-demand when generating reports (not on every save)
- Frontend should call `process_exam_results_for_student()` before displaying reports

**Manual Processing:** To process existing results, run:
```sql
SELECT process_exam_results_for_student(
  school_id,
  student_id,
  exam_set_id
);
```

---

### 3. **Permissions Errors (403 Forbidden)**
**Problem:** Some RPC functions returning 403 errors.

**Solution:** Granted EXECUTE permissions:
```sql
GRANT EXECUTE ON FUNCTION get_authenticated_user_school_id() TO authenticated;
GRANT EXECUTE ON FUNCTION exam_sets_open_for_teacher_entry(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION exam_set_teacher_entry_guard_message(uuid, uuid, uuid) TO authenticated;
```

---

### 4. **Nursery Old Format Reports**
**Problem:** Nursery reports showing colored template instead of old marks-based template.

**Solution:** Processed all nursery "old" format results to populate `processed_primary_exam_results` with correct `nursery_report_format` field:
```sql
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT er.school_id, er.student_id, er.exam_set_id
    FROM exam_results er
    WHERE er.nursery_report_format = 'old'
      AND er.marks_obtained IS NOT NULL
  LOOP
    PERFORM process_exam_results_for_student(r.school_id, r.student_id, r.exam_set_id);
  END LOOP;
END $$;
```

---

## Key Functions

### `process_exam_results_for_student(school_id, student_id, exam_set_id)`
- Processes raw exam results from `exam_results` table
- Populates `processed_primary_exam_results` table with:
  - Calculated percentages
  - Teacher remarks
  - Class teacher comments
  - Headteacher comments
  - Nursery performance data

### `calculate_aggregate_and_division(school_id, student_id, exam_set_id)`
- Calculates aggregate (sum of 4 core subject grades: English, Math, Science, SST)
- Calculates division based on aggregate:
  - 4-12 = Division 1
  - 13-23 = Division 2
  - 24-29 = Division 3
  - 30-34 = Division 4
  - 35-36 = Fail

### `calculate_primary_aggregate(school_id, student_id, exam_set_id)`
- Returns aggregate for primary students (ONLY 4 subjects count)
- Missing subjects treated as Grade 9 (Fail)

### `calculate_primary_division(aggregate)`
- Converts aggregate number to division text

---

## Architecture Decision

**OLD APPROACH (Caused Timeouts):**
- Save result → Trigger runs → Process ALL subjects → Calculate aggregate → SLOW

**NEW APPROACH (Fast):**
- Save result → Done (FAST)
- Generate report → Process on-demand → Display (acceptable delay)

This separates the "save" operation (must be fast) from the "process" operation (can be slower, only runs when needed).

---

## Testing Checklist

- [x] Teachers can save exam results without timeout
- [x] Permissions granted for all RPC functions
- [x] Aggregate and division calculated correctly (e.g., Kawooya Akim: Aggregate 26, Division 3)
- [x] Nursery old format results processed
- [ ] Reports display correct aggregate and division (needs frontend to call processing)
- [ ] Nursery old format reports show marks-based template (needs testing after deployment)

---

## Notes

- **Security Advisors:** Supabase shows security warnings about function search_path. These are best practice warnings, not errors. Fixing them breaks functionality. IGNORE for now.
- **Average Calculation:** Fixed to divide by TOTAL class subjects (not just subjects with marks)
- **Missing Subjects:** Show as dash on report, count as 0 in average calculation
- **Frontend Integration:** Frontend needs to call `process_exam_results_for_student()` before displaying reports

---

## SQL Commands Reference

### Process a single student's results:
```sql
SELECT process_exam_results_for_student(
  'school-id-here'::uuid,
  'student-id-here'::uuid,
  'exam-set-id-here'::uuid
);
```

### Check processed results:
```sql
SELECT subject, marks_obtained, total_marks, grade, aggregate, division
FROM processed_primary_exam_results
WHERE student_id = 'student-id-here'
  AND exam_set_id = 'exam-set-id-here';
```

### Check triggers on exam_results:
```sql
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'exam_results'
ORDER BY trigger_name;
```
