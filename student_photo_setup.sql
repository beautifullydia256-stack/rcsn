-- Step 1: Find your school_id (run this first to get your school_id)
SELECT school_id, name as school_name 
FROM schools 
ORDER BY created_at DESC 
LIMIT 5;

-- Step 2: Find students with photos in your school (replace 'YOUR_SCHOOL_ID' with actual value from step 1)
SELECT s.student_id, s.name, s.current_class, sp.photo_url
FROM students s
JOIN student_photos sp ON s.student_id = sp.student_id
WHERE s.school_id = 'YOUR_SCHOOL_ID'  -- Replace this
  AND sp.is_primary = true
  AND sp.photo_url IS NOT NULL
  AND sp.photo_url != ''
LIMIT 10;

-- Step 3: Copy photo from existing student to all Primary 1 students without photos
-- (Replace 'YOUR_SCHOOL_ID' with your actual school_id)
WITH source_photo AS (
  SELECT photo_url, school_id
  FROM student_photos sp
  JOIN students s ON sp.student_id = s.student_id
  WHERE s.school_id = 'YOUR_SCHOOL_ID'  -- Replace this
    AND sp.is_primary = true
    AND sp.photo_url IS NOT NULL
    AND sp.photo_url != ''
  LIMIT 1
),
target_students AS (
  SELECT s.student_id, s.school_id
  FROM students s
  WHERE s.school_id = 'YOUR_SCHOOL_ID'  -- Replace this
    AND s.current_class = 'Primary 1'
    AND NOT EXISTS (
      SELECT 1 FROM student_photos sp2 
      WHERE sp2.student_id = s.student_id 
        AND sp2.is_primary = true
    )
)
INSERT INTO student_photos (student_id, school_id, photo_url, is_primary, uploaded_at)
SELECT 
  ts.student_id,
  ts.school_id,
  sp.photo_url,
  true,
  NOW()
FROM target_students ts
CROSS JOIN source_photo sp;

-- Step 4: Verify the photos were added (replace 'YOUR_SCHOOL_ID')
SELECT COUNT(*) as primary1_students_with_photos
FROM students s
JOIN student_photos sp ON s.student_id = sp.student_id
WHERE s.school_id = 'YOUR_SCHOOL_ID'  -- Replace this
  AND s.current_class = 'Primary 1'
  AND sp.is_primary = true;