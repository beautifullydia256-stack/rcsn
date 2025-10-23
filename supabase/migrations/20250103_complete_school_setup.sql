-- Complete School Setup Migration
-- This migration ensures all features work for new schools that register in the future
-- Includes: Storage bucket, database columns, tables, and RLS policies

-- 1. Create school-assets storage bucket for badge uploads
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'school-assets',
  'school-assets', 
  true,
  2097152,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Add branding columns to schools table
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS motto TEXT,
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS contact_email TEXT,
ADD COLUMN IF NOT EXISTS contact_phone TEXT;

-- 2b. Ensure teachers table has all required columns for edit functionality
-- Create sequence for employee IDs if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'teacher_emp_seq') THEN
    CREATE SEQUENCE teacher_emp_seq START 1;
  END IF;
END$$;

ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('Male','Female','Other')),
ADD COLUMN IF NOT EXISTS dob DATE,
ADD COLUMN IF NOT EXISTS national_id TEXT,
ADD COLUMN IF NOT EXISTS employee_id TEXT UNIQUE DEFAULT (
  'EMP-' || to_char(NOW(), 'YYYYMMDD') || '-' || lpad(nextval('teacher_emp_seq')::text, 4, '0')
),
ADD COLUMN IF NOT EXISTS date_of_hire DATE DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS subjects TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS classes TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS experience TEXT,
ADD COLUMN IF NOT EXISTS qualification TEXT,
ADD COLUMN IF NOT EXISTS salary NUMERIC;

-- Create helpful index for employee IDs
CREATE INDEX IF NOT EXISTS idx_teachers_employee_id ON public.teachers(employee_id);

-- 3. Create timetable_periods table
CREATE TABLE IF NOT EXISTS public.timetable_periods (
  id SERIAL PRIMARY KEY,
  school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  day_of_week TEXT NOT NULL CHECK (day_of_week IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
  subject TEXT NOT NULL,
  teacher_id UUID NOT NULL REFERENCES public.teachers(teacher_id) ON DELETE CASCADE,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Enable RLS on timetable_periods
ALTER TABLE public.timetable_periods ENABLE ROW LEVEL SECURITY;

-- 5. Storage policies for school-assets bucket
DROP POLICY IF EXISTS "Allow school badge uploads" ON storage.objects;
CREATE POLICY "Allow school badge uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'school-assets' AND
  (storage.foldername(name))[1] = 'school-badges'
);

DROP POLICY IF EXISTS "Public read access to school assets" ON storage.objects;
CREATE POLICY "Public read access to school assets"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'school-assets');

DROP POLICY IF EXISTS "Allow school admins to update badges" ON storage.objects;
CREATE POLICY "Allow school admins to update badges"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'school-assets' AND
  (storage.foldername(name))[1] = 'school-badges'
);

DROP POLICY IF EXISTS "Allow school admins to delete badges" ON storage.objects;
CREATE POLICY "Allow school admins to delete badges"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'school-assets' AND
  (storage.foldername(name))[1] = 'school-badges'
);

-- 6. Timetable periods RLS policy
DROP POLICY IF EXISTS "school admins can manage timetable periods" ON public.timetable_periods;
CREATE POLICY "school admins can manage timetable periods"
ON public.timetable_periods
FOR ALL TO authenticated
USING (
  school_id IN (
    SELECT school_id FROM public.schools 
    WHERE admin_id = auth.uid()
  )
)
WITH CHECK (
  school_id IN (
    SELECT school_id FROM public.schools 
    WHERE admin_id = auth.uid()
  )
);

-- 7. Ensure schools table has proper RLS policies
DROP POLICY IF EXISTS "optimized_authenticated_access" ON public.schools;
DROP POLICY IF EXISTS "schools_allow_all" ON public.schools;
CREATE POLICY "schools_allow_all"
ON public.schools
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 8. Add comments for documentation
COMMENT ON COLUMN public.schools.logo_url IS 'URL to school logo/badge from Supabase Storage';
COMMENT ON COLUMN public.schools.motto IS 'School motto or tagline';
COMMENT ON COLUMN public.schools.website IS 'School website URL';
COMMENT ON COLUMN public.schools.contact_email IS 'Primary contact email for the school';
COMMENT ON COLUMN public.schools.contact_phone IS 'Primary contact phone number for the school';

COMMENT ON TABLE public.timetable_periods IS 'Stores timetable periods for each school with class, day, time, subject, and teacher assignments';
