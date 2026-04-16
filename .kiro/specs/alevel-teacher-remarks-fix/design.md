# Design Document: A-Level Teacher Remarks Fix

## Overview

The fix is entirely contained within `src/lib/enrichSecondaryAlevelPreviewFromDb.ts`. Two new pure helper functions are added, one new async fetch function is added, and `buildAlevelPaperRowsFromResults` receives an optional `teacherRemarksBySubject` parameter. The existing fallback chain is preserved when no matching teacher remark is found.

## Bug Condition

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type { subject: string, marksObtained: number, totalMarks: number, schoolId: string }
  OUTPUT: boolean

  // Bug fires when teacher_remarks_settings has a matching row for the subject+percentage
  // but the pipeline never looks it up
  RETURN teacherRemarksSettingsExist(X.schoolId, X.subject) = true
END FUNCTION
```

**Fix Checking Property:**
```pascal
FOR ALL X WHERE isBugCondition(X) DO
  result ← buildAlevelPaperRowsFromResults'(X)
  ASSERT result.comment = matchingTeacherRemarkCommentText(X)
END FOR
```

**Preservation Property:**
```pascal
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT buildAlevelPaperRowsFromResults(X) = buildAlevelPaperRowsFromResults'(X)
END FOR
```

## Technical Context

### Root Cause

`buildAlevelPaperRowsFromResults` computes `comment` as:
```ts
const remark = String(
  (row.overall_remark ?? row.teacher_remark ?? row.remarks ?? row.teacher_comment ?? '') as string,
).trim();
```

Because `overall_remark` is always populated by the Edge function with a UACE auto-string, it always wins. The `teacher_remarks_settings` table is never queried in this pipeline.

### What Works (Reference Implementation)

`app/api/processed-exam-results/route.ts` correctly:
1. Fetches all `teacher_remarks_settings` rows per subject for the school
2. Computes `percentage = (marks / totalMarks) * 100`
3. Finds the first row where `min_percent <= percentage <= max_percent`
4. Uses `comment_text` as the remark

`SecondaryALevelExamGrid.tsx` also correctly fetches `teacher_remarks_settings` using `.ilike('subject', subject.trim())` for case-insensitive matching.

## Implementation Plan

### 1. New type alias

```ts
type TeacherRemarkRange = {
  min_percent: number;
  max_percent: number;
  comment_text: string;
};
type TeacherRemarksBySubject = Map<string, TeacherRemarkRange[]>;
```

### 2. `fetchTeacherRemarksSettings(supabase, schoolId)`

Fetches all rows from `teacher_remarks_settings` for the school in a single query, groups them by normalised subject key (lowercase, trimmed), and returns a `Map<string, TeacherRemarkRange[]>`.

```ts
async function fetchTeacherRemarksSettings(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<TeacherRemarksBySubject> {
  const { data, error } = await supabase
    .from('teacher_remarks_settings')
    .select('subject, min_percent, max_percent, comment_text')
    .eq('school_id', schoolId)
    .order('min_percent', { ascending: true });
  if (error) throw new Error(error.message);
  const out: TeacherRemarksBySubject = new Map();
  for (const row of data || []) {
    const key = normalizeReportSubjectKey(String(row.subject || ''));
    if (!key) continue;
    if (!out.has(key)) out.set(key, []);
    out.get(key)!.push({
      min_percent: Number(row.min_percent ?? 0),
      max_percent: Number(row.max_percent ?? 100),
      comment_text: String(row.comment_text || ''),
    });
  }
  return out;
}
```

### 3. `resolveTeacherRemark(settingsBySubject, subject, marksObtained, totalMarks)`

Pure helper — no I/O. Returns the matching `comment_text` or `null` if no match.

```ts
function resolveTeacherRemark(
  settingsBySubject: TeacherRemarksBySubject,
  subject: string,
  marksObtained: number | null | undefined,
  totalMarks: number | null | undefined,
): string | null {
  if (marksObtained == null || !Number.isFinite(marksObtained)) return null;
  const tm = Number(totalMarks ?? 100) || 100;
  const pct = (marksObtained / tm) * 100;
  const key = normalizeReportSubjectKey(subject);
  const ranges = settingsBySubject.get(key);
  if (!ranges?.length) return null;
  const match = ranges.find((r) => pct >= r.min_percent && pct <= r.max_percent);
  return match?.comment_text ?? null;
}
```

### 4. Update `buildAlevelPaperRowsFromResults`

Add `teacherRemarksBySubject?: TeacherRemarksBySubject` to the `opts` parameter. After computing `remark` from the existing chain, override with the teacher remark if one is found:

```ts
function buildAlevelPaperRowsFromResults(
  resultsOut: ResultRow[],
  opts?: {
    defaultClassName?: string;
    teacherAssignments?: TeacherClassSubjectAssignment[];
    teacherRemarksBySubject?: TeacherRemarksBySubject;  // NEW
  },
): Array<Record<string, unknown>> {
  // ...existing code...
  const remark = String(
    (row.overall_remark ?? row.teacher_remark ?? row.remarks ?? row.teacher_comment ?? '') as string,
  ).trim();

  // NEW: override with teacher-configured remark if available
  const mo = numOrUndef(row.final_score) ?? numOrUndef(row.marks_obtained);
  const teacherRemark = opts?.teacherRemarksBySubject
    ? resolveTeacherRemark(opts.teacherRemarksBySubject, subj, mo, Number(row.total_marks ?? 100))
    : null;
  const finalComment = teacherRemark ?? remark;

  return {
    // ...
    comment: finalComment,  // was: comment: remark
    // ...
  };
}
```

### 5. Fetch in `enrichSecondaryAlevelPreviewReportsFromDb`

Fetch teacher remarks settings once alongside the other parallel fetches, then pass into `buildAlevelPaperRowsFromResults`:

```ts
let teacherRemarksBySubject: TeacherRemarksBySubject = new Map();
try {
  teacherRemarksBySubject = await fetchTeacherRemarksSettings(supabase, schoolId);
} catch (e) {
  console.warn('[enrichSecondaryAlevelPreviewFromDb] teacher_remarks_settings fetch failed', e);
}
```

Then in the call to `buildAlevelPaperRowsFromResults`:
```ts
const paperRows = buildAlevelPaperRowsFromResults(resultsOut, {
  defaultClassName: classForPrefs,
  teacherAssignments,
  teacherRemarksBySubject,  // NEW
});
```

## Data Flow (After Fix)

```
teacher_remarks_settings (DB)
        │
        ▼
fetchTeacherRemarksSettings()   ← called once per enrichment run
        │
        ▼  Map<subjectKey, TeacherRemarkRange[]>
        │
        ▼
buildAlevelPaperRowsFromResults(resultsOut, { teacherRemarksBySubject })
        │
        ├─ for each row:
        │    existing remark = overall_remark ?? teacher_remark ?? remarks ?? teacher_comment ?? ''
        │    teacherRemark   = resolveTeacherRemark(map, subject, marks, totalMarks)
        │    comment         = teacherRemark ?? existing remark   ← teacher wins if configured
        │
        ▼
paperRows[].comment = correct teacher remark (or fallback)
```

## Correctness Properties

### Fix Checking
For any result row where `teacher_remarks_settings` has a matching range for the subject and percentage, `buildAlevelPaperRowsFromResults` must return `comment = comment_text` from that range.

### Preservation
For any result row where no matching `teacher_remarks_settings` range exists, `buildAlevelPaperRowsFromResults` must return the same `comment` as before the fix.

### Error Resilience
If `fetchTeacherRemarksSettings` throws, the pipeline must continue with an empty map (existing behavior preserved for all rows).
