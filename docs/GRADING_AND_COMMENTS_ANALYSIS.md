# Grading & Comments System – Analysis (c1e76a5 + Supabase)

This document summarizes how grading and comments work in the codebase and database, and how they differ between **Primary** and **Secondary** schools. It also describes **where the remarks on generated reports come from** (admin report generator) and how to verify them.

---

## 1. How we know Primary vs Secondary

- **Source:** `schools.type` in Supabase.
- **Values:** `'Nursery/Primary'` | `'Secondary'`.
- **Usage:** Teacher app uses `schoolType === 'Nursery/Primary'` for `isPrimary` (e.g. Exam Results, report generation). The **Grading System** page should show only the scale that applies to the teacher's school type.

---

## 2. Where do the "Teacher Remarks" on the report come from?

When you use **Admin Dashboard → Reports → Student Report Generator** (select Term, Exam Set, Class, then Generate/Preview), the report shows a **Remarks** column per subject. Those values come from:

1. **Snapshot creation** (`createSnapshotFromExamSet` in `src/services/snapshotLock.ts`):
   - Data is read from **`exam_results`** only (not from `processed_primary_exam_results`).
   - For each subject row, the snapshot stores: `teacher_comment = result.teacher_comment if present, else result.remarks`.
   - So the remarks you see on the generated report are **`exam_results.teacher_comment`** or **`exam_results.remarks`** (Pass/Fail) at the time the snapshot was created.

2. **Processed table** (`processed_primary_exam_results`):
   - A trigger on `exam_results` runs `process_exam_results_for_student`, which fills **`processed_primary_exam_results.teacher_remark`** from **`teacher_remarks_settings`** (by subject and percentage band). So the DB has "comment text" per subject in the processed table.
   - The **report generator does not currently read from the processed table** when building the snapshot; it only reads `exam_results`. So if you see meaningful remarks on reports (e.g. "Good work. Keep it up!"), they are either:
     - From **`exam_results.teacher_comment`** (saved when the teacher entered results), or
     - From **`exam_results.remarks`** (e.g. Pass/Fail) when `teacher_comment` is empty.

**Summary:** Teacher remarks on the report are in the system: they come from **`exam_results.teacher_comment`** or **`exam_results.remarks`**. The settings-based remarks in **`processed_primary_exam_results.teacher_remark`** (from `teacher_remarks_settings`) are populated by the trigger but are not yet used when building the report snapshot; that could be improved so reports use the processed remarks when available.

---

## 3. Primary school – grading & comments

### 3.1 Grade scale (marks → grade)

- **In code:** `src/lib/reportUtils.ts` – `PRIMARY_GRADE_SCALE` (D1–F9 by percentage). Used by `calculatePrimaryGrade(marks, totalMarks)`.
- **In DB:** `public.grading_scale` – default scale has `school_id = NULL` (D1–F9). **School-specific rows** (`school_id` set) allow overrides; currently **no school-specific rows exist** in the DB (all schools use the default). Goal: let schools **edit, add, remove** their own grading scale on the Grading System page.
- **Where stored:** When a teacher saves marks, the app computes `grade` and `remarks` (Pass/Fail) and saves them in `exam_results` via `teacher_upsert_exam_result_primary`.

### 3.2 Exam results (primary)

- **Table:** `public.exam_results`
- **Relevant columns:** `marks_obtained`, `total_marks`, `grade`, `remarks`, `teacher_id`, `teacher_comment`, `overall_remark`.
- **RPC:** `teacher_upsert_exam_result_primary(...)` – teacher sends marks, grade, remarks, overall_remark/teacher_comment; backend upserts one row per student/subject/exam_set.

### 3.3 Comments that appear on the report (primary)

- **Teacher's remark (per subject) on the report:**
  - **Source for display:** Report generator uses **`exam_results.teacher_comment`** or **`exam_results.remarks`** (from snapshot). In the DB, **`teacher_remarks_settings`** (per school, per subject): `min_percent`, `max_percent`, `comment_text`. The trigger `process_exam_results_for_student` matches subject percentage to a range and writes **`teacher_remark`** into **`processed_primary_exam_results`**. So the "settings-based" remarks exist in the processed table; the snapshot builder does not yet use them.
  - **Who can edit:** RLS on `teacher_remarks_settings` allows authenticated users in the school (including teachers). Teachers or admin can edit these to change what could be shown on the report (once the report flow uses processed table or we backfill exam_results from it).

- **Class teacher's comment (per student, one per report):**
  - **Source:** `class_teacher_comments_settings` (per school, per class): `min_percent`, `max_percent`, `comment_text`. Based on **student average** across all subjects.
  - **Flow:** Same processing function computes student average, finds matching range in `class_teacher_comments_settings`, writes `class_teacher_comment` in `processed_primary_exam_results`. Snapshot builder resolves class teacher comment from `class_teacher_comments_settings` (and `report_comments`) when building snapshot data.
  - **Who can edit:** RLS allows school users with role admin/owner/head_teacher/teacher.

- **Default remark (per class):**
  - **Source:** `teacher_remarks_defaults`: `school_id`, `class_name`, `default_remark` (free text). One row per school/class.
  - **Status:** Table is defined in migration `20251017_create_teacher_remarks_defaults.sql` but **may not exist** on all Supabase projects (migration not applied). Optional fallback when no band in `class_teacher_comments_settings` matches.

### 3.4 Processed table (primary reports)

- **Table:** `public.processed_primary_exam_results`
- **Columns used on report:** `subject`, `marks_obtained`, `total_marks`, `grade`, `teacher_remark`, `teacher_initials`, `class_teacher_comment`.
- **Population:** Automatically by trigger when `exam_results` is inserted/updated/deleted. Not used by the current snapshot builder for per-subject remarks; snapshot uses `exam_results` only.

---

## 4. Secondary school – grading & comments

### 4.1 Grade scale (marks → grade)

- **In code:** `src/lib/reportUtils.ts` – **`UGANDA_GRADE_SCALE`** is **A–E** (not A–F): A, B, C, D, E. Used by `calculateGrade(marks, totalMarks)`. Divisions from `calculateDivision(average)`. E is the lowest grade (0–49%); F has been removed.
- **In DB:** Secondary scale can be stored in `public.grading_scale` with `school_id` set and grade codes A–E; default can be code-only or seeded. No separate remarks settings table for secondary; comments are free-text in `exam_results.overall_remark`.

### 4.2 Exam results (secondary)

- **Table:** Same `public.exam_results`, different columns used.
- **Relevant columns:** `activity_score`, `descriptor`, `formative_score`, `exam_score`, `final_score`, `overall_remark`, `teacher_initials`, `topic`.
- **RPC:** `teacher_upsert_exam_result_secondary(...)` – teacher sends scores and overall_remark; comment per subject is free-text in `overall_remark`.

### 4.3 Comments that appear on the report (secondary)

- **Overall remark:** Stored in `exam_results.overall_remark` and `teacher_initials`; teacher enters them when saving secondary results. No separate remarks settings table for secondary.

---

## 5. Summary table

| Aspect | Primary | Secondary |
|--------|--------|-----------|
| **Grade scale** | D1–F9 (reportUtils or grading_scale) | **A–E** + points (reportUtils; F removed) |
| **Where grade is stored** | `exam_results.grade` (and processed_primary_exam_results) | Not stored in exam_results RPC; may be computed in reports |
| **Teacher's remark (per subject)** | Report shows `exam_results.teacher_comment` or `exam_results.remarks` (snapshot). Processed table has `teacher_remark` from `teacher_remarks_settings` (trigger) but snapshot does not use it yet. | Teacher types `overall_remark` → `exam_results.overall_remark` |
| **Class teacher comment** | From `class_teacher_comments_settings` by average % → snapshot uses it when building report. | N/A |
| **Who edits remark text** | Teachers/admins edit `teacher_remarks_settings` and `class_teacher_comments_settings`. | Teacher edits when entering results (`overall_remark`) |
| **Grading scale in DB** | Default only (`school_id IS NULL`). No school-specific rows yet; goal: full CRUD per school. | N/A in grading_scale |

---

## 6. Admin Report Generator flow (where data comes from)

1. User selects **Term**, **Exam Set**, **Class**, and optionally **Student** on the Student Report Generator page.
2. **Snapshot creation** (`createSnapshotFromExamSet`): reads **`exam_results`** (and students, exam_sets, attendance, fees, etc.). For each result row it stores in **`report_snapshot_data`**: marks, grade, **teacher_comment** (from `exam_results.teacher_comment` or `exam_results.remarks`), class_teacher_comment (from `class_teacher_comments_settings` / `report_comments`), headteacher_comment, etc. It does **not** read `processed_primary_exam_results.teacher_remark` for the snapshot.
3. **Report generation** (`generateReportsBulkClient`): reads **`report_snapshot_data`** and builds **`report_data`** per student; the template receives `teacher_remark` / `teacher_comment` from the snapshot row (i.e. from exam_results at snapshot time).
4. **Templates** (`primaryReportTemplates.tsx`, `ReportPreviewFromData`): display `teacher_remark ?? remarks ?? teacher_comment` from the report data. So the remarks you see = what was in exam_results (or derived) when the snapshot was created.

---

## 7. SQLs you can run in Supabase (inspect and verify)

```sql
-- School type (Primary vs Secondary)
SELECT school_id, name, type FROM public.schools LIMIT 5;

-- Primary: default grade scale
SELECT * FROM public.grading_scale WHERE school_id IS NULL ORDER BY min_pct DESC;

-- Primary: school-specific grade scale (currently none)
SELECT school_id, grade_code, min_pct, max_pct
FROM public.grading_scale WHERE school_id IS NOT NULL ORDER BY school_id, min_pct DESC LIMIT 20;

-- Primary: teacher's remarks settings (per subject, % bands → comment)
SELECT school_id, subject, min_percent, max_percent, comment_text
FROM public.teacher_remarks_settings
ORDER BY school_id, subject, min_percent LIMIT 20;

-- Primary: class teacher comments settings (per class, average % → comment)
SELECT school_id, class_name, min_percent, max_percent, comment_text
FROM public.class_teacher_comments_settings
ORDER BY school_id, class_name, min_percent LIMIT 20;

-- Primary: default remark per class (table may not exist if migration not applied)
-- SELECT * FROM public.teacher_remarks_defaults ORDER BY school_id, class_name LIMIT 10;

-- WHERE REMARKS ON THE REPORT COME FROM: exam_results (per subject)
SELECT er.student_id, er.subject, er.marks_obtained, er.total_marks, er.grade,
       er.remarks, er.teacher_comment, er.teacher_initials
FROM public.exam_results er
WHERE er.school_id = 'YOUR_SCHOOL_ID'
  AND er.exam_set_id = 'YOUR_EXAM_SET_ID'
ORDER BY er.student_id, er.subject
LIMIT 30;

-- Processed table: teacher_remark from teacher_remarks_settings (trigger)
SELECT student_id, subject, marks_obtained, total_marks, grade,
       teacher_remark, teacher_initials, class_teacher_comment
FROM public.processed_primary_exam_results
WHERE school_id = 'YOUR_SCHOOL_ID'
  AND exam_set_id = 'YOUR_EXAM_SET_ID'
ORDER BY student_id, subject
LIMIT 30;

-- Exam results columns (primary vs secondary usage)
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'exam_results'
ORDER BY ordinal_position;

-- Processed primary columns (what goes to report when using processed table)
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'processed_primary_exam_results'
ORDER BY ordinal_position;
```

Replace `YOUR_SCHOOL_ID` and `YOUR_EXAM_SET_ID` with real UUIDs to compare **exam_results** (what the report generator uses) vs **processed_primary_exam_results** (settings-based remarks from the trigger).

---

## 8. What the Grading System page should show (by school type)

**Critical:** The teacher dashboard must **strictly separate** Primary and Secondary. A **Primary** teacher must **never** see the Secondary grading scale; a **Secondary** teacher must **never** see the Primary scale or the remarks/comment settings tables. Use `schools.type` to decide what to show.

- **Nursery/Primary (Primary 1 – Primary 7):**
  - **Grading scale:** Show only the **Primary** scale (D1–F9). Load from `grading_scale` (default `school_id IS NULL` or school-specific). Full CRUD: **add** bands, **edit** min/max/grade, **remove** bands, **adjust** ranges. Schools can copy the default and customize for their `school_id`.
  - **Teacher's Remarks:** Section to manage **`teacher_remarks_settings`** (per subject, per percentage band). Full CRUD: add/edit/delete bands, edit comment text. These drive the per-subject remarks on reports (via `exam_results.teacher_comment` when saving results and via trigger into `processed_primary_exam_results.teacher_remark`).
  - **Class Teacher's Comments:** Section to manage **`class_teacher_comments_settings`** (per class, per average % band). Full CRUD: add/edit/delete bands, edit comment text. Used for the single class teacher comment per student on the report.
  - Optionally: `teacher_remarks_defaults` per class if the table exists (fallback when no band matches).
- **Secondary (Senior 1 – Senior 4; Senior 5 – Senior 6 has its own scale, to be refined):**
  - **Grading scale only:** Show the **Secondary** scale **A–E** (not A–F). Points and divisions as in code. Full CRUD: schools can customize their scale (store in `grading_scale` with grade_code A–E). No Teacher's Remarks or Class Teacher's Comments settings—comments are entered as free text (`overall_remark`) when entering results.
- **Nursery/Kindergarten (Baby Class, Middle Class, Top Class):**
  - Have their own grading/assessment system. To be discussed and implemented later; keep the Grading System page focused on Primary (P1–P7) and Secondary (S1–S4 / S5–S6) for now.

---

## 9. Verified state (from run-through)

| Check | Result |
|--------|--------|
| `schools.type` | ✓ Primary / Secondary |
| `grading_scale` (default D1–F9) | ✓ Present |
| `grading_scale` (school-specific) | No rows – all use default; add CRUD for schools |
| `teacher_remarks_settings` | ✓ Per subject, 4 bands |
| `class_teacher_comments_settings` | ✓ Per class, 4 bands |
| `teacher_remarks_defaults` | Table in migration; not applied on all DBs |
| `exam_results` columns | ✓ Primary + secondary columns |
| `processed_primary_exam_results` columns | ✓ Includes `teacher_remark`, `class_teacher_comment` |
| Report generator source for remarks | `exam_results.teacher_comment` / `exam_results.remarks` (snapshot); processed table has settings-based remarks but snapshot does not use them yet |

---

## 10. Verified end-to-end flow (from SQL run-through)

We confirmed with live data (Rakai Infant Primary School, End of Term Term 3 2025):

1. **exam_results** holds per-subject `teacher_comment`, `remarks`, and `teacher_initials`. Values like "Excellent! Keep shining!", "Good work. Keep it up!", "Fair work. You can do better.", "Needs more effort. Try harder next time." match **teacher_remarks_settings** bands. For MISSED entries, `remarks = 'MISSED - Entry created automatically'`, `teacher_comment` null.
2. **processed_primary_exam_results** holds the same `teacher_remark` text (filled by trigger from `teacher_remarks_settings`) and **class_teacher_comment** per student (from `class_teacher_comments_settings` by student average).
3. The **report generator** reads **exam_results** when building the snapshot, so the Teacher's Remarks column on the report = `exam_results.teacher_comment` or `exam_results.remarks`. Editing **teacher_remarks_settings** and **class_teacher_comments_settings** changes what gets written when results are saved and what the trigger puts in the processed table; the report shows what was in exam_results at snapshot time.

So teachers **can** control report remarks by editing **Teacher's Remarks** and **Class Teacher's Comments** on the Grading System page; new/updated results will then save the matching comment text into exam_results and it will appear on the next generated report.

---

## 11. Grading System page – implementation summary

- **URL:** Teacher dashboard → Grading System (e.g. `/dashboard/teacher/grading-system`).
- **Primary teachers only see:** Primary grading scale (D1–F9) with full CRUD; Teacher's Remarks settings **only for subjects they are assigned to** (from `teacher_class_subjects`); Class Teacher's Comments settings **only for classes they are assigned to** (from `teacher_class_subjects` and `class_teachers`). Admin, owner, and head_teacher see all subjects and classes. So a teacher who only teaches SST and P4 will not see or edit English, and English will not appear on their dashboard.
- **Secondary teachers only see:** Secondary grading scale (A–E, no F) with full CRUD; no remarks/comment settings (comments are free text when entering results).
- **Secondary scale in code:** A–E only; `UGANDA_GRADE_SCALE` and `calculateGrade` use E for 0–49%, not F.

---

## 12. Supabase: RLS and migrations

- **grading_scale:** Migration `20260223100000_grading_system_teacher_rls.sql` updates RLS so **teachers** (and admin, owner, head_teacher) can INSERT/UPDATE/DELETE their school's grading scale rows (`school_id` = their school). Default scale (`school_id IS NULL`) stays read-only. Apply this migration so the Grading System page "Copy to my school" and future scale edits work for teachers.
- **teacher_remarks_settings:** RLS already allows teachers (and admin, owner, head_teacher, etc.) to SELECT/INSERT/UPDATE/DELETE for their school (`current_school_id()`). No change needed.
- **class_teacher_comments_settings:** RLS already allows teachers and admins for their school. No change needed.
- **To apply:** Run `supabase db push` or apply the migration `20260223100000_grading_system_teacher_rls.sql` in the Supabase SQL editor or via your deployment pipeline.
