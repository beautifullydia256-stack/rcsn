/**
 * Unit Tests for Template 8: Detail Colour Marks Report Template
 */

import { generateTemplate8HTML } from '../generators';
import type { Template8Data } from '../types';

describe('Template 8: Detail Colour Marks Report Template', () => {
  const sampleData: Template8Data = {
    school: {
      name: 'RAKAI INFANT AND PRIMARY SCHOOL',
      address: 'P. O. BOX 7, RAKAI',
      phone: '0783124136 / 0706779395'
    },
    student: {
      name: 'Jane Smith',
      class: 'Middle Class',
      year: '2024',
      term: 'Term 1',
      age: '5 years',
      date: '15/12/2024',
      linNo: 'LIN12345'
    },
    skillsAssessment: [
      // Row 1
      { skill: 'Toilet', status: 'Very Good' },
      { skill: 'Recognition of numbers', status: 'Good' },
      { skill: 'Property care', status: 'Very Good' },
      { skill: 'Handling of pencil', status: 'Good' },
      { skill: 'Re-sighting Alphabet', status: 'Tries' },
      { skill: 'Attention span', status: 'Good' },
      { skill: 'Punctuality', status: 'Very Good' },
      { skill: 'Shading', status: 'Good' },
      // Row 2
      { skill: 'Nose care', status: 'Very Good' },
      { skill: 'Recognition of shapes', status: 'Good' },
      { skill: 'Respect', status: 'Very Good' },
      { skill: 'Arrival time', status: 'Good' },
      { skill: 'Counting number sequence', status: 'Tries' },
      { skill: 'Re-sighting Poems', status: 'Good' },
      { skill: 'Love or Interest', status: 'Promising' },
      { skill: 'Drawing', status: 'Good' },
      // Row 3
      { skill: 'Recognition of letters', status: 'Good' },
      { skill: 'Sharing', status: 'Very Good' },
      { skill: 'Friendship', status: 'Very Good' },
      { skill: 'Colours', status: 'Good' },
      { skill: 'Playing', status: 'Very Good' },
      { skill: 'Emotional', status: 'Good' },
      { skill: 'Smartness', status: 'Very Good' }
    ],
    subjects: [
      {
        name: 'Social Development 1',
        midTerm: 'A',
        endOfTerm: 'A',
        outOf: 100,
        teacherRemarks: 'Excellent progress in all areas. Shows great enthusiasm and dedication.',
        signature: 'JD'
      },
      {
        name: 'Language Development 1',
        midTerm: 'B',
        endOfTerm: 'A',
        outOf: 100
      },
      {
        name: 'Health Habits',
        midTerm: 'A',
        endOfTerm: 'A',
        outOf: 100
      },
      {
        name: 'Mathematical Concept',
        midTerm: 'B',
        endOfTerm: 'B',
        outOf: 100
      },
      {
        name: 'Language Development II',
        midTerm: 'A',
        endOfTerm: 'A',
        outOf: 100
      },
      {
        name: 'Writing',
        midTerm: 'B',
        endOfTerm: 'A',
        outOf: 100
      },
      {
        name: 'TOTAL',
        midTerm: '520',
        endOfTerm: '560',
        outOf: 600
      }
    ],
    total: 560,
    comments: {
      classTeacher: {
        text: 'A wonderful student with great potential. Shows excellent progress.',
        signature: 'Ms. Jane Doe'
      },
      headteacher: {
        text: 'Keep up the excellent work!',
        signature: 'Mr. John Smith'
      }
    },
    termDates: {
      nextTermBegins: '20th January 2025',
      endsOn: '15th April 2025'
    },
    requirements: {
      boarding: [
        'Mattress',
        'Bedsheets (2)',
        'Blankets (2)',
        'Mosquito net',
        'Toiletries (soap, toothbrush, toothpaste)',
        'Towels (2)',
        'Uniform (3 sets)',
        'Casual clothes'
      ],
      day: [
        'School fees: UGX 500,000',
        '2 exercise books',
        '1 pencil',
        '1 eraser',
        '1 ruler',
        'Crayons',
        'Water bottle',
        'Lunch box'
      ]
    }
  };

  test('should generate valid HTML document', () => {
    const html = generateTemplate8HTML(sampleData);
    
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<html>');
    expect(html).toContain('</html>');
  });

  test('should include simple single border (2px solid black)', () => {
    const html = generateTemplate8HTML(sampleData);
    
    expect(html).toContain('2px solid #000000');
  });

  test('should include school information', () => {
    const html = generateTemplate8HTML(sampleData);
    
    expect(html).toContain('RAKAI INFANT AND PRIMARY SCHOOL');
    expect(html).toContain('P. O. BOX 7, RAKAI');
    expect(html).toContain('0783124136 / 0706779395');
  });

  test('should include report title', () => {
    const html = generateTemplate8HTML(sampleData);
    
    expect(html).toContain('TERMINAL PROGRESSIVE REPORT FOR NURSERY');
  });

  test('should include student information', () => {
    const html = generateTemplate8HTML(sampleData);
    
    expect(html).toContain('Jane Smith');
    expect(html).toContain('Middle Class');
    expect(html).toContain('2024');
    expect(html).toContain('Term 1');
    expect(html).toContain('5 years');
    expect(html).toContain('15/12/2024');
    expect(html).toContain('LIN12345');
  });

  test('should include student name in blue color', () => {
    const html = generateTemplate8HTML(sampleData);
    
    expect(html).toContain('#0000FF'); // Blue color for student name value
  });

  test('should include skills grid with 3 rows × 8 columns', () => {
    const html = generateTemplate8HTML(sampleData);
    
    // Check for skills grid table
    expect(html).toContain('skills-grid');
    expect(html).toContain('table-layout: fixed');
    
    // Check for specific skills from each row
    expect(html).toContain('Toilet');
    expect(html).toContain('Recognition of numbers');
    expect(html).toContain('Shading');
    expect(html).toContain('Nose care');
    expect(html).toContain('Drawing');
    expect(html).toContain('Recognition of letters');
    expect(html).toContain('Smartness');
  });

  test('should use 8pt font for skills grid', () => {
    const html = generateTemplate8HTML(sampleData);
    
    expect(html).toContain('font-size: 8pt');
  });

  test('should include color-coded skill assessment boxes', () => {
    const html = generateTemplate8HTML(sampleData);
    
    // Check for color codes
    expect(html).toContain('#00FF00'); // Very Good - Bright green
    expect(html).toContain('#90EE90'); // Good - Light green
    expect(html).toContain('#FFFF00'); // Tries - Yellow
    expect(html).toContain('#FFA500'); // Fair - Orange
    expect(html).toContain('#FF0000'); // Still a Problem - Red
    expect(html).toContain('#87CEEB'); // Promising - Sky blue
  });

  test('should include legend/key section with all status labels', () => {
    const html = generateTemplate8HTML(sampleData);
    
    expect(html).toContain('Very Good:');
    expect(html).toContain('Good:');
    expect(html).toContain('Tries:');
    expect(html).toContain('Fair:');
    expect(html).toContain('Still a Problem:');
    expect(html).toContain('Promising:');
  });

  test('should include academic assessment table headers', () => {
    const html = generateTemplate8HTML(sampleData);
    
    expect(html).toContain('Subject');
    expect(html).toContain('Mid Term');
    expect(html).toContain('End of Term');
    expect(html).toContain('Out of');
    expect(html).toContain("Teacher's Remarks");
    expect(html).toContain('Signature');
  });

  test('should include all subjects with data', () => {
    const html = generateTemplate8HTML(sampleData);
    
    expect(html).toContain('Social Development 1');
    expect(html).toContain('Language Development 1');
    expect(html).toContain('Health Habits');
    expect(html).toContain('Mathematical Concept');
    expect(html).toContain('Language Development II');
    expect(html).toContain('Writing');
  });

  test('should implement rowspan for Teacher\'s Remarks and Signature columns', () => {
    const html = generateTemplate8HTML(sampleData);
    
    expect(html).toContain('rowspan="6"');
    expect(html).toContain('Excellent progress in all areas. Shows great enthusiasm and dedication.');
  });

  test('should include TOTAL row separately from rowspan', () => {
    const html = generateTemplate8HTML(sampleData);
    
    expect(html).toContain('TOTAL');
    expect(html).toContain('520');
    expect(html).toContain('560');
    expect(html).toContain('600');
  });

  test('should include class teacher comment with blue text', () => {
    const html = generateTemplate8HTML(sampleData);
    
    expect(html).toContain("Class Teacher's Comment:");
    expect(html).toContain('A wonderful student with great potential. Shows excellent progress.');
    expect(html).toContain('class-teacher-value');
    expect(html).toContain('Ms. Jane Doe');
  });

  test('should include headteacher comment', () => {
    const html = generateTemplate8HTML(sampleData);
    
    expect(html).toContain("Headteacher's Comment:");
    expect(html).toContain('Keep up the excellent work!');
    expect(html).toContain('Mr. John Smith');
  });

  test('should include term dates', () => {
    const html = generateTemplate8HTML(sampleData);
    
    expect(html).toContain('Next term begins on: 20th January 2025');
    expect(html).toContain('Ends on: 15th April 2025');
  });

  test('should include two-column requirements section', () => {
    const html = generateTemplate8HTML(sampleData);
    
    expect(html).toContain('BOARDING REQUIREMENTS');
    expect(html).toContain('DAY REQUIREMENTS');
    expect(html).toContain('display: grid');
    expect(html).toContain('grid-template-columns: 1fr 1fr');
  });

  test('should include boarding requirements list', () => {
    const html = generateTemplate8HTML(sampleData);
    
    expect(html).toContain('Mattress');
    expect(html).toContain('Bedsheets (2)');
    expect(html).toContain('Mosquito net');
    expect(html).toContain('Uniform (3 sets)');
  });

  test('should include day requirements list', () => {
    const html = generateTemplate8HTML(sampleData);
    
    expect(html).toContain('School fees: UGX 500,000');
    expect(html).toContain('2 exercise books');
    expect(html).toContain('Water bottle');
    expect(html).toContain('Lunch box');
  });

  test('should use 8.5-9pt font for requirements section', () => {
    const html = generateTemplate8HTML(sampleData);
    
    expect(html).toContain('font-size: 8.5pt');
  });

  test('should handle optional logo', () => {
    const dataWithLogo: Template8Data = {
      ...sampleData,
      school: {
        ...sampleData.school,
        logo: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
      }
    };
    
    const html = generateTemplate8HTML(dataWithLogo, dataWithLogo.school.logo);
    
    expect(html).toContain('logo-box');
    expect(html).toContain('data:image/png;base64');
  });

  test('should handle optional linNo', () => {
    const dataWithoutLinNo: Template8Data = {
      ...sampleData,
      student: {
        ...sampleData.student,
        linNo: undefined
      }
    };
    
    const html = generateTemplate8HTML(dataWithoutLinNo);
    
    expect(html).toContain('LIN NO:');
    expect(html).toContain('Jane Smith');
  });

  test('should handle null skill status', () => {
    const dataWithNullStatus: Template8Data = {
      ...sampleData,
      skillsAssessment: [
        { skill: 'Toilet', status: null },
        { skill: 'Recognition of numbers', status: 'Good' },
        ...sampleData.skillsAssessment.slice(2)
      ]
    };
    
    const html = generateTemplate8HTML(dataWithNullStatus);
    
    expect(html).toContain('Toilet');
    expect(html).toContain('#FFFFFF'); // White background for null status
  });

  test('should preserve exact skill order in grid', () => {
    const html = generateTemplate8HTML(sampleData);
    
    // Check that skills appear in the correct order
    const toiletIndex = html.indexOf('Toilet');
    const recognitionIndex = html.indexOf('Recognition of numbers');
    const shadingIndex = html.indexOf('Shading');
    const noseIndex = html.indexOf('Nose care');
    const drawingIndex = html.indexOf('Drawing');
    
    expect(toiletIndex).toBeLessThan(recognitionIndex);
    expect(recognitionIndex).toBeLessThan(shadingIndex);
    expect(shadingIndex).toBeLessThan(noseIndex);
    expect(noseIndex).toBeLessThan(drawingIndex);
  });

  test('should have proper CSS for equal column widths in skills grid', () => {
    const html = generateTemplate8HTML(sampleData);
    
    expect(html).toContain('width: 12.5%'); // 100% / 8 columns = 12.5%
  });

  test('should include flexbox layout for legend', () => {
    const html = generateTemplate8HTML(sampleData);
    
    expect(html).toContain('display: flex');
    expect(html).toContain('justify-content: space-around');
  });

  test('should handle empty endOfTerm values', () => {
    const dataWithEmptyEndOfTerm: Template8Data = {
      ...sampleData,
      subjects: sampleData.subjects.map((s, i) => 
        i === 1 ? { ...s, endOfTerm: undefined } : s
      )
    };
    
    const html = generateTemplate8HTML(dataWithEmptyEndOfTerm);
    
    expect(html).toContain('Language Development 1');
    expect(html).toContain('End of Term');
  });
});
