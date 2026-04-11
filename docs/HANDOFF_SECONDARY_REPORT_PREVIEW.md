# Handoff: Secondary (O-Level) report preview vs “fake” data

Use this doc when starting a new chat about **Senior1–4 report preview**, **template columns**, or **data looking wrong / primary-style**.

---

## What the user cares about

- **No recomputation** for O-Level preview: show what teachers saved (`activity_score`, `descriptor`, `formative_score`, `exam_score`, `final_score`, `grade`, remarks, initials).
- **Templates**: Standard (`template1`), Basic (`template2` / Kasozi-style), Progressive (`template3` / Kyotera-style) must map columns to **merged snapshot / `student.results`** fields (see plan below).
- **Frustration**: Preview sometimes showed **primary** layouts (e.g. “Upper Section”, MID/END, D1–F9-style) or **demo subjects** instead of real Senior lines from the database.

---

## Where real data lives

| Item | Location |
|------|----------|
| **Authoritative marks (Senior)** | Postgres table **`exam_results`** — includes `class_name`, `subject`, `topic`, `activity_score`, `descriptor`, `formative_score`, `exam_score`, `final_score`, `marks_obtained`, `total_marks`, `grade`, **`overall_remark`**, `teacher_initials`, line keys (`paper_code`, `paper_number`), etc. |
| **Note on `remark_preview`** | Not a separate storage column in normal flows. It appears in audit SQL as an **alias** for `overall_remark` (e.g. `confirm_secondary_exam_results_saved_correctly.sql`). |

---

## Live preview data path (secondary)

1. **UI**: Admin → **`/dashboard/admin/reports/generate-secondary`** → [`SecondaryGenerateReportsPage.tsx`](../src/pages/admin/reports/SecondaryGenerateReportsPage.tsx).
2. **Important checkbox**: **“Preview card layout with sample data only”** must be **OFF** for real data. When **ON**, the page builds **demo** report payloads (`getSecondaryPlaceholderReportData`) — generic subjects (e.g. Integrated Science / SST), **not** `exam_results`. School name gets a **`[demo marks — not from database]`** suffix in code.
3. **Live preview**: Calls Supabase Edge Function **`generate-report-preview`** with `schoolId`, `term`, `year`, `examSetId`, `className`, optional `studentId`.
4. **Server**: [`supabase/functions/generate-report-preview/index.ts`](../supabase/functions/generate-report-preview/index.ts) → **`buildReportDataFromScope`** in [`supabase/functions/_shared/reportDataBuilder.ts`](../supabase/functions/_shared/reportDataBuilder.ts).
5. **Query**: Reads **`exam_results`** with joins to `students`, `exam_sets`; filters by school, exam set IDs for the term (logic includes “mid term only” vs all sets in term), and **`class_name` in selected class list**.
6. **Merge (multi–exam-set terms)**: **`mergeSeniorSecondarySnapshotRows`** groups by subject/topic/paper line, sorts by **`exam_sets.created_at`** (and stable id/name). **`continuous_c1`** / **`continuous_c2`** = activity from **earliest** / **latest** exam set row; **formative / exam / final / grade / descriptor / overall_remark / initials / activity on merged row** from **latest** row in that group.
7. **Rendering**: [`buildSecondaryShapedStudent.ts`](../src/reports/secondary/buildSecondaryShapedStudent.ts) + [`SecondaryBuiltInHtmlPreview.tsx`](../src/components/reports/SecondaryBuiltInHtmlPreview.tsx) + `renderTemplateHTML` / templates in [`src/templates/secondary/index.ts`](../src/templates/secondary/index.ts).

**Save / PDF after “Generate & Save”**: Uses **`generate-reports-final`** and persisted snapshot; preview can also come from **`generated_reports.report_data`**.

---

## Primary vs secondary routing (common “wrong template” cause)

- Route **`/dashboard/admin/reports/generate`** loads [`ReportGeneratorEntryPage.tsx`](../src/pages/admin/reports/ReportGeneratorEntryPage.tsx).
- If **`schools.type === 'Secondary'`** → redirect to **`generate-secondary`**.
- If type is **missing or invalid** (not `Nursery/Primary` or `Secondary`), the app now shows a **warning + link to settings** instead of silently opening the **primary** [`GenerateReportsPage.tsx`](../src/pages/admin/reports/GenerateReportsPage.tsx) (which uses Upper Section–style templates and primary grading).

**Requirement**: In DB, **`schools.type`** must be **`Secondary`** for O-Level schools so admins always hit the secondary generator.

---

## O-Level template column mapping (implemented intent)

Documented in-repo under **`docs/EXAM_RESULTS_HOW_SAVES_WORK.md`** → section **“Report preview columns (O-Level built-in HTML templates)”**.

Summary:

- **Standard**: `subject`+`topic`; `activity_score`, `descriptor`, `formative_score`, `exam_score`, `final_score`, `grade`, `overall_remark`, `teacher_initials`.
- **Basic**: LO column = stored **`activity_score`**; descriptor as stored; no synthesizing descriptor from activity.
- **Progressive**: C1/C2 from **`continuous_c1`/`continuous_c2`**; Avg/20 = **`formative_score`**; Identifier from **`descriptor`** (Basic/Moderate/Outstanding or Accomplished → bands), not from recomputing off `final_score`.

Implementation touchpoints:

- Merge / snapshot: [`reportDataBuilder.ts`](../supabase/functions/_shared/reportDataBuilder.ts) (`mergeSeniorSecondarySnapshotRows`, `exam_set_created_at` on rows).
- HTML: [`secondaryOlevelHtmlFromD082d5b.ts`](../src/services/secondaryOlevelHtmlFromD082d5b.ts) (Standard), [`secondaryOlevelPlanSampleLayouts.ts`](../src/services/secondaryOlevelPlanSampleLayouts.ts) (Basic + Progressive).

**Original planning artifact** (do not edit as source of truth): user’s Cursor plan `o-level_preview_template_mapping_160f3e36.plan.md` under `.cursor/plans/`.

---

## “Failed to fetch” / empty preview

- Client invokes **`generate-report-preview`** with the user JWT; the function uses **service role** after auth checks.
- Failures often trace to **Vercel / hosting env**: `SUPABASE_URL`, anon key, function deployment, CORS, or network.
- Without a successful response, live preview never receives **`report_data`** built from `exam_results`.

---

## Quick checklist for debugging “fake” or wrong rows

1. **URL**: On **`generate-secondary`**, not stuck on primary generator.
2. **`schools.type`**: **Secondary** in Supabase.
3. **Sample checkbox**: **Off** (“Preview card layout with sample data only”).
4. **Class name**: Selected class **exactly matches** `exam_results.class_name` (e.g. `Senior 1`).
5. **Term / year / exam set**: Matches rows in `exam_results` for that student.
6. **Edge function**: `generate-report-preview` deployed and env vars correct; check logs if UI errors.
7. **Expectation**: Multiple raw rows per subject/topic (different exam sets) **merge** to one line per group in the report — not a bug unless merge fields are wrong.

---

## Related files (bookmark)

| File | Role |
|------|------|
| `src/pages/admin/reports/ReportGeneratorEntryPage.tsx` | Routes Secondary → `generate-secondary`; blocks ambiguous school type |
| `src/pages/admin/reports/SecondaryGenerateReportsPage.tsx` | Secondary UI, sample vs live preview, invokes edge functions |
| `src/pages/admin/reports/GenerateReportsPage.tsx` | **Primary** report generator |
| `supabase/functions/generate-report-preview/index.ts` | Read-only preview entry |
| `supabase/functions/_shared/reportDataBuilder.ts` | `buildReportDataFromScope`, merge, `oneReportFromSnapshotRows` |
| `src/reports/secondary/buildSecondaryShapedStudent.ts` | Shapes payload for HTML templates |
| `src/components/reports/SecondaryBuiltInHtmlPreview.tsx` | Preview component |
| `docs/EXAM_RESULTS_HOW_SAVES_WORK.md` | Saves + preview column rules + QA checklist |

---

## Git note (this thread)

A small UX fix was pushed: **guard on `ReportGeneratorEntryPage`** when school type is unset/invalid (avoid silent primary generator). Broader “fake data” issues are usually **sample mode**, **routing**, **env/function failure**, or **class/term mismatch** — not missing O-Level template code in isolation.

---

*Last updated from chat handoff — adjust as product behavior changes.*
