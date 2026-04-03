# Issue: Failed to add parent

**Status:** Documented (awaiting fix plan)  
**Last updated:** 2026-04-03  

## Summary

After **selecting a student** and attempting to **add a parent**, the operation fails. The app shows **“Failed to add parent”**.

## Where it happens

- Parent-add flow tied to **student selection** (exact menu path not specified in report; admin/parent management UI).

## Expected behavior

Parent is added (and linked to the selected student) successfully.

## Actual behavior

- User sees **Failed to add parent**.
- Browser console shows failing network requests (see below).

## Console / network evidence (as observed)

Project host: `ibnyclqobbrnjyxbbfsg.supabase.co` unless noted.

### Supabase PostgREST `users` — HTTP 400 (repeated)

Same pattern as [01-failed-to-send-invitation](./01-failed-to-send-invitation.md):

- `GET .../rest/v1/users?select=user_id,email,name,role,phone,department,position,created_at,last_sign_in_at,is_active&school_id=eq.2b2db83c-08d8-475d-a9cd-886665316318&order=created_at.desc`
- `GET .../rest/v1/users?select=user_id,email,is_active,updated_at,phone,linked_teacher_id&school_id=eq.2b2db83c-08d8-475d-a9cd-886665316318&role=eq.teacher`

### App API

| Request | Result |
|--------|--------|
| `/api/admin/create-user-account` | `net::ERR_CONNECTION_CLOSED` |
| `/api/admin/ensure-parent-link` | **HTTP 500** |

## School context

- `school_id` in failing Supabase queries: `2b2db83c-08d8-475d-a9cd-886665316318`

## Relationship to other issues

- Overlaps with **failed to send invitation** ([01](./01-failed-to-send-invitation.md)): same **`users` 400** responses and **`create-user-account` connection closed**.
- **Parent-specific signal:** **`ensure-parent-link` returns 500** — likely directly related to “Failed to add parent”.

## Notes for later investigation (not validated)

- Capture **response body** for `ensure-parent-link` (500) and PostgREST **400** message from Supabase (often JSON `message` / `details`).
- Determine whether parent add depends on `create-user-account` succeeding first; **`ERR_CONNECTION_CLOSED`** may block or confuse the flow before link step.

## Source

User report + browser console output (production), 2026-04-03.
