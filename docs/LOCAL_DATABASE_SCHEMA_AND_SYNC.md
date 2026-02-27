# Local Database Schema & Sync Specification

This document defines the **exact local database structure** for the offline-first Windows and Android apps. It ensures offline operation and reliable sync when online.

**Related:** [MASTER_ARCHITECTURE_DIRECTIVE.md](./MASTER_ARCHITECTURE_DIRECTIVE.md) — overall architecture.

---

## 1. Purpose

* **Single source of shape:** Local SQLite/SQLCipher tables MUST mirror the Supabase (Postgres) schema below so that:
  * Offline reads/writes use the same row shape as the cloud.
  * Sync can map rows 1:1 (by `id`) and apply delta updates.
* **Sync columns:** Every synced table MUST have the same set of sync metadata columns (see §2). Supabase may add these via migrations; the local schema MUST include them.
* **School-scoping:** All school data is filtered by `school_id`. The app only stores and syncs data for the school(s) the user can access.

---

## 2. Mandatory Sync Columns (Per Synced Table)

For **delta-based sync** and conflict handling, each synced table MUST have:

| Column       | Type        | Required | Purpose |
| ------------ | ----------- | -------- | ------- |
| `id`         | UUID        | Yes      | Primary key; same as Supabase. |
| `created_at` | Timestamp   | Yes      | Creation time (server or client). |
| `updated_at` | Timestamp   | Yes      | Last modification; used for “last write wins”. |
| `deleted_at` | Timestamp?  | Yes      | Soft delete; null = not deleted. |
| `version`    | Integer     | Yes      | Incremented on each update; conflict resolution. |
| `device_id`  | Text/UUID   | Yes      | Device that last wrote the row (for push). |
| `synced`     | Boolean     | Yes      | Local-only: `false` until successfully pushed. |

**Implementation notes:**

* **Supabase:** Add `updated_at`, `deleted_at`, `version`, `device_id` (and ensure `created_at` exists) on every table that participates in sync. If not present, the sync API must still accept/send these and the app must treat them as authoritative when present.
* **Local (Room/Exposed):** Every synced entity MUST have all seven columns. New rows get `synced = false`; after successful push, set `synced = true` and store server `version`/`updated_at`.

---

## 3. Tables to Store Locally (Full List)

The following tables are the **canonical set** to replicate locally for offline use and sync. Order respects foreign-key dependencies for initial pull and conflict-free apply.

### 3.1 Core / no school_id (sync once per tenant or global)

| Table              | Primary Key   | Notes |
| ------------------ | ------------- | ----- |
| `global_terms`     | `id`          | Global term windows. |
| `nursery_auto_comments` | `id`   | System-wide nursery comment rules. |

### 3.2 School root (sync first)

| Table     | Primary Key | Notes |
| --------- | ----------- | ----- |
| `schools` | `school_id` | Single school per app context or multi-school; sync only schools the user can access. |

### 3.3 School-dependent (sync after `schools`)

Order below is the **recommended sync/apply order** to satisfy FKs. All are scoped by `school_id` unless noted.

| Order | Table | Primary Key | Key FKs |
| ----- | ----- | ----------- | ------- |
| 1 | `school_terms` | `id` | school_id, global_term_id |
| 2 | `classes` | `class_id` | school_id |
| 3 | `subjects` | `subject_id` | school_id |
| 4 | `class_subjects` | `id` | school_id |
| 5 | `users` | `user_id` | school_id, student_id |
| 6 | `teachers` | `teacher_id` | school_id |
| 7 | `students` | `student_id` | school_id |
| 8 | `parents` | `parent_id`, `student_id` | school_id, student_id |
| 9 | `class_teachers` | `id` | school_id, teacher_id |
| 10 | `teacher_class_subjects` | `id` | school_id, teacher_id |
| 11 | `exam_sets` | `id` | school_id |
| 12 | `grading_scale` | `id` | school_id |
| 13 | `headteacher_comments_settings` | `id` | school_id |
| 14 | `class_teacher_comments_settings` | `id` | school_id |
| 15 | `teacher_remarks_settings` | `id` | school_id |
| 16 | `report_templates` | `template_id` | school_id |
| 17 | `class_template_settings` | `id` | school_id, template_id, class_teacher_id |
| 18 | `report_title_settings` | `id` | school_id |
| 19 | `school_report_customizations` | `id` | school_id |
| 20 | `fee_structures` | `id` | school_id, term_id |
| 21 | `school_fee_structure` | `id` | school_id |
| 22 | `school_requirements` | `id` | school_id |
| 23 | `expense_categories` | `category_id` | school_id |
| 24 | `admission_sequences` | `sequence_id` | school_id |
| 25 | `invoice_sequences` | `school_id`, `year` | school_id |
| 26 | `receipt_sequences` | `school_id`, `year` | school_id |
| 27 | `receipt_sequences_per_term` | `school_id`, `academic_year`, `term` | school_id |
| 28 | `student_invoices` | `invoice_id` | school_id, student_id, term_id |
| 29 | `student_fees` | `id` | school_id, student_id, term_id |
| 30 | `student_balances` | `balance_id` | school_id, student_id, term_id |
| 31 | `balance_brought_forward` | `id` | school_id, student_id, to_term_id |
| 32 | `student_payments` | `payment_id` | school_id, student_id, term_id, invoice_id |
| 33 | `receipts` | `receipt_id` | school_id, student_id, payment_id |
| 34 | `receivable_status` | `student_id` | school_id |
| 35 | `student_discounts` | `discount_id` | school_id, student_id, term_id |
| 36 | `student_ledger` | `id` | school_id, student_id, term_id |
| 37 | `student_requirements` | `id` | school_id, student_id, requirement_id |
| 38 | `student_photos` | `id` | school_id, student_id |
| 39 | `exam_results` | `id` | school_id, exam_set_id, student_id |
| 40 | `processed_primary_exam_results` | `id` | school_id, exam_set_id, student_id |
| 41 | `processed_secondary_exam_results` | `id` | school_id, exam_set_id, student_id |
| 42 | `report_comments` | `comment_id` | school_id, student_id |
| 43 | `report_snapshots` | `id` | school_id, exam_set_id, template_id |
| 44 | `report_snapshot_data` | `id` | snapshot_id, student_id |
| 45 | `generated_reports` | `id` | snapshot_id, student_id, template_id |
| 46 | `student_attendance` | `attendance_id` | school_id, student_id |
| 47 | `attendance` (staff punch) | `attendance_id` | school_id, teacher_id |
| 48 | `teacher_attendance_logs` | `log_id` | school_id, teacher_id |
| 49 | `school_expenses` | `expense_id` | school_id, term_id |
| 50 | `period_locks` | `id` | school_id, term_id |
| 51 | `term_closures` | `closure_id` | school_id |
| 52 | `school_events` | `event_id` | school_id |
| 53 | `notifications` | `notification_id` | school_id, student_id, user_id |
| 54 | `notification_templates` | `template_id` | school_id |
| 55 | `notification_logs` | `log_id` | school_id, student_id |
| 56 | `assignments` | `id` | school_id, teacher_id |
| 57 | `assignment_submissions` | `id` | assignment_id, student_id |
| 58 | `discipline_records` | `record_id` | school_id, student_id |
| 59 | `timetables` | `id` | school_id, teacher_id |
| 60 | `timetable_periods` | `id` | school_id, teacher_id |
| 61 | `jobs` | `job_id` | school_id |
| 62 | `reports` (legacy) | `report_id` | school_id, student_id |
| 63 | `rollover_status` | `id` | school_id |
| 64 | `termly_projects` | `project_id` | school_id, student_id |
| 65 | `writeoff_log` | `id` | invoice_id, approved_by |
| 66 | `audit_log` | `id` | school_id, user_id |
| 67 | `logs` | `log_id` | school_id, user_id |

### 3.4 Library (school-scoped)

| Table | Primary Key | Key FKs |
| ----- | ----------- | ------- |
| `library_books` | `book_id` | school_id |
| `library_book_copies` | `copy_id` | book_id, school_id |
| `library_borrows` | `borrow_id` | school_id, copy_id, student_id |
| `library_fines` | `fine_id` | school_id, borrow_id, student_id |
| `library_reservations` | `reservation_id` | school_id, book_id, student_id |

`library` (content_id) is not school-scoped in the given schema; include only if your product uses it and it is synced per school or globally.

### 3.5 Optional / cloud-only (do not replicate or sync for offline)

* **`affiliates`**, **`affiliate_clicks`**, **`affiliate_codes`**, **`affiliate_earnings`** — platform/marketing; not needed for school offline.
* **`messages`** — no `school_id` in schema; add school scoping if needed for offline, else keep cloud-only.
* **`system_actions`** — platform-level; skip for local.
* **`old_students`** — can be synced if reports or history need it; otherwise optional.
* **`payments`** (legacy) — superseded by `student_payments`; omit if unused.
* **`grades`** — legacy if you use `exam_results`; omit if unused.

---

## 4. Supabase Schema Reference (Table Definitions)

The following is the **canonical structure** from Supabase. Local schema MUST match column names and types; add sync columns from §2 where missing.

<details>
<summary>Click to expand: full CREATE TABLE statements (reference only, not for direct execution)</summary>

```sql
-- WARNING: For context only. Table order and constraints may not be valid for execution.
-- Sync columns (updated_at, deleted_at, version, device_id, synced) must be added per §2.

CREATE TABLE public.admission_sequences (
  sequence_id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  year integer NOT NULL,
  current_sequence integer DEFAULT 1,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT admission_sequences_pkey PRIMARY KEY (sequence_id)
);

CREATE TABLE public.assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid,
  school_id uuid NOT NULL,
  class_name text NOT NULL,
  subject text NOT NULL,
  title text NOT NULL,
  description text,
  due_date date NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT assignments_pkey PRIMARY KEY (id)
);

CREATE TABLE public.assignment_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  assignment_id uuid,
  student_id uuid,
  submitted_at timestamp with time zone DEFAULT now(),
  file_url text,
  status text DEFAULT 'submitted',
  grade numeric,
  feedback text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT assignment_submissions_pkey PRIMARY KEY (id)
);

CREATE TABLE public.attendance (
  attendance_id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid,
  school_id uuid NOT NULL,
  type text NOT NULL,
  timestamp timestamp without time zone DEFAULT now(),
  ip_address text,
  CONSTRAINT attendance_pkey PRIMARY KEY (attendance_id)
);

CREATE TABLE public.audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid,
  entity text NOT NULL,
  entity_id text,
  action text NOT NULL,
  user_id uuid,
  details jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT audit_log_pkey PRIMARY KEY (id)
);

CREATE TABLE public.balance_brought_forward (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  school_id uuid NOT NULL,
  to_term_id uuid NOT NULL,
  amount_outstanding numeric NOT NULL,
  reference_invoice_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT balance_brought_forward_pkey PRIMARY KEY (id)
);

CREATE TABLE public.class_subjects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  class_name text NOT NULL,
  subject text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT class_subjects_pkey PRIMARY KEY (id)
);

CREATE TABLE public.class_teacher_comments_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  class_name text NOT NULL,
  min_percent integer NOT NULL,
  max_percent integer NOT NULL,
  comment text NOT NULL,
  comment_text text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  created_by uuid,
  is_default boolean DEFAULT false,
  CONSTRAINT class_teacher_comments_settings_pkey PRIMARY KEY (id)
);

CREATE TABLE public.class_teachers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  class_name text NOT NULL,
  teacher_id uuid NOT NULL,
  year integer NOT NULL,
  term integer NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_primary boolean DEFAULT false,
  CONSTRAINT class_teachers_pkey PRIMARY KEY (id)
);

CREATE TABLE public.class_template_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  class_name text NOT NULL,
  template_id uuid,
  is_o_level boolean DEFAULT false,
  class_teacher_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_primary boolean DEFAULT false,
  CONSTRAINT class_template_settings_pkey PRIMARY KEY (id)
);

CREATE TABLE public.classes (
  class_id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  class_name text NOT NULL,
  description text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  max_students integer DEFAULT 1000,
  CONSTRAINT classes_pkey PRIMARY KEY (class_id)
);

CREATE TABLE public.discipline_records (
  record_id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  incident_date date NOT NULL DEFAULT CURRENT_DATE,
  incident_type text NOT NULL,
  description text NOT NULL,
  action_taken text,
  recorded_by uuid,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT discipline_records_pkey PRIMARY KEY (record_id)
);

CREATE TABLE public.exam_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  exam_set_id uuid NOT NULL,
  student_id uuid NOT NULL,
  class_name text NOT NULL,
  subject text NOT NULL,
  marks_obtained numeric DEFAULT 0,
  total_marks numeric DEFAULT 100,
  grade text,
  remarks text,
  teacher_initials text,
  teacher_comment text,
  activity_score numeric,
  descriptor text,
  exam_score numeric,
  final_score numeric,
  overall_remark text,
  topic text,
  formative_score numeric,
  paper_number text,
  nursery_skill_performance jsonb NOT NULL DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT exam_results_pkey PRIMARY KEY (id)
);

CREATE TABLE public.exam_sets (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  term integer NOT NULL,
  year integer NOT NULL,
  target_classes text[] DEFAULT '{}',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  sort_order integer DEFAULT 1,
  active_for_input boolean DEFAULT false,
  is_primary boolean DEFAULT false,
  CONSTRAINT exam_sets_pkey PRIMARY KEY (id)
);

CREATE TABLE public.expense_categories (
  category_id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  category_name text NOT NULL,
  description text,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_default boolean DEFAULT false,
  CONSTRAINT expense_categories_pkey PRIMARY KEY (category_id)
);

CREATE TABLE public.fee_structures (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  class_name text NOT NULL,
  term_id uuid,
  year integer NOT NULL,
  term integer NOT NULL,
  fee_amount numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT fee_structures_pkey PRIMARY KEY (id)
);

CREATE TABLE public.generated_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL,
  student_id uuid NOT NULL,
  template_id uuid,
  report_data jsonb NOT NULL,
  pdf_url text,
  generated_at timestamp with time zone DEFAULT now(),
  template_version text,
  generated_by uuid,
  file_size_bytes integer,
  CONSTRAINT generated_reports_pkey PRIMARY KEY (id)
);

CREATE TABLE public.global_terms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  year integer NOT NULL,
  term integer NOT NULL,
  term_name text NOT NULL,
  window_start date NOT NULL,
  window_end date NOT NULL,
  hard_stop_date date NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT global_terms_pkey PRIMARY KEY (id)
);

CREATE TABLE public.grading_scale (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid,
  grade_code text NOT NULL,
  min_pct numeric NOT NULL,
  max_pct numeric NOT NULL,
  CONSTRAINT grading_scale_pkey PRIMARY KEY (id)
);

CREATE TABLE public.headteacher_comments_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  min_percent integer NOT NULL,
  max_percent integer NOT NULL,
  comment text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT headteacher_comments_settings_pkey PRIMARY KEY (id)
);

CREATE TABLE public.invoice_sequences (
  school_id uuid NOT NULL,
  year integer NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  CONSTRAINT invoice_sequences_pkey PRIMARY KEY (school_id, year)
);

CREATE TABLE public.jobs (
  job_id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid,
  title text NOT NULL,
  location text,
  description text,
  posted_by text DEFAULT 'owner',
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT jobs_pkey PRIMARY KEY (job_id)
);

CREATE TABLE public.library_books (
  book_id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  isbn text,
  title text NOT NULL,
  author text NOT NULL,
  publisher text,
  publication_year integer,
  category text,
  description text,
  total_copies integer DEFAULT 1,
  available_copies integer DEFAULT 1,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT library_books_pkey PRIMARY KEY (book_id)
);

CREATE TABLE public.library_book_copies (
  copy_id uuid NOT NULL DEFAULT gen_random_uuid(),
  book_id uuid NOT NULL,
  school_id uuid NOT NULL,
  barcode text UNIQUE,
  status text DEFAULT 'available',
  condition text DEFAULT 'good',
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT library_book_copies_pkey PRIMARY KEY (copy_id)
);

CREATE TABLE public.library_borrows (
  borrow_id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  copy_id uuid NOT NULL,
  student_id uuid NOT NULL,
  borrow_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,
  return_date date,
  status text DEFAULT 'active',
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT library_borrows_pkey PRIMARY KEY (borrow_id)
);

CREATE TABLE public.library_fines (
  fine_id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  borrow_id uuid NOT NULL,
  student_id uuid NOT NULL,
  fine_amount numeric NOT NULL DEFAULT 0,
  fine_reason text NOT NULL,
  fine_date date NOT NULL DEFAULT CURRENT_DATE,
  status text DEFAULT 'unpaid',
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT library_fines_pkey PRIMARY KEY (fine_id)
);

CREATE TABLE public.library_reservations (
  reservation_id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  book_id uuid NOT NULL,
  student_id uuid NOT NULL,
  reservation_date date NOT NULL DEFAULT CURRENT_DATE,
  status text DEFAULT 'pending',
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT library_reservations_pkey PRIMARY KEY (reservation_id)
);

CREATE TABLE public.logs (
  log_id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid,
  user_id uuid,
  action text NOT NULL,
  details text,
  ip_address text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT logs_pkey PRIMARY KEY (log_id)
);

CREATE TABLE public.notification_logs (
  log_id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid,
  notification_type text NOT NULL,
  status text DEFAULT 'pending',
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT notification_logs_pkey PRIMARY KEY (log_id)
);

CREATE TABLE public.notification_templates (
  template_id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  category text NOT NULL,
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT notification_templates_pkey PRIMARY KEY (template_id)
);

CREATE TABLE public.notifications (
  notification_id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid,
  user_id uuid,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info',
  is_read boolean DEFAULT false,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (notification_id)
);

CREATE TABLE public.nursery_auto_comments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  role text NOT NULL,
  grade_letter text NOT NULL,
  comment text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT nursery_auto_comments_pkey PRIMARY KEY (id)
);

CREATE TABLE public.parents (
  parent_id uuid NOT NULL,
  student_id uuid NOT NULL,
  name text NOT NULL,
  email text,
  school_id uuid NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  phone text,
  relationship text,
  is_primary_contact boolean,
  CONSTRAINT parents_pkey PRIMARY KEY (parent_id, student_id)
);

CREATE TABLE public.period_locks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  term_id uuid,
  period_end date NOT NULL,
  locked_at timestamp with time zone DEFAULT now(),
  locked_by uuid,
  CONSTRAINT period_locks_pkey PRIMARY KEY (id)
);

CREATE TABLE public.processed_primary_exam_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  exam_set_id uuid NOT NULL,
  year integer NOT NULL,
  term text NOT NULL,
  exam_set_name text NOT NULL,
  student_name text NOT NULL,
  class_name text NOT NULL,
  admission_number text NOT NULL,
  subject text NOT NULL,
  marks_obtained numeric,
  total_marks numeric DEFAULT 100,
  grade text,
  teacher_remark text,
  teacher_initials text,
  class_teacher_comment text,
  headteacher_comment text,
  class_position integer,
  aggregate integer,
  division text,
  nursery_skill_performance jsonb NOT NULL DEFAULT '{}',
  processed_at timestamp with time zone DEFAULT now(),
  processed_by uuid,
  exam_type text,
  CONSTRAINT processed_primary_exam_results_pkey PRIMARY KEY (id)
);

CREATE TABLE public.processed_secondary_exam_results (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  exam_set_id uuid NOT NULL,
  student_name text NOT NULL,
  admission_number text,
  class_name text NOT NULL,
  year integer NOT NULL,
  term integer NOT NULL,
  subject text NOT NULL,
  marks_obtained numeric NOT NULL DEFAULT 0,
  total_marks numeric NOT NULL DEFAULT 100,
  grade text,
  teacher_remark text,
  teacher_initials text,
  class_teacher_comment text,
  headteacher_comment text,
  next_term_begins_date date,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT processed_secondary_exam_results_pkey PRIMARY KEY (id)
);

CREATE TABLE public.receipt_sequences (
  school_id uuid NOT NULL,
  year integer NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  CONSTRAINT receipt_sequences_pkey PRIMARY KEY (school_id, year)
);

CREATE TABLE public.receipt_sequences_per_term (
  school_id uuid NOT NULL,
  academic_year integer NOT NULL,
  term integer NOT NULL,
  last_number integer NOT NULL DEFAULT 0,
  CONSTRAINT receipt_sequences_per_term_pkey PRIMARY KEY (school_id, academic_year, term)
);

CREATE TABLE public.receipts (
  receipt_id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  payment_id uuid,
  amount numeric NOT NULL,
  payment_method text,
  file_url text,
  created_at timestamp without time zone DEFAULT now(),
  school_id uuid,
  CONSTRAINT receipts_pkey PRIMARY KEY (receipt_id)
);

CREATE TABLE public.receivable_status (
  student_id uuid NOT NULL,
  school_id uuid NOT NULL,
  total_outstanding numeric NOT NULL DEFAULT 0,
  aging_bucket text,
  is_inactive_debtor boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT receivable_status_pkey PRIMARY KEY (student_id)
);

CREATE TABLE public.report_comments (
  comment_id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  class_name text NOT NULL,
  year integer NOT NULL,
  term integer NOT NULL,
  comment_type text NOT NULL,
  comment_text text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT report_comments_pkey PRIMARY KEY (comment_id)
);

CREATE TABLE public.report_snapshot_data (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  snapshot_id uuid NOT NULL,
  student_id uuid NOT NULL,
  class_name text NOT NULL,
  subject text NOT NULL,
  marks_obtained numeric,
  total_marks numeric,
  grade text,
  remarks text,
  teacher_initials text,
  teacher_comment text,
  class_teacher_comment text,
  headteacher_comment text,
  attendance_percentage numeric,
  position integer,
  aggregate numeric,
  frozen_data jsonb DEFAULT '{}',
  created_at timestamp with time zone DEFAULT now(),
  fees_balance numeric DEFAULT 0,
  fees_paid numeric DEFAULT 0,
  student_photo_url text,
  school_logo_url text,
  position_in_class integer,
  aggregate_score numeric,
  average_percentage numeric,
  division text,
  behaviour_summary jsonb DEFAULT '{}',
  fees_expected numeric DEFAULT 0,
  fees_total_paid numeric DEFAULT 0,
  exam_set_name text,
  exam_set_term integer,
  exam_set_year integer,
  CONSTRAINT report_snapshot_data_pkey PRIMARY KEY (id)
);

CREATE TABLE public.report_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  term integer NOT NULL,
  year integer NOT NULL,
  exam_set_id uuid,
  template_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  locked_at timestamp with time zone,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid,
  metadata jsonb DEFAULT '{}',
  student_count integer DEFAULT 0,
  class_count integer DEFAULT 0,
  generation_started_at timestamp with time zone,
  generation_completed_at timestamp with time zone,
  generation_duration_seconds integer,
  CONSTRAINT report_snapshots_pkey PRIMARY KEY (id)
);

CREATE TABLE public.report_templates (
  template_id uuid NOT NULL DEFAULT gen_random_uuid(),
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  content text NOT NULL,
  school_id uuid,
  created_at timestamp without time zone DEFAULT now(),
  css_content text,
  html_content text,
  is_default boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT now(),
  is_primary boolean DEFAULT false,
  CONSTRAINT report_templates_pkey PRIMARY KEY (template_id)
);

CREATE TABLE public.report_title_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL UNIQUE,
  title_template text NOT NULL,
  use_dynamic_term boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT report_title_settings_pkey PRIMARY KEY (id)
);

CREATE TABLE public.reports (
  report_id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  template_name text,
  file_url text,
  created_at timestamp without time zone DEFAULT now(),
  school_id uuid,
  CONSTRAINT reports_pkey PRIMARY KEY (report_id)
);

CREATE TABLE public.rollover_status (
  id serial PRIMARY KEY,
  school_id uuid NOT NULL,
  academic_year integer NOT NULL,
  rollover_completed boolean DEFAULT false,
  rollover_date timestamp with time zone,
  students_graduated integer DEFAULT 0,
  students_promoted integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.school_events (
  event_id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  start_time time without time zone,
  end_time time without time zone,
  location text,
  created_by uuid,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT school_events_pkey PRIMARY KEY (event_id)
);

CREATE TABLE public.school_expenses (
  expense_id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  category_id uuid,
  term_id uuid,
  amount numeric NOT NULL,
  description text NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  reference_number text UNIQUE,
  status text DEFAULT 'pending',
  payment_method text DEFAULT 'cash',
  category_name text,
  recorded_by uuid,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT school_expenses_pkey PRIMARY KEY (expense_id)
);

CREATE TABLE public.school_fee_structure (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  class_name text NOT NULL,
  tuition_amount numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  boarding_tuition_amount numeric DEFAULT 0,
  boarding_accommodation_fee numeric DEFAULT 0,
  boarding_meals_fee numeric DEFAULT 0,
  CONSTRAINT school_fee_structure_pkey PRIMARY KEY (id)
);

CREATE TABLE public.school_report_customizations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL UNIQUE,
  custom_school_name text,
  custom_school_motto text,
  custom_school_address text,
  logo_url text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT school_report_customizations_pkey PRIMARY KEY (id)
);

CREATE TABLE public.school_requirements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  requirement_name text NOT NULL,
  description text,
  cost numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Active',
  boarding_type text DEFAULT 'Day Scholar',
  class_name text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT school_requirements_pkey PRIMARY KEY (id)
);

CREATE TABLE public.school_terms (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  year integer NOT NULL,
  term integer NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  is_current boolean DEFAULT false,
  is_closed boolean NOT NULL DEFAULT false,
  global_term_id uuid,
  CONSTRAINT school_terms_pkey PRIMARY KEY (id)
);

CREATE TABLE public.schools (
  school_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  location text NOT NULL,
  type text NOT NULL,
  admin_id uuid,
  subscription_plan text DEFAULT 'Free (0-20)',
  student_count integer DEFAULT 0,
  wifi_ssid text,
  created_at timestamp without time zone DEFAULT now(),
  next_term_begins_date date,
  location_name text,
  location_latitude numeric,
  location_longitude numeric,
  location_radius integer DEFAULT 100,
  logo_url text,
  motto text,
  website text,
  contact_email text,
  contact_phone text,
  school_code text NOT NULL UNIQUE,
  subtitle text,
  address text,
  pobox text,
  header_school_name_color text DEFAULT '#1e3a8a',
  header_subtitle_color text DEFAULT '#3b82f6',
  header_address_color text DEFAULT '#1e40af',
  header_contact_color text DEFAULT '#1e40af',
  header_motto_color text DEFAULT '#2563eb',
  header_divider_color text DEFAULT '#1e3a8a',
  logo text,
  phone text,
  email text,
  CONSTRAINT schools_pkey PRIMARY KEY (school_id)
);

CREATE TABLE public.student_attendance (
  attendance_id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  class_name text NOT NULL,
  attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  status text DEFAULT 'present',
  remarks text,
  created_at timestamp without time zone DEFAULT now(),
  present boolean DEFAULT true,
  date date DEFAULT CURRENT_DATE,
  teacher_id uuid,
  CONSTRAINT student_attendance_pkey PRIMARY KEY (attendance_id)
);

CREATE TABLE public.student_balances (
  balance_id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  term_id uuid,
  school_id uuid NOT NULL,
  year integer NOT NULL,
  term integer NOT NULL,
  total_fees numeric NOT NULL DEFAULT 0,
  total_paid numeric NOT NULL DEFAULT 0,
  balance numeric NOT NULL DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT student_balances_pkey PRIMARY KEY (balance_id)
);

CREATE TABLE public.student_discounts (
  discount_id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  term_id uuid,
  discount_type text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  percent numeric,
  reason text,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT student_discounts_pkey PRIMARY KEY (discount_id)
);

CREATE TABLE public.student_fees (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  class_name text NOT NULL,
  term_id uuid,
  year integer NOT NULL,
  term integer NOT NULL,
  fee_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  balance numeric NOT NULL DEFAULT 0,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT student_fees_pkey PRIMARY KEY (id)
);

CREATE TABLE public.student_invoices (
  invoice_id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  term_id uuid NOT NULL,
  invoice_number text,
  total_amount numeric NOT NULL DEFAULT 0,
  amount_paid numeric NOT NULL DEFAULT 0,
  balance numeric DEFAULT (total_amount - amount_paid),
  status text NOT NULL DEFAULT 'draft',
  due_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  created_by uuid,
  CONSTRAINT student_invoices_pkey PRIMARY KEY (invoice_id)
);

CREATE TABLE public.student_ledger (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  school_id uuid NOT NULL,
  entry_type text NOT NULL,
  reference_id uuid,
  debit numeric NOT NULL DEFAULT 0,
  credit numeric NOT NULL DEFAULT 0,
  running_balance numeric NOT NULL DEFAULT 0,
  term_id uuid,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT student_ledger_pkey PRIMARY KEY (id)
);

CREATE TABLE public.student_payments (
  payment_id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  amount numeric NOT NULL,
  payment_method text NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  transaction_ref text,
  description text,
  created_at timestamp without time zone DEFAULT now(),
  amount_paid numeric DEFAULT 0,
  receipt_number text,
  reversed_by uuid,
  reversed_at timestamp with time zone,
  reversal_reason text,
  is_reversal boolean NOT NULL DEFAULT false,
  term_id uuid,
  recorded_by uuid,
  notes text,
  invoice_id uuid,
  CONSTRAINT student_payments_pkey PRIMARY KEY (payment_id)
);

CREATE TABLE public.student_photos (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  school_id uuid NOT NULL,
  photo_url text NOT NULL,
  photo_filename text,
  photo_size integer,
  photo_type text,
  is_primary boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT student_photos_pkey PRIMARY KEY (id)
);

CREATE TABLE public.student_requirements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL,
  school_id uuid NOT NULL,
  requirement_id uuid NOT NULL,
  requirement_name text NOT NULL,
  cost numeric NOT NULL,
  status text NOT NULL DEFAULT 'Pending',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT student_requirements_pkey PRIMARY KEY (id)
);

CREATE TABLE public.students (
  student_id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  name text NOT NULL,
  current_class text NOT NULL,
  status text DEFAULT 'active',
  graduation_year integer,
  repeat_year boolean DEFAULT false,
  expected_fee_amount numeric,
  created_at timestamp without time zone DEFAULT now(),
  admission_number text,
  admission_date date DEFAULT CURRENT_DATE,
  gender text,
  address text,
  city text,
  student_phone text,
  student_email text,
  guardian_name text,
  guardian_relationship text,
  guardian_phone text,
  guardian_email text,
  guardian_occupation text,
  guardian_address text,
  stream text,
  previous_school text,
  enrollment_fee numeric,
  payment_status text,
  nationality text,
  religion text,
  date_of_birth date,
  profile_photo_url text,
  updated_at timestamp with time zone DEFAULT now(),
  country text,
  first_name text,
  last_name text,
  middle_name text,
  medical_condition text,
  emergency_contact_name text,
  emergency_contact_phone text,
  blood_group text,
  allergies text,
  boarding_type text DEFAULT 'Day Scholar',
  fee_discount_percent numeric DEFAULT 0,
  inactive_with_balance boolean NOT NULL DEFAULT false,
  academic_class text,
  academic_year_promoted integer,
  enrollment_status text,
  activation_date timestamp with time zone,
  CONSTRAINT students_pkey PRIMARY KEY (student_id)
);

CREATE TABLE public.subjects (
  subject_id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT subjects_pkey PRIMARY KEY (subject_id)
);

CREATE TABLE public.teacher_attendance_logs (
  log_id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  attendance_date date NOT NULL DEFAULT CURRENT_DATE,
  check_in_time timestamp without time zone,
  check_out_time timestamp without time zone,
  status text DEFAULT 'present',
  remarks text,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT teacher_attendance_logs_pkey PRIMARY KEY (log_id)
);

CREATE TABLE public.teacher_class_subjects (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  teacher_id uuid NOT NULL,
  class_name text NOT NULL,
  subject text NOT NULL,
  year integer NOT NULL,
  term integer NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT teacher_class_subjects_pkey PRIMARY KEY (id)
);

CREATE TABLE public.teacher_comment_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  class_name text NOT NULL,
  min_avg numeric NOT NULL,
  max_avg numeric NOT NULL,
  comment text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT teacher_comment_rules_pkey PRIMARY KEY (id)
);

CREATE TABLE public.teacher_remarks_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  subject text NOT NULL,
  min_percent integer NOT NULL,
  max_percent integer NOT NULL,
  remark text NOT NULL,
  comment_text text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  created_by uuid,
  is_default boolean DEFAULT false,
  CONSTRAINT teacher_remarks_settings_pkey PRIMARY KEY (id)
);

CREATE TABLE public.teachers (
  teacher_id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  school_id uuid NOT NULL,
  phone text,
  address text,
  gender text,
  dob date,
  national_id text,
  employee_id text NOT NULL UNIQUE,
  date_of_hire date DEFAULT CURRENT_DATE,
  subjects text[] DEFAULT '{}',
  classes text[] DEFAULT '{}',
  created_at timestamp without time zone DEFAULT now(),
  experience text,
  qualification text,
  updated_at timestamp with time zone DEFAULT now(),
  salary numeric,
  CONSTRAINT teachers_pkey PRIMARY KEY (teacher_id)
);

CREATE TABLE public.term_closures (
  closure_id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  year integer NOT NULL,
  term integer NOT NULL,
  closure_date date NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT term_closures_pkey PRIMARY KEY (closure_id)
);

CREATE TABLE public.termly_projects (
  project_id uuid NOT NULL DEFAULT gen_random_uuid(),
  school_id uuid NOT NULL,
  student_id uuid NOT NULL,
  class_name text NOT NULL,
  subject text NOT NULL,
  project_title text NOT NULL,
  description text,
  year integer NOT NULL,
  term integer NOT NULL,
  marks_obtained numeric,
  total_marks numeric,
  created_at timestamp without time zone DEFAULT now(),
  CONSTRAINT termly_projects_pkey PRIMARY KEY (project_id)
);

CREATE TABLE public.timetable_periods (
  id serial PRIMARY KEY,
  school_id uuid NOT NULL,
  class_name text NOT NULL,
  day_of_week text NOT NULL,
  subject text NOT NULL,
  teacher_id uuid NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE TABLE public.timetables (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  teacher_id uuid,
  school_id uuid NOT NULL,
  class_name text NOT NULL,
  subject text NOT NULL,
  day_of_week integer NOT NULL,
  start_time time without time zone NOT NULL,
  end_time time without time zone NOT NULL,
  room text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT timetables_pkey PRIMARY KEY (id)
);

CREATE TABLE public.users (
  user_id uuid NOT NULL DEFAULT gen_random_uuid(),
  role text NOT NULL,
  email text NOT NULL UNIQUE,
  password_hash text,
  school_id uuid,
  student_id uuid,
  name text NOT NULL,
  created_at timestamp without time zone DEFAULT now(),
  phone text,
  department text,
  position text,
  is_active boolean NOT NULL DEFAULT true,
  employee_id text,
  CONSTRAINT users_pkey PRIMARY KEY (user_id)
);

CREATE TABLE public.writeoff_log (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL,
  amount numeric NOT NULL,
  approved_by uuid NOT NULL,
  reason text NOT NULL,
  approved_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT writeoff_log_pkey PRIMARY KEY (id)
);
```

</details>

---

## 5. Sync Order and Dependency Rules

* **Initial full pull (or bootstrap):** Apply tables in the order given in §3.2 and §3.3 so that every referenced parent row exists before a child row (e.g. `schools` → `school_terms` → `classes` → `users` → `teachers` → `students` → …).
* **Delta pull:** Server returns rows updated after `last_sync_timestamp`; client applies per table in the same dependency order, or in a single batch if the API returns topologically sorted payloads.
* **Push:** Send only rows with `synced = false`, in dependency order (parents before children) so the server can apply without FK errors.
* **Composite PKs:** Tables with composite primary keys (`invoice_sequences`, `receipt_sequences`, `receipt_sequences_per_term`, `parents`) use the same sync columns; identify rows by the full primary key for upsert/delete.

---

## 6. Ensuring Offline and Sync Work Correctly

1. **Schema parity:** Local schema = Supabase columns + sync columns (§2). No extra required columns on the server for sync except those you add via migration.
2. **School filter:** Every sync request (pull/push) MUST be filtered by `school_id` (or list of school IDs) the user is allowed to access.
3. **Soft deletes:** Use `deleted_at` for deletes; on pull, apply as update (set `deleted_at`); locally hide rows where `deleted_at IS NOT NULL` unless showing trash.
4. **Sequences:** For `invoice_sequences`, `receipt_sequences`, `receipt_sequences_per_term`, `admission_sequences`, sync the current counter; on conflict, take max and persist so offline-generated numbers don’t collide.
5. **Report and PDF URLs:** `generated_reports.pdf_url` and similar file references: store files locally and sync metadata; upload binary to cloud when online and then update `pdf_url` in a follow-up sync.

This document is the **single reference** for local table set, sync columns, and apply order so that offline is possible and sync is reliable when online.
