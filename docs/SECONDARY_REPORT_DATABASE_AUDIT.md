# Secondary report data — database audit (living notes)

**Purpose:** Record what exists in Postgres for filling **Standard / Basic / Progressive / Alevel** templates, versus what must be computed or added. Updated as we run discovery SQL.

**Execution order (stages, gates, baseline SQL playbook B1–B7):** [SECONDARY_REPORT_MASTER_PLAN.md](./SECONDARY_REPORT_MASTER_PLAN.md).

**Convention:** One SQL at a time in Supabase; use **No limit** if the editor injects `LIMIT` inside string literals.

---

## Stage B baseline — B1 (`exam_results` primary / unique constraints)

**Purpose (master plan §8):** See how duplicate rows are prevented on `public.exam_results` before Stage D.

Run **only** this in the Supabase SQL editor (then B2, …). **Live result (Supabase project, recorded 2026-04-07):**

| constraint_name | definition |
|-----------------|------------|
| `exam_results_pkey` | `PRIMARY KEY (id)` |
| `exam_results_unique_constraint` | `UNIQUE (exam_set_id, student_id, subject)` |

**Query (B1):**

```sql
SELECT c.conname AS constraint_name,
       pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'exam_results'
  AND c.contype IN ('u', 'p')
ORDER BY c.conname;
```

**Note:** This lists **table constraints** (`PRIMARY KEY` / `UNIQUE`). A `CREATE UNIQUE INDEX` (without a matching constraint) appears in `pg_indexes`, not this result set.

**Repo cross-check:** `20250918_create_exam_results.sql` defines only `PRIMARY KEY (id)`. **`exam_results_unique_constraint` is not created in any tracked migration** — likely added in Supabase directly or via a migration not in this repo. Teacher RPCs use `ON CONFLICT (exam_set_id, student_id, subject)`, which matches the **live** unique key. **Implication for Stage D:** multi-topic (Standard) or multi-paper (A-Level) rows require **replacing** this unique constraint with a wider key (e.g. including `topic` / `paper_number`) or moving to a parent/child row model — you cannot insert two physical rows for the same triple today. Non-unique indexes still include `idx_exam_results_school_exam_set`, `idx_exam_results_school_class`, and partial score indexes from `20250103_add_secondary_exam_columns.sql` / `20250929_add_secondary_fields_exam_results*.sql`.

---

## Stage B baseline — B2 (`exam_results` columns)

**Purpose (master plan §8):** Confirm ECS / secondary and nursery columns exist; compare live `ordinal_position` and types to migrations.

**Live result (Supabase project, recorded 2026-04-07):**

| column_name | data_type | is_nullable |
|-------------|-----------|-------------|
| id | uuid | NO |
| school_id | uuid | NO |
| exam_set_id | uuid | NO |
| student_id | uuid | NO |
| class_name | text | NO |
| subject | text | NO |
| marks_obtained | numeric | YES |
| total_marks | numeric | YES |
| grade | text | YES |
| remarks | text | YES |
| teacher_initials | text | YES |
| created_at | timestamp with time zone | YES |
| updated_at | timestamp with time zone | YES |
| teacher_id | text | YES |
| teacher_comment | text | YES |
| activity_score | numeric | YES |
| descriptor | text | YES |
| exam_score | numeric | YES |
| final_score | numeric | YES |
| overall_remark | text | YES |
| topic | text | YES |
| formative_score | numeric | YES |
| paper_number | text | YES |
| nursery_skill_performance | jsonb | NO |

**Query (B2):**

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'exam_results'
ORDER BY ordinal_position;
```

**Repo cross-check:** Matches expectations for core keys, marks, grade, remarks, timestamps, ECS fields, and `nursery_skill_performance`. **Drift vs tracked migrations:** (1) **`teacher_id` is `text`** on live; `20250103_add_secondary_exam_columns.sql` adds **`uuid` FK** to `teachers` — production may have been altered manually or via an untracked migration. (2) **`teacher_comment`** exists on **`exam_results`** — used by primary upsert patterns in repo (`p_teacher_comment`); no single obvious `ADD COLUMN` for `exam_results.teacher_comment` in the migrations grep (legacy / dashboard SQL). (3) **`paper_number`** **`text`** — present on live; **not** in a tracked `exam_results` migration (aligns with app `p_paper_number`). (4) `information_schema` reports **`numeric`** without precision for score columns; `20251001_fix_activity_score_precision.sql` target types may still apply at attribute level — use `\d exam_results` in `psql` if you need exact typmods. (5) **`UNIQUE (exam_set_id, student_id, subject)`** still conflicts with multiple topics/papers unless `paper_number` / topic are folded into `subject` or the constraint is widened (Stage D).

---

## Stage B baseline — B3 (`processed_secondary_exam_results` primary / unique constraints)

**Purpose (master plan §8):** See how duplicate processed rows are prevented (mirrors `exam_results` shape for reports).

**Live result (Supabase project, recorded 2026-04-07):**

| constraint_name | definition |
|-----------------|------------|
| `processed_secondary_exam_resu_school_id_student_id_exam_set_key` | `UNIQUE (school_id, student_id, exam_set_id, subject)` |
| `processed_secondary_exam_results_pkey` | `PRIMARY KEY (id)` |

**Query (B3):**

```sql
SELECT c.conname AS constraint_name,
       pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace n ON n.oid = t.relnamespace
WHERE n.nspname = 'public'
  AND t.relname = 'processed_secondary_exam_results'
  AND c.contype IN ('u', 'p')
ORDER BY c.conname;
```

**Repo cross-check:** Same logical uniqueness as documented for **`processed_primary_exam_results`** in `20250928_create_processed_primary_exam_results.sql` / `recreate-processed-results-table.sql`: `UNIQUE (school_id, student_id, exam_set_id, subject)` — here with Postgres-truncated auto name `…_school_id_student_id_exam_set_key`. **`exam_results`** live unique omits **`school_id`** but is scoped by `exam_set_id` → school in practice; **processed** includes **`school_id`** explicitly. **Stage D:** If `exam_results` allows multiple rows per subject (topic/paper), decide whether **processed** stays one row per subject (aggregate in trigger/RPC) or gets a widened unique key too.

---

## Stage B baseline — B4 (triggers on `exam_results`)

**Purpose (master plan §8):** List user-defined triggers and functions (feeds processed tables, remarks, defaults, grade-from-marks, timestamps).

**Live result (Supabase project, recorded 2026-04-07):**

| trigger_name | `pg_get_triggerdef` (compressed) |
|----------------|-----------------------------------|
| `trigger_auto_populate_processed_on_exam_insert` | `AFTER INSERT OR UPDATE` → **`auto_populate_processed_on_exam_insert()`** |
| `trigger_auto_update_exam_results_remarks` | `BEFORE INSERT OR UPDATE` → **`auto_update_exam_results_remarks()`** |
| `trigger_set_exam_result_defaults_and_linking` | `BEFORE INSERT` → **`set_exam_result_defaults_and_linking()`** |
| `trigger_set_exam_result_grade` | `BEFORE INSERT OR UPDATE OF marks_obtained, total_marks, grade` → **`set_exam_result_grade_from_marks()`** |
| `trigger_update_updated_at` | `BEFORE UPDATE` → **`update_updated_at_column()`** |

Verbatim:

```text
CREATE TRIGGER trigger_auto_populate_processed_on_exam_insert AFTER INSERT OR UPDATE ON exam_results FOR EACH ROW EXECUTE FUNCTION auto_populate_processed_on_exam_insert()
CREATE TRIGGER trigger_auto_update_exam_results_remarks BEFORE INSERT OR UPDATE ON exam_results FOR EACH ROW EXECUTE FUNCTION auto_update_exam_results_remarks()
CREATE TRIGGER trigger_set_exam_result_defaults_and_linking BEFORE INSERT ON exam_results FOR EACH ROW EXECUTE FUNCTION set_exam_result_defaults_and_linking()
CREATE TRIGGER trigger_set_exam_result_grade BEFORE INSERT OR UPDATE OF marks_obtained, total_marks, grade ON exam_results FOR EACH ROW EXECUTE FUNCTION set_exam_result_grade_from_marks()
CREATE TRIGGER trigger_update_updated_at BEFORE UPDATE ON exam_results FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()
```

**Query (B4):**

```sql
SELECT tgname AS trigger_name,
       pg_get_triggerdef(oid, true) AS trigger_def
FROM pg_trigger
WHERE tgrelid = 'public.exam_results'::regclass
  AND NOT tgisinternal
ORDER BY tgname;
```

**Repo cross-check:** Matches the trigger list already summarized in this doc. No extra or missing triggers vs the *Summary so far* table below. **`EXECUTE FUNCTION`** is Postgres 14+ syntax (same as `EXECUTE PROCEDURE` for trigger functions).

---

## Stage B baseline — B5 (does `teacher_exam_grade_settings` exist?)

**Purpose (master plan §8):** Resolve whether a table with **this exact name** exists (playbook matches the audit wording).

**Live result (Supabase project, recorded 2026-04-07):** **No rows** — there is **no** `public.teacher_exam_grade_settings` table.

**Query (B5):**

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'teacher_exam_grade_settings';
```

**Repo cross-check:** The migration file **`20260404120000_teacher_exam_grade_settings.sql`** does **not** create a table called `teacher_exam_grade_settings`. It adds **`teacher_exam_class_prefs`** (per-class UI prefs, grade remark JSON) and **`teacher_exam_grade_bands`** (percent bands per subject/scale). If those migrations were applied to production, you would still get **no rows** for B5 as written.

**B5 follow-up (live, 2026-04-07):** Both tables exist:

| table_name |
|------------|
| `teacher_exam_class_prefs` |
| `teacher_exam_grade_bands` |

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('teacher_exam_class_prefs', 'teacher_exam_grade_bands')
ORDER BY table_name;
```

---

## Stage B baseline — B6 (`teacher_upsert_exam_result_secondary` overloads)

**Purpose (master plan §8):** Confirm PostgREST-visible signatures (identity arguments only — no defaults in list).

**Live result (Supabase project, 2026-04-07):** **Three** overloads:

| # | `pg_get_function_identity_arguments` |
|---|----------------------------------------|
| 1 | `p_school_id uuid, p_exam_set_id uuid, p_student_id uuid, p_class_name text, p_subject text, p_activity_score numeric, p_descriptor text, p_formative_score numeric, p_exam_score numeric, p_final_score numeric, p_overall_remark text, p_teacher_initials text, p_teacher_id text, p_topic text` |
| 2 | `p_school_id uuid, p_exam_set_id uuid, p_student_id uuid, p_class_name text, p_subject text, p_activity_score numeric, p_descriptor text, p_formative_score numeric, p_exam_score numeric, p_final_score numeric, p_overall_remark text, p_teacher_initials text, p_teacher_id uuid, p_topic text` |
| 3 | `p_school_id uuid, p_exam_set_id uuid, p_student_id uuid, p_class_name text, p_subject text, p_activity_score numeric, p_descriptor text, p_formative_score numeric, p_exam_score numeric, p_final_score numeric, p_overall_remark text, p_teacher_initials text, p_teacher_id uuid, p_topic text, p_grade text` |

**Query (B6):**

```sql
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname = 'teacher_upsert_exam_result_secondary'
ORDER BY args;
```

**Repo cross-check:** Matches **`20260408120000_teacher_upsert_secondary_15arg_set_search_path.sql`** (15-arg overload with `p_teacher_id uuid`, `p_topic`, `p_grade`) plus older 14-arg variants. **None** of the three overloads expose **`p_paper_number`** — the **`exam_results.paper_number`** column (B2) is **not** written by these functions as migrated; if the client passes `p_paper_number`, resolve with PostgREST (unknown param) or extend the RPC in Stage D. **Recommendation:** Call the **`p_teacher_id text`** overload when persisting to **`exam_results.teacher_id`** (live type **text**).

---

## Stage B baseline — B7 (FKs on `class_template_settings`)

**Purpose (master plan §8):** Confirm report routing uses **`report_templates.id`** (UUID), not the text PK **`template_id`**.

**Live result (Supabase project, 2026-04-07):**

| constraint_name | column_name | foreign_table | foreign_column |
|-----------------|-------------|---------------|----------------|
| `class_template_settings_class_teacher_id_fkey` | `class_teacher_id` | `teachers` | `teacher_id` |
| `class_template_settings_school_id_fkey` | `school_id` | `schools` | `school_id` |
| `class_template_settings_template_id_fkey` | `template_id` | `report_templates` | **`id`** |

**Query (B7):**

```sql
SELECT tc.constraint_name,
       kcu.column_name,
       ccu.table_name AS foreign_table,
       ccu.column_name AS foreign_column
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'class_template_settings'
  AND tc.constraint_type = 'FOREIGN KEY'
ORDER BY tc.constraint_name, kcu.ordinal_position;
```

**Repo cross-check:** Matches documented model: **`class_template_settings.template_id` → `report_templates.id`**.

---

## Summary so far

### Core marks

| Object | Role |
|--------|------|
| **`exam_sets`** | `school_id`, `name`, `description`, `term`, `year`, `target_classes[]`, flags. Drives which period a report uses. |
| **`exam_results`** | **Live (B1–B2):** PK `id`; **`UNIQUE (exam_set_id, student_id, subject)`**. Columns: marks pipeline (`marks_obtained`, `total_marks`, `grade`, `remarks`) — marks nullable for nursery; ECS (`activity_score`, `descriptor`, `formative_score`, `exam_score`, `final_score`, `overall_remark`, `teacher_initials`, `topic`); **`paper_number`** (text); per-teacher text **`teacher_id`**, **`teacher_comment`**; **`nursery_skill_performance`** jsonb **NOT NULL**. |
| **`processed_secondary_exam_results`** | **Live (B3):** `PRIMARY KEY (id)`; **`UNIQUE (school_id, student_id, exam_set_id, subject)`** as `processed_secondary_exam_resu_school_id_student_id_exam_set_key`. Denormalised per-subject rows + **`class_teacher_comment`**, **`headteacher_comment`**, **`next_term_begins_date`**. Has **`marks_obtained` / `total_marks` / `grade` / `teacher_remark` / `teacher_initials`** but **not** the rich secondary score breakdown (`formative_score`, etc.) — reports may need **`exam_results`** for those. |

### Triggers on `exam_results`

**Live detail:** *Stage B baseline — B4* (verbatim `pg_get_triggerdef`).

| Trigger | When | Function |
|--------|------|----------|
| `trigger_auto_populate_processed_on_exam_insert` | AFTER INSERT OR UPDATE | **`auto_populate_processed_on_exam_insert()`** — likely upserts **`processed_*`** rows. |
| `trigger_auto_update_exam_results_remarks` | BEFORE INSERT OR UPDATE | **`auto_update_exam_results_remarks()`** |
| `trigger_set_exam_result_defaults_and_linking` | BEFORE INSERT | **`set_exam_result_defaults_and_linking()`** |
| `trigger_set_exam_result_grade` | BEFORE INSERT OR UPDATE OF `marks_obtained`, `total_marks`, `grade` | **`set_exam_result_grade_from_marks()`** — primary-style marks path. |
| `trigger_update_updated_at` | BEFORE UPDATE | **`update_updated_at_column()`** |

### Identity & header

| Object | Role |
|--------|------|
| **`students`** | `name`, names split, `current_class`, `stream`, `admission_number`, DOB, gender, photo URL, guardians, fees fields, `academic_class`, etc. **No** A-Level `combination`, **LIN**, house on this table (as audited). |
| **`schools`** | Identity for header: `name`, `address`, `pobox`, `location`, `motto`, `logo`/`logo_url`, phones, emails, `website`, `school_code`, `next_term_begins_date`, header colours. |
| **`teachers`** | `teacher_id`, `name`, etc. Join when `exam_results.teacher_id` matches **`teachers.teacher_id`** (live column is **`text`**, often a UUID string). **No `initials` column** — use **`exam_results.teacher_initials`**. |

### Attendance (Standard template block)

| Object | Role |
|--------|------|
| **`student_attendance`** | Daily rows: `attendance_date`, `date`, `status`, `present`, `class_name`. Aggregate present/absent for term window. |

### Comments & titles (defaults + overrides)

| Object | Role |
|--------|------|
| **`report_title_settings`** | School: `title_template` (e.g. `{term}`), `use_dynamic_term`. |
| **`class_teacher_comments_settings`** | `school_id` + `class_name`: percent bands → `comment` / `comment_text`. |
| **`headteacher_comments_settings`** | `school_id` only: percent bands → `comment`. |
| **`teacher_remarks_settings`** | `school_id` + `subject`: percent bands → `remark` / `comment_text`. |

### Class → template routing

| Object | Role |
|--------|------|
| **`class_template_settings`** | **Live (B7):** FKs `school_id` → `schools`, **`template_id` → `report_templates.id`**, `class_teacher_id` → `teachers.teacher_id`. Also `class_name`, `is_o_level`, `is_primary`, etc. |
| **`report_templates`** | **PK = `template_id`**. **`id` is separate UUID** with **UNIQUE** index. FK from `class_template_settings` references **`id`**. `name`, `content` (JSON template), `html_content`, `css_content`, `school_id`, `is_default`, `is_primary`. |

### Fees (Progressive footer)

| Object | Role |
|--------|------|
| **`student_fees`** | `student_id`, `school_id`, `class_name`, `year`, `term`, optional `term_id`; `fee_amount`, `paid_amount`, **`balance`**. Join to `exam_sets` term/year for report. |
| **`student_invoices`** | **`invoice_id`**, **`school_id`**, **`student_id`**, **`term_id`** (likely **`school_terms.id`**), **`invoice_number`**, **`total_amount`**, **`amount_paid`**, **`balance`**, **`status`**, **`due_date`**, **`invoice_label`**, **`is_supplementary`**. Alternative or duplicate source for **fees balance** on **Progressive**; reconcile with **`student_fees`** (which is keyed by year/term integers too). |
| **`student_payments`** | **`payment_id`**, **`school_id`**, **`student_id`**, **`amount`** / **`amount_paid`**, **`payment_method`**, **`payment_date`**, optional **`term_id`**, **`invoice_id`**, reversal fields, **`receipt_total_remaining_balance`**. Feeds **`student_invoices.amount_paid`** / balance; use for audit trail if printed balance must match receipts. |

### Term calendar & related

| Object | Role (from name only until columns audited) |
|--------|---------------------------------------------|
| **`global_terms`** | **`id`**, **`year`**, **`term`**, **`term_name`**, **`window_start`**, **`window_end`**, **`hard_stop_date`**. Shared calendar; **`school_terms.global_term_id`** can reference **`global_terms.id`** for consistent labels and grading windows. |
| **`school_terms`** | **`id`** (UUID), **`school_id`**, **`year`**, **`term`**, **`start_date`**, **`end_date`**, **`is_current`**, **`is_closed`**, optional **`global_term_id`**. Use to align **`exam_sets`** and **`student_fees.term_id`**, and to bound **`student_attendance`** aggregations. |
| **`term_closures`** | **`closure_id`**, **`school_id`**, **`year`**, **`term`**, **`closure_date`**. Gives **term closing** date per school/year/term. **No “opening” date** here — use **`schools.next_term_begins_date`**, **`processed_secondary.next_term_begins_date`**, or extend schema if you need both on every card. |
| **`receipt_sequences_per_term`** | Fee receipts numbering per term. |
| **`termly_projects`** | **`project_id`**, **`school_id`**, **`student_id`**, **`class_name`**, **`subject`**, **`project_title`**, **`description`**, **`year`**, **`term`**, **`marks_obtained`**, **`total_marks`**. **Gap vs Standard card:** sample shows **Remark**, **Score /10**, **Teacher** — this table has **`description`** (could map to remark) and marks but **no `teacher` / `teacher_initials` column**; **`total_marks`** may represent /10 if business rules set it. |

### Missing / not in DB (as checked)

- **`teacher_exam_grade_settings`** — **no such table name** on live (**B5**). **`teacher_exam_class_prefs`** and **`teacher_exam_grade_bands`** **are present** (**B5 follow-up**).
- **`processed_*`** for secondary: only **`processed_secondary_exam_results`** (plus primary processed table).

### `teacher_upsert_exam_result_secondary` (live overloads)

**Verbatim argument lists:** *Stage B baseline — B6*. **Three** overloads; PostgREST picks by request signature:

| # | `p_teacher_id` | Extra | Notes |
|---|----------------|--------|--------|
| 1 | **text** | — | Aligns with **`exam_results.teacher_id` as `text`** (preferred for live DB). |
| 2 | **uuid** | — | Stricter typing; assign/cast when writing to **text** `teacher_id`. |
| 3 | **uuid** | **`p_grade text`** | Typical **Vite** teacher exam save path. |

Ensure the client calls the overload you intend. **`p_paper_number`** is **not** part of these signatures (see B6).

---

### Design constraints (report implications)

1. **One `exam_results` row per `(exam_set_id, student_id, subject)`** — enforced in **live** Postgres by `exam_results_unique_constraint`. Multi-topic (Standard) or multi-paper (A-Level) needs **either** composite `subject` strings, **extending/dropping that UNIQUE** to include `topic` / `paper_number` / **paper code**, or a **parent/child schema** (Stage D).
2. **`processed_secondary`** duplicates head/class comments on **every subject row** — pick one row when rendering.
3. **`report_templates`**: **`class_template_settings.template_id` → `report_templates.id`** (UUID) — **confirmed live (B7)**. Do not confuse with text PK **`report_templates.template_id`**.

4. **`processed_secondary_exam_results`**: **no triggers** — rows are filled only by app or by **`auto_populate_processed_on_exam_insert`** on **`exam_results`** (verify function body in DB when tightening behaviour).

### A-Level (S.5–S.6) papers — product input (for Stage C / D)

**Canonical expanded write-up:** [SECONDARY_REPORT_MASTER_PLAN.md §1b](./SECONDARY_REPORT_MASTER_PLAN.md). Below is a short summary; implement in lockstep with that section.

**Captured from product discussion (2026-04-07, refined):**

- **Scope:** Senior 5 and Senior 6. A subject can have **one or more papers** (e.g. Geography → Paper 1 and Paper 2).
- **Official codes:** Papers use UNEB-style labels on the card and in UIs (example: **P250/1**, **P250/2**). The **PAPER** column on **`template4`** should reflect these codes, not a guessed default.
- **School configuration:** From **system settings**, each school decides **how subjects are split** (“dissected”) into papers — some subjects multi-paper, some single-paper; **not** one global default for all subjects. **`uace_subject_catalog`** lists subject **names**; **paper lists and codes** are **school-maintained** (optional global reference table may **suggest** codes only).
- **Teachers:** Different teachers may be assigned to **different papers** of the same subject (e.g. one teacher Geography Paper 1, another Geography Paper 2). Schema needs **paper-level** (or equivalent) assignment for S5–S6.
- **Schema/UI linkage:** Aligns with **`exam_results.paper_number`** (B2); **live UNIQUE `(exam_set_id, student_id, subject)`** still blocks true multi-paper rows until **Stage D**. Extend **`teacher_upsert_exam_result_secondary`** with paper identity; see **[`UACE_ALEVEL_GRADING_LOGIC.md`](./UACE_ALEVEL_GRADING_LOGIC.md)** for grades/points after marks exist.

---

## Stage C — Documentation sync (master plan)

**Cross-reference:** [SECONDARY_REPORT_CARD_TEMPLATES_PLAN.md §7](./SECONDARY_REPORT_CARD_TEMPLATES_PLAN.md) (*Stage C — Data contract*).

| Master plan item | Recorded |
|------------------|----------|
| **(a) Read path per block** | **§7.2** in templates plan: ECS/rich marks from **`exam_results`**; class/head/next-term from **`processed_secondary_exam_results`** (dedupe comments); attendance/projects/term dates as listed in **§7.4** / audit. |
| **(b) Progressive fees — single source** | **§7.2b:** **`student_invoices.balance`** for term-matched invoice; **fallback** **`student_fees.balance`** (same school, student, year/term as **`exam_sets`**). |
| **(c) Multi-topic / multi-paper** | **§7.1** + audit *Design constraints*: **Stage D** widens uniqueness + RPC ( **`paper_code` / `paper_number` / topic** ); processed table either aggregates or gains matching key — **not** decided D1-a vs D1-b here; contract assumes shaped rows post-D. |

---

## Have vs gaps (working summary — refine before build)

**Goal:** Know what the DB + triggers already supply vs what the four templates still need, then close gaps deliberately. **A-Level (S.5–S.6)** extra rules will be specified separately by product owner; current repo UI often saves A-Level like primary marks only — **not** enough for the **Alevel** sample (papers, UACE subgrades, passes/points, charts).

| Area | We have (audited) | Gaps / risks |
|------|-------------------|--------------|
| **O-Level marks (ECS-style)** | `exam_results`: activity, descriptor, formative, exam, final, overall_remark, topic, initials, grade; RPC overloads; **UNIQUE (exam_set, student, subject)** on live DB | Standard multi-topic & A-Level multi-paper need **constraint/RPC change** (Stage D) — not only app conventions |
| **Processed secondary** | Comments, next term, denormalised marks per subject | **No** formative/activity/exam columns; comments duplicated per subject row |
| **Student strip** | `students` + photo, stream, admission, class | **Combination (A-Level), LIN, house** not on `students` |
| **Header** | `schools` + title template | Multiple phone lines, report serial **No. S418**-style — optional settings |
| **Term / title** | `exam_sets`, `global_terms`, `school_terms`, `report_title_settings` | Wire consistently in generators |
| **Closing / next term** | `term_closures.closure_date`, `schools.next_term_begins_date`, `processed_secondary.next_term_begins_date` | **Opening date** not in `term_closures` alone |
| **Attendance** | `student_attendance` | Aggregate for date range; resolve **`attendance_date` vs `date`** |
| **Class / head comments** | `processed_secondary`, band tables (`class_teacher_comments_settings`, etc.) | A-Level **Principal** vs **Headteacher** labelling |
| **Per-subject default remarks** | `teacher_remarks_settings` | — |
| **Fees balance (Progressive)** | `student_fees`, `student_invoices`, `student_payments` | **Single** source of truth for printed balance |
| **Termly projects (Standard)** | `termly_projects` | **No teacher column**; remark vs `description` |
| **Template routing** | **B7:** `class_template_settings.template_id` → **`report_templates.id`** | App must not use text PK `report_templates.template_id` for this FK |
| **A-Level papers (S.5–S.6)** | `exam_results.paper_number`; product: school-configured multi-paper subjects + codes | **UNIQUE** + RPC today assume one row per subject; **Stage D** + school settings for dissection / teacher-per-paper |
| **Teacher exam grade settings** | **B5 / follow-up:** no `teacher_exam_grade_settings`; **`teacher_exam_class_prefs`** + **`teacher_exam_grade_bands`** **exist** on live | Wire templates/UI to bands prefs if reports need teacher-defined grade bands |
| **Charts / class averages (Alevel)** | — | **Not stored** — compute or new tables |
| **Zoraki / QR** | — | URL + username rule (e.g. `admission@school_code`) |

---

## Post–Stage D (repo migrations `20260526120000` + `20260527120000`)

**Verification:** Run sections V1–V4 in [`scripts/verify-secondary-stage-d-migrations.sql`](../scripts/verify-secondary-stage-d-migrations.sql) on the target Supabase project (one query group at a time per master plan §8).

| Check | Expected after migrations |
|-------|---------------------------|
| **`exam_results` uniqueness** | Line-level unique index including topic + paper dimensions, e.g. **`exam_results_exam_student_subject_line_uidx`** (see migration DDL — may appear in `pg_indexes` rather than `pg_constraint` for UNIQUE indexes). |
| **`exam_results` columns** | **`paper_code`**; generated **`exam_topic_key`**, **`exam_paper_key`** (if defined in migration). |
| **`teacher_upsert_exam_result_secondary`** | Overload(s) with **`p_paper_code`**, **`p_paper_number`** for ECS / line upsert. |
| **`teacher_upsert_exam_result_alevel`** | Single public signature with **13** identity arguments; **`GRANT EXECUTE`** must list **13** types (fix migration `20260527120000` if grant drifted). |
| **`school_uace_class_subject_papers`** | School-scoped paper list for Senior 5–6 subjects (master plan §1b); admin UI + teacher exam grid consume **`paper_code`**. |
| **`processed_secondary_exam_results`** | Updated unique key / columns aligned with migration (mirror line keys where applicable). |

**Read paths (contract sync):** Same as §7.2 in [SECONDARY_REPORT_CARD_TEMPLATES_PLAN.md](./SECONDARY_REPORT_CARD_TEMPLATES_PLAN.md): rich marks and breakdown from **`exam_results`**; deduped narrative from **`processed_secondary_exam_results`**; **Progressive fees** per §7.2b (`student_invoices` then **`student_fees`**). **template4** PAPER column: prefer **`exam_results.paper_code`** when set; fallback **`paper_number`**; configuration source **`school_uace_class_subject_papers`**.

---

## Follow-up (your input)

- **A-Level (UACE):** Grading and points in **[`UACE_ALEVEL_GRADING_LOGIC.md`](./UACE_ALEVEL_GRADING_LOGIC.md)**. **Paper/subject model** (multi-paper, UNEB-style codes, school dissection, teacher-per-paper) — *Design constraints — A-Level papers* above; fold into Stage C mapping and Stage D marks model.

---

## SQL checklist (run order)

0. **Stage B B1** — `exam_results` PK/unique constraints — **done** (see *Stage B baseline — B1*: `exam_results_pkey`, `exam_results_unique_constraint`)
0b. **Stage B B3** — `processed_secondary_exam_results` PK/unique — **done** (see *Stage B baseline — B3*)
0c. **Stage B B4** — triggers on `exam_results` — **done** (see *Stage B baseline — B4*)
0d. **Stage B B5** — `teacher_exam_grade_settings` exists? — **done** — **no**; **follow-up:** `teacher_exam_class_prefs` + `teacher_exam_grade_bands` — **present** (see *Stage B baseline — B5*)
0e. **Stage B B6** — `teacher_upsert_exam_result_secondary` overloads — **done** (see *Stage B baseline — B6*)
0f. **Stage B B7** — FKs on `class_template_settings` — **done** (see *Stage B baseline — B7*: `template_id` → `report_templates.id`)
1. `exam_sets` columns — done  
2. `exam_results` columns — **done** (see *Stage B baseline — B2* live table)  
3. `exam_results` indexes — done  
4. `students` columns — done  
5. `schools` columns — done  
6. `teachers` columns — done  
7. Tables `ILIKE '%processed%'` — done  
8. `processed_secondary_exam_results` columns — done  
9. `processed_secondary_exam_results` indexes — done  
10. `student_attendance` columns — done  
11. `teacher_exam_grade_settings` — **absent** (B5); **`teacher_exam_class_prefs`**, **`teacher_exam_grade_bands`** — **present** (B5 follow-up)  
12. Tables `ILIKE '%setting%'` — done  
13. `report_title_settings` — done  
14. `class_teacher_comments_settings` — done  
15. `headteacher_comments_settings` — done  
16. `teacher_remarks_settings` — done  
17. `class_template_settings` — done  
18. FKs on `class_template_settings` — **done** — *Stage B baseline — B7*  
19. `report_templates` columns — done  
20. PK on `report_templates` — **`template_id`**  
21. Indexes on `report_templates` — `id` UNIQUE  
22. Fee-related table names — done  
23. `student_fees` columns — done  
24. Tables `ILIKE '%term%'` — done: `global_terms`, `receipt_sequences_per_term`, `school_terms`, `term_closures`, `termly_projects`  
25. `school_terms` columns — done  
26. `termly_projects` columns — done  
27. `term_closures` columns — done  
28. `global_terms` columns — done  
29. `student_invoices` columns — done  
30. `student_payments` columns — done  
31. Functions `ILIKE '%secondary%'` — only `teacher_upsert_exam_result_secondary` (3 overloads)  
32. `teacher_upsert_exam_result_secondary` argument overloads — **done** — *Stage B baseline — B6* (**text** / **uuid** / **uuid + p_grade**; no `p_paper_number`)  
33. Triggers on `exam_results` — **done** — *Stage B baseline — B4* (same five as summary table)  
34. Triggers on `processed_secondary_exam_results` — **none**  

---

*Last updated: 2026-04-08 (Post–Stage D verification notes; Stage C read paths + template4 paper source; B6/B1 follow-up after line-key migration)*
