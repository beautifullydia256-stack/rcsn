UACE SQL — how to open (if links in chat failed)
================================================

Your repo root (adjust if different):
  C:\Pwezacore\pwezacore

Open ONE combined file (easiest):
  supabase\uace\UACE_all_sql_combined.sql

Or open the three originals separately:

  supabase\migrations\20260602120000_uace_default_grade_server_exam_points.sql
  supabase\queries\verify_alevel_exam_grade_matches_uace_default.sql
  supabase\queries\audit_alevel_grades_not_uace.sql

In Cursor / VS Code:
  - Press Ctrl+P
  - Type: 20260602120000
  - Or type: verify_alevel
  - Or type: audit_alevel

In File Explorer:
  - Navigate to C:\Pwezacore\pwezacore\supabase\migrations  - Double-click the .sql file

Apply migration to hosted Supabase:
  - Prefer: supabase db push (from repo root, linked project)
  - Or: Supabase Dashboard → SQL → copy ONLY "PART 1" from UACE_all_sql_combined.sql and Run once.

Then run PART 2 in a second tab/run (verify). Then PART 3 if you want the audit.
(If you paste the whole combined file at once, the dashboard may only show the last SELECT result — so split runs are clearer.)
