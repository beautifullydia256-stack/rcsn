-- Richer report header branding: chip / meta / separator + black defaults for main header copy.
-- Run: supabase db push (or apply in SQL editor).

-- New columns (filled on existing rows via DEFAULT)
ALTER TABLE public.schools
  ADD COLUMN IF NOT EXISTS header_chip_text_color TEXT DEFAULT '#000000',
  ADD COLUMN IF NOT EXISTS header_chip_background_color TEXT DEFAULT '#f1f5f9',
  ADD COLUMN IF NOT EXISTS header_chip_border_color TEXT DEFAULT '#cbd5e1',
  ADD COLUMN IF NOT EXISTS header_meta_line_color TEXT DEFAULT '#475569',
  ADD COLUMN IF NOT EXISTS header_contact_separator_color TEXT DEFAULT '#94a3b8';

COMMENT ON COLUMN public.schools.header_chip_text_color IS 'Report title chip (pill) text color';
COMMENT ON COLUMN public.schools.header_chip_background_color IS 'Report title chip background';
COMMENT ON COLUMN public.schools.header_chip_border_color IS 'Report title chip border';
COMMENT ON COLUMN public.schools.header_meta_line_color IS 'Small line under chip (exam set / year)';
COMMENT ON COLUMN public.schools.header_contact_separator_color IS 'Pipe between email and phone in header';

-- New inserts get black-forward defaults
ALTER TABLE public.schools ALTER COLUMN header_school_name_color SET DEFAULT '#000000';
ALTER TABLE public.schools ALTER COLUMN header_subtitle_color SET DEFAULT '#000000';
ALTER TABLE public.schools ALTER COLUMN header_address_color SET DEFAULT '#000000';
ALTER TABLE public.schools ALTER COLUMN header_contact_color SET DEFAULT '#000000';
ALTER TABLE public.schools ALTER COLUMN header_motto_color SET DEFAULT '#000000';
ALTER TABLE public.schools ALTER COLUMN header_divider_color SET DEFAULT '#000000';

-- Optional: migrate schools that still have the exact original blue factory set (never customized in branding UI).
UPDATE public.schools
SET
  header_school_name_color = '#000000',
  header_subtitle_color = '#000000',
  header_address_color = '#000000',
  header_contact_color = '#000000',
  header_motto_color = '#000000',
  header_divider_color = '#000000'
WHERE lower(trim(coalesce(header_school_name_color, ''))) = '#1e3a8a'
  AND lower(trim(coalesce(header_subtitle_color, ''))) = '#3b82f6'
  AND lower(trim(coalesce(header_address_color, ''))) = '#1e40af'
  AND lower(trim(coalesce(header_contact_color, ''))) = '#1e40af'
  AND lower(trim(coalesce(header_motto_color, ''))) = '#2563eb'
  AND lower(trim(coalesce(header_divider_color, ''))) = '#1e3a8a';
