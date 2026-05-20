-- Supabase: Starting May 30 2026 (new projects) and October 30 2026 (existing projects),
-- tables in "public" no longer receive automatic Data API grants. This migration:
--   1. Grants authenticated + service_role on all EXISTING tables and sequences.
--   2. Sets ALTER DEFAULT PRIVILEGES so every FUTURE table/sequence gets the same grants.
--   3. Revokes all anon access from sensitive tables that should never be public.
--
-- anon is intentionally NOT added to default privileges — all data access requires auth.
-- RLS policies on each table control row-level visibility for authenticated users.
--
-- APPLIED TO LIVE DB: 2026-05-20

-- ── Existing tables ────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;

-- ── Existing sequences (required for INSERT on tables with serial/bigserial PKs) ─
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ── Future tables and sequences ────────────────────────────────────────────────
-- Every CREATE TABLE / CREATE SEQUENCE run after this migration will automatically
-- inherit these grants. When Supabase removes their anon default on Oct 30,
-- our authenticated + service_role entries in pg_default_acl survive independently.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO service_role;

-- ── Remove anon access from sensitive tables ───────────────────────────────────
-- admin_activities: internal audit log — anon should never read or write this.
-- student_pdf_records: student data — anon should never have access.
REVOKE ALL PRIVILEGES ON public.admin_activities FROM anon;
REVOKE ALL PRIVILEGES ON public.student_pdf_records FROM anon;
