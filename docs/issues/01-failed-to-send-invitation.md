# Issue: Failed to send invitation

**Status:** Documented (awaiting fix plan)  
**Last updated:** 2026-04-03  

## Summary

When an admin (or equivalent) tries to send an invitation—e.g. to a teacher, parent, or another user—the action fails. The app surfaces **“Failed to fetch”** after clicking **Send invitation**.

## Where it happens

- Example page: teacher “create login” / invite flow  
  `https://www.pwezacore.com/dashboard/admin/teachers/<teacher-id>/create-login`  
  (example teacher id in report: `7bf59a10-68c0-4e9c-8eeb-5f5df0bb1b7c`)
- User indicates similar failure on **other pages** when sending invitations (not only teachers).

## Related list item: “Send invitations shows no school linked”

Treated as **part of the same invitation reliability problem**, not a separate root cause by screen. Any message or state that implies **no school is linked** during invite should be resolved so a legitimate in-school user can complete **Send invitation** without that blocker.

## Product scope (acceptance criteria)

From stakeholder direction: **wherever** the product offers **send invite**, the flow must **work**—not only one URL. That includes:

- **All surfaces** that expose invitation (no exhaustive screen list required for scoping; audit code/routes for all entry points).
- **Phone and desktop** (responsive / mobile browsers and small viewports).
- **All roles** that the product is supposed to invite from (within intended permissions).

Fix planning should verify **each** invite entry point after the underlying API/RLS/school-context issues are addressed.

## Expected behavior

Invitation sends successfully (and downstream UI/state updates accordingly), meeting the **product scope** above—correct **school context** on every invite path, no false “no school linked” for valid admins.

## Actual behavior

- User sees **Failed to fetch** when clicking **Send invitation**.
- Browser console shows failing network requests (see below).

## Console / network evidence (as observed)

All against project host `ibnyclqobbrnjyxbbfsg.supabase.co` unless noted.

1. **HTTP 400** on PostgREST `users` reads (repeated):
   - `GET .../rest/v1/users?select=user_id,email,name,role,phone,department,position,created_at,last_sign_in_at,is_active&school_id=eq.2b2db83c-08d8-475d-a9cd-886665316318&order=created_at.desc`
   - `GET .../rest/v1/users?select=user_id,email,is_active,updated_at,phone,linked_teacher_id&school_id=eq.2b2db83c-08d8-475d-a9cd-886665316318&role=eq.teacher`

2. **Connection closed** on app API:
   - `GET` or request to **`/api/admin/create-user-account`**  
   - Error: `net::ERR_CONNECTION_CLOSED`

## School context (from URLs)

- Example `school_id` filter in failing requests: `2b2db83c-08d8-475d-a9cd-886665316318`

## Notes for later investigation (not validated)

- **400** on `users` may indicate RLS, invalid filter, schema/column mismatch, or PostgREST rejecting the query shape.
- **ERR_CONNECTION_CLOSED** on `/api/admin/create-user-account` may indicate serverless timeout, crash, TLS/proxy issue, or route/handler failure—separate from Supabase 400 but could be the direct cause of “Failed to fetch” for the invite action.

## Source

User report + browser console output (production: pwezacore.com), 2026-04-03.  
**Amendment:** Stakeholder clarified that list item “Send invitations shows no school linked” is the same family of failures; acceptance criteria are **all invite surfaces, phone + desktop, all roles** that should be able to invite—no need to enumerate screens for the requirement.
