import { NextRequest, NextResponse } from 'next/server';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle } from 'docx';
import JSZip from 'jszip';
import { calculateGrade, formatCurrency, getAttendanceDetails, formatValue, formatPercentage, formatAttendance, formatPosition } from '@/src/lib/reportUtils';

export async function POST(request: NextRequest) {
  try {
    const { reportData, type } = await request.json();

    if (type === 'single') {
      const doc = await generateSingleReport(reportData);
      const buffer = await Packer.toBuffer(doc);
      
      const student = reportData.students[0];
      const filename = `${student.name}_${student.current_class}_Report_${reportData.examSet.name}.doc`.replace(/[^a-zA-Z0-9._-]/g, '_');
      
      return new NextResponse(buffer as any, {
        headers: {
          'Content-Type': 'application/msword',
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
        const doc = await generateSingleReport(studentReportData);
        const buffer = await Packer.toBuffer(doc);
        const filename = `${student.name}_${student.current_class}_Report_${reportData.examSet.name}.doc`.replace(/[^a-zA-Z0-9._-]/g, '_');
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

async function generateSingleReport(reportData: any) {
  const { school, examSet, students } = reportData;
  const student = students[0];

  const isSecondaryClass = (className: string) => /^S\d/i.test((className || '').trim());

  if (isSecondaryClass(student.current_class)) {
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
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
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
        createHeading(school?.name || 'School Name'),
        createParagraph(school?.motto || 'School Motto', { 
          alignment: AlignmentType.CENTER,
          size: 18
        }),
        createParagraph(`${school?.address || 'School Address'} | Tel: ${school?.phone || 'Phone'} | Email: ${school?.email || 'Email'}`, {
          alignment: AlignmentType.CENTER,
          size: 16
        }),
        
        // Student Report Title
        createHeading('STUDENT REPORT', HeadingLevel.HEADING_2),
        
        // Student Information
        createHeading('Student Information', HeadingLevel.HEADING_3),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createTableCell('Name:', { bold: true }),
                createTableCell(student.name)
              ]
            }),
            new TableRow({
              children: [
                createTableCell('Admission No:', { bold: true }),
                createTableCell(student.admission_number || student.student_id)
              ]
            }),
            new TableRow({
              children: [
                createTableCell('Class:', { bold: true }),
                createTableCell(student.current_class)
              ]
            }),
            new TableRow({
              children: [
                createTableCell('Year:', { bold: true }),
                createTableCell(examSet.year.toString())
              ]
            }),
            new TableRow({
              children: [
                createTableCell('Term:', { bold: true }),
                createTableCell(examSet.term.toString())
              ]
            }),
            new TableRow({
              children: [
                createTableCell('Exam Set:', { bold: true }),
                createTableCell(examSet.name)
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
                createTableCell('Subject', { bold: true, alignment: AlignmentType.CENTER }),
                createTableCell('Marks', { bold: true, alignment: AlignmentType.CENTER }),
                createTableCell('Grade', { bold: true, alignment: AlignmentType.CENTER }),
                createTableCell('Remarks', { bold: true, alignment: AlignmentType.CENTER }),
                createTableCell('Teacher Initials', { bold: true, alignment: AlignmentType.CENTER })
              ]
            }),
            ...(student.results.length > 0 ? 
              student.results.map((result: any) => {
                const gradeInfo = calculateGrade(result.marks_obtained, result.total_marks);
                return new TableRow({
                  children: [
                    createTableCell(result.subject),
                    createTableCell(`${result.marks_obtained}/${result.total_marks}`, { alignment: AlignmentType.CENTER }),
                    createTableCell(gradeInfo.grade, { alignment: AlignmentType.CENTER }),
                    createTableCell(gradeInfo.remark, { alignment: AlignmentType.CENTER }),
                    createTableCell('-', { alignment: AlignmentType.CENTER })
                  ]
                });
              }) : [
                new TableRow({
                  children: [
                    createTableCell('N/A - Student did not sit for this exam set', { 
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
                createTableCell('Total Marks:', { bold: true }),
                createTableCell(`${formatValue(student.summary.totalMarks)}/${formatValue(student.summary.totalPossibleMarks)}`)
              ]
            }),
            new TableRow({
              children: [
                createTableCell('Average:', { bold: true }),
                createTableCell(formatPercentage(student.summary.average))
              ]
            }),
            new TableRow({
              children: [
                createTableCell('Aggregate:', { bold: true }),
                createTableCell(formatValue(student.summary.aggregate))
              ]
            }),
            new TableRow({
              children: [
                createTableCell('Division:', { bold: true }),
                createTableCell(formatValue(student.summary.division))
              ]
            }),
            new TableRow({
              children: [
                createTableCell('Class Position:', { bold: true }),
                createTableCell(formatPosition(student.summary.classPosition, student.summary.average))
              ]
            }),
            new TableRow({
              children: [
                createTableCell('Stream Position:', { bold: true }),
                createTableCell(formatPosition(student.summary.streamPosition, student.summary.average))
              ]
            }),
            new TableRow({
              children: [
                createTableCell('Attendance:', { bold: true }),
                createTableCell(formatAttendance(student.summary.attendanceDetails.presentDays, student.summary.attendanceDetails.totalSchoolDays, student.summary.attendancePercentage))
              ]
            }),
            new TableRow({
              children: [
                createTableCell('Performance:', { bold: true }),
                createTableCell(formatValue(student.summary.performanceRemark))
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
        
        // Remarks
        createHeading('Remarks', HeadingLevel.HEADING_3),
        createParagraph('Class Teacher\'s Remarks:', { bold: true }),
        createParagraph(''),
        createParagraph(''),
        createParagraph(''),
        createParagraph('Head Teacher\'s Remarks:', { bold: true }),
        createParagraph(''),
        createParagraph(''),
        createParagraph(''),
        
        // Footer
        createHeading('', HeadingLevel.HEADING_3),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createTableCell('Next Term Opens: ________________'),
                createTableCell(`Fees Balance: ${student.fees.length > 0 ? formatCurrency(student.fees[0].balance || 0) : 'N/A'}`)
              ]
            })
          ]
        }),
        
        createParagraph(''),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                createTableCell('', { alignment: AlignmentType.CENTER }),
                createTableCell('', { alignment: AlignmentType.CENTER })
              ]
            }),
            new TableRow({
              children: [
                createTableCell('________________', { alignment: AlignmentType.CENTER }),
                createTableCell('________________', { alignment: AlignmentType.CENTER })
              ]
            }),
            new TableRow({
              children: [
                createTableCell('Class Teacher\'s Signature', { alignment: AlignmentType.CENTER }),
                createTableCell('Head Teacher\'s Signature', { alignment: AlignmentType.CENTER })
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