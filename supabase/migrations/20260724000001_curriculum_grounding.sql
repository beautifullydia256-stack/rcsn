-- Curriculum grounding data for AI-assisted scheme-of-work generation. This is PwezaCore's own
-- curated reference content (extracted and verified against real NCDC curriculum documents and
-- real Ugandan schools' scheme-of-work examples) — not school-owned data, so it's readable by
-- any authenticated teacher but writable only by service-role (migrations / a future curation
-- tool), mirroring the existing public.library table's RLS pattern.

CREATE TABLE IF NOT EXISTS public.curriculum_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  education_level text NOT NULL CHECK (education_level IN ('primary','secondary')),
  class_name text NOT NULL,
  subject text,                          -- NULL for P1-P3 thematic curriculum
  term text NOT NULL,
  sequence_order int NOT NULL DEFAULT 0,
  theme text NOT NULL DEFAULT '',
  sub_theme text NOT NULL DEFAULT '',
  learning_outcome text NOT NULL DEFAULT '',
  content_summary text NOT NULL DEFAULT '',
  suggested_competences text NOT NULL DEFAULT '',
  suggested_methods text NOT NULL DEFAULT '',
  suggested_life_skills text NOT NULL DEFAULT '',
  suggested_materials text NOT NULL DEFAULT '',
  source_reference text NOT NULL DEFAULT '',
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS curriculum_topics_lookup_idx
  ON public.curriculum_topics (education_level, class_name, subject, term);

CREATE TABLE IF NOT EXISTS public.curriculum_scheme_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  education_level text NOT NULL CHECK (education_level IN ('primary','secondary')),
  class_name text NOT NULL,
  subject text,
  term text NOT NULL,
  theme text NOT NULL DEFAULT '',
  source_school text NOT NULL DEFAULT '',
  example_entries jsonb NOT NULL CHECK (jsonb_typeof(example_entries) = 'array'),
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS curriculum_scheme_examples_lookup_idx
  ON public.curriculum_scheme_examples (education_level, class_name, subject, term);

ALTER TABLE public.curriculum_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.curriculum_scheme_examples ENABLE ROW LEVEL SECURITY;

CREATE POLICY curriculum_topics_select ON public.curriculum_topics
  FOR SELECT TO authenticated USING (true);
CREATE POLICY curriculum_scheme_examples_select ON public.curriculum_scheme_examples
  FOR SELECT TO authenticated USING (true);

GRANT SELECT ON public.curriculum_topics TO authenticated;
GRANT SELECT ON public.curriculum_scheme_examples TO authenticated;
