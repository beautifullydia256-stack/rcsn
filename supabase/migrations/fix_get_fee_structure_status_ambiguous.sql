-- Fix get_fee_structure_status function to qualify all class_name references
-- This function joins school_fee_structure with classes, both have class_name column

CREATE OR REPLACE FUNCTION public.get_fee_structure_status(p_school_id uuid)
RETURNS json
LANGUAGE plpgsql
SET search_path = 'public'
AS $$
DECLARE
    v_result JSON;
    v_fee_count INTEGER;
    v_zero_fee_count INTEGER;
    v_configured_fee_count INTEGER;
    v_total_classes INTEGER;
    v_unique_classes_with_fees INTEGER;
BEGIN
    -- Count total actual classes in the school (exclude non-class entries like ADMISSION)
    SELECT COUNT(*) INTO v_total_classes 
    FROM public.classes 
    WHERE school_id = p_school_id;
    
    -- Count unique actual classes that have fee structure entries (exclude ADMISSION, etc.)
    -- CRITICAL FIX: Qualify all class_name references with table aliases
    SELECT COUNT(DISTINCT sfs.class_name) INTO v_unique_classes_with_fees 
    FROM public.school_fee_structure sfs
    INNER JOIN public.classes c ON sfs.class_name = c.class_name AND sfs.school_id = c.school_id
    WHERE sfs.school_id = p_school_id;
    
    -- Count total fee structure entries for actual classes only
    -- CRITICAL FIX: Qualify all class_name references
    SELECT COUNT(*) INTO v_fee_count 
    FROM public.school_fee_structure sfs
    INNER JOIN public.classes c ON sfs.class_name = c.class_name AND sfs.school_id = c.school_id
    WHERE sfs.school_id = p_school_id;
    
    -- Count fee entries with zero amounts for actual classes only
    -- CRITICAL FIX: Qualify all class_name references
    SELECT COUNT(*) INTO v_zero_fee_count 
    FROM public.school_fee_structure sfs
    INNER JOIN public.classes c ON sfs.class_name = c.class_name AND sfs.school_id = c.school_id
    WHERE sfs.school_id = p_school_id 
    AND sfs.tuition_amount = 0 
    AND sfs.boarding_tuition_amount = 0;
    
    -- Count fee entries with non-zero amounts for actual classes only
    -- CRITICAL FIX: Qualify all class_name references
    SELECT COUNT(*) INTO v_configured_fee_count 
    FROM public.school_fee_structure sfs
    INNER JOIN public.classes c ON sfs.class_name = c.class_name AND sfs.school_id = c.school_id
    WHERE sfs.school_id = p_school_id 
    AND (sfs.tuition_amount > 0 OR sfs.boarding_tuition_amount > 0);
    
    -- Determine status based on actual classes only
    IF v_unique_classes_with_fees = 0 THEN
        v_result := json_build_object(
            'status', 'not_setup', 
            'message', 'Fee structure not set up', 
            'description', 'No fee structure has been created for your school yet.', 
            'action', 'Go to Financial Settings to set up your fee structure', 
            'total_classes', v_total_classes, 
            'configured_classes', 0, 
            'pending_classes', v_total_classes
        );
    ELSIF v_zero_fee_count = v_fee_count THEN
        v_result := json_build_object(
            'status', 'not_configured', 
            'message', 'Fee structure created but not configured', 
            'description', 'Fee structure exists but all amounts are set to 0. Please set proper fee amounts.', 
            'action', 'Go to Financial Settings to set fee amounts for each class', 
            'total_classes', v_total_classes, 
            'configured_classes', 0, 
            'pending_classes', v_unique_classes_with_fees
        );
    ELSIF v_unique_classes_with_fees = v_total_classes THEN
        v_result := json_build_object(
            'status', 'fully_configured', 
            'message', 'Fee structure fully configured', 
            'description', 'All classes have proper fee amounts set. Ready for student registration.', 
            'action', 'Fee structure is complete', 
            'total_classes', v_total_classes, 
            'configured_classes', v_unique_classes_with_fees, 
            'pending_classes', 0
        );
    ELSE
        v_result := json_build_object(
            'status', 'partially_configured', 
            'message', 'Fee structure partially configured', 
            'description', v_unique_classes_with_fees || ' out of ' || v_total_classes || ' classes have fee amounts set.', 
            'action', 'Go to Financial Settings to complete fee setup for remaining classes', 
            'total_classes', v_total_classes, 
            'configured_classes', v_unique_classes_with_fees, 
            'pending_classes', v_total_classes - v_unique_classes_with_fees
        );
    END IF;
    
    RETURN v_result;
END;
$$;




