import { describe, it, expect } from 'vitest';
import { computeTertiaryProgress } from '../tertiaryProgress';

describe('computeTertiaryProgress', () => {
  it('correctly calculates progress for Certificate in Nursing (CN) Year 2 Semester 2', () => {
    const res = computeTertiaryProgress('CN22 Year 2 Semester 2');
    expect(res.programmeCode).toBe('CN');
    expect(res.totalSemesters).toBe(5);
    expect(res.currentSemesterNumber).toBe(4);
    expect(res.percentage).toBe(80);
    expect(res.remainingSemesters).toBe(1);
    expect(res.isFinalSemester).toBe(false);
    expect(res.isCompleted).toBe(false);
    expect(res.shortPill).toBe('Sem 4/5 (80%)');
    expect(res.formattedBadge).toContain('Semester 4 of 5 (80%)');
  });

  it('correctly calculates progress for Certificate in Midwifery (CM) final semester Y3S1', () => {
    const res = computeTertiaryProgress('CM22 - Year 3 Semester 1');
    expect(res.programmeCode).toBe('CM');
    expect(res.totalSemesters).toBe(5);
    expect(res.currentSemesterNumber).toBe(5);
    expect(res.percentage).toBe(100);
    expect(res.remainingSemesters).toBe(0);
    expect(res.isFinalSemester).toBe(true);
    expect(res.shortPill).toBe('Sem 5/5 (100%)');
  });

  it('correctly calculates progress for Diploma in Nursing (DN) Year 1 Semester 1', () => {
    const res = computeTertiaryProgress('DN24 Y1S1');
    expect(res.programmeCode).toBe('DN');
    expect(res.totalSemesters).toBe(6);
    expect(res.currentSemesterNumber).toBe(1);
    expect(res.percentage).toBe(17);
    expect(res.remainingSemesters).toBe(5);
    expect(res.isFinalSemester).toBe(false);
  });

  it('correctly identifies completed/graduating trainee', () => {
    const res = computeTertiaryProgress('CN21 Completed');
    expect(res.isCompleted).toBe(true);
    expect(res.percentage).toBe(100);
    expect(res.remainingSemesters).toBe(0);
    expect(res.formattedBadge).toContain('All 5 Semesters Completed');
  });

  it('correctly identifies graduated alumni record', () => {
    const res = computeTertiaryProgress('CN20 – Completed / Graduated');
    expect(res.isCompleted).toBe(true);
    expect(res.percentage).toBe(100);
    expect(res.remainingSemesters).toBe(0);
    expect(res.shortPill).toBe('Graduated (100%)');
    expect(res.formattedBadge).toContain('Graduated Alumni');
  });
});
