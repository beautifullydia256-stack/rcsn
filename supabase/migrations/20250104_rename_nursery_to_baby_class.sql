-- Rename Nursery class to Baby Class throughout the database
-- This migration updates all references to "Nursery" class name to "Baby Class"

-- Update students table: change current_class from "Nursery" to "Baby Class"
UPDATE public.students
SET current_class = 'Baby Class'
WHERE current_class = 'Nursery';

-- Update exam_results table: change class_name from "Nursery" to "Baby Class"
UPDATE public.exam_results
SET class_name = 'Baby Class'
WHERE class_name = 'Nursery';

-- Update class_teachers table: change class_name from "Nursery" to "Baby Class"
UPDATE public.class_teachers
SET class_name = 'Baby Class'
WHERE class_name = 'Nursery';

-- Update class_subjects table: change class_name from "Nursery" to "Baby Class"
UPDATE public.class_subjects
SET class_name = 'Baby Class'
WHERE class_name = 'Nursery';

-- Update teacher_class_subjects table: change class_name from "Nursery" to "Baby Class"
UPDATE public.teacher_class_subjects
SET class_name = 'Baby Class'
WHERE class_name = 'Nursery';

-- Update timetable_periods table: change class_name from "Nursery" to "Baby Class"
UPDATE public.timetable_periods
SET class_name = 'Baby Class'
WHERE class_name = 'Nursery';

-- Update timetables table: change class_name from "Nursery" to "Baby Class"
UPDATE public.timetables
SET class_name = 'Baby Class'
WHERE class_name = 'Nursery';

-- Update assignments table: change class_name from "Nursery" to "Baby Class"
UPDATE public.assignments
SET class_name = 'Baby Class'
WHERE class_name = 'Nursery';

-- Update old_students table: change final_class from "Nursery" to "Baby Class"
UPDATE public.old_students
SET final_class = 'Baby Class'
WHERE final_class = 'Nursery';

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
    EXECUTE 'UPDATE public.exam_sets SET class_name = ''Baby Class'' WHERE class_name = ''Nursery''';
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
    EXECUTE 'UPDATE public.processed_exam_results SET class_name = ''Baby Class'' WHERE class_name = ''Nursery''';
  END IF;
END $$;

