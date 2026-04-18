-- Secondary schools only: remove migration-added "Beginning of Term" row when an older
-- "Beginning of term" (or any case variant) already exists for the same (school, term, year),
-- and the canonical row has no exam_results / processed mirror rows.

DELETE FROM public.exam_sets es
WHERE es.school_id IN (SELECT s.school_id FROM public.schools s WHERE s.type = 'Secondary')
  AND es.name = 'Beginning of Term'
  AND EXISTS (
    SELECT 1
    FROM public.exam_sets es2
    WHERE es2.school_id = es.school_id
      AND es2.term = es.term
      AND es2.year = es.year
      AND es2.id <> es.id
      AND lower(trim(es2.name)) = 'beginning of term'
  )
  AND NOT EXISTS (SELECT 1 FROM public.exam_results er WHERE er.exam_set_id = es.id)
  AND NOT EXISTS (
    SELECT 1 FROM public.processed_secondary_exam_results ps WHERE ps.exam_set_id = es.id
  );

SELECT pg_notify('pgrst', 'reload schema');
