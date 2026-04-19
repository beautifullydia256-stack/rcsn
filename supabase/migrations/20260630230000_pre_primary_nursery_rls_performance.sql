-- Supabase linter: auth_rls_initplan — use (select auth.uid()) so auth is not re-evaluated per row.
-- Supabase linter: multiple_permissive_policies — drop extra permissive policies on nursery_detailed_observation_items.

-- ---------------------------------------------------------------------------
-- nursery_detailed_observation_items: remove duplicate permissive policies
-- (names reported by linter; may exist from older experiments / dashboard).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS nursery_items_no_delete ON public.nursery_detailed_observation_items;
DROP POLICY IF EXISTS nursery_items_no_insert ON public.nursery_detailed_observation_items;
DROP POLICY IF EXISTS nursery_items_no_update ON public.nursery_detailed_observation_items;
DROP POLICY IF EXISTS nursery_items_select ON public.nursery_detailed_observation_items;

-- ---------------------------------------------------------------------------
-- Recreate school-scoped RW policies with initplan-safe auth calls
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS pre_primary_strands_school_rw ON public.pre_primary_holistic_strands;
CREATE POLICY pre_primary_strands_school_rw ON public.pre_primary_holistic_strands
  FOR ALL TO authenticated
  USING (
    school_id IN (
      SELECT u.school_id
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id IS NOT NULL
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT u.school_id
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS pre_primary_skills_school_rw ON public.pre_primary_holistic_skills;
CREATE POLICY pre_primary_skills_school_rw ON public.pre_primary_holistic_skills
  FOR ALL TO authenticated
  USING (
    school_id IN (
      SELECT u.school_id
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id IS NOT NULL
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT u.school_id
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS pre_primary_ratings_school_rw ON public.pre_primary_holistic_rating_levels;
CREATE POLICY pre_primary_ratings_school_rw ON public.pre_primary_holistic_rating_levels
  FOR ALL TO authenticated
  USING (
    school_id IN (
      SELECT u.school_id
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id IS NOT NULL
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT u.school_id
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS nursery_detailed_obs_school_rw ON public.nursery_detailed_observation_items;
CREATE POLICY nursery_detailed_obs_school_rw ON public.nursery_detailed_observation_items
  FOR ALL TO authenticated
  USING (
    school_id IN (
      SELECT u.school_id
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id IS NOT NULL
    )
  )
  WITH CHECK (
    school_id IN (
      SELECT u.school_id
      FROM public.users u
      WHERE u.user_id = (SELECT auth.uid())
        AND u.school_id IS NOT NULL
    )
  );

SELECT pg_notify('pgrst', 'reload schema');
