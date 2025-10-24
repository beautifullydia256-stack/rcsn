-- Add school_code column to schools table for unique school identification
-- This enables auto-generated school codes during registration

-- Add school_code column to schools table
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS school_code TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_schools_school_code ON public.schools(school_code);

-- Add comment for documentation
COMMENT ON COLUMN public.schools.school_code IS 'Unique school code generated from school name (e.g., KHS for Kampala High School)';
