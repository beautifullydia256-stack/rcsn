-- Teacher profile UI: persist every field shown on DesignTeacherProfile (overview cards).

ALTER TABLE public.teachers
  ADD COLUMN IF NOT EXISTS photo_url TEXT,
  ADD COLUMN IF NOT EXISTS nationality TEXT,
  ADD COLUMN IF NOT EXISTS religion TEXT,
  ADD COLUMN IF NOT EXISTS district TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
  ADD COLUMN IF NOT EXISTS employment_type TEXT,
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS previous_school TEXT,
  ADD COLUMN IF NOT EXISTS bank_name TEXT,
  ADD COLUMN IF NOT EXISTS bank_account TEXT,
  ADD COLUMN IF NOT EXISTS personal_email TEXT,
  ADD COLUMN IF NOT EXISTS performance_review_rating NUMERIC,
  ADD COLUMN IF NOT EXISTS performance_review_notes TEXT,
  ADD COLUMN IF NOT EXISTS performance_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS performance_reviewed_by TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

COMMENT ON COLUMN public.teachers.photo_url IS 'Profile photo URL or embedded data URL.';
COMMENT ON COLUMN public.teachers.personal_email IS 'Optional personal email (school/work email remains email).';
COMMENT ON COLUMN public.teachers.performance_review_notes IS 'Admin performance review notes shown on teacher profile.';
