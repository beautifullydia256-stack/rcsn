# Current RLS Policies (Recorded from Live DB)

**Date captured:** From audit run  
**Purpose:** Preserve these before global terms / student status changes. Do NOT drop or alter without ensuring equivalent behavior.

---

## 1. school_terms — optimized_authenticated_access

| Property | Value |
|----------|-------|
| Roles | `{public}` |
| Command | ALL |
| Permissive | YES |

**USING:**
```sql
(SELECT auth.role()) = 'authenticated'
```

**WITH CHECK:** `null` (PostgreSQL uses USING for check when absent)

**Effect:** Any authenticated user can SELECT, INSERT, UPDATE, DELETE all rows in `school_terms`. No school scoping.

---

## 2. students — students_school_scoped

| Property | Value |
|----------|-------|
| Roles | `{authenticated}` |
| Command | ALL |
| Permissive | YES |

**USING and WITH CHECK (identical):**
```sql
(
  school_id IN (SELECT school_id FROM users WHERE user_id = auth.uid())
  OR school_id IN (SELECT school_id FROM schools WHERE admin_id = auth.uid())
  OR school_id IN (SELECT school_id FROM users WHERE user_id = auth.uid() AND role = 'admin')
)
```

**Effect:** Users can only access students from schools they’re linked to (as user, school admin, or admin role).

---

## Before introducing new policies

- Keep `optimized_authenticated_access` on `school_terms` unless we explicitly replace it with a scoped policy.
- Keep `students_school_scoped` on `students`; new columns (e.g. `enrollment_status`) should stay under this policy.
- New tables (e.g. `global_terms`) get their own policies; do not reuse these names.
