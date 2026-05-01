# URGENT QUESTION TO DATABASE DEVELOPER: Comments Storage and Linking

## Issue Report

The current comment system for nursery Old format is not working correctly. We need to verify the correct table structure and linking logic.

---

## Questions About Comment Storage

### 1. Class Teacher Comments Table

**Question**: What is the EXACT table name and structure for class teacher comments?

Please provide:
- Table name (is it `class_teacher_comments_settings` or something else?)
- Column names for:
  - School ID
  - Class name
  - Minimum percentage/marks
  - Maximum percentage/marks
  - Comment text
  - Any other relevant columns

**Example query we need**:
```sql
-- Please provide the correct table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'class_teacher_comments_settings'  -- Is this correct?
ORDER BY ordinal_position;
```

---

### 2. Head Teacher Comments Table

**Question**: What is the EXACT table name and structure for head teacher comments?

Please provide:
- Table name (is it `headteacher_comments_settings` or something else?)
- Column names for:
  - School ID
  - Class name (if applicable)
  - Minimum percentage/marks
  - Maximum percentage/marks
  - Comment text
  - Any other relevant columns

**Example query we need**:
```sql
-- Please provide the correct table structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'headteacher_comments_settings'  -- Is this correct?
ORDER BY ordinal_position;
```

---

### 3. Comment Selection Logic

**Question**: How should comments be selected based on average percentage?

The report card shows the **overall average percentage** (calculated from all subjects).

**For Nursery Old Format**, we need to:
1. Calculate average percentage from all nursery subjects (excluding Gen. Knowledge)
2. Use this average to find the matching comment

**Please confirm**:
- Are the percentage columns named `min_percent` and `max_percent`?
- Or are they named `min_percentage` and `max_percentage`?
- Or something else like `minimum_marks` and `maximum_marks`?

**Example of what we're trying to do**:
```sql
-- Student has these marks:
-- Learning Area 1: 85/100 = 85%
-- Learning Area 2: 90/100 = 90%
-- Learning Area 3: 80/100 = 80%
-- Learning Area 4: 75/100 = 75%
-- Learning Area 5: 88/100 = 88%
-- Average: 83.6%

-- We need to find comment where:
-- min_percent <= 83.6 AND max_percent >= 83.6

-- Is this the correct logic?
SELECT comment_text
FROM class_teacher_comments_settings
WHERE school_id = '<school_id>'
  AND class_name = 'Baby Class'  -- or 'Middle Class', 'Top Class'
  AND 83.6 >= min_percent
  AND 83.6 <= max_percent
ORDER BY min_percent DESC
LIMIT 1;
```

---

### 4. Current Comment Settings

**Question**: Can you provide sample data from these tables?

Please run these queries and share the results:

```sql
-- Class teacher comments for nursery classes
SELECT 
  school_id,
  class_name,
  min_percent,  -- or whatever the column is called
  max_percent,  -- or whatever the column is called
  comment_text,
  created_at
FROM class_teacher_comments_settings
WHERE class_name ILIKE '%baby%' 
   OR class_name ILIKE '%nursery%'
   OR class_name ILIKE '%middle%'
   OR class_name ILIKE '%top%'
ORDER BY class_name, min_percent;

-- Head teacher comments (school-wide)
SELECT 
  school_id,
  class_name,  -- if this column exists
  min_percent,  -- or whatever the column is called
  max_percent,  -- or whatever the column is called
  comment_text,
  created_at
FROM headteacher_comments_settings
ORDER BY school_id, min_percent;
```

---

### 5. Existing Comment Resolution for Primary Classes

**Question**: How do Primary 1-7 classes currently get their comments?

Since Nursery Old format should work EXACTLY like Primary 1-7, please show us:

**The working query/function that Primary classes use**:
```sql
-- What function or query does Primary 1-7 use to get comments?
-- Please provide the exact code
```

We want to use the SAME logic for Nursery Old format.

---

### 6. Processed Results Table

**Question**: Are comments already stored in `processed_primary_exam_results`?

Please check:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'processed_primary_exam_results'
  AND column_name ILIKE '%comment%'
ORDER BY ordinal_position;
```

**If comments are already in processed_primary_exam_results**:
- Should we read from there directly?
- Or should we calculate them fresh from the settings tables?

---

## What We Need From You

Please provide:

1. ✅ **Exact table names** for class teacher and head teacher comments
2. ✅ **Exact column names** (especially for min/max percentage)
3. ✅ **Sample data** from these tables for nursery classes
4. ✅ **Working query** that Primary 1-7 uses to get comments
5. ✅ **Confirmation** of the comment selection logic

---

## Why This Is Important

The migration scripts in `APPROVED_MIGRATION_SCRIPTS.sql` use these table/column names:
- `class_teacher_comments_settings` with `min_percent` and `max_percent`
- `headteacher_comments_settings` with `min_percent` and `max_percent`

**If these names are wrong, the migrations will fail!**

We need to update the migration scripts with the correct names BEFORE execution.

---

## Current Migration Code (Lines 485-510)

```sql
-- This is what we have in Migration 4
SELECT c.comment_text
  INTO v_class_teacher_comment
FROM public.class_teacher_comments_settings c
WHERE c.school_id = v_school_id
  AND c.class_name = v_class_name
  AND v_average_percentage >= c.min_percent
  AND v_average_percentage <= c.max_percent
ORDER BY c.min_percent DESC
LIMIT 1;

SELECT h.comment_text
  INTO v_headteacher_comment
FROM public.headteacher_comments_settings h
WHERE h.school_id = v_school_id
  AND v_average_percentage >= h.min_percent
  AND v_average_percentage <= h.max_percent
ORDER BY h.min_percent DESC
LIMIT 1;
```

**Is this correct? If not, what should it be?**

---

## Urgency

⚠️ **DO NOT EXECUTE THE MIGRATIONS YET** until we confirm the correct table/column names!

Please provide the information above so we can update the migration scripts if needed.

---

## Response Template

Please fill this out:

```
1. CLASS TEACHER COMMENTS TABLE:
   - Table name: _________________
   - School ID column: _________________
   - Class name column: _________________
   - Min percentage column: _________________
   - Max percentage column: _________________
   - Comment text column: _________________

2. HEAD TEACHER COMMENTS TABLE:
   - Table name: _________________
   - School ID column: _________________
   - Class name column (if exists): _________________
   - Min percentage column: _________________
   - Max percentage column: _________________
   - Comment text column: _________________

3. SAMPLE DATA:
   [Paste results of sample queries here]

4. PRIMARY 1-7 COMMENT LOGIC:
   [Paste the working query/function here]

5. CONFIRMATION:
   - Are the migration scripts using correct table/column names? YES / NO
   - If NO, what needs to change? _________________
```

---

## Next Steps

Once you provide this information:
1. We will update the migration scripts if needed
2. We will test the comment selection logic
3. Then you can execute the migrations safely
