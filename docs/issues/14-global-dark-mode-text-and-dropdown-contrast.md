# Issue: Global dark theme — gray text hard to read; dropdowns white-on-white

**Status:** Fix in repo (verify in production)  
**Last updated:** 2026-04-06  

## Summary

The product is used primarily in **dark mode** (stakeholder: **light mode is not wanted right now**; may return later). **Muted gray** body/label text on **dark** backgrounds is **hard to read**. Stakeholders want **higher-contrast** foreground colors—**true white** or another **brighter** token that stays readable **without** harsh “neon” overuse.

## Scope

- **All pages** and **all dashboards** (admin, accountant, teacher, parent—as applicable) where theme tokens apply: replace or tune **low-contrast gray-on-dark** with a **consistent, accessible** palette.
- This is a **cross-cutting UI pass**, not a single screen (complements [09-system-settings-ui-visibility-responsive](./09-system-settings-ui-visibility-responsive.md) and [04-user-management-ui-ux-modernization](./04-user-management-ui-ux-modernization.md)).

## Dropdowns (native or unstyled)

### Reported problem

Some **dropdowns** render with a **white** panel and **white** (or low-contrast) option text in **dark mode**, so choices are **invisible**.

### Expected behavior

- Select / combobox / menu surfaces use **dark-mode-aware** backgrounds and **readable** option text (sufficient contrast).
- Behavior matches **dark** theme consistently (stakeholder does not want to fall back to light mode for legibility).

## Non-goals (for this document)

- Re-introducing **light mode** as default (explicitly **out of scope** until product asks).
- Changing business logic—**tokens, components, and CSS** unless required for theme wiring.

## Source

Stakeholder message (gray text on dark dashboards, all pages, dropdown white-on-white, dark mode only for now), 2026-04-03.

## Fix notes (2026-04-06)

- **Global (`src/styles/index.css`):** `html.dark` / `.dark` sets `color-scheme: dark`, brighter `--pw-t1–t3`, Tailwind `--foreground` / `--muted-foreground`, and default **`select` / `option`** colors so native dropdowns are not white-on-white.
- **Admin shell (`AdminLayout.tsx`):** Matched text tokens; `select` uses explicit border + `color-scheme: dark`.
- **Dashboard template (`DesignAdminDashboard.tsx`):** Dark `--t1–t3` aligned.
- **Accountant glass (`accountant-glass.css`):** Dark secondary/muted text contrast raised; `select.ac-input` + options forced to slate panel colors.
- **Parent portal:** Muted copy `#7c89b0` → `#b0bdd8`; `parentPortal.muted` token added.
- **Teacher/student scoped shells:** `--t2` brightened where it was still the old gray.
