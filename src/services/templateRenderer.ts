import { supabase } from '../lib/supabase';

/**
 * Template Renderer - PRESENTATION ONLY
 * 
 * CRITICAL: This function does NO calculations.
 * All data must be pre-calculated in snapshot.
 * Templates are used ONLY for rendering HTML.
 */

interface TemplatePlaceholders {
  [key: string]: string | number | null | undefined;
}

/**
 * Load template HTML/CSS from database
 */
export async function loadTemplate(
  schoolId: string,
  templateId?: string
): Promise<{ html: string; css: string } | null> {
  let query = supabase
    .from('report_templates')
    .select('html_content, css_content')
    .eq('school_id', schoolId);

  if (templateId) {
    query = query.eq('id', templateId);
  } else {
    query = query.eq('is_default', true);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return null;
  }

  return {
    html: data.html_content,
    css: data.css_content || '',
  };
}

/**
 * Replace placeholders in template HTML
 * All values are from frozen snapshot data - NO calculations
 */
export function replaceTemplatePlaceholders(
  html: string,
  css: string,
  placeholders: TemplatePlaceholders
): string {
  let processedHtml = html;
  let processedCss = css;

  // Replace all placeholders with actual values
  Object.entries(placeholders).forEach(([key, value]) => {
    const regex = new RegExp(`\\[${key}\\]`, 'g');
    const stringValue = value !== null && value !== undefined ? String(value) : '';
    processedHtml = processedHtml.replace(regex, stringValue);
    processedCss = processedCss.replace(regex, stringValue);
  });

  // Combine HTML and CSS
  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Student Report</title>
      <style>
        ${processedCss}
      </style>
    </head>
    <body>
      ${processedHtml}
    </body>
    </html>
  `;

  return fullHtml;
}

/**
 * Render report HTML from snapshot data
 * Uses template for presentation only
 */
export async function renderReportFromSnapshot(
  snapshotId: string,
  studentId: string,
  templateId?: string
): Promise<string> {
  // 1. Get snapshot data (already transformed to report format)
  const { transformSnapshotToReportFormat } = await import('./reportDataTransformer');
  const reportData = await transformSnapshotToReportFormat(snapshotId, studentId);

  if (!reportData.students || reportData.students.length === 0) {
    throw new Error('No student data in report');
  }

  const student = reportData.students[0];
  const school = reportData.school;
  const examSet = reportData.examSet;

  // 2. Load template
  const template = await loadTemplate(reportData.school.school_id, templateId);
  if (!template) {
    throw new Error('Template not found');
  }

  // 3. Build placeholders from frozen data (NO calculations)
  const placeholders: TemplatePlaceholders = {
    // School info
    SCHOOL_NAME: school.name,
    SCHOOL_ADDRESS: school.address,
    SCHOOL_PHONE: school.phone,
    SCHOOL_EMAIL: school.email,
    SCHOOL_MOTTO: school.motto,
    
    // Student info
    STUDENT_NAME: student.name,
    STUDENT_ID: student.admission_number,
    STUDENT_CLASS: student.current_class,
    
    // Exam set info
    EXAM_SET_NAME: examSet.name,
    EXAM_TERM: examSet.term,
    EXAM_YEAR: examSet.year,
    
    // Summary (all pre-calculated)
    TOTAL_MARKS: student.summary.totalMarks,
    AVERAGE: student.summary.average?.toFixed(2),
    AGGREGATE: student.summary.aggregate?.toFixed(2),
    DIVISION: student.summary.division,
    POSITION: student.summary.classPosition,
    TOTAL_STUDENTS: student.summary.totalStudents,
    ATTENDANCE_PERCENTAGE: student.summary.attendancePercentage,
    
    // Fees (pre-calculated)
    FEES_BALANCE: student.fees.balance,
    FEES_PAID: student.fees.paid,
    FEES_EXPECTED: student.fees.expected,
    
    // Comments (pre-resolved)
    CLASS_TEACHER_COMMENT: student.comments.class_teacher_text,
    HEADTEACHER_COMMENT: student.comments.headteacher_text,
  };

  // 4. Build subjects table HTML (from frozen results)
  let subjectsHtml = '';
  student.results.forEach((result: any) => {
    subjectsHtml += `
      <tr>
        <td>${result.subject}</td>
        <td>${result.marks_obtained}</td>
        <td>${result.total_marks}</td>
        <td>${result.grade}</td>
        <td>${result.remarks || ''}</td>
      </tr>
    `;
  });

  placeholders.SUBJECTS_TABLE = subjectsHtml;

  // 5. Replace placeholders and return HTML
  return replaceTemplatePlaceholders(template.html, template.css, placeholders);
}

/**
 * Render report HTML using existing template functions (for compatibility)
 * Uses templateHTMLGenerator for built-in templates - presentation only.
 */
export async function renderReportWithExistingTemplates(
  reportData: any,
  templateKey: string = 'template1'
): Promise<string> {
  const { renderTemplateHTML } = await import('./templateHTMLGenerator');
  return renderTemplateHTML(reportData, templateKey, null, null);
}




