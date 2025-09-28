-- Insert default templates for all schools to use
-- These templates have school_id = NULL to indicate they are global defaults

INSERT INTO report_templates (school_id, name, html_content, css_content, is_default) VALUES
(
  NULL, -- Global default template
  'Default Template 1 - O-Level Format',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Student Report</title>
  <link href="https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: ''Times New Roman'', ''Times'', serif;
      width: 210mm;
      min-height: 297mm;
      margin: 0;
      padding: 15mm;
      box-sizing: border-box;
      background: white;
      color: black;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    
    .school-logo {
      width: 200px;
      height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border: none;
      flex-shrink: 0;
    }
    
    .school-logo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border: none;
    }
    
    .school-info {
      text-align: right;
      flex: 1;
    }
    
    .school-name {
      font-weight: bold;
      font-size: 18pt;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    
    .school-contact {
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .school-motto {
      font-size: 11pt;
      font-weight: bold;
      font-style: italic;
    }
    
    .report-title {
      text-align: center;
      margin: 20px 0;
      font-size: 14pt;
      font-weight: bold;
      text-transform: uppercase;
    }
    
    .student-meta {
      margin-bottom: 20px;
      font-size: 11pt;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    
    .student-info {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
    }
    
    .student-photo {
      width: 80px;
      height: 96px;
      border: 2px solid #ccc;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }
    
    .student-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 10pt;
    }
    
    th, td {
      border: 1px solid #000;
      padding: 4px;
      text-align: left;
    }
    
    th {
      background: #f0f0f0;
      color: black;
      font-weight: bold;
      text-align: center;
    }
    
    .center {
      text-align: center;
    }
    
    .summary {
      margin: 20px 0;
      padding: 15px;
      background: #f5f5f5;
      border: 1px solid #ddd;
      font-size: 10pt;
    }
    
    .comments {
      margin: 20px 0;
      padding: 15px;
      background: #f9f9f9;
      border: 1px solid #ddd;
      font-size: 10pt;
    }
    
    .comments h3 {
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.1;
      z-index: -1;
      pointer-events: none;
    }
    
    .watermark img {
      width: 900px;
      height: 900px;
      object-fit: contain;
    }
    
    .watermark-placeholder {
      width: 900px;
      height: 900px;
      border: 2px solid #ccc;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f0f0f0;
      font-size: 108pt;
      font-weight: bold;
      color: #ccc;
      text-align: center;
      line-height: 1.2;
    }
  </style>
</head>
<body>
  <!-- WATERMARK -->
  <div class="watermark">
    <div class="watermark-placeholder">SCHOOL<br/>LOGO</div>
  </div>
  
  <!-- HEADER -->
  <div class="header">
    <!-- School Logo -->
    <div class="school-logo">
      <div style="text-align: center; font-size: 8px; display: flex; flex-direction: column; justify-content: center; height: 100%;"><div style="font-weight: bold;">SCHOOL</div><div style="font-weight: bold;">LOGO</div></div>
    </div>
    
    <!-- School Info -->
    <div class="school-info">
      <div class="school-name">[SCHOOL_NAME]</div>
      <div class="school-contact">TEL: [SCHOOL_PHONE] | EMAIL: [SCHOOL_EMAIL] | [SCHOOL_ADDRESS]</div>
      <div class="school-motto">SCHOOL MOTTO: [SCHOOL_MOTTO]</div>
    </div>
  </div>

  <!-- TITLE -->
  <div class="report-title">
    LEARNER''S END OF TERM REPORT CARD FOR TERM [TERM], [YEAR]
  </div>

  <!-- STUDENT META -->
  <div class="student-meta">
    <div class="student-info">
      <div><strong>LNo.</strong> [STUDENT_ID]</div>
      <div><strong>NAME:</strong> [STUDENT_NAME]</div>
      <div><strong>CLASS & STREAM:</strong> [STUDENT_CLASS]</div>
    </div>
    
    <!-- Student Photo -->
    <div class="student-photo">
      <div style="font-size: 10px; color: #666; display: flex; align-items: center; justify-content: center; height: 100%; border: 1px solid #ddd; background: #f9f9f9;">PHOTO</div>
    </div>
  </div>

  <!-- ATTENDANCE TABLE -->
  <table>
    <thead>
      <tr>
        <th>Days Present</th>
        <th>Days Absent</th>
        <th>Total</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="center">[DAYS_PRESENT]</td>
        <td class="center">[DAYS_ABSENT]</td>
        <td class="center">[TOTAL_DAYS]</td>
      </tr>
    </tbody>
  </table>

  <!-- SUBJECTS TABLE -->
  <table>
    <thead>
      <tr>
        <th>SUBJECT</th>
        <th>FORMATIVE SCORE [20%]</th>
        <th>EOY SUMMATIVE ASSESSMENT (80%)</th>
        <th>TOTAL (100%)</th>
        <th>GRADE</th>
        <th>LEVEL OF ACHIEVEMENT/3</th>
        <th>DESCRIPTOR</th>
        <th>TR''S INITIAL</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>[SUBJECT_1]</td>
        <td class="center">[FORMATIVE_1]</td>
        <td class="center">[EXAM_1]</td>
        <td class="center">[TOTAL_1]</td>
        <td class="center">[GRADE_1]</td>
        <td class="center">[ACHIEVEMENT_1]</td>
        <td class="center">[DESCRIPTOR_1]</td>
        <td class="center">[INITIALS_1]</td>
      </tr>
    </tbody>
  </table>

  <!-- PERFORMANCE SUMMARY -->
  <div class="summary">
    <p><strong>AVERAGE SCORES:</strong> [AVERAGE_SCORE] [OVERALL_GRADE]</p>
    <p><strong>OVERALL PERFORMANCE:</strong> [PERFORMANCE_REMARK]</p>
  </div>

  <!-- COMMENTS -->
  <div class="comments">
    <h3>Class Teacher''s Comment</h3>
    <p>[TEACHER_COMMENT]</p>
    <p>Name: [TEACHER_NAME] | Signature: __________ | Date: [DATE]</p>

    <h3>Head Teacher''s Comment</h3>
    <p>[HEAD_TEACHER_COMMENT]</p>
    <p>Name: [HEAD_TEACHER_NAME] | Signature: __________ | Date: [DATE]</p>
  </div>
</body>
</html>',
  '',
  true
),
(
  NULL, -- Global default template
  'Default Template 2 - St. Adrian Kasozi Format',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Student Report</title>
  <link href="https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: ''Times New Roman'', ''Times'', serif;
      width: 210mm;
      min-height: 297mm;
      margin: 0;
      padding: 15mm;
      box-sizing: border-box;
      background: white;
      color: black;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    
    .school-logo {
      width: 200px;
      height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border: none;
      flex-shrink: 0;
    }
    
    .school-logo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border: none;
    }
    
    .school-info {
      text-align: right;
      flex: 1;
    }
    
    .school-name {
      font-weight: bold;
      font-size: 18pt;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    
    .school-contact {
      font-size: 9pt;
      font-weight: normal;
      margin-bottom: 5px;
    }
    
    .school-motto {
      font-size: 10pt;
      font-weight: normal;
      font-style: italic;
      margin-bottom: 5px;
    }
    
    .report-title {
      text-align: center;
      margin: 20px 0;
      font-size: 14pt;
      font-weight: bold;
      text-transform: uppercase;
      color: black;
    }
    
    .student-info {
      margin-bottom: 20px;
      font-size: 11pt;
    }
    
    .student-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 15px;
    }
    
    .student-photo {
      width: 80px;
      height: 96px;
      border: 2px solid #ccc;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      float: right;
      margin-left: 20px;
    }
    
    .student-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 10pt;
    }
    
    th, td {
      border: 1px solid #000;
      padding: 4px;
      text-align: left;
    }
    
    th {
      background: #f0f0f0;
      color: black;
      font-weight: bold;
      text-align: center;
    }
    
    .center {
      text-align: center;
    }
    
    .summary {
      margin: 20px 0;
      padding: 15px;
      background: #f5f5f5;
      border: 1px solid #ddd;
      font-size: 10pt;
    }
    
    .comments {
      margin: 20px 0;
      padding: 15px;
      background: #f9f9f9;
      border: 1px solid #ddd;
      font-size: 10pt;
    }
    
    .comments h3 {
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.1;
      z-index: -1;
      pointer-events: none;
    }
    
    .watermark img {
      width: 900px;
      height: 900px;
      object-fit: contain;
    }
    
    .watermark-placeholder {
      width: 900px;
      height: 900px;
      border: 2px solid #ccc;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f0f0f0;
      font-size: 108pt;
      font-weight: bold;
      color: #ccc;
      text-align: center;
      line-height: 1.2;
    }
  </style>
</head>
<body>
  <!-- WATERMARK -->
  <div class="watermark">
    <div class="watermark-placeholder">SCHOOL<br/>LOGO</div>
  </div>
  
  <!-- HEADER -->
  <div class="header">
    <!-- School Logo -->
    <div class="school-logo">
      <div style="text-align: center; font-size: 8px; display: flex; flex-direction: column; justify-content: center; height: 100%;"><div style="font-weight: bold;">ST. ADRIAN</div><div style="font-weight: bold;">KASOZI</div><div style="font-weight: bold;">SECONDARY</div><div style="font-weight: bold;">SCHOOL</div></div>
    </div>
    
    <!-- School Info -->
    <div class="school-info">
      <div class="school-name">[SCHOOL_NAME]</div>
      <div class="school-motto">"[SCHOOL_MOTTO]"</div>
      <div class="school-contact">P.O BOX 10 KALISIZO (U), [SCHOOL_EMAIL], [SCHOOL_PHONE]</div>
    </div>
  </div>

  <!-- REPORT TITLE -->
  <div class="report-title">
    O LEVEL TERMLY REPORT
  </div>

  <!-- STUDENT INFO -->
  <div class="student-info">
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div class="student-info-grid">
        <div><strong>Report Number:</strong> [STUDENT_ID]</div>
        <div><strong>Term:</strong> [TERM]</div>
        <div><strong>Name:</strong> [STUDENT_NAME]</div>
        <div><strong>Year:</strong> [YEAR]</div>
        <div><strong>Class:</strong> [STUDENT_CLASS]</div>
      </div>
      
      <!-- Student Photo -->
      <div class="student-photo">
        <div style="font-size: 10px; color: #666; display: flex; align-items: center; justify-content: center; height: 100%; border: 1px solid #ddd; background: #f9f9f9;">PHOTO</div>
      </div>
    </div>
  </div>

  <!-- SUBJECTS TABLE -->
  <table>
    <thead>
      <tr>
        <th>SUBJECT</th>
        <th>FORMATIVE SCORE [20%]</th>
        <th>EOY SUMMATIVE ASSESSMENT (80%)</th>
        <th>TOTAL (100%)</th>
        <th>GRADE</th>
        <th>LEVEL OF ACHIEVEMENT/3</th>
        <th>DESCRIPTOR</th>
        <th>TR''S INITIAL</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>[SUBJECT_1]</td>
        <td class="center">[FORMATIVE_1]</td>
        <td class="center">[EXAM_1]</td>
        <td class="center">[TOTAL_1]</td>
        <td class="center">[GRADE_1]</td>
        <td class="center">[ACHIEVEMENT_1]</td>
        <td class="center">[DESCRIPTOR_1]</td>
        <td class="center">[INITIALS_1]</td>
      </tr>
    </tbody>
  </table>

  <!-- PERFORMANCE SUMMARY -->
  <div class="summary">
    <p><strong>AVERAGE SCORES:</strong> [AVERAGE_SCORE] [OVERALL_GRADE]</p>
    <p><strong>OVERALL PERFORMANCE:</strong> [PERFORMANCE_REMARK]</p>
  </div>

  <!-- COMMENTS -->
  <div class="comments">
    <h3>Class Teacher''s Comment</h3>
    <p>[TEACHER_COMMENT]</p>
    <p>Name: [TEACHER_NAME] | Signature: __________ | Date: [DATE]</p>

    <h3>Head Teacher''s Comment</h3>
    <p>[HEAD_TEACHER_COMMENT]</p>
    <p>Name: [HEAD_TEACHER_NAME] | Signature: __________ | Date: [DATE]</p>
  </div>
</body>
</html>',
  '',
  true
),
(
  NULL, -- Global default template
  'Default Template 3 - Kyotera Parents Format',
  '<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Student Report</title>
  <link href="https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap" rel="stylesheet">
  <style>
    @page {
      size: A4;
      margin: 0;
    }
    
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: ''Times New Roman'', ''Times'', serif;
      width: 210mm;
      min-height: 297mm;
      margin: 0;
      padding: 15mm;
      box-sizing: border-box;
      background: white;
      color: black;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
    
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 30px;
    }
    
    .school-logo {
      width: 200px;
      height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      border: none;
      flex-shrink: 0;
    }
    
    .school-logo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border: none;
    }
    
    .school-info {
      text-align: right;
      flex: 1;
    }
    
    .school-name {
      font-weight: bold;
      font-size: 18pt;
      text-transform: uppercase;
      margin-bottom: 5px;
    }
    
    .school-contact {
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .school-motto {
      font-size: 11pt;
      font-weight: bold;
      font-style: italic;
    }
    
    .report-title {
      text-align: center;
      margin: 20px 0;
      font-size: 14pt;
      font-weight: bold;
      text-transform: uppercase;
    }
    
    .student-info {
      margin-bottom: 20px;
      font-size: 11pt;
    }
    
    .student-info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 15px;
    }
    
    .student-photo {
      width: 80px;
      height: 96px;
      border: 2px solid #ccc;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      float: right;
      margin-left: 20px;
    }
    
    .student-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      font-size: 10pt;
    }
    
    th, td {
      border: 1px solid #000;
      padding: 4px;
      text-align: left;
    }
    
    th {
      background: #f0f0f0;
      color: black;
      font-weight: bold;
      text-align: center;
    }
    
    .center {
      text-align: center;
    }
    
    .summary {
      margin: 20px 0;
      padding: 15px;
      background: #f5f5f5;
      border: 1px solid #ddd;
      font-size: 10pt;
    }
    
    .comments {
      margin: 20px 0;
      padding: 15px;
      background: #f9f9f9;
      border: 1px solid #ddd;
      font-size: 10pt;
    }
    
    .comments h3 {
      font-size: 11pt;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.1;
      z-index: -1;
      pointer-events: none;
    }
    
    .watermark img {
      width: 900px;
      height: 900px;
      object-fit: contain;
    }
    
    .watermark-placeholder {
      width: 900px;
      height: 900px;
      border: 2px solid #ccc;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f0f0f0;
      font-size: 108pt;
      font-weight: bold;
      color: #ccc;
      text-align: center;
      line-height: 1.2;
    }
  </style>
</head>
<body>
  <!-- WATERMARK -->
  <div class="watermark">
    <div class="watermark-placeholder">SCHOOL<br/>LOGO</div>
  </div>
  
  <!-- HEADER -->
  <div class="header">
    <!-- School Logo -->
    <div class="school-logo">
      <div style="text-align: center; font-size: 8px; display: flex; flex-direction: column; justify-content: center; height: 100%;"><div style="font-weight: bold;">SCHOOL</div><div style="font-weight: bold;">LOGO</div></div>
    </div>
    
    <!-- School Info -->
    <div class="school-info">
      <div class="school-name">[SCHOOL_NAME]</div>
      <div class="school-contact">P.O. BOX 12345, KAMPALA | TEL: [SCHOOL_PHONE] | EMAIL: [SCHOOL_EMAIL]</div>
      <div class="school-motto">MOTTO: "[SCHOOL_MOTTO]"</div>
    </div>
  </div>

  <!-- REPORT TITLE -->
  <div class="report-title">
    LEARNER''S END OF TERM REPORT CARD FOR TERM [TERM], [YEAR]
  </div>

  <!-- STUDENT INFO -->
  <div class="student-info">
    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
      <div class="student-info-grid">
        <div><strong>Report Number:</strong> [STUDENT_ID]</div>
        <div><strong>Term:</strong> [TERM]</div>
        <div><strong>Name:</strong> [STUDENT_NAME]</div>
        <div><strong>Year:</strong> [YEAR]</div>
        <div><strong>Class:</strong> [STUDENT_CLASS]</div>
      </div>
      
      <!-- Student Photo -->
      <div class="student-photo">
        <div style="font-size: 10px; color: #666; display: flex; align-items: center; justify-content: center; height: 100%; border: 1px solid #ddd; background: #f9f9f9;">PHOTO</div>
      </div>
    </div>
  </div>

  <!-- SUBJECTS TABLE -->
  <table>
    <thead>
      <tr>
        <th>SUBJECT</th>
        <th>AVG SCORE/20</th>
        <th>FINAL EXAM/80</th>
        <th>TOTAL SCORE 100%</th>
        <th>C1</th>
        <th>IDENTIFIER</th>
        <th>DESCRIPTOR</th>
        <th>INIT</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>[SUBJECT_1]</td>
        <td class="center">[AVG_SCORE_1]</td>
        <td class="center">[FINAL_EXAM_1]</td>
        <td class="center">[TOTAL_SCORE_1]</td>
        <td class="center">[C1_1]</td>
        <td class="center">[IDENTIFIER_1]</td>
        <td class="center">[DESCRIPTOR_1]</td>
        <td class="center">[INIT_1]</td>
      </tr>
    </tbody>
  </table>

  <!-- PERFORMANCE SUMMARY -->
  <div class="summary">
    <p><strong>AVERAGE SCORES:</strong> [AVERAGE_SCORE] [OVERALL_GRADE]</p>
    <p><strong>OVERALL PERFORMANCE:</strong> [PERFORMANCE_REMARK]</p>
  </div>

  <!-- COMMENTS -->
  <div class="comments">
    <h3>Class Teacher''s Comment</h3>
    <p>[TEACHER_COMMENT]</p>
    <p>Name: [TEACHER_NAME] | Signature: __________ | Date: [DATE]</p>

    <h3>Head Teacher''s Comment</h3>
    <p>[HEAD_TEACHER_COMMENT]</p>
    <p>Name: [HEAD_TEACHER_NAME] | Signature: __________ | Date: [DATE]</p>
  </div>
</body>
</html>',
  '',
  true
);

-- Update RLS policies to allow access to global default templates
CREATE POLICY "Users can view global default templates" ON report_templates
  FOR SELECT USING (
    school_id IS NULL OR 
    school_id IN (
      SELECT school_id FROM users WHERE user_id = auth.uid()
    )
  );
