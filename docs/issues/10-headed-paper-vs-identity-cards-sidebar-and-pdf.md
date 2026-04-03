# Issue: “Headed paper” sidebar goes to identity cards — split routes; real headed paper + PDF

**Status:** Documented (awaiting fix plan)  
**Last updated:** 2026-04-03  

## Summary

The product was intended to support **headed paper** (letterhead) for schools. Today, the sidebar entry labeled **headed paper** navigates to a page about **student identity cards**, which is **wrong** and confusing. Stakeholders want **clear separation**: **Identity cards** as its own sidebar destination (linking to the **current** ID-card experience), and a **dedicated Headed paper** page for **school letterhead** users can **preview** and **download**.

## Correct information architecture

| Sidebar label | Destination | Purpose |
|---------------|-------------|---------|
| **Identity cards** (new or clarified label) | Existing student ID card flow | Current behavior moves here. |
| **Headed paper** | New page | School configures/previews **letterhead** and downloads **PDF**. |

## Headed paper page — goals

- **Modern** template: professional layout suitable for official school documents.
- Includes **header** area (school branding as product already supports elsewhere—logo, name, contact, etc.) and a **footer** (stakeholder: header + footer; “under footer” interpreted as **footer block** on the page/PDF, not removing footer).
- **On-page preview** so staff see **exactly** what they get before download.
- **Download as PDF** (primary deliverable).

## Non-goals in this document

- Final pixel spec or copy; implementation picks sensible margins and safe zones for printing.

## Source

Stakeholder message (misrouted sidebar, split nav, PDF, preview, modern headed paper with header/footer), 2026-04-03.
