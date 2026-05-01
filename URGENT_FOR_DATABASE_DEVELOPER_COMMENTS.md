# URGENT: Report Comments Are Empty - Need Backfill

## Problem
Primary school report cards are showing fallback comments instead of real comments:
- Class Teacher's Comments: "Good progress. Keep it up." (fallback)
- Headteacher's Comments: "Approved." (fallback)

This means the `processed_primary_exam_results` table has NULL or empty values in:
- `class_teacher_comment` column
- `headteacher_comment` column

## What You Need To Do

### Step 1: Run Diagnostic
Run the queries in `CHECK_REPORT_COMMENTS_IN_DB.sql` to verify:
1. Are comments NULL/empty in `processed_primary_exam_results`?
2. Do comment settings exist in the settings tables?
3. Are the triggers working?

### Step 2: Run Backfill
If comments are empty, you need to run the backfill function you created:

```sql
-- Backfill ALL reports for the school
SELECT public.refresh_processed_comments(
  (SELECT school_id FROM users WHERE role = 'owner' LIMIT 1),
  NULL,  -- all classes
  NULL   -- all exam sets
);
```

This should:
1. Calculate the average percentage for each student
2. Look up the appropriate comment from settings tables based on percentage
3. Update `class_teacher_comment` and `headteacher_comment` in `processed_primary_exam_results`

### Step 3: Verify
After running backfill, check again:

```sql
-- Should now show non-zero counts
SELECT 
  COUNT(*) as total_rows,
  SUM(CASE WHEN class_teacher_comment IS NOT NULL AND class_teacher_comment != '' THEN 1 ELSE 0 END) as rows_with_class_comment,
  SUM(CASE WHEN headteacher_comment IS NOT NULL AND headteacher_comment != '' THEN 1 ELSE 0 END) as rows_with_head_comment
FROM processed_primary_exam_results
WHERE school_id = (SELECT school_id FROM users WHERE role = 'owner' LIMIT 1);
```

## Expected Result

After backfill, reports should show real comments like:
- Class Teacher: "Excellent work! Your hard work and good behavior make the school proud. Keep it up." (for 81-100%)
- Headteacher: "Wonderful job! Keep shining and bringing joy to our class." (for VERY_GOOD nursery)

Instead of the fallback:
- Class Teacher: "Good progress. Keep it up."
- Headteacher: "Approved."

## Why This Happened

The `resolve_processed_comments()` function you created is correct, but it was never RUN on existing data. The function needs to be executed to populate the comments.

The triggers you added will handle NEW data going forward, but existing reports need a one-time backfill.

## Urgency

**All primary school reports are showing generic fallback comments instead of personalized comments based on student performance.** This makes reports look unprofessional and doesn't provide meaningful feedback to parents.

Please run the backfill immediately and confirm when done.
