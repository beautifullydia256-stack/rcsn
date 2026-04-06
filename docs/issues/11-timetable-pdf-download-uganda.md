# Issue: Timetable — enable PDF download (Ugandan school format, class / school scope)

**Status:** **Done** (signed off 2026-04-06)  
**Last updated:** 2026-04-06  

## Summary

From **Timetable Designer** (System Settings), admins can download a **PDF**: **whole school** produces **one page per class** that has periods; **single class** produces one page. Layout uses period times as rows and weekdays as columns (ASCII-safe jsPDF). Teacher-facing timetable may still use browser print where applicable.

**Resolved:** `src/lib/timetablePdf.ts`; Vite `SettingsTimetable`; Next.js `TimetableDesigner`.

## Download scope

- **Per class** — PDF for a **single** class timetable.
- **Whole school** — PDF covering the **full school** timetable (stakeholder request).
- Implementation should support selecting scope before generate/download.

## Format / quality

- **PDF** output (not ad-hoc image-only unless product standard says otherwise).
- Layout and conventions should align with **local Ugandan** timetable expectations (period rows, days, subjects, etc.—detail in implementation pass).

## Source

Stakeholder message, 2026-04-03.
