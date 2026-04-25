-- Fix for specific user a360d879-192c-4b5a-b776-6452849f1102
-- This user exists in auth.users but may have issues in public.users

-- First, let's check if they exist in public.users
SELECT 
    'BEFORE FIX - public.users check' as status,
    user_id,
    email,
    name,
    role,
    school_id,
    is_active
FROM public.users 
WHERE user_id = 'a360d879-192c-4b5a-b776-6452849f1102';

-- Get a default school_id (first available school)
DO $$
DECLARE
    target_user_id UUID := 'a360d879-192c-4b5a-b776-6452849f1102';
    default_school_id UUID;
    user_exists BOOLEAN := FALSE;
BEGIN
    -- Get first available school
    SELECT school_id INTO default_school_id 
    FROM public.schools 
    ORDER BY created_at ASC 
    LIMIT 1;
    
    -- If no schools exist, create one
    IF default_school_id IS NULL THEN
        INSERT INTO public.schools (school_id, name, address, phone, email)
        VALUES (gen_random_uuid(), 'Kimuli School', 'Default Address', '000-000-0000', 'admin@kimuliSchool.com')
        RETURNING school_id INTO default_school_id;
        RAISE NOTICE 'Created default school with ID: %', default_school_id;
    END IF;
    
    -- Check if user exists in public.users
    SELECT EXISTS(SELECT 1 FROM public.users WHERE user_id = target_user_id) INTO user_exists;
    
    IF user_exists THEN
        -- User exists, update their data
        UPDATE public.users 
        SET 
            email = 'kimulidaudi5@gmail.com',
            name = 'Kimuli Daudi',
            role = 'owner',
            school_id = COALESCE(school_id, default_school_id),
            is_active = true,
            updated_at = NOW()
        WHERE user_id = target_user_id;
        RAISE NOTICE 'Updated existing user in public.users';
    ELSE
        -- User doesn't exist, create them
        INSERT INTO public.users (
            user_id,
            email,
            name,
            role,
            school_id,
            is_active,
            created_at
        ) VALUES (
            target_user_id,
            'kimulidaudi5@gmail.com',
            'Kimuli Daudi',
            'owner',
            default_school_id,
            true,
            NOW()
        );
        RAISE NOTICE 'Created new user in public.users';
    END IF;
    
    -- Update auth metadata
    UPDATE auth.users 
    SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role": "owner"}'::jsonb
    WHERE id = target_user_id;
    RAISE NOTICE 'Updated auth metadata';
    
END $$;

-- Verify the fix
SELECT 
    'AFTER FIX - Verification' as status,
    u.user_id,
    u.email,
    u.name,
    u.role,
    u.school_id,
    u.is_active,
    s.name as school_name,
    au.email_confirmed_at IS NOT NULL as email_confirmed,
    au.raw_user_meta_data->>'role' as auth_role
FROM public.users u
LEFT JOIN public.schools s ON u.school_id = s.school_id
LEFT JOIN auth.users au ON u.user_id = au.id
WHERE u.user_id = 'a360d879-192c-4b5a-b776-6452849f1102';

-- Test the exact query that's failing in the app
SELECT 
    'APP QUERY TEST' as test_type,
    role,
    school_id,
    is_active
FROM public.users 
WHERE user_id = 'a360d879-192c-4b5a-b776-6452849f1102';