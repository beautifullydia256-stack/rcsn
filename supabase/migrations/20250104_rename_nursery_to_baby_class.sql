-- Rename Nursery class to Baby Class throughout the database
-- This migration updates all references to "Nursery" class name to "Baby Class"
-- Handles case-insensitive matching to catch all variations

-- First, ensure the ensure_all_students_have_all_subjects function exists
-- (in case this migration runs before the function creation migration)
CREATE OR REPLACE FUNCTION ensure_all_students_have_all_subjects(
  p_school_id UUID,
  p_exam_set_id UUID,
  p_class_name TEXT
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_subject TEXT;
  v_student_id UUID;
  v_existing_count INTEGER;
BEGIN
  -- Get all distinct subjects that have exam results for this class and exam set
  FOR v_subject IN
    SELECT DISTINCT subject
    FROM public.exam_results
    WHERE school_id = p_school_id
      AND exam_set_id = p_exam_set_id
      AND class_name = p_class_name
  LOOP
    -- For each subject, ensure all active students in the class have an entry
    FOR v_student_id IN
      SELECT student_id
      FROM public.students
      WHERE school_id = p_school_id
        AND current_class = p_class_name
        AND status = 'active'
    LOOP
      -- Check if this student already has an entry for this subject
      SELECT COUNT(*)
      INTO v_existing_count
      FROM public.exam_results
      WHERE school_id = p_school_id
        AND exam_set_id = p_exam_set_id
        AND student_id = v_student_id
        AND class_name = p_class_name
        AND subject = v_subject;
      
      -- If no entry exists, create a MISSED entry
      IF v_existing_count = 0 THEN
        INSERT INTO public.exam_results (
          school_id,
          exam_set_id,
          student_id,
          class_name,
          subject,
          marks_obtained,
          total_marks,
          grade,
          remarks
        )
        VALUES (
          p_school_id,
          p_exam_set_id,
          v_student_id,
          p_class_name,
          v_subject,
          0,
          100,
          'MISSED',
          'MISSED - Entry created automatically'
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- Update students table: change current_class from "Nursery" (any case) to "Baby Class"
UPDATE public.students
SET current_class = 'Baby Class'
WHERE LOWER(TRIM(current_class)) = 'nursery';

-- Update exam_results table: change class_name from "Nursery" (any case) to "Baby Class"
UPDATE public.exam_results
SET class_name = 'Baby Class'
WHERE LOWER(TRIM(class_name)) = 'nursery';

-- Update class_teachers table: change class_name from "Nursery" (any case) to "Baby Class"
UPDATE public.class_teachers
SET class_name = 'Baby Class'
WHERE LOWER(TRIM(class_name)) = 'nursery';

-- Update class_subjects table: change class_name from "Nursery" (any case) to "Baby Class"
UPDATE public.class_subjects
SET class_name = 'Baby Class'
WHERE LOWER(TRIM(class_name)) = 'nursery';

-- Update teacher_class_subjects table: change class_name from "Nursery" (any case) to "Baby Class"
UPDATE public.teacher_class_subjects
SET class_name = 'Baby Class'
WHERE LOWER(TRIM(class_name)) = 'nursery';

-- Update timetable_periods table: change class_name from "Nursery" (any case) to "Baby Class"
UPDATE public.timetable_periods
SET class_name = 'Baby Class'
WHERE LOWER(TRIM(class_name)) = 'nursery';

-- Update timetables table: change class_name from "Nursery" (any case) to "Baby Class"
UPDATE public.timetables
SET class_name = 'Baby Class'
WHERE LOWER(TRIM(class_name)) = 'nursery';

-- Update assignments table: change class_name from "Nursery" (any case) to "Baby Class"
UPDATE public.assignments
SET class_name = 'Baby Class'
WHERE LOWER(TRIM(class_name)) = 'nursery';

-- Update old_students table: change final_class from "Nursery" (any case) to "Baby Class"
UPDATE public.old_students
SET final_class = 'Baby Class'
WHERE LOWER(TRIM(final_class)) = 'nursery';

-- Update any other tables that might have class_name or similar fields
-- Check exam_sets table if it has class_name
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'exam_sets' 
    AND column_name = 'class_name'
  ) THEN
    EXECUTE 'UPDATE public.exam_sets SET class_name = ''Baby Class'' WHERE LOWER(TRIM(class_name)) = ''nursery''';
  END IF;
END $$;

-- Update processed_exam_results if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'processed_exam_results' 
    AND column_name = 'class_name'
  ) THEN
    EXECUTE 'UPDATE public.processed_exam_results SET class_name = ''Baby Class'' WHERE LOWER(TRIM(class_name)) = ''nursery''';
  END IF;
END $$;

-- Update processed_primary_exam_results if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'processed_primary_exam_results' 
    AND column_name = 'class_name'
  ) THEN
    EXECUTE 'UPDATE public.processed_primary_exam_results SET class_name = ''Baby Class'' WHERE LOWER(TRIM(class_name)) = ''nursery''';
  END IF;
END $$;

