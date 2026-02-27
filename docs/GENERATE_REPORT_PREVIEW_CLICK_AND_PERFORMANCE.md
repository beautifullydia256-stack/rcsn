# What Happens When You Click "Preview Report" (and Why It Takes Long)

This addendum to [GENERATE_REPORT_PREVIEW_FLOW.md](./GENERATE_REPORT_PREVIEW_FLOW.md) explains **exactly what runs** when you click **Preview Report** on the Generate Report page, and **why it can take a long time**.

---

## 1. What Happens When You Click "Preview Report"

The click runs **`handlePreviewReport`** in `src/pages/admin/reports/GenerateReportsPage.tsx`. The button label changes to **"Preparing…"** then **"Generating…"** until the process finishes.

### Step-by-step

**1. Validation (synchronous, instant)**  
- Checks that a school exists, a **class** is selected, and (for Single Student) a **student** is selected.  
- Resolves **Term** (your selection or current term) and **Exam Set** (your selection or "Auto" — prefers End of Term over Mid Term for that term).  
- If there is no exam set for the chosen term, opens the "No results found" modal and **stops** (no network calls).  
- Sets `previewing = true`, clears previous errors and `completedSnapshotId`, and sets **generatingStep** to `'creating'`. The button shows **"Preparing…"**.

**2. Phase 1 — "Preparing…" (create snapshot)**  
- Builds a **snapshot filter** from your choices:  
  - **Single Student:** `{ studentIds: [selectedStudent] }`  
  - **Entire Class:** `{ classNames: [selectedClass] }`  
- Calls **`createSnapshotFromExamSet(schoolId, examSetId, term, year, snapshotFilter)`** (`src/services/snapshotLock.ts`).  
  That function performs **many Supabase operations** in sequence and in parallel:
  - INSERT one row into `report_snapshots` (status `draft`).
  - SELECT from `exam_sets` for school/term/year.
  - SELECT from `exam_results` (with `students` and `exam_sets` joined), filtered by exam set(s) and, when present, by `studentIds` or `classNames` — **this can return a lot of rows** for an entire class (e.g. 40 students × 12 subjects = 480 rows).
  - SELECT from `processed_primary_exam_results` for those students and exam sets.
  - **Promise.all** of 7 queries: `students`, `student_attendance`, `student_fees`, `student_payments`, `student_photos`, `schools` (single row), `class_teacher_comments_settings` (and optionally one more for `report_comments`).
  - In-memory work: positions, averages, aggregates, attendance percentages, resolved class teacher and headteacher comments.
  - **insertSnapshotData**: one INSERT of **many rows** into `report_snapshot_data` (one row per exam result per student).
  - UPDATE `report_snapshots` (counts, metadata).
  - **lockSnapshot** (RPC `lock_report_snapshot`).  
- When this returns, the UI sets **generatingStep** to `'generating'`. The button shows **"Generating…"**.

**3. Phase 2 — "Generating…" (bulk generate report payloads)**  
- Calls **`generateReportsBulkClient(snapshotId, undefined, classNames?, studentIds?)`** (`src/services/reportGenerator.ts`).  
  That function:
  - SELECTs the snapshot from `report_snapshots`.
  - SELECTs **all** rows from `report_snapshot_data` for that snapshot (optionally filtered by class/student) — again, many rows for an entire class.
  - SELECTs school and exam set (2 calls).
  - UPDATEs `report_snapshots` (status `generated`, `generation_started_at`).
  - For **each student** (in batches of 50): builds the `report_data` object in memory and **INSERTs one row** into `generated_reports` (with `.select().single()`). Batches run with `Promise.all`, so up to 50 INSERTs in parallel per batch — but for **N** students you still have **N** INSERT round-trips.
  - UPDATEs `report_snapshots` again (`generation_completed_at`, `generation_duration_seconds`).  
- On success, the page sets **completedSnapshotId** to the snapshot ID and **generatingStep** to `'completed'`, and sets **previewing** to `false`.

**4. Phase 3 — Show the preview**  
- A **useQuery** is enabled for `completedSnapshotId` and runs **fetchGeneratedReports(snapshotId)**: one SELECT from `generated_reports` for that snapshot.  
- **reportsToShow** is derived (single student or full list).  
- The Report Preview block renders: for each report in `reportsToShow`, **ReportPreviewFromData** renders the stored `report_data`. **No extra network calls** for the preview itself.

**If any step throws:** **generatingStep** is set to `'error'`, **generationError** is set, and the error message is shown.

---

## 2. Why It Takes So Long

The delay is almost entirely from **network round-trips** and **data volume**, not from heavy CPU in the browser.

### Snapshot phase ("Preparing…")

- **Many round-trips:** There are about **12–14** Supabase calls (insert snapshot, exam_sets, exam_results, processed_primary_exam_results, 7 in Promise.all, report_comments, insertSnapshotData, update snapshot, lockSnapshot). Each round-trip has latency (e.g. 50–200 ms depending on region and load). Even if each is fast, the sum adds up.
- **Large payloads:** For "Entire Class", the `exam_results` query returns every subject result for every student in that class (e.g. 40 × 12 = 480 rows with joins). Then `report_snapshot_data` gets one row per result — again hundreds of rows in one INSERT. Transfer time and DB work both increase with class size.
- The code comment in `snapshotLock.ts` says: with a filter (single student or one class), snapshot is **"much faster (1–2 s instead of 20–30 s)"**. So the filter you get from "Single Student" or "Entire Class" (one class) is what keeps "Preparing…" from being even slower.

So **"Preparing…"** is slow mainly because of **how many** Supabase calls run and **how much data** is read and written (exam_results + report_snapshot_data).

### Generation phase ("Generating…")

- **One INSERT per student:** Every student gets one row in `generated_reports`. Each row is inserted with a **separate** Supabase call (batches of 50 run in parallel, but you still have **N** round-trips for N students). So for 40 students you have 40 INSERTs.
- **Large JSON per row:** Each INSERT sends a full `report_data` object (school, examSet, student with results, subjects, comments, summary, etc.). That’s a big JSON blob per student. Upload size and DB write time grow with class size.

So **"Generating…"** is slow because of **N round-trips** (one per student) and **large per-row payloads**.

### What makes it faster

- **Single Student** is much faster: the snapshot only fetches and stores data for one student, and generation does **one** INSERT.
- **Entire Class** is still scoped to **one class** (not the whole school), so the snapshot stays relatively fast (1–2 s when filtered). Generation time then scales with the number of students in that class.

### Summary of causes

| Cause | Where it happens |
|-------|-------------------|
| Many Supabase calls (12–14+) | `createSnapshotFromExamSet` |
| Large `exam_results` + `report_snapshot_data` for a full class | Snapshot phase |
| One INSERT per student into `generated_reports` | `generateReportsBulkClient` |
| Large `report_data` JSON per student | Same |
| Network latency on every round-trip | All steps |

### Ways to make it faster later

- **Reduce round-trips:** e.g. move snapshot + bulk generation to a single Edge Function (or API) so many steps happen server-side in one request.
- **Batch-insert `generated_reports`:** e.g. one RPC or server action that inserts many rows in one go instead of N client-side INSERTs.
- **Preview without writing first:** derive preview from snapshot data in memory (or one lightweight query) and write to `generated_reports` in the background for download/print.

See [GENERATE_REPORT_PREVIEW_FLOW.md](./GENERATE_REPORT_PREVIEW_FLOW.md) for the full pipeline and file references.
