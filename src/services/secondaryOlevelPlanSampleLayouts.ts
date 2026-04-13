/**
 * O-Level Template 2 (Basic / Kasozi-style) and Template 3 (Progressive / Kyotera-style)
 * HTML aligned to docs/SECONDARY_REPORT_CARD_TEMPLATES_PLAN.md §3 (O-2, O-3).
 * Header + student strip: school-driven placeholders; table + below match sample structure.
 */

import {
  buildSecondaryLowerSectionHeaderHtml,
  buildSecondaryOlevelCommentsNextTermPanelHtml,
  buildSecondaryUpperSectionStyleStudentBlockHtml,
  formatNextTermBeginsLongDisplay,
  secondaryOlevelProgressiveReportChipTitle,
  SECONDARY_A4_PAGE_SHELL_CSS,
  SECONDARY_OLEVEL_COMMENTS_NEXT_TERM_PANEL_CSS,
  SECONDARY_UPPER_SECTION_STYLE_STUDENT_BLOCK_CSS,
  SECONDARY_LOWER_HEADER_PRINT_CSS,
} from './secondaryLowerSectionHeaderHtml';

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Summary strip: average of stored activity scores → digit1/2/3 (same ECS bands as the key). */
function bandDigitFromAvgActivity(avg: number): string {
  if (!Number.isFinite(avg)) return '';
  if (avg < 1) return '1';
  if (avg < 2.5) return '2';
  return '3';
}

function bandWordFromAvgActivity(avg: number): string {
  if (!Number.isFinite(avg)) return '';
  if (avg < 1) return 'Basic';
  if (avg < 2.5) return 'Moderate';
  return 'Outstanding';
}

function parseNum(v: unknown): number {
  const n = parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : NaN;
}

export function generateTemplate2KasoziHTML(reportData: any, schoolLogoBase64?: string | null, studentPhotoBase64?: string | null) {
  const { school, examSet, students } = reportData;
  const student = students?.[0];
  if (!student) return '<html><body>Missing student</body></html>';

  const year = examSet?.year ?? new Date().getFullYear();
  const results: any[] = Array.isArray(student.results) ? student.results : [];

  type Row = {
    subject: string;
    formative: string;
    eoy: string;
    total: string;
    grade: string;
    lo: string;
    descriptor: string;
    initials: string;
    finalNum: number;
  };

  const rows: Row[] = results.map((r: any) => {
    const rawDesc =
      r.descriptor != null && String(r.descriptor).trim() !== '' ? String(r.descriptor).trim() : '';
    const lo =
      r.activity_score != null && String(r.activity_score).trim() !== ''
        ? String(r.activity_score).trim()
        : '';
    const formative = r.formative_score != null ? String(r.formative_score) : '';
    const eoy = r.exam_score != null ? String(r.exam_score) : '';
    const total = r.final_score != null ? String(r.final_score) : '';
    const finalNum = parseNum(r.final_score);
    const grade =
      r.grade != null && String(r.grade).trim() !== '' ? String(r.grade).trim() : '';
    return {
      subject: String(r.subject ?? ''),
      formative,
      eoy,
      total,
      grade,
      lo,
      descriptor: rawDesc,
      initials: String(r.teacher_initials ?? ''),
      finalNum: Number.isFinite(finalNum) ? finalNum : NaN,
    };
  });

  const finals = rows.map((r) => r.finalNum).filter((n) => Number.isFinite(n));
  const avgFinal = finals.length ? (finals.reduce((a, b) => a + b, 0) / finals.length).toFixed(1) : '';
  const activityAvgs = results.map((r: any) => parseNum(r.activity_score)).filter((n) => Number.isFinite(n));
  const avgActivity = activityAvgs.length
    ? activityAvgs.reduce((a, b) => a + b, 0) / activityAvgs.length
    : NaN;
  const avgLo = Number.isFinite(avgActivity) ? bandDigitFromAvgActivity(avgActivity) : '';
  const bandWord = Number.isFinite(avgActivity) ? bandWordFromAvgActivity(avgActivity) : '';

  const ct =
    student.comments?.class_teacher_text ?? student.comments?.class_teacher_comment ?? '';
  const ht =
    student.comments?.head_teacher_text ?? student.comments?.headteacher_text ?? '';
  const classTeacherName = String(student.comments?.class_teacher_name ?? '');
  const headTeacherName = String(student.comments?.head_teacher_name ?? '');
  const nextBeginsRaw =
    student.nextTermBegins ??
    student.next_term_begins_date ??
    student.processed?.nextTermBeginsDate ??
    '';
  const commentsNextTermHtml = buildSecondaryOlevelCommentsNextTermPanelHtml({
    classTeacherComment: String(ct),
    headTeacherComment: String(ht),
    classTeacherName,
    headTeacherName,
    nextTermBeginsDisplay: formatNextTermBeginsLongDisplay(nextBeginsRaw),
  });

  const headerHtml = buildSecondaryLowerSectionHeaderHtml(school, schoolLogoBase64 ?? null, {
    chipTitle: `Learner's End of Year Summative Assessment Results ${year}`,
    metaLine: [examSet?.name, String(year)].filter(Boolean).join(' · '),
  });

  const studentBlockHtml = buildSecondaryUpperSectionStyleStudentBlockHtml(
    student,
    examSet,
    studentPhotoBase64 ?? null,
  );

  const tbody =
    rows.length > 0
      ? rows
          .map(
            (r) => `
          <tr>
            <td>${esc(r.subject)}</td>
            <td class="c">${esc(r.formative)}</td>
            <td class="c">${esc(r.eoy)}</td>
            <td class="c">${esc(r.total)}</td>
            <td class="c">${esc(r.grade)}</td>
            <td class="c">${esc(r.lo)}</td>
            <td class="c desc">${esc(r.descriptor)}</td>
            <td class="c">${esc(r.initials)}</td>
          </tr>`
          )
          .join('') +
        `
          <tr class="foot-row">
            <td colspan="3"><strong>OVERALL AVERAGE</strong></td>
            <td class="c"><strong>${esc(avgFinal)}</strong></td>
            <td class="c"></td>
            <td class="c"><strong>${esc(avgLo)}</strong></td>
            <td class="c"><strong>${esc(bandWord)}</strong></td>
            <td class="c"></td>
          </tr>`
      : `<tr><td colspan="8" class="c muted">No results available</td></tr>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Learner Summative Assessment</title>
  <link href="https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap" rel="stylesheet">
  <style>
    ${SECONDARY_A4_PAGE_SHELL_CSS}
    ${SECONDARY_UPPER_SECTION_STYLE_STUDENT_BLOCK_CSS}
    table.main { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
    table.main th, table.main td { border: 1px solid #000; padding: 5px 4px; vertical-align: middle; }
    table.main th {
      background: #e8e8e8; font-weight: 700; text-align: center; font-size: 8.5pt;
      text-transform: uppercase; line-height: 1.2;
    }
    table.main td:first-child { font-weight: 600; text-align: left; }
    table.main td.desc { text-align: center; }
    .c { text-align: center; }
    .muted { color: #555; }
    .summary-strip {
      display: grid;
      grid-template-columns: 92px 1fr auto;
      gap: 8px;
      align-items: center;
      border: 1px solid #000;
      margin-bottom: 10px;
      padding: 8px;
      font-size: 10pt;
    }
    .id-cell { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }
    .id-label { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
    .id-box { border: 1px solid #000; width: 100%; text-align: center; font-weight: 700; font-size: 14pt; padding: 6px; min-height: 44px; display: flex; align-items: center; justify-content: center; }
    .italic-note { font-style: italic; }
    .bold-word { font-weight: 700; font-size: 11pt; }
    .key-title { text-align: center; font-weight: 700; margin: 12px 0 6px; text-transform: uppercase; font-size: 10pt; }
    table.key { width: 100%; border-collapse: collapse; margin-bottom: 12px; font-size: 9pt; }
    table.key th, table.key td { border: 1px solid #000; padding: 4px 6px; }
    ${SECONDARY_OLEVEL_COMMENTS_NEXT_TERM_PANEL_CSS}
    .footer-admin { margin-top: 14px; font-size: 9pt; }
    .footer-admin .disc { text-align: center; margin-top: 8px; font-weight: 600; }
    .watermark {
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      opacity: 0.06; z-index: -1; pointer-events: none; max-width: 70%;
    }
    ${SECONDARY_LOWER_HEADER_PRINT_CSS}
  </style>
</head>
<body>
  ${schoolLogoBase64 ? `<div class="watermark"><img src="${schoolLogoBase64}" alt="" /></div>` : ''}
  ${headerHtml}

  ${studentBlockHtml}

  <table class="main">
    <thead>
      <tr>
        <th>Subject</th>
        <th>Formative Score (20%)</th>
        <th>EOY Summative Assessment (80%)</th>
        <th>Total 100%</th>
        <th>Grade</th>
        <th>Level of Achievement/3</th>
        <th>Descriptor</th>
        <th>TR'S Initial</th>
      </tr>
    </thead>
    <tbody>${tbody}</tbody>
  </table>

  <div class="summary-strip">
    <div class="id-cell">
      <div class="id-label">Identified</div>
      <div class="id-box">${esc(avgLo || '—')}</div>
    </div>
    <div class="italic-note">Overall Learner's achievements for the subjects attended:</div>
    <div class="bold-word">${esc(bandWord)}</div>
  </div>

  <div class="key-title">Key to Terms Used</div>
  <table class="key">
    <tbody>
      <tr><td style="width:18%">—</td><td>Learner does not do the subject/was absent</td></tr>
      <tr><td>0.9–1.49</td><td><strong>(Basic):</strong> Few learning outcomes achieved but not sufficient for overall learning achievement</td></tr>
      <tr><td>1.5–2.49</td><td><strong>(Moderate):</strong> Many learning outcomes achieved, enough for overall learning achievement</td></tr>
      <tr><td>2.5–3.00</td><td><strong>(Outstanding):</strong> Most or all learning outcomes achieved</td></tr>
    </tbody>
  </table>

  ${commentsNextTermHtml}

  <div class="footer-admin">
    <p class="disc">This report is not valid without a school stamp</p>
  </div>
</body>
</html>`;
}

/** Progressive template Identifier column: from teacher-saved descriptor (LO key Basic / Moderate / Accomplished; Outstanding → 3). */
function progressiveIdentifierFromDescriptor(descriptor: string): '1' | '2' | '3' | '' {
  const raw = String(descriptor ?? '').trim();
  if (!raw) return '';
  const d = raw.toLowerCase();
  const first = (d.split(/[\s–—:]+/)[0] ?? d).trim();
  if (first === 'outstanding' || first === 'accomplished') return '3';
  if (first === 'moderate') return '2';
  if (first === 'basic') return '1';
  return '';
}

export function generateTemplate3KyoteraHTML(reportData: any, schoolLogoBase64?: string | null, studentPhotoBase64?: string | null) {
  const { school, examSet, students } = reportData;
  const student = students?.[0];
  if (!student) return '<html><body>Missing student</body></html>';

  const year = examSet?.year ?? new Date().getFullYear();
  const results: any[] = Array.isArray(student.results) ? student.results : [];
  const reportNo = student.report_serial ?? student.admission_number ?? student.student_id ?? '—';
  type PRow = {
    subject: string;
    c1: string;
    c2: string;
    avg20: string;
    exam80: string;
    total: string;
    id: string;
    init: string;
    finalNum: number;
    avg20Num: number;
  };

  const rows: PRow[] = results.map((r: any) => {
    const c1raw = r.continuous_c1 ?? r.c1 ?? null;
    const c2raw = r.continuous_c2 ?? r.c2 ?? null;
    const formative = parseNum(r.formative_score);
    const c1 = c1raw != null ? parseNum(c1raw) : NaN;
    const c2 = c2raw != null ? parseNum(c2raw) : NaN;
    const c1s = Number.isFinite(c1) ? String(Math.round(c1 * 10) / 10) : '';
    const c2s = Number.isFinite(c2) ? String(Math.round(c2 * 10) / 10) : '';
    const avg20Num = formative;
    const avg20 = Number.isFinite(avg20Num) ? String(Math.round(avg20Num * 10) / 10) : '';
    const exam80 = r.exam_score != null ? String(r.exam_score) : '';
    const total = r.final_score != null ? String(r.final_score) : '';
    const finalNum = parseNum(r.final_score);
    return {
      subject: String(r.subject ?? ''),
      c1: c1s,
      c2: c2s,
      avg20,
      exam80,
      total,
      id: progressiveIdentifierFromDescriptor(String(r.descriptor ?? '')),
      init: String(r.teacher_initials ?? ''),
      finalNum: Number.isFinite(finalNum) ? finalNum : NaN,
      avg20Num: Number.isFinite(avg20Num) ? avg20Num : NaN,
    };
  });

  const finals = rows.map((r) => r.finalNum).filter((n) => Number.isFinite(n));
  const avgs20 = rows.map((r) => r.avg20Num).filter((n) => Number.isFinite(n));
  const ids = rows.map((r) => parseInt(r.id, 10)).filter((n) => n >= 1 && n <= 3);

  const sumRow = {
    avgScore: finals.length ? (finals.reduce((a, b) => a + b, 0) / finals.length).toFixed(1) : '',
    pts20: avgs20.length ? (avgs20.reduce((a, b) => a + b, 0) / avgs20.length).toFixed(1) : '',
    id: ids.length ? (ids.reduce((a, b) => a + b, 0) / ids.length).toFixed(0) : '',
  };

  const overallWord =
    parseFloat(sumRow.id) >= 2.5 ? 'Accomplished' : parseFloat(sumRow.id) >= 1.5 ? 'Moderate' : 'Basic';

  const feesRaw = student.progressiveFeesBalance ?? student.feesBalance ?? student.fees?.balance ?? 0;
  const feesLabel =
    typeof feesRaw === 'number'
      ? new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(
          feesRaw
        )
      : esc(feesRaw);

  const ct = student.comments?.class_teacher_text ?? student.comments?.class_teacher_comment ?? '';
  const ht = student.comments?.head_teacher_text ?? student.comments?.headteacher_text ?? '';
  const classTeacherNameP = String(student.comments?.class_teacher_name ?? '');
  const headTeacherNameP = String(student.comments?.head_teacher_name ?? '');
  const nextBeginsRawP =
    student.nextTermBegins ??
    student.next_term_begins_date ??
    student.processed?.nextTermBeginsDate ??
    '';
  const commentsNextTermHtmlP = buildSecondaryOlevelCommentsNextTermPanelHtml({
    classTeacherComment: String(ct),
    headTeacherComment: String(ht),
    classTeacherName: classTeacherNameP,
    headTeacherName: headTeacherNameP,
    nextTermBeginsDisplay: formatNextTermBeginsLongDisplay(nextBeginsRawP),
  });

  const headerHtml = buildSecondaryLowerSectionHeaderHtml(school, schoolLogoBase64 ?? null, {
    chipTitle: secondaryOlevelProgressiveReportChipTitle(examSet),
    metaLine: `Report No. ${reportNo} · Year ${year}${examSet?.name ? ` · ${examSet.name}` : ''}`,
  });

  const studentBlockHtmlP = buildSecondaryUpperSectionStyleStudentBlockHtml(
    student,
    examSet,
    studentPhotoBase64 ?? null,
  );

  const tbody =
    rows.length > 0
      ? rows
          .map(
            (r) => `
        <tr>
          <td>${esc(r.subject)}</td>
          <td class="c">${esc(r.c1)}</td>
          <td class="c">${esc(r.c2)}</td>
          <td class="c">${esc(r.avg20)}</td>
          <td class="c">${esc(r.exam80)}</td>
          <td class="c">${esc(r.total)}</td>
          <td class="c">${esc(r.id)}</td>
          <td class="c">${esc(r.init)}</td>
        </tr>`
          )
          .join('') +
        `
        <tr class="sum">
          <td colspan="3"><strong>Average score</strong></td>
          <td class="c"><strong>${esc(sumRow.pts20)}</strong><div class="sum-hint">Pts (out of 20)</div></td>
          <td class="c"></td>
          <td class="c"><strong>${esc(sumRow.avgScore)}</strong><div class="sum-hint">Total 100%</div></td>
          <td class="c"><strong>${esc(sumRow.id)}</strong><div class="sum-hint">Identifier</div></td>
          <td class="c"></td>
        </tr>`
      : `<tr><td colspan="8" class="c muted">No results available</td></tr>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Progressive Report</title>
  <link href="https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap" rel="stylesheet">
  <style>
    ${SECONDARY_A4_PAGE_SHELL_CSS}
    ${SECONDARY_UPPER_SECTION_STYLE_STUDENT_BLOCK_CSS}
    table.grid { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 8.5pt; }
    table.grid th, table.grid td { border: 1px solid #000; padding: 4px 3px; }
    table.grid th { background: #eeeeee; font-weight: 700; text-align: center; vertical-align: bottom; line-height: 1.15; }
    .c { text-align: center; }
    tr.sum td { background: #f5f5f5; font-weight: 600; }
    .sum-hint { font-size: 7pt; font-weight: 400; text-transform: none; margin-top: 2px; }
    .muted { color: #555; }
    .overall-line { margin: 10px 0; font-size: 10pt; }
    .overall-line strong { font-size: 11pt; }
    .lo-key { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 9pt; }
    .lo-key th, .lo-key td { border: 1px solid #000; padding: 4px 6px; }
    .lo-key th { background: #e0e0e0; }
    .grades { margin: 10px 0; font-size: 9pt; }
    .grades strong { display: block; margin-bottom: 4px; }
    .fees { color: #c62828; font-weight: 700; font-size: 11pt; }
    ${SECONDARY_OLEVEL_COMMENTS_NEXT_TERM_PANEL_CSS}
    .watermark { position: fixed; top: 40%; left: 50%; transform: translate(-50%,-50%); opacity: 0.05; z-index: -1; max-width: 55%; }
    ${SECONDARY_LOWER_HEADER_PRINT_CSS}
  </style>
</head>
<body>
  ${schoolLogoBase64 ? `<div class="watermark"><img src="${schoolLogoBase64}" alt="" /></div>` : ''}
  ${headerHtml}

  ${studentBlockHtmlP}

  <table class="grid">
    <thead>
      <tr>
        <th>Subject</th>
        <th>C1</th>
        <th>C2</th>
        <th>Avg Score /20</th>
        <th>Final Exam /80</th>
        <th>Total Score 100%</th>
        <th>Identifier</th>
        <th>Init</th>
      </tr>
    </thead>
    <tbody>${tbody}</tbody>
  </table>

  <p class="overall-line"><strong>Overall Learner Achievement:</strong> ${esc(overallWord)} &nbsp; <strong>Identifier:</strong> ${esc(sumRow.id || '—')}</p>
  <p style="font-size:8.5pt;margin:4px 0"><strong>LO</strong> = Learning Outcomes. <strong>C1</strong> / <strong>C2</strong> = activity scores from the earliest and latest exam set in the term for that line (merged report row). <strong>Avg Score /20</strong> is the saved formative score on that merged row.</p>

  <table class="lo-key">
    <thead><tr><th colspan="2">Learning Outcomes Key</th></tr></thead>
    <tbody>
      <tr><td>—</td><td>No Learning outcomes achieved (Learner was absent)</td></tr>
      <tr><td>1</td><td>Some LOs achieved but not sufficient for overall achievement — <strong>Basic</strong></td></tr>
      <tr><td>2</td><td>Most LOs achieved, enough for overall learning achievement — <strong>Moderate</strong></td></tr>
      <tr><td>3</td><td>All LOs achieved, achievement with ease — <strong>Accomplished</strong></td></tr>
    </tbody>
  </table>

  <div class="grades">
    <strong>Letter-grade scale</strong>
    A: 80+ &nbsp;|&nbsp; B: 70+ &nbsp;|&nbsp; C: 60+ &nbsp;|&nbsp; D: 50+ &nbsp;|&nbsp; E: 0–49
  </div>

  ${commentsNextTermHtmlP}
  <p class="fees" style="margin-top:10px">Fees Balance: ${feesLabel}</p>
</body>
</html>`;
}
