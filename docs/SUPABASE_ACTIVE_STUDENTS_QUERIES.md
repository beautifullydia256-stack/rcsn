# Supabase: Active students and status

Run these in the **Supabase Dashboard → SQL Editor** (replace `'YOUR_SCHOOL_ID'` with your actual `school_id` UUID if you want one school only).

---

## 1. Count students by status (all schools)

```sql
SELECT status, COUNT(*) AS count
FROM public.students
GROUP BY status
ORDER BY count DESC;
```

Example result:
| status   | count |
|----------|-------|
| active   | 150   |
| graduated| 12    |

---

## 2. Count active students only (all schools)

```sql
SELECT COUNT(*) AS active_students
FROM public.students
WHERE status = 'active';
```

---

## 3. Count active students per school

```sql
SELECT s.school_id, sc.name AS school_name, COUNT(*) AS active_students
FROM public.students s
LEFT JOIN public.schools sc ON sc.school_id = s.school_id
WHERE s.status = 'active'
GROUP BY s.school_id, sc.name
ORDER BY active_students DESC;
```

---

## 4. For one school (replace the UUID)

```sql
-- Replace with your school_id from the schools table
SELECT status, COUNT(*) AS count
FROM public.students
WHERE school_id = 'YOUR_SCHOOL_ID'
GROUP BY status;
```

---

## 5. List all status values that exist (in case you added others)

```sql
SELECT DISTINCT status FROM public.students ORDER BY status;
```

---

## What makes the system consider a student "active" or "inactive"?

- **Active:** The `students.status` column is **`'active'`**.  
  These are currently enrolled students. The app uses `.eq('status', 'active')` for most lists (fees, billing, payments, reports).

- **Inactive / not active:** Any other value in `status`:
  - **`'graduated'`** — In the current schema, this is the only other allowed value (`CHECK (status IN ('active','graduated'))`). Treated as left school.
  - If your database allows other values (e.g. `withdrawn`, `inactive`, `transferred`), they are also treated as “not active” because the app only filters for `status = 'active'`.

So: **active = `status = 'active'`**, and **inactive = any other status** (e.g. graduated or custom values). The app does not use a separate “inactive” flag; it only checks `status`.
