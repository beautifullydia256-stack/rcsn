-- Complete fix for owner user kimulidaudi5@gmail.com
-- This handles all possible issues with the user setup

-- First, let's get the auth user ID
DO $$
DECLARE
    auth_user_id UUID;
    existing_user_id UUID;
    default_school_id UUID;
BEGIN
    -- Get the user ID from auth.users
    SELECT id INTO auth_user_id 
    FROM auth.users 
    WHERE email = 'kimulidaudi5@gmail.com';
    
    IF auth_user_id IS NULL THEN
        RAISE NOTICE 'User kimulidaudi5@gmail.com does not exist in auth.users. Please create the user first.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Found auth user ID: %', auth_user_id;
    
    -- Check if user exists in public.users
    SELECT user_id INTO existing_user_id 
    FROM public.users 
    WHERE email = 'kimulidaudi5@gmail.com';
    
    -- Get a default school (first available school)
    SELECT school_id INTO default_school_id 
    FROM public.schools 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    IF default_school_id IS NULL THEN
        RAISE NOTICE 'No schools found. Creating a default school.';
        INSERT INTO public.schools (school_id, name, address, phone, email)
        VALUES (gen_random_uuid(), 'Default School', 'Default Address', '000-000-0000', 'admin@defaultschool.com')
        RETURNING school_id INTO default_school_id;
    END IF;
    
    IF existing_user_id IS NULL THEN
        -- User doesn't exist in public.users, create them
        RAISE NOTICE 'Creating user in public.users with school_id: %', default_school_id;
        INSERT INTO public.users (
            user_id, 
            email, 
            name, 
            role, 
            school_id, 
            is_active,
            created_at
        ) VALUES (
            auth_user_id,
            'kimulidaudi5@gmail.com',
            'Kimuli Daudi',
            'owner',
            default_school_id,
            true,
            NOW()
        );
        RAISE NOTICE 'User created successfully in public.users';
    ELSE
        -- User exists, update their details
        RAISE NOTICE 'Updating existing user in public.users';
        UPDATE public.users 
        SET 
            user_id = auth_user_id,  -- Ensure IDs match
            name = 'Kimuli Daudi',
            role = 'owner',
            school_id = COALESCE(school_id, default_school_id),  -- Set school if null
            is_active = true,
            updated_at = NOW()
        WHERE email = 'kimulidaudi5@gmail.com';
        RAISE NOTICE 'User updated successfully';
    END IF;
    
    -- Also update the auth.users metadata to include role
    UPDATE auth.users 
    SET 
        raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "owner"}'::jsonb
    WHERE id = auth_user_id;
    
    RAISE NOTICE 'Auth metadata updated with role';
    
END $$;

-- Verify the fix
SELECT 
    'VERIFICATION' as status,
    u.user_id,
    u.email,
    u.name,
    u.role,
    u.school_id,
    u.is_active,
    s.name as school_name,
    au.email_confirmed_at IS NOT NULL as email_confirmed
FROM public.users u
LEFT JOIN public.schools s ON u.school_id = s.school_id
LEFT JOIN auth.users au ON u.user_id = au.id
WHERE u.email = 'kimulidaudi5@gmail.com';

-- Check if there are any RLS policy issues by testing the query that's failing
-- This simulates what the app is trying to do
SELECT 
    'RLS_TEST' as test_type,
    role,
    school_id,
    is_active
FROM public.users 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'kimulidaudi5@gmail.com');