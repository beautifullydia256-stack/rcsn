# Tasks: A-Level Teacher Remarks Fix

## Task List

- [x] 1. Add type aliases and `fetchTeacherRemarksSettings` function
  - [x] 1.1 Add `TeacherRemarkRange` and `TeacherRemarksBySubject` type aliases in `enrichSecondaryAlevelPreviewFromDb.ts`
  - [x] 1.2 Implement `fetchTeacherRemarksSettings(supabase, schoolId)` that queries `teacher_remarks_settings`, groups rows by normalised subject key, and returns a `Map<string, TeacherRemarkRange[]>`

- [x] 2. Add `resolveTeacherRemark` pure helper
  - [x] 2.1 Implement `resolveTeacherRemark(settingsBySubject, subject, marksObtained, totalMarks)` that computes percentage and returns the matching `comment_text` or `null`

- [x] 3. Update `buildAlevelPaperRowsFromResults` to accept and apply teacher remarks
  - [x] 3.1 Add optional `teacherRemarksBySubject?: TeacherRemarksBySubject` to the `opts` parameter
  - [x] 3.2 After computing `remark` from the existing fallback chain, call `resolveTeacherRemark` and use its result when non-null (`teacherRemark ?? remark`)

- [x] 4. Fetch teacher remarks settings in `enrichSecondaryAlevelPreviewReportsFromDb` and pass to builder
  - [x] 4.1 Call `fetchTeacherRemarksSettings` once (with try/catch fallback to empty Map) after the existing parallel fetches
  - [x] 4.2 Pass `teacherRemarksBySubject` into the `buildAlevelPaperRowsFromResults` call

- [x] 5. Verify the fix compiles and existing tests pass
  - [x] 5.1 Run TypeScript compilation check on the modified file
  - [x] 5.2 Confirm no regressions in related test files if present
