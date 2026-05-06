/**
 * Unit Tests for Template 12: Modern Nursery Template
 */

import { generateTemplate12HTML } from '../generators';
import { getSampleTemplate12Data } from '../sampleData';
import type { Template12Data } from '../types';

describe('Template 12: Modern Nursery Template', () => {
  const sampleData: Template12Data = getSampleTemplate12Data();

  test('should generate valid HTML document', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html>');
    expect(html).toContain('</html>');
  });

  test('should include black borders (2px solid)', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('2px solid #000000');
  });

  test('should include orange horizontal divider (#FF8C00)', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('background-color: #FF8C00');
    expect(html).toContain('header-divider');
    expect(html).toContain('height: 2px');
  });

  test('should include dark purple/brown summary bar (#6B4C93)', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('background-color: #6B4C93');
    expect(html).toContain('summary-bar');
    expect(html).toContain('color: white');
  });

  test('should include red-bordered comments section (2px solid #FF0000)', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('2px solid #FF0000');
    expect(html).toContain('comments-section');
  });

  test('should use modern sans-serif font (Segoe UI/Verdana)', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain("font-family: 'Segoe UI', Verdana, sans-serif");
  });

  test('should use monospace font for achievement scores', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain("font-family: 'Courier New', monospace");
  });

  test('should include school information in header', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('PWEZACORE UGANDA NURSERY SCHOOL');
    expect(html).toContain('P. O. Box, 212 Kampala');
    expect(html).toContain('www.pwezacore.net');
    expect(html).toContain('info@pwezacore.net');
    expect(html).toContain('+256 776960740');
  });

  test('should include school name in uppercase and bold', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('text-transform: uppercase');
    expect(html).toContain('font-weight: bold');
    expect(html).toContain('font-size: 18pt');
    expect(html).toContain('school-name');
  });

  test('should include logo box with border', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('logo-box');
    expect(html).toContain('80px');
  });

  test('should include logo when provided', () => {
    const logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const html = generateTemplate12HTML(sampleData, logoBase64);
    
    expect(html).toContain(logoBase64);
    expect(html).toContain('School Logo');
  });

  test('should include report title in bordered box', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('report-title');
    expect(html).toContain("LEARNER'S ASSESSMENT REPORT, TERM 3, 2024");
    expect(html).toContain('border: 2px solid #000000');
  });

  test('should include student information section with 3-column grid', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('grid-template-columns: 1fr 1fr 150px');
    expect(html).toContain('SAMPLE STUDENT NAME');
    expect(html).toContain('Top Class');
    expect(html).toContain('REG001');
  });

  test('should include student attendance information', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('ATTENDED:');
    expect(html).toContain('58');
    expect(html).toContain('ABSENT:');
    expect(html).toContain('2');
    expect(html).toContain('TOTAL:');
    expect(html).toContain('60');
  });

  test('should include student fees and SchoolPay code', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('Fees Bal:');
    expect(html).toContain('SchoolPay Code:');
    expect(html).toContain('CODE123');
  });

  test('should include student photo with rounded corners', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('student-photo-box');
    expect(html).toContain('border-radius: 10px');
  });

  test('should include student photo when provided', () => {
    const photoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const html = generateTemplate12HTML(sampleData, null, photoBase64);
    
    expect(html).toContain('student-photo');
    expect(html).toContain(photoBase64);
  });

  test('should include student photo placeholder when no photo provided', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('student-photo-placeholder');
    expect(html).toContain('STUDENT');
  });

  test('should include achievement scores header', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('Achievement Scores in the 5 Learning Areas');
    expect(html).toContain('achievement-scores-header');
    expect(html).toContain('font-size: 12pt');
    expect(html).toContain('font-weight: bold');
  });

  test('should implement 5-column achievement scores table', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('achievement-table');
    expect(html).toContain('AREA');
    expect(html).toContain('ACHIEVEMENT SCORE');
    expect(html).toContain('POSITION');
    expect(html).toContain('COMMENTS');
    expect(html).toContain('SIGNATURE');
  });

  test('should include all 5 learning areas with correct descriptions', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('Learning Area 1: Taking care of myself for proper growth and development');
    expect(html).toContain('Learning Area 2: Interacting, exploring, knowing and using my environment');
    expect(html).toContain('Learning Area 3: Relating with others in an acceptable way.');
    expect(html).toContain('Learning Area 4: Developing and using my Language appropriately');
    expect(html).toContain('Learning Area 5: Developing and using Mathematical Concepts in my day-to-day');
  });

  test('should display achievement scores in /100 format', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('85/100');
    expect(html).toContain('88/100');
    expect(html).toContain('90/100');
    expect(html).toContain('82/100');
    expect(html).toContain('86/100');
  });

  test('should format ordinal rankings correctly (1st, 2nd, 3rd)', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('1st');
    expect(html).toContain('2nd');
    expect(html).toContain('3rd');
  });

  test('should include learning area comments', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('Excellent self-care skills');
    expect(html).toContain('Very curious and engaged');
    expect(html).toContain('Outstanding social skills');
    expect(html).toContain('Good language development');
    expect(html).toContain('Excellent numeracy skills');
  });

  test('should include signature column for each learning area', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('signature-column');
    expect(html).toContain('width: 10%');
  });

  test('should include summary bar with total, scored, and position', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('TOTAL: 500');
    expect(html).toContain('SCORED: 431');
    expect(html).toContain('POSITION: 3rd OUT OF 25');
  });

  test('should include summary bar with dark purple background', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('summary-bar');
    expect(html).toContain('background-color: #6B4C93');
    expect(html).toContain('color: white');
    expect(html).toContain('font-weight: bold');
    expect(html).toContain('font-size: 14pt');
  });

  test('should include 3-row comments section with red borders', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('border: 2px solid #FF0000');
    expect(html).toContain('border-bottom: 2px solid #FF0000');
  });

  test('should include class teacher report', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain("Class Teacher's Report");
    expect(html).toContain('An excellent student with great potential.');
  });

  test('should include behaviors and cleanliness report', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('Behaviors / Cleanliness');
    expect(html).toContain('Very clean and well-behaved.');
  });

  test('should include head teacher comment', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('Head Teachers Comment');
    expect(html).toContain('Outstanding performance. Keep it up!');
  });

  test('should include footer section with date and requirements', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('Date of Issue:');
    expect(html).toContain('15th December 2024');
    expect(html).toContain('Next Term Begins:');
    expect(html).toContain('20th January 2025');
    expect(html).toContain('School Requirements:');
    expect(html).toContain('2 exercise books, 1 pencil, 1 eraser');
  });

  test('should include school stamp placeholder (circular)', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('school-stamp');
    expect(html).toContain('border-radius: 50%');
    expect(html).toContain('SCHOOL');
    expect(html).toContain('STAMP');
  });

  test('should include school motto in italic at bottom', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('School Motto:');
    expect(html).toContain('Have to Give');
    expect(html).toContain('font-style: italic');
  });

  test('should have proper column widths for achievement table', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('width: 40%'); // AREA column
    expect(html).toContain('width: 15%'); // ACHIEVEMENT SCORE column
    expect(html).toContain('width: 12%'); // POSITION column
    expect(html).toContain('width: 23%'); // COMMENTS column
    expect(html).toContain('width: 10%'); // SIGNATURE column
  });

  test('should have vertically top-aligned comment cells', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('vertical-align: top');
    expect(html).toContain('min-height: 80px');
  });

  test('should handle empty comments', () => {
    const dataWithoutComments: Template12Data = {
      ...sampleData,
      comments: {
        classTeacher: { report: '' },
        behaviorsAndCleanliness: { report: '' },
        headTeacher: { comment: '' }
      }
    };
    
    const html = generateTemplate12HTML(dataWithoutComments);
    
    expect(html).toContain("Class Teacher's Report");
    expect(html).toContain('Behaviors / Cleanliness');
    expect(html).toContain('Head Teachers Comment');
  });

  test('should handle learning areas without signatures', () => {
    const dataWithoutSignatures: Template12Data = {
      ...sampleData,
      learningAreas: sampleData.learningAreas.map(area => ({
        ...area,
        signature: undefined
      }))
    };
    
    const html = generateTemplate12HTML(dataWithoutSignatures);
    
    expect(html).toContain('Learning Area 1');
    expect(html).toContain('SIGNATURE');
  });

  test('should have proper padding and margins', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('padding: 10mm');
    expect(html).toContain('padding: 15px');
  });

  test('should have 2-column grid layout for footer', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('grid-template-columns: 2fr 1fr');
    expect(html).toContain('footer-section');
  });

  test('should include all required CSS classes', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('report-container');
    expect(html).toContain('header');
    expect(html).toContain('logo-box');
    expect(html).toContain('school-info');
    expect(html).toContain('school-name');
    expect(html).toContain('header-divider');
    expect(html).toContain('report-title');
    expect(html).toContain('student-info');
    expect(html).toContain('achievement-scores-header');
    expect(html).toContain('achievement-table');
    expect(html).toContain('summary-bar');
    expect(html).toContain('comments-section');
    expect(html).toContain('comment-row');
    expect(html).toContain('comment-label');
    expect(html).toContain('comment-text');
    expect(html).toContain('footer-section');
    expect(html).toContain('school-motto');
  });

  test('should format ordinal rankings for edge cases', () => {
    const dataWithEdgeCases: Template12Data = {
      ...sampleData,
      learningAreas: [
        { ...sampleData.learningAreas[0], position: 11 },
        { ...sampleData.learningAreas[1], position: 12 },
        { ...sampleData.learningAreas[2], position: 13 },
        { ...sampleData.learningAreas[3], position: 21 },
        { ...sampleData.learningAreas[4], position: 22 }
      ],
      summary: { ...sampleData.summary, position: 11 }
    };
    
    const html = generateTemplate12HTML(dataWithEdgeCases);
    
    expect(html).toContain('11th');
    expect(html).toContain('12th');
    expect(html).toContain('13th');
    expect(html).toContain('21st');
    expect(html).toContain('22nd');
  });

  test('should handle string positions without formatting', () => {
    const dataWithStringPosition: Template12Data = {
      ...sampleData,
      learningAreas: [
        { ...sampleData.learningAreas[0], position: 'N/A' },
        ...sampleData.learningAreas.slice(1)
      ],
      summary: { ...sampleData.summary, position: 'N/A' }
    };
    
    const html = generateTemplate12HTML(dataWithStringPosition);
    
    expect(html).toContain('N/A');
  });

  test('should include orange divider after header', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('header-divider');
    expect(html).toContain('height: 2px');
    expect(html).toContain('background-color: #FF8C00');
    expect(html).toContain('margin: 10px 0');
  });

  test('should have comment rows with min-height', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('min-height: 80px');
    expect(html).toContain('comment-row');
  });

  test('should center achievement scores and positions', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('text-align: center');
  });

  test('should left-align learning area descriptions and comments', () => {
    const html = generateTemplate12HTML(sampleData);
    
    expect(html).toContain('text-align: left');
  });
});
