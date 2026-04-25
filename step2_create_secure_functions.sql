-- Step 2: Create secure functions that only owners can call
-- This keeps your dashboard working while fixing security warnings

-- Create a secure function for dashboard metrics (only owners can call)
CREATE OR REPLACE FUNCTION public.get_secure_owner_dashboard_metrics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  -- Check if user is owner
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Access denied: Owner role required';
  END IF;

  -- Return data from materialized view
  RETURN (
    SELECT row_to_json(t) 
    FROM (
      SELECT * FROM owner_dashboard_metrics LIMIT 1
    ) t
  );
END;
$$;

-- Grant access to authenticated users (but function checks owner role)
GRANT EXECUTE ON FUNCTION public.get_secure_owner_dashboard_metrics() TO authenticated;