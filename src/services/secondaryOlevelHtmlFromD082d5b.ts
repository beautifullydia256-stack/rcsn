/**
 * O-Level built-in report HTML: verbatim from commit d082d5b
 * app/api/reports/generate-pdf/route.ts (lines 572-1760).
 * Used for senior secondary preview/PDF only; primary/nursery uses separate layouts.
 */

import {
  buildSecondaryLowerSectionHeaderHtml,
  buildSecondaryOlevelCommentsNextTermPanelHtml,
  buildSecondaryUpperSectionStyleStudentBlockHtml,
  formatNextTermBeginsLongDisplay,
  formatSecondaryFeesBalanceForReport,
  secondaryOlevelStandardReportChipTitle,
  SECONDARY_A4_PAGE_SHELL_CSS,
  SECONDARY_OLEVEL_COMMENTS_NEXT_TERM_PANEL_CSS,
  SECONDARY_UPPER_SECTION_STYLE_STUDENT_BLOCK_CSS,
  SECONDARY_LOWER_HEADER_PRINT_CSS,
} from './secondaryLowerSectionHeaderHtml';

/** Matches the Standard template legend: 80 - A | 70 - B | 50 - C | 40 - D | 0 - E */
function template1StandardGradeFromPct(percentage: number): string {
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 50) return 'C';
  if (percentage >= 40) return 'D';
  return 'E';
}

function template1AchievementLevelUpper(letter: string): string {
  const u = String(letter || '').trim().toUpperCase();
  const map: Record<string, string> = {
    A: 'EXCEPTIONAL',
    B: 'OUTSTANDING',
    C: 'SATISFACTORY',
    D: 'BASIC',
    E: 'ELEMENTARY',
  };
  return map[u] || '';
}

export function generateTemplate1OLevelHTML(reportData: any, schoolLogoBase64?: string | null, studentPhotoBase64?: string | null) {
  const { school, examSet, students } = reportData;
  const student = students[0];
  const attendance = student.summary.attendanceDetails || {};
  const daysPresent = attendance.presentDays ?? '';
  const totalDays = attendance.totalSchoolDays ?? '';
  const daysAbsent = (typeof totalDays === 'number' && typeof daysPresent === 'number') ? Math.max(totalDays - daysPresent, 0) : '';

  const finalScores = (student.results || [])
    .map((r: { final_score?: unknown }) => parseFloat(String(r.final_score ?? '')))
    .filter((n: number) => Number.isFinite(n));
  let averageFinalDisplay = '';
  let averageGradeLetter = '';
  let overallAchievementUpper = '';
  if (finalScores.length > 0) {
    const mean = finalScores.reduce((a: number, b: number) => a + b, 0) / finalScores.length;
    averageFinalDisplay = mean.toFixed(2);
    averageGradeLetter = template1StandardGradeFromPct(mean);
    overallAchievementUpper = template1AchievementLevelUpper(averageGradeLetter);
  }

  const classTeacherComment =
    student.comments?.class_teacher_text ?? student.comments?.class_teacher_comment ?? '';
  const headTeacherComment =
    student.comments?.headteacher_text ?? student.comments?.head_teacher_text ?? '';
  const classTeacherName = student.comments?.class_teacher_name ?? '';
  const headTeacherName = student.comments?.head_teacher_name ?? '';
  const nextTermRaw =
    student.nextTermBegins ??
    student.next_term_begins_date ??
    student.processed?.nextTermBeginsDate ??
    '';
  const commentsNextTermHtml = buildSecondaryOlevelCommentsNextTermPanelHtml({
    classTeacherComment: String(classTeacherComment),
    headTeacherComment: String(headTeacherComment),
    classTeacherName: String(classTeacherName),
    headTeacherName: String(headTeacherName),
    nextTermBeginsDisplay: formatNextTermBeginsLongDisplay(nextTermRaw),
    feesBalanceDisplay: formatSecondaryFeesBalanceForReport(student),
  });

  const headerHtml = buildSecondaryLowerSectionHeaderHtml(school, schoolLogoBase64 ?? null, {
    chipTitle: secondaryOlevelStandardReportChipTitle(examSet),
    metaLine: `${examSet?.name || 'Term Report'} - ${examSet?.year ?? new Date().getFullYear()}`,
  });

  const studentBlockHtml = buildSecondaryUpperSectionStyleStudentBlockHtml(
    student,
    examSet,
    studentPhotoBase64 ?? null,
  );

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Student Report</title>
      <link href="https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap" rel="stylesheet">
      <style>
        ${SECONDARY_A4_PAGE_SHELL_CSS}
        ${SECONDARY_UPPER_SECTION_STYLE_STUDENT_BLOCK_CSS}
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 12px;
          font-size: 9.5pt;
          position: relative;
          z-index: 0;
          background: #ffffff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        th, td {
          border: 1px solid #000;
          padding: 4px;
          text-align: left;
        }
        
        tbody td {
          background: #ffffff;
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

        tr.summary-avg-row td {
          background: #fff;
          font-weight: bold;
        }

        tr.summary-perf-row td {
          background: #cfe2f3;
          font-weight: bold;
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

        ${SECONDARY_OLEVEL_COMMENTS_NEXT_TERM_PANEL_CSS}
        
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
          display: block;
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
        ${SECONDARY_LOWER_HEADER_PRINT_CSS}
      </style>
    </head>
    <body>
      <!-- WATERMARK -->
      <div class="watermark">
        ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Watermark" />` : '<div class="watermark-placeholder">SCHOOL<br/>LOGO</div>'}
      </div>
      
      ${headerHtml}

      ${studentBlockHtml}

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
              const descriptor = result.descriptor != null && result.descriptor !== '' ? String(result.descriptor) : '';
              const formative = result.formative_score ?? '';
              const exam = result.exam_score ?? '';
              const finalScore = result.final_score ?? '';
              const gradeText = result.grade != null && result.grade !== '' ? String(result.grade) : '';
              const overallRemark = result.overall_remark != null ? String(result.overall_remark) : '';
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
          ${
            finalScores.length > 0
              ? `
          <tr class="summary-avg-row">
            <td colspan="5">AVERAGE SCORES</td>
            <td class="center">${averageFinalDisplay}</td>
            <td class="center">${averageGradeLetter}</td>
            <td></td>
            <td></td>
          </tr>
          <tr class="summary-perf-row">
            <td colspan="5">OVERALL PERFORMANCE</td>
            <td colspan="2" class="center">${overallAchievementUpper}</td>
            <td colspan="2"></td>
          </tr>
`
              : ''
          }
        </tbody>
      </table>

      ${commentsNextTermHtml}

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

export { generateTemplate2KasoziHTML, generateTemplate3KyoteraHTML } from './secondaryOlevelPlanSampleLayouts';
