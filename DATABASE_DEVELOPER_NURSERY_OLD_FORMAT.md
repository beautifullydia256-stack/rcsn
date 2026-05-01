# Database Developer Instructions: Nursery Old Format Implementation

## ⚠️ CRITICAL: BACKWARD COMPATIBILITY REQUIREMENT

**THE CURRENT SYSTEM MUST CONTINUE WORKING EXACTLY AS IT IS NOW!**

This implementation is ADDING a new format option, NOT replacing the existing one:
- **Existing "Latest" format**: Must continue working with ZERO changes to current behavior
- **New "Old" format**: Being added as an additional option

**DO NOT BREAK EXISTING FUNCTIONALITY!**

## Overview
We are implementing a dual-format system for nursery reports:
1. **Latest Format** (existing): Holistic ratings stored in `nursery_skill_performance` JSON - **MUST KEEP WORKING AS-IS**
2. **Old Format** (new): Marks-based system (0-100) like Primary 1-7, stored in standard marks fields - **NEW ADDITION**

## Key Requirements

### Format Separation
- **CRITICAL**: The two formats use COMPLETELY DIFFERENT data storage
- Latest format: Uses `nursery_skill_performance` JSON field
- Old format: Uses `marks_obtained`, `total_marks`, `percentage`, `grade` fields (same as Primary 1-7)
- **Cannot mix formats** for the same exam set
- Format is determined at exam input time, not report generation time

### Subject Name Mapping (Display Only)
Database names **DO NOT CHANGE**. Only frontend display changes for Old format:
- "Relating with others" → displays as "Learning Area 1"
- "Relating and knowing environment" → displays as "Learning Area 2"
- "Taking care of myself" → displays as "Learning Area 3"
- "Mathematics and Concepts" → displays as "Learning Area 4"
- "Development and using my language" → displays as "Learning Area 5"
- **"Gen. Knowledge"** → EXCLUDED from Old format reports (filter out)

### Comment System Differences
- **Latest Format**: Comments based on performance level (Very Good, Good, etc.)
  - Uses: `class_teacher_nursery_comment_settings`
  - Uses: `headteacher_nursery_comment_settings`
  
- **Old Format**: Comments based on average percentage (like Primary 1-7)
  - Uses: `class_teacher_comments_settings` (same table as Primary 1-7)
  - Uses: `headteacher_comments_settings` (same table as Primary 1-7)

## Database Changes Required

### 1. Add Format Indicator Column

**Migration 1: Add nursery_report_format column**

**IMPORTANT: This column defaults to 'latest' to maintain backward compatibility!**
- All existing nursery data will automatically be 'latest' format
- Existing functionality continues working without any changes
- Only NEW data can explicitly choose 'old' format

```sql
-- Add column to exam_results table (where data is first saved)
ALTER TABLE exam_results 
ADD COLUMN IF NOT EXISTS nursery_report_format VARCHAR(20) DEFAULT 'latest';

-- Add column to processed_primary_exam_results table (for report generation)
ALTER TABLE processed_primary_exam_results 
ADD COLUMN IF NOT EXISTS nursery_report_format VARCHAR(20) DEFAULT 'latest';

-- Add check constraint to ensure only valid values
ALTER TABLE exam_results
ADD CONSTRAINT check_exam_results_nursery_format 
CHECK (nursery_report_format IN ('latest', 'old'));

ALTER TABLE processed_primary_exam_results
ADD CONSTRAINT check_processed_nursery_format 
CHECK (nursery_report_format IN ('latest', 'old'));

-- Add comments
COMMENT ON COLUMN exam_results.nursery_report_format IS 
'Format type for nursery reports: latest (holistic ratings - DEFAULT) or old (marks-based). Defaults to latest for backward compatibility.';

COMMENT ON COLUMN processed_primary_exam_results.nursery_report_format IS 
'Format type for nursery reports: latest (holistic ratings - DEFAULT) or old (marks-based). Defaults to latest for backward compatibility.';

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_exam_results_nursery_format 
ON exam_results(nursery_report_format) 
WHERE nursery_report_format IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_processed_nursery_format 
ON processed_primary_exam_results(nursery_report_format) 
WHERE nursery_report_format IS NOT NULL;

-- CRITICAL: Update all existing NULL values to 'latest' to maintain current behavior
UPDATE exam_results 
SET nursery_report_format = 'latest' 
WHERE nursery_report_format IS NULL;

UPDATE processed_primary_exam_results 
SET nursery_report_format = 'latest' 
WHERE nursery_report_format IS NULL;
```

### 2. Modify Existing RPC Functions

The frontend currently calls these RPC functions to save exam results:
- `teacher_upsert_exam_result_primary()`

**You need to modify this function to:**

#### A. Accept new parameter for format

**CRITICAL: Add parameter at END with DEFAULT 'latest' for backward compatibility!**

This ensures:
- Existing frontend calls without the parameter continue working (default to 'latest')
- New frontend calls can explicitly pass 'old' format
- NO BREAKING CHANGES to current functionality

```sql
CREATE OR REPLACE FUNCTION teacher_upsert_exam_result_primary(
  p_student_id UUID,
  p_exam_set_id UUID,
  p_subject TEXT,
  p_marks_obtained NUMERIC DEFAULT NULL,
  p_total_marks NUMERIC DEFAULT 100,
  p_grade TEXT DEFAULT NULL,
  p_remark TEXT DEFAULT NULL,
  p_teacher_initials TEXT DEFAULT NULL,
  p_nursery_skill_performance JSONB DEFAULT NULL,
  p_nursery_report_format TEXT DEFAULT 'latest'  -- NEW PARAMETER AT END WITH DEFAULT
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_class_name TEXT;
  v_is_nursery BOOLEAN;
  v_percentage NUMERIC;
  v_final_grade TEXT;
BEGIN
  -- Get student's class
  SELECT current_class INTO v_class_name
  FROM students
  WHERE student_id = p_student_id;

  -- Check if nursery class
  v_is_nursery := v_class_name ILIKE '%baby%' 
    OR v_class_name ILIKE '%nursery%' 
    OR v_class_name ILIKE '%pre-primary%';

  -- Validate format parameter (only for nursery classes)
  IF v_is_nursery AND p_nursery_report_format NOT IN ('latest', 'old') THEN
    RAISE EXCEPTION 'Invalid nursery_report_format. Must be "latest" or "old"';
  END IF;

  -- For NON-nursery classes, always use NULL format (not applicable)
  IF NOT v_is_nursery THEN
    p_nursery_report_format := NULL;
  END IF;

  -- BACKWARD COMPATIBILITY: If format not specified, default to 'latest' for nursery
  IF v_is_nursery AND p_nursery_report_format IS NULL THEN
    p_nursery_report_format := 'latest';
  END IF;

  -- Check for format mixing (only for nursery classes)
  IF v_is_nursery AND EXISTS (
    SELECT 1 FROM processed_primary_exam_results
    WHERE student_id = p_student_id
      AND exam_set_id = p_exam_set_id
      AND nursery_report_format IS NOT NULL
      AND nursery_report_format != p_nursery_report_format
  ) THEN
    RAISE EXCEPTION 'Cannot mix formats for same student and exam set. Existing format: %, attempted: %',
      (SELECT nursery_report_format FROM processed_primary_exam_results 
       WHERE student_id = p_student_id AND exam_set_id = p_exam_set_id LIMIT 1),
      p_nursery_report_format;
  END IF;

  -- For nursery Old format, calculate percentage and grade
  IF v_is_nursery AND p_nursery_report_format = 'old' THEN
    IF p_marks_obtained IS NOT NULL AND p_total_marks > 0 THEN
      v_percentage := (p_marks_obtained / p_total_marks) * 100;
      -- Always recalculate grade (ignore frontend value)
      v_final_grade := calculate_nursery_old_format_grade(v_percentage);
    ELSE
      v_percentage := NULL;
      v_final_grade := NULL;
    END IF;
    -- Force null for Latest format fields
    p_nursery_skill_performance := NULL;
  ELSIF v_is_nursery AND p_nursery_report_format = 'latest' THEN
    -- For Latest format, force null for Old format fields
    p_marks_obtained := NULL;
    p_total_marks := NULL;
    v_percentage := NULL;
    v_final_grade := NULL;
    p_remark := NULL;
    p_teacher_initials := NULL;
  ELSE
    -- For non-nursery classes, use provided values as-is
    v_percentage := NULL;
    v_final_grade := p_grade;
  END IF;

  -- Delete existing record (to handle exam_topic_key constraint)
  DELETE FROM processed_primary_exam_results
  WHERE student_id = p_student_id
    AND exam_set_id = p_exam_set_id
    AND subject = p_subject;

  -- Insert new record
  INSERT INTO processed_primary_exam_results (
    student_id,
    exam_set_id,
    subject,
    marks_obtained,
    total_marks,
    percentage,
    grade,
    remark,
    teacher_initials,
    nursery_skill_performance,
    nursery_report_format,
    exam_topic_key
  ) VALUES (
    p_student_id,
    p_exam_set_id,
    p_subject,
    p_marks_obtained,
    p_total_marks,
    v_percentage,
    v_final_grade,
    p_remark,
    p_teacher_initials,
    p_nursery_skill_performance,
    p_nursery_report_format,
    DEFAULT  -- Let database generate exam_topic_key
  )
  RETURNING jsonb_build_object(
    'success', true,
    'student_id', student_id,
    'exam_set_id', exam_set_id,
    'subject', subject,
    'format', nursery_report_format
  ) INTO v_result;

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3. Create Function to Fetch Report Data with Format Detection

**Migration 2: Create function to get nursery report data**

```sql
CREATE OR REPLACE FUNCTION get_nursery_report_data(
  p_student_id UUID,
  p_exam_set_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_format TEXT;
  v_class_name TEXT;
  v_results JSONB;
  v_average_percentage NUMERIC;
  v_class_teacher_comment TEXT;
  v_headteacher_comment TEXT;
BEGIN
  -- Get student's class
  SELECT current_class INTO v_class_name
  FROM students
  WHERE student_id = p_student_id;

  -- Detect format from existing data
  SELECT DISTINCT nursery_report_format INTO v_format
  FROM processed_primary_exam_results
  WHERE student_id = p_student_id
    AND exam_set_id = p_exam_set_id
    AND nursery_report_format IS NOT NULL
  LIMIT 1;

  -- Default to 'latest' if no data exists yet
  v_format := COALESCE(v_format, 'latest');

  -- Get results based on format
  IF v_format = 'old' THEN
    -- Old format: Get marks-based results
    SELECT jsonb_agg(
      jsonb_build_object(
        'subject', subject,
        'marks_obtained', marks_obtained,
        'total_marks', total_marks,
        'percentage', percentage,
        'grade', grade,
        'remark', remark,
        'teacher_initials', teacher_initials
      ) ORDER BY subject
    ) INTO v_results
    FROM processed_primary_exam_results
    WHERE student_id = p_student_id
      AND exam_set_id = p_exam_set_id
      AND nursery_report_format = 'old'
      AND LOWER(subject) NOT LIKE '%gen%'  -- Exclude Gen. Knowledge
      AND LOWER(subject) NOT LIKE '%knowledge%';

    -- Calculate average percentage for Old format
    SELECT AVG(percentage) INTO v_average_percentage
    FROM processed_primary_exam_results
    WHERE student_id = p_student_id
      AND exam_set_id = p_exam_set_id
      AND nursery_report_format = 'old'
      AND percentage IS NOT NULL
      AND LOWER(subject) NOT LIKE '%gen%'
      AND LOWER(subject) NOT LIKE '%knowledge%';

    -- Get comments based on average percentage (like Primary 1-7)
    SELECT comment_text INTO v_class_teacher_comment
    FROM class_teacher_comments_settings
    WHERE school_id = (SELECT school_id FROM students WHERE student_id = p_student_id)
      AND class_name = v_class_name
      AND v_average_percentage >= min_percentage
      AND v_average_percentage <= max_percentage
    ORDER BY min_percentage DESC
    LIMIT 1;

    SELECT comment_text INTO v_headteacher_comment
    FROM headteacher_comments_settings
    WHERE school_id = (SELECT school_id FROM students WHERE student_id = p_student_id)
      AND class_name = v_class_name
      AND v_average_percentage >= min_percentage
      AND v_average_percentage <= max_percentage
    ORDER BY min_percentage DESC
    LIMIT 1;

  ELSE
    -- Latest format: Get holistic ratings
    SELECT jsonb_agg(
      jsonb_build_object(
        'subject', subject,
        'nursery_skill_performance', nursery_skill_performance
      ) ORDER BY subject
    ) INTO v_results
    FROM processed_primary_exam_results
    WHERE student_id = p_student_id
      AND exam_set_id = p_exam_set_id
      AND nursery_report_format = 'latest';

    -- Get comments from processed_primary_exam_results (already resolved)
    SELECT 
      class_teacher_comment,
      headteacher_comment
    INTO 
      v_class_teacher_comment,
      v_headteacher_comment
    FROM processed_primary_exam_results
    WHERE student_id = p_student_id
      AND exam_set_id = p_exam_set_id
      AND nursery_report_format = 'latest'
    LIMIT 1;
  END IF;

  -- Build final result
  v_result := jsonb_build_object(
    'format', v_format,
    'results', COALESCE(v_results, '[]'::jsonb),
    'average_percentage', v_average_percentage,
    'class_teacher_comment', COALESCE(v_class_teacher_comment, 'Good progress. Keep it up.'),
    'headteacher_comment', COALESCE(v_headteacher_comment, 'Approved.'),
    'class_name', v_class_name
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'format', 'latest',
      'results', '[]'::jsonb
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_nursery_report_data(UUID, UUID) TO authenticated;
```

### 4. Create Function to Calculate Nursery Old Format Grade

**Migration 3: Create grade calculation function**

```sql
CREATE OR REPLACE FUNCTION calculate_nursery_old_format_grade(
  p_percentage NUMERIC
) RETURNS TEXT AS $$
BEGIN
  -- Grade scale for Old format (same as Primary 1-7)
  IF p_percentage >= 90 THEN RETURN 'D1';
  ELSIF p_percentage >= 80 THEN RETURN 'D2';
  ELSIF p_percentage >= 70 THEN RETURN 'C3';
  ELSIF p_percentage >= 60 THEN RETURN 'C4';
  ELSIF p_percentage >= 50 THEN RETURN 'C5';
  ELSIF p_percentage >= 40 THEN RETURN 'C6';
  ELSIF p_percentage >= 30 THEN RETURN 'P7';
  ELSIF p_percentage >= 20 THEN RETURN 'P8';
  ELSE RETURN 'F9';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION calculate_nursery_old_format_grade(NUMERIC) TO authenticated;
```

### 5. Update Report Generation Function

**Migration 4: Modify report generation to handle both formats**

```sql
CREATE OR REPLACE FUNCTION generate_nursery_report_data(
  p_student_id UUID,
  p_exam_set_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_student_data JSONB;
  v_nursery_data JSONB;
  v_school_data JSONB;
  v_exam_set_data JSONB;
BEGIN
  -- Get student basic info
  SELECT jsonb_build_object(
    'student_id', s.student_id,
    'name', s.name,
    'admission_number', s.admission_number,
    'current_class', s.current_class,
    'stream', s.stream,
    'school_id', s.school_id
  ) INTO v_student_data
  FROM students s
  WHERE s.student_id = p_student_id;

  -- Get nursery-specific data (format-aware)
  v_nursery_data := get_nursery_report_data(p_student_id, p_exam_set_id);

  -- Get school info
  SELECT jsonb_build_object(
    'name', name,
    'subtitle', subtitle,
    'address', address,
    'pobox', pobox,
    'contact_email', contact_email,
    'contact_phone', contact_phone,
    'motto', motto,
    'logo_url', logo_url,
    'header_school_name_color', header_school_name_color,
    'header_subtitle_color', header_subtitle_color,
    'header_address_color', header_address_color,
    'header_contact_color', header_contact_color,
    'header_motto_color', header_motto_color
  ) INTO v_school_data
  FROM schools
  WHERE school_id = (v_student_data->>'school_id')::UUID;

  -- Get exam set info
  SELECT jsonb_build_object(
    'exam_set_id', exam_set_id,
    'name', name,
    'term', term,
    'year', year,
    'date', date
  ) INTO v_exam_set_data
  FROM exam_sets
  WHERE exam_set_id = p_exam_set_id;

  -- Combine all data
  RETURN jsonb_build_object(
    'student', v_student_data,
    'school', v_school_data,
    'examSet', v_exam_set_data,
    'nurseryData', v_nursery_data,
    'format', v_nursery_data->>'format',
    'results', v_nursery_data->'results',
    'comments', jsonb_build_object(
      'class_teacher_text', v_nursery_data->>'class_teacher_comment',
      'head_teacher_text', v_nursery_data->>'headteacher_comment'
    ),
    'summary', jsonb_build_object(
      'averagePercentage', v_nursery_data->>'average_percentage'
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION generate_nursery_report_data(UUID, UUID) TO authenticated;
```

## Frontend Integration Points

### 1. Saving Exam Results

**BACKWARD COMPATIBLE: Existing calls continue working!**

**Existing calls (Latest format - NO CHANGES NEEDED):**
```typescript
// This continues working exactly as before!
await supabase.rpc('teacher_upsert_exam_result_primary', {
  p_student_id: studentId,
  p_exam_set_id: examSetId,
  p_subject: subject,
  p_nursery_skill_performance: skillPerformanceJson
  // p_nursery_report_format defaults to 'latest' automatically
});
```

**New calls (Old format - ONLY WHEN USER SELECTS OLD FORMAT):**
```typescript
// For Old format
await supabase.rpc('teacher_upsert_exam_result_primary', {
  p_student_id: studentId,
  p_exam_set_id: examSetId,
  p_subject: subject,
  p_marks_obtained: marks,
  p_total_marks: 100,
  p_remark: remark,
  p_teacher_initials: initials,
  p_nursery_report_format: 'old'  // EXPLICITLY SET TO 'old'
});
```

### 2. Generating Reports

**Frontend will call:**
```typescript
const { data } = await supabase.rpc('generate_nursery_report_data', {
  p_student_id: studentId,
  p_exam_set_id: examSetId
});

// Response structure:
{
  format: 'old' | 'latest',
  student: { ... },
  school: { ... },
  examSet: { ... },
  results: [
    // For 'old' format:
    {
      subject: 'Relating with others',
      marks_obtained: 85,
      total_marks: 100,
      percentage: 85.0,
      grade: 'D2',
      remark: 'Excellent',
      teacher_initials: 'JD'
    },
    // For 'latest' format:
    {
      subject: 'Relating with others',
      nursery_skill_performance: { ... }
    }
  ],
  comments: {
    class_teacher_text: '...',
    head_teacher_text: '...'
  },
  summary: {
    averagePercentage: 85.5  // Only for 'old' format
  }
}
```

## Data Validation Rules

### Old Format
1. `marks_obtained` must be between 0 and `total_marks`
2. `total_marks` defaults to 100
3. `percentage` is auto-calculated: (marks_obtained / total_marks) * 100
4. `grade` is auto-calculated using `calculate_nursery_old_format_grade()`
5. `nursery_skill_performance` must be NULL
6. `nursery_report_format` must be 'old'
7. Exclude subjects containing "gen" or "knowledge" (case-insensitive)

### Latest Format
1. `marks_obtained` must be NULL
2. `total_marks` must be NULL
3. `percentage` must be NULL
4. `grade` must be NULL
5. `nursery_skill_performance` must be valid JSONB
6. `nursery_report_format` must be 'latest'

## Testing Checklist

After implementing these changes, test:

1. **Save Old Format Data**
   - [ ] Can save marks (0-100) for nursery subjects
   - [ ] Percentage is calculated correctly
   - [ ] Grade is calculated correctly (D1-F9)
   - [ ] Format is saved as 'old'
   - [ ] Gen. Knowledge is excluded

2. **Save Latest Format Data**
   - [ ] Can save holistic ratings
   - [ ] Format is saved as 'latest'
   - [ ] Marks fields are NULL

3. **Fetch Report Data**
   - [ ] Old format returns marks, percentages, grades
   - [ ] Latest format returns skill performance JSON
   - [ ] Format is correctly detected
   - [ ] Average percentage calculated for Old format

4. **Comments Resolution**
   - [ ] Old format uses percentage-based comments
   - [ ] Latest format uses performance-level comments
   - [ ] Comments fetch from correct tables

5. **Data Integrity**
   - [ ] Cannot mix formats for same exam set
   - [ ] Format indicator is always set
   - [ ] No orphaned data

## Migration Execution Order

Run migrations in this exact order:

1. **Migration 1**: Add `nursery_report_format` column
2. **Migration 2**: Create `get_nursery_report_data()` function
3. **Migration 3**: Create `calculate_nursery_old_format_grade()` function
4. **Migration 4**: Create `generate_nursery_report_data()` function
5. **Migration 5**: Modify `teacher_upsert_exam_result_primary()` function

## Rollback Plan

If issues occur, rollback in reverse order:

```sql
-- Drop functions
DROP FUNCTION IF EXISTS generate_nursery_report_data(UUID, UUID);
DROP FUNCTION IF EXISTS calculate_nursery_old_format_grade(NUMERIC);
DROP FUNCTION IF EXISTS get_nursery_report_data(UUID, UUID);

-- Remove column
ALTER TABLE processed_primary_exam_results 
DROP COLUMN IF EXISTS nursery_report_format;
```

## Notes for Database Developer

1. **DO NOT change subject names in database** - only frontend display changes
2. **Format is determined at input time** - not at report generation
3. **Two completely separate data systems** - do not try to merge them
4. **Comments use different tables** based on format
5. **Gen. Knowledge must be filtered out** in Old format queries
6. **Percentage and grade are auto-calculated** - frontend should not calculate them
7. **Use DELETE + INSERT pattern** for upserts (due to exam_topic_key constraint)
8. **⚠️ CRITICAL: MAINTAIN BACKWARD COMPATIBILITY** - existing Latest format must continue working with ZERO changes

## ⚠️ BACKWARD COMPATIBILITY CHECKLIST

Before deploying, verify:

- [ ] Existing nursery data (Latest format) still loads correctly
- [ ] Existing nursery reports (Latest format) still generate correctly
- [ ] Teachers can still input holistic ratings without selecting format (defaults to Latest)
- [ ] All existing frontend calls work without modification
- [ ] Only NEW data can explicitly choose Old format
- [ ] Non-nursery classes are not affected by these changes
- [ ] No errors when format parameter is omitted (defaults to 'latest')
- [ ] Existing processed_primary_exam_results records have format='latest'

## Testing Strategy

### Phase 1: Test Existing Functionality (MUST PASS BEFORE PROCEEDING)
1. Load existing nursery student data
2. Generate existing nursery reports
3. Input new holistic ratings (without specifying format)
4. Verify everything works exactly as before

### Phase 2: Test New Old Format (ONLY AFTER PHASE 1 PASSES)
1. Select Old format explicitly
2. Input marks-based data
3. Generate Old format reports
4. Verify format mixing is prevented

**IF PHASE 1 FAILS, ROLLBACK IMMEDIATELY!**

## Questions?

If anything is unclear, ask before implementing. The key principle is: **Two separate systems that never mix**.


---

# ANSWERS TO DATABASE DEVELOPER QUESTIONS

## Question 1: Apply changes now or give SQL script first?
**ANSWER: Option B - Provide migration SQL for review first**

Please provide the migration SQL scripts for review before executing.

---

## Question 2: Where should nursery_report_format live?
**ANSWER: Both exam_results AND processed_primary_exam_results**

Add `nursery_report_format` to BOTH tables for clean propagation.

---

## Question 3: Function signature strategy
**ANSWER: Keep current live signature and add p_nursery_report_format at the end (backward compatible)**

Add new parameter at END of existing function signature with DEFAULT 'latest'.

---

## Question 4: Strict no-mix rule scope
**ANSWER: student_id + exam_set_id (strictest)**

Enforce per individual student + exam set. Each student can only use ONE format per exam set.

---

## Question 5: Gen. Knowledge exclusion rule
**ANSWER: Fuzzy matches - exclude %gen% AND %knowledge% (case-insensitive)**

Use: `LOWER(subject) NOT LIKE '%gen%' AND LOWER(subject) NOT LIKE '%knowledge%'`

---

## Question 6: Old format grade source
**ANSWER: Always recompute and override**

Database should ALWAYS calculate grade from percentage. Ignore frontend p_grade value for Old format.

---

## Question 7: Latest format validation strictness
**ANSWER: Silently null them (no hard errors)**

If Latest format but marks fields provided, silently set them to NULL. Don't throw errors.

---

## Question 8: Comments for Old nursery format
**ANSWER: Confirmed**

- Class teacher comments: Use `class_teacher_comments_settings` filtered by nursery class name (Baby/Middle/Top)
- Headteacher comments: Use `headteacher_comments_settings` (school-wide percentage ranges)

---

## Question 9: Subject display mapping location
**ANSWER: Confirmed - Frontend-only**

NO database renaming. NO database mapping table needed. Frontend handles display mapping only.

---

## Question 10: Deployment sequencing preference
**ANSWER: Migration-by-migration with checks after each one**

Run migrations one at a time, verify each step works before proceeding to next.

---

# IMPLEMENTATION PRIORITY ORDER

1. Add `nursery_report_format` column to both tables
2. Modify `teacher_upsert_exam_result_primary()` function
3. Create `calculate_nursery_old_format_grade()` function
4. Create `get_nursery_report_data()` function
5. Create `generate_nursery_report_data()` function
6. Test each function individually
7. Test end-to-end flow

---

# CRITICAL VALIDATION RULES TO IMPLEMENT

## In teacher_upsert_exam_result_primary():

```sql
-- Check for format mixing (per student + exam set)
IF EXISTS (
  SELECT 1 FROM processed_primary_exam_results
  WHERE student_id = p_student_id
    AND exam_set_id = p_exam_set_id
    AND nursery_report_format IS NOT NULL
    AND nursery_report_format != p_nursery_report_format
) THEN
  RAISE EXCEPTION 'Cannot mix formats for same student and exam set. Existing format: %, attempted: %',
    (SELECT nursery_report_format FROM processed_primary_exam_results 
     WHERE student_id = p_student_id AND exam_set_id = p_exam_set_id LIMIT 1),
    p_nursery_report_format;
END IF;

-- For Old format: Force recalculation
IF p_nursery_report_format = 'old' THEN
  -- Calculate percentage
  v_percentage := (p_marks_obtained / p_total_marks) * 100;
  
  -- Calculate grade (override any frontend value)
  v_grade := calculate_nursery_old_format_grade(v_percentage);
  
  -- Force nulls for Latest format fields
  p_nursery_skill_performance := NULL;
END IF;

-- For Latest format: Force nulls for Old format fields
IF p_nursery_report_format = 'latest' THEN
  p_marks_obtained := NULL;
  p_total_marks := NULL;
  v_percentage := NULL;
  v_grade := NULL;
  p_remark := NULL;
  p_teacher_initials := NULL;
END IF;
```

---

# EXPECTED BEHAVIOR SUMMARY

## Saving Old Format Data
- Frontend sends: marks, total_marks, format='old'
- Database calculates: percentage, grade
- Database stores: marks, total_marks, percentage, grade, format='old'
- Database nulls: nursery_skill_performance

## Saving Latest Format Data
- Frontend sends: nursery_skill_performance JSON, format='latest'
- Database stores: nursery_skill_performance, format='latest'
- Database nulls: marks, total_marks, percentage, grade

## Generating Old Format Report
- Database detects: format='old' from processed_primary_exam_results
- Database returns: marks, percentages, grades for each subject
- Database calculates: average percentage
- Database fetches: percentage-based comments from class_teacher_comments_settings
- Database excludes: subjects with 'gen' or 'knowledge' in name

## Generating Latest Format Report
- Database detects: format='latest' from processed_primary_exam_results
- Database returns: nursery_skill_performance JSON for each subject
- Database fetches: pre-resolved comments from processed_primary_exam_results

---

# PROCEED WITH MIGRATION SQL SCRIPTS

Please provide the migration SQL scripts for review based on these answers.
