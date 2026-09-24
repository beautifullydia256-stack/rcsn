import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import { parseUhpabResultsExcel, parseUnmebResultsExcel } from '../unmebExcelParser';
import { TertiaryStudentProfile } from '../../types';

describe('UHPAB & UNMEB Excel Results Importer & Parser', () => {
  const mockStudents: TertiaryStudentProfile[] = [
    {
      id: 'student-1',
      schoolId: 'school-1',
      fullName: 'Sarah Nakato',
      collegeRegNo: 'CNS/2024/001',
      uhpabExamNo: 'U099/001',
      unmebExamNo: 'U099/001',
      nsinNumber: 'JAN24/U099/CN/001',
      programmeId: 'prog-1',
      cohortId: 'cohort-1',
      currentStage: 'Y1S1',
      academicStanding: 'NORMAL_PROGRESS',
    },
    {
      id: 'student-2',
      schoolId: 'school-1',
      fullName: 'John Baptist Okello',
      collegeRegNo: 'CNS/2024/002',
      uhpabExamNo: 'U099/002',
      unmebExamNo: 'U099/002',
      nsinNumber: 'JAN24/U099/CN/002',
      programmeId: 'prog-1',
      cohortId: 'cohort-1',
      currentStage: 'Y1S1',
      academicStanding: 'NORMAL_PROGRESS',
    },
  ];

  it('should parse wide-format UHPAB / UNMEB spreadsheet and correctly match students by Exam No', async () => {
    const data = [
      {
        'UHPAB Exam No': 'U099/001',
        'Candidate Name': 'Nakato Sarah',
        'CN 111': 5.0,
        'CN 112': 4.5,
        'CN 113': 4.0,
        'CN 114': 4.0,
      },
      {
        'UNMEB Exam No': 'U099/002',
        'Candidate Name': 'Okello John Baptist',
        'CN 111': 4.0,
        'CN 112': 1.5, // Retake! (< 2.0 / < 50%)
        'CN 113': 3.5,
        'CN 114': 3.0,
      },
    ];

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Results');
    const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });

    const result = await parseUhpabResultsExcel(buffer, mockStudents, 'Y1S1', '2024/2025 Sem 1');

    expect(result.matchedCount).toBe(2);
    expect(result.unmatchedCount).toBe(0);
    expect(result.retakeCount).toBe(1);

    // Student 1 check: (5.0 + 4.5 + 4.0 + 4.0) / 4 = 17.5 / 4 = 4.38 GPA
    const s1 = result.matchedStudents.find((s) => s.student.id === 'student-1');
    expect(s1).toBeDefined();
    expect(s1?.hasRetake).toBe(false);
    expect(s1?.semesterGPA).toBe(4.38);
    expect(s1?.records.length).toBe(4);

    // Student 2 check: Has retake in CN 112
    const s2 = result.matchedStudents.find((s) => s.student.id === 'student-2');
    expect(s2).toBeDefined();
    expect(s2?.hasRetake).toBe(true);
    expect(s2?.retakeCourseCodes).toContain('CN 112');
  });
});
