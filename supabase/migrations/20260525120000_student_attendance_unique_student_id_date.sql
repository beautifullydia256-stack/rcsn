-- student_attendance (production shape): PK attendance_id, UNIQUE (student_id, attendance_date).
-- Optional cleanup: remove duplicate rows for the same learner + day (keeps lowest attendance_id).
-- Do NOT add UNIQUE(student_id, date): production uses attendance_date, not date.

DELETE FROM public.student_attendance
WHERE attendance_id IN (
  SELECT attendance_id
  FROM (
    SELECT
      attendance_id,
      ROW_NUMBER() OVER (
        PARTITION BY student_id, attendance_date
        ORDER BY attendance_id ASC
      ) AS rn
    FROM public.student_attendance
  ) d
  WHERE rn > 1
);

-- Constraint student_attendance_student_id_attendance_date_key is expected to exist; nothing to add.
