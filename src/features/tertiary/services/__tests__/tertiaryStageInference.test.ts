import { describe, it, expect } from 'vitest';
import { inferTertiaryAcademicStage } from '../tertiaryStageInference';

describe('inferTertiaryAcademicStage', () => {
  it('correctly infers graduate status for an older intake (e.g. 2020 CN)', () => {
    // Current date: September 2026
    const ref = new Date('2026-09-23T12:00:00Z');
    const res = inferTertiaryAcademicStage('CN', 2020, 'March Intake', ref);
    expect(res.stageCode).toBe('GRADUATED');
    expect(res.isCompleted).toBe(true);
    expect(res.suggestedAdmissionDate).toBe('2020-03-01');
  });

  it('correctly infers graduate status for August 2022 intake for a 2.5-year certificate', () => {
    const ref = new Date('2026-09-23T12:00:00Z');
    const res = inferTertiaryAcademicStage('CM', 2022, 'August Intake', ref);
    expect(res.stageCode).toBe('GRADUATED');
    expect(res.isCompleted).toBe(true);
    expect(res.suggestedAdmissionDate).toBe('2022-08-15');
  });

  it('correctly infers active continuing stage for a recent intake (e.g. March 2025 intake)', () => {
    // September 2026 is month ~18 after March 2025 -> Semester 4 (Y2S2)
    const ref = new Date('2026-09-23T12:00:00Z');
    const res = inferTertiaryAcademicStage('CN', 2025, 'March Intake', ref);
    expect(res.stageCode).toBe('Y2S2');
    expect(res.isCompleted).toBe(false);
  });

  it('correctly infers fresher Y1S1 for upcoming or fresh intake (e.g. August 2026 intake in September 2026)', () => {
    const ref = new Date('2026-09-23T12:00:00Z');
    const res = inferTertiaryAcademicStage('DN', 2026, 'August Intake', ref);
    expect(res.stageCode).toBe('Y1S1');
    expect(res.isCompleted).toBe(false);
  });

  it('allows 6 semesters for Diploma courses (DN/DM)', () => {
    expect(inferTertiaryAcademicStage('DN', 2026, 'March Intake').totalSemesters).toBe(6);
    expect(inferTertiaryAcademicStage('CN', 2026, 'March Intake').totalSemesters).toBe(5);
  });
});
