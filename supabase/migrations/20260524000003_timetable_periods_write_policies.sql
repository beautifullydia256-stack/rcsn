-- timetable_periods had only a SELECT policy; admins/owners could not add,
-- edit, or delete periods — every INSERT returned 403.
-- Add the missing write policies using the same profiles-table pattern as
-- the existing SELECT policy (timetable_periods_unified).

CREATE POLICY timetable_periods_insert
ON public.timetable_periods
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
      AND profiles.school_id = timetable_periods.school_id
  )
);

CREATE POLICY timetable_periods_update
ON public.timetable_periods
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
      AND profiles.school_id = timetable_periods.school_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
      AND profiles.school_id = timetable_periods.school_id
  )
);

CREATE POLICY timetable_periods_delete
ON public.timetable_periods
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'owner')
      AND profiles.school_id = timetable_periods.school_id
  )
);
