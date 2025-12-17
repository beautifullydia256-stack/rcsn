-- Add branding and contact columns to schools table
ALTER TABLE public.schools
ADD COLUMN IF NOT EXISTS logo TEXT,
ADD COLUMN IF NOT EXISTS motto TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS address TEXT;

-- Add comments for documentation
COMMENT ON COLUMN public.schools.logo IS 'URL to school logo image';
COMMENT ON COLUMN public.schools.motto IS 'School motto or slogan';
COMMENT ON COLUMN public.schools.phone IS 'School contact phone number';
COMMENT ON COLUMN public.schools.email IS 'School contact email address';
COMMENT ON COLUMN public.schools.address IS 'School physical address';

