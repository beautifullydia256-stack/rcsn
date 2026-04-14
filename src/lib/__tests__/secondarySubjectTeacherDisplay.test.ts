import { describe, it, expect } from 'vitest';
import {
  formatTeacherShortNameForReport,
  resolveSubjectTeacherShortName,
  type TeacherClassSubjectAssignment,
} from '../secondarySubjectTeacherDisplay';

describe('secondarySubjectTeacherDisplay', () => {
  it('formats first name + last initial', () => {
    expect(formatTeacherShortNameForReport('kimuli daudi')).toBe('Kimuli D');
    expect(formatTeacherShortNameForReport('Mary Jane Watson')).toBe('Mary W');
  });

  it('title-cases a single name', () => {
    expect(formatTeacherShortNameForReport('nakato')).toBe('Nakato');
  });

  it('prefers subject_teacher then co_teacher', () => {
    const assignments: TeacherClassSubjectAssignment[] = [
      {
        class_name: 'Senior 5',
        subject: 'Physics',
        assignment_role: 'co_teacher',
        teacher_name: 'Alpha Co',
      },
      {
        class_name: 'S5',
        subject: 'Physics',
        assignment_role: 'subject_teacher',
        teacher_name: 'kimuli daudi',
      },
    ];
    expect(resolveSubjectTeacherShortName(assignments, 'Senior 5', 'Physics')).toBe('Kimuli D');
  });

  it('falls back to co_teacher when no primary', () => {
    const assignments: TeacherClassSubjectAssignment[] = [
      {
        class_name: 'Senior 5',
        subject: 'Biology',
        assignment_role: 'co_teacher',
        teacher_name: 'beta gamma',
      },
    ];
    expect(resolveSubjectTeacherShortName(assignments, 'S5', 'Biology')).toBe('Beta G');
  });
});
