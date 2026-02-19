/**
 * Ensures global_terms has all 3 terms for the given year (idempotent).
 * Called at startup, before rollover, and when creating/linking school terms.
 * The DB trigger on school_terms also calls this when a row has a year.
 */
import { supabase } from './supabase';

export async function ensureAcademicYearExists(year: number): Promise<void> {
  try {
    await supabase.rpc('ensure_academic_year_exists', { p_year: year });
  } catch {
    // Silent: do not block UI; trigger will still ensure on term create
  }
}

/** Ensure current and next academic year exist (for startup). */
export async function ensureCurrentAndNextAcademicYears(): Promise<void> {
  const y = new Date().getFullYear();
  await ensureAcademicYearExists(y);
  await ensureAcademicYearExists(y + 1);
}
