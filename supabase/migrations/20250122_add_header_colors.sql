-- Add header color customization columns to schools table
ALTER TABLE public.schools 
ADD COLUMN IF NOT EXISTS header_school_name_color TEXT DEFAULT '#1e3a8a',
ADD COLUMN IF NOT EXISTS header_subtitle_color TEXT DEFAULT '#3b82f6',
ADD COLUMN IF NOT EXISTS header_address_color TEXT DEFAULT '#1e40af',
ADD COLUMN IF NOT EXISTS header_contact_color TEXT DEFAULT '#1e40af',
ADD COLUMN IF NOT EXISTS header_motto_color TEXT DEFAULT '#2563eb',
ADD COLUMN IF NOT EXISTS header_divider_color TEXT DEFAULT '#1e3a8a';

COMMENT ON COLUMN public.schools.header_school_name_color IS 'Color for school name in report headers (hex format, e.g., #1e3a8a)';
COMMENT ON COLUMN public.schools.header_subtitle_color IS 'Color for subtitle in report headers (hex format)';
COMMENT ON COLUMN public.schools.header_address_color IS 'Color for address in report headers (hex format)';
COMMENT ON COLUMN public.schools.header_contact_color IS 'Color for contact information in report headers (hex format)';
COMMENT ON COLUMN public.schools.header_motto_color IS 'Color for motto in report headers (hex format)';
COMMENT ON COLUMN public.schools.header_divider_color IS 'Color for divider line in report headers (hex format)';

