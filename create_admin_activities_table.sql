-- Create admin_activities table to track admin actions
CREATE TABLE IF NOT EXISTS admin_activities (
    activity_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
    admin_user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL CHECK (activity_type IN ('expense_approval', 'expense_rejection', 'payment_processing', 'user_creation', 'system_action')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_admin_activities_school_id ON admin_activities(school_id);
CREATE INDEX IF NOT EXISTS idx_admin_activities_created_at ON admin_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activities_school_created ON admin_activities(school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activities_admin_user ON admin_activities(admin_user_id);

-- Enable RLS (Row Level Security)
ALTER TABLE admin_activities ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Admins and head teachers can view activities for their school
CREATE POLICY "Admin activities are viewable by school admins" ON admin_activities
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.user_id = auth.uid() 
            AND users.school_id = admin_activities.school_id 
            AND users.role IN ('admin', 'head_teacher')
        )
    );

-- Admins and head teachers can insert activities for their school
CREATE POLICY "Admin activities can be inserted by school admins" ON admin_activities
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.user_id = auth.uid() 
            AND users.school_id = admin_activities.school_id 
            AND users.role IN ('admin', 'head_teacher')
        )
    );

-- Add comment to table
COMMENT ON TABLE admin_activities IS 'Tracks administrative activities performed by admins and head teachers';
COMMENT ON COLUMN admin_activities.activity_type IS 'Type of activity: expense_approval, expense_rejection, payment_processing, user_creation, system_action';
COMMENT ON COLUMN admin_activities.metadata IS 'Additional data related to the activity (JSON format)';