# Instructions for Database Developer

## Request Summary

We need to add **"Writing"** as a 6th subject for Nursery Old Format (marks-based) reports.

---

## What Was Done on Frontend

### 1. Added "Writing" Subject to Nursery Strands
**File**: `src/templates/primary/prePrimaryHolisticRatings.ts`

Added a new strand:
```typescript
{
  subject: 'Writing',
  skills: [
    { key: 'writing', label: 'Writing' },
  ],
}
```

This makes "Writing" appear in the teacher's subject dropdown when entering nursery old format results.

### 2. Added Image Mapping
**File**: `src/components/reports/templates/nurseryOldFormatTemplate.tsx`

Added image mapping:
```typescript
'writing': 'writing.png',
```

The image file already exists at: `public/pre-primary-skill-art/writing.png`

---

## What Frontend Expects from Database

### Current Behavior (Already Working for 5 Subjects)

When a teacher enters nursery old format results, the system:

1. Calls RPC function: `teacher_upsert_exam_result_primary()`
2. Passes parameters:
   ```sql
   p_school_id: uuid
   p_exam_set_id: uuid
   p_student_id: uuid
   p_class_name: text (e.g., 'Baby Class', 'Middle Class')
   p_subject: text (e.g., 'Relating with others (Social development)')
   p_marks_obtained: numeric (e.g., 85)
   p_total_marks: numeric (e.g., 100)
   p_grade: text (null - database calculates)
   p_remarks: text
   p_teacher_id: text
   p_teacher_comment: text
   p_nursery_skills: jsonb (null for old format)
   p_nursery_report_format: text ('old')
   ```

3. Database saves to `exam_results` table

### What We Need for "Writing" Subject

**The same behavior should work for subject = 'Writing'**

The `exam_results` table should accept:
```sql
INSERT INTO exam_results (
  school_id,
  exam_set_id,
  student_id,
  class_name,
  subject,  -- This should accept 'Writing'
  marks_obtained,
  total_marks,
  grade,
  remarks,
  nursery_report_format
) VALUES (
  '...',
  '...',
  '...',
  'Baby Class',
  'Writing',  -- NEW subject name
  85,
  100,
  'D1',
  'Good work',
  'old'
);
```

---

## Questions for Database Developer

### 1. Does the `exam_results.subject` column have any constraints?

**Check if there's:**
- A CHECK constraint limiting subject values?
- A foreign key to a subjects table?
- An ENUM type restricting values?

**If YES**: Please remove the constraint or add 'Writing' to the allowed values.

**If NO**: Then it should already work! No changes needed.

### 2. Does `teacher_upsert_exam_result_primary()` validate subject names?

**Check if the function:**
- Has a hardcoded list of allowed subjects?
- Validates subject against a table?
- Rejects unknown subject names?

**If YES**: Please add 'Writing' to the allowed list.

**If NO**: Then it should already work! No changes needed.

---

## Expected Database Schema (Should Already Exist)

```sql
-- exam_results table
CREATE TABLE exam_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  exam_set_id uuid NOT NULL,
  student_id uuid NOT NULL,
  class_name text NOT NULL,
  subject text NOT NULL,  -- Should accept ANY text including 'Writing'
  marks_obtained numeric,
  total_marks numeric,
  grade text,
  remarks text,
  teacher_id text,
  teacher_comment text,
  nursery_skill_performance jsonb,
  nursery_report_format text,  -- 'old' or 'latest'
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);
```

**Key Point**: The `subject` column should be `text` type with no constraints.

---

## Testing Query

After any database changes, please verify with:

```sql
-- Test 1: Can we insert Writing subject?
INSERT INTO exam_results (
  school_id,
  exam_set_id,
  student_id,
  class_name,
  subject,
  marks_obtained,
  total_marks,
  grade,
  nursery_report_format
) VALUES (
  (SELECT id FROM schools LIMIT 1),
  (SELECT id FROM exam_sets WHERE is_active = true LIMIT 1),
  (SELECT student_id FROM students LIMIT 1),
  'Baby Class',
  'Writing',  -- NEW subject
  85,
  100,
  'D1',
  'old'
);

-- Test 2: Can we query Writing results?
SELECT * FROM exam_results 
WHERE subject = 'Writing' 
  AND nursery_report_format = 'old';

-- Test 3: Does the RPC function accept Writing?
SELECT teacher_upsert_exam_result_primary(
  (SELECT id FROM schools LIMIT 1),
  (SELECT id FROM exam_sets WHERE is_active = true LIMIT 1),
  (SELECT student_id FROM students LIMIT 1),
  'Baby Class',
  'Writing',  -- NEW subject
  85,
  100,
  NULL,
  'Good work',
  (SELECT id FROM teachers LIMIT 1)::text,
  NULL,
  NULL,
  'old'
);
```

---

## Most Likely Scenario

**The database probably already supports this!**

The `subject` column is likely just `text` type with no constraints, which means:
- ✅ No database changes needed
- ✅ Frontend changes already deployed
- ✅ Teachers can start using "Writing" immediately

**Please verify by running Test 1 above.** If it works, we're done!

---

## If Database Changes Are Needed

If you find constraints that need updating, please:

1. **Remove any CHECK constraints** on `exam_results.subject`
2. **Add 'Writing' to any subject validation** in `teacher_upsert_exam_result_primary()`
3. **Test the queries above** to confirm it works
4. **Let us know** when it's ready

---

## Summary for Database Developer

**What we need**: The database should accept `subject = 'Writing'` for nursery old format results.

**What to check**:
1. Is `exam_results.subject` column type `text` with no constraints? ✅ Should work
2. Does `teacher_upsert_exam_result_primary()` validate subjects? ❓ Please check
3. Can you run the test queries above successfully? ❓ Please verify

**Expected result**: Teachers should be able to save marks for "Writing" subject just like the existing 5 subjects.

---

## Contact

If you have questions or need clarification, please ask!

**Frontend Status**: ✅ Ready (changes already deployed)  
**Database Status**: ❓ Awaiting verification from database developer
