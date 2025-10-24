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
ADD COLUMN IF NOT EXISTS salary NUMERIC,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

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

-- 9. Create function to generate unique school-branded emails
-- Format: firstname + lastname@schoolCode.sch
-- School code: First letter of each word in school name (lowercase)
-- Uniqueness: If email exists, append number (2, 3, 4, etc.)
CREATE OR REPLACE FUNCTION generate_unique_school_email(
  p_first_name TEXT,
  p_last_name TEXT,
  p_school_id UUID
) RETURNS TEXT AS $$
DECLARE
  v_school_name TEXT;
  v_school_code TEXT;
  v_base_email TEXT;
  v_final_email TEXT;
  v_counter INT := 1;
  v_email_exists BOOLEAN;
BEGIN
  -- Get school name
  SELECT name INTO v_school_name
  FROM schools
  WHERE school_id = p_school_id;
  
  -- Generate school code (first letter of each word, lowercase)
  IF v_school_name IS NOT NULL THEN
    SELECT LOWER(
      STRING_AGG(
        SUBSTRING(word FROM 1 FOR 1), ''
        ORDER BY ordinality
      )
    )
    INTO v_school_code
    FROM unnest(string_to_array(trim(v_school_name), ' ')) WITH ORDINALITY AS t(word, ordinality)
    LIMIT 3; -- Take first 3 words only
    
    -- If less than 3 words, pad with additional letters from first word
    IF LENGTH(v_school_code) < 3 THEN
      v_school_code := v_school_code || SUBSTRING(v_school_name FROM LENGTH(v_school_code) + 1 FOR 3 - LENGTH(v_school_code));
    END IF;
  ELSE
    v_school_code := 'sch'; -- Default fallback
  END IF;
  
  -- Generate base email
  v_base_email := LOWER(TRIM(p_first_name) || TRIM(p_last_name)) || '@' || v_school_code || '.sch';
  
  -- Check if base email exists and find unique variant
  v_final_email := v_base_email;
  
  LOOP
    -- Check if email exists in users table
    SELECT EXISTS(
      SELECT 1 FROM users 
      WHERE email = v_final_email
    ) INTO v_email_exists;
    
    -- If email doesn't exist, we found our unique email
    IF NOT v_email_exists THEN
      EXIT;
    END IF;
    
    -- Email exists, try with number suffix
    v_counter := v_counter + 1;
    v_final_email := LOWER(TRIM(p_first_name) || TRIM(p_last_name)) || v_counter::TEXT || '@' || v_school_code || '.sch';
    
    -- Safety check to prevent infinite loop
    IF v_counter > 999 THEN
      v_final_email := LOWER(TRIM(p_first_name) || TRIM(p_last_name)) || '_' || EXTRACT(EPOCH FROM NOW())::TEXT || '@' || v_school_code || '.sch';
      EXIT;
    END IF;
  END LOOP;
  
  RETURN v_final_email;
END;
$$ LANGUAGE plpgsql;
