-- Rename UCE subject "History and Political Education" → "History" for all schools.
-- Data migration only: UPDATE and targeted DELETE (dedupe). No TRUNCATE, reset, or catalog drop.
--
-- class_subjects has trigger class_subjects_protect_uace_subsidiaries_trg which blocks
-- renaming default UCE compulsory rows for Senior 1–4; we disable it briefly for this migration.

-- -----------------------------------------------------------------------------
-- 1) exam_results — remove H&PE row when same line already exists as "History"
-- -----------------------------------------------------------------------------
DELETE FROM public.exam_results er
WHERE er.subject = 'History and Political Education'
  AND EXISTS (
    SELECT 1
    FROM public.exam_results h
    WHERE h.exam_set_id = er.exam_set_id
      AND h.student_id = er.student_id
      AND h.subject = 'History'
      AND COALESCE(h.exam_topic_key, '') IS NOT DISTINCT FROM COALESCE(er.exam_topic_key, '')
      AND COALESCE(h.exam_paper_key, '') IS NOT DISTINCT FROM COALESCE(er.exam_paper_key, '')
  );

UPDATE public.exam_results
SET  subject = 'History',
  updated_at = NOW()
WHERE subject = 'History and Political Education';

-- -----------------------------------------------------------------------------
-- 2) processed_secondary_exam_results
-- -----------------------------------------------------------------------------
DELETE FROM public.processed_secondary_exam_results ps
WHERE ps.subject = 'History and Political Education'
  AND EXISTS (
    SELECT 1
    FROM public.processed_secondary_exam_results h
    WHERE h.school_id = ps.school_id
      AND h.student_id = ps.student_id
      AND h.exam_set_id = ps.exam_set_id
      AND h.subject = 'History'
      AND COALESCE(h.proc_topic_key, '') IS NOT DISTINCT FROM COALESCE(ps.proc_topic_key, '')
      AND COALESCE(h.proc_paper_key, '') IS NOT DISTINCT FROM COALESCE(ps.proc_paper_key, '')
  );

UPDATE public.processed_secondary_exam_results
SET subject = 'History'
WHERE subject = 'History and Political Education';

-- -----------------------------------------------------------------------------
-- 3) class_subjects — bypass UCE compulsory rename guard (trigger)
-- -----------------------------------------------------------------------------
ALTER TABLE public.class_subjects DISABLE TRIGGER class_subjects_protect_uace_subsidiaries_trg;

DELETE FROM public.class_subjects cs
WHERE cs.subject = 'History and Political Education'
  AND EXISTS (
    SELECT 1
    FROM public.class_subjects h
    WHERE h.school_id = cs.school_id
      AND h.class_name = cs.class_name
      AND h.subject = 'History'
  );

UPDATE public.class_subjects
SET subject = 'History'
WHERE subject = 'History and Political Education';

-- Canonical catalog row (unique subject_name) — after class_subjects text is "History"
UPDATE public.uce_subject_catalog
SET subject_name = 'History'
WHERE subject_name = 'History and Political Education';

-- Refresh O-Level class_subjects metadata from catalog for Senior 1–4 rows
UPDATE public.class_subjects cs
SET
  uce_offering_type = u.catalog_offering,
  is_non_removable_default = (u.catalog_offering = 'compulsory')
FROM public.uce_subject_catalog u
WHERE TRIM(cs.class_name) ~* '^(senior\s*[1-4]|s\.?\s*[1-4])(\s|$)'
  AND TRIM(cs.subject) = TRIM(u.subject_name);

ALTER TABLE public.class_subjects ENABLE TRIGGER class_subjects_protect_uace_subsidiaries_trg;

-- -----------------------------------------------------------------------------
-- 4) student_olevel_subjects (unique: student_id, subject_name)
-- -----------------------------------------------------------------------------
DELETE FROM public.student_olevel_subjects s
WHERE s.subject_name = 'History and Political Education'
  AND EXISTS (
    SELECT 1
    FROM public.student_olevel_subjects h
    WHERE h.student_id = s.student_id
      AND h.subject_name = 'History'
  );

UPDATE public.student_olevel_subjects
SET subject_name = 'History'
WHERE subject_name = 'History and Political Education';

-- -----------------------------------------------------------------------------
-- 5) teacher_class_subjects (unique: teacher_id, class_name, subject)
-- -----------------------------------------------------------------------------
DELETE FROM public.teacher_class_subjects t
WHERE t.subject = 'History and Political Education'
  AND EXISTS (
    SELECT 1
    FROM public.teacher_class_subjects h
    WHERE h.teacher_id = t.teacher_id
      AND h.class_name = t.class_name
      AND h.subject = 'History'
  );

UPDATE public.teacher_class_subjects
SET subject = 'History'
WHERE subject = 'History and Political Education';

-- -----------------------------------------------------------------------------
-- 6) report_snapshot_data (no line keys; dedupe by snapshot + student + subject)
-- -----------------------------------------------------------------------------
DELETE FROM public.report_snapshot_data a
WHERE a.subject = 'History and Political Education'
  AND EXISTS (
    SELECT 1
    FROM public.report_snapshot_data b
    WHERE b.snapshot_id = a.snapshot_id AND b.student_id = a.student_id
      AND b.subject = 'History'
  );

UPDATE public.report_snapshot_data
SET subject = 'History'
WHERE subject = 'History and Political Education';
