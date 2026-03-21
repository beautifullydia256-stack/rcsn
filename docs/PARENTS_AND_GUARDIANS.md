# Parents and guardians — single source of truth

## Model

- **There is no separate “guardian” table.** In PwezaCore, “parent” and “guardian” are the same kind of record: a **contact linked to a student** who may or may not have a **portal login**.
- **Canonical data lives in `public.parents`.** Each row ties:
  - `student_id` + `school_id`
  - Contact fields: `name`, `phone`, `email`, `relationship` (e.g. Father, Mother, Guardian)
  - **`parent_id`**: when set, this is `auth.users.id` for the parent portal account (same id used in RLS: “this row is mine when `auth.uid() = parent_id`”).

## Why `students.guardian_*` still exists

Historical and offline/sync paths stored guardian fields on `students` (`guardian_name`, `guardian_phone`, `guardian_email`, `guardian_relationship`, etc.).

**Going forward:**

- **`public.parents` is the source of truth** for who is linked to the student.
- **`students.guardian_*` is a denormalized mirror** of the **primary** parent/guardian row, kept in sync by a database trigger when `parents` changes. Do **not** treat `students.guardian_*` as authoritative for new features; read from `parents` when possible.

## Logins

- Parent portal login is always **`auth.users`** + **`public.users`** with `role = 'parent'`, and **`parents.parent_id`** = that user’s id for each `(parent, student)` link.
- Creating a login is still done via **`/api/admin/ensure-parent-link`** (real email, etc.). Rows in `parents` without a matching auth user are **contact-only** until an admin completes linking (where the schema allows; see migrations).

## App code

- Prefer **`displayParentsForStudent()`** (`src/lib/studentDisplayParents.ts`) and queries against **`parents`** for UI.
- When saving a student’s primary contact after enrollment, prefer flows that **insert/update `parents`** and let triggers refresh `students.guardian_*`, rather than writing guardian columns alone.

## Database migration

Migration **`20260321130000_parents_canonical_guardian_sync.sql`**:

- Documents columns and adds **`relationship`** / **`is_primary_contact`** on `parents` if missing.
- **Backfills** `parents` rows when `students.guardian_email` matches an existing **`users`** row with `role = 'parent'` and no link yet (fixes historical splits).
- Installs **`apply_student_guardian_mirror_from_parents`** + trigger so **`students.guardian_*` always mirrors the primary `parents` row** for that student.

## Future (optional)

To store **every** enrollment contact in `parents` **without** a portal user, the schema would need a **surrogate key** and **`parent_id` nullable** (or a separate `auth_user_id`). That is a larger change (sync clients, RLS). Until then, contacts that only exist on `students` without a matching parent user email are still mirrored by app logic (`displayParentsForStudent`).
