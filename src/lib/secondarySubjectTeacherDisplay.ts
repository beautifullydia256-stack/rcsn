/**
 * A-Level (and similar) report “Teacher” column: roster lookup from `teacher_class_subjects`
 * + display as “Firstname L” (e.g. kimuli daudi → Kimuli D).
 * Keep behavior aligned with `supabase/functions/_shared/reportDataBuilder.ts`.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

export type TeacherClassSubjectAssignment = {
  class_name: string;
  subject: string;
  assignment_role: string;
  teacher_name: string;
};

/** e.g. "kimuli daudi" → "Kimuli D"; one word → title case only */
export function formatTeacherShortNameForReport(raw: string | null | undefined): string {
  const s = String(raw ?? '')
    .trim()
    .replace(/\s+/g, ' ');
  if (!s) return '';
  const parts = s.split(' ').filter(Boolean);
  const cap = (w: string) =>
    w.length === 0 ? '' : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  if (parts.length === 1) return cap(parts[0]!);
  return `${cap(parts[0]!)} ${parts[parts.length - 1]!.charAt(0).toUpperCase()}`;
}

export function normalizeSubjectKeyForReport(name: string): string {
  return String(name || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/** Match class_name on assignments to learner row (Senior 5 / S5 / etc.). */
export function expandClassNameAliasesForTeacherLookup(raw: string): Set<string> {
  const out = new Set<string>();
  const t = String(raw || '').trim();
  if (!t) return out;
  out.add(t);
  const m = t.match(/^senior\s*([1-6])(?:\s|$)|^s\.?\s*([1-6])(?:\s|$)/i);
  if (!m) return out;
  const n = parseInt(m[1] || m[2], 10);
  if (!Number.isFinite(n)) return out;
  out.add(`Senior ${n}`);
  out.add(`Senior${n}`);
  out.add(`S${n}`);
  out.add(`S.${n}`);
  out.add(`s${n}`);
  return out;
}

/**
 * Prefer `subject_teacher` for class+subject; else any assigned teacher (e.g. co_teacher).
 */
export function resolveSubjectTeacherShortName(
  assignments: TeacherClassSubjectAssignment[],
  studentClass: string,
  rowSubject: string,
): string | null {
  const subKey = normalizeSubjectKeyForReport(rowSubject);
  if (!subKey) return null;
  const classCandidates = expandClassNameAliasesForTeacherLookup(String(studentClass || '').trim());
  const matches = (r: TeacherClassSubjectAssignment) =>
    normalizeSubjectKeyForReport(r.subject) === subKey &&
    classCandidates.has(String(r.class_name || '').trim());

  const primary = assignments.find((r) => r.assignment_role === 'subject_teacher' && matches(r));
  const primaryName = primary?.teacher_name?.trim();
  if (primaryName) return formatTeacherShortNameForReport(primaryName);

  const anyRow = assignments.find((r) => matches(r));
  const anyName = anyRow?.teacher_name?.trim();
  if (anyName) return formatTeacherShortNameForReport(anyName);
  return null;
}

export async function fetchTeacherClassSubjectAssignments(
  supabase: SupabaseClient,
  schoolId: string,
): Promise<TeacherClassSubjectAssignment[]> {
  const { data: tcsRows, error: tcsErr } = await supabase
    .from('teacher_class_subjects')
    .select('class_name, subject, assignment_role, teacher_id')
    .eq('school_id', schoolId);
  if (tcsErr || !tcsRows?.length) return [];

  const ids = [
    ...new Set(
      (tcsRows as { teacher_id?: string }[])
        .map((r) => r.teacher_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const { data: teacherNameRows } = ids.length
    ? await supabase.from('teachers').select('teacher_id, name').in('teacher_id', ids)
    : { data: [] as { teacher_id: string; name?: string | null }[] };

  const nameById = new Map(
    (teacherNameRows || []).map((t) => [t.teacher_id, String(t.name || '').trim()]),
  );

  return (tcsRows as { class_name?: string; subject?: string; assignment_role?: string; teacher_id: string }[])
    .map((r) => ({
      class_name: String(r.class_name || '').trim(),
      subject: String(r.subject || '').trim(),
      assignment_role: String(r.assignment_role || 'subject_teacher'),
      teacher_name: nameById.get(r.teacher_id) || '',
    }))
    .filter((r) => r.class_name && r.subject && r.teacher_name);
}
