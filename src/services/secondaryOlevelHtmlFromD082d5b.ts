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
  SECONDARY_UPPER_SECTION_RESULTS_TABLE_CSS,
  SECONDARY_LOWER_HEADER_PRINT_CSS,
} from './secondaryLowerSectionHeaderHtml';
import {
  OLEVEL_MISSING_RESULTS_DESCRIPTOR,
  OLEVEL_MISSING_RESULTS_REMARK,
} from '../lib/secondaryOlevelReportCopy';
import { dataUrlForPdfImgSrc } from '../lib/reportImageDataUrl';
import { olevelPdfDensityBandResolved } from '../lib/secondaryOlevelPdfDensity';

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
  const summaryAvgRaw = student.summary?.average;
  const summaryMean =
    summaryAvgRaw != null && summaryAvgRaw !== ''
      ? Number(summaryAvgRaw)
      : Number.NaN;
  let averageFinalDisplay = '';
  let averageGradeLetter = '';
  let overallAchievementUpper = '';
  if (Number.isFinite(summaryMean)) {
    averageFinalDisplay = summaryMean.toFixed(2);
    averageGradeLetter = template1StandardGradeFromPct(summaryMean);
    overallAchievementUpper = template1AchievementLevelUpper(averageGradeLetter);
  } else if (finalScores.length > 0) {
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

  const olevelStandardDensity = olevelPdfDensityBandResolved(
    student?.current_class,
    Array.isArray(student.results) ? student.results.length : 0
  );
  const wmSrc =
    typeof schoolLogoBase64 === 'string' && schoolLogoBase64.length > 0
      ? dataUrlForPdfImgSrc(schoolLogoBase64) ?? schoolLogoBase64
      : '';

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
        ${SECONDARY_UPPER_SECTION_RESULTS_TABLE_CSS}

        /* Template Standard: same table design language as Basic (upper-results); 9-column layout unchanged */
        table.upper-results.o-level-standard {
          margin-bottom: 3mm;
        }
        table.upper-results.o-level-standard thead th:first-child {
          text-align: left;
        }
        table.upper-results.o-level-standard thead th {
          text-align: center;
        }
        table.upper-results.o-level-standard td.center,
        table.upper-results.o-level-standard th.center {
          text-align: center;
        }
        table.upper-results.o-level-standard tbody td:first-child strong {
          font-weight: 600;
          color: #0f172a;
        }
        table.upper-results.o-level-standard .standard-topic {
          font-size: 9.2pt;
          line-height: 1.2;
          margin-top: 2px;
          color: #475569;
          font-weight: 400;
        }
        table.upper-results.o-level-standard td.remark-cell {
          font-size: 9.2pt;
          color: #475569;
          text-align: left;
          vertical-align: middle;
        }
        table.upper-results.o-level-standard tbody tr.summary-avg-row td,
        table.upper-results.o-level-standard tbody tr.summary-perf-row td {
          background: #e0f2fe;
          color: #1e3a8a;
          font-weight: 600;
        }

        tr.olevel-row-missing-results td {
          background: #fffbeb;
        }
        .olevel-missing-hint {
          font-style: italic;
          color: #92400e;
        }

        .muted { color: #555; }

        ${SECONDARY_OLEVEL_COMMENTS_NEXT_TERM_PANEL_CSS}

        .grading-system {
          margin-bottom: 20px;
          font-family: 'Times New Roman', Times, serif;
        }

        .grading-system h3 {
          font-size: 11pt;
          font-weight: 700;
          margin-bottom: 5px;
          color: #1e3a8a;
        }

        .grading-system p {
          font-size: 10pt;
          font-weight: 700;
          margin-bottom: 10px;
          color: #0f172a;
        }

        .grading-system .description-table {
          border-collapse: collapse;
          width: 100%;
          font-size: 9.8pt;
        }
        .grading-system .description-table th,
        .grading-system .description-table td {
          border: 1px solid #bfdbfe;
          padding: 4px 6px;
          vertical-align: middle;
        }
        .grading-system .description-table thead th {
          background: #dbeafe;
          color: #1e3a8a;
          text-transform: uppercase;
          font-weight: 600;
        }
        .grading-system .description-table tbody td {
          background: #ffffff;
        }
        .grading-system .description-table tbody tr:nth-child(even) td {
          background: #f0f9ff;
        }

        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 9pt;
          font-family: 'Times New Roman', Times, serif;
          color: #475569;
          margin-top: 20px;
          page-break-inside: avoid;
        }

        /* Template1 Standard only: screen watermark — not fixed/900px (breaks print scroll + layout). */
        body.template1-olevel-standard {
          position: relative;
        }
        body.template1-olevel-standard > *:not(.watermark) {
          position: relative;
          z-index: 1;
        }
        .watermark {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.1;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .watermark img {
          max-width: min(72vw, 420px);
          max-height: min(72vh, 420px);
          width: auto;
          height: auto;
          object-fit: contain;
          display: block;
        }
        .watermark-placeholder {
          max-width: 320px;
          max-height: 320px;
          width: 72vw;
          height: 72vw;
          border: 2px solid #ccc;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f0f0;
          font-size: min(18vw, 72pt);
          font-weight: bold;
          color: #ccc;
          text-align: center;
          line-height: 1.2;
          box-sizing: border-box;
        }
        @media print {
          html,
          body.template1-olevel-standard {
            min-height: auto !important;
            height: auto !important;
          }
          .watermark {
            display: none !important;
          }
          .grading-system {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
        body[data-olevel-standard-density="s1s2"] {
          font-size: 9.5pt;
          padding: 0.06cm 0.18cm 0.18cm 0.18cm;
        }
        body[data-olevel-standard-density="s1s2"] table.upper-results.o-level-standard {
          font-size: 8.3pt;
        }
        body[data-olevel-standard-density="s1s2"] table.upper-results.o-level-standard thead th {
          padding: 2px 3px;
          font-size: 7.8pt;
        }
        body[data-olevel-standard-density="s1s2"] table.upper-results.o-level-standard tbody td {
          padding: 2px 4px;
        }
        body[data-olevel-standard-density="s1s2"] .grading-system {
          margin-bottom: 8px;
        }
        body[data-olevel-standard-density="s1s2"] .grading-system .description-table {
          font-size: 8.1pt;
        }
        body[data-olevel-standard-density="s1s2"] .grading-system .description-table th,
        body[data-olevel-standard-density="s1s2"] .grading-system .description-table td {
          padding: 2px 4px;
        }
        body[data-olevel-standard-density="s1s2"] .secondary-ol-comments-panel {
          padding: 6px 8px;
          margin-bottom: 2mm;
          font-size: 9.5pt;
        }
        body[data-olevel-standard-density="s1s2"] .footer {
          margin-top: 8px;
        }
        body[data-olevel-standard-density="s1s2"] .secondary-upper-student-block {
          margin-bottom: 2mm;
          min-height: 24mm;
          padding: 4px 8px;
        }
        ${SECONDARY_LOWER_HEADER_PRINT_CSS}
      </style>
    </head>
    <body class="template1-olevel-standard" data-olevel-standard-density="${olevelStandardDensity}">
      <!-- WATERMARK (hidden in @media print — avoids Chromium PDF offset/extra pages) -->
      <div class="watermark">
        ${wmSrc ? `<img src="${wmSrc}" alt="" />` : '<div class="watermark-placeholder">SCHOOL<br/>LOGO</div>'}
      </div>

      ${headerHtml}

      ${studentBlockHtml}

      <!-- SUBJECTS TABLE -->
      <table class="upper-results o-level-standard">
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
              const isMissing =
                result.result_missing_placeholder === true ||
                result.result_missing_placeholder === 'true';
              const dash = '—';
              const activity = isMissing ? dash : (result.activity_score ?? '');
              const descriptor =
                result.descriptor != null && result.descriptor !== ''
                  ? String(result.descriptor)
                  : '';
              const formative = isMissing ? dash : (result.formative_score ?? '');
              const exam = isMissing ? dash : (result.exam_score ?? '');
              const finalScore = isMissing ? dash : (result.final_score ?? '');
              const gradeText = isMissing
                ? dash
                : result.grade != null && result.grade !== ''
                  ? String(result.grade)
                  : '';
              const overallRemark = isMissing
                ? OLEVEL_MISSING_RESULTS_REMARK
                : result.overall_remark != null && String(result.overall_remark).trim() !== ''
                  ? String(result.overall_remark)
                  : '';
              const teacherInitials = isMissing ? dash : (result.teacher_initials ?? '');
              const topic = result.topic || '';
              const topicBlock = isMissing
                ? ''
                : `<div class="standard-topic">${topic}</div>`;
              const rowClass = isMissing ? ' class="olevel-row-missing-results"' : '';

              return `
                <tr${rowClass}>
                  <td>
                    <strong>${result.subject}</strong>
                    ${topicBlock}
                  </td>
                  <td class="center">${activity}</td>
                  <td class="center note-cell">${descriptor}</td>
                  <td class="center">${formative}</td>
                  <td class="center">${exam}</td>
                  <td class="center">${finalScore}</td>
                  <td class="center grade-col">${gradeText}</td>
                  <td class="remark-cell">${overallRemark}</td>
                  <td class="center note-cell">${teacherInitials}</td>
                </tr>
              `;
            }).join('') : `
              <tr>
                <td colspan="9" class="center muted">N/A - Student did not sit for this term</td>
              </tr>
            `
          }
          ${
            averageFinalDisplay !== ''
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
      </div>
    </body>
    </html>
  `;
}

export { generateTemplate2KasoziHTML, generateTemplate3KyoteraHTML } from './secondaryOlevelPlanSampleLayouts';
