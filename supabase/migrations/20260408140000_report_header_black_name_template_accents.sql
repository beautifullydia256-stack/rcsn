-- Report header defaults: school name black only; other lines use Primary Lower Section template accents.
-- Schools can still change any field in Admin → Branding (columns remain nullable/overridable).
--
-- Fixes: 20260209120000 set DB DEFAULTs and a targeted UPDATE to all-black; this restores accent defaults
-- and fixes existing rows that ended up entirely #000000.

-- Defaults for newly created school rows
ALTER TABLE public.schools ALTER COLUMN header_school_name_color SET DEFAULT '#000000';
ALTER TABLE public.schools ALTER COLUMN header_subtitle_color SET DEFAULT '#3b82f6';
ALTER TABLE public.schools ALTER COLUMN header_address_color SET DEFAULT '#1e40af';
ALTER TABLE public.schools ALTER COLUMN header_contact_color SET DEFAULT '#1e40af';
ALTER TABLE public.schools ALTER COLUMN header_motto_color SET DEFAULT '#2563eb';
ALTER TABLE public.schools ALTER COLUMN header_divider_color SET DEFAULT '#1e3a8a';
ALTER TABLE public.schools ALTER COLUMN header_chip_text_color SET DEFAULT '#1e3a8a';
ALTER TABLE public.schools ALTER COLUMN header_chip_background_color SET DEFAULT '#eff6ff';
ALTER TABLE public.schools ALTER COLUMN header_chip_border_color SET DEFAULT '#bfdbfe';
ALTER TABLE public.schools ALTER COLUMN header_meta_line_color SET DEFAULT '#64748b';
ALTER TABLE public.schools ALTER COLUMN header_contact_separator_color SET DEFAULT '#64748b';

-- One-time heal: subtitle/address/contact/motto/divider all ended up #000000 (primary + secondary).
-- Restores Lower Section template accents. Skips schools that already changed any of those five to another hex.
-- Name: forces black if it was black or legacy blue #1e3a8a; leaves a custom name colour alone.
UPDATE public.schools
SET
  header_school_name_color = CASE
    WHEN lower(trim(coalesce(header_school_name_color, ''))) IN ('#000000', '#1e3a8a') THEN '#000000'
    ELSE header_school_name_color
  END,
  header_subtitle_color = '#3b82f6',
  header_address_color = '#1e40af',
  header_contact_color = '#1e40af',
  header_motto_color = '#2563eb',
  header_divider_color = '#1e3a8a',
  header_chip_text_color = '#1e3a8a',
  header_chip_background_color = '#eff6ff',
  header_chip_border_color = '#bfdbfe',
  header_meta_line_color = '#64748b',
  header_contact_separator_color = '#64748b'
WHERE lower(trim(coalesce(header_subtitle_color, ''))) = '#000000'
  AND lower(trim(coalesce(header_address_color, ''))) = '#000000'
  AND lower(trim(coalesce(header_contact_color, ''))) = '#000000'
  AND lower(trim(coalesce(header_motto_color, ''))) = '#000000'
  AND lower(trim(coalesce(header_divider_color, ''))) = '#000000';
