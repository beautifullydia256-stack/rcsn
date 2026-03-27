-- Run in Supabase SQL Editor (postgres role — bypasses RLS).
-- Replace school name or IDs if your schema differs.
-- Compares two teachers: staff row, portal user, class/subject links.

WITH school AS (
  SELECT school_id, name
  FROM public.schools
  WHERE name ILIKE '%RIPS%' OR name ILIKE '%your school%'
  ORDER BY name
  LIMIT 1
),
t1 AS (
  SELECT *
  FROM public.teachers t, school s
  WHERE t.school_id = s.school_id
    AND t.name ILIKE '%MUSOKE%RONALD%'
  LIMIT 1
),
t2 AS (
  SELECT *
  FROM public.teachers t, school s
  WHERE t.school_id = s.school_id
    AND t.name ILIKE '%mustafa%kafeero%'
  LIMIT 1
)
SELECT 'school' AS section, s.school_id::text AS id, s.name AS detail, NULL::text AS extra
FROM school s
UNION ALL
SELECT 'teacher_musoke', t.teacher_id::text, t.name, 'email=' || coalesce(t.email, 'NULL') || ' phone=' || coalesce(t.phone, 'NULL')
FROM t1 t
UNION ALL
SELECT 'teacher_mustafa', t.teacher_id::text, t.name, 'email=' || coalesce(t.email, 'NULL') || ' phone=' || coalesce(t.phone, 'NULL')
FROM t2 t;

-- Portal users (public.users) — match by email or phone last 9 digits
WITH t1 AS (
  SELECT * FROM public.teachers WHERE name ILIKE '%MUSOKE%RONALD%' LIMIT 1
),
t2 AS (
  SELECT * FROM public.teachers WHERE name ILIKE '%mustafa%kafeero%' LIMIT 1
)
SELECT
  'users_row' AS kind,
  u.user_id::text,
  u.email,
  u.phone AS users_phone,
  u.role,
  u.school_id::text AS school_id,
  CASE
    WHEN u.user_id = (SELECT au.id FROM auth.users au WHERE au.email = u.email LIMIT 1) THEN 'auth_email_matches'
    ELSE 'check_auth_manually'
  END AS note
FROM public.users u
WHERE u.role = 'teacher'
  AND (
    (SELECT email FROM t1) IS NOT NULL AND lower(trim(u.email)) = lower(trim((SELECT email FROM t1)))
    OR (SELECT email FROM t2) IS NOT NULL AND lower(trim(u.email)) = lower(trim((SELECT email FROM t2)))
    OR (
      length(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g')) >= 9
      AND (
        right(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g'), 9)
          = right(regexp_replace(coalesce((SELECT phone FROM t1), ''), '\D', '', 'g'), 9)
        OR right(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g'), 9)
          = right(regexp_replace(coalesce((SELECT phone FROM t2), ''), '\D', '', 'g'), 9)
      )
    )
  );

-- auth.users (phone used by Supabase Auth for SMS / login)
SELECT
  au.id::text,
  au.email,
  au.phone AS auth_phone,
  au.raw_user_meta_data
FROM auth.users au
WHERE au.email IN (
  (SELECT email FROM public.teachers WHERE name ILIKE '%MUSOKE%RONALD%' AND email IS NOT NULL LIMIT 1),
  (SELECT email FROM public.teachers WHERE name ILIKE '%mustafa%kafeero%' AND email IS NOT NULL LIMIT 1)
)
   OR au.phone IS NOT NULL;

-- class_teachers (one row per class — “class teacher”)
SELECT 'class_teachers' AS tbl, ct.*, t.name AS teacher_name
FROM public.class_teachers ct
JOIN public.teachers t ON t.teacher_id = ct.teacher_id
WHERE ct.teacher_id IN (
  (SELECT teacher_id FROM public.teachers WHERE name ILIKE '%MUSOKE%RONALD%' LIMIT 1),
  (SELECT teacher_id FROM public.teachers WHERE name ILIKE '%mustafa%kafeero%' LIMIT 1)
)
ORDER BY t.name, ct.class_name;

-- teacher_class_subjects (subject assignments — dashboard uses this + class_teachers)
SELECT 'teacher_class_subjects' AS tbl, tcs.*, t.name AS teacher_name
FROM public.teacher_class_subjects tcs
JOIN public.teachers t ON t.teacher_id = tcs.teacher_id
WHERE tcs.teacher_id IN (
  (SELECT teacher_id FROM public.teachers WHERE name ILIKE '%MUSOKE%RONALD%' LIMIT 1),
  (SELECT teacher_id FROM public.teachers WHERE name ILIKE '%mustafa%kafeero%' LIMIT 1)
)
ORDER BY t.name, tcs.class_name, tcs.subject;
