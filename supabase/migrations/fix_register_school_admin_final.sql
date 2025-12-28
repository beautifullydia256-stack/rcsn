-- Fix register_school_admin_final function to ensure it ALWAYS creates user record
-- This prevents the issue where auth.users exists but public.users doesn't

CREATE OR REPLACE FUNCTION public.register_school_admin_final(
    p_user_id UUID,
    p_email TEXT,
    p_name TEXT,
    p_phone TEXT,
    p_school_name TEXT,
    p_school_location TEXT,
    p_school_type TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_school_id UUID;
    v_result JSON;
    v_user_exists BOOLEAN;
BEGIN
    -- Check if user already exists (shouldn't happen, but safety check)
    SELECT EXISTS(SELECT 1 FROM users WHERE user_id = p_user_id) INTO v_user_exists;
    
    IF v_user_exists THEN
        -- User already exists, get their school_id if they have one
        SELECT school_id INTO v_school_id FROM users WHERE user_id = p_user_id;
        
        IF v_school_id IS NOT NULL THEN
            -- User already has a school, return it
            RETURN json_build_object(
                'success', true,
                'school_id', v_school_id,
                'admin_id', p_user_id,
                'message', 'User and school already exist'
            );
        ELSE
            -- User exists but no school - create school and link it
            v_school_id := gen_random_uuid();
            
            INSERT INTO schools (
                school_id,
                name,
                location,
                type,
                admin_id,
                subscription_plan,
                student_count
            ) VALUES (
                v_school_id,
                p_school_name,
                p_school_location,
                p_school_type,
                p_user_id,
                'Free (0-20)',
                0
            );
            
            -- Update user with school_id
            UPDATE users 
            SET school_id = v_school_id
            WHERE user_id = p_user_id;
            
            RETURN json_build_object(
                'success', true,
                'school_id', v_school_id,
                'admin_id', p_user_id,
                'message', 'School created and linked to existing user'
            );
        END IF;
    END IF;
    
    -- Generate new school ID
    v_school_id := gen_random_uuid();
    
    -- CRITICAL: Create school FIRST with admin_id = NULL (breaks circular dependency)
    -- We'll update it after creating the user
    INSERT INTO schools (
        school_id,
        name,
        location,
        type,
        admin_id,
        subscription_plan,
        student_count
    ) VALUES (
        v_school_id,
        p_school_name,
        p_school_location,
        p_school_type,
        NULL, -- Set to NULL initially, update after user is created
        'Free (0-20)',
        0
    );
    
    -- CRITICAL: Create user record with school_id linked
    -- Use ON CONFLICT to handle race conditions
    INSERT INTO users (
        user_id,
        role,
        email,
        password_hash,
        school_id,
        name,
        phone
    ) VALUES (
        p_user_id,
        'admin',
        p_email,
        '', -- password_hash not needed for auth users
        v_school_id,
        p_name,
        p_phone
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        school_id = EXCLUDED.school_id,
        role = EXCLUDED.role,
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        phone = EXCLUDED.phone;
    
    -- NOW update the school with admin_id (user exists now)
    UPDATE schools 
    SET admin_id = p_user_id
    WHERE school_id = v_school_id;
    
    -- Verify both records were created
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id AND school_id = v_school_id) THEN
        RAISE EXCEPTION 'Failed to create user record with school_id';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM schools WHERE school_id = v_school_id AND admin_id = p_user_id) THEN
        RAISE EXCEPTION 'Failed to create school record with admin_id';
    END IF;
    
    -- Create default exam sets for the new school (backup in case trigger doesn't fire)
    -- The trigger should handle this, but this ensures it happens
    BEGIN
        PERFORM insert_default_exam_sets_all_terms(v_school_id);
    EXCEPTION
        WHEN OTHERS THEN
            -- Log warning but don't fail registration if exam sets creation fails
            RAISE WARNING 'Failed to create default exam sets for school %: %', v_school_id, SQLERRM;
    END;
    
    -- Return success result
    RETURN json_build_object(
        'success', true,
        'school_id', v_school_id,
        'admin_id', p_user_id,
        'message', 'School and admin created successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error for debugging
        RAISE WARNING 'register_school_admin_final error: %', SQLERRM;
        
        -- Try to clean up if school was created but user wasn't
        IF v_school_id IS NOT NULL THEN
            DELETE FROM schools WHERE school_id = v_school_id AND admin_id = p_user_id;
        END IF;
        
        -- Re-raise the exception so the caller knows it failed
        RAISE;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.register_school_admin_final TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_school_admin_final TO anon;
GRANT EXECUTE ON FUNCTION public.register_school_admin_final TO service_role;

