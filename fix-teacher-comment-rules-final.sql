-- Final fix for teacher_comment_rules table
-- Run this in Supabase SQL Editor

-- Drop the table if it exists (to start fresh)
DROP TABLE IF EXISTS public.teacher_comment_rules CASCADE;

-- Create the teacher_comment_rules table with correct schema
CREATE TABLE public.teacher_comment_rules (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    school_id UUID NOT NULL REFERENCES public.schools(school_id) ON DELETE CASCADE,
    class_name TEXT NOT NULL,
    min_avg DECIMAL(5,2) NOT NULL,
    max_avg DECIMAL(5,2) NOT NULL,
    comment TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.teacher_comment_rules ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for authenticated users
CREATE POLICY "teacher_comment_rules_allow_all" ON public.teacher_comment_rules
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert sample data for Primary 2
INSERT INTO public.teacher_comment_rules (school_id, class_name, min_avg, max_avg, comment) VALUES
('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Primary 2', 0.00, 39.99, 'Needs improvement'),
('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Primary 2', 40.00, 49.99, 'Fair'),
('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Primary 2', 50.00, 59.99, 'Good'),
('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Primary 2', 60.00, 69.99, 'Very Good'),
('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Primary 2', 70.00, 79.99, 'Excellent'),
('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Primary 2', 80.00, 100.00, 'Outstanding');

-- Insert sample data for Primary 7 (since we have data for this class)
INSERT INTO public.teacher_comment_rules (school_id, class_name, min_avg, max_avg, comment) VALUES
('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Primary 7', 0.00, 39.99, 'Needs improvement'),
('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Primary 7', 40.00, 49.99, 'Fair'),
('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Primary 7', 50.00, 59.99, 'Good'),
('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Primary 7', 60.00, 69.99, 'Very Good'),
('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Primary 7', 70.00, 79.99, 'Excellent'),
('406bf29b-d7fd-457c-aa56-e29b9ef1a16d', 'Primary 7', 80.00, 100.00, 'Outstanding');

-- Test the table
SELECT 'Teacher Comment Rules Created' as info, COUNT(*) as count FROM teacher_comment_rules WHERE school_id = '406bf29b-d7fd-457c-aa56-e29b9ef1a16d';
