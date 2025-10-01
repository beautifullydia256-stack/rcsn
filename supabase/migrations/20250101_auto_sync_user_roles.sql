-- Automatically sync user role from public.users to auth.users metadata
-- This ensures login always works by keeping metadata in sync

-- Create function to sync role to auth metadata
CREATE OR REPLACE FUNCTION sync_user_role_to_auth()
RETURNS TRIGGER AS $$
BEGIN
  -- Update auth.users metadata with the role from public.users
  UPDATE auth.users
  SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', NEW.role)
  WHERE id = NEW.user_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on INSERT (when new user is created)
DROP TRIGGER IF EXISTS sync_user_role_on_insert ON public.users;
CREATE TRIGGER sync_user_role_on_insert
AFTER INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION sync_user_role_to_auth();

-- Create trigger on UPDATE (when role is changed)
DROP TRIGGER IF EXISTS sync_user_role_on_update ON public.users;
CREATE TRIGGER sync_user_role_on_update
AFTER UPDATE OF role ON public.users
FOR EACH ROW
WHEN (OLD.role IS DISTINCT FROM NEW.role)
EXECUTE FUNCTION sync_user_role_to_auth();

-- One-time sync for existing users (in case some are still missing)
UPDATE auth.users au
SET raw_user_meta_data = COALESCE(au.raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('role', pu.role)
FROM public.users pu
WHERE au.id = pu.user_id
AND pu.role IS NOT NULL
AND (au.raw_user_meta_data->>'role' IS NULL OR au.raw_user_meta_data->>'role' != pu.role);

COMMENT ON FUNCTION sync_user_role_to_auth() IS 'Automatically syncs user role from public.users to auth.users.raw_user_meta_data for proper login routing';

