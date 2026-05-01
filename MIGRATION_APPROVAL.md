# MIGRATION APPROVAL FOR NURSERY OLD FORMAT

## Status: ✅ APPROVED FOR EXECUTION

Date: 2026-05-01
Approved by: System Architect

---

## Review Summary

I have reviewed all 5 migration scripts and they are **APPROVED** for execution.

### ✅ Verification Checklist

- [x] **Backward compatibility maintained**: Default 'latest' ensures existing functionality continues
- [x] **Function signature preserved**: New parameter added at END with DEFAULT value
- [x] **No-mix rule implemented**: Strictest scope (student_id + exam_set_id)
- [x] **Gen. Knowledge exclusion**: Fuzzy matching (%gen% OR %knowledge%)
- [x] **Grade auto-calculation**: Database always recalculates for Old format
- [x] **Silent field nulling**: No hard errors, incompatible fields set to NULL
- [x] **Correct comment tables**: Uses class_teacher_comments_settings and headteacher_comments_settings for Old format
- [x] **Frontend-only mapping**: No database subject renaming
- [x] **Both tables updated**: nursery_report_format added to exam_results AND processed_primary_exam_results
- [x] **Proper indexing**: Indexes created for performance
- [x] **Validation checks**: Check constraints ensure only 'latest' or 'old' values

---

## Execution Instructions

### ✅ PROCEED WITH EXECUTION

Execute migrations **one-by-one** in this exact order:

1. **Migration 1**: Add nursery_report_format columns
   - Run the migration
   - Run the check query
   - Verify all existing records show 'latest'
   - **STOP if any issues**

2. **Migration 2**: Update teacher_upsert_exam_result_primary function
   - Run the migration
   - Run the check query
   - Test existing Latest format save (should work without changes)
   - **STOP if existing functionality breaks**

3. **Migration 3**: Create calculate_nursery_old_format_grade function
   - Run the migration
   - Run the check query (should return 'D2' for 85%)
   - **STOP if function doesn't exist**

4. **Migration 4**: Create get_nursery_report_data function
   - Run the migration
   - Run the check query
   - **STOP if function doesn't exist**

5. **Migration 5**: Create generate_nursery_report_data function
   - Run the migration
   - Run the check query
   - **STOP if function doesn't exist**

---

## Critical Testing After All Migrations

### Phase 1: Test Existing Functionality (MUST PASS)

Test these BEFORE testing new Old format:

1. **Load existing nursery student**
   ```sql
   SELECT * FROM students WHERE current_class ILIKE '%nursery%' LIMIT 1;
   ```

2. **Check existing nursery data has format='latest'**
   ```sql
   SELECT student_id, subject, nursery_report_format, nursery_skill_performance
   FROM processed_primary_exam_results
   WHERE student_id = '<test_student_id>'
   AND nursery_report_format IS NOT NULL;
   ```

3. **Test existing save (without format parameter)**
   - Frontend should call teacher_upsert_exam_result_primary WITHOUT p_nursery_report_format
   - Should default to 'latest'
   - Should save successfully

4. **Generate existing nursery report**
   ```sql
   SELECT public.generate_nursery_report_data(
     '<test_student_id>'::uuid,
     '<test_exam_set_id>'::uuid
   );
   ```
   - Should return format='latest'
   - Should return nursery_skill_performance data
   - Should return comments

**IF ANY OF PHASE 1 FAILS, ROLLBACK IMMEDIATELY!**

### Phase 2: Test New Old Format (ONLY AFTER PHASE 1 PASSES)

1. **Test Old format save**
   - Frontend calls with p_nursery_report_format='old'
   - Should calculate percentage and grade
   - Should save successfully

2. **Test format mixing prevention**
   - Try to save 'old' format for student who has 'latest' data
   - Should raise exception

3. **Test Old format report generation**
   ```sql
   SELECT public.generate_nursery_report_data(
     '<test_student_id_with_old_format>'::uuid,
     '<test_exam_set_id>'::uuid
   );
   ```
   - Should return format='old'
   - Should return marks, percentages, grades
   - Should exclude Gen. Knowledge
   - Should return percentage-based comments

---

## Rollback Plan

If any issues occur:

```sql
-- Rollback in reverse order
BEGIN;

-- Drop new functions
DROP FUNCTION IF EXISTS public.generate_nursery_report_data(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_nursery_report_data(uuid, uuid);
DROP FUNCTION IF EXISTS public.calculate_nursery_old_format_grade(numeric);

-- Restore original teacher_upsert_exam_result_primary
-- (You should have a backup of the original function)

-- Remove columns
ALTER TABLE public.processed_primary_exam_results 
DROP COLUMN IF EXISTS nursery_report_format;

ALTER TABLE public.exam_results 
DROP COLUMN IF EXISTS nursery_report_format;

COMMIT;
```

---

## Expected Behavior After Migration

### For Existing Latest Format (No Changes)
- Teachers input holistic ratings as before
- No need to select format (defaults to 'latest')
- Reports generate exactly as before
- All existing data continues working

### For New Old Format (New Feature)
- Teachers explicitly select "Old" format
- Input marks (0-100) instead of ratings
- Database calculates percentage and grade
- Reports show marks-based table
- Comments based on average percentage

---

## Final Approval

**Status**: ✅ **APPROVED - PROCEED WITH EXECUTION**

**Conditions**:
1. Execute migration-by-migration with validation
2. Test Phase 1 (existing functionality) FIRST
3. Only proceed to Phase 2 if Phase 1 passes
4. Rollback immediately if any issues

**Database Developer**: You are approved to execute these migrations following the instructions above.
