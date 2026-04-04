export type ParentStudentRow = {
  student_id: string;
  name?: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  current_class?: string | null;
  admission_number?: string | null;
};

export function parentInitials(name: string) {
  return (name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function displayStudentName(s: Record<string, unknown>): string {
  const fn = String(s.first_name ?? '').trim();
  const mn = String(s.middle_name ?? '').trim();
  const ln = String(s.last_name ?? '').trim();
  const parts = [fn, mn, ln].filter(Boolean);
  if (parts.length) return parts.join(' ');
  return String(s.name ?? '').trim() || '—';
}
