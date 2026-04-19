import type { SupabaseClient } from '@supabase/supabase-js';

/** One rating band (DB: pre_primary_holistic_rating_levels). */
export type PrePrimaryRatingLevelRow = {
  grade_enum: 'VERY_GOOD' | 'GOOD' | 'NEEDS_IMPROVEMENT' | 'TRIES';
  display_label: string;
  color_hex: string;
  sort_order: number;
};

export type PrePrimaryHolisticStrandRow = {
  id: string;
  subject: string;
  sort_order: number;
  skills: Array<{ skill_key: string; label: string; sort_order: number }>;
};

/** Everything the UI needs for the holistic grid and reports (all from DB). */
export type PrePrimaryHolisticRuntimeConfig = {
  strands: PrePrimaryHolisticStrandRow[];
  ratingLevels: PrePrimaryRatingLevelRow[];
};

/**
 * Load strands + skills + rating labels/colours for a school.
 * Returns null if the school has no rows yet (migrations not applied or non-primary).
 */
export async function fetchPrePrimaryHolisticConfig(
  supabase: SupabaseClient,
  schoolId: string
): Promise<PrePrimaryHolisticRuntimeConfig | null> {
  const [strandsRes, skillsRes, ratingsRes] = await Promise.all([
    supabase
      .from('pre_primary_holistic_strands')
      .select('id, subject, sort_order')
      .eq('school_id', schoolId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('pre_primary_holistic_skills')
      .select('strand_id, skill_key, label, sort_order')
      .eq('school_id', schoolId)
      .order('sort_order', { ascending: true }),
    supabase
      .from('pre_primary_holistic_rating_levels')
      .select('grade_enum, display_label, color_hex, sort_order')
      .eq('school_id', schoolId)
      .order('sort_order', { ascending: true }),
  ]);

  if (strandsRes.error) throw strandsRes.error;
  if (skillsRes.error) throw skillsRes.error;
  if (ratingsRes.error) throw ratingsRes.error;

  const strandRows = strandsRes.data ?? [];
  const skillRows = skillsRes.data ?? [];
  const ratingLevels = (ratingsRes.data ?? []) as PrePrimaryRatingLevelRow[];

  if (strandRows.length === 0 || ratingLevels.length === 0) return null;

  const skillsByStrand = new Map<string, typeof skillRows>();
  for (const sk of skillRows) {
    const list = skillsByStrand.get(sk.strand_id) ?? [];
    list.push(sk);
    skillsByStrand.set(sk.strand_id, list);
  }

  const strands: PrePrimaryHolisticStrandRow[] = strandRows.map((st) => ({
    id: st.id,
    subject: st.subject,
    sort_order: st.sort_order,
    skills: (skillsByStrand.get(st.id) ?? []).map((sk) => ({
      skill_key: sk.skill_key,
      label: sk.label,
      sort_order: sk.sort_order,
    })),
  }));

  return { strands, ratingLevels };
}

/** Map DB strand rows to the shape used by existing holistic helpers. */
export function runtimeStrandsToHolisticStrands(strands: PrePrimaryHolisticStrandRow[]): Array<{
  subject: string;
  skills: Array<{ key: string; label: string }>;
}> {
  return strands.map((st) => ({
    subject: st.subject,
    skills: [...st.skills]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((sk) => ({ key: sk.skill_key, label: sk.label })),
  }));
}

export function allSubjectsFromRuntime(strands: PrePrimaryHolisticStrandRow[]): string[] {
  return [...strands].sort((a, b) => a.sort_order - b.sort_order).map((s) => s.subject);
}

export function allSkillKeysFromRuntime(strands: PrePrimaryHolisticStrandRow[]): Set<string> {
  const keys = new Set<string>();
  for (const st of strands) {
    for (const sk of st.skills) keys.add(sk.skill_key);
  }
  return keys;
}
