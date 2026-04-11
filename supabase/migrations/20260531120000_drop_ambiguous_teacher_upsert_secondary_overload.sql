-- PostgREST PGRST203: two 17-parameter overloads of teacher_upsert_exam_result_secondary
-- (p_teacher_id uuid wrapper vs p_teacher_id text implementation) are indistinguishable for RPC.
-- Keep the text implementation (marks_obtained sync from 20260527120000); drop the uuid→text wrapper.

DROP FUNCTION IF EXISTS public.teacher_upsert_exam_result_secondary(
  uuid,
  uuid,
  uuid,
  text,
  text,
  numeric,
  text,
  numeric,
  numeric,
  numeric,
  text,
  text,
  uuid,
  text,
  text,
  text,
  text
);
