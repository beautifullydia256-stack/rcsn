/**
 * Unit Tests for Template 9: Academy Professional Report
 */

import { generateTemplate9HTML } from '../generators';
import { getSampleTemplate9Data } from '../sampleData';
import type { Template9Data } from '../types';

describe('Template 9: Academy Professional Report', () => {
  const sampleData: Template9Data = getSampleTemplate9Data();

  test('should generate valid HTML document', () => {
    const html = generateTemplate9HTML(sampleData);
    
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html>');
    expect(html).toContain('</html>');
  });

  test('should include Navy Blue color scheme (#002366)', () => {
    const html = generateTemplate9HTML(sampleData);
    
    expect(html).toContain('#002366');
  });

  test('should include 2px solid border', () => {
    const html = generateTemplate9HTML(sampleData);
    
    expect(html).toContain('2px solid #002366');
  });

  test('should include watermark with school name', () => {
    const html = generateTemplate9HTML(sampleData);
    
    expect(html).toContain('class="watermark"');
    expect(html).toContain('opacity: 0.05');
    expect(html).toContain('rotate(-45deg)');
    expect(html).toContain('PWEZACORE ACADEMY');
  });

  test('should include school information in header', () => {
    const html = generateTemplate9HTML(sampleData);
    
    expect(html).toContain('PWEZACORE ACADEMY');
    expect(html).toContain('Mixed Day & Boarding nursery and primary school');
    expect(html).toContain('P.O BOX 001 KLA');
    expect(html).toContain('2567851268021');
    expect(html).toContain('info@pwezacore.ac.ug');
    expect(html).toContain('http://pwezacore.ac.ug');
    expect(html).toContain('NEVER GIVE UP');
  });

  test('should include student identity section with 3-column grid', () => {
    const html = generateTemplate9HTML(sampleData);
    
    expect(html).toContain('grid-template-columns: 1fr 1fr 1fr');
    expect(html).toContain('SAMPLE STUDENT NAME');
    expect(html).toContain('STU001');
    expect(html).toContain('PAY12345');
    expect(html).toContain('Top Class');
    expect(html).toContain('MALE');
    expect(html).toContain('LIN001');
  });

  test('should include circular student photo styling', () => {
    const html = generateTemplate9HTML(sampleData);
    
    expect(html).toContain('border-radius: 50%');
    expect(html).toContain('3px solid #002366');
  });

  test('should include student photo placeholder when no photo provided', () => {
    const html = generateTemplate9HTML(sampleData);
    
    expect(html).toContain('student-photo-placeholder');
    expect(html).toContain('PHOTO');
  });

  test('should include student photo when provided', () => {
    const photoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const html = generateTemplate9HTML(sampleData, null, photoBase64);
    
    expect(html).toContain('student-photo');
    expect(html).toContain(photoBase64);
  });

  test('should include report title bar with navy background', () => {
    const html = generateTemplate9HTML(sampleData);
    
    expect(html).toContain('background-color: #002366');
    expect(html).toContain('color: white');
    expect(html).toContain('END OF TERM ONE STUDENT REPORT CARD');
  });

  test('should include academic performance table with light blue header', () => {
    const html = generateTemplate9HTML(sampleData);
    
    expect(html).toContain('background-color: #f2f6ff');
    expect(html).toContain('Learning Area');
    expect(html).toContain('MOT');
    expect(html).toContain('EOT');
    expect(html).toContain('AVG');
    expect(html).toContain('GRADE');
    expect(html).toContain('COMMENT');
    expect(html).toContain('INITIAL');
  });

  test('should include all subjects with data', () => {
    const html = generateTemplate9HTML(sampleData);
    
    expect(html).toContain('READING');
    expect(html).toContain('WRITTING');
    expect(html).toContain('Language Development');
    expect(html).toContain('Numeracy');
    expect(html).toContain('Social Studies');
    expect(html).toContain('General Knowledge');
  });

  test('should include subject scores and grades', () => {
    const html = generateTemplate9HTML(sampleData);
    
    expect(html).toContain('85');
    expect(html).toContain('88');
    expect(html).toContain('86.5');
    expect(html).toContain('Excellent reading skills');
  });

  test('should include summary row with total and average', () => {
    const html = generateTemplate9HTML(sampleData);
    
    expect(html).toContain('Overall Total Mark: 506');
    expect(html).toContain('Overall Average Mark: 84.3');
  });

  test('should include class teacher comment with italic styling', () => {
    const html = generateTemplate9HTML(sampleData);
    
    expect(html).toContain("Class Teacher's Comment:");
    expect(html).toContain('font-style: italic');
    expect(html).toContain('An outstanding student who consistently performs well.');
  });

  test('should include head teacher comment with italic styling', () => {
    const html = generateTemplate9HTML(sampleData);
    
    expect(html).toContain("Head Teacher's Comment:");
    expect(html).toContain('Excellent performance. Keep it up!');
  });

  test('should include term dates section', () => {
    const html = generateTemplate9HTML(sampleData);
    
    expect(html).toContain('Next Term Begins On:');
    expect(html).toContain('20th January 2025');
    expect(html).toContain('Ends On:');
    expect(html).toContain('15th April 2025');
  });

  test('should include school requirements', () => {
    const html = generateTemplate9HTML(sampleData);
    
    expect(html).toContain('School requirements:');
    expect(html).toContain('2 exercise books, 1 pencil, 1 eraser');
  });

  test('should include grading scale table', () => {
    const html = generateTemplate9HTML(sampleData);
    
    expect(html).toContain('RANGE');
    expect(html).toContain('GRADE');
    expect(html).toContain('0.0 - 19.9');
    expect(html).toContain('20.0 - 39.9');
    expect(html).toContain('40.0 - 69.9');
    expect(html).toContain('70.0 - 89.9');
    expect(html).toContain('90.0 - 100.0');
    expect(html).toContain('>E</td>');
    expect(html).toContain('>D</td>');
    expect(html).toContain('>C</td>');
    expect(html).toContain('>B</td>');
    expect(html).toContain('>A</td>');
  });

  test('should include RED security warning', () => {
    const html = generateTemplate9HTML(sampleData);
    
    expect(html).toContain('color: #FF0000');
    expect(html).toContain('text-decoration: underline');
    expect(html).toContain('This report is invalid without a valid school stamp');
  });

  test('should have proper table styling with navy borders', () => {
    const html = generateTemplate9HTML(sampleData);
    
    expect(html).toContain('border-collapse: collapse');
    expect(html).toContain('1px solid #002366');
  });

  test('should handle empty initials', () => {
    const dataWithoutInitials: Template9Data = {
      ...sampleData,
      subjects: sampleData.subjects.map(s => ({ ...s, initial: undefined }))
    };
    
    const html = generateTemplate9HTML(dataWithoutInitials);
    
    expect(html).toContain('READING');
    expect(html).toContain('INITIAL');
  });

  test('should handle empty signatures', () => {
    const dataWithoutSignatures: Template9Data = {
      ...sampleData,
      comments: {
        classTeacher: {
          text: 'Good work',
          signature: undefined
        },
        headTeacher: {
          text: 'Keep it up',
          signature: undefined
        }
      }
    };
    
    const html = generateTemplate9HTML(dataWithoutSignatures);
    
    expect(html).toContain('Good work');
    expect(html).toContain('Keep it up');
    expect(html).toContain('Signature:');
  });

  test('should use professional typography', () => {
    const html = generateTemplate9HTML(sampleData);
    
    expect(html).toContain("font-family: 'Inter', Arial, 'Times New Roman', sans-serif");
  });

  test('should have fixed watermark positioning', () => {
    const html = generateTemplate9HTML(sampleData);
    
    expect(html).toContain('position: fixed');
    expect(html).toContain('z-index: -1');
    expect(html).toContain('pointer-events: none');
  });

  test('should include metadata grid cells', () => {
    const html = generateTemplate9HTML(sampleData);
    
    expect(html).toContain('NAME');
    expect(html).toContain('STUDENT ID');
    expect(html).toContain('PAYMENT CODE');
    expect(html).toContain('CLASS');
    expect(html).toContain('STREAM');
    expect(html).toContain('SEX');
    expect(html).toContain('OVERALL GROUP');
    expect(html).toContain('LIN');
  });

  test('should have proper padding and margins', () => {
    const html = generateTemplate9HTML(sampleData);
    
    expect(html).toContain('padding: 12mm');
    expect(html).toContain('padding: 20px');
  });
});
