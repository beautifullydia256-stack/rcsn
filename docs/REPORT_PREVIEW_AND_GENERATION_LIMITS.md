# Report Preview & Generation — Limits and Performance

This document summarizes limits, safeguards, and performance expectations for the report preview and final generation flow.

## Architecture summary

- **Preview:** One Edge Function call (`generate-report-preview`). Read-only, no writes to `report_snapshots`, `report_snapshot_data`, or `generated_reports`. Returns `report_data[]`; frontend renders with `ReportPreviewFromData`.
- **Final:** One Edge Function call (`generate-reports-final`). Creates snapshot → inserts snapshot data → locks → builds `report_data` from locked snapshot → chunked bulk insert into `generated_reports`.
- **PDF:** Client uses Print → Save as PDF from the preview area. Edge Functions `generate-pdf-from-data` and `generate-pdf-from-snapshot` return report data for client-side rendering; for heavy PDF (50+ reports), use `VITE_PDF_API_URL` (Node/Puppeteer).

## Limits and safeguards

| Item | Limit | Notes |
|------|--------|--------|
| Preview response size | First 100 reports returned | `generate-report-preview` returns at most 100 reports; `totalCount` and `truncated` indicate if more exist. For larger classes, use pagination or Generate & Save then view from snapshot. |
| Bulk insert chunk size | 300–500 rows | `generate-reports-final` uses 400 rows per chunk when inserting into `generated_reports`. |
| PDF from data (Edge Function) | Max 100 reports | `generate-pdf-from-data` rejects more than 100 reports; use `VITE_PDF_API_URL` for larger batches. |
| Snapshot / final flow | Single request | Full flow (create snapshot, insert data, lock, build from locked snapshot, bulk insert) in one invoke. No per-student round-trips. |

## Performance targets (deployment checklist)

| Scenario | Target | Verification |
|----------|--------|--------------|
| Preview: 1 student | &lt; 1 s | Measure from "Preview Report" click to rendered preview. |
| Preview: ~50 students | &lt; 2 s | Same; ensure ranking (position, totalStudents) is correct for single-student preview. |
| Generate & Save: ~50 students | &lt; 3 s | Measure from "Generate & Save" click to success response. |
| PDF (client print) | N/A | User uses Print → Save as PDF; no server PDF for large batches from Edge Function. |

## Scalability (500+ students)

- **Preview:** For classes &gt; 100 students, preview returns the first 100; document that "Load next 50" or Generate & Save is required for full class.
- **Final:** Chunked bulk insert (400 per batch) keeps memory and PostgREST within limits; test with 500 students × 15 subjects to confirm timeout and size.
- **PDF:** For 500 students, use `VITE_PDF_API_URL` (Node/Puppeteer) or a background job + polling; do not use Edge Function PDF for 100+ reports in one request.A

## Authorization

- All Edge Functions (`generate-report-preview`, `generate-reports-final`, `generate-pdf-from-data`, `generate-pdf-from-snapshot`) verify the authenticated user's `school_id` and role (admin, owner, head_teacher) before reading or writing. School isolation is enforced.

## Logging (optional)

- Edge Functions may log start time, end time, student count, and duration for profiling. Not required for correctness.
