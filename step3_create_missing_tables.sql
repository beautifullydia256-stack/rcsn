-- Step 3: Create missing tables for owner dashboard

-- Create user_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    ip_address INET,
    user_agent TEXT,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create login_activities table if it doesn't exist
CREATE TABLE IF NOT EXISTS login_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    login_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    logout_time TIMESTAMP WITH TIME ZONE,
    ip_address INET,
    user_agent TEXT,
    login_method TEXT DEFAULT 'email',
    success BOOLEAN DEFAULT true,
    failure_reason TEXT,
    session_duration_minutes INTEGER
);

-- Create school_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS school_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    contact_phone TEXT,
    address TEXT,
    student_count INTEGER,
    request_message TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'under_review')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT,
    approval_notes TEXT
);

-- Insert sample data for user_sessions
INSERT INTO user_sessions (user_id, expires_at, ip_address, user_agent) 
SELECT 
    id,
    NOW() + INTERVAL '1 day',
    '192.168.1.' || (RANDOM() * 255)::INTEGER,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
FROM auth.users 
WHERE email LIKE '%@%'
LIMIT 10
ON CONFLICT DO NOTHING;

-- Insert sample data for login_activities
INSERT INTO login_activities (user_id, login_time, ip_address, user_agent, success) 
SELECT 
    id,
    NOW() - (RANDOM() * INTERVAL '7 days'),
    '192.168.1.' || (RANDOM() * 255)::INTEGER,
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    RANDOM() > 0.1  -- 90% success rate
FROM auth.users 
WHERE email LIKE '%@%'
LIMIT 50
ON CONFLICT DO NOTHING;

-- Insert sample data for school_requests
INSERT INTO school_requests (
    school_name, 
    contact_name, 
    contact_email, 
    contact_phone, 
    address, 
    student_count, 
    request_message, 
    status
) VALUES 
(
    'Greenfield Academy', 
    'Sarah Johnson', 
    'sarah.johnson@greenfield.edu', 
    '+1-555-0123', 
    '123 Education St, Learning City, LC 12345', 
    450, 
    'We are interested in implementing your school management system for our growing academy.', 
    'pending'
),
(
    'Riverside High School', 
    'Michael Chen', 
    'mchen@riverside.edu', 
    '+1-555-0124', 
    '456 River Rd, Riverside, RS 67890', 
    1200, 
    'Looking for a comprehensive solution to manage our large student body and faculty.', 
    'under_review'
),
(
    'Sunshine Elementary', 
    'Emily Rodriguez', 
    'erodriguez@sunshine.edu', 
    '+1-555-0125', 
    '789 Sunny Ave, Brighttown, BT 11111', 
    300, 
    'Small elementary school seeking user-friendly management tools.', 
    'approved'
),
(
    'Tech Valley Institute', 
    'David Kim', 
    'dkim@techvalley.edu', 
    '+1-555-0126', 
    '321 Innovation Blvd, Tech City, TC 22222', 
    800, 
    'Technical institute requiring advanced features for our specialized programs.', 
    'rejected'
)
ON CONFLICT DO NOTHING;