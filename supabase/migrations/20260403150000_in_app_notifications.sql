-- In-app notification inbox per user (read/unread).

CREATE TABLE IF NOT EXISTS public.user_in_app_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES public.schools (school_id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  category TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::JSONB
);

CREATE INDEX IF NOT EXISTS idx_in_app_notif_user_unread
  ON public.user_in_app_notifications (user_id, read_at)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_in_app_notif_school_created
  ON public.user_in_app_notifications (school_id, created_at DESC);

ALTER TABLE public.user_in_app_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "in_app_notif_select_own" ON public.user_in_app_notifications;
CREATE POLICY "in_app_notif_select_own"
  ON public.user_in_app_notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "in_app_notif_update_own" ON public.user_in_app_notifications;
CREATE POLICY "in_app_notif_update_own"
  ON public.user_in_app_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "in_app_notif_service_insert" ON public.user_in_app_notifications;
-- Inserts from triggers use SECURITY DEFINER function below

CREATE OR REPLACE FUNCTION public.notify_school_staff_new_student()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r RECORD;
  v_title TEXT;
  v_body TEXT;
BEGIN
  v_title := 'New student enrolled';
  v_body := COALESCE(NEW.name, 'A student') || ' was added to the school.';

  FOR r IN
    SELECT u.user_id
    FROM public.users u
    WHERE u.school_id = NEW.school_id
      AND u.role IN ('admin', 'owner', 'head_teacher', 'accountant')
      AND COALESCE(u.is_active, TRUE)
  LOOP
    INSERT INTO public.user_in_app_notifications (school_id, user_id, title, body, category, metadata)
    VALUES (
      NEW.school_id,
      r.user_id,
      v_title,
      v_body,
      'students',
      jsonb_build_object('student_id', NEW.student_id, 'type', 'student_created')
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tr_notify_staff_on_student_insert ON public.students;
CREATE TRIGGER tr_notify_staff_on_student_insert
  AFTER INSERT ON public.students
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_school_staff_new_student();

GRANT SELECT, UPDATE ON public.user_in_app_notifications TO authenticated;
