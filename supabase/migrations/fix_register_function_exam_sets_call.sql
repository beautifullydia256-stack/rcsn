-- Fix the registration function to properly call insert_default_exam_sets_all_terms
-- Use fully qualified function name to ensure it's found

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
                p_user_id, -- User exists, so this is safe
                'Free (0-20)',
                0
            );
            
            -- Update user with school_id
            UPDATE users 
            SET school_id = v_school_id
            WHERE user_id = p_user_id;
            
            -- Create default exam sets (backup in case trigger doesn't fire)
            BEGIN
                PERFORM public.insert_default_exam_sets_all_terms(v_school_id);
            EXCEPTION
                WHEN OTHERS THEN
                    RAISE WARNING 'Failed to create default exam sets: %', SQLERRM;
            END;
            
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
    
    -- STEP 1: Create school with admin_id = NULL (breaks circular dependency)
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
        NULL, -- Set to NULL initially, will update after user is created
        'Free (0-20)',
        0
    );
    
    -- STEP 2: Create user record with school_id linked
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
    
    -- STEP 3: Now update school with admin_id (user exists now)
    UPDATE schools 
    SET admin_id = p_user_id
    WHERE school_id = v_school_id;
    
    -- Verify both records were created correctly
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id AND school_id = v_school_id) THEN
        RAISE EXCEPTION 'Failed to create user record with school_id';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM schools WHERE school_id = v_school_id AND admin_id = p_user_id) THEN
        RAISE EXCEPTION 'Failed to update school record with admin_id';
    END IF;
    
    -- STEP 4: Create default exam sets for the new school
    -- Use fully qualified function name: public.insert_default_exam_sets_all_terms
    -- The trigger should handle this, but this ensures it happens
    BEGIN
        PERFORM public.insert_default_exam_sets_all_terms(v_school_id);
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
        
        -- Try to clean up if anything was created
        IF v_school_id IS NOT NULL THEN
            -- Delete school if it exists
            DELETE FROM schools WHERE school_id = v_school_id;
            -- Delete user if it exists (cascade should handle this, but be explicit)
            DELETE FROM users WHERE user_id = p_user_id AND school_id = v_school_id;
        END IF;
        
        -- Re-raise the exception so the caller knows it failed
        RAISE;
END;
$$;




