-- Financial Analytics Performance Indexes Migration
-- Created: 2026-09-21
-- Purpose: Accelerate queries on student_payments, school_expenses, student_discounts, school_terms,
-- and student_balances for the Financial Analytics & Intelligence dashboard, eliminating 20s page load delay.

-- 1. Accelerate student_payments queries filtered by school_id, payment_date, and term_id
CREATE INDEX IF NOT EXISTS idx_student_payments_school_date
  ON public.student_payments (school_id, payment_date DESC)
  WHERE reversed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_student_payments_school_term_date
  ON public.student_payments (school_id, term_id, payment_date DESC)
  WHERE reversed_at IS NULL;

-- 2. Accelerate school_expenses queries filtered by school_id and expense_date
CREATE INDEX IF NOT EXISTS idx_school_expenses_school_date
  ON public.school_expenses (school_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_school_expenses_school_term
  ON public.school_expenses (school_id, term_id);

-- 3. Accelerate student_discounts date-range queries for scholarships / fee remissions
CREATE INDEX IF NOT EXISTS idx_student_discounts_school_date
  ON public.student_discounts (school_id, created_at DESC);

-- 4. Composite index on student_balances for term-based collection aggregation
CREATE INDEX IF NOT EXISTS idx_student_balances_school_term
  ON public.student_balances (school_id, term_id);

-- 5. Accelerate school_terms lookup per school
CREATE INDEX IF NOT EXISTS idx_school_terms_school_year_term
  ON public.school_terms (school_id, year DESC, term DESC);
