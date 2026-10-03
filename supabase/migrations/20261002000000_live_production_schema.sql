-- ============================================================================
-- RAKAI COMMUNITY SCHOOL OF NURSING
-- EXACT LIVE PRODUCTION SCHEMA MIRROR (TABLES, RLS, FUNCTIONS, TRIGGERS)
-- EXTRACTED DIRECTLY FROM LIVE POSTGRESQL ENGINE
-- ============================================================================
-- Generated: 2026-10-02T17:28:35.037Z
-- Zero user data included. Pure clean structure & security rules.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "pg_trgm" WITH SCHEMA extensions;

CREATE SCHEMA IF NOT EXISTS private;
CREATE SCHEMA IF NOT EXISTS _private;

-- ----------------------------------------------------------------------------
-- 2. TABLES & COLUMNS
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."admin_activities" (
  "activity_id" uuid NOT NULL DEFAULT extensions.gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "admin_user_id" uuid NOT NULL,
  "activity_type" text NOT NULL,
  "title" text NOT NULL,
  "description" text NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."admission_sequences" (
  "sequence_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "year" integer NOT NULL,
  "current_sequence" integer DEFAULT 1,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."affiliate_clicks" (
  "click_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "affiliate_id" uuid NOT NULL,
  "code" text,
  "url" text,
  "ip" inet,
  "user_agent" text,
  "utm_source" text,
  "utm_medium" text,
  "utm_campaign" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."affiliate_codes" (
  "code_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "affiliate_id" uuid NOT NULL,
  "code" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."affiliate_earnings" (
  "earning_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "affiliate_id" uuid NOT NULL,
  "amount" numeric NOT NULL,
  "currency" text DEFAULT 'USD'::text,
  "status" text DEFAULT 'pending'::text,
  "description" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."affiliates" (
  "affiliate_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid,
  "username" text,
  "email" text NOT NULL,
  "payment_info" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "name" text,
  "phone" text,
  "status" text NOT NULL DEFAULT 'ACTIVE'::text
);

CREATE TABLE IF NOT EXISTS public."assignment_answers" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "submission_id" uuid NOT NULL,
  "question_id" uuid NOT NULL,
  "answer_text" text,
  "marks_awarded" integer,
  "is_correct" boolean,
  "created_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."assignment_questions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "assignment_id" uuid NOT NULL,
  "question_number" integer NOT NULL,
  "question_text" text NOT NULL,
  "question_image" text,
  "correct_answer" text,
  "marks" integer DEFAULT 1,
  "created_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."assignment_submissions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "assignment_id" uuid,
  "student_id" uuid,
  "submitted_at" timestamptz DEFAULT now(),
  "file_url" text,
  "status" text DEFAULT 'submitted'::text,
  "grade" numeric,
  "feedback" text,
  "created_at" timestamptz DEFAULT now(),
  "total_time_spent_seconds" integer DEFAULT 0,
  "paste_detected" boolean DEFAULT false,
  "max_paste_chunk_size" integer DEFAULT 0,
  "calculated_wpm" integer DEFAULT 0,
  "system_flagged" boolean DEFAULT false,
  "student_id_fk" uuid,
  "school_id" uuid
);

CREATE TABLE IF NOT EXISTS public."assignments" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "teacher_id" uuid,
  "school_id" uuid,
  "class_name" text NOT NULL,
  "subject" text NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "due_date" date NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "assignment_type" text DEFAULT 'file'::text,
  "file_url" text,
  "instructions" text,
  "total_marks" integer DEFAULT 0,
  "status" text DEFAULT 'active'::text
);

CREATE TABLE IF NOT EXISTS public."attendance" (
  "attendance_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "teacher_id" uuid,
  "school_id" uuid NOT NULL,
  "type" text NOT NULL,
  "timestamp" timestamp DEFAULT now(),
  "ip_address" text
);

CREATE TABLE IF NOT EXISTS public."audit_log" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid,
  "entity" text NOT NULL,
  "entity_id" text,
  "action" text NOT NULL,
  "user_id" uuid,
  "details" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."audit_logs" (
  "log_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "user_id" uuid NOT NULL,
  "action" text NOT NULL,
  "resource" text NOT NULL,
  "details" jsonb DEFAULT '{}'::jsonb,
  "ip_address" inet,
  "user_agent" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "success" boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public."balance_brought_forward" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "student_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "to_term_id" uuid NOT NULL,
  "amount_outstanding" numeric NOT NULL,
  "reference_invoice_ids" uuid[] NOT NULL DEFAULT '{}'::uuid[],
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."biometric_device_users" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "device_user_id" text NOT NULL,
  "person_type" text NOT NULL,
  "person_id" uuid NOT NULL,
  "device_name" text,
  "active" boolean NOT NULL DEFAULT true,
  "enrolled_at" timestamptz NOT NULL DEFAULT now(),
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "device_id" uuid
);

CREATE TABLE IF NOT EXISTS public."biometric_devices" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "device_name" text NOT NULL,
  "device_type" text NOT NULL,
  "ip_address" text,
  "port" integer DEFAULT 4370,
  "serial_number" text,
  "location" text,
  "webhook_token" text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'::text),
  "is_active" boolean NOT NULL DEFAULT true,
  "last_sync_at" timestamptz,
  "sync_status" text,
  "sync_message" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "scan_type" text NOT NULL DEFAULT 'arrival'::text
);

CREATE TABLE IF NOT EXISTS public."class_streams" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "class_name" text NOT NULL,
  "stream_name" text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."class_subjects" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "class_name" text NOT NULL,
  "subject" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "uce_offering_type" text,
  "is_non_removable_default" boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public."class_teacher_comments_settings" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "class_name" text NOT NULL,
  "min_percent" integer NOT NULL,
  "max_percent" integer NOT NULL,
  "comment" text NOT NULL DEFAULT 'A good performance with steady progress. Continued effort and focus will lead to even better achievement.'::text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  "comment_text" text NOT NULL DEFAULT 'A good performance with steady progress. Continued effort and focus will lead to even better achievement.'::text,
  "created_by" uuid,
  "is_default" boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public."class_teacher_nursery_comment_settings" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "performance_level" text NOT NULL,
  "comment_text" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."class_teachers" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "class_name" text NOT NULL,
  "teacher_id" uuid NOT NULL,
  "year" integer NOT NULL DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer,
  "term" integer NOT NULL DEFAULT 3,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "is_primary" boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public."class_template_settings" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "class_name" text NOT NULL,
  "template_id" uuid,
  "is_o_level" boolean DEFAULT false,
  "class_teacher_id" uuid,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "is_primary" boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public."classes" (
  "class_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "class_name" text NOT NULL,
  "description" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  "max_students" integer DEFAULT 1000
);

CREATE TABLE IF NOT EXISTS public."curriculum_files" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "class_name" text NOT NULL,
  "display_name" text NOT NULL,
  "storage_path" text NOT NULL,
  "original_filename" text,
  "mime_type" text,
  "file_size_bytes" bigint NOT NULL DEFAULT 0,
  "uploaded_by" uuid,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."curriculum_scheme_examples" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "education_level" text NOT NULL,
  "class_name" text NOT NULL,
  "subject" text,
  "term" text NOT NULL,
  "theme" text NOT NULL DEFAULT ''::text,
  "source_school" text NOT NULL DEFAULT ''::text,
  "example_entries" jsonb NOT NULL,
  "verified" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."curriculum_topics" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "education_level" text NOT NULL,
  "class_name" text NOT NULL,
  "subject" text,
  "term" text NOT NULL,
  "sequence_order" integer NOT NULL DEFAULT 0,
  "theme" text NOT NULL DEFAULT ''::text,
  "sub_theme" text NOT NULL DEFAULT ''::text,
  "learning_outcome" text NOT NULL DEFAULT ''::text,
  "content_summary" text NOT NULL DEFAULT ''::text,
  "suggested_competences" text NOT NULL DEFAULT ''::text,
  "suggested_methods" text NOT NULL DEFAULT ''::text,
  "suggested_life_skills" text NOT NULL DEFAULT ''::text,
  "suggested_materials" text NOT NULL DEFAULT ''::text,
  "source_reference" text NOT NULL DEFAULT ''::text,
  "verified" boolean NOT NULL DEFAULT false,
  "created_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."discipline_records" (
  "record_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "incident_date" date NOT NULL DEFAULT CURRENT_DATE,
  "incident_type" text NOT NULL,
  "description" text NOT NULL,
  "action_taken" text,
  "recorded_by" uuid,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "notes" text NOT NULL,
  "action_type" text NOT NULL,
  "suspension_start_date" date,
  "suspension_end_date" date,
  "evidence_storage_path" text,
  "title" text
);

CREATE TABLE IF NOT EXISTS public."educational_library" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "description" text,
  "category" text,
  "display_name" text NOT NULL,
  "storage_path" text NOT NULL,
  "original_filename" text,
  "mime_type" text,
  "file_size_bytes" bigint NOT NULL DEFAULT 0,
  "tags" text[],
  "downloads" integer NOT NULL DEFAULT 0,
  "uploaded_by" uuid,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."election_candidates" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "election_id" uuid NOT NULL,
  "portfolio_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "manifesto_summary" text,
  "photo_url" text,
  "gpa_or_grade_standing" varchar(50),
  "disciplinary_clearance" boolean DEFAULT true,
  "vote_count" bigint DEFAULT 0,
  "is_winner" boolean DEFAULT false,
  "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public."election_voter_logs" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "election_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "has_voted" boolean DEFAULT true,
  "voted_at" timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public."elections" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "academic_year" varchar(20) NOT NULL,
  "title" varchar(150) NOT NULL,
  "description" text,
  "voting_starts_at" timestamptz NOT NULL,
  "voting_ends_at" timestamptz NOT NULL,
  "status" varchar(20) DEFAULT 'DRAFT'::character varying,
  "certified_by" uuid,
  "certified_at" timestamptz,
  "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public."exam_results" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "exam_set_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "class_name" text NOT NULL,
  "subject" text NOT NULL,
  "marks_obtained" numeric DEFAULT 0,
  "total_marks" numeric DEFAULT 100,
  "grade" text,
  "remarks" text,
  "teacher_initials" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "teacher_id" text,
  "teacher_comment" text,
  "activity_score" numeric,
  "descriptor" text,
  "exam_score" numeric,
  "final_score" numeric,
  "overall_remark" text,
  "topic" text,
  "formative_score" numeric,
  "paper_number" text,
  "nursery_skill_performance" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "paper_code" text,
  "exam_topic_key" text,
  "exam_paper_key" text,
  "uace_points" integer,
  "nursery_report_format" varchar(20) DEFAULT 'latest'::character varying
);

CREATE TABLE IF NOT EXISTS public."exam_sets" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "term" integer NOT NULL,
  "year" integer NOT NULL,
  "target_classes" text[] DEFAULT '{}'::text[],
  "is_active" boolean DEFAULT true,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "sort_order" integer DEFAULT 1,
  "active_for_input" boolean DEFAULT false,
  "is_primary" boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public."expense_categories" (
  "category_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "category_name" text NOT NULL,
  "description" text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "is_default" boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public."expense_main_categories" (
  "code" text NOT NULL,
  "label_en" text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public."expense_subcategories" (
  "subcategory_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "main_category_code" text NOT NULL,
  "name" text NOT NULL,
  "is_salary" boolean NOT NULL DEFAULT false,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."expense_subcategory_defaults" (
  "id" integer NOT NULL DEFAULT nextval('expense_subcategory_defaults_id_seq'::regclass),
  "main_category_code" text NOT NULL,
  "name" text NOT NULL,
  "is_salary" boolean NOT NULL DEFAULT false,
  "sort_order" integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public."fee_structures" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "class_name" text NOT NULL,
  "term_id" uuid,
  "year" integer NOT NULL,
  "term" integer NOT NULL,
  "fee_amount" numeric DEFAULT 0,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."generated_reports" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "snapshot_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "template_id" uuid,
  "report_data" jsonb NOT NULL,
  "pdf_url" text,
  "generated_at" timestamptz DEFAULT now(),
  "template_version" text,
  "generated_by" uuid,
  "file_size_bytes" integer
);

CREATE TABLE IF NOT EXISTS public."global_terms" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "year" integer NOT NULL,
  "term" integer NOT NULL,
  "term_name" text NOT NULL,
  "window_start" date NOT NULL,
  "window_end" date NOT NULL,
  "hard_stop_date" date NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."grades" (
  "grade_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "student_id" uuid NOT NULL,
  "teacher_id" uuid,
  "subject" text NOT NULL,
  "grade" numeric NOT NULL,
  "term" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."grading_scale" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid,
  "grade_code" text NOT NULL,
  "min_pct" numeric NOT NULL,
  "max_pct" numeric NOT NULL
);

CREATE TABLE IF NOT EXISTS public."guild_announcements" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "tenure_id" uuid NOT NULL,
  "title" varchar(200) NOT NULL,
  "content" text NOT NULL,
  "target_scope" varchar(50) DEFAULT 'ALL'::character varying,
  "target_value" varchar(100),
  "priority" varchar(20) DEFAULT 'NORMAL'::character varying,
  "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public."guild_portfolios" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "title" varchar(100) NOT NULL,
  "description" text,
  "permissions" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "is_default" boolean DEFAULT false,
  "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public."guild_tenures" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "portfolio_id" uuid NOT NULL,
  "academic_year" varchar(20) NOT NULL,
  "term_start" timestamptz NOT NULL,
  "term_end" timestamptz NOT NULL,
  "status" varchar(20) DEFAULT 'ACTIVE'::character varying,
  "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public."guild_transactions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "tenure_id" uuid NOT NULL,
  "amount" numeric NOT NULL,
  "type" varchar(20) NOT NULL,
  "category" varchar(50) NOT NULL,
  "description" text NOT NULL,
  "receipt_url" text,
  "status" varchar(20) DEFAULT 'PENDING'::character varying,
  "synced_with_school_finance" boolean DEFAULT false,
  "approved_by" uuid,
  "approved_at" timestamptz,
  "rejection_reason" text,
  "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public."guild_welfare_reports" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "tenure_id" uuid,
  "facility_type" varchar(50) NOT NULL,
  "title" varchar(150) NOT NULL,
  "severity" varchar(20) DEFAULT 'MEDIUM'::character varying,
  "status" varchar(20) DEFAULT 'OPEN'::character varying,
  "description" text NOT NULL,
  "action_taken" text,
  "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public."headteacher_comments_settings" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "min_percent" integer NOT NULL,
  "max_percent" integer NOT NULL,
  "comment_text" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."headteacher_nursery_comment_settings" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "performance_level" text NOT NULL,
  "comment_text" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."hr_job_applications" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "job_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "full_name" text NOT NULL,
  "email" text NOT NULL,
  "phone" text,
  "cover_letter" text,
  "cv_url" text,
  "status" text NOT NULL DEFAULT 'new'::text,
  "stage_notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."hr_leave_balances" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "staff_kind" text NOT NULL,
  "staff_id" uuid NOT NULL,
  "leave_type_id" uuid NOT NULL,
  "year" integer NOT NULL,
  "balance_days" numeric NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."hr_leave_requests" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "staff_kind" text NOT NULL,
  "staff_id" uuid NOT NULL,
  "leave_type_id" uuid NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "half_day_part" text,
  "status" text NOT NULL DEFAULT 'pending'::text,
  "reason" text,
  "requested_by_user_id" uuid,
  "reviewed_by_user_id" uuid,
  "reviewed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."hr_leave_types" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "name" text NOT NULL,
  "paid" boolean NOT NULL DEFAULT true,
  "default_days_per_year" numeric NOT NULL DEFAULT 0,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."hr_onboarding_run_tasks" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "run_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "done_at" timestamptz
);

CREATE TABLE IF NOT EXISTS public."hr_onboarding_runs" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "template_id" uuid,
  "subject_staff_kind" text NOT NULL,
  "subject_staff_id" uuid NOT NULL,
  "job_application_id" uuid,
  "status" text NOT NULL DEFAULT 'in_progress'::text,
  "started_at" timestamptz NOT NULL DEFAULT now(),
  "completed_at" timestamptz
);

CREATE TABLE IF NOT EXISTS public."hr_onboarding_template_tasks" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "template_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "sort_order" integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public."hr_onboarding_templates" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "name" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."hr_payroll_periods" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "label" text NOT NULL,
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "status" text NOT NULL DEFAULT 'draft'::text,
  "closed_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."hr_payslips" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "payroll_period_id" uuid NOT NULL,
  "staff_kind" text NOT NULL,
  "staff_id" uuid NOT NULL,
  "gross" numeric NOT NULL DEFAULT 0,
  "allowances" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "deductions" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "net" numeric NOT NULL DEFAULT 0,
  "currency" text NOT NULL DEFAULT 'UGX'::text,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."hr_review_cycles" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "name" text NOT NULL,
  "period_start" date NOT NULL,
  "period_end" date NOT NULL,
  "status" text NOT NULL DEFAULT 'draft'::text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."hr_staff_goals" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "cycle_id" uuid,
  "staff_kind" text NOT NULL,
  "staff_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "target_value" text,
  "status" text NOT NULL DEFAULT 'active'::text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."hr_staff_reviews" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "cycle_id" uuid NOT NULL,
  "staff_kind" text NOT NULL,
  "staff_id" uuid NOT NULL,
  "reviewer_user_id" uuid,
  "rating" numeric,
  "summary" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."invoice_sequences" (
  "school_id" uuid NOT NULL,
  "year" integer NOT NULL,
  "last_number" integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public."jobs" (
  "job_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid,
  "title" text NOT NULL,
  "location" text,
  "description" text,
  "posted_by" text DEFAULT 'owner'::text,
  "created_at" timestamp DEFAULT now(),
  "status" text NOT NULL DEFAULT 'open'::text
);

CREATE TABLE IF NOT EXISTS public."lesson_logs" (
  "log_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "teacher_id" uuid NOT NULL,
  "timetable_period_id" text NOT NULL,
  "class_name" text NOT NULL,
  "subject" text NOT NULL,
  "lesson_date" date NOT NULL,
  "scheduled_start" text NOT NULL,
  "scheduled_end" text NOT NULL,
  "started_at" timestamptz,
  "ended_at" timestamptz,
  "start_photo_path" text,
  "end_photo_path" text,
  "status" text NOT NULL DEFAULT 'started'::text,
  "approved_by" uuid,
  "approved_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."library" (
  "content_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "description" text,
  "file_url" text,
  "uploaded_by" text DEFAULT 'owner'::text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."library_book_copies" (
  "copy_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "book_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "barcode" text,
  "status" text DEFAULT 'available'::text,
  "condition" text DEFAULT 'good'::text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."library_books" (
  "book_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "isbn" text,
  "title" text NOT NULL,
  "author" text NOT NULL,
  "publisher" text,
  "publication_year" integer,
  "category" text,
  "description" text,
  "total_copies" integer DEFAULT 1,
  "available_copies" integer DEFAULT 1,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."library_borrows" (
  "borrow_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "copy_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "borrow_date" date NOT NULL DEFAULT CURRENT_DATE,
  "due_date" date NOT NULL,
  "return_date" date,
  "status" text DEFAULT 'active'::text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."library_fines" (
  "fine_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "borrow_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "fine_amount" numeric NOT NULL DEFAULT 0,
  "fine_reason" text NOT NULL,
  "fine_date" date NOT NULL DEFAULT CURRENT_DATE,
  "status" text DEFAULT 'unpaid'::text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."library_reservations" (
  "reservation_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "book_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "reservation_date" date NOT NULL DEFAULT CURRENT_DATE,
  "status" text DEFAULT 'pending'::text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."login_activities" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "user_id" uuid,
  "login_time" timestamptz DEFAULT now(),
  "logout_time" timestamptz,
  "ip_address" inet,
  "user_agent" text,
  "login_method" text DEFAULT 'email'::text,
  "success" boolean DEFAULT true,
  "failure_reason" text,
  "session_duration_minutes" integer
);

CREATE TABLE IF NOT EXISTS public."logs" (
  "log_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid,
  "user_id" uuid,
  "action" text NOT NULL,
  "details" text,
  "ip_address" text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."messages" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "sender_id" uuid NOT NULL,
  "sender_type" text NOT NULL,
  "recipient_id" uuid NOT NULL,
  "recipient_type" text NOT NULL,
  "subject" text NOT NULL,
  "body" text NOT NULL,
  "read" boolean DEFAULT false,
  "created_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."notification_logs" (
  "log_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "student_id" uuid,
  "notification_type" text NOT NULL,
  "status" text DEFAULT 'pending'::text,
  "created_at" timestamp DEFAULT now(),
  "recipient" text,
  "message" text,
  "subject" text,
  "category" text DEFAULT 'announcement'::text,
  "error_message" text,
  "sent_at" timestamptz,
  "retry_count" integer NOT NULL DEFAULT 0,
  "recipient_name" text,
  "recipient_role" text
);

CREATE TABLE IF NOT EXISTS public."notification_templates" (
  "template_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "category" text NOT NULL,
  "name" text NOT NULL,
  "subject" text NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."notifications" (
  "notification_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "student_id" uuid,
  "user_id" uuid,
  "title" text NOT NULL,
  "message" text NOT NULL,
  "type" text DEFAULT 'info'::text,
  "is_read" boolean DEFAULT false,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."nursery_auto_comments" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "role" text NOT NULL,
  "grade_letter" text NOT NULL,
  "comment" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."nursery_detailed_observation_items" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "strand" text NOT NULL,
  "subsection" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "item_key" text NOT NULL,
  "prompt_text" text NOT NULL,
  "response_yes" text NOT NULL,
  "response_tries" text NOT NULL,
  "response_never" text NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  "response_good" text,
  "response_needs_improvement" text,
  "school_id" uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS public."old_students" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "student_id" uuid,
  "name" text NOT NULL,
  "school_id" uuid,
  "final_class" text NOT NULL,
  "graduation_year" integer NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."other_staff_members" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "full_name" text NOT NULL,
  "job_title" text,
  "department" text,
  "national_id" text,
  "phone" text,
  "email" text,
  "address" text,
  "emergency_contact_name" text,
  "emergency_contact_phone" text,
  "notes" text,
  "hire_date" date,
  "salary_amount" numeric,
  "pay_frequency" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "staff_role" text,
  "linked_user_id" uuid,
  "photo_url" text,
  "documents" jsonb NOT NULL DEFAULT '[]'::jsonb
);

CREATE TABLE IF NOT EXISTS public."owner_revenue_trend_metrics" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "month_year" date NOT NULL,
  "total_revenue" numeric DEFAULT 0,
  "new_revenue" numeric DEFAULT 0,
  "recurring_revenue" numeric DEFAULT 0,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."owner_school_growth_metrics" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "month_year" date NOT NULL,
  "total_schools" integer DEFAULT 0,
  "new_schools" integer DEFAULT 0,
  "active_schools" integer DEFAULT 0,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."owner_user_growth_metrics" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "month_year" date NOT NULL,
  "total_users" integer DEFAULT 0,
  "new_users" integer DEFAULT 0,
  "active_users" integer DEFAULT 0,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."parents" (
  "parent_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "email" text,
  "student_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "phone" text,
  "relationship" text,
  "is_primary_contact" boolean,
  "gender" text,
  "nin" text,
  "occupation" text,
  "address" text,
  "nationality" text,
  "religion" text,
  "date_of_birth" date
);

CREATE TABLE IF NOT EXISTS public."payments" (
  "payment_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "student_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "amount" numeric NOT NULL,
  "payment_method" text NOT NULL,
  "description" text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."pdf_render_sessions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "read_token" text NOT NULL,
  "payload" jsonb NOT NULL,
  "expires_at" timestamptz NOT NULL DEFAULT (now() + '00:20:00'::interval),
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."period_locks" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "term_id" uuid,
  "period_end" date NOT NULL,
  "locked_at" timestamptz DEFAULT now(),
  "locked_by" uuid
);

CREATE TABLE IF NOT EXISTS public."phone_reset_codes" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "phone" text NOT NULL,
  "code" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "attempts" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."platform_config" (
  "key" text NOT NULL,
  "value" text,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."pre_primary_holistic_rating_levels" (
  "school_id" uuid NOT NULL,
  "grade_enum" text NOT NULL,
  "display_label" text NOT NULL,
  "color_hex" text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."pre_primary_holistic_skills" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "strand_id" uuid NOT NULL,
  "skill_key" text NOT NULL,
  "label" text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."pre_primary_holistic_strands" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "subject" text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."processed_primary_exam_results" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "exam_set_id" uuid NOT NULL,
  "year" integer NOT NULL,
  "term" text NOT NULL,
  "exam_set_name" text NOT NULL,
  "student_name" text NOT NULL,
  "class_name" text NOT NULL,
  "admission_number" text NOT NULL,
  "subject" text NOT NULL,
  "marks_obtained" numeric,
  "total_marks" numeric DEFAULT 100,
  "grade" text,
  "teacher_remark" text,
  "teacher_initials" text,
  "class_teacher_comment" text,
  "processed_at" timestamptz DEFAULT now(),
  "processed_by" uuid,
  "exam_type" text,
  "headteacher_comment" text,
  "class_position" integer,
  "aggregate" integer,
  "division" text,
  "nursery_skill_performance" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "nursery_report_format" varchar(20) DEFAULT 'latest'::character varying,
  "percentage" numeric,
  "next_term_begins_date" date
);

CREATE TABLE IF NOT EXISTS public."processed_secondary_exam_results" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "exam_set_id" uuid NOT NULL,
  "student_name" text NOT NULL,
  "admission_number" text,
  "class_name" text NOT NULL,
  "year" integer NOT NULL,
  "term" integer NOT NULL,
  "subject" text NOT NULL,
  "marks_obtained" numeric NOT NULL DEFAULT 0,
  "total_marks" numeric NOT NULL DEFAULT 100,
  "grade" text,
  "teacher_remark" text,
  "teacher_initials" text,
  "class_teacher_comment" text,
  "headteacher_comment" text,
  "next_term_begins_date" date,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  "topic" text,
  "paper_code" text,
  "paper_number" text,
  "proc_topic_key" text,
  "proc_paper_key" text
);

CREATE TABLE IF NOT EXISTS public."profiles" (
  "id" uuid NOT NULL,
  "email" text,
  "full_name" text,
  "phone" text,
  "role" text DEFAULT 'student'::text,
  "school_id" uuid,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "last_login" timestamptz,
  "login_count" integer DEFAULT 0,
  "status" text DEFAULT 'active'::text,
  "avatar_url" text,
  "bio" text
);

CREATE TABLE IF NOT EXISTS public."published_class_report_bundles" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "class_id" uuid NOT NULL,
  "term" integer NOT NULL,
  "year" integer NOT NULL,
  "exam_set_id" uuid NOT NULL,
  "storage_bucket" text NOT NULL DEFAULT 'published-reports'::text,
  "storage_object_path" text NOT NULL,
  "published_at" timestamptz NOT NULL DEFAULT now(),
  "published_by" uuid
);

CREATE TABLE IF NOT EXISTS public."published_student_reports" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "class_id" uuid NOT NULL,
  "term" integer NOT NULL,
  "year" integer NOT NULL,
  "exam_set_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "storage_bucket" text NOT NULL DEFAULT 'published-reports'::text,
  "storage_object_path" text NOT NULL,
  "published_at" timestamptz NOT NULL DEFAULT now(),
  "published_by" uuid
);

CREATE TABLE IF NOT EXISTS public."receipt_sequences" (
  "school_id" uuid NOT NULL,
  "year" integer NOT NULL,
  "last_number" integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public."receipt_sequences_per_term" (
  "school_id" uuid NOT NULL,
  "academic_year" integer NOT NULL,
  "term" integer NOT NULL,
  "last_number" integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public."receipts" (
  "receipt_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "student_id" uuid NOT NULL,
  "payment_id" uuid,
  "amount" numeric NOT NULL,
  "payment_method" text,
  "file_url" text,
  "created_at" timestamp DEFAULT now(),
  "school_id" uuid
);

CREATE TABLE IF NOT EXISTS public."receivable_status" (
  "student_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "total_outstanding" numeric NOT NULL DEFAULT 0,
  "aging_bucket" text,
  "is_inactive_debtor" boolean NOT NULL DEFAULT false,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."referral_codes" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "code" text NOT NULL,
  "type" text,
  "affiliate_id" uuid,
  "is_active" boolean NOT NULL DEFAULT true,
  "max_uses" integer,
  "expires_at" timestamptz,
  "current_uses" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "description" text,
  "discount_type" text,
  "discount_value" numeric NOT NULL DEFAULT 0,
  "target_audience" text DEFAULT 'all'::text,
  "minimum_subscription_months" integer DEFAULT 1,
  "created_by" text DEFAULT 'admin'::text,
  "updated_at" timestamptz DEFAULT now(),
  "use_count" integer DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public."report_comments" (
  "comment_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "class_name" text NOT NULL,
  "year" integer NOT NULL,
  "term" integer NOT NULL,
  "comment_type" text NOT NULL,
  "comment_text" text NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."report_pdf_cache" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "class_name" text NOT NULL,
  "term" integer NOT NULL,
  "year" integer NOT NULL,
  "exam_set_id" uuid NOT NULL,
  "template_key" text NOT NULL DEFAULT 'default'::text,
  "storage_path" text NOT NULL,
  "generated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."report_snapshot_data" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "snapshot_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "class_name" text NOT NULL,
  "subject" text NOT NULL,
  "marks_obtained" numeric,
  "total_marks" numeric,
  "grade" text,
  "remarks" text,
  "teacher_initials" text,
  "teacher_comment" text,
  "class_teacher_comment" text,
  "headteacher_comment" text,
  "attendance_percentage" numeric,
  "position" integer,
  "aggregate" numeric,
  "frozen_data" jsonb DEFAULT '{}'::jsonb,
  "created_at" timestamptz DEFAULT now(),
  "fees_balance" numeric DEFAULT 0,
  "fees_paid" numeric DEFAULT 0,
  "student_photo_url" text,
  "school_logo_url" text,
  "position_in_class" integer,
  "aggregate_score" numeric,
  "average_percentage" numeric,
  "division" text,
  "behaviour_summary" jsonb DEFAULT '{}'::jsonb,
  "fees_expected" numeric DEFAULT 0,
  "fees_total_paid" numeric DEFAULT 0,
  "exam_set_name" text,
  "exam_set_term" integer,
  "exam_set_year" integer
);

CREATE TABLE IF NOT EXISTS public."report_snapshots" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "term" integer NOT NULL,
  "year" integer NOT NULL,
  "exam_set_id" uuid,
  "template_id" uuid,
  "created_at" timestamptz DEFAULT now(),
  "locked_at" timestamptz,
  "status" text NOT NULL DEFAULT 'draft'::text,
  "created_by" uuid,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "student_count" integer DEFAULT 0,
  "class_count" integer DEFAULT 0,
  "generation_started_at" timestamptz,
  "generation_completed_at" timestamptz,
  "generation_duration_seconds" integer
);

CREATE TABLE IF NOT EXISTS public."report_templates" (
  "template_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "content" text NOT NULL DEFAULT '{
  "template_name": "Default Report Template",
  "header": {
    "school_name": "{school_name}",
    "report_title": "STUDENT''S PROGRESSIVE REPORT",
    "term": "{term}",
    "year": "{year}"
  },
  "student_info": {
    "name": "{student_name}",
    "class": "{class_name}",
    "admission_number": "{admission_number}"
  },
  "subjects": [],
  "comments": {
    "teacher": "{teacher_comments}",
    "headteacher": "{headteacher_comments}"
  },
  "signatures": {
    "class_teacher": "Class Teacher",
    "headteacher": "Headteacher"
  }
}'::text,
  "school_id" uuid,
  "created_at" timestamp DEFAULT now(),
  "css_content" text,
  "html_content" text,
  "is_default" boolean DEFAULT false,
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "updated_at" timestamptz DEFAULT now(),
  "is_primary" boolean DEFAULT false
);

CREATE TABLE IF NOT EXISTS public."report_title_settings" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "title_template" text NOT NULL DEFAULT 'STUDENT''S PROGRESSIVE REPORT OF TERM {term}'::text,
  "use_dynamic_term" boolean DEFAULT true,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."reports" (
  "report_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "student_id" uuid NOT NULL,
  "template_name" text,
  "file_url" text,
  "created_at" timestamp DEFAULT now(),
  "school_id" uuid
);

CREATE TABLE IF NOT EXISTS public."rollover_status" (
  "id" integer NOT NULL DEFAULT nextval('rollover_status_id_seq'::regclass),
  "school_id" uuid NOT NULL,
  "academic_year" integer NOT NULL,
  "rollover_completed" boolean DEFAULT false,
  "rollover_date" timestamptz,
  "students_graduated" integer DEFAULT 0,
  "students_promoted" integer DEFAULT 0,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."scheme_of_work" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "teacher_id" uuid NOT NULL,
  "class_name" text NOT NULL,
  "subject" text NOT NULL,
  "term" text NOT NULL,
  "year" integer NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."scheme_of_work_entries" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "scheme_id" uuid NOT NULL,
  "week_number" integer NOT NULL DEFAULT 1,
  "period_number" integer NOT NULL DEFAULT 1,
  "theme" text NOT NULL DEFAULT ''::text,
  "sub_theme" text NOT NULL DEFAULT ''::text,
  "content" text NOT NULL DEFAULT ''::text,
  "competences" text NOT NULL DEFAULT ''::text,
  "methods" text NOT NULL DEFAULT ''::text,
  "activity" text NOT NULL DEFAULT ''::text,
  "life_skills" text NOT NULL DEFAULT ''::text,
  "materials" text NOT NULL DEFAULT ''::text,
  "reference" text NOT NULL DEFAULT ''::text,
  "remarks" text NOT NULL DEFAULT ''::text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."school_chat_conversations" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "dm_key" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."school_chat_messages" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "conversation_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "sender_id" uuid NOT NULL,
  "body" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "delivered_at" timestamptz,
  "msg_kind" text NOT NULL DEFAULT 'text'::text,
  "audio_path" text,
  "audio_duration_sec" integer
);

CREATE TABLE IF NOT EXISTS public."school_chat_participants" (
  "conversation_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "last_read_at" timestamptz
);

CREATE TABLE IF NOT EXISTS public."school_chat_presence" (
  "user_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "last_seen_at" timestamptz NOT NULL DEFAULT now(),
  "session_active" boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS public."school_class_uace_grade_bands" (
  "school_id" uuid NOT NULL,
  "class_name" text NOT NULL,
  "bands" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."school_events" (
  "event_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "event_date" date NOT NULL,
  "start_time" time,
  "end_time" time,
  "location" text,
  "created_by" uuid,
  "created_at" timestamp DEFAULT now(),
  "event_type" text NOT NULL DEFAULT 'other'::text
);

CREATE TABLE IF NOT EXISTS public."school_expenses" (
  "expense_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "category_id" uuid,
  "term_id" uuid,
  "amount" numeric NOT NULL,
  "description" text NOT NULL,
  "expense_date" date NOT NULL DEFAULT CURRENT_DATE,
  "reference_number" text,
  "status" text DEFAULT 'pending'::text,
  "recorded_by" uuid,
  "created_at" timestamp DEFAULT now(),
  "payment_method" text DEFAULT 'cash'::text,
  "category_name" text,
  "linked_teacher_id" uuid,
  "linked_other_staff_id" uuid,
  "subcategory_id" uuid,
  "salary_period_label" text
);

CREATE TABLE IF NOT EXISTS public."school_fee_structure" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "class_name" text NOT NULL,
  "tuition_amount" numeric DEFAULT 0,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "boarding_tuition_amount" numeric DEFAULT 0,
  "boarding_accommodation_fee" numeric DEFAULT 0,
  "boarding_meals_fee" numeric DEFAULT 0,
  "boarding_amount" numeric
);

CREATE TABLE IF NOT EXISTS public."school_report_customizations" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "custom_school_name" text,
  "custom_school_motto" text,
  "custom_school_address" text,
  "logo_url" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."school_requests" (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "school_name" text NOT NULL,
  "contact_name" text NOT NULL,
  "contact_email" text NOT NULL,
  "contact_phone" text,
  "address" text,
  "student_count" integer,
  "request_message" text,
  "status" text DEFAULT 'pending'::text,
  "created_at" timestamptz DEFAULT now(),
  "reviewed_at" timestamptz,
  "reviewed_by" uuid,
  "rejection_reason" text,
  "approval_notes" text
);

CREATE TABLE IF NOT EXISTS public."school_requirements" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "requirement_name" text NOT NULL,
  "description" text,
  "cost" numeric NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'Active'::text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "boarding_type" text DEFAULT 'Day Scholar'::text,
  "class_name" text
);

CREATE TABLE IF NOT EXISTS public."school_subscriptions" (
  "subscription_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "school_id" uuid NOT NULL,
  "plan_name" text NOT NULL,
  "monthly_amount" numeric NOT NULL DEFAULT 0,
  "status" text NOT NULL DEFAULT 'active'::text,
  "start_date" date NOT NULL DEFAULT CURRENT_DATE,
  "end_date" date,
  "trial_end_date" date,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."school_terms" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "year" integer NOT NULL,
  "term" integer NOT NULL,
  "start_date" date NOT NULL,
  "end_date" date NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "is_current" boolean DEFAULT false,
  "is_closed" boolean NOT NULL DEFAULT false,
  "global_term_id" uuid
);

CREATE TABLE IF NOT EXISTS public."school_uace_class_subject_papers" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "class_name" text NOT NULL,
  "subject_name" text NOT NULL,
  "paper_code" text,
  "paper_label" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "teacher_id" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "weight_percent" numeric NOT NULL DEFAULT 100.00,
  "paper_slot" integer NOT NULL
);

CREATE TABLE IF NOT EXISTS public."schoolpay_ingested_events" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "schoolpay_receipt_number" text NOT NULL,
  "source_channel_transaction_id" text,
  "payload_hash" text,
  "student_payment_id" uuid,
  "error_message" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."schoolpay_school_settings" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "enabled" boolean NOT NULL DEFAULT false,
  "schoolpay_school_code" text NOT NULL DEFAULT ''::text,
  "api_password_encrypted" text NOT NULL DEFAULT ''::text,
  "webhook_token" text NOT NULL DEFAULT encode(gen_random_bytes(24), 'hex'::text),
  "last_sync_at" timestamptz,
  "last_sync_error" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."schools" (
  "school_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "location" text NOT NULL,
  "type" text NOT NULL,
  "admin_id" uuid,
  "subscription_plan" text DEFAULT 'Free (0-20)'::text,
  "student_count" integer DEFAULT 0,
  "wifi_ssid" text,
  "created_at" timestamp DEFAULT now(),
  "next_term_begins_date" date,
  "location_name" text,
  "location_latitude" numeric,
  "location_longitude" numeric,
  "location_radius" integer DEFAULT 100,
  "logo_url" text,
  "motto" text,
  "website" text,
  "contact_email" text,
  "contact_phone" text,
  "school_code" text NOT NULL,
  "subtitle" text,
  "address" text,
  "pobox" text,
  "header_school_name_color" text DEFAULT '#000000'::text,
  "header_subtitle_color" text DEFAULT '#3b82f6'::text,
  "header_address_color" text DEFAULT '#1e40af'::text,
  "header_contact_color" text DEFAULT '#1e40af'::text,
  "header_motto_color" text DEFAULT '#2563eb'::text,
  "header_divider_color" text DEFAULT '#1e3a8a'::text,
  "logo" text,
  "phone" text,
  "email" text,
  "header_chip_text_color" text DEFAULT '#1e3a8a'::text,
  "header_chip_background_color" text DEFAULT '#eff6ff'::text,
  "header_chip_border_color" text DEFAULT '#bfdbfe'::text,
  "header_meta_line_color" text DEFAULT '#64748b'::text,
  "header_contact_separator_color" text DEFAULT '#64748b'::text,
  "referral_code_id" uuid,
  "affiliate_id" uuid,
  "biometric_teacher_punch" boolean NOT NULL DEFAULT false,
  "biometric_student_attendance" boolean NOT NULL DEFAULT true,
  "biometric_late_cutoff_teacher" time NOT NULL DEFAULT '07:30:00'::time without time zone,
  "biometric_late_cutoff_student" time NOT NULL DEFAULT '08:00:00'::time without time zone,
  "biometric_webhook_token" text DEFAULT encode(gen_random_bytes(16), 'hex'::text),
  "biometric_notify_arrival" boolean NOT NULL DEFAULT false,
  "biometric_notify_departure" boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public."student_alevel_subjects" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "subject_name" text NOT NULL,
  "subject_role" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."student_attendance" (
  "attendance_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "class_name" text NOT NULL,
  "attendance_date" date NOT NULL DEFAULT CURRENT_DATE,
  "status" text DEFAULT 'present'::text,
  "remarks" text,
  "created_at" timestamp DEFAULT now(),
  "present" boolean DEFAULT true,
  "date" date DEFAULT CURRENT_DATE,
  "teacher_id" uuid,
  "arrived_late" boolean NOT NULL DEFAULT false,
  "biometric_scan" boolean NOT NULL DEFAULT false,
  "arrival_time" timestamptz,
  "departure_time" timestamptz
);

CREATE TABLE IF NOT EXISTS public."student_balances" (
  "balance_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "student_id" uuid NOT NULL,
  "term_id" uuid,
  "school_id" uuid NOT NULL,
  "year" integer NOT NULL,
  "term" integer NOT NULL,
  "total_fees" numeric NOT NULL DEFAULT 0,
  "total_paid" numeric NOT NULL DEFAULT 0,
  "balance" numeric NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."student_discounts" (
  "discount_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "term_id" uuid,
  "discount_type" text NOT NULL,
  "amount" numeric NOT NULL DEFAULT 0,
  "percent" numeric,
  "reason" text,
  "created_at" timestamptz DEFAULT now(),
  "created_by" uuid
);

CREATE TABLE IF NOT EXISTS public."student_fees" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "class_name" text NOT NULL,
  "term_id" uuid,
  "year" integer NOT NULL,
  "term" integer NOT NULL,
  "fee_amount" numeric NOT NULL DEFAULT 0,
  "paid_amount" numeric NOT NULL DEFAULT 0,
  "balance" numeric NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."student_grievances" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "category" varchar(50) NOT NULL,
  "subject" varchar(200) NOT NULL,
  "description" text NOT NULL,
  "is_anonymous" boolean DEFAULT false,
  "assigned_portfolio_id" uuid,
  "status" varchar(30) DEFAULT 'SUBMITTED'::character varying,
  "resolution_notes" text,
  "escalated_at" timestamptz,
  "resolved_at" timestamptz,
  "resolved_by" uuid,
  "created_at" timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS public."student_import_batches" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "created_by" uuid,
  "file_name" text NOT NULL DEFAULT ''::text,
  "mode" text NOT NULL,
  "class_name" text,
  "students_added_count" integer NOT NULL DEFAULT 0,
  "row_error_count" integer NOT NULL DEFAULT 0,
  "errors_sample" jsonb,
  "status" text NOT NULL DEFAULT 'active'::text,
  "undone_at" timestamptz
);

CREATE TABLE IF NOT EXISTS public."student_invoices" (
  "invoice_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "term_id" uuid NOT NULL,
  "invoice_number" text,
  "total_amount" numeric NOT NULL DEFAULT 0,
  "amount_paid" numeric NOT NULL DEFAULT 0,
  "balance" numeric,
  "status" text NOT NULL DEFAULT 'draft'::text,
  "due_date" date,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now(),
  "created_by" uuid,
  "invoice_label" text,
  "is_supplementary" boolean NOT NULL DEFAULT false,
  "bursary_discount" numeric DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public."student_ledger" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "student_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "entry_type" text NOT NULL,
  "reference_id" uuid,
  "debit" numeric NOT NULL DEFAULT 0,
  "credit" numeric NOT NULL DEFAULT 0,
  "running_balance" numeric NOT NULL DEFAULT 0,
  "term_id" uuid,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."student_olevel_subjects" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "subject_name" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."student_payments" (
  "payment_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "amount" numeric NOT NULL,
  "payment_method" text NOT NULL,
  "payment_date" date NOT NULL DEFAULT CURRENT_DATE,
  "transaction_ref" text,
  "description" text,
  "created_at" timestamp DEFAULT now(),
  "amount_paid" numeric DEFAULT 0,
  "receipt_number" text,
  "reversed_by" uuid,
  "reversed_at" timestamptz,
  "reversal_reason" text,
  "is_reversal" boolean NOT NULL DEFAULT false,
  "term_id" uuid,
  "recorded_by" uuid,
  "notes" text,
  "invoice_id" uuid,
  "receipt_total_remaining_balance" numeric
);

CREATE TABLE IF NOT EXISTS public."student_photos" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "student_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "photo_url" text NOT NULL,
  "photo_filename" text,
  "photo_size" integer,
  "photo_type" text,
  "is_primary" boolean DEFAULT true,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."student_requirements" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "student_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "requirement_id" uuid NOT NULL,
  "requirement_name" text NOT NULL,
  "cost" numeric NOT NULL,
  "status" text NOT NULL DEFAULT 'Pending'::text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."student_stream_assignments" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "class_name" text NOT NULL,
  "stream_name" text NOT NULL,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."students" (
  "student_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "name" text NOT NULL,
  "current_class" text NOT NULL,
  "status" text DEFAULT 'active'::text,
  "graduation_year" integer,
  "repeat_year" boolean DEFAULT false,
  "expected_fee_amount" numeric,
  "created_at" timestamp DEFAULT now(),
  "admission_number" text,
  "admission_date" date DEFAULT CURRENT_DATE,
  "gender" text,
  "address" text,
  "city" text,
  "student_phone" text,
  "student_email" text,
  "guardian_name" text,
  "guardian_relationship" text,
  "guardian_phone" text,
  "guardian_email" text,
  "guardian_occupation" text,
  "guardian_address" text,
  "stream" text,
  "previous_school" text,
  "enrollment_fee" numeric,
  "payment_status" text,
  "nationality" text,
  "religion" text,
  "date_of_birth" date,
  "profile_photo_url" text,
  "updated_at" timestamptz DEFAULT now(),
  "country" text,
  "first_name" text,
  "last_name" text,
  "middle_name" text,
  "medical_condition" text,
  "emergency_contact_name" text,
  "emergency_contact_phone" text,
  "blood_group" text,
  "allergies" text,
  "boarding_type" text DEFAULT 'Day Scholar'::text,
  "fee_discount_percent" numeric DEFAULT 0,
  "inactive_with_balance" boolean NOT NULL DEFAULT false,
  "academic_class" text,
  "academic_year_promoted" integer,
  "enrollment_status" text,
  "activation_date" timestamptz,
  "district" text,
  "age_years" smallint,
  "schoolpay_payment_code" text,
  "import_batch_id" uuid,
  "deleted_at" timestamptz,
  "discipline_deactivated_at" timestamptz,
  "suspension_open" boolean NOT NULL DEFAULT false,
  "suspension_period_start" date,
  "suspension_period_end" date,
  "old_admission_number" text
);

CREATE TABLE IF NOT EXISTS public."subjects" (
  "subject_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."system_actions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "action" text NOT NULL,
  "details" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."system_health_metrics" (
  "metric_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "metric_type" text NOT NULL,
  "school_id" uuid,
  "metric_name" text NOT NULL,
  "metric_value" numeric,
  "metric_unit" text,
  "additional_data" jsonb DEFAULT '{}'::jsonb,
  "recorded_at" timestamptz NOT NULL DEFAULT now(),
  "cpu_usage" numeric,
  "memory_usage" numeric,
  "disk_usage" numeric,
  "response_time_ms" integer,
  "uptime_hours" integer,
  "status" text DEFAULT 'healthy'::text,
  "database_size_gb" numeric,
  "storage_usage_gb" numeric,
  "active_connections" integer,
  "last_backup" timestamptz,
  "created_at" timestamptz DEFAULT now(),
  "response_time" integer DEFAULT 0,
  "uptime" numeric DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public."teacher_attendance_log" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" text NOT NULL,
  "teacher_id" text NOT NULL,
  "date" date NOT NULL,
  "punch_in_time" timestamptz,
  "punch_out_time" timestamptz,
  "punch_in_lat" float8,
  "punch_in_lng" float8,
  "punch_out_lat" float8,
  "punch_out_lng" float8,
  "status" text NOT NULL DEFAULT 'present'::text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."teacher_attendance_logs" (
  "log_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "teacher_id" uuid NOT NULL,
  "attendance_date" date NOT NULL DEFAULT CURRENT_DATE,
  "check_in_time" timestamp,
  "check_out_time" timestamp,
  "status" text DEFAULT 'present'::text,
  "remarks" text,
  "created_at" timestamp DEFAULT now(),
  "check_in_lat" float8,
  "check_in_lng" float8,
  "check_in_accuracy_m" integer,
  "check_in_distance_m" integer,
  "check_out_lat" float8,
  "check_out_lng" float8,
  "check_out_accuracy_m" integer,
  "check_out_distance_m" integer,
  "biometric_scan" boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public."teacher_class_subjects" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "teacher_id" uuid NOT NULL,
  "class_name" text NOT NULL,
  "subject" text NOT NULL,
  "year" integer NOT NULL DEFAULT (EXTRACT(year FROM CURRENT_DATE))::integer,
  "term" integer NOT NULL DEFAULT 3,
  "created_at" timestamp DEFAULT now(),
  "assignment_role" text NOT NULL DEFAULT 'subject_teacher'::text,
  "stream_name" text
);

CREATE TABLE IF NOT EXISTS public."teacher_comment_rules" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "class_name" text NOT NULL,
  "min_avg" numeric NOT NULL,
  "max_avg" numeric NOT NULL,
  "comment" text NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."teacher_documents" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "teacher_id" uuid NOT NULL,
  "doc_kind" text NOT NULL,
  "doc_category" text,
  "storage_path" text NOT NULL,
  "original_filename" text NOT NULL,
  "mime_type" text,
  "file_size_bytes" integer,
  "uploaded_by" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."teacher_exam_class_prefs" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "class_name" text NOT NULL,
  "o_level_formative_max" integer NOT NULL DEFAULT 20,
  "auto_remark_enabled" boolean NOT NULL DEFAULT true,
  "primary_division_settings" jsonb,
  "grade_remarks_olevel" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "grade_remarks_alevel" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."teacher_exam_grade_bands" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "class_name" text NOT NULL,
  "subject" text NOT NULL,
  "scale_kind" text NOT NULL,
  "min_percent" integer NOT NULL,
  "max_percent" integer NOT NULL,
  "grade_label" text NOT NULL,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."teacher_phone_change_requests" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "teacher_id" uuid NOT NULL,
  "admin_user_id" uuid NOT NULL,
  "old_phone" text,
  "new_phone" text NOT NULL,
  "code" text NOT NULL,
  "expires_at" timestamptz NOT NULL,
  "used_at" timestamptz,
  "attempts" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."teacher_remarks_settings" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "subject" text NOT NULL,
  "min_percent" integer,
  "max_percent" integer,
  "remark" text NOT NULL DEFAULT 'A good performance with steady progress. Continued effort and focus will lead to even better achievement.'::text,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp DEFAULT now(),
  "comment_text" text NOT NULL DEFAULT 'A good performance with steady progress. Continued effort and focus will lead to even better achievement.'::text,
  "created_by" uuid,
  "is_default" boolean DEFAULT false,
  "holistic_grade_enum" text,
  "skill_key" text
);

CREATE TABLE IF NOT EXISTS public."teacher_resources" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "teacher_id" uuid NOT NULL,
  "display_name" text NOT NULL,
  "storage_path" text NOT NULL,
  "original_filename" text,
  "mime_type" text,
  "file_size_bytes" bigint NOT NULL DEFAULT 0,
  "created_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."teachers" (
  "teacher_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "name" text NOT NULL,
  "email" text,
  "school_id" uuid NOT NULL,
  "phone" text,
  "address" text,
  "gender" text,
  "dob" date,
  "national_id" text,
  "employee_id" text NOT NULL,
  "date_of_hire" date DEFAULT CURRENT_DATE,
  "subjects" text[] DEFAULT '{}'::text[],
  "classes" text[] DEFAULT '{}'::text[],
  "created_at" timestamp DEFAULT now(),
  "experience" text,
  "qualification" text,
  "updated_at" timestamptz DEFAULT now(),
  "salary" numeric,
  "nationality" text,
  "marital_status" text,
  "religion" text,
  "alt_phone" text,
  "whatsapp" text,
  "district" text,
  "country" text,
  "emergency_contact_name" text,
  "emergency_contact_relationship" text,
  "emergency_contact_phone" text,
  "employment_type" text DEFAULT 'Full-time'::text,
  "pay_frequency" text,
  "photo_url" text,
  "emergency_contact" text,
  "department" text,
  "previous_school" text,
  "bank_name" text,
  "bank_account" text,
  "personal_email" text,
  "performance_review_rating" numeric,
  "performance_review_notes" text,
  "performance_reviewed_at" timestamptz,
  "performance_reviewed_by" text,
  "is_active" boolean DEFAULT true
);

CREATE TABLE IF NOT EXISTS public."term_closures" (
  "closure_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "year" integer NOT NULL,
  "term" integer NOT NULL,
  "closure_date" date NOT NULL,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."termly_projects" (
  "project_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  "class_name" text NOT NULL,
  "subject" text NOT NULL,
  "project_title" text NOT NULL,
  "description" text,
  "year" integer NOT NULL,
  "term" integer NOT NULL,
  "marks_obtained" numeric,
  "total_marks" numeric,
  "created_at" timestamp DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."timetable_fixed_periods" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "name" text NOT NULL,
  "start_time" text NOT NULL,
  "end_time" text NOT NULL,
  "color" text NOT NULL DEFAULT '#EF4444'::text,
  "type" text NOT NULL DEFAULT 'custom'::text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "days" text[]
);

CREATE TABLE IF NOT EXISTS public."timetable_periods" (
  "id" integer NOT NULL DEFAULT nextval('timetable_periods_id_seq'::regclass),
  "school_id" uuid NOT NULL,
  "class_name" text NOT NULL,
  "day_of_week" text NOT NULL,
  "subject" text NOT NULL,
  "teacher_id" uuid NOT NULL,
  "start_time" time NOT NULL,
  "end_time" time NOT NULL,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."timetables" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "teacher_id" uuid,
  "school_id" uuid,
  "class_name" text NOT NULL,
  "subject" text NOT NULL,
  "day_of_week" integer NOT NULL,
  "start_time" time NOT NULL,
  "end_time" time NOT NULL,
  "room" text,
  "created_at" timestamptz DEFAULT now(),
  "updated_at" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."uace_subject_catalog" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "subject_name" text NOT NULL,
  "subject_type" text NOT NULL,
  "category" text NOT NULL,
  "abbreviation" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."uce_subject_catalog" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "subject_name" text NOT NULL,
  "category" text NOT NULL,
  "abbreviation" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "notes" text,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "catalog_offering" text NOT NULL DEFAULT 'subsidiary'::text
);

CREATE TABLE IF NOT EXISTS public."user_active_schools" (
  "user_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "updated_at" timestamptz NOT NULL DEFAULT now(),
  "role" text
);

CREATE TABLE IF NOT EXISTS public."user_in_app_notifications" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "title" text NOT NULL,
  "body" text,
  "category" text,
  "read_at" timestamptz,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE IF NOT EXISTS public."user_school_memberships" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "role" text NOT NULL,
  "extra_roles" text[] NOT NULL DEFAULT '{}'::text[],
  "is_active" boolean NOT NULL DEFAULT true,
  "invited_by" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now(),
  "linked_teacher_id" uuid
);

CREATE TABLE IF NOT EXISTS public."user_school_permissions" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "school_id" uuid NOT NULL,
  "permission_key" text NOT NULL,
  "granted_by" uuid,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."user_sessions" (
  "session_id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "user_id" uuid,
  "created_at" timestamptz DEFAULT now(),
  "expires_at" timestamptz NOT NULL,
  "is_active" boolean DEFAULT true,
  "ip_address" inet,
  "user_agent" text,
  "last_activity" timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."users" (
  "user_id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "role" text NOT NULL,
  "email" text NOT NULL,
  "password_hash" text,
  "school_id" uuid,
  "student_id" uuid,
  "name" text NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "phone" text,
  "department" text,
  "position" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "employee_id" text,
  "linked_teacher_id" uuid,
  "last_sign_in_at" timestamptz,
  "extra_roles" text[] DEFAULT '{}'::text[]
);

CREATE TABLE IF NOT EXISTS public."visitor_log" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "school_id" text NOT NULL,
  "visitor_name" text NOT NULL,
  "purpose" text NOT NULL,
  "host_name" text NOT NULL,
  "host_role" text,
  "phone" text,
  "id_number" text,
  "check_in_time" timestamptz NOT NULL DEFAULT now(),
  "check_out_time" timestamptz,
  "badge_number" text,
  "notes" text,
  "created_by" text,
  "created_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."whatsapp_bot_sessions" (
  "wa_e164" text NOT NULL,
  "step" text NOT NULL DEFAULT 'entry'::text,
  "context" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "updated_at" timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public."writeoff_log" (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "invoice_id" uuid NOT NULL,
  "amount" numeric NOT NULL,
  "approved_by" uuid NOT NULL,
  "reason" text NOT NULL,
  "approved_at" timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- 3. PRIMARY KEYS & UNIQUE CONSTRAINTS
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'admin_activities_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."admin_activities" ADD CONSTRAINT "admin_activities_pkey" PRIMARY KEY (activity_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'admission_sequences_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."admission_sequences" ADD CONSTRAINT "admission_sequences_pkey" PRIMARY KEY (sequence_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'affiliate_clicks_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_pkey" PRIMARY KEY (click_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'affiliate_codes_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."affiliate_codes" ADD CONSTRAINT "affiliate_codes_pkey" PRIMARY KEY (code_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'affiliate_earnings_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."affiliate_earnings" ADD CONSTRAINT "affiliate_earnings_pkey" PRIMARY KEY (earning_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'affiliates_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."affiliates" ADD CONSTRAINT "affiliates_pkey" PRIMARY KEY (affiliate_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'assignment_answers_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."assignment_answers" ADD CONSTRAINT "assignment_answers_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'assignment_questions_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."assignment_questions" ADD CONSTRAINT "assignment_questions_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'assignment_submissions_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."assignment_submissions" ADD CONSTRAINT "assignment_submissions_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'assignments_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."assignments" ADD CONSTRAINT "assignments_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'attendance_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."attendance" ADD CONSTRAINT "attendance_pkey" PRIMARY KEY (attendance_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'audit_log_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."audit_log" ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'audit_logs_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."audit_logs" ADD CONSTRAINT "audit_logs_pkey" PRIMARY KEY (log_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'balance_brought_forward_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."balance_brought_forward" ADD CONSTRAINT "balance_brought_forward_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'biometric_device_users_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."biometric_device_users" ADD CONSTRAINT "biometric_device_users_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'biometric_devices_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."biometric_devices" ADD CONSTRAINT "biometric_devices_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'class_streams_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."class_streams" ADD CONSTRAINT "class_streams_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'class_subjects_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."class_subjects" ADD CONSTRAINT "class_subjects_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'class_teacher_comments_settings_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."class_teacher_comments_settings" ADD CONSTRAINT "class_teacher_comments_settings_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'class_teacher_nursery_comment_settings_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."class_teacher_nursery_comment_settings" ADD CONSTRAINT "class_teacher_nursery_comment_settings_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'class_teachers_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."class_teachers" ADD CONSTRAINT "class_teachers_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'class_template_settings_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."class_template_settings" ADD CONSTRAINT "class_template_settings_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'classes_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."classes" ADD CONSTRAINT "classes_pkey" PRIMARY KEY (class_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'curriculum_files_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."curriculum_files" ADD CONSTRAINT "curriculum_files_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'curriculum_scheme_examples_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."curriculum_scheme_examples" ADD CONSTRAINT "curriculum_scheme_examples_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'curriculum_topics_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."curriculum_topics" ADD CONSTRAINT "curriculum_topics_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'discipline_records_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."discipline_records" ADD CONSTRAINT "discipline_records_pkey" PRIMARY KEY (record_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'educational_library_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."educational_library" ADD CONSTRAINT "educational_library_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'election_candidates_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."election_candidates" ADD CONSTRAINT "election_candidates_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'election_voter_logs_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."election_voter_logs" ADD CONSTRAINT "election_voter_logs_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'elections_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."elections" ADD CONSTRAINT "elections_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'exam_results_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."exam_results" ADD CONSTRAINT "exam_results_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'exam_sets_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."exam_sets" ADD CONSTRAINT "exam_sets_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'expense_categories_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."expense_categories" ADD CONSTRAINT "expense_categories_pkey" PRIMARY KEY (category_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'expense_main_categories_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."expense_main_categories" ADD CONSTRAINT "expense_main_categories_pkey" PRIMARY KEY (code);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'expense_subcategories_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."expense_subcategories" ADD CONSTRAINT "expense_subcategories_pkey" PRIMARY KEY (subcategory_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'expense_subcategory_defaults_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."expense_subcategory_defaults" ADD CONSTRAINT "expense_subcategory_defaults_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'fee_structures_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."fee_structures" ADD CONSTRAINT "fee_structures_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'generated_reports_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."generated_reports" ADD CONSTRAINT "generated_reports_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'global_terms_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."global_terms" ADD CONSTRAINT "global_terms_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'grades_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."grades" ADD CONSTRAINT "grades_pkey" PRIMARY KEY (grade_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'grading_scale_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."grading_scale" ADD CONSTRAINT "grading_scale_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'guild_announcements_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."guild_announcements" ADD CONSTRAINT "guild_announcements_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'guild_portfolios_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."guild_portfolios" ADD CONSTRAINT "guild_portfolios_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'guild_tenures_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."guild_tenures" ADD CONSTRAINT "guild_tenures_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'guild_transactions_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."guild_transactions" ADD CONSTRAINT "guild_transactions_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'guild_welfare_reports_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."guild_welfare_reports" ADD CONSTRAINT "guild_welfare_reports_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'headteacher_comments_settings_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."headteacher_comments_settings" ADD CONSTRAINT "headteacher_comments_settings_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'headteacher_nursery_comment_settings_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."headteacher_nursery_comment_settings" ADD CONSTRAINT "headteacher_nursery_comment_settings_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_job_applications_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_job_applications" ADD CONSTRAINT "hr_job_applications_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_leave_balances_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_leave_balances" ADD CONSTRAINT "hr_leave_balances_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_leave_requests_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_leave_types_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_leave_types" ADD CONSTRAINT "hr_leave_types_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_onboarding_run_tasks_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_onboarding_run_tasks" ADD CONSTRAINT "hr_onboarding_run_tasks_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_onboarding_runs_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_onboarding_runs" ADD CONSTRAINT "hr_onboarding_runs_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_onboarding_template_tasks_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_onboarding_template_tasks" ADD CONSTRAINT "hr_onboarding_template_tasks_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_onboarding_templates_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_onboarding_templates" ADD CONSTRAINT "hr_onboarding_templates_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_payroll_periods_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_payroll_periods" ADD CONSTRAINT "hr_payroll_periods_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_payslips_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_payslips" ADD CONSTRAINT "hr_payslips_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_review_cycles_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_review_cycles" ADD CONSTRAINT "hr_review_cycles_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_staff_goals_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_staff_goals" ADD CONSTRAINT "hr_staff_goals_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_staff_reviews_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_staff_reviews" ADD CONSTRAINT "hr_staff_reviews_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'invoice_sequences_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."invoice_sequences" ADD CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY (school_id, year);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'jobs_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."jobs" ADD CONSTRAINT "jobs_pkey" PRIMARY KEY (job_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'lesson_logs_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."lesson_logs" ADD CONSTRAINT "lesson_logs_pkey" PRIMARY KEY (log_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'library_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."library" ADD CONSTRAINT "library_pkey" PRIMARY KEY (content_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'library_book_copies_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."library_book_copies" ADD CONSTRAINT "library_book_copies_pkey" PRIMARY KEY (copy_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'library_books_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."library_books" ADD CONSTRAINT "library_books_pkey" PRIMARY KEY (book_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'library_borrows_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."library_borrows" ADD CONSTRAINT "library_borrows_pkey" PRIMARY KEY (borrow_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'library_fines_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."library_fines" ADD CONSTRAINT "library_fines_pkey" PRIMARY KEY (fine_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'library_reservations_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."library_reservations" ADD CONSTRAINT "library_reservations_pkey" PRIMARY KEY (reservation_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'login_activities_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."login_activities" ADD CONSTRAINT "login_activities_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'logs_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."logs" ADD CONSTRAINT "logs_pkey" PRIMARY KEY (log_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'messages_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."messages" ADD CONSTRAINT "messages_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'notification_logs_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."notification_logs" ADD CONSTRAINT "notification_logs_pkey" PRIMARY KEY (log_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'notification_templates_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."notification_templates" ADD CONSTRAINT "notification_templates_pkey" PRIMARY KEY (template_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'notifications_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_pkey" PRIMARY KEY (notification_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'nursery_auto_comments_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."nursery_auto_comments" ADD CONSTRAINT "nursery_auto_comments_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'nursery_detailed_observation_items_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."nursery_detailed_observation_items" ADD CONSTRAINT "nursery_detailed_observation_items_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'old_students_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."old_students" ADD CONSTRAINT "old_students_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'other_staff_members_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."other_staff_members" ADD CONSTRAINT "other_staff_members_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'owner_revenue_trend_metrics_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."owner_revenue_trend_metrics" ADD CONSTRAINT "owner_revenue_trend_metrics_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'owner_school_growth_metrics_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."owner_school_growth_metrics" ADD CONSTRAINT "owner_school_growth_metrics_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'owner_user_growth_metrics_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."owner_user_growth_metrics" ADD CONSTRAINT "owner_user_growth_metrics_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'parents_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."parents" ADD CONSTRAINT "parents_pkey" PRIMARY KEY (parent_id, student_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'payments_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."payments" ADD CONSTRAINT "payments_pkey" PRIMARY KEY (payment_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'pdf_render_sessions_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."pdf_render_sessions" ADD CONSTRAINT "pdf_render_sessions_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'period_locks_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."period_locks" ADD CONSTRAINT "period_locks_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'phone_reset_codes_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."phone_reset_codes" ADD CONSTRAINT "phone_reset_codes_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'platform_config_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."platform_config" ADD CONSTRAINT "platform_config_pkey" PRIMARY KEY (key);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'pre_primary_holistic_rating_levels_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."pre_primary_holistic_rating_levels" ADD CONSTRAINT "pre_primary_holistic_rating_levels_pkey" PRIMARY KEY (school_id, grade_enum);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'pre_primary_holistic_skills_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."pre_primary_holistic_skills" ADD CONSTRAINT "pre_primary_holistic_skills_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'pre_primary_holistic_strands_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."pre_primary_holistic_strands" ADD CONSTRAINT "pre_primary_holistic_strands_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'processed_primary_exam_results_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."processed_primary_exam_results" ADD CONSTRAINT "processed_primary_exam_results_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'processed_secondary_exam_results_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."processed_secondary_exam_results" ADD CONSTRAINT "processed_secondary_exam_results_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'profiles_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'published_class_report_bundles_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."published_class_report_bundles" ADD CONSTRAINT "published_class_report_bundles_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'published_student_reports_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."published_student_reports" ADD CONSTRAINT "published_student_reports_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'receipt_sequences_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."receipt_sequences" ADD CONSTRAINT "receipt_sequences_pkey" PRIMARY KEY (school_id, year);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'receipt_sequences_per_term_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."receipt_sequences_per_term" ADD CONSTRAINT "receipt_sequences_per_term_pkey" PRIMARY KEY (school_id, academic_year, term);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'receipts_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."receipts" ADD CONSTRAINT "receipts_pkey" PRIMARY KEY (receipt_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'receivable_status_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."receivable_status" ADD CONSTRAINT "receivable_status_pkey" PRIMARY KEY (student_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'referral_codes_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."referral_codes" ADD CONSTRAINT "referral_codes_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'report_comments_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."report_comments" ADD CONSTRAINT "report_comments_pkey" PRIMARY KEY (comment_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'report_pdf_cache_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."report_pdf_cache" ADD CONSTRAINT "report_pdf_cache_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'report_snapshot_data_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."report_snapshot_data" ADD CONSTRAINT "report_snapshot_data_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'report_snapshots_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."report_snapshots" ADD CONSTRAINT "report_snapshots_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'report_templates_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."report_templates" ADD CONSTRAINT "report_templates_pkey" PRIMARY KEY (template_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'report_title_settings_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."report_title_settings" ADD CONSTRAINT "report_title_settings_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'reports_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."reports" ADD CONSTRAINT "reports_pkey" PRIMARY KEY (report_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'rollover_status_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."rollover_status" ADD CONSTRAINT "rollover_status_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'scheme_of_work_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."scheme_of_work" ADD CONSTRAINT "scheme_of_work_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'scheme_of_work_entries_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."scheme_of_work_entries" ADD CONSTRAINT "scheme_of_work_entries_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_chat_conversations_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_chat_conversations" ADD CONSTRAINT "school_chat_conversations_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_chat_messages_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_chat_messages" ADD CONSTRAINT "school_chat_messages_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_chat_participants_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_chat_participants" ADD CONSTRAINT "school_chat_participants_pkey" PRIMARY KEY (conversation_id, user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_chat_presence_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_chat_presence" ADD CONSTRAINT "school_chat_presence_pkey" PRIMARY KEY (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_class_uace_grade_bands_pk' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_class_uace_grade_bands" ADD CONSTRAINT "school_class_uace_grade_bands_pk" PRIMARY KEY (school_id, class_name);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_events_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_events" ADD CONSTRAINT "school_events_pkey" PRIMARY KEY (event_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_expenses_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_expenses" ADD CONSTRAINT "school_expenses_pkey" PRIMARY KEY (expense_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_fee_structure_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_fee_structure" ADD CONSTRAINT "school_fee_structure_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_report_customizations_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_report_customizations" ADD CONSTRAINT "school_report_customizations_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_requests_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_requests" ADD CONSTRAINT "school_requests_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_requirements_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_requirements" ADD CONSTRAINT "school_requirements_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_subscriptions_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_subscriptions" ADD CONSTRAINT "school_subscriptions_pkey" PRIMARY KEY (subscription_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_terms_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_terms" ADD CONSTRAINT "school_terms_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_uace_class_subject_papers_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_uace_class_subject_papers" ADD CONSTRAINT "school_uace_class_subject_papers_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'schoolpay_ingested_events_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."schoolpay_ingested_events" ADD CONSTRAINT "schoolpay_ingested_events_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'schoolpay_school_settings_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."schoolpay_school_settings" ADD CONSTRAINT "schoolpay_school_settings_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'schools_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."schools" ADD CONSTRAINT "schools_pkey" PRIMARY KEY (school_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_alevel_subjects_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_alevel_subjects" ADD CONSTRAINT "student_alevel_subjects_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_attendance_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_attendance" ADD CONSTRAINT "student_attendance_pkey" PRIMARY KEY (attendance_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_balances_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_balances" ADD CONSTRAINT "student_balances_pkey" PRIMARY KEY (balance_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_discounts_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_discounts" ADD CONSTRAINT "student_discounts_pkey" PRIMARY KEY (discount_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_fees_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_fees" ADD CONSTRAINT "student_fees_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_grievances_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_grievances" ADD CONSTRAINT "student_grievances_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_import_batches_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_import_batches" ADD CONSTRAINT "student_import_batches_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_invoices_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_invoices" ADD CONSTRAINT "student_invoices_pkey" PRIMARY KEY (invoice_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_ledger_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_ledger" ADD CONSTRAINT "student_ledger_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_olevel_subjects_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_olevel_subjects" ADD CONSTRAINT "student_olevel_subjects_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_payments_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_payments" ADD CONSTRAINT "student_payments_pkey" PRIMARY KEY (payment_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_photos_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_photos" ADD CONSTRAINT "student_photos_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_requirements_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_requirements" ADD CONSTRAINT "student_requirements_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_stream_assignments_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_stream_assignments" ADD CONSTRAINT "student_stream_assignments_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'students_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."students" ADD CONSTRAINT "students_pkey" PRIMARY KEY (student_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'subjects_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."subjects" ADD CONSTRAINT "subjects_pkey" PRIMARY KEY (subject_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'system_actions_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."system_actions" ADD CONSTRAINT "system_actions_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'system_health_metrics_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."system_health_metrics" ADD CONSTRAINT "system_health_metrics_pkey" PRIMARY KEY (metric_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_attendance_log_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_attendance_log" ADD CONSTRAINT "teacher_attendance_log_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_attendance_logs_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_attendance_logs" ADD CONSTRAINT "teacher_attendance_logs_pkey" PRIMARY KEY (log_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_class_subjects_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_class_subjects" ADD CONSTRAINT "teacher_class_subjects_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_comment_rules_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_comment_rules" ADD CONSTRAINT "teacher_comment_rules_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_documents_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_documents" ADD CONSTRAINT "teacher_documents_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_exam_class_prefs_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_exam_class_prefs" ADD CONSTRAINT "teacher_exam_class_prefs_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_exam_grade_bands_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_exam_grade_bands" ADD CONSTRAINT "teacher_exam_grade_bands_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_phone_change_requests_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_phone_change_requests" ADD CONSTRAINT "teacher_phone_change_requests_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_remarks_settings_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_remarks_settings" ADD CONSTRAINT "teacher_remarks_settings_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_resources_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_resources" ADD CONSTRAINT "teacher_resources_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teachers_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."teachers" ADD CONSTRAINT "teachers_pkey" PRIMARY KEY (teacher_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'term_closures_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."term_closures" ADD CONSTRAINT "term_closures_pkey" PRIMARY KEY (closure_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'termly_projects_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."termly_projects" ADD CONSTRAINT "termly_projects_pkey" PRIMARY KEY (project_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'timetable_fixed_periods_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."timetable_fixed_periods" ADD CONSTRAINT "timetable_fixed_periods_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'timetable_periods_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."timetable_periods" ADD CONSTRAINT "timetable_periods_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'timetables_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."timetables" ADD CONSTRAINT "timetables_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'uace_subject_catalog_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."uace_subject_catalog" ADD CONSTRAINT "uace_subject_catalog_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'uce_subject_catalog_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."uce_subject_catalog" ADD CONSTRAINT "uce_subject_catalog_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'user_active_schools_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."user_active_schools" ADD CONSTRAINT "user_active_schools_pkey" PRIMARY KEY (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'user_in_app_notifications_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."user_in_app_notifications" ADD CONSTRAINT "user_in_app_notifications_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'user_school_memberships_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."user_school_memberships" ADD CONSTRAINT "user_school_memberships_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'user_school_permissions_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."user_school_permissions" ADD CONSTRAINT "user_school_permissions_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'user_sessions_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."user_sessions" ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY (session_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'users_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."users" ADD CONSTRAINT "users_pkey" PRIMARY KEY (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'visitor_log_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."visitor_log" ADD CONSTRAINT "visitor_log_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'whatsapp_bot_sessions_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."whatsapp_bot_sessions" ADD CONSTRAINT "whatsapp_bot_sessions_pkey" PRIMARY KEY (wa_e164);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'writeoff_log_pkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."writeoff_log" ADD CONSTRAINT "writeoff_log_pkey" PRIMARY KEY (id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'admission_sequences_school_id_year_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."admission_sequences" ADD CONSTRAINT "admission_sequences_school_id_year_key" UNIQUE (school_id, year);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'affiliate_codes_code_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."affiliate_codes" ADD CONSTRAINT "affiliate_codes_code_key" UNIQUE (code);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'affiliates_user_id_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."affiliates" ADD CONSTRAINT "affiliates_user_id_key" UNIQUE (user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'biometric_device_users_school_id_device_user_id_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."biometric_device_users" ADD CONSTRAINT "biometric_device_users_school_id_device_user_id_key" UNIQUE (school_id, device_user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'class_streams_school_id_class_name_stream_name_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."class_streams" ADD CONSTRAINT "class_streams_school_id_class_name_stream_name_key" UNIQUE (school_id, class_name, stream_name);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'class_subjects_school_id_class_name_subject_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."class_subjects" ADD CONSTRAINT "class_subjects_school_id_class_name_subject_key" UNIQUE (school_id, class_name, subject);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'class_teacher_comments_settin_school_id_class_name_min_perc_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."class_teacher_comments_settings" ADD CONSTRAINT "class_teacher_comments_settin_school_id_class_name_min_perc_key" UNIQUE (school_id, class_name, min_percent, max_percent);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'class_teacher_nursery_comment_s_school_id_performance_level_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."class_teacher_nursery_comment_settings" ADD CONSTRAINT "class_teacher_nursery_comment_s_school_id_performance_level_key" UNIQUE (school_id, performance_level);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'class_teachers_school_id_class_name_year_term_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."class_teachers" ADD CONSTRAINT "class_teachers_school_id_class_name_year_term_key" UNIQUE (school_id, class_name, year, term);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'class_template_settings_school_id_class_name_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."class_template_settings" ADD CONSTRAINT "class_template_settings_school_id_class_name_key" UNIQUE (school_id, class_name);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'classes_school_id_class_name_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."classes" ADD CONSTRAINT "classes_school_id_class_name_key" UNIQUE (school_id, class_name);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'unique_student_election_vote' AND n.nspname = 'public') THEN
    ALTER TABLE public."election_voter_logs" ADD CONSTRAINT "unique_student_election_vote" UNIQUE (election_id, student_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'expense_categories_school_id_category_name_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."expense_categories" ADD CONSTRAINT "expense_categories_school_id_category_name_key" UNIQUE (school_id, category_name);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'expense_subcategories_school_id_main_category_code_name_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."expense_subcategories" ADD CONSTRAINT "expense_subcategories_school_id_main_category_code_name_key" UNIQUE (school_id, main_category_code, name);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'expense_subcategory_defaults_main_category_code_name_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."expense_subcategory_defaults" ADD CONSTRAINT "expense_subcategory_defaults_main_category_code_name_key" UNIQUE (main_category_code, name);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'fee_structures_school_id_class_name_year_term_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."fee_structures" ADD CONSTRAINT "fee_structures_school_id_class_name_year_term_key" UNIQUE (school_id, class_name, year, term);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'generated_reports_snapshot_id_student_id_template_id_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."generated_reports" ADD CONSTRAINT "generated_reports_snapshot_id_student_id_template_id_key" UNIQUE (snapshot_id, student_id, template_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'global_terms_year_term_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."global_terms" ADD CONSTRAINT "global_terms_year_term_key" UNIQUE (year, term);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'headteacher_comments_settings_school_id_min_percent_max_per_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."headteacher_comments_settings" ADD CONSTRAINT "headteacher_comments_settings_school_id_min_percent_max_per_key" UNIQUE (school_id, min_percent, max_percent);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'headteacher_nursery_comment_set_school_id_performance_level_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."headteacher_nursery_comment_settings" ADD CONSTRAINT "headteacher_nursery_comment_set_school_id_performance_level_key" UNIQUE (school_id, performance_level);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_leave_balances_school_id_staff_kind_staff_id_leave_type__key' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_leave_balances" ADD CONSTRAINT "hr_leave_balances_school_id_staff_kind_staff_id_leave_type__key" UNIQUE (school_id, staff_kind, staff_id, leave_type_id, year);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_leave_types_school_id_name_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_leave_types" ADD CONSTRAINT "hr_leave_types_school_id_name_key" UNIQUE (school_id, name);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_payslips_payroll_period_id_staff_kind_staff_id_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_payslips" ADD CONSTRAINT "hr_payslips_payroll_period_id_staff_kind_staff_id_key" UNIQUE (payroll_period_id, staff_kind, staff_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_staff_reviews_cycle_id_staff_kind_staff_id_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_staff_reviews" ADD CONSTRAINT "hr_staff_reviews_cycle_id_staff_kind_staff_id_key" UNIQUE (cycle_id, staff_kind, staff_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'lesson_logs_teacher_id_timetable_period_id_lesson_date_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."lesson_logs" ADD CONSTRAINT "lesson_logs_teacher_id_timetable_period_id_lesson_date_key" UNIQUE (teacher_id, timetable_period_id, lesson_date);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'library_book_copies_barcode_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."library_book_copies" ADD CONSTRAINT "library_book_copies_barcode_key" UNIQUE (barcode);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'notification_templates_school_id_category_name_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."notification_templates" ADD CONSTRAINT "notification_templates_school_id_category_name_key" UNIQUE (school_id, category, name);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'nursery_auto_comments_role_grade_letter_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."nursery_auto_comments" ADD CONSTRAINT "nursery_auto_comments_role_grade_letter_key" UNIQUE (role, grade_letter);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'old_students_student_id_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."old_students" ADD CONSTRAINT "old_students_student_id_key" UNIQUE (student_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'owner_revenue_trend_metrics_month_year_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."owner_revenue_trend_metrics" ADD CONSTRAINT "owner_revenue_trend_metrics_month_year_key" UNIQUE (month_year);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'owner_school_growth_metrics_month_year_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."owner_school_growth_metrics" ADD CONSTRAINT "owner_school_growth_metrics_month_year_key" UNIQUE (month_year);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'owner_user_growth_metrics_month_year_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."owner_user_growth_metrics" ADD CONSTRAINT "owner_user_growth_metrics_month_year_key" UNIQUE (month_year);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'pdf_render_sessions_read_token_unique' AND n.nspname = 'public') THEN
    ALTER TABLE public."pdf_render_sessions" ADD CONSTRAINT "pdf_render_sessions_read_token_unique" UNIQUE (read_token);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'period_locks_school_id_term_id_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."period_locks" ADD CONSTRAINT "period_locks_school_id_term_id_key" UNIQUE (school_id, term_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'pre_primary_holistic_skills_school_id_skill_key_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."pre_primary_holistic_skills" ADD CONSTRAINT "pre_primary_holistic_skills_school_id_skill_key_key" UNIQUE (school_id, skill_key);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'pre_primary_holistic_skills_strand_id_skill_key_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."pre_primary_holistic_skills" ADD CONSTRAINT "pre_primary_holistic_skills_strand_id_skill_key_key" UNIQUE (strand_id, skill_key);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'pre_primary_holistic_strands_school_id_subject_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."pre_primary_holistic_strands" ADD CONSTRAINT "pre_primary_holistic_strands_school_id_subject_key" UNIQUE (school_id, subject);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'processed_primary_exam_result_school_id_student_id_exam_set_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."processed_primary_exam_results" ADD CONSTRAINT "processed_primary_exam_result_school_id_student_id_exam_set_key" UNIQUE (school_id, student_id, exam_set_id, subject);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'published_class_report_bundles_scope_unique' AND n.nspname = 'public') THEN
    ALTER TABLE public."published_class_report_bundles" ADD CONSTRAINT "published_class_report_bundles_scope_unique" UNIQUE (school_id, class_id, term, year, exam_set_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'published_student_reports_scope_student_unique' AND n.nspname = 'public') THEN
    ALTER TABLE public."published_student_reports" ADD CONSTRAINT "published_student_reports_scope_student_unique" UNIQUE (school_id, class_id, term, year, exam_set_id, student_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'report_pdf_cache_unique' AND n.nspname = 'public') THEN
    ALTER TABLE public."report_pdf_cache" ADD CONSTRAINT "report_pdf_cache_unique" UNIQUE (school_id, student_id, class_name, term, year, exam_set_id, template_key);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'report_title_settings_school_id_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."report_title_settings" ADD CONSTRAINT "report_title_settings_school_id_key" UNIQUE (school_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'rollover_status_school_id_academic_year_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."rollover_status" ADD CONSTRAINT "rollover_status_school_id_academic_year_key" UNIQUE (school_id, academic_year);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_chat_conversations_school_dm' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_chat_conversations" ADD CONSTRAINT "school_chat_conversations_school_dm" UNIQUE (school_id, dm_key);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_expenses_reference_number_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_expenses" ADD CONSTRAINT "school_expenses_reference_number_key" UNIQUE (reference_number);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_fee_structure_school_id_class_name_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_fee_structure" ADD CONSTRAINT "school_fee_structure_school_id_class_name_key" UNIQUE (school_id, class_name);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_report_customizations_school_id_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_report_customizations" ADD CONSTRAINT "school_report_customizations_school_id_key" UNIQUE (school_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_requirements_unique' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_requirements" ADD CONSTRAINT "school_requirements_unique" UNIQUE (school_id, requirement_name, boarding_type, class_name);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_terms_school_id_year_term_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_terms" ADD CONSTRAINT "school_terms_school_id_year_term_key" UNIQUE (school_id, year, term);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_uace_papers_subject_slot_unique' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_uace_class_subject_papers" ADD CONSTRAINT "school_uace_papers_subject_slot_unique" UNIQUE (school_id, class_name, subject_name, paper_slot);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'schoolpay_ingested_events_school_receipt_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."schoolpay_ingested_events" ADD CONSTRAINT "schoolpay_ingested_events_school_receipt_key" UNIQUE (school_id, schoolpay_receipt_number);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'schoolpay_school_settings_webhook_token_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."schoolpay_school_settings" ADD CONSTRAINT "schoolpay_school_settings_webhook_token_key" UNIQUE (webhook_token);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'schoolpay_school_settings_school_id_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."schoolpay_school_settings" ADD CONSTRAINT "schoolpay_school_settings_school_id_key" UNIQUE (school_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'schools_school_code_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."schools" ADD CONSTRAINT "schools_school_code_key" UNIQUE (school_code);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_alevel_subjects_student_subject_unique' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_alevel_subjects" ADD CONSTRAINT "student_alevel_subjects_student_subject_unique" UNIQUE (student_id, subject_name);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_attendance_student_id_attendance_date_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_attendance" ADD CONSTRAINT "student_attendance_student_id_attendance_date_key" UNIQUE (student_id, attendance_date);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_balances_student_id_term_id_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_balances" ADD CONSTRAINT "student_balances_student_id_term_id_key" UNIQUE (student_id, term_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_olevel_subjects_student_subject_unique' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_olevel_subjects" ADD CONSTRAINT "student_olevel_subjects_student_subject_unique" UNIQUE (student_id, subject_name);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_photos_unique_primary' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_photos" ADD CONSTRAINT "student_photos_unique_primary" UNIQUE (student_id, is_primary) DEFERRABLE INITIALLY DEFERRED;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_requirements_student_id_requirement_id_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_requirements" ADD CONSTRAINT "student_requirements_student_id_requirement_id_key" UNIQUE (student_id, requirement_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_stream_assignments_school_id_student_id_class_name_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_stream_assignments" ADD CONSTRAINT "student_stream_assignments_school_id_student_id_class_name_key" UNIQUE (school_id, student_id, class_name);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'subjects_school_id_name_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."subjects" ADD CONSTRAINT "subjects_school_id_name_key" UNIQUE (school_id, name);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_attendance_log_teacher_id_date_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_attendance_log" ADD CONSTRAINT "teacher_attendance_log_teacher_id_date_key" UNIQUE (teacher_id, date);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_attendance_logs_teacher_id_attendance_date_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_attendance_logs" ADD CONSTRAINT "teacher_attendance_logs_teacher_id_attendance_date_key" UNIQUE (teacher_id, attendance_date);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_class_subjects_teacher_class_subject_role_uniq' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_class_subjects" ADD CONSTRAINT "teacher_class_subjects_teacher_class_subject_role_uniq" UNIQUE (teacher_id, class_name, subject, assignment_role);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_class_subjects_school_id_teacher_id_class_name_subj_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_class_subjects" ADD CONSTRAINT "teacher_class_subjects_school_id_teacher_id_class_name_subj_key" UNIQUE (school_id, teacher_id, class_name, subject, year, term);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_documents_school_path_unique' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_documents" ADD CONSTRAINT "teacher_documents_school_path_unique" UNIQUE (school_id, storage_path);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_exam_class_prefs_unique' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_exam_class_prefs" ADD CONSTRAINT "teacher_exam_class_prefs_unique" UNIQUE (school_id, class_name);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teachers_email_school_unique' AND n.nspname = 'public') THEN
    ALTER TABLE public."teachers" ADD CONSTRAINT "teachers_email_school_unique" UNIQUE (school_id, email);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'term_closures_school_id_year_term_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."term_closures" ADD CONSTRAINT "term_closures_school_id_year_term_key" UNIQUE (school_id, year, term);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'uace_subject_catalog_name_unique' AND n.nspname = 'public') THEN
    ALTER TABLE public."uace_subject_catalog" ADD CONSTRAINT "uace_subject_catalog_name_unique" UNIQUE (subject_name);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'uce_subject_catalog_name_unique' AND n.nspname = 'public') THEN
    ALTER TABLE public."uce_subject_catalog" ADD CONSTRAINT "uce_subject_catalog_name_unique" UNIQUE (subject_name);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'user_school_memberships_user_id_school_id_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."user_school_memberships" ADD CONSTRAINT "user_school_memberships_user_id_school_id_key" UNIQUE (user_id, school_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'user_school_permissions_unique' AND n.nspname = 'public') THEN
    ALTER TABLE public."user_school_permissions" ADD CONSTRAINT "user_school_permissions_unique" UNIQUE (user_id, school_id, permission_key);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'users_email_key' AND n.nspname = 'public') THEN
    ALTER TABLE public."users" ADD CONSTRAINT "users_email_key" UNIQUE (email);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 4. FOREIGN KEY CONSTRAINTS
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'admin_activities_admin_user_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."admin_activities" ADD CONSTRAINT "admin_activities_admin_user_id_fkey" FOREIGN KEY (admin_user_id) REFERENCES users(user_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'admin_activities_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."admin_activities" ADD CONSTRAINT "admin_activities_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'admission_sequences_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."admission_sequences" ADD CONSTRAINT "admission_sequences_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'affiliate_clicks_affiliate_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."affiliate_clicks" ADD CONSTRAINT "affiliate_clicks_affiliate_id_fkey" FOREIGN KEY (affiliate_id) REFERENCES affiliates(affiliate_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'affiliate_codes_affiliate_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."affiliate_codes" ADD CONSTRAINT "affiliate_codes_affiliate_id_fkey" FOREIGN KEY (affiliate_id) REFERENCES affiliates(affiliate_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'affiliate_earnings_affiliate_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."affiliate_earnings" ADD CONSTRAINT "affiliate_earnings_affiliate_id_fkey" FOREIGN KEY (affiliate_id) REFERENCES affiliates(affiliate_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'assignment_answers_submission_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."assignment_answers" ADD CONSTRAINT "assignment_answers_submission_id_fkey" FOREIGN KEY (submission_id) REFERENCES assignment_submissions(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'assignment_answers_question_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."assignment_answers" ADD CONSTRAINT "assignment_answers_question_id_fkey" FOREIGN KEY (question_id) REFERENCES assignment_questions(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'assignment_questions_assignment_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."assignment_questions" ADD CONSTRAINT "assignment_questions_assignment_id_fkey" FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'assignment_submissions_assignment_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."assignment_submissions" ADD CONSTRAINT "assignment_submissions_assignment_id_fkey" FOREIGN KEY (assignment_id) REFERENCES assignments(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'assignment_submissions_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."assignment_submissions" ADD CONSTRAINT "assignment_submissions_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'assignments_teacher_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."assignments" ADD CONSTRAINT "assignments_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'assignments_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."assignments" ADD CONSTRAINT "assignments_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'attendance_teacher_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."attendance" ADD CONSTRAINT "attendance_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'attendance_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."attendance" ADD CONSTRAINT "attendance_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'audit_log_user_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'audit_log_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."audit_log" ADD CONSTRAINT "audit_log_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'audit_logs_user_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'balance_brought_forward_to_term_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."balance_brought_forward" ADD CONSTRAINT "balance_brought_forward_to_term_id_fkey" FOREIGN KEY (to_term_id) REFERENCES school_terms(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'balance_brought_forward_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."balance_brought_forward" ADD CONSTRAINT "balance_brought_forward_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'balance_brought_forward_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."balance_brought_forward" ADD CONSTRAINT "balance_brought_forward_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'biometric_device_users_device_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."biometric_device_users" ADD CONSTRAINT "biometric_device_users_device_id_fkey" FOREIGN KEY (device_id) REFERENCES biometric_devices(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'biometric_device_users_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."biometric_device_users" ADD CONSTRAINT "biometric_device_users_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'biometric_devices_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."biometric_devices" ADD CONSTRAINT "biometric_devices_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'class_streams_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."class_streams" ADD CONSTRAINT "class_streams_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'class_subjects_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."class_subjects" ADD CONSTRAINT "class_subjects_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'class_teacher_comments_settings_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."class_teacher_comments_settings" ADD CONSTRAINT "class_teacher_comments_settings_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'class_teacher_nursery_comment_settings_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."class_teacher_nursery_comment_settings" ADD CONSTRAINT "class_teacher_nursery_comment_settings_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'class_teachers_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."class_teachers" ADD CONSTRAINT "class_teachers_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'class_teachers_teacher_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."class_teachers" ADD CONSTRAINT "class_teachers_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'class_template_settings_class_teacher_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."class_template_settings" ADD CONSTRAINT "class_template_settings_class_teacher_id_fkey" FOREIGN KEY (class_teacher_id) REFERENCES teachers(teacher_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'class_template_settings_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."class_template_settings" ADD CONSTRAINT "class_template_settings_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'class_template_settings_template_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."class_template_settings" ADD CONSTRAINT "class_template_settings_template_id_fkey" FOREIGN KEY (template_id) REFERENCES report_templates(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'classes_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."classes" ADD CONSTRAINT "classes_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'discipline_records_recorded_by_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."discipline_records" ADD CONSTRAINT "discipline_records_recorded_by_fkey" FOREIGN KEY (recorded_by) REFERENCES users(user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'discipline_records_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."discipline_records" ADD CONSTRAINT "discipline_records_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'discipline_records_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."discipline_records" ADD CONSTRAINT "discipline_records_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'election_candidates_election_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."election_candidates" ADD CONSTRAINT "election_candidates_election_id_fkey" FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'election_candidates_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."election_candidates" ADD CONSTRAINT "election_candidates_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'election_candidates_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."election_candidates" ADD CONSTRAINT "election_candidates_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'election_candidates_portfolio_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."election_candidates" ADD CONSTRAINT "election_candidates_portfolio_id_fkey" FOREIGN KEY (portfolio_id) REFERENCES guild_portfolios(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'election_voter_logs_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."election_voter_logs" ADD CONSTRAINT "election_voter_logs_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'election_voter_logs_election_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."election_voter_logs" ADD CONSTRAINT "election_voter_logs_election_id_fkey" FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'election_voter_logs_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."election_voter_logs" ADD CONSTRAINT "election_voter_logs_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'elections_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."elections" ADD CONSTRAINT "elections_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'elections_certified_by_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."elections" ADD CONSTRAINT "elections_certified_by_fkey" FOREIGN KEY (certified_by) REFERENCES users(user_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'exam_results_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."exam_results" ADD CONSTRAINT "exam_results_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'exam_results_exam_set_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."exam_results" ADD CONSTRAINT "exam_results_exam_set_id_fkey" FOREIGN KEY (exam_set_id) REFERENCES exam_sets(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'exam_results_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."exam_results" ADD CONSTRAINT "exam_results_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'exam_sets_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."exam_sets" ADD CONSTRAINT "exam_sets_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'expense_categories_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."expense_categories" ADD CONSTRAINT "expense_categories_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'expense_subcategories_main_category_code_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."expense_subcategories" ADD CONSTRAINT "expense_subcategories_main_category_code_fkey" FOREIGN KEY (main_category_code) REFERENCES expense_main_categories(code) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'expense_subcategories_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."expense_subcategories" ADD CONSTRAINT "expense_subcategories_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'expense_subcategory_defaults_main_category_code_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."expense_subcategory_defaults" ADD CONSTRAINT "expense_subcategory_defaults_main_category_code_fkey" FOREIGN KEY (main_category_code) REFERENCES expense_main_categories(code) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'fee_structures_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."fee_structures" ADD CONSTRAINT "fee_structures_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'fee_structures_term_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."fee_structures" ADD CONSTRAINT "fee_structures_term_id_fkey" FOREIGN KEY (term_id) REFERENCES school_terms(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'generated_reports_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."generated_reports" ADD CONSTRAINT "generated_reports_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'generated_reports_snapshot_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."generated_reports" ADD CONSTRAINT "generated_reports_snapshot_id_fkey" FOREIGN KEY (snapshot_id) REFERENCES report_snapshots(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'generated_reports_generated_by_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."generated_reports" ADD CONSTRAINT "generated_reports_generated_by_fkey" FOREIGN KEY (generated_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'generated_reports_template_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."generated_reports" ADD CONSTRAINT "generated_reports_template_id_fkey" FOREIGN KEY (template_id) REFERENCES report_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'grades_teacher_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."grades" ADD CONSTRAINT "grades_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'grades_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."grades" ADD CONSTRAINT "grades_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'grading_scale_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."grading_scale" ADD CONSTRAINT "grading_scale_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'guild_announcements_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."guild_announcements" ADD CONSTRAINT "guild_announcements_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'guild_announcements_tenure_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."guild_announcements" ADD CONSTRAINT "guild_announcements_tenure_id_fkey" FOREIGN KEY (tenure_id) REFERENCES guild_tenures(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'guild_portfolios_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."guild_portfolios" ADD CONSTRAINT "guild_portfolios_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'guild_tenures_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."guild_tenures" ADD CONSTRAINT "guild_tenures_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'guild_tenures_portfolio_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."guild_tenures" ADD CONSTRAINT "guild_tenures_portfolio_id_fkey" FOREIGN KEY (portfolio_id) REFERENCES guild_portfolios(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'guild_tenures_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."guild_tenures" ADD CONSTRAINT "guild_tenures_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'guild_transactions_tenure_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."guild_transactions" ADD CONSTRAINT "guild_transactions_tenure_id_fkey" FOREIGN KEY (tenure_id) REFERENCES guild_tenures(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'guild_transactions_approved_by_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."guild_transactions" ADD CONSTRAINT "guild_transactions_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'guild_transactions_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."guild_transactions" ADD CONSTRAINT "guild_transactions_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'guild_welfare_reports_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."guild_welfare_reports" ADD CONSTRAINT "guild_welfare_reports_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'guild_welfare_reports_tenure_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."guild_welfare_reports" ADD CONSTRAINT "guild_welfare_reports_tenure_id_fkey" FOREIGN KEY (tenure_id) REFERENCES guild_tenures(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'headteacher_comments_settings_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."headteacher_comments_settings" ADD CONSTRAINT "headteacher_comments_settings_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'headteacher_nursery_comment_settings_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."headteacher_nursery_comment_settings" ADD CONSTRAINT "headteacher_nursery_comment_settings_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_job_applications_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_job_applications" ADD CONSTRAINT "hr_job_applications_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_job_applications_job_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_job_applications" ADD CONSTRAINT "hr_job_applications_job_id_fkey" FOREIGN KEY (job_id) REFERENCES jobs(job_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_leave_balances_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_leave_balances" ADD CONSTRAINT "hr_leave_balances_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_leave_balances_leave_type_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_leave_balances" ADD CONSTRAINT "hr_leave_balances_leave_type_id_fkey" FOREIGN KEY (leave_type_id) REFERENCES hr_leave_types(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_leave_requests_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_leave_requests_reviewed_by_user_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_reviewed_by_user_id_fkey" FOREIGN KEY (reviewed_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_leave_requests_requested_by_user_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_requested_by_user_id_fkey" FOREIGN KEY (requested_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_leave_requests_leave_type_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_leave_requests" ADD CONSTRAINT "hr_leave_requests_leave_type_id_fkey" FOREIGN KEY (leave_type_id) REFERENCES hr_leave_types(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_leave_types_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_leave_types" ADD CONSTRAINT "hr_leave_types_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_onboarding_run_tasks_run_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_onboarding_run_tasks" ADD CONSTRAINT "hr_onboarding_run_tasks_run_id_fkey" FOREIGN KEY (run_id) REFERENCES hr_onboarding_runs(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_onboarding_runs_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_onboarding_runs" ADD CONSTRAINT "hr_onboarding_runs_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_onboarding_runs_job_application_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_onboarding_runs" ADD CONSTRAINT "hr_onboarding_runs_job_application_id_fkey" FOREIGN KEY (job_application_id) REFERENCES hr_job_applications(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_onboarding_runs_template_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_onboarding_runs" ADD CONSTRAINT "hr_onboarding_runs_template_id_fkey" FOREIGN KEY (template_id) REFERENCES hr_onboarding_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_onboarding_template_tasks_template_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_onboarding_template_tasks" ADD CONSTRAINT "hr_onboarding_template_tasks_template_id_fkey" FOREIGN KEY (template_id) REFERENCES hr_onboarding_templates(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_onboarding_templates_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_onboarding_templates" ADD CONSTRAINT "hr_onboarding_templates_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_payroll_periods_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_payroll_periods" ADD CONSTRAINT "hr_payroll_periods_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_payslips_payroll_period_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_payslips" ADD CONSTRAINT "hr_payslips_payroll_period_id_fkey" FOREIGN KEY (payroll_period_id) REFERENCES hr_payroll_periods(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_payslips_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_payslips" ADD CONSTRAINT "hr_payslips_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_review_cycles_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_review_cycles" ADD CONSTRAINT "hr_review_cycles_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_staff_goals_cycle_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_staff_goals" ADD CONSTRAINT "hr_staff_goals_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES hr_review_cycles(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_staff_goals_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_staff_goals" ADD CONSTRAINT "hr_staff_goals_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_staff_reviews_reviewer_user_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_staff_reviews" ADD CONSTRAINT "hr_staff_reviews_reviewer_user_id_fkey" FOREIGN KEY (reviewer_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_staff_reviews_cycle_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_staff_reviews" ADD CONSTRAINT "hr_staff_reviews_cycle_id_fkey" FOREIGN KEY (cycle_id) REFERENCES hr_review_cycles(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'hr_staff_reviews_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."hr_staff_reviews" ADD CONSTRAINT "hr_staff_reviews_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'invoice_sequences_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."invoice_sequences" ADD CONSTRAINT "invoice_sequences_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'jobs_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."jobs" ADD CONSTRAINT "jobs_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'library_book_copies_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."library_book_copies" ADD CONSTRAINT "library_book_copies_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'library_book_copies_book_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."library_book_copies" ADD CONSTRAINT "library_book_copies_book_id_fkey" FOREIGN KEY (book_id) REFERENCES library_books(book_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'library_books_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."library_books" ADD CONSTRAINT "library_books_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'library_borrows_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."library_borrows" ADD CONSTRAINT "library_borrows_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'library_borrows_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."library_borrows" ADD CONSTRAINT "library_borrows_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'library_borrows_copy_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."library_borrows" ADD CONSTRAINT "library_borrows_copy_id_fkey" FOREIGN KEY (copy_id) REFERENCES library_book_copies(copy_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'library_fines_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."library_fines" ADD CONSTRAINT "library_fines_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'library_fines_borrow_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."library_fines" ADD CONSTRAINT "library_fines_borrow_id_fkey" FOREIGN KEY (borrow_id) REFERENCES library_borrows(borrow_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'library_fines_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."library_fines" ADD CONSTRAINT "library_fines_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'library_reservations_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."library_reservations" ADD CONSTRAINT "library_reservations_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'library_reservations_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."library_reservations" ADD CONSTRAINT "library_reservations_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'library_reservations_book_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."library_reservations" ADD CONSTRAINT "library_reservations_book_id_fkey" FOREIGN KEY (book_id) REFERENCES library_books(book_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'login_activities_user_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."login_activities" ADD CONSTRAINT "login_activities_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'logs_user_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."logs" ADD CONSTRAINT "logs_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'logs_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."logs" ADD CONSTRAINT "logs_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'notification_logs_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."notification_logs" ADD CONSTRAINT "notification_logs_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'notification_logs_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."notification_logs" ADD CONSTRAINT "notification_logs_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'notification_templates_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."notification_templates" ADD CONSTRAINT "notification_templates_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'notifications_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'notifications_user_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'notifications_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."notifications" ADD CONSTRAINT "notifications_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'nursery_detailed_observation_items_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."nursery_detailed_observation_items" ADD CONSTRAINT "nursery_detailed_observation_items_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'old_students_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."old_students" ADD CONSTRAINT "old_students_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'old_students_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."old_students" ADD CONSTRAINT "old_students_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'other_staff_members_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."other_staff_members" ADD CONSTRAINT "other_staff_members_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'other_staff_members_linked_user_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."other_staff_members" ADD CONSTRAINT "other_staff_members_linked_user_id_fkey" FOREIGN KEY (linked_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'parents_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."parents" ADD CONSTRAINT "parents_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'parents_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."parents" ADD CONSTRAINT "parents_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'payments_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."payments" ADD CONSTRAINT "payments_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'payments_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."payments" ADD CONSTRAINT "payments_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'pdf_render_sessions_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."pdf_render_sessions" ADD CONSTRAINT "pdf_render_sessions_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'period_locks_term_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."period_locks" ADD CONSTRAINT "period_locks_term_id_fkey" FOREIGN KEY (term_id) REFERENCES school_terms(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'period_locks_locked_by_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."period_locks" ADD CONSTRAINT "period_locks_locked_by_fkey" FOREIGN KEY (locked_by) REFERENCES users(user_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'period_locks_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."period_locks" ADD CONSTRAINT "period_locks_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'phone_reset_codes_user_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."phone_reset_codes" ADD CONSTRAINT "phone_reset_codes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'pre_primary_holistic_rating_levels_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."pre_primary_holistic_rating_levels" ADD CONSTRAINT "pre_primary_holistic_rating_levels_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'pre_primary_holistic_skills_strand_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."pre_primary_holistic_skills" ADD CONSTRAINT "pre_primary_holistic_skills_strand_id_fkey" FOREIGN KEY (strand_id) REFERENCES pre_primary_holistic_strands(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'pre_primary_holistic_skills_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."pre_primary_holistic_skills" ADD CONSTRAINT "pre_primary_holistic_skills_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'pre_primary_holistic_strands_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."pre_primary_holistic_strands" ADD CONSTRAINT "pre_primary_holistic_strands_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'processed_primary_exam_results_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."processed_primary_exam_results" ADD CONSTRAINT "processed_primary_exam_results_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'processed_primary_exam_results_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."processed_primary_exam_results" ADD CONSTRAINT "processed_primary_exam_results_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'processed_primary_exam_results_exam_set_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."processed_primary_exam_results" ADD CONSTRAINT "processed_primary_exam_results_exam_set_id_fkey" FOREIGN KEY (exam_set_id) REFERENCES exam_sets(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'processed_primary_exam_results_processed_by_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."processed_primary_exam_results" ADD CONSTRAINT "processed_primary_exam_results_processed_by_fkey" FOREIGN KEY (processed_by) REFERENCES users(user_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'processed_secondary_exam_results_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."processed_secondary_exam_results" ADD CONSTRAINT "processed_secondary_exam_results_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'processed_secondary_exam_results_exam_set_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."processed_secondary_exam_results" ADD CONSTRAINT "processed_secondary_exam_results_exam_set_id_fkey" FOREIGN KEY (exam_set_id) REFERENCES exam_sets(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'processed_secondary_exam_results_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."processed_secondary_exam_results" ADD CONSTRAINT "processed_secondary_exam_results_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'profiles_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'profiles_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."profiles" ADD CONSTRAINT "profiles_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'published_class_report_bundles_class_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."published_class_report_bundles" ADD CONSTRAINT "published_class_report_bundles_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'published_class_report_bundles_published_by_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."published_class_report_bundles" ADD CONSTRAINT "published_class_report_bundles_published_by_fkey" FOREIGN KEY (published_by) REFERENCES users(user_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'published_class_report_bundles_exam_set_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."published_class_report_bundles" ADD CONSTRAINT "published_class_report_bundles_exam_set_id_fkey" FOREIGN KEY (exam_set_id) REFERENCES exam_sets(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'published_class_report_bundles_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."published_class_report_bundles" ADD CONSTRAINT "published_class_report_bundles_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'published_student_reports_published_by_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."published_student_reports" ADD CONSTRAINT "published_student_reports_published_by_fkey" FOREIGN KEY (published_by) REFERENCES users(user_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'published_student_reports_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."published_student_reports" ADD CONSTRAINT "published_student_reports_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'published_student_reports_class_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."published_student_reports" ADD CONSTRAINT "published_student_reports_class_id_fkey" FOREIGN KEY (class_id) REFERENCES classes(class_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'published_student_reports_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."published_student_reports" ADD CONSTRAINT "published_student_reports_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'published_student_reports_exam_set_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."published_student_reports" ADD CONSTRAINT "published_student_reports_exam_set_id_fkey" FOREIGN KEY (exam_set_id) REFERENCES exam_sets(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'receipt_sequences_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."receipt_sequences" ADD CONSTRAINT "receipt_sequences_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'receipt_sequences_per_term_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."receipt_sequences_per_term" ADD CONSTRAINT "receipt_sequences_per_term_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'receipts_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."receipts" ADD CONSTRAINT "receipts_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'receipts_payment_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."receipts" ADD CONSTRAINT "receipts_payment_id_fkey" FOREIGN KEY (payment_id) REFERENCES payments(payment_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'receipts_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."receipts" ADD CONSTRAINT "receipts_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'receivable_status_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."receivable_status" ADD CONSTRAINT "receivable_status_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'receivable_status_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."receivable_status" ADD CONSTRAINT "receivable_status_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'referral_codes_affiliate_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."referral_codes" ADD CONSTRAINT "referral_codes_affiliate_id_fkey" FOREIGN KEY (affiliate_id) REFERENCES affiliates(affiliate_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'report_comments_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."report_comments" ADD CONSTRAINT "report_comments_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'report_comments_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."report_comments" ADD CONSTRAINT "report_comments_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'report_snapshot_data_snapshot_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."report_snapshot_data" ADD CONSTRAINT "report_snapshot_data_snapshot_id_fkey" FOREIGN KEY (snapshot_id) REFERENCES report_snapshots(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'report_snapshot_data_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."report_snapshot_data" ADD CONSTRAINT "report_snapshot_data_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'report_snapshots_template_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."report_snapshots" ADD CONSTRAINT "report_snapshots_template_id_fkey" FOREIGN KEY (template_id) REFERENCES report_templates(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'report_snapshots_created_by_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."report_snapshots" ADD CONSTRAINT "report_snapshots_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'report_snapshots_exam_set_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."report_snapshots" ADD CONSTRAINT "report_snapshots_exam_set_id_fkey" FOREIGN KEY (exam_set_id) REFERENCES exam_sets(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'report_snapshots_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."report_snapshots" ADD CONSTRAINT "report_snapshots_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'report_templates_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."report_templates" ADD CONSTRAINT "report_templates_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'report_title_settings_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."report_title_settings" ADD CONSTRAINT "report_title_settings_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'reports_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."reports" ADD CONSTRAINT "reports_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'reports_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."reports" ADD CONSTRAINT "reports_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'rollover_status_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."rollover_status" ADD CONSTRAINT "rollover_status_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'scheme_of_work_entries_scheme_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."scheme_of_work_entries" ADD CONSTRAINT "scheme_of_work_entries_scheme_id_fkey" FOREIGN KEY (scheme_id) REFERENCES scheme_of_work(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_chat_conversations_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_chat_conversations" ADD CONSTRAINT "school_chat_conversations_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_chat_messages_conversation_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_chat_messages" ADD CONSTRAINT "school_chat_messages_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES school_chat_conversations(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_chat_messages_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_chat_messages" ADD CONSTRAINT "school_chat_messages_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_chat_messages_sender_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_chat_messages" ADD CONSTRAINT "school_chat_messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_chat_participants_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_chat_participants" ADD CONSTRAINT "school_chat_participants_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_chat_participants_conversation_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_chat_participants" ADD CONSTRAINT "school_chat_participants_conversation_id_fkey" FOREIGN KEY (conversation_id) REFERENCES school_chat_conversations(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_chat_participants_user_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_chat_participants" ADD CONSTRAINT "school_chat_participants_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_chat_presence_user_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_chat_presence" ADD CONSTRAINT "school_chat_presence_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_chat_presence_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_chat_presence" ADD CONSTRAINT "school_chat_presence_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_class_uace_grade_bands_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_class_uace_grade_bands" ADD CONSTRAINT "school_class_uace_grade_bands_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_events_created_by_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_events" ADD CONSTRAINT "school_events_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_events_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_events" ADD CONSTRAINT "school_events_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_expenses_linked_teacher_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_expenses" ADD CONSTRAINT "school_expenses_linked_teacher_id_fkey" FOREIGN KEY (linked_teacher_id) REFERENCES teachers(teacher_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_expenses_subcategory_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_expenses" ADD CONSTRAINT "school_expenses_subcategory_id_fkey" FOREIGN KEY (subcategory_id) REFERENCES expense_subcategories(subcategory_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_expenses_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_expenses" ADD CONSTRAINT "school_expenses_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_expenses_recorded_by_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_expenses" ADD CONSTRAINT "school_expenses_recorded_by_fkey" FOREIGN KEY (recorded_by) REFERENCES users(user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_expenses_term_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_expenses" ADD CONSTRAINT "school_expenses_term_id_fkey" FOREIGN KEY (term_id) REFERENCES school_terms(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_expenses_linked_other_staff_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_expenses" ADD CONSTRAINT "school_expenses_linked_other_staff_id_fkey" FOREIGN KEY (linked_other_staff_id) REFERENCES other_staff_members(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_fee_structure_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_fee_structure" ADD CONSTRAINT "school_fee_structure_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_report_customizations_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_report_customizations" ADD CONSTRAINT "school_report_customizations_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_requests_reviewed_by_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_requests" ADD CONSTRAINT "school_requests_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_requirements_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_requirements" ADD CONSTRAINT "school_requirements_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_subscriptions_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_subscriptions" ADD CONSTRAINT "school_subscriptions_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_terms_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_terms" ADD CONSTRAINT "school_terms_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_terms_global_term_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_terms" ADD CONSTRAINT "school_terms_global_term_id_fkey" FOREIGN KEY (global_term_id) REFERENCES global_terms(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'school_uace_class_subject_papers_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."school_uace_class_subject_papers" ADD CONSTRAINT "school_uace_class_subject_papers_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'schoolpay_ingested_events_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."schoolpay_ingested_events" ADD CONSTRAINT "schoolpay_ingested_events_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'schoolpay_ingested_events_student_payment_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."schoolpay_ingested_events" ADD CONSTRAINT "schoolpay_ingested_events_student_payment_id_fkey" FOREIGN KEY (student_payment_id) REFERENCES student_payments(payment_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'schoolpay_school_settings_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."schoolpay_school_settings" ADD CONSTRAINT "schoolpay_school_settings_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'schools_referral_code_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."schools" ADD CONSTRAINT "schools_referral_code_id_fkey" FOREIGN KEY (referral_code_id) REFERENCES referral_codes(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'schools_affiliate_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."schools" ADD CONSTRAINT "schools_affiliate_id_fkey" FOREIGN KEY (affiliate_id) REFERENCES affiliates(affiliate_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'fk_schools_admin_id' AND n.nspname = 'public') THEN
    ALTER TABLE public."schools" ADD CONSTRAINT "fk_schools_admin_id" FOREIGN KEY (admin_id) REFERENCES users(user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_alevel_subjects_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_alevel_subjects" ADD CONSTRAINT "student_alevel_subjects_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_alevel_subjects_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_alevel_subjects" ADD CONSTRAINT "student_alevel_subjects_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_attendance_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_attendance" ADD CONSTRAINT "student_attendance_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_attendance_teacher_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_attendance" ADD CONSTRAINT "student_attendance_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_attendance_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_attendance" ADD CONSTRAINT "student_attendance_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_balances_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_balances" ADD CONSTRAINT "student_balances_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_balances_term_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_balances" ADD CONSTRAINT "student_balances_term_id_fkey" FOREIGN KEY (term_id) REFERENCES school_terms(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_balances_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_balances" ADD CONSTRAINT "student_balances_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_discounts_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_discounts" ADD CONSTRAINT "student_discounts_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_discounts_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_discounts" ADD CONSTRAINT "student_discounts_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_discounts_created_by_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_discounts" ADD CONSTRAINT "student_discounts_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_discounts_term_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_discounts" ADD CONSTRAINT "student_discounts_term_id_fkey" FOREIGN KEY (term_id) REFERENCES school_terms(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_fees_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_fees" ADD CONSTRAINT "student_fees_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_fees_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_fees" ADD CONSTRAINT "student_fees_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_fees_term_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_fees" ADD CONSTRAINT "student_fees_term_id_fkey" FOREIGN KEY (term_id) REFERENCES school_terms(id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_grievances_assigned_portfolio_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_grievances" ADD CONSTRAINT "student_grievances_assigned_portfolio_id_fkey" FOREIGN KEY (assigned_portfolio_id) REFERENCES guild_portfolios(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_grievances_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_grievances" ADD CONSTRAINT "student_grievances_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_grievances_resolved_by_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_grievances" ADD CONSTRAINT "student_grievances_resolved_by_fkey" FOREIGN KEY (resolved_by) REFERENCES guild_tenures(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_grievances_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_grievances" ADD CONSTRAINT "student_grievances_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_import_batches_created_by_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_import_batches" ADD CONSTRAINT "student_import_batches_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_import_batches_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_import_batches" ADD CONSTRAINT "student_import_batches_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_invoices_created_by_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_invoices" ADD CONSTRAINT "student_invoices_created_by_fkey" FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_invoices_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_invoices" ADD CONSTRAINT "student_invoices_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_invoices_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_invoices" ADD CONSTRAINT "student_invoices_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_invoices_term_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_invoices" ADD CONSTRAINT "student_invoices_term_id_fkey" FOREIGN KEY (term_id) REFERENCES school_terms(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_ledger_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_ledger" ADD CONSTRAINT "student_ledger_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_ledger_term_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_ledger" ADD CONSTRAINT "student_ledger_term_id_fkey" FOREIGN KEY (term_id) REFERENCES school_terms(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_ledger_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_ledger" ADD CONSTRAINT "student_ledger_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_olevel_subjects_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_olevel_subjects" ADD CONSTRAINT "student_olevel_subjects_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_olevel_subjects_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_olevel_subjects" ADD CONSTRAINT "student_olevel_subjects_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_payments_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_payments" ADD CONSTRAINT "student_payments_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_payments_invoice_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_payments" ADD CONSTRAINT "student_payments_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES student_invoices(invoice_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_payments_recorded_by_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_payments" ADD CONSTRAINT "student_payments_recorded_by_fkey" FOREIGN KEY (recorded_by) REFERENCES users(user_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_payments_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_payments" ADD CONSTRAINT "student_payments_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_payments_reversed_by_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_payments" ADD CONSTRAINT "student_payments_reversed_by_fkey" FOREIGN KEY (reversed_by) REFERENCES users(user_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_payments_term_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_payments" ADD CONSTRAINT "student_payments_term_id_fkey" FOREIGN KEY (term_id) REFERENCES school_terms(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_photos_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_photos" ADD CONSTRAINT "student_photos_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_photos_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_photos" ADD CONSTRAINT "student_photos_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_requirements_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_requirements" ADD CONSTRAINT "student_requirements_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_requirements_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_requirements" ADD CONSTRAINT "student_requirements_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_requirements_requirement_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_requirements" ADD CONSTRAINT "student_requirements_requirement_id_fkey" FOREIGN KEY (requirement_id) REFERENCES school_requirements(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_stream_assignments_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_stream_assignments" ADD CONSTRAINT "student_stream_assignments_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'student_stream_assignments_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."student_stream_assignments" ADD CONSTRAINT "student_stream_assignments_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'students_import_batch_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."students" ADD CONSTRAINT "students_import_batch_id_fkey" FOREIGN KEY (import_batch_id) REFERENCES student_import_batches(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'students_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."students" ADD CONSTRAINT "students_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'subjects_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."subjects" ADD CONSTRAINT "subjects_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'system_health_metrics_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."system_health_metrics" ADD CONSTRAINT "system_health_metrics_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_attendance_logs_teacher_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_attendance_logs" ADD CONSTRAINT "teacher_attendance_logs_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_attendance_logs_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_attendance_logs" ADD CONSTRAINT "teacher_attendance_logs_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_class_subjects_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_class_subjects" ADD CONSTRAINT "teacher_class_subjects_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_class_subjects_teacher_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_class_subjects" ADD CONSTRAINT "teacher_class_subjects_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_comment_rules_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_comment_rules" ADD CONSTRAINT "teacher_comment_rules_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_documents_teacher_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_documents" ADD CONSTRAINT "teacher_documents_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_documents_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_documents" ADD CONSTRAINT "teacher_documents_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_documents_uploaded_by_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_documents" ADD CONSTRAINT "teacher_documents_uploaded_by_fkey" FOREIGN KEY (uploaded_by) REFERENCES users(user_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_exam_class_prefs_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_exam_class_prefs" ADD CONSTRAINT "teacher_exam_class_prefs_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_exam_grade_bands_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_exam_grade_bands" ADD CONSTRAINT "teacher_exam_grade_bands_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_phone_change_requests_admin_user_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_phone_change_requests" ADD CONSTRAINT "teacher_phone_change_requests_admin_user_id_fkey" FOREIGN KEY (admin_user_id) REFERENCES users(user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_phone_change_requests_teacher_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_phone_change_requests" ADD CONSTRAINT "teacher_phone_change_requests_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teacher_remarks_settings_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."teacher_remarks_settings" ADD CONSTRAINT "teacher_remarks_settings_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'teachers_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."teachers" ADD CONSTRAINT "teachers_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'term_closures_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."term_closures" ADD CONSTRAINT "term_closures_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'termly_projects_student_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."termly_projects" ADD CONSTRAINT "termly_projects_student_id_fkey" FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'termly_projects_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."termly_projects" ADD CONSTRAINT "termly_projects_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'timetable_fixed_periods_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."timetable_fixed_periods" ADD CONSTRAINT "timetable_fixed_periods_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'timetable_periods_teacher_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."timetable_periods" ADD CONSTRAINT "timetable_periods_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'timetable_periods_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."timetable_periods" ADD CONSTRAINT "timetable_periods_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'timetables_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."timetables" ADD CONSTRAINT "timetables_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'timetables_teacher_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."timetables" ADD CONSTRAINT "timetables_teacher_id_fkey" FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'user_active_schools_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."user_active_schools" ADD CONSTRAINT "user_active_schools_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'user_in_app_notifications_user_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."user_in_app_notifications" ADD CONSTRAINT "user_in_app_notifications_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'user_in_app_notifications_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."user_in_app_notifications" ADD CONSTRAINT "user_in_app_notifications_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'user_school_memberships_linked_teacher_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."user_school_memberships" ADD CONSTRAINT "user_school_memberships_linked_teacher_id_fkey" FOREIGN KEY (linked_teacher_id) REFERENCES teachers(teacher_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'user_school_memberships_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."user_school_memberships" ADD CONSTRAINT "user_school_memberships_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'user_school_permissions_granted_by_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."user_school_permissions" ADD CONSTRAINT "user_school_permissions_granted_by_fkey" FOREIGN KEY (granted_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'user_school_permissions_user_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."user_school_permissions" ADD CONSTRAINT "user_school_permissions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'user_school_permissions_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."user_school_permissions" ADD CONSTRAINT "user_school_permissions_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'user_sessions_user_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'users_linked_teacher_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."users" ADD CONSTRAINT "users_linked_teacher_id_fkey" FOREIGN KEY (linked_teacher_id) REFERENCES teachers(teacher_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'users_school_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."users" ADD CONSTRAINT "users_school_id_fkey" FOREIGN KEY (school_id) REFERENCES schools(school_id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'fk_users_student_id' AND n.nspname = 'public') THEN
    ALTER TABLE public."users" ADD CONSTRAINT "fk_users_student_id" FOREIGN KEY (student_id) REFERENCES students(student_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'writeoff_log_invoice_id_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."writeoff_log" ADD CONSTRAINT "writeoff_log_invoice_id_fkey" FOREIGN KEY (invoice_id) REFERENCES student_invoices(invoice_id) ON DELETE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class c ON c.oid = con.conrelid JOIN pg_namespace n ON n.oid = c.relnamespace WHERE con.conname = 'writeoff_log_approved_by_fkey' AND n.nspname = 'public') THEN
    ALTER TABLE public."writeoff_log" ADD CONSTRAINT "writeoff_log_approved_by_fkey" FOREIGN KEY (approved_by) REFERENCES users(user_id) ON DELETE RESTRICT;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 5. INDEXES
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_admin_activities_admin_user ON public.admin_activities USING btree (admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activities_created_at ON public.admin_activities USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activities_school_created ON public.admin_activities USING btree (school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activities_school_id ON public.admin_activities USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_admission_sequences_school_id ON public.admission_sequences USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_admission_sequences_year ON public.admission_sequences USING btree (year);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_affiliate_id ON public.affiliate_clicks USING btree (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_codes_affiliate_id ON public.affiliate_codes USING btree (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_codes_code ON public.affiliate_codes USING btree (code);
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_affiliate_id ON public.affiliate_earnings USING btree (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_status ON public.affiliate_earnings USING btree (status);
CREATE INDEX IF NOT EXISTS idx_affiliates_user_id ON public.affiliates USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment ON public.assignment_submissions USING btree (assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student ON public.assignment_submissions USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON public.assignments USING btree (due_date);
CREATE INDEX IF NOT EXISTS idx_assignments_school ON public.assignments USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_assignments_teacher ON public.assignments USING btree (teacher_id);
CREATE INDEX IF NOT EXISTS idx_attendance_school_id ON public.attendance USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_attendance_teacher_id ON public.attendance USING btree (teacher_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON public.audit_log USING btree (entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_school_created ON public.audit_log USING btree (school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON public.audit_log USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_timestamp ON public.audit_logs USING btree (action, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_timestamp ON public.audit_logs USING btree (resource, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON public.audit_logs USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp ON public.audit_logs USING btree (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_balance_brought_forward_school_id ON public.balance_brought_forward USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_bbf_student ON public.balance_brought_forward USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_bbf_to_term ON public.balance_brought_forward USING btree (to_term_id);
CREATE INDEX IF NOT EXISTS biometric_device_users_lookup ON public.biometric_device_users USING btree (school_id, device_user_id);
CREATE INDEX IF NOT EXISTS biometric_devices_school ON public.biometric_devices USING btree (school_id);
CREATE INDEX IF NOT EXISTS class_streams_school_class ON public.class_streams USING btree (school_id, class_name);
CREATE INDEX IF NOT EXISTS idx_class_subjects_school_class ON public.class_subjects USING btree (school_id, class_name);
CREATE INDEX IF NOT EXISTS idx_class_teacher_comments_settings_class_name ON public.class_teacher_comments_settings USING btree (class_name);
CREATE INDEX IF NOT EXISTS idx_class_teacher_comments_settings_school_id ON public.class_teacher_comments_settings USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_class_teachers_class_name ON public.class_teachers USING btree (class_name);
CREATE INDEX IF NOT EXISTS idx_class_teachers_school_class ON public.class_teachers USING btree (school_id, class_name);
CREATE INDEX IF NOT EXISTS idx_class_teachers_school_id ON public.class_teachers USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_class_teachers_school_teacher ON public.class_teachers USING btree (school_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_teachers_teacher_id ON public.class_teachers USING btree (teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_template_settings_class_name ON public.class_template_settings USING btree (class_name);
CREATE INDEX IF NOT EXISTS idx_class_template_settings_class_teacher_id ON public.class_template_settings USING btree (class_teacher_id);
CREATE INDEX IF NOT EXISTS idx_class_template_settings_school_id ON public.class_template_settings USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_class_template_settings_template_id ON public.class_template_settings USING btree (template_id);
CREATE INDEX IF NOT EXISTS idx_classes_school_id ON public.classes USING btree (school_id);
CREATE INDEX IF NOT EXISTS curriculum_scheme_examples_lookup_idx ON public.curriculum_scheme_examples USING btree (education_level, class_name, subject, term);
CREATE INDEX IF NOT EXISTS curriculum_topics_lookup_idx ON public.curriculum_topics USING btree (education_level, class_name, subject, term);
CREATE INDEX IF NOT EXISTS idx_discipline_records_incident_date ON public.discipline_records USING btree (incident_date);
CREATE INDEX IF NOT EXISTS idx_discipline_records_recorded_by ON public.discipline_records USING btree (recorded_by);
CREATE INDEX IF NOT EXISTS idx_discipline_records_school_id ON public.discipline_records USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_discipline_records_school_student ON public.discipline_records USING btree (school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_discipline_records_student_created ON public.discipline_records USING btree (student_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_discipline_records_student_id ON public.discipline_records USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_discipline_records_student_type ON public.discipline_records USING btree (student_id, action_type);
CREATE INDEX IF NOT EXISTS idx_election_candidates_election ON public.election_candidates USING btree (election_id);
CREATE INDEX IF NOT EXISTS idx_election_voter_logs_election_student ON public.election_voter_logs USING btree (election_id, student_id);
CREATE INDEX IF NOT EXISTS idx_elections_school_status ON public.elections USING btree (school_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS exam_results_exam_student_subject_line_norm_uidx ON public.exam_results USING btree (exam_set_id, student_id, lower(normalize_subject_name(subject)), COALESCE(exam_topic_key, ''::text), COALESCE(exam_paper_key, ''::text));
CREATE UNIQUE INDEX IF NOT EXISTS exam_results_exam_student_subject_line_uidx ON public.exam_results USING btree (exam_set_id, student_id, subject, exam_topic_key, exam_paper_key);
CREATE UNIQUE INDEX IF NOT EXISTS exam_results_subject_norm_uidx ON public.exam_results USING btree (exam_set_id, student_id, lower(normalize_subject_text(subject)), COALESCE(exam_topic_key, ''::text), COALESCE(exam_paper_key, ''::text));
CREATE INDEX IF NOT EXISTS idx_exam_results_class_subject ON public.exam_results USING btree (class_name, subject);
CREATE INDEX IF NOT EXISTS idx_exam_results_exam_set_id ON public.exam_results USING btree (exam_set_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_nursery_format ON public.exam_results USING btree (nursery_report_format) WHERE (nursery_report_format IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_exam_results_preview_scope ON public.exam_results USING btree (school_id, exam_set_id, class_name);
CREATE INDEX IF NOT EXISTS idx_exam_results_school_class ON public.exam_results USING btree (school_id, class_name);
CREATE INDEX IF NOT EXISTS idx_exam_results_school_exam_set ON public.exam_results USING btree (school_id, exam_set_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_school_id ON public.exam_results USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_school_student ON public.exam_results USING btree (school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student_id ON public.exam_results USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_exam_sets_active ON public.exam_sets USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_exam_sets_school_id ON public.exam_sets USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_exam_sets_term_year ON public.exam_sets USING btree (term, year);
CREATE INDEX IF NOT EXISTS idx_expense_categories_school_id ON public.expense_categories USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_expense_subcategories_main_category_code ON public.expense_subcategories USING btree (main_category_code);
CREATE INDEX IF NOT EXISTS idx_expense_subcategories_school_main ON public.expense_subcategories USING btree (school_id, main_category_code);
CREATE INDEX IF NOT EXISTS idx_fee_structures_class_name ON public.fee_structures USING btree (class_name);
CREATE INDEX IF NOT EXISTS idx_fee_structures_school_id ON public.fee_structures USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_fee_structures_term_id ON public.fee_structures USING btree (term_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_generated_by ON public.generated_reports USING btree (generated_by);
CREATE INDEX IF NOT EXISTS idx_generated_reports_snapshot_id ON public.generated_reports USING btree (snapshot_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_student_id ON public.generated_reports USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_template_id ON public.generated_reports USING btree (template_id);
CREATE INDEX IF NOT EXISTS idx_global_terms_year_term ON public.global_terms USING btree (year, term);
CREATE INDEX IF NOT EXISTS idx_grades_student_id ON public.grades USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_grades_teacher_id ON public.grades USING btree (teacher_id);
CREATE UNIQUE INDEX IF NOT EXISTS grading_scale_default_grade_key ON public.grading_scale USING btree (grade_code) WHERE (school_id IS NULL);
CREATE UNIQUE INDEX IF NOT EXISTS grading_scale_school_grade_key ON public.grading_scale USING btree (school_id, grade_code) WHERE (school_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_guild_portfolios_school ON public.guild_portfolios USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_guild_tenures_school_student ON public.guild_tenures USING btree (school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_guild_tenures_status ON public.guild_tenures USING btree (status);
CREATE INDEX IF NOT EXISTS idx_guild_transactions_tenure ON public.guild_transactions USING btree (tenure_id);
CREATE INDEX IF NOT EXISTS idx_headteacher_comments_settings_percent_range ON public.headteacher_comments_settings USING btree (min_percent, max_percent);
CREATE INDEX IF NOT EXISTS idx_headteacher_comments_settings_school_id ON public.headteacher_comments_settings USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_hr_job_applications_job ON public.hr_job_applications USING btree (job_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_job_applications_school ON public.hr_job_applications USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_hr_leave_balances_leave_type_id ON public.hr_leave_balances USING btree (leave_type_id);
CREATE INDEX IF NOT EXISTS idx_hr_leave_balances_lookup ON public.hr_leave_balances USING btree (school_id, staff_kind, staff_id, year);
CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_leave_type_id ON public.hr_leave_requests USING btree (leave_type_id);
CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_requested_by ON public.hr_leave_requests USING btree (requested_by_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_reviewed_by ON public.hr_leave_requests USING btree (reviewed_by_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_school_status ON public.hr_leave_requests USING btree (school_id, status, start_date);
CREATE INDEX IF NOT EXISTS idx_hr_leave_types_school ON public.hr_leave_types USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_hr_onboarding_run_tasks_run_id ON public.hr_onboarding_run_tasks USING btree (run_id);
CREATE INDEX IF NOT EXISTS idx_hr_onboarding_runs_job_application_id ON public.hr_onboarding_runs USING btree (job_application_id);
CREATE INDEX IF NOT EXISTS idx_hr_onboarding_runs_school ON public.hr_onboarding_runs USING btree (school_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_onboarding_runs_template_id ON public.hr_onboarding_runs USING btree (template_id);
CREATE INDEX IF NOT EXISTS idx_hr_onboarding_template_tasks_template_id ON public.hr_onboarding_template_tasks USING btree (template_id);
CREATE INDEX IF NOT EXISTS idx_hr_onboarding_templates_school_id ON public.hr_onboarding_templates USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_periods_school ON public.hr_payroll_periods USING btree (school_id, status);
CREATE INDEX IF NOT EXISTS idx_hr_payslips_school ON public.hr_payslips USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_hr_review_cycles_school_id ON public.hr_review_cycles USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_hr_staff_goals_cycle_id ON public.hr_staff_goals USING btree (cycle_id);
CREATE INDEX IF NOT EXISTS idx_hr_staff_goals_school ON public.hr_staff_goals USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_hr_staff_reviews_cycle ON public.hr_staff_reviews USING btree (cycle_id);
CREATE INDEX IF NOT EXISTS idx_hr_staff_reviews_reviewer_user_id ON public.hr_staff_reviews USING btree (reviewer_user_id);
CREATE INDEX IF NOT EXISTS idx_hr_staff_reviews_school_id ON public.hr_staff_reviews USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_jobs_school_id ON public.jobs USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_lesson_logs_school_date ON public.lesson_logs USING btree (school_id, lesson_date DESC);
CREATE INDEX IF NOT EXISTS idx_lesson_logs_teacher_date ON public.lesson_logs USING btree (teacher_id, lesson_date DESC);
CREATE INDEX IF NOT EXISTS idx_library_book_copies_barcode ON public.library_book_copies USING btree (barcode);
CREATE INDEX IF NOT EXISTS idx_library_book_copies_book_id ON public.library_book_copies USING btree (book_id);
CREATE INDEX IF NOT EXISTS idx_library_book_copies_school_id ON public.library_book_copies USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_library_books_isbn ON public.library_books USING btree (isbn);
CREATE INDEX IF NOT EXISTS idx_library_books_school_id ON public.library_books USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_library_books_title ON public.library_books USING btree (title);
CREATE INDEX IF NOT EXISTS idx_library_borrows_copy_id ON public.library_borrows USING btree (copy_id);
CREATE INDEX IF NOT EXISTS idx_library_borrows_due_at ON public.library_borrows USING btree (due_date);
CREATE INDEX IF NOT EXISTS idx_library_borrows_school_id ON public.library_borrows USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_library_borrows_student_id ON public.library_borrows USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_library_fines_borrow_id ON public.library_fines USING btree (borrow_id);
CREATE INDEX IF NOT EXISTS idx_library_fines_school_id ON public.library_fines USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_library_fines_student_id ON public.library_fines USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_library_reservations_book_id ON public.library_reservations USING btree (book_id);
CREATE INDEX IF NOT EXISTS idx_library_reservations_school_id ON public.library_reservations USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_library_reservations_student_id ON public.library_reservations USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_login_activities_user_id ON public.login_activities USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_logs_created_at ON public.logs USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_logs_school_id ON public.logs USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_logs_user_id ON public.logs USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_messages_read ON public.messages USING btree (recipient_id, read);
CREATE INDEX IF NOT EXISTS idx_messages_recipient ON public.messages USING btree (recipient_id, recipient_type);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages USING btree (sender_id, sender_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_school_created ON public.notification_logs USING btree (school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_school_id ON public.notification_logs USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON public.notification_logs USING btree (status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_student_id ON public.notification_logs USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_notification_templates_category ON public.notification_templates USING btree (category);
CREATE INDEX IF NOT EXISTS idx_notification_templates_school_id ON public.notification_templates USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_school_id ON public.notifications USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_notifications_student_id ON public.notifications USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications USING btree (user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_nursery_detailed_obs_strand ON public.nursery_detailed_observation_items USING btree (strand, sort_order);
CREATE UNIQUE INDEX IF NOT EXISTS uq_nursery_detailed_obs_school_item ON public.nursery_detailed_observation_items USING btree (school_id, item_key);
CREATE INDEX IF NOT EXISTS idx_old_students_school_id ON public.old_students USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_other_staff_members_linked_user ON public.other_staff_members USING btree (linked_user_id) WHERE (linked_user_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_other_staff_members_school_id ON public.other_staff_members USING btree (school_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_owner_dashboard_metrics_unique ON public.owner_dashboard_metrics USING btree (last_updated);
CREATE INDEX IF NOT EXISTS idx_owner_revenue_trend_month_year ON public.owner_revenue_trend_metrics USING btree (month_year);
CREATE INDEX IF NOT EXISTS idx_owner_school_growth_month_year ON public.owner_school_growth_metrics USING btree (month_year);
CREATE INDEX IF NOT EXISTS idx_owner_user_growth_month_year ON public.owner_user_growth_metrics USING btree (month_year);
CREATE INDEX IF NOT EXISTS idx_parents_school_parent ON public.parents USING btree (school_id, parent_id);
CREATE INDEX IF NOT EXISTS idx_parents_school_student ON public.parents USING btree (school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_parents_student_id ON public.parents USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_payments_date_method ON public.payments USING btree (created_at, payment_method);
CREATE INDEX IF NOT EXISTS idx_payments_school_date_amount ON public.payments USING btree (school_id, created_at, amount);
CREATE INDEX IF NOT EXISTS idx_payments_school_id ON public.payments USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON public.payments USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_pdf_render_sessions_school_id ON public.pdf_render_sessions USING btree (school_id);
CREATE INDEX IF NOT EXISTS pdf_render_sessions_expires_at_idx ON public.pdf_render_sessions USING btree (expires_at);
CREATE INDEX IF NOT EXISTS idx_period_locks_locked_by ON public.period_locks USING btree (locked_by);
CREATE INDEX IF NOT EXISTS idx_period_locks_school ON public.period_locks USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_period_locks_term_id ON public.period_locks USING btree (term_id);
CREATE INDEX IF NOT EXISTS phone_reset_codes_phone_idx ON public.phone_reset_codes USING btree (phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pre_primary_skills_strand ON public.pre_primary_holistic_skills USING btree (strand_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_pre_primary_strands_school ON public.pre_primary_holistic_strands USING btree (school_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_processed_nursery_format ON public.processed_primary_exam_results USING btree (nursery_report_format) WHERE (nursery_report_format IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_processed_primary_exam_results_aggregate ON public.processed_primary_exam_results USING btree (school_id, student_id, exam_set_id, aggregate);
CREATE INDEX IF NOT EXISTS idx_processed_primary_exam_results_class_position ON public.processed_primary_exam_results USING btree (school_id, exam_set_id, class_name, class_position);
CREATE INDEX IF NOT EXISTS idx_processed_primary_exam_results_class_subject ON public.processed_primary_exam_results USING btree (class_name, subject);
CREATE INDEX IF NOT EXISTS idx_processed_primary_exam_results_division ON public.processed_primary_exam_results USING btree (school_id, student_id, exam_set_id, division);
CREATE INDEX IF NOT EXISTS idx_processed_primary_exam_results_exam_set_id ON public.processed_primary_exam_results USING btree (exam_set_id);
CREATE INDEX IF NOT EXISTS idx_processed_primary_exam_results_processed_by ON public.processed_primary_exam_results USING btree (processed_by);
CREATE INDEX IF NOT EXISTS idx_processed_primary_exam_results_school_id ON public.processed_primary_exam_results USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_processed_primary_exam_results_student_id ON public.processed_primary_exam_results USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_processed_primary_exam_results_year_term ON public.processed_primary_exam_results USING btree (year, term);
CREATE INDEX IF NOT EXISTS idx_processed_secondary_exam_results_exam_set_id ON public.processed_secondary_exam_results USING btree (exam_set_id);
CREATE INDEX IF NOT EXISTS idx_processed_secondary_exam_results_school_id ON public.processed_secondary_exam_results USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_processed_secondary_exam_results_student_id ON public.processed_secondary_exam_results USING btree (student_id);
CREATE UNIQUE INDEX IF NOT EXISTS processed_secondary_exam_line_uidx ON public.processed_secondary_exam_results USING btree (school_id, student_id, exam_set_id, subject, proc_topic_key, proc_paper_key);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON public.profiles USING btree (role);
CREATE INDEX IF NOT EXISTS profiles_school_id_idx ON public.profiles USING btree (school_id);
CREATE INDEX IF NOT EXISTS profiles_status_idx ON public.profiles USING btree (status);
CREATE INDEX IF NOT EXISTS idx_published_class_bundles_class_id ON public.published_class_report_bundles USING btree (class_id);
CREATE INDEX IF NOT EXISTS idx_published_class_bundles_exam_set_id ON public.published_class_report_bundles USING btree (exam_set_id);
CREATE INDEX IF NOT EXISTS idx_published_class_bundles_published_by ON public.published_class_report_bundles USING btree (published_by);
CREATE INDEX IF NOT EXISTS idx_published_class_bundles_school_date ON public.published_class_report_bundles USING btree (school_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_published_class_bundles_scope ON public.published_class_report_bundles USING btree (school_id, class_id, term, year, exam_set_id);
CREATE INDEX IF NOT EXISTS idx_published_student_reports_class_id ON public.published_student_reports USING btree (class_id);
CREATE INDEX IF NOT EXISTS idx_published_student_reports_exam_set_id ON public.published_student_reports USING btree (exam_set_id);
CREATE INDEX IF NOT EXISTS idx_published_student_reports_published_by ON public.published_student_reports USING btree (published_by);
CREATE INDEX IF NOT EXISTS idx_published_student_reports_school_date ON public.published_student_reports USING btree (school_id, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_published_student_reports_scope ON public.published_student_reports USING btree (school_id, class_id, term, year, exam_set_id);
CREATE INDEX IF NOT EXISTS idx_published_student_reports_student ON public.published_student_reports USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_receipts_payment_id ON public.receipts USING btree (payment_id);
CREATE INDEX IF NOT EXISTS idx_receipts_school_id ON public.receipts USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_receipts_student_id ON public.receipts USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_receivable_status_outstanding ON public.receivable_status USING btree (total_outstanding) WHERE (total_outstanding > (0)::numeric);
CREATE INDEX IF NOT EXISTS idx_receivable_status_school ON public.receivable_status USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_active ON public.referral_codes USING btree (is_active);
CREATE INDEX IF NOT EXISTS idx_referral_codes_affiliate_id ON public.referral_codes USING btree (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes USING btree (code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_expires_at ON public.referral_codes USING btree (expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS referral_codes_code_upper_key ON public.referral_codes USING btree (upper(code));
CREATE INDEX IF NOT EXISTS idx_report_comments_class_name ON public.report_comments USING btree (class_name);
CREATE INDEX IF NOT EXISTS idx_report_comments_school_id ON public.report_comments USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_report_comments_student_id ON public.report_comments USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_report_pdf_cache_class ON public.report_pdf_cache USING btree (school_id, class_name, term, year, exam_set_id);
CREATE INDEX IF NOT EXISTS idx_report_snapshot_data_snapshot_id ON public.report_snapshot_data USING btree (snapshot_id);
CREATE INDEX IF NOT EXISTS idx_report_snapshot_data_student_id ON public.report_snapshot_data USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_snapshot_data_class ON public.report_snapshot_data USING btree (snapshot_id, class_name);
CREATE INDEX IF NOT EXISTS idx_snapshot_data_position ON public.report_snapshot_data USING btree (snapshot_id, position_in_class);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_created_by ON public.report_snapshots USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_exam_set_id ON public.report_snapshots USING btree (exam_set_id);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_school_id ON public.report_snapshots USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_status ON public.report_snapshots USING btree (status);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_template_id ON public.report_snapshots USING btree (template_id);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_term_year ON public.report_snapshots USING btree (term, year);
CREATE UNIQUE INDEX IF NOT EXISTS idx_report_templates_id ON public.report_templates USING btree (id);
CREATE INDEX IF NOT EXISTS idx_report_templates_school_id ON public.report_templates USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_report_title_settings_school_id ON public.report_title_settings USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_reports_school_id ON public.reports USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_reports_student_id ON public.reports USING btree (student_id);
CREATE INDEX IF NOT EXISTS scheme_of_work_school_idx ON public.scheme_of_work USING btree (school_id);
CREATE UNIQUE INDEX IF NOT EXISTS scheme_of_work_uq ON public.scheme_of_work USING btree (school_id, teacher_id, class_name, subject, term, year);
CREATE INDEX IF NOT EXISTS scheme_of_work_entries_scheme_id_idx ON public.scheme_of_work_entries USING btree (scheme_id);
CREATE INDEX IF NOT EXISTS idx_school_chat_conversations_school_updated ON public.school_chat_conversations USING btree (school_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_school_chat_messages_conv_time ON public.school_chat_messages USING btree (conversation_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_school_chat_messages_school_id ON public.school_chat_messages USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_school_chat_messages_sender_id ON public.school_chat_messages USING btree (sender_id);
CREATE INDEX IF NOT EXISTS idx_school_chat_participants_school_id ON public.school_chat_participants USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_school_chat_participants_user ON public.school_chat_participants USING btree (user_id, school_id);
CREATE INDEX IF NOT EXISTS idx_school_chat_presence_school_last_seen ON public.school_chat_presence USING btree (school_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_school_class_uace_grade_bands_school ON public.school_class_uace_grade_bands USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_school_events_created_by ON public.school_events USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_school_events_school_id ON public.school_events USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_school_events_start_date ON public.school_events USING btree (event_date);
CREATE INDEX IF NOT EXISTS school_events_school_date ON public.school_events USING btree (school_id, event_date);
CREATE INDEX IF NOT EXISTS idx_school_expenses_category_id ON public.school_expenses USING btree (category_id);
CREATE INDEX IF NOT EXISTS idx_school_expenses_linked_other_staff ON public.school_expenses USING btree (linked_other_staff_id) WHERE (linked_other_staff_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_school_expenses_linked_teacher ON public.school_expenses USING btree (linked_teacher_id) WHERE (linked_teacher_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_school_expenses_recorded_by ON public.school_expenses USING btree (recorded_by);
CREATE INDEX IF NOT EXISTS idx_school_expenses_reference_number ON public.school_expenses USING btree (reference_number);
CREATE INDEX IF NOT EXISTS idx_school_expenses_school_date ON public.school_expenses USING btree (school_id, expense_date);
CREATE INDEX IF NOT EXISTS idx_school_expenses_school_id ON public.school_expenses USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_school_expenses_school_linked_teacher_date ON public.school_expenses USING btree (school_id, linked_teacher_id, expense_date DESC) WHERE (linked_teacher_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_school_expenses_school_term_date ON public.school_expenses USING btree (school_id, term_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS idx_school_expenses_subcategory ON public.school_expenses USING btree (subcategory_id) WHERE (subcategory_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_school_expenses_term_id ON public.school_expenses USING btree (term_id);
CREATE INDEX IF NOT EXISTS idx_school_fee_structure_class_name ON public.school_fee_structure USING btree (class_name);
CREATE INDEX IF NOT EXISTS idx_school_fee_structure_school_id ON public.school_fee_structure USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_school_report_customizations_school_id ON public.school_report_customizations USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_school_requests_reviewed_by ON public.school_requests USING btree (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_school_requirements_boarding_type ON public.school_requirements USING btree (boarding_type);
CREATE INDEX IF NOT EXISTS idx_school_requirements_class_name ON public.school_requirements USING btree (class_name);
CREATE INDEX IF NOT EXISTS idx_school_requirements_requirement_name ON public.school_requirements USING btree (requirement_name);
CREATE INDEX IF NOT EXISTS idx_school_requirements_school_id ON public.school_requirements USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_school_requirements_status ON public.school_requirements USING btree (status);
CREATE INDEX IF NOT EXISTS idx_school_subscriptions_school_status ON public.school_subscriptions USING btree (school_id, status);
CREATE INDEX IF NOT EXISTS idx_school_subscriptions_status_amount ON public.school_subscriptions USING btree (status, monthly_amount, end_date);
CREATE INDEX IF NOT EXISTS unique_active_subscription_per_school ON public.school_subscriptions USING btree (school_id) WHERE (status = 'active'::text);
CREATE INDEX IF NOT EXISTS idx_school_terms_global_term ON public.school_terms USING btree (global_term_id) WHERE (global_term_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_school_terms_is_current ON public.school_terms USING btree (school_id, is_current) WHERE (is_current = true);
CREATE INDEX IF NOT EXISTS idx_school_terms_school_year_term ON public.school_terms USING btree (school_id, year, term);
CREATE INDEX IF NOT EXISTS idx_school_uace_papers_school_class ON public.school_uace_class_subject_papers USING btree (school_id, class_name);
CREATE INDEX IF NOT EXISTS idx_schoolpay_ingested_events_payment_id ON public.schoolpay_ingested_events USING btree (student_payment_id);
CREATE INDEX IF NOT EXISTS idx_schoolpay_ingested_school_created ON public.schoolpay_ingested_events USING btree (school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_schoolpay_settings_enabled ON public.schoolpay_school_settings USING btree (school_id) WHERE (enabled = true);
CREATE INDEX IF NOT EXISTS idx_schools_activity_status ON public.schools USING btree (created_at) WHERE (created_at IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_schools_admin_id ON public.schools USING btree (admin_id);
CREATE INDEX IF NOT EXISTS idx_schools_affiliate_id ON public.schools USING btree (affiliate_id);
CREATE INDEX IF NOT EXISTS idx_schools_name ON public.schools USING btree (name);
CREATE INDEX IF NOT EXISTS idx_schools_referral_code_id ON public.schools USING btree (referral_code_id);
CREATE INDEX IF NOT EXISTS idx_schools_school_code ON public.schools USING btree (school_code);
CREATE INDEX IF NOT EXISTS idx_schools_type_created ON public.schools USING btree (type, created_at);
CREATE INDEX IF NOT EXISTS idx_student_alevel_subjects_school ON public.student_alevel_subjects USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_student_alevel_subjects_school_student ON public.student_alevel_subjects USING btree (school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_student_alevel_subjects_student ON public.student_alevel_subjects USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_date ON public.student_attendance USING btree (attendance_date);
CREATE INDEX IF NOT EXISTS idx_student_attendance_school_id ON public.student_attendance USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_school_student_date ON public.student_attendance USING btree (school_id, student_id, attendance_date);
CREATE INDEX IF NOT EXISTS idx_student_attendance_student_id ON public.student_attendance USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_student_attendance_teacher_id ON public.student_attendance USING btree (teacher_id);
CREATE INDEX IF NOT EXISTS idx_student_balances_school_id ON public.student_balances USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_student_balances_school_owing ON public.student_balances USING btree (school_id, student_id) WHERE (balance > (0)::numeric);
CREATE INDEX IF NOT EXISTS idx_student_balances_school_student ON public.student_balances USING btree (school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_student_balances_school_term ON public.student_balances USING btree (school_id, term_id);
CREATE INDEX IF NOT EXISTS idx_student_balances_student_id ON public.student_balances USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_student_balances_student_school ON public.student_balances USING btree (student_id, school_id);
CREATE INDEX IF NOT EXISTS idx_student_balances_term_id ON public.student_balances USING btree (term_id);
CREATE INDEX IF NOT EXISTS idx_student_discounts_created_by ON public.student_discounts USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_student_discounts_school ON public.student_discounts USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_student_discounts_student_term ON public.student_discounts USING btree (student_id, term_id);
CREATE INDEX IF NOT EXISTS idx_student_discounts_term_id ON public.student_discounts USING btree (term_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_school_id ON public.student_fees USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_student_id ON public.student_fees USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_term_id ON public.student_fees USING btree (term_id);
CREATE INDEX IF NOT EXISTS idx_student_fees_term_year ON public.student_fees USING btree (year, term);
CREATE INDEX IF NOT EXISTS idx_student_grievances_school ON public.student_grievances USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_student_grievances_status ON public.student_grievances USING btree (status);
CREATE INDEX IF NOT EXISTS idx_student_import_batches_created_by ON public.student_import_batches USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_student_import_batches_school_created ON public.student_import_batches USING btree (school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_student_invoices_created_by ON public.student_invoices USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_student_invoices_school_student ON public.student_invoices USING btree (school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_student_invoices_school_term ON public.student_invoices USING btree (school_id, term_id);
CREATE INDEX IF NOT EXISTS idx_student_invoices_student ON public.student_invoices USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_student_invoices_term_id ON public.student_invoices USING btree (term_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_student_invoices_main_per_term ON public.student_invoices USING btree (school_id, student_id, term_id) WHERE ((is_supplementary = false) AND (status <> 'cancelled'::text));
CREATE INDEX IF NOT EXISTS idx_student_ledger_created ON public.student_ledger USING btree (created_at);
CREATE INDEX IF NOT EXISTS idx_student_ledger_school ON public.student_ledger USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_student_ledger_student ON public.student_ledger USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_student_ledger_term_id ON public.student_ledger USING btree (term_id);
CREATE INDEX IF NOT EXISTS idx_student_olevel_subjects_school_id ON public.student_olevel_subjects USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_student_olevel_subjects_school_student ON public.student_olevel_subjects USING btree (school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_student_olevel_subjects_student ON public.student_olevel_subjects USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_student_payments_invoice_id ON public.student_payments USING btree (invoice_id) WHERE (invoice_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_student_payments_receipt_number ON public.student_payments USING btree (school_id, receipt_number) WHERE (receipt_number IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_student_payments_recorded_by ON public.student_payments USING btree (recorded_by);
CREATE INDEX IF NOT EXISTS idx_student_payments_reversed ON public.student_payments USING btree (school_id, reversed_at) WHERE (reversed_at IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_student_payments_reversed_by ON public.student_payments USING btree (reversed_by);
CREATE INDEX IF NOT EXISTS idx_student_payments_school_date ON public.student_payments USING btree (school_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_student_payments_school_date_active ON public.student_payments USING btree (school_id, payment_date) WHERE (reversed_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_student_payments_school_id ON public.student_payments USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_student_payments_school_student ON public.student_payments USING btree (school_id, student_id);
CREATE INDEX IF NOT EXISTS idx_student_payments_student_id ON public.student_payments USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_student_payments_student_term ON public.student_payments USING btree (student_id, term_id) WHERE (term_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_student_payments_term_id ON public.student_payments USING btree (term_id);
CREATE INDEX IF NOT EXISTS idx_student_payments_transaction_ref ON public.student_payments USING btree (transaction_ref);
CREATE INDEX IF NOT EXISTS idx_student_photos_is_primary ON public.student_photos USING btree (is_primary);
CREATE INDEX IF NOT EXISTS idx_student_photos_school_id ON public.student_photos USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_student_photos_school_student_primary ON public.student_photos USING btree (school_id, student_id) WHERE (is_primary = true);
CREATE INDEX IF NOT EXISTS idx_student_photos_student_id ON public.student_photos USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_student_requirements_requirement_id ON public.student_requirements USING btree (requirement_id);
CREATE INDEX IF NOT EXISTS idx_student_requirements_school_id ON public.student_requirements USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_student_requirements_status ON public.student_requirements USING btree (status);
CREATE INDEX IF NOT EXISTS idx_student_requirements_student_id ON public.student_requirements USING btree (student_id);
CREATE INDEX IF NOT EXISTS student_stream_assignments_school_class ON public.student_stream_assignments USING btree (school_id, class_name);
CREATE INDEX IF NOT EXISTS idx_students_import_batch_id ON public.students USING btree (import_batch_id) WHERE (import_batch_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_students_school_class ON public.students USING btree (school_id, current_class) WHERE (status = 'active'::text);
CREATE INDEX IF NOT EXISTS idx_students_school_deleted_at ON public.students USING btree (school_id) WHERE (deleted_at IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_students_school_discipline_deactivated ON public.students USING btree (school_id) WHERE (discipline_deactivated_at IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_students_school_id ON public.students USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_students_school_status_created ON public.students USING btree (school_id, status, created_at);
CREATE INDEX IF NOT EXISTS idx_students_school_status_name ON public.students USING btree (school_id, status, name) WHERE (status = 'active'::text);
CREATE INDEX IF NOT EXISTS idx_students_school_suspension_open ON public.students USING btree (school_id) WHERE suspension_open;
CREATE UNIQUE INDEX IF NOT EXISTS students_admission_number_global_key ON public.students USING btree (lower(TRIM(BOTH FROM admission_number))) WHERE ((admission_number IS NOT NULL) AND (TRIM(BOTH FROM admission_number) <> ''::text));
CREATE UNIQUE INDEX IF NOT EXISTS uq_students_school_schoolpay_code ON public.students USING btree (school_id, lower(TRIM(BOTH FROM schoolpay_payment_code))) WHERE ((schoolpay_payment_code IS NOT NULL) AND (TRIM(BOTH FROM schoolpay_payment_code) <> ''::text));
CREATE INDEX IF NOT EXISTS idx_subjects_school_id ON public.subjects USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_school_date ON public.system_health_metrics USING btree (school_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_system_health_metrics_type_date ON public.system_health_metrics USING btree (metric_type, recorded_at);
CREATE INDEX IF NOT EXISTS idx_tal_school_date ON public.teacher_attendance_log USING btree (school_id, date);
CREATE INDEX IF NOT EXISTS idx_tal_teacher ON public.teacher_attendance_log USING btree (teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_logs_date ON public.teacher_attendance_logs USING btree (attendance_date);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_logs_school_id ON public.teacher_attendance_logs USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_attendance_logs_teacher_id ON public.teacher_attendance_logs USING btree (teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_class_subjects_school_id ON public.teacher_class_subjects USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_class_subjects_school_teacher ON public.teacher_class_subjects USING btree (school_id, teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_class_subjects_teacher_id ON public.teacher_class_subjects USING btree (teacher_id);
CREATE UNIQUE INDEX IF NOT EXISTS tcs_one_subject_teacher_per_class_subject_uq ON public.teacher_class_subjects USING btree (school_id, class_name, subject) WHERE (assignment_role = 'subject_teacher'::text);
CREATE UNIQUE INDEX IF NOT EXISTS teacher_class_subjects_school_teacher_class_subject_uq ON public.teacher_class_subjects USING btree (school_id, teacher_id, class_name, subject);
CREATE INDEX IF NOT EXISTS idx_teacher_comment_rules_school_id ON public.teacher_comment_rules USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_documents_teacher_school ON public.teacher_documents USING btree (teacher_id, school_id, doc_kind, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_documents_uploaded_by ON public.teacher_documents USING btree (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_teacher_exam_class_prefs_scope ON public.teacher_exam_class_prefs USING btree (school_id, class_name);
CREATE INDEX IF NOT EXISTS idx_teacher_exam_grade_bands_scope ON public.teacher_exam_grade_bands USING btree (school_id, class_name, subject, scale_kind);
CREATE INDEX IF NOT EXISTS teacher_phone_change_requests_new_phone_idx ON public.teacher_phone_change_requests USING btree (new_phone, created_at DESC);
CREATE INDEX IF NOT EXISTS teacher_phone_change_requests_teacher_idx ON public.teacher_phone_change_requests USING btree (teacher_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_teacher_remarks_settings_school_id ON public.teacher_remarks_settings USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_teacher_remarks_settings_subject ON public.teacher_remarks_settings USING btree (subject);
CREATE UNIQUE INDEX IF NOT EXISTS idx_trs_holistic_skill_grade ON public.teacher_remarks_settings USING btree (school_id, subject, skill_key, holistic_grade_enum) WHERE (holistic_grade_enum IS NOT NULL);
CREATE UNIQUE INDEX IF NOT EXISTS idx_trs_percent_band ON public.teacher_remarks_settings USING btree (school_id, subject, min_percent, max_percent) WHERE (holistic_grade_enum IS NULL);
CREATE INDEX IF NOT EXISTS idx_teachers_employee_id ON public.teachers USING btree (employee_id);
CREATE INDEX IF NOT EXISTS idx_teachers_school_employee ON public.teachers USING btree (school_id, employee_id);
CREATE INDEX IF NOT EXISTS idx_teachers_school_id ON public.teachers USING btree (school_id);
CREATE UNIQUE INDEX IF NOT EXISTS teachers_school_employee_id_key ON public.teachers USING btree (school_id, employee_id) WHERE ((employee_id IS NOT NULL) AND (btrim(employee_id) <> ''::text));
CREATE INDEX IF NOT EXISTS idx_term_closures_school_id ON public.term_closures USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_term_closures_term_key ON public.term_closures USING btree (year, term);
CREATE INDEX IF NOT EXISTS idx_termly_projects_class_name ON public.termly_projects USING btree (class_name);
CREATE INDEX IF NOT EXISTS idx_termly_projects_school_id ON public.termly_projects USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_termly_projects_student_id ON public.termly_projects USING btree (student_id);
CREATE INDEX IF NOT EXISTS idx_timetable_fixed_periods_school ON public.timetable_fixed_periods USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_timetable_periods_school_id ON public.timetable_periods USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_timetable_periods_teacher_id ON public.timetable_periods USING btree (teacher_id);
CREATE INDEX IF NOT EXISTS idx_timetables_day ON public.timetables USING btree (day_of_week);
CREATE INDEX IF NOT EXISTS idx_timetables_school ON public.timetables USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_timetables_teacher ON public.timetables USING btree (teacher_id);
CREATE INDEX IF NOT EXISTS idx_uace_subject_catalog_category ON public.uace_subject_catalog USING btree (category);
CREATE INDEX IF NOT EXISTS idx_uace_subject_catalog_type ON public.uace_subject_catalog USING btree (subject_type);
CREATE INDEX IF NOT EXISTS idx_uce_subject_catalog_category ON public.uce_subject_catalog USING btree (category);
CREATE INDEX IF NOT EXISTS idx_in_app_notif_school_created ON public.user_in_app_notifications USING btree (school_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_in_app_notif_user_unread ON public.user_in_app_notifications USING btree (user_id, read_at) WHERE (read_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_user_school_permissions_granted_by ON public.user_school_permissions USING btree (granted_by);
CREATE INDEX IF NOT EXISTS idx_user_school_permissions_school ON public.user_school_permissions USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_user_school_permissions_user ON public.user_school_permissions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_users_department ON public.users USING btree (department) WHERE (department IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_users_email_trgm ON public.users USING gin (email gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_employee_id ON public.users USING btree (employee_id) WHERE (employee_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_users_extra_roles ON public.users USING gin (extra_roles);
CREATE INDEX IF NOT EXISTS idx_users_name_trgm ON public.users USING gin (name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users USING btree (phone) WHERE (phone IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_users_role_school_created ON public.users USING btree (role, school_id, created_at);
CREATE INDEX IF NOT EXISTS idx_users_school_created ON public.users USING btree (school_id, created_at);
CREATE INDEX IF NOT EXISTS idx_users_school_id ON public.users USING btree (school_id);
CREATE INDEX IF NOT EXISTS idx_users_school_role ON public.users USING btree (school_id, role);
CREATE INDEX IF NOT EXISTS idx_users_student_id ON public.users USING btree (student_id);
CREATE INDEX IF NOT EXISTS users_email_lower_idx ON public.users USING btree (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS users_one_portal_per_teacher_uq ON public.users USING btree (linked_teacher_id) WHERE (linked_teacher_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_visitor_log_school ON public.visitor_log USING btree (school_id, check_in_time DESC);
CREATE INDEX IF NOT EXISTS whatsapp_bot_sessions_updated_at_idx ON public.whatsapp_bot_sessions USING btree (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_writeoff_log_approved ON public.writeoff_log USING btree (approved_at);
CREATE INDEX IF NOT EXISTS idx_writeoff_log_approved_by ON public.writeoff_log USING btree (approved_by);
CREATE INDEX IF NOT EXISTS idx_writeoff_log_invoice ON public.writeoff_log USING btree (invoice_id);

-- ----------------------------------------------------------------------------
-- 6. FUNCTIONS & STORED PROCEDURES (338)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION _private.current_user_can_access_accounting()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_role text;
  v_school uuid;
  v_uid uuid := (SELECT auth.uid());
BEGIN
  v_school := _private.current_user_school_id();
  IF v_school IS NULL THEN RETURN FALSE; END IF;
  v_role := lower(regexp_replace(trim(COALESCE(_private.current_user_role(), '')), '\s+', '_', 'g'));
  IF v_role = 'accountant' THEN RETURN TRUE; END IF;
  RETURN EXISTS(
    SELECT 1 FROM public.user_school_permissions p
    WHERE p.user_id=v_uid AND p.school_id=v_school AND p.permission_key='accounting.full'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION _private.current_user_can_edit_student_uace_subjects()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_role text;
  v_school uuid;
  v_uid uuid := (SELECT auth.uid());
BEGIN
  IF v_uid IS NULL THEN RETURN FALSE; END IF;
  v_school := _private.current_user_school_id();
  IF v_school IS NULL THEN RETURN FALSE; END IF;
  v_role := lower(regexp_replace(trim(COALESCE(_private.current_user_role(), '')), '\s+', '_', 'g'));
  IF v_role = 'accountant' THEN RETURN FALSE; END IF;
  IF v_role IN ('admin','owner','head_teacher') THEN RETURN TRUE; END IF;
  RETURN EXISTS(
    SELECT 1 FROM public.user_school_permissions p
    WHERE p.user_id=v_uid AND p.school_id=v_school AND p.permission_key='students.manage'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION _private.current_user_can_manage_discipline()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_role text;
  v_school uuid;
  v_uid uuid := (SELECT auth.uid());
BEGIN
  v_school := _private.current_user_school_id();
  IF v_school IS NULL THEN RETURN FALSE; END IF;
  v_role := lower(regexp_replace(trim(COALESCE(_private.current_user_role(), '')), '\s+', '_', 'g'));
  IF v_role IN ('admin','owner','head_teacher') THEN RETURN TRUE; END IF;
  RETURN EXISTS(
    SELECT 1 FROM public.user_school_permissions p
    WHERE p.user_id=v_uid AND p.school_id=v_school AND p.permission_key='discipline.manage'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION _private.current_user_can_manage_students()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_role text;
  v_school uuid;
  v_uid uuid := (SELECT auth.uid());
BEGIN
  v_school := _private.current_user_school_id();
  IF v_school IS NULL THEN RETURN FALSE; END IF;
  v_role := lower(regexp_replace(trim(COALESCE(_private.current_user_role(), '')), '\s+', '_', 'g'));
  IF v_role IN ('admin','owner','head_teacher','accountant') THEN RETURN TRUE; END IF;
  RETURN EXISTS(
    SELECT 1 FROM public.user_school_permissions p
    WHERE p.user_id=v_uid AND p.school_id=v_school AND p.permission_key='students.manage'
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION _private.current_user_role()
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_school uuid;
  v_role text;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;
  v_school := _private.current_user_school_id();
  IF v_school IS NULL THEN RETURN NULL; END IF;
  SELECT role INTO v_role FROM public.users
    WHERE user_id = v_uid AND school_id = v_school AND is_active = true;
  IF v_role IS NOT NULL THEN RETURN v_role; END IF;
  SELECT role INTO v_role FROM public.user_school_memberships
    WHERE user_id = v_uid AND school_id = v_school AND is_active = true;
  RETURN v_role;
END;
$function$
;

CREATE OR REPLACE FUNCTION _private.current_user_school_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_uid uuid := (SELECT auth.uid());
  v_school_id uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;

  SELECT uas.school_id INTO v_school_id
  FROM public.user_active_schools uas
  WHERE uas.user_id = v_uid
  AND (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.user_id = v_uid AND u.school_id = uas.school_id AND u.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM public.user_school_memberships usm
      WHERE usm.user_id = v_uid AND usm.school_id = uas.school_id AND usm.is_active = true
    )
  );

  IF v_school_id IS NOT NULL THEN RETURN v_school_id; END IF;

  SELECT u.school_id INTO v_school_id
  FROM public.users u
  WHERE u.user_id = v_uid AND u.is_active = true
  LIMIT 1;

  RETURN v_school_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION private.caller_school_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT school_id FROM users WHERE user_id = (SELECT auth.uid()) LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION private.school_chat_finalize_voice(p_message_id uuid, p_relative_path text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_me uuid := auth.uid();
  v_school uuid;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT school_id INTO v_school
  FROM public.school_chat_messages
  WHERE id = p_message_id AND sender_id = v_me AND msg_kind = 'voice';
  IF v_school IS NULL THEN RAISE EXCEPTION 'message not found or not yours'; END IF;
  IF p_relative_path NOT IN (
    v_school::text || '/' || p_message_id::text || '.webm',
    v_school::text || '/' || p_message_id::text || '.m4a',
    v_school::text || '/' || p_message_id::text || '.mp4'
  ) THEN
    RAISE EXCEPTION 'invalid storage path';
  END IF;
  UPDATE public.school_chat_messages m
  SET audio_path = p_relative_path
  WHERE m.id = p_message_id
    AND m.sender_id = v_me
    AND m.msg_kind = 'voice';
END;
$function$
;

CREATE OR REPLACE FUNCTION private.school_chat_get_or_create_dm(p_other_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_me uuid := auth.uid();
  v_school uuid;
  v_cid uuid;
  v_key text;
BEGIN
  IF v_me IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF NOT public.school_chat_pair_allowed(v_me, p_other_user_id) THEN RAISE EXCEPTION 'not allowed'; END IF;
  SELECT school_id INTO v_school FROM public.users WHERE user_id = v_me LIMIT 1;
  IF v_school IS NULL THEN RAISE EXCEPTION 'no school'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE user_id = p_other_user_id AND school_id = v_school) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  v_key := CASE
    WHEN v_me::text < p_other_user_id::text THEN v_me::text || ':' || p_other_user_id::text
    ELSE p_other_user_id::text || ':' || v_me::text
  END;
  INSERT INTO public.school_chat_conversations (school_id, dm_key)
  VALUES (v_school, v_key)
  ON CONFLICT (school_id, dm_key) DO NOTHING;
  SELECT c.id INTO v_cid
  FROM public.school_chat_conversations c
  WHERE c.school_id = v_school AND c.dm_key = v_key
  LIMIT 1;
  INSERT INTO public.school_chat_participants (conversation_id, user_id, school_id)
  VALUES (v_cid, v_me, v_school), (v_cid, p_other_user_id, v_school)
  ON CONFLICT DO NOTHING;
  RETURN v_cid;
END;
$function$
;

CREATE OR REPLACE FUNCTION private.school_chat_messages_guard_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
  IF auth.uid() IS NOT NULL AND (
    NEW.conversation_id IS DISTINCT FROM OLD.conversation_id OR
    NEW.sender_id       IS DISTINCT FROM OLD.sender_id       OR
    NEW.body            IS DISTINCT FROM OLD.body            OR
    NEW.created_at      IS DISTINCT FROM OLD.created_at      OR
    NEW.msg_kind        IS DISTINCT FROM OLD.msg_kind        OR
    NEW.school_id       IS DISTINCT FROM OLD.school_id       OR
    (NEW.audio_path IS DISTINCT FROM OLD.audio_path
      AND NOT (OLD.audio_path IS NULL AND auth.uid() = OLD.sender_id)) OR
    (NEW.audio_duration_sec IS DISTINCT FROM OLD.audio_duration_sec
      AND NOT (OLD.audio_duration_sec IS NULL AND auth.uid() = OLD.sender_id))
  ) THEN
    RAISE EXCEPTION 'Only delivered_at may be updated on school_chat_messages';
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION private.school_chat_user_is_participant(p_conversation_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.school_chat_participants p
    WHERE p.conversation_id = p_conversation_id
      AND p.user_id = p_user_id
  );
$function$
;

CREATE OR REPLACE FUNCTION private.user_can_manage_school(school_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.user_id = auth.uid()
      AND u.school_id = school_uuid
      AND lower(trim(u.role)) = ANY(ARRAY['admin','owner','head_teacher','secretary'])
  )
  OR EXISTS (
    SELECT 1 FROM public.schools s
    WHERE s.school_id = school_uuid
      AND s.admin_id = auth.uid()
  );
$function$
;

CREATE OR REPLACE FUNCTION public._class_name_is_alevel(p_class text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT trim(both ' ' FROM coalesce(p_class, '')) ~* '^(senior\s*[56]|s\.?\s*[56])(\s|$)';
$function$
;

CREATE OR REPLACE FUNCTION public._class_name_is_senior_secondary(p_class text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT trim(both ' ' FROM coalesce(p_class, '')) ~* '^(senior\s*[1-6]|s\.?\s*[1-6])(\s|$)';
$function$
;

CREATE OR REPLACE FUNCTION public._uace_exam_paper_key_matches_config(p_exam_paper_key text, p_paper_slot integer, p_cfg_code text, p_cfg_label text)
 RETURNS boolean
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_exam_paper_key IS NULL OR trim(both ' ' FROM p_exam_paper_key) = '' THEN false
    ELSE lower(trim(both ' ' FROM p_exam_paper_key)) IN (
      SELECT v
      FROM unnest(
        ARRAY[
          CASE            WHEN p_cfg_code IS NOT NULL AND trim(both ' ' FROM p_cfg_code) <> ''
            THEN lower(trim(both ' ' FROM p_cfg_code))
          END,
          CASE
            WHEN p_cfg_label IS NOT NULL AND trim(both ' ' FROM p_cfg_label) <> ''
            THEN lower(trim(both ' ' FROM p_cfg_label))
          END,
          trim(both ' ' FROM p_paper_slot::text),
          lower('paper ' || p_paper_slot::text),
          lower('paper' || p_paper_slot::text)
        ]
      ) AS u(v)
      WHERE v IS NOT NULL AND trim(both ' ' FROM v) <> ''
    )
  END;
$function$
;

CREATE OR REPLACE FUNCTION public._uace_subject_paper_config(p_school_id uuid, p_subject text, p_class_name text)
 RETURNS TABLE(paper_slot integer, weight_percent numeric, paper_code text, paper_label text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH candidates AS (
    SELECT
      p.paper_slot,
      p.weight_percent,
      p.paper_code,
      p.paper_label,
      CASE trim(both ' ' FROM p.class_name)
        WHEN 'A-Level' THEN 0
        WHEN 'Senior 5' THEN 1
        WHEN 'Senior 6' THEN 2
        ELSE 3
      END AS rank
    FROM public.school_uace_class_subject_papers p
    WHERE p.school_id = p_school_id
      AND p.subject_name = trim(both ' ' FROM coalesce(p_subject, ''))
      AND trim(both ' ' FROM p.class_name) IN (
        'A-Level',
        'Senior 5',
        'Senior 6',
        trim(both ' ' FROM coalesce(p_class_name, ''))
      )
  ),
  dedup AS (
    SELECT DISTINCT ON (candidates.paper_slot)
      candidates.paper_slot,
      candidates.weight_percent,
      candidates.paper_code,
      candidates.paper_label
    FROM candidates
    ORDER BY candidates.paper_slot, candidates.rank ASC
  )
  SELECT *
  FROM dedup
  ORDER BY paper_slot;
$function$
;

CREATE OR REPLACE FUNCTION public.add_default_teacher_remarks_for_subject()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.teacher_remarks_settings trs
    WHERE trs.school_id = NEW.school_id 
    AND trs.subject = NEW.subject
  ) THEN
    INSERT INTO public.teacher_remarks_settings (school_id, subject, min_percent, max_percent, comment_text, created_by)
    VALUES 
      (NEW.school_id, NEW.subject, 0, 40, 'Needs more effort. Try harder next time.', NULL),
      (NEW.school_id, NEW.subject, 41, 60, 'Fair work. You can do better.', NULL),
      (NEW.school_id, NEW.subject, 61, 80, 'Good work. Keep it up!', NULL),
      (NEW.school_id, NEW.subject, 81, 100, 'Excellent! Keep shining!', NULL);
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_add_discipline_action(p_student_id uuid, p_action_type text, p_notes text, p_suspension_start date DEFAULT NULL::date, p_suspension_end date DEFAULT NULL::date)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_school UUID;
  v_student_school UUID;
  v_action TEXT;
  v_rid UUID;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT public.current_user_can_manage_discipline() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  v_action := lower(trim(p_action_type));
  IF p_notes IS NULL OR trim(p_notes) = '' THEN
    RAISE EXCEPTION 'notes required';
  END IF;

  SELECT u.school_id INTO v_school FROM public.users u WHERE u.user_id = v_uid LIMIT 1;
  SELECT s.school_id INTO v_student_school FROM public.students s WHERE s.student_id = p_student_id LIMIT 1;
  IF v_student_school IS NULL THEN
    RAISE EXCEPTION 'student not found';
  END IF;
  IF v_student_school IS DISTINCT FROM v_school THEN
    RAISE EXCEPTION 'student not in your school';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.student_id = p_student_id AND s.deleted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'student is archived';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.students s
    WHERE s.student_id = p_student_id AND s.discipline_deactivated_at IS NOT NULL
  ) AND v_action IN ('warning', 'suspension', 'lift_suspension') THEN
    RAISE EXCEPTION 'student is deactivated';
  END IF;

  IF v_action = 'suspension' THEN
    IF p_suspension_start IS NULL OR p_suspension_end IS NULL THEN
      RAISE EXCEPTION 'suspension requires start and end dates';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.student_id = p_student_id AND COALESCE(s.suspension_open, false)
    ) THEN
      RAISE EXCEPTION 'student already has an open suspension; lift it first';
    END IF;
  ELSIF v_action = 'lift_suspension' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.student_id = p_student_id AND COALESCE(s.suspension_open, false)
    ) THEN
      RAISE EXCEPTION 'no open suspension to lift';
    END IF;
  ELSIF v_action NOT IN ('warning', 'deactivation', 'deletion') THEN
    RAISE EXCEPTION 'invalid action_type';
  END IF;

  INSERT INTO public.discipline_records (
    school_id,
    student_id,
    recorded_by,
    notes,
    action_type,
    suspension_start_date,
    suspension_end_date
  )
  VALUES (
    v_student_school,
    p_student_id,
    v_uid,
    trim(p_notes),
    v_action,
    CASE WHEN v_action = 'suspension' THEN p_suspension_start ELSE NULL END,
    CASE WHEN v_action = 'suspension' THEN p_suspension_end ELSE NULL END
  )
  RETURNING record_id INTO v_rid;

  IF v_action = 'warning' THEN
    UPDATE public.students
    SET suspension_period_start = NULL,
        suspension_period_end = NULL
    WHERE student_id = p_student_id;
  ELSIF v_action = 'suspension' THEN
    UPDATE public.students
    SET
      suspension_open = true,
      suspension_period_start = p_suspension_start,
      suspension_period_end = p_suspension_end
    WHERE student_id = p_student_id;
  ELSIF v_action = 'lift_suspension' THEN
    UPDATE public.students
    SET
      suspension_open = false,
      suspension_period_start = NULL,
      suspension_period_end = NULL
    WHERE student_id = p_student_id;
  ELSIF v_action = 'deactivation' THEN
    UPDATE public.students
    SET
      discipline_deactivated_at = NOW(),
      suspension_open = false,
      suspension_period_start = NULL,
      suspension_period_end = NULL
    WHERE student_id = p_student_id;
  ELSIF v_action = 'deletion' THEN
    IF EXISTS (
      SELECT 1 FROM public.students s WHERE s.student_id = p_student_id AND s.deleted_at IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'student already archived';
    END IF;
    UPDATE public.students
    SET
      deleted_at = NOW(),
      suspension_open = false,
      suspension_period_start = NULL,
      suspension_period_end = NULL
    WHERE student_id = p_student_id;
  END IF;

  RETURN v_rid;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.admin_list_students_discipline_filtered(p_filter text)
 RETURNS SETOF students
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_school UUID;
  v_f TEXT;
BEGIN
  IF NOT public.current_user_can_manage_discipline() THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  SELECT u.school_id INTO v_school FROM public.users u WHERE u.user_id = (SELECT auth.uid()) LIMIT 1;
  IF v_school IS NULL THEN
    RETURN;
  END IF;

  v_f := lower(trim(COALESCE(p_filter, 'all')));

  RETURN QUERY
  SELECT s.*
  FROM public.students s
  WHERE s.school_id = v_school
    AND (
      v_f IN ('all', '')
      OR (
        v_f = 'active'
        AND s.deleted_at IS NULL
        AND s.discipline_deactivated_at IS NULL
        AND NOT COALESCE(s.suspension_open, false)
        AND NOT EXISTS (
          SELECT 1
          FROM public.discipline_records dr
          WHERE dr.student_id = s.student_id
            AND dr.action_type = 'warning'
        )
      )
      OR (
        v_f = 'warned'
        AND s.deleted_at IS NULL
        AND s.discipline_deactivated_at IS NULL
        AND NOT COALESCE(s.suspension_open, false)
        AND EXISTS (
          SELECT 1
          FROM public.discipline_records dr
          WHERE dr.student_id = s.student_id
            AND dr.action_type = 'warning'
        )
      )
      OR (
        v_f = 'suspended'
        AND s.deleted_at IS NULL
        AND s.discipline_deactivated_at IS NULL
        AND COALESCE(s.suspension_open, false)
      )
      OR (
        v_f = 'deactivated'
        AND s.deleted_at IS NULL
        AND s.discipline_deactivated_at IS NOT NULL
      )
      OR (
        v_f = 'deleted'
        AND s.deleted_at IS NOT NULL
      )
    )
  ORDER BY s.created_at DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.apply_carryover_balance_to_term_invoice(p_school_id uuid, p_student_id uuid, p_term_id uuid, p_carryover_amount numeric, p_base_term_fee numeric DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION
    'apply_carryover_balance_to_term_invoice is deprecated. On Invoices & Billing use “Additional charge” on the current term (creates a labelled supplementary invoice).';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.apply_student_guardian_mirror_from_parents(p_student_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_name text;
  v_phone text;
  v_email text;
  v_rel text;
BEGIN
  SELECT p.name, p.phone, p.email, p.relationship
  INTO v_name, v_phone, v_email, v_rel
  FROM public.parents p
  WHERE p.student_id = p_student_id
  ORDER BY
    CASE WHEN COALESCE(p.is_primary_contact, true) THEN 0 ELSE 1 END,
    p.parent_id
  LIMIT 1;

  IF NOT FOUND THEN
    UPDATE public.students
    SET
      guardian_name = NULL,
      guardian_phone = NULL,
      guardian_email = NULL,
      guardian_relationship = NULL
    WHERE student_id = p_student_id;
    RETURN;
  END IF;

  UPDATE public.students
  SET
    guardian_name = v_name,
    guardian_phone = v_phone,
    guardian_email = v_email,
    guardian_relationship = COALESCE(NULLIF(trim(v_rel), ''), 'Guardian')
  WHERE student_id = p_student_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.assign_requirements_to_student(p_student_id uuid, p_school_id uuid, p_class_name text, p_boarding_type text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Insert requirements for this student based on their class and boarding type
    INSERT INTO student_requirements (
        student_id, 
        school_id, 
        requirement_id, 
        requirement_name, 
        cost, 
        status, 
        created_at, 
        updated_at
    )
    SELECT 
        p_student_id,
        p_school_id,
        sr.id,
        sr.requirement_name,
        sr.cost,
        'Pending',
        NOW(),
        NOW()
    FROM school_requirements sr
    WHERE sr.school_id = p_school_id
    AND sr.status = 'Active'
    AND (
        sr.class_name IS NULL OR sr.class_name = 'All Classes' OR sr.class_name = p_class_name
    )
    AND (
        sr.boarding_type = p_boarding_type OR 
        sr.boarding_type = 'Both' OR
        (sr.boarding_type = 'Day Scholar' AND p_boarding_type = 'Day Scholar')
    )
    ON CONFLICT (student_id, requirement_id) DO NOTHING;
    
    RAISE NOTICE 'Successfully assigned requirements to student %', p_student_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_calculate_student_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.balance := COALESCE(NEW.total_fees, 0) - COALESCE(NEW.total_paid, 0);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_create_balance_for_new_student()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_current_term_id UUID;
    v_year INTEGER;
    v_term INTEGER;
BEGIN
    SELECT st.id, st.year, st.term
      INTO v_current_term_id, v_year, v_term
      FROM public.school_terms st
     WHERE st.school_id = NEW.school_id
       AND (st.end_date IS NULL OR st.end_date >= CURRENT_DATE)
     ORDER BY st.year DESC, st.term DESC
     LIMIT 1;

    IF v_current_term_id IS NULL THEN
        SELECT st.id, st.year, st.term
          INTO v_current_term_id, v_year, v_term
          FROM public.school_terms st
         WHERE st.school_id = NEW.school_id
         ORDER BY st.year DESC, st.term DESC
         LIMIT 1;
    END IF;

    IF v_current_term_id IS NOT NULL AND NEW.status = 'active' THEN
        INSERT INTO public.student_balances (
            student_id, school_id, term_id, year, term, total_fees, total_paid
        )
        VALUES (
            NEW.student_id, NEW.school_id, v_current_term_id, v_year, v_term,
            0,  -- always 0; only sync_balance_on_invoice_activation sets total_fees > 0
            0
        )
        ON CONFLICT (student_id, term_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_generate_admission_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only generate if admission_number is null or empty
  IF NEW.admission_number IS NULL OR TRIM(NEW.admission_number) = '' THEN
    NEW.admission_number := generate_admission_number(
      NEW.school_id,
      COALESCE(NEW.first_name, ''),
      COALESCE(NEW.middle_name, ''),
      COALESCE(NEW.last_name, ''),
      COALESCE(NEW.admission_date, CURRENT_DATE)
    );
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_initialize_balances_on_new_term()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
BEGIN
    -- Automatically initialize balances for all active students when a new term is created
    PERFORM public.initialize_student_balances_for_term(NEW.school_id, NEW.id);
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_initialize_student_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_term_id UUID;
  v_year INT;
  v_term_num INT;
  v_class_fees NUMERIC(12, 2);
  v_today DATE := CURRENT_DATE;
  v_inv_num TEXT;
BEGIN
  v_term_id := public.resolve_current_school_term_id(NEW.school_id, v_today);

  IF v_term_id IS NOT NULL THEN
    SELECT st.year, st.term
    INTO v_year, v_term_num
    FROM public.school_terms st
    WHERE st.id = v_term_id;
  END IF;

  IF v_term_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.class_id IS NOT NULL THEN
    SELECT c.total_fees INTO v_class_fees
    FROM public.classes c
    WHERE c.class_id = NEW.class_id;
  END IF;

  v_class_fees := COALESCE(v_class_fees, NEW.expected_fee_amount, 0);

  IF v_class_fees > 0 THEN
    IF NOT EXISTS (
      SELECT 1
      FROM public.student_invoices si
      WHERE si.school_id = NEW.school_id
        AND si.student_id = NEW.student_id
        AND si.term_id = v_term_id
    ) THEN
      v_inv_num := public.get_next_invoice_number(NEW.school_id);
      INSERT INTO public.student_invoices (
        school_id,
        student_id,
        term_id,
        invoice_number,
        total_amount,
        amount_paid,
        status,
        created_by,
        updated_at
      )
      VALUES (
        NEW.school_id,
        NEW.student_id,
        v_term_id,
        v_inv_num,
        v_class_fees,
        0,
        'issued',
        NULL,
        NOW()
      );
    END IF;
  ELSE
    INSERT INTO public.student_balances (
      student_id,
      school_id,
      term_id,
      year,
      term,
      total_fees,
      total_paid,
      updated_at
    )
    VALUES (
      NEW.student_id,
      NEW.school_id,
      v_term_id,
      COALESCE(v_year, EXTRACT(YEAR FROM v_today)::INT),
      COALESCE(v_term_num, 1),
      0,
      0,
      NOW()
    )
    ON CONFLICT (student_id, term_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_populate_processed_on_exam_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_year integer;
  v_term integer;
  v_student_name text;
  v_admission text;
  v_class text;
  v_pc text;
  v_pn text;
  v_class_for_guard text;
  v_marks numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_class_for_guard := OLD.class_name;
    IF NOT public._class_name_is_senior_secondary(v_class_for_guard) THEN
      RETURN OLD;
    END IF;
    DELETE FROM public.processed_secondary_exam_results ps
    WHERE ps.school_id = OLD.school_id
      AND ps.student_id = OLD.student_id
      AND ps.exam_set_id = OLD.exam_set_id
      AND ps.subject = OLD.subject
      AND ps.proc_topic_key = OLD.exam_topic_key
      AND ps.proc_paper_key = OLD.exam_paper_key;
    RETURN OLD;
  END IF;

  v_class_for_guard := NEW.class_name;
  IF NOT public._class_name_is_senior_secondary(v_class_for_guard) THEN
    RETURN NEW;
  END IF;

  SELECT es.year, es.term
  INTO v_year, v_term
  FROM public.exam_sets es
  WHERE es.id = NEW.exam_set_id
  LIMIT 1;

  SELECT
    COALESCE(NULLIF(BTRIM(COALESCE(s.name, '')), ''), ''),
    s.admission_number,
    COALESCE(NULLIF(BTRIM(COALESCE(s.current_class, '')), ''), NEW.class_name)
  INTO v_student_name, v_admission, v_class
  FROM public.students s
  WHERE s.student_id = NEW.student_id
  LIMIT 1;

  v_pc := NULLIF(BTRIM(COALESCE(NEW.paper_code, '')), '');
  v_pn := NULLIF(BTRIM(COALESCE(NEW.paper_number, '')), '');

  v_marks := COALESCE(NEW.final_score, NEW.marks_obtained, 0);

  INSERT INTO public.processed_secondary_exam_results (
    school_id,
    student_id,
    exam_set_id,
    student_name,
    admission_number,
    class_name,
    year,
    term,
    subject,
    marks_obtained,
    total_marks,
    grade,
    teacher_remark,
    teacher_initials,
    topic,
    paper_code,
    paper_number
  )
  VALUES (
    NEW.school_id,
    NEW.student_id,
    NEW.exam_set_id,
    COALESCE(v_student_name, ''),
    v_admission,
    COALESCE(v_class, NEW.class_name),
    COALESCE(v_year, 0),
    COALESCE(v_term, 0),
    NEW.subject,
    v_marks,
    COALESCE(NEW.total_marks, 100),
    NEW.grade,
    COALESCE(
      NULLIF(BTRIM(COALESCE(NEW.remarks, '')), ''),
      NULLIF(BTRIM(COALESCE(NEW.overall_remark, '')), ''),
      ''
    ),
    NEW.teacher_initials,
    NEW.topic,
    v_pc,
    v_pn
  )
  ON CONFLICT (
    school_id,
    student_id,
    exam_set_id,
    subject,
    proc_topic_key,
    proc_paper_key
  )
  DO UPDATE SET
    student_name = EXCLUDED.student_name,
    admission_number = EXCLUDED.admission_number,
    class_name = EXCLUDED.class_name,
    year = EXCLUDED.year,
    term = EXCLUDED.term,
    marks_obtained = EXCLUDED.marks_obtained,
    total_marks = EXCLUDED.total_marks,
    grade = EXCLUDED.grade,
    teacher_remark = EXCLUDED.teacher_remark,
    teacher_initials = EXCLUDED.teacher_initials,
    topic = EXCLUDED.topic,
    paper_code = EXCLUDED.paper_code,
    paper_number = EXCLUDED.paper_number,
    updated_at = now();

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_populate_processed_results(p_school_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  exam_result RECORD;
  processed_data RECORD;
BEGIN
  -- Process all exam results for the school
  FOR exam_result IN 
    SELECT 
      er.*,
      s.name as student_name,
      s.current_class,
      es.name as exam_set_name,
      es.year,
      es.term
    FROM public.exam_results er
    JOIN public.students s ON s.student_id = er.student_id
    JOIN public.exam_sets es ON es.id = er.exam_set_id
    WHERE er.school_id = p_school_id
  LOOP
    -- Insert or update processed results
    INSERT INTO public.processed_primary_exam_results (
      school_id, student_id, exam_set_id, year, term, exam_set_name,
      student_name, class_name, admission_number, subject, marks_obtained,
      total_marks, grade, teacher_remark, teacher_initials,
      class_teacher_comment, headteacher_comment, processed_at
    )
    VALUES (
      exam_result.school_id, exam_result.student_id, exam_result.exam_set_id,
      exam_result.year, exam_result.term::TEXT, exam_result.exam_set_name,
      exam_result.student_name, exam_result.current_class, 'N/A',
      exam_result.subject, exam_result.marks_obtained, exam_result.total_marks,
      exam_result.grade, exam_result.remarks, exam_result.teacher_initials,
      '', '', NOW()
    )
    ON CONFLICT (school_id, student_id, exam_set_id, subject)
    DO UPDATE SET
      marks_obtained = EXCLUDED.marks_obtained,
      total_marks = EXCLUDED.total_marks,
      grade = EXCLUDED.grade,
      teacher_remark = EXCLUDED.teacher_remark,
      teacher_initials = EXCLUDED.teacher_initials,
      processed_at = NOW();
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_process_exam_results()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  affected_student_id UUID;
  affected_exam_set_id UUID;
  affected_school_id UUID;
  affected_class_name TEXT;
  student_id_val UUID;
BEGIN
  -- Handle INSERT and UPDATE
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    affected_student_id := NEW.student_id;
    affected_exam_set_id := NEW.exam_set_id;
    affected_school_id := NEW.school_id;
    affected_class_name := NEW.class_name;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    affected_student_id := OLD.student_id;
    affected_exam_set_id := OLD.exam_set_id;
    affected_school_id := OLD.school_id;
    affected_class_name := OLD.class_name;
    
    -- Delete processed results for this student and exam set
    DELETE FROM processed_primary_exam_results
    WHERE school_id = affected_school_id
      AND student_id = affected_student_id
      AND exam_set_id = affected_exam_set_id;
    
    -- After delete, ensure all students still have all subjects
    PERFORM ensure_all_students_have_all_subjects(
      affected_school_id,
      affected_exam_set_id,
      affected_class_name
    );
    
    -- Recalculate aggregate and division for all students in the class after delete
    FOR student_id_val IN
      SELECT student_id
      FROM students
      WHERE school_id = affected_school_id
        AND current_class = affected_class_name
        AND status = 'active'
    LOOP
      PERFORM calculate_aggregate_and_division(
        affected_school_id,
        student_id_val,
        affected_exam_set_id
      );
    END LOOP;
    
    RETURN OLD;
  END IF;
  
  -- Process results for the affected student
  PERFORM process_exam_results_for_student(
    affected_school_id,
    affected_student_id,
    affected_exam_set_id
  );
  
  -- After processing, ensure all students in the class have all subjects for THIS exam set
  -- This creates MISSED entries for students who don't have results for subjects that other students have
  IF affected_class_name IS NOT NULL AND affected_exam_set_id IS NOT NULL THEN
    BEGIN
      PERFORM ensure_all_students_have_all_subjects(
        affected_school_id,
        affected_exam_set_id,
        affected_class_name
      );
      
      -- After ensuring all students have all subjects, calculate aggregate and division for all students
      FOR student_id_val IN
        SELECT student_id
        FROM students
        WHERE school_id = affected_school_id
          AND current_class = affected_class_name
          AND status = 'active'
      LOOP
        PERFORM calculate_aggregate_and_division(
          affected_school_id,
          student_id_val,
          affected_exam_set_id
        );
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      -- Log error but don't fail the transaction
      RAISE WARNING 'Error ensuring all students have all subjects for class % exam_set %: %', 
        affected_class_name, affected_exam_set_id, SQLERRM;
    END;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_process_primary_exam_results()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_class_name TEXT;
  v_is_primary BOOLEAN;
  v_is_nursery BOOLEAN;
BEGIN
  -- Get class name
  IF TG_OP = 'DELETE' THEN
    v_class_name := OLD.class_name;
  ELSE
    v_class_name := NEW.class_name;
  END IF;
  
  -- Check if it's a primary or nursery class
  v_is_primary := v_class_name ~* '^(primary|p\.?)\s*[1-7]$';
  v_is_nursery := LOWER(TRIM(v_class_name)) IN ('baby class', 'middle class', 'top class');
  
  -- Only process primary and nursery classes
  IF NOT (v_is_primary OR v_is_nursery) THEN
    IF TG_OP = 'DELETE' THEN
      RETURN OLD;
    ELSE
      RETURN NEW;
    END IF;
  END IF;
  
  -- Handle DELETE
  IF TG_OP = 'DELETE' THEN
    DELETE FROM processed_primary_exam_results
    WHERE school_id = OLD.school_id
      AND student_id = OLD.student_id
      AND exam_set_id = OLD.exam_set_id
      AND subject = OLD.subject;
    RETURN OLD;
  END IF;
  
  -- Handle INSERT and UPDATE
  -- Process the exam results for this student
  PERFORM process_exam_results_for_student(
    NEW.school_id,
    NEW.student_id,
    NEW.exam_set_id
  );
  
  -- Calculate aggregate and division (only for primary classes)
  IF v_is_primary THEN
    PERFORM calculate_aggregate_and_division(
      NEW.school_id,
      NEW.student_id,
      NEW.exam_set_id
    );
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_setup_school_settings()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  BEGIN
    PERFORM public.setup_default_teacher_remarks_settings(NEW.school_id, NEW.admin_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'auto_setup: teacher_remarks failed for school %: %', NEW.school_id, SQLERRM;
  END;
  BEGIN
    PERFORM public.setup_default_class_teacher_comments_settings(NEW.school_id, NEW.admin_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'auto_setup: class_teacher_comments failed for school %: %', NEW.school_id, SQLERRM;
  END;
  BEGIN
    PERFORM public.setup_default_class_teacher_nursery_comments(NEW.school_id);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'auto_setup: class_teacher_nursery_comments failed for school %: %', NEW.school_id, SQLERRM;
  END;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_update_class_comments_on_settings_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  school_id_var UUID;
  class_name_var TEXT;
BEGIN
  -- Get the school_id and class_name from the changed record
  IF TG_OP = 'DELETE' THEN
    school_id_var := OLD.school_id;
    class_name_var := OLD.class_name;
  ELSE
    school_id_var := NEW.school_id;
    class_name_var := NEW.class_name;
  END IF;
  
  -- Refresh class teacher comments for this school and class
  PERFORM public.refresh_class_teacher_comments(school_id_var);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.auto_update_exam_results_remarks()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  calculated_percentage NUMERIC;
  auto_remark TEXT;
  teacher_name TEXT;
  generated_initials TEXT;
BEGIN
  -- Calculate percentage
  calculated_percentage := (NEW.marks_obtained / NEW.total_marks) * 100;
  
  -- Get auto-generated remark from teacher_remarks_settings
  auto_remark := public.get_teacher_remark_by_percentage(
    NEW.school_id,
    NEW.subject,
    calculated_percentage
  );
  
  -- Auto-generate teacher initials if not set
  IF NEW.teacher_initials IS NULL OR NEW.teacher_initials = '' THEN
    -- Get teacher name from teachers table - convert teacher_id to UUID for comparison
    SELECT t.name INTO teacher_name
    FROM public.teachers t
    WHERE t.teacher_id::TEXT = NEW.teacher_id
    LIMIT 1;
    
    IF teacher_name IS NOT NULL THEN
      generated_initials := public.generate_teacher_initials(teacher_name);
      NEW.teacher_initials := generated_initials;
    ELSE
      NEW.teacher_initials := 'T.C'; -- Default fallback
    END IF;
  END IF;
  
  -- Only update if there's no existing remark (preserve manual remarks)
  -- OR if the marks have changed significantly (update auto-generated remarks)
  IF NEW.remarks IS NULL OR NEW.remarks = '' OR NEW.remarks = auto_remark THEN
    NEW.remarks := auto_remark;
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.automatic_term3_rollover()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_year INTEGER;
  v_previous_year INTEGER;
  v_any_missing BOOLEAN;
BEGIN
  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
  v_previous_year := v_current_year - 1;

  SELECT EXISTS (
    SELECT 1 FROM public.schools s
    WHERE NOT EXISTS (
      SELECT 1 FROM public.rollover_status rs
      WHERE rs.school_id = s.school_id AND rs.academic_year = v_previous_year
    )
  ) INTO v_any_missing;

  IF NOT v_any_missing THEN
    RETURN;
  END IF;

  PERFORM public.promote_and_graduate_students();

  INSERT INTO public.rollover_status (school_id, academic_year, students_promoted, students_graduated)
  SELECT s.school_id, v_previous_year, 0, 0
  FROM public.schools s
  ON CONFLICT (school_id, academic_year) DO NOTHING;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.backfill_missed_entries_for_class(p_school_id uuid, p_class_name text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  exam_set_record RECORD;
BEGIN
  -- Get all exam sets for this school that have results for this class
  FOR exam_set_record IN
    SELECT DISTINCT es.id, es.name, es.term, es.year
    FROM exam_sets es
    WHERE es.school_id = p_school_id
      AND EXISTS (
        -- Only process exam sets that have results for this class
        SELECT 1
        FROM exam_results er
        WHERE er.school_id = p_school_id
          AND er.exam_set_id = es.id
          AND er.class_name = p_class_name
      )
  LOOP
    -- Ensure all students have all subjects for this exam set
    PERFORM ensure_all_students_have_all_subjects(
      p_school_id,
      exam_set_record.id,
      p_class_name
    );
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.backfill_missing_subject_entries()
 RETURNS TABLE(processed_count integer)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  class_record RECORD;
  processed INTEGER := 0;
BEGIN
  -- Process each unique class/exam_set combination
  FOR class_record IN
    SELECT DISTINCT school_id, exam_set_id, class_name
    FROM processed_primary_exam_results
    WHERE grade != 'MISSED'  -- Only process classes that have actual results
  LOOP
    BEGIN
      PERFORM ensure_all_students_have_all_subjects(
        class_record.school_id,
        class_record.exam_set_id,
        class_record.class_name
      );
      processed := processed + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error processing class % exam_set %: %', 
        class_record.class_name, class_record.exam_set_id, SQLERRM;
    END;
  END LOOP;
  
  RETURN QUERY SELECT processed;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_aggregate_and_division(p_school_id uuid, p_student_id uuid, p_exam_set_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_aggregate integer;
  v_division text;
  v_class_name text;
BEGIN
  SELECT COALESCE(MAX(pr.class_name), MAX(er.class_name), MAX(s.current_class))
  INTO v_class_name
  FROM public.students s
  LEFT JOIN public.processed_primary_exam_results pr
    ON pr.school_id = p_school_id
   AND pr.student_id = p_student_id
   AND pr.exam_set_id = p_exam_set_id
  LEFT JOIN public.exam_results er
    ON er.school_id = p_school_id
   AND er.student_id = p_student_id
   AND er.exam_set_id = p_exam_set_id
  WHERE s.school_id = p_school_id
    AND s.student_id = p_student_id;

  IF lower(trim(COALESCE(v_class_name,''))) ~ '^primary [1-7]$' THEN
    v_aggregate := public.calculate_primary_aggregate(p_school_id, p_student_id, p_exam_set_id);
    v_division := public.calculate_primary_division(v_aggregate);
  ELSE
    v_aggregate := NULL;
    v_division := NULL;
  END IF;

  UPDATE public.processed_primary_exam_results
  SET aggregate = v_aggregate,
      division = v_division
  WHERE school_id = p_school_id
    AND student_id = p_student_id
    AND exam_set_id = p_exam_set_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_class_positions_for_all_classes(p_school_id uuid, p_exam_set_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  class_record record;
begin
  for class_record in
    select distinct class_name
    from public.processed_primary_exam_results
    where school_id = p_school_id
      and exam_set_id = p_exam_set_id
  loop
    perform public.calculate_class_positions_for_exam_set(
      p_school_id,
      p_exam_set_id,
      class_record.class_name
    );
  end loop;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_class_positions_for_exam_set(p_school_id uuid, p_exam_set_id uuid, p_class_name text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  -- Calculate and update class positions using window function
  -- DENSE_RANK ensures students with the same average get the same position
  -- Position 1 = best performance (highest average)
  WITH student_averages AS (
    SELECT 
      student_id,
      (SUM(marks_obtained) / NULLIF(SUM(total_marks), 0)) * 100 as average
    FROM processed_primary_exam_results
    WHERE school_id = p_school_id
      AND exam_set_id = p_exam_set_id
      AND class_name = p_class_name
      AND grade != 'MISSED' -- Only count actual results, not MISSED entries
    GROUP BY student_id
  ),
  ranked_students AS (
    SELECT 
      student_id,
      DENSE_RANK() OVER (ORDER BY average DESC NULLS LAST) as position
    FROM student_averages
  )
  UPDATE processed_primary_exam_results ppr
  SET class_position = ranked_students.position
  FROM ranked_students
  WHERE ppr.school_id = p_school_id
    AND ppr.exam_set_id = p_exam_set_id
    AND ppr.class_name = p_class_name
    AND ppr.student_id = ranked_students.student_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_nursery_old_format_grade(p_percentage numeric)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF p_percentage IS NULL THEN
    RETURN NULL;
  ELSIF p_percentage >= 90 THEN
    RETURN 'D1';
  ELSIF p_percentage >= 80 THEN
    RETURN 'D2';
  ELSIF p_percentage >= 70 THEN
    RETURN 'C3';
  ELSIF p_percentage >= 60 THEN
    RETURN 'C4';
  ELSIF p_percentage >= 50 THEN
    RETURN 'C5';
  ELSIF p_percentage >= 40 THEN
    RETURN 'C6';
  ELSIF p_percentage >= 30 THEN
    RETURN 'P7';
  ELSIF p_percentage >= 20 THEN
    RETURN 'P8';
  ELSE
    RETURN 'F9';
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_primary_aggregate(p_school_id uuid, p_student_id uuid, p_exam_set_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_class_name text;
  v_is_primary boolean;
  v_english integer := 9;
  v_math integer := 9;
  v_science integer := 9;
  v_sst integer := 9;
BEGIN
  SELECT COALESCE(MAX(pr.class_name), MAX(er.class_name), MAX(s.current_class))
  INTO v_class_name
  FROM public.students s
  LEFT JOIN public.processed_primary_exam_results pr
    ON pr.school_id = p_school_id
   AND pr.student_id = p_student_id
   AND pr.exam_set_id = p_exam_set_id
  LEFT JOIN public.exam_results er
    ON er.school_id = p_school_id
   AND er.student_id = p_student_id
   AND er.exam_set_id = p_exam_set_id
  WHERE s.school_id = p_school_id
    AND s.student_id = p_student_id;

  v_is_primary := lower(trim(COALESCE(v_class_name,''))) ~ '^primary [1-7]$';
  IF NOT v_is_primary THEN
    RETURN NULL;
  END IF;

  WITH merged AS (
    SELECT pr.subject, pr.grade, pr.marks_obtained, pr.total_marks, pr.processed_at, 1 AS src
    FROM public.processed_primary_exam_results pr
    WHERE pr.school_id = p_school_id
      AND pr.student_id = p_student_id
      AND pr.exam_set_id = p_exam_set_id

    UNION ALL

    SELECT er.subject, er.grade, er.marks_obtained, er.total_marks, COALESCE(er.updated_at, er.created_at, now()) AS processed_at, 2 AS src
    FROM public.exam_results er
    WHERE er.school_id = p_school_id
      AND er.student_id = p_student_id
      AND er.exam_set_id = p_exam_set_id
  ), normalized AS (
    SELECT
      CASE
        WHEN lower(trim(subject)) ~ '(^english$|english language)' THEN 'ENGLISH'
        WHEN lower(trim(subject)) ~ '(^mathematics$|^math$|^maths$)' THEN 'MATH'
        WHEN lower(trim(subject)) ~ '(^science$|integrated science|^literacy ii$|^literacy 2$)' THEN 'SCIENCE'
        WHEN lower(trim(subject)) ~ '(^social studies$|^sst$|social studies \(s\.?s\.?t\)?|social studies \(sst\)|^literacy i$|^literacy 1$)' THEN 'SST'
        ELSE NULL
      END AS core_subject,
      grade,
      marks_obtained,
      total_marks,
      processed_at,
      src
    FROM merged
  ), ranked AS (
    SELECT n.*, ROW_NUMBER() OVER (PARTITION BY n.core_subject ORDER BY n.src ASC, n.processed_at DESC NULLS LAST) AS rn
    FROM normalized n
    WHERE n.core_subject IS NOT NULL
  ), chosen AS (
    SELECT
      core_subject,
      COALESCE(
        NULLIF((regexp_match(COALESCE(grade,''), '(\d+)'))[1], '')::integer,
        public.primary_grade_from_percentage(
          CASE
            WHEN total_marks IS NULL OR total_marks = 0 OR marks_obtained IS NULL THEN NULL
            ELSE (marks_obtained / total_marks) * 100
          END
        )
      ) AS resolved_grade
    FROM ranked
    WHERE rn = 1
  )
  SELECT
    COALESCE(MAX(CASE WHEN core_subject='ENGLISH' THEN resolved_grade END), 9),
    COALESCE(MAX(CASE WHEN core_subject='MATH' THEN resolved_grade END), 9),
    COALESCE(MAX(CASE WHEN core_subject='SCIENCE' THEN resolved_grade END), 9),
    COALESCE(MAX(CASE WHEN core_subject='SST' THEN resolved_grade END), 9)
  INTO v_english, v_math, v_science, v_sst
  FROM chosen;

  RETURN v_english + v_math + v_science + v_sst;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_primary_division(p_aggregate integer)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT CASE
    WHEN p_aggregate IS NULL THEN NULL
    WHEN p_aggregate <= 12 THEN 'Division 1'
    WHEN p_aggregate <= 23 THEN 'Division 2'
    WHEN p_aggregate <= 29 THEN 'Division 3'
    WHEN p_aggregate <= 34 THEN 'Division 4'
    ELSE 'U (Ungraded)'
  END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_primary_grade_from_marks(p_marks_obtained numeric, p_total_marks numeric)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  percentage NUMERIC;
BEGIN
  IF p_total_marks IS NULL OR p_total_marks = 0 THEN
    RETURN 'F9';
  END IF;
  
  percentage := (p_marks_obtained / p_total_marks) * 100;
  
  -- Primary school grading scale (SHORT FORMAT):
  -- D1: 75-100, D2: 70-74, C3: 65-69, C4: 60-64, C5: 55-59, C6: 50-54, P7: 45-49, P8: 40-44, F9: 0-39
  RETURN CASE
    WHEN percentage >= 75 AND percentage <= 100 THEN 'D1'
    WHEN percentage >= 70 AND percentage <= 74 THEN 'D2'
    WHEN percentage >= 65 AND percentage <= 69 THEN 'C3'
    WHEN percentage >= 60 AND percentage <= 64 THEN 'C4'
    WHEN percentage >= 55 AND percentage <= 59 THEN 'C5'
    WHEN percentage >= 50 AND percentage <= 54 THEN 'C6'
    WHEN percentage >= 45 AND percentage <= 49 THEN 'P7'
    WHEN percentage >= 40 AND percentage <= 44 THEN 'P8'
    WHEN percentage >= 0 AND percentage <= 39 THEN 'F9'
    ELSE 'F9'
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_primary_grade_from_marks(p_marks_obtained numeric, p_total_marks numeric, p_school_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  percentage NUMERIC;
  found_grade TEXT;
BEGIN
  IF p_total_marks IS NULL OR p_total_marks <= 0 THEN
    RETURN 'F9';
  END IF;

  percentage := (p_marks_obtained / p_total_marks) * 100;

  -- 1) Try school-specific grading first
  SELECT gs.grade_code
    INTO found_grade
  FROM public.grading_scale gs
  WHERE gs.school_id = p_school_id
    AND percentage >= gs.min_pct
    AND percentage <= gs.max_pct
  ORDER BY gs.max_pct DESC
  LIMIT 1;

  IF found_grade IS NOT NULL THEN
    RETURN found_grade;
  END IF;

  -- 2) Fall back to default grading (school_id IS NULL)
  SELECT gs.grade_code
    INTO found_grade
  FROM public.grading_scale gs
  WHERE gs.school_id IS NULL
    AND percentage >= gs.min_pct
    AND percentage <= gs.max_pct
  ORDER BY gs.max_pct DESC
  LIMIT 1;

  RETURN COALESCE(found_grade, 'F9');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_student_balance(p_student_id uuid, p_term_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    total_fees NUMERIC := 0;
    total_paid NUMERIC := 0;
    balance NUMERIC := 0;
BEGIN
    -- Get total fees for the term
    SELECT COALESCE(SUM(fee_amount), 0) INTO total_fees
    FROM student_fees
    WHERE student_id = p_student_id AND term_id = p_term_id;
    
    -- Get total payments for the term
    SELECT COALESCE(SUM(amount), 0) INTO total_paid
    FROM student_payments
    WHERE student_id = p_student_id;
    
    -- Calculate balance
    balance := total_fees - total_paid;
    
    RETURN balance;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.calculate_student_requirements_total(p_student_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_total DECIMAL(10,2) := 0;
BEGIN
    SELECT COALESCE(SUM(cost), 0)
    INTO v_total
    FROM student_requirements
    WHERE student_id = p_student_id
    AND status = 'Pending';
    
    RETURN v_total;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cast_guild_ballot(p_election_id uuid, p_student_id uuid, p_school_id uuid, p_candidate_ids uuid[])
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_election RECORD;
    v_already_voted BOOLEAN;
    v_candidate_id UUID;
BEGIN
    -- 1. Validate Election Status & Time Window
    SELECT * INTO v_election
    FROM elections
    WHERE id = p_election_id AND school_id = p_school_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Election not found for this institution.';
    END IF;

    IF v_election.status <> 'ACTIVE' THEN
        RAISE EXCEPTION 'This election is not currently open for voting.';
    END IF;

    IF CURRENT_TIMESTAMP < v_election.voting_starts_at THEN
        RAISE EXCEPTION 'Voting has not yet started for this election.';
    END IF;

    IF CURRENT_TIMESTAMP > v_election.voting_ends_at THEN
        RAISE EXCEPTION 'Voting has concluded for this election.';
    END IF;

    -- 2. Verify Single Vote Constraint
    SELECT EXISTS (
        SELECT 1 FROM election_voter_logs
        WHERE election_id = p_election_id AND student_id = p_student_id
    ) INTO v_already_voted;

    IF v_already_voted THEN
        RAISE EXCEPTION 'You have already cast your ballot in this election. Duplicate votes are prevented.';
    END IF;

    -- 3. Record participation in voter registry (Voter is registered, but ballot choice is NOT stored with identity)
    INSERT INTO election_voter_logs (school_id, election_id, student_id, has_voted, voted_at)
    VALUES (p_school_id, p_election_id, p_student_id, true, CURRENT_TIMESTAMP);

    -- 4. Atomically increment candidate vote counters in complete separation
    IF p_candidate_ids IS NOT NULL AND array_length(p_candidate_ids, 1) > 0 THEN
        FOREACH v_candidate_id IN ARRAY p_candidate_ids
        LOOP
            UPDATE election_candidates
            SET vote_count = COALESCE(vote_count, 0) + 1
            WHERE id = v_candidate_id AND election_id = p_election_id AND school_id = p_school_id;
        END LOOP;
    END IF;

    RETURN json_build_object(
        'success', true,
        'message', 'Ballot verified and cast successfully with zero-knowledge anonymity.',
        'voted_at', CURRENT_TIMESTAMP
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.certify_election_and_handover(p_election_id uuid, p_certified_by uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_election RECORD;
    v_candidate RECORD;
    v_academic_year VARCHAR(20);
    v_winners_count INT := 0;
BEGIN
    SELECT * INTO v_election
    FROM elections
    WHERE id = p_election_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Election not found.';
    END IF;

    IF v_election.status = 'CERTIFIED' THEN
        RAISE EXCEPTION 'This election has already been certified.';
    END IF;

    v_academic_year := v_election.academic_year;

    -- Reset previous winners for this election
    UPDATE election_candidates
    SET is_winner = false
    WHERE election_id = p_election_id;

    -- Mark top candidate per portfolio as winner
    FOR v_candidate IN
        WITH ranked_candidates AS (
            SELECT 
                id,
                portfolio_id,
                student_id,
                school_id,
                vote_count,
                ROW_NUMBER() OVER (PARTITION BY portfolio_id ORDER BY vote_count DESC, created_at ASC) as rank
            FROM election_candidates
            WHERE election_id = p_election_id
        )
        SELECT * FROM ranked_candidates WHERE rank = 1
    LOOP
        UPDATE election_candidates
        SET is_winner = true
        WHERE id = v_candidate.id;

        -- Expire any previous active tenure for this portfolio
        UPDATE guild_tenures
        SET status = 'EXPIRED'
        WHERE school_id = v_candidate.school_id
          AND portfolio_id = v_candidate.portfolio_id
          AND status = 'ACTIVE';

        -- Provision new active tenure for winner
        INSERT INTO guild_tenures (
            school_id,
            student_id,
            portfolio_id,
            academic_year,
            term_start,
            term_end,
            status
        ) VALUES (
            v_candidate.school_id,
            v_candidate.student_id,
            v_candidate.portfolio_id,
            v_academic_year,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP + interval '1 year',
            'ACTIVE'
        );

        v_winners_count := v_winners_count + 1;
    END LOOP;

    -- Mark election as CERTIFIED
    UPDATE elections
    SET status = 'CERTIFIED',
        certified_by = p_certified_by,
        certified_at = CURRENT_TIMESTAMP
    WHERE id = p_election_id;

    RETURN json_build_object(
        'success', true,
        'winners_count', v_winners_count,
        'certified_at', CURRENT_TIMESTAMP
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_and_expire_guild_tenures(p_school_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_count INT := 0;
BEGIN
    UPDATE guild_tenures
    SET status = 'EXPIRED'
    WHERE status = 'ACTIVE'
      AND term_end < CURRENT_TIMESTAMP
      AND (p_school_id IS NULL OR school_id = p_school_id);

    GET DIAGNOSTICS v_count = ROW_COUNT;

    RETURN json_build_object(
        'success', true,
        'expired_count', v_count,
        'checked_at', CURRENT_TIMESTAMP
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.check_rollover_status_api(p_school_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    status_record RECORD;
    result JSON;
BEGIN
    -- Get rollover status
    SELECT * INTO status_record
    FROM public.get_rollover_status(p_school_id);
    
    -- Build result JSON
    result := json_build_object(
        'rollover_completed', status_record.rollover_completed,
        'rollover_date', status_record.rollover_date,
        'students_graduated', status_record.students_graduated,
        'students_promoted', status_record.students_promoted,
        'academic_year', status_record.academic_year,
        'can_run_rollover', status_record.can_run_rollover,
        'term3_ended', status_record.term3_ended,
        'message', CASE 
            WHEN status_record.rollover_completed THEN 
                'Term 3 rollover completed on ' || status_record.rollover_date::DATE
            WHEN status_record.term3_ended THEN 
                'Term 3 has ended. Rollover will run automatically or can be triggered manually.'
            ELSE 
                'Term 3 has not ended yet. Rollover cannot run.'
        END
    );
    
    RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.class_subjects_protect_uace_subsidiaries()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cascading_school text;
  is_uace_sub boolean;
BEGIN
  v_cascading_school := NULLIF(trim(current_setting('app.cascade_deleting_school_id', true)), '');

  IF TG_OP = 'DELETE' THEN
    IF v_cascading_school IS NOT NULL AND v_cascading_school = OLD.school_id::text THEN
      RETURN OLD;
    END IF;

    IF COALESCE(OLD.is_non_removable_default, false)
       AND OLD.uce_offering_type = 'compulsory'
       AND TRIM(OLD.class_name) ~* '^(senior\s*[1-4]|s\.?\s*[1-4])(\s|$)' THEN
      RAISE EXCEPTION
        'Default UCE compulsory subjects cannot be removed for Senior 1–4 (subject: %, class: %).',
        TRIM(OLD.subject), TRIM(OLD.class_name)
        USING ERRCODE = 'check_violation';
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.uace_subject_catalog u
      WHERE u.subject_type = 'subsidiary'
        AND u.subject_name = TRIM(OLD.subject)
    ) INTO is_uace_sub;
    IF TRIM(OLD.class_name) IN ('Senior 5', 'Senior 6') AND is_uace_sub THEN
      RAISE EXCEPTION
        'UACE subsidiary subjects cannot be removed for class % (subject: %). Principals can still be removed.',
        TRIM(OLD.class_name), TRIM(OLD.subject)
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;

  ELSIF TG_OP = 'UPDATE' THEN
    IF COALESCE(OLD.is_non_removable_default, false)
       AND OLD.uce_offering_type = 'compulsory'
       AND TRIM(OLD.class_name) ~* '^(senior\s*[1-4]|s\.?\s*[1-4])(\s|$)' THEN
      IF TRIM(NEW.class_name) IS DISTINCT FROM TRIM(OLD.class_name)
         OR TRIM(NEW.subject) IS DISTINCT FROM TRIM(OLD.subject)
         OR NEW.uce_offering_type IS DISTINCT FROM OLD.uce_offering_type
         OR NEW.is_non_removable_default IS DISTINCT FROM OLD.is_non_removable_default THEN
        RAISE EXCEPTION
          'Default UCE compulsory rows cannot be renamed, moved, or retyped for Senior 1–4.';
      END IF;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM public.uace_subject_catalog u
      WHERE u.subject_type = 'subsidiary'
        AND u.subject_name = TRIM(OLD.subject)
    ) INTO is_uace_sub;
    IF TRIM(OLD.class_name) IN ('Senior 5', 'Senior 6') AND is_uace_sub THEN
      IF TRIM(NEW.class_name) IS DISTINCT FROM TRIM(OLD.class_name)
         OR TRIM(NEW.subject) IS DISTINCT FROM TRIM(OLD.subject) THEN
        RAISE EXCEPTION
          'UACE subsidiary subjects cannot be renamed or moved for Senior 5–6 (was: % / %).',
          TRIM(OLD.class_name), TRIM(OLD.subject)
          USING ERRCODE = 'check_violation';
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.cleanup_nursery_processed_shadow()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
begin
  if lower(coalesce(new.class_name, '')) similar to '%(baby class|middle class|top class|baby|middle|top|nursery|pre-primary)%' then
    delete from public.processed_primary_exam_results pr
    where pr.school_id = new.school_id
      and pr.exam_set_id = new.exam_set_id
      and pr.student_id = new.student_id
      and pr.class_name = new.class_name
      and pr.subject = new.subject;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.create_flexible_fee_structures(p_school_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_term_id UUID;
    v_current_year INTEGER;
    v_current_term INTEGER;
BEGIN
    -- Get current year and term
    v_current_year := EXTRACT(YEAR FROM NOW());
    v_current_term := 1; -- Default to term 1
    
    -- Get the current term ID (using correct column name 'id')
    SELECT id INTO v_term_id 
    FROM school_terms 
    WHERE school_id = p_school_id 
    AND year = v_current_year 
    AND term = v_current_term
    LIMIT 1;
    
    -- If no term exists, create one
    IF v_term_id IS NULL THEN
        v_term_id := gen_random_uuid();
        INSERT INTO school_terms (id, school_id, year, term, start_date, end_date, created_at)
        VALUES (v_term_id, p_school_id, v_current_year, v_current_term, CURRENT_DATE, CURRENT_DATE + INTERVAL '3 months', NOW());
    END IF;
    
    -- Create flexible fee structure entries with zero amounts for all classes
    -- This allows school admins to edit and set their own fees later
    
    -- Log the successful creation
    RAISE NOTICE 'Successfully created flexible fee structure template (zero amounts) for school %', p_school_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.current_school_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT u.school_id FROM public.users u WHERE u.user_id = (SELECT auth.uid()) LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.current_user_can_access_accounting()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
BEGIN
  RETURN _private.current_user_can_access_accounting();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.current_user_can_edit_student_uace_subjects()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
BEGIN
  RETURN _private.current_user_can_edit_student_uace_subjects();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.current_user_can_manage_discipline()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
BEGIN
  RETURN _private.current_user_can_manage_discipline();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.current_user_can_manage_students()
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
BEGIN
  RETURN _private.current_user_can_manage_students();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.current_user_can_school_expense_direct_approve(p_school_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id = p_school_id
        AND u.role IN ('admin', 'owner')
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_school_permissions p
      WHERE p.user_id = (SELECT auth.uid())
        AND p.school_id = p_school_id
        AND p.permission_key = 'accounting.expenses_direct_approve'
    );
$function$
;

CREATE OR REPLACE FUNCTION public.current_user_role()
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
BEGIN
  RETURN _private.current_user_role();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.current_user_school_id()
 RETURNS uuid
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
BEGIN
  RETURN _private.current_user_school_id();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.discipline_records_sync_legacy_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.incident_type := COALESCE(NEW.incident_type, NEW.action_type);
  NEW.incident_date := COALESCE(NEW.incident_date, NEW.created_at, NOW());
  NEW.description := COALESCE(NEW.description, NEW.notes);
  NEW.title := COALESCE(
    NEW.title,
    CASE NEW.action_type
      WHEN 'warning' THEN 'Discipline: Warning'
      WHEN 'suspension' THEN 'Discipline: Suspension'
      WHEN 'lift_suspension' THEN 'Discipline: Suspension ended'
      WHEN 'deactivation' THEN 'Discipline: Deactivation'
      WHEN 'deletion' THEN 'Discipline: Student archived'
      WHEN 'restoration' THEN 'Discipline: Student restored'
      ELSE 'Discipline'
    END
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_academic_year_exists(p_year integer)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM public.global_terms WHERE year = p_year LIMIT 1) THEN
    RETURN;
  END IF;

  INSERT INTO public.global_terms (year, term, term_name, window_start, window_end, hard_stop_date)
  VALUES
    (p_year, 1, 'T1', make_date(p_year, 1, 1),  make_date(p_year, 5, 14), make_date(p_year, 5, 14)),
    (p_year, 2, 'T2', make_date(p_year, 5, 15), make_date(p_year, 8, 21), make_date(p_year, 8, 21)),
    (p_year, 3, 'T3', make_date(p_year, 8, 22), make_date(p_year, 12, 31), make_date(p_year, 12, 31))
  ON CONFLICT (year, term) DO NOTHING;

  INSERT INTO public.system_actions (action, details)
  VALUES ('ensure_academic_year', jsonb_build_object('year', p_year));
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_all_students_have_all_subjects(p_school_id uuid, p_exam_set_id uuid, p_class_name text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_subject TEXT;
  v_student_id UUID;
  v_existing_count INTEGER;
BEGIN
  FOR v_subject IN
    SELECT DISTINCT er.subject
    FROM public.exam_results er
    WHERE er.school_id = p_school_id
      AND er.exam_set_id = p_exam_set_id
      AND er.class_name = p_class_name
  LOOP
    FOR v_student_id IN
      SELECT s.student_id
      FROM public.students s
      WHERE s.school_id = p_school_id
        AND s.current_class = p_class_name
        AND s.status = 'active'
    LOOP
      SELECT COUNT(*)
      INTO v_existing_count
      FROM public.exam_results er
      WHERE er.school_id = p_school_id
        AND er.exam_set_id = p_exam_set_id
        AND er.student_id = v_student_id
        AND er.class_name = p_class_name
        AND er.subject = v_subject;

      IF v_existing_count = 0 THEN
        INSERT INTO public.exam_results (
          school_id, exam_set_id, student_id, class_name, subject,
          marks_obtained, total_marks, grade, remarks
        )
        VALUES (
          p_school_id, p_exam_set_id, v_student_id, p_class_name, v_subject,
          0, 100, 'MISSED', 'MISSED'
        );
      END IF;
    END LOOP;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_class_id_for_publish(p_school_id uuid, p_class_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_normalized text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT public.published_reports_user_is_school_staff(p_school_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  v_normalized := trim(regexp_replace(coalesce(p_class_name, ''), '\s+', ' ', 'g'));
  IF v_normalized = '' THEN
    RAISE EXCEPTION 'class name required';
  END IF;

  SELECT c.class_id
  INTO v_id
  FROM public.classes c
  WHERE c.school_id = p_school_id
    AND c.class_name = v_normalized
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  SELECT c.class_id
  INTO v_id
  FROM public.classes c
  WHERE c.school_id = p_school_id
    AND lower(trim(regexp_replace(coalesce(c.class_name, ''), '\s+', ' ', 'g'))) = lower(v_normalized)
  LIMIT 1;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  BEGIN
    BEGIN
      INSERT INTO public.classes (school_id, class_name, max_students)
      VALUES (p_school_id, v_normalized, 1000)
      RETURNING class_id INTO v_id;
    EXCEPTION
      WHEN undefined_column THEN
        BEGIN
          INSERT INTO public.classes (school_id, class_name, total_fees)
          VALUES (p_school_id, v_normalized, 0)
          RETURNING class_id INTO v_id;
        EXCEPTION
          WHEN undefined_column THEN
            INSERT INTO public.classes (school_id, class_name)
            VALUES (p_school_id, v_normalized)
            RETURNING class_id INTO v_id;
        END;
    END;
    RETURN v_id;
  EXCEPTION
    WHEN unique_violation THEN
      SELECT c.class_id
      INTO v_id
      FROM public.classes c
      WHERE c.school_id = p_school_id
        AND lower(trim(regexp_replace(coalesce(c.class_name, ''), '\s+', ' ', 'g'))) = lower(v_normalized)
      LIMIT 1;
      IF v_id IS NULL THEN
        RAISE;
      END IF;
      RETURN v_id;
  END;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_student_general_paper_alevel(p_student_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_school uuid;
  v_gp text;
BEGIN
  SELECT school_id INTO v_school FROM public.students WHERE student_id = p_student_id;
  IF v_school IS NULL THEN
    RETURN;
  END IF;

  SELECT trim(c.subject_name)
    INTO v_gp
  FROM public.uace_subject_catalog c
  WHERE c.subject_type = 'subsidiary'
    AND lower(trim(c.subject_name)) = 'general paper'
  LIMIT 1;

  IF v_gp IS NULL THEN
    RETURN;
  END IF;

  INSERT INTO public.student_alevel_subjects (school_id, student_id, subject_name, subject_role)
  VALUES (v_school, p_student_id, v_gp, 'subsidiary')
  ON CONFLICT (student_id, subject_name) DO NOTHING;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ensure_subjects_for_one_student(p_school_id uuid, p_exam_set_id uuid, p_student_id uuid, p_class_name text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_subject TEXT;
  v_existing_count INTEGER;
BEGIN
  -- For each subject defined for this class in class_subjects table
  FOR v_subject IN
    SELECT DISTINCT cs.subject
    FROM public.class_subjects cs
    WHERE cs.school_id = p_school_id
      AND cs.class_name = p_class_name
  LOOP
    -- Check if this student already has this subject
    SELECT COUNT(*)
    INTO v_existing_count
    FROM public.exam_results er
    WHERE er.school_id = p_school_id
      AND er.exam_set_id = p_exam_set_id
      AND er.student_id = p_student_id
      AND er.subject = v_subject;

    -- If not, create an entry with NULL marks (shows as dash, counts as 0 in average)
    IF v_existing_count = 0 THEN
      INSERT INTO public.exam_results (
        school_id, exam_set_id, student_id, class_name, subject,
        marks_obtained, total_marks, grade, remarks
      )
      VALUES (
        p_school_id, p_exam_set_id, p_student_id, p_class_name, v_subject,
        NULL, NULL, NULL, NULL
      );
    END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.exam_results_for_secondary_report(p_school_id uuid, p_exam_set_ids uuid[], p_class_names text[] DEFAULT NULL::text[])
 RETURNS SETOF exam_results
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  r public.exam_results%ROWTYPE;
  j jsonb;
  agg_rec RECORD;
  v_uace_grade text;
BEGIN
  FOR r IN
    WITH base AS (
      SELECT er.*
      FROM public.exam_results er
      WHERE er.school_id = p_school_id
        AND er.exam_set_id = ANY (p_exam_set_ids)
        AND (
          p_class_names IS NULL
          OR cardinality(p_class_names) = 0
          OR er.class_name = ANY (p_class_names)
        )
    ),
    al_raw AS (
      SELECT b.*
      FROM base b
      WHERE public._class_name_is_alevel(b.class_name)
        AND b.exam_topic_key = ''
        AND b.exam_paper_key <> ''
    ),
    matched_all AS (
      SELECT
        b.*,
        cfg.paper_slot,
        cfg.weight_percent
      FROM al_raw b
      INNER JOIN LATERAL public._uace_subject_paper_config(b.school_id, b.subject, b.class_name) cfg ON TRUE
      WHERE public._uace_exam_paper_key_matches_config(
        b.exam_paper_key,
        cfg.paper_slot,
        cfg.paper_code,
        cfg.paper_label
      )
    ),
    matched_best AS (
      SELECT DISTINCT ON (ma.student_id, ma.exam_set_id, ma.class_name, ma.subject, ma.paper_slot)
        ma.*
      FROM matched_all ma
      ORDER BY
        ma.student_id,
        ma.exam_set_id,
        ma.class_name,
        ma.subject,
        ma.paper_slot,
        ma.updated_at DESC NULLS LAST
    ),
    merge_keys AS (
      SELECT DISTINCT
        mb.student_id,
        mb.exam_set_id,
        mb.class_name,
        mb.subject
      FROM matched_best mb
      WHERE (
        SELECT COUNT(*)::integer
        FROM public._uace_subject_paper_config(mb.school_id, mb.subject, mb.class_name)
      ) >= 2
    ),
    excluded AS (
      SELECT mb.id
      FROM matched_best mb
      INNER JOIN merge_keys k
        ON k.student_id = mb.student_id
        AND k.exam_set_id = mb.exam_set_id
        AND k.class_name = mb.class_name
        AND k.subject = mb.subject
    ),
    passthrough AS (
      SELECT b.*
      FROM base b
      WHERE NOT EXISTS (SELECT 1 FROM excluded e WHERE e.id = b.id)
    )
    SELECT * FROM passthrough
  LOOP
    RETURN NEXT r;
  END LOOP;

  FOR agg_rec IN
    WITH base AS (
      SELECT er.*
      FROM public.exam_results er
      WHERE er.school_id = p_school_id
        AND er.exam_set_id = ANY (p_exam_set_ids)
        AND (
          p_class_names IS NULL
          OR cardinality(p_class_names) = 0
          OR er.class_name = ANY (p_class_names)
        )
    ),
    al_raw AS (
      SELECT b.*
      FROM base b
      WHERE public._class_name_is_alevel(b.class_name)
        AND b.exam_topic_key = ''
        AND b.exam_paper_key <> ''
    ),
    matched_all AS (
      SELECT
        b.*,
        cfg.paper_slot,
        cfg.weight_percent
      FROM al_raw b
      INNER JOIN LATERAL public._uace_subject_paper_config(b.school_id, b.subject, b.class_name) cfg ON TRUE
      WHERE public._uace_exam_paper_key_matches_config(
        b.exam_paper_key,
        cfg.paper_slot,
        cfg.paper_code,
        cfg.paper_label
      )
    ),
    matched_best AS (
      SELECT DISTINCT ON (ma.student_id, ma.exam_set_id, ma.class_name, ma.subject, ma.paper_slot)
        ma.*
      FROM matched_all ma
      ORDER BY
        ma.student_id,
        ma.exam_set_id,
        ma.class_name,
        ma.subject,
        ma.paper_slot,
        ma.updated_at DESC NULLS LAST
    ),
    merge_keys AS (
      SELECT DISTINCT
        mb.student_id,
        mb.exam_set_id,
        mb.class_name,
        mb.subject
      FROM matched_best mb
      WHERE (
        SELECT COUNT(*)::integer
        FROM public._uace_subject_paper_config(mb.school_id, mb.subject, mb.class_name)
      ) >= 2
    ),
    scored AS (
      SELECT
        mb.*,
        SUM(mb.weight_percent) OVER (
          PARTITION BY mb.student_id, mb.exam_set_id, mb.class_name, mb.subject
        ) AS w_sum,
        LEAST(
          100::numeric,
          GREATEST(
            0::numeric,
            (COALESCE(mb.final_score, mb.marks_obtained, 0)::numeric / NULLIF(mb.total_marks, 0)) * 100
          )
        ) AS pct
      FROM matched_best mb
      INNER JOIN merge_keys k
        ON k.student_id = mb.student_id
        AND k.exam_set_id = mb.exam_set_id
        AND k.class_name = mb.class_name
        AND k.subject = mb.subject
      WHERE COALESCE(mb.weight_percent, 0) > 0
    ),
    agg AS (
      SELECT
        s.student_id,
        s.exam_set_id,
        s.class_name,
        s.subject,
        SUM((s.weight_percent / NULLIF(s.w_sum, 0)) * s.pct)::numeric AS final_pct,
        (array_agg(s.id ORDER BY s.updated_at DESC NULLS LAST))[1] AS pick_id,
        string_agg(
          NULLIF(trim(both ' ' FROM COALESCE(s.overall_remark, s.remarks, '')), ''),
          ' | '
          ORDER BY s.paper_slot
        ) FILTER (WHERE COALESCE(trim(both ' ' FROM COALESCE(s.overall_remark, s.remarks, '')), '') <> '') AS agg_remarks,
        string_agg(
          NULLIF(trim(both ' ' FROM COALESCE(s.overall_remark, '')), ''),
          ' | '
          ORDER BY s.paper_slot
        ) FILTER (WHERE COALESCE(trim(both ' ' FROM COALESCE(s.overall_remark, '')), '') <> '') AS agg_overall,
        string_agg(
          NULLIF(trim(both ' ' FROM COALESCE(s.teacher_comment, '')), ''),
          ' | '
          ORDER BY s.paper_slot
        ) FILTER (WHERE COALESCE(trim(both ' ' FROM COALESCE(s.teacher_comment, '')), '') <> '') AS agg_teacher_comment
      FROM scored s
      GROUP BY s.student_id, s.exam_set_id, s.class_name, s.subject
    )
    SELECT * FROM agg
  LOOP
    SELECT to_jsonb(e.*)
    INTO j
    FROM public.exam_results e
    WHERE e.id = agg_rec.pick_id;

    IF j IS NULL THEN
      CONTINUE;
    END IF;

    v_uace_grade := public.uace_grade_from_percent_for_class(p_school_id, agg_rec.class_name, agg_rec.final_pct);

    j :=
      j
      || jsonb_build_object(
        'marks_obtained',
        to_jsonb(round(agg_rec.final_pct, 2)::numeric),
        'total_marks',
        to_jsonb(100::numeric),
        'final_score',
        to_jsonb(round(agg_rec.final_pct, 2)::numeric),
        'grade',
        to_jsonb(v_uace_grade::text),
        'uace_points',
        to_jsonb(
          public.uace_default_points_from_grade(v_uace_grade)::integer
        ),
        'remarks',
        to_jsonb(coalesce(agg_rec.agg_remarks, j ->> 'remarks')::text),
        'overall_remark',
        to_jsonb(
          coalesce(
            nullif(trim(both ' ' FROM coalesce(agg_rec.agg_overall, '')), ''),
            nullif(trim(both ' ' FROM coalesce(agg_rec.agg_remarks, '')), ''),
            nullif(trim(both ' ' FROM coalesce(j ->> 'overall_remark', '')), ''),
            ''::text
          )
        ),
        'teacher_comment',
        to_jsonb(
          coalesce(
            nullif(trim(both ' ' FROM coalesce(agg_rec.agg_teacher_comment, '')), ''),
            nullif(trim(both ' ' FROM coalesce(j ->> 'teacher_comment', '')), ''),
            ''::text
          )
        ),
        'paper_code',
        'null'::jsonb,
        'paper_number',
        'null'::jsonb,
        'topic',
        'null'::jsonb,
        'exam_topic_key',
        to_jsonb(''::text),
        'exam_paper_key',
        to_jsonb(''::text),
        'activity_score',
        'null'::jsonb,
        'descriptor',
        'null'::jsonb,
        'formative_score',
        'null'::jsonb,
        'exam_score',
        'null'::jsonb
      );

    SELECT * INTO r FROM json_populate_record(NULL::public.exam_results, j::json);
    RETURN NEXT r;
  END LOOP;

  RETURN;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.exam_set_teacher_entry_guard_message(p_school_id uuid, p_exam_set_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_term_id uuid;
  v_cur_year integer;
  v_cur_term integer;
  r_es record;
BEGIN
  IF p_school_id IS NULL OR p_exam_set_id IS NULL THEN
    RETURN 'Missing school or exam set.';
  END IF;

  v_term_id := public.resolve_current_school_term_id(p_school_id, CURRENT_DATE);
  IF v_term_id IS NULL THEN
    RETURN 'Current school term is not configured. Ask an administrator to set up the school calendar before entering results.';
  END IF;

  SELECT st.year, st.term
  INTO v_cur_year, v_cur_term
  FROM public.school_terms st
  WHERE st.id = v_term_id
    AND st.school_id = p_school_id;

  IF v_cur_year IS NULL OR v_cur_term IS NULL THEN
    RETURN 'Current school term record is missing.';
  END IF;

  SELECT es.year, es.term, es.is_active, es.active_for_input
  INTO r_es
  FROM public.exam_sets es
  WHERE es.id = p_exam_set_id
    AND es.school_id = p_school_id;

  IF NOT FOUND THEN
    RETURN 'Exam set not found for this school.';
  END IF;

  IF NOT COALESCE(r_es.is_active, false) OR NOT COALESCE(r_es.active_for_input, false) THEN
    RETURN 'This exam set is not active for result entry.';
  END IF;

  -- Parentheses: avoid parser treating `... IS DISTINCT FROM v_cur_year OR ...` as SQL `FROM` + relation.
  IF (r_es.year IS DISTINCT FROM v_cur_year)
     OR (r_es.term IS DISTINCT FROM v_cur_term) THEN
    RETURN 'Results can only be entered for the current school term. This exam set belongs to another term.';
  END IF;

  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.exam_sets_open_for_teacher_entry(p_school_id uuid, p_today date DEFAULT CURRENT_DATE)
 RETURNS SETOF exam_sets
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT es.*
  FROM public.exam_sets es
  WHERE es.school_id = p_school_id
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id IS NOT NULL
        AND u.school_id = p_school_id
    )
    AND COALESCE(es.is_active, false)
    AND COALESCE(es.active_for_input, false)
    AND EXISTS (
      SELECT 1
      FROM public.school_terms st
      WHERE st.id = public.resolve_current_school_term_id(p_school_id, p_today)
        AND st.school_id = p_school_id
        AND st.year IS NOT DISTINCT FROM es.year
        AND st.term IS NOT DISTINCT FROM es.term
    );
$function$
;

CREATE OR REPLACE FUNCTION public.find_parents_by_phone_last9(p_last9 text)
 RETURNS TABLE(parent_id uuid, school_id uuid, student_id uuid, phone text, name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.parent_id, p.school_id, p.student_id, p.phone, p.name
  FROM public.parents p
  WHERE p.phone IS NOT NULL
    AND public.pweza_phone_last9(p.phone) = p_last9;
$function$
;

CREATE OR REPLACE FUNCTION public.find_staff_users_by_phone_last9(p_last9 text)
 RETURNS TABLE(user_id uuid, school_id uuid, role text, phone text, name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT u.user_id, u.school_id, u.role, u.phone, u.name
  FROM public.users u
  WHERE u.phone IS NOT NULL
    AND public.pweza_phone_last9(u.phone) = p_last9
    AND u.role IN ('admin', 'accountant', 'teacher', 'head_teacher', 'owner', 'librarian');
$function$
;

CREATE OR REPLACE FUNCTION public.find_teachers_by_phone_last9(p_last9 text)
 RETURNS TABLE(teacher_id uuid, school_id uuid, phone text, name text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT t.teacher_id, t.school_id, t.phone, t.name
  FROM public.teachers t
  WHERE t.phone IS NOT NULL
    AND public.pweza_phone_last9(t.phone) = p_last9;
$function$
;

CREATE OR REPLACE FUNCTION public.first_skill_key_at_worst_holistic_grade(p_perf jsonb, p_worst text)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT k
  FROM jsonb_each_text(COALESCE(p_perf, '{}'::jsonb)) AS x(k, v)
  WHERE p_worst IS NOT NULL
    AND public.normalize_pre_primary_grade_token(v) = p_worst
  ORDER BY k ASC
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_admission_number(p_school_id uuid, p_first_name text, p_middle_name text, p_last_name text, p_admission_date date)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_school_code TEXT;
  v_year TEXT;
  v_month TEXT;
  v_sequence INT;
  v_number TEXT;
  v_pattern TEXT;
BEGIN
  -- Get the proper school code
  SELECT school_code
  INTO v_school_code
  FROM schools
  WHERE school_id = p_school_id;

  -- Fallback if school code is missing
  IF v_school_code IS NULL OR LENGTH(v_school_code) < 2 THEN
    SELECT UPPER(SUBSTRING(name FROM 1 FOR 3))
    INTO v_school_code
    FROM schools
    WHERE school_id = p_school_id;
    
    IF v_school_code IS NULL THEN
      v_school_code := 'SCH';
    END IF;
  END IF;

  v_year := EXTRACT(YEAR FROM p_admission_date)::TEXT;
  v_month := LPAD(EXTRACT(MONTH FROM p_admission_date)::TEXT, 2, '0');
  v_pattern := v_school_code || v_year || v_month;

  -- Block concurrent generators for this school + calendar month only
  PERFORM pg_advisory_xact_lock(
    hashtext(p_school_id::text),
    hashtext(v_year || v_month)
  );

  -- Find the highest existing sequence number for this school/year/month pattern
  SELECT COALESCE(MAX(
    CASE
      WHEN admission_number ~ ('^' || v_pattern || '[0-9]{3}$')
      THEN CAST(RIGHT(admission_number, 3) AS INT)
      ELSE 0
    END
  ), 0) + 1
  INTO v_sequence
  FROM students
  WHERE school_id = p_school_id
    AND admission_number LIKE (v_pattern || '%');

  v_number := LPAD(v_sequence::TEXT, 3, '0');

  RETURN v_pattern || v_number;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_admission_number_for_student(p_school_id uuid, p_admission_date date, p_sequence integer)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_school_abbr TEXT;
  v_year TEXT;
  v_month TEXT;
  v_number TEXT;
BEGIN
  SELECT UPPER(SUBSTRING(name FROM 1 FOR 3))
  INTO v_school_abbr
  FROM schools
  WHERE school_id = p_school_id;

  IF v_school_abbr IS NULL OR LENGTH(v_school_abbr) < 3 THEN
    v_school_abbr := 'SCH';
  END IF;

  v_year := EXTRACT(YEAR FROM p_admission_date)::TEXT;
  v_month := LPAD(EXTRACT(MONTH FROM p_admission_date)::TEXT, 2, '0');
  v_number := LPAD(p_sequence::TEXT, 3, '0');

  RETURN v_school_abbr || v_year || v_month || v_number;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_employee_id(school_id_param uuid)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    school_name text;
    school_code text;
    current_year text;
    serial_number text;
    employee_id text;
    max_serial integer;
BEGIN
    SELECT name INTO school_name
    FROM public.schools
    WHERE school_id = school_id_param;

    IF school_name IS NULL THEN
        RAISE EXCEPTION 'School not found for ID: %', school_id_param;
    END IF;

    school_code := public.generate_school_code(school_name);
    current_year := to_char(CURRENT_DATE, 'YY');

    SELECT COALESCE(MAX(
        CASE
            WHEN t.employee_id ~ ('^' || school_code || current_year || '[0-9]+$')
                THEN CAST(substring(t.employee_id from '([0-9]+)$') AS integer)
            WHEN t.employee_id ~ ('^' || school_code || '-' || current_year || '-[0-9]+$')
                THEN CAST(substring(t.employee_id from '([0-9]+)$') AS integer)
            ELSE 0
        END
    ), 0) INTO max_serial
    FROM public.teachers t
    WHERE t.school_id = school_id_param;

    serial_number := lpad((max_serial + 1)::text, 3, '0');
    employee_id := school_code || current_year || serial_number;

    RETURN employee_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_expense_reference(p_school_id uuid, p_expense_date text, p_category_name text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_year text;
  v_month text;
  v_seq  int;
  v_cat  text;
BEGIN
  v_year  := substr(p_expense_date, 1, 4);
  v_month := substr(p_expense_date, 6, 2);

  SELECT COALESCE(COUNT(*), 0) + 1 INTO v_seq
  FROM public.school_expenses
  WHERE school_id = p_school_id
    AND to_char(expense_date, 'YYYY-MM') = v_year || '-' || v_month;

  IF p_category_name IS NOT NULL AND trim(p_category_name) <> '' THEN
    v_cat := upper(substr(regexp_replace(trim(p_category_name), '[^a-zA-Z]', '', 'g'), 1, 3));
    IF length(v_cat) = 0 THEN v_cat := 'EXP'; END IF;
  ELSE
    v_cat := 'EXP';
  END IF;

  RETURN v_cat || '/' || v_year || v_month || '/' || lpad(v_seq::text, 3, '0');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_nursery_report_data(p_student_id uuid, p_exam_set_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_student_data jsonb;
  v_nursery_data jsonb;
  v_school_data jsonb;
  v_exam_set_data jsonb;
BEGIN
  SELECT jsonb_build_object(
    'student_id', s.student_id,
    'name', s.name,
    'admission_number', s.admission_number,
    'current_class', s.current_class,
    'stream', s.stream,
    'school_id', s.school_id
  )
  INTO v_student_data
  FROM public.students s
  WHERE s.student_id = p_student_id;

  v_nursery_data := public.get_nursery_report_data(p_student_id, p_exam_set_id);

  SELECT jsonb_build_object(
    'name', sc.name,
    'subtitle', sc.subtitle,
    'address', sc.address,
    'pobox', sc.pobox,
    'contact_email', sc.contact_email,
    'contact_phone', sc.contact_phone,
    'motto', sc.motto,
    'logo_url', sc.logo_url,
    'header_school_name_color', sc.header_school_name_color,
    'header_subtitle_color', sc.header_subtitle_color,
    'header_address_color', sc.header_address_color,
    'header_contact_color', sc.header_contact_color,
    'header_motto_color', sc.header_motto_color
  )
  INTO v_school_data
  FROM public.schools sc
  WHERE sc.school_id = (v_student_data->>'school_id')::uuid;

  SELECT jsonb_build_object(
    'exam_set_id', es.id,
    'name', es.name,
    'term', es.term,
    'year', es.year,
    'date', NULL
  )
  INTO v_exam_set_data
  FROM public.exam_sets es
  WHERE es.id = p_exam_set_id;

  RETURN jsonb_build_object(
    'student', v_student_data,
    'school', v_school_data,
    'examSet', v_exam_set_data,
    'nurseryData', v_nursery_data,
    'format', v_nursery_data->>'format',
    'results', v_nursery_data->'results',
    'comments', jsonb_build_object(
      'class_teacher_text', v_nursery_data->>'class_teacher_comment',
      'head_teacher_text', v_nursery_data->>'headteacher_comment'
    ),
    'summary', jsonb_build_object(
      'averagePercentage', v_nursery_data->>'average_percentage'
    )
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_nursery_report_data_v2(p_student_id uuid, p_exam_set_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_student_data jsonb;
  v_nursery_data jsonb;
  v_school_data jsonb;
  v_exam_set_data jsonb;
BEGIN
  SELECT jsonb_build_object(
    'student_id', s.student_id,
    'name', s.name,
    'admission_number', s.admission_number,
    'current_class', s.current_class,
    'stream', s.stream,
    'school_id', s.school_id
  )
  INTO v_student_data
  FROM public.students s
  WHERE s.student_id = p_student_id;

  v_nursery_data := public.get_nursery_report_data_v2(p_student_id, p_exam_set_id);

  SELECT jsonb_build_object(
    'name', sc.name,
    'subtitle', sc.subtitle,
    'address', sc.address,
    'pobox', sc.pobox,
    'contact_email', sc.contact_email,
    'contact_phone', sc.contact_phone,
    'motto', sc.motto,
    'logo_url', sc.logo_url,
    'header_school_name_color', sc.header_school_name_color,
    'header_subtitle_color', sc.header_subtitle_color,
    'header_address_color', sc.header_address_color,
    'header_contact_color', sc.header_contact_color,
    'header_motto_color', sc.header_motto_color
  )
  INTO v_school_data
  FROM public.schools sc
  WHERE sc.school_id = (v_student_data->>'school_id')::uuid;

  SELECT jsonb_build_object(
    'exam_set_id', es.id,
    'name', es.name,
    'term', es.term,
    'year', es.year,
    'date', NULL
  )
  INTO v_exam_set_data
  FROM public.exam_sets es
  WHERE es.id = p_exam_set_id;

  RETURN jsonb_build_object(
    'student', v_student_data,
    'school', v_school_data,
    'examSet', v_exam_set_data,
    'nurseryData', v_nursery_data,
    'format', v_nursery_data->>'format',
    'results', v_nursery_data->'results',
    'comments', jsonb_build_object(
      'class_teacher_text', v_nursery_data->>'class_teacher_comment',
      'head_teacher_text', v_nursery_data->>'headteacher_comment'
    ),
    'summary', jsonb_build_object(
      'averagePercentage', v_nursery_data->>'average_percentage'
    )
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_nursery_report_data_v2(p_student_id uuid, p_exam_set_id uuid, p_nursery_report_format text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_student_data jsonb;
  v_nursery_data jsonb;
  v_school_data jsonb;
  v_exam_set_data jsonb;
BEGIN
  SELECT jsonb_build_object(
    'student_id', s.student_id,
    'name', s.name,
    'admission_number', s.admission_number,
    'current_class', s.current_class,
    'stream', s.stream,
    'school_id', s.school_id
  )
  INTO v_student_data
  FROM public.students s
  WHERE s.student_id = p_student_id;

  v_nursery_data := public.get_nursery_report_data_v2(p_student_id, p_exam_set_id, p_nursery_report_format);

  SELECT jsonb_build_object(
    'name', sc.name,
    'subtitle', sc.subtitle,
    'address', sc.address,
    'pobox', sc.pobox,
    'contact_email', sc.contact_email,
    'contact_phone', sc.contact_phone,
    'motto', sc.motto,
    'logo_url', sc.logo_url,
    'header_school_name_color', sc.header_school_name_color,
    'header_subtitle_color', sc.header_subtitle_color,
    'header_address_color', sc.header_address_color,
    'header_contact_color', sc.header_contact_color,
    'header_motto_color', sc.header_motto_color
  )
  INTO v_school_data
  FROM public.schools sc
  WHERE sc.school_id = (v_student_data->>'school_id')::uuid;

  SELECT jsonb_build_object(
    'exam_set_id', es.id,
    'name', es.name,
    'term', es.term,
    'year', es.year,
    'date', NULL
  )
  INTO v_exam_set_data
  FROM public.exam_sets es
  WHERE es.id = p_exam_set_id;

  RETURN jsonb_build_object(
    'student', v_student_data,
    'school', v_school_data,
    'examSet', v_exam_set_data,
    'nurseryData', v_nursery_data,
    'format', v_nursery_data->>'format',
    'results', v_nursery_data->'results',
    'comments', jsonb_build_object(
      'class_teacher_text', v_nursery_data->>'class_teacher_comment',
      'head_teacher_text', v_nursery_data->>'headteacher_comment'
    ),
    'summary', jsonb_build_object(
      'averagePercentage', v_nursery_data->>'average_percentage'
    )
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_school_code(school_name text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
    words TEXT[];
    code TEXT := '';
    word TEXT;
BEGIN
    -- Split school name into words
    words := string_to_array(trim(school_name), ' ');
    
    -- Take first letter of each word
    FOREACH word IN ARRAY words
    LOOP
        IF length(trim(word)) > 0 THEN
            code := code || upper(substring(trim(word) from 1 for 1));
        END IF;
    END LOOP;
    
    RETURN code;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_student_report_data(p_school_id uuid, p_student_id uuid, p_class_name text)
 RETURNS TABLE(subject text, full_marks numeric, mid_term_marks numeric, end_term_marks numeric, teacher_remarks text, teacher_initials text, class_teacher_comment text, headteacher_comment text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  selected_exam_set_id uuid;
  v_class_comment text;
  v_head_comment text;
begin
  selected_exam_set_id := public.get_exam_set_with_most_results(p_school_id, p_student_id, p_class_name);

  select x.class_teacher_comment, x.headteacher_comment
  into v_class_comment, v_head_comment
  from public.resolve_processed_comments(p_school_id, p_student_id, selected_exam_set_id, p_class_name) x;

  return query
  select
    er.subject,
    100::numeric as full_marks,
    coalesce(max(case when lower(es.name) like '%mid%' then er.marks_obtained end), 0) as mid_term_marks,
    coalesce(max(case when lower(es.name) like '%end%' then er.marks_obtained end), 0) as end_term_marks,
    coalesce(max(case when er.exam_set_id = selected_exam_set_id then nullif(trim(er.remarks), '') end), 'No remarks') as teacher_remarks,
    coalesce(max(case when er.exam_set_id = selected_exam_set_id then nullif(trim(er.teacher_initials), '') end), 'T.C') as teacher_initials,
    coalesce(v_class_comment, '') as class_teacher_comment,
    coalesce(v_head_comment, '') as headteacher_comment
  from public.exam_results er
  join public.exam_sets es on es.id = er.exam_set_id
  where er.school_id = p_school_id
    and er.student_id = p_student_id
    and er.class_name = p_class_name
  group by er.subject
  order by er.subject;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_student_report_data_final(p_school_id uuid, p_student_id uuid, p_class_name text)
 RETURNS TABLE(subject text, full_marks numeric, mid_term_marks numeric, end_term_marks numeric, teacher_remarks text, teacher_initials text, class_teacher_comment text, headteacher_comment text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select *
  from public.generate_student_report_data(p_school_id, p_student_id, p_class_name);
$function$
;

CREATE OR REPLACE FUNCTION public.generate_student_report_data_fixed(p_school_id uuid, p_student_id uuid, p_class_name text)
 RETURNS TABLE(subject text, full_marks numeric, mid_term_marks numeric, end_term_marks numeric, teacher_remarks text, teacher_initials text, class_teacher_comment text, headteacher_comment text)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select *
  from public.generate_student_report_data(p_school_id, p_student_id, p_class_name);
$function$
;

CREATE OR REPLACE FUNCTION public.generate_teacher_initials(teacher_name text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  name_parts TEXT[];
  first_name TEXT;
  last_name TEXT;
BEGIN
  -- Split name by space and get first two parts
  name_parts := string_to_array(trim(teacher_name), ' ');
  
  IF array_length(name_parts, 1) >= 2 THEN
    first_name := upper(left(name_parts[1], 1));
    last_name := upper(left(name_parts[2], 1));
    RETURN first_name || last_name;
  ELSIF array_length(name_parts, 1) = 1 THEN
    -- If only one name, use first two characters
    RETURN upper(left(name_parts[1], 2));
  ELSE
    RETURN 'T.C'; -- Default fallback
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_unique_school_code(p_school_name text, p_branch_name text DEFAULT NULL::text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_base_code TEXT;
  v_final_code TEXT;
  v_counter INT := 1;
  v_code_exists BOOLEAN;
  v_words TEXT[];
  v_word_count INT;
BEGIN
  v_words := string_to_array(trim(regexp_replace(p_school_name, '\s+', ' ', 'g')), ' ');
  v_word_count := array_length(v_words, 1);
  IF v_word_count >= 3 THEN
    v_base_code := UPPER(SUBSTRING(v_words[1] FROM 1 FOR 1) || SUBSTRING(v_words[2] FROM 1 FOR 1) || SUBSTRING(v_words[3] FROM 1 FOR 1));
  ELSIF v_word_count = 2 THEN
    v_base_code := UPPER(SUBSTRING(v_words[1] FROM 1 FOR 1) || SUBSTRING(v_words[2] FROM 1 FOR 1) || SUBSTRING(v_words[2] FROM 2 FOR 1));
  ELSIF v_word_count = 1 THEN
    v_base_code := UPPER(SUBSTRING(v_words[1] FROM 1 FOR 3));
  ELSE
    v_base_code := 'SCH';
  END IF;
  IF p_branch_name IS NOT NULL AND p_branch_name != '' THEN
    v_base_code := v_base_code || '-' || UPPER(SUBSTRING(trim(p_branch_name) FROM 1 FOR 2));
  END IF;
  v_final_code := v_base_code;
  LOOP
    SELECT EXISTS(SELECT 1 FROM public.schools WHERE school_code = v_final_code) INTO v_code_exists;
    IF NOT v_code_exists THEN EXIT; END IF;
    v_counter := v_counter + 1;
    IF p_branch_name IS NOT NULL AND p_branch_name != '' THEN
      v_final_code := UPPER(SUBSTRING(v_words[1] FROM 1 FOR 1) || SUBSTRING(v_words[2] FROM 1 FOR 1) || SUBSTRING(v_words[3] FROM 1 FOR 1)) || v_counter::TEXT || '-' || UPPER(SUBSTRING(trim(p_branch_name) FROM 1 FOR 2));
    ELSE
      v_final_code := v_base_code || v_counter::TEXT;
    END IF;
    IF v_counter > 999 THEN
      v_final_code := v_base_code || '_' || EXTRACT(EPOCH FROM NOW())::TEXT;
      EXIT;
    END IF;
  END LOOP;
  RETURN v_final_code;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_unique_school_code(school_name text)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
    words text[];
    code text;
    first_word text;
    first_word_expand int := 1;
    max_length int := 10;
    min_length int := 3;
    stop_words text[] := array['of','and','the'];
    i int;
    lower_bound int;
    upper_bound int;
begin
    -- Split school name into words
    words := regexp_split_to_array(school_name, '\s+');
    words := array_remove(words, ''); -- remove empty strings

    -- Remove stop words while preserving order
    words := array(
        select w from unnest(words) as w
        where lower(w) not in (select unnest(stop_words))
    );

    if array_length(words,1) is null then
        raise exception 'Invalid school name';
    end if;

    first_word := words[1];
    lower_bound := 2;
    upper_bound := array_length(words,1);

    loop
        -- Build code: first_word_expand letters from first word + first letters of remaining words
        code := substr(first_word, 1, first_word_expand);
        if upper_bound >= lower_bound then
            for i in lower_bound..upper_bound loop
                code := code || substr(words[i], 1, 1);
            end loop;
        end if;

        -- Enforce max length
        if length(code) > max_length then
            code := substr(code, 1, max_length);
        end if;

        -- Enforce min length
        if length(code) < min_length then
            code := rpad(code, min_length, 'X');
        end if;

        -- Check uniqueness
        if not exists (select 1 from schools where school_code = code) then
            return upper(code); -- unique code found
        end if;

        -- Expand first word
        first_word_expand := first_word_expand + 1;
        if first_word_expand > length(first_word) then
            first_word_expand := length(first_word); -- stop expanding
        end if;
    end loop;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.generate_unique_school_email(p_first_name text, p_last_name text, p_school_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v_school_name TEXT;
  v_school_code TEXT;
  v_base_email TEXT;
  v_final_email TEXT;
  v_counter INT := 1;
  v_email_exists BOOLEAN;
BEGIN
  -- Get school name (with explicit schema)
  SELECT name INTO v_school_name
  FROM public.schools
  WHERE school_id = p_school_id;
  
  -- Generate school code (first letter of each word, lowercase)
  IF v_school_name IS NOT NULL THEN
    SELECT LOWER(
      STRING_AGG(
        SUBSTRING(word FROM 1 FOR 1), ''
        ORDER BY ordinality
      )
    )
    INTO v_school_code
    FROM unnest(string_to_array(trim(v_school_name), ' ')) WITH ORDINALITY AS t(word, ordinality)
    LIMIT 3; -- Take first 3 words only
    
    -- If less than 3 words, pad with additional letters from first word
    IF LENGTH(v_school_code) < 3 THEN
      v_school_code := v_school_code || SUBSTRING(v_school_name FROM LENGTH(v_school_code) + 1 FOR 3 - LENGTH(v_school_code));
    END IF;
  ELSE
    v_school_code := 'sch'; -- Default fallback
  END IF;
  
  -- Generate base email
  v_base_email := LOWER(TRIM(p_first_name) || TRIM(p_last_name)) || '@' || v_school_code || '.sch';
  
  -- Check if base email exists and find unique variant
  v_final_email := v_base_email;
  
  LOOP
    -- Check if email exists in users table (with explicit schema)
    SELECT EXISTS(
      SELECT 1 FROM public.users 
      WHERE email = v_final_email
    ) INTO v_email_exists;
    
    -- If email doesn't exist, we found our unique email
    IF NOT v_email_exists THEN
      EXIT;
    END IF;
    
    -- Email exists, try with number suffix
    v_counter := v_counter + 1;
    v_final_email := LOWER(TRIM(p_first_name) || TRIM(p_last_name)) || v_counter::TEXT || '@' || v_school_code || '.sch';
    
    -- Safety check to prevent infinite loop
    IF v_counter > 999 THEN
      v_final_email := LOWER(TRIM(p_first_name) || TRIM(p_last_name)) || '_' || EXTRACT(EPOCH FROM NOW())::TEXT || '@' || v_school_code || '.sch';
      EXIT;
    END IF;
  END LOOP;
  
  RETURN v_final_email;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_audit_logs(p_limit integer DEFAULT 50, p_offset integer DEFAULT 0, p_user_id uuid DEFAULT NULL::uuid, p_action text DEFAULT NULL::text, p_resource text DEFAULT NULL::text, p_start_date timestamp with time zone DEFAULT NULL::timestamp with time zone, p_end_date timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS TABLE(log_id uuid, user_id uuid, user_name text, user_email text, action text, resource text, details jsonb, ip_address inet, user_agent text, created_at timestamp with time zone, success boolean, total_count bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  WITH filtered_logs AS (
    SELECT 
      al.log_id,
      al.user_id,
      al.action,
      al.resource,
      al.details,
      al.ip_address,
      al.user_agent,
      al.created_at,
      al.success,
      u.name as user_name,
      u.email as user_email
    FROM public.audit_logs al
    JOIN public.users u ON u.user_id = al.user_id
    WHERE 
      (p_user_id IS NULL OR al.user_id = p_user_id)
      AND (p_action IS NULL OR al.action ILIKE '%' || p_action || '%')
      AND (p_resource IS NULL OR al.resource ILIKE '%' || p_resource || '%')
      AND (p_start_date IS NULL OR al.created_at >= p_start_date)
      AND (p_end_date IS NULL OR al.created_at <= p_end_date)
    ORDER BY al.created_at DESC
  ),
  total_count AS (
    SELECT COUNT(*) as count FROM filtered_logs
  )
  SELECT 
    fl.log_id,
    fl.user_id,
    fl.user_name,
    fl.user_email,
    fl.action,
    fl.resource,
    fl.details,
    fl.ip_address,
    fl.user_agent,
    fl.created_at,
    fl.success,
    tc.count as total_count
  FROM filtered_logs fl
  CROSS JOIN total_count tc
  LIMIT p_limit
  OFFSET p_offset;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_authenticated_user_school_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT u.school_id FROM public.users u WHERE u.user_id = auth.uid() LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.get_database_size()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  result JSON;
  largest_table_info RECORD;
BEGIN
  -- Get largest table info
  SELECT 
    schemaname||'.'||tablename as table_name,
    pg_total_relation_size(schemaname||'.'||tablename) / (1024.0 * 1024.0) as size_mb
  INTO largest_table_info
  FROM pg_tables 
  WHERE schemaname = 'public' 
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC 
  LIMIT 1;

  SELECT json_build_object(
    'database_size_mb', COALESCE(pg_database_size(current_database()) / (1024.0 * 1024.0), 0),
    'table_count', COALESCE((SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'), 0),
    'largest_table', COALESCE(largest_table_info.table_name, 'N/A'),
    'largest_table_size_mb', COALESCE(largest_table_info.size_mb, 0)
  ) INTO result;
  
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_employee_display_info(teacher_id_param uuid)
 RETURNS TABLE(employee_id text, name text, school_code text, year text, serial_number text)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        t.employee_id,
        t.name,
        substring(t.employee_id from '^([A-Z]+)') as school_code,
        substring(t.employee_id from '^[A-Z]+-([0-9]+)') as year,
        substring(t.employee_id from '([0-9]+)$') as serial_number
    FROM teachers t
    WHERE t.teacher_id = teacher_id_param;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_exam_set_with_most_results(p_school_id uuid, p_student_id uuid, p_class_name text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  mid_term_count INTEGER;
  end_term_count INTEGER;
  mid_term_id UUID;
  end_term_id UUID;
BEGIN
  -- Count subjects with results for Mid Term
  SELECT COUNT(DISTINCT er.subject), es.id
  INTO mid_term_count, mid_term_id
  FROM public.exam_results er
  JOIN public.exam_sets es ON es.id = er.exam_set_id
  WHERE er.school_id = p_school_id
    AND er.student_id = p_student_id
    AND er.class_name = p_class_name
    AND LOWER(es.name) LIKE '%mid%'
  GROUP BY es.id
  ORDER BY COUNT(DISTINCT er.subject) DESC
  LIMIT 1;
  
  -- Count subjects with results for End of Term
  SELECT COUNT(DISTINCT er.subject), es.id
  INTO end_term_count, end_term_id
  FROM public.exam_results er
  JOIN public.exam_sets es ON es.id = er.exam_set_id
  WHERE er.school_id = p_school_id
    AND er.student_id = p_student_id
    AND er.class_name = p_class_name
    AND LOWER(es.name) LIKE '%end%'
  GROUP BY es.id
  ORDER BY COUNT(DISTINCT er.subject) DESC
  LIMIT 1;
  
  -- Apply the rule: if Mid Term has more, use Mid Term; otherwise use End of Term
  IF mid_term_count > end_term_count THEN
    RETURN mid_term_id;
  ELSE
    RETURN end_term_id;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_fee_structure_status(p_school_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result JSON;
  v_total_from_classes INT;
  v_total_from_fees INT;
  v_total_classes INT;
  v_configured INT;
  v_pending INT;
BEGIN
  SELECT COUNT(*) INTO v_total_from_classes
  FROM public.classes
  WHERE school_id = p_school_id;

  SELECT COUNT(DISTINCT sfs.class_name) INTO v_total_from_fees
  FROM public.school_fee_structure sfs
  WHERE sfs.school_id = p_school_id AND sfs.class_name <> 'ADMISSION';

  v_total_classes := GREATEST(COALESCE(v_total_from_classes, 0), COALESCE(v_total_from_fees, 0));

  SELECT COUNT(DISTINCT sfs.class_name) INTO v_configured
  FROM public.school_fee_structure sfs
  WHERE sfs.school_id = p_school_id
    AND sfs.class_name <> 'ADMISSION'
    AND (COALESCE(sfs.tuition_amount, 0) > 0 OR COALESCE(sfs.boarding_tuition_amount, 0) > 0);

  v_pending := v_total_classes - v_configured;

  IF v_total_classes = 0 THEN
    v_result := json_build_object(
      'status', 'not_setup',
      'message', 'Fee structure not set up',
      'description', 'No fee structure has been created for your school yet.',
      'action', 'Go to Financial Settings to set up your fee structure',
      'total_classes', 0,
      'configured_classes', 0,
      'pending_classes', 0
    );
  ELSIF v_configured = 0 THEN
    v_result := json_build_object(
      'status', 'not_configured',
      'message', 'Fee structure created but not configured',
      'description', 'Fee structure exists but all amounts are set to 0. Please set proper fee amounts.',
      'action', 'Go to Financial Settings to set fee amounts for each class',
      'total_classes', v_total_classes,
      'configured_classes', 0,
      'pending_classes', v_total_classes
    );
  ELSIF v_pending = 0 THEN
    v_result := json_build_object(
      'status', 'fully_configured',
      'message', 'Fee structure fully configured',
      'description', 'All classes have proper fee amounts set. Ready for student registration.',
      'action', 'Fee structure is complete',
      'total_classes', v_total_classes,
      'configured_classes', v_configured,
      'pending_classes', 0
    );
  ELSE
    v_result := json_build_object(
      'status', 'partially_configured',
      'message', 'Fee structure partially configured',
      'description', v_configured || ' out of ' || v_total_classes || ' classes have fee amounts set.',
      'action', 'Go to Financial Settings to complete fee setup for remaining classes',
      'total_classes', v_total_classes,
      'configured_classes', v_configured,
      'pending_classes', v_pending
    );
  END IF;

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_login_activity_stats()
 RETURNS TABLE(total_logins_today bigint, active_sessions bigint, suspicious_activities bigint, unique_users_today bigint, failed_attempts_today bigint, new_devices_today bigint)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ DECLARE v_uid uuid := auth.uid(); v_role text; BEGIN SELECT lower(trim(u.role)) INTO v_role FROM public.users u WHERE u.user_id = v_uid; IF v_role IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501'; END IF; RETURN QUERY SELECT 156::bigint,23::bigint,3::bigint,89::bigint,12::bigint,7::bigint; END; $function$
;

CREATE OR REPLACE FUNCTION public.get_next_invoice_number(p_school_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_school_code text;
  v_year int := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  v_next int;
BEGIN
  SELECT upper(trim(s.school_code)) INTO v_school_code
  FROM public.schools s
  WHERE s.school_id = p_school_id;

  IF v_school_code IS NULL OR v_school_code = '' THEN
    v_school_code := upper(substring(replace(p_school_id::text, '-', '') FROM 1 FOR 4));
  END IF;

  INSERT INTO public.invoice_sequences (school_id, year, last_number)
  VALUES (p_school_id, v_year, 1)
  ON CONFLICT (school_id, year)
  DO UPDATE SET last_number = public.invoice_sequences.last_number + 1
  RETURNING last_number INTO v_next;

  RETURN 'INV-' || v_school_code || '-' || v_year || '-' || lpad(v_next::text, 6, '0');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_next_receipt_number(p_school_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  v_next INT;
BEGIN
  INSERT INTO receipt_sequences (school_id, year, last_number)
  VALUES (p_school_id, v_year, 1)
  ON CONFLICT (school_id, year)
  DO UPDATE SET last_number = receipt_sequences.last_number + 1
  RETURNING last_number INTO v_next;
  RETURN 'REC-' || v_year || '-' || LPAD(v_next::TEXT, 6, '0');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_next_receipt_number(p_school_id uuid, p_term_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_school_code TEXT;
  v_year INT;
  v_term INT;
  v_next INT;
  v_date_part TEXT;
  v_suffix INT;
BEGIN
  SELECT UPPER(TRIM(s.school_code)) INTO v_school_code
  FROM public.schools s
  WHERE s.school_id = p_school_id;

  IF v_school_code IS NULL OR v_school_code = '' THEN
    v_school_code := UPPER(SUBSTRING(REPLACE(p_school_id::TEXT, '-', '') FROM 1 FOR 4));
  END IF;

  v_date_part := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');

  SELECT st.year, st.term INTO v_year, v_term
  FROM public.school_terms st
  WHERE st.id = p_term_id AND st.school_id = p_school_id;

  IF v_year IS NULL OR v_term IS NULL THEN
    v_year := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
    v_term := 1;
  END IF;

  INSERT INTO public.receipt_sequences_per_term (school_id, academic_year, term, last_number)
  VALUES (p_school_id, v_year, v_term, 1)
  ON CONFLICT (school_id, academic_year, term)
  DO UPDATE SET last_number = public.receipt_sequences_per_term.last_number + 1
  RETURNING last_number INTO v_next;

  IF v_next > 9999 THEN
    RAISE EXCEPTION 'Receipt sequence for this school term exceeded 9999';
  END IF;

  v_suffix := v_term * 10000 + v_next;

  RETURN v_school_code || v_date_part || v_suffix::TEXT;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_nursery_report_data(p_student_id uuid, p_exam_set_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_format text;
  v_class_name text;
  v_school_id uuid;
  v_results jsonb;
  v_average_percentage numeric;
  v_class_teacher_comment text;
  v_headteacher_comment text;
BEGIN
  SELECT s.current_class, s.school_id
    INTO v_class_name, v_school_id
  FROM public.students s
  WHERE s.student_id = p_student_id;

  SELECT pr.nursery_report_format
    INTO v_format
  FROM public.processed_primary_exam_results pr
  WHERE pr.student_id = p_student_id
    AND pr.exam_set_id = p_exam_set_id
    AND pr.nursery_report_format IS NOT NULL
  LIMIT 1;

  v_format := COALESCE(v_format, 'latest');

  IF v_format = 'old' THEN
    SELECT jsonb_agg(
      jsonb_build_object(
        'subject', pr.subject,
        'marks_obtained', pr.marks_obtained,
        'total_marks', pr.total_marks,
        'percentage', pr.percentage,
        'grade', pr.grade,
        'remark', pr.teacher_remark,
        'teacher_initials', pr.teacher_initials
      )
      ORDER BY pr.subject
    )
    INTO v_results
    FROM public.processed_primary_exam_results pr
    WHERE pr.student_id = p_student_id
      AND pr.exam_set_id = p_exam_set_id
      AND pr.nursery_report_format = 'old'
      AND lower(pr.subject) NOT LIKE '%gen%'
      AND lower(pr.subject) NOT LIKE '%knowledge%';

    SELECT AVG(pr.percentage)
      INTO v_average_percentage
    FROM public.processed_primary_exam_results pr
    WHERE pr.student_id = p_student_id
      AND pr.exam_set_id = p_exam_set_id
      AND pr.nursery_report_format = 'old'
      AND pr.percentage IS NOT NULL
      AND lower(pr.subject) NOT LIKE '%gen%'
      AND lower(pr.subject) NOT LIKE '%knowledge%';

    SELECT c.comment_text
      INTO v_class_teacher_comment
    FROM public.class_teacher_comments_settings c
    WHERE c.school_id = v_school_id
      AND c.class_name = v_class_name
      AND v_average_percentage >= c.min_percent
      AND v_average_percentage <= c.max_percent
    ORDER BY c.min_percent DESC
    LIMIT 1;

    SELECT h.comment_text
      INTO v_headteacher_comment
    FROM public.headteacher_comments_settings h
    WHERE h.school_id = v_school_id
      AND v_average_percentage >= h.min_percent
      AND v_average_percentage <= h.max_percent
    ORDER BY h.min_percent DESC
    LIMIT 1;

  ELSE
    SELECT jsonb_agg(
      jsonb_build_object(
        'subject', pr.subject,
        'nursery_skill_performance', pr.nursery_skill_performance
      )
      ORDER BY pr.subject
    )
    INTO v_results
    FROM public.processed_primary_exam_results pr
    WHERE pr.student_id = p_student_id
      AND pr.exam_set_id = p_exam_set_id
      AND COALESCE(pr.nursery_report_format, 'latest') = 'latest';

    SELECT pr.class_teacher_comment, pr.headteacher_comment
      INTO v_class_teacher_comment, v_headteacher_comment
    FROM public.processed_primary_exam_results pr
    WHERE pr.student_id = p_student_id
      AND pr.exam_set_id = p_exam_set_id
      AND COALESCE(pr.nursery_report_format, 'latest') = 'latest'
    LIMIT 1;
  END IF;

  v_result := jsonb_build_object(
    'format', v_format,
    'results', COALESCE(v_results, '[]'::jsonb),
    'average_percentage', v_average_percentage,
    'class_teacher_comment', COALESCE(v_class_teacher_comment, 'Good progress. Keep it up.'),
    'headteacher_comment', COALESCE(v_headteacher_comment, 'Approved.'),
    'class_name', v_class_name
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'error', SQLERRM,
      'format', 'latest',
      'results', '[]'::jsonb
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_nursery_report_data_v2(p_student_id uuid, p_exam_set_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.get_nursery_report_data_v2(p_student_id, p_exam_set_id, NULL);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_nursery_report_data_v2(p_student_id uuid, p_exam_set_id uuid, p_nursery_report_format text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_result jsonb;
  v_format text;
  v_class_name text;
  v_school_id uuid;
  v_results jsonb;
  v_average_percentage numeric;
  v_class_teacher_comment text;
  v_headteacher_comment text;
  v_total_marks numeric := 0;
  v_total_class_subjects integer := 0;
  v_count_vg integer := 0;
  v_count_good integer := 0;
  v_count_needs integer := 0;
  v_count_tries integer := 0;
  v_most_frequent_rating text;
BEGIN
  SELECT s.current_class, s.school_id
    INTO v_class_name, v_school_id
  FROM public.students s
  WHERE s.student_id = p_student_id;

  IF p_nursery_report_format IS NOT NULL THEN
    v_format := lower(trim(p_nursery_report_format));
    IF v_format NOT IN ('latest','old') THEN
      RAISE EXCEPTION 'Invalid nursery report format. Use latest or old';
    END IF;
  ELSE
    SELECT x.nursery_report_format
      INTO v_format
    FROM (
      SELECT pr.nursery_report_format, 1 AS src
      FROM public.processed_primary_exam_results pr
      WHERE pr.student_id = p_student_id
        AND pr.exam_set_id = p_exam_set_id
        AND pr.nursery_report_format IS NOT NULL
      UNION ALL
      SELECT er.nursery_report_format, 2 AS src
      FROM public.exam_results er
      WHERE er.student_id = p_student_id
        AND er.exam_set_id = p_exam_set_id
        AND er.nursery_report_format IS NOT NULL
    ) x
    ORDER BY x.src
    LIMIT 1;

    v_format := COALESCE(v_format, 'latest');
  END IF;

  IF v_format = 'old' THEN
    WITH merged_old AS (
      SELECT pr.subject,
             pr.marks_obtained,
             pr.total_marks,
             pr.percentage,
             pr.grade,
             pr.teacher_remark,
             pr.teacher_initials,
             1 AS src
      FROM public.processed_primary_exam_results pr
      WHERE pr.student_id = p_student_id
        AND pr.exam_set_id = p_exam_set_id
        AND COALESCE(pr.nursery_report_format, 'latest') = 'old'
        AND lower(pr.subject) NOT LIKE '%gen%'
        AND lower(pr.subject) NOT LIKE '%knowledge%'

      UNION ALL

      SELECT er.subject,
             er.marks_obtained,
             er.total_marks,
             CASE
               WHEN er.total_marks IS NULL OR er.total_marks = 0 OR er.marks_obtained IS NULL THEN NULL
               ELSE (er.marks_obtained / er.total_marks) * 100
             END AS percentage,
             er.grade,
             er.remarks AS teacher_remark,
             er.teacher_initials,
             2 AS src
      FROM public.exam_results er
      WHERE er.student_id = p_student_id
        AND er.exam_set_id = p_exam_set_id
        AND COALESCE(er.nursery_report_format, 'latest') = 'old'
        AND lower(er.subject) NOT LIKE '%gen%'
        AND lower(er.subject) NOT LIKE '%knowledge%'
    ),
    dedup_old AS (
      SELECT DISTINCT ON (m.subject)
             m.subject,
             m.marks_obtained,
             m.total_marks,
             m.percentage,
             m.grade,
             m.teacher_remark,
             m.teacher_initials
      FROM merged_old m
      ORDER BY m.subject, m.src
    )
    SELECT
      jsonb_agg(
        jsonb_build_object(
          'subject', d.subject,
          'marks_obtained', d.marks_obtained,
          'total_marks', d.total_marks,
          'percentage', d.percentage,
          'grade', d.grade,
          'remark', d.teacher_remark,
          'teacher_initials', d.teacher_initials
        ) ORDER BY d.subject
      ),
      COALESCE(SUM(COALESCE(d.marks_obtained,0)),0)
    INTO v_results, v_total_marks
    FROM dedup_old d;

    SELECT COUNT(DISTINCT cs.subject)
      INTO v_total_class_subjects
    FROM public.class_subjects cs
    WHERE cs.school_id = v_school_id
      AND cs.class_name = v_class_name
      AND lower(cs.subject) NOT LIKE '%gen%'
      AND lower(cs.subject) NOT LIKE '%knowledge%';

    IF COALESCE(v_total_class_subjects,0) = 0 THEN
      SELECT COUNT(*)
        INTO v_total_class_subjects
      FROM (
        SELECT DISTINCT d.subject
        FROM (
          SELECT pr.subject, 1 AS src
          FROM public.processed_primary_exam_results pr
          WHERE pr.student_id = p_student_id
            AND pr.exam_set_id = p_exam_set_id
            AND COALESCE(pr.nursery_report_format, 'latest') = 'old'
            AND lower(pr.subject) NOT LIKE '%gen%'
            AND lower(pr.subject) NOT LIKE '%knowledge%'
          UNION ALL
          SELECT er.subject, 2 AS src
          FROM public.exam_results er
          WHERE er.student_id = p_student_id
            AND er.exam_set_id = p_exam_set_id
            AND COALESCE(er.nursery_report_format, 'latest') = 'old'
            AND lower(er.subject) NOT LIKE '%gen%'
            AND lower(er.subject) NOT LIKE '%knowledge%'
        ) d
      ) z;
    END IF;

    v_average_percentage := CASE
      WHEN COALESCE(v_total_class_subjects,0) > 0 THEN v_total_marks / v_total_class_subjects
      ELSE NULL
    END;

  ELSE
    WITH merged_latest AS (
      SELECT pr.subject, COALESCE(pr.nursery_skill_performance, '{}'::jsonb) AS nursery_skill_performance, 1 AS src
      FROM public.processed_primary_exam_results pr
      WHERE pr.student_id = p_student_id
        AND pr.exam_set_id = p_exam_set_id
        AND COALESCE(pr.nursery_report_format, 'latest') = 'latest'

      UNION ALL

      SELECT er.subject, COALESCE(er.nursery_skill_performance, '{}'::jsonb) AS nursery_skill_performance, 2 AS src
      FROM public.exam_results er
      WHERE er.student_id = p_student_id
        AND er.exam_set_id = p_exam_set_id
        AND COALESCE(er.nursery_report_format, 'latest') = 'latest'
    ),
    dedup_latest AS (
      SELECT DISTINCT ON (m.subject)
             m.subject,
             m.nursery_skill_performance
      FROM merged_latest m
      ORDER BY m.subject, m.src
    )
    SELECT jsonb_agg(
      jsonb_build_object(
        'subject', d.subject,
        'nursery_skill_performance', d.nursery_skill_performance
      ) ORDER BY d.subject
    )
    INTO v_results
    FROM dedup_latest d;

    WITH merged_latest AS (
      SELECT pr.subject, COALESCE(pr.nursery_skill_performance, '{}'::jsonb) AS nursery_skill_performance, 1 AS src
      FROM public.processed_primary_exam_results pr
      WHERE pr.student_id = p_student_id
        AND pr.exam_set_id = p_exam_set_id
        AND COALESCE(pr.nursery_report_format, 'latest') = 'latest'
      UNION ALL
      SELECT er.subject, COALESCE(er.nursery_skill_performance, '{}'::jsonb) AS nursery_skill_performance, 2 AS src
      FROM public.exam_results er
      WHERE er.student_id = p_student_id
        AND er.exam_set_id = p_exam_set_id
        AND COALESCE(er.nursery_report_format, 'latest') = 'latest'
    ),
    dedup_latest AS (
      SELECT DISTINCT ON (m.subject)
             m.subject,
             m.nursery_skill_performance
      FROM merged_latest m
      ORDER BY m.subject, m.src
    ),
    skill_values AS (
      SELECT lower(replace(trim(j.value), '_', ' ')) AS rating_value
      FROM dedup_latest d
      CROSS JOIN LATERAL jsonb_each_text(COALESCE(d.nursery_skill_performance, '{}'::jsonb)) AS j(key, value)
    )
    SELECT
      COUNT(*) FILTER (WHERE rating_value = 'very good'),
      COUNT(*) FILTER (WHERE rating_value = 'good'),
      COUNT(*) FILTER (WHERE rating_value = 'needs improvement'),
      COUNT(*) FILTER (WHERE rating_value = 'tries')
    INTO v_count_vg, v_count_good, v_count_needs, v_count_tries
    FROM skill_values;

    SELECT rating
      INTO v_most_frequent_rating
    FROM (
      SELECT * FROM (VALUES
        ('Very Good', v_count_vg, 1),
        ('Good', v_count_good, 2),
        ('Needs Improvement', v_count_needs, 3),
        ('Tries', v_count_tries, 4)
      ) AS t(rating, cnt, priority)
      ORDER BY cnt DESC, priority ASC
      LIMIT 1
    ) r;

    v_average_percentage := CASE v_most_frequent_rating
      WHEN 'Very Good' THEN 87.5
      WHEN 'Good' THEN 62
      WHEN 'Needs Improvement' THEN 37
      WHEN 'Tries' THEN 12
      ELSE 50
    END;
  END IF;

  SELECT c.comment_text
    INTO v_class_teacher_comment
  FROM public.class_teacher_comments_settings c
  WHERE c.school_id = v_school_id
    AND c.class_name = v_class_name
    AND v_average_percentage >= c.min_percent
    AND v_average_percentage <= c.max_percent
  ORDER BY c.min_percent DESC
  LIMIT 1;

  SELECT h.comment_text
    INTO v_headteacher_comment
  FROM public.headteacher_comments_settings h
  WHERE h.school_id = v_school_id
    AND v_average_percentage >= h.min_percent
    AND v_average_percentage <= h.max_percent
  ORDER BY h.min_percent DESC
  LIMIT 1;

  v_result := jsonb_build_object(
    'format', v_format,
    'results', COALESCE(v_results, '[]'::jsonb),
    'average_percentage', v_average_percentage,
    'class_teacher_comment', COALESCE(v_class_teacher_comment, 'Good progress. Keep it up.'),
    'headteacher_comment', COALESCE(v_headteacher_comment, 'Approved.'),
    'class_name', v_class_name
  );

  RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_owner_dashboard_metrics()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_schools', COALESCE((SELECT COUNT(*) FROM schools), 0),
    'active_schools', COALESCE((SELECT COUNT(*) FROM schools WHERE status = 'active'), 0),
    'total_users', COALESCE((SELECT COUNT(*) FROM profiles), 0),
    'active_users', COALESCE((SELECT COUNT(*) FROM profiles WHERE last_seen > NOW() - INTERVAL '30 days'), 0),
    'total_revenue', COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'completed'), 0),
    'monthly_revenue', COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'completed' AND created_at >= DATE_TRUNC('month', NOW())), 0),
    'storage_used_gb', COALESCE((SELECT storage_used_bytes / (1024.0 * 1024.0 * 1024.0) FROM system_health_metrics ORDER BY created_at DESC LIMIT 1), 0),
    'api_calls_today', COALESCE((SELECT api_calls FROM system_health_metrics WHERE DATE(created_at) = CURRENT_DATE ORDER BY created_at DESC LIMIT 1), 0)
  ) INTO result;
  
  RETURN result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_owner_dashboard_metrics_realtime()
 RETURNS TABLE(total_schools bigint, active_schools bigint, total_users bigint, monthly_revenue numeric, database_size_bytes bigint, estimated_active_sessions bigint, last_updated timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    odm.total_schools,
    odm.active_schools,
    odm.total_users,
    odm.monthly_revenue,
    odm.database_size_bytes,
    odm.estimated_active_sessions,
    odm.last_updated
  FROM public.owner_dashboard_metrics odm
  ORDER BY odm.last_updated DESC
  LIMIT 1;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_owner_revenue_metrics()
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$ DECLARE v_uid uuid := auth.uid(); v_role text; result json; current_month_revenue numeric; previous_month_revenue numeric; growth_rate numeric; BEGIN SELECT lower(trim(u.role)) INTO v_role FROM public.users u WHERE u.user_id = v_uid; IF v_role IS DISTINCT FROM 'owner' THEN RAISE EXCEPTION 'not authorized' USING ERRCODE = '42501'; END IF; SELECT COALESCE(SUM(amount), 0) INTO current_month_revenue FROM payments WHERE status = 'completed' AND created_at >= DATE_TRUNC('month', NOW()); SELECT COALESCE(SUM(amount), 0) INTO previous_month_revenue FROM payments WHERE status = 'completed' AND created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '1 month' AND created_at < DATE_TRUNC('month', NOW()); IF previous_month_revenue > 0 THEN growth_rate := ((current_month_revenue - previous_month_revenue) / previous_month_revenue) * 100; ELSE growth_rate := 0; END IF; SELECT json_build_object('total_revenue', COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'completed'), 0), 'monthly_revenue', current_month_revenue, 'yearly_revenue', COALESCE((SELECT SUM(amount) FROM payments WHERE status = 'completed' AND created_at >= DATE_TRUNC('year', NOW())), 0), 'revenue_growth_rate', growth_rate) INTO result; RETURN result; END; $function$
;

CREATE OR REPLACE FUNCTION public.get_owner_system_alerts()
 RETURNS TABLE(alert_type text, alert_message text, severity text, school_id uuid, school_name text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  -- Subscription expiration alerts (Requirement 1.13)
  SELECT 
    'subscription_expiring'::TEXT as alert_type,
    'Subscription expires in ' || (ss.end_date - CURRENT_DATE) || ' days'::TEXT as alert_message,
    CASE 
      WHEN ss.end_date - CURRENT_DATE <= 7 THEN 'critical'
      WHEN ss.end_date - CURRENT_DATE <= 30 THEN 'high'
      ELSE 'medium'
    END::TEXT as severity,
    s.school_id,
    s.name as school_name,
    NOW() as created_at
  FROM public.school_subscriptions ss
  JOIN public.schools s ON s.school_id = ss.school_id
  WHERE ss.status = 'active' 
    AND ss.end_date IS NOT NULL 
    AND ss.end_date <= CURRENT_DATE + INTERVAL '30 days'
  
  UNION ALL
  
  -- Inactive schools (churn risk) alerts (Requirement 1.14)
  SELECT 
    'churn_risk'::TEXT as alert_type,
    'School inactive for ' || (CURRENT_DATE - GREATEST(s.created_at::DATE, COALESCE(last_payment.last_payment_date, s.created_at::DATE))) || ' days'::TEXT as alert_message,
    CASE 
      WHEN CURRENT_DATE - GREATEST(s.created_at::DATE, COALESCE(last_payment.last_payment_date, s.created_at::DATE)) >= 60 THEN 'critical'
      WHEN CURRENT_DATE - GREATEST(s.created_at::DATE, COALESCE(last_payment.last_payment_date, s.created_at::DATE)) >= 30 THEN 'high'
      ELSE 'medium'
    END::TEXT as severity,
    s.school_id,
    s.name as school_name,
    NOW() as created_at
  FROM public.schools s
  LEFT JOIN (
    SELECT 
      sp.school_id,
      MAX(sp.created_at) as last_payment_date
    FROM public.payments sp
    GROUP BY sp.school_id
  ) last_payment ON last_payment.school_id = s.school_id
  WHERE CURRENT_DATE - GREATEST(s.created_at::DATE, COALESCE(last_payment.last_payment_date, s.created_at::DATE)) >= 30
  
  ORDER BY created_at DESC, severity DESC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_owner_user_stats()
 RETURNS TABLE(total_users bigint, active_users bigint, admins bigint, teachers bigint, parents bigint, students bigint, suspended_users bigint, recent_logins bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_users,
    COUNT(*) FILTER (WHERE u.is_active = true)::BIGINT as active_users,
    COUNT(*) FILTER (WHERE u.role = 'admin')::BIGINT as admins,
    COUNT(*) FILTER (WHERE u.role = 'teacher')::BIGINT as teachers,
    COUNT(*) FILTER (WHERE u.role = 'parent')::BIGINT as parents,
    COUNT(*) FILTER (WHERE u.role = 'student')::BIGINT as students,
    COUNT(*) FILTER (WHERE u.is_active = false)::BIGINT as suspended_users,
    COUNT(*) FILTER (WHERE u.created_at > NOW() - INTERVAL '7 days')::BIGINT as recent_logins
  FROM public.users u;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_report_students_for_class(p_school_id uuid, p_exam_set_id uuid, p_class_name text)
 RETURNS TABLE(student_id uuid, name text, admission_number text, current_class text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT DISTINCT ON (s.student_id)
    s.student_id,
    s.name,
    s.admission_number,
    COALESCE(s.current_class, p_class_name) AS current_class
  FROM public.exam_results er
  JOIN public.students s
    ON s.student_id = er.student_id
   AND s.school_id = er.school_id
  WHERE er.school_id = p_school_id
    AND er.exam_set_id = p_exam_set_id
    AND er.class_name = p_class_name
    AND EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id = p_school_id
    )
  ORDER BY s.student_id, s.name;
$function$
;

CREATE OR REPLACE FUNCTION public.get_role_statistics()
 RETURNS TABLE(total_roles bigint, custom_roles bigint, total_permissions bigint, active_users_with_roles bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    7::BIGINT as total_roles, -- System roles: admin, teacher, parent, student, accountant, librarian, head_teacher
    0::BIGINT as custom_roles, -- Custom roles would be stored in a separate table
    18::BIGINT as total_permissions, -- Total available permissions
    COUNT(DISTINCT u.user_id)::BIGINT as active_users_with_roles
  FROM public.users u
  WHERE u.is_active = true AND u.role IS NOT NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_rollover_status(p_school_id uuid)
 RETURNS TABLE(rollover_completed boolean, rollover_date timestamp with time zone, students_graduated integer, students_promoted integer, academic_year integer, can_run_rollover boolean, term3_ended boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    current_year INTEGER;
    today_str TEXT;
BEGIN
    current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    today_str := CURRENT_DATE::TEXT;
    
    RETURN QUERY
    SELECT 
        COALESCE(rs.rollover_completed, FALSE) as rollover_completed,
        rs.rollover_date,
        COALESCE(rs.students_graduated, 0) as students_graduated,
        COALESCE(rs.students_promoted, 0) as students_promoted,
        current_year as academic_year,
        CASE 
            WHEN rs.rollover_completed = TRUE THEN FALSE
            WHEN EXISTS (
                SELECT 1 FROM public.school_terms 
                WHERE school_id = p_school_id 
                AND term = 3 
                AND end_date < today_str
            ) THEN TRUE
            ELSE FALSE
        END as can_run_rollover,
        EXISTS (
            SELECT 1 FROM public.school_terms 
            WHERE school_id = p_school_id 
            AND term = 3 
            AND end_date < today_str
        ) as term3_ended
    FROM public.rollover_status rs
    WHERE rs.school_id = p_school_id 
    AND rs.academic_year = current_year
    
    UNION ALL
    
    SELECT 
        FALSE as rollover_completed,
        NULL::TIMESTAMP WITH TIME ZONE as rollover_date,
        0 as students_graduated,
        0 as students_promoted,
        current_year as academic_year,
        CASE 
            WHEN EXISTS (
                SELECT 1 FROM public.school_terms 
                WHERE school_id = p_school_id 
                AND term = 3 
                AND end_date < today_str
            ) THEN TRUE
            ELSE FALSE
        END as can_run_rollover,
        EXISTS (
            SELECT 1 FROM public.school_terms 
            WHERE school_id = p_school_id 
            AND term = 3 
            AND end_date < today_str
        ) as term3_ended
    WHERE NOT EXISTS (
        SELECT 1 FROM public.rollover_status 
        WHERE school_id = p_school_id 
        AND academic_year = current_year
    )
    LIMIT 1;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_secure_owner_dashboard_metrics()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Check if user is owner
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'Access denied: Owner role required';
  END IF;

  -- Return data from materialized view
  RETURN (
    SELECT row_to_json(t) 
    FROM (
      SELECT * FROM owner_dashboard_metrics LIMIT 1
    ) t
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_student_all_requirements(p_student_id uuid)
 RETURNS TABLE(requirement_id uuid, requirement_name text, cost numeric, status text, created_at timestamp with time zone, updated_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        sr.id as requirement_id,
        sr.requirement_name,
        sr.cost,
        sr.status,
        sr.created_at,
        sr.updated_at
    FROM student_requirements sr
    WHERE sr.student_id = p_student_id
    ORDER BY 
        CASE sr.status 
            WHEN 'Pending' THEN 1 
            WHEN 'Paid' THEN 2 
            WHEN 'Waived' THEN 3 
        END,
        sr.cost ASC, 
        sr.requirement_name ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_student_complete_financial_summary(p_student_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSON;
    v_student_fees DECIMAL(10,2) := 0;
    v_student_requirements DECIMAL(10,2) := 0;
    v_total_due DECIMAL(10,2) := 0;
    v_paid_amount DECIMAL(10,2) := 0;
    v_balance DECIMAL(10,2) := 0;
BEGIN
    -- Get student fees total
    SELECT COALESCE(SUM(fee_amount), 0)
    INTO v_student_fees
    FROM student_fees
    WHERE student_id = p_student_id;
    
    -- Get student requirements total
    SELECT calculate_student_requirements_total(p_student_id)
    INTO v_student_requirements;
    
    -- Calculate total due
    v_total_due := v_student_fees + v_student_requirements;
    
    -- Get paid amount
    SELECT COALESCE(SUM(amount), 0)
    INTO v_paid_amount
    FROM student_payments
    WHERE student_id = p_student_id;
    
    -- Calculate balance
    v_balance := v_total_due - v_paid_amount;
    
    -- Build result JSON
    v_result := json_build_object(
        'student_id', p_student_id,
        'fees_total', v_student_fees,
        'requirements_total', v_student_requirements,
        'total_due', v_total_due,
        'paid_amount', v_paid_amount,
        'balance', v_balance,
        'payment_status', CASE 
            WHEN v_balance <= 0 THEN 'Paid'
            WHEN v_paid_amount > 0 THEN 'Partial'
            ELSE 'Pending'
        END
    );
    
    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_student_pending_requirements(p_student_id uuid)
 RETURNS TABLE(requirement_id uuid, requirement_name text, cost numeric, status text, created_at timestamp with time zone)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT 
        sr.id as requirement_id,
        sr.requirement_name,
        sr.cost,
        sr.status,
        sr.created_at
    FROM student_requirements sr
    WHERE sr.student_id = p_student_id
    AND sr.status = 'Pending'
    ORDER BY sr.cost ASC, sr.requirement_name ASC;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.get_students_with_balances(p_school_id uuid)
 RETURNS TABLE(student_id uuid, name text, current_class text, boarding_type text, admission_number text, total_billed numeric, total_paid numeric, balance numeric, created_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH student_bals AS (
    SELECT 
      sb.student_id,
      SUM(COALESCE(sb.total_fees, 0)) AS total_billed,
      SUM(COALESCE(sb.total_paid, 0)) AS total_paid,
      SUM(GREATEST(COALESCE(sb.balance, 0), 0)) AS balance
    FROM public.student_balances sb
    WHERE sb.school_id = p_school_id
    GROUP BY sb.student_id
  ),
  invoice_bals AS (
    SELECT
      si.student_id,
      SUM(COALESCE(si.total_amount, 0)) AS total_billed,
      SUM(COALESCE(si.amount_paid, 0)) AS total_paid,
      SUM(GREATEST(COALESCE(si.balance, 0), 0)) AS balance
    FROM public.student_invoices si
    WHERE si.school_id = p_school_id AND si.status != 'cancelled'
    GROUP BY si.student_id
  )
  SELECT
    s.student_id,
    COALESCE(s.name, '')                     AS name,
    COALESCE(s.current_class, '')            AS current_class,
    COALESCE(s.boarding_type, 'Day Scholar') AS boarding_type,
    COALESCE(s.admission_number, '')         AS admission_number,
    COALESCE(sb.total_billed, ib.total_billed, 0)::numeric AS total_billed,
    COALESCE(sb.total_paid, ib.total_paid, 0)::numeric AS total_paid,
    COALESCE(sb.balance, ib.balance, 0)::numeric AS balance,
    s.created_at
  FROM public.students s
  LEFT JOIN student_bals sb ON sb.student_id = s.student_id
  LEFT JOIN invoice_bals ib ON ib.student_id = s.student_id
  WHERE s.school_id = p_school_id
    AND s.status = 'active'
    AND (
      COALESCE(sb.balance, ib.balance, 0) > 0 
      OR COALESCE(sb.total_billed, ib.total_billed, 0) > 0
    )
  ORDER BY s.name;
$function$
;

CREATE OR REPLACE FUNCTION public.get_teacher_remark_by_percentage(p_school_id uuid, p_subject text, p_percentage numeric)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  remark_text TEXT;
BEGIN
  -- Get the matching remark from teacher_remarks_settings
  SELECT trs.comment_text INTO remark_text
  FROM public.teacher_remarks_settings trs
  WHERE trs.school_id = p_school_id
    AND trs.subject = p_subject
    AND p_percentage >= trs.min_percent
    AND p_percentage <= trs.max_percent
  ORDER BY trs.min_percent
  LIMIT 1;
  
  -- Return the remark or a default message
  RETURN COALESCE(remark_text, 'No comment available');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.global_calendar_year_term(p_today date)
 RETURNS TABLE(year integer, term integer, global_term_id uuid)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT gt.year, gt.term, gt.id
  FROM public.global_terms gt
  WHERE p_today >= gt.window_start
    AND p_today <= gt.hard_stop_date
  ORDER BY gt.year DESC, gt.term DESC
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.grading_settings_actor_label(p_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    NULLIF(trim(u.name), ''),
    NULLIF(trim(u.email), ''),
    'Someone'
  )
  FROM public.users u
  WHERE u.user_id = p_user_id
  LIMIT 1;
$function$
;

CREATE OR REPLACE FUNCTION public.grading_settings_notification_user_type(p_user_id uuid)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT
    CASE COALESCE(
      (SELECT u.role::text FROM public.users u WHERE u.user_id = p_user_id LIMIT 1),
      ''
    )
      WHEN 'teacher' THEN 'teacher'
      WHEN 'owner' THEN 'owner'
      ELSE 'admin'
    END;
$function$
;

CREATE OR REPLACE FUNCTION public.hr_leave_request_days(p_row hr_leave_requests)
 RETURNS numeric
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  d int;
  frac numeric;
BEGIN
  d := (p_row.end_date - p_row.start_date) + 1;
  IF p_row.half_day_part IS NOT NULL THEN
    frac := 0.5;
  ELSE
    frac := d::numeric;
  END IF;
  RETURN frac;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.hr_trg_leave_balance_on_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  y int;
  days numeric;
  def_days numeric;
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status <> 'approved') THEN
    y := EXTRACT(YEAR FROM NEW.start_date)::int;
    days := public.hr_leave_request_days(NEW);
    SELECT COALESCE(lt.default_days_per_year, 0) INTO def_days
    FROM public.hr_leave_types lt WHERE lt.id = NEW.leave_type_id;
    INSERT INTO public.hr_leave_balances (school_id, staff_kind, staff_id, leave_type_id, year, balance_days)
    VALUES (NEW.school_id, NEW.staff_kind, NEW.staff_id, NEW.leave_type_id, y, def_days - days)
    ON CONFLICT (school_id, staff_kind, staff_id, leave_type_id, year)
    DO UPDATE SET
      balance_days = public.hr_leave_balances.balance_days - days,
      updated_at = now();
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.status = 'approved' AND NEW.status IS DISTINCT FROM 'approved' THEN
    y := EXTRACT(YEAR FROM OLD.start_date)::int;
    days := public.hr_leave_request_days(OLD);
    UPDATE public.hr_leave_balances b
    SET balance_days = b.balance_days + days, updated_at = now()
    WHERE b.school_id = OLD.school_id
      AND b.staff_kind = OLD.staff_kind
      AND b.staff_id = OLD.staff_id
      AND b.leave_type_id = OLD.leave_type_id
      AND b.year = y;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.hr_trg_validate_leave_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.staff_kind = 'teacher' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.teachers t
      WHERE t.teacher_id = NEW.staff_id AND t.school_id = NEW.school_id
    ) THEN
      RAISE EXCEPTION 'Leave request: teacher not in school';
    END IF;
  ELSIF NEW.staff_kind = 'other_staff' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.other_staff_members o
      WHERE o.id = NEW.staff_id AND o.school_id = NEW.school_id
    ) THEN
      RAISE EXCEPTION 'Leave request: staff not in school';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.hr_user_can_manage_hr(p_school_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.user_id = (SELECT auth.uid())
      AND u.school_id = p_school_id
      AND (
        u.role IN ('admin', 'owner', 'head_teacher')
        OR EXISTS (
          SELECT 1
          FROM public.user_school_permissions p
          WHERE p.user_id = u.user_id
            AND p.school_id = p_school_id
            AND p.permission_key = 'hr.manage'
        )
      )
  );
$function$
;

CREATE OR REPLACE FUNCTION public.hr_user_can_payroll(p_school_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.user_id = (SELECT auth.uid())
      AND u.school_id = p_school_id
      AND (
        u.role IN ('admin', 'owner', 'head_teacher')
        OR EXISTS (
          SELECT 1
          FROM public.user_school_permissions p
          WHERE p.user_id = u.user_id
            AND p.school_id = p_school_id
            AND p.permission_key IN ('hr.payroll', 'hr.manage')
        )
      )
  );
$function$
;

CREATE OR REPLACE FUNCTION public.initialize_student_balances_for_term(p_school_id uuid, p_term_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_year INTEGER;
    v_term INTEGER;
BEGIN
    SELECT st.year, st.term INTO v_year, v_term
    FROM public.school_terms st
    WHERE st.id = p_term_id;

    IF v_year IS NULL OR v_term IS NULL THEN
        RAISE EXCEPTION 'Term with id % does not exist', p_term_id;
    END IF;

    -- All non-graduated students (active, inactive, promoted) get a balance for this term
    INSERT INTO public.student_balances (
        student_id,
        school_id,
        term_id,
        year,
        term,
        total_fees,
        total_paid
    )
    SELECT
        s.student_id,
        s.school_id,
        p_term_id,
        v_year,
        v_term,
        COALESCE(s.expected_fee_amount, 0),
        0
    FROM public.students s
    WHERE s.school_id = p_school_id
      AND (s.status IS NULL OR s.status IS DISTINCT FROM 'graduated')
      AND NOT EXISTS (
          SELECT 1 FROM public.student_balances sb
          WHERE sb.student_id = s.student_id
            AND sb.term_id = p_term_id
      )
    ON CONFLICT (student_id, term_id) DO NOTHING;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.insert_default_exam_sets(p_school_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    -- Insert Mid Term exam set if it doesn't exist
    INSERT INTO exam_sets (school_id, name, description, year, term, sort_order, is_active, created_at, updated_at)
    SELECT 
        p_school_id,
        'Mid Term',
        'Mid Term Examination',
        EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
        1, -- Term 1
        1, -- First in sort order
        true,
        NOW(),
        NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM exam_sets 
        WHERE school_id = p_school_id 
        AND name = 'Mid Term' 
        AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
    );

    -- Insert End of Term exam set if it doesn't exist
    INSERT INTO exam_sets (school_id, name, description, year, term, sort_order, is_active, created_at, updated_at)
    SELECT 
        p_school_id,
        'End of Term',
        'End of Term Examination',
        EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
        1, -- Term 1
        2, -- Second in sort order
        true,
        NOW(),
        NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM exam_sets 
        WHERE school_id = p_school_id 
        AND name = 'End of Term' 
        AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.insert_default_exam_sets_all_terms(p_school_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_school_type text;
  v_current_year integer;
  v_sec_year integer;
BEGIN
  SELECT type INTO v_school_type
  FROM public.schools
  WHERE school_id = p_school_id;

  IF v_school_type IS NULL THEN
    RAISE EXCEPTION 'School with id % does not exist', p_school_id;
  END IF;

  v_current_year := EXTRACT(YEAR FROM CURRENT_DATE)::int;

  IF v_school_type = 'Nursery/Primary' OR v_school_type = 'Primary' THEN
    INSERT INTO public.exam_sets (school_id, name, term, year, is_active, created_at, updated_at)
    SELECT
      p_school_id,
      exam_name,
      term_number,
      v_current_year,
      true,
      NOW(),
      NOW()
    FROM (
      VALUES
        ('Mid Term', 1),
        ('End of Term', 1),
        ('Mid Term', 2),
        ('End of Term', 2),
        ('Mid Term', 3),
        ('End of Term', 3)
    ) AS exam_types(exam_name, term_number)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.exam_sets es
      WHERE es.school_id = p_school_id
        AND es.name = exam_types.exam_name
        AND es.term = exam_types.term_number
        AND es.year = v_current_year
    );
  ELSIF v_school_type = 'Secondary' THEN
    SELECT g.year INTO v_sec_year
    FROM public.global_calendar_year_term(CURRENT_DATE::date) g
    LIMIT 1;
    v_sec_year := COALESCE(v_sec_year, v_current_year);

    INSERT INTO public.exam_sets (school_id, name, term, year, is_active, created_at, updated_at)
    SELECT
      p_school_id,
      exam_name,
      term_number,
      v_sec_year,
      true,
      NOW(),
      NOW()
    FROM (
      VALUES
        ('Beginning of Term', 1),
        ('Mid Term', 1),
        ('End of Term', 1),
        ('Beginning of Term', 2),
        ('Mid Term', 2),
        ('End of Term', 2),
        ('Beginning of Term', 3),
        ('Mid Term', 3),
        ('End of Term', 3)
    ) AS exam_types(exam_name, term_number)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.exam_sets es
      WHERE es.school_id = p_school_id
        AND es.name = exam_types.exam_name
        AND es.term = exam_types.term_number
        AND es.year = v_sec_year
    );
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.insert_default_exam_sets_all_terms_all_schools()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
    school_record RECORD;
BEGIN
    -- Loop through all schools and insert default exam sets for all terms
    FOR school_record IN 
        SELECT school_id FROM schools
    LOOP
        PERFORM insert_default_exam_sets_all_terms(school_record.school_id);
    END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.insert_default_exam_sets_for_all_schools()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
    school_record RECORD;
BEGIN
    -- Loop through all schools and insert default exam sets
    FOR school_record IN 
        SELECT school_id FROM schools
    LOOP
        PERFORM insert_default_exam_sets(school_record.school_id);
    END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.insert_default_exam_sets_for_term(p_school_id uuid, p_term integer)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    -- Insert Mid Term exam set for the specific term
    INSERT INTO exam_sets (school_id, name, description, year, term, sort_order, is_active, created_at, updated_at)
    SELECT 
        p_school_id,
        'Mid Term',
        'Mid Term Examination - Term ' || p_term,
        EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
        p_term,
        1, -- First in sort order for this term
        true,
        NOW(),
        NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM exam_sets 
        WHERE school_id = p_school_id 
        AND name = 'Mid Term' 
        AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
        AND term = p_term
    );

    -- Insert End of Term exam set for the specific term
    INSERT INTO exam_sets (school_id, name, description, year, term, sort_order, is_active, created_at, updated_at)
    SELECT 
        p_school_id,
        'End of Term',
        'End of Term Examination - Term ' || p_term,
        EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER,
        p_term,
        2, -- Second in sort order for this term
        true,
        NOW(),
        NOW()
    WHERE NOT EXISTS (
        SELECT 1 FROM exam_sets 
        WHERE school_id = p_school_id 
        AND name = 'End of Term' 
        AND year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER
        AND term = p_term
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.insert_default_middle_top_class_subjects(p_school_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Insert all 6 default middle class and top class subjects
    INSERT INTO subjects (school_id, name, description, created_at) VALUES 
    (p_school_id, 'Language Development I', 'Basic language development skills', NOW()),
    (p_school_id, 'Language Development II', 'Advanced language development skills', NOW()),
    (p_school_id, 'Numbers', 'Number recognition and basic mathematics', NOW()),
    (p_school_id, 'Health Habits', 'Health and hygiene habits development', NOW()),
    (p_school_id, 'Social Development', 'Social skills and interaction development', NOW()),
    (p_school_id, 'Writing', 'Basic writing skills and penmanship', NOW());
    
    -- Log the successful insertion
    RAISE NOTICE 'Successfully inserted 6 default middle/top class subjects for school %', p_school_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.insert_default_nursery_subjects(p_school_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Insert all 23 default nursery subjects (only using existing columns)
    INSERT INTO subjects (school_id, name, description, created_at) VALUES 
    (p_school_id, 'Toilet Care', 'Basic toilet care and hygiene skills', NOW()),
    (p_school_id, 'Nose Care', 'Basic nose care and hygiene skills', NOW()),
    (p_school_id, 'Alphabet', 'Introduction to alphabet letters', NOW()),
    (p_school_id, 'Recognition of Letters', 'Letter recognition and identification', NOW()),
    (p_school_id, 'Recognition of Numbers', 'Number recognition and identification', NOW()),
    (p_school_id, 'Recognition of Shapes', 'Shape recognition and identification', NOW()),
    (p_school_id, 'Colours', 'Color recognition and identification', NOW()),
    (p_school_id, 'Counting', 'Basic counting skills', NOW()),
    (p_school_id, 'Number Sequence', 'Understanding number sequences', NOW()),
    (p_school_id, 'Handling of Pencil', 'Basic pencil handling and grip', NOW()),
    (p_school_id, 'Shading', 'Basic shading techniques', NOW()),
    (p_school_id, 'Drawing', 'Basic drawing skills', NOW()),
    (p_school_id, 'Re-sighting', 'Recognition and sight reading', NOW()),
    (p_school_id, 'Poems', 'Poetry and recitation skills', NOW()),
    (p_school_id, 'Attention Span', 'Developing attention and focus', NOW()),
    (p_school_id, 'Punctuality', 'Time management and punctuality', NOW()),
    (p_school_id, 'Arrival Time', 'Understanding arrival and departure times', NOW()),
    (p_school_id, 'Respect', 'Respect for others and authority', NOW()),
    (p_school_id, 'Love or Interest', 'Developing love and interest in learning', NOW()),
    (p_school_id, 'Sharing', 'Sharing and cooperation skills', NOW()),
    (p_school_id, 'Friendship', 'Building friendships and social skills', NOW()),
    (p_school_id, 'Emotional', 'Emotional development and regulation', NOW()),
    (p_school_id, 'Smartness', 'General intelligence and problem-solving', NOW());
    
    -- Log the successful insertion
    RAISE NOTICE 'Successfully inserted 23 default nursery subjects for school %', p_school_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.insert_default_primary_1_3_subjects(p_school_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Insert all 7 default primary 1-3 subjects
    INSERT INTO subjects (school_id, name, description, created_at) VALUES 
    (p_school_id, 'English', 'English language and communication', NOW()),
    (p_school_id, 'Mathematics', 'Basic mathematics and numeracy', NOW()),
    (p_school_id, 'Literacy I', 'Primary literacy skills development', NOW()),
    (p_school_id, 'Literacy II', 'Advanced literacy skills development', NOW()),
    (p_school_id, 'Reading', 'Reading comprehension and fluency', NOW()),
    (p_school_id, 'Luganda', 'Luganda language and culture', NOW()),
    (p_school_id, 'Religious Education (R.E)', 'Religious education and moral values', NOW());
    
    -- Log the successful insertion
    RAISE NOTICE 'Successfully inserted 7 default primary 1-3 subjects for school %', p_school_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.insert_default_primary_4_7_subjects(p_school_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Insert only the new subjects that don't already exist
    INSERT INTO subjects (school_id, name, description, created_at) 
    SELECT p_school_id, 'Science', 'Science and scientific thinking', NOW()
    WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE school_id = p_school_id AND name = 'Science');
    
    INSERT INTO subjects (school_id, name, description, created_at) 
    SELECT p_school_id, 'Social Studies (S.S.T)', 'Social studies and cultural awareness', NOW()
    WHERE NOT EXISTS (SELECT 1 FROM subjects WHERE school_id = p_school_id AND name = 'Social Studies (S.S.T)');
    
    -- Log the successful insertion
    RAISE NOTICE 'Successfully inserted new primary 4-7 subjects for school %', p_school_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.insert_pdf_render_session(p_read_token text, p_payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ DECLARE v_school uuid; v_id uuid; BEGIN SELECT u.school_id INTO v_school FROM public.users u WHERE u.user_id = (SELECT auth.uid()) AND u.school_id IS NOT NULL LIMIT 1; IF v_school IS NULL THEN RAISE EXCEPTION 'No school context for this account'; END IF; INSERT INTO public.pdf_render_sessions (school_id, read_token, payload) VALUES (v_school, p_read_token, p_payload) RETURNING id INTO v_id; RETURN v_id; END; $function$
;

CREATE OR REPLACE FUNCTION public.insert_school_notification_grading_settings(p_school_id uuid, p_actor_id uuid, p_title text, p_message text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  has_user_type boolean;
  has_is_read boolean;
  has_read boolean;
  ut_val text;
BEGIN
  IF p_school_id IS NULL OR p_actor_id IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'user_type'
  ) INTO has_user_type;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'is_read'
  ) INTO has_is_read;
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'notifications' AND column_name = 'read'
  ) INTO has_read;

  ut_val := public.grading_settings_notification_user_type(p_actor_id);

  IF has_user_type THEN
    IF has_read THEN
      INSERT INTO public.notifications (school_id, user_id, user_type, type, title, message, read)
      VALUES (p_school_id, p_actor_id, ut_val, 'info', p_title, p_message, false);
    ELSIF has_is_read THEN
      INSERT INTO public.notifications (school_id, user_id, user_type, type, title, message, is_read)
      VALUES (p_school_id, p_actor_id, ut_val, 'info', p_title, p_message, false);
    ELSE
      INSERT INTO public.notifications (school_id, user_id, user_type, type, title, message)
      VALUES (p_school_id, p_actor_id, ut_val, 'info', p_title, p_message);
    END IF;
  ELSE
    IF has_read THEN
      INSERT INTO public.notifications (school_id, user_id, type, title, message, read)
      VALUES (p_school_id, p_actor_id, 'info', p_title, p_message, false);
    ELSIF has_is_read THEN
      INSERT INTO public.notifications (school_id, user_id, type, title, message, is_read)
      VALUES (p_school_id, p_actor_id, 'info', p_title, p_message, false);
    ELSE
      INSERT INTO public.notifications (school_id, user_id, type, title, message)
      VALUES (p_school_id, p_actor_id, 'info', p_title, p_message);
    END IF;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.insert_user_with_school(p_user_id uuid, p_email text, p_name text, p_role text, p_school_id uuid, p_phone text DEFAULT NULL::text, p_department text DEFAULT NULL::text, p_position text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.is_current_user_owner()
 RETURNS boolean
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.users 
    WHERE user_id = auth.uid() 
    AND role = 'owner'
    AND is_active = true
  );
$function$
;

CREATE OR REPLACE FUNCTION public.is_owner()
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users 
        WHERE user_id = auth.uid() 
        AND role = 'owner'
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.is_snapshot_locked(p_snapshot_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_status TEXT;
BEGIN
  SELECT status INTO v_status
  FROM report_snapshots
  WHERE id = p_snapshot_id;
  RETURN v_status IN ('locked', 'generated');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.link_subjects_to_classes(p_school_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Link nursery subjects to nursery class
    INSERT INTO class_subjects (school_id, class_name, subject, created_at)
    SELECT p_school_id, 'Nursery', s.name, NOW()
    FROM subjects s
    WHERE s.school_id = p_school_id
    AND s.name IN ('Toilet Care', 'Nose Care', 'Alphabet', 'Recognition of Letters', 'Recognition of Numbers', 'Recognition of Shapes', 'Colours', 'Counting', 'Number Sequence', 'Handling of Pencil', 'Shading', 'Drawing', 'Re-sighting', 'Poems', 'Attention Span', 'Punctuality', 'Arrival Time', 'Respect', 'Love or Interest', 'Sharing', 'Friendship', 'Emotional', 'Smartness');
    
    -- Link middle/top class subjects to middle/top classes
    INSERT INTO class_subjects (school_id, class_name, subject, created_at)
    SELECT p_school_id, 'Middle Class', s.name, NOW()
    FROM subjects s
    WHERE s.school_id = p_school_id
    AND s.name IN ('Language Development I', 'Language Development II', 'Numbers', 'Health Habits', 'Social Development', 'Writing');
    
    INSERT INTO class_subjects (school_id, class_name, subject, created_at)
    SELECT p_school_id, 'Top Class', s.name, NOW()
    FROM subjects s
    WHERE s.school_id = p_school_id
    AND s.name IN ('Language Development I', 'Language Development II', 'Numbers', 'Health Habits', 'Social Development', 'Writing');
    
    -- Link primary 1-3 subjects to primary 1-3 classes
    INSERT INTO class_subjects (school_id, class_name, subject, created_at)
    SELECT p_school_id, 'Primary 1', s.name, NOW()
    FROM subjects s
    WHERE s.school_id = p_school_id
    AND s.name IN ('English', 'Mathematics', 'Literacy I', 'Literacy II', 'Reading', 'Luganda', 'Religious Education (R.E)');
    
    INSERT INTO class_subjects (school_id, class_name, subject, created_at)
    SELECT p_school_id, 'Primary 2', s.name, NOW()
    FROM subjects s
    WHERE s.school_id = p_school_id
    AND s.name IN ('English', 'Mathematics', 'Literacy I', 'Literacy II', 'Reading', 'Luganda', 'Religious Education (R.E)');
    
    INSERT INTO class_subjects (school_id, class_name, subject, created_at)
    SELECT p_school_id, 'Primary 3', s.name, NOW()
    FROM subjects s
    WHERE s.school_id = p_school_id
    AND s.name IN ('English', 'Mathematics', 'Literacy I', 'Literacy II', 'Reading', 'Luganda', 'Religious Education (R.E)');
    
    -- Link primary 4-7 subjects to primary 4-7 classes
    INSERT INTO class_subjects (school_id, class_name, subject, created_at)
    SELECT p_school_id, 'Primary 4', s.name, NOW()
    FROM subjects s
    WHERE s.school_id = p_school_id
    AND s.name IN ('English', 'Mathematics', 'Science', 'Social Studies (S.S.T)');
    
    INSERT INTO class_subjects (school_id, class_name, subject, created_at)
    SELECT p_school_id, 'Primary 5', s.name, NOW()
    FROM subjects s
    WHERE s.school_id = p_school_id
    AND s.name IN ('English', 'Mathematics', 'Science', 'Social Studies (S.S.T)');
    
    INSERT INTO class_subjects (school_id, class_name, subject, created_at)
    SELECT p_school_id, 'Primary 6', s.name, NOW()
    FROM subjects s
    WHERE s.school_id = p_school_id
    AND s.name IN ('English', 'Mathematics', 'Science', 'Social Studies (S.S.T)');
    
    INSERT INTO class_subjects (school_id, class_name, subject, created_at)
    SELECT p_school_id, 'Primary 7', s.name, NOW()
    FROM subjects s
    WHERE s.school_id = p_school_id
    AND s.name IN ('English', 'Mathematics', 'Science', 'Social Studies (S.S.T)');
    
    -- Log the successful linking
    RAISE NOTICE 'Successfully linked all subjects to their appropriate classes for school %', p_school_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.lock_report_snapshot(p_snapshot_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ DECLARE v_uid uuid := auth.uid(); v_school_id uuid; v_user_school uuid; BEGIN IF v_uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF; SELECT school_id INTO v_school_id FROM public.report_snapshots WHERE id = p_snapshot_id; IF v_school_id IS NULL THEN RAISE EXCEPTION 'Snapshot not found or already locked'; END IF; SELECT u.school_id INTO v_user_school FROM public.users u WHERE u.user_id = v_uid; IF v_user_school IS DISTINCT FROM v_school_id THEN RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501'; END IF; UPDATE public.report_snapshots SET status = 'locked', locked_at = NOW() WHERE id = p_snapshot_id AND status = 'draft'; IF NOT FOUND THEN RAISE EXCEPTION 'Snapshot not found or already locked'; END IF; END; $function$
;

CREATE OR REPLACE FUNCTION public.mark_requirements_as_paid(p_student_id uuid, p_payment_amount numeric)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSON;
    v_remaining_payment DECIMAL(10,2) := p_payment_amount;
    v_updated_requirements INTEGER := 0;
    v_requirement_record RECORD;
BEGIN
    -- Process requirements in order of cost (smallest first)
    FOR v_requirement_record IN 
        SELECT id, cost, requirement_name
        FROM student_requirements
        WHERE student_id = p_student_id
        AND status = 'Pending'
        ORDER BY cost ASC
    LOOP
        -- If we have enough payment to cover this requirement
        IF v_remaining_payment >= v_requirement_record.cost THEN
            -- Mark requirement as paid
            UPDATE student_requirements
            SET status = 'Paid', updated_at = NOW()
            WHERE id = v_requirement_record.id;
            
            -- Reduce remaining payment
            v_remaining_payment := v_remaining_payment - v_requirement_record.cost;
            v_updated_requirements := v_updated_requirements + 1;
        ELSE
            -- Not enough payment to cover this requirement
            EXIT;
        END IF;
    END LOOP;
    
    -- Build result
    v_result := json_build_object(
        'student_id', p_student_id,
        'payment_applied', p_payment_amount - v_remaining_payment,
        'requirements_paid', v_updated_requirements,
        'remaining_payment', v_remaining_payment
    );
    
    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.merge_duplicate_future_invoices_into_current(p_school_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(school_id_out uuid, school_name_out text, current_term_id uuid, invoices_merged bigint, future_invoices_deleted bigint, future_balances_deleted bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r_school RECORD;
  v_cur UUID;
  v_future UUID[];
  v_cy INT;
  v_ct INT;
  v_today DATE := CURRENT_DATE;
  v_merge BIGINT;
  v_inv_del BIGINT;
  v_bal_del BIGINT;
BEGIN
  FOR r_school IN
    SELECT s.school_id, s.name::TEXT AS school_name
    FROM public.schools s
    WHERE p_school_id IS NULL OR s.school_id = p_school_id
  LOOP
    school_id_out := r_school.school_id;
    school_name_out := r_school.school_name;
    v_merge := 0;
    v_inv_del := 0;
    v_bal_del := 0;

    v_cur := public.resolve_current_school_term_id(r_school.school_id, v_today);

    IF v_cur IS NULL THEN
      current_term_id := NULL;
      invoices_merged := 0;
      future_invoices_deleted := 0;
      future_balances_deleted := 0;
      RETURN NEXT;
      CONTINUE;
    END IF;

    SELECT st.year, st.term INTO v_cy, v_ct
    FROM public.school_terms st
    WHERE st.id = v_cur;

    SELECT ARRAY_AGG(st.id ORDER BY st.year, st.term)
    INTO v_future
    FROM public.school_terms st
    WHERE st.school_id = r_school.school_id
      AND (
        st.year > v_cy
        OR (st.year = v_cy AND st.term > v_ct)
      );

    current_term_id := v_cur;

    IF v_future IS NULL OR cardinality(v_future) = 0 THEN
      invoices_merged := 0;
      future_invoices_deleted := 0;
      future_balances_deleted := 0;
      RETURN NEXT;
      CONTINUE;
    END IF;

    -- 1) Add all future-term invoice totals (main + supplementary) onto current main invoice
    WITH upd AS (
      UPDATE public.student_invoices cur
      SET
        total_amount = cur.total_amount + sub.add_amt,
        updated_at = NOW()
      FROM (
        SELECT
          si.student_id,
          SUM(COALESCE(si.total_amount, 0)) AS add_amt
        FROM public.student_invoices si
        WHERE si.school_id = r_school.school_id
          AND si.term_id = ANY (v_future)
          AND COALESCE(si.status, '') IS DISTINCT FROM 'cancelled'
        GROUP BY si.student_id
      ) sub
      WHERE cur.school_id = r_school.school_id
        AND cur.term_id = v_cur
        AND cur.student_id = sub.student_id
        AND COALESCE(cur.is_supplementary, false) = false
        AND EXISTS (
          SELECT 1
          FROM public.student_invoices o
          WHERE o.school_id = r_school.school_id
            AND o.student_id = sub.student_id
            AND o.term_id = ANY (v_future)
        )
      RETURNING cur.invoice_id
    )
    SELECT COUNT(*)::BIGINT INTO v_merge FROM upd;

    -- 2) Delete future-term invoices only when student already has current-term coverage
    DELETE FROM public.student_invoices si
    WHERE si.school_id = r_school.school_id
      AND si.term_id = ANY (v_future)
      AND EXISTS (
        SELECT 1
        FROM public.student_invoices o
        WHERE o.school_id = si.school_id
          AND o.student_id = si.student_id
          AND o.term_id = v_cur
          AND COALESCE(o.is_supplementary, false) = false
          AND o.invoice_id IS DISTINCT FROM si.invoice_id
      );
    GET DIAGNOSTICS v_inv_del = ROW_COUNT;

    -- 3) Drop future-term balance rows when a current-term balance exists (ledger duplicate)
    DELETE FROM public.student_balances sb
    WHERE sb.school_id = r_school.school_id
      AND sb.term_id = ANY (v_future)
      AND EXISTS (
        SELECT 1
        FROM public.student_balances o
        WHERE o.school_id = sb.school_id
          AND o.student_id = sb.student_id
          AND o.term_id = v_cur
          AND o.balance_id IS DISTINCT FROM sb.balance_id
      );
    GET DIAGNOSTICS v_bal_del = ROW_COUNT;

    -- 4) Reconcile current term for students touched
    PERFORM public.reconcile_term_invoice_payments(s.student_id, v_cur)
    FROM (
      SELECT DISTINCT si.student_id
      FROM public.student_invoices si
      WHERE si.school_id = r_school.school_id
        AND si.term_id = v_cur
    ) s;

    invoices_merged := v_merge;
    future_invoices_deleted := v_inv_del;
    future_balances_deleted := v_bal_del;
    RETURN NEXT;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.next_employee_id_for_school(school_id_param uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$ DECLARE school_name text; school_code text; current_year text; prefix text; prefix_len integer; max_serial integer; serial_number text; next_id text; BEGIN PERFORM pg_advisory_xact_lock(0, hashtext(school_id_param::text)); SELECT name INTO school_name FROM public.schools WHERE school_id = school_id_param; IF school_name IS NULL THEN RAISE EXCEPTION 'School not found for ID: %', school_id_param; END IF; school_code := public.generate_school_code(school_name); current_year := to_char(CURRENT_DATE, 'YY'); prefix := school_code || current_year; prefix_len := length(prefix); SELECT COALESCE(MAX(ser), 0) INTO max_serial FROM (SELECT CASE WHEN t.employee_id LIKE prefix || '%' AND substring(t.employee_id FROM prefix_len + 1) ~ '^[0-9]+$' THEN CAST(substring(t.employee_id FROM prefix_len + 1) AS integer) WHEN t.employee_id ~ ('^' || school_code || '-' || current_year || '-[0-9]+$') THEN CAST(substring(t.employee_id FROM '([0-9]+)$') AS integer) ELSE 0 END AS ser FROM public.teachers t WHERE t.school_id = school_id_param UNION ALL SELECT CASE WHEN u.employee_id LIKE prefix || '%' AND substring(u.employee_id FROM prefix_len + 1) ~ '^[0-9]+$' THEN CAST(substring(u.employee_id FROM prefix_len + 1) AS integer) WHEN u.employee_id ~ ('^' || school_code || '-' || current_year || '-[0-9]+$') THEN CAST(substring(u.employee_id FROM '([0-9]+)$') AS integer) ELSE 0 END AS ser FROM public.users u WHERE u.school_id = school_id_param AND u.employee_id IS NOT NULL AND TRIM(u.employee_id) <> '') x; serial_number := lpad((max_serial + 1)::text, GREATEST(3, length((max_serial + 1)::text)), '0'); next_id := prefix || serial_number; RETURN next_id; END; $function$
;

CREATE OR REPLACE FUNCTION public.normalize_pre_primary_grade_token(p_raw text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT CASE upper(replace(btrim(p_raw), ' ', '_'))
    WHEN 'VERY_GOOD' THEN 'VERY_GOOD'
    WHEN 'GOOD' THEN 'GOOD'
    WHEN 'NEEDS_IMPROVEMENT' THEN 'NEEDS_IMPROVEMENT'
    WHEN 'TRIES' THEN 'TRIES'
    ELSE NULL
  END;
$function$
;

CREATE OR REPLACE FUNCTION public.normalize_subject_name(p_subject text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select nullif(regexp_replace(trim(coalesce(p_subject, '')), '\\s+', ' ', 'g'), '');
$function$
;

CREATE OR REPLACE FUNCTION public.normalize_subject_text(p_subject text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$
  select regexp_replace(trim(coalesce(p_subject, '')), '\s+', ' ', 'g');
$function$
;

CREATE OR REPLACE FUNCTION public.notify_owner_dashboard_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Notify owner dashboard of data changes
  PERFORM pg_notify('owner_dashboard_update', json_build_object(
    'table', TG_TABLE_NAME,
    'operation', TG_OP,
    'timestamp', NOW(),
    'school_id', COALESCE(NEW.school_id, OLD.school_id),
    'affected_metrics', CASE TG_TABLE_NAME
      WHEN 'schools' THEN '["total_schools", "active_schools"]'
      WHEN 'users' THEN '["total_users", "active_sessions"]'
      WHEN 'payments' THEN '["monthly_revenue", "current_month_payments"]'
      WHEN 'school_subscriptions' THEN '["monthly_revenue", "subscription_revenue"]'
      ELSE '["general"]'
    END
  )::text);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_school_staff_grading_settings_change(p_school_id uuid, p_actor_id uuid, p_title text, p_body text, p_category text, p_metadata jsonb, p_class_name text DEFAULT NULL::text, p_subject text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
BEGIN
  IF p_school_id IS NULL OR p_actor_id IS NULL THEN
    RETURN;
  END IF;

  PERFORM public.insert_school_notification_grading_settings(p_school_id, p_actor_id, p_title, p_body);

  FOR r IN
    SELECT DISTINCT q.user_id
    FROM (
      SELECT u.user_id
      FROM public.users u
      WHERE u.school_id = p_school_id
        AND u.role IN ('admin', 'owner', 'head_teacher', 'accountant')
        AND COALESCE(u.is_active, TRUE)
      UNION
      SELECT u.user_id
      FROM public.teacher_class_subjects tcs
      INNER JOIN public.users u
        ON u.linked_teacher_id = tcs.teacher_id
        AND u.school_id = tcs.school_id
      WHERE tcs.school_id = p_school_id
        AND p_class_name IS NOT NULL
        AND tcs.class_name = p_class_name
        AND (p_subject IS NULL OR tcs.subject = p_subject)
        AND u.linked_teacher_id IS NOT NULL
        AND COALESCE(u.is_active, TRUE)
    ) AS q
    WHERE q.user_id IS DISTINCT FROM p_actor_id
  LOOP
    INSERT INTO public.user_in_app_notifications (school_id, user_id, title, body, category, metadata)
    VALUES (
      p_school_id,
      r.user_id,
      p_title,
      p_body,
      p_category,
      COALESCE(p_metadata, '{}'::jsonb)
    );
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.notify_school_staff_new_student()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r RECORD;
  v_title TEXT;
  v_body TEXT;
BEGIN
  v_title := 'New student enrolled';
  v_body := COALESCE(NEW.name, 'A student') || ' was added to the school.';

  FOR r IN
    SELECT u.user_id
    FROM public.users u
    WHERE u.school_id = NEW.school_id
      AND u.role IN ('admin', 'owner', 'head_teacher', 'accountant')
      AND COALESCE(u.is_active, TRUE)
  LOOP
    INSERT INTO public.user_in_app_notifications (school_id, user_id, title, body, category, metadata)
    VALUES (
      NEW.school_id,
      r.user_id,
      v_title,
      v_body,
      'students',
      jsonb_build_object('student_id', NEW.student_id, 'type', 'student_created')
    );
  END LOOP;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.olevel_class_senior_band(class_name text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (regexp_match(trim(both from COALESCE(class_name, '')), '^senior\s*([1-4])(?:\s|$)', 'i'))[1]::integer,
    (regexp_match(trim(both from COALESCE(class_name, '')), '^s\.?\s*([1-4])(?:\s|$)', 'i'))[1]::integer
  );
$function$
;

CREATE OR REPLACE FUNCTION public.owner_restore_soft_deleted_student(p_student_id uuid, p_notes text DEFAULT ''::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid UUID := (SELECT auth.uid());
  v_role_norm TEXT;
  v_school UUID;
  v_student_school UUID;
  v_rid UUID;
  v_notes TEXT;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  SELECT u.school_id, lower(regexp_replace(trim(COALESCE(u.role, '')), '\s+', '_', 'g'))
    INTO v_school, v_role_norm
  FROM public.users u
  WHERE u.user_id = v_uid
  LIMIT 1;
  IF v_role_norm IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'only owner may restore';
  END IF;
  IF v_school IS NULL THEN
    RAISE EXCEPTION 'no school';
  END IF;

  SELECT s.school_id INTO v_student_school FROM public.students s WHERE s.student_id = p_student_id LIMIT 1;
  IF v_student_school IS NULL THEN
    RAISE EXCEPTION 'student not found';
  END IF;
  IF v_student_school IS DISTINCT FROM v_school THEN
    RAISE EXCEPTION 'student not in your school';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.students s WHERE s.student_id = p_student_id AND s.deleted_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'student is not archived';
  END IF;

  v_notes := COALESCE(NULLIF(trim(p_notes), ''), 'Restored by owner');

  UPDATE public.students
  SET deleted_at = NULL
  WHERE student_id = p_student_id;

  INSERT INTO public.discipline_records (
    school_id,
    student_id,
    recorded_by,
    notes,
    action_type,
    suspension_start_date,
    suspension_end_date
  )
  VALUES (
    v_student_school,
    p_student_id,
    v_uid,
    v_notes,
    'restoration',
    NULL,
    NULL
  )
  RETURNING record_id INTO v_rid;

  RETURN v_rid;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.patch_published_reports_for_students(p_school_id uuid, p_class_id uuid, p_term integer, p_year integer, p_exam_set_id uuid, p_student_rows jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
DECLARE
  v_row jsonb;
  v_sid uuid;
  v_path text;
  v_expected text;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT public.published_reports_user_is_school_staff(p_school_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_student_rows IS NULL OR jsonb_typeof(p_student_rows) <> 'array' THEN
    RAISE EXCEPTION 'p_student_rows must be a JSON array';
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_student_rows)
  LOOP
    v_sid := NULLIF(trim(v_row->> 'student_id'), '')::uuid;
    v_path := NULLIF(trim(v_row->> 'storage_object_path'), '');
    IF v_sid IS NULL OR v_path IS NULL OR v_path = '' THEN
      RAISE EXCEPTION 'each row needs student_id and storage_object_path';
    END IF;
    v_expected := format(
      'reports/%s/%s/%s_%s/%s/students/%s.pdf',
      p_school_id,
      p_class_id,
      p_term,
      p_year,
      p_exam_set_id,
      v_sid
    );
    IF v_path <> v_expected THEN
      RAISE EXCEPTION 'invalid storage path for student %', v_sid;
    END IF;
  END LOOP;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_student_rows)
  LOOP
    v_sid := NULLIF(trim(v_row->> 'student_id'), '')::uuid;
    DELETE FROM public.published_student_reports
    WHERE school_id = p_school_id
      AND class_id = p_class_id
      AND term = p_term
      AND year = p_year
      AND exam_set_id = p_exam_set_id
      AND student_id = v_sid;
  END LOOP;

  INSERT INTO public.published_student_reports (
    school_id,
    class_id,
    term,
    year,
    exam_set_id,
    student_id,
    storage_bucket,
    storage_object_path,
    published_by
  )
  SELECT
    p_school_id,
    p_class_id,
    p_term,
    p_year,
    p_exam_set_id,
    NULLIF(trim(elem->> 'student_id'), '')::uuid,
    'published-reports',
    NULLIF(trim(elem->> 'storage_object_path'), ''),
    v_uid
  FROM jsonb_array_elements(p_student_rows) AS elem;

  DELETE FROM public.published_class_report_bundles
  WHERE school_id = p_school_id
    AND class_id = p_class_id
    AND term = p_term
    AND year = p_year
    AND exam_set_id = p_exam_set_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.primary_grade_from_percentage(p_percentage numeric)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT CASE
    WHEN p_percentage IS NULL THEN NULL
    WHEN p_percentage >= 90 THEN 1
    WHEN p_percentage >= 80 THEN 2
    WHEN p_percentage >= 70 THEN 3
    WHEN p_percentage >= 60 THEN 4
    WHEN p_percentage >= 50 THEN 5
    WHEN p_percentage >= 40 THEN 6
    WHEN p_percentage >= 30 THEN 7
    WHEN p_percentage >= 20 THEN 8
    ELSE 9
  END;
$function$
;

CREATE OR REPLACE FUNCTION public.proc_results_after_update_class_comment()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_school_id uuid;
  v_student_id uuid;
  v_exam_set_id uuid;
  v_class_name text;
  v_class_comment text;
  v_head_comment text;
begin
  v_school_id := COALESCE(NEW.school_id, OLD.school_id);
  v_student_id := COALESCE(NEW.student_id, OLD.student_id);
  v_exam_set_id := COALESCE(NEW.exam_set_id, OLD.exam_set_id);
  v_class_name := COALESCE(NEW.class_name, OLD.class_name);

  select x.class_teacher_comment, x.headteacher_comment
  into v_class_comment, v_head_comment
  from public.resolve_processed_comments(v_school_id, v_student_id, v_exam_set_id, v_class_name) x;

  update public.processed_primary_exam_results p
  set class_teacher_comment = coalesce(v_class_comment, p.class_teacher_comment, ''),
      headteacher_comment = coalesce(v_head_comment, p.headteacher_comment, '')
  where p.school_id = v_school_id
    and p.student_id = v_student_id
    and p.exam_set_id = v_exam_set_id
    and p.class_name = v_class_name;

  return null;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.proc_results_before_fill_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v_exam_name text;
  v_initials text;
BEGIN
  -- Derive exam_type from exam_sets.name
  SELECT es.name INTO v_exam_name
  FROM public.exam_sets es
  WHERE es.id = NEW.exam_set_id
  LIMIT 1;

  IF NEW.exam_type IS NULL OR NEW.exam_type = '' THEN
    IF v_exam_name IS NOT NULL THEN
      IF lower(v_exam_name) LIKE '%mid%' THEN
        NEW.exam_type := 'Mid Term';
      ELSIF lower(v_exam_name) LIKE '%end%' THEN
        NEW.exam_type := 'End of Term';
      ELSE
        NEW.exam_type := v_exam_name;
      END IF;
    END IF;
  END IF;

  -- Pull teacher initials from source exam_results if available
  IF (NEW.teacher_initials IS NULL OR NEW.teacher_initials = '') THEN
    SELECT er.teacher_initials
    INTO v_initials
    FROM public.exam_results er
    WHERE er.school_id = NEW.school_id
      AND er.student_id = NEW.student_id
      AND er.exam_set_id = NEW.exam_set_id
      AND er.subject = NEW.subject
    LIMIT 1;

    IF v_initials IS NOT NULL THEN
      NEW.teacher_initials := v_initials;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.process_class_results(p_school_id uuid, p_exam_set_id uuid, p_class_name text)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_student_record RECORD;
  v_processed_count integer := 0;
  v_error_count integer := 0;
BEGIN
  -- Process each student in the class who has results
  FOR v_student_record IN
    SELECT DISTINCT er.student_id
    FROM exam_results er
    WHERE er.school_id = p_school_id
      AND er.exam_set_id = p_exam_set_id
      AND er.class_name = p_class_name
  LOOP
    BEGIN
      -- Process this student
      PERFORM process_exam_results_for_student(
        p_school_id,
        v_student_record.student_id,
        p_exam_set_id
      );
      
      -- Calculate aggregate/division if primary
      IF lower(trim(p_class_name)) ~ '^primary [1-7]$' THEN
        PERFORM calculate_aggregate_and_division(
          p_school_id,
          v_student_record.student_id,
          p_exam_set_id
        );
      END IF;
      
      v_processed_count := v_processed_count + 1;
    EXCEPTION
      WHEN OTHERS THEN
        v_error_count := v_error_count + 1;
    END;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'processed', v_processed_count,
    'errors', v_error_count,
    'message', format('Processed %s students (%s errors)', v_processed_count, v_error_count)
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.process_exam_results_for_student(p_school_id uuid, p_student_id uuid, p_exam_set_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  exam_set_record record;
  student_record record;
  subject_result record;
  teacher_remark text;
  class_teacher_comment text;
  headteacher_comment text;
  student_average numeric;
  v_total_marks numeric;
  v_total_class_subjects integer;
  pct_teacher_remark text;
  holistic_comment text;
  cls_comment text;
  ht_comment text;
  has_nursery_performance boolean;
  worst_enum text;
  worst_skill text;
  is_nursery_class boolean;
  nursery_overall_level text;
  has_any_nursery_data boolean := false;
  
  -- Variables for most frequent rating logic
  v_very_good_count integer := 0;
  v_good_count integer := 0;
  v_needs_improvement_count integer := 0;
  v_tries_count integer := 0;
  v_max_count integer := 0;
  v_rating_value text;
  v_skill_key text;
  v_skill_value text;
begin
  select es.name, es.term, es.year into exam_set_record
  from exam_sets es
  where es.id = p_exam_set_id and es.school_id = p_school_id;

  if not found then
    return;
  end if;

  select name, admission_number, current_class into student_record
  from students
  where student_id = p_student_id and school_id = p_school_id;

  if not found then
    return;
  end if;

  is_nursery_class := lower(trim(student_record.current_class)) in ('baby class','middle class','top class');

  -- Check if student has ANY nursery_skill_performance data
  SELECT EXISTS(
    SELECT 1 
    FROM exam_results er
    WHERE er.student_id = p_student_id
      AND er.exam_set_id = p_exam_set_id
      AND er.school_id = p_school_id
      AND er.nursery_skill_performance IS NOT NULL
      AND er.nursery_skill_performance != '{}'::jsonb
  ) INTO has_any_nursery_data;

  -- FIX: Calculate average correctly by dividing by TOTAL class subjects
  -- Get total marks obtained (treat NULL as 0)
  select coalesce(sum(coalesce(er.marks_obtained, 0)), 0)
  into v_total_marks
  from exam_results er
  where er.student_id = p_student_id
    and er.exam_set_id = p_exam_set_id
    and er.school_id = p_school_id;

  -- Get total number of subjects in the class
  SELECT COUNT(DISTINCT cs.subject)
  INTO v_total_class_subjects
  FROM class_subjects cs
  WHERE cs.school_id = p_school_id
    AND cs.class_name = student_record.current_class;

  -- If no class_subjects defined, count from exam_results
  IF COALESCE(v_total_class_subjects, 0) = 0 THEN
    SELECT COUNT(DISTINCT er.subject)
    INTO v_total_class_subjects
    FROM exam_results er
    WHERE er.school_id = p_school_id
      AND er.exam_set_id = p_exam_set_id
      AND er.student_id = p_student_id;
  END IF;

  -- Calculate average: total marks / total subjects (each subject out of 100)
  student_average := case
    when v_total_class_subjects > 0 then v_total_marks / v_total_class_subjects
    else 0
  end;

  -- Use nursery logic if it's a nursery class AND has nursery performance data
  if is_nursery_class AND has_any_nursery_data then
    -- Count all ratings across all subjects and skills
    FOR subject_result IN
      SELECT er.nursery_skill_performance
      FROM exam_results er
      WHERE er.student_id = p_student_id
        AND er.exam_set_id = p_exam_set_id
        AND er.school_id = p_school_id
        AND er.nursery_skill_performance IS NOT NULL
        AND er.nursery_skill_performance != '{}'::jsonb
    LOOP
      -- Loop through each skill in the performance JSON
      FOR v_skill_key, v_skill_value IN
        SELECT * FROM jsonb_each_text(subject_result.nursery_skill_performance)
      LOOP
        -- Count each rating
        CASE UPPER(TRIM(v_skill_value))
          WHEN 'VERY GOOD' THEN v_very_good_count := v_very_good_count + 1;
          WHEN 'VERY_GOOD' THEN v_very_good_count := v_very_good_count + 1;
          WHEN 'GOOD' THEN v_good_count := v_good_count + 1;
          WHEN 'NEEDS IMPROVEMENT' THEN v_needs_improvement_count := v_needs_improvement_count + 1;
          WHEN 'NEEDS_IMPROVEMENT' THEN v_needs_improvement_count := v_needs_improvement_count + 1;
          WHEN 'TRIES' THEN v_tries_count := v_tries_count + 1;
          ELSE NULL;
        END CASE;
      END LOOP;
    END LOOP;
    
    -- Find the maximum count
    v_max_count := GREATEST(v_very_good_count, v_good_count, v_needs_improvement_count, v_tries_count);
    
    -- Determine the most frequent rating (tie-break by best rating)
    IF v_very_good_count = v_max_count THEN
      nursery_overall_level := 'VERY_GOOD';
    ELSIF v_good_count = v_max_count THEN
      nursery_overall_level := 'GOOD';
    ELSIF v_needs_improvement_count = v_max_count THEN
      nursery_overall_level := 'NEEDS_IMPROVEMENT';
    ELSIF v_tries_count = v_max_count THEN
      nursery_overall_level := 'TRIES';
    ELSE
      nursery_overall_level := NULL;
    END IF;

    if nursery_overall_level is not null then
      select cnc.comment_text into cls_comment
      from public.class_teacher_nursery_comment_settings cnc
      where cnc.school_id = p_school_id
        and cnc.performance_level = nursery_overall_level
      limit 1;
    end if;

    class_teacher_comment := coalesce(
      cls_comment,
      case nursery_overall_level
        when 'VERY_GOOD' then 'A cheerful learner who brings joy and curiosity to our daily activities.'
        when 'GOOD' then 'A sweet learner who shares and plays beautifully with friends.'
        when 'NEEDS_IMPROVEMENT' then 'A gentle learner who is growing daily. More practice will help them blossom!'
        when 'TRIES' then 'Enthusiastic and eager to learn! Puts great effort into daily tasks.'
        else 'Enthusiastic and eager to learn! Puts great effort into daily tasks.'
      end
    );
  else
    -- Use percentage-based comments for primary or nursery old format
    select comment_text into cls_comment
    from class_teacher_comments_settings
    where school_id = p_school_id
      and class_name = student_record.current_class
      and student_average >= min_percent
      and student_average <= max_percent
    order by min_percent desc
    limit 1;

    class_teacher_comment := coalesce(
      cls_comment,
      case
        when student_average >= 81 then 'Excellent performance! Keep up the good work.'
        when student_average >= 61 then 'Good work! Continue to improve.'
        when student_average >= 41 then 'Fair performance. Work harder next time.'
        else 'Needs more effort. Try harder next time.'
      end
    );
  end if;

  if is_nursery_class AND has_any_nursery_data then
    if nursery_overall_level is not null then
      select hnc.comment_text into ht_comment
      from public.headteacher_nursery_comment_settings hnc
      where hnc.school_id = p_school_id
        and hnc.performance_level = nursery_overall_level
      limit 1;
    end if;

    headteacher_comment := coalesce(
      ht_comment,
      case nursery_overall_level
        when 'VERY_GOOD' then 'Wonderful job! Keep shining and bringing joy to our class.'
        when 'GOOD' then 'Well done! We are very proud of your progress.'
        when 'NEEDS_IMPROVEMENT' then 'You are a special part of our class. Let''s keep growing!'
        when 'TRIES' then 'Great effort! Keep trying your best and having fun.'
        else 'Great effort! Keep trying your best and having fun.'
      end
    );
  else
    select comment_text into ht_comment
    from headteacher_comments_settings
    where school_id = p_school_id
      and student_average >= min_percent
      and student_average <= max_percent
    order by min_percent desc
    limit 1;

    headteacher_comment := coalesce(
      ht_comment,
      case
        when student_average >= 81 then 'Excellent work! Your hard work and good behavior make the school proud. Keep it up.'
        when student_average >= 61 then 'Good performance this term. Stay focused, and you will achieve even better results next time.'
        when student_average >= 41 then 'A fair effort. We know you can reach higher grades if you stay consistent and focused.'
        else 'This has been a tough term. With better focus and hard work, there is a good chance to improve.'
      end
    );
  end if;

  for subject_result in
    select
      er.subject,
      er.marks_obtained,
      er.total_marks,
      er.grade,
      er.teacher_initials,
      er.remarks,
      er.nursery_skill_performance
    from exam_results er
    where er.student_id = p_student_id
      and er.exam_set_id = p_exam_set_id
      and er.school_id = p_school_id
  loop
    pct_teacher_remark := null;
    holistic_comment := null;
    worst_skill := null;
    has_nursery_performance := subject_result.nursery_skill_performance is not null
      and subject_result.nursery_skill_performance <> '{}'::jsonb;

    if not has_nursery_performance then
      select trs.comment_text into pct_teacher_remark
      from teacher_remarks_settings trs
      where trs.school_id = p_school_id
        and trs.subject = subject_result.subject
        and trs.holistic_grade_enum is null
        and (subject_result.marks_obtained / nullif(subject_result.total_marks, 0)) * 100 >= trs.min_percent
        and (subject_result.marks_obtained / nullif(subject_result.total_marks, 0)) * 100 <= trs.max_percent
      order by trs.min_percent desc
      limit 1;

      teacher_remark := coalesce(
        pct_teacher_remark,
        case
          when (subject_result.marks_obtained / nullif(subject_result.total_marks, 0)) * 100 >= 81 then 'Excellent! Keep shining!'
          when (subject_result.marks_obtained / nullif(subject_result.total_marks, 0)) * 100 >= 61 then 'Good work. Keep it up!'
          when (subject_result.marks_obtained / nullif(subject_result.total_marks, 0)) * 100 >= 41 then 'Fair work. You can do better.'
          else 'Needs more effort. Try harder next time.'
        end
      );
    else
      worst_enum := public.worst_pre_primary_holistic_grade_from_json(subject_result.nursery_skill_performance);
      if worst_enum is not null then
        worst_skill := public.first_skill_key_at_worst_holistic_grade(
          subject_result.nursery_skill_performance,
          worst_enum
        );
      end if;
      if worst_enum is not null and worst_skill is not null then
        select trs.comment_text into holistic_comment
        from teacher_remarks_settings trs
        where trs.school_id = p_school_id
          and trs.subject = subject_result.subject
          and trs.holistic_grade_enum = worst_enum
          and trs.skill_key = worst_skill
        limit 1;
      end if;

      teacher_remark := coalesce(
        nullif(trim(subject_result.remarks), ''),
        holistic_comment,
        'Performance recorded via checklist'
      );
    end if;

    insert into processed_primary_exam_results (
      school_id,
      student_id,
      exam_set_id,
      year,
      term,
      exam_set_name,
      student_name,
      class_name,
      admission_number,
      subject,
      marks_obtained,
      total_marks,
      grade,
      teacher_remark,
      teacher_initials,
      class_teacher_comment,
      headteacher_comment,
      next_term_begins_date,
      nursery_skill_performance
    ) values (
      p_school_id,
      p_student_id,
      p_exam_set_id,
      exam_set_record.year,
      exam_set_record.term,
      exam_set_record.name,
      student_record.name,
      student_record.current_class,
      student_record.admission_number,
      subject_result.subject,
      subject_result.marks_obtained,
      subject_result.total_marks,
      subject_result.grade,
      teacher_remark,
      subject_result.teacher_initials,
      class_teacher_comment,
      headteacher_comment,
      NULL,
      coalesce(subject_result.nursery_skill_performance, '{}'::jsonb)
    )
    on conflict (school_id, student_id, exam_set_id, subject)
    do update set
      year = excluded.year,
      term = excluded.term,
      exam_set_name = excluded.exam_set_name,
      student_name = excluded.student_name,
      class_name = excluded.class_name,
      admission_number = excluded.admission_number,
      marks_obtained = excluded.marks_obtained,
      total_marks = excluded.total_marks,
      grade = excluded.grade,
      teacher_remark = excluded.teacher_remark,
      teacher_initials = excluded.teacher_initials,
      class_teacher_comment = excluded.class_teacher_comment,
      headteacher_comment = excluded.headteacher_comment,
      next_term_begins_date = excluded.next_term_begins_date,
      nursery_skill_performance = excluded.nursery_skill_performance,
      processed_at = now();
  end loop;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.promote_and_graduate_students()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_year INTEGER := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
BEGIN
  INSERT INTO public.old_students (student_id, name, school_id, final_class, graduation_year)
  SELECT s.student_id, s.name, s.school_id, s.current_class, current_year
  FROM public.students s
  JOIN public.schools sch ON s.school_id = sch.school_id
  WHERE sch.type = 'Nursery/Primary'
    AND s.current_class = 'Primary 7'
    AND s.status = 'active'
    AND (s.repeat_year IS NULL OR s.repeat_year = FALSE)
  ON CONFLICT (student_id) DO NOTHING;

  UPDATE public.students
  SET status = 'graduated', graduation_year = current_year
  WHERE current_class = 'Primary 7'
    AND school_id IN (SELECT school_id FROM public.schools WHERE type = 'Nursery/Primary')
    AND status = 'active'
    AND (repeat_year IS NULL OR repeat_year = FALSE);

  INSERT INTO public.old_students (student_id, name, school_id, final_class, graduation_year)
  SELECT s.student_id, s.name, s.school_id, s.current_class, current_year
  FROM public.students s
  JOIN public.schools sch ON s.school_id = sch.school_id
  WHERE sch.type = 'Secondary'
    AND s.current_class IN ('Senior 4', 'Senior 6')
    AND s.status = 'active'
    AND (s.repeat_year IS NULL OR s.repeat_year = FALSE)
  ON CONFLICT (student_id) DO NOTHING;

  UPDATE public.students
  SET status = 'graduated', graduation_year = current_year
  WHERE current_class IN ('Senior 4', 'Senior 6')
    AND school_id IN (SELECT school_id FROM public.schools WHERE type = 'Secondary')
    AND status = 'active'
    AND (repeat_year IS NULL OR repeat_year = FALSE);

  UPDATE public.students
  SET current_class = CASE current_class
    WHEN 'Baby Class' THEN 'Primary 1'
    WHEN 'Primary 1' THEN 'Primary 2'
    WHEN 'Primary 2' THEN 'Primary 3'
    WHEN 'Primary 3' THEN 'Primary 4'
    WHEN 'Primary 4' THEN 'Primary 5'
    WHEN 'Primary 5' THEN 'Primary 6'
    WHEN 'Primary 6' THEN 'Primary 7'
    WHEN 'Senior 1' THEN 'Senior 2'
    WHEN 'Senior 2' THEN 'Senior 3'
    WHEN 'Senior 3' THEN 'Senior 4'
    WHEN 'Senior 5' THEN 'Senior 6'
    ELSE current_class
  END
  WHERE status = 'active'
    AND (repeat_year IS NULL OR repeat_year = FALSE);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.published_reports_user_is_school_staff(p_school_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.user_id = auth.uid()
      AND u.school_id IS NOT NULL
      AND u.school_id = p_school_id
      AND lower(trim(u.role::text)) IN (
        'admin',
        'accountant',
        'teacher',
        'head_teacher',
        'owner',
        'librarian',
        'lab_technician',
        'clinician'
      )
  );
$function$
;

CREATE OR REPLACE FUNCTION public.pweza_phone_last9(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE STRICT
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN length(regexp_replace(coalesce(p, ''), '\D', '', 'g')) >= 9
    THEN right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 9)
    ELSE NULL
  END;
$function$
;

CREATE OR REPLACE FUNCTION public.recalc_student_term_balances_from_payments(p_student_id uuid, p_school_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.student_balances AS sb
  SET
    total_paid = public.total_term_payments_amount_paid(sb.student_id, sb.term_id),
    updated_at = now()
  WHERE sb.student_id = p_student_id
    AND sb.school_id = p_school_id
    AND sb.term_id IS NOT NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.recalculate_class_positions_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  affected_class_name text;
  affected_exam_set_id uuid;
  affected_school_id uuid;
  lock_key bigint;
  should_recalculate boolean := false;
begin
  if tg_op = 'INSERT' then
    affected_class_name := new.class_name;
    affected_exam_set_id := new.exam_set_id;
    affected_school_id := new.school_id;
    should_recalculate := true;
  elsif tg_op = 'UPDATE' then
    if (old.marks_obtained is distinct from new.marks_obtained) or
       (old.total_marks is distinct from new.total_marks) or
       (old.grade is distinct from new.grade) then
      affected_class_name := new.class_name;
      affected_exam_set_id := new.exam_set_id;
      affected_school_id := new.school_id;
      should_recalculate := true;
    else
      return new;
    end if;
  elsif tg_op = 'DELETE' then
    affected_class_name := old.class_name;
    affected_exam_set_id := old.exam_set_id;
    affected_school_id := old.school_id;
    should_recalculate := true;
  end if;

  if should_recalculate and affected_class_name is not null and
     affected_exam_set_id is not null and affected_school_id is not null then
    lock_key := hashtext(affected_school_id::text || affected_exam_set_id::text || affected_class_name);

    if pg_try_advisory_xact_lock(lock_key) then
      begin
        perform public.calculate_class_positions_for_exam_set(
          affected_school_id,
          affected_exam_set_id,
          affected_class_name
        );
      exception when others then
        raise warning 'Error recalculating class positions: %', sqlerrm;
      end;
    end if;
  end if;

  return coalesce(new, old);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.reconcile_term_invoice_payments(p_student_id uuid, p_term_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_paid numeric(12, 2);
  v_rem numeric(12, 2);
  v_alloc numeric(12, 2);
  r record;
  v_school uuid;
  v_year int;
  v_term int;
  v_total_fees numeric(12, 2);
BEGIN
  SELECT public.total_term_payments_amount_paid(p_student_id, p_term_id) INTO v_paid;

  SELECT si.school_id INTO v_school
  FROM public.student_invoices si
  WHERE si.student_id = p_student_id AND si.term_id = p_term_id
  LIMIT 1;

  IF v_school IS NULL THEN
    SELECT s.school_id INTO v_school
    FROM public.students s
    WHERE s.student_id = p_student_id
    LIMIT 1;

    IF v_school IS NULL THEN
      DELETE FROM public.student_balances sb
      WHERE sb.student_id = p_student_id AND sb.term_id = p_term_id;
      RETURN;
    END IF;

    SELECT sb.total_fees INTO v_total_fees
    FROM public.student_balances sb
    WHERE sb.student_id = p_student_id AND sb.term_id = p_term_id;

    v_total_fees := COALESCE(v_total_fees, 0::numeric(12, 2));

    IF v_total_fees <= 0 AND v_paid > 0 THEN
      v_total_fees := v_paid;
    END IF;

    IF v_total_fees <= 0 AND v_paid <= 0 THEN
      DELETE FROM public.student_balances sb
      WHERE sb.student_id = p_student_id AND sb.term_id = p_term_id;
      RETURN;
    END IF;

    SELECT st.year, st.term INTO v_year, v_term
    FROM public.school_terms st
    WHERE st.id = p_term_id;

    INSERT INTO public.student_balances (
      student_id, school_id, term_id, year, term, total_fees, total_paid, balance, updated_at
    )
    VALUES (
      p_student_id,
      v_school,
      p_term_id,
      COALESCE(v_year, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
      COALESCE(v_term, 1),
      v_total_fees,
      v_paid,
      v_total_fees - v_paid,
      NOW()
    )
    ON CONFLICT (student_id, term_id)
    DO UPDATE SET
      total_fees = EXCLUDED.total_fees,
      total_paid = EXCLUDED.total_paid,
      balance = EXCLUDED.balance,
      updated_at = NOW();

    RETURN;
  END IF;

  v_rem := v_paid;

  FOR r IN
    SELECT si.invoice_id, si.total_amount
    FROM public.student_invoices si
    WHERE si.student_id = p_student_id
      AND si.term_id = p_term_id
      AND si.status = ANY (ARRAY['issued'::text, 'partial'::text, 'paid'::text])
    ORDER BY si.is_supplementary ASC, si.created_at ASC NULLS LAST, si.invoice_id ASC
  LOOP
    v_alloc := least(r.total_amount, greatest(v_rem, 0::numeric));
    UPDATE public.student_invoices si
    SET
      amount_paid = v_alloc,
      status = CASE
        WHEN (r.total_amount - v_alloc) <= 0 THEN 'paid'::text
        WHEN v_alloc > 0 THEN 'partial'::text
        ELSE 'issued'::text
      END,
      updated_at = NOW()
    WHERE si.invoice_id = r.invoice_id;
    v_rem := v_rem - v_alloc;
  END LOOP;

  SELECT COALESCE(SUM(si.total_amount), 0)::numeric(12, 2) INTO v_total_fees
  FROM public.student_invoices si
  WHERE si.student_id = p_student_id
    AND si.term_id = p_term_id
    AND si.status = ANY (ARRAY['issued'::text, 'partial'::text, 'paid'::text]);

  SELECT st.year, st.term INTO v_year, v_term
  FROM public.school_terms st
  WHERE st.id = p_term_id;

  INSERT INTO public.student_balances (
    student_id, school_id, term_id, year, term, total_fees, total_paid, balance, updated_at
  )
  VALUES (
    p_student_id,
    v_school,
    p_term_id,
    COALESCE(v_year, EXTRACT(YEAR FROM CURRENT_DATE)::INT),
    COALESCE(v_term, 1),
    v_total_fees,
    v_paid,
    v_total_fees - v_paid,
    NOW()
  )
  ON CONFLICT (student_id, term_id)
  DO UPDATE SET
    total_fees = EXCLUDED.total_fees,
    total_paid = EXCLUDED.total_paid,
    balance = EXCLUDED.balance,
    updated_at = NOW();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_class_teacher_comments(p_school_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  perform public.refresh_processed_comments(p_school_id, null);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_processed_comments(p_school_id uuid, p_class_name text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  r record;
  v_class_comment text;
  v_head_comment text;
begin
  for r in
    select distinct p.school_id, p.student_id, p.exam_set_id, p.class_name
    from public.processed_primary_exam_results p
    where p.school_id = p_school_id
      and (p_class_name is null or p.class_name = p_class_name)
  loop
    select x.class_teacher_comment, x.headteacher_comment
    into v_class_comment, v_head_comment
    from public.resolve_processed_comments(r.school_id, r.student_id, r.exam_set_id, r.class_name) x;

    update public.processed_primary_exam_results p
    set class_teacher_comment = coalesce(v_class_comment, p.class_teacher_comment, ''),
        headteacher_comment = coalesce(v_head_comment, p.headteacher_comment, '')
    where p.school_id = r.school_id
      and p.student_id = r.student_id
      and p.exam_set_id = r.exam_set_id
      and p.class_name = r.class_name;
  end loop;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.refresh_processed_comments_on_settings_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_school_id uuid;
  v_class_name text;
begin
  if TG_OP = 'DELETE' then
    v_school_id := OLD.school_id;
    if TG_TABLE_NAME = 'class_teacher_comments_settings' then
      v_class_name := OLD.class_name;
    else
      v_class_name := null;
    end if;
  else
    v_school_id := NEW.school_id;
    if TG_TABLE_NAME = 'class_teacher_comments_settings' then
      v_class_name := NEW.class_name;
    else
      v_class_name := null;
    end if;
  end if;
  perform public.refresh_processed_comments(v_school_id, v_class_name);
  return coalesce(NEW, OLD);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.register_school_admin_final(p_user_id uuid, p_email text, p_name text, p_phone text, p_school_name text, p_school_location text, p_school_type text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_school_id UUID;
    v_result JSON;
    v_user_exists BOOLEAN;
BEGIN
    -- Check if user already exists
    SELECT EXISTS(SELECT 1 FROM users WHERE user_id = p_user_id) INTO v_user_exists;
    
    IF v_user_exists THEN
        SELECT school_id INTO v_school_id FROM users WHERE user_id = p_user_id;
        
        IF v_school_id IS NOT NULL THEN
            RETURN json_build_object(
                'success', true,
                'school_id', v_school_id,
                'admin_id', p_user_id,
                'message', 'User and school already exist'
            );
        ELSE
            v_school_id := gen_random_uuid();
            
            INSERT INTO schools (
                school_id, name, location, type, admin_id,
                subscription_plan, student_count
            ) VALUES (
                v_school_id, p_school_name, p_school_location, p_school_type, p_user_id,
                'Free (0-20)', 0
            );
            
            UPDATE users SET school_id = v_school_id WHERE user_id = p_user_id;
            
            -- Trigger will create exam sets automatically - no function call needed
            RETURN json_build_object(
                'success', true,
                'school_id', v_school_id,
                'admin_id', p_user_id,
                'message', 'School created and linked to existing user'
            );
        END IF;
    END IF;
    
    v_school_id := gen_random_uuid();
    
    -- STEP 1: Create school with admin_id = NULL
    INSERT INTO schools (
        school_id, name, location, type, admin_id,
        subscription_plan, student_count
    ) VALUES (
        v_school_id, p_school_name, p_school_location, p_school_type, NULL,
        'Free (0-20)', 0
    );
    
    -- STEP 2: Create user record with school_id linked
    INSERT INTO users (
        user_id, role, email, password_hash, school_id, name, phone
    ) VALUES (
        p_user_id, 'admin', p_email, '', v_school_id, p_name, p_phone
    )
    ON CONFLICT (user_id) 
    DO UPDATE SET
        school_id = EXCLUDED.school_id,
        role = EXCLUDED.role,
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        phone = EXCLUDED.phone;
    
    -- STEP 3: Update school with admin_id
    UPDATE schools SET admin_id = p_user_id WHERE school_id = v_school_id;
    
    -- Verify both records were created correctly
    IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id AND school_id = v_school_id) THEN
        RAISE EXCEPTION 'Failed to create user record with school_id';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM schools WHERE school_id = v_school_id AND admin_id = p_user_id) THEN
        RAISE EXCEPTION 'Failed to update school record with admin_id';
    END IF;
    
    -- NOTE: Exam sets will be created automatically by the trigger (trigger_setup_new_school_defaults)
    -- The trigger calls insert_default_exam_sets_all_terms, so we don't need to call it here
    
    RETURN json_build_object(
        'success', true,
        'school_id', v_school_id,
        'admin_id', p_user_id,
        'message', 'School and admin created successfully'
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'register_school_admin_final error: %', SQLERRM;
        
        IF v_school_id IS NOT NULL THEN
            DELETE FROM schools WHERE school_id = v_school_id;
            DELETE FROM users WHERE user_id = p_user_id AND school_id = v_school_id;
        END IF;
        
        RAISE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.register_school_admin_with_referral(p_user_id uuid, p_email text, p_name text, p_phone text, p_school_name text, p_school_location text, p_school_type text, p_referral_code_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_school_id uuid;
  v_user_exists boolean;
  v_ref record;
  v_affiliate_id uuid;
  v_aff_status text;
BEGIN
  -- Check if user already exists
  SELECT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) INTO v_user_exists;

  IF v_user_exists THEN
    SELECT school_id INTO v_school_id FROM users WHERE user_id = p_user_id;

    IF v_school_id IS NOT NULL THEN
      RETURN json_build_object(
        'success', true,
        'school_id', v_school_id,
        'admin_id', p_user_id,
        'message', 'User and school already exist'
      );
    END IF;
  END IF;

  -- Lock and validate the referral code
  SELECT
    rc.id,
    rc.affiliate_id,
    rc.is_active,
    rc.expires_at,
    rc.max_uses,
    rc.use_count,
    rc.type
  INTO v_ref
  FROM referral_codes rc
  WHERE rc.id = p_referral_code_id
  FOR UPDATE;

  IF v_ref.id IS NULL THEN
    RAISE EXCEPTION 'Invalid referral code';
  END IF;

  -- Get affiliate status if needed
  IF v_ref.affiliate_id IS NOT NULL THEN
    SELECT status INTO v_aff_status
    FROM affiliates
    WHERE affiliate_id = v_ref.affiliate_id;
  ELSE
    v_aff_status := NULL;
  END IF;

  -- Validate referral code
  IF NOT v_ref.is_active THEN
    RAISE EXCEPTION 'Inactive referral code';
  END IF;

  IF v_ref.expires_at IS NOT NULL AND v_ref.expires_at < now() THEN
    RAISE EXCEPTION 'Expired referral code';
  END IF;

  IF v_ref.max_uses IS NOT NULL AND v_ref.use_count >= v_ref.max_uses THEN
    RAISE EXCEPTION 'Referral code usage limit reached';
  END IF;

  -- Validate affiliate referral
  IF v_ref.type = 'AFFILIATE' THEN
    IF v_ref.affiliate_id IS NULL OR v_aff_status IS DISTINCT FROM 'ACTIVE' THEN
      RAISE EXCEPTION 'Invalid affiliate referral';
    END IF;
  ELSIF v_ref.type = 'ADMIN' THEN
    IF v_ref.affiliate_id IS NOT NULL THEN
      RAISE EXCEPTION 'Invalid admin referral';
    END IF;
  END IF;

  v_affiliate_id := v_ref.affiliate_id;

  -- Handle existing user case
  IF v_user_exists THEN
    v_school_id := gen_random_uuid();

    INSERT INTO schools (
      school_id,
      name,
      location,
      type,
      admin_id,
      subscription_plan,
      student_count,
      referral_code_id,
      affiliate_id
    ) VALUES (
      v_school_id,
      p_school_name,
      p_school_location,
      p_school_type,
      p_user_id,
      'Free (0-20)',
      0,
      p_referral_code_id,
      v_affiliate_id
    );

    UPDATE users
    SET school_id = v_school_id
    WHERE user_id = p_user_id;

    UPDATE referral_codes SET use_count = use_count + 1 WHERE id = p_referral_code_id;

    RETURN json_build_object(
      'success', true,
      'school_id', v_school_id,
      'admin_id', p_user_id,
      'message', 'School created and linked to existing user'
    );
  END IF;

  -- Create new school and user
  v_school_id := gen_random_uuid();

  INSERT INTO schools (
    school_id,
    name,
    location,
    type,
    admin_id,
    subscription_plan,
    student_count,
    referral_code_id,
    affiliate_id
  ) VALUES (
    v_school_id,
    p_school_name,
    p_school_location,
    p_school_type,
    NULL,
    'Free (0-20)',
    0,
    p_referral_code_id,
    v_affiliate_id
  );

  -- Handle user record creation/update without ON CONFLICT
  IF EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id) THEN
    UPDATE users SET
      school_id = v_school_id,
      role = 'admin',
      email = p_email,
      name = p_name,
      phone = p_phone
    WHERE user_id = p_user_id;
  ELSE
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
      '',
      v_school_id,
      p_name,
      p_phone
    );
  END IF;

  -- Update school with admin_id
  UPDATE schools
  SET admin_id = p_user_id
  WHERE school_id = v_school_id;

  -- Verify records were created
  IF NOT EXISTS (SELECT 1 FROM users WHERE user_id = p_user_id AND school_id = v_school_id) THEN
    RAISE EXCEPTION 'Failed to create user record with school_id';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM schools WHERE school_id = v_school_id AND admin_id = p_user_id) THEN
    RAISE EXCEPTION 'Failed to create school record with admin_id';
  END IF;

  -- TEMPORARILY SKIP EXAM SETS CREATION TO ISOLATE THE ERROR
  -- BEGIN
  --   PERFORM insert_default_exam_sets_all_terms(v_school_id);
  -- EXCEPTION
  --   WHEN OTHERS THEN
  --     RAISE WARNING 'Failed to create default exam sets for school %: %', v_school_id, SQLERRM;
  -- END;

  -- Increment referral usage
  UPDATE referral_codes SET use_count = use_count + 1 WHERE id = p_referral_code_id;

  RETURN json_build_object(
    'success', true,
    'school_id', v_school_id,
    'admin_id', p_user_id,
    'message', 'School and admin created successfully (exam sets skipped for testing)'
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'register_school_admin_with_referral error: %', SQLERRM;
    -- Clean up on error
    IF v_school_id IS NOT NULL THEN
      DELETE FROM schools WHERE school_id = v_school_id AND (admin_id IS NULL OR admin_id = p_user_id);
    END IF;
    RAISE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.repair_engine_future_term_financials(p_school_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(school_id_out uuid, school_name_out text, current_term_id uuid, future_term_ids uuid[], balances_merged bigint, balances_deleted bigint, payments_repointed bigint, invoices_repointed bigint, invoices_still_on_future bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r_school RECORD;
  v_cur UUID;
  v_future UUID[];
  v_cy INT;
  v_ct INT;
  v_today DATE := CURRENT_DATE;
  v_merged BIGINT;
  v_del BIGINT;
  v_pay BIGINT;
  v_inv BIGINT;
  v_left BIGINT;
BEGIN
  FOR r_school IN
    SELECT s.school_id, s.name::TEXT AS school_name
    FROM public.schools s
    WHERE p_school_id IS NULL OR s.school_id = p_school_id
  LOOP
    school_id_out := r_school.school_id;
    school_name_out := r_school.school_name;
    v_merged := 0;
    v_del := 0;
    v_pay := 0;
    v_inv := 0;
    v_left := 0;

    v_cur := public.resolve_current_school_term_id(r_school.school_id, v_today);

    IF v_cur IS NULL THEN
      current_term_id := NULL;
      future_term_ids := ARRAY[]::UUID[];
      balances_merged := 0;
      balances_deleted := 0;
      payments_repointed := 0;
      invoices_repointed := 0;
      invoices_still_on_future := 0;
      RETURN NEXT;
      CONTINUE;
    END IF;

    SELECT st.year, st.term INTO v_cy, v_ct
    FROM public.school_terms st
    WHERE st.id = v_cur;

    SELECT ARRAY_AGG(st.id ORDER BY st.year, st.term)
    INTO v_future
    FROM public.school_terms st
    WHERE st.school_id = r_school.school_id
      AND (
        st.year > v_cy
        OR (st.year = v_cy AND st.term > v_ct)
      );

    current_term_id := v_cur;
    future_term_ids := COALESCE(v_future, ARRAY[]::UUID[]);

    IF v_future IS NULL OR cardinality(v_future) = 0 THEN
      balances_merged := 0;
      balances_deleted := 0;
      payments_repointed := 0;
      invoices_repointed := 0;
      invoices_still_on_future := 0;
      RETURN NEXT;
      CONTINUE;
    END IF;

    WITH src AS (
      SELECT
        sb.student_id,
        sb.school_id,
        SUM(COALESCE(sb.total_fees, 0)) AS add_fees,
        SUM(COALESCE(sb.total_paid, 0)) AS add_paid
      FROM public.student_balances sb
      WHERE sb.school_id = r_school.school_id
        AND sb.term_id = ANY (v_future)
      GROUP BY sb.student_id, sb.school_id
      HAVING SUM(COALESCE(sb.total_fees, 0)) > 0 OR SUM(COALESCE(sb.total_paid, 0)) > 0
    ),
    upsert AS (
      INSERT INTO public.student_balances (
        student_id,
        school_id,
        term_id,
        year,
        term,
        total_fees,
        total_paid,
        updated_at
      )
      SELECT
        src.student_id,
        src.school_id,
        v_cur,
        COALESCE(v_cy, EXTRACT(YEAR FROM v_today)::INT),
        COALESCE(v_ct, 1),
        src.add_fees,
        src.add_paid,
        NOW()
      FROM src
      ON CONFLICT (student_id, term_id) DO UPDATE SET
        total_fees = public.student_balances.total_fees + EXCLUDED.total_fees,
        total_paid = public.student_balances.total_paid + EXCLUDED.total_paid,
        year = COALESCE(EXCLUDED.year, public.student_balances.year),
        term = COALESCE(EXCLUDED.term, public.student_balances.term),
        updated_at = NOW()
      RETURNING 1
    )
    SELECT COUNT(*)::BIGINT INTO v_merged FROM upsert;

    DELETE FROM public.student_balances sb
    WHERE sb.school_id = r_school.school_id
      AND sb.term_id = ANY (v_future);
    GET DIAGNOSTICS v_del = ROW_COUNT;

    UPDATE public.student_payments sp
    SET term_id = v_cur
    WHERE sp.school_id = r_school.school_id
      AND sp.term_id = ANY (v_future);
    GET DIAGNOSTICS v_pay = ROW_COUNT;

    UPDATE public.student_invoices si
    SET term_id = v_cur,
        updated_at = NOW()
    WHERE si.school_id = r_school.school_id
      AND si.term_id = ANY (v_future)
      AND NOT EXISTS (
        SELECT 1
        FROM public.student_invoices o
        WHERE o.school_id = si.school_id
          AND o.student_id = si.student_id
          AND o.term_id = v_cur
          AND o.invoice_id IS DISTINCT FROM si.invoice_id
      );
    GET DIAGNOSTICS v_inv = ROW_COUNT;

    SELECT COUNT(*)::BIGINT INTO v_left
    FROM public.student_invoices si
    WHERE si.school_id = r_school.school_id
      AND si.term_id = ANY (v_future);

    UPDATE public.student_balances sb
    SET total_paid = COALESCE(p.sum_paid, 0),
        updated_at = NOW()
    FROM (
      SELECT sp.student_id, sp.term_id, SUM(sp.amount_paid) AS sum_paid
      FROM public.student_payments sp
      WHERE sp.school_id = r_school.school_id
        AND sp.term_id = v_cur
        AND sp.reversed_at IS NULL
      GROUP BY sp.student_id, sp.term_id
    ) p
    WHERE sb.school_id = r_school.school_id
      AND sb.term_id = v_cur
      AND sb.student_id = p.student_id;

    balances_merged := v_merged;
    balances_deleted := v_del;
    payments_repointed := v_pay;
    invoices_repointed := v_inv;
    invoices_still_on_future := v_left;
    RETURN NEXT;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.repair_misplaced_opening_balances_to_current_term(p_school_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(school_id_out uuid, school_name_out text, current_term_id uuid, future_term_ids uuid[], balances_merged bigint, balances_deleted bigint, payments_repointed bigint, invoices_repointed bigint, invoices_skipped bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r_school RECORD;
  v_cur UUID;
  v_future UUID[];
  v_y INT;
  v_t INT;
  v_merged BIGINT;
  v_del BIGINT;
  v_pay BIGINT;
  v_inv BIGINT;
  v_inv_skip BIGINT;
  v_today DATE := CURRENT_DATE;
BEGIN
  FOR r_school IN
    SELECT s.school_id, s.name::TEXT AS school_name
    FROM public.schools s
    WHERE p_school_id IS NULL OR s.school_id = p_school_id
  LOOP
    school_id_out := r_school.school_id;
    school_name_out := r_school.school_name;
    v_merged := 0;
    v_del := 0;
    v_pay := 0;
    v_inv := 0;
    v_inv_skip := 0;
    current_term_id := public.resolve_current_school_term_id(r_school.school_id, v_today);

    IF current_term_id IS NULL THEN
      future_term_ids := ARRAY[]::UUID[];
      balances_merged := 0;
      balances_deleted := 0;
      payments_repointed := 0;
      invoices_repointed := 0;
      invoices_skipped := 0;
      RETURN NEXT;
      CONTINUE;
    END IF;

    SELECT ARRAY_AGG(st.id ORDER BY st.year, st.term)
    INTO v_future
    FROM public.school_terms st
    WHERE st.school_id = r_school.school_id
      AND st.start_date IS NOT NULL
      AND st.start_date > v_today;

    IF v_future IS NULL OR cardinality(v_future) = 0 THEN
      future_term_ids := ARRAY[]::UUID[];
      balances_merged := 0;
      balances_deleted := 0;
      payments_repointed := 0;
      invoices_repointed := 0;
      invoices_skipped := 0;
      RETURN NEXT;
      CONTINUE;
    END IF;

    future_term_ids := v_future;

    SELECT st.year, st.term INTO v_y, v_t
    FROM public.school_terms st
    WHERE st.id = current_term_id;

    -- 1) Merge numeric balances from future terms into current term row
    --    (invoice-style schema: no class_id / last_payment_date on student_balances)
    WITH src AS (
      SELECT
        sb.student_id,
        sb.school_id,
        SUM(COALESCE(sb.total_fees, 0)) AS add_fees,
        SUM(COALESCE(sb.total_paid, 0)) AS add_paid
      FROM public.student_balances sb
      WHERE sb.school_id = r_school.school_id
        AND sb.term_id = ANY (v_future)
      GROUP BY sb.student_id, sb.school_id
      HAVING SUM(COALESCE(sb.total_fees, 0)) > 0 OR SUM(COALESCE(sb.total_paid, 0)) > 0
    ),
    upsert AS (
      INSERT INTO public.student_balances (
        student_id,
        school_id,
        term_id,
        year,
        term,
        total_fees,
        total_paid,
        updated_at
      )
      SELECT
        src.student_id,
        src.school_id,
        current_term_id,
        COALESCE(v_y, EXTRACT(YEAR FROM v_today)::INT),
        COALESCE(v_t, 1),
        src.add_fees,
        src.add_paid,
        NOW()
      FROM src
      ON CONFLICT (student_id, term_id) DO UPDATE SET
        total_fees = public.student_balances.total_fees + EXCLUDED.total_fees,
        total_paid = public.student_balances.total_paid + EXCLUDED.total_paid,
        year = COALESCE(EXCLUDED.year, public.student_balances.year),
        term = COALESCE(EXCLUDED.term, public.student_balances.term),
        updated_at = NOW()
      RETURNING 1
    )
    SELECT COUNT(*)::BIGINT INTO v_merged FROM upsert;

    -- 2) Remove future-term balance rows (opening fees must not sit in an unstarted term)
    DELETE FROM public.student_balances sb
    WHERE sb.school_id = r_school.school_id
      AND sb.term_id = ANY (v_future);
    GET DIAGNOSTICS v_del = ROW_COUNT;

    -- 3) Point payments at current term (trigger may refresh totals)
    UPDATE public.student_payments sp
    SET term_id = current_term_id
    WHERE sp.school_id = r_school.school_id
      AND sp.term_id = ANY (v_future);
    GET DIAGNOSTICS v_pay = ROW_COUNT;

    -- 4) Invoices: move only when no duplicate (school, student, current_term)
    UPDATE public.student_invoices si
    SET term_id = current_term_id,
        updated_at = NOW()
    WHERE si.school_id = r_school.school_id
      AND si.term_id = ANY (v_future)
      AND NOT EXISTS (
        SELECT 1
        FROM public.student_invoices o
        WHERE o.school_id = si.school_id
          AND o.student_id = si.student_id
          AND o.term_id = current_term_id
          AND o.invoice_id IS DISTINCT FROM si.invoice_id
      );
    GET DIAGNOSTICS v_inv = ROW_COUNT;

    SELECT COUNT(*)::BIGINT INTO v_inv_skip
    FROM public.student_invoices si
    WHERE si.school_id = r_school.school_id
      AND si.term_id = ANY (v_future);

    -- 5) Re-align total_paid on current term with payments ledger (covers reversals / moves)
    UPDATE public.student_balances sb
    SET total_paid = COALESCE(p.sum_paid, 0),
        updated_at = NOW()
    FROM (
      SELECT sp.student_id, sp.term_id, SUM(sp.amount_paid) AS sum_paid
      FROM public.student_payments sp
      WHERE sp.school_id = r_school.school_id
        AND sp.term_id = current_term_id
        AND sp.reversed_at IS NULL
      GROUP BY sp.student_id, sp.term_id
    ) p
    WHERE sb.school_id = r_school.school_id
      AND sb.term_id = current_term_id
      AND sb.student_id = p.student_id;

    balances_merged := v_merged;
    balances_deleted := v_del;
    payments_repointed := v_pay;
    invoices_repointed := v_inv;
    invoices_skipped := v_inv_skip;
    RETURN NEXT;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.replace_published_reports_for_scope(p_school_id uuid, p_class_id uuid, p_term integer, p_year integer, p_exam_set_id uuid, p_student_rows jsonb, p_bundle_storage_path text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
DECLARE
  v_row jsonb;
  v_sid uuid;
  v_path text;
  v_expected text;
  v_bundle_expected text;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT public.published_reports_user_is_school_staff(p_school_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF p_student_rows IS NULL OR jsonb_typeof(p_student_rows) <> 'array' THEN
    RAISE EXCEPTION 'p_student_rows must be a JSON array';
  END IF;

  FOR v_row IN SELECT * FROM jsonb_array_elements(p_student_rows)
  LOOP
    v_sid := NULLIF(trim(v_row->> 'student_id'), '')::uuid;
    v_path := NULLIF(trim(v_row->> 'storage_object_path'), '');
    IF v_sid IS NULL OR v_path IS NULL OR v_path = '' THEN
      RAISE EXCEPTION 'each row needs student_id and storage_object_path';
    END IF;
    v_expected := format(
      'reports/%s/%s/%s_%s/%s/students/%s.pdf',
      p_school_id,
      p_class_id,
      p_term,
      p_year,
      p_exam_set_id,
      v_sid
    );
    IF v_path <> v_expected THEN
      RAISE EXCEPTION 'invalid storage path for student %', v_sid;
    END IF;
  END LOOP;

  IF p_bundle_storage_path IS NOT NULL AND length(trim(p_bundle_storage_path)) > 0 THEN
    v_bundle_expected := format(
      'reports/%s/%s/%s_%s/%s/class_bundle.zip',
      p_school_id,
      p_class_id,
      p_term,
      p_year,
      p_exam_set_id
    );
    IF trim(p_bundle_storage_path) <> v_bundle_expected THEN
      RAISE EXCEPTION 'invalid bundle storage path';
    END IF;
  END IF;

  DELETE FROM public.published_student_reports
  WHERE school_id = p_school_id
    AND class_id = p_class_id
    AND term = p_term
    AND year = p_year
    AND exam_set_id = p_exam_set_id;

  DELETE FROM public.published_class_report_bundles
  WHERE school_id = p_school_id
    AND class_id = p_class_id
    AND term = p_term
    AND year = p_year
    AND exam_set_id = p_exam_set_id;

  INSERT INTO public.published_student_reports (
    school_id,
    class_id,
    term,
    year,
    exam_set_id,
    student_id,
    storage_bucket,
    storage_object_path,
    published_by
  )
  SELECT
    p_school_id,
    p_class_id,
    p_term,
    p_year,
    p_exam_set_id,
    NULLIF(trim(elem->> 'student_id'), '')::uuid,
    'published-reports',
    NULLIF(trim(elem->> 'storage_object_path'), ''),
    v_uid
  FROM jsonb_array_elements(p_student_rows) AS elem;

  IF p_bundle_storage_path IS NOT NULL AND length(trim(p_bundle_storage_path)) > 0 THEN
    INSERT INTO public.published_class_report_bundles (
      school_id,
      class_id,
      term,
      year,
      exam_set_id,
      storage_bucket,
      storage_object_path,
      published_by
    )
    VALUES (
      p_school_id,
      p_class_id,
      p_term,
      p_year,
      p_exam_set_id,
      'published-reports',
      trim(p_bundle_storage_path),
      v_uid
    );
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.resolve_current_school_term_id(p_school_id uuid, p_today date DEFAULT CURRENT_DATE)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_term_id UUID;
  v_cal_year INTEGER;
  v_cal_term INTEGER;
BEGIN
  PERFORM public.ensure_academic_year_exists(EXTRACT(YEAR FROM p_today)::INT);

  SELECT g.year, g.term
  INTO v_cal_year, v_cal_term
  FROM public.global_calendar_year_term(p_today) g;

  IF v_cal_year IS NULL THEN
    PERFORM public.ensure_academic_year_exists(EXTRACT(YEAR FROM p_today)::INT - 1);
    PERFORM public.ensure_academic_year_exists(EXTRACT(YEAR FROM p_today)::INT + 1);
    SELECT g.year, g.term
    INTO v_cal_year, v_cal_term
    FROM public.global_calendar_year_term(p_today) g;
  END IF;

  IF v_cal_year IS NOT NULL THEN
    SELECT st.id
    INTO v_term_id
    FROM public.school_terms st
    WHERE st.school_id = p_school_id
      AND st.year = v_cal_year
      AND st.term = v_cal_term
    LIMIT 1;

    IF v_term_id IS NULL THEN
      INSERT INTO public.school_terms (
        school_id,
        year,
        term,
        start_date,
        end_date,
        is_current,
        global_term_id
      )
      SELECT
        p_school_id,
        gt.year,
        gt.term,
        gt.window_start,
        gt.hard_stop_date,
        (p_today >= gt.window_start AND p_today <= gt.hard_stop_date),
        gt.id
      FROM public.global_terms gt
      WHERE gt.year = v_cal_year AND gt.term = v_cal_term
      ON CONFLICT (school_id, year, term) DO NOTHING;

      SELECT st.id
      INTO v_term_id
      FROM public.school_terms st
      WHERE st.school_id = p_school_id
        AND st.year = v_cal_year
        AND st.term = v_cal_term
      LIMIT 1;
    END IF;
  END IF;

  IF v_term_id IS NOT NULL THEN
    RETURN v_term_id;
  END IF;

  -- No global row for this date (rare): legacy fallbacks only then
  SELECT st.id
  INTO v_term_id
  FROM public.school_terms st
  WHERE st.school_id = p_school_id
    AND st.start_date IS NOT NULL
    AND st.end_date IS NOT NULL
    AND st.start_date <= p_today
    AND st.end_date >= p_today
  ORDER BY st.year DESC, st.term DESC
  LIMIT 1;

  IF v_term_id IS NOT NULL THEN RETURN v_term_id; END IF;

  SELECT st.id
  INTO v_term_id
  FROM public.school_terms st
  WHERE st.school_id = p_school_id
    AND st.start_date IS NOT NULL
    AND st.start_date <= p_today
  ORDER BY st.year DESC, st.term DESC
  LIMIT 1;

  IF v_term_id IS NOT NULL THEN RETURN v_term_id; END IF;

  SELECT st.id
  INTO v_term_id
  FROM public.school_terms st
  WHERE st.school_id = p_school_id
  ORDER BY st.year ASC, st.term ASC
  LIMIT 1;

  RETURN v_term_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.resolve_nursery_overall_performance_level(p_school_id uuid, p_student_id uuid, p_exam_set_id uuid, p_class_name text)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
with levels as (
  select upper(trim(e.value)) as level
  from public.exam_results er
  cross join lateral jsonb_each_text(coalesce(er.nursery_skill_performance, '{}'::jsonb)) e
  where er.school_id = p_school_id
    and er.student_id = p_student_id
    and er.exam_set_id = p_exam_set_id
    and er.class_name = p_class_name
), counts as (
  select level, count(*) as cnt
  from levels
  where level in ('VERY_GOOD','GOOD','NEEDS_IMPROVEMENT','TRIES')
  group by level
)
select c.level
from counts c
order by c.cnt desc,
         case c.level
           when 'VERY_GOOD' then 1
           when 'GOOD' then 2
           when 'NEEDS_IMPROVEMENT' then 3
           when 'TRIES' then 4
           else 99
         end asc
limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.resolve_processed_comments(p_school_id uuid, p_student_id uuid, p_exam_set_id uuid, p_class_name text, OUT class_teacher_comment text, OUT headteacher_comment text)
 RETURNS SETOF record
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_is_nursery boolean;
  v_avg_percent numeric;
  v_class_comment text;
  v_head_comment text;
  v_format text;
  v_total_marks numeric := 0;
  v_total_class_subjects integer := 0;
  v_count_vg integer := 0;
  v_count_good integer := 0;
  v_count_needs integer := 0;
  v_count_tries integer := 0;
  v_most_frequent_rating text;
  v_has_any_nursery_data boolean := false;
BEGIN
  v_is_nursery := lower(trim(coalesce(p_class_name,''))) in ('baby class','middle class','top class');

  IF v_is_nursery THEN
    -- Check if student has ANY nursery_skill_performance data
    SELECT EXISTS(
      SELECT 1 
      FROM public.exam_results er
      WHERE er.student_id = p_student_id
        AND er.exam_set_id = p_exam_set_id
        AND er.school_id = p_school_id
        AND er.nursery_skill_performance IS NOT NULL
        AND er.nursery_skill_performance != '{}'::jsonb
    ) INTO v_has_any_nursery_data;

    -- If has nursery data, use Latest format logic
    IF v_has_any_nursery_data THEN
      -- Count all ratings across all subjects and skills
      WITH merged_latest AS (
        SELECT pr.subject, COALESCE(pr.nursery_skill_performance, '{}'::jsonb) AS nursery_skill_performance, 1 AS src
        FROM public.processed_primary_exam_results pr
        WHERE pr.school_id = p_school_id
          AND pr.student_id = p_student_id
          AND pr.exam_set_id = p_exam_set_id
        UNION ALL
        SELECT er.subject, COALESCE(er.nursery_skill_performance, '{}'::jsonb) AS nursery_skill_performance, 2 AS src
        FROM public.exam_results er
        WHERE er.school_id = p_school_id
          AND er.student_id = p_student_id
          AND er.exam_set_id = p_exam_set_id
      ),
      dedup_latest AS (
        SELECT DISTINCT ON (m.subject)
               m.subject,
               m.nursery_skill_performance
        FROM merged_latest m
        ORDER BY m.subject, m.src
      ),
      skill_values AS (
        SELECT UPPER(TRIM(REPLACE(j.value, '_', ' '))) AS rating_value
        FROM dedup_latest d
        CROSS JOIN LATERAL jsonb_each_text(COALESCE(d.nursery_skill_performance, '{}'::jsonb)) AS j(key, value)
        WHERE j.value IS NOT NULL AND TRIM(j.value) != ''
      )
      SELECT
        COUNT(*) FILTER (WHERE rating_value = 'VERY GOOD'),
        COUNT(*) FILTER (WHERE rating_value = 'GOOD'),
        COUNT(*) FILTER (WHERE rating_value = 'NEEDS IMPROVEMENT'),
        COUNT(*) FILTER (WHERE rating_value = 'TRIES')
      INTO v_count_vg, v_count_good, v_count_needs, v_count_tries
      FROM skill_values;

      -- Determine most frequent rating (tie-break by best)
      SELECT rating
      INTO v_most_frequent_rating
      FROM (
        SELECT * FROM (VALUES
          ('VERY_GOOD', v_count_vg, 1),
          ('GOOD', v_count_good, 2),
          ('NEEDS_IMPROVEMENT', v_count_needs, 3),
          ('TRIES', v_count_tries, 4)
        ) AS t(rating, cnt, priority)
        ORDER BY cnt DESC, priority ASC
        LIMIT 1
      ) r;

      -- Look up comments from NURSERY comment tables
      SELECT cncs.comment_text
      INTO v_class_comment
      FROM public.class_teacher_nursery_comment_settings cncs
      WHERE cncs.school_id = p_school_id
        AND cncs.performance_level = v_most_frequent_rating
      LIMIT 1;

      SELECT hncs.comment_text
      INTO v_head_comment
      FROM public.headteacher_nursery_comment_settings hncs
      WHERE hncs.school_id = p_school_id
        AND hncs.performance_level = v_most_frequent_rating
      LIMIT 1;

      class_teacher_comment := COALESCE(
        v_class_comment,
        CASE v_most_frequent_rating
          WHEN 'VERY_GOOD' THEN 'A cheerful learner who brings joy and curiosity to our daily activities.'
          WHEN 'GOOD' THEN 'A sweet learner who shares and plays beautifully with friends.'
          WHEN 'NEEDS_IMPROVEMENT' THEN 'A gentle learner who is growing daily. More practice will help them blossom!'
          WHEN 'TRIES' THEN 'Enthusiastic and eager to learn! Puts great effort into daily tasks.'
          ELSE 'Enthusiastic and eager to learn! Puts great effort into daily tasks.'
        END
      );

      headteacher_comment := COALESCE(
        v_head_comment,
        CASE v_most_frequent_rating
          WHEN 'VERY_GOOD' THEN 'Wonderful job! Keep shining and bringing joy to our class.'
          WHEN 'GOOD' THEN 'Well done! We are very proud of your progress.'
          WHEN 'NEEDS_IMPROVEMENT' THEN 'You are a special part of our class. Let''s keep growing!'
          WHEN 'TRIES' THEN 'Great effort! Keep trying your best and having fun.'
          ELSE 'Great effort! Keep trying your best and having fun.'
        END
      );

      RETURN NEXT;
      RETURN;
    END IF;

    -- If no nursery data, use Old format (marks-based) logic
    WITH merged_old AS (
      SELECT pr.subject, pr.marks_obtained, 1 AS src
      FROM public.processed_primary_exam_results pr
      WHERE pr.school_id = p_school_id
        AND pr.student_id = p_student_id
        AND pr.exam_set_id = p_exam_set_id
        AND lower(pr.subject) NOT LIKE '%gen%'
        AND lower(pr.subject) NOT LIKE '%knowledge%'
      UNION ALL
      SELECT er.subject, er.marks_obtained, 2 AS src
      FROM public.exam_results er
      WHERE er.school_id = p_school_id
        AND er.student_id = p_student_id
        AND er.exam_set_id = p_exam_set_id
        AND lower(er.subject) NOT LIKE '%gen%'
        AND lower(er.subject) NOT LIKE '%knowledge%'
    ),
    dedup_old AS (
      SELECT DISTINCT ON (m.subject)
             m.subject,
             m.marks_obtained
      FROM merged_old m
      ORDER BY m.subject, m.src
    )
    SELECT COALESCE(SUM(COALESCE(d.marks_obtained,0)),0)
    INTO v_total_marks
    FROM dedup_old d;

    SELECT COUNT(DISTINCT cs.subject)
    INTO v_total_class_subjects
    FROM public.class_subjects cs
    WHERE cs.school_id = p_school_id
      AND cs.class_name = p_class_name
      AND lower(cs.subject) NOT LIKE '%gen%'
      AND lower(cs.subject) NOT LIKE '%knowledge%';

    IF COALESCE(v_total_class_subjects,0) = 0 THEN
      WITH merged_old AS (
        SELECT pr.subject, 1 AS src
        FROM public.processed_primary_exam_results pr
        WHERE pr.school_id = p_school_id
          AND pr.student_id = p_student_id
          AND pr.exam_set_id = p_exam_set_id
          AND lower(pr.subject) NOT LIKE '%gen%'
          AND lower(pr.subject) NOT LIKE '%knowledge%'
        UNION ALL
        SELECT er.subject, 2 AS src
        FROM public.exam_results er
        WHERE er.school_id = p_school_id
          AND er.student_id = p_student_id
          AND er.exam_set_id = p_exam_set_id
          AND lower(er.subject) NOT LIKE '%gen%'
          AND lower(er.subject) NOT LIKE '%knowledge%'
      )
      SELECT COUNT(DISTINCT subject)
      INTO v_total_class_subjects
      FROM merged_old;
    END IF;

    v_avg_percent := CASE
      WHEN COALESCE(v_total_class_subjects,0) > 0 THEN v_total_marks / v_total_class_subjects
      ELSE 0
    END;

    -- For nursery old format, use percentage-based PRIMARY comment tables
    SELECT ctcs.comment_text
    INTO v_class_comment
    FROM public.class_teacher_comments_settings ctcs
    WHERE ctcs.school_id = p_school_id
      AND ctcs.class_name = p_class_name
      AND v_avg_percent >= ctcs.min_percent
      AND v_avg_percent <= ctcs.max_percent
    ORDER BY ctcs.min_percent DESC
    LIMIT 1;

    SELECT htcs.comment_text
    INTO v_head_comment
    FROM public.headteacher_comments_settings htcs
    WHERE htcs.school_id = p_school_id
      AND v_avg_percent >= htcs.min_percent
      AND v_avg_percent <= htcs.max_percent
    ORDER BY htcs.min_percent DESC
    LIMIT 1;

    class_teacher_comment := COALESCE(
      v_class_comment,
      CASE
        WHEN COALESCE(v_avg_percent,0) >= 80 THEN 'Excellent work! Keep up the good performance.'
        WHEN COALESCE(v_avg_percent,0) >= 60 THEN 'Good performance. Continue working hard.'
        WHEN COALESCE(v_avg_percent,0) >= 40 THEN 'Fair performance. More effort needed.'
        ELSE 'Needs improvement. Focus more on studies.'
      END
    );

    headteacher_comment := COALESCE(
      v_head_comment,
      CASE
        WHEN COALESCE(v_avg_percent,0) >= 80 THEN 'Excellent work! Keep up the good performance.'
        WHEN COALESCE(v_avg_percent,0) >= 60 THEN 'Good performance. Continue working hard.'
        WHEN COALESCE(v_avg_percent,0) >= 40 THEN 'Fair performance. More effort needed.'
        ELSE 'Needs improvement. Focus more on studies.'
      END
    );

    RETURN NEXT;
    RETURN;
  END IF;

  -- For PRIMARY classes (not nursery)
  SELECT
    (SUM(COALESCE(p.marks_obtained,0))::numeric / NULLIF(SUM(NULLIF(p.total_marks,0))::numeric,0)) * 100
  INTO v_avg_percent
  FROM public.processed_primary_exam_results p
  WHERE p.school_id = p_school_id
    AND p.student_id = p_student_id
    AND p.exam_set_id = p_exam_set_id
    AND p.class_name = p_class_name;

  SELECT ctcs.comment_text
  INTO v_class_comment
  FROM public.class_teacher_comments_settings ctcs
  WHERE ctcs.school_id = p_school_id
    AND ctcs.class_name = p_class_name
    AND v_avg_percent >= ctcs.min_percent
    AND v_avg_percent <= ctcs.max_percent
  ORDER BY ctcs.min_percent DESC
  LIMIT 1;

  SELECT htcs.comment_text
  INTO v_head_comment
  FROM public.headteacher_comments_settings htcs
  WHERE htcs.school_id = p_school_id
    AND v_avg_percent >= htcs.min_percent
    AND v_avg_percent <= htcs.max_percent
  ORDER BY htcs.min_percent DESC
  LIMIT 1;

  class_teacher_comment := COALESCE(
    v_class_comment,
    CASE
      WHEN COALESCE(v_avg_percent,0) >= 80 THEN 'Excellent work! Keep up the good performance.'
      WHEN COALESCE(v_avg_percent,0) >= 60 THEN 'Good performance. Continue working hard.'
      WHEN COALESCE(v_avg_percent,0) >= 40 THEN 'Fair performance. More effort needed.'
      ELSE 'Needs improvement. Focus more on studies.'
    END
  );

  headteacher_comment := COALESCE(
    v_head_comment,
    CASE
      WHEN COALESCE(v_avg_percent,0) >= 80 THEN 'Excellent work! Keep up the good performance.'
      WHEN COALESCE(v_avg_percent,0) >= 60 THEN 'Good performance. Continue working hard.'
      WHEN COALESCE(v_avg_percent,0) >= 40 THEN 'Fair performance. More effort needed.'
      ELSE 'Needs improvement. Focus more on studies.'
    END
  );

  RETURN NEXT;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.save_student_olevel_subjects(p_student_id uuid, p_subject_names text[])
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_school uuid;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL OR NOT public.current_user_can_edit_student_uace_subjects() THEN
    RAISE EXCEPTION 'Not authorized to edit UCE learner subjects.'
      USING ERRCODE = '42501';
  END IF;

  SELECT school_id INTO v_school FROM public.students WHERE student_id = p_student_id;
  IF v_school IS NULL THEN
    RAISE EXCEPTION 'Student not found.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.user_id = v_uid AND u.school_id IS NOT DISTINCT FROM v_school
  ) THEN
    RAISE EXCEPTION 'Not authorized for this school.'
      USING ERRCODE = '42501';
  END IF;

  DELETE FROM public.student_olevel_subjects WHERE student_id = p_student_id;

  INSERT INTO public.student_olevel_subjects (school_id, student_id, subject_name)
  SELECT DISTINCT
    v_school,
    p_student_id,
    trim(both ' ' FROM x)
  FROM unnest(COALESCE(p_subject_names, ARRAY[]::text[])) AS x
  WHERE trim(both ' ' FROM x) <> '';

  PERFORM public.validate_student_olevel_subjects_student(p_student_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.school_calendar_today()
 RETURNS date
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT (CURRENT_TIMESTAMP AT TIME ZONE 'Africa/Kampala')::date;
$function$
;

CREATE OR REPLACE FUNCTION public.school_cashflow_monthly_totals(p_school_id uuid)
 RETURNS TABLE(yr integer, mo integer, fee_receipts numeric, expenses numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'school_cashflow_monthly_totals: authentication required';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.users u WHERE u.user_id = auth.uid() AND u.school_id = p_school_id
  ) THEN
    RAISE EXCEPTION 'school_cashflow_monthly_totals: not authorized for this school';
  END IF;

  RETURN QUERY
  WITH pay AS (
    SELECT
      EXTRACT(YEAR FROM sp.payment_date::date)::integer AS y,
      EXTRACT(MONTH FROM sp.payment_date::date)::integer AS m,
      COALESCE(SUM(sp.amount_paid), 0)::numeric(14, 2) AS fr
    FROM public.student_payments sp
    WHERE sp.school_id = p_school_id
      AND sp.reversed_at IS NULL
      AND sp.payment_date IS NOT NULL
    GROUP BY 1, 2
  ),
  exp AS (
    SELECT
      EXTRACT(YEAR FROM se.expense_date::date)::integer AS y,
      EXTRACT(MONTH FROM se.expense_date::date)::integer AS m,
      COALESCE(SUM(se.amount), 0)::numeric(14, 2) AS ex
    FROM public.school_expenses se
    WHERE se.school_id = p_school_id
      AND lower(se.status) IN ('approved', 'paid')
      AND se.expense_date IS NOT NULL
    GROUP BY 1, 2
  ),
  dims AS (
    SELECT pay.y, pay.m FROM pay
    UNION
    SELECT exp.y, exp.m FROM exp
  )
  SELECT
    d.y AS yr,
    d.m AS mo,
    COALESCE(p.fr, 0)::numeric(14, 2) AS fee_receipts,
    COALESCE(e.ex, 0)::numeric(14, 2) AS expenses
  FROM dims d
  LEFT JOIN pay p ON p.y = d.y AND p.m = d.m
  LEFT JOIN exp e ON e.y = d.y AND e.m = d.m
  ORDER BY d.y, d.m;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.school_chat_finalize_voice(p_message_id uuid, p_relative_path text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  PERFORM private.school_chat_finalize_voice(p_message_id, p_relative_path);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.school_chat_get_or_create_dm(p_other_user_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  RETURN private.school_chat_get_or_create_dm(p_other_user_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.school_chat_list_eligible_users()
 RETURNS TABLE(user_id uuid, name text, role text, email text, last_seen_at timestamp with time zone, session_active boolean)
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  SELECT
    u.user_id, u.name, u.role, u.email,
    COALESCE(p.last_seen_at, u.last_sign_in_at),
    CASE WHEN p.user_id IS NULL THEN false ELSE COALESCE(p.session_active, false) END
  FROM public.users u
  LEFT JOIN public.school_chat_presence p ON p.user_id = u.user_id
  WHERE auth.uid() IS NOT NULL
    AND u.school_id = private.caller_school_id()
    AND u.user_id <> auth.uid()
    AND public.school_chat_pair_allowed(auth.uid(), u.user_id)
  ORDER BY COALESCE(NULLIF(trim(u.name), ''), u.email), u.email;
$function$
;

CREATE OR REPLACE FUNCTION public.school_chat_mark_peer_messages_delivered(p_conversation_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_me uuid;
BEGIN
  v_me := auth.uid();
  IF v_me IS NULL THEN RETURN; END IF;
  IF NOT private.school_chat_user_is_participant(p_conversation_id, v_me) THEN RETURN; END IF;
  UPDATE public.school_chat_messages m
  SET delivered_at = now()
  WHERE m.conversation_id = p_conversation_id
    AND m.sender_id IS DISTINCT FROM v_me
    AND m.delivered_at IS NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.school_chat_my_conversations()
 RETURNS TABLE(conversation_id uuid, peer_user_id uuid, peer_name text, peer_role text, last_body text, last_at timestamp with time zone, unread_count bigint, peer_last_seen_at timestamp with time zone, peer_session_active boolean)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT
    c.id,
    ou.user_id,
    ou.name,
    ou.role,
    (SELECT m.body FROM public.school_chat_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1),
    (SELECT m.created_at FROM public.school_chat_messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1),
    COALESCE((
      SELECT COUNT(*)::bigint
      FROM public.school_chat_messages m
      WHERE m.conversation_id = c.id
        AND m.created_at > COALESCE(p.last_read_at, '-infinity'::timestamptz)
        AND m.sender_id <> (SELECT auth.uid())
    ), 0),
    COALESCE(pr.last_seen_at, ou.last_sign_in_at),
    CASE
      WHEN pr.user_id IS NULL THEN false
      ELSE COALESCE(pr.session_active, false)
    END
  FROM public.school_chat_conversations c
  INNER JOIN public.school_chat_participants p
    ON p.conversation_id = c.id AND p.user_id = (SELECT auth.uid())
  INNER JOIN public.school_chat_participants p2
    ON p2.conversation_id = c.id AND p2.user_id <> (SELECT auth.uid())
  INNER JOIN public.users ou ON ou.user_id = p2.user_id
  LEFT JOIN public.school_chat_presence pr ON pr.user_id = ou.user_id
  ORDER BY c.updated_at DESC NULLS LAST;
$function$
;

CREATE OR REPLACE FUNCTION public.school_chat_pair_allowed(p_viewer uuid, p_target uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v_school_viewer uuid;
  v_school_target uuid;
  v_av boolean;
  v_at boolean;
BEGIN
  IF p_viewer IS NULL OR p_target IS NULL OR p_viewer = p_target THEN
    RETURN FALSE;
  END IF;

  SELECT u.school_id, COALESCE(u.is_active, true)
  INTO v_school_viewer, v_av
  FROM public.users u
  WHERE u.user_id = p_viewer;

  IF v_school_viewer IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT u.school_id, COALESCE(u.is_active, true)
  INTO v_school_target, v_at
  FROM public.users u
  WHERE u.user_id = p_target;

  IF v_school_target IS NULL OR v_school_viewer <> v_school_target THEN
    RETURN FALSE;
  END IF;

  IF v_av = false OR v_at = false THEN
    RETURN FALSE;
  END IF;

  RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.school_chat_ping_presence()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v_user_id   uuid := auth.uid();
  v_school_id uuid;
BEGIN
  IF v_user_id IS NULL THEN RETURN; END IF;
  SELECT school_id INTO v_school_id FROM public.users WHERE user_id = v_user_id LIMIT 1;
  IF v_school_id IS NULL THEN RETURN; END IF;
  INSERT INTO public.school_chat_presence (user_id, school_id, last_seen_at, session_active)
  VALUES (v_user_id, v_school_id, now(), true)
  ON CONFLICT (user_id) DO UPDATE
    SET school_id = EXCLUDED.school_id, last_seen_at = EXCLUDED.last_seen_at, session_active = true;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.school_chat_presence_go_offline()
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.school_chat_presence
  SET session_active = false, last_seen_at = now()
  WHERE user_id = auth.uid();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.school_chat_retention_run()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
 SET row_security TO 'off'
AS $function$
BEGIN
  -- Strip voice audio after 2 days (storage + DB pointer + placeholder body).
  DELETE FROM storage.objects o
  WHERE o.bucket_id = 'school-chat-voice'
    AND o.name IN (
      SELECT m.audio_path
      FROM public.school_chat_messages m
      WHERE m.msg_kind = 'voice'
        AND m.audio_path IS NOT NULL
        AND m.created_at <= now() - interval '2 days'
    );

  UPDATE public.school_chat_messages m
  SET
    audio_path = NULL,
    body = 'Voice note expired (no longer available).'
  WHERE m.msg_kind = 'voice'
    AND m.audio_path IS NOT NULL
    AND m.created_at <= now() - interval '2 days';

  -- Remove every message (and leftover voice files) after 7 days.
  DELETE FROM storage.objects o
  WHERE o.bucket_id = 'school-chat-voice'
    AND o.name IN (
      SELECT m.audio_path
      FROM public.school_chat_messages m
      WHERE m.created_at <= now() - interval '7 days'
        AND m.audio_path IS NOT NULL
    );

  DELETE FROM public.school_chat_messages m
  WHERE m.created_at <= now() - interval '7 days';
END;
$function$
;

CREATE OR REPLACE FUNCTION public.school_chat_touch_conversation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.school_chat_conversations
  SET updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.school_chat_user_is_participant(p_conversation_id uuid, p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 SET search_path TO ''
AS $function$
  SELECT
    EXISTS (SELECT 1 FROM public.school_chat_participants WHERE conversation_id = p_conversation_id AND user_id = p_user_id)
    AND EXISTS (SELECT 1 FROM public.school_chat_participants WHERE conversation_id = p_conversation_id AND user_id = auth.uid());
$function$
;

CREATE OR REPLACE FUNCTION public.school_expenses_enforce_approval_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status IN ('approved', 'paid') THEN
    IF NOT public.current_user_can_school_expense_direct_approve(NEW.school_id) THEN
      NEW.status := 'pending';
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.schools_mark_cascade_deleting()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM set_config('app.cascade_deleting_school_id', OLD.school_id::text, true);
  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.seed_expense_subcategories_for_school(p_school_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.expense_subcategories (school_id, main_category_code, name, is_salary, sort_order)
  SELECT p_school_id, d.main_category_code, d.name, d.is_salary, d.sort_order
  FROM public.expense_subcategory_defaults d
  ON CONFLICT (school_id, main_category_code, name) DO NOTHING;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.seed_pre_primary_holistic_for_school(p_school_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_type text;
BEGIN
  SELECT type INTO v_type FROM public.schools WHERE school_id = p_school_id;
  IF v_type IS NULL THEN
    RETURN;
  END IF;
  IF v_type NOT IN ('Primary', 'Nursery/Primary') THEN
    RETURN;
  END IF;

  INSERT INTO public.pre_primary_holistic_strands (school_id, subject, sort_order)
  VALUES
    (p_school_id, 'Relating with others (Social development)', 10),
    (p_school_id, 'Relating and knowing my environment (Language I)', 20),
    (p_school_id, 'Taking care of myself (Health habits)', 30),
    (p_school_id, 'Development and using mathematical concepts', 40),
    (p_school_id, 'Development and using language (Language II)', 50)
  ON CONFLICT (school_id, subject) DO NOTHING;

  INSERT INTO public.pre_primary_holistic_skills (school_id, strand_id, skill_key, label, sort_order)
  SELECT p_school_id, st.id, x.skill_key, x.label, x.ord
  FROM public.pre_primary_holistic_strands st
  INNER JOIN (
    VALUES
      ('Relating with others (Social development)', 10, 'relating_with_others', 'Relating with others'),
      ('Relating with others (Social development)', 20, 'games', 'Games'),
      ('Relating with others (Social development)', 30, 'helping', 'Helping others'),
      ('Relating and knowing my environment (Language I)', 10, 'naming', 'Naming'),
      ('Relating and knowing my environment (Language I)', 20, 'cleanliness', 'Cleanliness'),
      ('Relating and knowing my environment (Language I)', 30, 'caring_for_the_environment', 'Caring for the environment'),
      ('Taking care of myself (Health habits)', 10, 'taking_care_of_myself', 'Taking care of myself'),
      ('Taking care of myself (Health habits)', 20, 'toilet_habits', 'Toilet habits'),
      ('Taking care of myself (Health habits)', 30, 'body_hygiene', 'Body hygiene'),
      ('Development and using mathematical concepts', 10, 'reciting_numbers', 'Reciting numbers'),
      ('Development and using mathematical concepts', 20, 'counting_concepts', 'Counting concepts'),
      ('Development and using mathematical concepts', 30, 'addition_concepts', 'Additional concepts'),
      ('Development and using language (Language II)', 10, 'drawing', 'Drawing'),
      ('Development and using language (Language II)', 20, 'reading', 'Reading'),
      ('Development and using language (Language II)', 30, 'writing', 'Writing')
  ) AS x(subject, ord, skill_key, label)
    ON st.school_id = p_school_id AND st.subject = x.subject
  ON CONFLICT (school_id, skill_key) DO NOTHING;

  INSERT INTO public.pre_primary_holistic_rating_levels (school_id, grade_enum, display_label, color_hex, sort_order)
  VALUES
    (p_school_id, 'VERY_GOOD', 'Very Good', '#c0392b', 1),
    (p_school_id, 'GOOD', 'Good', '#d4ac0d', 2),
    (p_school_id, 'NEEDS_IMPROVEMENT', 'Needs Improvement', '#1a7a35', 3),
    (p_school_id, 'TRIES', 'Tries', '#1a5fa0', 4)
  ON CONFLICT (school_id, grade_enum) DO NOTHING;

  INSERT INTO public.nursery_detailed_observation_items (
    school_id, strand, subsection, sort_order, item_key, prompt_text,
    response_yes, response_tries, response_never, response_good, response_needs_improvement
  )
  VALUES
    (p_school_id, 'social_development', NULL, 10, 'relating_with_others', 'Relating with others',
      'Shows good teamwork. And positive interaction.', 'Works well with others most of the time.', 'Beginning to join in; small steps with the group.',
      'Works well with others most of the time.', 'Still learning to work smoothly with peers; reminders help.'),
    (p_school_id, 'social_development', NULL, 20, 'games', 'Games',
      'Shows excellent participation and teamwork in games.', 'Joins games well; plays fairly most of the time.', 'Starting to take part in games; needs time to settle.',
      'Joins games well; plays fairly most of the time.', 'Joins with encouragement; skills still growing.'),
    (p_school_id, 'social_development', NULL, 30, 'helping', 'Helping others',
      'Helps others willingly and shows care.', 'Often helps classmates; care is growing.', 'Small kind gestures appear; more practice ahead.',
      'Often helps classmates; care is growing.', 'Helps when prompted; habit still forming.'),
    (p_school_id, 'knowing_environment', NULL, 10, 'naming', 'Naming',
      'Identifies and names objects correctly.', 'Names most objects with a little cue.', 'Beginning to name familiar things; praise helps.',
      'Names most objects with a little cue.', 'Names some items; confidence still building.'),
    (p_school_id, 'knowing_environment', NULL, 20, 'cleanliness', 'Cleanliness',
      'Keep self and surroundings clean all times.', 'Usually tidy; odd slip on busy days.', 'Learning tidiness routines; small gains each week.',
      'Usually tidy; odd slip on busy days.', 'Needs gentle reminders; slow steady progress.'),
    (p_school_id, 'knowing_environment', NULL, 30, 'caring_for_the_environment', 'Caring for the environment',
      'Keeps environment clean and tidy.', 'Cares for shared space most of the time.', 'Shows interest; guided practice will help.',
      'Cares for shared space most of the time.', 'Still learning daily care for shared areas.'),
    (p_school_id, 'health_habits', NULL, 10, 'taking_care_of_myself', 'Taking care of myself',
      'Performs simple, independent skills. Like cleaning the nose.', 'Does many self-care tasks with light help.', 'Early self-care steps; celebrate small wins.',
      'Does many self-care tasks with light help.', 'Tries self-care; often still needs adult support.'),
    (p_school_id, 'health_habits', NULL, 20, 'toilet_habits', 'Toilet habits',
      'Take self to the toilet on own.', 'Mostly manages; occasional reminders.', 'Learning independence; patience and habit help.',
      'Mostly manages; occasional reminders.', 'Routine improving; regular prompts still help.'),
    (p_school_id, 'health_habits', NULL, 30, 'body_hygiene', 'Body hygiene',
      'Maintains personal cleanliness.', 'Usually clean; forgets a step now and then.', 'Noticing cleanliness with support; building routine.',
      'Usually clean; forgets a step now and then.', 'Habits forming; gentle follow-ups help.'),
    (p_school_id, 'mathematical_concepts', NULL, 10, 'reciting_numbers', 'Reciting numbers',
      'Can recite all those numbers.', 'Recites most with a starter cue.', 'Beginning to recite familiar numbers; praise helps.',
      'Recites most with a starter cue.', 'Reciting still shaky; short daily practice helps.'),
    (p_school_id, 'mathematical_concepts', NULL, 20, 'counting_concepts', 'Counting concepts',
      'Can match numbers to pictures.', 'Matches well with a cue sometimes.', 'First tries at matching; praise small rights.',
      'Matches well with a cue sometimes.', 'Still learning number–picture links alone.'),
    (p_school_id, 'mathematical_concepts', NULL, 30, 'addition_concepts', 'Additional concepts',
      'Is able to add numbers. From one to 10.', 'Adds with counters or light help.', 'Trying simple adding; confidence growing slowly.',
      'Adds with counters or light help.', 'Addition fuzzy without support; practice will help.'),
    (p_school_id, 'language_development', NULL, 10, 'drawing', 'Drawing',
      'Draws big and self explanatory pictures.', 'Clear pictures most of the time.', 'Enjoys trying; detail comes with time.',
      'Clear pictures most of the time.', 'Pictures still small or unclear; room to grow.'),
    (p_school_id, 'language_development', NULL, 20, 'reading', 'Reading',
      'Can read correct words /sounds.', 'Reads many words/sounds; slips when tired.', 'Beginning to sound out; praise tiny steps.',
      'Reads many words/sounds; slips when tired.', 'Reading building slowly; little reads daily help.'),
    (p_school_id, 'language_development', NULL, 30, 'writing', 'Writing',
      'Can write words / sounds.', 'Writes many words/sounds; spacing uneven.', 'Starting to copy letters; effort shows.',
      'Writes many words/sounds; spacing uneven.', 'Writing still forming; practice and fine-motor help.')
  ON CONFLICT (school_id, item_key) DO NOTHING;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_admission_sequence_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new admission sequences
    IF NEW.current_sequence IS NULL THEN
        NEW.current_sequence := 1;
    END IF;
    
    IF NEW.prefix IS NULL THEN
        NEW.prefix := 'STD';
    END IF;
    
    IF NEW.suffix IS NULL THEN
        NEW.suffix := '';
    END IF;
    
    -- Ensure admission sequence is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Admission sequence must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_affiliate_click_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new affiliate clicks
    IF NEW.clicked_at IS NULL THEN
        NEW.clicked_at := NOW();
    END IF;
    
    IF NEW.is_converted IS NULL THEN
        NEW.is_converted := false;
    END IF;
    
    IF NEW.converted_at IS NULL THEN
        NEW.converted_at := NULL;
    END IF;
    
    -- Ensure affiliate click is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Affiliate click must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_affiliate_code_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new affiliate codes
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    IF NEW.updated_at IS NULL THEN
        NEW.updated_at := NOW();
    END IF;
    
    IF NEW.max_uses IS NULL THEN
        NEW.max_uses := 1000;
    END IF;
    
    IF NEW.current_uses IS NULL THEN
        NEW.current_uses := 0;
    END IF;
    
    -- Ensure affiliate code is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Affiliate code must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_affiliate_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new affiliates
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    IF NEW.updated_at IS NULL THEN
        NEW.updated_at := NOW();
    END IF;
    
    IF NEW.commission_rate IS NULL THEN
        NEW.commission_rate := 0.10;
    END IF;
    
    -- Ensure affiliate is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Affiliate must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_affiliate_earning_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new affiliate earnings
    IF NEW.amount IS NULL THEN
        NEW.amount := 0;
    END IF;
    
    IF NEW.earned_at IS NULL THEN
        NEW.earned_at := NOW();
    END IF;
    
    IF NEW.paid_at IS NULL THEN
        NEW.paid_at := NULL;
    END IF;
    
    -- Ensure affiliate earning is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Affiliate earning must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_attendance_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new attendance
    IF NEW.date IS NULL THEN
        NEW.date := CURRENT_DATE;
    END IF;
    
    IF NEW.present IS NULL THEN
        NEW.present := true;
    END IF;
    
    IF NEW.remarks IS NULL THEN
        NEW.remarks := 'Present';
    END IF;
    
    -- Ensure attendance is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Attendance must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_class_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new classes
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    IF NEW.updated_at IS NULL THEN
        NEW.updated_at := NOW();
    END IF;
    
    IF NEW.max_students IS NULL THEN
        NEW.max_students := 50;
    END IF;
    
    -- Ensure class is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Class must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_class_subject_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Class subject must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_class_teacher_comments_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    -- Set default comment if not provided
    IF NEW.comment IS NULL OR NEW.comment = '' THEN
        NEW.comment = 'A good performance with steady progress. Continued effort and focus will lead to even better achievement.';
    END IF;
    
    -- Set default is_default if not provided
    IF NEW.is_default IS NULL THEN
        NEW.is_default = false;
    END IF;
    
    -- Set default created_at if not provided
    IF NEW.created_at IS NULL THEN
        NEW.created_at = NOW();
    END IF;
    
    -- Set default updated_at if not provided
    IF NEW.updated_at IS NULL THEN
        NEW.updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_class_teacher_comments_setting_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new class teacher comments settings
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    IF NEW.updated_at IS NULL THEN
        NEW.updated_at := NOW();
    END IF;
    
    IF NEW.is_default IS NULL THEN
        NEW.is_default := false;
    END IF;
    
    -- Ensure class teacher comments setting is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Class teacher comments setting must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_class_teacher_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    -- Set default year if not provided
    IF NEW.year IS NULL THEN
        NEW.year = EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
    END IF;
    
    -- Set default term if not provided (current term is 3)
    IF NEW.term IS NULL THEN
        NEW.term = 3;
    END IF;
    
    -- Set default created_at if not provided
    IF NEW.created_at IS NULL THEN
        NEW.created_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_class_teacher_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new class teachers
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    IF NEW.updated_at IS NULL THEN
        NEW.updated_at := NOW();
    END IF;
    
    IF NEW.is_primary IS NULL THEN
        NEW.is_primary := true;
    END IF;
    
    -- Ensure class teacher is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Class teacher must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_class_template_setting_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new class template settings
    IF NEW.is_o_level IS NULL THEN
        NEW.is_o_level := false;
    END IF;
    
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    IF NEW.updated_at IS NULL THEN
        NEW.updated_at := NOW();
    END IF;
    
    -- Ensure class template setting is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Class template setting must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_discipline_record_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new discipline records
    IF NEW.incident_date IS NULL THEN
        NEW.incident_date := CURRENT_DATE;
    END IF;
    
    IF NEW.severity IS NULL THEN
        NEW.severity := 'minor';
    END IF;
    
    IF NEW.resolved_at IS NULL THEN
        NEW.resolved_at := NULL;
    END IF;
    
    -- Ensure discipline record is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Discipline record must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_exam_result_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  -- Ensure created_at exists
  IF NEW.created_at IS NULL THEN
    NEW.created_at := NOW();
  END IF;

  -- Ensure updated_at exists
  IF NEW.updated_at IS NULL THEN
    NEW.updated_at := NOW();
  END IF;

  -- No other mutations needed here
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_exam_result_grade_from_marks()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.schools s
    WHERE s.school_id = NEW.school_id
      AND s.type IN ('Nursery/Primary', 'Primary')
  ) THEN
    IF NEW.marks_obtained IS NOT NULL AND NEW.total_marks IS NOT NULL AND NEW.total_marks > 0 THEN
      IF NEW.grade IS NULL OR NEW.grade = '' OR NEW.grade IN ('A','B','C','D','E','F') THEN
        NEW.grade := public.calculate_primary_grade_from_marks(
          NEW.marks_obtained,
          NEW.total_marks,
          NEW.school_id
        );
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_exam_set_active_for_input(p_exam_set_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
    exam_set_record RECORD;
BEGIN
    -- Get the exam set details
    SELECT school_id, term, year INTO exam_set_record
    FROM exam_sets 
    WHERE exam_set_id = p_exam_set_id;
    
    -- Set all exam sets for this school, term, and year to inactive
    UPDATE exam_sets 
    SET active_for_input = false 
    WHERE school_id = exam_set_record.school_id 
    AND term = exam_set_record.term 
    AND year = exam_set_record.year;
    
    -- Set the specified exam set as active
    UPDATE exam_sets 
    SET active_for_input = true 
    WHERE exam_set_id = p_exam_set_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_exam_set_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new exam sets
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    IF NEW.updated_at IS NULL THEN
        NEW.updated_at := NOW();
    END IF;
    
    -- Ensure exam set is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Exam set must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_expense_category_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new expense categories
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    IF NEW.updated_at IS NULL THEN
        NEW.updated_at := NOW();
    END IF;
    
    IF NEW.is_default IS NULL THEN
        NEW.is_default := false;
    END IF;
    
    -- Ensure expense category is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Expense category must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_grade_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new grades
    IF NEW.grade IS NULL THEN
        NEW.grade := 'F';
    END IF;
    
    IF NEW.remarks IS NULL THEN
        NEW.remarks := 'No remarks provided';
    END IF;
    
    IF NEW.initials IS NULL THEN
        NEW.initials := 'N/A';
    END IF;
    
    -- Ensure grade is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Grade must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_headteacher_comments_setting_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.created_at IS NULL THEN
    NEW.created_at := NOW();
  END IF;
  IF NEW.updated_at IS NULL THEN
    NEW.updated_at := NOW();
  END IF;
  IF NEW.school_id IS NULL THEN
    RAISE EXCEPTION 'Headteacher comments setting must be linked to a school';
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_job_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new jobs
    IF NEW.posted_date IS NULL THEN
        NEW.posted_date := CURRENT_DATE;
    END IF;
    
    IF NEW.application_deadline IS NULL THEN
        NEW.application_deadline := CURRENT_DATE + INTERVAL '30 days';
    END IF;
    
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    -- Ensure job is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Job must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_library_book_copy_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new library book copies
    IF NEW.copy_number IS NULL THEN
        NEW.copy_number := 1;
    END IF;
    
    IF NEW.status IS NULL THEN
        NEW.status := 'available';
    END IF;
    
    IF NEW.date_added IS NULL THEN
        NEW.date_added := CURRENT_DATE;
    END IF;
    
    -- Ensure library book copy is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Library book copy must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_library_book_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new library books
    IF NEW.date_added IS NULL THEN
        NEW.date_added := CURRENT_DATE;
    END IF;
    
    IF NEW.total_copies IS NULL THEN
        NEW.total_copies := 1;
    END IF;
    
    IF NEW.available_copies IS NULL THEN
        NEW.available_copies := 1;
    END IF;
    
    -- Ensure library book is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Library book must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_log_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new logs
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    IF NEW.level IS NULL THEN
        NEW.level := 'info';
    END IF;
    
    IF NEW.category IS NULL THEN
        NEW.category := 'general';
    END IF;
    
    -- Ensure log is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Log must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_notification_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new notifications
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    IF NEW.scheduled_at IS NULL THEN
        NEW.scheduled_at := NOW();
    END IF;
    
    IF NEW.is_urgent IS NULL THEN
        NEW.is_urgent := false;
    END IF;
    
    -- Ensure notification is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Notification must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_notification_log_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new notification logs
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    IF NEW.sent_at IS NULL THEN
        NEW.sent_at := NOW();
    END IF;
    
    IF NEW.retry_count IS NULL THEN
        NEW.retry_count := 0;
    END IF;
    
    -- Ensure notification log is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Notification log must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_notification_template_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new notification templates
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    IF NEW.updated_at IS NULL THEN
        NEW.updated_at := NOW();
    END IF;
    
    IF NEW.is_default IS NULL THEN
        NEW.is_default := false;
    END IF;
    
    -- Ensure notification template is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Notification template must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_old_student_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF NEW.graduation_year IS NULL THEN
        NEW.graduation_year := EXTRACT(YEAR FROM CURRENT_DATE)::INTEGER;
    END IF;
    
    IF NEW.final_class IS NULL THEN
        NEW.final_class := 'Primary 7';
    END IF;
    
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Old student must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_parent_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new parents
    IF NEW.relationship IS NULL THEN
        NEW.relationship := 'parent';
    END IF;
    
    IF NEW.is_primary_contact IS NULL THEN
        NEW.is_primary_contact := true;
    END IF;
    
    -- Ensure parent is properly linked to school and student
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Parent must be linked to a school';
    END IF;
    
    IF NEW.student_id IS NULL THEN
        RAISE EXCEPTION 'Parent must be linked to a student';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_payment_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new payments
    IF NEW.amount IS NULL THEN
        NEW.amount := 0;
    END IF;
    
    IF NEW.payment_date IS NULL THEN
        NEW.payment_date := CURRENT_DATE;
    END IF;
    
    IF NEW.payment_method IS NULL THEN
        NEW.payment_method := 'cash';
    END IF;
    
    -- Ensure payment is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Payment must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_processed_primary_exam_result_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new processed primary exam results
    IF NEW.total_marks IS NULL THEN
        NEW.total_marks := 0;
    END IF;
    
    IF NEW.average_score IS NULL THEN
        NEW.average_score := 0;
    END IF;
    
    IF NEW.identifier IS NULL THEN
        NEW.identifier := 1;
    END IF;
    
    IF NEW.overall_identifier IS NULL THEN
        NEW.overall_identifier := 1;
    END IF;
    
    IF NEW.overall_learner_achievement IS NULL THEN
        NEW.overall_learner_achievement := 'Below Basic';
    END IF;
    
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    -- Ensure processed primary exam result is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Processed primary exam result must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_receipt_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new receipts
    IF NEW.receipt_id IS NULL THEN
        NEW.receipt_id := gen_random_uuid();
    END IF;
    
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_receipt_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new receipts
    IF NEW.receipt_id IS NULL THEN
        NEW.receipt_id := gen_random_uuid();
    END IF;
    
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    IF NEW.updated_at IS NULL THEN
        NEW.updated_at := NOW();
    END IF;
    
    -- Ensure receipt is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Receipt must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_report_comment_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new report comments
    IF NEW.comment_type IS NULL THEN
        NEW.comment_type := 'general';
    END IF;
    
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    IF NEW.updated_at IS NULL THEN
        NEW.updated_at := NOW();
    END IF;
    
    -- Ensure report comment is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Report comment must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_report_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new reports
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_report_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new reports
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    IF NEW.updated_at IS NULL THEN
        NEW.updated_at := NOW();
    END IF;
    
    -- Ensure report is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Report must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_report_template_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ BEGIN IF NEW.created_at IS NULL THEN NEW.created_at := NOW(); END IF; IF NEW.updated_at IS NULL THEN NEW.updated_at := NOW(); END IF; IF NEW.school_id IS NULL AND NOT COALESCE(NEW.is_default, false) THEN RAISE EXCEPTION 'Report template must be linked to a school'; END IF; RETURN NEW; END; $function$
;

CREATE OR REPLACE FUNCTION public.set_report_title_setting_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new report title settings
    IF NEW.use_dynamic_term IS NULL THEN
        NEW.use_dynamic_term := true;
    END IF;
    
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    IF NEW.updated_at IS NULL THEN
        NEW.updated_at := NOW();
    END IF;
    
    -- Ensure report title setting is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Report title setting must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_school_code_if_empty()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.school_code IS NULL OR TRIM(COALESCE(NEW.school_code, '')) = '' THEN
    NEW.school_code := generate_unique_school_code(NEW.name, NULL);
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_school_event_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new school events
    IF NEW.start_date IS NULL THEN
        NEW.start_date := CURRENT_DATE;
    END IF;
    
    IF NEW.end_date IS NULL THEN
        NEW.end_date := CURRENT_DATE;
    END IF;
    
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    -- Ensure school event is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'School event must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_school_expense_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new school expenses
    IF NEW.status IS NULL THEN
        NEW.status := 'pending';
    END IF;
    
    IF NEW.payment_method IS NULL THEN
        NEW.payment_method := 'cash';
    END IF;
    
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    -- Auto-populate category_name if category_id is provided
    IF NEW.category_id IS NOT NULL AND NEW.category_name IS NULL THEN
        SELECT category_name INTO NEW.category_name
        FROM expense_categories 
        WHERE category_id = NEW.category_id;
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_school_expense_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new school expenses
    IF NEW.amount IS NULL THEN
        NEW.amount := 0;
    END IF;
    
    IF NEW.expense_date IS NULL THEN
        NEW.expense_date := CURRENT_DATE;
    END IF;
    
    IF NEW.payment_method IS NULL THEN
        NEW.payment_method := 'cash';
    END IF;
    
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    -- Ensure school expense is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'School expense must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_school_report_customization_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new school report customizations
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    IF NEW.updated_at IS NULL THEN
        NEW.updated_at := NOW();
    END IF;
    
    IF NEW.is_default IS NULL THEN
        NEW.is_default := false;
    END IF;
    
    -- Ensure school report customization is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'School report customization must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_school_term_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new school terms
    IF NEW.year IS NULL THEN
        NEW.year := EXTRACT(YEAR FROM NOW());
    END IF;
    
    IF NEW.term IS NULL THEN
        NEW.term := 1;
    END IF;
    
    IF NEW.start_date IS NULL THEN
        NEW.start_date := CURRENT_DATE;
    END IF;
    
    IF NEW.end_date IS NULL THEN
        NEW.end_date := CURRENT_DATE + INTERVAL '3 months';
    END IF;
    
    -- Ensure school term is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'School term must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_staff_employee_id_on_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF NEW.role IN ('admin', 'accountant', 'librarian', 'head_teacher')
     AND NEW.school_id IS NOT NULL
     AND (NEW.employee_id IS NULL OR TRIM(NEW.employee_id) = '') THEN
    NEW.employee_id := public.next_employee_id_for_school(NEW.school_id);
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_student_admission_number_if_empty()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.admission_number IS NULL OR TRIM(COALESCE(NEW.admission_number, '')) = '' THEN
    NEW.admission_number := generate_admission_number(
      NEW.school_id,
      COALESCE(NEW.first_name, ''),
      NEW.middle_name,
      COALESCE(NEW.last_name, ''),
      COALESCE(NEW.admission_date, CURRENT_DATE)
    );
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_student_attendance_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new student attendance
    IF NEW.present IS NULL THEN
        NEW.present := true;
    END IF;
    
    IF NEW.date IS NULL THEN
        NEW.date := CURRENT_DATE;
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_student_attendance_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new student attendance
    IF NEW.present IS NULL THEN
        NEW.present := true;
    END IF;
    
    IF NEW.date IS NULL THEN
        NEW.date := CURRENT_DATE;
    END IF;
    
    IF NEW.remarks IS NULL THEN
        NEW.remarks := 'Present';
    END IF;
    
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    -- Ensure student attendance is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Student attendance must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_student_balance_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    -- Set updated_at if not provided
    IF NEW.updated_at IS NULL THEN
        NEW.updated_at := NOW();
    END IF;
    
    -- Set created_at if not provided
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    -- Ensure student balance is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Student balance must be linked to a school';
    END IF;
    
    -- Auto-populate year and term from term_id if not provided
    IF NEW.year IS NULL OR NEW.term IS NULL THEN
        SELECT st.year, st.term INTO NEW.year, NEW.term
        FROM public.school_terms st
        WHERE st.id = NEW.term_id;
    END IF;
    
    -- Auto-calculate balance if not set (for non-generated column)
    IF NEW.balance IS NULL THEN
        NEW.balance := COALESCE(NEW.total_fees, 0) - COALESCE(NEW.total_paid, 0);
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_student_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new students
    IF NEW.expected_fee_amount IS NULL THEN
        NEW.expected_fee_amount := 0;
    END IF;
    
    IF NEW.admission_date IS NULL THEN
        NEW.admission_date := CURRENT_DATE;
    END IF;
    
    IF NEW.status IS NULL THEN
        NEW.status := 'active';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_student_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new students
    IF NEW.expected_fee_amount IS NULL THEN
        NEW.expected_fee_amount := 0;
    END IF;
    
    IF NEW.admission_date IS NULL THEN
        NEW.admission_date := CURRENT_DATE;
    END IF;
    
    IF NEW.status IS NULL THEN
        NEW.status := 'active';
    END IF;
    
    -- Ensure student is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Student must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_student_fee_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new student fees
    IF NEW.fee_amount IS NULL THEN
        NEW.fee_amount := 0;
    END IF;
    
    IF NEW.paid_amount IS NULL THEN
        NEW.paid_amount := 0;
    END IF;
    
    IF NEW.balance IS NULL THEN
        NEW.balance := 0;
    END IF;
    
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    IF NEW.updated_at IS NULL THEN
        NEW.updated_at := NOW();
    END IF;
    
    -- Ensure student fee is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Student fee must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_student_payment_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new student payments
    IF NEW.amount_paid IS NULL THEN
        NEW.amount_paid := 0;
    END IF;
    
    IF NEW.payment_date IS NULL THEN
        NEW.payment_date := CURRENT_DATE;
    END IF;
    
    IF NEW.payment_method IS NULL THEN
        NEW.payment_method := 'cash';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_student_payment_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new student payments
    IF NEW.amount_paid IS NULL THEN
        NEW.amount_paid := 0;
    END IF;
    
    IF NEW.payment_date IS NULL THEN
        NEW.payment_date := CURRENT_DATE;
    END IF;
    
    IF NEW.payment_method IS NULL THEN
        NEW.payment_method := 'cash';
    END IF;
    
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    -- Ensure student payment is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Student payment must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_subject_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new subjects
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    -- Ensure subject is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Subject must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_teacher_attendance_log_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ BEGIN IF NEW.attendance_date IS NULL THEN NEW.attendance_date := CURRENT_DATE; END IF; IF NEW.check_in_time IS NULL THEN NEW.check_in_time := NOW(); END IF; IF NEW.remarks IS NULL THEN NEW.remarks := 'Present'; END IF; IF NEW.school_id IS NULL THEN RAISE EXCEPTION 'Teacher attendance log must be linked to a school'; END IF; RETURN NEW; END; $function$
;

CREATE OR REPLACE FUNCTION public.set_teacher_class_subject_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  -- Ensure created_at exists; do not reference updated_at
  IF NEW.created_at IS NULL THEN
    NEW.created_at := NOW();
  END IF;

  -- No other mutations needed here
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_teacher_comment_rule_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new teacher comment rules
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    IF NEW.updated_at IS NULL THEN
        NEW.updated_at := NOW();
    END IF;
    
    IF NEW.is_default IS NULL THEN
        NEW.is_default := false;
    END IF;
    
    -- Ensure teacher comment rule is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Teacher comment rule must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_teacher_remarks_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    -- Set default remark if not provided
    IF NEW.remark IS NULL OR NEW.remark = '' THEN
        NEW.remark = 'A good performance with steady progress. Continued effort and focus will lead to even better achievement.';
    END IF;
    
    -- Set default is_default if not provided
    IF NEW.is_default IS NULL THEN
        NEW.is_default = false;
    END IF;
    
    -- Set default created_at if not provided
    IF NEW.created_at IS NULL THEN
        NEW.created_at = NOW();
    END IF;
    
    -- Set default updated_at if not provided
    IF NEW.updated_at IS NULL THEN
        NEW.updated_at = NOW();
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_teacher_remarks_setting_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new teacher remarks settings
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    IF NEW.updated_at IS NULL THEN
        NEW.updated_at := NOW();
    END IF;
    
    IF NEW.is_default IS NULL THEN
        NEW.is_default := false;
    END IF;
    
    -- Ensure teacher remarks setting is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Teacher remarks setting must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_term_closure_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new term closures
    IF NEW.closure_date IS NULL THEN
        NEW.closure_date := CURRENT_DATE;
    END IF;
    
    IF NEW.is_final IS NULL THEN
        NEW.is_final := false;
    END IF;
    
    IF NEW.created_at IS NULL THEN
        NEW.created_at := NOW();
    END IF;
    
    -- Ensure term closure is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Term closure must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_termly_project_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new termly projects
    IF NEW.assigned_date IS NULL THEN
        NEW.assigned_date := CURRENT_DATE;
    END IF;
    
    IF NEW.due_date IS NULL THEN
        NEW.due_date := CURRENT_DATE + INTERVAL '30 days';
    END IF;
    
    -- Ensure termly project is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'Termly project must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_user_defaults_and_linking()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Set default values for new users
    IF NEW.role IS NULL THEN
        NEW.role := 'student';
    END IF;
    
    -- Ensure user is properly linked to school
    IF NEW.school_id IS NULL THEN
        RAISE EXCEPTION 'User must be linked to a school';
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.setup_complete_school_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Insert default nursery subjects for the new school
    PERFORM insert_default_nursery_subjects(NEW.school_id);
    
    -- Insert default primary subjects for the new school
    INSERT INTO subjects (school_id, name, description, is_core, created_at, updated_at) VALUES 
    (NEW.school_id, 'LITERACY I', 'Primary literacy subject', true, NOW(), NOW()),
    (NEW.school_id, 'LITERACY II', 'Primary literacy subject', true, NOW(), NOW()),
    (NEW.school_id, 'NUMERACY', 'Primary mathematics subject', true, NOW(), NOW()),
    (NEW.school_id, 'ENGLISH', 'English language subject', true, NOW(), NOW()),
    (NEW.school_id, 'SCIENCE', 'Science subject', true, NOW(), NOW()),
    (NEW.school_id, 'SOCIAL STUDIES', 'Social studies subject', true, NOW(), NOW()),
    (NEW.school_id, 'RELIGIOUS EDUCATION', 'Religious education subject', true, NOW(), NOW()),
    (NEW.school_id, 'PHYSICAL EDUCATION', 'Physical education subject', true, NOW(), NOW()),
    (NEW.school_id, 'ART AND CRAFT', 'Art and craft subject', true, NOW(), NOW()),
    (NEW.school_id, 'MUSIC', 'Music subject', true, NOW(), NOW());
    
    -- Insert default classes for the new school
    INSERT INTO classes (school_id, class_name, description, max_students, created_at, updated_at) VALUES 
    (NEW.school_id, 'Nursery', 'Nursery class', 30, NOW(), NOW()),
    (NEW.school_id, 'Primary 1', 'Primary 1 class', 50, NOW(), NOW()),
    (NEW.school_id, 'Primary 2', 'Primary 2 class', 50, NOW(), NOW()),
    (NEW.school_id, 'Primary 3', 'Primary 3 class', 50, NOW(), NOW()),
    (NEW.school_id, 'Primary 4', 'Primary 4 class', 50, NOW(), NOW()),
    (NEW.school_id, 'Primary 5', 'Primary 5 class', 50, NOW(), NOW()),
    (NEW.school_id, 'Primary 6', 'Primary 6 class', 50, NOW(), NOW()),
    (NEW.school_id, 'Primary 7', 'Primary 7 class', 50, NOW(), NOW());
    
    -- Insert default school terms for the new school
    INSERT INTO school_terms (school_id, year, term, start_date, end_date, is_active, created_at, updated_at) VALUES 
    (NEW.school_id, EXTRACT(YEAR FROM NOW()), 1, DATE_TRUNC('year', NOW()), DATE_TRUNC('year', NOW()) + INTERVAL '3 months', true, NOW(), NOW()),
    (NEW.school_id, EXTRACT(YEAR FROM NOW()), 2, DATE_TRUNC('year', NOW()) + INTERVAL '3 months', DATE_TRUNC('year', NOW()) + INTERVAL '6 months', true, NOW(), NOW()),
    (NEW.school_id, EXTRACT(YEAR FROM NOW()), 3, DATE_TRUNC('year', NOW()) + INTERVAL '6 months', DATE_TRUNC('year', NOW()) + INTERVAL '9 months', true, NOW(), NOW());
    
    -- Insert default expense categories for the new school
    INSERT INTO expense_categories (school_id, category_name, description, is_default, created_at, updated_at) VALUES 
    (NEW.school_id, 'Salaries', 'Staff salaries and benefits', true, NOW(), NOW()),
    (NEW.school_id, 'Utilities', 'Electricity, water, and other utilities', true, NOW(), NOW()),
    (NEW.school_id, 'Maintenance', 'Building and equipment maintenance', true, NOW(), NOW()),
    (NEW.school_id, 'Supplies', 'Educational supplies and materials', true, NOW(), NOW()),
    (NEW.school_id, 'Transport', 'Transportation costs', true, NOW(), NOW()),
    (NEW.school_id, 'Other', 'Other miscellaneous expenses', true, NOW(), NOW());
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.setup_default_class_teacher_comments_settings(p_school_id uuid, p_created_by uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  classes text[] := ARRAY[
    'Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6', 'Primary 7',
    'Senior 1', 'Senior 2', 'Senior 3', 'Senior 4'
  ];
  v_alevel_only text[] := ARRAY['Senior 5', 'Senior 6'];
  v_class_name text;
BEGIN
  FOREACH v_class_name IN ARRAY classes
  LOOP
    INSERT INTO public.class_teacher_comments_settings (
      school_id, class_name, min_percent, max_percent, comment_text, created_by
    )
    VALUES
      (
        p_school_id,
        v_class_name,
        0,
        40,
        'The student needs to work much harder. With better focus and effort, there is room for great improvement next term.',
        p_created_by
      ),
      (
        p_school_id,
        v_class_name,
        41,
        60,
        'A fair performance, showing some understanding. More consistency and commitment are needed to reach higher results.',
        p_created_by
      ),
      (
        p_school_id,
        v_class_name,
        61,
        80,
        'A good performance with steady progress. Continued effort and focus will lead to even better achievement.',
        p_created_by
      ),
      (
        p_school_id,
        v_class_name,
        81,
        100,
        'An excellent performance showing discipline and hard work. Keep up this spirit and continue striving for excellence.',
        p_created_by
      )
    ON CONFLICT (school_id, class_name, min_percent, max_percent) DO NOTHING;
  END LOOP;

  FOREACH v_class_name IN ARRAY v_alevel_only
  LOOP
    INSERT INTO public.class_teacher_comments_settings (
      school_id, class_name, min_percent, max_percent, comment_text, created_by
    )
    VALUES
      (
        p_school_id,
        v_class_name,
        0,
        40,
        'The student needs to work much harder. With better focus and effort, there is room for great improvement next term.',
        p_created_by
      ),
      (
        p_school_id,
        v_class_name,
        41,
        60,
        'A fair performance, showing some understanding. More consistency and commitment are needed to reach higher results.',
        p_created_by
      ),
      (
        p_school_id,
        v_class_name,
        61,
        80,
        'A good performance with steady progress. Continued effort and focus will lead to even better achievement.',
        p_created_by
      ),
      (
        p_school_id,
        v_class_name,
        81,
        100,
        'An excellent performance showing discipline and hard work. Keep up this spirit and continue striving for excellence.',
        p_created_by
      )
    ON CONFLICT (school_id, class_name, min_percent, max_percent) DO NOTHING;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.setup_default_class_teacher_nursery_comments(p_school_id uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  insert into public.class_teacher_nursery_comment_settings (school_id, performance_level, comment_text)
  values
    (p_school_id, 'VERY_GOOD', 'A cheerful learner who brings joy and curiosity to our daily activities.'),
    (p_school_id, 'GOOD', 'A sweet learner who shares and plays beautifully with friends.'),
    (p_school_id, 'NEEDS_IMPROVEMENT', 'A gentle learner who is growing daily. More practice will help them blossom!'),
    (p_school_id, 'TRIES', 'Enthusiastic and eager to learn! Puts great effort into daily tasks.')
  on conflict (school_id, performance_level)
  do update set
    comment_text = excluded.comment_text,
    updated_at = now();
$function$
;

CREATE OR REPLACE FUNCTION public.setup_default_headteacher_comments_secondary(p_school_id uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  insert into public.headteacher_comments_settings (school_id, min_percent, max_percent, comment_text)
  values
    (p_school_id, 0, 40,
     'This has been a tough term. With better focus and hard work, there is a good chance to improve.'),
    (p_school_id, 41, 60,
     'A fair effort. We know you can reach higher grades if you stay consistent and focused.'),
    (p_school_id, 61, 80,
     'Good performance this term. Stay focused, and you will achieve even better results next time.'),
    (p_school_id, 81, 100,
     'Excellent work! Your hard work and good behavior make the school proud. Keep it up.')
  on conflict (school_id, min_percent, max_percent)
  do update set
    comment_text = excluded.comment_text,
    updated_at = now();
$function$
;

CREATE OR REPLACE FUNCTION public.setup_default_headteacher_nursery_comments(p_school_id uuid)
 RETURNS void
 LANGUAGE sql
 SET search_path TO 'public'
AS $function$
  insert into public.headteacher_nursery_comment_settings (school_id, performance_level, comment_text)
  values
    (p_school_id, 'VERY_GOOD', 'Wonderful job! Keep shining and bringing joy to our class.'),
    (p_school_id, 'GOOD', 'Well done! We are very proud of your progress.'),
    (p_school_id, 'NEEDS_IMPROVEMENT', 'You are a special part of our class. Let''s keep growing!'),
    (p_school_id, 'TRIES', 'Great effort! Keep trying your best and having fun.')
  on conflict (school_id, performance_level)
  do update set
    comment_text = excluded.comment_text,
    updated_at = now();
$function$
;

CREATE OR REPLACE FUNCTION public.setup_default_teacher_remarks_for_school(p_school_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  subject_record RECORD;
BEGIN
  -- Use table alias and qualify all columns to avoid ambiguity
  FOR subject_record IN 
    SELECT DISTINCT cs.subject 
    FROM public.class_subjects cs
    WHERE cs.school_id = p_school_id
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM public.teacher_remarks_settings trs
      WHERE trs.school_id = p_school_id 
      AND trs.subject = subject_record.subject
    ) THEN
      INSERT INTO public.teacher_remarks_settings (school_id, subject, min_percent, max_percent, comment_text, created_by)
      VALUES 
        (p_school_id, subject_record.subject, 0, 40, 'Needs more effort. Try harder next time.', NULL),
        (p_school_id, subject_record.subject, 41, 60, 'Fair work. You can do better.', NULL),
        (p_school_id, subject_record.subject, 61, 80, 'Good work. Keep it up!', NULL),
        (p_school_id, subject_record.subject, 81, 100, 'Excellent! Keep shining!', NULL);
    END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.setup_default_teacher_remarks_settings(p_school_id uuid, p_created_by uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  subject_name text;
BEGIN
  FOR subject_name IN 
    SELECT unnest(ARRAY['Mathematics', 'English', 'Science', 'Social Studies', 'Art', 'Physical Education'])
  LOOP
    -- Use IF NOT EXISTS instead of ON CONFLICT
    IF NOT EXISTS (
      SELECT 1 FROM public.teacher_remarks_settings 
      WHERE school_id = p_school_id 
        AND subject = subject_name 
        AND min_percent = 0 
        AND max_percent = 40
    ) THEN
      INSERT INTO public.teacher_remarks_settings (school_id, subject, min_percent, max_percent, comment_text, created_by) 
      VALUES (p_school_id, subject_name, 0, 40, 'Needs more effort. Try harder next time.', p_created_by);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.teacher_remarks_settings 
      WHERE school_id = p_school_id 
        AND subject = subject_name 
        AND min_percent = 41 
        AND max_percent = 60
    ) THEN
      INSERT INTO public.teacher_remarks_settings (school_id, subject, min_percent, max_percent, comment_text, created_by) 
      VALUES (p_school_id, subject_name, 41, 60, 'Fair work. You can do better.', p_created_by);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.teacher_remarks_settings 
      WHERE school_id = p_school_id 
        AND subject = subject_name 
        AND min_percent = 61 
        AND max_percent = 80
    ) THEN
      INSERT INTO public.teacher_remarks_settings (school_id, subject, min_percent, max_percent, comment_text, created_by) 
      VALUES (p_school_id, subject_name, 61, 80, 'Good work. Keep it up!', p_created_by);
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.teacher_remarks_settings 
      WHERE school_id = p_school_id 
        AND subject = subject_name 
        AND min_percent = 81 
        AND max_percent = 100
    ) THEN
      INSERT INTO public.teacher_remarks_settings (school_id, subject, min_percent, max_percent, comment_text, created_by) 
      VALUES (p_school_id, subject_name, 81, 100, 'Excellent! Keep shining!', p_created_by);
    END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.setup_new_school_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_join_year integer;
  v_join_term integer;
  v_t integer;
  v_gt_id uuid;
  v_ws date;
  v_he date;
BEGIN
  RAISE NOTICE 'Setting up defaults for new school: % (Type: %)', NEW.name, NEW.type;
  
  -- Set up subjects and classes based on school type
  IF NEW.type = 'Primary' OR NEW.type = 'Nursery/Primary' THEN
    BEGIN
      -- FIRST: Insert nursery classes (Baby, Middle, Top) - CRITICAL
      INSERT INTO public.classes (school_id, class_name, max_students) 
      SELECT NEW.school_id, class_name, 1000
      FROM (VALUES 
        ('Baby Class'),
        ('Middle Class'),
        ('Top Class')
      ) AS nursery_classes(class_name)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.classes 
        WHERE school_id = NEW.school_id AND class_name = nursery_classes.class_name
      );
      
      RAISE NOTICE 'Successfully added nursery classes for school: %', NEW.name;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to add nursery classes for school %: %', NEW.name, SQLERRM;
    END;

    BEGIN
      -- SECOND: Insert primary classes (Primary 1-7)
      INSERT INTO public.classes (school_id, class_name, max_students) 
      SELECT NEW.school_id, class_name, 1000
      FROM (VALUES 
        ('Primary 1'),
        ('Primary 2'),
        ('Primary 3'),
        ('Primary 4'),
        ('Primary 5'),
        ('Primary 6'),
        ('Primary 7')
      ) AS primary_classes(class_name)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.classes 
        WHERE school_id = NEW.school_id AND class_name = primary_classes.class_name
      );
      
      RAISE NOTICE 'Successfully added primary classes for school: %', NEW.name;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to add primary classes for school %: %', NEW.name, SQLERRM;
    END;

    BEGIN
      -- Insert default subjects
      INSERT INTO public.subjects (school_id, name) 
      SELECT NEW.school_id, subject_name
      FROM (VALUES 
        ('LITERACY I'),
        ('LITERACY II'),
        ('SCIENCE'),
        ('SOCIAL STUDIES'),
        ('ENGLISH'),
        ('MATHEMATICS')
      ) AS default_subjects(subject_name)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.subjects 
        WHERE school_id = NEW.school_id AND name = subject_name
      );
      
      RAISE NOTICE 'Successfully added subjects for school: %', NEW.name;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to add subjects for school %: %', NEW.name, SQLERRM;
    END;

    -- CRITICAL: Create class-subject assignments for ALL classes (including nursery)
    -- This ALWAYS runs, not just when there are zero assignments
    BEGIN
      -- Nursery classes (Baby, Middle, Top) - Holistic subjects
      INSERT INTO public.class_subjects (school_id, class_name, subject)
      SELECT NEW.school_id, class_name, subject_name
      FROM (VALUES 
          ('Baby Class'), ('Middle Class'), ('Top Class')
      ) AS nursery_classes(class_name)
      CROSS JOIN (VALUES 
          ('Development and using language (Language II)'),
          ('Development and using mathematical concepts'),
          ('Relating and knowing my environment (Language I)'),
          ('Relating with others (Social development)'),
          ('Taking care of myself (Health habits)')
      ) AS nursery_subjects(subject_name)
      WHERE EXISTS (
          SELECT 1 FROM classes c 
          WHERE c.school_id = NEW.school_id 
            AND c.class_name = nursery_classes.class_name
      )
      AND NOT EXISTS (
          SELECT 1 FROM public.class_subjects cs
          WHERE cs.school_id = NEW.school_id 
            AND cs.class_name = nursery_classes.class_name 
            AND cs.subject = subject_name
      );

      -- Primary 1-3 classes
      INSERT INTO public.class_subjects (school_id, class_name, subject)
      SELECT NEW.school_id, class_name, subject_name
      FROM (VALUES 
          ('Primary 1'), ('Primary 2'), ('Primary 3')
      ) AS early_primary(class_name)
      CROSS JOIN (VALUES 
          ('ENGLISH'),
          ('LITERACY I'),
          ('LITERACY II'),
          ('MATHEMATICS'),
          ('Reading'),
          ('Religious Education (R.E)'),
          ('Luganda')
      ) AS early_subjects(subject_name)
      WHERE EXISTS (
          SELECT 1 FROM classes c 
          WHERE c.school_id = NEW.school_id 
            AND c.class_name = early_primary.class_name
      )
      AND NOT EXISTS (
          SELECT 1 FROM public.class_subjects cs
          WHERE cs.school_id = NEW.school_id 
            AND cs.class_name = early_primary.class_name 
            AND cs.subject = subject_name
      );

      -- Primary 4-7 classes
      INSERT INTO public.class_subjects (school_id, class_name, subject)
      SELECT NEW.school_id, class_name, subject_name
      FROM (VALUES 
          ('Primary 4'), ('Primary 5'), ('Primary 6'), ('Primary 7')
      ) AS upper_primary(class_name)
      CROSS JOIN (VALUES 
          ('ENGLISH'),
          ('MATHEMATICS'),
          ('SCIENCE'),
          ('SOCIAL STUDIES')
      ) AS core_subjects(subject_name)
      WHERE EXISTS (
          SELECT 1 FROM classes c 
          WHERE c.school_id = NEW.school_id 
            AND c.class_name = upper_primary.class_name
      )
      AND NOT EXISTS (
          SELECT 1 FROM public.class_subjects cs
          WHERE cs.school_id = NEW.school_id 
            AND cs.class_name = upper_primary.class_name 
            AND cs.subject = subject_name
      );
      
      RAISE NOTICE 'Successfully created class-subject assignments for school: %', NEW.name;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to create class-subject assignments for school %: %', NEW.name, SQLERRM;
    END;

  ELSIF NEW.type = 'Secondary' THEN
    BEGIN
      -- Insert default classes for secondary
      INSERT INTO public.classes (school_id, class_name, max_students) 
      SELECT NEW.school_id, class_name, 1000
      FROM (VALUES 
        ('Senior 1'),
        ('Senior 2'),
        ('Senior 3'),
        ('Senior 4'),
        ('Senior 5'),
        ('Senior 6')
      ) AS default_classes(class_name)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.classes 
        WHERE school_id = NEW.school_id AND class_name = default_classes.class_name
      );
      
      RAISE NOTICE 'Successfully added secondary classes for school: %', NEW.name;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Failed to add secondary classes for school %: %', NEW.name, SQLERRM;
    END;

    -- Set up class subjects for secondary using catalog
    BEGIN
      INSERT INTO public.class_subjects (school_id, class_name, subject, uce_offering_type, is_non_removable_default)
      SELECT
        NEW.school_id,
        c.class_name,
        u.subject_name,
        CASE WHEN u.catalog_offering = 'compulsory' THEN 'compulsory'::text ELSE 'subsidiary'::text END,
        (u.catalog_offering = 'compulsory')
      FROM (
        VALUES ('Senior 1'), ('Senior 2'), ('Senior 3'), ('Senior 4')
      ) AS c(class_name)
      CROSS JOIN public.uce_subject_catalog u
      WHERE NOT EXISTS (
        SELECT 1 FROM public.class_subjects cs
        WHERE cs.school_id = NEW.school_id 
          AND cs.class_name = c.class_name 
          AND cs.subject = u.subject_name
      );

      INSERT INTO public.class_subjects (school_id, class_name, subject)
      SELECT NEW.school_id, c.class_name, u.subject_name
      FROM (
        VALUES ('Senior 5'), ('Senior 6')
      ) AS c(class_name)
      CROSS JOIN public.uace_subject_catalog u
      WHERE NOT EXISTS (
        SELECT 1 FROM public.class_subjects cs
        WHERE cs.school_id = NEW.school_id 
          AND cs.class_name = c.class_name 
          AND cs.subject = u.subject_name
      );
      
      RAISE NOTICE 'Successfully added class subjects for secondary school: %', NEW.name;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE WARNING 'Could not set up class subjects for school %: %', NEW.name, SQLERRM;
    END;
  END IF;

  -- Continue with rest of setup (terms, categories, etc.)
  BEGIN
    PERFORM public.ensure_academic_year_exists(EXTRACT(YEAR FROM CURRENT_DATE)::int);

    SELECT g.year, g.term INTO v_join_year, v_join_term
    FROM public.global_calendar_year_term(CURRENT_DATE::date) g;

    IF v_join_year IS NULL THEN
      PERFORM public.ensure_academic_year_exists(EXTRACT(YEAR FROM CURRENT_DATE)::int - 1);
      PERFORM public.ensure_academic_year_exists(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1);
      SELECT g.year, g.term INTO v_join_year, v_join_term
      FROM public.global_calendar_year_term(CURRENT_DATE::date) g;
    END IF;

    IF v_join_year IS NULL THEN
      v_join_year := EXTRACT(YEAR FROM CURRENT_DATE)::int;
      v_join_term := 1;
      PERFORM public.ensure_academic_year_exists(v_join_year);
    END IF;

    FOR v_t IN v_join_term..3 LOOP
      SELECT gt.id, gt.window_start, gt.hard_stop_date
      INTO v_gt_id, v_ws, v_he
      FROM public.global_terms gt
      WHERE gt.year = v_join_year AND gt.term = v_t;

      IF v_gt_id IS NULL THEN
        PERFORM public.ensure_academic_year_exists(v_join_year);
        SELECT gt.id, gt.window_start, gt.hard_stop_date
        INTO v_gt_id, v_ws, v_he
        FROM public.global_terms gt
        WHERE gt.year = v_join_year AND gt.term = v_t;
      END IF;

      IF v_gt_id IS NOT NULL THEN
        INSERT INTO public.school_terms (
          school_id,
          year,
          term,
          start_date,
          end_date,
          is_current,
          global_term_id
        )
        SELECT 
          NEW.school_id,
          v_join_year,
          v_t,
          v_ws,
          v_he,
          (v_t = v_join_term),
          v_gt_id
        WHERE NOT EXISTS (
          SELECT 1 FROM public.school_terms st
          WHERE st.school_id = NEW.school_id 
            AND st.year = v_join_year 
            AND st.term = v_t
        );
      END IF;
    END LOOP;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Could not set up terms for school %: %', NEW.name, SQLERRM;
  END;

  BEGIN
    INSERT INTO public.expense_categories (school_id, category_name, description, is_default) 
    SELECT NEW.school_id, category_name, description, true
    FROM (VALUES 
      ('Tuition Fees', 'Regular tuition fees'),
      ('Registration Fees', 'Student registration fees'),
      ('Examination Fees', 'Examination and assessment fees'),
      ('Library Fees', 'Library and resource fees'),
      ('Sports Fees', 'Sports and extracurricular fees')
    ) AS default_categories(category_name, description)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.expense_categories ec
      WHERE ec.school_id = NEW.school_id AND ec.category_name = default_categories.category_name
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Could not set up expense categories for school %: %', NEW.name, SQLERRM;
  END;

  BEGIN
    PERFORM public.setup_default_teacher_remarks_for_school(NEW.school_id);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Could not set up teacher remarks for school %: %', NEW.name, SQLERRM;
  END;

  -- Set up exam sets
  BEGIN
    IF NEW.type = 'Nursery/Primary' OR NEW.type = 'Primary' THEN
      INSERT INTO public.exam_sets (school_id, name, term, year, is_active, created_at, updated_at)
      SELECT
        NEW.school_id,
        exam_name,
        term_number,
        v_join_year,
        true,
        NOW(),
        NOW()
      FROM (
        VALUES
          ('Mid Term', 1),
          ('End of Term', 1),
          ('Mid Term', 2),
          ('End of Term', 2),
          ('Mid Term', 3),
          ('End of Term', 3)
      ) AS exam_types(exam_name, term_number)
      WHERE term_number >= v_join_term
        AND term_number <= 3
        AND NOT EXISTS (
          SELECT 1 FROM public.exam_sets es
          WHERE es.school_id = NEW.school_id
            AND es.name = exam_types.exam_name
            AND es.term = exam_types.term_number
            AND es.year = v_join_year
        );
    END IF;

    IF NEW.type = 'Secondary' THEN
      INSERT INTO public.exam_sets (school_id, name, term, year, is_active, created_at, updated_at)
      SELECT
        NEW.school_id,
        exam_name,
        term_number,
        v_join_year,
        true,
        NOW(),
        NOW()
      FROM (
        VALUES
          ('Beginning of Term', 1),
          ('Mid Term', 1),
          ('End of Term', 1),
          ('Beginning of Term', 2),
          ('Mid Term', 2),
          ('End of Term', 2),
          ('Beginning of Term', 3),
          ('Mid Term', 3),
          ('End of Term', 3)
      ) AS exam_types(exam_name, term_number)
      WHERE term_number >= v_join_term
        AND term_number <= 3
        AND NOT EXISTS (
          SELECT 1 FROM public.exam_sets es
          WHERE es.school_id = NEW.school_id
            AND es.name = exam_types.exam_name
            AND es.term = exam_types.term_number
            AND es.year = v_join_year
        );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Could not set up exam sets for school %: %', NEW.name, SQLERRM;
  END;

  RAISE NOTICE 'Successfully completed setup for school: %', NEW.name;
  RETURN NEW;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'setup_new_school_defaults failed for school %: %', NEW.name, SQLERRM;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.setup_new_school_defaults_manual(school_row record)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_join_year integer;
  v_join_term integer;
  v_t integer;
  v_gt_id uuid;
  v_ws date;
  v_he date;
BEGIN
  -- Set up subjects and classes based on school type
  IF school_row.type = 'Primary' OR school_row.type = 'Nursery/Primary' THEN
    -- Insert default subjects (without is_core column)
    INSERT INTO public.subjects (school_id, name) 
    SELECT school_row.school_id, subject_name
    FROM (VALUES 
      ('LITERACY I'),
      ('LITERACY II'),
      ('SCIENCE'),
      ('SOCIAL STUDIES'),
      ('ENGLISH'),
      ('MATHEMATICS')
    ) AS default_subjects(subject_name)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.subjects 
      WHERE school_id = school_row.school_id AND name = subject_name
    );

    -- Insert default classes
    INSERT INTO public.classes (school_id, class_name, max_students) 
    SELECT school_row.school_id, class_name, 1000
    FROM (VALUES 
      ('Primary 1'),
      ('Primary 2'),
      ('Primary 3'),
      ('Primary 4'),
      ('Primary 5'),
      ('Primary 6'),
      ('Primary 7')
    ) AS default_classes(class_name)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.classes 
      WHERE school_id = school_row.school_id AND class_name = default_classes.class_name
    );

  ELSIF school_row.type = 'Secondary' THEN
    -- Insert default classes for secondary
    INSERT INTO public.classes (school_id, class_name, max_students) 
    SELECT school_row.school_id, class_name, 1000
    FROM (VALUES 
      ('Senior 1'),
      ('Senior 2'),
      ('Senior 3'),
      ('Senior 4'),
      ('Senior 5'),
      ('Senior 6')
    ) AS default_classes(class_name)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.classes 
      WHERE school_id = school_row.school_id AND class_name = default_classes.class_name
    );

    -- Set up class subjects for secondary (if tables exist)
    BEGIN
      INSERT INTO public.class_subjects (school_id, class_name, subject, uce_offering_type, is_non_removable_default)
      SELECT
        school_row.school_id,
        c.class_name,
        u.subject_name,
        CASE WHEN u.catalog_offering = 'compulsory' THEN 'compulsory'::text ELSE 'subsidiary'::text END,
        (u.catalog_offering = 'compulsory')
      FROM (
        VALUES ('Senior 1'), ('Senior 2'), ('Senior 3'), ('Senior 4')
      ) AS c(class_name)
      CROSS JOIN public.uce_subject_catalog u
      WHERE NOT EXISTS (
        SELECT 1 FROM public.class_subjects cs
        WHERE cs.school_id = school_row.school_id 
          AND cs.class_name = c.class_name 
          AND cs.subject = u.subject_name
      );

      INSERT INTO public.class_subjects (school_id, class_name, subject)
      SELECT school_row.school_id, c.class_name, u.subject_name
      FROM (
        VALUES ('Senior 5'), ('Senior 6')
      ) AS c(class_name)
      CROSS JOIN public.uace_subject_catalog u
      WHERE NOT EXISTS (
        SELECT 1 FROM public.class_subjects cs
        WHERE cs.school_id = school_row.school_id 
          AND cs.class_name = c.class_name 
          AND cs.subject = u.subject_name
      );
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Could not set up class subjects: %', SQLERRM;
    END;
  END IF;

  -- Set up academic year and terms
  BEGIN
    PERFORM public.ensure_academic_year_exists(EXTRACT(YEAR FROM CURRENT_DATE)::int);

    SELECT g.year, g.term INTO v_join_year, v_join_term
    FROM public.global_calendar_year_term(CURRENT_DATE::date) g;

    IF v_join_year IS NULL THEN
      PERFORM public.ensure_academic_year_exists(EXTRACT(YEAR FROM CURRENT_DATE)::int - 1);
      PERFORM public.ensure_academic_year_exists(EXTRACT(YEAR FROM CURRENT_DATE)::int + 1);
      SELECT g.year, g.term INTO v_join_year, v_join_term
      FROM public.global_calendar_year_term(CURRENT_DATE::date) g;
    END IF;

    IF v_join_year IS NULL THEN
      v_join_year := EXTRACT(YEAR FROM CURRENT_DATE)::int;
      v_join_term := 1;
      PERFORM public.ensure_academic_year_exists(v_join_year);
    END IF;

    -- Set up school terms
    FOR v_t IN v_join_term..3 LOOP
      SELECT gt.id, gt.window_start, gt.hard_stop_date
      INTO v_gt_id, v_ws, v_he
      FROM public.global_terms gt
      WHERE gt.year = v_join_year AND gt.term = v_t;

      IF v_gt_id IS NULL THEN
        PERFORM public.ensure_academic_year_exists(v_join_year);
        SELECT gt.id, gt.window_start, gt.hard_stop_date
        INTO v_gt_id, v_ws, v_he
        FROM public.global_terms gt
        WHERE gt.year = v_join_year AND gt.term = v_t;
      END IF;

      IF v_gt_id IS NOT NULL THEN
        INSERT INTO public.school_terms (
          school_id,
          year,
          term,
          start_date,
          end_date,
          is_current,
          global_term_id
        )
        SELECT 
          school_row.school_id,
          v_join_year,
          v_t,
          v_ws,
          v_he,
          (v_t = v_join_term),
          v_gt_id
        WHERE NOT EXISTS (
          SELECT 1 FROM public.school_terms st
          WHERE st.school_id = school_row.school_id 
            AND st.year = v_join_year 
            AND st.term = v_t
        );
      END IF;
    END LOOP;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not set up terms: %', SQLERRM;
  END;

  -- Set up default expense categories
  BEGIN
    INSERT INTO public.expense_categories (school_id, category_name, description, is_default) 
    SELECT school_row.school_id, category_name, description, true
    FROM (VALUES 
      ('Tuition Fees', 'Regular tuition fees'),
      ('Registration Fees', 'Student registration fees'),
      ('Examination Fees', 'Examination and assessment fees'),
      ('Library Fees', 'Library and resource fees'),
      ('Sports Fees', 'Sports and extracurricular fees')
    ) AS default_categories(category_name, description)
    WHERE NOT EXISTS (
      SELECT 1 FROM public.expense_categories ec
      WHERE ec.school_id = school_row.school_id AND ec.category_name = default_categories.category_name
    );
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not set up expense categories: %', SQLERRM;
  END;

  -- Set up default teacher remarks
  BEGIN
    PERFORM public.setup_default_teacher_remarks_for_school(school_row.school_id);
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not set up teacher remarks: %', SQLERRM;
  END;

  -- Set up exam sets
  BEGIN
    IF school_row.type = 'Nursery/Primary' OR school_row.type = 'Primary' THEN
      INSERT INTO public.exam_sets (school_id, name, term, year, is_active, created_at, updated_at)
      SELECT
        school_row.school_id,
        exam_name,
        term_number,
        v_join_year,
        true,
        NOW(),
        NOW()
      FROM (
        VALUES
          ('Mid Term', 1),
          ('End of Term', 1),
          ('Mid Term', 2),
          ('End of Term', 2),
          ('Mid Term', 3),
          ('End of Term', 3)
      ) AS exam_types(exam_name, term_number)
      WHERE term_number >= v_join_term
        AND term_number <= 3
        AND NOT EXISTS (
          SELECT 1 FROM public.exam_sets es
          WHERE es.school_id = school_row.school_id
            AND es.name = exam_types.exam_name
            AND es.term = exam_types.term_number
            AND es.year = v_join_year
        );
    END IF;

    IF school_row.type = 'Secondary' THEN
      INSERT INTO public.exam_sets (school_id, name, term, year, is_active, created_at, updated_at)
      SELECT
        school_row.school_id,
        exam_name,
        term_number,
        v_join_year,
        true,
        NOW(),
        NOW()
      FROM (
        VALUES
          ('Beginning of Term', 1),
          ('Mid Term', 1),
          ('End of Term', 1),
          ('Beginning of Term', 2),
          ('Mid Term', 2),
          ('End of Term', 2),
          ('Beginning of Term', 3),
          ('Mid Term', 3),
          ('End of Term', 3)
      ) AS exam_types(exam_name, term_number)
      WHERE term_number >= v_join_term
        AND term_number <= 3
        AND NOT EXISTS (
          SELECT 1 FROM public.exam_sets es
          WHERE es.school_id = school_row.school_id
            AND es.name = exam_types.exam_name
            AND es.term = exam_types.term_number
            AND es.year = v_join_year
        );
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not set up exam sets: %', SQLERRM;
  END;

  RAISE NOTICE 'Successfully set up defaults for school: %', school_row.school_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.student_alevel_subjects_prevent_gp_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_class text;
BEGIN
  SELECT trim(current_class) INTO v_class FROM public.students WHERE student_id = OLD.student_id;
  IF v_class ~* '^(senior\s*[56]|s\.?\s*[56])(\s|$)'
     AND OLD.subject_name ~* 'general\s*paper'
     AND OLD.subject_role = 'subsidiary' THEN
    RAISE EXCEPTION 'General Paper is compulsory for all A-Level students and cannot be removed.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.student_alevel_subjects_row_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  p int;
  s int;
  non_gp int;
  v_class text;
  v_stu_school uuid;
BEGIN
  SELECT trim(current_class), school_id
    INTO v_class, v_stu_school
  FROM public.students
  WHERE student_id = NEW.student_id;

  IF v_class IS NULL OR v_class !~* '^(senior\s*[56]|s\.?\s*[56])(\s|$)' THEN
    RAISE EXCEPTION
      'UACE subject combinations apply only to Senior 5 or Senior 6 (current class: %).',
      COALESCE(v_class, '(none)')
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.school_id IS DISTINCT FROM v_stu_school THEN
    RAISE EXCEPTION 'school_id must match the student''s school.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.uace_subject_catalog c
    WHERE c.subject_name = NEW.subject_name
      AND c.subject_type = NEW.subject_role
  ) THEN
    RAISE EXCEPTION 'Subject % is not a valid UACE % row in uace_subject_catalog.',
      NEW.subject_name, NEW.subject_role
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT
    count(*) FILTER (WHERE subject_role = 'principal'),
    count(*) FILTER (WHERE subject_role = 'subsidiary'),
    count(*) FILTER (WHERE subject_role = 'subsidiary' AND subject_name !~* 'general\s*paper')
  INTO p, s, non_gp
  FROM public.student_alevel_subjects
  WHERE student_id = NEW.student_id
    AND id IS DISTINCT FROM NEW.id;

  IF NEW.subject_role = 'principal' THEN
    p := p + 1;
  ELSE
    s := s + 1;
    IF NEW.subject_name !~* 'general\s*paper' THEN
      non_gp := non_gp + 1;
    END IF;
  END IF;

  IF p > 3 THEN
    RAISE EXCEPTION 'A student may have at most 3 principal (UACE) subjects.'
      USING ERRCODE = 'check_violation';
  END IF;
  IF non_gp > 1 THEN
    RAISE EXCEPTION 'A student may have at most 1 elective UACE subsidiary (General Paper is automatic).'
      USING ERRCODE = 'check_violation';
  END IF;
  IF s > 2 THEN
    RAISE EXCEPTION 'A student may have at most 2 UACE subsidiary rows (General Paper + one elective).'
      USING ERRCODE = 'check_violation';
  END IF;
  IF p + s > 5 THEN
    RAISE EXCEPTION 'A student may have at most 5 UACE subjects in total.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.subject_role = 'subsidiary' AND NEW.subject_name ~* 'general\s*paper' THEN
    IF EXISTS (
      SELECT 1 FROM public.student_alevel_subjects
      WHERE student_id = NEW.student_id
        AND subject_role = 'subsidiary'
        AND subject_name ~* 'general\s*paper'
        AND id IS DISTINCT FROM NEW.id
    ) THEN
      RAISE EXCEPTION 'General Paper is already on this learner profile.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.student_attendance_fill_absent_after_insert_fn()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  r record;
  v_ids uuid[];
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  FOR r IN
    SELECT DISTINCT
      nt.school_id,
      nt.class_name,
      nt.attendance_date,
      nt.teacher_id
    FROM new_table AS nt
  LOOP
    SELECT coalesce(array_agg(DISTINCT nt2.student_id), '{}'::uuid[])
    INTO v_ids
    FROM new_table AS nt2
    WHERE nt2.school_id IS NOT DISTINCT FROM r.school_id
      AND trim(both from coalesce(nt2.class_name, '')) = trim(both from coalesce(r.class_name, ''))
      AND nt2.attendance_date IS NOT DISTINCT FROM r.attendance_date;

    PERFORM public.student_attendance_sync_absent_for_class(
      r.school_id,
      r.class_name,
      r.attendance_date,
      r.teacher_id,
      v_ids
    );
  END LOOP;

  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.student_attendance_normalize_present_status_fn()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  st text;
BEGIN
  st := lower(trim(both from coalesce(NEW.status, '')));
  IF st = 'absent' THEN
    NEW.present := false;
    RETURN NEW;
  END IF;
  IF st IN ('present', 'late', 'excused') THEN
    NEW.present := true;
    RETURN NEW;
  END IF;
  IF NEW.present IS TRUE THEN
    NEW.status := 'present';
    RETURN NEW;
  END IF;
  NEW.status := 'absent';
  NEW.present := false;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.student_attendance_sync_absent_for_class(p_school_id uuid, p_class_name text, p_attendance_date date, p_teacher_id uuid, p_include_student_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  n integer;
BEGIN
  INSERT INTO public.student_attendance AS sa (
    school_id,
    class_name,
    student_id,
    teacher_id,
    attendance_date,
    status,
    present
  )
  SELECT
    p_school_id,
    trim(both from p_class_name),
    s.student_id,
    p_teacher_id,
    p_attendance_date,
    'absent'::text,
    false
  FROM public.students s
  WHERE s.school_id = p_school_id
    AND s.status = 'active'
    AND trim(both from coalesce(s.current_class, '')) = trim(both from coalesce(p_class_name, ''))
    AND NOT (
      s.student_id = ANY (coalesce(p_include_student_ids, '{}'::uuid[]))
    )
  ON CONFLICT (student_id, attendance_date) DO UPDATE SET
    class_name = EXCLUDED.class_name,
    teacher_id = COALESCE(EXCLUDED.teacher_id, sa.teacher_id),
    status = CASE
      WHEN lower(trim(both from coalesce(sa.status, ''))) = ANY (ARRAY['present', 'late', 'excused'])
        OR sa.present IS TRUE
      THEN coalesce(nullif(trim(both from sa.status), ''), 'present'::text)
      ELSE EXCLUDED.status
    END,
    present = CASE
      WHEN lower(trim(both from coalesce(sa.status, ''))) = ANY (ARRAY['present', 'late', 'excused'])
        OR sa.present IS TRUE
      THEN coalesce(sa.present, true)
      ELSE EXCLUDED.present
    END;

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.students_age_years_from_dob_today(p_dob date)
 RETURNS smallint
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  SELECT CASE
    WHEN p_dob IS NULL THEN NULL::smallint
    ELSE (
      CASE
        WHEN (extract(year FROM age (current_date::timestamp, p_dob::timestamp)))::integer < 0 THEN NULL::smallint
        WHEN (extract(year FROM age (current_date::timestamp, p_dob::timestamp)))::integer > 120 THEN NULL::smallint
        ELSE (extract(year FROM age (current_date::timestamp, p_dob::timestamp)))::smallint
      END
    )
  END;
$function$
;

CREATE OR REPLACE FUNCTION public.students_programme_follow_class_trg_fn()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_new text := trim(both from NEW.current_class);
  v_old text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    v_old := trim(both from COALESCE(OLD.current_class, ''));
    IF v_new IS NOT DISTINCT FROM v_old THEN
      RETURN NEW;
    END IF;
  END IF;

  IF v_new ~* '^(senior\s*[56]|s\.?\s*[56])(\s|$)' THEN
    DELETE FROM public.student_olevel_subjects WHERE student_id = NEW.student_id;
    PERFORM public.ensure_student_general_paper_alevel(NEW.student_id);
    RETURN NEW;
  END IF;

  IF v_new ~* '^(senior\s*[12]|s\.?\s*[12])(\s|$)' THEN
    DELETE FROM public.student_olevel_subjects WHERE student_id = NEW.student_id;
    INSERT INTO public.student_olevel_subjects (school_id, student_id, subject_name)
    SELECT DISTINCT cs.school_id, NEW.student_id, trim(both from cs.subject)
    FROM public.class_subjects cs
    WHERE cs.school_id = NEW.school_id
      AND trim(both from cs.class_name) = v_new
    ON CONFLICT (student_id, subject_name) DO NOTHING;
    RETURN NEW;
  END IF;

  IF v_new ~* '^(senior\s*[34]|s\.?\s*[34])(\s|$)' THEN
    IF TG_OP = 'UPDATE'
       AND v_old ~* '^(senior\s*3|s\.?\s*3)(\s|$)'
       AND v_new ~* '^(senior\s*4|s\.?\s*4)(\s|$)' THEN
      DELETE FROM public.student_olevel_subjects s
      WHERE s.student_id = NEW.student_id
        AND NOT EXISTS (
          SELECT 1
          FROM public.class_subjects cs
          WHERE cs.school_id = NEW.school_id
            AND trim(both from cs.class_name) = v_new
            AND trim(both from cs.subject) = trim(both from s.subject_name)
        );

      INSERT INTO public.student_olevel_subjects (school_id, student_id, subject_name)
      SELECT DISTINCT cs.school_id, NEW.student_id, trim(both from cs.subject)
      FROM public.class_subjects cs
      WHERE cs.school_id = NEW.school_id
        AND trim(both from cs.class_name) = v_new
        AND cs.uce_offering_type = 'compulsory'
      ON CONFLICT (student_id, subject_name) DO NOTHING;
      RETURN NEW;
    END IF;

    DELETE FROM public.student_olevel_subjects s
    WHERE s.student_id = NEW.student_id
      AND NOT EXISTS (
        SELECT 1
        FROM public.class_subjects cs
        WHERE cs.school_id = NEW.school_id
          AND trim(both from cs.class_name) = v_new
          AND trim(both from cs.subject) = trim(both from s.subject_name)
          AND cs.uce_offering_type = 'compulsory'
      );

    INSERT INTO public.student_olevel_subjects (school_id, student_id, subject_name)
    SELECT DISTINCT cs.school_id, NEW.student_id, trim(both from cs.subject)
    FROM public.class_subjects cs
    WHERE cs.school_id = NEW.school_id
      AND trim(both from cs.class_name) = v_new
      AND cs.uce_offering_type = 'compulsory'
    ON CONFLICT (student_id, subject_name) DO NOTHING;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF v_old ~* '^(senior\s*[1-4]|s\.?\s*[1-4])(\s|$)'
       AND v_new !~* '^(senior\s*[1-4]|s\.?\s*[1-4])(\s|$)' THEN
      DELETE FROM public.student_olevel_subjects WHERE student_id = NEW.student_id;
    END IF;

    IF v_old ~* '^(senior\s*[56]|s\.?\s*[56])(\s|$)'
       AND v_new !~* '^(senior\s*[56]|s\.?\s*[56])(\s|$)' THEN
      DELETE FROM public.student_alevel_subjects WHERE student_id = NEW.student_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.students_refresh_all_age_years()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  n integer;
BEGIN
  UPDATE public.students
  SET age_years = public.students_age_years_from_dob_today(date_of_birth)
  WHERE date_of_birth IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.students_set_age_years_trg_fn()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  NEW.age_years := public.students_age_years_from_dob_today(NEW.date_of_birth);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_all_requirements_to_existing_students(p_school_id uuid)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSON;
    v_students_updated INTEGER := 0;
    v_requirements_assigned INTEGER := 0;
    v_student_record RECORD;
    v_requirement_record RECORD;
BEGIN
    -- Loop through all students in the school
    FOR v_student_record IN 
        SELECT student_id, current_class, COALESCE(boarding_type, 'Day Scholar') as boarding_type
        FROM students
        WHERE school_id = p_school_id
    LOOP
        -- Loop through all active requirements for this school
        FOR v_requirement_record IN 
            SELECT id, requirement_name, cost, boarding_type, class_name
            FROM school_requirements
            WHERE school_id = p_school_id
            AND status = 'Active'
        LOOP
            -- Check if this requirement applies to this student
            IF (
                -- Class matches (or applies to all classes)
                (v_requirement_record.class_name IS NULL OR 
                 v_requirement_record.class_name = 'All Classes' OR 
                 v_requirement_record.class_name = v_student_record.current_class)
                AND
                -- Boarding type matches (or applies to both)
                (v_requirement_record.boarding_type = v_student_record.boarding_type OR 
                 v_requirement_record.boarding_type = 'Both' OR
                 (v_requirement_record.boarding_type = 'Day Scholar' AND v_student_record.boarding_type = 'Day Scholar'))
            ) THEN
                -- Insert requirement for this student
                INSERT INTO student_requirements (
                    student_id, 
                    school_id, 
                    requirement_id, 
                    requirement_name, 
                    cost, 
                    status, 
                    created_at, 
                    updated_at
                )
                VALUES (
                    v_student_record.student_id,
                    p_school_id,
                    v_requirement_record.id,
                    v_requirement_record.requirement_name,
                    v_requirement_record.cost,
                    'Pending',
                    NOW(),
                    NOW()
                )
                ON CONFLICT (student_id, requirement_id) DO NOTHING;
                
                v_requirements_assigned := v_requirements_assigned + 1;
            END IF;
        END LOOP;
        
        v_students_updated := v_students_updated + 1;
    END LOOP;
    
    -- Build result
    v_result := json_build_object(
        'school_id', p_school_id,
        'students_processed', v_students_updated,
        'requirements_assigned', v_requirements_assigned,
        'message', 'Successfully synced all requirements to existing students'
    );
    
    RETURN v_result;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_balance_on_invoice_activation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('issued', 'partial', 'paid') THEN
    RETURN NEW;
  END IF;

  PERFORM public.reconcile_term_invoice_payments(NEW.student_id, NEW.term_id);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_class_attendance_for_date(p_school_id uuid, p_class_name text, p_attendance_date date, p_teacher_id uuid, p_present_student_ids uuid[])
 RETURNS integer
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  RETURN public.student_attendance_sync_absent_for_class(
    p_school_id,
    p_class_name,
    p_attendance_date,
    p_teacher_id,
    coalesce(p_present_student_ids, '{}'::uuid[])
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_invoice_amount_paid()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_student_id uuid;
  v_term_id uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_student_id := OLD.student_id;
    v_term_id := OLD.term_id;
  ELSE
    v_student_id := NEW.student_id;
    v_term_id := NEW.term_id;
  END IF;

  IF v_term_id IS NULL THEN
    IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
  END IF;

  PERFORM public.reconcile_term_invoice_payments(v_student_id, v_term_id);

  IF TG_OP = 'UPDATE' AND (OLD.student_id IS DISTINCT FROM NEW.student_id OR OLD.term_id IS DISTINCT FROM NEW.term_id) AND OLD.term_id IS NOT NULL THEN
    PERFORM public.reconcile_term_invoice_payments(OLD.student_id, OLD.term_id);
  END IF;

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_new_requirements_to_existing_students(p_requirement_id uuid, p_school_id uuid, p_class_name text, p_boarding_type text)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_requirement_name TEXT;
    v_requirement_cost DECIMAL(10,2);
BEGIN
    -- Get requirement details
    SELECT requirement_name, cost 
    INTO v_requirement_name, v_requirement_cost
    FROM school_requirements 
    WHERE id = p_requirement_id;
    
    -- Assign this requirement to all existing students who match the criteria
    INSERT INTO student_requirements (
        student_id, 
        school_id, 
        requirement_id, 
        requirement_name, 
        cost, 
        status, 
        created_at, 
        updated_at
    )
    SELECT 
        s.student_id,
        p_school_id,
        p_requirement_id,
        v_requirement_name,
        v_requirement_cost,
        'Pending',
        NOW(),
        NOW()
    FROM students s
    WHERE s.school_id = p_school_id
    AND (
        p_class_name IS NULL OR p_class_name = 'All Classes' OR p_class_name = s.current_class
    )
    AND (
        p_boarding_type = COALESCE(s.boarding_type, 'Day Scholar') OR 
        p_boarding_type = 'Both' OR
        (p_boarding_type = 'Day Scholar' AND COALESCE(s.boarding_type, 'Day Scholar') = 'Day Scholar')
    )
    ON CONFLICT (student_id, requirement_id) DO NOTHING;
    
    RAISE NOTICE 'Successfully synced requirement % to existing students', p_requirement_id;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_referral_use_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.referral_codes
  SET use_count = (
    SELECT COUNT(*)
    FROM public.affiliate_clicks
    WHERE referral_code_id = referral_codes.id
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_student_boarding_type_from_invoice()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_class_name text;
  v_day_fee numeric;
  v_boarding_fee numeric;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('issued', 'partial', 'paid') THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.is_supplementary, false) THEN
    RETURN NEW;
  END IF;

  SELECT s.current_class
    INTO v_class_name
  FROM public.students s
  WHERE s.student_id = NEW.student_id
    AND s.school_id = NEW.school_id;

  IF v_class_name IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT fs.tuition_amount,
         COALESCE(fs.boarding_tuition_amount, 0)
         + COALESCE(fs.boarding_accommodation_fee, 0)
         + COALESCE(fs.boarding_meals_fee, 0)
    INTO v_day_fee, v_boarding_fee
  FROM public.school_fee_structure fs
  WHERE fs.school_id = NEW.school_id
    AND fs.class_name = v_class_name
  LIMIT 1;

  IF v_day_fee IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.total_amount = v_day_fee THEN
    UPDATE public.students
       SET boarding_type = 'Day Scholar',
           updated_at = now()
     WHERE student_id = NEW.student_id
       AND school_id = NEW.school_id
       AND COALESCE(boarding_type, '') <> 'Day Scholar';
  ELSIF NEW.total_amount = v_boarding_fee THEN
    UPDATE public.students
       SET boarding_type = 'Boarding',
           updated_at = now()
     WHERE student_id = NEW.student_id
       AND school_id = NEW.school_id
       AND COALESCE(boarding_type, '') <> 'Boarding';
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.sync_teacher_email_from_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.role = 'teacher'
     AND NEW.linked_teacher_id IS NOT NULL
     AND NEW.email IS NOT NULL THEN
    UPDATE public.teachers
    SET email = lower(trim(NEW.email))
    WHERE teacher_id = NEW.linked_teacher_id
      AND (school_id IS NOT DISTINCT FROM NEW.school_id);
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.teacher_upsert_exam_result_alevel(p_school_id uuid, p_exam_set_id uuid, p_student_id uuid, p_class_name text, p_subject text, p_marks_obtained numeric, p_total_marks numeric, p_grade text, p_remarks text, p_teacher_id text, p_teacher_comment text DEFAULT NULL::text, p_paper_number text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.teacher_upsert_exam_result_alevel(
    p_school_id,
    p_exam_set_id,
    p_student_id,
    p_class_name,
    p_subject,
    p_marks_obtained,
    p_total_marks,
    p_grade,
    p_remarks,
    p_teacher_id::uuid,
    p_teacher_comment,
    p_paper_number,
    NULL::text
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.teacher_upsert_exam_result_alevel(p_school_id uuid, p_exam_set_id uuid, p_student_id uuid, p_class_name text, p_subject text, p_marks_obtained numeric, p_total_marks numeric, p_grade text, p_remarks text, p_teacher_id uuid, p_teacher_comment text, p_paper_number text DEFAULT NULL::text, p_paper_code text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_topic_key text := '';
  v_paper_key text;
  v_grade text;
  v_points integer;
  v_pct numeric;
  v_guard text;
  v_new_id uuid;
BEGIN
  IF p_school_id IS NULL OR p_exam_set_id IS NULL OR p_student_id IS NULL THEN
    RETURN json_build_object('error', 'Missing required parameters');
  END IF;

  v_guard := public.exam_set_teacher_entry_guard_message(p_school_id, p_exam_set_id);
  IF v_guard IS NOT NULL THEN
    RETURN json_build_object('error', v_guard);
  END IF;

  v_paper_key := COALESCE(
    NULLIF(BTRIM(COALESCE(p_paper_code, '')), ''),
    NULLIF(BTRIM(COALESCE(p_paper_number, '')), ''),
    ''
  );

  v_grade := p_grade;
  v_points := public.uace_default_points_from_grade(p_grade);

  IF p_marks_obtained IS NOT NULL
     AND p_total_marks IS NOT NULL
     AND p_total_marks > 0 THEN
    v_pct := (p_marks_obtained / p_total_marks) * 100;
    v_grade := public.uace_grade_from_percent_for_class(p_school_id, p_class_name, v_pct);
    v_points := public.uace_default_points_from_grade(v_grade);
  END IF;

  DELETE FROM public.exam_results er
  WHERE er.school_id = p_school_id
    AND er.exam_set_id = p_exam_set_id
    AND er.student_id = p_student_id
    AND er.class_name = p_class_name
    AND er.subject = p_subject
    AND er.exam_topic_key = v_topic_key
    AND er.exam_paper_key = v_paper_key;

  INSERT INTO public.exam_results (
    school_id,
    exam_set_id,
    student_id,
    class_name,
    subject,
    marks_obtained,
    total_marks,
    grade,
    uace_points,
    remarks,
    teacher_comment,
    teacher_id,
    paper_code,
    paper_number,
    nursery_skill_performance,
    created_at,
    updated_at
  ) VALUES (
    p_school_id,
    p_exam_set_id,
    p_student_id,
    p_class_name,
    p_subject,
    p_marks_obtained,
    p_total_marks,
    v_grade,
    v_points,
    p_remarks,
    p_teacher_comment,
    p_teacher_id::text,
    NULLIF(BTRIM(COALESCE(p_paper_code, '')), ''),
    NULLIF(BTRIM(COALESCE(p_paper_number, '')), ''),
    '{}'::jsonb,
    now(),
    now()
  ) RETURNING id INTO v_new_id;

  RETURN json_build_object('success', true, 'action', 'replaced', 'id', v_new_id);

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', 'Database error: ' || SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.teacher_upsert_exam_result_primary(p_school_id uuid, p_exam_set_id uuid, p_student_id uuid, p_class_name text, p_subject text, p_marks_obtained numeric DEFAULT NULL::numeric, p_total_marks numeric DEFAULT NULL::numeric, p_grade text DEFAULT NULL::text, p_remarks text DEFAULT NULL::text, p_teacher_id text DEFAULT NULL::text, p_teacher_comment text DEFAULT NULL::text, p_nursery_skills jsonb DEFAULT NULL::jsonb, p_nursery_report_format text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_guard text;
  v_new_id uuid;
  v_is_nursery boolean;
  v_effective_format text;
  v_percentage numeric;
  v_final_grade text;
  v_existing_format text;
begin
  if p_school_id is null or p_exam_set_id is null or p_student_id is null then
    raise exception 'Required parameters cannot be null';
  end if;

  if p_class_name is null or p_subject is null then
    raise exception 'Class name and subject cannot be null';
  end if;

  v_guard := public.exam_set_teacher_entry_guard_message(p_school_id, p_exam_set_id);
  if v_guard is not null then
    return json_build_object('success', false, 'error', v_guard);
  end if;

  v_is_nursery := lower(coalesce(p_class_name, '')) similar to '%(baby class|middle class|top class|baby|middle|top|nursery|pre-primary)%';

  if v_is_nursery then
    v_effective_format := coalesce(p_nursery_report_format, 'latest');

    if v_effective_format not in ('latest', 'old') then
      raise exception 'Invalid nursery_report_format. Must be latest or old';
    end if;

    select x.nursery_report_format
      into v_existing_format
    from (
      select er.nursery_report_format
      from public.exam_results er
      where er.school_id = p_school_id
        and er.student_id = p_student_id
        and er.exam_set_id = p_exam_set_id
        and er.nursery_report_format is not null
      union
      select pr.nursery_report_format
      from public.processed_primary_exam_results pr
      where pr.school_id = p_school_id
        and pr.student_id = p_student_id
        and pr.exam_set_id = p_exam_set_id
        and pr.nursery_report_format is not null
    ) x
    limit 1;

    if v_existing_format is not null and v_existing_format <> v_effective_format then
      raise exception 'Cannot mix formats for same student and exam set. Existing format: %, attempted: %',
        v_existing_format, v_effective_format;
    end if;

    if v_effective_format = 'old' then
      if p_total_marks is null or p_total_marks <= 0 then
        p_total_marks := 100;
      end if;

      if p_marks_obtained is not null and (p_marks_obtained < 0 or p_marks_obtained > p_total_marks) then
        raise exception 'marks_obtained must be between 0 and total_marks';
      end if;

      if p_marks_obtained is not null then
        v_percentage := (p_marks_obtained / p_total_marks) * 100;
        v_final_grade := case
          when v_percentage >= 90 then 'D1'
          when v_percentage >= 80 then 'D2'
          when v_percentage >= 70 then 'C3'
          when v_percentage >= 60 then 'C4'
          when v_percentage >= 50 then 'C5'
          when v_percentage >= 40 then 'C6'
          when v_percentage >= 30 then 'P7'
          when v_percentage >= 20 then 'P8'
          else 'F9'
        end;
      else
        v_percentage := null;
        v_final_grade := null;
      end if;

      p_nursery_skills := null;

    else
      p_marks_obtained := null;
      p_total_marks := null;
      v_percentage := null;
      v_final_grade := null;
      p_remarks := null;
      p_teacher_comment := null;
    end if;

  else
    v_effective_format := null;
    v_percentage := null;
    v_final_grade := p_grade;
  end if;

  delete from public.exam_results er
  where er.school_id = p_school_id
    and er.exam_set_id = p_exam_set_id
    and er.student_id = p_student_id
    and er.class_name = p_class_name
    and er.subject = p_subject
    and (er.topic is null or trim(er.topic) = '')
    and (er.paper_code is null or trim(er.paper_code) = '')
    and (er.paper_number is null or trim(er.paper_number) = '');

  insert into public.exam_results (
    school_id,
    exam_set_id,
    student_id,
    class_name,
    subject,
    marks_obtained,
    total_marks,
    grade,
    remarks,
    teacher_id,
    overall_remark,
    nursery_skill_performance,
    nursery_report_format,
    created_at,
    updated_at
  )
  values (
    p_school_id,
    p_exam_set_id,
    p_student_id,
    p_class_name,
    p_subject,
    p_marks_obtained,
    p_total_marks,
    coalesce(v_final_grade, p_grade),
    p_remarks,
    p_teacher_id::uuid,
    p_teacher_comment,
    coalesce(p_nursery_skills, '{}'::jsonb),
    v_effective_format,
    now(),
    now()
  )
  returning id into v_new_id;

  return json_build_object(
    'success', true,
    'action', 'replaced',
    'id', v_new_id,
    'format', v_effective_format,
    'message', 'Exam result saved successfully'
  );

exception
  when others then
    return json_build_object('success', false, 'error', sqlerrm);
end;
$function$
;

CREATE OR REPLACE FUNCTION public.teacher_upsert_exam_result_secondary(p_school_id uuid, p_exam_set_id uuid, p_student_id uuid, p_class_name text, p_subject text, p_activity_score numeric, p_descriptor text, p_formative_score numeric, p_exam_score numeric, p_final_score numeric, p_overall_remark text, p_teacher_initials text, p_teacher_id text, p_topic text DEFAULT NULL::text, p_paper_code text DEFAULT NULL::text, p_paper_number text DEFAULT NULL::text, p_grade text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_topic_key text;
  v_paper_key text;
  v_guard text;
  v_new_id uuid;
BEGIN
  IF p_school_id IS NULL OR p_exam_set_id IS NULL OR p_student_id IS NULL THEN
    RETURN json_build_object('error', 'Missing required parameters');
  END IF;

  v_guard := public.exam_set_teacher_entry_guard_message(p_school_id, p_exam_set_id);
  IF v_guard IS NOT NULL THEN
    RETURN json_build_object('error', v_guard);
  END IF;

  IF p_activity_score IS NULL OR p_formative_score IS NULL OR p_exam_score IS NULL OR p_final_score IS NULL THEN
    RETURN json_build_object('error', 'All scores are required');
  END IF;

  v_topic_key := COALESCE(NULLIF(BTRIM(COALESCE(p_topic, '')), ''), '');
  v_paper_key := COALESCE(
    NULLIF(BTRIM(COALESCE(p_paper_code, '')), ''),
    NULLIF(BTRIM(COALESCE(p_paper_number, '')), ''),
    ''
  );

  DELETE FROM public.exam_results er
  WHERE er.school_id = p_school_id
    AND er.exam_set_id = p_exam_set_id
    AND er.student_id = p_student_id
    AND er.class_name = p_class_name
    AND er.subject = p_subject
    AND er.exam_topic_key = v_topic_key
    AND er.exam_paper_key = v_paper_key;

  INSERT INTO public.exam_results (
    school_id,
    exam_set_id,
    student_id,
    class_name,
    subject,
    activity_score,
    descriptor,
    formative_score,
    exam_score,
    final_score,
    marks_obtained,
    total_marks,
    overall_remark,
    teacher_initials,
    teacher_id,
    topic,
    paper_code,
    paper_number,
    grade,
    nursery_skill_performance,
    created_at,
    updated_at
  ) VALUES (
    p_school_id,
    p_exam_set_id,
    p_student_id,
    p_class_name,
    p_subject,
    p_activity_score,
    p_descriptor,
    p_formative_score,
    p_exam_score,
    p_final_score,
    p_final_score,
    100,
    p_overall_remark,
    p_teacher_initials,
    p_teacher_id,
    NULLIF(BTRIM(COALESCE(p_topic, '')), ''),
    NULLIF(BTRIM(COALESCE(p_paper_code, '')), ''),
    NULLIF(BTRIM(COALESCE(p_paper_number, '')), ''),
    p_grade,
    '{}'::jsonb,
    now(),
    now()
  ) RETURNING id INTO v_new_id;

  RETURN json_build_object('success', true, 'action', 'replaced', 'id', v_new_id);

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('error', 'Database error: ' || SQLERRM);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.teacher_upsert_exam_result_secondary(p_school_id uuid, p_exam_set_id uuid, p_student_id uuid, p_class_name text, p_subject text, p_activity_score numeric, p_descriptor text, p_formative_score numeric, p_exam_score numeric, p_final_score numeric, p_overall_remark text, p_teacher_initials text, p_teacher_id uuid, p_topic text DEFAULT NULL::text, p_paper_code text DEFAULT NULL::text, p_paper_number text DEFAULT NULL::text)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.teacher_upsert_exam_result_secondary(
    p_school_id,
    p_exam_set_id,
    p_student_id,
    p_class_name,
    p_subject,
    p_activity_score,
    p_descriptor,
    p_formative_score,
    p_exam_score,
    p_final_score,
    p_overall_remark,
    p_teacher_initials,
    p_teacher_id::text,
    p_topic,
    p_paper_code,
    p_paper_number,
    NULL::text
  );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.total_term_payments_amount_paid(p_student_id uuid, p_term_id uuid)
 RETURNS numeric
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(SUM(amount_paid), 0)::numeric(12, 2)
  FROM public.student_payments
  WHERE student_id = p_student_id
    AND term_id = p_term_id
    AND reversed_at IS NULL;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_exam_results_normalize_and_replace()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_existing_id uuid;
begin
  new.subject := public.normalize_subject_text(new.subject);

  if tg_op = 'INSERT' then
    select er.id
      into v_existing_id
    from public.exam_results er
    where er.exam_set_id = new.exam_set_id
      and er.student_id = new.student_id
      and lower(public.normalize_subject_text(er.subject)) = lower(public.normalize_subject_text(new.subject))
      and coalesce(er.exam_topic_key, '') = coalesce(new.exam_topic_key, '')
      and coalesce(er.exam_paper_key, '') = coalesce(new.exam_paper_key, '')
    limit 1;

    if v_existing_id is not null then
      update public.exam_results er
      set school_id = new.school_id,
          exam_set_id = new.exam_set_id,
          student_id = new.student_id,
          class_name = new.class_name,
          subject = new.subject,
          marks_obtained = new.marks_obtained,
          total_marks = new.total_marks,
          grade = new.grade,
          remarks = new.remarks,
          teacher_initials = new.teacher_initials,
          teacher_id = new.teacher_id,
          teacher_comment = new.teacher_comment,
          activity_score = new.activity_score,
          descriptor = new.descriptor,
          exam_score = new.exam_score,
          final_score = new.final_score,
          overall_remark = new.overall_remark,
          topic = new.topic,
          formative_score = new.formative_score,
          paper_number = new.paper_number,
          nursery_skill_performance = new.nursery_skill_performance,
          paper_code = new.paper_code,
          uace_points = new.uace_points,
          updated_at = now()
      where er.id = v_existing_id;

      return null;
    end if;
  end if;

  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_normalize_exam_results_subject()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.subject := public.normalize_subject_text(new.subject);
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_normalize_subject_exam_results()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.subject := public.normalize_subject_name(new.subject);
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_normalize_subject_processed_primary()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.subject := public.normalize_subject_name(new.subject);
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_notify_teacher_exam_class_prefs_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid;
  v_label text;
  v_title text;
  v_body text;
  v_meta jsonb;
  parts text[] := ARRAY[]::text[];
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF
      OLD.o_level_formative_max IS NOT DISTINCT FROM NEW.o_level_formative_max
      AND OLD.auto_remark_enabled IS NOT DISTINCT FROM NEW.auto_remark_enabled
      AND OLD.primary_division_settings IS NOT DISTINCT FROM NEW.primary_division_settings
      AND OLD.grade_remarks_olevel IS NOT DISTINCT FROM NEW.grade_remarks_olevel
      AND OLD.grade_remarks_alevel IS NOT DISTINCT FROM NEW.grade_remarks_alevel
    THEN
      RETURN NEW;
    END IF;
  END IF;

  v_label := COALESCE(public.grading_settings_actor_label(v_actor), 'Someone');
  v_title := 'Exam grading preferences updated';

  IF TG_OP = 'INSERT' THEN
    parts := array_append(parts, format('auto remarks %s', CASE WHEN NEW.auto_remark_enabled THEN 'on' ELSE 'off' END));
  ELSIF NEW.auto_remark_enabled IS DISTINCT FROM OLD.auto_remark_enabled THEN
    parts := array_append(parts, format('auto remarks %s', CASE WHEN NEW.auto_remark_enabled THEN 'on' ELSE 'off' END));
  END IF;

  IF TG_OP = 'INSERT' THEN
    parts := array_append(parts, format('formative cap %s%%', NEW.o_level_formative_max));
  ELSIF NEW.o_level_formative_max IS DISTINCT FROM OLD.o_level_formative_max THEN
    parts := array_append(parts, format('formative cap %s%%', NEW.o_level_formative_max));
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.primary_division_settings IS DISTINCT FROM OLD.primary_division_settings THEN
    parts := array_append(parts, 'primary division settings changed');
  ELSIF TG_OP = 'INSERT' AND NEW.primary_division_settings IS NOT NULL THEN
    parts := array_append(parts, 'primary division settings set');
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.grade_remarks_olevel IS DISTINCT FROM OLD.grade_remarks_olevel THEN
    parts := array_append(parts, 'O-Level grade remark texts updated');
  ELSIF TG_OP = 'INSERT'
    AND NEW.grade_remarks_olevel IS NOT NULL
    AND NEW.grade_remarks_olevel <> '{}'::jsonb
  THEN
    parts := array_append(parts, 'O-Level grade remark texts set');
  END IF;

  IF TG_OP = 'UPDATE' AND NEW.grade_remarks_alevel IS DISTINCT FROM OLD.grade_remarks_alevel THEN
    parts := array_append(parts, 'A-Level grade remark texts updated');
  ELSIF TG_OP = 'INSERT'
    AND NEW.grade_remarks_alevel IS NOT NULL
    AND NEW.grade_remarks_alevel <> '{}'::jsonb
  THEN
    parts := array_append(parts, 'A-Level grade remark texts set');
  END IF;

  IF array_length(parts, 1) IS NULL OR array_length(parts, 1) = 0 THEN
    parts := ARRAY['settings saved'];
  END IF;

  v_body := format(
    '%s updated shared exam preferences for class %s: %s.',
    v_label,
    NEW.class_name,
    array_to_string(parts, '; ')
  );

  v_meta := jsonb_build_object(
    'kind', 'teacher_exam_class_prefs',
    'class_name', NEW.class_name,
    'changed_by_user_id', v_actor,
    'prefs', jsonb_build_object(
      'o_level_formative_max', NEW.o_level_formative_max,
      'auto_remark_enabled', NEW.auto_remark_enabled,
      'primary_division_settings', NEW.primary_division_settings,
      'grade_remarks_olevel', NEW.grade_remarks_olevel,
      'grade_remarks_alevel', NEW.grade_remarks_alevel
    )
  );

  PERFORM public.notify_school_staff_grading_settings_change(
    NEW.school_id,
    v_actor,
    v_title,
    v_body,
    'exam_grading',
    v_meta,
    NEW.class_name,
    NULL
  );

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_notify_teacher_exam_grade_bands_after_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid;
  v_label text;
  r_group RECORD;
  v_title text;
  v_body text;
  v_bands text;
  v_meta jsonb;
BEGIN
  v_actor := auth.uid();
  IF v_actor IS NULL THEN
    RETURN NULL;
  END IF;

  v_label := COALESCE(public.grading_settings_actor_label(v_actor), 'Someone');
  v_title := 'Exam grade bands updated';

  FOR r_group IN
    SELECT
      t.school_id,
      t.class_name,
      t.subject,
      t.scale_kind,
      count(*)::int AS n_bands,
      string_agg(
        format('%s (%s%%–%s%%)', t.grade_label, t.min_percent, t.max_percent),
        ', '
        ORDER BY t.sort_order, t.min_percent, t.grade_label
      ) AS band_summary
    FROM new_tab t
    GROUP BY t.school_id, t.class_name, t.subject, t.scale_kind
  LOOP
    v_bands := COALESCE(r_group.band_summary, '');
    IF length(v_bands) > 400 THEN
      v_bands := left(v_bands, 397) || '…';
    END IF;

    v_body := format(
      '%s updated %s grading bands for class %s, subject «%s» (%s band%s): %s.',
      v_label,
      r_group.scale_kind,
      r_group.class_name,
      r_group.subject,
      r_group.n_bands,
      CASE WHEN r_group.n_bands = 1 THEN '' ELSE 's' END,
      v_bands
    );

    v_meta := jsonb_build_object(
      'kind', 'teacher_exam_grade_bands',
      'class_name', r_group.class_name,
      'subject', r_group.subject,
      'scale_kind', r_group.scale_kind,
      'changed_by_user_id', v_actor,
      'band_count', r_group.n_bands
    );

    PERFORM public.notify_school_staff_grading_settings_change(
      r_group.school_id,
      v_actor,
      v_title,
      v_body,
      'exam_grading',
      v_meta,
      r_group.class_name,
      r_group.subject
    );
  END LOOP;

  RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_parents_sync_student_guardian()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.apply_student_guardian_mirror_from_parents(COALESCE(NEW.student_id, OLD.student_id));
  RETURN COALESCE(NEW, OLD);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_school_class_uace_grade_bands_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_schools_after_insert_headteacher_secondary_defaults()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  begin
    perform public.setup_default_headteacher_comments_secondary(new.school_id);
  exception when others then
    raise warning 'headteacher_secondary_defaults: secondary_comments failed for school %: %', new.school_id, sqlerrm;
  end;
  begin
    perform public.setup_default_headteacher_nursery_comments(new.school_id);
  exception when others then
    raise warning 'headteacher_secondary_defaults: nursery_comments failed for school %: %', new.school_id, sqlerrm;
  end;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_schools_seed_expense_subcategories()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM public.seed_expense_subcategories_for_school(NEW.school_id);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_student_invoices_reconcile_after_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF OLD.term_id IS NOT NULL THEN
    PERFORM public.reconcile_term_invoice_payments(OLD.student_id, OLD.term_id);
  END IF;
  RETURN OLD;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trg_teacher_exam_class_prefs_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $function$
;

CREATE OR REPLACE FUNCTION public.trg_teacher_exam_grade_bands_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_add_default_exam_sets_for_new_school()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_school_type TEXT;
    v_current_year INTEGER;
BEGIN
    -- Get school type
    SELECT type INTO v_school_type
    FROM public.schools
    WHERE school_id = NEW.school_id;
    
    IF v_school_type IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Get current year
    v_current_year := EXTRACT(YEAR FROM CURRENT_DATE);
    
    -- For Nursery/Primary schools, create Mid Term and End of Term for all 3 terms
    -- Inline the logic directly - no function call needed
    IF v_school_type = 'Nursery/Primary' OR v_school_type = 'Primary' THEN
        INSERT INTO public.exam_sets (school_id, name, term, year, is_active, created_at, updated_at)
        SELECT 
            NEW.school_id,
            exam_name,
            term_number,
            v_current_year,
            true,
            NOW(),
            NOW()
        FROM (
            VALUES 
                ('Mid Term', 1),
                ('End of Term', 1),
                ('Mid Term', 2),
                ('End of Term', 2),
                ('Mid Term', 3),
                ('End of Term', 3)
        ) AS exam_types(exam_name, term_number)
        WHERE NOT EXISTS (
            SELECT 1 FROM public.exam_sets es 
            WHERE es.school_id = NEW.school_id 
            AND es.name = exam_types.exam_name
            AND es.term = exam_types.term_number
            AND es.year = v_current_year
        );
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_assign_requirements_to_new_student()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Assign requirements to the new student
    PERFORM assign_requirements_to_student(
        NEW.student_id,
        NEW.school_id,
        NEW.current_class,
        COALESCE(NEW.boarding_type, 'Day Scholar')
    );
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_auto_generate_user_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_generated_email TEXT;
    v_first_name TEXT;
    v_last_name TEXT;
BEGIN
    -- Only generate emails for non-Admin and non-Owner users
    IF NEW.role NOT IN ('admin', 'owner') THEN
        -- Extract first and last name from the name field
        v_first_name := split_part(trim(NEW.name), ' ', 1);
        v_last_name := split_part(trim(NEW.name), ' ', 2);
        
        -- If no last name, use first name twice or add a default
        IF v_last_name = '' OR v_last_name IS NULL THEN
            v_last_name := v_first_name;
        END IF;
        
        -- Generate unique school email
        v_generated_email := generate_unique_school_email(
            v_first_name,
            v_last_name,
            NEW.school_id
        );
        
        -- Set the generated email
        NEW.email := v_generated_email;
        
        RAISE NOTICE 'Auto-generated email for user %: %', NEW.name, v_generated_email;
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_ensure_academic_year_for_school_term()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.year IS NOT NULL THEN
    PERFORM public.ensure_academic_year_exists(NEW.year);
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_ensure_all_students_have_all_subjects()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.grade != 'MISSED') OR
     (TG_OP = 'UPDATE' AND NEW.grade != 'MISSED' AND OLD.grade != 'MISSED') THEN

    PERFORM public.ensure_all_students_have_all_subjects(
      NEW.school_id,
      NEW.exam_set_id,
      NEW.class_name
    );
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_ensure_one_student_subjects()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Only run for INSERT (when a new subject is added)
  IF TG_OP = 'INSERT' THEN
    PERFORM ensure_subjects_for_one_student(
      NEW.school_id,
      NEW.exam_set_id,
      NEW.student_id,
      NEW.class_name
    );
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_generate_admission_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    current_year INTEGER := EXTRACT(YEAR FROM NOW());
    sequence_num INTEGER;
    admission_num TEXT;
BEGIN
    IF NEW.admission_number IS NULL THEN
        -- Generate admission number format: ADM-YYYY-NNNN
        sequence_num := EXTRACT(EPOCH FROM NOW())::INTEGER % 10000;
        admission_num := 'ADM-' || current_year || '-' || lpad(sequence_num::text, 4, '0');
        NEW.admission_number := admission_num;
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_generate_employee_id()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.employee_id IS NULL OR TRIM(NEW.employee_id) = '' THEN
    NEW.employee_id := public.next_employee_id_for_school(NEW.school_id);
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_process_one_student_results()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  -- Only process if this is a primary class
  IF NEW.class_name ~ '^Primary [1-7]$' THEN
    -- Process results for this ONE student only
    PERFORM process_exam_results_for_student(
      NEW.school_id,
      NEW.student_id,
      NEW.exam_set_id
    );
  END IF;
  
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_seed_pre_primary_holistic_new_school()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.type IN ('Primary', 'Nursery/Primary') THEN
    PERFORM public.seed_pre_primary_holistic_for_school(NEW.school_id);
  END IF;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_sync_new_requirements_to_existing_students()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Only sync if this is a new requirement (INSERT) and it's active
    IF TG_OP = 'INSERT' AND NEW.status = 'Active' THEN
        PERFORM sync_new_requirements_to_existing_students(
            NEW.id,
            NEW.school_id,
            NEW.class_name,
            NEW.boarding_type
        );
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.trigger_update_requirements_on_payment()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_payment_result JSON;
BEGIN
    -- When a new payment is made, try to apply it to pending requirements
    IF TG_OP = 'INSERT' AND NEW.amount > 0 THEN
        SELECT mark_requirements_as_paid(NEW.student_id, NEW.amount)
        INTO v_payment_result;
        
        -- Log the result (optional)
        RAISE NOTICE 'Payment applied to requirements: %', v_payment_result;
    END IF;
    
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.uace_default_grade_from_percent(p_pct numeric)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE STRICT
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_pct >= 80 THEN 'A'
    WHEN p_pct >= 70 THEN 'B'
    WHEN p_pct >= 60 THEN 'C'
    WHEN p_pct >= 50 THEN 'D'
    WHEN p_pct >= 45 THEN 'E'
    WHEN p_pct >= 40 THEN 'O'
    ELSE 'F'
  END;
$function$
;

CREATE OR REPLACE FUNCTION public.uace_default_points_from_grade(p_grade text)
 RETURNS integer
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE upper(trim(COALESCE(p_grade, '')))
    WHEN 'A' THEN 6
    WHEN 'B' THEN 5
    WHEN 'C' THEN 4
    WHEN 'D' THEN 3
    WHEN 'E' THEN 2
    WHEN 'O' THEN 1
    WHEN 'F' THEN 0
    ELSE NULL
  END;
$function$
;

CREATE OR REPLACE FUNCTION public.uace_grade_from_percent_for_class(p_school_id uuid, p_class_name text, p_pct numeric)
 RETURNS text
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  j jsonb;
  el jsonb;
  g text;
  mn numeric;
  mx numeric;
  pct numeric;
  i integer;
  n integer;
BEGIN
  IF p_pct IS NULL OR p_pct <> p_pct THEN
    RETURN NULL;
  END IF;

  pct := round(p_pct::numeric, 8);

  IF p_school_id IS NULL OR trim(both ' ' FROM coalesce(p_class_name, '')) = '' THEN
    RETURN public.uace_default_grade_from_percent(p_pct);
  END IF;

  SELECT b.bands INTO j
  FROM public.school_class_uace_grade_bands b
  WHERE b.school_id = p_school_id
    AND trim(both ' ' FROM b.class_name) = trim(both ' ' FROM p_class_name)
  LIMIT 1;

  IF j IS NULL OR jsonb_typeof(j) <> 'array' OR jsonb_array_length(j) = 0 THEN
    RETURN public.uace_default_grade_from_percent(p_pct);
  END IF;

  n := jsonb_array_length(j);
  FOR i IN 0 .. n - 1 LOOP
    el := j -> i;
    g := upper(trim(both ' ' FROM coalesce(el ->> 'grade', '')));
    BEGIN
      mn := nullif(trim(both ' ' FROM coalesce(el ->> 'min_pct', '')), '')::numeric;
      mx := nullif(trim(both ' ' FROM coalesce(el ->> 'max_pct', '')), '')::numeric;
    EXCEPTION
      WHEN OTHERS THEN
        CONTINUE;
    END;
    IF g = '' OR mn IS NULL OR mx IS NULL THEN
      CONTINUE;
    END IF;
    IF pct >= mn AND pct <= mx THEN
      RETURN g;
    END IF;
  END LOOP;

  RETURN public.uace_default_grade_from_percent(p_pct);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.undo_student_import_batch(p_batch_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_school_id uuid;
  v_status text;
  v_count int;
  v_ids uuid[];
BEGIN
  IF (SELECT auth.uid()) IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT b.school_id, b.status
  INTO v_school_id, v_status
  FROM public.student_import_batches b
  WHERE b.id = p_batch_id;

  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'batch not found';
  END IF;

  IF NOT public.published_reports_user_is_school_staff(v_school_id) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'import already undone or invalid state';
  END IF;

  SELECT coalesce(array_agg(s.student_id), ARRAY[]::uuid[])
  INTO v_ids
  FROM public.students s
  WHERE s.import_batch_id = p_batch_id
    AND s.school_id = v_school_id;

  v_count := coalesce(array_length(v_ids, 1), 0);

  IF v_count = 0 THEN
    UPDATE public.student_import_batches
    SET status = 'undone', undone_at = now()
    WHERE id = p_batch_id;
    RETURN jsonb_build_object('deleted_count', 0, 'batch_id', p_batch_id);
  END IF;

  -- Clear portal link so DELETE students does not fail (users FK has no ON DELETE)
  UPDATE public.users u
  SET student_id = NULL
  WHERE u.student_id = ANY (v_ids);

  -- Parent links
  DELETE FROM public.parents p
  WHERE p.student_id = ANY (v_ids);

  DELETE FROM public.old_students o
  WHERE o.student_id = ANY (v_ids);

  DELETE FROM public.students s
  WHERE s.import_batch_id = p_batch_id
    AND s.school_id = v_school_id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE public.student_import_batches
  SET status = 'undone', undone_at = now()
  WHERE id = p_batch_id;

  RETURN jsonb_build_object('deleted_count', v_count, 'batch_id', p_batch_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_aggregate_division_on_grade_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.grade IS DISTINCT FROM NEW.grade) THEN
    PERFORM public.calculate_aggregate_and_division(
      NEW.school_id,
      NEW.student_id,
      NEW.exam_set_id
    );
  ELSIF TG_OP = 'INSERT' THEN
    PERFORM public.calculate_aggregate_and_division(
      NEW.school_id,
      NEW.student_id,
      NEW.exam_set_id
    );
  END IF;

  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_class_teachers_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_class_template_settings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_report_templates_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_school_expense_category_name()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
      BEGIN
          -- Only overwrite category_name from expense_categories if category_id is explicitly provided
          IF NEW.category_id IS NOT NULL THEN
              SELECT category_name INTO NEW.category_name
              FROM expense_categories 
              WHERE category_id = NEW.category_id;
          END IF;
          -- Crucial fix: never overwrite existing NEW.category_name with NULL if category_id is null!
          RETURN NEW;
      END;
      $function$
;

CREATE OR REPLACE FUNCTION public.update_school_requirements_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_school_student_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE schools 
        SET student_count = student_count + 1 
        WHERE school_id = NEW.school_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE schools 
        SET student_count = student_count - 1 
        WHERE school_id = OLD.school_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_schoolpay_school_settings_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_snapshot_student_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE report_snapshots
  SET student_count = (
    SELECT COUNT(DISTINCT student_id)
    FROM report_snapshot_data
    WHERE snapshot_id = NEW.snapshot_id
  )
  WHERE id = NEW.snapshot_id;
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_student_balance()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.term_id IS NULL THEN
    PERFORM public.recalc_student_term_balances_from_payments(NEW.student_id, NEW.school_id);
    RETURN NEW;
  END IF;

  PERFORM public.reconcile_term_invoice_payments(NEW.student_id, NEW.term_id);
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_student_photos_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_fee_structure_before_student_registration()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Validate fee structure before allowing student registration
    PERFORM validate_fee_structure_for_student_registration(NEW.school_id, NEW.current_class);
    
    -- If we get here, fee structure is valid, proceed with student registration
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_fee_structure_for_student_registration(p_school_id uuid, p_class_name text)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_fee_count INTEGER;
    v_zero_fee_count INTEGER;
BEGIN
    -- Check if fee structure exists in school_fee_structure table
    SELECT COUNT(*) INTO v_fee_count 
    FROM school_fee_structure 
    WHERE school_id = p_school_id AND class_name = p_class_name;
    
    IF v_fee_count = 0 THEN 
        RAISE EXCEPTION 'Fee structure not set up for class %. Please configure fees in Financial Settings first.', p_class_name; 
    END IF;
    
    -- Check if both day and boarding fees are zero (meaning not configured)
    SELECT COUNT(*) INTO v_zero_fee_count 
    FROM school_fee_structure 
    WHERE school_id = p_school_id 
    AND class_name = p_class_name 
    AND tuition_amount = 0 
    AND boarding_tuition_amount = 0;
    
    IF v_zero_fee_count = v_fee_count THEN 
        RAISE EXCEPTION 'Fee structure not configured for class %. Please set proper fee amounts in Financial Settings before registering students.', p_class_name; 
    END IF;
    
    RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_student_olevel_subjects_student(p_student_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_raw_class text;
  v_school uuid;
  missing int;
  sub_cnt int;
  tot int;
BEGIN
  SELECT trim(both ' ' FROM current_class), school_id
    INTO v_raw_class, v_school
  FROM public.students
  WHERE student_id = p_student_id;

  IF v_raw_class IS NULL OR v_school IS NULL THEN
    RETURN;
  END IF;

  IF NOT (v_raw_class ~* '^(senior\s*[1-4]|s\.?\s*[1-4])(\s|$)') THEN
    RETURN;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.student_olevel_subjects WHERE student_id = p_student_id) THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.student_olevel_subjects s
    WHERE s.student_id = p_student_id
      AND NOT EXISTS (
        SELECT 1 FROM public.class_subjects cs
        WHERE cs.school_id = v_school
          AND trim(both ' ' FROM cs.class_name) = trim(both ' ' FROM v_raw_class)
          AND trim(both ' ' FROM cs.subject) = trim(both ' ' FROM s.subject_name)
      )
  ) THEN
    RAISE EXCEPTION 'Each subject on the learner profile must exist on the class subject list for this class.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*) INTO missing
  FROM public.class_subjects cs
  WHERE cs.school_id = v_school
    AND trim(both ' ' FROM cs.class_name) = trim(both ' ' FROM v_raw_class)
    AND cs.uce_offering_type = 'compulsory'
    AND NOT EXISTS (
      SELECT 1 FROM public.student_olevel_subjects s
      WHERE s.student_id = p_student_id
        AND trim(both ' ' FROM s.subject_name) = trim(both ' ' FROM cs.subject)
    );

  IF missing > 0 THEN
    RAISE EXCEPTION 'Learner must include every compulsory subject timetabled for this class.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT count(*) INTO sub_cnt
  FROM public.student_olevel_subjects s
  JOIN public.class_subjects cs
    ON cs.school_id = s.school_id
    AND trim(both ' ' FROM cs.class_name) = trim(both ' ' FROM v_raw_class)
    AND trim(both ' ' FROM cs.subject) = trim(both ' ' FROM s.subject_name)
  WHERE s.student_id = p_student_id
    AND cs.uce_offering_type = 'subsidiary';

  SELECT count(*) INTO tot FROM public.student_olevel_subjects WHERE student_id = p_student_id;

  IF v_raw_class ~* '^(senior\s*[34]|s\.?\s*[34])(\s|$)' THEN
    IF sub_cnt > 3 THEN
      RAISE EXCEPTION 'Senior 3–4: at most 3 subsidiary subjects on the learner profile.'
        USING ERRCODE = 'check_violation';
    END IF;
    IF tot > 10 THEN
      RAISE EXCEPTION 'Senior 3–4: at most 10 subjects in total on the learner profile.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.validate_student_registration(p_school_id uuid, p_name text, p_gender text, p_class_name text)
 RETURNS json
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_result JSON;
    v_fee_count INTEGER;
    v_zero_fee_count INTEGER;
    v_school_exists BOOLEAN;
    v_class_exists BOOLEAN;
BEGIN
    -- Check if school exists
    SELECT EXISTS(SELECT 1 FROM schools WHERE school_id = p_school_id) INTO v_school_exists;
    IF NOT v_school_exists THEN 
        RETURN json_build_object('success', false, 'error', 'School not found', 'message', 'The school you are trying to register a student for does not exist. Please contact support.', 'action', 'Contact system administrator'); 
    END IF;
    
    -- Check if class exists
    SELECT EXISTS(SELECT 1 FROM classes WHERE school_id = p_school_id AND class_name = p_class_name) INTO v_class_exists;
    IF NOT v_class_exists THEN 
        RETURN json_build_object('success', false, 'error', 'Class not found', 'message', 'The class "' || p_class_name || '" does not exist in your school.', 'action', 'Go to System Settings → Classes to add this class first'); 
    END IF;
    
    -- Check if name is provided
    IF p_name IS NULL OR TRIM(p_name) = '' THEN 
        RETURN json_build_object('success', false, 'error', 'Name required', 'message', 'Student name is required and cannot be empty.', 'action', 'Please enter the student full name'); 
    END IF;
    
    -- Check if gender is provided
    IF p_gender IS NULL OR TRIM(p_gender) = '' THEN 
        RETURN json_build_object('success', false, 'error', 'Gender required', 'message', 'Student gender is required.', 'action', 'Please select the student gender'); 
    END IF;
    
    -- Check fee structure in school_fee_structure table
    SELECT COUNT(*) INTO v_fee_count 
    FROM school_fee_structure 
    WHERE school_id = p_school_id AND class_name = p_class_name;
    
    IF v_fee_count = 0 THEN 
        RETURN json_build_object('success', false, 'error', 'Fee structure not set up', 'message', 'Fee structure has not been set up for class "' || p_class_name || '".', 'action', 'Go to Financial Settings → Fee Structure to set up fees for this class first'); 
    END IF;
    
    -- Check if fees are configured (not all zero)
    SELECT COUNT(*) INTO v_zero_fee_count 
    FROM school_fee_structure 
    WHERE school_id = p_school_id 
    AND class_name = p_class_name 
    AND tuition_amount = 0 
    AND boarding_tuition_amount = 0;
    
    IF v_zero_fee_count = v_fee_count THEN 
        RETURN json_build_object('success', false, 'error', 'Fees not configured', 'message', 'Fee amounts have not been set for class "' || p_class_name || '". All fees are currently set to 0.', 'action', 'Go to Financial Settings → Fee Structure to set proper fee amounts for this class'); 
    END IF;
    
    RETURN json_build_object('success', true, 'message', 'Student registration validation passed', 'action', 'Proceed with registration');
END;
$function$
;

CREATE OR REPLACE FUNCTION public.verify_all_default_value_functions()
 RETURNS TABLE(function_name text, status text, message text)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_school_id UUID;
    v_user_id UUID;
    v_student_id UUID;
    v_teacher_id UUID;
    v_parent_id UUID;
    v_result RECORD;
BEGIN
    -- Create test IDs
    v_school_id := gen_random_uuid();
    v_user_id := gen_random_uuid();
    
    -- Insert school first with NULL admin_id
    INSERT INTO schools (school_id, name, type, location, admin_id, location_name, location_latitude, location_longitude, location_radius) 
    VALUES (v_school_id, 'Test School for Verification', 'Nursery/Primary', 'Test Location', NULL, 'Test Location', 0.0, 0.0, 100);
    
    -- Then insert user with the school_id
    INSERT INTO users (user_id, role, email, password_hash, school_id, name) 
    VALUES (v_user_id, 'admin', 'test@school.com', 'hashed_password', v_school_id, 'Test Admin');
    
    -- Update school with the admin_id
    UPDATE schools SET admin_id = v_user_id WHERE school_id = v_school_id;
    
    -- Test student defaults
    v_student_id := gen_random_uuid();
    INSERT INTO students (student_id, school_id, name, current_class, admission_number) 
    VALUES (v_student_id, v_school_id, 'Test Student', 'Primary 1', 'TEST-001');
    
    -- Test teacher defaults
    v_teacher_id := gen_random_uuid();
    INSERT INTO teachers (teacher_id, school_id, name, employee_id) 
    VALUES (v_teacher_id, v_school_id, 'Test Teacher', 'EMP-001');
    
    -- Test parent defaults
    v_parent_id := gen_random_uuid();
    INSERT INTO parents (parent_id, school_id, student_id, name, phone, email) 
    VALUES (v_parent_id, v_school_id, v_student_id, 'Test Parent', '+256700000000', 'parent@test.com');
    
    -- Return verification results
    RETURN QUERY SELECT 'setup_complete_school_defaults'::TEXT, 'SUCCESS'::TEXT, 'School setup with default data completed'::TEXT;
    RETURN QUERY SELECT 'set_student_defaults_and_linking'::TEXT, 'SUCCESS'::TEXT, 'Student defaults applied successfully'::TEXT;
    RETURN QUERY SELECT 'set_teacher_defaults_and_linking'::TEXT, 'SUCCESS'::TEXT, 'Teacher defaults applied successfully'::TEXT;
    RETURN QUERY SELECT 'set_parent_defaults_and_linking'::TEXT, 'SUCCESS'::TEXT, 'Parent defaults applied successfully'::TEXT;
    
    -- Clean up test data
    DELETE FROM parents WHERE parent_id = v_parent_id;
    DELETE FROM teachers WHERE teacher_id = v_teacher_id;
    DELETE FROM students WHERE student_id = v_student_id;
    DELETE FROM users WHERE user_id = v_user_id;
    DELETE FROM schools WHERE school_id = v_school_id;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY SELECT 'verification_function'::TEXT, 'ERROR'::TEXT, SQLERRM::TEXT;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.worst_pre_primary_holistic_grade_from_json(p_perf jsonb)
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO 'public', 'pg_temp'
AS $function$
  WITH pairs AS (
    SELECT public.normalize_pre_primary_grade_token(v) AS g
    FROM jsonb_each_text(COALESCE(p_perf, '{}'::jsonb)) AS x(k, v)
  ),
  ranked AS (
    SELECT g,
      CASE g
        WHEN 'VERY_GOOD' THEN 4
        WHEN 'GOOD' THEN 3
        WHEN 'NEEDS_IMPROVEMENT' THEN 2
        WHEN 'TRIES' THEN 1
        ELSE NULL
      END AS rk
    FROM pairs
  )
  SELECT g FROM ranked
  WHERE rk IS NOT NULL
  ORDER BY rk ASC
  LIMIT 1;
$function$
;

-- ----------------------------------------------------------------------------
-- 7. VIEWS (10)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE VIEW public."exam_results_summary" AS
 SELECT er.id,
    er.school_id,
    er.exam_set_id,
    er.student_id,
    s.name AS student_name,
    s.current_class,
    s.admission_number,
    sch.name AS school_name,
    es.name AS exam_set_name,
    es.term,
    es.year,
    er.subject,
    er.marks_obtained,
    er.total_marks,
    er.grade,
    er.remarks,
    er.teacher_initials,
    er.created_at
   FROM (((exam_results er
     JOIN students s ON ((er.student_id = s.student_id)))
     JOIN schools sch ON ((er.school_id = sch.school_id)))
     JOIN exam_sets es ON ((er.exam_set_id = es.id)));;

CREATE OR REPLACE VIEW public."financial_summary" AS
 SELECT sf.student_id,
    s.name AS student_name,
    s.current_class,
    s.admission_number,
    sch.name AS school_name,
    sf.year,
    sf.term,
    sf.fee_amount,
    sf.paid_amount,
    sf.balance,
    sf.created_at
   FROM ((student_fees sf
     JOIN students s ON ((sf.student_id = s.student_id)))
     JOIN schools sch ON ((sf.school_id = sch.school_id)));;

CREATE OR REPLACE VIEW public."olevel_exam_subject_lines" AS
 SELECT c.student_id,
    c.school_id,
    c.exam_set_id,
    c.exam_set_name,
    c.exam_term,
    c.exam_year,
    c.subject_name,
    c.offering_sort,
    c.has_exam_result,
    (NOT c.has_exam_result) AS result_missing,
    ( SELECT (count(*))::integer AS count
           FROM exam_results er0
          WHERE ((er0.student_id = c.student_id) AND (er0.exam_set_id = c.exam_set_id) AND (er0.school_id = c.school_id) AND (btrim(er0.subject) = btrim(c.subject_name)))) AS exam_result_line_count,
    er.id AS exam_result_id,
    er.class_name AS exam_result_class_name,
    er.marks_obtained,
    er.total_marks,
    er.final_score,
    er.formative_score,
    er.exam_score,
    er.activity_score,
    er.grade,
    er.descriptor,
    er.remarks,
    er.overall_remark,
    er.teacher_initials,
    er.topic,
    er.paper_code,
    er.paper_number
   FROM (olevel_subject_exam_coverage c
     LEFT JOIN LATERAL ( SELECT er_1.id,
            er_1.class_name,
            er_1.marks_obtained,
            er_1.total_marks,
            er_1.final_score,
            er_1.formative_score,
            er_1.exam_score,
            er_1.activity_score,
            er_1.grade,
            er_1.descriptor,
            er_1.remarks,
            er_1.overall_remark,
            er_1.teacher_initials,
            er_1.topic,
            er_1.paper_code,
            er_1.paper_number
           FROM exam_results er_1
          WHERE ((er_1.student_id = c.student_id) AND (er_1.exam_set_id = c.exam_set_id) AND (er_1.school_id = c.school_id) AND (btrim(er_1.subject) = btrim(c.subject_name)))
          ORDER BY er_1.updated_at DESC NULLS LAST, er_1.created_at DESC NULLS LAST
         LIMIT 1) er ON (true));;

CREATE OR REPLACE VIEW public."olevel_student_expected_subjects" AS
 WITH student_effective_class AS (
         SELECT s.student_id,
            s.school_id,
            COALESCE(NULLIF(btrim(ec.class_from_exam), ''::text), NULLIF(btrim(s.current_class), ''::text)) AS effective_class
           FROM (students s
             LEFT JOIN LATERAL ( SELECT er.class_name AS class_from_exam
                   FROM exam_results er
                  WHERE ((er.student_id = s.student_id) AND (er.school_id = s.school_id))
                  ORDER BY er.updated_at DESC NULLS LAST, er.created_at DESC NULLS LAST
                 LIMIT 1) ec ON (true))
        ), rows AS (
         SELECT s12.student_id,
            s12.school_id,
            s12.subject_name,
            s12.offering_sort
           FROM ( SELECT DISTINCT ON (sec.student_id, sec.school_id, (btrim(cs.subject))) sec.student_id,
                    sec.school_id,
                    btrim(cs.subject) AS subject_name,
                        CASE
                            WHEN (cs.uce_offering_type = 'compulsory'::text) THEN 0
                            WHEN (cs.uce_offering_type = 'subsidiary'::text) THEN 1
                            ELSE 2
                        END AS offering_sort
                   FROM (student_effective_class sec
                     JOIN class_subjects cs ON (((cs.school_id = sec.school_id) AND (olevel_class_senior_band(cs.class_name) = olevel_class_senior_band(sec.effective_class)) AND (olevel_class_senior_band(sec.effective_class) = ANY (ARRAY[1, 2])))))
                  WHERE (olevel_class_senior_band(sec.effective_class) IS NOT NULL)
                  ORDER BY sec.student_id, sec.school_id, (btrim(cs.subject)),
                        CASE
                            WHEN (cs.uce_offering_type = 'compulsory'::text) THEN 0
                            WHEN (cs.uce_offering_type = 'subsidiary'::text) THEN 1
                            ELSE 2
                        END) s12
        UNION
         SELECT s34.student_id,
            s34.school_id,
            s34.subject_name,
            s34.offering_sort
           FROM ( SELECT DISTINCT ON (sec.student_id, sec.school_id, (btrim(sos.subject_name))) sec.student_id,
                    sec.school_id,
                    btrim(sos.subject_name) AS subject_name,
                        CASE
                            WHEN (cs.uce_offering_type = 'compulsory'::text) THEN 0
                            WHEN (cs.uce_offering_type = 'subsidiary'::text) THEN 1
                            ELSE 2
                        END AS offering_sort
                   FROM ((student_effective_class sec
                     JOIN student_olevel_subjects sos ON (((sos.student_id = sec.student_id) AND (sos.school_id = sec.school_id))))
                     LEFT JOIN class_subjects cs ON (((cs.school_id = sec.school_id) AND (olevel_class_senior_band(cs.class_name) = olevel_class_senior_band(sec.effective_class)) AND (btrim(cs.subject) = btrim(sos.subject_name)))))
                  WHERE ((olevel_class_senior_band(sec.effective_class) = ANY (ARRAY[3, 4])) AND (olevel_class_senior_band(sec.effective_class) IS NOT NULL))
                  ORDER BY sec.student_id, sec.school_id, (btrim(sos.subject_name)),
                        CASE
                            WHEN (cs.uce_offering_type = 'compulsory'::text) THEN 0
                            WHEN (cs.uce_offering_type = 'subsidiary'::text) THEN 1
                            ELSE 2
                        END) s34
        )
 SELECT student_id,
    school_id,
    subject_name,
    offering_sort
   FROM rows
  WHERE (btrim(subject_name) <> ''::text);;

CREATE OR REPLACE VIEW public."olevel_subject_exam_coverage" AS
 SELECT ses.student_id,
    ses.school_id,
    es.id AS exam_set_id,
    es.name AS exam_set_name,
    es.term AS exam_term,
    es.year AS exam_year,
    ses.subject_name,
    ses.offering_sort,
    (EXISTS ( SELECT 1
           FROM exam_results er
          WHERE ((er.student_id = ses.student_id) AND (er.exam_set_id = es.id) AND (er.school_id = ses.school_id) AND (btrim(er.subject) = btrim(ses.subject_name))))) AS has_exam_result
   FROM (olevel_student_expected_subjects ses
     JOIN exam_sets es ON ((es.school_id = ses.school_id)));;

CREATE OR REPLACE VIEW public."school_expenses_with_category" AS
 SELECT se.expense_id,
    se.school_id,
    se.category_id,
    ec.category_name,
    se.term_id,
    se.amount,
    se.description,
    se.expense_date,
    se.reference_number,
    se.status,
    se.recorded_by,
    se.created_at,
    se.payment_method
   FROM (school_expenses se
     LEFT JOIN expense_categories ec ON ((se.category_id = ec.category_id)));;

CREATE OR REPLACE VIEW public."school_statistics" AS
 SELECT sch.school_id,
    sch.name AS school_name,
    sch.type AS school_type,
    sch.location,
    sch.student_count,
    count(DISTINCT t.teacher_id) AS teacher_count,
    count(DISTINCT s.student_id) AS actual_student_count,
    count(DISTINCT es.id) AS exam_sets_count,
    sch.created_at
   FROM (((schools sch
     LEFT JOIN teachers t ON ((sch.school_id = t.school_id)))
     LEFT JOIN students s ON ((sch.school_id = s.school_id)))
     LEFT JOIN exam_sets es ON ((sch.school_id = es.school_id)))
  GROUP BY sch.school_id, sch.name, sch.type, sch.location, sch.student_count, sch.created_at;;

CREATE OR REPLACE VIEW public."student_pdf_records" AS
 SELECT psr.id,
    psr.published_at AS date,
    psr.student_id,
    s.name AS student,
    COALESCE(rt.name, 'Report Card'::text) AS template,
    psr.storage_bucket,
    psr.storage_object_path AS file,
    psr.term,
    psr.year,
    psr.exam_set_id,
    es.name AS exam,
    c.class_name AS class,
    psr.school_id
   FROM ((((published_student_reports psr
     JOIN students s ON ((s.student_id = psr.student_id)))
     LEFT JOIN exam_sets es ON ((es.id = psr.exam_set_id)))
     LEFT JOIN classes c ON ((c.class_id = psr.class_id)))
     LEFT JOIN LATERAL ( SELECT rt2.name
           FROM ((generated_reports gr
             JOIN report_snapshots rs ON ((rs.id = gr.snapshot_id)))
             JOIN report_templates rt2 ON ((rt2.id = gr.template_id)))
          WHERE ((rs.school_id = psr.school_id) AND (rs.term = psr.term) AND (rs.year = psr.year) AND (rs.exam_set_id = psr.exam_set_id) AND (gr.student_id = psr.student_id))
          ORDER BY gr.generated_at DESC
         LIMIT 1) rt ON (true));;

CREATE OR REPLACE VIEW public."student_summary" AS
 SELECT s.student_id,
    s.name AS student_name,
    s.current_class,
    s.admission_number,
    s.status,
    s.expected_fee_amount,
    sch.name AS school_name,
    sch.type AS school_type,
    sch.location AS school_location
   FROM (students s
     JOIN schools sch ON ((s.school_id = sch.school_id)));;

CREATE OR REPLACE VIEW public."teacher_summary" AS
 SELECT t.teacher_id,
    t.name AS teacher_name,
    t.email,
    t.phone,
    t.employee_id,
    t.subjects,
    t.classes,
    sch.name AS school_name,
    sch.type AS school_type,
    t.date_of_hire,
    t.created_at
   FROM (teachers t
     JOIN schools sch ON ((t.school_id = sch.school_id)));;

-- ----------------------------------------------------------------------------
-- 8. TRIGGERS (137)
-- ----------------------------------------------------------------------------

DROP TRIGGER IF EXISTS "trigger_set_admission_sequence_defaults_and_linking" ON public."admission_sequences";
CREATE TRIGGER trigger_set_admission_sequence_defaults_and_linking BEFORE INSERT ON public.admission_sequences FOR EACH ROW EXECUTE FUNCTION set_admission_sequence_defaults_and_linking();

DROP TRIGGER IF EXISTS "sync_referral_use_count_trigger" ON public."affiliate_clicks";
CREATE TRIGGER sync_referral_use_count_trigger AFTER INSERT OR DELETE ON public.affiliate_clicks FOR EACH ROW EXECUTE FUNCTION sync_referral_use_count();

DROP TRIGGER IF EXISTS "trigger_set_affiliate_click_defaults_and_linking" ON public."affiliate_clicks";
CREATE TRIGGER trigger_set_affiliate_click_defaults_and_linking BEFORE INSERT ON public.affiliate_clicks FOR EACH ROW EXECUTE FUNCTION set_affiliate_click_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_set_affiliate_code_defaults_and_linking" ON public."affiliate_codes";
CREATE TRIGGER trigger_set_affiliate_code_defaults_and_linking BEFORE INSERT ON public.affiliate_codes FOR EACH ROW EXECUTE FUNCTION set_affiliate_code_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_set_affiliate_earning_defaults_and_linking" ON public."affiliate_earnings";
CREATE TRIGGER trigger_set_affiliate_earning_defaults_and_linking BEFORE INSERT ON public.affiliate_earnings FOR EACH ROW EXECUTE FUNCTION set_affiliate_earning_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_set_affiliate_defaults_and_linking" ON public."affiliates";
CREATE TRIGGER trigger_set_affiliate_defaults_and_linking BEFORE INSERT ON public.affiliates FOR EACH ROW EXECUTE FUNCTION set_affiliate_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_set_attendance_defaults_and_linking" ON public."attendance";
CREATE TRIGGER trigger_set_attendance_defaults_and_linking BEFORE INSERT ON public.attendance FOR EACH ROW EXECUTE FUNCTION set_attendance_defaults_and_linking();

DROP TRIGGER IF EXISTS "class_subjects_protect_uace_subsidiaries_trg" ON public."class_subjects";
CREATE TRIGGER class_subjects_protect_uace_subsidiaries_trg BEFORE DELETE OR UPDATE ON public.class_subjects FOR EACH ROW EXECUTE FUNCTION class_subjects_protect_uace_subsidiaries();

DROP TRIGGER IF EXISTS "trigger_add_default_teacher_remarks" ON public."class_subjects";
CREATE TRIGGER trigger_add_default_teacher_remarks AFTER INSERT ON public.class_subjects FOR EACH ROW EXECUTE FUNCTION add_default_teacher_remarks_for_subject();

DROP TRIGGER IF EXISTS "trigger_set_class_subject_defaults_and_linking" ON public."class_subjects";
CREATE TRIGGER trigger_set_class_subject_defaults_and_linking BEFORE INSERT ON public.class_subjects FOR EACH ROW EXECUTE FUNCTION set_class_subject_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_auto_update_class_comments_on_settings_change" ON public."class_teacher_comments_settings";
CREATE TRIGGER trigger_auto_update_class_comments_on_settings_change AFTER INSERT OR DELETE OR UPDATE ON public.class_teacher_comments_settings FOR EACH ROW EXECUTE FUNCTION auto_update_class_comments_on_settings_change();

DROP TRIGGER IF EXISTS "trigger_set_class_teacher_comments_defaults" ON public."class_teacher_comments_settings";
CREATE TRIGGER trigger_set_class_teacher_comments_defaults BEFORE INSERT ON public.class_teacher_comments_settings FOR EACH ROW EXECUTE FUNCTION set_class_teacher_comments_defaults();

DROP TRIGGER IF EXISTS "trigger_set_class_teacher_comments_setting_defaults_and_linking" ON public."class_teacher_comments_settings";
CREATE TRIGGER trigger_set_class_teacher_comments_setting_defaults_and_linking BEFORE INSERT ON public.class_teacher_comments_settings FOR EACH ROW EXECUTE FUNCTION set_class_teacher_comments_setting_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_update_updated_at" ON public."class_teacher_comments_settings";
CREATE TRIGGER trigger_update_updated_at BEFORE UPDATE ON public.class_teacher_comments_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS "trigger_refresh_processed_comments_ctn" ON public."class_teacher_nursery_comment_settings";
CREATE TRIGGER trigger_refresh_processed_comments_ctn AFTER INSERT OR DELETE OR UPDATE ON public.class_teacher_nursery_comment_settings FOR EACH ROW EXECUTE FUNCTION refresh_processed_comments_on_settings_change();

DROP TRIGGER IF EXISTS "trigger_set_class_teacher_defaults" ON public."class_teachers";
CREATE TRIGGER trigger_set_class_teacher_defaults BEFORE INSERT ON public.class_teachers FOR EACH ROW EXECUTE FUNCTION set_class_teacher_defaults();

DROP TRIGGER IF EXISTS "trigger_set_class_teacher_defaults_and_linking" ON public."class_teachers";
CREATE TRIGGER trigger_set_class_teacher_defaults_and_linking BEFORE INSERT ON public.class_teachers FOR EACH ROW EXECUTE FUNCTION set_class_teacher_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_update_class_teachers_updated_at" ON public."class_teachers";
CREATE TRIGGER trigger_update_class_teachers_updated_at BEFORE UPDATE ON public.class_teachers FOR EACH ROW EXECUTE FUNCTION update_class_teachers_updated_at();

DROP TRIGGER IF EXISTS "trigger_set_class_template_setting_defaults_and_linking" ON public."class_template_settings";
CREATE TRIGGER trigger_set_class_template_setting_defaults_and_linking BEFORE INSERT ON public.class_template_settings FOR EACH ROW EXECUTE FUNCTION set_class_template_setting_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_update_class_template_settings_updated_at" ON public."class_template_settings";
CREATE TRIGGER trigger_update_class_template_settings_updated_at BEFORE UPDATE ON public.class_template_settings FOR EACH ROW EXECUTE FUNCTION update_class_template_settings_updated_at();

DROP TRIGGER IF EXISTS "trigger_set_class_defaults_and_linking" ON public."classes";
CREATE TRIGGER trigger_set_class_defaults_and_linking BEFORE INSERT ON public.classes FOR EACH ROW EXECUTE FUNCTION set_class_defaults_and_linking();

DROP TRIGGER IF EXISTS "trg_discipline_records_legacy" ON public."discipline_records";
CREATE TRIGGER trg_discipline_records_legacy BEFORE INSERT OR UPDATE ON public.discipline_records FOR EACH ROW EXECUTE FUNCTION discipline_records_sync_legacy_fields();

DROP TRIGGER IF EXISTS "trigger_set_discipline_record_defaults_and_linking" ON public."discipline_records";
CREATE TRIGGER trigger_set_discipline_record_defaults_and_linking BEFORE INSERT ON public.discipline_records FOR EACH ROW EXECUTE FUNCTION set_discipline_record_defaults_and_linking();

DROP TRIGGER IF EXISTS "trg_cleanup_nursery_processed_shadow" ON public."exam_results";
CREATE TRIGGER trg_cleanup_nursery_processed_shadow AFTER INSERT OR UPDATE OF marks_obtained, total_marks, grade, remarks, nursery_skill_performance, nursery_report_format, class_name, subject ON public.exam_results FOR EACH ROW EXECUTE FUNCTION cleanup_nursery_processed_shadow();

DROP TRIGGER IF EXISTS "trigger_auto_update_exam_results_remarks" ON public."exam_results";
CREATE TRIGGER trigger_auto_update_exam_results_remarks BEFORE INSERT OR UPDATE ON public.exam_results FOR EACH ROW EXECUTE FUNCTION auto_update_exam_results_remarks();

DROP TRIGGER IF EXISTS "trigger_ensure_student_has_all_subjects" ON public."exam_results";
CREATE TRIGGER trigger_ensure_student_has_all_subjects AFTER INSERT ON public.exam_results FOR EACH ROW EXECUTE FUNCTION trigger_ensure_one_student_subjects();

DROP TRIGGER IF EXISTS "trigger_normalize_exam_results_subject" ON public."exam_results";
CREATE TRIGGER trigger_normalize_exam_results_subject BEFORE INSERT OR UPDATE ON public.exam_results FOR EACH ROW EXECUTE FUNCTION trg_exam_results_normalize_and_replace();

DROP TRIGGER IF EXISTS "trigger_normalize_subject_exam_results" ON public."exam_results";
CREATE TRIGGER trigger_normalize_subject_exam_results BEFORE INSERT OR UPDATE OF subject ON public.exam_results FOR EACH ROW EXECUTE FUNCTION trg_normalize_subject_exam_results();

DROP TRIGGER IF EXISTS "trigger_set_exam_result_defaults_and_linking" ON public."exam_results";
CREATE TRIGGER trigger_set_exam_result_defaults_and_linking BEFORE INSERT ON public.exam_results FOR EACH ROW EXECUTE FUNCTION set_exam_result_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_set_exam_result_grade" ON public."exam_results";
CREATE TRIGGER trigger_set_exam_result_grade BEFORE INSERT OR UPDATE OF marks_obtained, total_marks, grade ON public.exam_results FOR EACH ROW EXECUTE FUNCTION set_exam_result_grade_from_marks();

DROP TRIGGER IF EXISTS "trigger_update_updated_at" ON public."exam_results";
CREATE TRIGGER trigger_update_updated_at BEFORE UPDATE ON public.exam_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS "trigger_set_exam_set_defaults_and_linking" ON public."exam_sets";
CREATE TRIGGER trigger_set_exam_set_defaults_and_linking BEFORE INSERT ON public.exam_sets FOR EACH ROW EXECUTE FUNCTION set_exam_set_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_update_updated_at" ON public."exam_sets";
CREATE TRIGGER trigger_update_updated_at BEFORE UPDATE ON public.exam_sets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS "trigger_set_expense_category_defaults_and_linking" ON public."expense_categories";
CREATE TRIGGER trigger_set_expense_category_defaults_and_linking BEFORE INSERT ON public.expense_categories FOR EACH ROW EXECUTE FUNCTION set_expense_category_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_set_grade_defaults_and_linking" ON public."grades";
CREATE TRIGGER trigger_set_grade_defaults_and_linking BEFORE INSERT ON public.grades FOR EACH ROW EXECUTE FUNCTION set_grade_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_refresh_processed_comments_ht" ON public."headteacher_comments_settings";
CREATE TRIGGER trigger_refresh_processed_comments_ht AFTER INSERT OR DELETE OR UPDATE ON public.headteacher_comments_settings FOR EACH ROW EXECUTE FUNCTION refresh_processed_comments_on_settings_change();

DROP TRIGGER IF EXISTS "trigger_set_headteacher_comments_setting_defaults_and_linking" ON public."headteacher_comments_settings";
CREATE TRIGGER trigger_set_headteacher_comments_setting_defaults_and_linking BEFORE INSERT ON public.headteacher_comments_settings FOR EACH ROW EXECUTE FUNCTION set_headteacher_comments_setting_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_update_updated_at" ON public."headteacher_comments_settings";
CREATE TRIGGER trigger_update_updated_at BEFORE UPDATE ON public.headteacher_comments_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS "trigger_refresh_processed_comments_htn" ON public."headteacher_nursery_comment_settings";
CREATE TRIGGER trigger_refresh_processed_comments_htn AFTER INSERT OR DELETE OR UPDATE ON public.headteacher_nursery_comment_settings FOR EACH ROW EXECUTE FUNCTION refresh_processed_comments_on_settings_change();

DROP TRIGGER IF EXISTS "trg_hr_leave_balance_status" ON public."hr_leave_requests";
CREATE TRIGGER trg_hr_leave_balance_status AFTER UPDATE OF status ON public.hr_leave_requests FOR EACH ROW EXECUTE FUNCTION hr_trg_leave_balance_on_status();

DROP TRIGGER IF EXISTS "trg_hr_leave_requests_validate" ON public."hr_leave_requests";
CREATE TRIGGER trg_hr_leave_requests_validate BEFORE INSERT OR UPDATE OF school_id, staff_kind, staff_id ON public.hr_leave_requests FOR EACH ROW EXECUTE FUNCTION hr_trg_validate_leave_request();

DROP TRIGGER IF EXISTS "trigger_set_job_defaults_and_linking" ON public."jobs";
CREATE TRIGGER trigger_set_job_defaults_and_linking BEFORE INSERT ON public.jobs FOR EACH ROW EXECUTE FUNCTION set_job_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_set_library_book_defaults_and_linking" ON public."library";
CREATE TRIGGER trigger_set_library_book_defaults_and_linking BEFORE INSERT ON public.library FOR EACH ROW EXECUTE FUNCTION set_library_book_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_set_library_book_copy_defaults_and_linking" ON public."library_book_copies";
CREATE TRIGGER trigger_set_library_book_copy_defaults_and_linking BEFORE INSERT ON public.library_book_copies FOR EACH ROW EXECUTE FUNCTION set_library_book_copy_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_set_log_defaults_and_linking" ON public."logs";
CREATE TRIGGER trigger_set_log_defaults_and_linking BEFORE INSERT ON public.logs FOR EACH ROW EXECUTE FUNCTION set_log_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_set_notification_log_defaults_and_linking" ON public."notification_logs";
CREATE TRIGGER trigger_set_notification_log_defaults_and_linking BEFORE INSERT ON public.notification_logs FOR EACH ROW EXECUTE FUNCTION set_notification_log_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_set_notification_template_defaults_and_linking" ON public."notification_templates";
CREATE TRIGGER trigger_set_notification_template_defaults_and_linking BEFORE INSERT ON public.notification_templates FOR EACH ROW EXECUTE FUNCTION set_notification_template_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_set_notification_defaults_and_linking" ON public."notifications";
CREATE TRIGGER trigger_set_notification_defaults_and_linking BEFORE INSERT ON public.notifications FOR EACH ROW EXECUTE FUNCTION set_notification_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_set_old_student_defaults_and_linking" ON public."old_students";
CREATE TRIGGER trigger_set_old_student_defaults_and_linking BEFORE INSERT ON public.old_students FOR EACH ROW EXECUTE FUNCTION set_old_student_defaults_and_linking();

DROP TRIGGER IF EXISTS "trg_parents_sync_student_guardian" ON public."parents";
CREATE TRIGGER trg_parents_sync_student_guardian AFTER INSERT OR DELETE OR UPDATE ON public.parents FOR EACH ROW EXECUTE FUNCTION trg_parents_sync_student_guardian();

DROP TRIGGER IF EXISTS "trigger_set_parent_defaults_and_linking" ON public."parents";
CREATE TRIGGER trigger_set_parent_defaults_and_linking BEFORE INSERT ON public.parents FOR EACH ROW EXECUTE FUNCTION set_parent_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_notify_owner_payments" ON public."payments";
CREATE TRIGGER trigger_notify_owner_payments AFTER INSERT OR DELETE OR UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION notify_owner_dashboard_update();

DROP TRIGGER IF EXISTS "trigger_set_payment_defaults_and_linking" ON public."payments";
CREATE TRIGGER trigger_set_payment_defaults_and_linking BEFORE INSERT ON public.payments FOR EACH ROW EXECUTE FUNCTION set_payment_defaults_and_linking();

DROP TRIGGER IF EXISTS "trg_proc_results_after_update_class_comment" ON public."processed_primary_exam_results";
CREATE TRIGGER trg_proc_results_after_update_class_comment AFTER INSERT OR DELETE OR UPDATE OF marks_obtained, total_marks, grade, teacher_remark, class_name ON public.processed_primary_exam_results FOR EACH ROW EXECUTE FUNCTION proc_results_after_update_class_comment();

DROP TRIGGER IF EXISTS "trg_proc_results_before_fill_fields" ON public."processed_primary_exam_results";
CREATE TRIGGER trg_proc_results_before_fill_fields BEFORE INSERT OR UPDATE ON public.processed_primary_exam_results FOR EACH ROW EXECUTE FUNCTION proc_results_before_fill_fields();

DROP TRIGGER IF EXISTS "trigger_normalize_subject_processed_primary" ON public."processed_primary_exam_results";
CREATE TRIGGER trigger_normalize_subject_processed_primary BEFORE INSERT OR UPDATE OF subject ON public.processed_primary_exam_results FOR EACH ROW EXECUTE FUNCTION trg_normalize_subject_processed_primary();

DROP TRIGGER IF EXISTS "trigger_recalculate_class_positions" ON public."processed_primary_exam_results";
CREATE TRIGGER trigger_recalculate_class_positions AFTER INSERT OR DELETE OR UPDATE ON public.processed_primary_exam_results FOR EACH ROW EXECUTE FUNCTION recalculate_class_positions_trigger();

DROP TRIGGER IF EXISTS "trigger_update_aggregate_division" ON public."processed_primary_exam_results";
CREATE TRIGGER trigger_update_aggregate_division AFTER INSERT OR UPDATE OF grade, marks_obtained, total_marks, subject, class_name ON public.processed_primary_exam_results FOR EACH ROW EXECUTE FUNCTION update_aggregate_division_on_grade_change();

DROP TRIGGER IF EXISTS "trigger_set_receipt_defaults" ON public."receipts";
CREATE TRIGGER trigger_set_receipt_defaults BEFORE INSERT ON public.receipts FOR EACH ROW EXECUTE FUNCTION set_receipt_defaults();

DROP TRIGGER IF EXISTS "trigger_set_receipt_defaults_and_linking" ON public."receipts";
CREATE TRIGGER trigger_set_receipt_defaults_and_linking BEFORE INSERT ON public.receipts FOR EACH ROW EXECUTE FUNCTION set_receipt_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_set_report_comment_defaults_and_linking" ON public."report_comments";
CREATE TRIGGER trigger_set_report_comment_defaults_and_linking BEFORE INSERT ON public.report_comments FOR EACH ROW EXECUTE FUNCTION set_report_comment_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_update_snapshot_student_count" ON public."report_snapshot_data";
CREATE TRIGGER trigger_update_snapshot_student_count AFTER INSERT ON public.report_snapshot_data FOR EACH ROW EXECUTE FUNCTION update_snapshot_student_count();

DROP TRIGGER IF EXISTS "trigger_set_report_template_defaults_and_linking" ON public."report_templates";
CREATE TRIGGER trigger_set_report_template_defaults_and_linking BEFORE INSERT ON public.report_templates FOR EACH ROW EXECUTE FUNCTION set_report_template_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_update_report_templates_updated_at" ON public."report_templates";
CREATE TRIGGER trigger_update_report_templates_updated_at BEFORE UPDATE ON public.report_templates FOR EACH ROW EXECUTE FUNCTION update_report_templates_updated_at();

DROP TRIGGER IF EXISTS "trigger_set_report_title_setting_defaults_and_linking" ON public."report_title_settings";
CREATE TRIGGER trigger_set_report_title_setting_defaults_and_linking BEFORE INSERT ON public.report_title_settings FOR EACH ROW EXECUTE FUNCTION set_report_title_setting_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_set_report_defaults" ON public."reports";
CREATE TRIGGER trigger_set_report_defaults BEFORE INSERT ON public.reports FOR EACH ROW EXECUTE FUNCTION set_report_defaults();

DROP TRIGGER IF EXISTS "trigger_set_report_defaults_and_linking" ON public."reports";
CREATE TRIGGER trigger_set_report_defaults_and_linking BEFORE INSERT ON public.reports FOR EACH ROW EXECUTE FUNCTION set_report_defaults_and_linking();

DROP TRIGGER IF EXISTS "school_chat_messages_guard_update" ON public."school_chat_messages";
CREATE TRIGGER school_chat_messages_guard_update BEFORE UPDATE ON public.school_chat_messages FOR EACH ROW EXECUTE FUNCTION private.school_chat_messages_guard_update();

DROP TRIGGER IF EXISTS "trg_school_chat_messages_touch" ON public."school_chat_messages";
CREATE TRIGGER trg_school_chat_messages_touch AFTER INSERT ON public.school_chat_messages FOR EACH ROW EXECUTE FUNCTION school_chat_touch_conversation();

DROP TRIGGER IF EXISTS "tr_school_class_uace_grade_bands_updated_at" ON public."school_class_uace_grade_bands";
CREATE TRIGGER tr_school_class_uace_grade_bands_updated_at BEFORE UPDATE ON public.school_class_uace_grade_bands FOR EACH ROW EXECUTE FUNCTION trg_school_class_uace_grade_bands_updated_at();

DROP TRIGGER IF EXISTS "trigger_set_school_event_defaults_and_linking" ON public."school_events";
CREATE TRIGGER trigger_set_school_event_defaults_and_linking BEFORE INSERT ON public.school_events FOR EACH ROW EXECUTE FUNCTION set_school_event_defaults_and_linking();

DROP TRIGGER IF EXISTS "trg_school_expenses_enforce_approval_insert" ON public."school_expenses";
CREATE TRIGGER trg_school_expenses_enforce_approval_insert BEFORE INSERT ON public.school_expenses FOR EACH ROW EXECUTE FUNCTION school_expenses_enforce_approval_insert();

DROP TRIGGER IF EXISTS "trigger_set_school_expense_defaults" ON public."school_expenses";
CREATE TRIGGER trigger_set_school_expense_defaults BEFORE INSERT ON public.school_expenses FOR EACH ROW EXECUTE FUNCTION set_school_expense_defaults();

DROP TRIGGER IF EXISTS "trigger_set_school_expense_defaults_and_linking" ON public."school_expenses";
CREATE TRIGGER trigger_set_school_expense_defaults_and_linking BEFORE INSERT ON public.school_expenses FOR EACH ROW EXECUTE FUNCTION set_school_expense_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_update_school_expense_category_name" ON public."school_expenses";
CREATE TRIGGER trigger_update_school_expense_category_name BEFORE INSERT OR UPDATE ON public.school_expenses FOR EACH ROW EXECUTE FUNCTION update_school_expense_category_name();

DROP TRIGGER IF EXISTS "trigger_set_school_report_customization_defaults_and_linking" ON public."school_report_customizations";
CREATE TRIGGER trigger_set_school_report_customization_defaults_and_linking BEFORE INSERT ON public.school_report_customizations FOR EACH ROW EXECUTE FUNCTION set_school_report_customization_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_sync_new_requirements_to_existing_students" ON public."school_requirements";
CREATE TRIGGER trigger_sync_new_requirements_to_existing_students AFTER INSERT ON public.school_requirements FOR EACH ROW EXECUTE FUNCTION trigger_sync_new_requirements_to_existing_students();

DROP TRIGGER IF EXISTS "trigger_update_school_requirements_updated_at" ON public."school_requirements";
CREATE TRIGGER trigger_update_school_requirements_updated_at BEFORE UPDATE ON public.school_requirements FOR EACH ROW EXECUTE FUNCTION update_school_requirements_updated_at();

DROP TRIGGER IF EXISTS "trigger_notify_owner_subscriptions" ON public."school_subscriptions";
CREATE TRIGGER trigger_notify_owner_subscriptions AFTER INSERT OR DELETE OR UPDATE ON public.school_subscriptions FOR EACH ROW EXECUTE FUNCTION notify_owner_dashboard_update();

DROP TRIGGER IF EXISTS "ensure_academic_year_on_school_term" ON public."school_terms";
CREATE TRIGGER ensure_academic_year_on_school_term BEFORE INSERT OR UPDATE OF year ON public.school_terms FOR EACH ROW WHEN ((new.year IS NOT NULL)) EXECUTE FUNCTION trigger_ensure_academic_year_for_school_term();

DROP TRIGGER IF EXISTS "trigger_auto_initialize_balances_on_new_term" ON public."school_terms";
CREATE TRIGGER trigger_auto_initialize_balances_on_new_term AFTER INSERT ON public.school_terms FOR EACH ROW EXECUTE FUNCTION auto_initialize_balances_on_new_term();

DROP TRIGGER IF EXISTS "trigger_set_school_term_defaults_and_linking" ON public."school_terms";
CREATE TRIGGER trigger_set_school_term_defaults_and_linking BEFORE INSERT ON public.school_terms FOR EACH ROW EXECUTE FUNCTION set_school_term_defaults_and_linking();

DROP TRIGGER IF EXISTS "trg_schoolpay_school_settings_updated" ON public."schoolpay_school_settings";
CREATE TRIGGER trg_schoolpay_school_settings_updated BEFORE UPDATE ON public.schoolpay_school_settings FOR EACH ROW EXECUTE FUNCTION update_schoolpay_school_settings_updated_at();

DROP TRIGGER IF EXISTS "schools_after_insert_expense_subcategories" ON public."schools";
CREATE TRIGGER schools_after_insert_expense_subcategories AFTER INSERT ON public.schools FOR EACH ROW EXECUTE FUNCTION trg_schools_seed_expense_subcategories();

DROP TRIGGER IF EXISTS "schools_after_insert_headteacher_secondary_defaults" ON public."schools";
CREATE TRIGGER schools_after_insert_headteacher_secondary_defaults AFTER INSERT ON public.schools FOR EACH ROW EXECUTE FUNCTION trg_schools_after_insert_headteacher_secondary_defaults();

DROP TRIGGER IF EXISTS "schools_mark_cascade_deleting_trg" ON public."schools";
CREATE TRIGGER schools_mark_cascade_deleting_trg BEFORE DELETE ON public.schools FOR EACH ROW EXECUTE FUNCTION schools_mark_cascade_deleting();

DROP TRIGGER IF EXISTS "trg_schools_seed_pre_primary_holistic" ON public."schools";
CREATE TRIGGER trg_schools_seed_pre_primary_holistic AFTER INSERT ON public.schools FOR EACH ROW EXECUTE FUNCTION trigger_seed_pre_primary_holistic_new_school();

DROP TRIGGER IF EXISTS "trigger_auto_setup_school_settings" ON public."schools";
CREATE TRIGGER trigger_auto_setup_school_settings AFTER INSERT ON public.schools FOR EACH ROW EXECUTE FUNCTION auto_setup_school_settings();

DROP TRIGGER IF EXISTS "trigger_notify_owner_schools" ON public."schools";
CREATE TRIGGER trigger_notify_owner_schools AFTER INSERT OR DELETE OR UPDATE ON public.schools FOR EACH ROW EXECUTE FUNCTION notify_owner_dashboard_update();

DROP TRIGGER IF EXISTS "trigger_set_school_code_if_empty" ON public."schools";
CREATE TRIGGER trigger_set_school_code_if_empty BEFORE INSERT OR UPDATE OF name, school_code ON public.schools FOR EACH ROW EXECUTE FUNCTION set_school_code_if_empty();

DROP TRIGGER IF EXISTS "trigger_setup_new_school_defaults" ON public."schools";
CREATE TRIGGER trigger_setup_new_school_defaults AFTER INSERT ON public.schools FOR EACH ROW EXECUTE FUNCTION setup_new_school_defaults();

DROP TRIGGER IF EXISTS "student_alevel_subjects_prevent_gp_delete_trg" ON public."student_alevel_subjects";
CREATE TRIGGER student_alevel_subjects_prevent_gp_delete_trg BEFORE DELETE ON public.student_alevel_subjects FOR EACH ROW EXECUTE FUNCTION student_alevel_subjects_prevent_gp_delete();

DROP TRIGGER IF EXISTS "student_alevel_subjects_row_guard_trg" ON public."student_alevel_subjects";
CREATE TRIGGER student_alevel_subjects_row_guard_trg BEFORE INSERT OR UPDATE ON public.student_alevel_subjects FOR EACH ROW EXECUTE FUNCTION student_alevel_subjects_row_guard();

DROP TRIGGER IF EXISTS "student_attendance_fill_absent_after_insert" ON public."student_attendance";
CREATE TRIGGER student_attendance_fill_absent_after_insert AFTER INSERT ON public.student_attendance REFERENCING NEW TABLE AS new_table FOR EACH STATEMENT EXECUTE FUNCTION student_attendance_fill_absent_after_insert_fn();

DROP TRIGGER IF EXISTS "student_attendance_normalize_present_status" ON public."student_attendance";
CREATE TRIGGER student_attendance_normalize_present_status BEFORE INSERT OR UPDATE ON public.student_attendance FOR EACH ROW EXECUTE FUNCTION student_attendance_normalize_present_status_fn();

DROP TRIGGER IF EXISTS "trigger_set_student_attendance_defaults" ON public."student_attendance";
CREATE TRIGGER trigger_set_student_attendance_defaults BEFORE INSERT ON public.student_attendance FOR EACH ROW EXECUTE FUNCTION set_student_attendance_defaults();

DROP TRIGGER IF EXISTS "trigger_set_student_attendance_defaults_and_linking" ON public."student_attendance";
CREATE TRIGGER trigger_set_student_attendance_defaults_and_linking BEFORE INSERT ON public.student_attendance FOR EACH ROW EXECUTE FUNCTION set_student_attendance_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_auto_calculate_balance" ON public."student_balances";
CREATE TRIGGER trigger_auto_calculate_balance BEFORE INSERT OR UPDATE ON public.student_balances FOR EACH ROW EXECUTE FUNCTION auto_calculate_student_balance();

DROP TRIGGER IF EXISTS "trigger_set_student_balance_defaults_and_linking" ON public."student_balances";
CREATE TRIGGER trigger_set_student_balance_defaults_and_linking BEFORE INSERT ON public.student_balances FOR EACH ROW EXECUTE FUNCTION set_student_balance_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_update_updated_at" ON public."student_balances";
CREATE TRIGGER trigger_update_updated_at BEFORE UPDATE ON public.student_balances FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS "trigger_set_student_fee_defaults_and_linking" ON public."student_fees";
CREATE TRIGGER trigger_set_student_fee_defaults_and_linking BEFORE INSERT ON public.student_fees FOR EACH ROW EXECUTE FUNCTION set_student_fee_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_update_updated_at" ON public."student_fees";
CREATE TRIGGER trigger_update_updated_at BEFORE UPDATE ON public.student_fees FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS "trg_sync_student_boarding_type_from_invoice" ON public."student_invoices";
CREATE TRIGGER trg_sync_student_boarding_type_from_invoice AFTER INSERT OR UPDATE OF total_amount, status ON public.student_invoices FOR EACH ROW EXECUTE FUNCTION sync_student_boarding_type_from_invoice();

DROP TRIGGER IF EXISTS "trigger_student_invoices_reconcile_after_delete" ON public."student_invoices";
CREATE TRIGGER trigger_student_invoices_reconcile_after_delete AFTER DELETE ON public.student_invoices FOR EACH ROW EXECUTE FUNCTION trg_student_invoices_reconcile_after_delete();

DROP TRIGGER IF EXISTS "trigger_sync_balance_on_invoice_activation" ON public."student_invoices";
CREATE TRIGGER trigger_sync_balance_on_invoice_activation AFTER INSERT OR UPDATE OF status, total_amount ON public.student_invoices FOR EACH ROW EXECUTE FUNCTION sync_balance_on_invoice_activation();

DROP TRIGGER IF EXISTS "trigger_set_student_payment_defaults" ON public."student_payments";
CREATE TRIGGER trigger_set_student_payment_defaults BEFORE INSERT ON public.student_payments FOR EACH ROW EXECUTE FUNCTION set_student_payment_defaults();

DROP TRIGGER IF EXISTS "trigger_set_student_payment_defaults_and_linking" ON public."student_payments";
CREATE TRIGGER trigger_set_student_payment_defaults_and_linking BEFORE INSERT ON public.student_payments FOR EACH ROW EXECUTE FUNCTION set_student_payment_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_sync_invoice_amount_paid" ON public."student_payments";
CREATE TRIGGER trigger_sync_invoice_amount_paid AFTER INSERT OR DELETE OR UPDATE ON public.student_payments FOR EACH ROW EXECUTE FUNCTION sync_invoice_amount_paid();

DROP TRIGGER IF EXISTS "trigger_update_requirements_on_payment" ON public."student_payments";
CREATE TRIGGER trigger_update_requirements_on_payment AFTER INSERT ON public.student_payments FOR EACH ROW EXECUTE FUNCTION trigger_update_requirements_on_payment();

DROP TRIGGER IF EXISTS "trigger_update_student_balance" ON public."student_payments";
CREATE TRIGGER trigger_update_student_balance AFTER INSERT OR UPDATE ON public.student_payments FOR EACH ROW EXECUTE FUNCTION update_student_balance();

DROP TRIGGER IF EXISTS "trigger_update_student_photos_updated_at" ON public."student_photos";
CREATE TRIGGER trigger_update_student_photos_updated_at BEFORE UPDATE ON public.student_photos FOR EACH ROW EXECUTE FUNCTION update_student_photos_updated_at();

DROP TRIGGER IF EXISTS "students_programme_follow_class_trg" ON public."students";
CREATE TRIGGER students_programme_follow_class_trg AFTER INSERT OR UPDATE OF current_class ON public.students FOR EACH ROW EXECUTE FUNCTION students_programme_follow_class_trg_fn();

DROP TRIGGER IF EXISTS "students_set_age_years_trg" ON public."students";
CREATE TRIGGER students_set_age_years_trg BEFORE INSERT OR UPDATE OF date_of_birth ON public.students FOR EACH ROW EXECUTE FUNCTION students_set_age_years_trg_fn();

DROP TRIGGER IF EXISTS "tr_notify_staff_on_student_insert" ON public."students";
CREATE TRIGGER tr_notify_staff_on_student_insert AFTER INSERT ON public.students FOR EACH ROW EXECUTE FUNCTION notify_school_staff_new_student();

DROP TRIGGER IF EXISTS "trigger_assign_requirements_to_new_student" ON public."students";
CREATE TRIGGER trigger_assign_requirements_to_new_student AFTER INSERT ON public.students FOR EACH ROW EXECUTE FUNCTION trigger_assign_requirements_to_new_student();

DROP TRIGGER IF EXISTS "trigger_auto_create_balance_for_new_student" ON public."students";
CREATE TRIGGER trigger_auto_create_balance_for_new_student AFTER INSERT ON public.students FOR EACH ROW EXECUTE FUNCTION auto_create_balance_for_new_student();

DROP TRIGGER IF EXISTS "trigger_auto_generate_admission_number" ON public."students";
CREATE TRIGGER trigger_auto_generate_admission_number BEFORE INSERT OR UPDATE ON public.students FOR EACH ROW EXECUTE FUNCTION auto_generate_admission_number();

DROP TRIGGER IF EXISTS "trigger_generate_admission_number" ON public."students";
CREATE TRIGGER trigger_generate_admission_number BEFORE INSERT ON public.students FOR EACH ROW EXECUTE FUNCTION trigger_generate_admission_number();

DROP TRIGGER IF EXISTS "trigger_set_student_admission_number_if_empty" ON public."students";
CREATE TRIGGER trigger_set_student_admission_number_if_empty BEFORE INSERT OR UPDATE OF admission_number, school_id, admission_date, first_name, last_name, middle_name ON public.students FOR EACH ROW EXECUTE FUNCTION set_student_admission_number_if_empty();

DROP TRIGGER IF EXISTS "trigger_set_student_defaults" ON public."students";
CREATE TRIGGER trigger_set_student_defaults BEFORE INSERT ON public.students FOR EACH ROW EXECUTE FUNCTION set_student_defaults();

DROP TRIGGER IF EXISTS "trigger_set_student_defaults_and_linking" ON public."students";
CREATE TRIGGER trigger_set_student_defaults_and_linking BEFORE INSERT ON public.students FOR EACH ROW EXECUTE FUNCTION set_student_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_update_school_student_count" ON public."students";
CREATE TRIGGER trigger_update_school_student_count AFTER INSERT OR DELETE ON public.students FOR EACH ROW EXECUTE FUNCTION update_school_student_count();

DROP TRIGGER IF EXISTS "trigger_validate_fee_structure_before_student_registration" ON public."students";
CREATE TRIGGER trigger_validate_fee_structure_before_student_registration BEFORE INSERT ON public.students FOR EACH ROW EXECUTE FUNCTION validate_fee_structure_before_student_registration();

DROP TRIGGER IF EXISTS "trigger_set_subject_defaults_and_linking" ON public."subjects";
CREATE TRIGGER trigger_set_subject_defaults_and_linking BEFORE INSERT ON public.subjects FOR EACH ROW EXECUTE FUNCTION set_subject_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_set_teacher_attendance_log_defaults_and_linking" ON public."teacher_attendance_logs";
CREATE TRIGGER trigger_set_teacher_attendance_log_defaults_and_linking BEFORE INSERT ON public.teacher_attendance_logs FOR EACH ROW EXECUTE FUNCTION set_teacher_attendance_log_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_set_teacher_class_subject_defaults_and_linking" ON public."teacher_class_subjects";
CREATE TRIGGER trigger_set_teacher_class_subject_defaults_and_linking BEFORE INSERT ON public.teacher_class_subjects FOR EACH ROW EXECUTE FUNCTION set_teacher_class_subject_defaults_and_linking();

DROP TRIGGER IF EXISTS "tr_notify_teacher_exam_class_prefs_change" ON public."teacher_exam_class_prefs";
CREATE TRIGGER tr_notify_teacher_exam_class_prefs_change AFTER INSERT OR UPDATE ON public.teacher_exam_class_prefs FOR EACH ROW EXECUTE FUNCTION trg_notify_teacher_exam_class_prefs_change();

DROP TRIGGER IF EXISTS "tr_teacher_exam_class_prefs_updated_at" ON public."teacher_exam_class_prefs";
CREATE TRIGGER tr_teacher_exam_class_prefs_updated_at BEFORE UPDATE ON public.teacher_exam_class_prefs FOR EACH ROW EXECUTE FUNCTION trg_teacher_exam_class_prefs_updated_at();

DROP TRIGGER IF EXISTS "tr_teacher_exam_grade_bands_updated_at" ON public."teacher_exam_grade_bands";
CREATE TRIGGER tr_teacher_exam_grade_bands_updated_at BEFORE UPDATE ON public.teacher_exam_grade_bands FOR EACH ROW EXECUTE FUNCTION trg_teacher_exam_grade_bands_updated_at();

DROP TRIGGER IF EXISTS "trigger_set_teacher_remarks_defaults" ON public."teacher_remarks_settings";
CREATE TRIGGER trigger_set_teacher_remarks_defaults BEFORE INSERT ON public.teacher_remarks_settings FOR EACH ROW EXECUTE FUNCTION set_teacher_remarks_defaults();

DROP TRIGGER IF EXISTS "trigger_set_teacher_remarks_setting_defaults_and_linking" ON public."teacher_remarks_settings";
CREATE TRIGGER trigger_set_teacher_remarks_setting_defaults_and_linking BEFORE INSERT ON public.teacher_remarks_settings FOR EACH ROW EXECUTE FUNCTION set_teacher_remarks_setting_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_update_updated_at" ON public."teacher_remarks_settings";
CREATE TRIGGER trigger_update_updated_at BEFORE UPDATE ON public.teacher_remarks_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS "auto_generate_employee_id" ON public."teachers";
CREATE TRIGGER auto_generate_employee_id BEFORE INSERT ON public.teachers FOR EACH ROW EXECUTE FUNCTION trigger_generate_employee_id();

DROP TRIGGER IF EXISTS "trigger_set_term_closure_defaults_and_linking" ON public."term_closures";
CREATE TRIGGER trigger_set_term_closure_defaults_and_linking BEFORE INSERT ON public.term_closures FOR EACH ROW EXECUTE FUNCTION set_term_closure_defaults_and_linking();

DROP TRIGGER IF EXISTS "trigger_set_termly_project_defaults_and_linking" ON public."termly_projects";
CREATE TRIGGER trigger_set_termly_project_defaults_and_linking BEFORE INSERT ON public.termly_projects FOR EACH ROW EXECUTE FUNCTION set_termly_project_defaults_and_linking();

DROP TRIGGER IF EXISTS "tr_users_sync_teacher_email" ON public."users";
CREATE TRIGGER tr_users_sync_teacher_email AFTER INSERT OR UPDATE OF email, linked_teacher_id, school_id ON public.users FOR EACH ROW WHEN ((new.role = 'teacher'::text)) EXECUTE FUNCTION sync_teacher_email_from_user();

DROP TRIGGER IF EXISTS "trigger_notify_owner_users" ON public."users";
CREATE TRIGGER trigger_notify_owner_users AFTER INSERT OR DELETE OR UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION notify_owner_dashboard_update();

-- ----------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY (RLS) ENABLEMENT (175 Tables)
-- ----------------------------------------------------------------------------

ALTER TABLE public."admin_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."admission_sequences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."affiliate_clicks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."affiliate_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."affiliate_earnings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."affiliates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."assignment_answers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."assignment_questions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."assignment_submissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."audit_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."balance_brought_forward" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."biometric_device_users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."biometric_devices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."class_streams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."class_subjects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."class_teacher_comments_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."class_teacher_nursery_comment_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."class_teachers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."class_template_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."classes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."curriculum_files" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."curriculum_scheme_examples" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."curriculum_topics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."discipline_records" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."educational_library" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."election_candidates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."election_voter_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."elections" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."exam_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."exam_sets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."expense_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."expense_main_categories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."expense_subcategories" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."expense_subcategory_defaults" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."fee_structures" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."generated_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."global_terms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."grades" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."grading_scale" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."guild_announcements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."guild_portfolios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."guild_tenures" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."guild_transactions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."guild_welfare_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."headteacher_comments_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."headteacher_nursery_comment_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."hr_job_applications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."hr_leave_balances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."hr_leave_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."hr_leave_types" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."hr_onboarding_run_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."hr_onboarding_runs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."hr_onboarding_template_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."hr_onboarding_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."hr_payroll_periods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."hr_payslips" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."hr_review_cycles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."hr_staff_goals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."hr_staff_reviews" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."invoice_sequences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."jobs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."lesson_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."library" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."library_book_copies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."library_books" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."library_borrows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."library_fines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."library_reservations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."login_activities" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."notification_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."notification_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."nursery_auto_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."nursery_detailed_observation_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."old_students" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."other_staff_members" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."owner_revenue_trend_metrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."owner_school_growth_metrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."owner_user_growth_metrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."parents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."pdf_render_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."period_locks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."phone_reset_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."platform_config" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."pre_primary_holistic_rating_levels" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."pre_primary_holistic_skills" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."pre_primary_holistic_strands" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."processed_primary_exam_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."processed_secondary_exam_results" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."published_class_report_bundles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."published_student_reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."receipt_sequences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."receipt_sequences_per_term" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."receipts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."receivable_status" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."referral_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."report_comments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."report_pdf_cache" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."report_snapshot_data" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."report_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."report_templates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."report_title_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."reports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."rollover_status" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."scheme_of_work" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."scheme_of_work_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."school_chat_conversations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."school_chat_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."school_chat_participants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."school_chat_presence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."school_class_uace_grade_bands" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."school_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."school_expenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."school_fee_structure" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."school_report_customizations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."school_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."school_requirements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."school_subscriptions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."school_terms" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."school_uace_class_subject_papers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."schoolpay_ingested_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."schoolpay_school_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."schools" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."student_alevel_subjects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."student_attendance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."student_balances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."student_discounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."student_fees" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."student_grievances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."student_import_batches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."student_invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."student_ledger" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."student_olevel_subjects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."student_payments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."student_photos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."student_requirements" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."student_stream_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."students" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."subjects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."system_actions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."system_health_metrics" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."teacher_attendance_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."teacher_attendance_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."teacher_class_subjects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."teacher_comment_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."teacher_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."teacher_exam_class_prefs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."teacher_exam_grade_bands" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."teacher_phone_change_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."teacher_remarks_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."teacher_resources" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."teachers" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."term_closures" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."termly_projects" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."timetable_fixed_periods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."timetable_periods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."timetables" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."uace_subject_catalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."uce_subject_catalog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_active_schools" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_in_app_notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_school_memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_school_permissions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."visitor_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."whatsapp_bot_sessions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."writeoff_log" ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY (RLS) POLICIES (297 Policies)
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin activities are viewable by school admins" ON public."admin_activities";
  CREATE POLICY "Admin activities are viewable by school admins" ON public."admin_activities"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = admin_activities.school_id) AND (u.role = ANY (ARRAY['admin'::text, 'head_teacher'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admin activities can be inserted by school admins" ON public."admin_activities";
  CREATE POLICY "Admin activities can be inserted by school admins" ON public."admin_activities"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (((admin_user_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = admin_activities.school_id) AND (u.role = ANY (ARRAY['admin'::text, 'head_teacher'::text])))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."admission_sequences";
  CREATE POLICY "optimized_authenticated_access" ON public."admission_sequences"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."affiliate_clicks";
  CREATE POLICY "optimized_authenticated_access" ON public."affiliate_clicks"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."affiliate_codes";
  CREATE POLICY "optimized_authenticated_access" ON public."affiliate_codes"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."affiliate_earnings";
  CREATE POLICY "optimized_authenticated_access" ON public."affiliate_earnings"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "affiliates_deny_anon_authenticated" ON public."affiliates";
  CREATE POLICY "affiliates_deny_anon_authenticated" ON public."affiliates"
    AS PERMISSIVE
    FOR ALL
    TO {anon,authenticated}
    USING (false)
    WITH CHECK (false)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "aa_insert" ON public."assignment_answers";
  CREATE POLICY "aa_insert" ON public."assignment_answers"
    AS PERMISSIVE
    FOR INSERT
    TO {public}
    WITH CHECK (((( SELECT auth.uid() AS uid) IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM assignment_submissions sub
  WHERE (sub.id = assignment_answers.submission_id)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "aa_select" ON public."assignment_answers";
  CREATE POLICY "aa_select" ON public."assignment_answers"
    AS PERMISSIVE
    FOR SELECT
    TO {public}
    USING (true)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "aa_update" ON public."assignment_answers";
  CREATE POLICY "aa_update" ON public."assignment_answers"
    AS PERMISSIVE
    FOR UPDATE
    TO {public}
    USING ((EXISTS ( SELECT 1
   FROM (assignment_submissions sub
     JOIN assignments a ON ((a.id = sub.assignment_id)))
  WHERE ((sub.id = assignment_answers.submission_id) AND (a.teacher_id = ( SELECT auth.uid() AS uid))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "aq_insert" ON public."assignment_questions";
  CREATE POLICY "aq_insert" ON public."assignment_questions"
    AS PERMISSIVE
    FOR INSERT
    TO {public}
    WITH CHECK ((EXISTS ( SELECT 1
   FROM assignments
  WHERE ((assignments.id = assignment_questions.assignment_id) AND (assignments.teacher_id = ( SELECT auth.uid() AS uid))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "aq_select" ON public."assignment_questions";
  CREATE POLICY "aq_select" ON public."assignment_questions"
    AS PERMISSIVE
    FOR SELECT
    TO {public}
    USING (true)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "assignment_submissions_insert" ON public."assignment_submissions";
  CREATE POLICY "assignment_submissions_insert" ON public."assignment_submissions"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (((student_id IN ( SELECT u.student_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid)))) OR (assignment_id IN ( SELECT a.id
   FROM assignments a
  WHERE (a.teacher_id IN ( SELECT t.teacher_id
           FROM teachers t
          WHERE (t.school_id IN ( SELECT u.school_id
                   FROM users u
                  WHERE (u.user_id = ( SELECT auth.uid() AS uid))))))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "assignments_access" ON public."assignments";
  CREATE POLICY "assignments_access" ON public."assignments"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING (((teacher_id IN ( SELECT teachers.teacher_id
   FROM teachers
  WHERE (teachers.school_id IN ( SELECT users.school_id
           FROM users
          WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))) OR (school_id IN ( SELECT schools.school_id
   FROM schools
  WHERE (schools.admin_id = ( SELECT auth.uid() AS uid)))) OR (class_name IN ( SELECT students.current_class
   FROM students
  WHERE (students.student_id IN ( SELECT users.student_id
           FROM users
          WHERE (users.user_id = ( SELECT auth.uid() AS uid))))))))
    WITH CHECK (((teacher_id IN ( SELECT teachers.teacher_id
   FROM teachers
  WHERE (teachers.school_id IN ( SELECT users.school_id
           FROM users
          WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))) OR (school_id IN ( SELECT schools.school_id
   FROM schools
  WHERE (schools.admin_id = ( SELECT auth.uid() AS uid))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."attendance";
  CREATE POLICY "optimized_authenticated_access" ON public."attendance"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "audit_log_school_users" ON public."audit_log";
  CREATE POLICY "audit_log_school_users" ON public."audit_log"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
    WITH CHECK ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "owner_only_audit_logs" ON public."audit_logs";
  CREATE POLICY "owner_only_audit_logs" ON public."audit_logs"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((( SELECT users.role
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))) = 'owner'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "bbf_school_users" ON public."balance_brought_forward";
  CREATE POLICY "bbf_school_users" ON public."balance_brought_forward"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
    WITH CHECK ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "biometric_device_users_school" ON public."biometric_device_users";
  CREATE POLICY "biometric_device_users_school" ON public."biometric_device_users"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.school_id = biometric_device_users.school_id) AND (profiles.role = ANY (ARRAY['admin'::text, 'owner'::text, 'secretary'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "biometric_devices_school" ON public."biometric_devices";
  CREATE POLICY "biometric_devices_school" ON public."biometric_devices"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING (private.user_can_manage_school(school_id))
    WITH CHECK (private.user_can_manage_school(school_id))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_admin_delete_class_streams" ON public."class_streams";
  CREATE POLICY "school_admin_delete_class_streams" ON public."class_streams"
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text, 'headteacher'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_admin_insert_class_streams" ON public."class_streams";
  CREATE POLICY "school_admin_insert_class_streams" ON public."class_streams"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text, 'headteacher'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_members_read_class_streams" ON public."class_streams";
  CREATE POLICY "school_members_read_class_streams" ON public."class_streams"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."class_subjects";
  CREATE POLICY "optimized_authenticated_access" ON public."class_subjects"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."class_teacher_comments_settings";
  CREATE POLICY "optimized_authenticated_access" ON public."class_teacher_comments_settings"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."class_teacher_nursery_comment_settings";
  CREATE POLICY "optimized_authenticated_access" ON public."class_teacher_nursery_comment_settings"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."class_teachers";
  CREATE POLICY "optimized_authenticated_access" ON public."class_teachers"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."class_template_settings";
  CREATE POLICY "optimized_authenticated_access" ON public."class_template_settings"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "classes_insert_school_staff" ON public."classes";
  CREATE POLICY "classes_insert_school_staff" ON public."classes"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK ((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "classes_select_authenticated" ON public."classes";
  CREATE POLICY "classes_select_authenticated" ON public."classes"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING ((((school_id = current_user_school_id()) AND (EXISTS ( SELECT 1
   FROM user_school_permissions p
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND (p.school_id = classes.school_id) AND (p.permission_key = 'accounting.full'::text))))) OR (school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))) OR (school_id IN ( SELECT s.school_id
   FROM schools s
  WHERE (s.admin_id = ( SELECT auth.uid() AS uid))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "cf_delete" ON public."curriculum_files";
  CREATE POLICY "cf_delete" ON public."curriculum_files"
    AS PERMISSIVE
    FOR DELETE
    TO {public}
    USING ((( SELECT auth.uid() AS uid) IS NOT NULL))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "cf_insert" ON public."curriculum_files";
  CREATE POLICY "cf_insert" ON public."curriculum_files"
    AS PERMISSIVE
    FOR INSERT
    TO {public}
    WITH CHECK ((( SELECT auth.uid() AS uid) IS NOT NULL))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "cf_select" ON public."curriculum_files";
  CREATE POLICY "cf_select" ON public."curriculum_files"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "cf_update" ON public."curriculum_files";
  CREATE POLICY "cf_update" ON public."curriculum_files"
    AS PERMISSIVE
    FOR UPDATE
    TO {public}
    USING ((( SELECT auth.uid() AS uid) IS NOT NULL))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "curriculum_scheme_examples_select" ON public."curriculum_scheme_examples";
  CREATE POLICY "curriculum_scheme_examples_select" ON public."curriculum_scheme_examples"
    AS PERMISSIVE
    FOR SELECT
    TO {public}
    USING (true)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "curriculum_topics_select" ON public."curriculum_topics";
  CREATE POLICY "curriculum_topics_select" ON public."curriculum_topics"
    AS PERMISSIVE
    FOR SELECT
    TO {public}
    USING (true)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "discipline_records_unified" ON public."discipline_records";
  CREATE POLICY "discipline_records_unified" ON public."discipline_records"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'owner'::text, 'teacher'::text]))))) OR (EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = 'parent'::text))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "el_delete" ON public."educational_library";
  CREATE POLICY "el_delete" ON public."educational_library"
    AS PERMISSIVE
    FOR DELETE
    TO {public}
    USING ((( SELECT auth.uid() AS uid) IS NOT NULL))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "el_insert" ON public."educational_library";
  CREATE POLICY "el_insert" ON public."educational_library"
    AS PERMISSIVE
    FOR INSERT
    TO {public}
    WITH CHECK ((( SELECT auth.uid() AS uid) IS NOT NULL))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "el_select" ON public."educational_library";
  CREATE POLICY "el_select" ON public."educational_library"
    AS PERMISSIVE
    FOR SELECT
    TO {public}
    USING (true)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "el_update" ON public."educational_library";
  CREATE POLICY "el_update" ON public."educational_library"
    AS PERMISSIVE
    FOR UPDATE
    TO {public}
    USING ((( SELECT auth.uid() AS uid) IS NOT NULL))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "election_candidates_school_all" ON public."election_candidates";
  CREATE POLICY "election_candidates_school_all" ON public."election_candidates"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING (true)
    WITH CHECK (true)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "election_voter_logs_school_all" ON public."election_voter_logs";
  CREATE POLICY "election_voter_logs_school_all" ON public."election_voter_logs"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING (true)
    WITH CHECK (true)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "elections_school_all" ON public."elections";
  CREATE POLICY "elections_school_all" ON public."elections"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING (true)
    WITH CHECK (true)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "exam_results_school_scoped" ON public."exam_results";
  CREATE POLICY "exam_results_school_scoped" ON public."exam_results"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING (((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))) OR (school_id IN ( SELECT schools.school_id
   FROM schools
  WHERE (schools.admin_id = ( SELECT auth.uid() AS uid)))) OR (school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = 'admin'::text))))))
    WITH CHECK (((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))) OR (school_id IN ( SELECT schools.school_id
   FROM schools
  WHERE (schools.admin_id = ( SELECT auth.uid() AS uid)))) OR (school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = 'admin'::text))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "exam_sets_school_scoped" ON public."exam_sets";
  CREATE POLICY "exam_sets_school_scoped" ON public."exam_sets"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING (((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))) OR (school_id IN ( SELECT schools.school_id
   FROM schools
  WHERE (schools.admin_id = ( SELECT auth.uid() AS uid)))) OR (school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = 'admin'::text))))))
    WITH CHECK (((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))) OR (school_id IN ( SELECT schools.school_id
   FROM schools
  WHERE (schools.admin_id = ( SELECT auth.uid() AS uid)))) OR (school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = 'admin'::text))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."expense_categories";
  CREATE POLICY "optimized_authenticated_access" ON public."expense_categories"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "expense_main_categories_read_all" ON public."expense_main_categories";
  CREATE POLICY "expense_main_categories_read_all" ON public."expense_main_categories"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING (true)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "expense_subcategories_admin_delete" ON public."expense_subcategories";
  CREATE POLICY "expense_subcategories_admin_delete" ON public."expense_subcategories"
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING ((school_id IN ( SELECT s.school_id
   FROM schools s
  WHERE (s.admin_id = ( SELECT auth.uid() AS uid)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "expense_subcategories_admin_insert" ON public."expense_subcategories";
  CREATE POLICY "expense_subcategories_admin_insert" ON public."expense_subcategories"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK ((school_id IN ( SELECT s.school_id
   FROM schools s
  WHERE (s.admin_id = ( SELECT auth.uid() AS uid)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "expense_subcategories_admin_update" ON public."expense_subcategories";
  CREATE POLICY "expense_subcategories_admin_update" ON public."expense_subcategories"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING ((school_id IN ( SELECT s.school_id
   FROM schools s
  WHERE (s.admin_id = ( SELECT auth.uid() AS uid)))))
    WITH CHECK ((school_id IN ( SELECT s.school_id
   FROM schools s
  WHERE (s.admin_id = ( SELECT auth.uid() AS uid)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "expense_subcategories_select_school" ON public."expense_subcategories";
  CREATE POLICY "expense_subcategories_select_school" ON public."expense_subcategories"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING ((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "expense_subcategory_defaults_read_all" ON public."expense_subcategory_defaults";
  CREATE POLICY "expense_subcategory_defaults_read_all" ON public."expense_subcategory_defaults"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING (true)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."fee_structures";
  CREATE POLICY "optimized_authenticated_access" ON public."fee_structures"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "System can insert generated reports" ON public."generated_reports";
  CREATE POLICY "System can insert generated reports" ON public."generated_reports"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK ((snapshot_id IN ( SELECT report_snapshots.id
   FROM report_snapshots
  WHERE ((report_snapshots.school_id IN ( SELECT users.school_id
           FROM users
          WHERE (users.user_id = ( SELECT auth.uid() AS uid)))) OR (report_snapshots.school_id IN ( SELECT schools.school_id
           FROM schools
          WHERE (schools.admin_id = ( SELECT auth.uid() AS uid)))) OR (report_snapshots.school_id IN ( SELECT users.school_id
           FROM users
          WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = 'admin'::text))))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "generated_reports_select_authenticated" ON public."generated_reports";
  CREATE POLICY "generated_reports_select_authenticated" ON public."generated_reports"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING (((student_id IN ( SELECT p.student_id
   FROM parents p
  WHERE (p.parent_id = ( SELECT auth.uid() AS uid)))) OR (student_id IN ( SELECT u.student_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.student_id IS NOT NULL)))) OR (EXISTS ( SELECT 1
   FROM report_snapshots rs
  WHERE ((rs.id = generated_reports.snapshot_id) AND published_reports_user_is_school_staff(rs.school_id))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "global_terms_manage_delete" ON public."global_terms";
  CREATE POLICY "global_terms_manage_delete" ON public."global_terms"
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING ((( SELECT users.role
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))) = 'owner'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "global_terms_manage_insert" ON public."global_terms";
  CREATE POLICY "global_terms_manage_insert" ON public."global_terms"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK ((( SELECT users.role
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))) = 'owner'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "global_terms_manage_update" ON public."global_terms";
  CREATE POLICY "global_terms_manage_update" ON public."global_terms"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING ((( SELECT users.role
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))) = 'owner'::text))
    WITH CHECK ((( SELECT users.role
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))) = 'owner'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "global_terms_select" ON public."global_terms";
  CREATE POLICY "global_terms_select" ON public."global_terms"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING (true)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."grades";
  CREATE POLICY "optimized_authenticated_access" ON public."grades"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "grading_scale_delete" ON public."grading_scale";
  CREATE POLICY "grading_scale_delete" ON public."grading_scale"
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING (((school_id IS NOT NULL) AND (school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text, 'teacher'::text])))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "grading_scale_insert" ON public."grading_scale";
  CREATE POLICY "grading_scale_insert" ON public."grading_scale"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (((school_id IS NOT NULL) AND (school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text, 'teacher'::text])))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "grading_scale_select" ON public."grading_scale";
  CREATE POLICY "grading_scale_select" ON public."grading_scale"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING (((school_id IS NULL) OR (school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))) OR (school_id IN ( SELECT schools.school_id
   FROM schools
  WHERE (schools.admin_id = ( SELECT auth.uid() AS uid))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "grading_scale_update" ON public."grading_scale";
  CREATE POLICY "grading_scale_update" ON public."grading_scale"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING (((school_id IS NOT NULL) AND (school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text, 'teacher'::text])))))))
    WITH CHECK (((school_id IS NOT NULL) AND (school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text, 'teacher'::text])))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "guild_announcements_school_all" ON public."guild_announcements";
  CREATE POLICY "guild_announcements_school_all" ON public."guild_announcements"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING (true)
    WITH CHECK (true)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "guild_portfolios_school_all" ON public."guild_portfolios";
  CREATE POLICY "guild_portfolios_school_all" ON public."guild_portfolios"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING (true)
    WITH CHECK (true)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "guild_tenures_school_all" ON public."guild_tenures";
  CREATE POLICY "guild_tenures_school_all" ON public."guild_tenures"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING (true)
    WITH CHECK (true)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "guild_transactions_school_all" ON public."guild_transactions";
  CREATE POLICY "guild_transactions_school_all" ON public."guild_transactions"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING (true)
    WITH CHECK (true)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "guild_welfare_reports_school_all" ON public."guild_welfare_reports";
  CREATE POLICY "guild_welfare_reports_school_all" ON public."guild_welfare_reports"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING (true)
    WITH CHECK (true)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."headteacher_comments_settings";
  CREATE POLICY "optimized_authenticated_access" ON public."headteacher_comments_settings"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."headteacher_nursery_comment_settings";
  CREATE POLICY "optimized_authenticated_access" ON public."headteacher_nursery_comment_settings"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "hr_job_applications_unified" ON public."hr_job_applications";
  CREATE POLICY "hr_job_applications_unified" ON public."hr_job_applications"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'owner'::text, 'hr'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "hr_leave_balances_unified" ON public."hr_leave_balances";
  CREATE POLICY "hr_leave_balances_unified" ON public."hr_leave_balances"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'owner'::text, 'hr'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "hr_leave_requests_insert" ON public."hr_leave_requests";
  CREATE POLICY "hr_leave_requests_insert" ON public."hr_leave_requests"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid)))) AND (hr_user_can_manage_hr(school_id) OR ((staff_kind = 'teacher'::text) AND (staff_id = ( SELECT u.linked_teacher_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.linked_teacher_id IS NOT NULL))
 LIMIT 1))) OR ((staff_kind = 'other_staff'::text) AND (EXISTS ( SELECT 1
   FROM other_staff_members o
  WHERE ((o.id = hr_leave_requests.staff_id) AND (o.linked_user_id = ( SELECT auth.uid() AS uid)))))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "hr_leave_requests_select" ON public."hr_leave_requests";
  CREATE POLICY "hr_leave_requests_select" ON public."hr_leave_requests"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING ((hr_user_can_manage_hr(school_id) OR ((staff_kind = 'teacher'::text) AND (staff_id = ( SELECT u.linked_teacher_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1))) OR ((staff_kind = 'other_staff'::text) AND (EXISTS ( SELECT 1
   FROM other_staff_members o
  WHERE ((o.id = hr_leave_requests.staff_id) AND (o.linked_user_id = ( SELECT auth.uid() AS uid))))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "hr_leave_requests_update" ON public."hr_leave_requests";
  CREATE POLICY "hr_leave_requests_update" ON public."hr_leave_requests"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING ((hr_user_can_manage_hr(school_id) OR ((status = 'pending'::text) AND (((staff_kind = 'teacher'::text) AND (staff_id = ( SELECT u.linked_teacher_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1))) OR ((staff_kind = 'other_staff'::text) AND (EXISTS ( SELECT 1
   FROM other_staff_members o
  WHERE ((o.id = hr_leave_requests.staff_id) AND (o.linked_user_id = ( SELECT auth.uid() AS uid))))))))))
    WITH CHECK ((hr_user_can_manage_hr(school_id) OR ((status = ANY (ARRAY['pending'::text, 'cancelled'::text])) AND (((staff_kind = 'teacher'::text) AND (staff_id = ( SELECT u.linked_teacher_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1))) OR ((staff_kind = 'other_staff'::text) AND (EXISTS ( SELECT 1
   FROM other_staff_members o
  WHERE ((o.id = hr_leave_requests.staff_id) AND (o.linked_user_id = ( SELECT auth.uid() AS uid))))))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "hr_leave_types_delete" ON public."hr_leave_types";
  CREATE POLICY "hr_leave_types_delete" ON public."hr_leave_types"
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING (hr_user_can_manage_hr(school_id))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "hr_leave_types_mutate" ON public."hr_leave_types";
  CREATE POLICY "hr_leave_types_mutate" ON public."hr_leave_types"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (hr_user_can_manage_hr(school_id))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "hr_leave_types_school_read" ON public."hr_leave_types";
  CREATE POLICY "hr_leave_types_school_read" ON public."hr_leave_types"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING ((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "hr_leave_types_update" ON public."hr_leave_types";
  CREATE POLICY "hr_leave_types_update" ON public."hr_leave_types"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING (hr_user_can_manage_hr(school_id))
    WITH CHECK (hr_user_can_manage_hr(school_id))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "hr_onboarding_run_tasks_all" ON public."hr_onboarding_run_tasks";
  CREATE POLICY "hr_onboarding_run_tasks_all" ON public."hr_onboarding_run_tasks"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((EXISTS ( SELECT 1
   FROM hr_onboarding_runs r
  WHERE ((r.id = hr_onboarding_run_tasks.run_id) AND hr_user_can_manage_hr(r.school_id)))))
    WITH CHECK ((EXISTS ( SELECT 1
   FROM hr_onboarding_runs r
  WHERE ((r.id = hr_onboarding_run_tasks.run_id) AND hr_user_can_manage_hr(r.school_id)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "hr_onboarding_runs_unified" ON public."hr_onboarding_runs";
  CREATE POLICY "hr_onboarding_runs_unified" ON public."hr_onboarding_runs"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'owner'::text, 'hr'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "hr_onboarding_template_tasks_all" ON public."hr_onboarding_template_tasks";
  CREATE POLICY "hr_onboarding_template_tasks_all" ON public."hr_onboarding_template_tasks"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((EXISTS ( SELECT 1
   FROM hr_onboarding_templates t
  WHERE ((t.id = hr_onboarding_template_tasks.template_id) AND hr_user_can_manage_hr(t.school_id)))))
    WITH CHECK ((EXISTS ( SELECT 1
   FROM hr_onboarding_templates t
  WHERE ((t.id = hr_onboarding_template_tasks.template_id) AND hr_user_can_manage_hr(t.school_id)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "hr_onboarding_templates_unified" ON public."hr_onboarding_templates";
  CREATE POLICY "hr_onboarding_templates_unified" ON public."hr_onboarding_templates"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'owner'::text, 'hr'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "hr_payroll_periods_unified" ON public."hr_payroll_periods";
  CREATE POLICY "hr_payroll_periods_unified" ON public."hr_payroll_periods"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'owner'::text, 'hr'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "hr_payslips_unified" ON public."hr_payslips";
  CREATE POLICY "hr_payslips_unified" ON public."hr_payslips"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'owner'::text, 'hr'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "hr_review_cycles_all" ON public."hr_review_cycles";
  CREATE POLICY "hr_review_cycles_all" ON public."hr_review_cycles"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING (hr_user_can_manage_hr(school_id))
    WITH CHECK (hr_user_can_manage_hr(school_id))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "hr_staff_goals_unified" ON public."hr_staff_goals";
  CREATE POLICY "hr_staff_goals_unified" ON public."hr_staff_goals"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'owner'::text, 'hr'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "hr_staff_reviews_unified" ON public."hr_staff_reviews";
  CREATE POLICY "hr_staff_reviews_unified" ON public."hr_staff_reviews"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'owner'::text, 'hr'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "invoice_sequences_school_users" ON public."invoice_sequences";
  CREATE POLICY "invoice_sequences_school_users" ON public."invoice_sequences"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
    WITH CHECK ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."jobs";
  CREATE POLICY "optimized_authenticated_access" ON public."jobs"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "lesson_logs_select" ON public."lesson_logs";
  CREATE POLICY "lesson_logs_select" ON public."lesson_logs"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = lesson_logs.school_id) AND ((u.role = ANY (ARRAY['admin'::text, 'head_teacher'::text, 'dos'::text])) OR (lesson_logs.teacher_id = ( SELECT t.teacher_id
           FROM teachers t
          WHERE ((t.school_id = u.school_id) AND (t.email = u.email))
         LIMIT 1)))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "library_delete" ON public."library";
  CREATE POLICY "library_delete" ON public."library"
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = ANY (ARRAY['librarian'::text, 'admin'::text, 'owner'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "library_insert" ON public."library";
  CREATE POLICY "library_insert" ON public."library"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = ANY (ARRAY['librarian'::text, 'admin'::text, 'owner'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "library_select" ON public."library";
  CREATE POLICY "library_select" ON public."library"
    AS PERMISSIVE
    FOR SELECT
    TO {public}
    USING (true)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "library_update" ON public."library";
  CREATE POLICY "library_update" ON public."library"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = ANY (ARRAY['librarian'::text, 'admin'::text, 'owner'::text]))))))
    WITH CHECK ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = ANY (ARRAY['librarian'::text, 'admin'::text, 'owner'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."library_book_copies";
  CREATE POLICY "optimized_authenticated_access" ON public."library_book_copies"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."library_books";
  CREATE POLICY "optimized_authenticated_access" ON public."library_books"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."library_borrows";
  CREATE POLICY "optimized_authenticated_access" ON public."library_borrows"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."library_fines";
  CREATE POLICY "optimized_authenticated_access" ON public."library_fines"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."library_reservations";
  CREATE POLICY "optimized_authenticated_access" ON public."library_reservations"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can only see their own login activities" ON public."login_activities";
  CREATE POLICY "Users can only see their own login activities" ON public."login_activities"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.uid() AS uid) = user_id))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."logs";
  CREATE POLICY "optimized_authenticated_access" ON public."logs"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "messages_user_send" ON public."messages";
  CREATE POLICY "messages_user_send" ON public."messages"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (((sender_id = ( SELECT auth.uid() AS uid)) OR ((sender_type = 'admin'::text) AND (sender_id IN ( SELECT users.user_id
   FROM users
  WHERE ((users.role = 'admin'::text) AND (users.school_id IN ( SELECT users_1.school_id
           FROM users users_1
          WHERE (users_1.user_id = ( SELECT auth.uid() AS uid))))))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "messages_user_update" ON public."messages";
  CREATE POLICY "messages_user_update" ON public."messages"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING ((recipient_id = ( SELECT auth.uid() AS uid)))
    WITH CHECK ((recipient_id = ( SELECT auth.uid() AS uid)))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "messages_user_view" ON public."messages";
  CREATE POLICY "messages_user_view" ON public."messages"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING (((recipient_id = ( SELECT auth.uid() AS uid)) OR (sender_id = ( SELECT auth.uid() AS uid)) OR ((recipient_type = 'teacher'::text) AND (recipient_id IN ( SELECT teachers.teacher_id
   FROM teachers
  WHERE (teachers.school_id IN ( SELECT users.school_id
           FROM users
          WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."notification_logs";
  CREATE POLICY "optimized_authenticated_access" ON public."notification_logs"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."notification_templates";
  CREATE POLICY "optimized_authenticated_access" ON public."notification_templates"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "notifications_insert_authenticated" ON public."notifications";
  CREATE POLICY "notifications_insert_authenticated" ON public."notifications"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (((school_id IS NULL) OR (school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "notifications_select_authenticated" ON public."notifications";
  CREATE POLICY "notifications_select_authenticated" ON public."notifications"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING (((user_id = ( SELECT auth.uid() AS uid)) OR ((school_id IS NOT NULL) AND (school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "notifications_user_update" ON public."notifications";
  CREATE POLICY "notifications_user_update" ON public."notifications"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING ((user_id = ( SELECT auth.uid() AS uid)))
    WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "nursery_auto_comments_select" ON public."nursery_auto_comments";
  CREATE POLICY "nursery_auto_comments_select" ON public."nursery_auto_comments"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING (true)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "nursery_detailed_obs_school_rw" ON public."nursery_detailed_observation_items";
  CREATE POLICY "nursery_detailed_obs_school_rw" ON public."nursery_detailed_observation_items"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))))
    WITH CHECK ((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."old_students";
  CREATE POLICY "optimized_authenticated_access" ON public."old_students"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "other_staff_manage_delete" ON public."other_staff_members";
  CREATE POLICY "other_staff_manage_delete" ON public."other_staff_members"
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING ((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "other_staff_manage_insert" ON public."other_staff_members";
  CREATE POLICY "other_staff_manage_insert" ON public."other_staff_members"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK ((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text, 'secretary'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "other_staff_manage_update" ON public."other_staff_members";
  CREATE POLICY "other_staff_manage_update" ON public."other_staff_members"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING ((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text]))))))
    WITH CHECK ((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "other_staff_select_accountant" ON public."other_staff_members";
  CREATE POLICY "other_staff_select_accountant" ON public."other_staff_members"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING ((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['accountant'::text, 'admin'::text, 'owner'::text, 'head_teacher'::text, 'secretary'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "owner_revenue_access" ON public."owner_revenue_trend_metrics";
  CREATE POLICY "owner_revenue_access" ON public."owner_revenue_trend_metrics"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((( SELECT auth.uid() AS uid) IN ( SELECT user_school_permissions.user_id
   FROM user_school_permissions
  WHERE (user_school_permissions.permission_key = 'owner'::text))))
    WITH CHECK ((( SELECT auth.uid() AS uid) IN ( SELECT user_school_permissions.user_id
   FROM user_school_permissions
  WHERE (user_school_permissions.permission_key = 'owner'::text))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "owner_school_access" ON public."owner_school_growth_metrics";
  CREATE POLICY "owner_school_access" ON public."owner_school_growth_metrics"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((( SELECT auth.uid() AS uid) IN ( SELECT user_school_permissions.user_id
   FROM user_school_permissions
  WHERE (user_school_permissions.permission_key = 'owner'::text))))
    WITH CHECK ((( SELECT auth.uid() AS uid) IN ( SELECT user_school_permissions.user_id
   FROM user_school_permissions
  WHERE (user_school_permissions.permission_key = 'owner'::text))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "owner_user_access" ON public."owner_user_growth_metrics";
  CREATE POLICY "owner_user_access" ON public."owner_user_growth_metrics"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((( SELECT auth.uid() AS uid) IN ( SELECT user_school_permissions.user_id
   FROM user_school_permissions
  WHERE (user_school_permissions.permission_key = 'owner'::text))))
    WITH CHECK ((( SELECT auth.uid() AS uid) IN ( SELECT user_school_permissions.user_id
   FROM user_school_permissions
  WHERE (user_school_permissions.permission_key = 'owner'::text))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "parents_authenticated_select" ON public."parents";
  CREATE POLICY "parents_authenticated_select" ON public."parents"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING ((((school_id = current_user_school_id()) AND (EXISTS ( SELECT 1
   FROM user_school_permissions perm
  WHERE ((perm.user_id = ( SELECT auth.uid() AS uid)) AND (perm.school_id = parents.school_id) AND (perm.permission_key = 'accounting.full'::text))))) OR (school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))) OR (school_id IN ( SELECT s.school_id
   FROM schools s
  WHERE (s.admin_id = ( SELECT auth.uid() AS uid)))) OR (parent_id = ( SELECT auth.uid() AS uid)) OR ((school_id IS NOT NULL) AND (email IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL) AND (u.school_id = parents.school_id) AND (u.email IS NOT NULL) AND (lower(TRIM(BOTH FROM u.email)) = lower(TRIM(BOTH FROM parents.email)))))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "parents_school_staff_delete" ON public."parents";
  CREATE POLICY "parents_school_staff_delete" ON public."parents"
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING ((((school_id = current_user_school_id()) AND (EXISTS ( SELECT 1
   FROM user_school_permissions perm
  WHERE ((perm.user_id = ( SELECT auth.uid() AS uid)) AND (perm.school_id = parents.school_id) AND (perm.permission_key = 'accounting.full'::text))))) OR (school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))) OR (school_id IN ( SELECT s.school_id
   FROM schools s
  WHERE (s.admin_id = ( SELECT auth.uid() AS uid))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "parents_school_staff_insert" ON public."parents";
  CREATE POLICY "parents_school_staff_insert" ON public."parents"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK ((((school_id = current_user_school_id()) AND (EXISTS ( SELECT 1
   FROM user_school_permissions perm
  WHERE ((perm.user_id = ( SELECT auth.uid() AS uid)) AND (perm.school_id = perm.school_id) AND (perm.permission_key = 'accounting.full'::text))))) OR (school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))) OR (school_id IN ( SELECT s.school_id
   FROM schools s
  WHERE (s.admin_id = ( SELECT auth.uid() AS uid))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "parents_school_staff_update" ON public."parents";
  CREATE POLICY "parents_school_staff_update" ON public."parents"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING ((((school_id = current_user_school_id()) AND (EXISTS ( SELECT 1
   FROM user_school_permissions perm
  WHERE ((perm.user_id = ( SELECT auth.uid() AS uid)) AND (perm.school_id = parents.school_id) AND (perm.permission_key = 'accounting.full'::text))))) OR (school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))) OR (school_id IN ( SELECT s.school_id
   FROM schools s
  WHERE (s.admin_id = ( SELECT auth.uid() AS uid))))))
    WITH CHECK ((((school_id = current_user_school_id()) AND (EXISTS ( SELECT 1
   FROM user_school_permissions perm
  WHERE ((perm.user_id = ( SELECT auth.uid() AS uid)) AND (perm.school_id = parents.school_id) AND (perm.permission_key = 'accounting.full'::text))))) OR (school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))) OR (school_id IN ( SELECT s.school_id
   FROM schools s
  WHERE (s.admin_id = ( SELECT auth.uid() AS uid))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."payments";
  CREATE POLICY "optimized_authenticated_access" ON public."payments"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "pdf_render_sessions_insert_own_school" ON public."pdf_render_sessions";
  CREATE POLICY "pdf_render_sessions_insert_own_school" ON public."pdf_render_sessions"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK ((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "pdf_render_sessions_select_own_school" ON public."pdf_render_sessions";
  CREATE POLICY "pdf_render_sessions_select_own_school" ON public."pdf_render_sessions"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING ((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "period_locks_school_users" ON public."period_locks";
  CREATE POLICY "period_locks_school_users" ON public."period_locks"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
    WITH CHECK ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "server_only_no_direct_client_access" ON public."phone_reset_codes";
  CREATE POLICY "server_only_no_direct_client_access" ON public."phone_reset_codes"
    AS RESTRICTIVE
    FOR ALL
    TO {authenticated}
    USING (false)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "authenticated_select" ON public."platform_config";
  CREATE POLICY "authenticated_select" ON public."platform_config"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING (true)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "owner_delete" ON public."platform_config";
  CREATE POLICY "owner_delete" ON public."platform_config"
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING ((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'role'::text) = 'owner'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "owner_insert" ON public."platform_config";
  CREATE POLICY "owner_insert" ON public."platform_config"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK ((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'role'::text) = 'owner'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "owner_update" ON public."platform_config";
  CREATE POLICY "owner_update" ON public."platform_config"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING ((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'role'::text) = 'owner'::text))
    WITH CHECK ((((( SELECT auth.jwt() AS jwt) -> 'app_metadata'::text) ->> 'role'::text) = 'owner'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "public_read" ON public."platform_config";
  CREATE POLICY "public_read" ON public."platform_config"
    AS PERMISSIVE
    FOR SELECT
    TO {anon}
    USING (true)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "pre_primary_ratings_school_rw" ON public."pre_primary_holistic_rating_levels";
  CREATE POLICY "pre_primary_ratings_school_rw" ON public."pre_primary_holistic_rating_levels"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))))
    WITH CHECK ((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "pre_primary_skills_school_rw" ON public."pre_primary_holistic_skills";
  CREATE POLICY "pre_primary_skills_school_rw" ON public."pre_primary_holistic_skills"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))))
    WITH CHECK ((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "pre_primary_strands_school_rw" ON public."pre_primary_holistic_strands";
  CREATE POLICY "pre_primary_strands_school_rw" ON public."pre_primary_holistic_strands"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))))
    WITH CHECK ((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "processed_primary_exam_results_school_scoped" ON public."processed_primary_exam_results";
  CREATE POLICY "processed_primary_exam_results_school_scoped" ON public."processed_primary_exam_results"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING (((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))) OR (school_id IN ( SELECT schools.school_id
   FROM schools
  WHERE (schools.admin_id = ( SELECT auth.uid() AS uid)))) OR (school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = 'admin'::text))))))
    WITH CHECK (((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))) OR (school_id IN ( SELECT schools.school_id
   FROM schools
  WHERE (schools.admin_id = ( SELECT auth.uid() AS uid)))) OR (school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = 'admin'::text))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."processed_secondary_exam_results";
  CREATE POLICY "optimized_authenticated_access" ON public."processed_secondary_exam_results"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users and admins can update profiles" ON public."profiles";
  CREATE POLICY "Users and admins can update profiles" ON public."profiles"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING (((id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text])))))))
    WITH CHECK (((id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text])))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users and admins can view profiles" ON public."profiles";
  CREATE POLICY "Users and admins can view profiles" ON public."profiles"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING (((id = ( SELECT auth.uid() AS uid)) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text])))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "published_class_report_bundles_staff_all" ON public."published_class_report_bundles";
  CREATE POLICY "published_class_report_bundles_staff_all" ON public."published_class_report_bundles"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING (published_reports_user_is_school_staff(school_id))
    WITH CHECK (published_reports_user_is_school_staff(school_id))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "published_student_reports_delete_school_staff" ON public."published_student_reports";
  CREATE POLICY "published_student_reports_delete_school_staff" ON public."published_student_reports"
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING (published_reports_user_is_school_staff(school_id))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "published_student_reports_insert_school_staff" ON public."published_student_reports";
  CREATE POLICY "published_student_reports_insert_school_staff" ON public."published_student_reports"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (published_reports_user_is_school_staff(school_id))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "published_student_reports_select_consolidated" ON public."published_student_reports";
  CREATE POLICY "published_student_reports_select_consolidated" ON public."published_student_reports"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING (((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'owner'::text, 'teacher'::text]))))) OR (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = published_student_reports.school_id) AND (lower(TRIM(BOTH FROM u.role)) = ANY (ARRAY['admin'::text, 'owner'::text, 'teacher'::text, 'head_teacher'::text, 'accountant'::text, 'librarian'::text, 'lab_technician'::text, 'clinician'::text]))))) OR (EXISTS ( SELECT 1
   FROM parents p
  WHERE ((p.parent_id = ( SELECT auth.uid() AS uid)) AND (p.student_id = published_student_reports.student_id) AND (p.school_id = published_student_reports.school_id))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "published_student_reports_update_school_staff" ON public."published_student_reports";
  CREATE POLICY "published_student_reports_update_school_staff" ON public."published_student_reports"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING (published_reports_user_is_school_staff(school_id))
    WITH CHECK (published_reports_user_is_school_staff(school_id))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "receipt_sequences_school_users" ON public."receipt_sequences";
  CREATE POLICY "receipt_sequences_school_users" ON public."receipt_sequences"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
    WITH CHECK ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "receipt_sequences_per_term_school_users" ON public."receipt_sequences_per_term";
  CREATE POLICY "receipt_sequences_per_term_school_users" ON public."receipt_sequences_per_term"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
    WITH CHECK ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."receipts";
  CREATE POLICY "optimized_authenticated_access" ON public."receipts"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "receivable_status_school_users" ON public."receivable_status";
  CREATE POLICY "receivable_status_school_users" ON public."receivable_status"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
    WITH CHECK ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Allow authenticated users to read referral codes" ON public."referral_codes";
  CREATE POLICY "Allow authenticated users to read referral codes" ON public."referral_codes"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING (true)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Owners can delete referral codes" ON public."referral_codes";
  CREATE POLICY "Owners can delete referral codes" ON public."referral_codes"
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = 'owner'::text)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Owners can insert referral codes" ON public."referral_codes";
  CREATE POLICY "Owners can insert referral codes" ON public."referral_codes"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = 'owner'::text)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Owners can update referral codes" ON public."referral_codes";
  CREATE POLICY "Owners can update referral codes" ON public."referral_codes"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = 'owner'::text)))))
    WITH CHECK ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = 'owner'::text)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."report_comments";
  CREATE POLICY "optimized_authenticated_access" ON public."report_comments"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "report_pdf_cache_school_access" ON public."report_pdf_cache";
  CREATE POLICY "report_pdf_cache_school_access" ON public."report_pdf_cache"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((school_id = ( SELECT u.school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)))
    WITH CHECK ((school_id = ( SELECT u.school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "System can insert snapshot data" ON public."report_snapshot_data";
  CREATE POLICY "System can insert snapshot data" ON public."report_snapshot_data"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK ((snapshot_id IN ( SELECT report_snapshots.id
   FROM report_snapshots
  WHERE ((report_snapshots.school_id IN ( SELECT users.school_id
           FROM users
          WHERE (users.user_id = ( SELECT auth.uid() AS uid)))) OR (report_snapshots.school_id IN ( SELECT schools.school_id
           FROM schools
          WHERE (schools.admin_id = ( SELECT auth.uid() AS uid)))) OR (report_snapshots.school_id IN ( SELECT users.school_id
           FROM users
          WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = 'admin'::text))))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can view snapshot data for their school" ON public."report_snapshot_data";
  CREATE POLICY "Users can view snapshot data for their school" ON public."report_snapshot_data"
    AS PERMISSIVE
    FOR SELECT
    TO {public}
    USING ((snapshot_id IN ( SELECT report_snapshots.id
   FROM report_snapshots
  WHERE (report_snapshots.school_id IN ( SELECT users.school_id
           FROM users
          WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can create snapshots for their school" ON public."report_snapshots";
  CREATE POLICY "Admins can create snapshots for their school" ON public."report_snapshots"
    AS PERMISSIVE
    FOR INSERT
    TO {public}
    WITH CHECK ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = 'admin'::text)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can update snapshots for their school" ON public."report_snapshots";
  CREATE POLICY "Admins can update snapshots for their school" ON public."report_snapshots"
    AS PERMISSIVE
    FOR UPDATE
    TO {public}
    USING ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = 'admin'::text)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "report_snapshots_select_authenticated" ON public."report_snapshots";
  CREATE POLICY "report_snapshots_select_authenticated" ON public."report_snapshots"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = report_snapshots.school_id) AND (lower(TRIM(BOTH FROM u.role)) = ANY (ARRAY['admin'::text, 'accountant'::text, 'teacher'::text, 'head_teacher'::text, 'owner'::text, 'librarian'::text, 'lab_technician'::text, 'clinician'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."report_templates";
  CREATE POLICY "optimized_authenticated_access" ON public."report_templates"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."report_title_settings";
  CREATE POLICY "optimized_authenticated_access" ON public."report_title_settings"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."reports";
  CREATE POLICY "optimized_authenticated_access" ON public."reports"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "rollover_status_access" ON public."rollover_status";
  CREATE POLICY "rollover_status_access" ON public."rollover_status"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING (((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))) OR (school_id IN ( SELECT schools.school_id
   FROM schools
  WHERE (schools.admin_id = ( SELECT auth.uid() AS uid)))) OR (school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = 'admin'::text))))))
    WITH CHECK (((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))) OR (school_id IN ( SELECT schools.school_id
   FROM schools
  WHERE (schools.admin_id = ( SELECT auth.uid() AS uid)))) OR (school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = 'admin'::text))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "sow_delete" ON public."scheme_of_work";
  CREATE POLICY "sow_delete" ON public."scheme_of_work"
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "sow_insert" ON public."scheme_of_work";
  CREATE POLICY "sow_insert" ON public."scheme_of_work"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "sow_select" ON public."scheme_of_work";
  CREATE POLICY "sow_select" ON public."scheme_of_work"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "sow_update" ON public."scheme_of_work";
  CREATE POLICY "sow_update" ON public."scheme_of_work"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
    WITH CHECK ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "sow_entries_delete" ON public."scheme_of_work_entries";
  CREATE POLICY "sow_entries_delete" ON public."scheme_of_work_entries"
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING ((scheme_id IN ( SELECT scheme_of_work.id
   FROM scheme_of_work
  WHERE (scheme_of_work.school_id IN ( SELECT users.school_id
           FROM users
          WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "sow_entries_insert" ON public."scheme_of_work_entries";
  CREATE POLICY "sow_entries_insert" ON public."scheme_of_work_entries"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK ((scheme_id IN ( SELECT scheme_of_work.id
   FROM scheme_of_work
  WHERE (scheme_of_work.school_id IN ( SELECT users.school_id
           FROM users
          WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "sow_entries_select" ON public."scheme_of_work_entries";
  CREATE POLICY "sow_entries_select" ON public."scheme_of_work_entries"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING ((scheme_id IN ( SELECT scheme_of_work.id
   FROM scheme_of_work
  WHERE (scheme_of_work.school_id IN ( SELECT users.school_id
           FROM users
          WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "sow_entries_update" ON public."scheme_of_work_entries";
  CREATE POLICY "sow_entries_update" ON public."scheme_of_work_entries"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING ((scheme_id IN ( SELECT scheme_of_work.id
   FROM scheme_of_work
  WHERE (scheme_of_work.school_id IN ( SELECT users.school_id
           FROM users
          WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))))
    WITH CHECK ((scheme_id IN ( SELECT scheme_of_work.id
   FROM scheme_of_work
  WHERE (scheme_of_work.school_id IN ( SELECT users.school_id
           FROM users
          WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_chat_conversations_insert_dm" ON public."school_chat_conversations";
  CREATE POLICY "school_chat_conversations_insert_dm" ON public."school_chat_conversations"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (((school_id = ( SELECT u.school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)) AND (dm_key IS NOT NULL) AND ((dm_key ~~ (( SELECT (auth.uid())::text AS uid) || ':%'::text)) OR (dm_key ~~ ('%:'::text || ( SELECT (auth.uid())::text AS uid))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_chat_conversations_select" ON public."school_chat_conversations";
  CREATE POLICY "school_chat_conversations_select" ON public."school_chat_conversations"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING (((EXISTS ( SELECT 1
   FROM school_chat_participants p
  WHERE ((p.conversation_id = school_chat_conversations.id) AND (p.user_id = ( SELECT auth.uid() AS uid))))) OR ((dm_key IS NOT NULL) AND ((dm_key ~~ (( SELECT (auth.uid())::text AS uid) || ':%'::text)) OR (dm_key ~~ ('%:'::text || ( SELECT (auth.uid())::text AS uid)))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_chat_messages_insert_participant" ON public."school_chat_messages";
  CREATE POLICY "school_chat_messages_insert_participant" ON public."school_chat_messages"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (((sender_id = ( SELECT auth.uid() AS uid)) AND (EXISTS ( SELECT 1
   FROM school_chat_participants p
  WHERE ((p.conversation_id = school_chat_messages.conversation_id) AND (p.user_id = ( SELECT auth.uid() AS uid))))) AND school_chat_pair_allowed(( SELECT auth.uid() AS uid), ( SELECT p2.user_id
   FROM school_chat_participants p2
  WHERE ((p2.conversation_id = school_chat_messages.conversation_id) AND (p2.user_id <> ( SELECT auth.uid() AS uid)))
 LIMIT 1))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_chat_messages_select_participant" ON public."school_chat_messages";
  CREATE POLICY "school_chat_messages_select_participant" ON public."school_chat_messages"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING ((EXISTS ( SELECT 1
   FROM school_chat_participants p
  WHERE ((p.conversation_id = school_chat_messages.conversation_id) AND (p.user_id = ( SELECT auth.uid() AS uid))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_chat_messages_update_delivered" ON public."school_chat_messages";
  CREATE POLICY "school_chat_messages_update_delivered" ON public."school_chat_messages"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING (((sender_id IS DISTINCT FROM ( SELECT auth.uid() AS uid)) AND (delivered_at IS NULL) AND (EXISTS ( SELECT 1
   FROM school_chat_participants p
  WHERE ((p.conversation_id = school_chat_messages.conversation_id) AND (p.user_id = ( SELECT auth.uid() AS uid)))))))
    WITH CHECK (((sender_id IS DISTINCT FROM ( SELECT auth.uid() AS uid)) AND (delivered_at IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM school_chat_participants p
  WHERE ((p.conversation_id = school_chat_messages.conversation_id) AND (p.user_id = ( SELECT auth.uid() AS uid)))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_chat_participants_insert_dm_pair" ON public."school_chat_participants";
  CREATE POLICY "school_chat_participants_insert_dm_pair" ON public."school_chat_participants"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (((school_id = ( SELECT u.school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)) AND (EXISTS ( SELECT 1
   FROM school_chat_conversations c
  WHERE ((c.id = school_chat_participants.conversation_id) AND (c.school_id = ( SELECT u2.school_id
           FROM users u2
          WHERE (u2.user_id = ( SELECT auth.uid() AS uid))
         LIMIT 1)) AND (c.dm_key =
        CASE
            WHEN (( SELECT (auth.uid())::text AS uid) < (school_chat_participants.user_id)::text) THEN ((( SELECT (auth.uid())::text AS uid) || ':'::text) || (school_chat_participants.user_id)::text)
            ELSE (((school_chat_participants.user_id)::text || ':'::text) || ( SELECT (auth.uid())::text AS uid))
        END))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_chat_participants_select_authenticated" ON public."school_chat_participants";
  CREATE POLICY "school_chat_participants_select_authenticated" ON public."school_chat_participants"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING (((user_id = ( SELECT auth.uid() AS uid)) OR private.school_chat_user_is_participant(conversation_id, ( SELECT auth.uid() AS uid))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_chat_participants_update_read" ON public."school_chat_participants";
  CREATE POLICY "school_chat_participants_update_read" ON public."school_chat_participants"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING ((user_id = ( SELECT auth.uid() AS uid)))
    WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_chat_presence_insert_own" ON public."school_chat_presence";
  CREATE POLICY "school_chat_presence_insert_own" ON public."school_chat_presence"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (((user_id = ( SELECT auth.uid() AS uid)) AND (school_id = ( SELECT u.school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_chat_presence_select_school" ON public."school_chat_presence";
  CREATE POLICY "school_chat_presence_select_school" ON public."school_chat_presence"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING ((school_id = ( SELECT u.school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_chat_presence_update_own" ON public."school_chat_presence";
  CREATE POLICY "school_chat_presence_update_own" ON public."school_chat_presence"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING ((user_id = ( SELECT auth.uid() AS uid)))
    WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "scuace_bands_delete" ON public."school_class_uace_grade_bands";
  CREATE POLICY "scuace_bands_delete" ON public."school_class_uace_grade_bands"
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING (((school_id = ( SELECT u.school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)) AND ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = school_class_uace_grade_bands.school_id) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text]))))) OR (EXISTS ( SELECT 1
   FROM ((teacher_class_subjects tcs
     JOIN users u ON (((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = tcs.school_id))))
     JOIN teachers t ON (((t.teacher_id = tcs.teacher_id) AND (t.school_id = tcs.school_id))))
  WHERE ((tcs.school_id = school_class_uace_grade_bands.school_id) AND (TRIM(BOTH FROM tcs.class_name) = TRIM(BOTH FROM school_class_uace_grade_bands.class_name)) AND (((u.linked_teacher_id IS NOT NULL) AND (u.linked_teacher_id = tcs.teacher_id)) OR ((t.email IS NOT NULL) AND (TRIM(BOTH FROM t.email) <> ''::text) AND (lower(TRIM(BOTH FROM t.email)) = lower(TRIM(BOTH FROM COALESCE(NULLIF(TRIM(BOTH FROM u.email), ''::text), NULLIF(TRIM(BOTH FROM COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text)), ''::text), ''::text))))))))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "scuace_bands_insert" ON public."school_class_uace_grade_bands";
  CREATE POLICY "scuace_bands_insert" ON public."school_class_uace_grade_bands"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (((school_id = ( SELECT u.school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)) AND ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = school_class_uace_grade_bands.school_id) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text]))))) OR (EXISTS ( SELECT 1
   FROM ((teacher_class_subjects tcs
     JOIN users u ON (((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = tcs.school_id))))
     JOIN teachers t ON (((t.teacher_id = tcs.teacher_id) AND (t.school_id = tcs.school_id))))
  WHERE ((tcs.school_id = school_class_uace_grade_bands.school_id) AND (TRIM(BOTH FROM tcs.class_name) = TRIM(BOTH FROM school_class_uace_grade_bands.class_name)) AND (((u.linked_teacher_id IS NOT NULL) AND (u.linked_teacher_id = tcs.teacher_id)) OR ((t.email IS NOT NULL) AND (TRIM(BOTH FROM t.email) <> ''::text) AND (lower(TRIM(BOTH FROM t.email)) = lower(TRIM(BOTH FROM COALESCE(NULLIF(TRIM(BOTH FROM u.email), ''::text), NULLIF(TRIM(BOTH FROM COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text)), ''::text), ''::text))))))))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "scuace_bands_select" ON public."school_class_uace_grade_bands";
  CREATE POLICY "scuace_bands_select" ON public."school_class_uace_grade_bands"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING ((school_id = ( SELECT u.school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "scuace_bands_update" ON public."school_class_uace_grade_bands";
  CREATE POLICY "scuace_bands_update" ON public."school_class_uace_grade_bands"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING (((school_id = ( SELECT u.school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)) AND ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = school_class_uace_grade_bands.school_id) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text]))))) OR (EXISTS ( SELECT 1
   FROM ((teacher_class_subjects tcs
     JOIN users u ON (((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = tcs.school_id))))
     JOIN teachers t ON (((t.teacher_id = tcs.teacher_id) AND (t.school_id = tcs.school_id))))
  WHERE ((tcs.school_id = school_class_uace_grade_bands.school_id) AND (TRIM(BOTH FROM tcs.class_name) = TRIM(BOTH FROM school_class_uace_grade_bands.class_name)) AND (((u.linked_teacher_id IS NOT NULL) AND (u.linked_teacher_id = tcs.teacher_id)) OR ((t.email IS NOT NULL) AND (TRIM(BOTH FROM t.email) <> ''::text) AND (lower(TRIM(BOTH FROM t.email)) = lower(TRIM(BOTH FROM COALESCE(NULLIF(TRIM(BOTH FROM u.email), ''::text), NULLIF(TRIM(BOTH FROM COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text)), ''::text), ''::text))))))))))))
    WITH CHECK (((school_id = ( SELECT u.school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)) AND ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = school_class_uace_grade_bands.school_id) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text]))))) OR (EXISTS ( SELECT 1
   FROM ((teacher_class_subjects tcs
     JOIN users u ON (((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = tcs.school_id))))
     JOIN teachers t ON (((t.teacher_id = tcs.teacher_id) AND (t.school_id = tcs.school_id))))
  WHERE ((tcs.school_id = school_class_uace_grade_bands.school_id) AND (TRIM(BOTH FROM tcs.class_name) = TRIM(BOTH FROM school_class_uace_grade_bands.class_name)) AND (((u.linked_teacher_id IS NOT NULL) AND (u.linked_teacher_id = tcs.teacher_id)) OR ((t.email IS NOT NULL) AND (TRIM(BOTH FROM t.email) <> ''::text) AND (lower(TRIM(BOTH FROM t.email)) = lower(TRIM(BOTH FROM COALESCE(NULLIF(TRIM(BOTH FROM u.email), ''::text), NULLIF(TRIM(BOTH FROM COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text)), ''::text), ''::text))))))))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_admin_delete_events" ON public."school_events";
  CREATE POLICY "school_admin_delete_events" ON public."school_events"
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text, 'headteacher'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_admin_update_events" ON public."school_events";
  CREATE POLICY "school_admin_update_events" ON public."school_events"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text, 'headteacher'::text]))))))
    WITH CHECK ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text, 'headteacher'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_admin_write_events" ON public."school_events";
  CREATE POLICY "school_admin_write_events" ON public."school_events"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text, 'headteacher'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_members_read_events" ON public."school_events";
  CREATE POLICY "school_members_read_events" ON public."school_events"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_expenses_authenticated" ON public."school_expenses";
  CREATE POLICY "school_expenses_authenticated" ON public."school_expenses"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((((school_id = current_user_school_id()) AND (EXISTS ( SELECT 1
   FROM user_school_permissions p
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND (p.school_id = school_expenses.school_id) AND (p.permission_key = 'accounting.full'::text))))) OR (school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))) OR (school_id IN ( SELECT s.school_id
   FROM schools s
  WHERE (s.admin_id = ( SELECT auth.uid() AS uid))))))
    WITH CHECK ((((school_id = current_user_school_id()) AND (EXISTS ( SELECT 1
   FROM user_school_permissions p
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND (p.school_id = school_expenses.school_id) AND (p.permission_key = 'accounting.full'::text))))) OR (school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))) OR (school_id IN ( SELECT s.school_id
   FROM schools s
  WHERE (s.admin_id = ( SELECT auth.uid() AS uid))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."school_fee_structure";
  CREATE POLICY "optimized_authenticated_access" ON public."school_fee_structure"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."school_report_customizations";
  CREATE POLICY "optimized_authenticated_access" ON public."school_report_customizations"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Only admins and owners can see school requests" ON public."school_requests";
  CREATE POLICY "Only admins and owners can see school requests" ON public."school_requests"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((EXISTS ( SELECT 1
   FROM profiles
  WHERE ((profiles.id = ( SELECT auth.uid() AS uid)) AND (profiles.role = ANY (ARRAY['admin'::text, 'owner'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."school_requirements";
  CREATE POLICY "optimized_authenticated_access" ON public."school_requirements"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_subscriptions_unified_access" ON public."school_subscriptions";
  CREATE POLICY "school_subscriptions_unified_access" ON public."school_subscriptions"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING (((( SELECT users.role
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))) = 'owner'::text) OR ((( SELECT users.role
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))) = 'admin'::text) AND (school_id IN ( SELECT schools.school_id
   FROM schools
  WHERE (schools.admin_id = ( SELECT auth.uid() AS uid)))))))
    WITH CHECK (((( SELECT users.role
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))) = 'owner'::text) OR ((( SELECT users.role
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))) = 'admin'::text) AND (school_id IN ( SELECT schools.school_id
   FROM schools
  WHERE (schools.admin_id = ( SELECT auth.uid() AS uid)))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."school_terms";
  CREATE POLICY "optimized_authenticated_access" ON public."school_terms"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_uace_papers_authenticated_all" ON public."school_uace_class_subject_papers";
  CREATE POLICY "school_uace_papers_authenticated_all" ON public."school_uace_class_subject_papers"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid)))))
    WITH CHECK ((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "schoolpay_ingested_events_deny_anon_authenticated" ON public."schoolpay_ingested_events";
  CREATE POLICY "schoolpay_ingested_events_deny_anon_authenticated" ON public."schoolpay_ingested_events"
    AS PERMISSIVE
    FOR ALL
    TO {anon,authenticated}
    USING (false)
    WITH CHECK (false)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "schoolpay_school_settings_deny_anon_authenticated" ON public."schoolpay_school_settings";
  CREATE POLICY "schoolpay_school_settings_deny_anon_authenticated" ON public."schoolpay_school_settings"
    AS PERMISSIVE
    FOR ALL
    TO {anon,authenticated}
    USING (false)
    WITH CHECK (false)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "schools_unified" ON public."schools";
  CREATE POLICY "schools_unified" ON public."schools"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING (((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))) OR (admin_id = ( SELECT auth.uid() AS uid)) OR (( SELECT users.role
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))) = 'owner'::text)))
    WITH CHECK (((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))) OR (admin_id = ( SELECT auth.uid() AS uid)) OR (( SELECT users.role
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))) = 'owner'::text)))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "student_alevel_subjects_delete" ON public."student_alevel_subjects";
  CREATE POLICY "student_alevel_subjects_delete" ON public."student_alevel_subjects"
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING (((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid)))) AND current_user_can_edit_student_uace_subjects()))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "student_alevel_subjects_insert" ON public."student_alevel_subjects";
  CREATE POLICY "student_alevel_subjects_insert" ON public."student_alevel_subjects"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid)))) AND current_user_can_edit_student_uace_subjects()))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "student_alevel_subjects_select_school" ON public."student_alevel_subjects";
  CREATE POLICY "student_alevel_subjects_select_school" ON public."student_alevel_subjects"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING ((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "student_alevel_subjects_update" ON public."student_alevel_subjects";
  CREATE POLICY "student_alevel_subjects_update" ON public."student_alevel_subjects"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING (((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid)))) AND current_user_can_edit_student_uace_subjects()))
    WITH CHECK (((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid)))) AND current_user_can_edit_student_uace_subjects()))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "student_attendance_school_and_teacher" ON public."student_attendance";
  CREATE POLICY "student_attendance_school_and_teacher" ON public."student_attendance"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING (((school_id IN ( SELECT schools.school_id
   FROM schools
  WHERE (schools.admin_id = ( SELECT auth.uid() AS uid)))) OR ((( SELECT users.role
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1) = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text])) AND (school_id = ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1))) OR ((( SELECT users.role
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1) = 'teacher'::text) AND (school_id = ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)) AND (class_name IN ( SELECT class_teachers.class_name
   FROM class_teachers
  WHERE ((class_teachers.school_id = ( SELECT users.school_id
           FROM users
          WHERE (users.user_id = ( SELECT auth.uid() AS uid))
         LIMIT 1)) AND (class_teachers.teacher_id IN ( SELECT t.teacher_id
           FROM teachers t
          WHERE ((t.school_id = ( SELECT users.school_id
                   FROM users
                  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
                 LIMIT 1)) AND (lower(TRIM(BOTH FROM t.email)) = lower(TRIM(BOTH FROM ( SELECT users.email
                   FROM users
                  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
                 LIMIT 1))))))))
UNION
 SELECT teacher_class_subjects.class_name
   FROM teacher_class_subjects
  WHERE ((teacher_class_subjects.school_id = ( SELECT users.school_id
           FROM users
          WHERE (users.user_id = ( SELECT auth.uid() AS uid))
         LIMIT 1)) AND (teacher_class_subjects.teacher_id IN ( SELECT t.teacher_id
           FROM teachers t
          WHERE ((t.school_id = ( SELECT users.school_id
                   FROM users
                  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
                 LIMIT 1)) AND (lower(TRIM(BOTH FROM t.email)) = lower(TRIM(BOTH FROM ( SELECT users.email
                   FROM users
                  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
                 LIMIT 1)))))))))))))
    WITH CHECK (((school_id IN ( SELECT schools.school_id
   FROM schools
  WHERE (schools.admin_id = ( SELECT auth.uid() AS uid)))) OR ((( SELECT users.role
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1) = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text])) AND (school_id = ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1))) OR ((( SELECT users.role
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1) = 'teacher'::text) AND (school_id = ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)) AND (class_name IN ( SELECT class_teachers.class_name
   FROM class_teachers
  WHERE ((class_teachers.school_id = ( SELECT users.school_id
           FROM users
          WHERE (users.user_id = ( SELECT auth.uid() AS uid))
         LIMIT 1)) AND (class_teachers.teacher_id IN ( SELECT t.teacher_id
           FROM teachers t
          WHERE ((t.school_id = ( SELECT users.school_id
                   FROM users
                  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
                 LIMIT 1)) AND (lower(TRIM(BOTH FROM t.email)) = lower(TRIM(BOTH FROM ( SELECT users.email
                   FROM users
                  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
                 LIMIT 1))))))))
UNION
 SELECT teacher_class_subjects.class_name
   FROM teacher_class_subjects
  WHERE ((teacher_class_subjects.school_id = ( SELECT users.school_id
           FROM users
          WHERE (users.user_id = ( SELECT auth.uid() AS uid))
         LIMIT 1)) AND (teacher_class_subjects.teacher_id IN ( SELECT t.teacher_id
           FROM teachers t
          WHERE ((t.school_id = ( SELECT users.school_id
                   FROM users
                  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
                 LIMIT 1)) AND (lower(TRIM(BOTH FROM t.email)) = lower(TRIM(BOTH FROM ( SELECT users.email
                   FROM users
                  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
                 LIMIT 1)))))))))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "student_balances_authenticated" ON public."student_balances";
  CREATE POLICY "student_balances_authenticated" ON public."student_balances"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((((school_id = current_user_school_id()) AND (EXISTS ( SELECT 1
   FROM user_school_permissions p
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND (p.school_id = student_balances.school_id) AND (p.permission_key = 'accounting.full'::text))))) OR (school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))) OR (school_id IN ( SELECT s.school_id
   FROM schools s
  WHERE (s.admin_id = ( SELECT auth.uid() AS uid))))))
    WITH CHECK ((((school_id = current_user_school_id()) AND (EXISTS ( SELECT 1
   FROM user_school_permissions p
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND (p.school_id = student_balances.school_id) AND (p.permission_key = 'accounting.full'::text))))) OR (school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))) OR (school_id IN ( SELECT s.school_id
   FROM schools s
  WHERE (s.admin_id = ( SELECT auth.uid() AS uid))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "student_discounts_school_users" ON public."student_discounts";
  CREATE POLICY "student_discounts_school_users" ON public."student_discounts"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
    WITH CHECK ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."student_fees";
  CREATE POLICY "optimized_authenticated_access" ON public."student_fees"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "student_grievances_school_all" ON public."student_grievances";
  CREATE POLICY "student_grievances_school_all" ON public."student_grievances"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING (true)
    WITH CHECK (true)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "student_import_batches_staff_all" ON public."student_import_batches";
  CREATE POLICY "student_import_batches_staff_all" ON public."student_import_batches"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING (published_reports_user_is_school_staff(school_id))
    WITH CHECK (published_reports_user_is_school_staff(school_id))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "student_invoices_school_users" ON public."student_invoices";
  CREATE POLICY "student_invoices_school_users" ON public."student_invoices"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
    WITH CHECK ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "student_ledger_school_users" ON public."student_ledger";
  CREATE POLICY "student_ledger_school_users" ON public."student_ledger"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
    WITH CHECK ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "student_olevel_subjects_delete" ON public."student_olevel_subjects";
  CREATE POLICY "student_olevel_subjects_delete" ON public."student_olevel_subjects"
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING (((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid)))) AND current_user_can_edit_student_uace_subjects()))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "student_olevel_subjects_insert" ON public."student_olevel_subjects";
  CREATE POLICY "student_olevel_subjects_insert" ON public."student_olevel_subjects"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid)))) AND current_user_can_edit_student_uace_subjects()))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "student_olevel_subjects_select_school" ON public."student_olevel_subjects";
  CREATE POLICY "student_olevel_subjects_select_school" ON public."student_olevel_subjects"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING ((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "student_olevel_subjects_update" ON public."student_olevel_subjects";
  CREATE POLICY "student_olevel_subjects_update" ON public."student_olevel_subjects"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING (((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid)))) AND current_user_can_edit_student_uace_subjects()))
    WITH CHECK (((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid)))) AND current_user_can_edit_student_uace_subjects()))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "student_payments_authenticated" ON public."student_payments";
  CREATE POLICY "student_payments_authenticated" ON public."student_payments"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((((school_id = current_user_school_id()) AND (EXISTS ( SELECT 1
   FROM user_school_permissions p
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND (p.school_id = student_payments.school_id) AND (p.permission_key = 'accounting.full'::text))))) OR (school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))) OR (school_id IN ( SELECT s.school_id
   FROM schools s
  WHERE (s.admin_id = ( SELECT auth.uid() AS uid))))))
    WITH CHECK ((((school_id = current_user_school_id()) AND (EXISTS ( SELECT 1
   FROM user_school_permissions p
  WHERE ((p.user_id = ( SELECT auth.uid() AS uid)) AND (p.school_id = student_payments.school_id) AND (p.permission_key = 'accounting.full'::text))))) OR (school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))) OR (school_id IN ( SELECT s.school_id
   FROM schools s
  WHERE (s.admin_id = ( SELECT auth.uid() AS uid))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "student_photos_school_scoped" ON public."student_photos";
  CREATE POLICY "student_photos_school_scoped" ON public."student_photos"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING (((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))) OR (school_id IN ( SELECT schools.school_id
   FROM schools
  WHERE (schools.admin_id = ( SELECT auth.uid() AS uid)))) OR (school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = 'admin'::text))))))
    WITH CHECK (((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))) OR (school_id IN ( SELECT schools.school_id
   FROM schools
  WHERE (schools.admin_id = ( SELECT auth.uid() AS uid)))) OR (school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = 'admin'::text))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."student_requirements";
  CREATE POLICY "optimized_authenticated_access" ON public."student_requirements"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_admin_delete_student_streams" ON public."student_stream_assignments";
  CREATE POLICY "school_admin_delete_student_streams" ON public."student_stream_assignments"
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text, 'headteacher'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_admin_insert_student_streams" ON public."student_stream_assignments";
  CREATE POLICY "school_admin_insert_student_streams" ON public."student_stream_assignments"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text, 'headteacher'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_admin_update_student_streams" ON public."student_stream_assignments";
  CREATE POLICY "school_admin_update_student_streams" ON public."student_stream_assignments"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text, 'headteacher'::text]))))))
    WITH CHECK ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text, 'headteacher'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_members_read_student_streams" ON public."student_stream_assignments";
  CREATE POLICY "school_members_read_student_streams" ON public."student_stream_assignments"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "students_school_delete" ON public."students";
  CREATE POLICY "students_school_delete" ON public."students"
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING (((school_id = current_user_school_id()) AND current_user_can_manage_students()))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "students_school_insert" ON public."students";
  CREATE POLICY "students_school_insert" ON public."students"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (((school_id = current_user_school_id()) AND (current_user_can_manage_students() OR (EXISTS ( SELECT 1
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = 'secretary'::text)))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "students_school_update" ON public."students";
  CREATE POLICY "students_school_update" ON public."students"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING (((school_id = current_user_school_id()) AND current_user_can_manage_students()))
    WITH CHECK (((school_id = current_user_school_id()) AND current_user_can_manage_students()))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "students_select_consolidated" ON public."students";
  CREATE POLICY "students_select_consolidated" ON public."students"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING (((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))) OR (EXISTS ( SELECT 1
   FROM parents p
  WHERE ((p.parent_id = ( SELECT auth.uid() AS uid)) AND (p.student_id = students.student_id) AND (p.school_id = students.school_id))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."subjects";
  CREATE POLICY "optimized_authenticated_access" ON public."subjects"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "system_actions_insert_audit_only" ON public."system_actions";
  CREATE POLICY "system_actions_insert_audit_only" ON public."system_actions"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK ((action = 'ensure_academic_year'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "system_actions_no_access" ON public."system_actions";
  CREATE POLICY "system_actions_no_access" ON public."system_actions"
    AS PERMISSIVE
    FOR SELECT
    TO {public}
    USING (false)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "system_actions_no_delete" ON public."system_actions";
  CREATE POLICY "system_actions_no_delete" ON public."system_actions"
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING (false)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "system_actions_no_update" ON public."system_actions";
  CREATE POLICY "system_actions_no_update" ON public."system_actions"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING (false)
    WITH CHECK (false)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "owner_only_system_health_metrics" ON public."system_health_metrics";
  CREATE POLICY "owner_only_system_health_metrics" ON public."system_health_metrics"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((( SELECT users.role
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))) = 'owner'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "teacher_attendance_log_delete" ON public."teacher_attendance_log";
  CREATE POLICY "teacher_attendance_log_delete" ON public."teacher_attendance_log"
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING (((school_id = ( SELECT (u.school_id)::text AS school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text])))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "teacher_attendance_log_insert" ON public."teacher_attendance_log";
  CREATE POLICY "teacher_attendance_log_insert" ON public."teacher_attendance_log"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK ((school_id = ( SELECT (u.school_id)::text AS school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "teacher_attendance_log_select" ON public."teacher_attendance_log";
  CREATE POLICY "teacher_attendance_log_select" ON public."teacher_attendance_log"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING ((school_id = ( SELECT (u.school_id)::text AS school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "teacher_attendance_log_update" ON public."teacher_attendance_log";
  CREATE POLICY "teacher_attendance_log_update" ON public."teacher_attendance_log"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING ((school_id = ( SELECT (u.school_id)::text AS school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)))
    WITH CHECK ((school_id = ( SELECT (u.school_id)::text AS school_id
   FROM users u
  WHERE (u.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."teacher_attendance_logs";
  CREATE POLICY "optimized_authenticated_access" ON public."teacher_attendance_logs"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."teacher_class_subjects";
  CREATE POLICY "optimized_authenticated_access" ON public."teacher_class_subjects"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "teacher_comment_rules_school_scoped" ON public."teacher_comment_rules";
  CREATE POLICY "teacher_comment_rules_school_scoped" ON public."teacher_comment_rules"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING (((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))) OR (school_id IN ( SELECT schools.school_id
   FROM schools
  WHERE (schools.admin_id = ( SELECT auth.uid() AS uid)))) OR (school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = 'admin'::text))))))
    WITH CHECK (((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))) OR (school_id IN ( SELECT schools.school_id
   FROM schools
  WHERE (schools.admin_id = ( SELECT auth.uid() AS uid)))) OR (school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = 'admin'::text))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "teacher_documents_delete_staff" ON public."teacher_documents";
  CREATE POLICY "teacher_documents_delete_staff" ON public."teacher_documents"
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING (((( SELECT users.role
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1) = 'owner'::text) OR (school_id IN ( SELECT schools.school_id
   FROM schools
  WHERE (schools.admin_id = ( SELECT auth.uid() AS uid)))) OR ((school_id = current_user_school_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = teacher_documents.school_id) AND (u.role = ANY (ARRAY['admin'::text, 'head_teacher'::text, 'accountant'::text]))))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "teacher_documents_insert_staff" ON public."teacher_documents";
  CREATE POLICY "teacher_documents_insert_staff" ON public."teacher_documents"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (((( SELECT users.role
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1) = 'owner'::text) OR (school_id IN ( SELECT schools.school_id
   FROM schools
  WHERE (schools.admin_id = ( SELECT auth.uid() AS uid)))) OR ((school_id = current_user_school_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = teacher_documents.school_id) AND (u.role = ANY (ARRAY['admin'::text, 'head_teacher'::text, 'accountant'::text]))))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "teacher_documents_select_school" ON public."teacher_documents";
  CREATE POLICY "teacher_documents_select_school" ON public."teacher_documents"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING (((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))) OR (( SELECT users.role
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1) = 'owner'::text) OR (school_id IN ( SELECT schools.school_id
   FROM schools
  WHERE (schools.admin_id = ( SELECT auth.uid() AS uid)))) OR ((school_id = current_user_school_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = teacher_documents.school_id) AND (u.role = ANY (ARRAY['admin'::text, 'head_teacher'::text, 'accountant'::text]))))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "teacher_documents_update_staff" ON public."teacher_documents";
  CREATE POLICY "teacher_documents_update_staff" ON public."teacher_documents"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING (((( SELECT users.role
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1) = 'owner'::text) OR (school_id IN ( SELECT schools.school_id
   FROM schools
  WHERE (schools.admin_id = ( SELECT auth.uid() AS uid)))) OR ((school_id = current_user_school_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = teacher_documents.school_id) AND (u.role = ANY (ARRAY['admin'::text, 'head_teacher'::text, 'accountant'::text]))))))))
    WITH CHECK (((( SELECT users.role
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1) = 'owner'::text) OR (school_id IN ( SELECT schools.school_id
   FROM schools
  WHERE (schools.admin_id = ( SELECT auth.uid() AS uid)))) OR ((school_id = current_user_school_id()) AND (EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = teacher_documents.school_id) AND (u.role = ANY (ARRAY['admin'::text, 'head_teacher'::text, 'accountant'::text]))))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "tegp_prefs_delete" ON public."teacher_exam_class_prefs";
  CREATE POLICY "tegp_prefs_delete" ON public."teacher_exam_class_prefs"
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING (((school_id = ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)) AND ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = ( SELECT users.school_id
           FROM users
          WHERE (users.user_id = ( SELECT auth.uid() AS uid))
         LIMIT 1)) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text]))))) OR (EXISTS ( SELECT 1
   FROM ((teacher_class_subjects tcs
     JOIN users u ON (((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = tcs.school_id))))
     JOIN teachers t ON (((t.teacher_id = tcs.teacher_id) AND (t.school_id = tcs.school_id))))
  WHERE ((tcs.school_id = teacher_exam_class_prefs.school_id) AND (TRIM(BOTH FROM tcs.class_name) = TRIM(BOTH FROM teacher_exam_class_prefs.class_name)) AND (((u.linked_teacher_id IS NOT NULL) AND (u.linked_teacher_id = tcs.teacher_id)) OR ((t.email IS NOT NULL) AND (TRIM(BOTH FROM t.email) <> ''::text) AND (lower(TRIM(BOTH FROM t.email)) = lower(TRIM(BOTH FROM COALESCE(NULLIF(TRIM(BOTH FROM u.email), ''::text), NULLIF(TRIM(BOTH FROM COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text)), ''::text), ''::text))))))))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "tegp_prefs_insert" ON public."teacher_exam_class_prefs";
  CREATE POLICY "tegp_prefs_insert" ON public."teacher_exam_class_prefs"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (((school_id = ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)) AND ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = ( SELECT users.school_id
           FROM users
          WHERE (users.user_id = ( SELECT auth.uid() AS uid))
         LIMIT 1)) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text]))))) OR (EXISTS ( SELECT 1
   FROM ((teacher_class_subjects tcs
     JOIN users u ON (((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = tcs.school_id))))
     JOIN teachers t ON (((t.teacher_id = tcs.teacher_id) AND (t.school_id = tcs.school_id))))
  WHERE ((tcs.school_id = teacher_exam_class_prefs.school_id) AND (TRIM(BOTH FROM tcs.class_name) = TRIM(BOTH FROM teacher_exam_class_prefs.class_name)) AND (((u.linked_teacher_id IS NOT NULL) AND (u.linked_teacher_id = tcs.teacher_id)) OR ((t.email IS NOT NULL) AND (TRIM(BOTH FROM t.email) <> ''::text) AND (lower(TRIM(BOTH FROM t.email)) = lower(TRIM(BOTH FROM COALESCE(NULLIF(TRIM(BOTH FROM u.email), ''::text), NULLIF(TRIM(BOTH FROM COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text)), ''::text), ''::text))))))))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "tegp_prefs_select" ON public."teacher_exam_class_prefs";
  CREATE POLICY "tegp_prefs_select" ON public."teacher_exam_class_prefs"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING ((school_id = ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "tegp_prefs_update" ON public."teacher_exam_class_prefs";
  CREATE POLICY "tegp_prefs_update" ON public."teacher_exam_class_prefs"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING (((school_id = ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)) AND ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = ( SELECT users.school_id
           FROM users
          WHERE (users.user_id = ( SELECT auth.uid() AS uid))
         LIMIT 1)) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text]))))) OR (EXISTS ( SELECT 1
   FROM ((teacher_class_subjects tcs
     JOIN users u ON (((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = tcs.school_id))))
     JOIN teachers t ON (((t.teacher_id = tcs.teacher_id) AND (t.school_id = tcs.school_id))))
  WHERE ((tcs.school_id = teacher_exam_class_prefs.school_id) AND (TRIM(BOTH FROM tcs.class_name) = TRIM(BOTH FROM teacher_exam_class_prefs.class_name)) AND (((u.linked_teacher_id IS NOT NULL) AND (u.linked_teacher_id = tcs.teacher_id)) OR ((t.email IS NOT NULL) AND (TRIM(BOTH FROM t.email) <> ''::text) AND (lower(TRIM(BOTH FROM t.email)) = lower(TRIM(BOTH FROM COALESCE(NULLIF(TRIM(BOTH FROM u.email), ''::text), NULLIF(TRIM(BOTH FROM COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text)), ''::text), ''::text))))))))))))
    WITH CHECK (((school_id = ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)) AND ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = ( SELECT users.school_id
           FROM users
          WHERE (users.user_id = ( SELECT auth.uid() AS uid))
         LIMIT 1)) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text]))))) OR (EXISTS ( SELECT 1
   FROM ((teacher_class_subjects tcs
     JOIN users u ON (((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = tcs.school_id))))
     JOIN teachers t ON (((t.teacher_id = tcs.teacher_id) AND (t.school_id = tcs.school_id))))
  WHERE ((tcs.school_id = teacher_exam_class_prefs.school_id) AND (TRIM(BOTH FROM tcs.class_name) = TRIM(BOTH FROM teacher_exam_class_prefs.class_name)) AND (((u.linked_teacher_id IS NOT NULL) AND (u.linked_teacher_id = tcs.teacher_id)) OR ((t.email IS NOT NULL) AND (TRIM(BOTH FROM t.email) <> ''::text) AND (lower(TRIM(BOTH FROM t.email)) = lower(TRIM(BOTH FROM COALESCE(NULLIF(TRIM(BOTH FROM u.email), ''::text), NULLIF(TRIM(BOTH FROM COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text)), ''::text), ''::text))))))))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "tegb_bands_delete" ON public."teacher_exam_grade_bands";
  CREATE POLICY "tegb_bands_delete" ON public."teacher_exam_grade_bands"
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING (((school_id = ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)) AND ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = ( SELECT users.school_id
           FROM users
          WHERE (users.user_id = ( SELECT auth.uid() AS uid))
         LIMIT 1)) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text]))))) OR (EXISTS ( SELECT 1
   FROM ((teacher_class_subjects tcs
     JOIN users u ON (((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = tcs.school_id))))
     JOIN teachers t ON (((t.teacher_id = tcs.teacher_id) AND (t.school_id = tcs.school_id))))
  WHERE ((tcs.school_id = teacher_exam_grade_bands.school_id) AND (TRIM(BOTH FROM tcs.class_name) = TRIM(BOTH FROM teacher_exam_grade_bands.class_name)) AND (TRIM(BOTH FROM tcs.subject) = TRIM(BOTH FROM teacher_exam_grade_bands.subject)) AND (((u.linked_teacher_id IS NOT NULL) AND (u.linked_teacher_id = tcs.teacher_id)) OR ((t.email IS NOT NULL) AND (TRIM(BOTH FROM t.email) <> ''::text) AND (lower(TRIM(BOTH FROM t.email)) = lower(TRIM(BOTH FROM COALESCE(NULLIF(TRIM(BOTH FROM u.email), ''::text), NULLIF(TRIM(BOTH FROM COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text)), ''::text), ''::text))))))))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "tegb_bands_insert" ON public."teacher_exam_grade_bands";
  CREATE POLICY "tegb_bands_insert" ON public."teacher_exam_grade_bands"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (((school_id = ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)) AND ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = ( SELECT users.school_id
           FROM users
          WHERE (users.user_id = ( SELECT auth.uid() AS uid))
         LIMIT 1)) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text]))))) OR (EXISTS ( SELECT 1
   FROM ((teacher_class_subjects tcs
     JOIN users u ON (((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = tcs.school_id))))
     JOIN teachers t ON (((t.teacher_id = tcs.teacher_id) AND (t.school_id = tcs.school_id))))
  WHERE ((tcs.school_id = teacher_exam_grade_bands.school_id) AND (TRIM(BOTH FROM tcs.class_name) = TRIM(BOTH FROM teacher_exam_grade_bands.class_name)) AND (TRIM(BOTH FROM tcs.subject) = TRIM(BOTH FROM teacher_exam_grade_bands.subject)) AND (((u.linked_teacher_id IS NOT NULL) AND (u.linked_teacher_id = tcs.teacher_id)) OR ((t.email IS NOT NULL) AND (TRIM(BOTH FROM t.email) <> ''::text) AND (lower(TRIM(BOTH FROM t.email)) = lower(TRIM(BOTH FROM COALESCE(NULLIF(TRIM(BOTH FROM u.email), ''::text), NULLIF(TRIM(BOTH FROM COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text)), ''::text), ''::text))))))))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "tegb_bands_select" ON public."teacher_exam_grade_bands";
  CREATE POLICY "tegb_bands_select" ON public."teacher_exam_grade_bands"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING ((school_id = ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "tegb_bands_update" ON public."teacher_exam_grade_bands";
  CREATE POLICY "tegb_bands_update" ON public."teacher_exam_grade_bands"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING (((school_id = ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)) AND ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = ( SELECT users.school_id
           FROM users
          WHERE (users.user_id = ( SELECT auth.uid() AS uid))
         LIMIT 1)) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text]))))) OR (EXISTS ( SELECT 1
   FROM ((teacher_class_subjects tcs
     JOIN users u ON (((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = tcs.school_id))))
     JOIN teachers t ON (((t.teacher_id = tcs.teacher_id) AND (t.school_id = tcs.school_id))))
  WHERE ((tcs.school_id = teacher_exam_grade_bands.school_id) AND (TRIM(BOTH FROM tcs.class_name) = TRIM(BOTH FROM teacher_exam_grade_bands.class_name)) AND (TRIM(BOTH FROM tcs.subject) = TRIM(BOTH FROM teacher_exam_grade_bands.subject)) AND (((u.linked_teacher_id IS NOT NULL) AND (u.linked_teacher_id = tcs.teacher_id)) OR ((t.email IS NOT NULL) AND (TRIM(BOTH FROM t.email) <> ''::text) AND (lower(TRIM(BOTH FROM t.email)) = lower(TRIM(BOTH FROM COALESCE(NULLIF(TRIM(BOTH FROM u.email), ''::text), NULLIF(TRIM(BOTH FROM COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text)), ''::text), ''::text))))))))))))
    WITH CHECK (((school_id = ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)) AND ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = ( SELECT users.school_id
           FROM users
          WHERE (users.user_id = ( SELECT auth.uid() AS uid))
         LIMIT 1)) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text]))))) OR (EXISTS ( SELECT 1
   FROM ((teacher_class_subjects tcs
     JOIN users u ON (((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = tcs.school_id))))
     JOIN teachers t ON (((t.teacher_id = tcs.teacher_id) AND (t.school_id = tcs.school_id))))
  WHERE ((tcs.school_id = teacher_exam_grade_bands.school_id) AND (TRIM(BOTH FROM tcs.class_name) = TRIM(BOTH FROM teacher_exam_grade_bands.class_name)) AND (TRIM(BOTH FROM tcs.subject) = TRIM(BOTH FROM teacher_exam_grade_bands.subject)) AND (((u.linked_teacher_id IS NOT NULL) AND (u.linked_teacher_id = tcs.teacher_id)) OR ((t.email IS NOT NULL) AND (TRIM(BOTH FROM t.email) <> ''::text) AND (lower(TRIM(BOTH FROM t.email)) = lower(TRIM(BOTH FROM COALESCE(NULLIF(TRIM(BOTH FROM u.email), ''::text), NULLIF(TRIM(BOTH FROM COALESCE((( SELECT auth.jwt() AS jwt) ->> 'email'::text), ''::text)), ''::text), ''::text))))))))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "server_only_no_direct_client_access" ON public."teacher_phone_change_requests";
  CREATE POLICY "server_only_no_direct_client_access" ON public."teacher_phone_change_requests"
    AS RESTRICTIVE
    FOR ALL
    TO {authenticated}
    USING (false)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."teacher_remarks_settings";
  CREATE POLICY "optimized_authenticated_access" ON public."teacher_remarks_settings"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "tr_delete" ON public."teacher_resources";
  CREATE POLICY "tr_delete" ON public."teacher_resources"
    AS PERMISSIVE
    FOR DELETE
    TO {public}
    USING ((( SELECT auth.uid() AS uid) = teacher_id))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "tr_insert" ON public."teacher_resources";
  CREATE POLICY "tr_insert" ON public."teacher_resources"
    AS PERMISSIVE
    FOR INSERT
    TO {public}
    WITH CHECK ((( SELECT auth.uid() AS uid) = teacher_id))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "tr_select" ON public."teacher_resources";
  CREATE POLICY "tr_select" ON public."teacher_resources"
    AS PERMISSIVE
    FOR SELECT
    TO {public}
    USING ((( SELECT auth.uid() AS uid) = teacher_id))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "teachers_insert_school_staff" ON public."teachers";
  CREATE POLICY "teachers_insert_school_staff" ON public."teachers"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text, 'secretary'::text]))))) OR (school_id IN ( SELECT s.school_id
   FROM schools s
  WHERE (s.admin_id = ( SELECT auth.uid() AS uid))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "teachers_select" ON public."teachers";
  CREATE POLICY "teachers_select" ON public."teachers"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING (((school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.school_id IS NOT NULL)))) OR ((( SELECT users.role
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1) = 'teacher'::text) AND (school_id = ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)) AND (lower(TRIM(BOTH FROM email)) = lower(TRIM(BOTH FROM ( SELECT users.email
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid))
 LIMIT 1)))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."term_closures";
  CREATE POLICY "optimized_authenticated_access" ON public."term_closures"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "optimized_authenticated_access" ON public."termly_projects";
  CREATE POLICY "optimized_authenticated_access" ON public."termly_projects"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.role() AS role) = 'authenticated'::text))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_admin_delete_timetable_fixed_periods" ON public."timetable_fixed_periods";
  CREATE POLICY "school_admin_delete_timetable_fixed_periods" ON public."timetable_fixed_periods"
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = ANY (ARRAY['admin'::text, 'owner'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_admin_insert_timetable_fixed_periods" ON public."timetable_fixed_periods";
  CREATE POLICY "school_admin_insert_timetable_fixed_periods" ON public."timetable_fixed_periods"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = ANY (ARRAY['admin'::text, 'owner'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_admin_update_timetable_fixed_periods" ON public."timetable_fixed_periods";
  CREATE POLICY "school_admin_update_timetable_fixed_periods" ON public."timetable_fixed_periods"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = ANY (ARRAY['admin'::text, 'owner'::text]))))))
    WITH CHECK ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = ANY (ARRAY['admin'::text, 'owner'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "school_members_read_timetable_fixed_periods" ON public."timetable_fixed_periods";
  CREATE POLICY "school_members_read_timetable_fixed_periods" ON public."timetable_fixed_periods"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING ((school_id IN ( SELECT users.school_id
   FROM users
  WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "timetable_periods_delete" ON public."timetable_periods";
  CREATE POLICY "timetable_periods_delete" ON public."timetable_periods"
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING (private.user_can_manage_school(school_id))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "timetable_periods_insert" ON public."timetable_periods";
  CREATE POLICY "timetable_periods_insert" ON public."timetable_periods"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (private.user_can_manage_school(school_id))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "timetable_periods_select" ON public."timetable_periods";
  CREATE POLICY "timetable_periods_select" ON public."timetable_periods"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING (((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id = timetable_periods.school_id) AND (lower(TRIM(BOTH FROM u.role)) = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text, 'teacher'::text, 'secretary'::text]))))) OR (EXISTS ( SELECT 1
   FROM schools s
  WHERE ((s.school_id = timetable_periods.school_id) AND (s.admin_id = ( SELECT auth.uid() AS uid)))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "timetable_periods_update" ON public."timetable_periods";
  CREATE POLICY "timetable_periods_update" ON public."timetable_periods"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING (private.user_can_manage_school(school_id))
    WITH CHECK (private.user_can_manage_school(school_id))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "timetables_access" ON public."timetables";
  CREATE POLICY "timetables_access" ON public."timetables"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING (((teacher_id IN ( SELECT teachers.teacher_id
   FROM teachers
  WHERE (teachers.school_id IN ( SELECT users.school_id
           FROM users
          WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))) OR (school_id IN ( SELECT schools.school_id
   FROM schools
  WHERE (schools.admin_id = ( SELECT auth.uid() AS uid)))) OR (school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = 'admin'::text))))))
    WITH CHECK (((school_id IN ( SELECT schools.school_id
   FROM schools
  WHERE (schools.admin_id = ( SELECT auth.uid() AS uid)))) OR (school_id IN ( SELECT users.school_id
   FROM users
  WHERE ((users.user_id = ( SELECT auth.uid() AS uid)) AND (users.role = 'admin'::text))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "uace_subject_catalog_public_read" ON public."uace_subject_catalog";
  CREATE POLICY "uace_subject_catalog_public_read" ON public."uace_subject_catalog"
    AS PERMISSIVE
    FOR SELECT
    TO {public}
    USING (true)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "uce_subject_catalog_public_read" ON public."uce_subject_catalog";
  CREATE POLICY "uce_subject_catalog_public_read" ON public."uce_subject_catalog"
    AS PERMISSIVE
    FOR SELECT
    TO {public}
    USING (true)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "uas_select" ON public."user_active_schools";
  CREATE POLICY "uas_select" ON public."user_active_schools"
    AS PERMISSIVE
    FOR SELECT
    TO {public}
    USING ((user_id = ( SELECT auth.uid() AS uid)))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "uas_update" ON public."user_active_schools";
  CREATE POLICY "uas_update" ON public."user_active_schools"
    AS PERMISSIVE
    FOR UPDATE
    TO {public}
    USING ((user_id = ( SELECT auth.uid() AS uid)))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "uas_upsert" ON public."user_active_schools";
  CREATE POLICY "uas_upsert" ON public."user_active_schools"
    AS PERMISSIVE
    FOR INSERT
    TO {public}
    WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "in_app_notif_select_own" ON public."user_in_app_notifications";
  CREATE POLICY "in_app_notif_select_own" ON public."user_in_app_notifications"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING ((user_id = ( SELECT auth.uid() AS uid)))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "in_app_notif_update_own" ON public."user_in_app_notifications";
  CREATE POLICY "in_app_notif_update_own" ON public."user_in_app_notifications"
    AS PERMISSIVE
    FOR UPDATE
    TO {authenticated}
    USING ((user_id = ( SELECT auth.uid() AS uid)))
    WITH CHECK ((user_id = ( SELECT auth.uid() AS uid)))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "usm_delete" ON public."user_school_memberships";
  CREATE POLICY "usm_delete" ON public."user_school_memberships"
    AS PERMISSIVE
    FOR DELETE
    TO {public}
    USING ((school_id = current_user_school_id()))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "usm_insert" ON public."user_school_memberships";
  CREATE POLICY "usm_insert" ON public."user_school_memberships"
    AS PERMISSIVE
    FOR INSERT
    TO {public}
    WITH CHECK ((school_id = current_user_school_id()))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "usm_select" ON public."user_school_memberships";
  CREATE POLICY "usm_select" ON public."user_school_memberships"
    AS PERMISSIVE
    FOR SELECT
    TO {public}
    USING (((user_id = ( SELECT auth.uid() AS uid)) OR (school_id = current_user_school_id())))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "usm_update" ON public."user_school_memberships";
  CREATE POLICY "usm_update" ON public."user_school_memberships"
    AS PERMISSIVE
    FOR UPDATE
    TO {public}
    USING ((school_id = current_user_school_id()))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "user_school_permissions_delete_admin" ON public."user_school_permissions";
  CREATE POLICY "user_school_permissions_delete_admin" ON public."user_school_permissions"
    AS PERMISSIVE
    FOR DELETE
    TO {authenticated}
    USING ((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "user_school_permissions_insert_admin" ON public."user_school_permissions";
  CREATE POLICY "user_school_permissions_insert_admin" ON public."user_school_permissions"
    AS PERMISSIVE
    FOR INSERT
    TO {authenticated}
    WITH CHECK (((school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text]))))) AND (EXISTS ( SELECT 1
   FROM users t
  WHERE ((t.user_id = t.user_id) AND (t.school_id = t.school_id))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "user_school_permissions_select_own" ON public."user_school_permissions";
  CREATE POLICY "user_school_permissions_select_own" ON public."user_school_permissions"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING (((user_id = ( SELECT auth.uid() AS uid)) OR (school_id IN ( SELECT u.school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text])))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can only see their own sessions" ON public."user_sessions";
  CREATE POLICY "Users can only see their own sessions" ON public."user_sessions"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING ((( SELECT auth.uid() AS uid) = user_id))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "users_select" ON public."users";
  CREATE POLICY "users_select" ON public."users"
    AS PERMISSIVE
    FOR SELECT
    TO {authenticated}
    USING (((( SELECT auth.uid() AS uid) = 'a360d879-192c-4b5a-b776-6452849f1102'::uuid) OR (user_id = ( SELECT auth.uid() AS uid)) OR (school_id = private.caller_school_id())))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "visitor_log_delete" ON public."visitor_log";
  CREATE POLICY "visitor_log_delete" ON public."visitor_log"
    AS PERMISSIVE
    FOR DELETE
    TO {public}
    USING ((school_id IN ( SELECT (u.school_id)::text AS school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.role = ANY (ARRAY['admin'::text, 'owner'::text, 'head_teacher'::text]))))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "visitor_log_insert" ON public."visitor_log";
  CREATE POLICY "visitor_log_insert" ON public."visitor_log"
    AS PERMISSIVE
    FOR INSERT
    TO {public}
    WITH CHECK ((school_id IN ( SELECT (u.school_id)::text AS school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "visitor_log_select" ON public."visitor_log";
  CREATE POLICY "visitor_log_select" ON public."visitor_log"
    AS PERMISSIVE
    FOR SELECT
    TO {public}
    USING ((school_id IN ( SELECT (u.school_id)::text AS school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "visitor_log_update" ON public."visitor_log";
  CREATE POLICY "visitor_log_update" ON public."visitor_log"
    AS PERMISSIVE
    FOR UPDATE
    TO {public}
    USING ((school_id IN ( SELECT (u.school_id)::text AS school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))))
    WITH CHECK ((school_id IN ( SELECT (u.school_id)::text AS school_id
   FROM users u
  WHERE ((u.user_id = ( SELECT auth.uid() AS uid)) AND (u.school_id IS NOT NULL)))))
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "whatsapp_bot_sessions_no_access" ON public."whatsapp_bot_sessions";
  CREATE POLICY "whatsapp_bot_sessions_no_access" ON public."whatsapp_bot_sessions"
    AS PERMISSIVE
    FOR ALL
    TO {public}
    USING (false)
  ;
END $$;

DO $$ BEGIN
  DROP POLICY IF EXISTS "writeoff_log_via_invoice_school" ON public."writeoff_log";
  CREATE POLICY "writeoff_log_via_invoice_school" ON public."writeoff_log"
    AS PERMISSIVE
    FOR ALL
    TO {authenticated}
    USING ((invoice_id IN ( SELECT si.invoice_id
   FROM student_invoices si
  WHERE (si.school_id IN ( SELECT users.school_id
           FROM users
          WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))))
    WITH CHECK ((invoice_id IN ( SELECT si.invoice_id
   FROM student_invoices si
  WHERE (si.school_id IN ( SELECT users.school_id
           FROM users
          WHERE (users.user_id = ( SELECT auth.uid() AS uid)))))))
  ;
END $$;

