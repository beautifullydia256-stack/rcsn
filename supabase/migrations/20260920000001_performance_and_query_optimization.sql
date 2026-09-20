-- Performance and Error Fixes Migration
-- Created: 2026-09-20
-- Purpose: Accelerate query execution for PosFinanceDashboard, ReportsHub, and Outstanding queries,
-- eliminating database connection pool exhaustion while preserving strict Row Level Security.

-- 1. Index on generated_reports(snapshot_id)
-- Used by ReportsHub.tsx for batch snapshot lookups and counting.
CREATE INDEX IF NOT EXISTS idx_generated_reports_snapshot_id
  ON public.generated_reports(snapshot_id);

-- 2. Partial index on student_balances(school_id, balance DESC) WHERE balance > 0
-- Used by PosFinanceDashboard.tsx to instantly fetch students with outstanding balances without full-table scans.
CREATE INDEX IF NOT EXISTS idx_student_balances_school_active
  ON public.student_balances(school_id, balance DESC)
  WHERE balance > 0;

-- 3. Composite index on parents(school_id, student_id)
-- Used by outstanding.ts to quickly map parents to students for fee follow-up.
CREATE INDEX IF NOT EXISTS idx_parents_school_student
  ON public.parents(school_id, student_id);
