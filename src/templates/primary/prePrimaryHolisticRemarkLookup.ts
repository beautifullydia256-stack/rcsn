/**
 * Stable keys for teacher_remarks_settings ↔ holistic grid lookups.
 * DB subjects may differ slightly from runtime strand titles (spacing, parentheses).
 */

import type { PrePrimaryHolisticRuntimeConfig } from '@/lib/prePrimaryHolisticDb';
import { runtimeStrandsToHolisticStrands } from '@/lib/prePrimaryHolisticDb';
import {
  FALLBACK_PRE_PRIMARY_HOLISTIC_STRANDS,
  PRE_PRIMARY_HOLISTIC_GRADE_ENUMS,
  type PrePrimaryHolisticGradeEnum,
} from './prePrimaryHolisticRatings';
import { defaultTeacherRemarkForSkill } from './prePrimarySkillRemarkDefaults';

/** Normalize strand subject for map keys (trim, collapse spaces, lowercase). */
export function normalizePrePrimaryRemarkSubjectKey(subject: string): string {
  return String(subject || '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

/** Primary storage key for remark maps: normalized subject + literal skill_key. */
export function prePrimaryTeacherRemarkStorageKey(subject: string, skillKey: string): string {
  return `${normalizePrePrimaryRemarkSubjectKey(subject)}::${String(skillKey || '').trim()}`;
}

/** Keys to try when reading remarks (exact UI strand + normalized + base title without trailing parentheses). */
export function prePrimaryTeacherRemarkLookupKeyVariants(strandSubject: string, skillKey: string): string[] {
  const sk = String(skillKey || '').trim();
  const t = String(strandSubject || '').trim();
  const base = t.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const set = new Set<string>();
  set.add(`${t}::${sk}`);
  set.add(prePrimaryTeacherRemarkStorageKey(t, sk));
  if (base && base !== t) {
    set.add(`${base}::${sk}`);
    set.add(prePrimaryTeacherRemarkStorageKey(base, sk));
  }
  return [...set];
}

export function lookupPrePrimaryTeacherRemarkLine(
  map: Record<string, Partial<Record<PrePrimaryHolisticGradeEnum, string>>> | null | undefined,
  strandSubject: string,
  skillKey: string,
  grade: PrePrimaryHolisticGradeEnum | null,
): string | null {
  if (!map || !grade) return null;
  for (const k of prePrimaryTeacherRemarkLookupKeyVariants(strandSubject, skillKey)) {
    const line = map[k]?.[grade];
    const s = typeof line === 'string' ? line.trim() : '';
    if (s) return s;
  }
  return null;
}

/** Match exam result row to strand when `subject` strings differ slightly. */
export function findNurseryResultRowForStrand<
  T extends { subject?: string; nursery_skill_performance?: unknown },
>(results: T[] | undefined, strandSubject: string): T | undefined {
  if (!results?.length) return undefined;
  const t = String(strandSubject || '').trim();
  const exact = results.find((r) => String(r.subject || '').trim() === t);
  if (exact) return exact;
  const want = normalizePrePrimaryRemarkSubjectKey(t);
  const baseWant = t.replace(/\s*\([^)]*\)\s*$/, '').trim();
  const baseNorm = normalizePrePrimaryRemarkSubjectKey(baseWant);
  return results.find((r) => {
    const s = String(r.subject || '').trim();
    if (!s) return false;
    if (normalizePrePrimaryRemarkSubjectKey(s) === want) return true;
    const sb = s.replace(/\s*\([^)]*\)\s*$/, '').trim();
    return normalizePrePrimaryRemarkSubjectKey(sb) === baseNorm;
  });
}

/**
 * Merge code defaults (and optional DB rows already in `out`) so every strand×skill×grade has a line when defaults exist.
 */
export function mergeDefaultHolisticTeacherRemarksIntoMap(
  out: Record<string, Partial<Record<PrePrimaryHolisticGradeEnum, string>>>,
  runtime: PrePrimaryHolisticRuntimeConfig | null | undefined,
): void {
  const strands = runtime?.strands?.length
    ? runtimeStrandsToHolisticStrands(runtime.strands)
    : FALLBACK_PRE_PRIMARY_HOLISTIC_STRANDS;
  if (!strands.length) return;
  for (const st of strands) {
    for (const sk of st.skills) {
      const key = prePrimaryTeacherRemarkStorageKey(st.subject, sk.key);
      for (const grade of PRE_PRIMARY_HOLISTIC_GRADE_ENUMS) {
        const cur = out[key]?.[grade]?.trim();
        if (cur) continue;
        const def = defaultTeacherRemarkForSkill(sk.key, grade).trim();
        if (!def) continue;
        if (!out[key]) out[key] = {};
        out[key][grade] = def;
      }
    }
  }
}
