/**
 * Unit Tests for Template 10: Excellent Nursery Clean Template
 */

import { generateTemplate10HTML } from '../generators';
import { getSampleTemplate10Data } from '../sampleData';
import type { Template10Data } from '../types';

describe('Template 10: Excellent Nursery Clean Template', () => {
  const sampleData: Template10Data = getSampleTemplate10Data();

  test('should generate valid HTML document', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html>');
    expect(html).toContain('</html>');
  });

  test('should include black borders (2px solid)', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('2px solid #000000');
  });

  test('should include dark red/maroon summary bar (#8B2323)', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('background-color: #8B2323');
    expect(html).toContain('color: white');
  });

  test('should include school information in header', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('PWEZACORE UGANDA NURSERY SCHOOL');
    expect(html).toContain('P. O. Box, 212 Kampala');
    expect(html).toContain('www.pwezacore.net');
    expect(html).toContain('+256 776960740');
  });

  test('should include italic serif font for school name', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('font-style: italic');
    expect(html).toContain("font-family: 'Times New Roman', Georgia, serif");
  });

  test('should include logo box with border', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('logo-box');
    expect(html).toContain('132px');
  });

  test('should include logo when provided', () => {
    const logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const html = generateTemplate10HTML(sampleData, logoBase64);
    
    expect(html).toContain(logoBase64);
    expect(html).toContain('School Logo');
  });

  test('should include report title bar with italic text', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('report-title-bar');
    expect(html).toContain("LEARNER'S ASSESSMENT REPORT TERM 3, 2024");
    expect(html).toContain('font-style: italic');
  });

  test('should include student information section with 2-column grid (standardized)', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('grid-template-columns: 1fr 1fr');
    expect(html).toContain('SAMPLE STUDENT NAME');
    expect(html).toContain('Baby Class');
    expect(html).toContain('REG001');
  });

  test('should include student attendance information', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('Days Attended:');
    expect(html).toContain('58');
    expect(html).toContain('Days Absent:');
    expect(html).toContain('2');
    expect(html).toContain('Total Days:');
    expect(html).toContain('60');
  });

  test('should include student fees and code', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('Fees Balance:');
    expect(html).toContain('Code:');
    expect(html).toContain('CODE123');
  });

  test('should include student photo with rectangular shape (standardized)', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('student-photo-box');
    expect(html).toContain('2.1cm');
    expect(html).toContain('2.9cm');
  });

  test('should include student photo when provided', () => {
    const photoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const html = generateTemplate10HTML(sampleData, null, photoBase64);
    
    expect(html).toContain('student-photo');
    expect(html).toContain(photoBase64);
  });

  test('should include student photo placeholder when no photo provided', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('student-photo-placeholder');
    expect(html).toContain('STUDENT');
  });

  test('should implement 60/40 split-view layout', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('flex: 0 0 60%');
    expect(html).toContain('flex: 0 0 calc(40% - 15px)');
    expect(html).toContain('display: flex');
  });

  test('should include all 5 learning areas with exact descriptions', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('Taking care of myself for proper growth and development');
    expect(html).toContain('Interacting, exploring, knowing and using my environment');
    expect(html).toContain('Relating with others in an acceptable way.');
    expect(html).toContain('Developing and using my Language appropriately');
    expect(html).toContain('Developing and using Mathematical Concepts');
  });

  test('should include learning area scores and remarks', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('SCORE:');
    expect(html).toContain('85/100');
    expect(html).toContain('Remark:');
    expect(html).toContain('Excellent self-care skills');
  });

  test('should include learning area signatures', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('Signature');
    expect(html).toContain('JD');
  });

  test('should include activities header with black background', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('PERFORMANCE IN ACTIVITIES');
    expect(html).toContain('background-color: #000000');
    expect(html).toContain('color: white');
  });

  test('should implement 2-column activities grid', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('grid-template-columns: 1fr 1fr');
    expect(html).toContain('activities-grid');
  });

  test('should include all 10 activities in correct order', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('WRITING');
    expect(html).toContain('LISTENING');
    expect(html).toContain('READING');
    expect(html).toContain('SPEAKING');
    expect(html).toContain('DRAWING');
    expect(html).toContain('GAMES');
    expect(html).toContain('RHYMES');
    expect(html).toContain('MUSIC');
    expect(html).toContain('HEALTH');
    expect(html).toContain('TOILET');
  });

  test('should format activity values correctly', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('Good');
    expect(html).toContain('Excellent');
    expect(html).toContain('Very Good');
  });

  test('should include summary bar with all fields', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('TOTAL: 500');
    expect(html).toContain('SCORED: 431');
    expect(html).toContain('POSITION: 3 OUT OF 25');
  });

  test('should include 3-row comments section with red borders', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('border: 2px solid #FF0000');
    expect(html).toContain('border-right: 1px solid #FF0000');
    expect(html).toContain('border-bottom: 1px solid #FF0000');
  });

  test('should include class teacher report', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain("Class Teacher's Report");
    expect(html).toContain('An excellent student with great potential.');
    expect(html).toContain('Name: Ms. Jane Doe');
  });

  test('should include behaviors and cleanliness report', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('Behaviors / Cleanliness');
    expect(html).toContain('Very clean and well-behaved.');
    expect(html).toContain('Name: Ms. Mary Johnson');
  });

  test('should include head teacher comment', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain("Head Teacher's Comment");
    expect(html).toContain('Outstanding performance. Keep it up!');
    expect(html).toContain('Name: Mr. John Smith');
  });

  test('should include footer section with date and requirements', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('Date of Issue:');
    expect(html).toContain('15th December 2024');
    expect(html).toContain('Next Term Begins:');
    expect(html).toContain('20th January 2025');
    expect(html).toContain('Requirements:');
    expect(html).toContain('2 exercise books, 1 pencil, 1 eraser');
  });

  test('should include school stamp placeholder (oval/circular)', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('school-stamp');
    expect(html).toContain('border-radius: 50%');
    expect(html).toContain('SCHOOL');
    expect(html).toContain('STAMP');
  });

  test('should include school motto in italic at bottom', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('School Motto:');
    expect(html).toContain('Have to Give');
    expect(html).toContain('font-style: italic');
  });

  test('should have proper table styling with black borders', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('border-collapse: collapse');
    expect(html).toContain('1px solid #000000');
  });

  test('should handle empty signatures', () => {
    const dataWithoutSignatures: Template10Data = {
      ...sampleData,
      learningAreas: sampleData.learningAreas.map(area => ({ ...area, signature: undefined }))
    };
    
    const html = generateTemplate10HTML(dataWithoutSignatures);
    
    expect(html).toContain('Taking care of myself');
    expect(html).toContain('Signature');
  });

  test('should handle boolean activity values', () => {
    const dataWithBooleans: Template10Data = {
      ...sampleData,
      activities: {
        writing: true,
        listening: false,
        reading: true,
        speaking: true,
        drawing: false,
        games: true,
        rhymes: true,
        music: false,
        health: true,
        toilet: true
      }
    };
    
    const html = generateTemplate10HTML(dataWithBooleans);
    
    expect(html).toContain('WRITING');
    expect(html).toContain('LISTENING');
  });

  test('should have proper padding and margins', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('padding: 10mm');
    expect(html).toContain('padding: 15px');
  });

  test('should use standard sans-serif font for data', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain("font-family: Arial, 'Segoe UI', sans-serif");
  });

  test('should have 2-column grid layout for footer', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('grid-template-columns: 2fr 1fr');
    expect(html).toContain('footer-section');
  });

  test('should include all required CSS classes', () => {
    const html = generateTemplate10HTML(sampleData);
    
    expect(html).toContain('report-container');
    expect(html).toContain('header');
    expect(html).toContain('logo-box');
    expect(html).toContain('school-info');
    expect(html).toContain('school-name');
    expect(html).toContain('report-title-bar');
    expect(html).toContain('student-info');
    expect(html).toContain('main-content');
    expect(html).toContain('left-section');
    expect(html).toContain('right-section');
    expect(html).toContain('learning-areas-table');
    expect(html).toContain('activities-header');
    expect(html).toContain('activities-grid');
    expect(html).toContain('summary-bar');
    expect(html).toContain('comments-section');
    expect(html).toContain('footer-section');
    expect(html).toContain('school-motto');
  });
});
