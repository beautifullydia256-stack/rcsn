# How exam results are saved in PwezaCore (and what each field means)

This document describes **teacher-entered exam data** stored in **`public.exam_results`**, for **Primary**, **O-Level (Senior 1–4)**, and **A-Level (Senior 5–6)**. Use it together with the SQL health check below.

---

## One table, two secondary “tracks”

Most schools use the same **`exam_results`** row type for all seniors, but **how** a row is filled depends on the class:

| Track | Typical classes | Main RPC (teacher save) | What drives the “main score” |
|--------|-----------------|-------------------------|------------------------------|
| **O-Level / ECS** | Senior 1–4 | `teacher_upsert_exam_result_secondary` | **final_score** (0–100) = formative + exam; activity + descriptor |
| **A-Level / UACE marks** | Senior 5–6 | `teacher_upsert_exam_result_alevel` | **marks_obtained** / **total_marks** (usually % out of 100) |

Primary classes use a different flow (e.g. `teacher_upsert_exam_result_primary`); this doc focuses on secondary and points you to primary only where relevant.

---

## Line identity (topic + paper)

Secondary rows are not only `(exam_set, student, subject)`. They also use:

- **`exam_topic_key`** — normalized “topic” line for O-Level (often from the **Topic** field).
- **`exam_paper_key`** — normalized **paper** line for UACE (from `paper_code` / `paper_number` when set).

Two rows for the same student/subject/exam are allowed when **topic/paper** differs. That supports multiple papers or multiple topic lines.

---

## O-Level (Senior 1–4) — what is saved and what it means

**RPC:** `teacher_upsert_exam_result_secondary` (see migration `20260527120000_teacher_upsert_secondary_sync_marks_obtained.sql`).

| Column / concept | Meaning |
|------------------|--------|
| **activity_score** | ECS-style activity mark, typically **0–3**. |
| **descriptor** | Band label from activity: **Basic** (&lt;1), **Moderate** (&lt;2.5), **Outstanding** (≥2.5). Must stay aligned with `activity_score` (see `src/lib/secondaryExamScoring.ts`). |
| **formative_score** | Internal assessment part; max often **20** (school setting). |
| **exam_score** | Written/practical exam part; often **80** max so **formative + exam = 100**. |
| **final_score** | **Total %** out of 100 for the subject line (should equal **formative_score + exam_score** within rounding). |
| **marks_obtained** | For reports/compatibility, RPC sets this **equal to `final_score`**. |
| **total_marks** | RPC sets **100** when there is a real score. |
| **grade** | Letter **A–E** from **final_score** (default bands: 80+ A, 70+ B, …, &lt;50 E). Schools may override via `teacher_exam_grade_bands` (`scale_kind = 'secondary'`). |
| **overall_remark** | Teacher comment for that line. |
| **teacher_initials** | Short initials. |
| **topic** | Human-readable topic label; feeds **`exam_topic_key`**. |
| **paper_code** / **paper_number** | Optional; used when the same subject has multiple lines (line key). |

**Intended invariants (O-Level):**

- `final_score` equals `formative_score + exam_score` (within rounding).
- `marks_obtained` = `final_score` when scored.
- `total_marks` = 100 when `final_score` &gt; 0.
- `descriptor` matches activity bands above.

---

## A-Level (Senior 5–6) — what is saved and what it means

**RPC:** `teacher_upsert_exam_result_alevel` (see `20260602120000_uace_default_grade_server_exam_points.sql`).

| Column / concept | Meaning |
|------------------|--------|
| **marks_obtained** | Student’s mark for that **paper line** (usually **0–100** as a percentage). |
| **total_marks** | Denominator (typically **100**). |
| **grade** | **UACE letter** from **marks/total** using default bands: 80+ **A**, 70–79 **B**, …, 40–44 **O**, &lt;40 **F**. The server **recomputes** `grade` from marks when `total_marks &gt; 0` so primary-style **D1–F9** is not stored for new saves. |
| **uace_points** | Points for that grade (**A=6 … F=0**, **O=1**), set with the grade. |
| **remarks** / **teacher_comment** | Comments passed from the app. |
| **paper_code** / **paper_number** | Identify the paper line; feed **`exam_paper_key`**. |

O-Level-only columns (**activity_score**, **formative_score**, **exam_score**, **final_score**, **descriptor**) are usually **empty/null** for pure A-Level marks rows.

**Subsidiary vs principal** (GP, Sub Maths, etc.) and **/18 + /2** totals are **not** fully modelled in this single row; see [UACE_IMPLEMENTATION_PLAN.md](./UACE_IMPLEMENTATION_PLAN.md).

---

## Processed mirror (reports)

**Table:** `processed_secondary_exam_results` (and related triggers/jobs).

For scored O-Level-style lines, processed rows should **mirror** the teacher row’s effective mark and grade used on reports. The query [confirm_secondary_exam_results_saved_correctly.sql](../supabase/queries/confirm_secondary_exam_results_saved_correctly.sql) checks alignment between **`exam_results`** and **`processed_secondary_exam_results`**.

---

## Report preview columns (O-Level built-in HTML templates)

End-of-term **report preview** and PDFs for Senior 1–4 read **`report_data`** built from the **term snapshot** (merged rows in `supabase/functions/_shared/reportDataBuilder.ts`). The preview **does not recompute** letter grades or descriptors from percentages; it displays the fields stored on each merged result line (same values teachers saved on the **latest** exam set in the merge group for formative / exam / final / grade / descriptor / remarks / initials).

**Merge rule (multi–exam-set terms):** For each student and subject/topic/paper line, snapshot rows are ordered by **`exam_sets.created_at`** (then stable id/name). **`continuous_c1`** is **`activity_score`** from the **earliest** set; **`continuous_c2`** from the **latest**; **`formative_score`**, **`exam_score`**, **`final_score`**, **`grade`**, **`descriptor`**, **`overall_remark`**, **`teacher_initials`**, and **`activity_score`** on the merged row come from the **latest** set in that group.

| Template | Column / concept | Source field(s) on merged `student.results` |
|----------|------------------|---------------------------------------------|
| **Standard** | Subjects and Topics Covered | `subject` + `topic` |
| | Activity, Descriptor, Formative, Exam, Final, Grade, Overall Remark, Subject Teacher | `activity_score`, `descriptor`, `formative_score`, `exam_score`, `final_score`, `grade`, `overall_remark`, `teacher_initials` |
| **Basic** | Subject | `subject` |
| | Formative / EOY / Total / Grade | `formative_score`, `exam_score`, `final_score`, `grade` |
| | Level of Achievement/3 | `activity_score` (as stored, e.g. 0–3) |
| | Descriptor | `descriptor` (as stored; empty if null) |
| | TR's Initial | `teacher_initials` |
| **Progressive** | Subject | `subject` |
| | C1 / C2 | `continuous_c1` / `continuous_c2` (earliest vs latest **activity** in the term for that line) |
| | Avg Score /20 | `formative_score` on the merged row (not an average of C1 and C2) |
| | Final Exam /80, Total 100% | `exam_score`, `final_score` |
| | Identifier | **1** / **2** / **3** from **`descriptor`**: Basic →1, Moderate → 2, Outstanding or Accomplished → 3 (case-insensitive; leading word if extra text) |
| | Init | `teacher_initials` |

### Manual QA checklist (multi–exam term)

1. Pick **one Senior 1** (or O-Level) student with results in **two or three exam sets** in the same term for the same subject line.  
2. Regenerate or open **report preview** for that term and student.  
3. For **Standard**, **Basic**, and **Progressive** templates: confirm table values match the merged snapshot fields above (especially C1/C2 vs earliest/latest activity, Identifier vs saved descriptor, Basic LO column vs saved activity).  
4. Confirm **no** blank Identifier when **`descriptor`** is one of Basic / Moderate / Outstanding (or Accomplished for band 3).

---

## SQL you can run, then paste results for review

1. **O-Level vs A-Level health summary + samples**  
   [../supabase/queries/confirm_exam_save_health_olevel_vs_alevel.sql](../supabase/queries/confirm_exam_save_health_olevel_vs_alevel.sql)

   - **Part 1:** counts; all `*_bad` columns should be **0** when behaviour matches the rules above.  
     - **Note:** `olevl_grade_ne_default_ae_bad` assumes **default A–E** from `final_score`. If your school only uses **custom** `teacher_exam_grade_bands`, some non-zero count may be **expected** — compare sample rows manually.
   - **Part 2:** recent sample rows per track.

2. **Full senior check including processed mirror** (broader)  
   [../supabase/queries/confirm_secondary_exam_results_saved_correctly.sql](../supabase/queries/confirm_secondary_exam_results_saved_correctly.sql)

3. **A-Level grade vs UACE default**  
   [../supabase/queries/verify_alevel_exam_grade_matches_uace_default.sql](../supabase/queries/verify_alevel_exam_grade_matches_uace_default.sql)

4. **Repair old A-Level rows** (e.g. **D1** stored at 85%)  
   [../supabase/queries/repair_alevel_exam_grades_from_marks_uace_default.sql](../supabase/queries/repair_alevel_exam_grades_from_marks_uace_default.sql)

---

## Related docs

- [UACE_ALEVEL_GRADING_LOGIC.md](./UACE_ALEVEL_GRADING_LOGIC.md) — UACE letters, points, % bands.  
- [UACE_IMPLEMENTATION_PLAN.md](./UACE_IMPLEMENTATION_PLAN.md) — roadmap (totals, subsidiaries, custom bands).  
- [supabase/UACE_SQL_FILES.txt](../supabase/UACE_SQL_FILES.txt) — where UACE migration and bundle files live.

---

*Last updated to match teacher RPCs and audit queries in-repo; if migrations diverge, prefer the latest `supabase/migrations` definitions.*
