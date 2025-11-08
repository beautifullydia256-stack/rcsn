-- Add subtitle column to schools table for school branding
-- This allows schools to have a subtitle like "Premier Academy Ltd" below the main school name

ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS subtitle TEXT;

COMMENT ON COLUMN public.schools.subtitle IS 'School subtitle or secondary name (e.g., "Premier Academy Ltd") displayed below main school name in headers';

