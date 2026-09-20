-- Fee Structure Index Migration
-- Created: 2026-09-20
-- Purpose: Accelerate fee schedule queries in accountant portal to eliminate page load lag.

CREATE INDEX IF NOT EXISTS idx_school_fee_structure_school
  ON public.school_fee_structure (school_id);
