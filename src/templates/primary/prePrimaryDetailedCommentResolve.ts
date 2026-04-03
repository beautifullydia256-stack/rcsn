import {
  PRE_PRIMARY_HOLISTIC_STRANDS,
  parsePrePrimaryGradeFromPerformanceJson,
  type PrePrimaryHolisticGradeEnum,
} from './prePrimaryHolisticRatings';
import {
  getItemKeyForSkillKey,
  getResponseTextForGrade,
  type NurseryDetailedObservationRow,
} from './prePrimaryDetailedCommentMapping';

export type PrePrimaryDetailedSkillBlock = {
  skillKey: string;
  skillLabel: string;
  promptText: string;
  responseText: string;
  notRecorded: boolean;
};

export type PrePrimaryDetailedSection = {
  sectionTitle: string;
  skills: PrePrimaryDetailedSkillBlock[];
  strandPartiallyRecorded: boolean;
};

/**
 * Build five learning-area sections from per-subject results and observation catalogue rows.
 */
export function buildPrePrimaryDetailedSections(
  results: Array<{ subject?: string; nursery_skill_performance?: unknown }> | undefined,
  itemsByKey: Record<string, NurseryDetailedObservationRow>
): PrePrimaryDetailedSection[] {
  return PRE_PRIMARY_HOLISTIC_STRANDS.map((strand) => {
    const row = (results || []).find((r) => (r.subject || '').trim() === strand.subject);
    const perf = row?.nursery_skill_performance;

    const skills: PrePrimaryDetailedSkillBlock[] = strand.skills.map((skill) => {
      const grade = parsePrePrimaryGradeFromPerformanceJson(perf, skill.key);
      const itemKey = getItemKeyForSkillKey(skill.key);
      const item = itemKey ? itemsByKey[itemKey] : undefined;
      const notRecorded = grade == null || !item;

      let responseText = '';
      let promptText = '';
      if (item) {
        promptText = item.prompt_text;
        if (grade) responseText = getResponseTextForGrade(item, grade);
      }

      return {
        skillKey: skill.key,
        skillLabel: skill.label,
        promptText,
        responseText,
        notRecorded,
      };
    });

    const strandPartiallyRecorded = skills.some((s) => !s.notRecorded);

    return {
      sectionTitle: strand.subject,
      skills,
      strandPartiallyRecorded,
    };
  });
}

export function prePrimaryDetailedReportIsIncomplete(
  sections: PrePrimaryDetailedSection[]
): boolean {
  return sections.some((sec) => !sec.strandPartiallyRecorded || sec.skills.some((s) => s.notRecorded));
}

/** For tests: resolve one skill without full section builder. */
export function resolveSkillDetailedText(
  skillKey: string,
  grade: PrePrimaryHolisticGradeEnum,
  itemsByKey: Record<string, NurseryDetailedObservationRow>
): { promptText: string; responseText: string } {
  const itemKey = getItemKeyForSkillKey(skillKey);
  const item = itemKey ? itemsByKey[itemKey] : undefined;
  if (!item) return { promptText: '', responseText: '' };
  return {
    promptText: item.prompt_text,
    responseText: getResponseTextForGrade(item, grade),
  };
}
