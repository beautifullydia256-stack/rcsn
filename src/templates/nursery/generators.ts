/**
 * HTML Generator Functions for Nursery Report Templates
 * 
 * This file contains the HTML generation functions for all 6 nursery templates (Templates 7-12).
 * Each function generates a complete HTML document with embedded CSS for PDF generation.
 */

import type {
  Template7Data,
  Template8Data,
  Template9Data,
  Template10Data,
  Template11Data,
  Template12Data
} from './types';

// ============================================================================
// TEMPLATE 7: Junior Nursery Report Template
// ============================================================================

export function generateTemplate7HTML(
  reportData: Template7Data,
  schoolLogoBase64?: string | null,
  studentPhotoBase64?: string | null
): string {
  const { school, student, subjects, total, comments, requirements, termDates } = reportData;

  const subjectsRows = subjects.map(subject => `
    <tr>
      <td style="padding: 8px; border: 1px solid #006b4d; text-align: left;">${subject.name}</td>
      <td style="padding: 8px; border: 1px solid #006b4d; text-align: center;">${subject.marksObtained}</td>
      <td style="padding: 8px; border: 1px solid #006b4d; text-align: center;">${subject.aggGrade}</td>
      <td style="padding: 8px; border: 1px solid #006b4d; text-align: left;">${subject.remarks}</td>
      <td style="padding: 8px; border: 1px solid #006b4d; text-align: center;">${subject.initials || ''}</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, 'Segoe UI', sans-serif;
      padding: 10mm;
      color: #000000;
    }
    
    .report-container {
      border: 4px double #006b4d;
      padding: 15px;
      max-width: 210mm;
      margin: 0 auto;
    }
    
    /* Header Section - EXACT copy from Template 3 structure */
    .header {
      display: flex;
      align-items: center;
      min-height: 2.1cm;
      position: relative;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #006b4d;
    }
    
    .logo-box {
      width: 132px;
      height: 132px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      left: 0;
      margin-left: 0;
      flex-shrink: 0;
    }
    
    .logo {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    
    .school-info {
      flex: 1;
      text-align: center;
      margin-left: 132px;
      padding-left: 0.3cm;
    }
    
    .school-name {
      font-size: 20pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #006b4d;
      margin-bottom: 8px;
      letter-spacing: 0.04em;
      line-height: 1.06;
    }
    
    .school-address {
      font-size: 11pt;
      margin-bottom: 4px;
      font-weight: 600;
      color: #006b4d;
      line-height: 1.32;
    }
    
    .report-title {
      font-size: 14pt;
      font-weight: bold;
      text-decoration: underline;
      letter-spacing: 0.1em;
      margin-top: 10px;
      color: #006b4d;
    }
    
    /* Student Information Section - EXACT copy from Template 3 structure */
    .student-info {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 6px 10px;
      border: 1px solid #006b4d;
      border-radius: 8px;
      margin-bottom: 15px;
      background: #f8fafc;
      min-height: 28mm;
      font-size: 11pt;
      line-height: 1.3;
    }
    
    .student-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 10px;
      row-gap: 4px;
      font-size: 11pt;
      flex: 1;
    }
    
    .info-label {
      font-weight: bold;
      color: #006b4d;
    }
    
    .student-photo-box {
      width: 2.1cm;
      height: 2.9cm;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }
    
    .student-photo {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .student-photo-placeholder {
      font-size: 8pt;
      color: #94a3b8;
      text-align: center;
    }
    
    .assessment-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    .assessment-table th {
      background-color: #f0f8f5;
      padding: 10px 8px;
      border: 1px solid #006b4d;
      font-weight: bold;
      text-align: center;
      font-size: 10pt;
    }
    
    .assessment-table td {
      font-size: 10pt;
    }
    
    .total-row {
      font-weight: bold;
      background-color: #f0f8f5;
    }
    
    .comments-section {
      margin: 20px 0;
    }
    
    .comment-box {
      margin-bottom: 15px;
    }
    
    .comment-label {
      font-weight: bold;
      font-size: 11pt;
      margin-bottom: 5px;
    }
    
    .comment-text {
      border-bottom: 1px dotted #006b4d;
      min-height: 60px;
      padding: 10px 0;
      font-size: 10pt;
    }
    
    .signature-line {
      border-bottom: 1px dotted #006b4d;
      width: 200px;
      margin-top: 10px;
      padding-top: 5px;
    }
    
    .headteacher-comment .comment-text {
      color: #FF0000;
    }
    
    .requirements {
      font-size: 9pt;
      margin: 15px 0;
      padding: 10px;
      background-color: #f9f9f9;
    }
    
    /* Grading Scale Table */
    .grading-scale {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    .grading-scale td {
      padding: 6px;
      border: 1px solid #006b4d;
      text-align: center;
      font-size: 9pt;
    }
    
    .grading-scale .scale-label {
      font-weight: bold;
      background-color: #f0f8f5;
      width: 15%;
    }
    
    .grading-scale .grade-cell {
      font-weight: bold;
    }
    
    .footer {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
      font-size: 10pt;
      font-weight: bold;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Header with Logo - EXACT structure from Template 3 -->
    <div class="header">
      <div class="logo-box">
        ${schoolLogoBase64 
          ? `<img src="${schoolLogoBase64}" alt="School Logo" class="logo" />`
          : '<span style="font-size: 8pt; color: #666;">School<br/>Logo</span>'
        }
      </div>
      <div class="school-info">
        <div class="school-name">${school.name}</div>
        <div class="school-address">${school.address}</div>
        <div class="school-address">Tel: ${school.phone}</div>
        <div class="report-title">NURSERY REPORT FORM</div>
      </div>
    </div>
    
    <!-- Student Information - EXACT structure from Template 3 -->
    <div class="student-info">
      <div class="student-info-grid">
        <div>
          <span class="info-label">Pupil's name:</span> ${student.name}
        </div>
        <div>
          <span class="info-label">Class:</span> ${student.class}
        </div>
        <div>
          <span class="info-label">Age:</span> ${student.age}
        </div>
        <div>
          <span class="info-label">Admission No:</span> ${student.admissionNo || 'N/A'}
        </div>
        <div>
          <span class="info-label">Term:</span> ${student.term} / ${student.year}
        </div>
        <div>
          <span class="info-label">Payment Code:</span> ${student.paymentCode || 'N/A'}
        </div>
        ${student.position ? `
        <div>
          <span class="info-label">Position:</span> ${student.position} / ${student.outOf || ''}
        </div>
        ` : '<div></div>'}
        <div></div>
      </div>
      <div class="student-photo-box">
        ${studentPhotoBase64
          ? `<img src="${studentPhotoBase64}" alt="Student Photo" class="student-photo" />`
          : '<span class="student-photo-placeholder">Photo</span>'
        }
      </div>
    </div>
    
    <table class="assessment-table">
      <thead>
        <tr>
          <th style="width: 35%; text-align: left;">SUBJECT</th>
          <th style="width: 15%;">EXAM MARKS OBTAINED OUT OF 100</th>
          <th style="width: 10%;">AGG. GRADE</th>
          <th style="width: 30%; text-align: left;">REMARKS</th>
          <th style="width: 10%;">INITIALS</th>
        </tr>
      </thead>
      <tbody>
        ${subjectsRows}
        <tr class="total-row">
          <td style="padding: 8px; border: 1px solid #006b4d; text-align: left;">TOTAL</td>
          <td style="padding: 8px; border: 1px solid #006b4d; text-align: center;" colspan="4">${total}</td>
        </tr>
      </tbody>
    </table>
    
    <div class="comments-section">
      <div class="comment-box">
        <div class="comment-label">Class Teacher's Report:</div>
        <div class="comment-text">${comments.classTeacher.text}</div>
        <div class="signature-line">Signature: ${comments.classTeacher.signature || ''}</div>
      </div>
      
      <div class="comment-box headteacher-comment">
        <div class="comment-label">Headteacher's Report:</div>
        <div class="comment-text">${comments.headteacher.text}</div>
        <div class="signature-line">Signature: ${comments.headteacher.signature || ''}</div>
      </div>
    </div>
    
    <div class="requirements">
      ${requirements}
    </div>
    
    <!-- Grading Scale Table -->
    <table class="grading-scale">
      <tbody>
        <tr>
          <td class="scale-label">RANGE</td>
          <td>0.0 - 19.9</td>
          <td>20.0 - 39.9</td>
          <td>40.0 - 69.9</td>
          <td>70.0 - 89.9</td>
          <td>90.0 - 100.0</td>
        </tr>
        <tr>
          <td class="scale-label">GRADE</td>
          <td class="grade-cell">E</td>
          <td class="grade-cell">D</td>
          <td class="grade-cell">C</td>
          <td class="grade-cell">B</td>
          <td class="grade-cell">A</td>
        </tr>
      </tbody>
    </table>
    
    <div class="footer">
      <div>End of term: ${termDates.endDate}</div>
      <div>Next term begins on: ${termDates.nextTermBegins}</div>
    </div>
  </div>
</body>
</html>
  `;
}

// ============================================================================
// TEMPLATE 8: Detail Colour Marks Report Template
// ============================================================================

export function generateTemplate8HTML(
  reportData: Template8Data,
  schoolLogoBase64?: string | null
): string {
  const { school, student, skillsAssessment, subjects, total, comments, termDates, requirements } = reportData;

  // Helper function to get color for skill status
  const getStatusColor = (status: string | null): string => {
    const colorMap: Record<string, string> = {
      'Very Good': '#00FF00',      // Bright green
      'Good': '#90EE90',           // Light green
      'Tries': '#FFFF00',          // Yellow
      'Fair': '#FFA500',           // Orange
      'Still a Problem': '#FF0000', // Red
      'Promising': '#87CEEB'       // Sky blue
    };
    return status ? colorMap[status] || '#FFFFFF' : '#FFFFFF';
  };

  // Define the exact skills grid layout (3 rows × 8 columns)
  const skillsGrid = [
    ['Toilet', 'Recognition of numbers', 'Property care', 'Handling of pencil', 'Re-sighting Alphabet', 'Attention span', 'Punctuality', 'Shading'],
    ['Nose care', 'Recognition of shapes', 'Respect', 'Arrival time', 'Counting number sequence', 'Re-sighting Poems', 'Love or Interest', 'Drawing'],
    ['Recognition of letters', 'Sharing', 'Friendship', 'Colours', 'Playing', 'Emotional', 'Smartness', '']
  ];

  // Create skills grid HTML
  const skillsGridHTML = skillsGrid.map(row => {
    const cells = row.map(skill => {
      if (!skill) return '<td style="padding: 6px; border: 1px solid #000000; text-align: center; font-size: 8pt;"></td>';
      
      const skillData = skillsAssessment.find(s => s.skill === skill);
      const bgColor = skillData ? getStatusColor(skillData.status) : '#FFFFFF';
      
      return `<td style="padding: 6px; border: 1px solid #000000; text-align: center; font-size: 8pt; background-color: ${bgColor};">${skill}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('');

  // Find the first subject with teacher remarks and signature for rowspan
  const firstSubjectWithRemarks = subjects.find(s => s.teacherRemarks || s.signature);
  const teacherRemarks = firstSubjectWithRemarks?.teacherRemarks || '';
  const teacherSignature = firstSubjectWithRemarks?.signature || '';

  // Generate subject rows (excluding TOTAL)
  const subjectRows = subjects.slice(0, -1).map((subject, index) => {
    const isFirstRow = index === 0;
    return `
      <tr>
        <td style="padding: 8px; border: 1px solid #000000; text-align: left;">${subject.name}</td>
        <td style="padding: 8px; border: 1px solid #000000; text-align: center;">${subject.midTerm}</td>
        <td style="padding: 8px; border: 1px solid #000000; text-align: center;">${subject.endOfTerm || ''}</td>
        <td style="padding: 8px; border: 1px solid #000000; text-align: center;">${subject.outOf}</td>
        ${isFirstRow ? `<td rowspan="6" style="padding: 8px; border: 1px solid #000000; text-align: left; vertical-align: top;">${teacherRemarks}</td>` : ''}
        ${isFirstRow ? `<td rowspan="6" style="padding: 8px; border: 1px solid #000000; text-align: center; vertical-align: top;">${teacherSignature}</td>` : ''}
      </tr>
    `;
  }).join('');

  // Generate TOTAL row (separate from rowspan)
  const totalSubject = subjects[subjects.length - 1];
  const totalRow = `
    <tr style="font-weight: bold;">
      <td style="padding: 8px; border: 1px solid #000000; text-align: left;">${totalSubject.name}</td>
      <td style="padding: 8px; border: 1px solid #000000; text-align: center;">${totalSubject.midTerm}</td>
      <td style="padding: 8px; border: 1px solid #000000; text-align: center;">${totalSubject.endOfTerm || ''}</td>
      <td style="padding: 8px; border: 1px solid #000000; text-align: center;">${totalSubject.outOf}</td>
      <td style="padding: 8px; border: 1px solid #000000; text-align: center;"></td>
      <td style="padding: 8px; border: 1px solid #000000; text-align: center;"></td>
    </tr>
  `;

  // Generate requirements lists
  const boardingRequirements = requirements.boarding.map(item => `<li>${item}</li>`).join('');
  const dayRequirements = requirements.day.map(item => `<li>${item}</li>`).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, 'Segoe UI', sans-serif;
      padding: 8mm;
      color: #000000;
    }
    
    .report-container {
      border: 2px solid #000000;
      padding: 15px;
      max-width: 210mm;
      margin: 0 auto;
    }
    
    /* Header Section - Standardized from Template 7 */
    .header {
      display: flex;
      align-items: center;
      min-height: 2.1cm;
      position: relative;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #000000;
    }
    
    .logo-box {
      width: 132px;
      height: 132px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      left: 0;
      margin-left: 0;
      flex-shrink: 0;
    }
    
    .logo {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    
    .school-info {
      flex: 1;
      text-align: center;
      margin-left: 132px;
      padding-left: 0.3cm;
    }
    
    .school-name {
      font-size: 20pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #000000;
      margin-bottom: 8px;
      letter-spacing: 0.04em;
      line-height: 1.06;
    }
    
    .school-address {
      font-size: 11pt;
      margin-bottom: 4px;
      font-weight: 600;
      color: #000000;
      line-height: 1.32;
    }
    
    .report-title {
      font-size: 14pt;
      font-weight: bold;
      text-decoration: underline;
      letter-spacing: 0.1em;
      margin-top: 10px;
      color: #000000;
    }
    
    /* Student Information Section - Standardized from Template 7 */
    .student-info {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 6px 10px;
      border: 1px solid #000000;
      border-radius: 8px;
      margin-bottom: 15px;
      background: #f8fafc;
      min-height: 28mm;
      font-size: 11pt;
      line-height: 1.3;
    }
    
    .student-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 10px;
      row-gap: 4px;
      font-size: 11pt;
      flex: 1;
    }
    
    .info-label {
      font-weight: bold;
      color: #000000;
    }
    
    .student-photo-box {
      width: 2.1cm;
      height: 2.9cm;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }
    
    .student-photo {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .student-photo-placeholder {
      font-size: 8pt;
      color: #94a3b8;
      text-align: center;
    }
    
    .skills-grid {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      table-layout: fixed;
    }
    
    .skills-grid td {
      width: 12.5%;
    }
    
    .legend {
      display: flex;
      justify-content: space-around;
      align-items: center;
      margin: 15px 0;
      font-size: 9pt;
      flex-wrap: wrap;
    }
    
    .legend-item {
      display: flex;
      align-items: center;
      margin: 5px 10px;
    }
    
    .legend-box {
      width: 20px;
      height: 15px;
      border: 1px solid #000000;
      margin-right: 5px;
    }
    
    .academic-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
    }
    
    .academic-table th {
      background-color: #f0f0f0;
      padding: 8px;
      border: 1px solid #000000;
      font-weight: bold;
      text-align: center;
      font-size: 10pt;
    }
    
    .academic-table td {
      font-size: 10pt;
    }
    
    .comments-section {
      margin: 15px 0;
    }
    
    .comment-box {
      margin-bottom: 12px;
    }
    
    .comment-label {
      font-weight: bold;
      font-size: 10pt;
      margin-bottom: 5px;
    }
    
    .comment-text {
      border-bottom: 1px solid #000000;
      min-height: 50px;
      padding: 8px 0;
      font-size: 10pt;
    }
    
    .class-teacher-value {
      color: #0000FF;
    }
    
    .signature-line {
      border-bottom: 1px solid #000000;
      width: 180px;
      margin-top: 8px;
      padding-top: 5px;
      font-size: 9pt;
    }
    
    .term-dates {
      display: flex;
      justify-content: space-between;
      margin: 15px 0;
      font-size: 10pt;
      font-weight: bold;
    }
    
    .requirements-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 15px 0;
      font-size: 8.5pt;
    }
    
    .requirements-column h4 {
      font-size: 9pt;
      font-weight: bold;
      margin-bottom: 8px;
      text-decoration: underline;
    }
    
    .requirements-column ul {
      padding-left: 20px;
      margin: 0;
    }
    
    .requirements-column li {
      margin-bottom: 4px;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Header with Logo - Standardized from Template 7 -->
    <div class="header">
      <div class="logo-box">
        ${schoolLogoBase64 
          ? `<img src="${schoolLogoBase64}" alt="School Logo" class="logo" />`
          : '<span style="font-size: 8pt; color: #666;">School<br/>Logo</span>'
        }
      </div>
      <div class="school-info">
        <div class="school-name">${school.name}</div>
        <div class="school-address">${school.address}</div>
        <div class="school-address">Tel: ${school.phone}</div>
        <div class="report-title">TERMINAL PROGRESSIVE REPORT FOR NURSERY</div>
      </div>
    </div>
    
    <!-- Student Information - Standardized from Template 7 -->
    <div class="student-info">
      <div class="student-info-grid">
        <div>
          <span class="info-label">Pupil's name:</span> ${student.name}
        </div>
        <div>
          <span class="info-label">Class:</span> ${student.class}
        </div>
        <div>
          <span class="info-label">Year:</span> ${student.year}
        </div>
        <div>
          <span class="info-label">Term:</span> ${student.term}
        </div>
        <div>
          <span class="info-label">Age:</span> ${student.age}
        </div>
        <div>
          <span class="info-label">Date:</span> ${student.date}
        </div>
        <div>
          <span class="info-label">LIN NO:</span> ${student.linNo || 'N/A'}
        </div>
        <div></div>
      </div>
      <div class="student-photo-box">
        <span class="student-photo-placeholder">Photo</span>
      </div>
    </div>
    
    <table class="skills-grid">
      ${skillsGridHTML}
    </table>
    
    <div class="legend">
      <div class="legend-item">
        <div class="legend-box" style="background-color: #00FF00;"></div>
        <span>Very Good:</span>
      </div>
      <div class="legend-item">
        <div class="legend-box" style="background-color: #90EE90;"></div>
        <span>Good:</span>
      </div>
      <div class="legend-item">
        <div class="legend-box" style="background-color: #FFFF00;"></div>
        <span>Tries:</span>
      </div>
      <div class="legend-item">
        <div class="legend-box" style="background-color: #FFA500;"></div>
        <span>Fair:</span>
      </div>
      <div class="legend-item">
        <div class="legend-box" style="background-color: #FF0000;"></div>
        <span>Still a Problem:</span>
      </div>
      <div class="legend-item">
        <div class="legend-box" style="background-color: #87CEEB;"></div>
        <span>Promising:</span>
      </div>
    </div>
    
    <table class="academic-table">
      <thead>
        <tr>
          <th style="width: 25%; text-align: left;">Subject</th>
          <th style="width: 12%;">Mid Term</th>
          <th style="width: 12%;">End of Term</th>
          <th style="width: 10%;">Out of</th>
          <th style="width: 28%; text-align: left;">Teacher's Remarks</th>
          <th style="width: 13%;">Signature</th>
        </tr>
      </thead>
      <tbody>
        ${subjectRows}
        ${totalRow}
      </tbody>
    </table>
    
    <div class="comments-section">
      <div class="comment-box">
        <div class="comment-label">Class Teacher's Comment:</div>
        <div class="comment-text class-teacher-value">${comments.classTeacher.text}</div>
        <div class="signature-line">Signature: ${comments.classTeacher.signature || ''}</div>
      </div>
      
      <div class="comment-box">
        <div class="comment-label">Headteacher's Comment:</div>
        <div class="comment-text">${comments.headteacher.text}</div>
        <div class="signature-line">Signature: ${comments.headteacher.signature || ''}</div>
      </div>
    </div>
    
    <div class="term-dates">
      <div>Next term begins on: ${termDates.nextTermBegins}</div>
      <div>Ends on: ${termDates.endsOn}</div>
    </div>
    
    <div class="requirements-section">
      <div class="requirements-column">
        <h4>BOARDING REQUIREMENTS</h4>
        <ul>
          ${boardingRequirements}
        </ul>
      </div>
      <div class="requirements-column">
        <h4>DAY REQUIREMENTS</h4>
        <ul>
          ${dayRequirements}
        </ul>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

// ============================================================================
// TEMPLATE 9: Academy Professional Report
// ============================================================================

export function generateTemplate9HTML(
  reportData: Template9Data,
  schoolLogoBase64?: string | null,
  studentPhotoBase64?: string | null
): string {
  const { school, student, reportTitle, subjects, summary, comments, termDates, requirements, gradingScale } = reportData;

  // Generate subject rows
  const subjectRows = subjects.map(subject => `
    <tr>
      <td style="padding: 8px; border: 1px solid #002366; text-align: left;">${subject.learningArea}</td>
      <td style="padding: 8px; border: 1px solid #002366; text-align: center;">${subject.mot}</td>
      <td style="padding: 8px; border: 1px solid #002366; text-align: center;">${subject.eot}</td>
      <td style="padding: 8px; border: 1px solid #002366; text-align: center;">${subject.avg}</td>
      <td style="padding: 8px; border: 1px solid #002366; text-align: center;">${subject.grade}</td>
      <td style="padding: 8px; border: 1px solid #002366; text-align: left;">${subject.comment}</td>
      <td style="padding: 8px; border: 1px solid #002366; text-align: center;">${subject.initial || ''}</td>
    </tr>
  `).join('');

  // Generate grading scale rows
  const rangeRow = gradingScale.ranges.map(range => 
    `<td style="padding: 6px; border: 1px solid #002366; text-align: center;">${range}</td>`
  ).join('');
  
  const gradeRow = gradingScale.grades.map(grade => 
    `<td style="padding: 6px; border: 1px solid #002366; text-align: center; font-weight: bold;">${grade}</td>`
  ).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', Arial, 'Times New Roman', sans-serif;
      padding: 12mm;
      color: #002366;
      position: relative;
    }
    
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 120pt;
      opacity: 0.05;
      color: #002366;
      z-index: -1;
      pointer-events: none;
      font-weight: bold;
      white-space: nowrap;
    }
    
    .report-container {
      border: 2px solid #002366;
      padding: 20px;
      max-width: 210mm;
      margin: 0 auto;
      position: relative;
      background-color: white;
    }
    
    /* Header Section - Standardized from Template 7 */
    .header {
      display: flex;
      align-items: center;
      min-height: 2.1cm;
      position: relative;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #002366;
    }
    
    .logo-box {
      width: 132px;
      height: 132px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      left: 0;
      margin-left: 0;
      flex-shrink: 0;
    }
    
    .logo {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    
    .school-info {
      flex: 1;
      text-align: center;
      margin-left: 132px;
      padding-left: 0.3cm;
    }
    
    .school-name {
      font-size: 20pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #002366;
      margin-bottom: 8px;
      letter-spacing: 0.04em;
      line-height: 1.06;
    }
    
    .school-subtitle {
      font-size: 11pt;
      margin-bottom: 4px;
      font-weight: 600;
      color: #002366;
      line-height: 1.32;
    }
    
    .school-contact {
      font-size: 10pt;
      margin-bottom: 3px;
      color: #002366;
    }
    
    .school-motto {
      font-size: 12pt;
      font-weight: bold;
      text-decoration: underline;
      margin-top: 10px;
      color: #002366;
    }
    
    /* Student Information Section - Standardized from Template 7 */
    .student-info {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 6px 10px;
      border: 1px solid #002366;
      border-radius: 8px;
      margin-bottom: 15px;
      background: #f2f6ff;
      min-height: 28mm;
      font-size: 11pt;
      line-height: 1.3;
    }
    
    .student-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 10px;
      row-gap: 4px;
      font-size: 11pt;
      flex: 1;
    }
    
    .info-label {
      font-weight: bold;
      color: #002366;
    }
    
    .student-photo-box {
      width: 2.1cm;
      height: 2.9cm;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }
    
    .student-photo {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .student-photo-placeholder {
      font-size: 8pt;
      color: #94a3b8;
      text-align: center;
    }
    
    .report-title-bar {
      background-color: #002366;
      color: white;
      text-align: center;
      padding: 12px;
      font-size: 12pt;
      font-weight: bold;
      margin: 20px 0;
    }
    
    .academic-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    .academic-table thead {
      background-color: #f2f6ff;
      font-weight: bold;
      color: #002366;
    }
    
    .academic-table th {
      padding: 10px 8px;
      border: 1px solid #002366;
      text-align: center;
      font-size: 9pt;
    }
    
    .academic-table td {
      font-size: 9pt;
    }
    
    .summary-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
      margin: 20px 0;
    }
    
    .summary-cell {
      border: 1px solid #002366;
      padding: 10px;
      font-size: 10pt;
      font-weight: bold;
    }
    
    .comments-section {
      margin: 20px 0;
    }
    
    .comment-box {
      border: 1px solid #002366;
      padding: 12px;
      margin-bottom: 15px;
    }
    
    .comment-label {
      font-weight: bold;
      font-size: 10pt;
      margin-bottom: 8px;
      color: #002366;
    }
    
    .comment-text {
      font-style: italic;
      min-height: 50px;
      padding: 8px 0;
      font-size: 10pt;
    }
    
    .signature-line {
      border-bottom: 1px dotted #002366;
      width: 200px;
      margin-top: 10px;
      padding-top: 5px;
      font-size: 9pt;
    }
    
    .term-dates {
      border: 1px solid #002366;
      padding: 10px;
      margin: 15px 0;
      font-size: 10pt;
    }
    
    .grading-scale {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    .grading-scale td {
      font-size: 9pt;
    }
    
    .security-warning {
      text-align: center;
      color: #FF0000;
      font-weight: bold;
      text-decoration: underline;
      font-size: 10pt;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="watermark">${school.name}</div>
  
  <div class="report-container">
    <!-- Header with Logo - Standardized from Template 7 -->
    <div class="header">
      <div class="logo-box">
        ${schoolLogoBase64 
          ? `<img src="${schoolLogoBase64}" alt="School Logo" class="logo" />`
          : '<span style="font-size: 8pt; color: #666;">School<br/>Logo</span>'
        }
      </div>
      <div class="school-info">
        <div class="school-name">${school.name}</div>
        <div class="school-subtitle">${school.subtitle}</div>
        <div class="school-contact">${school.address} | Tel: ${school.phone}</div>
        <div class="school-contact">Email: ${school.email} | Website: ${school.website}</div>
        <div class="school-motto">${school.motto}</div>
      </div>
    </div>
    
    <!-- Student Information - Standardized from Template 7 -->
    <div class="student-info">
      <div class="student-info-grid">
        <div>
          <span class="info-label">NAME</span> ${student.name}
        </div>
        <div>
          <span class="info-label">STUDENT ID</span> ${student.studentId}
        </div>
        <div>
          <span class="info-label">CLASS</span> ${student.class}
        </div>
        <div>
          <span class="info-label">STREAM</span> ${student.stream}
        </div>
        <div>
          <span class="info-label">PAYMENT CODE</span> ${student.paymentCode}
        </div>
        <div>
          <span class="info-label">SEX</span> ${student.sex}
        </div>
        <div>
          <span class="info-label">OVERALL GROUP</span> ${student.overallGroup}
        </div>
        <div>
          <span class="info-label">LIN</span> ${student.lin}
        </div>
      </div>
      <div class="student-photo-box">
        ${studentPhotoBase64
          ? `<img src="${studentPhotoBase64}" alt="Student Photo" class="student-photo" />`
          : '<span class="student-photo-placeholder">PHOTO</span>'
        }
      </div>
    </div>
    
    <div class="report-title-bar">
      ${reportTitle}
    </div>
    
    <table class="academic-table">
      <thead>
        <tr>
          <th style="width: 25%; text-align: left;">Learning Area</th>
          <th style="width: 12%;">MOT</th>
          <th style="width: 12%;">EOT</th>
          <th style="width: 12%;">AVG</th>
          <th style="width: 10%;">GRADE</th>
          <th style="width: 20%; text-align: left;">COMMENT</th>
          <th style="width: 9%;">INITIAL</th>
        </tr>
      </thead>
      <tbody>
        ${subjectRows}
      </tbody>
    </table>
    
    <div class="summary-row">
      <div class="summary-cell">
        Overall Total Mark: ${summary.totalMark}
      </div>
      <div class="summary-cell">
        Overall Average Mark: ${summary.averageMark}
      </div>
    </div>
    
    <div class="comments-section">
      <div class="comment-box">
        <div class="comment-label">Class Teacher's Comment:</div>
        <div class="comment-text">${comments.classTeacher.text}</div>
        <div class="signature-line">Signature: ${comments.classTeacher.signature || ''}</div>
      </div>
      
      <div class="comment-box">
        <div class="comment-label">Head Teacher's Comment:</div>
        <div class="comment-text">${comments.headTeacher.text}</div>
        <div class="signature-line">Signature: ${comments.headTeacher.signature || ''}</div>
      </div>
    </div>
    
    <div class="term-dates">
      <div><strong>Next Term Begins On:</strong> ${termDates.nextTermBegins} | <strong>Ends On:</strong> ${termDates.endsOn}</div>
      <div style="margin-top: 8px;"><strong>School requirements:</strong> ${requirements}</div>
    </div>
    
    <table class="grading-scale">
      <tbody>
        <tr>
          <td style="padding: 6px; border: 1px solid #002366; text-align: center; font-weight: bold; width: 15%;">RANGE</td>
          ${rangeRow}
        </tr>
        <tr>
          <td style="padding: 6px; border: 1px solid #002366; text-align: center; font-weight: bold;">GRADE</td>
          ${gradeRow}
        </tr>
      </tbody>
    </table>
    
    <div class="security-warning">
      This report is invalid without a valid school stamp
    </div>
  </div>
</body>
</html>
  `;
}

// ============================================================================
// TEMPLATE 10: Excellent Nursery Clean Template
// ============================================================================

export function generateTemplate10HTML(
  reportData: Template10Data,
  schoolLogoBase64?: string | null,
  studentPhotoBase64?: string | null
): string {
  const { school, reportTitle, student, learningAreas, activities, summary, comments, footer } = reportData;

  // Generate learning areas rows
  const learningAreasRows = learningAreas.map(area => `
    <tr>
      <td style="padding: 8px; border: 1px solid #000000; text-align: left; font-size: 9pt;">
        ${area.number}. ${area.description}
      </td>
      <td style="padding: 8px; border: 1px solid #000000; text-align: left; font-size: 9pt;">
        <div><strong>SCORE:</strong> ${area.score}/100</div>
        <div style="margin-top: 5px;"><strong>Remark:</strong> ${area.remark}</div>
      </td>
      <td style="padding: 8px; border: 1px solid #000000; text-align: center; font-size: 9pt;">
        ${area.signature || ''}
      </td>
    </tr>
  `).join('');

  // Helper function to format activity value
  const formatActivity = (value: string | boolean): string => {
    if (typeof value === 'boolean') {
      return value ? '✓' : '';
    }
    return value || '';
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, 'Segoe UI', sans-serif;
      padding: 10mm;
      color: #000000;
    }
    
    .report-container {
      border: 2px solid #000000;
      padding: 15px;
      max-width: 210mm;
      margin: 0 auto;
    }
    
    /* Header Section - Standardized from Template 7 */
    .header {
      display: flex;
      align-items: center;
      min-height: 2.1cm;
      position: relative;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #000000;
    }
    
    .logo-box {
      width: 132px;
      height: 132px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      left: 0;
      margin-left: 0;
      flex-shrink: 0;
    }
    
    .logo {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    
    .school-info {
      flex: 1;
      text-align: center;
      margin-left: 132px;
      padding-left: 0.3cm;
    }
    
    .school-name {
      font-size: 20pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #000000;
      margin-bottom: 8px;
      letter-spacing: 0.04em;
      line-height: 1.06;
    }
    
    .school-address {
      font-size: 11pt;
      margin-bottom: 4px;
      font-weight: 600;
      color: #000000;
      line-height: 1.32;
    }
    
    .school-motto {
      font-size: 12pt;
      font-weight: bold;
      text-decoration: underline;
      margin-top: 10px;
      color: #000000;
    }
    
    /* Report Title Bar */
    .report-title-bar {
      border: 2px solid #000000;
      padding: 10px;
      text-align: center;
      font-style: italic;
      font-size: 12pt;
      font-weight: bold;
      margin: 15px 0;
    }
    
    /* Student Information Section - Standardized from Template 7 */
    .student-info {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 6px 10px;
      border: 1px solid #000000;
      border-radius: 8px;
      margin-bottom: 15px;
      background: #f8fafc;
      min-height: 28mm;
      font-size: 11pt;
      line-height: 1.3;
    }
    
    .student-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 10px;
      row-gap: 4px;
      font-size: 11pt;
      flex: 1;
    }
    
    .info-label {
      font-weight: bold;
      color: #000000;
    }
    
    .student-photo-box {
      width: 2.1cm;
      height: 2.9cm;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }
    
    .student-photo {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .student-photo-placeholder {
      font-size: 8pt;
      color: #94a3b8;
      text-align: center;
    }
    
    /* Main Content - Split View Layout */
    .main-content {
      display: flex;
      gap: 15px;
      margin: 20px 0;
    }
    
    .left-section {
      flex: 0 0 60%;
    }
    
    .right-section {
      flex: 0 0 calc(40% - 15px);
    }
    
    /* Academic Learning Areas Table */
    .learning-areas-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .learning-areas-table th {
      background-color: #f0f0f0;
      padding: 8px;
      border: 1px solid #000000;
      font-weight: bold;
      text-align: center;
      font-size: 10pt;
    }
    
    /* Activities Section */
    .activities-header {
      background-color: #000000;
      color: white;
      text-align: center;
      padding: 10px;
      font-weight: bold;
      font-size: 11pt;
      margin-bottom: 10px;
    }
    
    .activities-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0;
    }
    
    .activity-cell {
      border: 1px solid #000000;
      padding: 12px 8px;
      font-size: 9pt;
      font-weight: bold;
      text-align: center;
      min-height: 50px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }
    
    .activity-name {
      margin-bottom: 5px;
    }
    
    .activity-value {
      font-size: 8pt;
      color: #333;
      border-top: 1px dotted #666;
      padding-top: 5px;
      width: 100%;
      text-align: center;
    }
    
    /* Summary Bar */
    .summary-bar {
      background-color: #8B2323;
      color: white;
      padding: 12px;
      text-align: center;
      font-weight: bold;
      font-size: 11pt;
      margin: 20px 0;
    }
    
    /* Comments Section */
    .comments-section {
      border: 2px solid #FF0000;
      margin: 20px 0;
    }
    
    .comment-row {
      display: grid;
      grid-template-columns: 2fr 1fr;
      border-bottom: 1px solid #FF0000;
    }
    
    .comment-row:last-child {
      border-bottom: none;
    }
    
    .comment-label {
      border-right: 1px solid #FF0000;
      padding: 10px;
      font-weight: bold;
      font-size: 10pt;
      background-color: #fff5f5;
    }
    
    .comment-content {
      padding: 10px;
      font-size: 9pt;
    }
    
    .comment-text {
      min-height: 40px;
      margin-bottom: 5px;
    }
    
    .comment-name {
      font-weight: bold;
      font-size: 9pt;
    }
    
    /* Footer Section */
    .footer-section {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
      margin: 20px 0;
    }
    
    .footer-info {
      font-size: 9pt;
    }
    
    .footer-row {
      margin-bottom: 8px;
    }
    
    .footer-label {
      font-weight: bold;
      display: inline-block;
      min-width: 140px;
    }
    
    .school-stamp {
      border: 2px solid #000000;
      border-radius: 50%;
      width: 120px;
      height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9pt;
      color: #666;
      text-align: center;
      margin: 0 auto;
    }
    
    .school-motto {
      text-align: center;
      font-style: italic;
      font-size: 11pt;
      margin-top: 15px;
      font-family: 'Times New Roman', Georgia, serif;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Header with Logo - Standardized from Template 7 -->
    <div class="header">
      <div class="logo-box">
        ${schoolLogoBase64 
          ? `<img src="${schoolLogoBase64}" alt="School Logo" class="logo" />`
          : '<span style="font-size: 8pt; color: #666;">School<br/>Logo</span>'
        }
      </div>
      <div class="school-info">
        <div class="school-name">${school.name}</div>
        <div class="school-address">${school.address} | ${school.website} | Tel: ${school.phone}</div>
        <div class="school-motto">${school.motto}</div>
      </div>
    </div>
    
    <!-- Report Title Bar -->
    <div class="report-title-bar">
      ${reportTitle}
    </div>
    
    <!-- Student Information - Standardized from Template 7 -->
    <div class="student-info">
      <div class="student-info-grid">
        <div>
          <span class="info-label">Pupil's name:</span> ${student.name}
        </div>
        <div>
          <span class="info-label">Class:</span> ${student.class}
        </div>
        <div>
          <span class="info-label">Reg No:</span> ${student.regNo}
        </div>
        <div>
          <span class="info-label">Days Attended:</span> ${student.daysAttended}
        </div>
        <div>
          <span class="info-label">Days Absent:</span> ${student.daysAbsent}
        </div>
        <div>
          <span class="info-label">Total Days:</span> ${student.totalDays}
        </div>
        <div>
          <span class="info-label">Fees Balance:</span> ${student.feesBal}
        </div>
        <div>
          <span class="info-label">Code:</span> ${student.code}
        </div>
      </div>
      <div class="student-photo-box">
        ${studentPhotoBase64
          ? `<img src="${studentPhotoBase64}" alt="Student Photo" class="student-photo" />`
          : '<span class="student-photo-placeholder">Photo</span>'
        }
      </div>
    </div>
    
    <!-- Main Content - Split View Layout -->
    <div class="main-content">
      <!-- LEFT SIDE (60%) - Academic Learning Areas -->
      <div class="left-section">
        <table class="learning-areas-table">
          <thead>
            <tr>
              <th style="width: 50%; text-align: left;">Learning Area</th>
              <th style="width: 35%; text-align: left;">Score & Comment</th>
              <th style="width: 15%;">Signature</th>
            </tr>
          </thead>
          <tbody>
            ${learningAreasRows}
          </tbody>
        </table>
      </div>
      
      <!-- RIGHT SIDE (40%) - Performance in Activities -->
      <div class="right-section">
        <div class="activities-header">
          PERFORMANCE IN ACTIVITIES
        </div>
        <div class="activities-grid">
          <div class="activity-cell">
            <div class="activity-name">WRITING</div>
            <div class="activity-value">${formatActivity(activities.writing)}</div>
          </div>
          <div class="activity-cell">
            <div class="activity-name">LISTENING</div>
            <div class="activity-value">${formatActivity(activities.listening)}</div>
          </div>
          <div class="activity-cell">
            <div class="activity-name">READING</div>
            <div class="activity-value">${formatActivity(activities.reading)}</div>
          </div>
          <div class="activity-cell">
            <div class="activity-name">SPEAKING</div>
            <div class="activity-value">${formatActivity(activities.speaking)}</div>
          </div>
          <div class="activity-cell">
            <div class="activity-name">DRAWING</div>
            <div class="activity-value">${formatActivity(activities.drawing)}</div>
          </div>
          <div class="activity-cell">
            <div class="activity-name">GAMES</div>
            <div class="activity-value">${formatActivity(activities.games)}</div>
          </div>
          <div class="activity-cell">
            <div class="activity-name">RHYMES</div>
            <div class="activity-value">${formatActivity(activities.rhymes)}</div>
          </div>
          <div class="activity-cell">
            <div class="activity-name">MUSIC</div>
            <div class="activity-value">${formatActivity(activities.music)}</div>
          </div>
          <div class="activity-cell">
            <div class="activity-name">HEALTH</div>
            <div class="activity-value">${formatActivity(activities.health)}</div>
          </div>
          <div class="activity-cell">
            <div class="activity-name">TOILET</div>
            <div class="activity-value">${formatActivity(activities.toilet)}</div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Summary Bar -->
    <div class="summary-bar">
      TOTAL: ${summary.total} &nbsp;&nbsp; SCORED: ${summary.scored} &nbsp;&nbsp; POSITION: ${summary.position} OUT OF ${summary.outOf}
    </div>
    
    <!-- Comments Section -->
    <div class="comments-section">
      <div class="comment-row">
        <div class="comment-label">Class Teacher's Report</div>
        <div class="comment-content">
          <div class="comment-text">${comments.classTeacher.report}</div>
          <div class="comment-name">Name: ${comments.classTeacher.name}</div>
        </div>
      </div>
      
      <div class="comment-row">
        <div class="comment-label">Behaviors / Cleanliness</div>
        <div class="comment-content">
          <div class="comment-text">${comments.behaviorsAndCleanliness.report}</div>
          <div class="comment-name">Name: ${comments.behaviorsAndCleanliness.name}</div>
        </div>
      </div>
      
      <div class="comment-row">
        <div class="comment-label">Head Teacher's Comment</div>
        <div class="comment-content">
          <div class="comment-text">${comments.headTeacher.comment}</div>
          <div class="comment-name">Name: ${comments.headTeacher.name}</div>
        </div>
      </div>
    </div>
    
    <!-- Footer Section -->
    <div class="footer-section">
      <div class="footer-info">
        <div class="footer-row">
          <span class="footer-label">Date of Issue:</span> ${footer.dateOfIssue}
        </div>
        <div class="footer-row">
          <span class="footer-label">Next Term Begins:</span> ${footer.nextTermBegins}
        </div>
        <div class="footer-row">
          <span class="footer-label">Requirements:</span> ${footer.requirements}
        </div>
      </div>
      
      <div>
        <div class="school-stamp">
          SCHOOL<br>STAMP
        </div>
      </div>
    </div>
    
    <!-- School Motto -->
    <div class="school-motto">
      School Motto: "${school.motto}"
    </div>
  </div>
</body>
</html>
  `;
}

// ============================================================================
// TEMPLATE 11: Simple Nursery Template
// ============================================================================

export function generateTemplate11HTML(
  reportData: Template11Data,
  schoolLogoBase64?: string | null,
  studentPhotoBase64?: string | null
): string {
  const { school, reportTitle, student, activities, comments, footer } = reportData;

  // Generate activities grid (2 columns × 5 rows = 10 activities)
  const activitiesHTML = activities.map(activity => `
    <div class="activity-cell">
      <div class="activity-header">
        <span class="activity-name">${activity.name}</span>
        <span class="activity-illus">ILLUS.</span>
      </div>
      <div class="activity-content">
        ${activity.comment ? `<div class="activity-comment">${activity.comment}</div>` : ''}
        ${activity.rating ? `<div class="activity-rating">${activity.rating}</div>` : ''}
        <div class="activity-lines">
          <div class="dotted-line"></div>
          <div class="dotted-line"></div>
          <div class="dotted-line"></div>
        </div>
      </div>
    </div>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: Arial, 'Segoe UI', sans-serif;
      padding: 10mm;
      color: #000000;
      position: relative;
    }
    
    /* Central Watermark */
    .watermark {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.1;
      z-index: -1;
      width: 400px;
      height: 400px;
      pointer-events: none;
    }
    
    .watermark img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    
    .report-container {
      border: 2px solid #000000;
      padding: 15px;
      max-width: 210mm;
      margin: 0 auto;
      position: relative;
      background-color: white;
    }
    
    /* Header Section - Standardized from Template 7 */
    .header {
      display: flex;
      align-items: center;
      min-height: 2.1cm;
      position: relative;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #000000;
    }
    
    .logo-box {
      width: 132px;
      height: 132px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      left: 0;
      margin-left: 0;
      flex-shrink: 0;
    }
    
    .logo {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    
    .school-info {
      flex: 1;
      text-align: center;
      margin-left: 132px;
      padding-left: 0.3cm;
    }
    
    .school-name {
      font-size: 20pt;
      font-weight: bold;
      text-transform: uppercase;
      color: #000000;
      margin-bottom: 8px;
      letter-spacing: 0.04em;
      line-height: 1.06;
    }
    
    .school-contact {
      font-size: 10pt;
      margin-bottom: 3px;
      color: #000000;
    }
    
    .school-motto {
      font-size: 12pt;
      font-weight: bold;
      text-decoration: underline;
      margin-top: 10px;
      color: #000000;
    }
    
    /* Red Horizontal Divider */
    .header-divider {
      height: 2px;
      background-color: #FF0000;
      margin: 10px 0;
    }
    
    /* Report Title */
    .report-title {
      text-align: center;
      font-size: 12pt;
      font-weight: bold;
      font-style: italic;
      font-family: 'Times New Roman', Georgia, serif;
      margin: 15px 0;
    }
    
    /* Student Information Section - Standardized from Template 7 */
    .student-info {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 6px 10px;
      border: 1px solid #000000;
      border-radius: 8px;
      margin-bottom: 15px;
      background: #f8fafc;
      min-height: 28mm;
      font-size: 11pt;
      line-height: 1.3;
    }
    
    .student-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 10px;
      row-gap: 4px;
      font-size: 11pt;
      flex: 1;
    }
    
    .info-label {
      font-weight: bold;
      color: #000000;
    }
    
    .student-photo-box {
      width: 2.1cm;
      height: 2.9cm;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }
    
    .student-photo {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .student-photo-placeholder {
      font-size: 8pt;
      color: #94a3b8;
      text-align: center;
    }
    
    /* Activities Section */
    .activities-header {
      background-color: #000000;
      color: #FFFFFF;
      padding: 10px;
      text-align: center;
      font-style: italic;
      font-weight: bold;
      letter-spacing: 0.05em;
      font-size: 11pt;
      margin: 20px 0 0 0;
    }
    
    .activities-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: repeat(5, 1fr);
      gap: 0;
      border: 1px solid #000000;
    }
    
    .activity-cell {
      border: 1px solid #000000;
      padding: 15px;
      min-height: 100px;
      position: relative;
      display: flex;
      flex-direction: column;
    }
    
    .activity-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }
    
    .activity-name {
      font-style: italic;
      font-weight: bold;
      font-size: 10pt;
    }
    
    .activity-illus {
      font-style: italic;
      font-size: 9pt;
      color: #666;
    }
    
    .activity-content {
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    
    .activity-comment {
      font-size: 9pt;
      margin-bottom: 5px;
    }
    
    .activity-rating {
      font-size: 9pt;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .activity-lines {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
    }
    
    .dotted-line {
      border-bottom: 1px dotted #666;
      margin-top: 8px;
      height: 1px;
    }
    
    /* Comments Section with RED borders */
    .comments-section {
      border: 1.5px solid #FF0000;
      margin-top: 20px;
    }
    
    .comment-row {
      border-bottom: 1.5px solid #FF0000;
      padding: 15px;
      min-height: 60px;
    }
    
    .comment-row:last-child {
      border-bottom: none;
    }
    
    .comment-label {
      font-weight: bold;
      font-size: 10pt;
      margin-bottom: 8px;
    }
    
    .comment-text {
      font-size: 9pt;
      min-height: 40px;
    }
    
    /* Footer Section */
    .footer-section {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
      margin: 20px 0;
    }
    
    .footer-info {
      font-size: 9pt;
    }
    
    .footer-row {
      margin-bottom: 8px;
    }
    
    .footer-label {
      font-weight: bold;
      display: inline-block;
      min-width: 140px;
    }
    
    .school-stamp {
      border: 2px solid #000000;
      border-radius: 50%;
      width: 120px;
      height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9pt;
      color: #666;
      text-align: center;
      margin: 0 auto;
    }
    
    .school-motto {
      text-align: center;
      font-style: italic;
      font-size: 11pt;
      margin-top: 15px;
      font-family: 'Times New Roman', Georgia, serif;
    }
  </style>
</head>
<body>
  <!-- Central Watermark -->
  ${schoolLogoBase64 ? `
  <div class="watermark">
    <img src="${schoolLogoBase64}" alt="Watermark" />
  </div>
  ` : ''}
  
  <div class="report-container">
    <!-- Header Section -->
    <div class="header">
      <div class="logo-box">
        ${schoolLogoBase64 ? 
          `<img src="${schoolLogoBase64}" alt="School Logo" class="logo" />` :
          '<span style="font-size: 8pt; color: #666;">LOGO</span>'
        }
      </div>
      <div class="school-info">
        <div class="school-name">${school.name}</div>
        <div class="school-contact">${school.address} | ${school.website} | ${school.email}</div>
        <div class="school-contact">Tel: ${school.phone}</div>
      </div>
    </div>
    
    <!-- Red Horizontal Divider -->
    <div class="header-divider"></div>
    
    <!-- Report Title -->
    <div class="report-title">
      ${reportTitle}
    </div>
    
    <!-- Student Information Section -->
    <div class="student-info">
      <div class="student-info-left">
        <div class="info-row">
          <span class="info-label">Reg No:</span> ${student.regNo}
        </div>
        <div class="info-row">
          <span class="info-label">CLASS:</span> ${student.class}
        </div>
        <div class="info-row">
          <span class="info-label">NAME:</span> ${student.name}
        </div>
      </div>
      
      <div class="student-info-middle">
        <div class="info-row">
          <span class="info-label">Fees Bal:</span> ${student.feesBal}
        </div>
        <div class="info-row">
          <span class="info-label">SchoolPay Code:</span> ${student.schoolPayCode}
        </div>
        <div class="info-row">
          <span class="info-label">DAYS:</span> ATTENDED: ${student.daysAttended} / ABSENT: ${student.daysAbsent} / TOTAL: ${student.totalDays}
        </div>
      </div>
      
      <div class="student-photo-box">
        ${studentPhotoBase64 ? 
          `<img src="${studentPhotoBase64}" alt="Student Photo" class="student-photo" />` :
          '<div class="student-photo-placeholder">STUDENT<br>PHOTO</div>'
        }
      </div>
    </div>
    
    <!-- Activities Section -->
    <div class="activities-header">
      PERFORMANCE IN THE LEARNING ACTIVITIES
    </div>
    <div class="activities-grid">
      ${activitiesHTML}
    </div>
    
    <!-- Comments Section with RED borders -->
    <div class="comments-section">
      <div class="comment-row">
        <div class="comment-label">Class Teacher's Report</div>
        <div class="comment-text">${comments.classTeacher.report}</div>
      </div>
      
      <div class="comment-row">
        <div class="comment-label">Behaviors / Cleanliness</div>
        <div class="comment-text">${comments.behaviorsAndCleanliness.report}</div>
      </div>
      
      <div class="comment-row">
        <div class="comment-label">Head Teachers Comment</div>
        <div class="comment-text">${comments.headTeacher.comment}</div>
      </div>
    </div>
    
    <!-- Footer Section -->
    <div class="footer-section">
      <div class="footer-info">
        <div class="footer-row">
          <span class="footer-label">Date of Issue:</span> ${footer.dateOfIssue}
        </div>
        <div class="footer-row">
          <span class="footer-label">Next Term Begins:</span> ${footer.nextTermBegins}
        </div>
        <div class="footer-row">
          <span class="footer-label">School Requirements:</span> ${footer.requirements}
        </div>
      </div>
      
      <div>
        <div class="school-stamp">
          SCHOOL<br>STAMP
        </div>
      </div>
    </div>
    
    <!-- School Motto -->
    <div class="school-motto">
      School Motto: '${school.motto}'
    </div>
  </div>
</body>
</html>
  `;
}

// ============================================================================
// TEMPLATE 12: Modern Nursery Template
// ============================================================================

export function generateTemplate12HTML(
  reportData: Template12Data,
  schoolLogoBase64?: string | null,
  studentPhotoBase64?: string | null
): string {
  const { school, reportTitle, student, learningAreas, summary, comments, footer } = reportData;

  // Helper function to format ordinal ranking
  const formatOrdinal = (position: number | string): string => {
    if (typeof position === 'string') return position;
    
    const num = Number(position);
    if (isNaN(num)) return String(position);
    
    const lastDigit = num % 10;
    const lastTwoDigits = num % 100;
    
    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
      return `${num}th`;
    }
    
    switch (lastDigit) {
      case 1: return `${num}st`;
      case 2: return `${num}nd`;
      case 3: return `${num}rd`;
      default: return `${num}th`;
    }
  };

  // Generate learning areas rows
  const learningAreasRows = learningAreas.map(area => `
    <tr>
      <td style="padding: 10px 8px; border: 1px solid #000000; text-align: left; font-size: 9pt;">
        Learning Area ${area.number}: ${area.description}
      </td>
      <td style="padding: 10px 8px; border: 1px solid #000000; text-align: center; font-size: 11pt; font-family: 'Courier New', monospace; font-weight: bold;">
        ${area.achievementScore}/100
      </td>
      <td style="padding: 10px 8px; border: 1px solid #000000; text-align: center; font-size: 10pt; font-weight: bold;">
        ${formatOrdinal(area.position)}
      </td>
      <td style="padding: 10px 8px; border: 1px solid #000000; text-align: left; font-size: 9pt;">
        ${area.comments}
      </td>
      <td style="padding: 10px 8px; border: 1px solid #000000; text-align: center; font-size: 9pt;">
        ${area.signature || ''}
      </td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Verdana, sans-serif;
      padding: 10mm;
      color: #000000;
    }
    
    .report-container {
      border: 2px solid #000000;
      padding: 15px;
      max-width: 210mm;
      margin: 0 auto;
    }
    
    /* Header Section - Standardized to match Template 7 */
    .header {
      display: flex;
      align-items: center;
      min-height: 2.1cm;
      position: relative;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #FF8C00;
    }
    
    .logo-box {
      width: 132px;
      height: 132px;
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      left: 0;
      margin-left: 0;
      flex-shrink: 0;
    }
    
    .logo {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    
    .school-info {
      flex: 1;
      text-align: center;
      margin-left: 132px;
      padding-left: 0.3cm;
    }
    
    .school-name {
      font-size: 20pt;
      font-weight: bold;
      text-transform: uppercase;
      margin-bottom: 8px;
      letter-spacing: 0.04em;
      line-height: 1.06;
    }
    
    .school-contact {
      font-size: 11pt;
      margin-bottom: 4px;
      font-weight: 600;
      line-height: 1.32;
    }
    
    /* Orange Horizontal Divider */
    .header-divider {
      height: 2px;
      background-color: #FF8C00;
      margin: 10px 0;
    }
    
    /* Report Title */
    .report-title {
      border: 2px solid #000000;
      padding: 10px;
      text-align: center;
      font-weight: bold;
      font-size: 12pt;
      margin: 15px 0;
    }
    
    /* Student Information Section - Standardized to match Template 7 */
    .student-info {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 6px 10px;
      border: 1px solid #FF8C00;
      border-radius: 8px;
      margin-bottom: 15px;
      background: #fff8f0;
      min-height: 28mm;
      font-size: 11pt;
      line-height: 1.3;
    }
    
    .student-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      column-gap: 10px;
      row-gap: 4px;
      font-size: 11pt;
      flex: 1;
    }
    
    .info-label {
      font-weight: bold;
    }
    
    .student-photo-box {
      width: 2.1cm;
      height: 2.9cm;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }
    
    .student-photo {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .student-photo-placeholder {
      font-size: 8pt;
      color: #94a3b8;
      text-align: center;
    }
    
    /* Achievement Scores Section */
    .achievement-scores-header {
      font-size: 12pt;
      font-weight: bold;
      margin: 20px 0 10px 0;
      text-align: center;
    }
    
    .achievement-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    
    .achievement-table th {
      background-color: #f0f0f0;
      padding: 10px 8px;
      border: 1px solid #000000;
      font-weight: bold;
      text-align: center;
      font-size: 10pt;
    }
    
    .achievement-table th.area-header {
      text-align: left;
    }
    
    .achievement-table th.comments-header {
      text-align: left;
    }
    
    .score-column {
      width: 15%;
    }
    
    .position-column {
      width: 12%;
    }
    
    .area-column {
      width: 40%;
    }
    
    .comments-column {
      width: 23%;
    }
    
    .signature-column {
      width: 10%;
    }
    
    /* Summary Bar - Dark Purple/Brown */
    .summary-bar {
      background-color: #6B4C93;
      color: white;
      padding: 15px 20px;
      text-align: center;
      font-weight: bold;
      font-size: 14pt;
      margin: 10px 0;
    }
    
    /* Comments Section - RED borders */
    .comments-section {
      border: 2px solid #FF0000;
      margin-top: 20px;
    }
    
    .comment-row {
      border-bottom: 2px solid #FF0000;
      padding: 15px;
      min-height: 80px;
      vertical-align: top;
    }
    
    .comment-row:last-child {
      border-bottom: none;
    }
    
    .comment-label {
      font-weight: bold;
      font-size: 10pt;
      margin-bottom: 8px;
    }
    
    .comment-text {
      font-size: 9pt;
      min-height: 50px;
    }
    
    /* Footer Section */
    .footer-section {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 20px;
      margin: 20px 0;
    }
    
    .footer-info {
      font-size: 9pt;
    }
    
    .footer-row {
      margin-bottom: 8px;
    }
    
    .footer-label {
      font-weight: bold;
      display: inline-block;
      min-width: 140px;
    }
    
    .school-stamp {
      border: 2px solid #000000;
      border-radius: 50%;
      width: 120px;
      height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9pt;
      color: #666;
      text-align: center;
      margin: 0 auto;
    }
    
    .school-motto {
      text-align: center;
      font-style: italic;
      font-size: 11pt;
      margin-top: 15px;
      font-family: 'Times New Roman', Georgia, serif;
    }
  </style>
</head>
<body>
  <div class="report-container">
    <!-- Header Section -->
    <div class="header">
      <div class="logo-box">
        ${schoolLogoBase64 ? 
          `<img src="${schoolLogoBase64}" alt="School Logo" class="logo" />` :
          '<span style="font-size: 8pt; color: #666;">LOGO</span>'
        }
      </div>
      <div class="school-info">
        <div class="school-name">${school.name}</div>
        <div class="school-contact">${school.address} | ${school.website} | ${school.email}</div>
        <div class="school-contact">Tel: ${school.phone}</div>
      </div>
    </div>
    
    <!-- Orange Horizontal Divider -->
    <div class="header-divider"></div>
    
    <!-- Report Title -->
    <div class="report-title">
      ${reportTitle}
    </div>
    
    <!-- Student Information Section -->
    <div class="student-info">
      <div class="student-info-grid">
        <div><span class="info-label">Reg No:</span> ${student.regNo}</div>
        <div><span class="info-label">Fees Bal:</span> ${student.feesBal}</div>
        <div><span class="info-label">CLASS:</span> ${student.class}</div>
        <div><span class="info-label">SchoolPay Code:</span> ${student.schoolPayCode}</div>
        <div><span class="info-label">NAME:</span> ${student.name}</div>
        <div><span class="info-label">DAYS:</span> ATTENDED: ${student.daysAttended} / ABSENT: ${student.daysAbsent} / TOTAL: ${student.totalDays}</div>
      </div>
      
      <div class="student-photo-box">
        ${studentPhotoBase64 ? 
          `<img src="${studentPhotoBase64}" alt="Student Photo" class="student-photo" />` :
          '<div class="student-photo-placeholder">STUDENT<br>PHOTO</div>'
        }
      </div>
    </div>
    
    <!-- Achievement Scores Section -->
    <div class="achievement-scores-header">
      Achievement Scores in the 5 Learning Areas
    </div>
    
    <table class="achievement-table">
      <thead>
        <tr>
          <th class="area-column area-header">AREA</th>
          <th class="score-column">ACHIEVEMENT SCORE</th>
          <th class="position-column">POSITION</th>
          <th class="comments-column comments-header">COMMENTS</th>
          <th class="signature-column">SIGNATURE</th>
        </tr>
      </thead>
      <tbody>
        ${learningAreasRows}
      </tbody>
    </table>
    
    <!-- Summary Bar -->
    <div class="summary-bar">
      TOTAL: ${summary.total} &nbsp;&nbsp; SCORED: ${summary.scored} &nbsp;&nbsp; POSITION: ${formatOrdinal(summary.position)} OUT OF ${summary.outOf}
    </div>
    
    <!-- Comments Section with RED borders -->
    <div class="comments-section">
      <div class="comment-row">
        <div class="comment-label">Class Teacher's Report</div>
        <div class="comment-text">${comments.classTeacher.report}</div>
      </div>
      
      <div class="comment-row">
        <div class="comment-label">Behaviors / Cleanliness</div>
        <div class="comment-text">${comments.behaviorsAndCleanliness.report}</div>
      </div>
      
      <div class="comment-row">
        <div class="comment-label">Head Teachers Comment</div>
        <div class="comment-text">${comments.headTeacher.comment}</div>
      </div>
    </div>
    
    <!-- Footer Section -->
    <div class="footer-section">
      <div class="footer-info">
        <div class="footer-row">
          <span class="footer-label">Date of Issue:</span> ${footer.dateOfIssue}
        </div>
        <div class="footer-row">
          <span class="footer-label">Next Term Begins:</span> ${footer.nextTermBegins}
        </div>
        <div class="footer-row">
          <span class="footer-label">School Requirements:</span> ${footer.requirements}
        </div>
      </div>
      
      <div>
        <div class="school-stamp">
          SCHOOL<br>STAMP
        </div>
      </div>
    </div>
    
    <!-- School Motto -->
    <div class="school-motto">
      School Motto: '${school.motto}'
    </div>
  </div>
</body>
</html>
  `;
}
