# Issue: Financial analytics page — incomplete, weak KPIs, unprofessional Word export

**Status:** Documented (awaiting fix plan)  
**Last updated:** 2026-04-03  

## Summary

The **financial analytics** experience is judged **incomplete**: the page **lacks** much of what a school finance analytics view should show. **KPIs** must **work** and **load real data** for the **current school** (no stale or placeholder metrics). **Downloads** currently produce a **Word** document that feels **very unprofessional**; stakeholders want **PDF** exports that look like a proper report.

## Page (in-app analytics)

### Goals

- **Redesign** layout for clarity and professionalism; **organize** anything that feels scattered according to **standard school finance analytics** logic (collections, outstanding, trends, by class/term as appropriate—exact metrics to be finalized against schema).
- Ensure **KPIs reflect real, fetched data** for that school’s context (permissions and `school_id` scoping).
- Add **missing** sections/information the product owner considers standard for this domain (“whatever is missing” — to be validated against [UNPAID_BALANCES_IMPLEMENTATION](../UNPAID_BALANCES_IMPLEMENTATION.md) and existing finance routes).

## Export / download

### Current (undesired)

- Export is a **Word** document; quality is **not** acceptable for stakeholders.

### Desired

- **PDF** download (not Word as primary deliverable).
- **Professional presentation:** color styling acceptable when it improves readability; **not** a plain dump.
- **Charts:** e.g. **pie charts**, **graphs** (types TBD by data available).
- **Tables:** with **real data** aligned to **exact filters/selection** on the analytics page at export time.
- **Proportions / layout:** balanced, readable, suitable for sharing (headings, spacing, branding if product standard exists).

## Relationship to other issues

- **Wrong-term invoices** ([03](./03-dashboard-vs-outstanding-term-invoice-mismatch.md)) skew analytics if reports aggregate by term; analytics work should **validate** data after term/invoice fixes or **defensively** label periods.
- **Dashboard vs outstanding mismatch** [03](./03-dashboard-vs-outstanding-term-invoice-mismatch.md): analytics totals must stay **consistent** with authoritative finance data for the same school and period.

## Source

Stakeholder message; production context referenced: accountant/financial analytics area (exact URL path may mirror admin finance analytics patterns).
