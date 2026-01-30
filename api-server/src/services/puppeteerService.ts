import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { createClient } from '@supabase/supabase-js';

/**
 * Generate PDF from CACHED reports ONLY
 * 
 * CRITICAL: This function uses ONLY cached generated_reports.
 * NO live calculations, NO live data joins.
 * All data comes from snapshot.
 */

interface GeneratePDFOptions {
  snapshotId: string;
  studentIds?: string[];
  templateId?: string;
}

/**
 * Generate PDF using cached report data
 * Reports must already be generated and cached in generated_reports table
 */
export async function generatePDF(options: GeneratePDFOptions): Promise<Buffer> {
  const { snapshotId, studentIds, templateId } = options;

  // Initialize Supabase client
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // 1. Get cached reports ONLY (no live data)
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
    throw new Error('No cached reports found. Generate reports first using bulk generation.');
  }

  // 2. Get template HTML/CSS
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

  if (!template) {
    throw new Error('Template not found');
  }

  // 3. Launch browser
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
  });

  try {
    const page = await browser.newPage();

    // 4. Generate HTML for first report (or combine multiple)
    // Use cached report_data - NO calculations
    const firstReport = cachedReports[0];
    const reportData = firstReport.report_data;
    const student = reportData.students[0];
    const school = reportData.school;

    // 5. Render HTML using template (presentation only)
    const html = renderReportHTML(template.html_content, template.css_content, reportData);

    await page.setContent(html, { waitUntil: 'networkidle0' });

    // 6. Generate PDF
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0.5in',
        right: '0.5in',
        bottom: '0.5in',
        left: '0.5in',
      },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

/**
 * Render report HTML from cached data using DB template and placeholders.
 * Uses template html_content/css_content and reportData - NO calculations.
 */
function renderReportHTML(templateHtml: string, templateCss: string, reportData: any): string {
  const student = reportData.students?.[0];
  const school = reportData.school || {};
  const examSet = reportData.examSet || {};
  if (!student) throw new Error('No student in report data');

  // Build placeholders from cached report data (presentation only)
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
