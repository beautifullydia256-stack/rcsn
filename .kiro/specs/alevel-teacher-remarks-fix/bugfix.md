# Bugfix Requirements Document

## Introduction

A-Level report cards display auto-generated UACE remarks (e.g. "Outstanding! Strive for excellence…") instead of the teacher's custom per-subject comments configured in `teacher_remarks_settings`. The A-Level report enrichment pipeline (`enrichSecondaryAlevelPreviewFromDb.ts`) never queries `teacher_remarks_settings`, so the auto-generated `overall_remark` always wins over any teacher-configured comment. This affects every school that has configured subject-specific remark bands for A-Level subjects.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a school has configured `teacher_remarks_settings` rows for an A-Level subject AND a student's mark percentage falls within a configured range THEN the system displays the auto-generated UACE string from `overall_remark` (e.g. "Outstanding! Strive for excellence…") on the report card instead of the teacher's custom comment.

1.2 WHEN `examResultRowToAlevelResultRow()` processes a result row THEN the system sets `overallOut = overallRaw || remarksRaw` where `overallRaw` is always non-empty (populated by the Edge function), causing the teacher's saved `remarks` / `teacher_comment` to be silently discarded.

1.3 WHEN `buildAlevelPaperRowsFromResults()` computes the `comment` field THEN the system resolves it as `row.overall_remark ?? row.teacher_remark ?? row.remarks ?? row.teacher_comment ?? ''`, which always resolves to `overall_remark` because it is never null or empty.

1.4 WHEN the A-Level report enrichment pipeline runs THEN the system never queries the `teacher_remarks_settings` table, so subject-specific percentage-based remarks are never applied.

### Expected Behavior (Correct)

2.1 WHEN a school has configured `teacher_remarks_settings` rows for an A-Level subject AND a student's mark percentage falls within a configured range THEN the system SHALL display the matching `comment_text` from `teacher_remarks_settings` on the report card.

2.2 WHEN `buildAlevelPaperRowsFromResults()` computes the `comment` field THEN the system SHALL override the auto-generated remark with the teacher's custom remark if a matching `teacher_remarks_settings` row exists for the subject and percentage, giving teacher-configured remarks higher priority than `overall_remark`.

2.3 WHEN `enrichSecondaryAlevelPreviewReportsFromDb()` runs THEN the system SHALL fetch all `teacher_remarks_settings` rows for the school once (grouped by subject, case-insensitive) and pass them into `buildAlevelPaperRowsFromResults()`.

2.4 WHEN computing the teacher remark for a subject THEN the system SHALL calculate the percentage as `(marksObtained / totalMarks) * 100` and find the first `teacher_remarks_settings` row where `min_percent <= percentage <= max_percent`.

### Unchanged Behavior (Regression Prevention)

3.1 WHEN no `teacher_remarks_settings` rows exist for a subject THEN the system SHALL CONTINUE TO use the existing fallback chain (`overall_remark ?? teacher_remark ?? remarks ?? teacher_comment ?? ''`) unchanged.

3.2 WHEN a student's mark percentage does not fall within any configured range for a subject THEN the system SHALL CONTINUE TO fall back to the existing auto-generated remark.

3.3 WHEN `teacher_remarks_settings` is empty or the fetch fails THEN the system SHALL CONTINUE TO produce report cards using the existing remark logic without error.

3.4 WHEN processing O-Level (Senior 1–4) reports THEN the system SHALL CONTINUE TO operate exactly as before — this fix is scoped to the A-Level pipeline only.

3.5 WHEN a student has no exam results in the database THEN the system SHALL CONTINUE TO render placeholder rows with the existing missing-results descriptor.
