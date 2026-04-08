# Plan: Cached report PDFs, storage, retention, multi–exam‑set, and download rules

**Purpose:** One document to implement tomorrow (or in a new chat) without re‑deriving context.  
**Visual parity:** Stored PDFs MUST be produced with the **same rendering path** as today (e.g. `renderTemplateHTML` + Puppeteer `page.pdf` with the same A4 / margins / `printBackground` rules as `/api/pdf/generate` secondary pipeline and primary equivalents). **Do not** replace with browser Print-to-PDF for official files.

**Related code today (reference):**

- Secondary preview data: Supabase Edge `generate-report-preview` → `buildReportDataFromScope` / snapshot builders.
- PDF: Vercel `api/pdf/generate.ts` (`secondaryPipeline`, `reportDataList`, `renderTemplateHTML`, image inlining).

---

## 1. Goals

1. **Fast downloads** for the **active** reporting window: read pre-built PDFs from **object storage** (not regenerate on every click).
2. **Automatic refresh** after teachers change marks: **debounced** (recommended **~2 minutes** idle per scope) background jobs regenerate **only what must change** (see §7).
3. **Bounded storage:** delete **stored PDF blobs** for terms outside the policy window; **never** delete `exam_results` / academic history for this reason.
4. **Multiple exam sets** (e.g. Mid Term vs End of Term): each official run has **its own** stored artifact set (key includes `exam_set_id`).
5. **Primary “combined” EOT** (marks merged from Mid + EOT in the report builder): the **PDF artifact** is still tied to the **exam set / reporting run** the user generated (e.g. **End of Term** `exam_set_id`); that payload already includes merged subject rows—store **one PDF per student for that EOT exam set**, not a second copy labeled “mid only” unless they explicitly generate mid-term reports too.
6. **Secondary:** template choice is per school/class policy; artifact key must include enough to avoid collisions (at minimum `exam_set_id` + official `template_key` used for that publish).

---

## 2. Non-goals (for v1 of this plan)

- Bit-identical PDFs across Chromium upgrades years apart (acceptable rare drift; archival fidelity later = template versioning + frozen snapshots).
- Optimizing DB size of `exam_results` (only PDF **blobs** and artifact metadata are in scope).

---

## 3. Storage layout (recommended)

### 3.1 Bucket / object storage

- Use **Supabase Storage** (or S3-compatible) with a **private** bucket, e.g. `report-pdfs`.
- **Path convention** (adjust only if your ID types differ):

  `{school_id}/{academic_year}/{term_number}/{exam_set_id}/{template_key}/{student_id}.pdf`

**Why `exam_set_id` in the path:** Same class/term can have **Mid Term** and **End of Term** (and schools with more sets)—each must have **separate** files. Primary schools using Mid+EOT combination still generate under the **EOT** `exam_set_id` when that is the selected “generate reports for this set” action.

**Why `template_key`:** Rare switches of official template per division should not overwrite unrelated artifacts; schools that truly use one template forever still work.

### 3.2 Database (metadata, not bytes)

Create (or extend) a table, e.g. `report_pdf_artifacts`:

| Column | Purpose |
|--------|--------|
| `id` | UUID |
| `school_id` | Tenant |
| `exam_set_id` | Which exam set this PDF belongs to |
| `student_id` | Learner |
| `template_key` | `template1` … (official key used) |
| `academic_year`, `term` | Denormalized for retention queries |
| `storage_path` | Full object path |
| `content_hash` | Optional integrity / change detection |
| `file_size_bytes` | Optional |
| `status` | `pending` \| `ready` \| `failed` |
| `version` or `updated_at` | For signed URLs / cache busting |
| `last_results_version` | Optional: hash of inputs to skip useless regen |

**Rules:**

- **Download links** in the app resolve from this table (or signed URL derived from `storage_path` + `version`).
- **Replace flow:** upload **new** object (new path or same path with version bump), set `status=ready`, **then** delete previous object if path changed; if same path, overwrite only after successful upload.

---

## 4. Retention and download policy (product rules)

These are **defaults**; make configurable per school later if needed.

### 4.1 Terms and cleanup

- **When a new term is officially opened** (or via scheduled job at rollover):  
  - **Delete** all `report_pdf_artifact` rows and **storage objects** for terms **older than** the **last retained term** (see below).
  - **Do not** delete `exam_results`.

**Recommended retention for stored PDFs:**

- **Keep cached PDFs only for:** `current_term` (required) and optionally `current_term - 1` for convenience (config flag).
- **“Delete last term’s PDFs”** when rolling forward: means **drop the oldest cached term** outside this window, not delete grades.

### 4.2 Who can download what

| Period | Single-student PDF | Whole class (zip or multi-page policy) |
|--------|-------------------|----------------------------------------|
| **Current term** (within retention) | Yes: read from storage or trigger regen if missing | Yes: **stream zip** from current per-student files (§6) |
| **Past terms** (grades still in DB) | **On-demand** server generation (same pipeline), no requirement to keep blob | **Disabled by default** (avoid huge regen/storage); optional **admin “archive export”** later |

This matches: *past terms → single student only; current term → class download OK.*

### 4.3 Multiple exam sets in the same term

- User selects **exam set** (Mid, EOT, etc.) → generation and storage use that **`exam_set_id`**.
- Listing/downloads in UI must filter by **exam set** so Mid and EOT files never overwrite each other.

---

## 5. When to regenerate (invalidation)

### 5.1 Secondary schools (no class rank/position on card)

- **Scope:** **Debounced** job per `(school_id, exam_set_id, student_id)` or batch dirty rows.
- **Typically:** only **that student’s** PDF regenerates when only their `exam_results` rows change.
- **Exception:** if a template later includes **class-relative** stats, widen scope to class for that exam set (re-evaluate when templates change).

### 5.2 Primary (or any template with class rank / “X of Y”)

- **Scope:** **entire class** (or entire ranked cohort) for that `exam_set_id`, because one mark change can reorder others.
- Same debounce, but job regenerates **all** student PDFs in scope.

### 5.3 Debounce

- **~2 minutes** after last change signal for a scope (e.g. `exam_set_id` + `class_name` or `school_id` + `exam_set_id`), coalesce to **one** job.

**Implementation note:** dirty flags can be written by triggers on `exam_results` or by app layer after save; workers read dirty queue.

---

## 6. Whole class delivery

### 6.1 Preferred: per-student files + streaming zip

- **Do not** rely on editing zip in place.
- On **“Download class”:** stream-build zip: for each student, **stream** PDF from storage into zip entry, pipe zip to HTTP response (**low memory**; see §8).
- If **cached class zip** is ever stored: **invalidate** it when **any** member `student_id` artifact for that `(school_id, exam_set_id, template_key)` updates.

### 6.2 Optional: one multi-page PDF (current behaviour)

If product keeps **one merged PDF** for class exports:

- Treat it as **derived, optional** artifact OR generate **only on demand** (heavy); retention should still prefer **per-student** storage for partial updates.
- If merged file is stored, **invalidation** for secondary = **only affected students** does **not** update the merged file—either **regenerate full merge** on any member change or **deprioritize** merged storage in favour of zip-from-individuals.

**Recommendation for new system:** **per-student storage + streaming zip** for class download; keep merged PDF only if legally required.

---

## 7. Worker / queue architecture (production)

1. **API** enqueues work (dirty scope after debounce), returns quickly.
2. **Workers** (containers with Puppeteer) run with **global + per-school concurrency limits**.
3. Steps: load or build `reportData` (reuse Edge builder or shared module) → `renderTemplateHTML` / primary equivalent → `page.pdf` → upload to storage → update `report_pdf_artifacts`.
4. Optional: **nightly backfill** for missing `ready` artifacts in current term.

---

## 8. Memory / performance guardrails

- **Zip:** use **streaming** zip implementation; never `readFile` all class PDFs into RAM on small instances.
- **Images:** resize/compress logo and student photos to **report-suitable** resolution in HTML before PDF to cap file size (especially for large classes).
- **Puppeteer:** reuse browser in worker process where possible; cap parallel tabs.

---

## 9. Implementation phases (trackable checklist)

### Phase A — Schema & storage

- [ ] Create bucket + RLS policies (school-scoped read/write via service role or signed URLs).
- [ ] Migration: `report_pdf_artifacts` (and indexes on `school_id`, `exam_set_id`, `student_id`, `term`, `year`).

### Phase B — Generate & upload (parity)

- [ ] Extract or call existing **report data** builder (Edge or shared) with same inputs as preview.
- [ ] Run **identical** PDF rendering as `api/pdf/generate` (including margins per pipeline).
- [ ] Upload bytes; upsert metadata row; `status=ready`.

### Phase C — Dirty / debounce

- [ ] On `exam_results` write: mark dirty key `(school_id, exam_set_id, …)`.
- [ ] Debouncer service (cron or queue delay) → enqueue regen job with correct **invalidation scope** (§5).

### Phase D — Download API

- [ ] Single student: redirect to signed URL if `ready`; else queue sync/slow regen.
- [ ] Class: **streaming zip** from current artifacts; 404 policy for missing members.

### Phase E — Term rollover

- [ ] Scheduled job: delete out-of-window artifact rows + storage objects per §4.1.
- [ ] UI: hide class download for cold terms; allow single-student path.

### Phase F — Multi–exam-set QA

- [ ] School with Mid + EOT: generate both; verify paths differ by `exam_set_id`; downloads list filtered.
- [ ] Primary EOT merged payload: PDF under EOT `exam_set_id` matches current preview for that set.

### Phase G — Observability

- [ ] Metrics: regen count, failures, storage bytes per school, queue depth.

---

## 10. One-line summary for stakeholders

*We keep grades forever; we only keep **recent** PDF **files** for fast downloads. Each **exam set** gets its own cached PDFs per student. Marks changes kick off a **short debounce**, then **automatic** regen; class downloads are **zips of the latest files** without loading the whole class into RAM. Past terms: **one student at a time**, regenerate from data when needed.*

---

## 11. New chat quick prompt (copy/paste)

```text
Implement docs/PLAN_REPORT_PDF_STORAGE_RETENTION_AND_MULTI_EXAMSET.md. 
Requirements: same PDF appearance as current Puppeteer + renderTemplateHTML; 
Supabase Storage paths include exam_set_id and template_key; 
DB table report_pdf_artifacts; debounce ~2min; secondary invalidation per student 
unless template has class rank then class-wide; primary rank = class-wide; 
term rollover deletes old PDF blobs only; current term allows class zip via streaming; 
past terms single-student on-demand only; multi exam set mid vs eot separate artifacts.
```
