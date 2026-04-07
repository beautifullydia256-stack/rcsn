/**
 * A-Level (template4) HTML — multi-paper subject table + optional shaped `reportData.alevel` stats/charts.
 * Preview/PDF use the same path via `renderTemplateHTML` (see templateHTMLGenerator.ts).
 */

/**
 * Build template4 HTML for Senior 5–6. Uses `student.results[]` with optional `paper_code`, `paper_number`.
 */
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

  const schoolName = school?.name ?? 'School Name';
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
            <td class="tc">${escapeHtml(row.paperCode)}</td>
            <td class="tc">${row.marksPercent != null && !Number.isNaN(row.marksPercent) ? `${Math.round(row.marksPercent)}%` : '—'}</td>
            <td class="tc">${escapeHtml(row.gradeDisplay)}</td>
            <td>${escapeHtml(row.comment ?? '')}</td>
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
      <div class="charts">
        <div class="chart-title">Student vs class (by subject — shaped payload)</div>
        <svg viewBox="0 0 280 140" width="100%" height="160" xmlns="http://www.w3.org/2000/svg">
          <polyline fill="none" stroke="#1e3a8a" stroke-width="2" points="${polyStudent}" />
          <polyline fill="none" stroke="#94a3b8" stroke-width="2" stroke-dasharray="4 3" points="${polyClass}" />
        </svg>
        <div class="chart-legend"><span class="lg s">Student</span><span class="lg c">Class avg</span></div>
      </div>`;
  })();

  const barSection = (() => {
    const bars = alevel?.barChartByPeriod;
    if (!bars || bars.length === 0) return '';
    const maxV = Math.max(1, ...bars.map((b) => b.studentMetric));
    return `
      <div class="charts">
        <div class="chart-title">Trend (UACE points proxy — shaped payload)</div>
        <div class="bars">
          ${bars
            .map(
              (b) => `
            <div class="bar-wrap">
              <div class="bar" style="height:${(b.studentMetric / maxV) * 72}px"></div>
              <div class="bar-lbl">${escapeHtml(b.periodLabel)}</div>
            </div>`
            )
            .join('')}
        </div>
      </div>`;
  })();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>A-Level Report</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { font-family: 'Times New Roman', Times, serif; width: 210mm; min-height: 297mm; margin: 0; padding: 12mm;
      background: white; color: #111827; font-size: 10pt; }
    .header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; }
    .school-logo { width: 96px; height: 96px; display: flex; align-items: center; justify-content: center;
      border: 1px solid #ccc; overflow: hidden; }
    .school-logo img { width: 100%; height: 100%; object-fit: contain; }
    .school-info { text-align: right; flex: 1; }
    .school-name { font-weight: bold; font-size: 14pt; text-transform: uppercase; }
    .report-title { text-align: center; font-weight: bold; font-size: 12pt; margin: 12px 0; }
    .student-meta { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 10pt; }
    .student-photo { width: 72px; height: 88px; border: 1px solid #ccc; display: flex; align-items: center;
      justify-content: center; overflow: hidden; }
    .student-photo img { width: 100%; height: 100%; object-fit: cover; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9pt; }
    th, td { border: 1px solid #000; padding: 4px 6px; text-align: left; }
    th { background: #f3f4f6; font-weight: bold; text-align: center; }
    td.tc { text-align: center; }
    .stats { display: flex; gap: 12px; margin-bottom: 12px; font-size: 10pt; }
    .stats span strong { color: #1e3a8a; }
    .charts { margin: 10px 0; padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px; background: #fafafa; }
    .chart-title { font-weight: 600; font-size: 9pt; margin-bottom: 6px; color: #1e3a8a; }
    .chart-legend { font-size: 8pt; margin-top: 4px; }
    .chart-legend .lg { margin-right: 12px; }
    .chart-legend .s { color: #1e3a8a; font-weight: 600; }
    .chart-legend .c { color: #64748b; }
    .bars { display: flex; align-items: flex-end; gap: 10px; min-height: 88px; padding: 8px 0; }
    .bar-wrap { text-align: center; font-size: 7pt; }
    .bar { width: 28px; margin: 0 auto 4px; background: #1e3a8a; border-radius: 2px 2px 0 0; min-height: 2px; }
    .bar-lbl { max-width: 56px; word-break: break-word; }
    .footer { text-align: center; font-size: 8pt; color: #6b7280; margin-top: 14px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="school-logo">
      ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="logo" />` : '<span style="font-size:8px">Logo</span>'}
    </div>
    <div class="school-info">
      <div class="school-name">${escapeHtml(schoolName)}</div>
      <div>${escapeHtml(school?.phone ?? '')} ${escapeHtml(school?.email ?? '')}</div>
    </div>
  </div>
  <div class="report-title">A-LEVEL END OF TERM REPORT — TERM ${escapeHtml(String(term))}, ${escapeHtml(String(year))}</div>
  <div class="student-meta">
    <div>
      <div><strong>Name:</strong> ${escapeHtml(student.name ?? '')}</div>
      <div><strong>Class:</strong> ${escapeHtml(student.current_class ?? '')}</div>
      <div><strong>Admission:</strong> ${escapeHtml(student.admission_number ?? student.student_id ?? '')}</div>
    </div>
    <div class="student-photo">
      ${studentPhotoBase64 ? `<img src="${studentPhotoBase64}" alt="photo" />` : '<span style="font-size:8px">Photo</span>'}
    </div>
  </div>
  <div class="stats">
    <span><strong>Principal passes:</strong> ${escapeHtml(pp)}</span>
    <span><strong>Subsidiary passes:</strong> ${escapeHtml(sp)}</span>
    <span><strong>Total points:</strong> ${escapeHtml(pts)}</span>
  </div>
  ${chartSection}
  ${barSection}
  <table>
    <thead>
      <tr>
        <th>SUBJECT</th>
        <th>PAPER</th>
        <th>MARKS (%)</th>
        <th>GRADE</th>
        <th>COMMENT</th>
        <th>TEACHER</th>
      </tr>
    </thead>
    <tbody>
      ${rowHtml || '<tr><td colspan="6" class="tc">No results</td></tr>'}
    </tbody>
  </table>
  <div class="footer">Printed from Pwezacore — template4 (A-Level)</div>
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
