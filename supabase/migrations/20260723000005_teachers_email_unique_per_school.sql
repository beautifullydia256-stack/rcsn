-- teachers.email was globally unique, which assumed one teacher record per real person
-- system-wide. That's no longer true once a person can be a teacher at more than one school
-- (cross-school identity linking) — the same real email legitimately appears on more than one
-- school's roster now. What should still be blocked is two DIFFERENT teachers sharing an email
-- WITHIN the same school, so uniqueness moves from (email) to (school_id, email).

ALTER TABLE public.teachers DROP CONSTRAINT IF EXISTS teachers_email_key;
ALTER TABLE public.teachers ADD CONSTRAINT teachers_email_school_unique UNIQUE (school_id, email);
