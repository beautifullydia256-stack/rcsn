/**
 * Unit Tests for Template 11: Simple Nursery Template
 */

import { generateTemplate11HTML } from '../generators';
import { getSampleTemplate11Data } from '../sampleData';
import type { Template11Data } from '../types';

describe('Template 11: Simple Nursery Template', () => {
  const sampleData: Template11Data = getSampleTemplate11Data();

  test('should generate valid HTML document', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html>');
    expect(html).toContain('</html>');
  });

  test('should include black borders (2px solid)', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('2px solid #000000');
  });

  test('should include red accent color (#FF0000) for divider', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('background-color: #FF0000');
    expect(html).toContain('header-divider');
  });

  test('should include red borders for comments section (1.5px solid #FF0000)', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('1.5px solid #FF0000');
    expect(html).toContain('comments-section');
  });

  test('should include central watermark with school logo', () => {
    const logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const html = generateTemplate11HTML(sampleData, logoBase64);
    
    expect(html).toContain('watermark');
    expect(html).toContain('opacity: 0.1');
    expect(html).toContain('z-index: -1');
    expect(html).toContain('position: absolute');
    expect(html).toContain('top: 50%');
    expect(html).toContain('left: 50%');
    expect(html).toContain('transform: translate(-50%, -50%)');
  });

  test('should include watermark with 400px dimensions', () => {
    const logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const html = generateTemplate11HTML(sampleData, logoBase64);
    
    expect(html).toContain('width: 400px');
    expect(html).toContain('height: 400px');
  });

  test('should include school information in header', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('PWEZACORE UGANDA NURSERY SCHOOL');
    expect(html).toContain('P. O. Box, 212 Kampala');
    expect(html).toContain('www.pwezacore.net');
    expect(html).toContain('info@pwezacore.net');
    expect(html).toContain('+256 776960740');
  });

  test('should include italic serif font for school name', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('font-style: italic');
    expect(html).toContain("font-family: 'Times New Roman', Georgia, serif");
  });

  test('should include logo box with border', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('logo-box');
    expect(html).toContain('132px');
  });

  test('should include logo when provided', () => {
    const logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const html = generateTemplate11HTML(sampleData, logoBase64);
    
    expect(html).toContain(logoBase64);
    expect(html).toContain('School Logo');
  });

  test('should include report title with italic text', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('report-title');
    expect(html).toContain("LEARNER'S ASSESSMENT REPORT, TERM 3, 2024");
    expect(html).toContain('font-style: italic');
  });

  test('should include student information section with 2-column grid (standardized)', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('grid-template-columns: 1fr 1fr');
    expect(html).toContain('SAMPLE STUDENT NAME');
    expect(html).toContain('Middle Class');
    expect(html).toContain('REG001');
  });

  test('should include student attendance information', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('ATTENDED:');
    expect(html).toContain('58');
    expect(html).toContain('ABSENT:');
    expect(html).toContain('2');
    expect(html).toContain('TOTAL:');
    expect(html).toContain('60');
  });

  test('should include student fees and SchoolPay code', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('Fees Bal:');
    expect(html).toContain('SchoolPay Code:');
    expect(html).toContain('CODE123');
  });

  test('should include student photo with rectangular shape (standardized)', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('student-photo-box');
    expect(html).toContain('2.1cm');
    expect(html).toContain('2.9cm');
  });

  test('should include student photo when provided', () => {
    const photoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const html = generateTemplate11HTML(sampleData, null, photoBase64);
    
    expect(html).toContain('student-photo');
    expect(html).toContain(photoBase64);
  });

  test('should include student photo placeholder when no photo provided', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('student-photo-placeholder');
    expect(html).toContain('STUDENT');
  });

  test('should include activities header with black background and white text', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('PERFORMANCE IN THE LEARNING ACTIVITIES');
    expect(html).toContain('background-color: #000000');
    expect(html).toContain('color: #FFFFFF');
    expect(html).toContain('font-style: italic');
  });

  test('should implement 2-column activities grid (5 rows)', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('grid-template-columns: 1fr 1fr');
    expect(html).toContain('grid-template-rows: repeat(5, 1fr)');
    expect(html).toContain('activities-grid');
  });

  test('should include all 10 activities in correct order', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('WRITING');
    expect(html).toContain('LISTENING');
    expect(html).toContain('READING');
    expect(html).toContain('SPEAKING');
    expect(html).toContain('DRAWING');
    expect(html).toContain('GAMES');
    expect(html).toContain('RHYMES / STORIES');
    expect(html).toContain('MUSIC');
    expect(html).toContain('HEALTH HABITS');
    expect(html).toContain('TOILET HABITS');
  });

  test('should include "ILLUS." label in each activity cell', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('ILLUS.');
    expect(html).toContain('activity-illus');
    // Should appear 10 times (once per activity)
    const matches = html.match(/ILLUS\./g);
    expect(matches).toHaveLength(10);
  });

  test('should include dotted lines for writing in activity cells', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('dotted-line');
    expect(html).toContain('border-bottom: 1px dotted #666');
  });

  test('should include activity comments when provided', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('Good handwriting skills');
    expect(html).toContain('Attentive listener');
    expect(html).toContain('activity-comment');
  });

  test('should include activity ratings when provided', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('Good');
    expect(html).toContain('Excellent');
    expect(html).toContain('Very Good');
    expect(html).toContain('activity-rating');
  });

  test('should include activity cells with min-height and padding', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('min-height: 100px');
    expect(html).toContain('padding: 15px');
    expect(html).toContain('activity-cell');
  });

  test('should include italic text for activity names', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('activity-name');
    expect(html).toContain('font-style: italic');
  });

  test('should include 3-row comments section with red borders', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('border: 1.5px solid #FF0000');
    expect(html).toContain('border-bottom: 1.5px solid #FF0000');
  });

  test('should include class teacher report', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain("Class Teacher's Report");
    expect(html).toContain('An excellent student with great potential.');
  });

  test('should include behaviors and cleanliness report', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('Behaviors / Cleanliness');
    expect(html).toContain('Very clean and well-behaved.');
  });

  test('should include head teacher comment', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('Head Teachers Comment');
    expect(html).toContain('Outstanding performance. Keep it up!');
  });

  test('should include footer section with date and requirements', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('Date of Issue:');
    expect(html).toContain('15th December 2024');
    expect(html).toContain('Next Term Begins:');
    expect(html).toContain('20th January 2025');
    expect(html).toContain('School Requirements:');
    expect(html).toContain('2 exercise books, 1 pencil, 1 eraser');
  });

  test('should include school stamp placeholder (oval/circular)', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('school-stamp');
    expect(html).toContain('border-radius: 50%');
    expect(html).toContain('SCHOOL');
    expect(html).toContain('STAMP');
  });

  test('should include school motto in italic at bottom', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('School Motto:');
    expect(html).toContain('Have to Give');
    expect(html).toContain('font-style: italic');
  });

  test('should have proper table styling with black borders', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('1px solid #000000');
  });

  test('should handle empty comments', () => {
    const dataWithoutComments: Template11Data = {
      ...sampleData,
      comments: {
        classTeacher: { report: '' },
        behaviorsAndCleanliness: { report: '' },
        headTeacher: { comment: '' }
      }
    };
    
    const html = generateTemplate11HTML(dataWithoutComments);
    
    expect(html).toContain("Class Teacher's Report");
    expect(html).toContain('Behaviors / Cleanliness');
    expect(html).toContain('Head Teachers Comment');
  });

  test('should handle activities without comments or ratings', () => {
    const dataWithoutDetails: Template11Data = {
      ...sampleData,
      activities: sampleData.activities.map(activity => ({
        name: activity.name
      }))
    };
    
    const html = generateTemplate11HTML(dataWithoutDetails);
    
    expect(html).toContain('WRITING');
    expect(html).toContain('LISTENING');
    expect(html).toContain('dotted-line');
  });

  test('should have proper padding and margins', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('padding: 10mm');
    expect(html).toContain('padding: 15px');
  });

  test('should use standard sans-serif font for data', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain("font-family: Arial, 'Segoe UI', sans-serif");
  });

  test('should have 2-column grid layout for footer', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('grid-template-columns: 2fr 1fr');
    expect(html).toContain('footer-section');
  });

  test('should include all required CSS classes', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('watermark');
    expect(html).toContain('report-container');
    expect(html).toContain('header');
    expect(html).toContain('logo-box');
    expect(html).toContain('school-info');
    expect(html).toContain('school-name');
    expect(html).toContain('header-divider');
    expect(html).toContain('report-title');
    expect(html).toContain('student-info');
    expect(html).toContain('activities-header');
    expect(html).toContain('activities-grid');
    expect(html).toContain('activity-cell');
    expect(html).toContain('activity-header');
    expect(html).toContain('activity-name');
    expect(html).toContain('activity-illus');
    expect(html).toContain('activity-content');
    expect(html).toContain('activity-lines');
    expect(html).toContain('dotted-line');
    expect(html).toContain('comments-section');
    expect(html).toContain('comment-row');
    expect(html).toContain('comment-label');
    expect(html).toContain('comment-text');
    expect(html).toContain('footer-section');
    expect(html).toContain('school-motto');
  });

  test('should render watermark only when logo is provided', () => {
    const htmlWithoutLogo = generateTemplate11HTML(sampleData);
    const logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const htmlWithLogo = generateTemplate11HTML(sampleData, logoBase64);
    
    expect(htmlWithoutLogo).not.toContain('class="watermark"');
    expect(htmlWithLogo).toContain('class="watermark"');
  });

  test('should include red horizontal divider after header', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('header-divider');
    expect(html).toContain('height: 2px');
    expect(html).toContain('background-color: #FF0000');
  });

  test('should have comment rows with min-height', () => {
    const html = generateTemplate11HTML(sampleData);
    
    expect(html).toContain('min-height: 60px');
    expect(html).toContain('comment-row');
  });

  test('should include pointer-events: none on watermark', () => {
    const logoBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const html = generateTemplate11HTML(sampleData, logoBase64);
    
    expect(html).toContain('pointer-events: none');
  });
});
