-- Allow authenticated users (admins/teachers) to read, write, and delete files
-- under the pdf-cache/ prefix inside the published-reports Storage bucket.
-- These are temporary background-generated PDFs; they are not parent-facing.

CREATE POLICY "pdf_cache_authenticated_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'published-reports'
    AND name LIKE 'pdf-cache/%'
  );

CREATE POLICY "pdf_cache_authenticated_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'published-reports'
    AND name LIKE 'pdf-cache/%'
  )
  WITH CHECK (
    bucket_id = 'published-reports'
    AND name LIKE 'pdf-cache/%'
  );

CREATE POLICY "pdf_cache_authenticated_select"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'published-reports'
    AND name LIKE 'pdf-cache/%'
  );

CREATE POLICY "pdf_cache_authenticated_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'published-reports'
    AND name LIKE 'pdf-cache/%'
  );
