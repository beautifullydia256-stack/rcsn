-- Simple query to list all schools and their codes

SELECT 
  school_id,
  name as school_name,
  school_code,
  created_at
FROM schools
ORDER BY name;