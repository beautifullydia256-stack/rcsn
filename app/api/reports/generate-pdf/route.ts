import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { calculateGrade, formatCurrency, getAttendanceDetails, formatValue, formatPercentage, formatAttendance, formatPosition } from '@/src/lib/reportUtils';

export async function POST(request: NextRequest) {
  try {
    const { reportData, type } = await request.json();

    if (type === 'single') {
      const pdf = await generateSingleReportPDF(reportData);
      const buffer = Buffer.from(pdf.output('arraybuffer'));
      
      const student = reportData.students[0];
      const filename = `${student.name}_${student.current_class}_Report_${reportData.examSet.name}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');
      
      return new NextResponse(buffer, {
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
        const pdf = await generateSingleReportPDF(studentReportData);
        const buffer = Buffer.from(pdf.output('arraybuffer'));
        const filename = `${student.name}_${student.current_class}_Report_${reportData.examSet.name}.pdf`.replace(/[^a-zA-Z0-9._-]/g, '_');
        zip.file(filename, buffer);
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
  const { school, examSet, students } = reportData;
  const student = students[0];

  const isSecondaryClass = (className: string) => /^S\d/i.test((className || '').trim());

  if (isSecondaryClass(student.current_class)) {
    return generateSecondaryReportPDF(reportData);
  }

  // Create A4 PDF (210mm x 297mm)
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - (2 * margin);
  let yPosition = margin;

  // Helper function to add text with word wrap
  const addText = (text: string, x: number, y: number, options: any = {}) => {
    const fontSize = options.fontSize || 10;
    const fontStyle = options.fontStyle || 'normal';
    const align = options.align || 'left';
    
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', fontStyle);
    
    const lines = pdf.splitTextToSize(text, contentWidth);
    pdf.text(lines, x, y, { align });
    
    return y + (lines.length * fontSize * 0.35) + (options.spacing || 5);
  };

  // Helper function to add centered text
  const addCenteredText = (text: string, y: number, options: any = {}) => {
    return addText(text, pageWidth / 2, y, { ...options, align: 'center' });
  };

  // Helper function to add table
  const addTable = (data: string[][], startY: number, columnWidths: number[]) => {
    let currentY = startY;
    const rowHeight = 8;
    const cellPadding = 2;

    data.forEach((row, rowIndex) => {
      let xPosition = margin;
      
      row.forEach((cell, colIndex) => {
        const cellWidth = (columnWidths[colIndex] / 100) * contentWidth;
        
        // Draw cell border
        pdf.rect(xPosition, currentY, cellWidth, rowHeight);
        
        // Add cell text
        const textLines = pdf.splitTextToSize(cell, cellWidth - (2 * cellPadding));
        const textY = currentY + (rowHeight / 2) + (textLines.length > 1 ? 2 : 3);
        
        pdf.setFontSize(8);
        pdf.text(textLines, xPosition + cellPadding, textY);
        
        xPosition += cellWidth;
      });
      
      currentY += rowHeight;
    });
    
    return currentY + 5;
  };

  // School Header
  yPosition = addCenteredText(school?.name || 'School Name', yPosition, { fontSize: 16, fontStyle: 'bold' });
  yPosition = addCenteredText(school?.motto || 'School Motto', yPosition, { fontSize: 12 });
  yPosition = addCenteredText(`${school?.address || 'School Address'} | Tel: ${school?.phone || 'Phone'} | Email: ${school?.email || 'Email'}`, yPosition, { fontSize: 10 });
  
  yPosition += 10;

  // Report Title
  yPosition = addCenteredText('STUDENT REPORT', yPosition, { fontSize: 14, fontStyle: 'bold' });
  yPosition += 5;

  // Student Information
  yPosition = addText('Student Information', margin, yPosition, { fontSize: 12, fontStyle: 'bold' });
  yPosition += 5;

  const studentInfo = [
    ['Name:', student.name],
    ['Admission No:', student.admission_number || student.student_id],
    ['Class:', student.current_class],
    ['Year:', examSet.year.toString()],
    ['Term:', examSet.term.toString()],
    ['Exam Set:', examSet.name]
  ];

  yPosition = addTable(studentInfo, yPosition, [30, 70]);
  yPosition += 10;

  // Subject Performance
  yPosition = addText('Subject Performance', margin, yPosition, { fontSize: 12, fontStyle: 'bold' });
  yPosition += 5;

  const subjectHeaders = ['Subject', 'Marks', 'Grade', 'Remarks'];
  const subjectData = [subjectHeaders];

  if (student.results.length > 0) {
    student.results.forEach((result: any) => {
      const gradeInfo = calculateGrade(result.marks_obtained, result.total_marks);
      subjectData.push([
        result.subject,
        `${result.marks_obtained}/${result.total_marks}`,
        gradeInfo.grade,
        gradeInfo.remark
      ]);
    });
  } else {
    subjectData.push(['N/A - Student did not sit for this exam set', '', '', '']);
  }

  yPosition = addTable(subjectData, yPosition, [40, 20, 20, 20]);
  yPosition += 10;

  // Summary
  yPosition = addText('Summary', margin, yPosition, { fontSize: 12, fontStyle: 'bold' });
  yPosition += 5;

  const summaryData = [
    ['Total Marks:', `${formatValue(student.summary.totalMarks)}/${formatValue(student.summary.totalPossibleMarks)}`],
    ['Average:', formatPercentage(student.summary.average)],
    ['Aggregate:', formatValue(student.summary.aggregate)],
    ['Division:', formatValue(student.summary.division)],
    ['Class Position:', formatPosition(student.summary.classPosition, student.summary.average)],
    ['Stream Position:', formatPosition(student.summary.streamPosition, student.summary.average)],
    ['Attendance:', formatAttendance(student.summary.attendanceDetails.presentDays, student.summary.attendanceDetails.totalSchoolDays, student.summary.attendancePercentage)],
    ['Performance:', formatValue(student.summary.performanceRemark)]
  ];

  yPosition = addTable(summaryData, yPosition, [40, 60]);
  yPosition += 10;

  // Remarks
  yPosition = addText('Remarks', margin, yPosition, { fontSize: 12, fontStyle: 'bold' });
  yPosition += 5;

  yPosition = addText('Class Teacher\'s Remarks:', margin, yPosition, { fontSize: 10, fontStyle: 'bold' });
  yPosition += 15;

  yPosition = addText('Head Teacher\'s Remarks:', margin, yPosition, { fontSize: 10, fontStyle: 'bold' });
  yPosition += 15;

  // Footer
  yPosition = addCenteredText('Printed from: Pwezacore', yPosition, { fontSize: 10 });

  return pdf;
}

async function generateSecondaryReportPDF(reportData: any) {
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

  // Create A4 PDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - (2 * margin);
  let yPosition = margin;

  // Helper functions (same as primary report)
  const addText = (text: string, x: number, y: number, options: any = {}) => {
    const fontSize = options.fontSize || 10;
    const fontStyle = options.fontStyle || 'normal';
    const align = options.align || 'left';
    
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', fontStyle);
    
    const lines = pdf.splitTextToSize(text, contentWidth);
    pdf.text(lines, x, y, { align });
    
    return y + (lines.length * fontSize * 0.35) + (options.spacing || 5);
  };

  const addCenteredText = (text: string, y: number, options: any = {}) => {
    return addText(text, pageWidth / 2, y, { ...options, align: 'center' });
  };

  const addTable = (data: string[][], startY: number, columnWidths: number[]) => {
    let currentY = startY;
    const rowHeight = 8;
    const cellPadding = 2;

    data.forEach((row, rowIndex) => {
      let xPosition = margin;
      
      row.forEach((cell, colIndex) => {
        const cellWidth = (columnWidths[colIndex] / 100) * contentWidth;
        
        pdf.rect(xPosition, currentY, cellWidth, rowHeight);
        
        const textLines = pdf.splitTextToSize(cell, cellWidth - (2 * cellPadding));
        const textY = currentY + (rowHeight / 2) + (textLines.length > 1 ? 2 : 3);
        
        pdf.setFontSize(8);
        pdf.text(textLines, xPosition + cellPadding, textY);
        
        xPosition += cellWidth;
      });
      
      currentY += rowHeight;
    });
    
    return currentY + 5;
  };

  // Header
  yPosition = addCenteredText(school?.name || 'School Name', yPosition, { fontSize: 16, fontStyle: 'bold' });
  yPosition = addCenteredText(`TEL: ${school?.phone || 'Phone'} | EMAIL: ${school?.email || 'Email'} | ${school?.address || 'Address'}`, yPosition, { fontSize: 10 });
  yPosition = addCenteredText(`SCHOOL MOTTO: ${school?.motto || 'Education the Future'}`, yPosition, { fontSize: 10, fontStyle: 'italic' });

  yPosition += 10;

  // Title
  yPosition = addCenteredText(`LEARNER'S END OF TERM REPORT CARD FOR TERM ${examSet?.term || ''}, ${examSet?.year || ''}`, yPosition, { fontSize: 14, fontStyle: 'bold' });
  yPosition += 5;

  // Student Meta
  yPosition = addText(`LNo. ${student.admission_number || student.student_id}    NAME: ${student.name}    CLASS & STREAM: ${student.current_class}`, margin, yPosition, { fontSize: 10 });
  yPosition += 5;

  // Attendance Table
  const attendanceData = [
    ['Days Present', 'Days Absent', 'Total'],
    [daysPresent, daysAbsent, totalDays]
  ];
  yPosition = addTable(attendanceData, yPosition, [33, 33, 34]);
  yPosition += 5;

  // Subjects Table
  const subjectHeaders = ['Subjects & Topics', 'Activity [3]', 'Descriptor', 'Formative (20%)', 'Exam (80%)', 'Final (100%)', 'Grade', 'Overall Remark', 'Teacher'];
  const subjectData = [subjectHeaders];

  if (student.results.length > 0) {
    student.results.forEach((result: any) => {
      const gradeInfo = calculateGrade(result.marks_obtained, result.total_marks);
      const activity = result.activity_score != null ? String(result.activity_score) : 'N/A';
      const descriptor = result.descriptor ?? gradeInfo.remark ?? 'N/A';
      const formative = result.formative_score != null ? String(result.formative_score) : 'N/A';
      const exam = result.exam_score != null ? String(result.exam_score) : 'N/A';
      const finalScore = result.final_score != null ? String(result.final_score) : (result.total_marks ? String(Math.round((result.marks_obtained / result.total_marks) * 100)) : 'N/A');
      const gradeText = result.grade ?? gradeInfo.grade ?? 'N/A';
      const overallRemark = result.overall_remark ?? gradeInfo.remark ?? 'N/A';
      const teacherName = result.teacher_name ?? '-';

      subjectData.push([
        result.subject,
        activity,
        descriptor,
        formative,
        exam,
        finalScore,
        gradeText,
        overallRemark,
        teacherName
      ]);
    });
  } else {
    subjectData.push(['N/A - Student did not sit for this term', '', '', '', '', '', '', '', '']);
  }

  yPosition = addTable(subjectData, yPosition, [20, 10, 15, 10, 10, 10, 8, 12, 5]);
  yPosition += 10;

  // Performance Summary
  yPosition = addText(`AVERAGE SCORES: ${avg} ${avgGrade}`, margin, yPosition, { fontSize: 10, fontStyle: 'bold' });
  yPosition = addText(`OVERALL PERFORMANCE: ${overallPerf}`, margin, yPosition, { fontSize: 10, fontStyle: 'bold' });
  yPosition += 5;

  // Projects Table
  const projectHeaders = ['Subject', 'Project Title', 'Remark', 'Score', 'Teacher'];
  const projectData = [projectHeaders];

  if (projects.length > 0) {
    projects.forEach((p: any) => {
      projectData.push([
        String(p.subject ?? 'N/A'),
        String(p.project_title ?? 'N/A'),
        String(p.remark ?? 'N/A'),
        p.score != null ? String(p.score) : 'N/A',
        String(p.teacher ?? 'N/A')
      ]);
    });
  } else {
    projectData.push(['N/A', 'N/A', 'N/A', 'N/A', 'N/A']);
  }

  yPosition = addTable(projectData, yPosition, [25, 35, 20, 10, 10]);
  yPosition += 10;

  // Comments
  yPosition = addText("Class Teacher's Comment", margin, yPosition, { fontSize: 10, fontStyle: 'bold' });
  yPosition = addText(String(comments?.class_teacher_text ?? '..............................................................'), margin, yPosition, { fontSize: 9 });
  yPosition = addText(`Name: ${String(comments?.class_teacher_name ?? '__________')} | Signature: ${String(comments?.class_teacher_signature ?? '__________')} | Date: ${String(comments?.class_teacher_date ?? '__________')}`, margin, yPosition, { fontSize: 9 });
  yPosition += 5;

  yPosition = addText("Head Teacher's Comment", margin, yPosition, { fontSize: 10, fontStyle: 'bold' });
  yPosition = addText(String(comments?.head_teacher_text ?? '..............................................................'), margin, yPosition, { fontSize: 9 });
  yPosition = addText(`Name: ${String(comments?.head_teacher_name ?? '__________')} | Signature: ${String(comments?.head_teacher_signature ?? '__________')} | Date: ${String(comments?.head_teacher_date ?? '__________')}`, margin, yPosition, { fontSize: 9 });
  yPosition += 10;

  // Next Term & Grading
  yPosition = addText(`Next Term Begins: ${nextTermBegins}`, margin, yPosition, { fontSize: 10, fontStyle: 'bold' });
  yPosition = addText('Grading System', margin, yPosition, { fontSize: 10, fontStyle: 'bold' });
  yPosition = addText('A (80–100) | B (70–79) | C (50–69) | D (40–49) | E (0–39)', margin, yPosition, { fontSize: 9 });
  yPosition += 5;

  yPosition = addText('Grade Descriptions', margin, yPosition, { fontSize: 10, fontStyle: 'bold' });
  yPosition = addText('A: Excellent mastery and application of concepts.', margin, yPosition, { fontSize: 9 });
  yPosition = addText('B: Very good understanding with minor gaps.', margin, yPosition, { fontSize: 9 });
  yPosition = addText('C: Satisfactory performance with notable room for improvement.', margin, yPosition, { fontSize: 9 });
  yPosition = addText('D: Below average; needs significant improvement.', margin, yPosition, { fontSize: 9 });
  yPosition = addText('E: Poor performance; urgent intervention required.', margin, yPosition, { fontSize: 9 });
  yPosition += 10;

  // Footer
  yPosition = addCenteredText('Printed from: Pwezacore', yPosition, { fontSize: 10 });

  return pdf;
}
