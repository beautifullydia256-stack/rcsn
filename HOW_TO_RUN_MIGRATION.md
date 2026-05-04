# How to Add "Writing" Subject to Database - CORRECTED

## The Correct Tables

The nursery subjects are stored in these tables:
- `pre_primary_holistic_strands` - stores subjects (like "Writing")
- `pre_primary_holistic_skills` - stores skills for each subject
- `pre_primary_holistic_rating_levels` - stores rating levels

## Quick Instructions

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Click on "SQL Editor" in the left sidebar

2. **Run the Migration**
   - Copy the SQL from `add_writing_SIMPLE_CORRECT.sql`
   - Paste it into the SQL Editor
   - Click "Run" button

3. **Verify**
   - Refresh your teacher exam results page
   - You should now see "Writing" in the subjects list

---

## The Migration (Copy This)

```sql
-- Add Writing subject to ALL schools with nursery config
DO $$
DECLARE
  v_school_id uuid;
  v_strand_id uuid;
  v_max_sort int;
BEGIN
  FOR v_school_id IN 
    SELECT DISTINCT school_id FROM pre_primary_holistic_strands
  LOOP
    -- Check if Writing already exists
    IF NOT EXISTS (
      SELECT 1 FROM pre_primary_holistic_strands 
      WHERE school_id = v_school_id AND subject = 'Writing'
    ) THEN
      -- Get next sort order
      SELECT COALESCE(MAX(sort_order), 0) + 1 INTO v_max_sort
      FROM pre_primary_holistic_strands WHERE school_id = v_school_id;
      
      -- Add Writing strand
      INSERT INTO pre_primary_holistic_strands (school_id, subject, sort_order)
      VALUES (v_school_id, 'Writing', v_max_sort)
      RETURNING id INTO v_strand_id;
      
      -- Add Writing skill
      INSERT INTO pre_primary_holistic_skills (school_id, strand_id, skill_key, label, sort_order)
      VALUES (v_school_id, v_strand_id, 'writing', 'Writing', 1);
      
      RAISE NOTICE 'Added Writing to school %', v_school_id;
    END IF;
  END LOOP;
END $$;

-- Verify it worked
SELECT 
  s.name,
  COUNT(*) as subject_count,
  string_agg(phs.subject, ', ' ORDER BY phs.sort_order) as subjects
FROM pre_primary_holistic_strands phs
JOIN schools s ON s.id = phs.school_id
GROUP BY s.name;
```

---

## What This Does

1. **Finds all schools** that have nursery configuration
2. **Checks if Writing exists** for each school
3. **Adds Writing strand** to `pre_primary_holistic_strands` table
4. **Adds Writing skill** to `pre_primary_holistic_skills` table
5. **Shows verification** - you'll see subject count increase from 5 to 6

---

## Expected Result

**Before**:
- 5 subjects in the sidebar

**After**:
- 6 subjects in the sidebar
- "Writing" appears at the bottom of the list

---

## Verification

After running, you should see output like:

```
NOTICE: Added Writing to school <uuid>
```

And the verification query should show:

```
name          | subject_count | subjects
--------------|---------------|--------------------------------------------------
Your School   | 6             | Development and using language (Language II), ...
```

---

## Troubleshooting

### Still not seeing Writing?

1. **Clear browser cache**: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
2. **Check the database**:
```sql
SELECT subject FROM pre_primary_holistic_strands 
WHERE subject = 'Writing';
```
Should return at least one row.

3. **Check your school specifically**:
```sql
SELECT 
  phs.subject,
  phsk.skill_key,
  phsk.label
FROM pre_primary_holistic_strands phs
LEFT JOIN pre_primary_holistic_skills phsk ON phsk.strand_id = phs.id
WHERE phs.school_id = 'YOUR_SCHOOL_ID_HERE'
ORDER BY phs.sort_order;
```

---

## Summary

**File to use**: `add_writing_SIMPLE_CORRECT.sql`

**Steps**:
1. Open Supabase SQL Editor
2. Copy and paste the SQL above
3. Click "Run"
4. Refresh teacher page
5. **Writing should appear!** ✅

**Time**: Less than 1 minute
**Risk**: Very low - only adds data, doesn't delete anything
