# Supabase migrations to run (SPA parity with Next.js)

Run these in **Supabase → SQL Editor** in the order below so the report system and the rest of the app work like the original Next.js project.

---

## 1. Report system (required for Reports)

These create and extend the snapshot-based report tables used by **Reports → Snapshots**, **Bulk Generator**, and **Report Viewer**.

### 1.1 Run first: `create_report_snapshots.sql`

Creates: `report_snapshots`, `report_snapshot_data`, `generated_reports`, indexes, RLS policies, and `lock_report_snapshot` / `is_snapshot_locked` functions.

**Copy and run this entire block in Supabase SQL Editor:**

```sql
-- Snapshot-based Report System (Arbor MIS-style)
-- This migration creates tables for frozen report data and cached generated reports

-- Snapshot table for frozen assessment data
CREATE TABLE IF NOT EXISTS report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  school_id UUID NOT NULL REFERENCES schools(school_id) ON DELETE CASCADE,
  term INTEGER NOT NULL,
  year INTEGER NOT NULL,
  exam_set_id UUID REFERENCES exam_sets(id) ON DELETE SET NULL,
  template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  locked_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'locked', 'generated')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Snapshot data (frozen student data at snapshot time)
CREATE TABLE IF NOT EXISTS report_snapshot_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES report_snapshots(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  marks_obtained NUMERIC,
  total_marks NUMERIC,
  grade TEXT,
  remarks TEXT,
  teacher_initials TEXT,
  teacher_comment TEXT,
  class_teacher_comment TEXT,
  headteacher_comment TEXT,
  attendance_percentage NUMERIC,
  position INTEGER,
  aggregate NUMERIC,
  frozen_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Generated reports cache
CREATE TABLE IF NOT EXISTS generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  snapshot_id UUID NOT NULL REFERENCES report_snapshots(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
  template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
  report_data JSONB NOT NULL,
  pdf_url TEXT,
  generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  template_version TEXT,
  generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  file_size_bytes INTEGER,
  UNIQUE(snapshot_id, student_id, template_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_report_snapshots_school_id ON report_snapshots(school_id);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_status ON report_snapshots(status);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_term_year ON report_snapshots(term, year);
CREATE INDEX IF NOT EXISTS idx_report_snapshot_data_snapshot_id ON report_snapshot_data(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_report_snapshot_data_student_id ON report_snapshot_data(student_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_snapshot_id ON generated_reports(snapshot_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_student_id ON generated_reports(student_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_template_id ON generated_reports(template_id);

-- RLS Policies
ALTER TABLE report_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_snapshot_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view snapshots for their school"
  ON report_snapshots FOR SELECT
  USING (school_id IN (SELECT school_id FROM users WHERE user_id = auth.uid()));

CREATE POLICY "Admins can create snapshots for their school"
  ON report_snapshots FOR INSERT
  WITH CHECK (school_id IN (SELECT school_id FROM users WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can update snapshots for their school"
  ON report_snapshots FOR UPDATE
  USING (school_id IN (SELECT school_id FROM users WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can view snapshot data for their school"
  ON report_snapshot_data FOR SELECT
  USING (snapshot_id IN (SELECT id FROM report_snapshots WHERE school_id IN (SELECT school_id FROM users WHERE user_id = auth.uid())));

CREATE POLICY "System can insert snapshot data"
  ON report_snapshot_data FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view generated reports for their school"
  ON generated_reports FOR SELECT
  USING (snapshot_id IN (SELECT id FROM report_snapshots WHERE school_id IN (SELECT school_id FROM users WHERE user_id = auth.uid())));

CREATE POLICY "System can insert generated reports"
  ON generated_reports FOR INSERT WITH CHECK (true);

CREATE OR REPLACE FUNCTION lock_report_snapshot(p_snapshot_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE report_snapshots SET status = 'locked', locked_at = NOW()
  WHERE id = p_snapshot_id AND status = 'draft';
  IF NOT FOUND THEN RAISE EXCEPTION 'Snapshot not found or already locked'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION is_snapshot_locked(p_snapshot_id UUID)
RETURNS BOOLEAN LANGUAGE plpgsql AS $$
DECLARE v_status TEXT;
BEGIN
  SELECT status INTO v_status FROM report_snapshots WHERE id = p_snapshot_id;
  RETURN v_status IN ('locked', 'generated');
END;
$$;
```

### 1.2 Run second: `enhance_snapshot_schema.sql`

Adds extra columns to `report_snapshot_data` and `report_snapshots` (e.g. `student_count`, `class_count`) and the trigger that keeps `student_count` in sync.

**Copy and run this entire block in Supabase SQL Editor:**

```sql
-- Enhance snapshot schema with all required report data fields

ALTER TABLE report_snapshot_data
ADD COLUMN IF NOT EXISTS fees_balance NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS fees_paid NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS student_photo_url TEXT,
ADD COLUMN IF NOT EXISTS school_logo_url TEXT,
ADD COLUMN IF NOT EXISTS position_in_class INTEGER,
ADD COLUMN IF NOT EXISTS aggregate_score NUMERIC,
ADD COLUMN IF NOT EXISTS total_marks NUMERIC,
ADD COLUMN IF NOT EXISTS average_percentage NUMERIC,
ADD COLUMN IF NOT EXISTS division TEXT,
ADD COLUMN IF NOT EXISTS behaviour_summary JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS fees_expected NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS fees_total_paid NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS exam_set_name TEXT,
ADD COLUMN IF NOT EXISTS exam_set_term INTEGER,
ADD COLUMN IF NOT EXISTS exam_set_year INTEGER;

CREATE INDEX IF NOT EXISTS idx_snapshot_data_position ON report_snapshot_data(snapshot_id, position_in_class);
CREATE INDEX IF NOT EXISTS idx_snapshot_data_class ON report_snapshot_data(snapshot_id, class_name);

ALTER TABLE report_snapshots
ADD COLUMN IF NOT EXISTS student_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS class_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS generation_started_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS generation_completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS generation_duration_seconds INTEGER;

CREATE OR REPLACE FUNCTION update_snapshot_student_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE report_snapshots
  SET student_count = (SELECT COUNT(DISTINCT student_id) FROM report_snapshot_data WHERE snapshot_id = NEW.snapshot_id)
  WHERE id = NEW.snapshot_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_snapshot_student_count ON report_snapshot_data;
CREATE TRIGGER trigger_update_snapshot_student_count
AFTER INSERT ON report_snapshot_data
FOR EACH ROW
EXECUTE FUNCTION update_snapshot_student_count();
```

If you get an error like `EXECUTE FUNCTION` not found, your Postgres may be older: use `EXECUTE PROCEDURE update_snapshot_student_count();` instead.

---

## 2. How reports work (flow)

1. **Snapshots** – Admin creates a snapshot from an exam set (Dashboard → Reports → Snapshots). This inserts into `report_snapshots` and fills `report_snapshot_data` with frozen exam/attendance/fees data.
2. **Lock** – Admin locks the snapshot so it can’t be changed; `lock_report_snapshot()` sets `status = 'locked'`.
3. **Bulk generate** – From “Generate Reports” the app (and/or PDF API) builds report data and stores it in `generated_reports` (and may set `report_snapshots.status = 'generated'`).
4. **View** – Report Viewer reads from `generated_reports` (and snapshot metadata) to show and download reports.

All of this uses the tables and functions created by the two migrations above.

---

## 3. Other migrations (may already be applied)

If the project was previously running (e.g. as Next.js), you may have already run some of these. Only run what’s missing.

| Feature | Migration file | What it does |
|--------|-----------------|--------------|
| Expense tracking | `20251010_create_expense_tracking_system.sql` | `expense_categories`, `school_expenses`, refs, RLS |
| Fee structure | `20251012_create_school_fee_structure.sql` | `school_fee_structure`, `get_fee_structure_status` (if used) |
| School requirements | (often in same schema or later migration) | `school_requirements` if your Settings use it |

To check if report tables exist after running the two report migrations above:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('report_snapshots', 'report_snapshot_data', 'generated_reports')
ORDER BY table_name;
```

You should see all three. If any are missing, re-run the corresponding migration block from section 1.

---

## 4. Summary

- **For reports:** Run **1.1** then **1.2** in Supabase SQL Editor (copy-paste each full block once).
- **Rest of app:** Uses existing tables (`schools`, `users`, `students`, `teachers`, `exam_sets`, `exam_results`, `school_terms`, `report_templates`, etc.). No extra SQL needed unless you never ran expense/fee-structure migrations; in that case run those from `supabase/migrations/` as needed.

After 1.1 and 1.2, the SPA report flow (Snapshots → Lock → Bulk generate → View) matches the behaviour expected from the Next.js setup.
