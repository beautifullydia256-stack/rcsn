-- STEP 4: Revoke EXECUTE from anon role on sensitive functions (Batch 1)
-- This revokes access to financial, exam, student, and operational functions
-- Admins will retain access through their role permissions

-- Financial & Invoice Functions
REVOKE EXECUTE ON FUNCTION public.apply_carryover_balance_to_term_invoice(uuid, uuid, uuid, numeric, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_next_invoice_number(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_next_receipt_number(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_next_receipt_number(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.recalc_student_term_balances_from_payments(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reconcile_term_invoice_payments(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_balance_on_invoice_activation() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_invoice_amount_paid() FROM anon;
REVOKE EXECUTE ON FUNCTION public.total_term_payments_amount_paid(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.merge_duplicate_future_invoices_into_current(uuid) FROM anon;

-- Student Balance & Initialization Functions
REVOKE EXECUTE ON FUNCTION public.auto_create_balance_for_new_student() FROM anon;
REVOKE EXECUTE ON FUNCTION public.auto_initialize_student_balance() FROM anon;
REVOKE EXECUTE ON FUNCTION public.auto_initialize_balances_on_new_term() FROM anon;
REVOKE EXECUTE ON FUNCTION public.initialize_student_balances_for_term(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_student_balance() FROM anon;

-- Student Admission & Management Functions
REVOKE EXECUTE ON FUNCTION public.auto_generate_admission_number() FROM anon;
REVOKE EXECUTE ON FUNCTION public.generate_admission_number(uuid, text, text, text, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_student_admission_number_if_empty() FROM anon;
REVOKE EXECUTE ON FUNCTION public.apply_student_guardian_mirror_from_parents(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.save_student_olevel_subjects(uuid, text[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.undo_student_import_batch(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.owner_restore_soft_deleted_student(uuid, text) FROM anon;

-- Exam & Grading Functions
REVOKE EXECUTE ON FUNCTION public.auto_populate_processed_on_exam_insert() FROM anon;
REVOKE EXECUTE ON FUNCTION public.ensure_all_students_have_all_subjects(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ensure_class_id_for_publish(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ensure_student_general_paper_alevel(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.exam_set_teacher_entry_guard_message(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.exam_sets_open_for_teacher_entry(uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_report_students_for_class(uuid, uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.insert_default_exam_sets_all_terms(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.lock_report_snapshot(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.patch_published_reports_for_students(uuid, uuid, integer, integer, uuid, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.replace_published_reports_for_scope(uuid, uuid, integer, integer, uuid, jsonb, text) FROM anon;

-- Teacher Exam Result Functions
REVOKE EXECUTE ON FUNCTION public.teacher_upsert_exam_result_alevel(uuid, uuid, uuid, text, text, numeric, numeric, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.teacher_upsert_exam_result_alevel(uuid, uuid, uuid, text, text, numeric, numeric, text, text, uuid, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.teacher_upsert_exam_result_primary(uuid, uuid, uuid, text, text, numeric, numeric, text, text, text, text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.teacher_upsert_exam_result_secondary(uuid, uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, text, text, text, text, text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.teacher_upsert_exam_result_secondary(uuid, uuid, uuid, text, text, numeric, text, numeric, numeric, numeric, text, text, uuid, text, text, text) FROM anon;

-- Academic Year & Term Functions
REVOKE EXECUTE ON FUNCTION public.ensure_academic_year_exists(integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.resolve_current_school_term_id(uuid, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.trigger_ensure_academic_year_for_school_term() FROM anon;

-- Rollover & Promotion Functions
REVOKE EXECUTE ON FUNCTION public.automatic_term3_rollover() FROM anon;
REVOKE EXECUTE ON FUNCTION public.check_rollover_status_api(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_rollover_status(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.promote_and_graduate_students() FROM anon;

-- Repair & Maintenance Functions
REVOKE EXECUTE ON FUNCTION public.repair_engine_future_term_financials(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.repair_misplaced_opening_balances_to_current_term(uuid) FROM anon;

-- Notification & Grading Settings Functions
REVOKE EXECUTE ON FUNCTION public.insert_school_notification_grading_settings(uuid, uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_school_staff_grading_settings_change(uuid, uuid, text, text, text, jsonb, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_school_staff_new_student() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_owner_dashboard_update() FROM anon;
REVOKE EXECUTE ON FUNCTION public.setup_default_teacher_remarks_settings(uuid, uuid) FROM anon;

-- School Setup & Seeding Functions
REVOKE EXECUTE ON FUNCTION public.set_school_code_if_empty() FROM anon;
REVOKE EXECUTE ON FUNCTION public.seed_expense_subcategories_for_school(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.seed_pre_primary_holistic_for_school(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.trigger_seed_pre_primary_holistic_new_school() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trg_schools_seed_expense_subcategories() FROM anon;

-- Trigger Functions
REVOKE EXECUTE ON FUNCTION public.trg_notify_teacher_exam_class_prefs_change() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trg_notify_teacher_exam_grade_bands_after_insert() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trg_parents_sync_student_guardian() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trg_student_invoices_reconcile_after_delete() FROM anon;
REVOKE EXECUTE ON FUNCTION public.students_programme_follow_class_trg_fn() FROM anon;
REVOKE EXECUTE ON FUNCTION public.students_refresh_all_age_years() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_teacher_email_from_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_referral_use_count() FROM anon;

-- HR Functions
REVOKE EXECUTE ON FUNCTION public.hr_trg_leave_balance_on_status() FROM anon;
REVOKE EXECUTE ON FUNCTION public.hr_trg_validate_leave_request() FROM anon;
REVOKE EXECUTE ON FUNCTION public.hr_user_can_manage_hr(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.hr_user_can_payroll(uuid) FROM anon;

-- Chat Functions
REVOKE EXECUTE ON FUNCTION public.school_chat_finalize_voice(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.school_chat_get_or_create_dm(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.school_chat_list_eligible_users() FROM anon;
REVOKE EXECUTE ON FUNCTION public.school_chat_mark_peer_messages_delivered(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.school_chat_my_conversations() FROM anon;
REVOKE EXECUTE ON FUNCTION public.school_chat_pair_allowed(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.school_chat_presence_go_offline() FROM anon;
REVOKE EXECUTE ON FUNCTION public.school_chat_retention_run() FROM anon;
REVOKE EXECUTE ON FUNCTION public.school_chat_user_is_participant(uuid, uuid) FROM anon;

-- Financial Reporting Functions
REVOKE EXECUTE ON FUNCTION public.school_cashflow_monthly_totals(uuid) FROM anon;

-- Utility & System Functions
REVOKE EXECUTE ON FUNCTION public.get_authenticated_user_school_id() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_database_size() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_login_activity_stats() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_audit_logs(integer, integer, uuid, text, text, timestamp with time zone, timestamp with time zone) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_role_statistics() FROM anon;
REVOKE EXECUTE ON FUNCTION public.insert_pdf_render_session(text, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.insert_user_with_school(uuid, text, text, text, uuid, text, text, text) FROM anon;

-- Phone Lookup Functions (sensitive - can expose user data)
REVOKE EXECUTE ON FUNCTION public.find_parents_by_phone_last9(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.find_staff_users_by_phone_last9(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.find_teachers_by_phone_last9(text) FROM anon;
