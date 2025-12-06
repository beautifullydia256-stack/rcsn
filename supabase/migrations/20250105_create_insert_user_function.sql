-- Create a helper function to insert users with explicit schema references
-- This bypasses any search_path or RLS issues

CREATE OR REPLACE FUNCTION public.insert_user_with_school(
  p_user_id UUID,
  p_email TEXT,
  p_name TEXT,
  p_role TEXT,
  p_school_id UUID,
  p_phone TEXT DEFAULT NULL,
  p_department TEXT DEFAULT NULL,
  p_position TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify school exists
  IF NOT EXISTS (SELECT 1 FROM public.schools WHERE school_id = p_school_id) THEN
    RAISE EXCEPTION 'School with id % does not exist', p_school_id;
  END IF;
  
  -- Insert user with explicit schema references
  INSERT INTO public.users (
    user_id,
    email,
    name,
    role,
    school_id,
    phone,
    department,
    position
  ) VALUES (
    p_user_id,
    p_email,
    p_name,
    p_role,
    p_school_id,
    p_phone,
    p_department,
    p_position
  );
END;
$$;

-- Grant execute permission to authenticated users (service role will use this)
GRANT EXECUTE ON FUNCTION public.insert_user_with_school TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_user_with_school TO service_role;

