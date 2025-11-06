-- Fix ensure_all_students_have_all_subjects to query from exam_results (source table)
-- instead of processed_primary_exam_results, so it gets ALL subjects that ANY student has results for
-- Also create a backfill function to process all exam sets for a class

CREATE OR REPLACE FUNCTION ensure_all_students_have_all_subjects(
  p_school_id UUID,
  p_exam_set_id UUID,
  p_class_name TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  all_subjects TEXT[];
  all_students UUID[];
  student_id_val UUID;
  subject_val TEXT;
  exam_set_record RECORD;
  student_record RECORD;
  calculated_grade TEXT;
BEGIN
  -- Get all subjects that ANY student has ACTUAL results for in this class/exam set
  -- Query from exam_results (source table) to get subjects with actual results
  SELECT ARRAY_AGG(DISTINCT subject ORDER BY subject)
  INTO all_subjects
  FROM exam_results
  WHERE school_id = p_school_id
    AND exam_set_id = p_exam_set_id
    AND class_name = p_class_name;
  
  -- If no subjects found, nothing to do
  IF all_subjects IS NULL OR array_length(all_subjects, 1) IS NULL THEN
    RETURN;
  END IF;
  
  -- Get exam set details
  SELECT id, name, term, year INTO exam_set_record
  FROM exam_sets
  WHERE id = p_exam_set_id AND school_id = p_school_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Get all students in this class (from students table)
  SELECT ARRAY_AGG(student_id)
  INTO all_students
  FROM students
  WHERE school_id = p_school_id
    AND current_class = p_class_name
    AND status = 'active';
  
  -- If no students found, nothing to do
  IF all_students IS NULL OR array_length(all_students, 1) IS NULL THEN
    RETURN;
  END IF;
  
  -- Calculate grade for 0 marks (MISSED entries)
  -- 0 marks = F9 (based on grade scale: 0-39 = F9)
  calculated_grade := 'F9';
  
  -- For each student, ensure they have entries for all subjects
  FOREACH student_id_val IN ARRAY all_students
  LOOP
    -- Get student details
    SELECT name, admission_number, current_class INTO student_record
    FROM students
    WHERE student_id = student_id_val AND school_id = p_school_id;
    
    IF NOT FOUND THEN
      CONTINUE;
    END IF;
    
    -- For each subject, check if student has an entry for this exam set
    FOREACH subject_val IN ARRAY all_subjects
    LOOP
      -- Check if this student already has an entry for this subject + exam set combination
      -- in processed_primary_exam_results
      IF NOT EXISTS (
        SELECT 1
        FROM processed_primary_exam_results ppr
        WHERE ppr.school_id = p_school_id
          AND ppr.exam_set_id = p_exam_set_id
          AND ppr.student_id = student_id_val
          AND ppr.subject = subject_val
      ) THEN
        -- Check if student has an actual exam result (not MISSED)
        -- If they don't have an actual result, create MISSED entry
        IF NOT EXISTS (
          SELECT 1
          FROM exam_results er
          WHERE er.school_id = p_school_id
            AND er.exam_set_id = p_exam_set_id
            AND er.student_id = student_id_val
            AND er.subject = subject_val
        ) THEN
          -- Create MISSED entry for this student/subject/exam_set combination
          INSERT INTO processed_primary_exam_results (
            school_id,
            student_id,
            exam_set_id,
            year,
            term,
            exam_set_name,
            student_name,
            class_name,
            admission_number,
            subject,
            marks_obtained,
            total_marks,
            grade,
            teacher_remark,
            class_teacher_comment
          ) VALUES (
            p_school_id,
            student_id_val,
            p_exam_set_id,
            exam_set_record.year,
            exam_set_record.term,
            exam_set_record.name,
            student_record.name,
            student_record.current_class,
            student_record.admission_number,
            subject_val,
            0,  -- marks_obtained = 0 for MISSED
            100,  -- total_marks = 100
            calculated_grade,  -- grade = F9 (calculated for 0 marks)
            'MISSED',  -- teacher_remark = MISSED
            COALESCE(
              (SELECT class_teacher_comment 
               FROM processed_primary_exam_results 
               WHERE school_id = p_school_id 
                 AND exam_set_id = p_exam_set_id 
                 AND student_id = student_id_val 
               LIMIT 1),
              NULL
            )
          )
          ON CONFLICT (school_id, student_id, exam_set_id, subject) DO NOTHING;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
END;
$$;

-- Create a backfill function to process ALL exam sets for a class
CREATE OR REPLACE FUNCTION backfill_missed_entries_for_class(
  p_school_id UUID,
  p_class_name TEXT
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  exam_set_record RECORD;
BEGIN
  -- Get all exam sets for this school
  FOR exam_set_record IN
    SELECT DISTINCT es.id, es.name, es.term, es.year
    FROM exam_sets es
    WHERE es.school_id = p_school_id
      AND EXISTS (
        -- Only process exam sets that have results for this class
        SELECT 1
        FROM exam_results er
        WHERE er.school_id = p_school_id
          AND er.exam_set_id = es.id
          AND er.class_name = p_class_name
      )
  LOOP
    -- Ensure all students have all subjects for this exam set
    PERFORM ensure_all_students_have_all_subjects(
      p_school_id,
      exam_set_record.id,
      p_class_name
    );
  END LOOP;
END;
$$;

