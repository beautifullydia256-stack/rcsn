import { describe, it, expect } from 'vitest';
import { computeAlevelUaceReportStats } from '../alevelUaceReportStats';

describe('computeAlevelUaceReportStats', () => {
  it('counts principal passes, subsidiary O passes, and total points (PCM + GP + Sub Math example)', () => {
    const roles: Record<string, 'principal' | 'subsidiary'> = {
      physics: 'principal',
      chemistry: 'principal',
      mathematics: 'principal',
      'general paper': 'subsidiary',
      gp: 'subsidiary',
      'subsidiary mathematics': 'subsidiary',
    };
    const expected = ['Physics', 'Chemistry', 'Mathematics', 'General Paper', 'Subsidiary Mathematics'];
    const results = [
      { subject: 'Physics', final_score: 85, total_marks: 100 },
      { subject: 'Chemistry', final_score: 72, total_marks: 100 },
      { subject: 'Mathematics', final_score: 65, total_marks: 100 },
      { subject: 'General Paper', final_score: 42, total_marks: 100 },
      { subject: 'Subsidiary Mathematics', final_score: 41, total_marks: 100 },
    ];
    const stats = computeAlevelUaceReportStats(results, expected, roles, null);
    expect(stats.principalPasses).toBe(3);
    expect(stats.subsidiaryPasses).toBe(2);
    expect(stats.totalPointsNumerator).toBe(17);
    expect(stats.totalPointsDenominator).toBe(20);
  });

  it('treats unknown role as principal', () => {
    const expected = ['Biology'];
    const results = [{ subject: 'Biology', final_score: 55, total_marks: 100 }];
    const stats = computeAlevelUaceReportStats(results, expected, {}, null);
    expect(stats.principalPasses).toBe(1);
    expect(stats.subsidiaryPasses).toBe(0);
    expect(stats.totalPointsNumerator).toBe(3);
  });
});
