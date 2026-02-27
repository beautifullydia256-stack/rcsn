# How the Report Preview Is Generated

This document explains how the page **https://www.pwezacore.com/dashboard/admin/reports/generate** (Admin → Reports → Generate) produces the **Report Preview** that appears after you click “Preview Report.” It covers the full pipeline from configuration to the on-screen preview and print/PDF behavior.

---

## 1. Overview

The Generate Report page is a **Student Report Generator** that:

1. Lets the admin choose **Report Type** (Single Student or Entire Class), **Term**, **Exam Set**, **Class**, and (for single) **Student**.
2. On **Preview Report**, creates a **locked snapshot** of academic data, then **bulk-generates** report payloads and stores them in `generated_reports`.
3. Renders the **Report Preview** by mapping each stored `report_data` through the primary/secondary templates (e.g. Template 2–6 for primary, Template 1 for O-Level).
4. Uses a **print-only** area so that Print / “Download as PDF” shows only the report cards (no dashboard chrome).

The preview you see is the same structure that would be printed or saved as PDF (via the browser’s “Save as PDF” in the print dialog).

---

## 2. Page and Route

- **URL:** `https://www.pwezacore.com/dashboard/admin/reports/generate`
- **Route:** In the SPA, this is `reports/generate` under the admin dashboard (e.g. in `App.tsx`: `<Route path="reports/generate" element={<GenerateReportsPage />} />`).
- **Component:** `src/pages/admin/reports/GenerateReportsPage.tsx`.

The page is lazy-loaded from the admin layout and linked from “Back to Reports” and the reports hub.

---

## 3. Report Configuration (Form State)

Before any preview, the user sets:

| Field | Purpose |
|-------|--------|
| **Report Template** | Read-only, auto-selected from **Class** via `getTemplateForClass(selectedClass)` (see `src/templates/primary/index.ts`). Display name comes from `PRIMARY_TEMPLATES[key].name` (e.g. “Report for Upper Section”). |
| **Report Type** | `single` = one student, `class` = entire class. |
| **Term** | From `school_terms`; default is current term (today within term dates). |
| **Exam Set** | Optional; “Auto” picks the latest non–Mid Term set for the term (e.g. End of Term). |
| **Class** | Only classes that have exam results for the selected exam set (from `exam_results` / RPC `get_report_students_for_class`). |
| **Student** | (Single only) Searchable dropdown; students with results in that class for the selected exam set. |

Initial data is loaded by `fetchPageData(userId)`: school, terms, classes, exam sets. Students for the chosen class (and optionally exam set) come from `fetchStudentsWithResultsInClass` or `fetchStudentsInClass`. Classes available for the chosen exam set come from `fetchClassesForExamSet` (distinct `class_name` in `exam_results`).

For **what happens when you click Preview Report** and **why it can take long**, see [GENERATE_REPORT_PREVIEW_CLICK_AND_PERFORMANCE.md](./GENERATE_REPORT_PREVIEW_CLICK_AND_PERFORMANCE.md).

---

## 4. Pipeline: From “Preview Report” to Preview UI

When the user clicks **Preview Report**, the following steps run in order.

### Step 1: Create a snapshot (`createSnapshotFromExamSet`)

**File:** `src/services/snapshotLock.ts`

- Inserts a row into `report_snapshots` (school, term, year, exam_set_id, status `draft`).
- Determines which exam sets to include for that term:
  - If the selected set is “Mid Term”–like, only that set is used.
  - Otherwise (e.g. End of Term), all sets for the term are included so the snapshot can have both Mid and End columns.
- Fetches **exam results** from `exam_results` (with students and exam_sets), optionally filtered by:
  - **Single student:** `studentIds: [selectedStudent]`
  - **Entire class:** `classNames: [selectedClass]`
  This keeps snapshot creation fast (1–2 seconds instead of 20–30).
- Loads supporting data in parallel: students, attendance, fees, payments, photos, school, comment settings, report_comments for the term/year.
- Uses **processed_primary_exam_results** when present for aggregate, division, class_position; otherwise computes them (e.g. via `calculateAggregate`, `calculateDivision`).
- Computes per-student: positions, averages, aggregates, attendance percentage, resolved class teacher and headteacher comments (from settings or report_comments).
- Builds one row per exam result in a normalized shape (subject, marks, grade D1–F9, comments, fees, attendance, position, aggregate, division, frozen_data with school/student metadata).
- Inserts all rows into **report_snapshot_data**.
- Updates the snapshot with counts and metadata, then calls **lockSnapshot** (RPC `lock_report_snapshot`) so the snapshot is immutable.

The function returns the **snapshot ID**, which is used in the next step.

### Step 2: Bulk generate report payloads (`generateReportsBulkClient`)

**File:** `src/services/reportGenerator.ts`

- Ensures the snapshot exists and is `locked` (or `generated`).
- Reads **report_snapshot_data** for that snapshot, optionally filtered by `classNames` and/or `studentIds` (same single/class scope as the snapshot).
- For each distinct student in that data:
  - Groups snapshot rows by student.
  - Builds a **report payload** (`reportData`) containing:
    - **school:** name, address, phone, email, motto, logo (from snapshot frozen data or schools table).
    - **examSet:** id, name, term, year.
    - **students:** one element with student_id, name, current_class, admission_number, profile_photo, **results** (per-subject marks, grade, remarks, teacher_comment, etc.), **subjects** (for templates that expect EOT/MOT/BOT columns), attendance, fees, comments, **summary** (totalMarks, totalPossibleMarks, average, aggregate, division, attendancePercentage, classPosition, totalStudents, performanceRemark).
  - Ensures grades are D1–F9 (primary); maps exam set names to EOT/MOT/BOT for multi-column templates.
- Inserts one row per student into **generated_reports** with `snapshot_id`, `student_id`, `report_data` (the payload above), and optional `template_id`.
- Updates the snapshot status to `generated` and sets `generation_completed_at` and `generation_duration_seconds`.

So after this step, every student in scope has a **report_data** object stored in `generated_reports`.

### Step 3: Fetch generated reports and derive “reports to show”

**File:** `src/pages/admin/reports/GenerateReportsPage.tsx`

- The page stores **completedSnapshotId** after bulk generation succeeds.
- A **useQuery** runs `fetchGeneratedReports(completedSnapshotId)`, which selects from `generated_reports` for that snapshot (`id, snapshot_id, student_id, report_data, generated_at, pdf_url`), ordered by `generated_at` desc.
- **reportsToShow** is derived from that list:
  - **Single student:** only the row where `student_id === selectedStudent`.
  - **Entire class:** all rows returned for the snapshot.

These are the reports that will be rendered in the preview.

### Step 4: Render the Report Preview block

The same file conditionally renders the preview when:

- `generatingStep === 'completed'`
- `completedSnapshotId` is set
- The generated-reports query is not loading and not in error
- `generatedReports.length > 0`
- `reportsToShow.length > 0`

Structure:

```tsx
<div id="report-preview-print-area" className="report-preview-print mt-8 ...">
  <h2>Report Preview</h2>
  <span>Template: {templateDisplayName}</span>
  <div className="... overflow-auto max-h-[80vh] ...">
    <div style={{ width: '210mm', maxWidth: '100%' }}>
      {reportsToShow.map((report) => (
        <div key={report.id} className="report-student-card">
          <ReportPreviewFromData reportData={report.report_data} />
        </div>
      ))}
    </div>
  </div>
</div>
```

So the **Report Preview** is a list of **ReportPreviewFromData** components, each receiving one `report.report_data` from `generated_reports`. The container has `id="report-preview-print-area"` for print CSS.

---

## 5. From `report_data` to the visible report (ReportPreviewFromData → ReportPreview)

**File:** `src/components/reports/ReportPreviewFromData.tsx`

- Takes **reportData** (and optional **templateKey**).
- Reads the first student: `reportData.students[0]`.
- Normalizes **results** (remarks, final_score, teacher_remark, etc.) and ensures **grades** are D1–F9 (primary) via `calculatePrimaryGrade` when needed.
- Builds **subjects** for templates that expect EOT/MOT/BOT: either from `raw.subjects` (with grade normalization) or derived from `results` into a single-set shape.
- Builds a **student** object with results, subjects, summary, comments, feesBalance, and passes **school** = `reportData.school`, **examSet** = `reportData.examSet`.
- **Template key:** `templateKey || getTemplateForClass(student.current_class)` (from `src/templates/primary/index.ts`).
- Renders:  
  **`<ReportPreview student={...} examSet={...} school={...} template={...} reportTitleSettings={...} currentTermInfo={...} />`**

**File:** `src/components/reports/templates/primaryReportTemplates.tsx`

- **ReportPreview** chooses the actual template component by **template** and class type (O-Level vs primary, lower vs upper section):
  - **Primary / Nursery:** template3 or lower section → **Template3KyoteraReport**; template4 → **Template4UpperSectionReport**; template5 → **Template5CleanReportCard**; template6 or default → **Template2KasoziReport**.
  - **O-Level:** template1/default → **Template1OLevelReport**; template2 → **Template2KasoziReport**; etc.
- Each template (e.g. Template1OLevelReport, Template2KasoziReport, Template4UpperSectionReport) is a React component that lays out:
  - School logo and header
  - Report title (term/year)
  - Student info and photo
  - Subjects table (marks, grades, remarks, teacher, EOT/MOT/BOT where applicable)
  - Attendance, fees, class teacher and headteacher comments, summary (average, position, division, aggregate)

So the **Report Preview** that “looks like that” is the output of these template components, driven by the **report_data** produced in step 2 and normalized in **ReportPreviewFromData**.

---

## 6. Template selection (why it looks like “that” template)

**File:** `src/templates/primary/index.ts`

- **PRIMARY_TEMPLATES** defines template1–template6 (Baby Class, Middle/Top, Lower, Upper, Clean, Baby Class Heritage).
- **PRIMARY_CLASS_TEMPLATE_MAPPING** maps class names (e.g. `P.4`, `Primary 5`, `Baby Class`) to template keys.
- **getTemplateForClass(className)** returns that key (or `template1` as default).

The page shows “Report Template: &lt;name&gt;” from `PRIMARY_TEMPLATES[getTemplateForClass(selectedClass)].name`. So the **look** of the preview is determined by the **class** you selected (e.g. P.4 → Upper Section template), and the same mapping is used inside **ReportPreviewFromData** when no `templateKey` is passed.

---

## 7. Print and “Download as PDF”

**File:** `src/styles/index.css`

- Inside `@media print`:
  - All body children are `visibility: hidden`.
  - `#report-preview-print-area` and its descendants are `visibility: visible`.
  - `#report-preview-print-area` is positioned at top-left, full width, no shadow/border, so only the report cards are printed.

The page does **not** call a server PDF API from this SPA. “Download as PDF” and “Print Report” both open the **browser print dialog**; the user can choose “Save as PDF” there. So the Report Preview you see on screen is exactly what gets printed and what can be saved as PDF.

---

## 8. Data flow summary

```
User selects: Report Type, Term, Exam Set, Class, [Student]
       ↓
Click "Preview Report"
       ↓
createSnapshotFromExamSet(schoolId, examSetId, term, year, filter?)
  → report_snapshots row (draft → locked)
  → report_snapshot_data rows (frozen per-student, per-subject data)
       ↓
generateReportsBulkClient(snapshotId, templateId?, classNames?, studentIds?)
  → reads report_snapshot_data (and school, exam_sets)
  → builds report_data per student (school, examSet, students[0] with results, subjects, summary, comments, fees)
  → inserts into generated_reports
       ↓
fetchGeneratedReports(snapshotId) → list of { id, student_id, report_data, ... }
       ↓
reportsToShow = filter by reportType + selectedStudent
       ↓
For each report in reportsToShow:
  <ReportPreviewFromData reportData={report.report_data} />
    → normalizes student, results, subjects, picks template via getTemplateForClass(class)
    → <ReportPreview ... /> → Template1 / Template2 / ... / Template6
       ↓
Rendered report cards inside #report-preview-print-area
       ↓
Print / Save as PDF: only #report-preview-print-area visible (CSS @media print)
```

---

## 9. Key files reference

| Role | File |
|------|------|
| Page and preview container | `src/pages/admin/reports/GenerateReportsPage.tsx` |
| Snapshot creation and lock | `src/services/snapshotLock.ts` |
| Snapshot DB (lock, insert data) | `src/services/snapshotService.ts` |
| Bulk report generation (report_data) | `src/services/reportGenerator.ts` |
| Render one report from report_data | `src/components/reports/ReportPreviewFromData.tsx` |
| All report templates (ReportPreview, Template1–6) | `src/components/reports/templates/primaryReportTemplates.tsx` |
| Template config and class → template | `src/templates/primary/index.ts` |
| Print-only report area | `src/styles/index.css` (#report-preview-print-area) |

---

## 10. Summary

The **Report Preview** at https://www.pwezacore.com/dashboard/admin/reports/generate is generated by:

1. **Creating a locked snapshot** of exam results (and related data) for the chosen term, exam set, and scope (one student or one class).
2. **Bulk-generating** a **report_data** payload per student and storing it in **generated_reports**.
3. **Fetching** those stored reports and **rendering** each with **ReportPreviewFromData**, which normalizes data and calls **ReportPreview**.
4. **ReportPreview** selecting the correct template (Template1–6) from the student’s class via **getTemplateForClass**, producing the final layout (header, table, comments, etc.).
5. **Print/PDF** showing only the `#report-preview-print-area` content, so the preview and the printed/PDF output match.

The “look” of the preview is therefore determined by the **class** (template mapping), the **report_data** (from snapshot + bulk generation), and the **primary/secondary template components** in `primaryReportTemplates.tsx`.
