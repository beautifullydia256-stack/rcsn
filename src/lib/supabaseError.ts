/** PostgREST / Supabase error shape from `.insert()`, `.rpc()`, etc. */
export type PostgrestErrorLike = {
  message?: string;
  details?: string | null;
  hint?: string | null;
  code?: string;
  status?: number;
};

/**
 * Single readable string: code, message, details, hint (what the API actually returned).
 */
export function formatSupabaseError(err: unknown): string {
  if (err == null) return 'Unknown error.';
  if (typeof err === 'string') return err;
  if (typeof err !== 'object') return String(err);

  const e = err as PostgrestErrorLike;
  const parts: string[] = [];

  if (e.code) parts.push(`[${e.code}]`);
  if (e.message) parts.push(e.message);
  if (e.details && String(e.details).trim() && e.details !== e.message) {
    parts.push(`Details: ${e.details}`);
  }
  if (e.hint && String(e.hint).trim()) {
    parts.push(`Hint: ${e.hint}`);
  }
  if (e.status != null && e.status >= 400) {
    parts.push(`(HTTP ${e.status})`);
  }

  const joined = parts.join(' ').trim();
  if (joined) return joined;
  if (err instanceof Error) return err.message || 'Request failed.';
  return 'Request failed.';
}

/**
 * Short line pointing at which field / action usually fixes student insert failures.
 */
export function fieldHintForStudentInsert(err: unknown): string | null {
  const msg = String((err as PostgrestErrorLike)?.message || '');
  const det = String((err as PostgrestErrorLike)?.details || '');
  const raw = `${msg} ${det}`.toLowerCase();

  if (raw.includes('student_email') || raw.includes('(student_email')) {
    return 'Change the student email — this address is already in use.';
  }
  if (raw.includes('guardian_email') || raw.includes('(guardian_email')) {
    return 'Change the guardian email — this address is already in use.';
  }
  if (raw.includes('admission') || raw.includes('admission_number')) {
    if (raw.includes('idx_students_admission_number') || raw.includes('students_admission_number_key')) {
      return 'The database is still using a global “one admission number for the whole system” rule. An admin should apply the latest Supabase migrations (drops that index and keeps uniqueness per school).';
    }
    return 'Admission number conflict — if two people saved at the exact same moment, try once more. If it keeps happening, ensure the latest Supabase migrations are applied (per-school uniqueness; generation runs inside the insert transaction).';
  }
  if (/duplicate|unique|23505/i.test(raw) && raw.includes('email')) {
    return 'Use a different email — the value must be unique.';
  }
  if (raw.includes('permission denied') || raw.includes('row-level security') || raw.includes('rls')) {
    return 'You may not have permission to add students for this school. Ask an admin to grant access.';
  }
  return null;
}

/** Extra line for report upload / publish RPC failures (shown after formatSupabaseError). */
export function hintForPublishedReportRpc(err: unknown): string | null {
  const msg = String((err as PostgrestErrorLike)?.message || '');
  const det = String((err as PostgrestErrorLike)?.details || '');
  const code = String((err as PostgrestErrorLike)?.code || '');
  const raw = `${code} ${msg} ${det}`.toLowerCase();
  if (
    raw.includes('patch_published') ||
    raw.includes('replace_published') ||
    raw.includes('published_student_reports') ||
    raw.includes('could not find the function') ||
    raw.includes('invalid storage path') ||
    raw.includes('row-level security policy') ||
    raw.includes('42501')
  ) {
    return 'Confirm latest Supabase migrations are deployed (migration 20260922000001 restores SECURITY DEFINER for report publishing), storage bucket `published-reports` exists, and your role is school staff for this school.';
  }
  return null;
}

export function formatStudentSaveError(err: unknown): string {
  const main = formatSupabaseError(err);
  const hint = fieldHintForStudentInsert(err);
  return hint ? `${main}\n\nWhat to fix: ${hint}` : main;
}
