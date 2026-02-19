-- Run once per school after rollover so promoted students get a balance for the current term.
-- Replace the UUIDs with your school_id and current term id (e.g. Term 1 2026).

-- 1) Get current term id for your school (run in SQL Editor):
-- SELECT id, term, year FROM public.school_terms
-- WHERE school_id = 'YOUR_SCHOOL_ID' ORDER BY year DESC, term DESC LIMIT 1;

-- 2) Backfill balances for that term (then run):
-- SELECT public.initialize_student_balances_for_term('YOUR_SCHOOL_ID'::uuid, 'TERM_ID_FROM_STEP_1'::uuid);

-- Example for Rakai Infant Primary School, Term 1 2026:
-- SELECT public.initialize_student_balances_for_term(
--   '406bf29b-d7fd-457c-aa56-e29b9ef1a16d'::uuid,
--   '99f9fcaa-6b95-49df-8454-5fc826c57a02'::uuid
-- );
