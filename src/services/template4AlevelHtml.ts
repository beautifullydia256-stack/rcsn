/**
 * A-Level (template4) HTML — multi-paper subject table + optional `reportData.alevel` stats/charts.
 * Visual target: Gangu-style academic report (cream paper, teal/cyan bands, green table header)
 * per docs/SECONDARY_REPORT_CARD_TEMPLATES_PLAN.md §3 A-1. Preview/PDF via `renderTemplateHTML`.
 */

import {
  buildSecondaryLowerSectionHeaderHtml,
  buildSecondaryOlevelCommentsNextTermPanelHtml,
  formatNextTermBeginsLongDisplay,
  formatSecondaryFeesBalanceForReport,
  SECONDARY_A4_PAGE_SHELL_CSS,
  SECONDARY_LOWER_HEADER_PRINT_CSS,
  SECONDARY_LOWER_SECTION_STUDENT_PHOTO_CSS,
  SECONDARY_OLEVEL_COMMENTS_NEXT_TERM_PANEL_CSS,
} from './secondaryLowerSectionHeaderHtml';
import { UACE_REPORT_DEFAULT_BANDS, uaceGradingSummaryLegendLine } from '../lib/uaceReportGradingFootnote';

export function generateTemplate4AlevelHTML(
  reportData: any,
  schoolLogoBase64?: string | null,
  studentPhotoBase64?: string | null
): string {
  const { school, examSet, students } = reportData || {};
  const student = students?.[0];
  if (!student) {
    throw new Error('generateTemplate4AlevelHTML: no student in reportData');
  }

  const term = examSet?.term ?? '';
  const year = examSet?.year ?? '';

  const results: any[] = Array.isArray(student.results) ? student.results : [];
  const sorted = [...results].sort((a, b) => {
    const sa = String(a.subject ?? '').localeCompare(String(b.subject ?? ''), undefined, { sensitivity: 'base' });
    if (sa !== 0) return sa;
    return String(a.paper_code ?? a.paper_number ?? '').localeCompare(
      String(b.paper_code ?? b.paper_number ?? ''),
      undefined,
      { sensitivity: 'base' }
    );
  });

  const alevel = reportData.alevel as
    | {
        principalPasses?: number;
        subsidiaryPasses?: number;
        totalPointsNumerator?: number;
        totalPointsDenominator?: number;
        lineChartStudentVsClass?: Array<{ xLabel: string; studentMetric: number; classMetric: number }>;
        barChartByPeriod?: Array<{ periodLabel: string; studentMetric: number }>;
        paperRows?: Array<{
          subjectLabel: string;
          paperCode: string;
          marksPercent: number | null;
          gradeDisplay: string;
          comment: string | null;
          teacherDisplayName: string | null;
        }>;
        classTeacherName?: string;
        principalName?: string;
      }
    | undefined;

  const tableRows =
    alevel?.paperRows?.length ?
      alevel.paperRows
    : sorted.map((r) => ({
        subjectLabel: String(r.subject ?? ''),
        paperCode: String(r.paper_code ?? r.paper_number ?? '—'),
        marksPercent:
          r.marks_obtained != null && r.total_marks != null
            ? (Number(r.marks_obtained) / Number(r.total_marks || 100)) * 100
            : null,
        gradeDisplay: String(r.grade ?? '—'),
        comment: (r.overall_remark ?? r.remarks ?? r.teacher_comment ?? '') as string,
        teacherDisplayName: (r.teacher_initials ?? r.teacher_name ?? '') as string,
      }));

  const rowHtml = tableRows
    .map(
      (row) => `
          <tr>
            <td>${escapeHtml(row.subjectLabel)}</td>
            <td class="tc mono">${escapeHtml(row.paperCode)}</td>
            <td class="tc">${row.marksPercent != null && !Number.isNaN(row.marksPercent) ? `${Math.round(row.marksPercent)}%` : '—'}</td>
            <td class="tc">${escapeHtml(row.gradeDisplay)}</td>
            <td class="comment">${escapeHtml(row.comment ?? '')}</td>
            <td class="tc">${escapeHtml(row.teacherDisplayName ?? '')}</td>
          </tr>`
    )
    .join('');

  const pp =
    alevel?.principalPasses != null
      ? String(alevel.principalPasses)
      : '—';
  const sp = alevel?.subsidiaryPasses != null ? String(alevel.subsidiaryPasses) : '—';
  const pts =
    alevel?.totalPointsNumerator != null && alevel?.totalPointsDenominator
      ? `${alevel.totalPointsNumerator}/${alevel.totalPointsDenominator}`
      : '—';

  const combination =
    (student.combination as string) ??
    (student.subject_combination as string) ??
    (student.alevel_combination as string) ??
    '';
  const admNo = String(student.admission_number ?? student.student_id ?? '');

  const classLine = String(student.current_class ?? '').trim();
  const stream = String(student.stream ?? student.stream_name ?? '').trim();

  const chartSection = (() => {
    const line = alevel?.lineChartStudentVsClass;
    if (!line || line.length === 0) return '';
    const maxY = Math.max(1, ...line.map((p) => Math.max(p.studentMetric, p.classMetric)));
    const points = line
      .map((p, i) => {
        const x = 40 + i * (220 / Math.max(1, line.length - 1));
        const ys = 120 - (p.studentMetric / maxY) * 90;
        const yc = 120 - (p.classMetric / maxY) * 90;
        return { x, ys, yc, label: p.xLabel };
      })
      .filter((_, i) => i < 12);
    const polyStudent = points.map((p) => `${p.x},${p.ys}`).join(' ');
    const polyClass = points.map((p) => `${p.x},${p.yc}`).join(' ');
    return `
      <div class="chart-card">
        <div class="chart-title">Subject performance — Student vs Class</div>
        <svg viewBox="0 0 280 140" width="100%" height="150" xmlns="http://www.w3.org/2000/svg">
          <polyline fill="none" stroke="#00838f" stroke-width="2.5" points="${polyStudent}" />
          <polyline fill="none" stroke="#558b2f" stroke-width="2" stroke-dasharray="5 3" points="${polyClass}" />
        </svg>
        <div class="chart-legend"><span class="lg s">Student</span><span class="lg c">Class</span></div>
      </div>`;
  })();

  const barSection = (() => {
    const bars = alevel?.barChartByPeriod;
    if (!bars || bars.length === 0) return '';
    const maxV = Math.max(1, ...bars.map((b) => b.studentMetric));
    return `
      <div class="chart-card bar-card">
        <div class="chart-title">Performance over time</div>
        <div class="bars">
          ${bars
            .map(
              (b) => `
            <div class="bar-wrap">
              <div class="bar" style="height:${(b.studentMetric / maxV) * 76}px"></div>
              <div class="bar-lbl">${escapeHtml(b.periodLabel)}</div>
            </div>`
            )
            .join('')}
        </div>
      </div>`;
  })();

  const sessionMeta = [classLine, stream || null, year !== '' || term !== '' ? `${year} Term ${term}`.trim() : null]
    .filter(Boolean)
    .join(' — ');

  const headerHtml = buildSecondaryLowerSectionHeaderHtml(school, schoolLogoBase64 ?? null, {
    chipTitle: 'ACADEMIC REPORT FORM',
    metaLine: sessionMeta,
  });

  const classTeacherComment =
    student.comments?.class_teacher_text ?? student.comments?.class_teacher_comment ?? '';
  const headTeacherComment =
    student.comments?.headteacher_text ?? student.comments?.head_teacher_text ?? '';
  const classTeacherNamePanel = String(
    alevel?.classTeacherName ?? student.comments?.class_teacher_name ?? '',
  );
  const headTeacherNamePanel = String(
    alevel?.principalName ?? student.comments?.head_teacher_name ?? '',
  );
  const nextTermRaw =
    student.nextTermBegins ??
    student.next_term_begins_date ??
    student.processed?.nextTermBeginsDate ??
    '';
  const commentsNextTermHtml = buildSecondaryOlevelCommentsNextTermPanelHtml({
    classTeacherComment: String(classTeacherComment),
    headTeacherComment: String(headTeacherComment),
    classTeacherName: classTeacherNamePanel,
    headTeacherName: headTeacherNamePanel,
    nextTermBeginsDisplay: formatNextTermBeginsLongDisplay(nextTermRaw),
    feesBalanceDisplay: formatSecondaryFeesBalanceForReport(student),
  });

  const customGradeRemarks = (reportData?.grade_remarks_alevel || {}) as Record<string, string>;
  const descriptionRowsHtml = UACE_REPORT_DEFAULT_BANDS.map((row) => {
    const key = row.grade.toUpperCase();
    const desc =
      String(customGradeRemarks[row.grade] || customGradeRemarks[key] || '').trim() ||
      row.defaultDescriptor;
    return ` <tr>
              <td>${escapeHtml(row.grade)}</td>
              <td>${escapeHtml(row.achievementLevel)}</td>
              <td>${escapeHtml(desc)}</td>
            </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>A-Level Report</title>
  <link href="https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap" rel="stylesheet">
  <style>
    ${SECONDARY_A4_PAGE_SHELL_CSS}
    .sheet {
      width: 100%;
      min-height: 0;
      margin: 0;
      padding: 0;
      background: transparent;
      border: none;
    }
    .student-panel {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 14px;
      margin-bottom: 12px;
      padding: 10px 12px;
      background: rgba(255,255,255,.5);
      border: 1px solid #b2dfdb;
    }
    .student-panel .meta { flex: 1; font-size: 10pt; line-height: 1.45; }
    .student-panel .meta div { margin-bottom: 3px; }
    ${SECONDARY_LOWER_SECTION_STUDENT_PHOTO_CSS}
    .charts-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 12px;
    }
    .chart-card {
      flex: 1 1 auto;
      min-width: 0;
      max-width: 100%;
      padding: 8px 10px;
      background: #fffef8;
      border: 1px solid #00897b;
      box-shadow: 0 1px 2px rgba(0,0,0,.06);
    }
    .chart-title {
      font-weight: 700;
      font-size: 9pt;
      color: #006064;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: .04em;
    }
    .chart-legend { font-size: 8pt; margin-top: 4px; }
    .chart-legend .lg { margin-right: 14px; }
    .chart-legend .s { color: #00838f; font-weight: 700; }
    .chart-legend .c { color: #558b2f; font-weight: 600; }
    .bars { display: flex; align-items: flex-end; gap: 12px; min-height: 92px; padding: 6px 0 4px; }
    .bar-wrap { text-align: center; font-size: 7pt; color: #37474f; }
    .bar {
      width: 26px; margin: 0 auto 4px;
      background: linear-gradient(180deg, #43a047 0%, #2e7d32 100%);
      border-radius: 2px 2px 0 0;
      min-height: 2px;
    }
    .bar-lbl { max-width: 64px; word-break: break-word; margin: 0 auto; }
    .stats {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 12px;
    }
    .stat-pill {
      background: #e0f2f1;
      border: 1px solid #00897b;
      padding: 6px 12px;
      font-size: 9.5pt;
      font-weight: 600;
      color: #004d40;
    }
    .stat-pill strong { color: #006064; margin-right: 6px; }
    table.marks {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 8.5pt;
      background: #fff;
    }
    table.marks th, table.marks td {
      border: 1px solid #1b5e20;
      padding: 4px 5px;
      vertical-align: top;
    }
    table.marks th {
      background: linear-gradient(180deg, #2e7d32 0%, #1b5e20 100%);
      color: #fff;
      font-weight: 700;
      text-align: center;
      text-transform: uppercase;
      letter-spacing: .03em;
    }
    table.marks td.tc { text-align: center; }
    table.marks td.comment { font-size: 8pt; line-height: 1.25; }
    table.marks td.mono { font-family: Consolas, 'Courier New', monospace; font-size: 8pt; }
    ${SECONDARY_OLEVEL_COMMENTS_NEXT_TERM_PANEL_CSS}
    .grading-system {
      margin-bottom: 12px;
      font-family: 'Times New Roman', Times, serif;
    }
    .grading-system h3 {
      font-size: 11pt;
      font-weight: 700;
      margin-bottom: 5px;
      color: #1e3a8a;
    }
    .grading-system p.legend {
      font-size: 10pt;
      font-weight: 700;
      margin-bottom: 8px;
      color: #0f172a;
    }
    .grading-system .uace-bands-note {
      font-size: 8.5pt;
      color: #475569;
      margin: 0 0 8px;
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
      vertical-align: top;
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
    ${SECONDARY_LOWER_HEADER_PRINT_CSS}
  </style>
</head>
<body>
  <div class="sheet">
    ${headerHtml}

    <div class="student-panel">
      <div class="meta">
        <div><strong>Name:</strong> ${escapeHtml(student.name ?? '')}</div>
        <div><strong>ADM No:</strong> ${escapeHtml(admNo)}</div>
        <div><strong>Class / Stream:</strong> ${escapeHtml(classLine)}${stream ? ` — ${escapeHtml(stream)}` : ''}</div>
        ${combination ? `<div><strong>Combination:</strong> ${escapeHtml(combination)}</div>` : ''}
      </div>
      <div class="student-photo">
        ${studentPhotoBase64 ? `<img src="${studentPhotoBase64}" alt="photo" />` : '<span style="font-size:8pt;color:#94a3b8">Photo</span>'}
      </div>
    </div>

    <div class="stats">
      <div class="stat-pill"><strong>Principal Passes</strong> ${escapeHtml(pp)}</div>
      <div class="stat-pill"><strong>Subsidiary Passes</strong> ${escapeHtml(sp)}</div>
      <div class="stat-pill"><strong>Total Points</strong> ${escapeHtml(pts)}</div>
    </div>

    <div class="charts-row">
      ${chartSection}
      ${barSection}
    </div>

    <table class="marks">
      <thead>
        <tr>
          <th>Subjects</th>
          <th>Paper</th>
          <th>Marks</th>
          <th>Grade</th>
          <th>Comment</th>
          <th>Teacher</th>
        </tr>
      </thead>
      <tbody>
        ${rowHtml || '<tr><td colspan="6" class="tc">No results</td></tr>'}
      </tbody>
    </table>

    ${commentsNextTermHtml}

    <div class="grading-system">
      <h3>Grading System (UACE — default % bands)</h3>
      <p class="legend"><strong>${escapeHtml(uaceGradingSummaryLegendLine())}</strong></p>
      <p class="uace-bands-note">Descriptors use each class’s A-Level remark text from Grading System when saved; otherwise the defaults below match exam entry and the database.</p>
      <h3>Description</h3>
      <table class="description-table">
        <thead>
          <tr>
            <th>Grade</th>
            <th>Achievement level</th>
            <th>Descriptor</th>
          </tr>
        </thead>
        <tbody>
          ${descriptionRowsHtml}
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
