# Issue: Notification center — replace current UI with a real notification hub

**Status:** **Done** (verified 2026-04-08; hub + registry-style header shipped)  
**Last updated:** 2026-04-08  

## Summary

Stakeholder wants the **current notification center experience removed and rebuilt from scratch**. The present look and behavior are **not** acceptable. The replacement should behave like a standard **notification center**: a place you open to **see a list of notifications**, open individual items, and have **read** vs **unread** (or **new**) state drive what stays visible.

## Product vision

- **Central page (or panel)** dedicated to **notifications**—not miscellaneous UI filling the same slot today.
- **Categories / examples** of events that should be able to surface (non-exhaustive; extend to “anything” meaningful in the system):
  - **Payments** (e.g. recorded, received, reminders)
  - **Messages**
  - **New student** added to the system
  - **Receipts** issued or related actions
  - Other domain events as the app supports them

## Behavior

### Unread / new

- The system should show **notifications that have not yet been read** (or not yet acknowledged).
- **New** items are prominent until the user deals with them.

### Read / dismiss

- When the user **opens** a notification (or explicitly marks it **read**—stakeholder: after opening, treat as seen), it should **no longer appear as unread** / **new**.
- Stakeholder wording: after reading, notifications should **hide** from the “new” pile (i.e. move to **read** history, archive, or disappear from the main unread list)—**until new notifications arrive** for those channels or new events fire.

### Clarity

- Avoid ambiguous states: user should understand **what is new** vs **already seen**.

## Non-goals for this document

- Exact visual design spec (follow existing admin design language after scrub).
- Full event catalog and database schema—defined during implementation against audit/log or event table strategy.

## Relationship to other work

- **Finance events** (payments, receipts) tie to [06-financial-analytics-redesign-and-pdf-export](./06-financial-analytics-redesign-and-pdf-export.md) data layer indirectly; notifications need **reliable events** from the same sources of truth.
- **User Management / messages** may feed message-type notifications.

## Source

Stakeholder message (“remove everything,” “real notification center,” read/hide/unread behavior), 2026-04-03. Voice transcript quirks normalized (“Hyde” → **hide**, “click on read” → mark as read / open to dismiss from new).
