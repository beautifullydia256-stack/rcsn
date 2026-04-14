import { describe, it, expect } from 'vitest';
import { generateTemplate4AlevelHTML } from '../template4AlevelHtml';

describe('template4 A-Level HTML', () => {
  it('renders HTML for minimal A-Level reportData', () => {
    const reportData = {
      school: { name: 'Test Secondary' },
      examSet: { term: 1, year: 2026, name: 'End of Term' },
      students: [
        {
          name: 'Jane Doe',
          current_class: 'Senior 5',
          admission_number: 'S5001',
          results: [
            {
              subject: 'Geography',
              marks_obtained: 72,
              total_marks: 100,
              grade: 'B',
              paper_code: 'P250/1',
              teacher_initials: 'AB',
              overall_remark: 'Good',
            },
          ],
          summary: { average: 72 },
          comments: {
            class_teacher_text: 'Doing well in sciences.',
            head_teacher_text: 'Keep improving.',
          },
        },
      ],
    };
    const html = generateTemplate4AlevelHTML(reportData, null, null);
    expect(html).toContain('upper-results alevel-marks');
    expect(html).toContain('secondary-upper-student-block');
    expect(html).toContain('<strong>Admission No:</strong>');
    expect(html).toContain("LEARNER'S END OF TERM REPORT CARD FOR TERM 1, 2026");
    expect(html).toContain('End of Term - 2026');
    expect(html).toContain('Geography');
    expect(html).toContain('Final %');
    expect(html).toContain('80–100%');
    expect(html).not.toContain('Achievement level');
    expect(html).not.toContain('Demonstrates an excellent level of competence');
    expect(html).toContain("Class Teacher's Comment");
    expect(html).toContain('Doing well in sciences.');
    expect(html).toContain('Keep improving.');
    expect(html).not.toContain('<th>Paper</th>');
  });

  it('renders principal / subsidiary passes and total points when alevel stats are set', () => {
    const reportData = {
      school: { name: 'Test Secondary' },
      examSet: { term: 2, year: 2026, name: 'Mid Term' },
      alevel: {
        principalPasses: 3,
        subsidiaryPasses: 2,
        totalPointsNumerator: 17,
        totalPointsDenominator: 20,
        paperRows: [],
      },
      students: [
        {
          name: 'Test Student',
          current_class: 'Senior 5',
          admission_number: 'S5002',
          results: [],
          comments: { class_teacher_text: '', head_teacher_text: '' },
        },
      ],
    };
    const html = generateTemplate4AlevelHTML(reportData, null, null);
    expect(html).toContain('Principal Passes</strong> 3');
    expect(html).toContain('Subsidiary Passes</strong> 2');
    expect(html).toContain('Total Points</strong> 17/20');
  });
});
