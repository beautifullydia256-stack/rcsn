/**
 * O-Level built-in report HTML: verbatim from commit d082d5b
 * app/api/reports/generate-pdf/route.ts (lines 572-1760).
 * Used for senior secondary preview/PDF only; primary/nursery uses separate layouts.
 */

export function generateTemplate1OLevelHTML(reportData: any, schoolLogoBase64?: string | null, studentPhotoBase64?: string | null) {
  const { school, examSet, students } = reportData;
  const student = students[0];
  const attendance = student.summary.attendanceDetails || {};
  const daysPresent = attendance.presentDays ?? '';
  const totalDays = attendance.totalSchoolDays ?? '';
  const daysAbsent = (typeof totalDays === 'number' && typeof daysPresent === 'number') ? Math.max(totalDays - daysPresent, 0) : '';
  const avg = student.summary.average ?? '';
  const avgGrade = student.summary.division ?? '';
  const overallPerf = student.summary.performanceRemark ?? '';

  // O-Level calculation functions (matching exam results page logic)
  const calculateDescriptor = (activityScore: number): "Missed" | "Moderate" | "Outstanding" => {
    if (activityScore < 1) return "Missed";
    if (activityScore < 2.5) return "Moderate";
    return "Outstanding";
  };

  const calculateGrade = (finalScore: number): "A"|"B"|"C"|"D"|"E" => {
    if (finalScore >= 80) return "A";
    if (finalScore >= 70) return "B";
    if (finalScore >= 60) return "C";
    if (finalScore >= 50) return "D";
    return "E";
  };

  return `
    <!DOCTYPE html>
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
          font-family: 'Times New Roman', 'Times', serif;
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
          margin-bottom: 12px;
        }
        
        .school-logo {
          width: 200px;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: none;
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
        
        .report-title {
          background: #4CAF50;
          color: white;
          text-align: center;
          padding: 8px;
          margin: 12px 0;
          font-size: 12.5pt;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .student-info {
          margin-bottom: 12px;
          font-size: 11pt;
        }
        
        .student-info div {
          margin-bottom: 5px;
        }
        
        .student-info strong {
          font-weight: bold;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
          font-size: 9.5pt;
        }
        
        th, td {
          border: 1px solid #000;
          padding: 4px;
          text-align: left;
        }
        
        th {
          background: #4CAF50;
          color: white;
          font-weight: bold;
          text-align: center;
        }
        
        .center {
          text-align: center;
        }
        
        .summary {
          margin-bottom: 10px;
          font-size: 10.5pt;
        }
        
        .summary p {
          margin-bottom: 5px;
        }
        
        .summary strong {
          font-weight: bold;
        }
        
        .comments {
          margin-bottom: 12px;
          font-size: 10pt;
        }
        
        .comments h3 {
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .comments p {
          margin-bottom: 5px;
        }
        
        .next-term {
          margin-bottom: 20px;
          font-size: 11pt;
        }
        
        .next-term strong {
          font-weight: bold;
        }
        
        .grading-system {
          margin-bottom: 20px;
        }
        
        .grading-system h3 {
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .grading-system p {
          font-size: 10pt;
          font-weight: bold;
          margin-bottom: 10px;
        }
        
        .description-table th {
          background: #f0f0f0;
          color: black;
        }
        
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 9pt;
          margin-top: 20px;
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
        ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Watermark" />` : '<div class="watermark-placeholder">SCHOOL<br/>LOGO</div>'}
      </div>
      
      <!-- HEADER - School Logo and Info -->
      <div class="header">
        <!-- School Logo -->
        <div class="school-logo">
          ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Logo" />` : '<div style="text-align: center; font-size: 8px; display: flex; flex-direction: column; justify-content: center; height: 100%;"><div style="font-weight: bold;">SCHOOL</div><div style="font-weight: bold;">LOGO</div></div>'}
        </div>
        
        <!-- School Name and Contact -->
        <div class="school-info">
          <div class="school-name">${school?.name || 'EMIRATES COLLEGE SCHOOL'}</div>
          <div class="school-contact">TEL :: ${school?.phone || '0701395594'} | EMAIL :: ${school?.email || 'info@emiratescollege.sc.ug'} | ${school?.address || 'P.O.BOX 31175, KAMPALA, UGANDA'}</div>
          <div class="school-motto">SCHOOL MOTTO: ${school?.motto || 'Education the Future'}</div>
        </div>
        
      </div>

      <!-- REPORT TITLE -->
      <div class="report-title">
        LEARNER'S END OF TERM REPORT CARD FOR TERM ${examSet?.term || '2'}, ${examSet?.year || '2025'}
      </div>

      <!-- Student Info and Photo - Side by side -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
        <!-- LEARNER INFO - Left side -->
        <div class="student-info" style="margin-bottom: 0;">
          <div><strong>LNo.:</strong> ${student.admission_number || student.student_id}</div>
          <div><strong>NAME:</strong> ${student.name}</div>
          <div><strong>CLASS & STREAM:</strong> ${student.current_class}</div>
        </div>
        
        <!-- Student Photo - Right side -->
        <div class="student-photo">
          ${studentPhotoBase64 ? `<img src="${studentPhotoBase64}" alt="Student Photo" />` : '<div style="font-size: 10px; color: #666; display: flex; align-items: center; justify-content: center; height: 100%; border: 1px solid #ddd; background: #f9f9f9;">STUDENT<br/>PHOTO</div>'}
        </div>
      </div>

      <!-- SUBJECTS TABLE -->
      <table>
        <thead>
          <tr>
            <th>Subjects & Topics Covered</th>
            <th>Activity Score [3]</th>
            <th>Descriptor</th>
            <th>Formative Score [20%]</th>
            <th>Exam Score [80%]</th>
            <th>Final Score [100%]</th>
            <th>Grade</th>
            <th>Overall Remark</th>
            <th>Subject Teacher</th>
          </tr>
        </thead>
        <tbody>
          ${(student.results || []).length > 0 ? 
            (student.results || []).map((result: any) => {
              const activity = result.activity_score ?? '';
              const activityNum = parseFloat(activity) || 0;
              const descriptor = result.descriptor || (activityNum < 1 ? 'Missed' : activityNum < 2.5 ? 'Moderate' : 'Outstanding');
              const formative = result.formative_score ?? '';
              const exam = result.exam_score ?? '';
              const finalScore = result.final_score ?? '';
              const finalNum = parseFloat(finalScore) || 0;
              const gradeText = result.grade || (finalNum >= 80 ? 'A' : finalNum >= 70 ? 'B' : finalNum >= 60 ? 'C' : finalNum >= 50 ? 'D' : 'E');
              const overallRemark = result.overall_remark ?? '';
              const teacherInitials = result.teacher_initials ?? '';
              const topic = result.topic || '';

              return `
                <tr>
                  <td>
                    <strong>${result.subject}</strong>
                    <div style="font-size: 9pt; line-height: 1.2; margin-top: 2px;">
                      ${topic}
                    </div>
                  </td>
                  <td class="center">${activity}</td>
                  <td class="center">${descriptor}</td>
                  <td class="center">${formative}</td>
                  <td class="center">${exam}</td>
                  <td class="center">${finalScore}</td>
                  <td class="center">${gradeText}</td>
                  <td style="font-size: 9pt;">${overallRemark}</td>
                  <td class="center">${teacherInitials}</td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="9" class="center" style="color: #555;">N/A - Student did not sit for this term</td>
              </tr>
            `
          }
        </tbody>
      </table>

      <!-- COMMENTS (Reworked per request) -->
      <div class="comments">
        <h3>Class Teacher's Comment</h3>
        <div style="height: 60px; border-bottom: 1px solid #000; margin-bottom: 8px;"></div>
        <p>Name: ${student.comments?.class_teacher_name || ''} | Signature: ____________________</p>

        <h3>Head Teacher's Comment</h3>
        <div style="height: 60px; border-bottom: 1px solid #000; margin-bottom: 8px;"></div>
        <p>Name: ${student.comments?.head_teacher_name || ''} | Signature: ____________________</p>
      </div>

      <!-- Grading system & descriptions -->
      <div class="grading-system">
        <h3>Grading System</h3>
        <p><strong>80 - A | 70 - B | 50 - C | 40 - D | 0 - E</strong></p>
        
        <h3>Description</h3>
        <table class="description-table">
          <thead>
            <tr>
              <th>Grade</th>
              <th>Achievement Level</th>
              <th>Descriptor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>A</td>
              <td>Exceptional</td>
              <td>Demonstrates an extraordinary level of competence by applying innovatively and creatively the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td>B</td>
              <td>Outstanding</td>
              <td>Demonstrates a high level of competence by applying the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td>C</td>
              <td>Satisfactory</td>
              <td>Demonstrates an adequate level of competence by applying the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td>D</td>
              <td>Basic</td>
              <td>Demonstrates a minimum level of competence in applying the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td>E</td>
              <td>Elementary</td>
              <td>Demonstrates below the basic level of competence in applying the acquired knowledge and skills in real life situations</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div>Printed from: Pwezacore</div>
        <div>School Motto: '${school?.motto || 'Education the Future'}'</div>
      </div>
    </body>
    </html>
  `;
}

export function generateTemplate2KasoziHTML(reportData: any, schoolLogoBase64?: string | null, studentPhotoBase64?: string | null) {
  const { school, examSet, students } = reportData;
  const student = students[0];
  const attendance = student.summary.attendanceDetails || {};
  const daysPresent = attendance.presentDays ?? '';
  const totalDays = attendance.totalSchoolDays ?? '';
  const daysAbsent = (typeof totalDays === 'number' && typeof daysPresent === 'number') ? Math.max(totalDays - daysPresent, 0) : '';
  const avg = student.summary.average ?? '';
  const avgGrade = student.summary.division ?? '';
  const overallPerf = student.summary.performanceRemark ?? '';

  return `
    <!DOCTYPE html>
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
          font-family: 'Times New Roman', 'Times', serif;
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
          padding: 6px;
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
          margin-bottom: 20px;
          font-size: 11pt;
        }
        
        .summary p {
          margin-bottom: 5px;
        }
        
        .summary strong {
          font-weight: bold;
        }
        
        .comments {
          margin-bottom: 20px;
          font-size: 10pt;
        }
        
        .comments h3 {
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .comments p {
          margin-bottom: 5px;
        }
        
        .footer {
          text-align: center;
          font-size: 9pt;
          margin-top: 20px;
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
        ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Watermark" />` : '<div class="watermark-placeholder">SCHOOL<br/>LOGO</div>'}
      </div>
      
      <!-- HEADER -->
      <div class="header">
        <!-- School Logo -->
        <div class="school-logo">
          ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Logo" />` : '<div style="text-align: center; font-size: 8px; display: flex; flex-direction: column; justify-content: center; height: 100%;"><div style="font-weight: bold;">ST. ADRIAN</div><div style="font-weight: bold;">KASOZI</div><div style="font-weight: bold;">SECONDARY</div><div style="font-weight: bold;">SCHOOL</div></div>'}
        </div>
        
        <!-- School Info -->
        <div class="school-info">
          <div class="school-name">${school?.name || 'ST. ADRIAN KASOZI SECONDARY SCHOOL'}</div>
          <div class="school-motto">"${school?.motto || 'WITH GOD, WE CAN'}"</div>
          <div class="school-contact">P.O BOX 10 KALISIZO (U), ${school?.email || 'st.adriankasozisec@gmail.com'}, ${school?.phone || '0772/754-642058'}</div>
        </div>
      </div>

      <!-- REPORT TITLE -->
      <div class="report-title">
        MIDDLE & TOP CLASS - TERMLY REPORT
      </div>

      <!-- STUDENT INFO -->
      <div class="student-info">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div class="student-info-grid">
            <div><strong>Report Number:</strong> ${student.admission_number || student.student_id}</div>
            <div><strong>Term:</strong> ${examSet?.term || 'THREE'}</div>
            <div><strong>Name:</strong> ${student.name}</div>
            <div><strong>Year:</strong> ${examSet?.year || '2022'}</div>
            <div><strong>Class:</strong> ${student.current_class}</div>
          </div>
          
          <!-- Student Photo -->
          <div class="student-photo">
            ${studentPhotoBase64 ? `<img src="${studentPhotoBase64}" alt="Student Photo" />` : '<div style="font-size: 10px; color: #666; display: flex; align-items: center; justify-content: center; height: 100%; border: 1px solid #ddd; background: #f9f9f9;">PHOTO</div>'}
          </div>
        </div>
      </div>

      <!-- SUBJECTS TABLE -->
      <table>
        <thead>
          <tr>
            <th>SUBJECT</th>
            <th>FULL MARKS</th>
            <th>MID TERM</th>
            <th>END OF TERM</th>
            <th>TEACHER'S REMARKS</th>
            <th>INITIALS</th>
          </tr>
        </thead>
        <tbody>
          ${(student.results || []).length > 0 ? 
            (() => {
              // Group results by subject for processed data
              const all = Array.isArray(student.results) ? student.results : [];
              const isMid = (name: any) => {
                const n = String(name || '').trim().toLowerCase();
                return n === 'mid term' || n === 'midterm' || n.includes('mid') || n.includes('mid-term');
              };
              const isEnd = (name: any) => {
                const n = String(name || '').trim().toLowerCase();
                return n === 'end of term' || n === 'end of term' || n.includes('end') || n.includes('final') || n.includes('eot');
              };
              
              const subjectGroups: { [key: string]: { mid?: any; end?: any; subject: string; total_marks: number; remarks: string; initials: string } } = {};
              
              all.forEach((r: any) => {
                const subject = r.subject ?? '';
                const examSetName = r.exam_set_name || '';
                
                if (!subjectGroups[subject]) {
                  subjectGroups[subject] = {
                    subject,
                    total_marks: r.total_marks ?? 100,
                    remarks: '',
                    initials: ''
                  };
                }
                
                if (isMid(examSetName)) {
                  subjectGroups[subject].mid = r.grade === 'MISSED' ? 'MISSED' : (r.marks_obtained ?? '');
                  // Use Mid Term results for remarks and initials if End of Term not available
                  if (!subjectGroups[subject].remarks) {
                    subjectGroups[subject].remarks = r.teacher_remark || '';
                    subjectGroups[subject].initials = r.teacher_initials ?? '';
                  }
                } else if (isEnd(examSetName)) {
                  subjectGroups[subject].end = r.grade === 'MISSED' ? 'MISSED' : (r.marks_obtained ?? '');
                  // Use pre-processed teacher remarks from the processed table
                  subjectGroups[subject].remarks = r.teacher_remark || '';
                  subjectGroups[subject].initials = r.teacher_initials ?? '';
                }
              });
              
              // If no remarks found from any exam set, use any available remarks
              Object.values(subjectGroups).forEach((group: any) => {
                if (!group.remarks) {
                  const anyResult = all.find((r: any) => r.subject === group.subject);
                  if (anyResult) {
                    group.remarks = anyResult.teacher_remark || '';
                    group.initials = anyResult.teacher_initials ?? '';
                  }
                }
              });
              
              const subjects = Object.values(subjectGroups);
              
              return subjects.map((group, idx) => `
                <tr>
                  <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">${group.subject}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${group.total_marks}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${group.mid ?? ''}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${group.end ?? ''}</td>
                  <td style="border: 1px solid #000; padding: 6px;">${group.remarks}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${group.initials}</td>
                </tr>
              `).join('');
            })() : `
              <tr>
                <td colspan="6" style="border: 1px solid #000; padding: 8px; text-align: center; color: #555;">No results available</td>
              </tr>
            `
          }
        </tbody>
      </table>

      <!-- PERFORMANCE SUMMARY -->
      <div class="summary">
        <p><strong>AVERAGE SCORES:</strong> ${avg} ${avgGrade}</p>
        <p><strong>OVERALL PERFORMANCE:</strong> ${overallPerf}</p>
      </div>

      <!-- COMMENTS -->
      <div class="comments">
        <h3><strong>Class Teacher's Comment:</strong> ${student.results && student.results.length > 0 ? student.results[0].class_teacher_comment || 'Student is progressing well but needs to focus more on specific subjects for better results.' : 'Student is progressing well but needs to focus more on specific subjects for better results.'}</h3>
        <p>Signature: ______________________</p>

        <h3><strong>Head Teacher's Comment:</strong> ${student.results && student.results.length > 0 ? student.results[0].headteacher_comment || 'Student needs to engage the subject teachers to assist in topics which were not properly grasped. There is potential for improvement.' : 'Student needs to engage the subject teachers to assist in topics which were not properly grasped. There is potential for improvement.'}</h3>
        <p>Signature: ______________________</p>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div>Printed from: Pwezacore</div>
        <div>School Motto: '${school?.motto || 'Excellence Through Discipline'}'</div>
      </div>
    </body>
    </html>
  `;
}

export function generateTemplate3KyoteraHTML(reportData: any, schoolLogoBase64?: string | null, studentPhotoBase64?: string | null) {
  const { school, examSet, students } = reportData;
  const student = students[0];
  const attendance = student.summary.attendanceDetails || {};
  const avg = student.summary.average ?? '';
  const avgGrade = student.summary.division ?? '';
  const overallPerf = student.summary.performanceRemark ?? '';
  const totalFullMarks = (student.results || []).reduce((sum: number) => sum + 100, 0);

  // Calculate identifier based on grade/score (Template 3 specific)
  const getIdentifier = (score: number) => {
    if (score >= 80) return '3'; // Accomplished
    if (score >= 60) return '2'; // Moderate
    if (score >= 50) return '1'; // Basic
    return ''; // Blank for absent
  };

  return `
    <!DOCTYPE html>
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
          font-family: 'Times New Roman', 'Times', serif;
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
          font-size: 13pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .report-title {
          font-size: 12pt;
          font-weight: bold;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        
        .report-number {
          font-size: 10pt;
          margin-bottom: 20px;
        }
        
        .student-info {
          margin-bottom: 20px;
          font-size: 11pt;
        }
        
        .student-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
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
          font-size: 9pt;
        }
        
        th, td {
          border: 1px solid #000;
          padding: 4px;
          text-align: left;
        }
        
        th {
          background: #f0f0f0;
          font-weight: bold;
          text-align: center;
        }
        
        .center {
          text-align: center;
        }
        
        .summary {
          margin-bottom: 20px;
          font-size: 11pt;
        }
        
        .summary strong {
          font-weight: bold;
        }
        
        .comments {
          margin-bottom: 20px;
          font-size: 10pt;
        }
        
        .comments h3 {
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .comments p {
          margin-bottom: 5px;
        }
        
        .next-term {
          margin-bottom: 20px;
          font-size: 11pt;
        }
        
        .next-term p {
          margin-bottom: 5px;
        }
        
        .footer {
          text-align: center;
          font-size: 9pt;
          margin-top: 20px;
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
        ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Watermark" />` : '<div class="watermark-placeholder">SCHOOL<br/>LOGO</div>'}
      </div>
      
      <!-- HEADER -->
      <div class="header">
        <!-- School Logo -->
        <div class="school-logo">
          ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Logo" />` : '<div style="text-align: center; font-size: 8px; display: flex; flex-direction: column; justify-content: center; height: 100%;"><div style="font-weight: bold;">KYOTERA</div><div style="font-weight: bold;">PARENTS\'</div><div style="font-weight: bold;">SECONDARY</div><div style="font-weight: bold;">SCHOOL</div></div>'}
        </div>
        
        <!-- School Info -->
        <div class="school-info">
          <div class="school-name">${school?.name || 'KYOTERA PARENTS\' SECONDARY SCHOOL'}</div>
          <div class="school-contact">
            ${school?.address || 'P.O.BOX 11, Kyotera- Uganda'} | 
            Tel: ${school?.phone || '0701861636 / 0700338061'} | 
            E-mail: ${school?.email || 'kasumbaj2009@gmail.com'}
          </div>
          <div class="report-title">END OF TERM ONE STUDENT'S PROGRESSIVE REPORT</div>
          <div class="report-number">No. ${student.admission_number || student.student_id}</div>
        </div>
      </div>

      <!-- STUDENT INFO -->
      <div class="student-info">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div class="student-info-grid">
            <div><strong>STUDENT'S NAME:</strong> ${student.name}</div>
            <div><strong>YEAR:</strong> ${examSet?.year || '2025'}</div>
            <div><strong>STREAM:</strong> EAST</div>
            <div><strong>CLASS:</strong> ${student.current_class}</div>
            <div><strong>LIN:</strong> __________</div>
            <div><strong>Date:</strong> ${examSet?.date || '26/05/2025'}</div>
          </div>
          
          <!-- Student Photo -->
          <div class="student-photo">
            ${studentPhotoBase64 ? `<img src="${studentPhotoBase64}" alt="Student Photo" />` : '<div style="font-size: 10px; color: #666; display: flex; align-items: center; justify-content: center; height: 100%; border: 1px solid #ddd; background: #f9f9f9;">PHOTO</div>'}
          </div>
        </div>
      </div>

      <!-- SUBJECTS TABLE - LOWER SECTION (P.1 - P.3) -->
      <table style="width:100%; border-collapse:collapse; margin-bottom: 20px; font-size: 9pt;">
        <thead>
          <tr>
            <th style="border: 1px solid #000; padding: 6px; text-align: left;">SUBJECT</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">FULL MARKS</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">MID TERM</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">END OF TERM</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">TEACHER'S REMARKS</th>
            <th style="border: 1px solid #000; padding: 6px; text-align: center;">INITIALS</th>
          </tr>
        </thead>
        <tbody>
          ${ (() => {
            const all = Array.isArray(student.results) ? student.results : [];
            const isMid = (name: any) => {
              const n = String(name || '').trim().toLowerCase();
              return n === 'mid term' || n === 'midterm' || n.includes('mid') || n.includes('mid-term');
            };
            const isEnd = (name: any) => {
              const n = String(name || '').trim().toLowerCase();
              return n === 'end of term' || n === 'end of term' || n.includes('end') || n.includes('final') || n.includes('eot');
            };
            
            // Group results by subject
            const subjectGroups: { [key: string]: { mid?: any; end?: any; subject: string; total_marks: number; remarks: string; initials: string } } = {};
            
            all.forEach((r: any) => {
              const subject = r.subject ?? '';
              const examSetName = r.exam_sets?.name || r.exam_set_name || '';
              
              if (!subjectGroups[subject]) {
                subjectGroups[subject] = {
                  subject,
                  total_marks: r.total_marks ?? 100,
                  remarks: r.remarks || r.overall_remark || '',
                  initials: r.teacher_initials ?? ''
                };
              }
              
              if (isMid(examSetName)) {
                subjectGroups[subject].mid = r.marks_obtained ?? '';
              } else if (isEnd(examSetName)) {
                subjectGroups[subject].end = r.marks_obtained ?? '';
              }
            });
            
            const subjects = Object.values(subjectGroups);
            
            return subjects.length > 0 ? subjects.map((group) => `
              <tr>
                <td style="border: 1px solid #000; padding: 6px; font-weight: bold; text-align: left;">${group.subject}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${group.total_marks}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${group.mid ?? ''}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${group.end ?? ''}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: left;">${group.remarks}</td>
                <td style="border: 1px solid #000; padding: 6px; text-align: center;">${group.initials}</td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="6" style="border: 1px solid #000; padding: 8px; text-align: center; color: #555;">No results available</td>
              </tr>
            `;
          })()}
          <tr>
            <td style="border: 1px solid #000; padding: 6px; font-weight: bold; text-align: left;">TOTAL</td>
            <td style="border: 1px solid #000; padding: 6px; font-weight: bold; text-align: center;">${totalFullMarks}</td>
            <td style="border: 1px solid #000; padding: 6px;"></td>
            <td style="border: 1px solid #000; padding: 6px;"></td>
            <td style="border: 1px solid #000; padding: 6px;" colspan="2"></td>
          </tr>
        </tbody>
      </table>

      <!-- COMMENTS -->
      <div class="comments">
        <h3>Class Teacher's Comments:</h3>
        <p>${student.comments?.class_teacher_text || '..............................................................'}</p>
        <p>Signature: ______________________</p>

        <h3>Headteacher's Comments:</h3>
        <p>${student.comments?.head_teacher_text || '..............................................................'}</p>
        <p>Signature: ______________________</p>
      </div>

      <!-- NEXT TERM -->
      <div class="next-term">
        <p><strong>Next term begins on:</strong> ${student?.results?.[0]?.next_term_begins_date ? new Date(student.results[0].next_term_begins_date).toLocaleDateString() : '____________________'}</p>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div>Printed from: Pwezacore</div>
        <div>School Motto: '${school?.motto || 'Education the Future'}'</div>
      </div>
    </body>
    </html>
  `;
}