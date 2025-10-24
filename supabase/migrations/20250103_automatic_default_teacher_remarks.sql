-- Automatic Default Teacher's Remarks System
-- This migration ensures that all subjects automatically get default Teacher's Remarks
-- when they are added to a school, and when new schools are created.

-- 1. Create function to add default teacher remarks for new subjects
CREATE OR REPLACE FUNCTION add_default_teacher_remarks_for_subject()
RETURNS TRIGGER AS $$
BEGIN
  -- Only add default remarks if this is a new subject for this school
  IF NOT EXISTS (
    SELECT 1 FROM teacher_remarks_settings 
    WHERE school_id = NEW.school_id 
    AND subject = NEW.subject
  ) THEN
    -- Insert default remark ranges for the new subject
    INSERT INTO teacher_remarks_settings (school_id, subject, min_percent, max_percent, comment_text, created_by)
    VALUES 
      (NEW.school_id, NEW.subject, 0, 40, 'Needs more effort. Try harder next time.', NULL),
      (NEW.school_id, NEW.subject, 41, 60, 'Fair work. You can do better.', NULL),
      (NEW.school_id, NEW.subject, 61, 80, 'Good work. Keep it up!', NULL),
      (NEW.school_id, NEW.subject, 81, 100, 'Excellent! Keep shining!', NULL);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Create trigger to automatically add default teacher remarks when new subjects are added
DROP TRIGGER IF EXISTS trigger_add_default_teacher_remarks ON class_subjects;
CREATE TRIGGER trigger_add_default_teacher_remarks
  AFTER INSERT ON class_subjects
  FOR EACH ROW
  EXECUTE FUNCTION add_default_teacher_remarks_for_subject();

-- 3. Create function to add default teacher remarks for all subjects when a new school is created
CREATE OR REPLACE FUNCTION setup_default_teacher_remarks_for_school(p_school_id UUID)
RETURNS VOID AS $$
DECLARE
  subject_record RECORD;
BEGIN
  -- Get all subjects for this school from class_subjects
  FOR subject_record IN 
    SELECT DISTINCT subject 
    FROM class_subjects 
    WHERE school_id = p_school_id
  LOOP
    -- Add default remarks for this subject if they don't exist
    IF NOT EXISTS (
      SELECT 1 FROM teacher_remarks_settings 
      WHERE school_id = p_school_id 
      AND subject = subject_record.subject
    ) THEN
      INSERT INTO teacher_remarks_settings (school_id, subject, min_percent, max_percent, comment_text, created_by)
      VALUES 
        (p_school_id, subject_record.subject, 0, 40, 'Needs more effort. Try harder next time.', NULL),
        (p_school_id, subject_record.subject, 41, 60, 'Fair work. You can do better.', NULL),
        (p_school_id, subject_record.subject, 61, 80, 'Good work. Keep it up!', NULL),
        (p_school_id, subject_record.subject, 81, 100, 'Excellent! Keep shining!', NULL);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 4. Update the setup_new_school_defaults function to include default teacher remarks
CREATE OR REPLACE FUNCTION setup_new_school_defaults()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert default subjects and classes based on school type
  IF NEW.type = 'Primary' THEN
    -- Primary school subjects
    INSERT INTO subjects (school_id, name, is_core) VALUES
      (NEW.school_id, 'LITERACY I', true),
      (NEW.school_id, 'LITERACY II', true),
      (NEW.school_id, 'SCIENCE', true),
      (NEW.school_id, 'SOCIAL STUDIES', true),
      (NEW.school_id, 'ENGLISH', true),
      (NEW.school_id, 'MATHEMATICS', true);
    
    -- Primary classes
    INSERT INTO classes (school_id, class_name, max_students) VALUES
      (NEW.school_id, 'Primary 1', 1000),
      (NEW.school_id, 'Primary 2', 1000),
      (NEW.school_id, 'Primary 3', 1000),
      (NEW.school_id, 'Primary 4', 1000),
      (NEW.school_id, 'Primary 5', 1000),
      (NEW.school_id, 'Primary 6', 1000),
      (NEW.school_id, 'Primary 7', 1000);
      
  ELSIF NEW.type = 'Secondary' THEN
    -- Secondary school subjects (insert into class_subjects for Senior 1-4)
    INSERT INTO class_subjects (school_id, class_name, subject) VALUES
      (NEW.school_id, 'Senior 1', 'English Language'),
      (NEW.school_id, 'Senior 1', 'Mathematics'),
      (NEW.school_id, 'Senior 1', 'Biology'),
      (NEW.school_id, 'Senior 1', 'Chemistry'),
      (NEW.school_id, 'Senior 1', 'Physics'),
      (NEW.school_id, 'Senior 1', 'Geography'),
      (NEW.school_id, 'Senior 1', 'History and Political Education'),
      (NEW.school_id, 'Senior 2', 'English Language'),
      (NEW.school_id, 'Senior 2', 'Mathematics'),
      (NEW.school_id, 'Senior 2', 'Biology'),
      (NEW.school_id, 'Senior 2', 'Chemistry'),
      (NEW.school_id, 'Senior 2', 'Physics'),
      (NEW.school_id, 'Senior 2', 'Geography'),
      (NEW.school_id, 'Senior 2', 'History and Political Education'),
      (NEW.school_id, 'Senior 3', 'English Language'),
      (NEW.school_id, 'Senior 3', 'Mathematics'),
      (NEW.school_id, 'Senior 3', 'Biology'),
      (NEW.school_id, 'Senior 3', 'Chemistry'),
      (NEW.school_id, 'Senior 3', 'Physics'),
      (NEW.school_id, 'Senior 3', 'Geography'),
      (NEW.school_id, 'Senior 3', 'History and Political Education'),
      (NEW.school_id, 'Senior 4', 'English Language'),
      (NEW.school_id, 'Senior 4', 'Mathematics'),
      (NEW.school_id, 'Senior 4', 'Biology'),
      (NEW.school_id, 'Senior 4', 'Chemistry'),
      (NEW.school_id, 'Senior 4', 'Physics'),
      (NEW.school_id, 'Senior 4', 'Geography'),
      (NEW.school_id, 'Senior 4', 'History and Political Education');
    
    -- Secondary classes
    INSERT INTO classes (school_id, class_name, max_students) VALUES
      (NEW.school_id, 'Senior 1', 1000),
      (NEW.school_id, 'Senior 2', 1000),
      (NEW.school_id, 'Senior 3', 1000),
      (NEW.school_id, 'Senior 4', 1000),
      (NEW.school_id, 'Senior 5', 1000),
      (NEW.school_id, 'Senior 6', 1000);
  END IF;
  
  -- Insert default terms
  INSERT INTO school_terms (school_id, term_name, start_date, end_date, is_current) VALUES
    (NEW.school_id, 'Term 1', CURRENT_DATE, CURRENT_DATE + INTERVAL '3 months', true),
    (NEW.school_id, 'Term 2', CURRENT_DATE + INTERVAL '3 months', CURRENT_DATE + INTERVAL '6 months', false),
    (NEW.school_id, 'Term 3', CURRENT_DATE + INTERVAL '6 months', CURRENT_DATE + INTERVAL '9 months', false);
  
  -- Insert default expense categories
  INSERT INTO expense_categories (school_id, name, description, is_default) VALUES
    (NEW.school_id, 'Tuition Fees', 'Regular tuition fees', true),
    (NEW.school_id, 'Registration Fees', 'Student registration fees', true),
    (NEW.school_id, 'Examination Fees', 'Examination and assessment fees', true),
    (NEW.school_id, 'Library Fees', 'Library and resource fees', true),
    (NEW.school_id, 'Sports Fees', 'Sports and extracurricular fees', true);
  
  -- Setup default teacher remarks for all subjects
  PERFORM setup_default_teacher_remarks_for_school(NEW.school_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
