-- Allow public visitors to read open job postings
DROP POLICY IF EXISTS "public_read_open_jobs" ON public.jobs;
CREATE POLICY "public_read_open_jobs" ON public.jobs
  FOR SELECT
  TO public
  USING (status IN ('Open', 'open', 'Active', 'active'));

-- Allow public applicants to submit job applications
DROP POLICY IF EXISTS "public_insert_job_applications" ON public.hr_job_applications;
CREATE POLICY "public_insert_job_applications" ON public.hr_job_applications
  FOR INSERT
  TO public
  WITH CHECK (
    full_name IS NOT NULL AND trim(full_name) <> '' AND
    email IS NOT NULL AND trim(email) <> '' AND
    job_id IS NOT NULL
  );
