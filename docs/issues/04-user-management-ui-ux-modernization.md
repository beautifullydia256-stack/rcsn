# Issue: User Management area — UI/UX feels disorganized, dated, and not mobile-friendly

**Status:** Documented (awaiting fix plan)  
**Last updated:** 2026-04-03  

## Summary

Stakeholder feedback: the **User Management** cluster of pages looks **ugly**, **disorganized**, and **not professional**. Layout and components feel **dated** (e.g. default-looking selects), **not mobile-friendly**, and inconsistent with the quality expected elsewhere in the product. **Typography and font colors** are called out as poor; desired direction is to **match or align** with fonts used on **Students**, **Teachers**, and **Parents** pages.

Functional symptoms intertwined with visuals: pages **sometimes** show **“No school linked”** when context should be valid; **placeholders** appear that **should not** be shown.

## In-scope pages (from screenshots / URLs)

| Area | Path (production) | Notes |
|------|-------------------|--------|
| User Management (All Users) | `pwezacore.com/dashboard/admin/accounts` | Role stat badges, search, role filter, user table; observed empty state “No users found.” |
| Send invitations | `pwezacore.com/dashboard/admin/accounts/invite` | Yellow banner: **“No school linked.”**; main content otherwise empty in screenshot. |
| Access & permissions | `pwezacore.com/dashboard/admin/permissions` | Title + description + key list; **“Select user”** dropdown with **“— Choose a user —”**; large unused dark space, minimal layout polish. |

Sidebar grouping shows these under **Management → User Management** (with **Staff**, **Classes**, etc. adjacent). This issue focuses on **User Management** pages; “Staff” menu item may need the same design system pass if it shares patterns.

## Stakeholder goals

1. **Modern look:** Clear hierarchy, intentional spacing, cohesive components—not “default browser” controls where custom UI is used elsewhere.
2. **Responsive:** Desktop and **mobile**; no broken or cramped layouts on small screens.
3. **Professional / unique:** Product should feel **distinctive and polished** (“nice,” “real” buttons—not flat or placeholder-quality interactions).
4. **Typography:** Improve fonts and **font colors**; **reuse the same type choices** (and color contrast patterns) as **Students / Teachers / Parents** admin pages unless there is a deliberate design exception.
5. **Organization:** Reduce visual noise, align grids/cards/tables with the rest of the admin experience.
6. **Behavior:** Pages must **work as designed**—not only look better. Includes fixing misleading **empty states**, **false “No school linked”**, and **wrong placeholders** (may overlap with [01-failed-to-send-invitation](./01-failed-to-send-invitation.md) school-context and API failures).

## Relationship to other issues

- **Invitation / school link:** [01](./01-failed-to-send-invitation.md) documents technical failures and universal “send invite” scope. This UX issue **includes** the **Send invitations** screen’s empty state and warning banner; backend fixes may be required **in addition** to UI/state handling (e.g. loading vs error vs empty).
- **“No users found.” / all role counts 0:** May be **data** (RLS, wrong `school_id`, or failed fetches) as much as **design**—plan should verify data loads in parallel with redesign.

## Assets

Screenshots provided by stakeholder (workspace copies for planning):

- `.../assets/c__Users_KIMULI_TECH_..._Screenshot__421_-f17e4fba-5dbe-4da1-a4c3-02ed4d875d9c.png` (Access & permissions)
- `.../assets/c__Users_KIMULI_TECH_..._Screenshot__420_-6232436c-a958-4bd0-bc23-303eb253f478.png` (Send invitations — “No school linked.”)
- `.../assets/c__Users_KIMULI_TECH_..._Screenshot__419_-780c6f89-4117-4414-a6d8-a1d50220ca3f.png` (User Management — All Users)

## Source

Stakeholder message + screenshots, 2026-04-03.
