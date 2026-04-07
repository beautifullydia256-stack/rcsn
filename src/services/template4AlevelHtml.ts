/**
 * A-Level (template4) HTML — multi-paper subject table + optional `reportData.alevel` stats/charts.
 * Visual target: Gangu-style academic report (cream paper, teal/cyan bands, green table header)
 * per docs/SECONDARY_REPORT_CARD_TEMPLATES_PLAN.md §3 A-1. Preview/PDF via `renderTemplateHTML`.
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
        classTeacherName?: string;
        principalName?: string;
        closingDate?: string;
        openingDate?: string;
        zorakiUsername?: string;
        zorakiQrImageUrl?: string;
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

  const ctName =
    alevel?.classTeacherName ?? (student.comments?.class_teacher_name as string) ?? '';
  const prName = alevel?.principalName ?? (student.comments?.head_teacher_name as string) ?? '';
  const ctText =
    (student.comments?.class_teacher_text as string) ??
    (student.comments?.class_teacher_comment as string) ??
    '';
  const prText =
    (student.comments?.head_teacher_text as string) ??
    (student.comments?.headteacher_text as string) ??
    '';

  const closing = alevel?.closingDate ?? (student.closing_date as string) ?? '—';
  const opening = alevel?.openingDate ?? (student.opening_date as string) ?? '—';
  const combination =
    (student.combination as string) ??
    (student.subject_combination as string) ??
    (student.alevel_combination as string) ??
    '';
  const admNo = String(student.admission_number ?? student.student_id ?? '');

  const zorakiUser = alevel?.zorakiUsername ?? '';
  const zorakiQr = alevel?.zorakiQrImageUrl ?? '';

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

  const qrBlock =
    zorakiQr ?
      `<div class="qr-img-wrap"><img src="${escapeHtml(zorakiQr)}" alt="QR" class="qr-img" /></div>`
    : `<div class="qr-placeholder">QR</div>`;

  const zorakiLine = zorakiUser ?
    `Scan to access your interactive student profile on Zoraki Analytics — <strong>${escapeHtml(zorakiUser)}</strong>`
  : 'Scan to access your interactive student profile on Zoraki Analytics';

  const motto = String(school?.motto ?? '').trim();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>A-Level Report</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', Times, serif;
      width: 210mm;
      min-height: 297mm;
      margin: 0;
      padding: 0;
      background: #e8e4d9;
      color: #1a1a1a;
      font-size: 10pt;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 10mm 11mm 12mm;
      background: linear-gradient(180deg, #f7f4eb 0%, #f0ecdf 100%);
      border: 1px solid #c9c2b0;
    }
    .top-band {
      background: linear-gradient(90deg, #006064 0%, #00838f 45%, #4db6ac 100%);
      color: #fff;
      padding: 10px 14px;
      margin: -10mm -11mm 12px -11mm;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
    }
    .top-band .school-logo {
      width: 72px; height: 72px; background: #fff; border: 2px solid rgba(255,255,255,.85);
      display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;
    }
    .top-band .school-logo img { width: 100%; height: 100%; object-fit: contain; }
    .top-contact { flex: 1; text-align: right; font-size: 9pt; line-height: 1.35; }
    .top-contact .school-name {
      font-weight: 700; font-size: 13pt; letter-spacing: .04em;
      text-transform: uppercase; text-shadow: 0 1px 0 rgba(0,0,0,.2);
    }
    .form-banner {
      text-align: center;
      font-weight: 700;
      font-size: 11pt;
      letter-spacing: .12em;
      text-transform: uppercase;
      color: #004d40;
      border: 2px solid #00695c;
      background: rgba(255,255,255,.65);
      padding: 8px 10px;
      margin-bottom: 10px;
    }
    .session-line {
      text-align: center;
      font-size: 10pt;
      font-weight: 700;
      color: #263238;
      margin-bottom: 10px;
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
    .student-panel .photo {
      width: 76px; height: 94px; border: 2px solid #00695c;
      background: #fff; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0;
    }
    .student-panel .photo img { width: 100%; height: 100%; object-fit: cover; }
    .charts-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 12px;
    }
    .chart-card {
      flex: 1;
      min-width: 240px;
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
    .remarks {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }
    .remark-box {
      background: #fff;
      border: 1px solid #546e7a;
      padding: 8px 10px;
      min-height: 100px;
    }
    .remark-box h4 {
      margin: 0 0 6px;
      font-size: 9.5pt;
      color: #37474f;
      text-transform: uppercase;
      letter-spacing: .05em;
    }
    .remark-box .who { font-size: 8.5pt; font-weight: 700; color: #006064; margin-bottom: 6px; }
    .dates {
      display: flex;
      gap: 24px;
      margin-bottom: 12px;
      font-size: 9.5pt;
      font-weight: 600;
    }
    .zoraki {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 12px;
      padding: 10px;
      background: rgba(227, 242, 253, .5);
      border: 1px dashed #0277bd;
      font-size: 8.5pt;
    }
    .qr-img-wrap { flex-shrink: 0; }
    .qr-img { width: 72px; height: 72px; display: block; }
    .qr-placeholder {
      width: 72px; height: 72px;
      border: 1px solid #90caf9;
      display: flex; align-items: center; justify-content: center;
      font-size: 8pt; color: #1565c0; background: #fff;
    }
    .stamp-row {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 10px;
    }
    .stamp {
      flex: 1;
      min-height: 56px;
      border: 2px solid #1565c0;
      background: linear-gradient(180deg, rgba(227,242,253,.4) 0%, rgba(255,255,255,.8) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8pt;
      font-weight: 700;
      color: #0d47a1;
      text-align: center;
      padding: 8px;
    }
    .footer-motto {
      text-align: center;
      font-style: italic;
      font-size: 9pt;
      color: #424242;
      border-top: 1px solid #90a4ae;
      padding-top: 8px;
      margin-top: 6px;
    }
    .print-tag { text-align: center; font-size: 7.5pt; color: #78909c; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="top-band">
      <div class="school-logo">
        ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="logo" />` : '<span style="font-size:8px;color:#006064">Logo</span>'}
      </div>
      <div class="top-contact">
        <div class="school-name">${escapeHtml(schoolName)}</div>
        <div>${escapeHtml(school?.phone ?? '')}</div>
        <div>${escapeHtml(school?.email ?? '')}</div>
        <div>${escapeHtml(school?.address ?? '')}</div>
      </div>
    </div>

    <div class="form-banner">Academic Report Form</div>
    <div class="session-line">
      ${escapeHtml(classLine)}${stream ? ` — ${escapeHtml(stream)}` : ''} — ${escapeHtml(String(year))} Term ${escapeHtml(String(term))}
    </div>

    <div class="student-panel">
      <div class="meta">
        <div><strong>Name:</strong> ${escapeHtml(student.name ?? '')}</div>
        <div><strong>ADM No:</strong> ${escapeHtml(admNo)}</div>
        <div><strong>Class / Stream:</strong> ${escapeHtml(classLine)}${stream ? ` — ${escapeHtml(stream)}` : ''}</div>
        ${combination ? `<div><strong>Combination:</strong> ${escapeHtml(combination)}</div>` : ''}
      </div>
      <div class="photo">
        ${studentPhotoBase64 ? `<img src="${studentPhotoBase64}" alt="photo" />` : '<span style="font-size:8px;color:#666">Photo</span>'}
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

    <div class="remarks">
      <div class="remark-box">
        <h4>Class Teacher</h4>
        ${ctName ? `<div class="who">${escapeHtml(ctName)}</div>` : ''}
        <div>${escapeHtml(ctText) || '—'}</div>
      </div>
      <div class="remark-box">
        <h4>Principal</h4>
        ${prName ? `<div class="who">${escapeHtml(prName)}</div>` : ''}
        <div>${escapeHtml(prText) || '—'}</div>
      </div>
    </div>

    <div class="dates">
      <div><strong>Closing Date:</strong> ${escapeHtml(String(closing))}</div>
      <div><strong>Opening Date:</strong> ${escapeHtml(String(opening))}</div>
    </div>

    <div class="zoraki">
      ${qrBlock}
      <div>${zorakiLine}</div>
    </div>

    <div class="stamp-row">
      <div class="stamp">Official stamp &amp; signature</div>
    </div>

    ${motto ? `<div class="footer-motto">School motto: ${escapeHtml(motto)}</div>` : ''}
    <div class="print-tag">Generated report — A-Level template</div>
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
