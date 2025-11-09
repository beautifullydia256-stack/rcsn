-- Allow nursery records to be processed without numeric marks
ALTER TABLE public.processed_primary_exam_results
  ALTER COLUMN marks_obtained DROP NOT NULL,
  ALTER COLUMN total_marks DROP NOT NULL;

