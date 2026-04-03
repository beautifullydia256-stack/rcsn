# Issue: System Settings — dark-mode contrast, typography, mobile, modern polish (UI only)

**Status:** Documented (awaiting fix plan)  
**Last updated:** 2026-04-03  

## Summary

The **System Settings** area spans **many pages**. The main problems are **not mobile-friendly**, **poor text visibility on dark mode** (faded / low-contrast copy looks **dull** and hard to read), and overall **dated** presentation. Stakeholder wants to keep **dark mode** but make **every settings screen** use **visible**, consistent typography and color choices aligned with the dark background (e.g. **true white** or another **proven accessible** foreground color applied **systematically**).

## Goals

### Responsive

- **Mobile-friendly** and **desktop-friendly** layouts for **all** System Settings sub-pages (readable touch targets, no overflow traps, sensible stacking).

### Readability on dark mode

- Replace or tune **fading / low-contrast** grays that are **not visible**.
- Ensure **labels, body text, headings, helpers, and interactive text** meet contrast expectations on dark backgrounds across **every** settings page—**same design tokens** where possible so behavior feels **one product**, not page-by-page drift.

### Modern feel

- Where small **layout or spacing** changes improve clarity (cards, sections, hierarchy), they are **in scope**—without changing **what** users configure.

## Hard constraint (non-negotiable)

- **UI and layout only:** **Do not** change how settings are **saved**, **loaded**, **validated server-side**, or **wired to APIs**. Existing behavior must **keep working** as today. If a visual refactor touches a form, **preserve** field names, submit handlers, and data flow.

## Relationship to other issues

- Same **dark-mode contrast** principles as **[04-user-management-ui-ux-modernization](./04-user-management-ui-ux-modernization.md)** if User Management shares tokens; **System Settings** should use a **shared** admin design system where feasible.

## Source

Stakeholder message (fonts/phones → **fonts**; visibility on dark mode; many pages; modern + responsive; don’t break saves), 2026-04-03.
