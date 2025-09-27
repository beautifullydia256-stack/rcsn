import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType } from 'docx';
import JSZip from 'jszip';
import { calculateGrade, formatCurrency, getAttendanceDetails, formatValue, formatPercentage, formatAttendance, formatPosition } from '@/src/lib/reportUtils';

export async function POST(request: NextRequest) {
  try {
    const { reportData, type, template } = await request.json();

    if (type === 'single') {
      const doc = await generateSingleReport(reportData, template);
      const buffer = await Packer.toBuffer(doc);
      
      const student = reportData.students[0];
      const filename = `${student.name}_${student.current_class}_Report_${reportData.examSet.name}.docx`.replace(/[^a-zA-Z0-9._-]/g, '_');
      
      return new NextResponse(buffer as any, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
        const doc = await generateSingleReport(studentReportData, template);
        const buffer = await Packer.toBuffer(doc);
        const filename = `${student.name}_${student.current_class}_Report_${reportData.examSet.name}.docx`.replace(/[^a-zA-Z0-9._-]/g, '_');
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
    console.error('Error generating report:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}

async function generateSingleReport(reportData: any, template: string = 'template1') {
  const { school, examSet, students } = reportData;
  const student = students[0];

  const isSecondaryClass = (className: string) => /^S\d/i.test((className || '').trim());
  const isOLevelClass = (className: string) => {
    const trimmed = (className || '').trim();
    return /^(senior\s*[1-4]|s\s*[1-4])/i.test(trimmed);
  };

  // Check if this is an O-Level class and use the appropriate template
  if (isOLevelClass(student.current_class)) {
    switch (template) {
      case 'template1':
        return generateTemplate1OLevelReport(reportData);
      case 'template2':
        return generateTemplate2KasoziReport(reportData);
      case 'template3':
        return generateTemplate3KyoteraReport(reportData);
      default:
        return generateTemplate1OLevelReport(reportData);
    }
  } else if (isSecondaryClass(student.current_class)) {
    return generateSecondaryReport(reportData);
  }

  // Helper function to create a paragraph
  const createParagraph = (text: string, options: any = {}) => {
    return new Paragraph({
      children: [new TextRun({ text, ...options })],
      alignment: options.alignment || AlignmentType.LEFT,
      spacing: { after: options.spacing?.after || 100 }
    });
  };

  // Helper function to create a heading
  const createHeading = (text: string, level: any = HeadingLevel.HEADING_1) => {
    return new Paragraph({
      children: [new TextRun({ text, bold: true, size: 20 })],
      heading: level,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    });
  };

  // Helper function to create a table cell
  const createTableCell = (text: string, options: any = {}) => {
    return new TableCell({
      children: [createParagraph(text, { ...options, spacing: { after: 0 } })],
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      shading: options.shading || {}
    });
  };

  // Helper function to create a header cell with green background
  const createHeaderCell = (text: string, options: any = {}) => {
    return new TableCell({
      children: [createParagraph(text, { ...options, spacing: { after: 0 }, bold: true, color: 'FFFFFF' })],
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      shading: {
        type: ShadingType.SOLID,
        color: '4CAF50'
      }
    });
  };

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            orientation: 'portrait',
            width: 595, // A4 width in points
            height: 842  // A4 height in points
          },
          margin: {
            top: 720,    // 0.5 inch
            right: 720,  // 0.5 inch
            bottom: 720, // 0.5 inch
            left: 720    // 0.5 inch
          }
        }
      },
      children: [
        // School Header
        createHeading(school?.name || 'EMIRATES COLLEGE SCHOOL'),
        createParagraph(school?.motto || 'Education the Future', { 
          alignment: AlignmentType.CENTER,
          size: 18
        }),
        createParagraph(`TEL :: ${school?.phone || '0701395594'} | EMAIL :: ${school?.email || 'info@emiratescollege.sc.ug'} | ${school?.address || 'P.O.BOX 31175, KAMPALA, UGANDA'}`, {
          alignment: AlignmentType.CENTER,
          size: 16
        }),
        
        // Report Title with green background
        new Paragraph({
          children: [new TextRun({ 
            text: `LEARNER'S END OF TERM REPORT CARD FOR TERM ${examSet?.term || '2'}, ${examSet?.year || '2025'}`,
            bold: true,
            size: 26,
            color: 'FFFFFF'
          })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 },
          shading: {
            type: ShadingType.SOLID,
            color: '4CAF50'
          }
        }),
        
        // Student Information
        createHeading('Student Information', HeadingLevel.HEADING_3),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createTableCell('LNo.:', { bold: true }),
                createTableCell(student.admission_number || student.student_id)
              ]
            }),
            new TableRow({
              children: [
                createTableCell('NAME:', { bold: true }),
                createTableCell(student.name)
              ]
            }),
            new TableRow({
              children: [
                createTableCell('CLASS & STREAM:', { bold: true }),
                createTableCell(student.current_class)
              ]
            })
          ]
        }),
        
        // Subject Performance
        createHeading('Subject Performance', HeadingLevel.HEADING_3),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createHeaderCell('Subjects & Topics Covered'),
                createHeaderCell('Activity Score [3]'),
                createHeaderCell('Descriptor'),
                createHeaderCell('Formative Score [20%]'),
                createHeaderCell('Exam Score [80%]'),
                createHeaderCell('Final Score [100%]'),
                createHeaderCell('Grade'),
                createHeaderCell('Overall Remark'),
                createHeaderCell('Subject Teacher')
              ]
            }),
            ...(student.results.length > 0 ? 
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

                return new TableRow({
                  children: [
                    createTableCell(`${result.subject}\n${topic}`),
                    createTableCell(activity, { alignment: AlignmentType.CENTER }),
                    createTableCell(descriptor, { alignment: AlignmentType.CENTER }),
                    createTableCell(formative, { alignment: AlignmentType.CENTER }),
                    createTableCell(exam, { alignment: AlignmentType.CENTER }),
                    createTableCell(finalScore, { alignment: AlignmentType.CENTER }),
                    createTableCell(gradeText, { alignment: AlignmentType.CENTER }),
                    createTableCell(overallRemark),
                    createTableCell(teacherInitials, { alignment: AlignmentType.CENTER })
                  ]
                });
              }) : [
                new TableRow({
                  children: [
                    createTableCell('N/A - Student did not sit for this term', { 
                      alignment: AlignmentType.CENTER 
                    })
                  ]
                })
              ]
            )
          ]
        }),
        
        // Summary
        createHeading('Summary', HeadingLevel.HEADING_3),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createTableCell('AVERAGE SCORES:', { bold: true }),
                createTableCell(`${student.summary.average ?? ''} ${student.summary.division ?? ''}`)
              ]
            }),
            new TableRow({
              children: [
                createTableCell('OVERALL PERFORMANCE:', { bold: true }),
                createTableCell(student.summary.performanceRemark ?? '')
              ]
            })
          ]
        }),
        
        // Attendance Details (if available)
        ...(student.summary.attendanceDetails.totalSchoolDays !== null ? [
          createHeading('Attendance Details', HeadingLevel.HEADING_3),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createTableCell('Period:', { bold: true }),
                  createTableCell(`${formatValue(student.summary.attendanceDetails.firstAttendanceDate)} to ${formatValue(student.summary.attendanceDetails.lastSchoolDay)}`)
                ]
              }),
              new TableRow({
                children: [
                  createTableCell('Last Exam Set:', { bold: true }),
                  createTableCell(formatValue(student.summary.attendanceDetails.lastExamSetName))
                ]
              }),
              new TableRow({
                children: [
                  createTableCell('Total School Days:', { bold: true }),
                  createTableCell(formatValue(student.summary.attendanceDetails.totalSchoolDays))
                ]
              }),
              new TableRow({
                children: [
                  createTableCell('Days Present:', { bold: true }),
                  createTableCell(formatValue(student.summary.attendanceDetails.presentDays))
                ]
              }),
              new TableRow({
                children: [
                  createTableCell('Days Absent:', { bold: true }),
                  createTableCell(formatValue(student.summary.attendanceDetails.absentDays))
                ]
              })
            ]
          })
        ] : []),
        
        // Comments
        createHeading('Remarks', HeadingLevel.HEADING_3),
        createParagraph('Class Teacher\'s Remarks:', { bold: true }),
        createParagraph(student.comments?.class_teacher_text || 'Shafic is progressing well but needs to focus more on specific subject for better results.'),
        createParagraph(`Name: ${student.comments?.class_teacher_name || '__________'} | Signature: ${student.comments?.class_teacher_signature || '__________'} | Date: ${student.comments?.class_teacher_date || '17 September, 2025'}`),
        
        createParagraph('Head Teacher\'s Remarks:', { bold: true }),
        createParagraph(student.comments?.head_teacher_text || 'Shafic needs to engage the subject teachers to assist in topics which were not properly grasped. There is potential for improvement.'),
        createParagraph(`Name: ${student.comments?.head_teacher_name || 'NAKIYINGI MARIAM'} | Signature: ${student.comments?.head_teacher_signature || '__________'} | Date: ${student.comments?.head_teacher_date || '17 September, 2025'}`),
        
        // Next Term
        createParagraph(`Next Term Begins: ${student?.nextTermBegins || 'Saturday, 13 September, 2025'}`, { bold: true }),
        
        // Grading System
        createHeading('Grading System', HeadingLevel.HEADING_3),
        createParagraph('80 - A | 70 - B | 50 - C | 40 - D | 0 - E', { bold: true }),
        
        // Description Table
        createHeading('Description', HeadingLevel.HEADING_3),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createHeaderCell('Grade'),
                createHeaderCell('Achievement Level'),
                createHeaderCell('Descriptor')
              ]
            }),
            new TableRow({
              children: [
                createTableCell('A'),
                createTableCell('Exceptional'),
                createTableCell('Demonstrates an extraordinary level of competence by applying innovatively and creatively the acquired knowledge and skills in real life situations')
              ]
            }),
            new TableRow({
              children: [
                createTableCell('B'),
                createTableCell('Outstanding'),
                createTableCell('Demonstrates a high level of competence by applying the acquired knowledge and skills in real life situations')
              ]
            }),
            new TableRow({
              children: [
                createTableCell('C'),
                createTableCell('Satisfactory'),
                createTableCell('Demonstrates an adequate level of competence by applying the acquired knowledge and skills in real life situations')
              ]
            }),
            new TableRow({
              children: [
                createTableCell('D'),
                createTableCell('Basic'),
                createTableCell('Demonstrates a minimum level of competence in applying the acquired knowledge and skills in real life situations')
              ]
            }),
            new TableRow({
              children: [
                createTableCell('E'),
                createTableCell('Elementary'),
                createTableCell('Demonstrates below the basic level of competence in applying the acquired knowledge and skills in real life situations')
              ]
            })
          ]
        }),
        
        // Footer
        createHeading('', HeadingLevel.HEADING_3),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createTableCell('Printed from: Pwezacore'),
                createTableCell(`School Motto: '${school?.motto || 'Education the Future'}'`, { alignment: AlignmentType.RIGHT })
              ]
            })
          ]
        })
      ]
    }]
  });

  return doc;
}

function createCentered(text: string, options: any = {}) {
  return new Paragraph({
    children: [new TextRun({ text, ...options })],
    alignment: AlignmentType.CENTER,
  });
}

function cell(text: string, opts: any = {}) {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, ...opts })] })],
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
  });
}

function cellRich(paragraphs: Paragraph[]) {
  return new TableCell({
    children: paragraphs,
    margins: { top: 50, bottom: 50, left: 50, right: 50 },
  });
}

async function generateSecondaryReport(reportData: any) {
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

  const borderThin = { style: BorderStyle.SINGLE, size: 1, color: '000000' };

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: 'portrait',
              width: 595, // A4 width in points
              height: 842  // A4 height in points
            },
            margin: {
              top: 720,    // 0.5 inch
              right: 720,  // 0.5 inch
              bottom: 720, // 0.5 inch
              left: 720    // 0.5 inch
            }
          }
        },
        children: [
          // HEADER
          createCentered(school?.name || 'School Name', { bold: true, size: 28, allCaps: true }),
          createCentered(`TEL: ${school?.phone || 'Phone'} | EMAIL: ${school?.email || 'Email'} | ${school?.address || 'Address'}`, { size: 16 }),
          createCentered(`SCHOOL MOTTO: ${school?.motto || 'Education the Future'}`, { italics: true, size: 16 }),

          // TITLE
          new Paragraph({ spacing: { before: 100, after: 100 } }),
          createCentered(`LEARNER'S END OF TERM REPORT CARD FOR TERM ${examSet?.term || ''}, ${examSet?.year || ''}`, { bold: true, size: 22, allCaps: true }),

          // META
          new Paragraph({
            children: [
              new TextRun({ text: 'LNo. ', bold: true, size: 18 }),
              new TextRun({ text: `${student.admission_number || student.student_id}    `, size: 18 }),
              new TextRun({ text: 'NAME: ', bold: true, size: 18 }),
              new TextRun({ text: `${student.name}    `, size: 18 }),
              new TextRun({ text: 'CLASS & STREAM: ', bold: true, size: 18 }),
              new TextRun({ text: `${student.current_class}`, size: 18 }),
            ],
            spacing: { after: 50 },
          }),

          // ATTENDANCE TABLE
          new Table({
            width: { size: 3000, type: WidthType.DXA },
            rows: [
              new TableRow({ children: [cell('Days Present', { bold: true, size: 16 }), cell('Days Absent', { bold: true, size: 16 }), cell('Total', { bold: true, size: 16 })] }),
              new TableRow({ children: [cell(daysPresent), cell(daysAbsent), cell(totalDays)] }),
            ],
            borders: { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin, insideHorizontal: borderThin, insideVertical: borderThin },
          }),

          new Paragraph({ spacing: { after: 50 } }),

          // SUBJECTS TABLE
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  cell('Subjects & Topics Covered', { bold: true }),
                  cell('Activity Score [3]', { bold: true }),
                  cell('Descriptor', { bold: true }),
                  cell('Formative (20%)', { bold: true }),
                  cell('Exam (80%)', { bold: true }),
                  cell('Final (100%)', { bold: true }),
                  cell('Grade', { bold: true }),
                  cell('Overall Remark', { bold: true }),
                  cell('Subject Teacher', { bold: true }),
                ],
              }),
              ...(student.results.length > 0 ? student.results.map((result: any) => {
                const gradeInfo = calculateGrade(result.marks_obtained, result.total_marks);
                const activity = result.activity_score != null ? String(result.activity_score) : 'N/A';
                const descriptor = result.descriptor ?? gradeInfo.remark ?? 'N/A';
                const formative = result.formative_score != null ? String(result.formative_score) : 'N/A';
                const exam = result.exam_score != null ? String(result.exam_score) : 'N/A';
                const finalScore = result.final_score != null ? String(result.final_score) : (result.total_marks ? String(Math.round((result.marks_obtained / result.total_marks) * 100)) : 'N/A');
                const gradeText = result.grade ?? gradeInfo.grade ?? 'N/A';
                const overallRemark = result.overall_remark ?? gradeInfo.remark ?? 'N/A';
                const teacherName = result.teacher_name ?? '-';
                const topics: string[] = Array.isArray(result.topics) ? result.topics.map((t: any) => (typeof t === 'string' ? t : JSON.stringify(t))) : [];
                const subjectCellParas: Paragraph[] = [new Paragraph({ children: [new TextRun({ text: String(result.subject || ''), bold: true })] })];
                for (const t of topics) {
                  subjectCellParas.push(new Paragraph({ children: [new TextRun({ text: t })] }));
                }
                return new TableRow({
                  children: [
                    cellRich(subjectCellParas),
                    cell(activity),
                    cell(descriptor),
                    cell(formative),
                    cell(exam),
                    cell(finalScore),
                    cell(gradeText),
                    cell(overallRemark),
                    cell(teacherName),
                  ],
                });
              }) : [
                new TableRow({ children: [cell('N/A - Student did not sit for this term')], })
              ]),
            ],
            borders: { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin, insideHorizontal: borderThin, insideVertical: borderThin },
          }),

          // PERFORMANCE SUMMARY
          new Paragraph({ spacing: { before: 100, after: 50 } }),
          new Paragraph({ children: [new TextRun({ text: 'AVERAGE SCORES: ', bold: true, size: 18 }), new TextRun({ text: `${avg} ${avgGrade}`, size: 18 })] }),
          new Paragraph({ children: [new TextRun({ text: 'OVERALL PERFORMANCE: ', bold: true, size: 18 }), new TextRun({ text: overallPerf, size: 18 })] }),

          // TERMLY PROJECTS
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ children: [cell('Subject', { bold: true }), cell('Project Title', { bold: true }), cell('Remark', { bold: true }), cell('Score', { bold: true }), cell('Teacher', { bold: true })] }),
              ...(
                projects.length > 0
                  ? projects.map((p: any) => new TableRow({ children: [
                      cell(String(p.subject ?? 'N/A')),
                      cell(String(p.project_title ?? 'N/A')),
                      cell(String(p.remark ?? 'N/A')),
                      cell(p.score != null ? String(p.score) : 'N/A'),
                      cell(String(p.teacher ?? 'N/A')),
                    ] }))
                  : [new TableRow({ children: [cell('N/A'), cell('N/A'), cell('N/A'), cell('N/A'), cell('N/A')] })]
              )
            ],
            borders: { top: borderThin, bottom: borderThin, left: borderThin, right: borderThin, insideHorizontal: borderThin, insideVertical: borderThin },
          }),

          // COMMENTS
          new Paragraph({ spacing: { before: 100, after: 50 } }),
          new Paragraph({ children: [new TextRun({ text: "Class Teacher's Comment", bold: true, size: 18 })] }),
          new Paragraph({ children: [new TextRun({ text: String(comments?.class_teacher_text ?? '..............................................................'), size: 16 })] }),
          new Paragraph({ children: [new TextRun({ text: `Name: ${String(comments?.class_teacher_name ?? '__________')} | Signature: ${String(comments?.class_teacher_signature ?? '__________')} | Date: ${String(comments?.class_teacher_date ?? '__________')}`, size: 16 })] }),
          new Paragraph({ spacing: { before: 50 } }),
          new Paragraph({ children: [new TextRun({ text: "Head Teacher's Comment", bold: true, size: 18 })] }),
          new Paragraph({ children: [new TextRun({ text: String(comments?.head_teacher_text ?? '..............................................................'), size: 16 })] }),
          new Paragraph({ children: [new TextRun({ text: `Name: ${String(comments?.head_teacher_name ?? '__________')} | Signature: ${String(comments?.head_teacher_signature ?? '__________')} | Date: ${String(comments?.head_teacher_date ?? '__________')}`, size: 16 })] }),

          // NEXT TERM & GRADING
          new Paragraph({ spacing: { before: 100, after: 50 } }),
          new Paragraph({ children: [new TextRun({ text: `Next Term Begins: ${nextTermBegins}`, bold: true, size: 18 })] }),
          new Paragraph({ children: [new TextRun({ text: 'Grading System', bold: true, size: 18 })] }),
          new Paragraph({ children: [new TextRun({ text: 'A (80–100)', size: 16 })] }),
          new Paragraph({ children: [new TextRun({ text: 'B (70–79)', size: 16 })] }),
          new Paragraph({ children: [new TextRun({ text: 'C (50–69)', size: 16 })] }),
          new Paragraph({ children: [new TextRun({ text: 'D (40–49)', size: 16 })] }),
          new Paragraph({ children: [new TextRun({ text: 'E (0–39)', size: 16 })] }),

          new Paragraph({ children: [new TextRun({ text: 'Grade Descriptions', bold: true, size: 18 })] }),
          new Paragraph({ children: [new TextRun({ text: 'A: Excellent mastery and application of concepts.', size: 16 })] }),
          new Paragraph({ children: [new TextRun({ text: 'B: Very good understanding with minor gaps.', size: 16 })] }),
          new Paragraph({ children: [new TextRun({ text: 'C: Satisfactory performance with notable room for improvement.', size: 16 })] }),
          new Paragraph({ children: [new TextRun({ text: 'D: Below average; needs significant improvement.', size: 16 })] }),
          new Paragraph({ children: [new TextRun({ text: 'E: Poor performance; urgent intervention required.', size: 16 })] }),

          // FOOTER
          new Paragraph({ spacing: { before: 100 } }),
          createCentered(`Printed from: Pwezacore`, { size: 16 }),
        ],
      },
    ],
  });

  return doc;
}

// Template 1 - O-Level Report Card (matches PDF Template 1 exactly)
async function generateTemplate1OLevelReport(reportData: any) {
  const { school, examSet, students } = reportData;
  const student = students[0];
  
  // Helper function to create a paragraph
  const createParagraph = (text: string, options: any = {}) => {
    return new Paragraph({
      children: [new TextRun({ text, ...options })],
      alignment: options.alignment || AlignmentType.LEFT,
      spacing: { after: options.spacing?.after || 100 }
    });
  };

  // Helper function to create a heading
  const createHeading = (text: string, level: any = HeadingLevel.HEADING_1) => {
    return new Paragraph({
      children: [new TextRun({ text, bold: true, size: 20 })],
      heading: level,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 }
    });
  };

  // Helper function to create a table cell
  const createTableCell = (text: string, options: any = {}) => {
    return new TableCell({
      children: [createParagraph(text, { ...options, spacing: { after: 0 } })],
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      shading: options.shading || {}
    });
  };

  // Helper function to create a header cell with green background
  const createHeaderCell = (text: string, options: any = {}) => {
    return new TableCell({
      children: [createParagraph(text, { ...options, spacing: { after: 0 }, bold: true, color: 'FFFFFF' })],
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      shading: {
        type: ShadingType.SOLID,
        color: '4CAF50'
      }
    });
  };

  // Helper function to create centered text
  const createCentered = (text: string, options: any = {}) => {
    return new Paragraph({
      children: [new TextRun({ text, ...options })],
      alignment: AlignmentType.CENTER,
      spacing: { after: options.spacing?.after || 100 }
    });
  };

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // HEADER - School Logo and Info
          createCentered(`${school?.name || 'EMIRATES COLLEGE SCHOOL'}`, { bold: true, size: 24, spacing: { after: 200 } }),
          createCentered(`TEL :: ${school?.phone || '0701395594'} | EMAIL :: ${school?.email || 'info@emiratescollege.sc.ug'} | ${school?.address || 'P.O.BOX 31175, KAMPALA, UGANDA'}`, { size: 18, spacing: { after: 200 } }),
          createCentered(`SCHOOL MOTTO: ${school?.motto || 'Education the Future'}`, { italic: true, size: 18, spacing: { after: 400 } }),

          // REPORT TITLE
          createCentered(`LEARNER'S END OF TERM REPORT CARD FOR TERM ${examSet?.term || '2'}, ${examSet?.year || '2025'}`, { 
            bold: true, 
            size: 20, 
            color: 'FFFFFF',
            spacing: { after: 400 }
          }),

          // LEARNER INFO
          createParagraph(`LNo.: ${student.admission_number || student.student_id}`, { size: 18, spacing: { after: 100 } }),
          createParagraph(`NAME: ${student.name}`, { size: 18, spacing: { after: 100 } }),
          createParagraph(`CLASS & STREAM: ${student.current_class}`, { size: 18, spacing: { after: 300 } }),

          // SUBJECTS TABLE
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Header row
              new TableRow({
                children: [
                  createHeaderCell('Subjects & Topics Covered'),
                  createHeaderCell('Activity Score [3]'),
                  createHeaderCell('Descriptor'),
                  createHeaderCell('Formative Score [20%]'),
                  createHeaderCell('Exam Score [80%]'),
                  createHeaderCell('Final Score [100%]'),
                  createHeaderCell('Grade'),
                  createHeaderCell('Overall Remark'),
                  createHeaderCell('Subject Teacher')
                ]
              }),
              // Data rows
              ...(student.results && student.results.length > 0 ? 
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

                  return new TableRow({
                    children: [
                      createTableCell(`${result.subject}\n${topic}`, { size: 16 }),
                      createTableCell(activity, { alignment: AlignmentType.CENTER }),
                      createTableCell(descriptor, { alignment: AlignmentType.CENTER }),
                      createTableCell(formative, { alignment: AlignmentType.CENTER }),
                      createTableCell(exam, { alignment: AlignmentType.CENTER }),
                      createTableCell(finalScore, { alignment: AlignmentType.CENTER }),
                      createTableCell(gradeText, { alignment: AlignmentType.CENTER }),
                      createTableCell(overallRemark, { size: 14 }),
                      createTableCell(teacherInitials, { alignment: AlignmentType.CENTER })
                    ]
                  });
                }) : [
                  new TableRow({
                    children: [
                      createTableCell('N/A - Student did not sit for this term', { alignment: AlignmentType.CENTER })
                    ]
                  })
                ]
              )
            ]
          }),

          // PERFORMANCE SUMMARY
          createParagraph(`AVERAGE SCORES: ${student.summary?.average || ''} ${student.summary?.division || ''}`, { 
            bold: true, 
            size: 18, 
            spacing: { before: 300, after: 200 } 
          }),
          createParagraph(`OVERALL PERFORMANCE: ${student.summary?.performanceRemark || ''}`, { 
            bold: true, 
            size: 18, 
            spacing: { after: 300 } 
          }),

          // COMMENTS
          createParagraph('Class Teacher\'s Comment', { bold: true, size: 18, spacing: { after: 100 } }),
          createParagraph(student.comments?.class_teacher_text || 'Shafic is progressing well but needs to focus more on specific subject for better results.', { size: 16, spacing: { after: 100 } }),
          createParagraph(`Name: ${student.comments?.class_teacher_name || '__________'} | Signature: ${student.comments?.class_teacher_signature || '__________'} | Date: ${student.comments?.class_teacher_date || '17 September, 2025'}`, { size: 16, spacing: { after: 200 } }),

          createParagraph('Head Teacher\'s Comment', { bold: true, size: 18, spacing: { after: 100 } }),
          createParagraph(student.comments?.head_teacher_text || 'Shafic needs to engage the subject teachers to assist in topics which were not properly grasped. There is potential for improvement.', { size: 16, spacing: { after: 100 } }),
          createParagraph(`Name: ${student.comments?.head_teacher_name || 'NAKIYINGI MARIAM'} | Signature: ${student.comments?.head_teacher_signature || '__________'} | Date: ${student.comments?.head_teacher_date || '17 September, 2025'}`, { size: 16, spacing: { after: 200 } }),

          createParagraph(`Next Term Begins: ${student?.nextTermBegins || 'Saturday, 13 September, 2025'}`, { 
            bold: true, 
            size: 18, 
            spacing: { after: 300 } 
          }),

          // Grading system & descriptions
          createParagraph('Grading System', { bold: true, size: 18, spacing: { after: 100 } }),
          createParagraph('80 - A | 70 - B | 50 - C | 40 - D | 0 - E', { bold: true, size: 16, spacing: { after: 200 } }),
          
          createParagraph('Description', { bold: true, size: 18, spacing: { after: 100 } }),
          
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Grade'),
                  createHeaderCell('Achievement Level'),
                  createHeaderCell('Descriptor')
                ]
              }),
              new TableRow({
                children: [
                  createTableCell('A'),
                  createTableCell('Exceptional'),
                  createTableCell('Demonstrates an extraordinary level of competence by applying innovatively and creatively the acquired knowledge and skills in real life situations')
                ]
              }),
              new TableRow({
                children: [
                  createTableCell('B'),
                  createTableCell('Outstanding'),
                  createTableCell('Demonstrates a high level of competence by applying the acquired knowledge and skills in real life situations')
                ]
              }),
              new TableRow({
                children: [
                  createTableCell('C'),
                  createTableCell('Satisfactory'),
                  createTableCell('Demonstrates an adequate level of competence by applying the acquired knowledge and skills in real life situations')
                ]
              }),
              new TableRow({
                children: [
                  createTableCell('D'),
                  createTableCell('Basic'),
                  createTableCell('Demonstrates a minimum level of competence in applying the acquired knowledge and skills in real life situations')
                ]
              }),
              new TableRow({
                children: [
                  createTableCell('E'),
                  createTableCell('Elementary'),
                  createTableCell('Demonstrates below the basic level of competence in applying the acquired knowledge and skills in real life situations')
                ]
              })
            ]
          }),

          // FOOTER
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createTableCell('Printed from: Pwezacore'),
                  createTableCell(`School Motto: '${school?.motto || 'Education the Future'}'`, { alignment: AlignmentType.RIGHT })
                ]
              })
            ]
          })
        ]
      }
    ]
  });

  return doc;
}

function generateTemplate2KasoziReport(reportData: any) {
  const { school, examSet, students } = reportData;
  const student = students[0];
  
  // Helper function to create a paragraph
  const createParagraph = (text: string, options: any = {}) => {
    return new Paragraph({
      children: [new TextRun({ text, ...options })],
      alignment: options.alignment || AlignmentType.LEFT,
      spacing: { after: options.spacing?.after || 100 }
    });
  };

  // Helper function to create a table cell
  const createTableCell = (text: string, options: any = {}) => {
    return new TableCell({
      children: [createParagraph(text, { ...options, spacing: { after: 0 } })],
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      shading: options.shading || {}
    });
  };

  // Helper function to create a header cell with green background
  const createHeaderCell = (text: string, options: any = {}) => {
    return new TableCell({
      children: [createParagraph(text, { ...options, spacing: { after: 0 }, bold: true, color: 'FFFFFF' })],
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      shading: {
        type: ShadingType.SOLID,
        color: '2E7D32'
      }
    });
  };

  // Helper function to create centered text
  const createCentered = (text: string, options: any = {}) => {
    return new Paragraph({
      children: [new TextRun({ text, ...options })],
      alignment: AlignmentType.CENTER,
      spacing: { after: options.spacing?.after || 100 }
    });
  };

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // HEADER - School Logo and Info
          createCentered(`${school?.name || 'ST. ADRIAN KASOZI SECONDARY SCHOOL'}`, { bold: true, size: 24, spacing: { after: 200 } }),
          createCentered(`P.O. BOX 12345, KAMPALA | TEL: ${school?.phone || '0414-123456'} | EMAIL: ${school?.email || 'info@kasozi.sc.ug'}`, { size: 18, spacing: { after: 200 } }),
          createCentered(`MOTTO: "${school?.motto || 'Excellence Through Discipline'}"`, { italic: true, size: 18, spacing: { after: 400 } }),

          // REPORT TITLE
          createCentered(`LEARNER'S END OF TERM REPORT CARD FOR TERM ${examSet?.term || 'THREE'}, ${examSet?.year || '2022'}`, { 
            bold: true, 
            size: 20, 
            color: 'FFFFFF',
            spacing: { after: 400 }
          }),

          // STUDENT INFO
          createParagraph(`Report Number: ${student.admission_number || student.student_id}`, { size: 18, spacing: { after: 100 } }),
          createParagraph(`Name: ${student.name}`, { size: 18, spacing: { after: 100 } }),
          createParagraph(`Class: ${student.current_class}`, { size: 18, spacing: { after: 100 } }),
          createParagraph(`Term: ${examSet?.term || 'THREE'}`, { size: 18, spacing: { after: 100 } }),
          createParagraph(`Year: ${examSet?.year || '2022'}`, { size: 18, spacing: { after: 300 } }),

          // SUBJECTS TABLE
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Header row
              new TableRow({
                children: [
                  createHeaderCell('Subject'),
                  createHeaderCell('Activity Score [3]'),
                  createHeaderCell('Descriptor'),
                  createHeaderCell('Formative Score [20%]'),
                  createHeaderCell('Exam Score [80%]'),
                  createHeaderCell('Final Score [100%]'),
                  createHeaderCell('Grade'),
                  createHeaderCell('Overall Remark'),
                  createHeaderCell('Subject Teacher')
                ]
              }),
              // Data rows
              ...(student.results && student.results.length > 0 ? 
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

                  return new TableRow({
                    children: [
                      createTableCell(result.subject, { size: 16 }),
                      createTableCell(activity, { alignment: AlignmentType.CENTER }),
                      createTableCell(descriptor, { alignment: AlignmentType.CENTER }),
                      createTableCell(formative, { alignment: AlignmentType.CENTER }),
                      createTableCell(exam, { alignment: AlignmentType.CENTER }),
                      createTableCell(finalScore, { alignment: AlignmentType.CENTER }),
                      createTableCell(gradeText, { alignment: AlignmentType.CENTER }),
                      createTableCell(overallRemark, { size: 14 }),
                      createTableCell(teacherInitials, { alignment: AlignmentType.CENTER })
                    ]
                  });
                }) : [
                  new TableRow({
                    children: [
                      createTableCell('N/A - Student did not sit for this term', { alignment: AlignmentType.CENTER })
                    ]
                  })
                ]
              )
            ]
          }),

          // PERFORMANCE SUMMARY
          createParagraph(`AVERAGE SCORES: ${student.summary?.average || ''} ${student.summary?.division || ''}`, { 
            bold: true, 
            size: 18, 
            spacing: { before: 300, after: 200 } 
          }),
          createParagraph(`OVERALL PERFORMANCE: ${student.summary?.performanceRemark || ''}`, { 
            bold: true, 
            size: 18, 
            spacing: { after: 300 } 
          }),

          // COMMENTS
          createParagraph('Class Teacher\'s Comment', { bold: true, size: 18, spacing: { after: 100 } }),
          createParagraph(student.comments?.class_teacher_text || 'Student is progressing well but needs to focus more on specific subjects for better results.', { size: 16, spacing: { after: 100 } }),
          createParagraph(`Name: ${student.comments?.class_teacher_name || '__________'} | Signature: ${student.comments?.class_teacher_signature || '__________'} | Date: ${student.comments?.class_teacher_date || '17 September, 2025'}`, { size: 16, spacing: { after: 200 } }),

          createParagraph('Head Teacher\'s Comment', { bold: true, size: 18, spacing: { after: 100 } }),
          createParagraph(student.comments?.head_teacher_text || 'Student needs to engage the subject teachers to assist in topics which were not properly grasped. There is potential for improvement.', { size: 16, spacing: { after: 100 } }),
          createParagraph(`Name: ${student.comments?.head_teacher_name || 'NAKIYINGI MARIAM'} | Signature: ${student.comments?.head_teacher_signature || '__________'} | Date: ${student.comments?.head_teacher_date || '17 September, 2025'}`, { size: 16, spacing: { after: 200 } }),

          // FOOTER
          createCentered('Printed from: Pwezacore', { size: 16 }),
          createCentered(`School Motto: '${school?.motto || 'Excellence Through Discipline'}'`, { size: 16 })
        ]
      }
    ]
  });

  return doc;
}

function generateTemplate3KyoteraReport(reportData: any) {
  const { school, examSet, students } = reportData;
  const student = students[0];
  
  // Helper function to create a paragraph
  const createParagraph = (text: string, options: any = {}) => {
    return new Paragraph({
      children: [new TextRun({ text, ...options })],
      alignment: options.alignment || AlignmentType.LEFT,
      spacing: { after: options.spacing?.after || 100 }
    });
  };

  // Helper function to create a table cell
  const createTableCell = (text: string, options: any = {}) => {
    return new TableCell({
      children: [createParagraph(text, { ...options, spacing: { after: 0 } })],
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      shading: options.shading || {}
    });
  };

  // Helper function to create a header cell with gray background
  const createHeaderCell = (text: string, options: any = {}) => {
    return new TableCell({
      children: [createParagraph(text, { ...options, spacing: { after: 0 }, bold: true })],
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      shading: {
        type: ShadingType.SOLID,
        color: 'f0f0f0'
      }
    });
  };

  // Helper function to create centered text
  const createCentered = (text: string, options: any = {}) => {
    return new Paragraph({
      children: [new TextRun({ text, ...options })],
      alignment: AlignmentType.CENTER,
      spacing: { after: options.spacing?.after || 100 }
    });
  };

  // Calculate identifier based on grade/score (Template 3 specific)
  const getIdentifier = (score: number) => {
    if (score >= 80) return '3'; // Accomplished
    if (score >= 60) return '2'; // Moderate
    if (score >= 50) return '1'; // Basic
    return ''; // Blank for absent
  };

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // HEADER
          createCentered(`${school?.name || 'KYOTERA PARENTS\' SECONDARY SCHOOL'}`, { bold: true, size: 24, spacing: { after: 200 } }),
          createCentered(`${school?.address || 'P.O.BOX 11, Kyotera- Uganda'} | Tel: ${school?.phone || '0701861636 / 0700338061'} | E-mail: ${school?.email || 'kasumbaj2009@gmail.com'}`, { size: 18, spacing: { after: 200 } }),
          createCentered('END OF TERM ONE STUDENT\'S PROGRESSIVE REPORT', { bold: true, size: 20, spacing: { after: 100 } }),
          createCentered(`No. ${student.admission_number || student.student_id}`, { size: 18, spacing: { after: 400 } }),

          // STUDENT INFO
          createParagraph(`STUDENT'S NAME: ${student.name}`, { size: 18, spacing: { after: 100 } }),
          createParagraph(`YEAR: ${examSet?.year || '2025'}`, { size: 18, spacing: { after: 100 } }),
          createParagraph(`STREAM: EAST`, { size: 18, spacing: { after: 100 } }),
          createParagraph(`CLASS: ${student.current_class}`, { size: 18, spacing: { after: 100 } }),
          createParagraph(`LIN: __________`, { size: 18, spacing: { after: 100 } }),
          createParagraph(`Date: ${examSet?.date || '26/05/2025'}`, { size: 18, spacing: { after: 300 } }),

          // SUBJECTS TABLE
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              // Header row
              new TableRow({
                children: [
                  createHeaderCell('SUBJECT'),
                  createHeaderCell('C1'),
                  createHeaderCell('C2'),
                  createHeaderCell('AVG SCORE/20'),
                  createHeaderCell('FINAL EXAM/80'),
                  createHeaderCell('TOTAL SCORE 100%'),
                  createHeaderCell('IDENTIFIER'),
                  createHeaderCell('INIT')
                ]
              }),
              // Data rows
              ...(student.results && student.results.length > 0 ? 
                student.results.map((result: any) => {
                  const activity = result.activity_score ?? '';
                  const activityNum = parseFloat(activity) || 0;
                  const c1 = activityNum > 0 ? (activityNum * 1.5).toFixed(1) : '';
                  const c2 = activityNum > 0 ? (activityNum * 1.2).toFixed(1) : '';
                  const avgScore = result.formative_score ?? '';
                  const finalExam = result.exam_score ?? '';
                  const totalScore = result.final_score ?? '';
                  const totalNum = parseFloat(totalScore) || 0;
                  const identifier = getIdentifier(totalNum);
                  const teacherInitials = result.teacher_initials ?? '';

                  return new TableRow({
                    children: [
                      createTableCell(result.subject, { bold: true }),
                      createTableCell(c1, { alignment: AlignmentType.CENTER }),
                      createTableCell(c2, { alignment: AlignmentType.CENTER }),
                      createTableCell(avgScore, { alignment: AlignmentType.CENTER }),
                      createTableCell(finalExam, { alignment: AlignmentType.CENTER }),
                      createTableCell(totalScore, { alignment: AlignmentType.CENTER }),
                      createTableCell(identifier, { alignment: AlignmentType.CENTER }),
                      createTableCell(teacherInitials, { alignment: AlignmentType.CENTER })
                    ]
                  });
                }) : [
                  new TableRow({
                    children: [
                      createTableCell('N/A - Student did not sit for this term', { alignment: AlignmentType.CENTER })
                    ]
                  })
                ]
              )
            ]
          }),

          // SUMMARY
          createParagraph('AVERAGE SCORE / PTS (OUT OF 20) / IDENTIFIER: 17', { 
            bold: true, 
            size: 18, 
            spacing: { before: 300, after: 200 } 
          }),
          createParagraph(`Overall Total Score: ${student.summary?.average || ''}`, { 
            bold: true, 
            size: 18, 
            spacing: { after: 100 } 
          }),
          createParagraph('Overall Identifier: 2', { 
            bold: true, 
            size: 18, 
            spacing: { after: 100 } 
          }),
          createParagraph('Overall Learner Achievement: Moderate (Corresponding to Identifier 2)', { 
            bold: true, 
            size: 18, 
            spacing: { after: 300 } 
          }),

          // KEY TERMS
          createParagraph('KEY TERMS', { bold: true, size: 18, spacing: { after: 100 } }),
          createParagraph('3: Accomplished (80% and above)', { size: 16, spacing: { after: 100 } }),
          createParagraph('2: Moderate (60% - 79%)', { size: 16, spacing: { after: 100 } }),
          createParagraph('1: Basic (50% - 59%)', { size: 16, spacing: { after: 100 } }),
          createParagraph('Blank: Below Basic (Below 50%)', { size: 16, spacing: { after: 300 } }),

          // FOOTER
          createCentered('Printed from: Pwezacore', { size: 16 }),
          createCentered(`School Motto: '${school?.motto || 'Education the Future'}'`, { size: 16 })
        ]
      }
    ]
  });

  return doc;
}