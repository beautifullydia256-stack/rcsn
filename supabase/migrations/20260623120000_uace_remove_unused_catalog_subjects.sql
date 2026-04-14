-- Drop discontinued UACE default subjects from live data and from uace_subject_catalog.
-- Principals removed: ICT, Computer Studies, Local Language (Other).
-- Subsidiaries removed: Subsidiary Computer Studies only (Subsidiary ICT retained).
--
-- Order: learner + exam + paper config first; remove subsidiary catalog row before
-- class_subjects DELETE (trigger blocks deleting subsidiary rows while still in catalog).

DELETE FROM public.student_alevel_subjects
WHERE trim(both from subject_name) IN (
  'ICT',
  'Computer Studies',
  'Local Language (Other)',
  'Subsidiary Computer Studies'
);

DELETE FROM public.exam_results er
WHERE trim(both from er.subject) IN (
  'ICT',
  'Computer Studies',
  'Local Language (Other)',
  'Subsidiary Computer Studies'
)
AND (
  trim(both from er.class_name) IN ('Senior 5', 'Senior 6', 'A-Level')
  OR trim(both from er.class_name) ~* '^(senior\s*[56]|s\.?\s*[56])(\s|$)'
);

DELETE FROM public.school_uace_class_subject_papers
WHERE trim(both from subject_name) IN (
  'ICT',
  'Computer Studies',
  'Local Language (Other)',
  'Subsidiary Computer Studies'
);

DELETE FROM public.uace_subject_catalog
WHERE subject_name = 'Subsidiary Computer Studies';

DELETE FROM public.class_subjects cs
WHERE trim(both from cs.subject) IN (
  'ICT',
  'Computer Studies',
  'Local Language (Other)',
  'Subsidiary Computer Studies'
)
AND (
  trim(both from cs.class_name) IN ('Senior 5', 'Senior 6', 'A-Level')
  OR trim(both from cs.class_name) ~* '^(senior\s*[56]|s\.?\s*[56])(\s|$)'
);

DELETE FROM public.uace_subject_catalog
WHERE subject_name IN (
  'ICT',
  'Computer Studies',
  'Local Language (Other)'
);
