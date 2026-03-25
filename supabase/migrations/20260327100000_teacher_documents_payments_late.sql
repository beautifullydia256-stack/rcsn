-- Teacher profile: persisted documents, payment history index, late arrivals on attendance.

-- 1) Faster lookups for payroll lines linked to a teacher (school_expenses)
CREATE INDEX IF NOT EXISTS idx_school_expenses_school_linked_teacher_date
  ON public.school_expenses (school_id, linked_teacher_id, expense_date DESC)
  WHERE linked_teacher_id IS NOT NULL;

-- 2) Student attendance: late arrivals (set by attendance UI when marking)
ALTER TABLE public.student_attendance
  ADD COLUMN IF NOT EXISTS arrived_late BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.student_attendance.arrived_late IS
  'When present=true, true means the student arrived late (used for teacher performance stats).';

-- 3) Teacher documents (KYC / academic) — files in storage bucket teacher-documents
CREATE TABLE IF NOT EXISTS public.teacher_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES public.teachers (teacher_id) ON DELETE CASCADE,
  doc_kind TEXT NOT NULL CHECK (doc_kind IN ('kyc', 'academic')),
  doc_category TEXT,
  storage_path TEXT NOT NULL,
  original_filename TEXT NOT NULL,
  mime_type TEXT,
  file_size_bytes INT,
  uploaded_by UUID REFERENCES public.users (user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT teacher_documents_school_path_unique UNIQUE (school_id, storage_path)
);

CREATE INDEX IF NOT EXISTS idx_teacher_documents_teacher_school
  ON public.teacher_documents (teacher_id, school_id, doc_kind, created_at DESC);

COMMENT ON TABLE public.teacher_documents IS
  'KYC and academic files for teachers; storage_path is key in bucket teacher-documents.';

ALTER TABLE public.teacher_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teacher_documents_select_school" ON public.teacher_documents;
CREATE POLICY "teacher_documents_select_school"
  ON public.teacher_documents
  FOR SELECT
  TO authenticated
  USING (
    school_id IN (
      SELECT u.school_id
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id IS NOT NULL
    )
    OR (SELECT role FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1) = 'owner'
  );

DROP POLICY IF EXISTS "teacher_documents_write_staff" ON public.teacher_documents;
CREATE POLICY "teacher_documents_write_staff"
  ON public.teacher_documents
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1) = 'owner'
    OR school_id IN (SELECT school_id FROM public.schools WHERE admin_id = (SELECT auth.uid()))
    OR (
      school_id = public.current_user_school_id()
      AND EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.user_id = (SELECT auth.uid())
          AND u.school_id = teacher_documents.school_id
          AND u.role IN ('admin', 'head_teacher', 'accountant')
      )
    )
  )
  WITH CHECK (
    (SELECT role FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1) = 'owner'
    OR school_id IN (SELECT school_id FROM public.schools WHERE admin_id = (SELECT auth.uid()))
    OR (
      school_id = public.current_user_school_id()
      AND EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.user_id = (SELECT auth.uid())
          AND u.school_id = teacher_documents.school_id
          AND u.role IN ('admin', 'head_teacher', 'accountant')
      )
    )
  );

-- 4) Storage bucket (private; signed URLs in app)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'teacher-documents',
  'teacher-documents',
  false,
  10485760,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE
SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "teacher_documents_storage_select" ON storage.objects;
CREATE POLICY "teacher_documents_storage_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'teacher-documents'
    AND (
      (SELECT role FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1) = 'owner'
      OR EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.user_id = (SELECT auth.uid())
          AND u.school_id IS NOT NULL
          AND u.school_id::text = (storage.foldername(name))[1]
      )
      OR EXISTS (
        SELECT 1
        FROM public.schools s
        WHERE s.admin_id = (SELECT auth.uid())
          AND s.school_id::text = (storage.foldername(name))[1]
      )
    )
  );

DROP POLICY IF EXISTS "teacher_documents_storage_insert" ON storage.objects;
CREATE POLICY "teacher_documents_storage_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'teacher-documents'
    AND (
      (SELECT role FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1) = 'owner'
      OR EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.user_id = (SELECT auth.uid())
          AND u.school_id IS NOT NULL
          AND u.role IN ('admin', 'head_teacher', 'accountant')
          AND u.school_id::text = (storage.foldername(name))[1]
      )
      OR EXISTS (
        SELECT 1
        FROM public.schools s
        WHERE s.admin_id = (SELECT auth.uid())
          AND s.school_id::text = (storage.foldername(name))[1]
      )
    )
  );

DROP POLICY IF EXISTS "teacher_documents_storage_delete" ON storage.objects;
CREATE POLICY "teacher_documents_storage_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'teacher-documents'
    AND (
      (SELECT role FROM public.users WHERE user_id = (SELECT auth.uid()) LIMIT 1) = 'owner'
      OR EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.user_id = (SELECT auth.uid())
          AND u.school_id IS NOT NULL
          AND u.role IN ('admin', 'head_teacher', 'accountant')
          AND u.school_id::text = (storage.foldername(name))[1]
      )
      OR EXISTS (
        SELECT 1
        FROM public.schools s
        WHERE s.admin_id = (SELECT auth.uid())
          AND s.school_id::text = (storage.foldername(name))[1]
      )
    )
  );
