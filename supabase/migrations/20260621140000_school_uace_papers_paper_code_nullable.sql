-- Allow A-Level paper rows with only slot/label (no UNEB code), matching admin Settings behaviour.
ALTER TABLE public.school_uace_class_subject_papers
  ALTER COLUMN paper_code DROP NOT NULL;

COMMENT ON COLUMN public.school_uace_class_subject_papers.paper_code IS
  'UNEB paper code when known; NULL when the school only configured Paper 1/2/3 via paper_label.';
