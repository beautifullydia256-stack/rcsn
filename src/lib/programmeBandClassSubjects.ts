import { supabase } from '@/lib/supabase';
import { isALevelClass, isOLevelClass } from '@/components/reports/templates/helpers';
import type { ClassSubjectRow } from '@/lib/classSubjectRowGuards';

export type ProgrammeBand = 'olevel' | 'alevel';

/** All class names in `classOptions` that belong to the programme band (actual school labels, e.g. Senior 1 / S1). */
export function classNamesForProgrammeBand(classOptions: string[], band: ProgrammeBand): string[] {
  const pred = band === 'olevel' ? isOLevelClass : isALevelClass;
  return classOptions.filter((c) => pred(c));
}

/** Classes that are neither O- nor A-Level (e.g. Primary) — still edited one class at a time. */
export function nonBandClassOptions(classOptions: string[]): string[] {
  return classOptions.filter((c) => !isOLevelClass(c) && !isALevelClass(c));
}

export type ClassSubjectRowWithClass = ClassSubjectRow & { class_name: string };

export async function fetchClassSubjectsForClasses(
  schoolId: string,
  classNames: string[],
): Promise<ClassSubjectRowWithClass[]> {
  if (!schoolId || classNames.length === 0) return [];
  const { data, error } = await supabase
    .from('class_subjects')
    .select('subject, uce_offering_type, is_non_removable_default, class_name')
    .eq('school_id', schoolId)
    .in('class_name', classNames)
    .order('subject');
  if (error) throw error;
  return (data || []) as ClassSubjectRowWithClass[];
}

/**
 * One row per subject for band UI: if any class marks it compulsory, treat as compulsory;
 * `is_non_removable_default` is true if any row has it.
 */
export function mergeBandClassSubjectRows(rows: ClassSubjectRowWithClass[]): ClassSubjectRow[] {
  const bySubject = new Map<string, ClassSubjectRow>();
  for (const r of rows) {
    const key = String(r.subject || '').trim();
    if (!key) continue;
    const existing = bySubject.get(key);
    if (!existing) {
      bySubject.set(key, {
        subject: r.subject,
        uce_offering_type: r.uce_offering_type ?? null,
        is_non_removable_default: r.is_non_removable_default ?? null,
      });
      continue;
    }
    const compulsory =
      existing.uce_offering_type === 'compulsory' || r.uce_offering_type === 'compulsory'
        ? 'compulsory'
        : (existing.uce_offering_type || r.uce_offering_type || null);
    bySubject.set(key, {
      subject: r.subject,
      uce_offering_type: compulsory,
      is_non_removable_default: !!(existing.is_non_removable_default || r.is_non_removable_default),
    });
  }
  return Array.from(bySubject.values()).sort((a, b) => a.subject.localeCompare(b.subject));
}

/** First concrete class name in the band — for helpers that expect a single `selectedClass` label. */
export function representativeClassNameForBand(classNames: string[], band: ProgrammeBand): string {
  if (classNames.length > 0) return classNames[0];
  return band === 'olevel' ? 'Senior 1' : 'Senior 5';
}
