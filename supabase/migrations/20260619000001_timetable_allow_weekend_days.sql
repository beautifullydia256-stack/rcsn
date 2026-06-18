-- Allow Saturday and Sunday in timetable_periods.
-- The original constraint only permitted Monday-Friday, blocking weekend classes
-- for schools that operate on weekends.
ALTER TABLE public.timetable_periods
  DROP CONSTRAINT timetable_periods_day_of_week_check;

ALTER TABLE public.timetable_periods
  ADD CONSTRAINT timetable_periods_day_of_week_check
  CHECK (day_of_week = ANY (ARRAY[
    'Monday'::text,
    'Tuesday'::text,
    'Wednesday'::text,
    'Thursday'::text,
    'Friday'::text,
    'Saturday'::text,
    'Sunday'::text
  ]));
