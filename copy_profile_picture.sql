-- Copy profile picture from RIP202510001 to all newly imported students

-- Step 1: Find the source student and their photo
SELECT 
  s.student_id,
  s.name,
  s.admission_number,
  sp.photo_url,
  sp.photo_filename,
  sp.photo_size,
  sp.photo_type
FROM students s
LEFT JOIN student_photos sp ON s.student_id = sp.student_id
WHERE s.admission_number = 'RIP202510001';

-- Step 2: Find all newly imported students (those with admission numbers from today's import)
-- These would be students with the highest admission numbers for each school
WITH latest_students AS (
  SELECT 
    s.student_id,
    s.name,
    s.admission_number,
    sc.name as school_name,
    sc.school_code
  FROM students s
  JOIN schools sc ON s.school_id = sc.school_id
  WHERE s.admission_number ~ ('^' || sc.school_code || '202604[0-9]{3}$')
    AND s.created_at >= CURRENT_DATE  -- Only students created today
)
SELECT 
  ls.student_id,
  ls.name,
  ls.admission_number,
  ls.school_name,
  'Will get photo from RIP202510001' as note
FROM latest_students ls
ORDER BY ls.school_name, ls.admission_number;

-- Step 3: Copy the photo from RIP202510001 to all newly imported students
-- (Only run this after confirming the above queries show the right students)

INSERT INTO student_photos (student_id, school_id, photo_url, photo_filename, photo_size, photo_type, is_primary, created_at, updated_at)
SELECT 
  ls.student_id,
  ls.school_id,
  source_photo.photo_url,
  source_photo.photo_filename,
  source_photo.photo_size,
  source_photo.photo_type,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM (
  -- Get all newly imported students
  SELECT 
    s.student_id,
    s.school_id
  FROM students s
  JOIN schools sc ON s.school_id = sc.school_id
  WHERE s.admission_number ~ ('^' || sc.school_code || '202604[0-9]{3}$')
    AND s.created_at >= CURRENT_DATE
    AND NOT EXISTS (
      SELECT 1 FROM student_photos sp WHERE sp.student_id = s.student_id
    )  -- Only students without photos
) ls
CROSS JOIN (
  -- Get the source photo from RIP202510001
  SELECT 
    sp.photo_url,
    sp.photo_filename,
    sp.photo_size,
    sp.photo_type
  FROM students s
  JOIN student_photos sp ON s.student_id = sp.student_id
  WHERE s.admission_number = 'RIP202510001'
  LIMIT 1
) source_photo;

-- Step 4: Verify the copy worked
SELECT 
  s.name,
  s.admission_number,
  sc.name as school_name,
  CASE 
    WHEN sp.student_id IS NOT NULL THEN 'Has photo'
    ELSE 'No photo'
  END as photo_status
FROM students s
JOIN schools sc ON s.school_id = sc.school_id
LEFT JOIN student_photos sp ON s.student_id = sp.student_id
WHERE s.admission_number ~ ('^' || sc.school_code || '202604[0-9]{3}$')
  AND s.created_at >= CURRENT_DATE
ORDER BY sc.name, s.admission_number;