-- Profile photo + on-file documents for non-teaching staff (KYC, contracts, licenses, etc.).
-- documents: JSON array of { id, kind, label, file_url, mime_type, file_name, uploaded_at }
ALTER TABLE public.other_staff_members
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

ALTER TABLE public.other_staff_members
  ADD COLUMN IF NOT EXISTS documents JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.other_staff_members.photo_url IS 'Profile photo URL or embedded data URL.';
COMMENT ON COLUMN public.other_staff_members.documents IS 'Attached documents: KYC, contracts, driver license, etc. Array of objects with id, kind, label, file_url, mime_type, file_name, uploaded_at.';
