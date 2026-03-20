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
    return 'Admission number conflict — try saving again in a few seconds, or change the admission number if you entered it manually.';
  }
  if (/duplicate|unique|23505/i.test(raw) && raw.includes('email')) {
    return 'Use a different email — the value must be unique.';
  }
  if (raw.includes('permission denied') || raw.includes('row-level security') || raw.includes('rls')) {
    return 'You may not have permission to add students for this school. Ask an admin to grant access.';
  }
  return null;
}

export function formatStudentSaveError(err: unknown): string {
  const main = formatSupabaseError(err);
  const hint = fieldHintForStudentInsert(err);
  return hint ? `${main}\n\nWhat to fix: ${hint}` : main;
}
