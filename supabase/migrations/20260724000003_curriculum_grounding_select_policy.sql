-- The scheme-of-work AI endpoint reads curriculum_topics/curriculum_scheme_examples with the
-- anon key (no per-teacher session forwarded), matching every other AI endpoint's no-auth
-- pattern. The original policies restricted SELECT to `authenticated` only, so RLS silently
-- returned zero rows for the anon-key client, defeating grounding entirely. Fix to match
-- public.library's actual working pattern: SELECT open with no role restriction.

DROP POLICY IF EXISTS curriculum_topics_select ON public.curriculum_topics;
DROP POLICY IF EXISTS curriculum_scheme_examples_select ON public.curriculum_scheme_examples;

CREATE POLICY curriculum_topics_select ON public.curriculum_topics FOR SELECT USING (true);
CREATE POLICY curriculum_scheme_examples_select ON public.curriculum_scheme_examples FOR SELECT USING (true);

GRANT SELECT ON public.curriculum_topics TO anon;
GRANT SELECT ON public.curriculum_scheme_examples TO anon;
