-- Allow nursery records to omit numeric marks while keeping existing data for other classes
ALTER TABLE public.exam_results
  ALTER COLUMN marks_obtained DROP NOT NULL,
  ALTER COLUMN total_marks DROP NOT NULL;

