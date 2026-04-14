-- Align legacy databases that used column "comment" instead of "comment_text",
-- and fix BEFORE INSERT trigger that referenced non-existent "is_default".

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'headteacher_comments_settings'
      AND column_name = 'comment'
  )
  AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'headteacher_comments_settings'
      AND column_name = 'comment_text'
  ) THEN
    ALTER TABLE public.headteacher_comments_settings RENAME COLUMN comment TO comment_text;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.set_headteacher_comments_setting_defaults_and_linking()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO public
AS $$
BEGIN
  IF NEW.created_at IS NULL THEN
    NEW.created_at := NOW();
  END IF;
  IF NEW.updated_at IS NULL THEN
    NEW.updated_at := NOW();
  END IF;
  IF NEW.school_id IS NULL THEN
    RAISE EXCEPTION 'Headteacher comments setting must be linked to a school';
  END IF;
  RETURN NEW;
END;
$$;
