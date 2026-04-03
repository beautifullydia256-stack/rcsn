# Issue: “Report for Lower Section” & “Report for Upper Section” — preview invisible text; PDF missing preview content

**Status:** Documented (awaiting fix plan)  
**Last updated:** 2026-04-03  

## Context

- **Page:** [Generate reports](https://www.pwezacore.com/dashboard/admin/reports/generate) — `pwezacore.com/dashboard/admin/reports/generate`
- **Templates in scope:**  
  - **Template: Report for Lower Section**  
  - **Template: Report for Upper Section**  
  Stakeholder states **Upper** has the **same classes of problems** as **Lower**; fixes apply to **both**.

## A — Preview (on-screen): white text on white background

On preview, table content is **unreadable** because **foreground and background are both white** (or equivalent lack of contrast).

### Affected preview tables/areas

1. Main results table with columns including:  
   **SUBJECT · FULL MARKS · MID TERM · END OF TERM · TEACHER'S REMARKS · INITIAL** (and row data in the same styling).
2. **Subject Grade Boundaries** table.
3. **Division by Aggregate Points** table(s).

**Requirement:** Fix preview styling so **all** table headers and cell text use **visible contrast** against the preview background (consistent with rest of admin dark/light theme for that view).

## B — PDF must mirror preview for the selected template

Stakeholder principle: **everything** shown on the **preview** for the chosen template should appear on the **downloaded PDF** with the **same informational design** (layout may adapt to PDF pagination but **no silent omissions**).

### B1 — Lower Section (and Upper — same expectations)

| Area | Preview | PDF today (reported) | Required |
|------|---------|----------------------|----------|
| Main subject / marks / remarks table | Visible (PDF OK) | Present | Keep; ensure parity/styling. |
| Subject Grade Boundaries | Shown | **Missing** | **Include on PDF** as in preview. |
| Division by Aggregate Points | Shown | **Missing** | **Include on PDF** as in preview. |
| Class teacher's comments | Shown | **Missing** | **Include on PDF.** |
| Headteacher's comments | Shown | **Missing** | **Include on PDF.** |
| School **email** and **phone** | Shown | **Missing** | **Include on PDF** to match preview. |
| **Fees balance** for student | Should reflect reality | Verify | **Always show real** fees balance for that student (ties to finance source of truth; see [03](./03-dashboard-vs-outstanding-term-invoice-mismatch.md) if wrong-term data skews balance). |

### B2 — Upper Section

- **Same fixes** as Lower for: preview contrast, PDF inclusion of grade-boundary and division tables, **both comment blocks**, school contact lines, and accurate **fees balance**.

## C — Performance note

- **Preview** speed is acceptable (stakeholder likes it).
- **PDF** generation may be slower; stakeholder tolerates some delay but **priority is correctness and completeness**, not shaving latency at the cost of missing sections.

## D — Data / backend

- Stakeholder mentions **Supabase** only as context for wanting **fast** preview and acceptable PDF latency; any missing PDF fields may be **template/renderer** gaps rather than DB—but implementation should confirm **same data pipeline** feeds preview and PDF (no duplicate logic that drops sections).

## Primary 7 (P7) template

Stakeholder: **P7 does not need a separate write-up**—treat it under the same reporting workstream. Apply the **same** principles as Lower/Upper: **preview legibility** (no invisible tables), **PDF parity with preview** for the selected template, **comments**, **fees**, **school contact**, and any **grading** blocks that appear on preview. **Audit P7** alongside Lower/Upper during implementation.

## Acceptance criteria (summary)

1. Preview tables for **Lower**, **Upper**, and **P7** (as applicable): **readable** (no white-on-white).  
2. PDF for those templates: **includes every block** visible on preview, including grade boundaries, division-by-aggregate, **class teacher** and **headteacher** comments, school **email** and **phone**, and **correct fees balance**.  
3. Visual quality of PDF can stay “as stakeholder likes” aside from **completeness** fixes.

## Source

Stakeholder message (generate reports URL, Lower + Upper templates, preview vs PDF gaps, fees, school contact), 2026-04-03. **Amendment:** P7 folded into same template fix pass (no duplicate issue doc), 2026-04-03.
