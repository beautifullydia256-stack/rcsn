import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import JSZip from 'jszip';
import { calculateGrade, formatCurrency, getAttendanceDetails, formatValue, formatPercentage, formatAttendance, formatPosition } from '@/src/lib/reportUtils';

export async function POST(request: NextRequest) {
  try {
    console.log('PDF generation request received');
    const { reportData, type } = await request.json();
    console.log('Report data received, type:', type);

    if (type === 'single') {
      const pdfBuffer = await generateSingleReportPDF(reportData);
      
      const student = reportData.students[0];
      const filename = `${student.name}_${student.current_class}_Report_${reportData.examSet.name}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');
      
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    } else if (type === 'class') {
      const zip = new JSZip();
      
      for (const student of reportData.students) {
        const studentReportData = {
          ...reportData,
          students: [student]
        };
        const pdfBuffer = await generateSingleReportPDF(studentReportData);
        const filename = `${student.name}_${student.current_class}_Report_${reportData.examSet.name}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');
        zip.file(filename, pdfBuffer);
      }
      
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });
      const classFilename = `${reportData.students[0].current_class}_Reports_${reportData.examSet.name}.zip`.replace(/[^a-zA-Z0-9._-]/g, '_');
      
      return new NextResponse(zipBuffer as any, {
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${classFilename}"`
        }
      });
    }

    return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
  } catch (error) {
    console.error('Error generating PDF report:', error);
    return NextResponse.json({ error: 'Failed to generate PDF report' }, { status: 500 });
  }
}

async function generateSingleReportPDF(reportData: any) {
  console.log('Starting PDF generation for student:', reportData.students[0]?.name);
  const { school, examSet, students } = reportData;
  const student = students[0];

  const isSecondaryClass = (className: string) => /^S\d/i.test((className || '').trim());
  const isOLevelClass = (className: string) => {
    const trimmed = (className || '').trim();
    return /^(senior\s*[1-4]|s\s*[1-4])/i.test(trimmed);
  };

  // Generate HTML content based on class type
  let htmlContent = '';
  
  if (isSecondaryClass(student.current_class)) {
    console.log('Generating Secondary report HTML');
    htmlContent = generateSecondaryReportHTML(reportData);
  } else if (isOLevelClass(student.current_class)) {
    console.log('Generating O-Level report HTML');
    htmlContent = generateOLevelReportHTML(reportData);
  } else {
    console.log('Generating Primary report HTML');
    htmlContent = generatePrimaryReportHTML(reportData);
  }
  
  console.log('HTML content generated, length:', htmlContent.length);

  // Launch Puppeteer
  console.log('Launching Puppeteer browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });
  console.log('Puppeteer browser launched successfully');

  try {
    console.log('Creating new page...');
    const page = await browser.newPage();
    
    // Set viewport for consistent rendering
    await page.setViewport({ width: 1200, height: 800 });
    console.log('Viewport set');
    
    // Set content and wait for images to load
    console.log('Setting page content...');
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    });
    console.log('Page content set successfully');
    
    // Generate PDF with A4 settings
    console.log('Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '15mm',
        right: '15mm',
        bottom: '15mm',
        left: '15mm'
      },
      preferCSSPageSize: true,
      timeout: 30000
    });
    console.log('PDF generated successfully, buffer size:', pdfBuffer.length);

    return pdfBuffer;
  } catch (error) {
    console.error('Puppeteer PDF generation error:', error);
    throw error;
  } finally {
    console.log('Closing browser...');
    await browser.close();
  }
}

function generateOLevelReportHTML(reportData: any) {
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
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        
        body {
          font-family: 'Times New Roman', Arial, sans-serif;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 15mm;
          box-sizing: border-box;
          background: white;
          color: black;
        }
        
        .header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 20px;
        }
        
        .school-logo {
          width: 80px;
          height: 80px;
          border: 2px solid #ccc;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          background: #f0f0f0;
        }
        
        .school-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .school-info {
          text-align: center;
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
          margin-bottom: 5px;
        }
        
        .school-motto {
          font-size: 9pt;
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
          padding: 10px;
          margin: 20px 0;
          font-size: 13pt;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .student-info {
          margin-bottom: 20px;
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
          margin-bottom: 20px;
          font-size: 10pt;
        }
        
        th, td {
          border: 1px solid #000;
          padding: 6px;
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
      </style>
    </head>
    <body>
      <!-- HEADER - School Logo and Info -->
      <div class="header">
        <!-- School Logo -->
        <div class="school-logo">
          ${school?.logo ? `<img src="${school.logo}" alt="School Logo">` : `
            <div style="text-align: center; font-size: 8px;">
              <div style="font-weight: bold;">EMIRATES</div>
              <div style="font-weight: bold;">COLLEGE</div>
              <div style="font-weight: bold;">SCHOOL</div>
            </div>
          `}
        </div>
        
        <!-- School Name and Contact -->
        <div class="school-info">
          <div class="school-name">${school?.name || 'EMIRATES COLLEGE SCHOOL'}</div>
          <div class="school-contact">TEL :: ${school?.phone || '0701395594'} | EMAIL :: ${school?.email || 'info@emiratescollege.sc.ug'} | ${school?.address || 'P.O.BOX 31175, KAMPALA, UGANDA'}</div>
          <div class="school-motto">SCHOOL MOTTO: ${school?.motto || 'Education the Future'}</div>
        </div>
        
        <!-- Student Photo -->
        <div class="student-photo">
          ${student.profile_photo ? `<img src="${student.profile_photo}" alt="Student Photo">` : `
            <div style="font-size: 10px; color: #666;">Photo</div>
          `}
        </div>
      </div>

      <!-- REPORT TITLE -->
      <div class="report-title">
        LEARNER'S END OF TERM REPORT CARD FOR TERM ${examSet?.term || '2'}, ${examSet?.year || '2025'}
      </div>

      <!-- LEARNER INFO -->
      <div class="student-info">
        <div><strong>LNo.:</strong> ${student.admission_number || student.student_id}</div>
        <div><strong>NAME:</strong> ${student.name}</div>
        <div><strong>CLASS & STREAM:</strong> ${student.current_class}</div>
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
          ${student.results.length > 0 ? 
            student.results.map((result: any) => {
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

      <!-- PERFORMANCE SUMMARY -->
      <div class="summary">
        <p><strong>AVERAGE SCORES:</strong> ${avg} ${avgGrade}</p>
        <p><strong>OVERALL PERFORMANCE:</strong> ${overallPerf}</p>
      </div>

      <!-- COMMENTS -->
      <div class="comments">
        <h3>Class Teacher's Comment</h3>
        <p>${student.comments?.class_teacher_text || 'Shafic is progressing well but needs to focus more on specific subject for better results.'}</p>
        <p>Name: ${student.comments?.class_teacher_name || '__________'} | Signature: ${student.comments?.class_teacher_signature || '__________'} | Date: ${student.comments?.class_teacher_date || '17 September, 2025'}</p>

        <h3>Head Teacher's Comment</h3>
        <p>${student.comments?.head_teacher_text || 'Shafic needs to engage the subject teachers to assist in topics which were not properly grasped. There is potential for improvement.'}</p>
        <p>Name: ${student.comments?.head_teacher_name || 'NAKIYINGI MARIAM'} | Signature: ${student.comments?.head_teacher_signature || '__________'} | Date: ${student.comments?.head_teacher_date || '17 September, 2025'}</p>
      </div>

      <div class="next-term">
        <strong>Next Term Begins:</strong> ${student?.nextTermBegins || 'Saturday, 13 September, 2025'}
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

function generateSecondaryReportHTML(reportData: any) {
  const { school, examSet, students } = reportData;
  const student = students[0];
  const nextTermBegins = student?.nextTermBegins || reportData?.nextTermBegins || '______________________';

  const attendance = student.summary.attendanceDetails || {};
  const daysPresent = attendance.presentDays != null ? String(attendance.presentDays) : 'N/A';
  const totalDays = attendance.totalSchoolDays != null ? String(attendance.totalSchoolDays) : 'N/A';
  const daysAbsent = (attendance.presentDays != null && attendance.totalSchoolDays != null)
    ? String(Math.max(attendance.totalSchoolDays - attendance.presentDays, 0))
    : 'N/A';

  const avg = student.summary.average != null ? String(student.summary.average) : 'N/A';
  const avgGrade = student.summary.division != null ? String(student.summary.division) : 'N/A';
  const overallPerf = student.summary.performanceRemark != null ? String(student.summary.performanceRemark) : 'N/A';
  const projects = Array.isArray(student.projects) ? student.projects : [];
  const comments = student.comments || null;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Student Report</title>
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        
        body {
          font-family: 'Times New Roman', Arial, sans-serif;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 15mm;
          box-sizing: border-box;
          background: white;
          color: black;
        }
        
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .school-name {
          font-weight: bold;
          font-size: 18pt;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        
        .school-contact {
          font-size: 10pt;
          margin-bottom: 5px;
        }
        
        .school-motto {
          font-size: 10pt;
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
          font-size: 10pt;
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
          font-size: 10pt;
        }
        
        .next-term strong {
          font-weight: bold;
        }
        
        .grading-system {
          margin-bottom: 20px;
          font-size: 10pt;
        }
        
        .grading-system h3 {
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .grading-system p {
          margin-bottom: 5px;
        }
        
        .footer {
          text-align: center;
          font-size: 9pt;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <!-- HEADER -->
      <div class="header">
        <div class="school-name">${school?.name || 'School Name'}</div>
        <div class="school-motto">"${school?.motto || 'Education the Future'}"</div>
        <div class="school-contact">TEL: ${school?.phone || 'Phone'} | EMAIL: ${school?.email || 'Email'} | ${school?.address || 'Address'}</div>
      </div>

      <!-- TITLE -->
      <div class="report-title">
        LEARNER'S END OF TERM REPORT CARD FOR TERM ${examSet?.term || ''}, ${examSet?.year || ''}
      </div>

      <!-- STUDENT META -->
      <div class="student-meta">
        <div class="student-photo">
          ${student.profile_photo ? `<img src="${student.profile_photo}" alt="Student Photo">` : `
            <div style="font-size: 10px; color: #666;">Photo</div>
          `}
        </div>
        <div>LNo. ${student.admission_number || student.student_id}    NAME: ${student.name}    CLASS & STREAM: ${student.current_class}</div>
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
            <td class="center">${daysPresent}</td>
            <td class="center">${daysAbsent}</td>
            <td class="center">${totalDays}</td>
          </tr>
        </tbody>
      </table>

      <!-- SUBJECTS TABLE -->
      <table>
        <thead>
          <tr>
            <th>Subjects & Topics</th>
            <th>Activity [3]</th>
            <th>Descriptor</th>
            <th>Formative (20%)</th>
            <th>Exam (80%)</th>
            <th>Final (100%)</th>
            <th>Grade</th>
            <th>Overall Remark</th>
            <th>Teacher</th>
          </tr>
        </thead>
        <tbody>
          ${student.results.length > 0 ? 
            student.results.map((result: any) => {
              const activity = result.activity_score != null ? String(result.activity_score) : 'N/A';
              const descriptor = result.descriptor ?? 'N/A';
              const formative = result.formative_score != null ? String(result.formative_score) : 'N/A';
              const exam = result.exam_score != null ? String(result.exam_score) : 'N/A';
              const finalScore = result.final_score != null ? String(result.final_score) : (result.total_marks ? String(Math.round((result.marks_obtained / result.total_marks) * 100)) : 'N/A');
              const gradeText = result.grade ?? 'N/A';
              const overallRemark = result.overall_remark ?? 'N/A';
              const teacherName = result.teacher_name ?? '-';

              return `
                <tr>
                  <td><strong>${result.subject}</strong></td>
                  <td class="center">${activity}</td>
                  <td class="center">${descriptor}</td>
                  <td class="center">${formative}</td>
                  <td class="center">${exam}</td>
                  <td class="center">${finalScore}</td>
                  <td class="center">${gradeText}</td>
                  <td>${overallRemark}</td>
                  <td class="center">${teacherName}</td>
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

      <!-- PERFORMANCE SUMMARY -->
      <div class="summary">
        <p><strong>AVERAGE SCORES:</strong> ${avg} ${avgGrade}</p>
        <p><strong>OVERALL PERFORMANCE:</strong> ${overallPerf}</p>
      </div>

      <!-- PROJECTS TABLE -->
      <table>
        <thead>
          <tr>
            <th>Subject</th>
            <th>Project Title</th>
            <th>Remark</th>
            <th>Score</th>
            <th>Teacher</th>
          </tr>
        </thead>
        <tbody>
          ${projects.length > 0 ? 
            projects.map((p: any) => `
              <tr>
                <td>${p.subject ?? 'N/A'}</td>
                <td>${p.project_title ?? 'N/A'}</td>
                <td>${p.remark ?? 'N/A'}</td>
                <td class="center">${p.score != null ? String(p.score) : 'N/A'}</td>
                <td>${p.teacher ?? 'N/A'}</td>
              </tr>
            `).join('') : `
              <tr>
                <td class="center">N/A</td>
                <td class="center">N/A</td>
                <td class="center">N/A</td>
                <td class="center">N/A</td>
                <td class="center">N/A</td>
              </tr>
            `
          }
        </tbody>
      </table>

      <!-- COMMENTS -->
      <div class="comments">
        <h3>Class Teacher's Comment</h3>
        <p>${comments?.class_teacher_text ?? '..............................................................'}</p>
        <p>Name: ${comments?.class_teacher_name ?? '__________'} | Signature: ${comments?.class_teacher_signature ?? '__________'} | Date: ${comments?.class_teacher_date ?? '__________'}</p>

        <h3>Head Teacher's Comment</h3>
        <p>${comments?.head_teacher_text ?? '..............................................................'}</p>
        <p>Name: ${comments?.head_teacher_name ?? '__________'} | Signature: ${comments?.head_teacher_signature ?? '__________'} | Date: ${comments?.head_teacher_date ?? '__________'}</p>
      </div>

      <!-- NEXT TERM & GRADING -->
      <div class="next-term">
        <strong>Next Term Begins:</strong> ${nextTermBegins}
      </div>

      <div class="grading-system">
        <h3>Grading System</h3>
        <p><strong>A (80–100) | B (70–79) | C (50–69) | D (40–49) | E (0–39)</strong></p>
        
        <h3>Grade Descriptions</h3>
        <p>A: Excellent mastery and application of concepts.</p>
        <p>B: Very good understanding with minor gaps.</p>
        <p>C: Satisfactory performance with notable room for improvement.</p>
        <p>D: Below average; needs significant improvement.</p>
        <p>E: Poor performance; urgent intervention required.</p>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        Printed from: Pwezacore
      </div>
    </body>
    </html>
  `;
}

function generatePrimaryReportHTML(reportData: any) {
  const { school, examSet, students } = reportData;
  const student = students[0];

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Student Report</title>
      <style>
        @page {
          size: A4;
          margin: 15mm;
        }
        
        body {
          font-family: 'Times New Roman', Arial, sans-serif;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 15mm;
          box-sizing: border-box;
          background: white;
          color: black;
        }
        
        .header {
          text-align: center;
          margin-bottom: 20px;
        }
        
        .school-name {
          font-weight: bold;
          font-size: 16pt;
          margin-bottom: 10px;
        }
        
        .school-motto {
          font-size: 12pt;
          margin-bottom: 5px;
        }
        
        .school-contact {
          font-size: 10pt;
        }
        
        .report-title {
          text-align: center;
          margin: 20px 0;
          font-size: 14pt;
          font-weight: bold;
        }
        
        .section-title {
          font-size: 12pt;
          font-weight: bold;
          margin: 20px 0 10px 0;
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
          font-weight: bold;
          text-align: center;
        }
        
        .center {
          text-align: center;
        }
        
        .footer {
          text-align: center;
          font-size: 10pt;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <!-- School Header -->
      <div class="header">
        <div class="school-name">${school?.name || 'School Name'}</div>
        <div class="school-motto">${school?.motto || 'School Motto'}</div>
        <div class="school-contact">${school?.address || 'School Address'} | Tel: ${school?.phone || 'Phone'} | Email: ${school?.email || 'Email'}</div>
      </div>

      <!-- Report Title -->
      <div class="report-title">STUDENT REPORT</div>

      <!-- Student Information -->
      <div class="section-title">Student Information</div>
      <table>
        <tr>
          <td><strong>Name:</strong></td>
          <td>${student.name}</td>
        </tr>
        <tr>
          <td><strong>Admission No:</strong></td>
          <td>${student.admission_number || student.student_id}</td>
        </tr>
        <tr>
          <td><strong>Class:</strong></td>
          <td>${student.current_class}</td>
        </tr>
        <tr>
          <td><strong>Year:</strong></td>
          <td>${examSet.year}</td>
        </tr>
        <tr>
          <td><strong>Term:</strong></td>
          <td>${examSet.term}</td>
        </tr>
        <tr>
          <td><strong>Exam Set:</strong></td>
          <td>${examSet.name}</td>
        </tr>
      </table>

      <!-- Subject Performance -->
      <div class="section-title">Subject Performance</div>
      <table>
        <thead>
          <tr>
            <th>Subject</th>
            <th>Marks</th>
            <th>Grade</th>
            <th>Remarks</th>
            <th>Teacher Initials</th>
          </tr>
        </thead>
        <tbody>
          ${student.results.length > 0 ? 
            student.results.map((result: any) => {
              const gradeInfo = calculateGrade(result.marks_obtained, result.total_marks);
              return `
                <tr>
                  <td>${result.subject}</td>
                  <td class="center">${result.marks_obtained}/${result.total_marks}</td>
                  <td class="center">${gradeInfo.grade}</td>
                  <td class="center">${gradeInfo.remark}</td>
                  <td class="center">-</td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="5" class="center" style="color: #555;">N/A - Student did not sit for this exam set</td>
              </tr>
            `
          }
        </tbody>
      </table>

      <!-- Summary -->
      <div class="section-title">Summary</div>
      <table>
        <tr>
          <td><strong>Total Marks:</strong></td>
          <td>${formatValue(student.summary.totalMarks)}/${formatValue(student.summary.totalPossibleMarks)}</td>
        </tr>
        <tr>
          <td><strong>Average:</strong></td>
          <td>${formatPercentage(student.summary.average)}</td>
        </tr>
        <tr>
          <td><strong>Aggregate:</strong></td>
          <td>${formatValue(student.summary.aggregate)}</td>
        </tr>
        <tr>
          <td><strong>Division:</strong></td>
          <td>${formatValue(student.summary.division)}</td>
        </tr>
        <tr>
          <td><strong>Class Position:</strong></td>
          <td>${formatPosition(student.summary.classPosition, student.summary.average)}</td>
        </tr>
        <tr>
          <td><strong>Stream Position:</strong></td>
          <td>${formatPosition(student.summary.streamPosition, student.summary.average)}</td>
        </tr>
        <tr>
          <td><strong>Attendance:</strong></td>
          <td>${formatAttendance(student.summary.attendanceDetails.presentDays, student.summary.attendanceDetails.totalSchoolDays, student.summary.attendancePercentage)}</td>
        </tr>
        <tr>
          <td><strong>Performance:</strong></td>
          <td>${formatValue(student.summary.performanceRemark)}</td>
        </tr>
      </table>

      <!-- Remarks -->
      <div class="section-title">Remarks</div>
      <p><strong>Class Teacher's Remarks:</strong></p>
      <p>&nbsp;</p>
      <p>&nbsp;</p>
      <p>&nbsp;</p>
      <p><strong>Head Teacher's Remarks:</strong></p>
      <p>&nbsp;</p>
      <p>&nbsp;</p>
      <p>&nbsp;</p>

      <!-- Footer -->
      <div class="footer">Printed from: Pwezacore</div>
    </body>
    </html>
  `;
}
