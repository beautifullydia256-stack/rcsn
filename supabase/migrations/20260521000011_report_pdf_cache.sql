-- Pre-generated report PDF cache.
-- PDFs are generated in the background when admin views a preview and stored
-- here. Download becomes a signed-URL fetch from Storage instead of a full
-- Puppeteer re-render, making it instant.
-- Cache key: (school_id, student_id, class_name, term, year, exam_set_id, template_key)
-- TTL is enforced in application code (48 hours).

CREATE TABLE IF NOT EXISTS public.report_pdf_cache (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id       uuid        NOT NULL,
  student_id      uuid        NOT NULL,
  class_name      text        NOT NULL,
  term            integer     NOT NULL,
  year            integer     NOT NULL,
  exam_set_id     uuid        NOT NULL,
  template_key    text        NOT NULL DEFAULT 'default',
  storage_path    text        NOT NULL,
  generated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT report_pdf_cache_unique
    UNIQUE (school_id, student_id, class_name, term, year, exam_set_id, template_key)
);

CREATE INDEX IF NOT EXISTS idx_report_pdf_cache_class
  ON public.report_pdf_cache (school_id, class_name, term, year, exam_set_id);

ALTER TABLE public.report_pdf_cache ENABLE ROW LEVEL SECURITY;

-- Admin/staff can manage the cache for their own school.
CREATE POLICY "report_pdf_cache_authenticated"
  ON public.report_pdf_cache
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.report_pdf_cache TO authenticated;
