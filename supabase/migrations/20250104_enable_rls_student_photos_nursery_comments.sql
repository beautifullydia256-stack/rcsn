-- Enable RLS on student_photos and nursery_auto_comments tables
-- Fixes security vulnerabilities: policy_exists_rls_disabled and rls_disabled_in_public

-- Enable RLS on student_photos table
ALTER TABLE IF EXISTS public.student_photos ENABLE ROW LEVEL SECURITY;

-- Enable RLS on nursery_auto_comments table
ALTER TABLE IF EXISTS public.nursery_auto_comments ENABLE ROW LEVEL SECURITY;

-- Check if policies exist for student_photos, if not create them
-- Note: The error indicates policies exist, so we just need to enable RLS
-- But we'll create a policy if it doesn't exist to be safe
DO $$
BEGIN
  -- Check if policy exists for student_photos
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'student_photos'
  ) THEN
    -- Create a policy for student_photos if none exists
    CREATE POLICY "student_photos_authenticated_access" ON public.student_photos
      FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- Create policy for nursery_auto_comments if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'nursery_auto_comments'
  ) THEN
    -- Create a policy for nursery_auto_comments
    CREATE POLICY "nursery_auto_comments_authenticated_access" ON public.nursery_auto_comments
      FOR ALL TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

