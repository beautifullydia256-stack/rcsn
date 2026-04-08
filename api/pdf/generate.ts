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
  end: (body?: Buffer | string) => void;
};

export const config = { maxDuration: 60 };

interface GeneratePDFOptions {
  snapshotId?: string;
  studentIds?: string[];
  templateId?: string;
  /** When provided, use this report data instead of fetching from DB (same as preview). Skips all report/snapshot/photo/fees fetches. */
  reportData?: Record<string, unknown>;
  /** When reportData is provided, use this for template lookup. Can also be read from reportData.school?.school_id. */
  schoolId?: string;
  /** Fast path (like preview): list of report_data from generate-report-preview. No DB reads; combine into one PDF. */
  reportDataList?: Record<string, unknown>[];
}

function escapeHtmlText(raw: unknown): string {
  return String(raw ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Report average as a whole number (matches on-screen reports). */
function formatAverageForPdf(raw: unknown): string {
  if (raw === null || raw === undefined || raw === '') return '—';
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (Number.isNaN(n)) return String(raw);
  return String(Math.round(n));
}

/**
 * Same resolution order as Vite Template3/4 header: contact_* fields first, then generic email/phone.
 * Renders the two-line contact block like the on-screen preview (email | phone).
 */
function schoolContactBlockHtml(school: Record<string, unknown> | undefined | null): string {
  const s = (school || {}) as Record<string, unknown>;
  const str = (v: unknown) => (v == null ? '' : String(v).trim());
  const email = str(s.contact_email ?? s.email ?? s.school_email);
  const phone = str(s.contact_phone ?? s.phone ?? s.school_phone);
  if (!email && !phone) return '';
  const e = email ? escapeHtmlText(email) : '';
  const p = phone ? escapeHtmlText(phone) : '';
  const sep = email && phone ? '<span style="margin:0 8px;color:#64748b">|</span>' : '';
  return `<div class="school-contact">${e}${sep}${p}</div>`;
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
    SCHOOL_PHONE: (school as any).phone ?? (school as any).contact_phone ?? '',
    SCHOOL_EMAIL: (school as any).email ?? (school as any).contact_email ?? '',
    SCHOOL_MOTTO: school.motto ?? '',
    STUDENT_NAME: student.name ?? '',
    STUDENT_ID: student.admission_number ?? student.student_id ?? '',
    STUDENT_CLASS: student.current_class ?? '',
    EXAM_SET_NAME: examSet.name ?? '',
    EXAM_TERM: examSet.term ?? '',
    EXAM_YEAR: examSet.year ?? '',
    TOTAL_MARKS: student.summary?.totalMarks ?? '',
    AVERAGE:
      student.summary?.average != null && student.summary?.average !== ''
        ? formatAverageForPdf(student.summary.average)
        : '',
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

/** True if class is Upper Section (P.4–P.7) so we use Template 4 layout. */
function isUpperSectionClass(className: string): boolean {
  if (!className || typeof className !== 'string') return false;
  return /(primary\s*[4567]|p\.\s*[4567]|p[4567])/i.test(className.trim());
}

/** True if class is Lower Section (P.1–P.3) so we use Template 3 layout. */
function isLowerSectionPrimary(className: string): boolean {
  if (!className || typeof className !== 'string') return false;
  return /(primary\s*[123]|p\.\s*[123]|p[123])/i.test(className.trim());
}

/** True if DB template is the default placeholder (not a real custom design). */
function isDefaultPlaceholderTemplate(htmlContent: string | null | undefined): boolean {
  if (!htmlContent || typeof htmlContent !== 'string') return true;
  const t = htmlContent.trim();
  return t.length < 400 || /default\s*report\s*template|this is a default template created automatically/i.test(t);
}

/** Primary grade from percentage (D1–F9). */
function primaryGradeFromMarks(marks: number, total: number): string {
  if (total <= 0) return 'F9';
  const pct = (marks / total) * 100;
  if (pct >= 75) return 'D1';
  if (pct >= 70) return 'D2';
  if (pct >= 65) return 'C3';
  if (pct >= 60) return 'C4';
  if (pct >= 55) return 'C5';
  if (pct >= 50) return 'C6';
  if (pct >= 45) return 'P7';
  if (pct >= 40) return 'P8';
  return 'F9';
}

/** Same order as on-screen Template 3/4: English → Mathematics → Science, then alphabetical. */
const PRIORITY_PRIMARY_SUBJECT_NAMES = ['English', 'Mathematics', 'Science'] as const;
function sortPrimarySubjectNamesForPdf<T extends { subject?: string; subject_name?: string }>(rows: T[]): T[] {
  const nameOf = (row: T) => String((row as { subject?: string; subject_name?: string }).subject_name ?? row.subject ?? '').trim();
  const priorityIndex = (name: string) =>
    PRIORITY_PRIMARY_SUBJECT_NAMES.findIndex((p) => p.toLowerCase() === name.toLowerCase());
  return [...rows].sort((a, b) => {
    const na = nameOf(a);
    const nb = nameOf(b);
    const ai = priorityIndex(na);
    const bi = priorityIndex(nb);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return na.localeCompare(nb, undefined, { sensitivity: 'base' });
  });
}

/** Marks cells show numeric 0 when the exam was missed; MISSED stays in remarks / grade only. */
function pdfMarkCellDisplay(marks: unknown, grade: unknown): string | number {
  const g = String(grade ?? '').trim().toUpperCase();
  if (g === 'MISSED') return 0;
  if (marks === '' || marks == null) return '';
  const ms = String(marks).trim().toUpperCase();
  if (ms === 'MISSED') return 0;
  return marks as string | number;
}

/**
 * Build HTML that matches the on-screen "Report for Upper Section" (Template 4) preview:
 * logo left, school info center, "End of Term Report – Upper Section", student block + photo, table MID | END | Grade | Teacher's Comment | Teacher.
 */
function buildTemplate4UpperSectionHTML(reportData: any): string {
  const student = reportData.students?.[0];
  const school = reportData.school || {};
  const examSet = reportData.examSet || {};
  if (!student) throw new Error('No student in report data');

  const schoolName = (school as any).name ?? 'School Name';
  const schoolSubtitle = (school as any).subtitle ?? '';
  const schoolAddress = (school as any).address ?? '';
  const schoolPobox = (school as any).pobox ?? '';
  const schoolMotto = (school as any).motto ?? '';
  const logoUrl = (school as any).logo_url ?? (school as any).logo ?? '';
  const schoolContactHtml = schoolContactBlockHtml(school as Record<string, unknown>);

  const term = (examSet as any).term ?? '';
  const year = (examSet as any).year ?? '';
  const examName = (examSet as any).name ?? '';

  const isMidTermOnly = (name: string) => {
    const n = String(name || '').trim().toLowerCase();
    return n === 'mid term' || n === 'midterm' || n.includes('mid') || n.includes('mid-term');
  };
  const showENDColumn = !isMidTermOnly(examName);

  // Build subjects: use student.subjects if present, else derive from student.results (same as ReportPreviewFromData)
  type Subj = { subject_name: string; mot_marks: string | number; eot_marks: string | number; eot_grade: string; mot_grade: string; bot_grade?: string; total_marks: number; teacher_comment: string; teacher_name: string };
  let subjects: Subj[] = [];
  if (Array.isArray((student as any).subjects) && (student as any).subjects.length > 0) {
    subjects = ((student as any).subjects as Subj[]).map((s) => ({
      subject_name: s.subject_name ?? '',
      mot_marks: s.mot_marks ?? '',
      eot_marks: s.eot_marks ?? '',
      eot_grade: (s.eot_grade ?? '').toString().trim() || '—',
      mot_grade: (s.mot_grade ?? '').toString().trim() || '—',
      bot_grade: (s.bot_grade ?? '').toString().trim() || '—',
      total_marks: Number(s.total_marks) || 100,
      teacher_comment: (s.teacher_comment ?? '').toString(),
      teacher_name: (s.teacher_name ?? '').toString(),
    }));
  } else if (Array.isArray(student.results)) {
    const bySubject = new Map<string, Subj>();
    for (const r of student.results as any[]) {
      const sub = (r.subject ?? '').toString().trim();
      if (!sub) continue;
      const marks = r.marks_obtained ?? r.final_score ?? '';
      const total = Number(r.total_marks ?? 100);
      const rawGrade = (r.grade ?? '').toString().trim();
      const isAtoF = ['A', 'B', 'C', 'D', 'E', 'F'].includes(rawGrade.toUpperCase());
      const grade = rawGrade && !isAtoF ? rawGrade : (marks !== '' && marks != null && !Number.isNaN(Number(marks))) ? primaryGradeFromMarks(Number(marks), total) : rawGrade || '—';
      const teacherComment = (r.teacher_comment ?? r.remarks ?? r.overall_remark ?? r.teacher_remark ?? '').toString();
      const teacherName = (r.teacher_initials ?? '').toString();
      if (!bySubject.has(sub)) {
        bySubject.set(sub, {
          subject_name: sub,
          mot_marks: marks,
          eot_marks: marks,
          eot_grade: grade,
          mot_grade: grade,
          total_marks: total,
          teacher_comment: teacherComment,
          teacher_name: teacherName,
        });
      } else {
        const ex = bySubject.get(sub)!;
        if (teacherComment) ex.teacher_comment = teacherComment;
        if (teacherName) ex.teacher_name = teacherName;
      }
    }
    subjects = Array.from(bySubject.values());
  }

  subjects = sortPrimarySubjectNamesForPdf(subjects);

  const subjectRows = subjects
    .map((s) => {
      const displayGrade = (s.eot_grade && s.eot_grade !== '—') ? s.eot_grade : (s.mot_grade && s.mot_grade !== '—') ? s.mot_grade : (s.bot_grade && s.bot_grade !== '—') ? s.bot_grade : '—';
      const motCell = pdfMarkCellDisplay(s.mot_marks, s.mot_grade);
      const eotCell = pdfMarkCellDisplay(s.eot_marks, s.eot_grade);
      if (showENDColumn) {
        return `<tr>
          <td class="subj-name">${s.subject_name}</td>
          <td class="tc">${motCell}</td>
          <td class="tc">${eotCell}</td>
          <td class="tc grade">${displayGrade}</td>
          <td class="comment">${s.teacher_comment}</td>
          <td class="teacher">${s.teacher_name}</td>
        </tr>`;
      }
      return `<tr>
          <td class="subj-name">${s.subject_name}</td>
          <td class="tc">${motCell}</td>
          <td class="tc grade">${displayGrade}</td>
          <td class="comment">${s.teacher_comment}</td>
          <td class="teacher">${s.teacher_name}</td>
        </tr>`;
    })
    .join('');

  const streamDisplay = (student as any).stream ?? (student as any).current_stream ?? (student as any).stream_name ?? 'N/A';
  const reportDateDisplay = (() => {
    const raw = (examSet as any).date ?? (student as any).report_date ?? (student as any).summary?.reportDate;
    if (!raw) return 'N/A';
    const d = new Date(raw);
    return isNaN(d.getTime()) ? String(raw) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  })();

  const classTeacherComment =
    (student as any).comments?.class_teacher_text ?? (student as any).comments?.class_teacher_comment ?? '';
  const headTeacherComment =
    (student as any).comments?.headteacher_text ?? (student as any).comments?.head_teacher_text ?? '';

  const summary = (student as any).summary || {};
  const totalMarks = summary.totalMarks ?? summary.total_marks ?? 'N/A';
  const avg = formatAverageForPdf(summary.average);
  const position =
    summary.classPosition != null && summary.totalStudents != null
      ? `${summary.classPosition} of ${summary.totalStudents}`
      : summary.classPosition ?? '—';
  let division = summary.division ?? '—';
  if (typeof division === 'string' && division.toLowerCase().startsWith('division')) {
    division = division.replace(/division\s*/i, '').trim() || division;
  }
  const aggregate = summary.aggregate != null && summary.aggregate !== undefined ? summary.aggregate : 'N/A';

  const attendance = summary.attendanceDetails || summary.attendance_details || {};
  const daysPresent = attendance.presentDays ?? attendance.present_days ?? 'N/A';
  const daysAbsent = attendance.absentDays ?? attendance.absent_days ?? 'N/A';
  const totalDays = attendance.totalSchoolDays ?? attendance.total_school_days ?? attendance.total_days ?? 'N/A';
  const attendancePct = summary.attendancePercentage != null ? String(summary.attendancePercentage) + '%' : '';
  const attendanceFallback = (daysPresent === 'N/A' && daysAbsent === 'N/A' && totalDays === 'N/A' && attendancePct)
    ? attendancePct + ' (days not recorded)'
    : null;

  const nextTermBegins = (student as any).next_term_begins_date
    ? new Date((student as any).next_term_begins_date).toLocaleDateString()
    : 'TBA';
  const feesBalance = (student as any).feesBalance ?? (student as any).fees?.balance ?? 0;
  const feesFormatted =
    typeof feesBalance === 'number'
      ? new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(feesBalance)
      : String(feesBalance);

  const photoUrl =
    (student as any).profile_photo ??
    (student as any).photo_url ??
    (student as any).student_photo_url ??
    (reportData as any).student_photo_url ??
    '';
  const hasPhoto = typeof photoUrl === 'string' && photoUrl.trim().length > 0;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Student Report - Upper Section</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    /* No height:100% — merged class PDFs paginate incorrectly in Chromium. */
    html, body { margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 10.2pt; line-height: 1.3; color: #1e293b; background: #fff; }
    .report-page { width: 100%; max-width: 210mm; margin: 0 auto; padding: 4mm 5mm 4mm 5mm; box-sizing: border-box; }
    .header-wrap { display: flex; align-items: flex-start; margin-bottom: 3mm; }
    .logo-cell { width: 132px; height: 132px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; background: #f8fafc; }
    .logo-cell img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .school-center { flex: 1; text-align: center; margin-left: 12px; }
    .school-name { font-size: 20pt; font-weight: 700; font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.04em; color: #1e3a8a; margin-bottom: 3px; }
    .school-subtitle { font-size: 11pt; color: #3b82f6; margin-bottom: 2px; }
    .school-address { font-size: 11pt; font-weight: 600; color: #1e40af; margin-bottom: 2px; }
    .school-contact { font-size: 11pt; font-weight: 600; color: #1e40af; margin-bottom: 2px; }
    .school-motto { font-size: 9.8pt; font-style: italic; font-weight: 600; color: #2563eb; }
    .divider { height: 1px; background: linear-gradient(to right, #1e3a8a, #60a5fa 50%, #1e3a8a); margin: 3mm 0 3mm; }
    .badge-wrap { text-align: center; margin-bottom: 3mm; }
    .badge { display: inline-block; padding: 6px 18px; border-radius: 16px; font-size: 9pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: #1e3a8a; background: #eff6ff; border: 1px solid #bfdbfe; }
    .exam-sub { font-size: 7.4pt; color: #64748b; margin-top: 2px; }
    .student-block { display: flex; justify-content: space-between; align-items: flex-start; padding: 6px 10px; border: 1px solid #bfdbfe; border-radius: 8px; margin-bottom: 3mm; background: #f8fafc; min-height: 28mm; }
    .student-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; font-size: 10.2pt; }
    .student-grid strong { color: #1e3a8a; }
    .photo-cell { width: 2.1cm; height: 2.9cm; border: 1px solid #bfdbfe; border-radius: 4px; background: #fff; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
    .photo-cell img { width: 100%; height: 100%; object-fit: cover; }
    table { width: 100%; border-collapse: collapse; font-size: 9.8pt; margin-bottom: 3mm; }
    th, td { border: 1px solid #bfdbfe; padding: 4px 6px; }
    thead tr { background: #dbeafe; color: #1e3a8a; text-transform: uppercase; font-weight: 600; }
    th { text-align: left; }
    th.tc, td.tc { text-align: center; }
    td.subj-name { font-weight: 600; color: #0f172a; }
    td.grade { font-weight: 700; color: #1e3a8a; }
    td.comment, td.teacher { font-size: 9.2pt; color: #475569; }
    tbody tr:nth-child(even) { background: #f0f9ff; }
    .summary-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; margin-bottom: 3mm; font-size: 8.7pt; }
    .summary-box { padding: 5px 8px; border: 1px solid #bfdbfe; border-radius: 8px; background: #fff; }
    .summary-box strong { color: #1e3a8a; }
    .grading-section { margin-bottom: 3mm; font-size: 8.6pt; }
    .grading-section h3 { font-size: 9.2pt; font-weight: 600; margin-bottom: 3px; color: #1e3a8a; }
    .grading-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .grading-table { border: 1px solid #bfdbfe; border-radius: 8px; overflow: hidden; }
    .grading-table .head { background: #dbeafe; padding: 4px 8px; font-weight: 600; text-align: center; text-transform: uppercase; font-size: 7.8pt; color: #1e3a8a; }
    .grading-table table { width: 100%; margin-bottom: 0; font-size: 8pt; }
    .grading-table th, .grading-table td { padding: 3px 5px; }
    .grading-table tbody tr:nth-child(even) { background: #f0f9ff; }
    .comments-box { border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px 10px; margin-bottom: 3mm; font-size: 8.5pt; background: #fff; }
    .comments-box h3 { font-size: 9pt; font-weight: 600; text-transform: uppercase; margin-bottom: 3px; color: #1e3a8a; }
    .comments-box .comment-p { margin-bottom: 3px; line-height: 1.26; color: #334155; }
    .comments-box .signature { font-size: 8pt; margin-top: 3px; color: #64748b; }
    .next-term-fees { display: flex; justify-content: space-between; padding-top: 6px; margin-top: 6px; border-top: 1px solid #bfdbfe; font-size: 8.1pt; }
    .next-term-fees strong { color: #1e3a8a; }
    .report-footer { text-align: center; font-size: 7pt; margin-top: 3mm; padding-top: 3px; border-top: 1px solid #bfdbfe; color: #64748b; }
    .summary-row { font-size: 9.5pt; margin-bottom: 3mm; padding: 5px 8px; border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc; }
    .summary-row strong { color: #1e3a8a; }
    .comments-section { font-size: 9.5pt; }
    .comment-title { font-weight: 600; margin-bottom: 2px; color: #1e293b; }
    .comment-text { min-height: 20px; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; margin-bottom: 3px; }
  </style>
</head>
<body>
  ${(schoolSubtitle || schoolMotto) ? `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-size:22pt;font-weight:700;color:#cbd5e1;opacity:0.1;pointer-events:none;z-index:0;">${schoolSubtitle || schoolMotto}</div>` : ''}
  <div class="report-page">
  <div class="header-wrap">
    <div class="logo-cell">
      ${logoUrl ? `<img src="${logoUrl}" alt="School Logo" />` : '<span style="font-size:9pt;color:#94a3b8">School<br/>Logo</span>'}
    </div>
    <div class="school-center">
      <div class="school-name">${schoolName}</div>
      ${schoolSubtitle ? `<div class="school-subtitle">${schoolSubtitle}</div>` : ''}
      ${(schoolAddress || schoolPobox) ? `<div class="school-address">${schoolAddress}${schoolAddress && schoolPobox ? ' ' : ''}${schoolPobox}</div>` : ''}
      ${schoolContactHtml}
      ${schoolMotto ? `<div class="school-motto">"${schoolMotto}"</div>` : ''}
    </div>
  </div>
  <div class="divider"></div>
  <div class="badge-wrap">
    <div class="badge">${isMidTermOnly(examName) ? 'Mid Term Report – Upper Section' : 'End of Term Report – Upper Section'}</div>
    ${(examName || year) ? `<div class="exam-sub">${examName || 'Term Report'} - ${year || new Date().getFullYear()}</div>` : ''}
  </div>
  <div class="student-block">
    <div class="student-grid">
      <div><strong>Name:</strong> ${student.name ?? ''}</div>
      <div><strong>Class:</strong> ${student.current_class ?? ''}</div>
      <div><strong>Admission No:</strong> ${student.admission_number ?? student.student_id ?? 'N/A'}</div>
      <div><strong>Term:</strong> ${term || 'N/A'} / ${year || new Date().getFullYear()}</div>
      <div><strong>Stream:</strong> ${streamDisplay}</div>
      <div><strong>Date:</strong> ${reportDateDisplay}</div>
    </div>
    <div class="photo-cell">
      ${hasPhoto ? `<img src="${String(photoUrl).replace(/"/g, '&quot;')}" alt="Student photo" width="80" height="105" style="object-fit:cover;display:block;" />` : '<span style="font-size:8pt;color:#94a3b8">Photo</span>'}
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Subject</th>
        <th class="tc">MID</th>
        ${showENDColumn ? '<th class="tc">END</th>' : ''}
        <th class="tc">Grade</th>
        <th>Teacher's Comment</th>
        <th>Teacher</th>
      </tr>
    </thead>
    <tbody>
      ${subjectRows || (showENDColumn ? '<tr><td colspan="6" class="tc">No subject results.</td></tr>' : '<tr><td colspan="5" class="tc">No subject results.</td></tr>')}
    </tbody>
  </table>
  <div class="summary-grid-3">
    <div class="summary-box">
      <div><strong>Total Marks:</strong> ${totalMarks}</div>
      <div><strong>Average:</strong> ${avg}</div>
      <div><strong>Aggregates:</strong> ${aggregate}</div>
      <div><strong>Division:</strong> ${division}</div>
    </div>
    <div class="summary-box">
      <div><strong>Class Position:</strong> ${summary.classPosition ?? 'N/A'}</div>
      <div><strong>Out of:</strong> ${summary.totalStudents ?? 'N/A'} students</div>
    </div>
    <div class="summary-box">
      <div style="font-weight: 600; color: #1e3a8a;">Attendance:</div>
      ${attendanceFallback
        ? `<div>${attendanceFallback}</div>`
        : `<div>Days Present: ${daysPresent}</div>
      <div>Days Absent: ${daysAbsent}</div>
      <div>Total Days: ${totalDays}</div>`}
    </div>
  </div>
  <div class="grading-section">
    <h3>Grading System</h3>
    <div class="grading-grid">
      <div class="grading-table">
        <div class="head">Subject Grade Boundaries</div>
        <table>
          <thead><tr><th style="text-align:left;">Percentage Range</th><th class="tc">Grade</th></tr></thead>
          <tbody>
            <tr><td>75 - 100</td><td class="tc">D1</td></tr>
            <tr><td>70 - 74</td><td class="tc">D2</td></tr>
            <tr><td>65 - 69</td><td class="tc">C3</td></tr>
            <tr><td>60 - 64</td><td class="tc">C4</td></tr>
            <tr><td>55 - 59</td><td class="tc">C5</td></tr>
            <tr><td>50 - 54</td><td class="tc">C6</td></tr>
            <tr><td>45 - 49</td><td class="tc">P7</td></tr>
            <tr><td>40 - 44</td><td class="tc">P8</td></tr>
            <tr><td>0 - 39</td><td class="tc">F9</td></tr>
          </tbody>
        </table>
      </div>
      <div class="grading-table">
        <div class="head">Division by Aggregate Points</div>
        <table>
          <thead><tr><th style="text-align:left;">Aggregate Range</th><th class="tc">Division</th></tr></thead>
          <tbody>
            <tr><td>4 - 12</td><td class="tc">Division 1</td></tr>
            <tr><td>13 - 23</td><td class="tc">Division 2</td></tr>
            <tr><td>24 - 29</td><td class="tc">Division 3</td></tr>
            <tr><td>30 - 34</td><td class="tc">Division 4</td></tr>
            <tr><td>35 - 36</td><td class="tc">U (Ungraded)</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  <div class="comments-box">
    <h3>Class Teacher's Comments</h3>
    <p class="comment-p">${classTeacherComment || '..............................................................'}</p>
    <div class="signature">Signature: ____________________</div>
    <h3>Headteacher's Comments</h3>
    <p class="comment-p">${headTeacherComment || '..............................................................'}</p>
    <div class="signature">Signature: ____________________</div>
    <div class="next-term-fees">
      <div><strong>Next Term Begins:</strong> ${nextTermBegins}</div>
      <div><strong>Fees Balance:</strong> ${feesFormatted}</div>
    </div>
  </div>
  <div class="report-footer">Generated by PwezaCore School Management System</div>
  </div>
</body>
</html>`;
}

/**
 * Build HTML that matches the on-screen "Report for Lower Section" (Template 3) preview:
 * Same header as Template 4, table with SUBJECT | FULL MARKS | MID | END | TEACHER'S REMARKS | INITIALS, summary, Class Teacher + Headteacher comments.
 */
function buildTemplate3LowerSectionHTML(reportData: any): string {
  const student = reportData.students?.[0];
  const school = reportData.school || {};
  const examSet = reportData.examSet || {};
  if (!student) throw new Error('No student in report data');

  const schoolName = (school as any).name ?? 'School Name';
  const schoolSubtitle = (school as any).subtitle ?? '';
  const schoolAddress = (school as any).address ?? '';
  const schoolPobox = (school as any).pobox ?? '';
  const schoolMotto = (school as any).motto ?? '';
  const logoUrl = (school as any).logo_url ?? (school as any).logo ?? '';
  const schoolContactHtmlLower = schoolContactBlockHtml(school as Record<string, unknown>);

  const term = (examSet as any).term ?? '';
  const year = (examSet as any).year ?? '';
  const examName = (examSet as any).name ?? '';

  const isMid = (name: string) => /mid|midterm|mid-term/i.test(String(name || '').trim());
  const isEnd = (name: string) => /end|eot|final/i.test(String(name || '').trim());
  let showMidTermColumn = true;
  let showEndOfTermColumn = true;
  if (examName) {
    const n = String(examName).toLowerCase();
    if (n.includes('mid') && !n.includes('end')) showEndOfTermColumn = false;
    else if (n.includes('end') || n.includes('eot')) { showMidTermColumn = true; showEndOfTermColumn = true; }
  }

  type Row = { subject: string; total_marks: number; mid: string | number; end: string | number; remarks: string; initials: string };
  const bySubject = new Map<string, Row>();
  const results = Array.isArray(student.results) ? student.results : [];
  for (const r of results as any[]) {
    const sub = (r.subject ?? '').toString().trim();
    if (!sub) continue;
    const examSetName = (r.exam_set_name ?? examName ?? '').toString();
    const marks = r.marks_obtained ?? r.final_score ?? '';
    const total = Number(r.total_marks ?? 100);
    const remark = (r.teacher_comment ?? r.remarks ?? r.teacher_remark ?? r.overall_remark ?? '').toString();
    const initials = (r.teacher_initials ?? '').toString();
    if (!bySubject.has(sub)) {
      bySubject.set(sub, { subject: sub, total_marks: total, mid: '', end: '', remarks: remark, initials });
    }
    const row = bySubject.get(sub)!;
    if (isMid(examSetName)) row.mid = marks;
    else if (isEnd(examSetName)) row.end = marks;
    else { row.mid = marks; row.end = marks; }
    if (remark) row.remarks = remark;
    if (initials) row.initials = initials;
  }
  const sortedLowerRows = sortPrimarySubjectNamesForPdf(Array.from(bySubject.values()));
  const subjectRows = sortedLowerRows.map((row) => {
    const midD = pdfMarkCellDisplay(row.mid, '');
    const endD = pdfMarkCellDisplay(row.end, '');
    const midCell = showMidTermColumn ? `<td class="tc">${midD}</td>` : '';
    const endCell = showEndOfTermColumn ? `<td class="tc">${endD}</td>` : '';
    return `<tr><td class="subj-name">${row.subject}</td><td class="tc">${row.total_marks}</td>${midCell}${endCell}<td class="comment">${row.remarks}</td><td class="teacher">${row.initials}</td></tr>`;
  }).join('');

  const totalFullMarks = sortedLowerRows.reduce((s, r) => s + r.total_marks, 0);
  const summary = (student as any).summary || {};
  const totalMarks = summary.totalMarks ?? summary.total_marks ?? 'N/A';
  const avg = formatAverageForPdf(summary.average);
  const position = summary.classPosition != null && summary.totalStudents != null ? `${summary.classPosition} of ${summary.totalStudents}` : summary.classPosition ?? '—';
  const attendance = summary.attendanceDetails || summary.attendance_details || {};
  const daysPresent = attendance.presentDays ?? attendance.present_days ?? 'N/A';
  const daysAbsent = attendance.absentDays ?? attendance.absent_days ?? 'N/A';
  const totalDays = attendance.totalSchoolDays ?? attendance.total_school_days ?? attendance.total_days ?? 'N/A';
  const attendancePct = summary.attendancePercentage != null ? String(summary.attendancePercentage) + '%' : '';
  const attendanceFallback = (daysPresent === 'N/A' && daysAbsent === 'N/A' && totalDays === 'N/A' && attendancePct) ? attendancePct + ' (days not recorded)' : null;

  const resultsForComments = Array.isArray(student.results) ? (student.results as any[]) : [];
  const endResultsForComments = resultsForComments.filter((r: any) => {
    const name = String(r.exam_set_name || r.exam_set || '').toLowerCase();
    return name.includes('end') || name.includes('final') || name.includes('eot');
  });
  const endOfTermResultForPdf =
    endResultsForComments.find((r: any) => r.headteacher_comment || r.class_teacher_comment) ||
    endResultsForComments[0] ||
    resultsForComments[0] ||
    null;
  const classTeacherCommentRaw = (
    endOfTermResultForPdf?.class_teacher_comment ??
    (student as any).comments?.class_teacher_text ??
    (student as any).comments?.class_teacher_comment ??
    (student as any).class_teacher_comment ??
    ''
  )
    .toString()
    .trim();
  const headTeacherCommentRaw = (
    endOfTermResultForPdf?.headteacher_comment ??
    (student as any).comments?.head_teacher_text ??
    (student as any).comments?.head_teacher_comment ??
    (student as any).comments?.headteacher_text ??
    (student as any).head_teacher_comment ??
    ''
  )
    .toString()
    .trim();
  const classTeacherComment = classTeacherCommentRaw || 'Good progress. Keep it up.';
  const headTeacherComment = headTeacherCommentRaw || 'Approved.';
  const nextTermBegins = (student as any).next_term_begins_date ? new Date((student as any).next_term_begins_date).toLocaleDateString() : 'TBA';
  const feesBalance = (student as any).feesBalance ?? (student as any).fees?.balance ?? 0;
  const feesFormatted = typeof feesBalance === 'number' ? new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(feesBalance) : String(feesBalance);

  const photoUrl = (student as any).profile_photo ?? (student as any).photo_url ?? (student as any).student_photo_url ?? '';
  const hasPhoto = typeof photoUrl === 'string' && photoUrl.trim().length > 0;

  const reportDateDisplay = (() => {
    const raw = (examSet as any).date ?? (student as any).report_date ?? (student as any).summary?.reportDate;
    if (!raw) return 'N/A';
    const d = new Date(raw);
    return isNaN(d.getTime()) ? String(raw) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  })();

  const colspan = 3 + (showMidTermColumn ? 1 : 0) + (showEndOfTermColumn ? 1 : 0) + 2;
  const midTh = showMidTermColumn ? '<th class="tc">MID TERM</th>' : '';
  const endTh = showEndOfTermColumn ? '<th class="tc">END OF TERM</th>' : '';
  const emptyRow = `<tr><td colspan="${colspan}" class="tc">No subject results.</td></tr>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Student Report - Lower Section</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    /* Match Upper Section PDF spacing; no html/body height — breaks merged class pagination in Chromium. */
    html, body { margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 10.2pt; line-height: 1.3; color: #1e293b; background: #fff; }
    .report-page { width: 100%; max-width: 210mm; margin: 0 auto; padding: 4mm 5mm 4mm 5mm; box-sizing: border-box; }
    .header-wrap { display: flex; align-items: flex-start; margin-bottom: 3mm; }
    .logo-cell { width: 132px; height: 132px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; background: #f8fafc; }
    .logo-cell img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .school-center { flex: 1; text-align: center; margin-left: 12px; }
    .school-name { font-size: 20pt; font-weight: 700; font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.04em; color: #1e3a8a; margin-bottom: 3px; }
    .school-subtitle { font-size: 11pt; color: #3b82f6; margin-bottom: 2px; }
    .school-address { font-size: 11pt; font-weight: 600; color: #1e40af; margin-bottom: 2px; }
    .school-contact { font-size: 11pt; font-weight: 600; color: #1e40af; margin-bottom: 2px; }
    .school-motto { font-size: 9.8pt; font-style: italic; font-weight: 600; color: #2563eb; }
    .divider { height: 1px; background: linear-gradient(to right, #1e3a8a, #60a5fa 50%, #1e3a8a); margin: 3mm 0 3mm; }
    .badge-wrap { text-align: center; margin-bottom: 3mm; }
    .badge { display: inline-block; padding: 6px 18px; border-radius: 16px; font-size: 9pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: #1e3a8a; background: #eff6ff; border: 1px solid #bfdbfe; }
    .exam-sub { font-size: 7.4pt; color: #64748b; margin-top: 2px; }
    .student-block { display: flex; justify-content: space-between; align-items: flex-start; padding: 6px 10px; border: 1px solid #bfdbfe; border-radius: 8px; margin-bottom: 3mm; background: #f8fafc; min-height: 28mm; }
    .student-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; font-size: 10.2pt; }
    .student-grid strong { color: #1e3a8a; }
    .photo-cell { width: 2.1cm; height: 2.9cm; border: 1px solid #bfdbfe; border-radius: 4px; background: #fff; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
    .photo-cell img { width: 100%; height: 100%; object-fit: cover; }
    table { width: 100%; border-collapse: collapse; font-size: 9.8pt; margin-bottom: 3mm; }
    th, td { border: 1px solid #bfdbfe; padding: 4px 6px; }
    thead tr { background: #dbeafe; color: #1e3a8a; text-transform: uppercase; font-weight: 600; }
    th { text-align: left; }
    th.tc, td.tc { text-align: center; }
    td.subj-name { font-weight: 600; color: #0f172a; }
    td.comment, td.teacher { font-size: 9.2pt; color: #475569; }
    tbody tr:nth-child(even) { background: #f0f9ff; }
    .summary-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px; margin-bottom: 3mm; font-size: 8.7pt; }
    .summary-box { padding: 5px 8px; border: 1px solid #bfdbfe; border-radius: 8px; background: #fff; }
    .summary-box strong { color: #1e3a8a; }
    .grading-section { margin-bottom: 3mm; font-size: 8.6pt; }
    .grading-section h3 { font-size: 9.2pt; font-weight: 600; margin-bottom: 3px; color: #1e3a8a; }
    .grading-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; }
    .grading-table { border: 1px solid #bfdbfe; border-radius: 8px; overflow: hidden; }
    .grading-table .head { background: #dbeafe; padding: 4px 8px; font-weight: 600; text-align: center; text-transform: uppercase; font-size: 7.8pt; color: #1e3a8a; }
    .grading-table table { width: 100%; margin-bottom: 0; font-size: 8pt; }
    .grading-table th, .grading-table td { padding: 3px 5px; }
    .grading-table tbody tr:nth-child(even) { background: #f0f9ff; }
    /* Slightly tighter than Upper; footer lives inside to save vertical space vs a separate block */
    .comments-box { border: 1px solid #bfdbfe; border-radius: 8px; padding: 6px 8px; margin-bottom: 0; font-size: 8.1pt; background: #fff; }
    .comments-box h3 { font-size: 8.4pt; font-weight: 600; text-transform: uppercase; margin-bottom: 2px; color: #1e3a8a; }
    .comments-box .comment-p { margin-bottom: 2px; line-height: 1.2; color: #334155; }
    .comments-box .signature { font-size: 7.5pt; margin-top: 2px; color: #64748b; }
    .next-term-fees { display: flex; justify-content: space-between; align-items: center; flex-wrap: nowrap; width: 100%; padding-top: 4px; margin-top: 4px; border-top: 1px solid #bfdbfe; font-size: 7.9pt; box-sizing: border-box; }
    .next-term-fees strong { color: #1e3a8a; }
    /* Footer inside last card: avoids a separate block that often orphans to page 2 in Chromium PDF */
    .report-footer-in-card { text-align: center; font-size: 6.4pt; line-height: 1.15; margin: 3px 0 0; padding-top: 3px; border-top: 1px solid #bfdbfe; color: #64748b; }
  </style>
</head>
<body>
  <div class="report-page">
  <div class="header-wrap">
    <div class="logo-cell">${logoUrl ? `<img src="${logoUrl}" alt="School Logo" />` : '<span style="font-size:9pt;color:#94a3b8">School<br/>Logo</span>'}</div>
    <div class="school-center">
      <div class="school-name">${schoolName}</div>
      ${schoolSubtitle ? `<div class="school-subtitle">${schoolSubtitle}</div>` : ''}
      ${(schoolAddress || schoolPobox) ? `<div class="school-address">${schoolAddress}${schoolAddress && schoolPobox ? ' ' : ''}${schoolPobox}</div>` : ''}
      ${schoolContactHtmlLower}
      ${schoolMotto ? `<div class="school-motto">"${schoolMotto}"</div>` : ''}
    </div>
  </div>
  <div class="divider"></div>
  <div class="badge-wrap">
    <div class="badge">${examName && /mid/i.test(examName) && !/end|eot/i.test(examName) ? 'Mid Term Report' : 'End of Term Report'}</div>
    <div class="exam-sub">${examName || 'Term Report'} - ${year || new Date().getFullYear()}</div>
  </div>
  <div class="student-block">
    <div class="student-grid">
      <div><strong>Name:</strong> ${student.name ?? ''}</div>
      <div><strong>Class:</strong> ${student.current_class ?? ''}</div>
      <div><strong>Admission No:</strong> ${student.admission_number ?? student.student_id ?? 'N/A'}</div>
      <div><strong>Term:</strong> ${term || 'N/A'} / ${year || new Date().getFullYear()}</div>
      <div><strong>Date:</strong> ${reportDateDisplay}</div>
    </div>
    <div class="photo-cell">${hasPhoto ? `<img src="${String(photoUrl).replace(/"/g, '&quot;')}" alt="Student photo" width="80" height="105" style="object-fit:cover;display:block;" />` : '<span style="font-size:8pt;color:#94a3b8">Photo</span>'}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>SUBJECT</th>
        <th class="tc">FULL MARKS</th>
        ${midTh}
        ${endTh}
        <th>TEACHER'S REMARKS</th>
        <th class="tc">INITIALS</th>
      </tr>
    </thead>
    <tbody>${subjectRows || emptyRow}</tbody>
  </table>
  <div class="summary-grid-3">
    <div class="summary-box"><div><strong>Total Marks:</strong> ${totalMarks}</div><div><strong>Average:</strong> ${avg}</div></div>
    <div class="summary-box"><div><strong>Class Position:</strong> ${position}</div><div><strong>Out of:</strong> ${summary.totalStudents ?? 'N/A'} students</div></div>
    <div class="summary-box">
      <div style="font-weight: 600; color: #1e3a8a;">Attendance:</div>
      ${attendanceFallback ? `<div>${attendanceFallback}</div>` : `<div>Days Present: ${daysPresent}</div><div>Days Absent: ${daysAbsent}</div><div>Total Days: ${totalDays}</div>`}
    </div>
  </div>
  <div class="grading-section">
    <h3>Grading System</h3>
    <div class="grading-grid">
      <div class="grading-table">
        <div class="head">Subject Grade Boundaries</div>
        <table>
          <thead><tr><th style="text-align:left;">Percentage Range</th><th class="tc">Grade</th></tr></thead>
          <tbody>
            <tr><td>75 - 100</td><td class="tc">D1</td></tr>
            <tr><td>70 - 74</td><td class="tc">D2</td></tr>
            <tr><td>65 - 69</td><td class="tc">C3</td></tr>
            <tr><td>60 - 64</td><td class="tc">C4</td></tr>
            <tr><td>55 - 59</td><td class="tc">C5</td></tr>
            <tr><td>50 - 54</td><td class="tc">C6</td></tr>
            <tr><td>45 - 49</td><td class="tc">P7</td></tr>
            <tr><td>40 - 44</td><td class="tc">P8</td></tr>
            <tr><td>0 - 39</td><td class="tc">F9</td></tr>
          </tbody>
        </table>
      </div>
      <div class="grading-table">
        <div class="head">Division by Aggregate Points</div>
        <table>
          <thead><tr><th style="text-align:left;">Aggregate Range</th><th class="tc">Division</th></tr></thead>
          <tbody>
            <tr><td>4 - 12</td><td class="tc">Division 1</td></tr>
            <tr><td>13 - 23</td><td class="tc">Division 2</td></tr>
            <tr><td>24 - 29</td><td class="tc">Division 3</td></tr>
            <tr><td>30 - 34</td><td class="tc">Division 4</td></tr>
            <tr><td>35 - 36</td><td class="tc">U (Ungraded)</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
  <div class="comments-box">
    <h3>Class Teacher's Comments</h3>
    <p class="comment-p">${classTeacherComment}</p>
    <div class="signature">Signature: ____________________</div>
    <h3>Headteacher's Comments</h3>
    <p class="comment-p">${headTeacherComment}</p>
    <div class="signature">Signature: ____________________</div>
    <div class="next-term-fees">
      <div><strong>Next term begins on:</strong> ${nextTermBegins}</div>
      <div><strong>Fees Balance:</strong> ${feesFormatted}</div>
    </div>
    <div class="report-footer-in-card">Generated by PwezaCore School Management System</div>
  </div>
  </div>
</body>
</html>`;
}

/** Fallback when report_templates has no row for the school.
 *  This layout is designed to closely mirror the on-screen primary report preview:
 *  - A4 page
 *  - School header
 *  - Student + exam info block
 *  - Detailed subjects table
 *  - Summary + comments section
 */
function buildMinimalReportHTML(reportData: any): string {
  const student = reportData.students?.[0];
  const school = reportData.school || {};
  const examSet = reportData.examSet || {};
  if (!student) throw new Error('No student in report data');

  const schoolName = (school as any).name ?? 'School Name';
  const schoolAddress = (school as any).address ?? '';
  const schoolPhone = String(
    (school as any).contact_phone ?? (school as any).phone ?? (school as any).school_phone ?? ''
  ).trim();
  const schoolEmail = String(
    (school as any).contact_email ?? (school as any).email ?? (school as any).school_email ?? ''
  ).trim();
  const schoolMotto = (school as any).motto ?? '';

  const term = (examSet as any).term ?? '';
  const year = (examSet as any).year ?? '';
  const examName = (examSet as any).name ?? '';

  const summary = student.summary || {};
  const avg =
    summary.average != null && summary.average !== undefined && summary.average !== ''
      ? `${formatAverageForPdf(summary.average)}%`
      : '—';
  const position =
    summary.classPosition != null && summary.totalStudents != null
      ? `${summary.classPosition} of ${summary.totalStudents}`
      : summary.classPosition ?? '—';

  const division = summary.division ?? '—';
  const aggregate = summary.aggregate != null ? summary.aggregate : '—';

  let rows = '';
  if (Array.isArray(student.results)) {
    rows = student.results
      .map((r: any) => {
        const marks = r.marks_obtained ?? r.final_score ?? '';
        const total = r.total_marks ?? 100;
        const grade = r.grade ?? '';
        const remark = r.overall_remark ?? r.teacher_remark ?? r.remarks ?? '';
        const teacher = r.teacher_initials ?? '';
        return `
          <tr>
            <td>${r.subject ?? ''}</td>
            <td class="text-center">${marks}</td>
            <td class="text-center">${total}</td>
            <td class="text-center">${grade}</td>
            <td>${remark}</td>
            <td class="text-center">${teacher}</td>
          </tr>
        `;
      })
      .join('');
  }

  const fees = student.fees || {};
  const feesExpected = fees.expected ?? '';
  const feesPaid = fees.paid ?? '';
  const feesBalance = fees.balance ?? '';

  const classTeacherComment =
    student.comments?.class_teacher_text ??
    student.comments?.class_teacher_comment ??
    '';
  const headTeacherComment =
    student.comments?.headteacher_text ??
    student.comments?.head_teacher_text ??
    student.comments?.head_teacher_comment ??
    '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Student Report</title>
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: system-ui, sans-serif; font-size: 9pt; color: #111827; background: #fff; }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      padding: 4mm 5mm;
    }
    .school-header { text-align: center; margin-bottom: 3mm; }
    .school-name { font-size: 14pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 2px; }
    .school-contact { font-size: 8.5pt; color: #4b5563; }
    .school-motto { margin-top: 2px; font-style: italic; font-size: 8.5pt; color: #374151; }
    .report-title { margin: 3mm 0 2.5mm; padding: 4px 8px; background: #2563eb; color: #fff; text-align: center; font-weight: 600; font-size: 9.5pt; text-transform: uppercase; border-radius: 4px; }
    .two-col { display: flex; justify-content: space-between; gap: 12px; margin-bottom: 3mm; }
    .info-block { flex: 1; font-size: 8.5pt; line-height: 1.35; }
    .info-label { font-weight: 600; color: #4b5563; display: inline-block; min-width: 80px; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 999px; font-size: 7pt; font-weight: 600; background: #eff6ff; color: #1d4ed8; margin-left: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 8.5pt; margin-bottom: 3mm; }
    th, td { border: 1px solid #d1d5db; padding: 3px 5px; }
    th { background: #eff6ff; font-weight: 600; text-align: center; }
    td.text-center { text-align: center; }
    .summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 12px; font-size: 8.5pt; margin-bottom: 3mm; }
    .summary-label { color: #4b5563; }
    .summary-value { font-weight: 600; color: #111827; }
    .comments-section { font-size: 8.5pt; }
    .comment-block { margin-bottom: 3mm; }
    .comment-title { font-weight: 600; margin-bottom: 2px; color: #111827; }
    .comment-box { min-height: 28px; border-bottom: 1px solid #d1d5db; padding-bottom: 2px; margin-bottom: 2px; white-space: pre-wrap; }
    .footer-note { margin-top: 3mm; font-size: 7pt; color: #6b7280; text-align: right; }
  </style>
</head>
<body>
  <div class="page">
    <div class="school-header">
      <div class="school-name">${schoolName}</div>
      <div class="school-contact">
        ${schoolAddress ? `<span>${schoolAddress}</span>` : ''}
        ${(schoolPhone || schoolEmail) && schoolAddress ? ' · ' : ''}
        ${schoolPhone ? `<span>Tel: ${schoolPhone}</span>` : ''}
        ${schoolPhone && schoolEmail ? ' · ' : ''}
        ${schoolEmail ? `<span>${schoolEmail}</span>` : ''}
      </div>
      ${schoolMotto ? `<div class="school-motto">"${schoolMotto}"</div>` : ''}
    </div>

    <div class="report-title">
      STUDENT'S PROGRESS REPORT ${term && year ? `- TERM ${term}, ${year}` : ''}
      ${examName ? `<span class="badge">${examName}</span>` : ''}
    </div>

    <div class="two-col">
      <div class="info-block">
        <div><span class="info-label">Student:</span> ${student.name ?? ''}</div>
        <div><span class="info-label">Class:</span> ${student.current_class ?? ''}</div>
        <div><span class="info-label">Adm. No:</span> ${student.admission_number ?? student.student_id ?? ''}</div>
      </div>
      <div class="info-block">
        <div><span class="info-label">Average:</span> ${avg}</div>
        <div><span class="info-label">Position:</span> ${position}</div>
        <div><span class="info-label">Division:</span> ${division} &nbsp; <span class="info-label">Aggregate:</span> ${aggregate}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="text-align:left;">Subject</th>
          <th>Marks</th>
          <th>Total</th>
          <th>Grade</th>
          <th style="text-align:left;">Remarks</th>
          <th>Teacher</th>
        </tr>
      </thead>
      <tbody>
        ${rows || `<tr><td colspan="6" class="text-center">No subject results available.</td></tr>`}
      </tbody>
    </table>

    <div class="summary-grid">
      <div>
        <div class="summary-label">Fees Expected</div>
        <div class="summary-value">${feesExpected}</div>
      </div>
      <div>
        <div class="summary-label">Fees Paid</div>
        <div class="summary-value">${feesPaid}</div>
      </div>
      <div>
        <div class="summary-label">Fees Balance</div>
        <div class="summary-value">${feesBalance}</div>
      </div>
    </div>

    <div class="comments-section">
      <div class="comment-block">
        <div class="comment-title">Class Teacher's Comment</div>
        <div class="comment-box">${classTeacherComment || ''}</div>
      </div>
      <div class="comment-block">
        <div class="comment-title">Head Teacher's Comment</div>
        <div class="comment-box">${headTeacherComment || ''}</div>
      </div>
    </div>

    <div class="footer-note">
      Generated by PwezaCore · ${new Date().toLocaleDateString()}
    </div>
  </div>
</body>
</html>`;
}

/** Extra print rules when merging many students into one PDF so each learner stays on one A4 page. */
const PDF_MULTI_STUDENT_SHEET_HEAD = `
<style id="pdf-multi-student-sheets">
  .pdf-student-sheet {
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .pdf-student-sheet:not(:last-child) {
    page-break-after: always;
    break-after: page;
  }
</style>`;

/** Extract content between <body> and </body> from a full HTML string */
function extractBodyContent(fullHtml: string): string {
  const match = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1].trim() : fullHtml;
}

/** Extract <head>...</head> from a full HTML string */
function extractHeadContent(fullHtml: string): string {
  const match = fullHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  return match ? match[1].trim() : '';
}

/** Safe single-line filename segments for PDF downloads (Windows + URL-safe). */
function sanitizeReportPdfFilenamePart(raw: unknown): string {
  const s = String(raw ?? '').trim();
  if (!s) return '';
  return s
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 80);
}

/** Single learner: name, class, term, exam set (and year when present). */
function buildSingleStudentReportPdfFilename(reportData: Record<string, unknown>): string {
  const stList = reportData.students;
  const student =
    Array.isArray(stList) && stList.length > 0 ? (stList[0] as Record<string, unknown>) : undefined;
  const examSet = (reportData.examSet || {}) as Record<string, unknown>;
  const name = sanitizeReportPdfFilenamePart(student?.name) || 'Student';
  const cls = sanitizeReportPdfFilenamePart(student?.current_class) || 'Class';
  const termRaw = examSet.term;
  const term =
    termRaw != null && termRaw !== ''
      ? `Term_${sanitizeReportPdfFilenamePart(termRaw)}`
      : '';
  const examName = sanitizeReportPdfFilenamePart(examSet.name);
  const year = examSet.year != null && examSet.year !== '' ? sanitizeReportPdfFilenamePart(examSet.year) : '';
  const parts = [name, cls, term, examName, year].filter(Boolean);
  const base = (parts.join('_') || 'report').slice(0, 180);
  return base.endsWith('.pdf') ? base : `${base}.pdf`;
}

/** Whole class / merged PDF: "{Class}_reports_{examSet}_term_{n}_{year}". */
function buildClassBundleReportPdfFilename(reportDataList: Record<string, unknown>[]): string {
  const first = reportDataList[0];
  if (!first) return `class_reports_${Date.now()}.pdf`;
  const stList = first.students;
  const student =
    Array.isArray(stList) && stList.length > 0 ? (stList[0] as Record<string, unknown>) : undefined;
  const examSet = (first.examSet || {}) as Record<string, unknown>;
  const cls = sanitizeReportPdfFilenamePart(student?.current_class) || 'Class';
  const examSetName = sanitizeReportPdfFilenamePart(examSet.name) || 'Exam';
  const termRaw = examSet.term;
  const term =
    termRaw != null && termRaw !== '' ? sanitizeReportPdfFilenamePart(termRaw) : '';
  const year = examSet.year != null && examSet.year !== '' ? sanitizeReportPdfFilenamePart(examSet.year) : '';
  const pieces = [
    cls,
    'reports',
    examSetName,
    ...(term ? [`term_${term}`] : []),
    ...(year ? [year] : []),
  ];
  const base = pieces.join('_').slice(0, 180);
  const withExt = base.endsWith('.pdf') ? base : `${base}.pdf`;
  return withExt;
}

async function generatePDF(options: GeneratePDFOptions): Promise<{ buffer: Buffer; filename: string }> {
  const { snapshotId, studentIds, templateId, reportData: inlineReportData, schoolId: inlineSchoolId, reportDataList: inlineReportDataList } = options;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Vercel env.');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let reportData: Record<string, unknown>;
  let schoolIdForTemplate: string;
  let useBuiltIn: boolean;
  let htmlContent: string | null = null;
  let cssContent = '';
  /** When snapshot path returns multiple reports, combine them into one PDF. Also set for reportDataList path. */
  let allCachedReports: { report_data: Record<string, unknown>; student_id: string }[] | null = null;

  if (inlineReportDataList && inlineReportDataList.length > 0) {
    reportData = inlineReportDataList[0];
    schoolIdForTemplate = inlineSchoolId ?? (inlineReportDataList[0]?.school as any)?.school_id ?? '';
    allCachedReports = inlineReportDataList.map((rd) => {
      const st = rd.students;
      const first = Array.isArray(st) && st.length > 0 ? (st[0] as Record<string, unknown>) : undefined;
      return {
        report_data: rd,
        student_id: (first?.student_id as string | undefined) ?? '',
      };
    });
    if (schoolIdForTemplate) {
      const { data: template } = await supabase
        .from('report_templates')
        .select('html_content, css_content')
        .eq('school_id', schoolIdForTemplate)
        .eq('is_default', true)
        .limit(1)
        .maybeSingle();
      htmlContent = template?.html_content ?? null;
      cssContent = template?.css_content ?? '';
    } else {
      htmlContent = null;
      cssContent = '';
    }
    useBuiltIn =
      !htmlContent ||
      typeof htmlContent !== 'string' ||
      !htmlContent.trim() ||
      isDefaultPlaceholderTemplate(htmlContent);
  } else if (
    inlineReportData &&
    Array.isArray(inlineReportData.students) &&
    inlineReportData.students.length > 0
  ) {
    reportData = inlineReportData;
    schoolIdForTemplate = inlineSchoolId ?? (inlineReportData.school as any)?.school_id ?? '';
    if (schoolIdForTemplate) {
      const { data: template } = await supabase
        .from('report_templates')
        .select('html_content, css_content')
        .eq('school_id', schoolIdForTemplate)
        .eq('is_default', true)
        .limit(1)
        .maybeSingle();
      htmlContent = template?.html_content ?? null;
      cssContent = template?.css_content ?? '';
    } else {
      htmlContent = null;
      cssContent = '';
    }
    useBuiltIn =
      !htmlContent ||
      typeof htmlContent !== 'string' ||
      !htmlContent.trim() ||
      isDefaultPlaceholderTemplate(htmlContent);
  } else {
    if (!snapshotId || typeof snapshotId !== 'string') {
      throw new Error('snapshotId is required when reportData is not provided.');
    }
    let q = supabase
      .from('generated_reports')
      .select('report_data, student_id')
      .eq('snapshot_id', snapshotId);
    if (studentIds && studentIds.length > 0) q = q.in('student_id', studentIds);
    if (templateId) q = q.eq('template_id', templateId);
    const { data: cachedReports, error: reportsError } = await q;
    if (reportsError) throw reportsError;
    if (!cachedReports || cachedReports.length === 0) {
      throw new Error('No cached reports found. Generate reports first.');
    }
    const first = cachedReports[0];
    reportData = first.report_data as Record<string, unknown>;
    allCachedReports = cachedReports as { report_data: Record<string, unknown>; student_id: string }[];
    const { data: snapshot } = await supabase.from('report_snapshots').select('school_id').eq('id', snapshotId).single();
    if (!snapshot) throw new Error('Snapshot not found');
    schoolIdForTemplate = snapshot.school_id;
    let templateQuery = supabase
      .from('report_templates')
      .select('html_content, css_content')
      .eq('school_id', schoolIdForTemplate);
    if (templateId) templateQuery = templateQuery.eq('id', templateId);
    else templateQuery = templateQuery.eq('is_default', true);
    const { data: template } = await templateQuery.single();
    htmlContent = template?.html_content ?? null;
    cssContent = template?.css_content ?? '';
    useBuiltIn =
      !htmlContent ||
      typeof htmlContent !== 'string' ||
      !htmlContent.trim() ||
      isDefaultPlaceholderTemplate(htmlContent);
    const stList = reportData?.students;
    const student =
      Array.isArray(stList) && stList.length > 0 ? (stList[0] as Record<string, unknown>) : undefined;
    const studentId = first.student_id as string;
    if (student && schoolIdForTemplate) {
      const hasPhoto =
        (student.profile_photo && String(student.profile_photo).trim()) ||
        (student.photo_url && String(student.photo_url).trim()) ||
        (student.student_photo_url && String(student.student_photo_url).trim());
      if (!hasPhoto) {
        const { data: photoRow } = await supabase
          .from('student_photos')
          .select('photo_url')
          .eq('school_id', schoolIdForTemplate)
          .eq('student_id', studentId)
          .maybeSingle();
        const url = (photoRow as { photo_url?: string } | null)?.photo_url;
        if (url && String(url).trim()) (student as any).profile_photo = url;
      }
      const currentBalance = (student as any).fees?.balance ?? (student as any).feesBalance ?? null;
      const needsFees = currentBalance == null || currentBalance === 0;
      if (needsFees && studentId) {
        const [studentRes, paymentsRes] = await Promise.all([
          supabase.from('students').select('expected_fee_amount').eq('student_id', studentId).eq('school_id', schoolIdForTemplate).maybeSingle(),
          supabase.from('student_payments').select('amount_paid').eq('student_id', studentId).eq('school_id', schoolIdForTemplate),
        ]);
        const expected = Number((studentRes?.data as any)?.expected_fee_amount ?? 0);
        const payments = (paymentsRes?.data ?? []) as { amount_paid?: number }[];
        const paid = payments.reduce((sum, p) => sum + Number(p?.amount_paid ?? 0), 0);
        const balance = Math.max(0, expected - paid);
        if (!(student as any).fees) (student as any).fees = {};
        (student as any).fees.expected = expected;
        (student as any).fees.paid = paid;
        (student as any).fees.balance = balance;
        (student as any).feesBalance = balance;
      }
    }
    if (allCachedReports.length > 1 && schoolIdForTemplate) {
      const allIds = allCachedReports.map((r) => r.student_id);
      const { data: photoRows } = await supabase
        .from('student_photos')
        .select('student_id, photo_url')
        .eq('school_id', schoolIdForTemplate)
        .in('student_id', allIds);
      const photosByStudent: Record<string, string> = {};
      (photoRows || []).forEach((row: { student_id: string; photo_url?: string }) => {
        if (row.photo_url && String(row.photo_url).trim()) photosByStudent[row.student_id] = row.photo_url;
      });
      const { data: studentsRows } = await supabase
        .from('students')
        .select('student_id, expected_fee_amount')
        .eq('school_id', schoolIdForTemplate)
        .in('student_id', allIds);
      const expectedByStudent: Record<string, number> = {};
      (studentsRows || []).forEach((row: { student_id: string; expected_fee_amount?: number }) => {
        expectedByStudent[row.student_id] = Number(row.expected_fee_amount ?? 0);
      });
      const { data: paymentsRows } = await supabase
        .from('student_payments')
        .select('student_id, amount_paid')
        .eq('school_id', schoolIdForTemplate)
        .in('student_id', allIds);
      const paidByStudent: Record<string, number> = {};
      (paymentsRows || []).forEach((row: { student_id: string; amount_paid?: number }) => {
        paidByStudent[row.student_id] = (paidByStudent[row.student_id] || 0) + Number(row.amount_paid ?? 0);
      });
      allCachedReports.forEach((item) => {
        const sid = item.student_id;
        const rd = item.report_data as Record<string, unknown>;
        const rdStudents = rd.students;
        const st =
          Array.isArray(rdStudents) && rdStudents.length > 0
            ? (rdStudents[0] as Record<string, unknown>)
            : undefined;
        if (!st) return;
        if (!st.profile_photo && !st.photo_url && !st.student_photo_url && photosByStudent[sid]) {
          (st as any).profile_photo = photosByStudent[sid];
        }
        const currentBal = (st as any).fees?.balance ?? (st as any).feesBalance ?? null;
        if ((currentBal == null || currentBal === 0) && (expectedByStudent[sid] != null || paidByStudent[sid] != null)) {
          const expected = expectedByStudent[sid] ?? 0;
          const paid = paidByStudent[sid] ?? 0;
          const balance = Math.max(0, expected - paid);
          if (!(st as any).fees) (st as any).fees = {};
          (st as any).fees.expected = expected;
          (st as any).fees.paid = paid;
          (st as any).fees.balance = balance;
          (st as any).feesBalance = balance;
        }
      });
    }
  }

  const stListFinal = reportData?.students;
  const student =
    Array.isArray(stListFinal) && stListFinal.length > 0
      ? (stListFinal[0] as Record<string, unknown>)
      : undefined;
  const executablePath = await chromium.executablePath();
  const ch = chromium as typeof chromium & {
    defaultViewport?: { width: number; height: number };
    headless?: boolean | 'shell';
  };
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: ch.defaultViewport,
    executablePath,
    headless: ch.headless,
  });

  try {
    const page = await browser.newPage();
    const className = (student?.current_class ?? '') as string;
    let html: string;
    if (allCachedReports && allCachedReports.length > 1 && useBuiltIn) {
      const chunks = allCachedReports.map((item) => {
        const rd = item.report_data;
        const rdSt = rd.students;
        const rdFirst =
          Array.isArray(rdSt) && rdSt.length > 0 ? (rdSt[0] as Record<string, unknown>) : undefined;
        const cls = (rdFirst?.current_class as string | undefined) ?? className;
        return isUpperSectionClass(cls)
          ? buildTemplate4UpperSectionHTML(rd)
          : isLowerSectionPrimary(cls)
            ? buildTemplate3LowerSectionHTML(rd)
            : buildMinimalReportHTML(rd);
      });
      const firstFullHtml = chunks[0];
      const head = extractHeadContent(firstFullHtml) + PDF_MULTI_STUDENT_SHEET_HEAD;
      const bodyContents = chunks.map(extractBodyContent);
      const combinedBody = bodyContents.map((body) => `<div class="pdf-student-sheet">${body}</div>`).join('\n');
      html = `<!DOCTYPE html>\n<html>\n<head>\n${head}\n</head>\n<body>\n${combinedBody}\n</body>\n</html>`;
    } else {
      html = useBuiltIn
        ? isUpperSectionClass(className)
          ? buildTemplate4UpperSectionHTML(reportData)
          : isLowerSectionPrimary(className)
            ? buildTemplate3LowerSectionHTML(reportData)
            : buildMinimalReportHTML(reportData)
        : renderReportHTML(htmlContent!, cssContent, reportData);
    }
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '4mm', right: '5mm', bottom: '4mm', left: '5mm' },
    });
    const buffer = Buffer.from(pdf);
    const multiReports =
      allCachedReports && allCachedReports.length > 1 ? allCachedReports : null;
    const filename = multiReports
      ? buildClassBundleReportPdfFilename(multiReports.map((r) => r.report_data))
      : buildSingleStudentReportPdfFilename(reportData);
    return { buffer, filename };
  } finally {
    await browser.close();
  }
}

/**
 * Secondary school PDF only: built-in O/A-Level cards. Loaded on demand so primary `generatePDF`
 * never imports `templateHTMLGenerator` (keeps Hobby single-route deployment under function limits).
 */
function isOLevelClassForSecondaryPdf(className: string): boolean {
  if (!className || typeof className !== 'string') return false;
  return /^(senior\s*[1-4]|s\.?\s*[1-4])\b/i.test(className.trim());
}

function isALevelClassForSecondaryPdf(className: string): boolean {
  if (!className || typeof className !== 'string') return false;
  return /^(senior\s*[56]|s\.?\s*[56])\b/i.test(className.trim());
}

/** Match getSecondaryTemplateKeysForClass (src/templates/secondary): A-Level → template4 only; O-Level → 1–3. */
function normalizeSecondaryTemplateKeyForPdf(className: string, templateKey: string): string {
  const t =
    typeof templateKey === 'string' && /^template[1-6]$/.test(templateKey) ? templateKey : 'template1';
  if (isALevelClassForSecondaryPdf(className)) {
    return 'template4';
  }
  if (isOLevelClassForSecondaryPdf(className)) {
    if (t === 'template2' || t === 'template3') return t;
    return 'template1';
  }
  return 'template1';
}

async function generateSecondaryPipelinePdfResponse(
  reportDataList: Record<string, unknown>[],
  templateKey: string
): Promise<{ buffer: Buffer; filename: string }> {
  const [{ renderTemplateHTML }, { resolveSchoolAndStudentPhotosForReportData }] = await Promise.all([
    import('../../src/services/templateHTMLGenerator'),
    import('../../src/lib/reportImageDataUrl'),
  ]);

  const first = reportDataList[0];
  const st0 = first?.students;
  const student0 =
    Array.isArray(st0) && st0.length > 0 ? (st0[0] as Record<string, unknown>) : undefined;
  const className0 = String(student0?.current_class ?? '');

  if (!isOLevelClassForSecondaryPdf(className0) && !isALevelClassForSecondaryPdf(className0)) {
    throw new Error('Secondary pipeline supports O-Level / A-Level classes only');
  }

  const executablePath = await chromium.executablePath();
  const ch = chromium as typeof chromium & {
    defaultViewport?: { width: number; height: number };
    headless?: boolean | 'shell';
  };
  const browser = await puppeteer.launch({
    args: chromium.args,
    defaultViewport: ch.defaultViewport,
    executablePath,
    headless: ch.headless,
  });

  try {
    const page = await browser.newPage();
    const chunks = await Promise.all(
      reportDataList.map(async (rd) => {
        const sts = rd.students;
        const st =
          Array.isArray(sts) && sts.length > 0 ? (sts[0] as Record<string, unknown>) : undefined;
        const cls = String(st?.current_class ?? className0);
        const key = normalizeSecondaryTemplateKeyForPdf(cls, templateKey);
        const { logo, photo } = await resolveSchoolAndStudentPhotosForReportData(
          rd as { school?: Record<string, unknown>; students?: unknown[] }
        );
        return renderTemplateHTML(rd, key, logo, photo);
      })
    );

    const firstFullHtml = chunks[0];
    const head = extractHeadContent(firstFullHtml) + PDF_MULTI_STUDENT_SHEET_HEAD;
    const bodyContents = chunks.map(extractBodyContent);
    const combinedBody = bodyContents.map((body) => `<div class="pdf-student-sheet">${body}</div>`).join('\n');
    const html = `<!DOCTYPE html>\n<html>\n<head>\n${head}\n</head>\n<body>\n${combinedBody}\n</body>\n</html>`;

    await page.setContent(html, { waitUntil: 'networkidle0' });
    /** Match in-app secondary preview: HTML shell already applies A4 padding via `SECONDARY_A4_PAGE_SHELL_CSS`. */
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });
    const buffer = Buffer.from(pdf);
    const filename =
      reportDataList.length > 1
        ? buildClassBundleReportPdfFilename(reportDataList)
        : buildSingleStudentReportPdfFilename(reportDataList[0]);
    return { buffer, filename };
  } finally {
    await browser.close();
  }
}

export default async function handler(req: Req, res: Res) {
  const sendError = (status: number, error: string) => {
    try {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.status(status).json({ error });
    } catch (_) {}
  };

  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    if (req.method !== 'POST') {
      return sendError(405, 'Method not allowed');
    }

    const body = (req.body || {}) as {
      snapshotId?: string;
      studentIds?: string[];
      templateId?: string;
      reportData?: Record<string, unknown>;
      reportDataList?: Record<string, unknown>[];
      schoolId?: string;
      templateKey?: string;
      /** Secondary built-in PDFs only; avoids a second Vercel serverless function (Hobby limit). */
      secondaryPipeline?: boolean;
    };
    const snapshotId = body.snapshotId;
    const reportData = body.reportData;
    const reportDataList = body.reportDataList;
    const schoolId = body.schoolId;
    const templateKey =
      typeof body.templateKey === 'string' && /^template[1-6]$/.test(body.templateKey)
        ? body.templateKey
        : 'template1';

    if (body.secondaryPipeline === true) {
      if (!reportDataList || !Array.isArray(reportDataList) || reportDataList.length === 0) {
        return sendError(400, 'reportDataList is required for secondary pipeline');
      }
      try {
        const { buffer: pdfBuffer, filename } = await generateSecondaryPipelinePdfResponse(
          reportDataList,
          templateKey
        );
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`);
        res.status(200).end(pdfBuffer);
        return;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('PDF secondary pipeline error:', message);
        const clientErr =
          message.includes('Secondary pipeline supports') || message.includes('O-Level / A-Level');
        return sendError(clientErr ? 400 : 500, message);
      }
    }

    if (reportDataList && Array.isArray(reportDataList) && reportDataList.length > 0) {
      const { buffer: pdfBuffer, filename } = await generatePDF({
        reportDataList,
        schoolId: schoolId ?? (reportDataList[0]?.school as any)?.school_id,
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`);
      res.status(200).end(pdfBuffer);
      return;
    }

    const bodyStudents = reportData?.students;
    if (reportData && Array.isArray(bodyStudents) && bodyStudents.length > 0) {
      const { buffer: pdfBuffer, filename } = await generatePDF({
        reportData,
        schoolId,
        templateId: body.templateId,
      });
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`);
      res.status(200).end(pdfBuffer);
      return;
    }

    if (!snapshotId || typeof snapshotId !== 'string') {
      return sendError(400, 'snapshotId is required when reportData is not provided');
    }

    const { buffer: pdfBuffer, filename } = await generatePDF({
      snapshotId,
      studentIds: body.studentIds,
      templateId: body.templateId,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`);
    res.status(200).end(pdfBuffer);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('PDF generate error:', message);
    sendError(500, message || 'PDF generation failed');
  }
}
