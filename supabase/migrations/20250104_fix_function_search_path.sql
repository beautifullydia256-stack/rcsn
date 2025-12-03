-- Fix mutable search_path security warnings for all functions
-- Sets search_path to empty string to prevent search path injection attacks
-- This forces fully qualified names and prevents malicious schema manipulation

-- List of all functions that need search_path fixed
DO $$
DECLARE
    func_name TEXT;
    func_list TEXT[] := ARRAY[
        'trigger_ensure_all_students_have_all_subjects',
        'backfill_missing_subject_entries',
        'proc_results_before_fill_fields',
        'proc_results_after_update_class_comment',
        'generate_student_report_data_fixed',
        'generate_school_code',
        'set_class_teacher_comments_defaults',
        'auto_update_class_comments_on_settings_change',
        'auto_populate_processed_on_exam_insert',
        'get_teacher_remark_by_percentage',
        'generate_teacher_initials',
        'calculate_class_positions_for_exam_set',
        'generate_unique_school_code',
        'calculate_class_positions_for_all_classes',
        'setup_new_school_defaults',
        'auto_update_exam_results_remarks',
        'trigger_generate_employee_id',
        'update_report_templates_updated_at',
        'setup_default_teacher_remarks_settings',
        'get_exam_set_with_most_results',
        'teacher_upsert_exam_result_alevel',
        'ensure_all_students_have_all_subjects',
        'set_teacher_remarks_defaults',
        'teacher_upsert_exam_result_primary',
        'set_exam_result_defaults_and_linking',
        'get_employee_display_info',
        'generate_student_report_data',
        'generate_student_report_data_final',
        'refresh_class_teacher_comments',
        'calculate_aggregate_and_division',
        'update_class_template_settings_updated_at',
        'auto_setup_school_settings',
        'recalculate_class_positions_trigger',
        'auto_process_exam_results',
        'update_aggregate_division_on_grade_change',
        'update_class_teachers_updated_at',
        'teacher_upsert_exam_result_secondary',
        'automatic_term3_rollover',
        'insert_default_exam_sets',
        'insert_default_exam_sets_for_all_schools',
        'trigger_add_default_exam_sets_for_new_school',
        'get_rollover_status',
        'check_rollover_status_api',
        'generate_unique_school_email',
        'set_class_teacher_defaults',
        'process_exam_results_for_student',
        'calculate_primary_grade_from_marks',
        'insert_default_exam_sets_for_term',
        'insert_default_exam_sets_all_terms',
        'insert_default_exam_sets_all_terms_all_schools',
        'add_default_teacher_remarks_for_subject',
        'generate_employee_id',
        'set_teacher_class_subject_defaults_and_linking',
        'set_exam_set_active_for_input',
        'register_school_admin_final',
        'setup_default_class_teacher_comments_settings',
        'backfill_missed_entries_for_class',
        'auto_populate_processed_results',
        'setup_default_teacher_remarks_for_school'
    ];
BEGIN
    FOREACH func_name IN ARRAY func_list
    LOOP
        -- Check if function exists before altering
        IF EXISTS (
            SELECT 1 
            FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public' 
            AND p.proname = func_name
        ) THEN
            -- Set search_path to empty string for security
            -- This forces fully qualified names and prevents search path injection
            EXECUTE format('ALTER FUNCTION public.%I SET search_path = ''''', func_name);
        END IF;
    END LOOP;
END $$;

