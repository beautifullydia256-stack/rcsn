-- Add missing columns for teacher edit functionality
-- This fixes the "Could not find the 'experience' column" error

ALTER TABLE public.teachers 
ADD COLUMN IF NOT EXISTS experience TEXT,
ADD COLUMN IF NOT EXISTS qualification TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.teachers.experience IS 'Years of teaching experience';
COMMENT ON COLUMN public.teachers.qualification IS 'Educational qualifications and certifications';
