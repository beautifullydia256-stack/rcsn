/**
 * Vercel serverless: POST /api/pdf/generate
 * Generates PDF from cached generated_reports (same logic as api-server).
 * Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel env.
 */

import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { createClient } from '@supabase/supabase-js';

type Req = { method?: string; body?: Record<string, unknown> };
type Res = {
  setHeader: (k: string, v: string) => void;
  status: (n: number) => Res;
  json: (x: unknown) => void;
  send: (body: Buffer) => void;
  end: () => void;
};

export const config = { maxDuration: 60 };

interface GeneratePDFOptions {
  snapshotId: string;
  studentIds?: string[];
  templateId?: string;
}

function renderReportHTML(templateHtml: string, templateCss: string, reportData: any): string {
  const student = reportData.students?.[0];
  const school = reportData.school || {};
  const examSet = reportData.examSet || {};
  if (!student) throw new Error('No student in report data');

  let subjectsHtml = '';
  if (Array.isArray(student.results)) {
    subjectsHtml = student.results
      .map(
        (r: any) =>
          `<tr><td>${r.subject ?? ''}</td><td>${r.marks_obtained ?? ''}</td><td>${r.total_marks ?? 100}</td><td>${r.grade ?? ''}</td><td>${r.remarks ?? ''}</td></tr>`
      )
      .join('');
  }

  const placeholders: Record<string, string | number> = {
    SCHOOL_NAME: school.name ?? '',
    SCHOOL_ADDRESS: school.address ?? '',
    SCHOOL_PHONE: school.phone ?? '',
    SCHOOL_EMAIL: school.email ?? '',
    SCHOOL_MOTTO: school.motto ?? '',
    STUDENT_NAME: student.name ?? '',
    STUDENT_ID: student.admission_number ?? student.student_id ?? '',
    STUDENT_CLASS: student.current_class ?? '',
    EXAM_SET_NAME: examSet.name ?? '',
    EXAM_TERM: examSet.term ?? '',
    EXAM_YEAR: examSet.year ?? '',
    TOTAL_MARKS: student.summary?.totalMarks ?? '',
    AVERAGE: student.summary?.average != null ? String(student.summary.average) : '',
    AGGREGATE: student.summary?.aggregate != null ? String(student.summary.aggregate) : '',
    DIVISION: student.summary?.division ?? '',
    POSITION: student.summary?.classPosition ?? '',
    TOTAL_STUDENTS: student.summary?.totalStudents ?? '',
    ATTENDANCE_PERCENTAGE: student.summary?.attendancePercentage ?? '',
    FEES_BALANCE: student.fees?.balance ?? 0,
    FEES_PAID: student.fees?.paid ?? 0,
    FEES_EXPECTED: student.fees?.expected ?? 0,
    CLASS_TEACHER_COMMENT: student.comments?.class_teacher_text ?? '',
    HEADTEACHER_COMMENT: student.comments?.headteacher_text ?? '',
    SUBJECTS_TABLE: subjectsHtml,
  };

  let processedHtml = templateHtml;
  let processedCss = templateCss || '';
  for (const [key, value] of Object.entries(placeholders)) {
    const regex = new RegExp(`\\[${key}\\]`, 'g');
    const str = value !== null && value !== undefined ? String(value) : '';
    processedHtml = processedHtml.replace(regex, str);
    processedCss = processedCss.replace(regex, str);
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Student Report</title>
  <style>${processedCss}</style>
</head>
<body>
  ${processedHtml}
</body>
</html>`;
}

/** Fallback when report_templates has no row for the school. */
function buildMinimalReportHTML(reportData: any): string {
  const student = reportData.students?.[0];
  const school = reportData.school || {};
  const examSet = reportData.examSet || {};
  if (!student) throw new Error('No student in report data');

  let rows = '';
  if (Array.isArray(student.results)) {
    rows = student.results
      .map(
        (r: any) =>
          `<tr><td>${r.subject ?? ''}</td><td>${r.marks_obtained ?? ''}</td><td>${r.total_marks ?? 100}</td><td>${r.grade ?? ''}</td><td>${r.remarks ?? ''}</td></tr>`
      )
      .join('');
  }

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Student Report</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 1in; }
    table { border-collapse: collapse; width: 100%; margin-top: 1em; }
    th, td { border: 1px solid #333; padding: 6px 10px; text-align: left; }
    th { background: #eee; }
    .header { text-align: center; margin-bottom: 1.5em; }
    .meta { margin-top: 1em; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${(school as any).name ?? 'School'}</h1>
    <p>${(school as any).address ?? ''}</p>
    <p><strong>STUDENT PROGRESS REPORT</strong></p>
  </div>
  <p><strong>Student:</strong> ${student.name ?? ''} &nbsp; <strong>Class:</strong> ${student.current_class ?? ''} &nbsp; <strong>Admission No:</strong> ${student.admission_number ?? student.student_id ?? ''}</p>
  <p><strong>Term:</strong> ${(examSet as any).term ?? ''} &nbsp; <strong>Year:</strong> ${(examSet as any).year ?? ''} &nbsp; <strong>Exam set:</strong> ${(examSet as any).name ?? ''}</p>
  <table>
    <thead><tr><th>Subject</th><th>Marks</th><th>Total</th><th>Grade</th><th>Remarks</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="meta">
    <p><strong>Average:</strong> ${student.summary?.average ?? '—'}% &nbsp; <strong>Position:</strong> ${student.summary?.classPosition ?? '—'} of ${student.summary?.totalStudents ?? '—'}</p>
    <p><strong>Division:</strong> ${student.summary?.division ?? '—'} &nbsp; <strong>Aggregate:</strong> ${student.summary?.aggregate ?? '—'}</p>
    <p><strong>Class teacher:</strong> ${student.comments?.class_teacher_text ?? ''}</p>
    <p><strong>Head teacher:</strong> ${student.comments?.headteacher_text ?? student.comments?.head_teacher_text ?? ''}</p>
  </div>
</body>
</html>`;
}

async function generatePDF(options: GeneratePDFOptions): Promise<Buffer> {
  const { snapshotId, studentIds, templateId } = options;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Vercel env.');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let query = supabase
    .from('generated_reports')
    .select('report_data, student_id')
    .eq('snapshot_id', snapshotId);

  if (studentIds && studentIds.length > 0) {
    query = query.in('student_id', studentIds);
  }
  if (templateId) {
    query = query.eq('template_id', templateId);
  }

  const { data: cachedReports, error: reportsError } = await query;
  if (reportsError) throw reportsError;
  if (!cachedReports || cachedReports.length === 0) {
    throw new Error('No cached reports found. Generate reports first.');
  }

  const { data: snapshot } = await supabase
    .from('report_snapshots')
    .select('school_id')
    .eq('id', snapshotId)
    .single();
  if (!snapshot) throw new Error('Snapshot not found');

  let templateQuery = supabase
    .from('report_templates')
    .select('html_content, css_content')
    .eq('school_id', snapshot.school_id);
  if (templateId) {
    templateQuery = templateQuery.eq('id', templateId);
  } else {
    templateQuery = templateQuery.eq('is_default', true);
  }
  const { data: template } = await templateQuery.single();

  const htmlContent = template?.html_content;
  const cssContent = template?.css_content ?? '';
  const useBuiltIn = !htmlContent || typeof htmlContent !== 'string' || !htmlContent.trim();

  const executablePath = await chromium.executablePath();
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath,
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();
    const firstReport = cachedReports[0];
    const reportData = firstReport.report_data;
    const html = useBuiltIn
      ? buildMinimalReportHTML(reportData)
      : renderReportHTML(htmlContent, cssContent, reportData);
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0.5in', right: '0.5in', bottom: '0.5in', left: '0.5in' },
    });
    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

export default async function handler(req: Req, res: Res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = (req.body || {}) as { snapshotId?: string; studentIds?: string[]; templateId?: string };
  const snapshotId = body.snapshotId;
  if (!snapshotId || typeof snapshotId !== 'string') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(400).json({ error: 'snapshotId is required' });
  }

  try {
    const pdfBuffer = await generatePDF({
      snapshotId,
      studentIds: body.studentIds,
      templateId: body.templateId,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reports_${snapshotId}.pdf"`);
    return res.send(pdfBuffer);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('PDF generate error:', message);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: message || 'PDF generation failed' });
  }
}
