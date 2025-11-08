-- Add pobox column to schools table for school branding
-- This allows schools to have a separate P.O.Box field for postal addresses

ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS pobox TEXT;

COMMENT ON COLUMN public.schools.pobox IS 'Post Office Box number and location (e.g., "P.O.Box 3673, Kampala Uganda")';

