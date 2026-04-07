import { describe, it, expect } from 'vitest';
import { generateTemplate4AlevelHTML } from '../template4AlevelHtml';

describe('template4 A-Level HTML', () => {
  it('renders HTML for minimal A-Level reportData', () => {
    const reportData = {
      school: { name: 'Test Secondary' },
      examSet: { term: 1, year: 2026 },
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
          comments: {},
        },
      ],
    };
    const html = generateTemplate4AlevelHTML(reportData, null, null);
    expect(html).toContain('A-LEVEL');
    expect(html).toContain('Geography');
    expect(html).toContain('P250/1');
  });
});
