/**
 * Unit Tests for Template 7: Junior Nursery Report Template
 */

import { generateTemplate7HTML } from '../generators';
import type { Template7Data } from '../types';

describe('Template 7: Junior Nursery Report Template', () => {
  const sampleData: Template7Data = {
    school: {
      name: 'PWEZACORE JUNIOR SCHOOL',
      address: 'Location Gangu Kimwanyi Busaabala Road',
      phone: '0751 230190 / 0772 604623 / 0702 086390'
    },
    student: {
      name: 'John Doe',
      class: 'TOP Class',
      age: '5 years',
      term: 'Term 1',
      year: '2024',
      position: '1st',
      outOf: '25',
      admissionNo: 'ADM2024001',
      paymentCode: 'PAY12345'
    },
    subjects: [
      {
        name: 'LEARNING AREA 1',
        marksObtained: 85,
        outOf: 100,
        examAgg: 1,
        aggGrade: 'A',
        remarks: 'Excellent performance',
        initials: 'JD'
      },
      {
        name: 'LEARNING AREA 2',
        marksObtained: 78,
        outOf: 100,
        examAgg: 2,
        aggGrade: 'B',
        remarks: 'Good work',
        initials: 'JD'
      },
      {
        name: 'LEARNING AREA 3',
        marksObtained: 92,
        outOf: 100,
        examAgg: 1,
        aggGrade: 'A',
        remarks: 'Outstanding',
        initials: 'JD'
      },
      {
        name: 'LEARNING AREA 4',
        marksObtained: 88,
        outOf: 100,
        examAgg: 1,
        aggGrade: 'A',
        remarks: 'Very good',
        initials: 'JD'
      },
      {
        name: 'LEARNING AREA 5',
        marksObtained: 75,
        outOf: 100,
        examAgg: 2,
        aggGrade: 'B',
        remarks: 'Good progress',
        initials: 'JD'
      },
      {
        name: 'GEN. KNOWLEDGE',
        marksObtained: 82,
        outOf: 100,
        examAgg: 2,
        aggGrade: 'B',
        remarks: 'Well done',
        initials: 'JD'
      }
    ],
    total: 500,
    comments: {
      classTeacher: {
        text: 'John is a bright student who shows great enthusiasm in class.',
        signature: 'Ms. Smith'
      },
      headteacher: {
        text: 'Keep up the excellent work!',
        signature: 'Mr. Johnson'
      }
    },
    requirements: 'School requirements: 2 exercise books, 1 pencil, 1 eraser',
    termDates: {
      endDate: '15th December 2024',
      nextTermBegins: '20th January 2025'
    }
  };

  test('should generate valid HTML document', () => {
    const html = generateTemplate7HTML(sampleData);
    
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html>');
    expect(html).toContain('</html>');
  });

  test('should include Forest Green color scheme (#006b4d)', () => {
    const html = generateTemplate7HTML(sampleData);
    
    expect(html).toContain('#006b4d');
  });

  test('should include 4px double border', () => {
    const html = generateTemplate7HTML(sampleData);
    
    expect(html).toContain('4px double #006b4d');
  });

  test('should include school information', () => {
    const html = generateTemplate7HTML(sampleData);
    
    expect(html).toContain('PWEZACORE JUNIOR SCHOOL');
    expect(html).toContain('Location Gangu Kimwanyi Busaabala Road');
    expect(html).toContain('0751 230190 / 0772 604623 / 0702 086390');
  });

  test('should include report title', () => {
    const html = generateTemplate7HTML(sampleData);
    
    expect(html).toContain('NURSERY REPORT FORM');
  });

  test('should include student information', () => {
    const html = generateTemplate7HTML(sampleData);
    
    expect(html).toContain('John Doe');
    expect(html).toContain('TOP Class');
    expect(html).toContain('5 years');
    expect(html).toContain('Term 1');
    expect(html).toContain('2024');
    expect(html).toContain('1st');
    expect(html).toContain('25');
  });

  test('should include assessment table headers', () => {
    const html = generateTemplate7HTML(sampleData);
    
    expect(html).toContain('SUBJECT');
    expect(html).toContain('EXAM MARKS OBTAINED OUT OF 100');
    expect(html).toContain('AGG. GRADE');
    expect(html).toContain('REMARKS');
    expect(html).toContain('INITIALS');
  });

  test('should include all subjects with data', () => {
    const html = generateTemplate7HTML(sampleData);
    
    expect(html).toContain('LEARNING AREA 1');
    expect(html).toContain('85');
    expect(html).toContain('Excellent performance');
    expect(html).toContain('LEARNING AREA 2');
    expect(html).toContain('78');
    expect(html).toContain('GEN. KNOWLEDGE');
    expect(html).toContain('82');
  });

  test('should include total row', () => {
    const html = generateTemplate7HTML(sampleData);
    
    expect(html).toContain('TOTAL');
    expect(html).toContain('500');
  });

  test('should include class teacher comment', () => {
    const html = generateTemplate7HTML(sampleData);
    
    expect(html).toContain("Class Teacher's Report:");
    expect(html).toContain('John is a bright student who shows great enthusiasm in class.');
    expect(html).toContain('Ms. Smith');
  });

  test('should include headteacher comment with RED color', () => {
    const html = generateTemplate7HTML(sampleData);
    
    expect(html).toContain("Headteacher's Report:");
    expect(html).toContain('Keep up the excellent work!');
    expect(html).toContain('#FF0000'); // RED color for headteacher comment
    expect(html).toContain('Mr. Johnson');
  });

  test('should include requirements section', () => {
    const html = generateTemplate7HTML(sampleData);
    
    expect(html).toContain('School requirements: 2 exercise books, 1 pencil, 1 eraser');
  });

  test('should include term dates in footer', () => {
    const html = generateTemplate7HTML(sampleData);
    
    expect(html).toContain('End of term: 15th December 2024');
    expect(html).toContain('Next term begins on: 20th January 2025');
  });

  test('should include dotted underlines for student info', () => {
    const html = generateTemplate7HTML(sampleData);
    
    expect(html).toContain('1px dotted #006b4d');
  });

  test('should have proper table styling', () => {
    const html = generateTemplate7HTML(sampleData);
    
    expect(html).toContain('border-collapse: collapse');
    expect(html).toContain('1px solid #006b4d');
  });

  test('should handle optional position field', () => {
    const dataWithoutPosition: Template7Data = {
      ...sampleData,
      student: {
        ...sampleData.student,
        position: undefined,
        outOf: undefined
      }
    };
    
    const html = generateTemplate7HTML(dataWithoutPosition);
    
    expect(html).toContain('John Doe');
    expect(html).not.toContain('Position:');
  });

  test('should handle empty initials', () => {
    const dataWithoutInitials: Template7Data = {
      ...sampleData,
      subjects: sampleData.subjects.map(s => ({ ...s, initials: undefined }))
    };
    
    const html = generateTemplate7HTML(dataWithoutInitials);
    
    expect(html).toContain('LEARNING AREA 1');
    expect(html).toContain('INITIALS');
  });

  test('should include admission number and payment code', () => {
    const html = generateTemplate7HTML(sampleData);
    
    expect(html).toContain('Admission No:');
    expect(html).toContain('ADM2024001');
    expect(html).toContain('Payment Code:');
    expect(html).toContain('PAY12345');
  });

  test('should handle missing admission number and payment code', () => {
    const dataWithoutCodes: Template7Data = {
      ...sampleData,
      student: {
        ...sampleData.student,
        admissionNo: undefined,
        paymentCode: undefined
      }
    };
    
    const html = generateTemplate7HTML(dataWithoutCodes);
    
    expect(html).toContain('Admission No:');
    expect(html).toContain('N/A');
    expect(html).toContain('Payment Code:');
    expect(html).toContain('N/A');
  });
});
