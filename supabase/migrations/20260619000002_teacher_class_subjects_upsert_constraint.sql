-- Add unique constraint on (school_id, teacher_id, class_name, subject) so that
-- upsert calls with onConflict='school_id,teacher_id,class_name,subject' work correctly.
-- The prior unique index included year+term which are not sent in upsert payloads,
-- making ON CONFLICT fail with "no unique constraint matching" error.
CREATE UNIQUE INDEX IF NOT EXISTS teacher_class_subjects_school_teacher_class_subject_uq
  ON public.teacher_class_subjects (school_id, teacher_id, class_name, subject);
