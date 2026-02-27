-- Indexes for report preview and generation: exam_results is queried by school_id + exam_set_id and by school_id + class_name.
CREATE INDEX IF NOT EXISTS idx_exam_results_school_exam_set
  ON public.exam_results(school_id, exam_set_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_school_class
  ON public.exam_results(school_id, class_name);
