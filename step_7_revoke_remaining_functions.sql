-- STEP 7: Revoke EXECUTE from anon role on remaining functions
-- This completes the revocation of all sensitive functions from unauthenticated access
-- These functions should only be accessible to authenticated users with appropriate roles

-- Ensure class ID functions
REVOKE EXECUTE ON FUNCTION public.ensure_class_id_for_publish(uuid, text) FROM anon;

-- Student import/export functions
REVOKE EXECUTE ON FUNCTION public.undo_student_import_batch(uuid) FROM anon;

-- Report publishing functions
REVOKE EXECUTE ON FUNCTION public.patch_published_reports_for_students(uuid, uuid, integer, integer, uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.replace_published_reports_for_scope(uuid, uuid, integer, integer, uuid, jsonb, text) FROM anon;

-- Student subject functions
REVOKE EXECUTE ON FUNCTION public.save_student_olevel_subjects(uuid, text[]) FROM anon;

-- Student general paper functions
REVOKE EXECUTE ON FUNCTION public.ensure_student_general_paper_alevel(uuid) FROM anon;

-- Remaining trigger functions
REVOKE EXECUTE ON FUNCTION public.students_refresh_all_age_years() FROM anon;

-- School chat presence functions
REVOKE EXECUTE ON FUNCTION public.school_chat_presence_go_offline() FROM anon;
REVOKE EXECUTE ON FUNCTION public.school_chat_retention_run() FROM anon;

-- PDF render session function
REVOKE EXECUTE ON FUNCTION public.insert_pdf_render_session(text, jsonb) FROM anon;

-- Remaining registration function
REVOKE EXECUTE ON FUNCTION public.register_school_admin_with_referral(uuid, text, text, text, text, text, text, uuid) FROM anon;

-- Authenticated user school ID function
REVOKE EXECUTE ON FUNCTION public.get_authenticated_user_school_id() FROM anon;

-- Additional functions that may have been missed in previous steps
REVOKE EXECUTE ON FUNCTION public.school_cashflow_monthly_totals(uuid) FROM anon;

-- Ensure all functions from security warnings are covered
-- (These may be duplicates from previous steps but included for completeness)
REVOKE EXECUTE ON FUNCTION public.apply_student_guardian_mirror_from_parents(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_admission_number(uuid, text, text, text, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_student_admission_number_if_empty() FROM anon;
