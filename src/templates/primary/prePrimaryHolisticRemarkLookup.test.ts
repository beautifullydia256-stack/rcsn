import { describe, expect, it } from 'vitest';
import {
  lookupPrePrimaryTeacherRemarkLine,
  normalizePrePrimaryRemarkSubjectKey,
  prePrimaryTeacherRemarkStorageKey,
} from './prePrimaryHolisticRemarkLookup';

describe('prePrimaryHolisticRemarkLookup', () => {
  it('normalizes subject keys for stable storage', () => {
    expect(normalizePrePrimaryRemarkSubjectKey('  Taking care  of myself (Health)  ')).toBe(
      'taking care of myself (health)',
    );
  });

  it('finds remarks when map uses normalized key but UI uses exact strand title', () => {
    const map = {
      [prePrimaryTeacherRemarkStorageKey('Taking care of myself (Health)', 'toilet_habits')]: {
        VERY_GOOD: 'Take self to the toilet on own.',
      },
    };
    const line = lookupPrePrimaryTeacherRemarkLine(
      map,
      'Taking care of myself (Health)',
      'toilet_habits',
      'VERY_GOOD',
    );
    expect(line).toBe('Take self to the toilet on own.');
  });
});
