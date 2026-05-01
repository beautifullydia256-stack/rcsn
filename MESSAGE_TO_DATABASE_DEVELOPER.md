# Issue: Class Teacher Comment Not Showing in Report Preview

## Problem Description
When previewing nursery class reports:
- ✅ **Head Teacher's comment IS showing** correctly
- ❌ **Class Teacher's comment IS NOT showing** (missing/empty)

## What I Need From You

### 1. Diagnostic Query
Please run the queries in `INVESTIGATE_MISSING_CLASS_TEACHER_COMMENT.sql` and share the results. This will help us understand:
- Are `class_teacher_comment` values NULL or empty in `processed_primary_exam_results`?
- Are the nursery comment settings properly configured in both tables?
- Is there a pattern difference between how class_teacher_comment and headteacher_comment are populated?

### 2. Key Questions

**Question 1:** When you run `public.resolve_processed_comments(...)`, does it populate BOTH `class_teacher_comment` AND `headteacher_comment` columns in `processed_primary_exam_results`?

**Question 2:** For nursery classes (Baby Class, Middle Class, Top Class), does your `resolve_nursery_overall_performance_level(...)` function return the performance level that is then used to look up BOTH comments from:
- `class_teacher_nursery_comment_settings` → `class_teacher_comment`
- `headteacher_nursery_comment_settings` → `headteacher_comment`

**Question 3:** Can you verify that the triggers are firing for BOTH comment types? Check:
```sql
-- Are both columns being updated?
SELECT 
  student_id,
  class_name,
  class_teacher_comment IS NOT NULL as has_class_comment,
  headteacher_comment IS NOT NULL as has_head_comment,
  class_teacher_comment,
  headteacher_comment
FROM processed_primary_exam_results
WHERE class_name IN ('Baby Class', 'Middle Class', 'Top Class')
LIMIT 5;
```

### 3. Expected Behavior

For a nursery student with performance level "VERY_GOOD":
1. System counts 15 skills → determines most frequent level = "VERY_GOOD"
2. System looks up in `class_teacher_nursery_comment_settings` WHERE performance_level = 'VERY_GOOD' → gets comment A
3. System looks up in `headteacher_nursery_comment_settings` WHERE performance_level = 'VERY_GOOD' → gets comment B
4. System writes to `processed_primary_exam_results`:
   - `class_teacher_comment` = comment A
   - `headteacher_comment` = comment B

**Currently:** Only step 4's `headteacher_comment` seems to be working. Step 4's `class_teacher_comment` is missing.

### 4. What I Suspect

Since headteacher_comment IS working, the logic is partially correct. Possible issues:
- The `resolve_processed_comments()` function might only be setting `headteacher_comment` and not `class_teacher_comment`
- The nursery comment resolution might be looking up from the wrong table for class teacher
- There might be a typo in column names or table references

### 5. What I Need You To Fix

Please ensure that `public.resolve_processed_comments(...)` function:
1. Resolves the nursery performance level (you already do this)
2. Looks up the comment from `class_teacher_nursery_comment_settings` table
3. Looks up the comment from `headteacher_nursery_comment_settings` table  
4. Updates BOTH columns in `processed_primary_exam_results`:
   - `class_teacher_comment` = value from class_teacher_nursery_comment_settings
   - `headteacher_comment` = value from headteacher_nursery_comment_settings

## Frontend Code (For Reference)

The frontend reads comments from the Edge Function response at:
```typescript
comments: {
  class_teacher_text: firstSummaryRecord.class_teacher_comment || firstRecord.class_teacher_comment || '',
  headteacher_text: firstSummaryRecord.headteacher_comment || firstRecord.headteacher_comment || '',
}
```

The Edge Function gets these from `processed_primary_exam_results` table:
```typescript
class_teacher_comment: resolvedComments[result.student_id]?.classTeacher || '',
headteacher_comment: resolvedComments[result.student_id]?.headTeacher || '',
```

Which reads from:
```typescript
const fromDb = processedByStudent[student.student_id];
resolvedComments[student.student_id] = {
  classTeacher: savedClassTeacher || fromDb?.class_teacher_comment || '',
  headTeacher: savedHeadTeacher || fromDb?.headteacher_comment || '',
};
```

So the frontend is correctly reading from the database. The issue must be that `class_teacher_comment` is not being populated in the database.

## Action Required

Please check your `resolve_processed_comments()` function and ensure it's setting BOTH comment columns for nursery classes. Share the relevant part of that function so I can verify the logic.
