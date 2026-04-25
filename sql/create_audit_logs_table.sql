-- Create audit_logs table for owner action logging
-- This table stores all owner actions for security and compliance

CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN NOT NULL DEFAULT true,
  session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success);
CREATE INDEX IF NOT EXISTS idx_audit_logs_session_id ON audit_logs(session_id);

-- Create composite index for owner-specific queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_owner_actions ON audit_logs(user_id, timestamp DESC) 
WHERE action LIKE 'owner:%';

-- Add RLS policy for audit logs (only owners can read their own logs)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only owners can read audit logs
CREATE POLICY "Owners can read audit logs" ON audit_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.user_id = auth.uid() 
      AND users.role = 'owner'
    )
  );

-- Policy: System can insert audit logs (service role)
CREATE POLICY "System can insert audit logs" ON audit_logs
  FOR INSERT
  WITH CHECK (true);

-- Add comment for documentation
COMMENT ON TABLE audit_logs IS 'Audit trail for owner dashboard actions and security events';
COMMENT ON COLUMN audit_logs.user_id IS 'ID of the user who performed the action';
COMMENT ON COLUMN audit_logs.action IS 'Action performed (prefixed with owner: for owner actions)';
COMMENT ON COLUMN audit_logs.resource IS 'Resource or endpoint accessed';
COMMENT ON COLUMN audit_logs.details IS 'Additional details about the action in JSON format';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the client';
COMMENT ON COLUMN audit_logs.user_agent IS 'User agent string of the client';
COMMENT ON COLUMN audit_logs.success IS 'Whether the action was successful';
COMMENT ON COLUMN audit_logs.session_id IS 'Session ID if applicable';