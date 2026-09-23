-- Add updated_at column to school_expenses table if not present
-- This allows both updated_at tracking and backward compatibility with triggers or schema caches.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'school_expenses'
          AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.school_expenses
        ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();
    END IF;
END $$;
