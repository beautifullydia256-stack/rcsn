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
  const isOLevelClass = (className: string) => {
    const trimmed = (className || '').trim();
    return /^(senior\s*[1-4]|s\s*[1-4])/i.test(trimmed);
  };

  if (isSecondaryClass(student.current_class)) {
    return generateSecondaryReportPDF(reportData);
  }

  if (isOLevelClass(student.current_class)) {
    return generateOLevelReportPDF(reportData);
  }

  // Default primary report
  return generatePrimaryReportPDF(reportData);
}

async function generateOLevelReportPDF(reportData: any) {
  const { school, examSet, students } = reportData;
  const student = students[0];
  const attendance = student.summary.attendanceDetails || {};
  const daysPresent = attendance.presentDays ?? '';
  const totalDays = attendance.totalSchoolDays ?? '';
  const daysAbsent = (typeof totalDays === 'number' && typeof daysPresent === 'number') ? Math.max(totalDays - daysPresent, 0) : '';
  const avg = student.summary.average ?? '';
  const avgGrade = student.summary.division ?? '';
  const overallPerf = student.summary.performanceRemark ?? '';

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

  // Helper functions
  const addText = (text: string, x: number, y: number, options: any = {}) => {
    const fontSize = options.fontSize || 10;
    const fontStyle = options.fontStyle || 'normal';
    const align = options.align || 'left';
    const color = options.color || '#000000';
    
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', fontStyle);
    pdf.setTextColor(color);
    
    const lines = pdf.splitTextToSize(text, contentWidth);
    pdf.text(lines, x, y, { align });
    
    return y + (lines.length * fontSize * 0.35) + (options.spacing || 5);
  };

  const addCenteredText = (text: string, y: number, options: any = {}) => {
    return addText(text, pageWidth / 2, y, { ...options, align: 'center' });
  };

  const addTable = (data: string[][], startY: number, columnWidths: number[], options: any = {}) => {
    let currentY = startY;
    const rowHeight = options.rowHeight || 8;
    const cellPadding = options.cellPadding || 2;
    const fontSize = options.fontSize || 8;
    const headerBg = options.headerBg || '#4CAF50';
    const headerTextColor = options.headerTextColor || '#FFFFFF';

    data.forEach((row, rowIndex) => {
      let xPosition = margin;
      
      row.forEach((cell, colIndex) => {
        const cellWidth = (columnWidths[colIndex] / 100) * contentWidth;
        
        // Draw cell border
        pdf.rect(xPosition, currentY, cellWidth, rowHeight);
        
        // Add background color for header
        if (rowIndex === 0) {
          pdf.setFillColor(headerBg);
          pdf.rect(xPosition, currentY, cellWidth, rowHeight, 'F');
        }
        
        // Add cell text
        const textLines = pdf.splitTextToSize(cell, cellWidth - (2 * cellPadding));
        const textY = currentY + (rowHeight / 2) + (textLines.length > 1 ? 2 : 3);
        
        pdf.setFontSize(fontSize);
        if (rowIndex === 0) {
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(headerTextColor);
        } else {
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor('#000000');
        }
        pdf.text(textLines, xPosition + cellPadding, textY);
        
        xPosition += cellWidth;
      });
      
      currentY += rowHeight;
    });
    
    return currentY + 5;
  };

  const checkPageBreak = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // HEADER - School Logo and Info
  yPosition += 5;

  // School Name (centered)
  yPosition = addCenteredText(school?.name || 'EMIRATES COLLEGE SCHOOL', yPosition, { fontSize: 18, fontStyle: 'bold' });
  
  // Contact Info
  yPosition = addCenteredText(`TEL :: ${school?.phone || '0701395594'} | EMAIL :: ${school?.email || 'info@emiratescollege.sc.ug'} | ${school?.address || 'P.O.BOX 31175, KAMPALA, UGANDA'}`, yPosition, { fontSize: 9 });
  
  // School Motto
  yPosition = addCenteredText(`SCHOOL MOTTO: ${school?.motto || 'Education the Future'}`, yPosition, { fontSize: 9, fontStyle: 'italic' });
  
  yPosition += 10;

  // REPORT TITLE with green background
  checkPageBreak(15);
  pdf.setFillColor('#4CAF50');
  pdf.rect(margin, yPosition, contentWidth, 15, 'F');
  yPosition = addCenteredText(`LEARNER'S END OF TERM REPORT CARD FOR TERM ${examSet?.term || '2'}, ${examSet?.year || '2025'}`, yPosition + 5, { fontSize: 13, fontStyle: 'bold', color: '#FFFFFF' });
  yPosition += 10;

  // LEARNER INFO
  yPosition = addText(`LNo.: ${student.admission_number || student.student_id}`, margin, yPosition, { fontSize: 11, fontStyle: 'bold' });
  yPosition = addText(`NAME: ${student.name}`, margin, yPosition, { fontSize: 11, fontStyle: 'bold' });
  yPosition = addText(`CLASS & STREAM: ${student.current_class}`, margin, yPosition, { fontSize: 11, fontStyle: 'bold' });
  yPosition += 5;

  // SUBJECTS TABLE
  const subjectHeaders = [
    'Subjects & Topics Covered',
    'Activity Score [3]',
    'Descriptor',
    'Formative Score [20%]',
    'Exam Score [80%]',
    'Final Score [100%]',
    'Grade',
    'Overall Remark',
    'Subject Teacher'
  ];
  
  const subjectData = [subjectHeaders];

  if (student.results.length > 0) {
    student.results.forEach((result: any) => {
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

      subjectData.push([
        `${result.subject}\n${topic}`,
        activity,
        descriptor,
        formative,
        exam,
        finalScore,
        gradeText,
        overallRemark,
        teacherInitials
      ]);
    });
  } else {
    subjectData.push(['N/A - Student did not sit for this term', '', '', '', '', '', '', '', '']);
  }

  checkPageBreak(subjectData.length * 12 + 20);
  yPosition = addTable(subjectData, yPosition, [25, 8, 10, 8, 8, 8, 6, 15, 8], { rowHeight: 12, fontSize: 7 });
  yPosition += 5;

  // PERFORMANCE SUMMARY
  yPosition = addText(`AVERAGE SCORES: ${avg} ${avgGrade}`, margin, yPosition, { fontSize: 11, fontStyle: 'bold' });
  yPosition = addText(`OVERALL PERFORMANCE: ${overallPerf}`, margin, yPosition, { fontSize: 11, fontStyle: 'bold' });
  yPosition += 5;

  // COMMENTS
  checkPageBreak(50);
  yPosition = addText("Class Teacher's Comment", margin, yPosition, { fontSize: 11, fontStyle: 'bold' });
  yPosition = addText(student.comments?.class_teacher_text || 'Shafic is progressing well but needs to focus more on specific subject for better results.', margin, yPosition, { fontSize: 10 });
  yPosition = addText(`Name: ${student.comments?.class_teacher_name || '__________'} | Signature: ${student.comments?.class_teacher_signature || '__________'} | Date: ${student.comments?.class_teacher_date || '17 September, 2025'}`, margin, yPosition, { fontSize: 10 });
  yPosition += 5;

  yPosition = addText("Head Teacher's Comment", margin, yPosition, { fontSize: 11, fontStyle: 'bold' });
  yPosition = addText(student.comments?.head_teacher_text || 'Shafic needs to engage the subject teachers to assist in topics which were not properly grasped. There is potential for improvement.', margin, yPosition, { fontSize: 10 });
  yPosition = addText(`Name: ${student.comments?.head_teacher_name || 'NAKIYINGI MARIAM'} | Signature: ${student.comments?.head_teacher_signature || '__________'} | Date: ${student.comments?.head_teacher_date || '17 September, 2025'}`, margin, yPosition, { fontSize: 10 });
  yPosition += 5;

  // NEXT TERM
  yPosition = addText(`Next Term Begins: ${student?.nextTermBegins || 'Saturday, 13 September, 2025'}`, margin, yPosition, { fontSize: 11, fontStyle: 'bold' });
  yPosition += 5;

  // GRADING SYSTEM
  yPosition = addText('Grading System', margin, yPosition, { fontSize: 11, fontStyle: 'bold' });
  yPosition = addText('80 - A | 70 - B | 50 - C | 40 - D | 0 - E', margin, yPosition, { fontSize: 10, fontStyle: 'bold' });
  yPosition += 5;

  // DESCRIPTION TABLE
  const descHeaders = ['Grade', 'Achievement Level', 'Descriptor'];
  const descData = [
    descHeaders,
    ['A', 'Exceptional', 'Demonstrates an extraordinary level of competence by applying innovatively and creatively the acquired knowledge and skills in real life situations'],
    ['B', 'Outstanding', 'Demonstrates a high level of competence by applying the acquired knowledge and skills in real life situations'],
    ['C', 'Satisfactory', 'Demonstrates an adequate level of competence by applying the acquired knowledge and skills in real life situations'],
    ['D', 'Basic', 'Demonstrates a minimum level of competence in applying the acquired knowledge and skills in real life situations'],
    ['E', 'Elementary', 'Demonstrates below the basic level of competence in applying the acquired knowledge and skills in real life situations']
  ];

  checkPageBreak(descData.length * 10 + 20);
  yPosition = addText('Description', margin, yPosition, { fontSize: 11, fontStyle: 'bold' });
  yPosition = addTable(descData, yPosition, [15, 20, 65], { rowHeight: 10, fontSize: 8, headerBg: '#f0f0f0', headerTextColor: '#000000' });
  yPosition += 5;

  // FOOTER
  yPosition = addText('Printed from: Pwezacore', margin, yPosition, { fontSize: 9 });
  yPosition = addText(`School Motto: '${school?.motto || 'Education the Future'}'`, pageWidth - margin - 50, yPosition, { fontSize: 9, align: 'right' });

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

  // Helper functions
  const addText = (text: string, x: number, y: number, options: any = {}) => {
    const fontSize = options.fontSize || 10;
    const fontStyle = options.fontStyle || 'normal';
    const align = options.align || 'left';
    const color = options.color || '#000000';
    
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', fontStyle);
    pdf.setTextColor(color);
    
    const lines = pdf.splitTextToSize(text, contentWidth);
    pdf.text(lines, x, y, { align });
    
    return y + (lines.length * fontSize * 0.35) + (options.spacing || 5);
  };

  const addCenteredText = (text: string, y: number, options: any = {}) => {
    return addText(text, pageWidth / 2, y, { ...options, align: 'center' });
  };

  const addTable = (data: string[][], startY: number, columnWidths: number[], options: any = {}) => {
    let currentY = startY;
    const rowHeight = options.rowHeight || 8;
    const cellPadding = options.cellPadding || 2;
    const fontSize = options.fontSize || 8;
    const headerBg = options.headerBg || '#f0f0f0';
    const headerTextColor = options.headerTextColor || '#000000';

    data.forEach((row, rowIndex) => {
      let xPosition = margin;
      
      row.forEach((cell, colIndex) => {
        const cellWidth = (columnWidths[colIndex] / 100) * contentWidth;
        
        pdf.rect(xPosition, currentY, cellWidth, rowHeight);
        
        // Add background color for header
        if (rowIndex === 0) {
          pdf.setFillColor(headerBg);
          pdf.rect(xPosition, currentY, cellWidth, rowHeight, 'F');
        }
        
        const textLines = pdf.splitTextToSize(cell, cellWidth - (2 * cellPadding));
        const textY = currentY + (rowHeight / 2) + (textLines.length > 1 ? 2 : 3);
        
        pdf.setFontSize(fontSize);
        if (rowIndex === 0) {
          pdf.setFont('helvetica', 'bold');
          pdf.setTextColor(headerTextColor);
        } else {
          pdf.setFont('helvetica', 'normal');
          pdf.setTextColor('#000000');
        }
        pdf.text(textLines, xPosition + cellPadding, textY);
        
        xPosition += cellWidth;
      });
      
      currentY += rowHeight;
    });
    
    return currentY + 5;
  };

  const checkPageBreak = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // HEADER
  yPosition = addCenteredText(school?.name || 'School Name', yPosition, { fontSize: 16, fontStyle: 'bold' });
  yPosition = addCenteredText(`TEL: ${school?.phone || 'Phone'} | EMAIL: ${school?.email || 'Email'} | ${school?.address || 'Address'}`, yPosition, { fontSize: 10 });
  yPosition = addCenteredText(`SCHOOL MOTTO: ${school?.motto || 'Education the Future'}`, yPosition, { fontSize: 10, fontStyle: 'italic' });

  yPosition += 10;

  // TITLE
  yPosition = addCenteredText(`LEARNER'S END OF TERM REPORT CARD FOR TERM ${examSet?.term || ''}, ${examSet?.year || ''}`, yPosition, { fontSize: 14, fontStyle: 'bold' });
  yPosition += 5;

  // STUDENT META
  yPosition = addText(`LNo. ${student.admission_number || student.student_id}    NAME: ${student.name}    CLASS & STREAM: ${student.current_class}`, margin, yPosition, { fontSize: 10 });
  yPosition += 5;

  // ATTENDANCE TABLE
  const attendanceData = [
    ['Days Present', 'Days Absent', 'Total'],
    [daysPresent, daysAbsent, totalDays]
  ];
  yPosition = addTable(attendanceData, yPosition, [33, 33, 34]);
  yPosition += 5;

  // SUBJECTS TABLE
  const subjectHeaders = ['Subjects & Topics', 'Activity [3]', 'Descriptor', 'Formative (20%)', 'Exam (80%)', 'Final (100%)', 'Grade', 'Overall Remark', 'Teacher'];
  const subjectData = [subjectHeaders];

  if (student.results.length > 0) {
    student.results.forEach((result: any) => {
      const activity = result.activity_score != null ? String(result.activity_score) : 'N/A';
      const descriptor = result.descriptor ?? 'N/A';
      const formative = result.formative_score != null ? String(result.formative_score) : 'N/A';
      const exam = result.exam_score != null ? String(result.exam_score) : 'N/A';
      const finalScore = result.final_score != null ? String(result.final_score) : (result.total_marks ? String(Math.round((result.marks_obtained / result.total_marks) * 100)) : 'N/A');
      const gradeText = result.grade ?? 'N/A';
      const overallRemark = result.overall_remark ?? 'N/A';
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

  checkPageBreak(subjectData.length * 10 + 20);
  yPosition = addTable(subjectData, yPosition, [20, 10, 15, 10, 10, 10, 8, 12, 5], { rowHeight: 10, fontSize: 7 });
  yPosition += 5;

  // PERFORMANCE SUMMARY
  yPosition = addText(`AVERAGE SCORES: ${avg} ${avgGrade}`, margin, yPosition, { fontSize: 10, fontStyle: 'bold' });
  yPosition = addText(`OVERALL PERFORMANCE: ${overallPerf}`, margin, yPosition, { fontSize: 10, fontStyle: 'bold' });
  yPosition += 5;

  // PROJECTS TABLE
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

  checkPageBreak(projectData.length * 8 + 20);
  yPosition = addTable(projectData, yPosition, [25, 35, 20, 10, 10], { rowHeight: 8, fontSize: 8 });
  yPosition += 5;

  // COMMENTS
  checkPageBreak(50);
  yPosition = addText("Class Teacher's Comment", margin, yPosition, { fontSize: 10, fontStyle: 'bold' });
  yPosition = addText(String(comments?.class_teacher_text ?? '..............................................................'), margin, yPosition, { fontSize: 9 });
  yPosition = addText(`Name: ${String(comments?.class_teacher_name ?? '__________')} | Signature: ${String(comments?.class_teacher_signature ?? '__________')} | Date: ${String(comments?.class_teacher_date ?? '__________')}`, margin, yPosition, { fontSize: 9 });
  yPosition += 5;

  yPosition = addText("Head Teacher's Comment", margin, yPosition, { fontSize: 10, fontStyle: 'bold' });
  yPosition = addText(String(comments?.head_teacher_text ?? '..............................................................'), margin, yPosition, { fontSize: 9 });
  yPosition = addText(`Name: ${String(comments?.head_teacher_name ?? '__________')} | Signature: ${String(comments?.head_teacher_signature ?? '__________')} | Date: ${String(comments?.head_teacher_date ?? '__________')}`, margin, yPosition, { fontSize: 9 });
  yPosition += 5;

  // NEXT TERM & GRADING
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
  yPosition += 5;

  // FOOTER
  yPosition = addCenteredText('Printed from: Pwezacore', yPosition, { fontSize: 10 });

  return pdf;
}

async function generatePrimaryReportPDF(reportData: any) {
  const { school, examSet, students } = reportData;
  const student = students[0];

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

  // Helper functions
  const addText = (text: string, x: number, y: number, options: any = {}) => {
    const fontSize = options.fontSize || 10;
    const fontStyle = options.fontStyle || 'normal';
    const align = options.align || 'left';
    const color = options.color || '#000000';
    
    pdf.setFontSize(fontSize);
    pdf.setFont('helvetica', fontStyle);
    pdf.setTextColor(color);
    
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

  const checkPageBreak = (requiredHeight: number) => {
    if (yPosition + requiredHeight > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
      return true;
    }
    return false;
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

  checkPageBreak(subjectData.length * 8 + 20);
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
  checkPageBreak(50);
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