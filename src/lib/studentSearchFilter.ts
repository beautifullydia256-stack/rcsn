/**
 * Filter students in report UIs where the input may show "Name - admission" after pick.
 * Matching only on that full string fails; this normalizes against name, admission, id, and display.
 */
export function studentRowMatchesSearch(
  s: { name?: string | null; admission_number?: string | null; student_id?: string | null },
  rawSearch: string
): boolean {
  const t = rawSearch.trim().toLowerCase().replace(/\s+/g, ' ');
  if (!t) return true;
  const name = (s.name ?? '').toLowerCase();
  const adm = (s.admission_number ?? '').toLowerCase();
  const id = String(s.student_id ?? '').toLowerCase();
  const display = `${s.name ?? ''} - ${(s.admission_number ?? s.student_id) ?? ''}`
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

  if (t.includes(' - ')) {
    if (t === display) return true;
    const idx = t.indexOf(' - ');
    const head = t.slice(0, idx).trim();
    const tail = t.slice(idx + 3).trim();
    if (head && tail) {
      return (
        (name.includes(head) || name.startsWith(head)) &&
        (adm.includes(tail) || id.includes(tail) || name.includes(tail))
      );
    }
    if (head) return name.includes(head) || name.startsWith(head);
  }

  return name.includes(t) || adm.includes(t) || id.includes(t);
}
