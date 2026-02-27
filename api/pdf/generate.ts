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

/** True if class is Upper Section (P.4–P.7) so we use Template 4 layout. */
function isUpperSectionClass(className: string): boolean {
  if (!className || typeof className !== 'string') return false;
  return /(primary\s*[4567]|p\.\s*[4567]|p[4567])/i.test(className.trim());
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
  const schoolEmail = (school as any).email ?? (school as any).contact_email ?? '';
  const schoolPhone = (school as any).phone ?? (school as any).contact_phone ?? '';
  const schoolMotto = (school as any).motto ?? '';
  const logoUrl = (school as any).logo_url ?? (school as any).logo ?? '';

  const term = (examSet as any).term ?? '';
  const year = (examSet as any).year ?? '';
  const examName = (examSet as any).name ?? '';

  // Build subjects: use student.subjects if present, else derive from student.results (same as ReportPreviewFromData)
  type Subj = { subject_name: string; mot_marks: string | number; eot_marks: string | number; eot_grade: string; mot_grade: string; total_marks: number; teacher_comment: string; teacher_name: string };
  let subjects: Subj[] = [];
  if (Array.isArray((student as any).subjects) && (student as any).subjects.length > 0) {
    subjects = ((student as any).subjects as Subj[]).map((s) => ({
      subject_name: s.subject_name ?? '',
      mot_marks: s.mot_marks ?? '',
      eot_marks: s.eot_marks ?? '',
      eot_grade: (s.eot_grade ?? '').toString().trim() || '—',
      mot_grade: (s.mot_grade ?? '').toString().trim() || '—',
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

  const subjectRows = subjects
    .map(
      (s) =>
        `<tr>
          <td class="subj-name">${s.subject_name}</td>
          <td class="tc">${s.mot_marks}</td>
          <td class="tc">${s.eot_marks}</td>
          <td class="tc grade">${s.eot_grade}</td>
          <td class="comment">${s.teacher_comment}</td>
          <td class="teacher">${s.teacher_name}</td>
        </tr>`
    )
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
  const avg = summary.average != null ? (typeof summary.average === 'number' ? summary.average.toFixed(2) : summary.average) : '—';
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

  const nextTermBegins = (student as any).next_term_begins_date
    ? new Date((student as any).next_term_begins_date).toLocaleDateString()
    : 'TBA';
  const feesBalance = (student as any).feesBalance ?? (student as any).fees?.balance ?? 0;
  const feesFormatted =
    typeof feesBalance === 'number'
      ? new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(feesBalance)
      : String(feesBalance);

  const photoUrl = (student as any).profile_photo ?? (student as any).photo_url ?? '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Student Report - Upper Section</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 10mm; font-family: 'Times New Roman', Times, serif; font-size: 10.2pt; line-height: 1.33; color: #1e293b; background: #fff; }
    .header-wrap { display: flex; align-items: flex-start; margin-bottom: 6mm; }
    .logo-cell { width: 132px; height: 132px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; background: #f8fafc; }
    .logo-cell img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .school-center { flex: 1; text-align: center; margin-left: 12px; }
    .school-name { font-size: 16.5pt; font-weight: 700; font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.04em; color: #1e3a8a; margin-bottom: 4px; }
    .school-subtitle { font-size: 11pt; color: #3b82f6; margin-bottom: 3px; }
    .school-address { font-size: 11pt; font-weight: 600; color: #1e40af; margin-bottom: 2px; }
    .school-contact { font-size: 11pt; font-weight: 600; color: #1e40af; margin-bottom: 2px; }
    .school-motto { font-size: 9.8pt; font-style: italic; font-weight: 600; color: #2563eb; }
    .divider { height: 1px; background: linear-gradient(to right, #1e3a8a, #60a5fa 50%, #1e3a8a); margin: 5mm 0 4mm; }
    .badge-wrap { text-align: center; margin-bottom: 4mm; }
    .badge { display: inline-block; padding: 6px 18px; border-radius: 16px; font-size: 9pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: #1e3a8a; background: #eff6ff; border: 1px solid #bfdbfe; }
    .exam-sub { font-size: 7.4pt; color: #64748b; margin-top: 2px; }
    .student-block { display: flex; justify-content: space-between; align-items: flex-start; padding: 8px 12px; border: 1px solid #bfdbfe; border-radius: 8px; margin-bottom: 6mm; background: #f8fafc; min-height: 32mm; }
    .student-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 12px; font-size: 10.2pt; }
    .student-grid strong { color: #1e3a8a; }
    .photo-cell { width: 2.1cm; height: 2.9cm; border: 1px solid #bfdbfe; border-radius: 4px; background: #fff; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
    .photo-cell img { width: 100%; height: 100%; object-fit: cover; }
    table { width: 100%; border-collapse: collapse; font-size: 9.8pt; margin-bottom: 6mm; }
    th, td { border: 1px solid #bfdbfe; padding: 5px 8px; }
    thead tr { background: #dbeafe; color: #1e3a8a; text-transform: uppercase; font-weight: 600; }
    th { text-align: left; }
    th.tc, td.tc { text-align: center; }
    td.subj-name { font-weight: 600; color: #0f172a; }
    td.grade { font-weight: 700; color: #1e3a8a; }
    td.comment, td.teacher { font-size: 9.2pt; color: #475569; }
    tbody tr:nth-child(even) { background: #f0f9ff; }
    .summary-grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px; margin-bottom: 6mm; font-size: 8.7pt; }
    .summary-box { padding: 6px 10px; border: 1px solid #bfdbfe; border-radius: 8px; background: #fff; }
    .summary-box strong { color: #1e3a8a; }
    .grading-section { margin-bottom: 6mm; font-size: 8.6pt; }
    .grading-section h3 { font-size: 9.2pt; font-weight: 600; margin-bottom: 4px; color: #1e3a8a; }
    .grading-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .grading-table { border: 1px solid #bfdbfe; border-radius: 8px; overflow: hidden; }
    .grading-table .head { background: #dbeafe; padding: 5px 8px; font-weight: 600; text-align: center; text-transform: uppercase; font-size: 7.8pt; color: #1e3a8a; }
    .grading-table table { width: 100%; margin-bottom: 0; font-size: 8pt; }
    .grading-table th, .grading-table td { padding: 4px 6px; }
    .grading-table tbody tr:nth-child(even) { background: #f0f9ff; }
    .comments-box { border: 1px solid #bfdbfe; border-radius: 8px; padding: 10px 12px; margin-bottom: 6mm; font-size: 8.5pt; background: #fff; }
    .comments-box h3 { font-size: 9pt; font-weight: 600; text-transform: uppercase; margin-bottom: 4px; color: #1e3a8a; }
    .comments-box .comment-p { margin-bottom: 4px; line-height: 1.28; color: #334155; }
    .comments-box .signature { font-size: 8pt; margin-top: 4px; color: #64748b; }
    .next-term-fees { display: flex; justify-content: space-between; padding-top: 8px; margin-top: 8px; border-top: 1px solid #bfdbfe; font-size: 8.1pt; }
    .next-term-fees strong { color: #1e3a8a; }
    .report-footer { text-align: center; font-size: 7pt; margin-top: 6mm; padding-top: 4px; border-top: 1px solid #bfdbfe; color: #64748b; }
    .summary-row { font-size: 9.5pt; margin-bottom: 6mm; padding: 6px 10px; border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc; }
    .summary-row strong { color: #1e3a8a; }
    .comments-section { font-size: 9.5pt; }
    .comment-title { font-weight: 600; margin-bottom: 2px; color: #1e293b; }
    .comment-text { min-height: 24px; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; margin-bottom: 4px; }
  </style>
</head>
<body>
  ${(schoolSubtitle || schoolMotto) ? `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-size:22pt;font-weight:700;color:#cbd5e1;opacity:0.1;pointer-events:none;z-index:0;">${schoolSubtitle || schoolMotto}</div>` : ''}
  <div class="header-wrap">
    <div class="logo-cell">
      ${logoUrl ? `<img src="${logoUrl}" alt="School Logo" />` : '<span style="font-size:9pt;color:#94a3b8">School<br/>Logo</span>'}
    </div>
    <div class="school-center">
      <div class="school-name">${schoolName}</div>
      ${schoolSubtitle ? `<div class="school-subtitle">${schoolSubtitle}</div>` : ''}
      ${(schoolAddress || schoolPobox) ? `<div class="school-address">${schoolAddress}${schoolAddress && schoolPobox ? ' ' : ''}${schoolPobox}</div>` : ''}
      ${(schoolEmail || schoolPhone) ? `<div class="school-contact">${schoolEmail}${schoolEmail && schoolPhone ? ' | ' : ''}${schoolPhone}</div>` : ''}
      ${schoolMotto ? `<div class="school-motto">"${schoolMotto}"</div>` : ''}
    </div>
  </div>
  <div class="divider"></div>
  <div class="badge-wrap">
    <div class="badge">End of Term Report – Upper Section</div>
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
      ${photoUrl ? `<img src="${photoUrl}" alt="Student" />` : '<span style="font-size:8pt;color:#94a3b8">Photo</span>'}
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Subject</th>
        <th class="tc">MID</th>
        <th class="tc">END</th>
        <th class="tc">Grade</th>
        <th>Teacher's Comment</th>
        <th>Teacher</th>
      </tr>
    </thead>
    <tbody>
      ${subjectRows || '<tr><td colspan="6" class="tc">No subject results.</td></tr>'}
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
      <div>Days Present: ${daysPresent}</div>
      <div>Days Absent: ${daysAbsent}</div>
      <div>Total Days: ${totalDays}</div>
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
  const schoolPhone = (school as any).phone ?? '';
  const schoolEmail = (school as any).email ?? '';
  const schoolMotto = (school as any).motto ?? '';

  const term = (examSet as any).term ?? '';
  const year = (examSet as any).year ?? '';
  const examName = (examSet as any).name ?? '';

  const summary = student.summary || {};
  const avg = summary.average != null ? `${summary.average.toFixed?.(2) ?? summary.average}%` : '—';
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
    '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Student Report</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 12mm;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f3f4f6;
      color: #111827;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 6px;
      box-shadow: 0 0 0 1px rgba(15,23,42,0.08);
      padding: 12mm 14mm;
    }
    .school-header {
      text-align: center;
      margin-bottom: 10mm;
    }
    .school-name {
      font-size: 20pt;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 4px;
    }
    .school-contact {
      font-size: 9pt;
      color: #4b5563;
    }
    .school-motto {
      margin-top: 4px;
      font-style: italic;
      font-size: 9.5pt;
      color: #374151;
    }
    .report-title {
      margin: 10mm 0 6mm;
      padding: 6px 10px;
      background: #2563eb;
      color: #ffffff;
      text-align: center;
      font-weight: 600;
      font-size: 11pt;
      text-transform: uppercase;
      border-radius: 4px;
    }
    .two-col {
      display: flex;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 10mm;
    }
    .info-block {
      flex: 1;
      font-size: 9.5pt;
      line-height: 1.5;
    }
    .info-label {
      font-weight: 600;
      color: #4b5563;
      display: inline-block;
      min-width: 90px;
    }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 8pt;
      font-weight: 600;
      background: #eff6ff;
      color: #1d4ed8;
      margin-left: 6px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
      margin-bottom: 10mm;
    }
    th, td {
      border: 1px solid #d1d5db;
      padding: 5px 6px;
    }
    th {
      background: #eff6ff;
      font-weight: 600;
      text-align: center;
    }
    td.text-center {
      text-align: center;
    }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 6px 16px;
      font-size: 9.5pt;
      margin-bottom: 8mm;
    }
    .summary-label {
      color: #4b5563;
    }
    .summary-value {
      font-weight: 600;
      color: #111827;
    }
    .comments-section {
      font-size: 9.5pt;
    }
    .comment-block {
      margin-bottom: 8mm;
    }
    .comment-title {
      font-weight: 600;
      margin-bottom: 4px;
      color: #111827;
    }
    .comment-box {
      min-height: 40px;
      border-bottom: 1px solid #d1d5db;
      padding-bottom: 4px;
      margin-bottom: 4px;
      white-space: pre-wrap;
    }
    .footer-note {
      margin-top: 6mm;
      font-size: 8.5pt;
      color: #6b7280;
      text-align: right;
    }
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
  const useBuiltIn =
    !htmlContent ||
    typeof htmlContent !== 'string' ||
    !htmlContent.trim() ||
    isDefaultPlaceholderTemplate(htmlContent);

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
    const student = reportData?.students?.[0];
    const className = (student?.current_class ?? '') as string;
    const html = useBuiltIn
      ? isUpperSectionClass(className)
        ? buildTemplate4UpperSectionHTML(reportData)
        : buildMinimalReportHTML(reportData)
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

    if (req.method === 'OPTIONS') {
      return res.status(204).end();
    }

    if (req.method !== 'POST') {
      return sendError(405, 'Method not allowed');
    }

    const body = (req.body || {}) as { snapshotId?: string; studentIds?: string[]; templateId?: string };
    const snapshotId = body.snapshotId;
    if (!snapshotId || typeof snapshotId !== 'string') {
      return sendError(400, 'snapshotId is required');
    }

    const pdfBuffer = await generatePDF({
      snapshotId,
      studentIds: body.studentIds,
      templateId: body.templateId,
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="reports_${snapshotId}.pdf"`);
    res.status(200).end(pdfBuffer);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('PDF generate error:', message);
    sendError(500, message || 'PDF generation failed');
  }
}
