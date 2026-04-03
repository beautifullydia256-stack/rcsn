# Issue: Attendance — NA only when no data; show counts (e.g. 300/1000) not only %

**Status:** Documented (awaiting fix plan)  
**Last updated:** 2026-04-03  

## A — Reports: “NA” for days present / missed

### Reported problem

Student reports show **NA** for attendance-related fields even when **attendance is recorded** in the school system.

### Expected behavior

- Show **NA** (or equivalent “not available”) **only when** the school has **not recorded any attendance** for the relevant scope (period/class/student—define precisely in implementation).
- When attendance **exists**, reports must show **actual** values (present / absent / days counted as product rules specify), **not** blanket NA.

## B — UI system-wide: percentages vs exact counts

### Reported problem

Across the app, attendance is often surfaced **only as a percentage**, which does not show **scale** (e.g. how many pupils out of how many).

### Expected behavior

Where attendance is summarized for a school or cohort (example: **1,000** students enrolled):

- Show **explicit counts**, e.g. **300 present of 1,000** (`300/1000`), **900 present** with **100 missed** when that matches product wording—or an unambiguous **fraction + absent count** so users see **both** numerator and denominator.
- **Percentage** may remain as **supplementary** context if useful, but stakeholders should **not** rely on % alone when raw counts are available.

### Scope

- **All** surfaces that present attendance aggregates (dashboards, attendance pages, summaries—audit during fix plan).

## Relationship to other issues

- Wrong-term or enrollment quirks [03](./03-dashboard-vs-outstanding-term-invoice-mismatch.md) could affect denominators; validate “enrolled” vs “expected that day” per business rule.

## Source

Stakeholder message (NA semantics, counts vs %, examples 300/1000), 2026-04-03.
