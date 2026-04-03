import { describe, it, expect } from 'vitest';
import { ALL_MAPPED_PRE_PRIMARY_ITEM_KEYS, type NurseryDetailedObservationRow } from './prePrimaryDetailedCommentMapping';
import { resolveSkillDetailedText, buildPrePrimaryDetailedSections } from './prePrimaryDetailedCommentResolve';

function fakeRow(item_key: string): NurseryDetailedObservationRow {
  return {
    item_key,
    prompt_text: 'Prompt line.',
    response_yes: 'Yes text.',
    response_tries: 'Tries text.',
    response_never: 'Never text.',
    response_good: 'Good text.',
    response_needs_improvement: 'Needs improvement text.',
  };
}

describe('prePrimary detailed comment mapping', () => {
  it('maps exactly 15 unique catalogue keys', () => {
    expect(ALL_MAPPED_PRE_PRIMARY_ITEM_KEYS.length).toBe(15);
  });

  it('uses distinct Good vs Needs Improvement when columns are present', () => {
    const items: Record<string, NurseryDetailedObservationRow> = {
      social_observes_rules: fakeRow('social_observes_rules'),
    };
    expect(resolveSkillDetailedText('relating_with_others', 'GOOD', items).responseText).toBe('Good text.');
    expect(resolveSkillDetailedText('relating_with_others', 'NEEDS_IMPROVEMENT', items).responseText).toBe(
      'Needs improvement text.'
    );
    expect(resolveSkillDetailedText('relating_with_others', 'VERY_GOOD', items).responseText).toBe('Yes text.');
    expect(resolveSkillDetailedText('relating_with_others', 'TRIES', items).responseText).toBe('Never text.');
  });

  it('builds sections with expected skill labels for one strand', () => {
    const items: Record<string, NurseryDetailedObservationRow> = Object.fromEntries(
      ALL_MAPPED_PRE_PRIMARY_ITEM_KEYS.map((k) => [k, fakeRow(k)])
    );
    const social = 'Relating with others (Social development)';
    const results = [
      {
        subject: social,
        nursery_skill_performance: {
          relating_with_others: 'VERY_GOOD',
          games: 'GOOD',
          helping: 'TRIES',
        },
      },
    ];
    const sections = buildPrePrimaryDetailedSections(results, items);
    const sec = sections.find((s) => s.sectionTitle === social);
    expect(sec?.skills).toHaveLength(3);
    expect(sec?.skills[0]?.responseText).toContain('Yes');
    expect(sec?.skills[1]?.responseText).toContain('Good');
  });
});
