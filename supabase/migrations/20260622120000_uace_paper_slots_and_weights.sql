-- A-Level: paper_slot (1..n) + weight_percent per paper; weights for a subject sum to 100%.
-- Removes UNIQUE on paper_code; enforces one row per (school, class bucket, subject, slot).

ALTER TABLE public.school_uace_class_subject_papers
  ADD COLUMN IF NOT EXISTS weight_percent numeric(5,2) NOT NULL DEFAULT 100.00,
  ADD COLUMN IF NOT EXISTS paper_slot integer;

ALTER TABLE public.school_uace_class_subject_papers
  DROP CONSTRAINT IF EXISTS school_uace_papers_weight_check;
ALTER TABLE public.school_uace_class_subject_papers
  ADD CONSTRAINT school_uace_papers_weight_check
  CHECK (weight_percent >= 0 AND weight_percent <= 100);

ALTER TABLE public.school_uace_class_subject_papers
  DROP CONSTRAINT IF EXISTS school_uace_papers_slot_check;
ALTER TABLE public.school_uace_class_subject_papers
  ADD CONSTRAINT school_uace_papers_slot_check
  CHECK (paper_slot IS NULL OR (paper_slot >= 1 AND paper_slot <= 10));

-- Assign slot 1..n per subject bucket (stable order).
WITH ranked AS (
  SELECT
    id,
    row_number() OVER (
      PARTITION BY school_id, class_name, subject_name
      ORDER BY sort_order NULLS LAST, created_at
    ) AS rn
  FROM public.school_uace_class_subject_papers
  WHERE paper_slot IS NULL
)
UPDATE public.school_uace_class_subject_papers p
SET paper_slot = ranked.rn
FROM ranked
WHERE p.id = ranked.id;

UPDATE public.school_uace_class_subject_papers
SET paper_slot = 1
WHERE paper_slot IS NULL;

ALTER TABLE public.school_uace_class_subject_papers
  ALTER COLUMN paper_slot SET NOT NULL;

-- Normalize labels when missing.
UPDATE public.school_uace_class_subject_papers
SET paper_label = 'Paper ' || paper_slot::text
WHERE paper_label IS NULL OR btrim(paper_label) = '';

ALTER TABLE public.school_uace_class_subject_papers
  DROP CONSTRAINT IF EXISTS school_uace_class_subject_papers_code_unique;

ALTER TABLE public.school_uace_class_subject_papers
  DROP CONSTRAINT IF EXISTS school_uace_papers_subject_slot_unique;
ALTER TABLE public.school_uace_class_subject_papers
  ADD CONSTRAINT school_uace_papers_subject_slot_unique
  UNIQUE (school_id, class_name, subject_name, paper_slot);

COMMENT ON COLUMN public.school_uace_class_subject_papers.weight_percent IS
  'Share of final A-Level subject % (0–100); all papers for this subject should sum to 100.';
COMMENT ON COLUMN public.school_uace_class_subject_papers.paper_slot IS
  '1-based index: Paper 1, Paper 2, …';
COMMENT ON COLUMN public.school_uace_class_subject_papers.paper_code IS
  'Optional legacy UNEB code; line identity uses paper_slot + paper_label.';
