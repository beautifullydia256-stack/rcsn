# Report Preview + Fast Generation + Fast PDF — Implementation Plan (Refined)

This document is the implementation plan with **required refinements** incorporated. It supersedes the initial plan for implementation purposes.

---

## Mandatory refinements summary

Before implementation, the following are mandatory:

1. **Position calculation** — Always use full class scope; filter only at return. Single-student preview must show correct position (e.g. "3 of 40"), not "1 of 1".
2. **Snapshot locking order** — Create snapshot → Insert snapshot rows → Update metadata → Lock → Build report_data **from locked snapshot** → Chunked bulk insert into `generated_reports`. Report data must reflect locked data, not draft.
3. **Edge function safeguards** — Chunked bulk insert (300–500 per batch); preview response size limit or pagination; document payload and timeout limits.
4. **PDF strategy** — Prefer Node/Puppeteer (`VITE_PDF_API_URL`) for heavy PDFs; Edge Function PDF only with strict student limit or background job for >100.
5. **Response consistency** — Same `report_data` shape from shared builder for preview and final; explicit fields: school, examSet, students[0] (results, subjects EOT/MOT/BOT, head_teacher_text, summary, fees, division, aggregate, attendancePercentage, classPosition, totalStudents, comments).
6. **Authorization** — Edge Functions must verify user belongs to `schoolId` and has role for report generation; do not rely only on frontend; respect school isolation.
7. **Performance verification** — Targets table and verification as part of deployment checklist; profile if targets not met.
8. **Logging (recommended)** — Start time, end time, number of students, duration in Edge Functions.
9. **Snapshot system** — Do not remove; preview bypasses it; final preserves it for audit, historical, legal, and reproducible reports.
10. **Architectural principle** — Preview = fast, read-only, no writes; Final = auditable, locked, bulk persisted; PDF = decoupled rendering layer.

---

## 1. Position calculation — full class scope (mandatory)

**Problem:** If preview is for a single student and the builder fetches only `studentIds: [selectedStudent]`, then class position = 1, totalStudents = 1, and ranking is wrong.

**Required behavior in `buildReportDataFromScope` (or equivalent):**

- Always fetch **full class** results when computing positions, aggregates, averages, and ranking.
- Apply student filtering **only at the final return stage**: if caller requested a single student, return only that student's `report_data`, but **ranking must reflect full class**.
- Flow: (1) Fetch all students in class for ranking. (2) Compute aggregates, averages, class positions, totalStudents. (3) If single-student preview, return only that student's `report_data`; else return all. Every returned `report_data` must have correct class position and totalStudents (e.g. "3 of 40").
- Document and test: single-student preview must show correct position, not "1 of 1".

---

## 2. Snapshot locking order (mandatory)

Correct order for **generate-reports-final** when using full payload:

1. **Create** snapshot row (`report_snapshots`, status `draft`).
2. Run shared data fetch + compute; get **only** `snapshotRowsForPersist` (do not build report_data from this yet).
3. **Bulk insert** into `report_snapshot_data`: `.insert(snapshotRowsForPersist)`.
4. **Update** snapshot metadata (counts, etc.).
5. **Lock** snapshot: call `lock_report_snapshot` RPC.
6. **Build report_data** by reading from the **locked** snapshot (query `report_snapshot_data` for this `snapshot_id`, then build each student's `report_data` from that frozen data using the same builder logic as preview).
7. **Chunked bulk insert** into `generated_reports` (batches of 300–500 rows).

Report data must reflect locked snapshot, not draft. This preserves academic integrity.

---

## 3. Edge function timeout and payload safeguards

- **Chunked bulk insert:** When inserting into `generated_reports`, if rows > 500, chunk into batches of 300–500. Each batch within PostgREST limits.
- **Preview response size:** Returning `report_data[]` for 500 students can be multi-MB. Mitigation: limit preview to first 100 students, or add pagination, or document safe upper limit. At minimum, document expected payload size and safe limits.
- **Large schools:** 500 students × 15 subjects × 3 exam sets = 7,500+ exam_result rows; document timeout and memory expectations; consider streaming/pagination for very large requests.

---

## 4. PDF generation strategy

- **Preferred:** Use **VITE_PDF_API_URL** (Node backend) with Puppeteer for PDF rendering. Preview + Final → Edge Functions; **PDF → Node API**. Edge Functions should not handle heavy HTML→PDF for 50+ reports.
- **generate_pdf_from_data:** Implement on Node API: accept `report_data[]`, render to PDF, return file.
- **generate_pdf_from_snapshot:** Same Node API: accept `snapshotId`, fetch `generated_reports`, render to PDF, return file.
- **If PDF must be in Edge Function:** Strict student limit per request (e.g. max 50–100); document timeout; for >100 students consider background job + polling.

---

## 5. Response consistency guarantee

The shared report data builder must produce the **exact** shape expected by `ReportPreviewFromData`. Preview and Final must use the **same** builder so preview never shows different grades or totals than saved reports.

Explicitly ensure every `report_data` includes:

- `school`, `examSet`
- `students[0]`: `results`, `subjects` (EOT/MOT/BOT where required), `comments` (including `head_teacher_text`), `summary` (division, aggregate, attendancePercentage, classPosition, totalStudents, etc.), `fees`

---

## 6. Authorization and RLS validation

- Edge Functions must verify: user belongs to `schoolId`, user has role permitting report generation.
- Reads must respect school isolation (RLS or explicit `school_id` checks).
- Do not rely only on frontend validation.

---

## 7. Performance targets and verification

| Scenario | Target |
| -------- | ------ |
| Preview (1 student) | < 1 sec |
| Preview (50 students) | < 2 sec |
| Final generation (50 students) | < 3 sec |
| PDF (50 students) | < 3 sec |

After implementation: measure; if targets not met, profile internal DB calls and optimize. **Performance verification must be part of the deployment checklist.**

---

## 8. Logging (strongly recommended)

Inside Edge Functions, log:

- Start time
- End time
- Number of students processed
- Duration (seconds)

Enables performance monitoring as schools scale.

---

## 9. Do not remove snapshot system

- Snapshot system remains critical for: audit trail, historical accuracy, legal academic records, reproducible reports.
- Preview must **bypass** it (no writes).
- Final must **preserve** it (create, lock, persist).
- Do not weaken snapshot integrity.

---

## 10. Final architectural principle

- **Preview** = Fast, read-only, no writes.
- **Final** = Auditable, locked, bulk persisted.
- **PDF** = Decoupled rendering layer.

These must remain separated permanently. Once refinements are incorporated, the system will be fast, correct, scalable, and academically reliable.
