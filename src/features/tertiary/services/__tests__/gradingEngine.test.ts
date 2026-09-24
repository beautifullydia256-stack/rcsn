import { describe, it, expect } from 'vitest';
import {
  calculateGradeAndGP,
  calculateSemesterGPA,
  calculateCumulativeCGPA,
  determineAcademicStanding,
  determineAwardClassification,
} from '../gradingEngine';

describe('UHPAB 5.0 Scale Grading Engine Tests', () => {
  it('should correctly convert score percentages into UHPAB GP and AG', () => {
    // 80+ is A (5.0)
    expect(calculateGradeAndGP(85)).toEqual({
      grade: 'A',
      gradePoint: 5.0,
      remarks: 'Excellent Distinction',
      isRetake: false,
    });

    // 76 is B+ (4.5)
    expect(calculateGradeAndGP(76)).toEqual({
      grade: 'B+',
      gradePoint: 4.5,
      remarks: 'Very Good',
      isRetake: false,
    });

    // 71 is B (4.0)
    expect(calculateGradeAndGP(71)).toEqual({
      grade: 'B',
      gradePoint: 4.0,
      remarks: 'Good Credit',
      isRetake: false,
    });

    // 66 is C+ (3.5)
    expect(calculateGradeAndGP(66)).toEqual({
      grade: 'C+',
      gradePoint: 3.5,
      remarks: 'Credit',
      isRetake: false,
    });

    // 61 is C (3.0)
    expect(calculateGradeAndGP(61)).toEqual({
      grade: 'C',
      gradePoint: 3.0,
      remarks: 'Satisfactory Pass',
      isRetake: false,
    });

    // 56 is D+ (2.5)
    expect(calculateGradeAndGP(56)).toEqual({
      grade: 'D+',
      gradePoint: 2.5,
      remarks: 'Pass',
      isRetake: false,
    });

    // 50 is minimum pass D (2.0)
    expect(calculateGradeAndGP(50)).toEqual({
      grade: 'D',
      gradePoint: 2.0,
      remarks: 'Minimum Qualifying Pass',
      isRetake: false,
    });

    // 49.9 is automatic retake F (0.0)
    expect(calculateGradeAndGP(49.9)).toEqual({
      grade: 'F',
      gradePoint: 0.0,
      remarks: 'Fail (Automatic Retake Required)',
      isRetake: true,
    });
  });

  it('should accurately compute GPA matching UHPAB semester calculations', () => {
    // Year 1 Sem 1 sample from transcript:
    // CN 111: 5.0, CN 112: 5.0, CN 113: 4.0, CN 114: 4.0 (equal weights)
    const sem1 = [
      { creditUnits: 4.0, gradePoint: 5.0 },
      { creditUnits: 4.0, gradePoint: 5.0 },
      { creditUnits: 4.0, gradePoint: 4.0 },
      { creditUnits: 4.0, gradePoint: 4.0 },
    ];
    const gpa1 = calculateSemesterGPA(sem1);
    expect(gpa1).toBe(4.5);

    // Year 1 Sem 2 sample from transcript:
    // CN 121: 2.0, CN 122: 5.0, CN 123: 4.0, CN 124: 2.5
    const sem2 = [
      { creditUnits: 4.0, gradePoint: 2.0 },
      { creditUnits: 4.0, gradePoint: 5.0 },
      { creditUnits: 4.0, gradePoint: 4.0 },
      { creditUnits: 4.0, gradePoint: 2.5 },
    ];
    const gpa2 = calculateSemesterGPA(sem2);
    expect(gpa2).toBe(3.38);

    // Cumulative CGPA after Sem 1 & Sem 2:
    const cgpa = calculateCumulativeCGPA([...sem1, ...sem2]);
    expect(cgpa).toBe(3.94);
  });

  it('should flag probation when a paper has score < 50% / GP 0.0', () => {
    const passedUnits = [
      { creditUnits: 4.0, gradePoint: 4.0, isRetake: false },
      { creditUnits: 4.0, gradePoint: 3.5, isRetake: false },
    ];
    expect(determineAcademicStanding(passedUnits, 3.75)).toBe('NORMAL_PROGRESS');

    const failedUnits = [
      { creditUnits: 4.0, gradePoint: 4.0, isRetake: false },
      { creditUnits: 4.0, gradePoint: 0.0, isRetake: true },
    ];
    expect(determineAcademicStanding(failedUnits, 2.0)).toBe('PROBATION');
  });

  it('should determine correct graduation award classification', () => {
    expect(determineAwardClassification(4.55)).toBe('CLASS_I_DISTINCTION');
    expect(determineAwardClassification(3.8)).toBe('CLASS_II_CREDIT_UPPER');
    expect(determineAwardClassification(3.55)).toBe('CLASS_II_CREDIT_LOWER');
    expect(determineAwardClassification(2.5)).toBe('PASS');
    expect(determineAwardClassification(1.8)).toBe('FAIL');
  });
});
