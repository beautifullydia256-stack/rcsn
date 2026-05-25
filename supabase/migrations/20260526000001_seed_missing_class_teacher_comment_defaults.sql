-- Seed default class teacher comment bands for schools that registered before
-- the auto_setup_school_settings trigger existed. The trigger calls
-- setup_default_class_teacher_comments_settings on every new school INSERT, but
-- older schools never received the defaults. ON CONFLICT DO NOTHING ensures
-- existing custom bands are not overwritten.

SELECT setup_default_class_teacher_comments_settings(school_id, admin_id)
FROM schools
WHERE school_id NOT IN (
  -- Schools that already have all 13 classes × 4 bands = 52 rows
  SELECT school_id
  FROM class_teacher_comments_settings
  GROUP BY school_id
  HAVING COUNT(DISTINCT class_name) >= 13
);
