/**
 * A-Level (template4) HTML — subject marks table + optional `reportData.alevel` stats/charts.
 * Visual target: Gangu-style academic report (cream paper, teal/cyan bands, green table header)
 * per docs/SECONDARY_REPORT_CARD_TEMPLATES_PLAN.md §3 A-1. Preview/PDF via `renderTemplateHTML`.
 */

import {
  buildSecondaryLowerSectionHeaderHtml,
  buildSecondaryOlevelCommentsNextTermPanelHtml,
  buildSecondaryUpperSectionStyleStudentBlockHtml,
  formatNextTermBeginsLongDisplay,
  formatSecondaryFeesBalanceForReport,
  SECONDARY_A4_PAGE_SHELL_CSS,
  SECONDARY_LOWER_HEADER_PRINT_CSS,
  SECONDARY_OLEVEL_COMMENTS_NEXT_TERM_PANEL_CSS,
  SECONDARY_UPPER_SECTION_RESULTS_TABLE_CSS,
  SECONDARY_UPPER_SECTION_STYLE_STUDENT_BLOCK_CSS,
} from './secondaryLowerSectionHeaderHtml';
import type { UacePercentBandLike } from '../lib/uaceReportGradingFootnote';
import {
  DEFAULT_UACE_PERCENT_BANDS,
  uaceBandFinalPercentDisplayForReport,
  uacePointsFromGrade,
} from '../lib/uaceGradeBands';

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
            <td><strong>${escapeHtml(row.subjectLabel)}</strong></td>
            <td class="center">${row.marksPercent != null && !Number.isNaN(row.marksPercent) ? `${Math.round(row.marksPercent)}%` : '—'}</td>
            <td class="center grade-col">${escapeHtml(row.gradeDisplay)}</td>
            <td class="remark-cell">${escapeHtml(row.comment ?? '')}</td>
            <td class="center note-cell">${escapeHtml(row.teacherDisplayName ?? '')}</td>
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

  const studentBlockHtml = buildSecondaryUpperSectionStyleStudentBlockHtml(
    student,
    examSet,
    studentPhotoBase64 ?? null,
  );

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

  const savedBandsRaw = reportData?.uace_percent_bands;
  const savedBands: UacePercentBandLike[] = Array.isArray(savedBandsRaw)
    ? (savedBandsRaw as unknown[])
        .map((el) => {
          if (!el || typeof el !== 'object') return null;
          const o = el as Record<string, unknown>;
          const grade = String(o.grade ?? '').trim();
          const min_pct = Number(o.min_pct);
          const max_pct = Number(o.max_pct);
          if (!grade || !Number.isFinite(min_pct) || !Number.isFinite(max_pct)) return null;
          return { grade: grade.toUpperCase(), min_pct, max_pct };
        })
        .filter((x): x is UacePercentBandLike => x != null)
    : [];

  const displayBands: UacePercentBandLike[] =
    savedBands.length > 0 ? savedBands : DEFAULT_UACE_PERCENT_BANDS.map((b) => ({ ...b }));
  const usingSchoolBands = savedBands.length > 0;

  const bandsRowsHtml = displayBands
    .map((b) => {
      const g = String(b.grade || '').trim().toUpperCase();
      const pct = uaceBandFinalPercentDisplayForReport({
        grade: g,
        min_pct: b.min_pct,
        max_pct: b.max_pct,
      });
      const pts = uacePointsFromGrade(g);
      return `<tr>
              <td>${escapeHtml(pct)}</td>
              <td class="col-grade">${escapeHtml(g)}</td>
              <td class="col-points">${escapeHtml(String(pts))}</td>
            </tr>`;
    })
    .join('');

  const innerTitle = usingSchoolBands
    ? (classLine.trim() || 'This class')
    : 'Default UACE-style bands (typical UNEB ranges)';
  const innerBody = usingSchoolBands
    ? 'Marks out of 100 are converted to a letter grade using these bands.'
    : 'Marks out of 100 are converted to a letter grade using these bands. UNEB may adjust boundaries by year; new schools use this mapping until a class teacher saves custom ranges in Grading System.';

  const gradingSectionHtml = `
    <div class="uace-exam-bands-block">
      <div class="uace-bands-card">
        <p class="uace-bands-card-title">${escapeHtml(innerTitle)}</p>
        <p class="uace-bands-card-body">${escapeHtml(innerBody)}</p>
        <table class="uace-bands-table">
          <thead>
            <tr>
              <th>Final %</th>
              <th>Grade</th>
              <th>Points</th>
            </tr>
          </thead>
          <tbody>
            ${bandsRowsHtml}
          </tbody>
        </table>
      </div>
    </div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>A-Level Report</title>
  <link href="https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap" rel="stylesheet">
  <style>
    ${SECONDARY_A4_PAGE_SHELL_CSS}
    ${SECONDARY_UPPER_SECTION_STYLE_STUDENT_BLOCK_CSS}
    ${SECONDARY_UPPER_SECTION_RESULTS_TABLE_CSS}
    /* A-Level marks table: same header/body rules as Template Standard (.o-level-standard) */
    table.upper-results.alevel-marks {
      margin-bottom: 3mm;
    }
    table.upper-results.alevel-marks thead th:first-child {
      text-align: left;
    }
    table.upper-results.alevel-marks thead th {
      text-align: center;
    }
    table.upper-results.alevel-marks td.center,
    table.upper-results.alevel-marks th.center {
      text-align: center;
    }
    table.upper-results.alevel-marks tbody td:first-child strong {
      font-weight: 600;
      color: #0f172a;
    }
    table.upper-results.alevel-marks td.remark-cell {
      font-size: 9.2pt;
      color: #475569;
      text-align: left;
      vertical-align: middle;
    }
    .muted { color: #555; }
    .sheet {
      width: 100%;
      min-height: 0;
      margin: 0;
      padding: 0;
      background: transparent;
      border: none;
    }
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
    ${SECONDARY_OLEVEL_COMMENTS_NEXT_TERM_PANEL_CSS}
    .uace-exam-bands-block {
      margin-top: 10px;
      margin-bottom: 12px;
      font-family: 'Times New Roman', Times, serif;
    }
    .uace-bands-card {
      border: 1px solid #00897b;
      background: #f0fdfa;
      padding: 10px 12px;
      border-radius: 2px;
    }
    .uace-bands-card-title {
      font-size: 9.5pt;
      font-weight: 600;
      color: #006064;
      margin: 0 0 6px;
    }
    .uace-bands-card-body {
      font-size: 8.5pt;
      color: #37474f;
      margin: 0 0 8px;
      line-height: 1.35;
    }
    .uace-bands-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
    }
    .uace-bands-table th,
    .uace-bands-table td {
      border: 1px solid #90cbc4;
      padding: 4px 8px;
      text-align: left;
      vertical-align: top;
    }
    .uace-bands-table thead th {
      background: #e0f2f1;
      color: #004d40;
      font-weight: 600;
    }
    .uace-bands-table tbody tr:nth-child(even) td {
      background: rgba(255, 255, 255, 0.75);
    }
    .uace-bands-table td.col-grade { font-weight: 700; }
    .uace-bands-table td.col-points { text-align: center; }
    ${SECONDARY_LOWER_HEADER_PRINT_CSS}
  </style>
</head>
<body>
  <div class="sheet">
    ${headerHtml}

    ${studentBlockHtml}

    <div class="stats">
      <div class="stat-pill"><strong>Principal Passes</strong> ${escapeHtml(pp)}</div>
      <div class="stat-pill"><strong>Subsidiary Passes</strong> ${escapeHtml(sp)}</div>
      <div class="stat-pill"><strong>Total Points</strong> ${escapeHtml(pts)}</div>
    </div>

    <div class="charts-row">
      ${chartSection}
      ${barSection}
    </div>

    <table class="upper-results alevel-marks">
      <thead>
        <tr>
          <th>Subjects</th>
          <th>Marks</th>
          <th>Grade</th>
          <th>Comment</th>
          <th>Teacher</th>
        </tr>
      </thead>
      <tbody>
        ${rowHtml || '<tr><td colspan="5" class="center muted">No results</td></tr>'}
      </tbody>
    </table>

    ${commentsNextTermHtml}

    ${gradingSectionHtml}
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
