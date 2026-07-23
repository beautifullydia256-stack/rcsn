-- Cross-school identity linking: the same person can hold memberships at more than one
-- school. These columns close two gaps found in the existing (untracked, live-DB-only)
-- user_school_memberships / user_active_schools tables:
--
-- 1. user_school_memberships had no way to remember which school-scoped `teachers` row a
--    membership is tied to — only `users.linked_teacher_id` existed, a single scalar that
--    gets silently overwritten by whichever school links a teacher last.
-- 2. user_active_schools recorded which school is active but not which role, so a role
--    chosen at a second/third school never made it into anything RLS could see.

ALTER TABLE public.user_school_memberships
  ADD COLUMN IF NOT EXISTS linked_teacher_id uuid REFERENCES public.teachers(teacher_id) ON DELETE SET NULL;

ALTER TABLE public.user_active_schools
  ADD COLUMN IF NOT EXISTS role text;
