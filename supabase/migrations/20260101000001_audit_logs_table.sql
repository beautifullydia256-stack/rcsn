-- ============================================================================
-- AUDIT LOGS TABLE FOR OWNER DASHBOARD (FIXED)
-- Task 2: Audit logging for all owner actions
-- Requirements: 11.3, 11.8
-- ============================================================================

-- Create audit logs table for comprehensive action tracking
CREATE TABLE IF NOT EXISTS public.audit_logs (
  log_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(user_id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  resource TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT true
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp 
ON public.audit_logs (user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_action_timestamp 
ON public.audit_logs (action, created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_timestamp 
ON public.audit_logs (resource, created_at);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp 
ON public.audit_logs (created_at);

-- Enable RLS for audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policy - only owner can access audit logs
CREATE POLICY "owner_only_audit_logs" ON public.audit_logs
FOR ALL TO authenticated 
USING ((SELECT role FROM public.users WHERE user_id = auth.uid()) = 'owner');

-- Function to get audit logs with pagination
CREATE OR REPLACE FUNCTION public.get_audit_logs(
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0,
  p_user_id UUID DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_resource TEXT DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  log_id UUID,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  action TEXT,
  resource TEXT,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ,
  success BOOLEAN,
  total_count BIGINT
)
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH filtered_logs AS (
    SELECT 
      al.log_id,
      al.user_id,
      al.action,
      al.resource,
      al.details,
      al.ip_address,
      al.user_agent,
      al.created_at,
      al.success,
      u.name as user_name,
      u.email as user_email
    FROM public.audit_logs al
    JOIN public.users u ON u.user_id = al.user_id
    WHERE 
      (p_user_id IS NULL OR al.user_id = p_user_id)
      AND (p_action IS NULL OR al.action ILIKE '%' || p_action || '%')
      AND (p_resource IS NULL OR al.resource ILIKE '%' || p_resource || '%')
      AND (p_start_date IS NULL OR al.created_at >= p_start_date)
      AND (p_end_date IS NULL OR al.created_at <= p_end_date)
    ORDER BY al.created_at DESC
  ),
  total_count AS (
    SELECT COUNT(*) as count FROM filtered_logs
  )
  SELECT 
    fl.log_id,
    fl.user_id,
    fl.user_name,
    fl.user_email,
    fl.action,
    fl.resource,
    fl.details,
    fl.ip_address,
    fl.user_agent,
    fl.created_at,
    fl.success,
    tc.count as total_count
  FROM filtered_logs fl
  CROSS JOIN total_count tc
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_audit_logs TO authenticated;

-- Comments
COMMENT ON TABLE public.audit_logs IS 'Comprehensive audit trail for all owner dashboard actions';
COMMENT ON FUNCTION public.get_audit_logs IS 'Retrieves audit logs with filtering and pagination for owner dashboard';