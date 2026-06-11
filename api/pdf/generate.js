var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/services/primaryPdfBuiltins.ts
function escapeHtmlText(raw) {
  return String(raw ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function pdfImageSrcAttributeEscape(src) {
  return String(src).replace(/&/g, "&amp;").replace(/"/g, "&quot;");
}
function pickPrimaryPdfImageSrc(embed, key, fallback) {
  const o = embed?.[key];
  if (typeof o === "string" && o.trim() !== "") return o.trim();
  return (fallback ?? "").trim();
}
function pdfSafeHexColor(raw, fallback) {
  const t = raw == null ? "" : String(raw).trim();
  if (/^#[0-9A-Fa-f]{3}$/.test(t) || /^#[0-9A-Fa-f]{6}$/.test(t) || /^#[0-9A-Fa-f]{8}$/.test(t)) {
    return t;
  }
  const f = String(fallback).trim();
  return /^#[0-9A-Fa-f]{3}$/.test(f) || /^#[0-9A-Fa-f]{6}$/.test(f) ? f : "#000000";
}
function lightenColor(hex) {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const lighten = (color) => Math.min(255, Math.round(color + (255 - color) * 0.5));
  const toHex = (n) => {
    const h = n.toString(16);
    return h.length === 1 ? "0" + h : h;
  };
  return `#${toHex(lighten(r))}${toHex(lighten(g))}${toHex(lighten(b))}`;
}
function pdfPrimaryHeaderRootVars(school) {
  const s = school || {};
  const H = REPORT_HEADER_DEFAULTS;
  const pick = (val, def) => pdfSafeHexColor(val, def);
  const divider = pick(s.header_divider_color, H.divider);
  const divClean = divider.replace(/\s/g, "") || String(H.divider).replace(/\s/g, "");
  const divMid = lightenColor(divClean);
  return `:root {
  --pdf-hdr-name: ${pick(s.header_school_name_color, H.schoolName)};
  --pdf-hdr-subtitle: ${pick(s.header_subtitle_color, H.subtitle)};
  --pdf-hdr-address: ${pick(s.header_address_color, H.address)};
  --pdf-hdr-contact: ${pick(s.header_contact_color, H.contact)};
  --pdf-hdr-motto: ${pick(s.header_motto_color, H.motto)};
  --pdf-hdr-divider: ${divider};
  --pdf-hdr-divider-mid: ${divMid};
  --pdf-hdr-chip-text: ${pick(s.header_chip_text_color, H.chipText)};
  --pdf-hdr-chip-bg: ${pick(s.header_chip_background_color, H.chipBackground)};
  --pdf-hdr-chip-border: ${pick(s.header_chip_border_color, H.chipBorder)};
  --pdf-hdr-meta: ${pick(s.header_meta_line_color, H.metaLine)};
}`;
}
function formatAverageForPdf(raw) {
  if (raw === null || raw === void 0 || raw === "") return "\u2014";
  const n = typeof raw === "number" ? raw : Number(raw);
  if (Number.isNaN(n)) return String(raw);
  return String(Math.round(n));
}
function normalizePdfStudentDobIso(st) {
  if (!st || typeof st !== "object") return null;
  const raw = st.date_of_birth ?? st.dob;
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  if (!s) return null;
  return s.length >= 10 ? s.slice(0, 10) : s;
}
function pdfStudentAgeYearsAtReference(dobIso, refIso) {
  const dobStr = dobIso != null && String(dobIso).trim() ? String(dobIso).trim().slice(0, 10) : "";
  const refStr = refIso != null && String(refIso).trim() ? String(refIso).trim().slice(0, 10) : "";
  if (!dobStr) return null;
  const dob = /* @__PURE__ */ new Date(`${dobStr}T12:00:00`);
  const ref = refStr ? /* @__PURE__ */ new Date(`${refStr}T12:00:00`) : /* @__PURE__ */ new Date();
  if (Number.isNaN(dob.getTime()) || Number.isNaN(ref.getTime())) return null;
  let age = ref.getFullYear() - dob.getFullYear();
  const md = ref.getMonth() - dob.getMonth();
  if (md < 0 || md === 0 && ref.getDate() < dob.getDate()) age--;
  if (age < 0 || age > 120) return null;
  return age;
}
function pdfStudentAgeYearsLabel(student, examSet) {
  const cached = student.age_years;
  if (cached != null && cached !== "") {
    const n = Number(cached);
    if (!Number.isNaN(n) && n >= 0 && n <= 120) return String(n);
  }
  const dob = normalizePdfStudentDobIso(student);
  const sum = student.summary;
  const refRaw = sum && typeof sum === "object" && sum !== null ? sum.reportDate : void 0;
  const ref = refRaw != null && String(refRaw).trim() ? String(refRaw).slice(0, 10) : examSet?.date != null && String(examSet.date).trim() ? String(examSet.date).slice(0, 10) : void 0;
  const a = pdfStudentAgeYearsAtReference(dob, ref ?? null);
  return a != null ? String(a) : "\u2014";
}
function schoolContactBlockHtml(school) {
  const s = school || {};
  const str = (v) => v == null ? "" : String(v).trim();
  const email = str(s.contact_email ?? s.email ?? s.school_email);
  const phone = str(s.contact_phone ?? s.phone ?? s.school_phone);
  if (!email && !phone) return "";
  const e = email ? escapeHtmlText(email) : "";
  const p = phone ? escapeHtmlText(phone) : "";
  const sepColor = pdfSafeHexColor(s.header_contact_separator_color, REPORT_HEADER_DEFAULTS.contactSeparator);
  const sep = email && phone ? `<span style="margin:0 8px;color:${sepColor}">|</span>` : "";
  return `<div class="school-contact">${e}${sep}${p}</div>`;
}
function primaryGradeFromMarks(marks, total) {
  if (total <= 0) return "F9";
  const pct = marks / total * 100;
  if (pct >= 75) return "D1";
  if (pct >= 70) return "D2";
  if (pct >= 65) return "C3";
  if (pct >= 60) return "C4";
  if (pct >= 55) return "C5";
  if (pct >= 50) return "C6";
  if (pct >= 45) return "P7";
  if (pct >= 40) return "P8";
  return "F9";
}
function sortPrimarySubjectNamesForPdf(rows) {
  const nameOf = (row) => String(row.subject_name ?? row.subject ?? "").trim();
  const priorityIndex = (name) => PRIORITY_PRIMARY_SUBJECT_NAMES.findIndex((p) => p.toLowerCase() === name.toLowerCase());
  return [...rows].sort((a, b) => {
    const na = nameOf(a);
    const nb = nameOf(b);
    const ai = priorityIndex(na);
    const bi = priorityIndex(nb);
    if (ai !== -1 && bi !== -1) return ai - bi;
    if (ai !== -1) return -1;
    if (bi !== -1) return 1;
    return na.localeCompare(nb, void 0, { sensitivity: "base" });
  });
}
function isUpperSectionClass(className) {
  if (!className || typeof className !== "string") return false;
  return /(primary\s*[4567]|p\.\s*[4567]|p[4567])/i.test(className.trim());
}
function isLowerSectionPrimary(className) {
  if (!className || typeof className !== "string") return false;
  return /(primary\s*[123]|p\.\s*[123]|p[123])/i.test(className.trim());
}
function isPrePrimaryNurseryClassForPdf(className) {
  const t = String(className || "").trim().toLowerCase();
  return t === "baby class" || t === "middle class" || t === "top class";
}
function pdfMarkCellDisplay(marks, grade) {
  const g = String(grade ?? "").trim().toUpperCase();
  if (g === "MISSED") return 0;
  if (marks === "" || marks == null) return "";
  const ms = String(marks).trim().toUpperCase();
  if (ms === "MISSED") return 0;
  return marks;
}
function buildTemplate4UpperSectionHTML(reportData, pdfImageEmbed) {
  const student = reportData.students?.[0];
  const school = reportData.school || {};
  const examSet = reportData.examSet || {};
  if (!student) throw new Error("No student in report data");
  const schoolName = school.name ?? "School Name";
  const schoolSubtitle = school.subtitle ?? "";
  const schoolAddress = school.address ?? "";
  const schoolPobox = school.pobox ?? "";
  const schoolMotto = school.motto ?? "";
  const logoUrl = school.logo_url ?? school.logo ?? "";
  const schoolContactHtml = schoolContactBlockHtml(school);
  const term = examSet.term ?? "";
  const year = examSet.year ?? "";
  const examName = examSet.name ?? "";
  const isMidTermOnly = (name) => {
    const n = String(name || "").trim().toLowerCase();
    return n === "mid term" || n === "midterm" || n.includes("mid") || n.includes("mid-term");
  };
  const showENDColumn = !isMidTermOnly(examName);
  let subjects = [];
  if (Array.isArray(student.subjects) && student.subjects.length > 0) {
    subjects = student.subjects.map((s) => ({
      subject_name: s.subject_name ?? "",
      mot_marks: s.mot_marks ?? "",
      eot_marks: s.eot_marks ?? "",
      eot_grade: (s.eot_grade ?? "").toString().trim() || "\u2014",
      mot_grade: (s.mot_grade ?? "").toString().trim() || "\u2014",
      bot_grade: (s.bot_grade ?? "").toString().trim() || "\u2014",
      total_marks: Number(s.total_marks) || 100,
      teacher_comment: (s.teacher_comment ?? "").toString(),
      teacher_name: (s.teacher_name ?? "").toString()
    }));
  } else if (Array.isArray(student.results)) {
    const bySubject = /* @__PURE__ */ new Map();
    for (const r of student.results) {
      const sub = (r.subject ?? "").toString().trim();
      if (!sub) continue;
      const marks = r.marks_obtained ?? r.final_score ?? "";
      const total = Number(r.total_marks ?? 100);
      const rawGrade = (r.grade ?? "").toString().trim();
      const isAtoF = ["A", "B", "C", "D", "E", "F"].includes(rawGrade.toUpperCase());
      const grade = rawGrade && !isAtoF ? rawGrade : marks !== "" && marks != null && !Number.isNaN(Number(marks)) ? primaryGradeFromMarks(Number(marks), total) : rawGrade || "\u2014";
      const teacherComment = (r.teacher_comment ?? r.remarks ?? r.overall_remark ?? r.teacher_remark ?? "").toString();
      const teacherName = (r.teacher_initials ?? "").toString();
      if (!bySubject.has(sub)) {
        bySubject.set(sub, {
          subject_name: sub,
          mot_marks: marks,
          eot_marks: marks,
          eot_grade: grade,
          mot_grade: grade,
          total_marks: total,
          teacher_comment: teacherComment,
          teacher_name: teacherName
        });
      } else {
        const ex = bySubject.get(sub);
        if (teacherComment) ex.teacher_comment = teacherComment;
        if (teacherName) ex.teacher_name = teacherName;
      }
    }
    subjects = Array.from(bySubject.values());
  }
  subjects = sortPrimarySubjectNamesForPdf(subjects);
  const subjectRows = subjects.map((s) => {
    const displayGrade = s.eot_grade && s.eot_grade !== "\u2014" ? s.eot_grade : s.mot_grade && s.mot_grade !== "\u2014" ? s.mot_grade : s.bot_grade && s.bot_grade !== "\u2014" ? s.bot_grade : "\u2014";
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
  }).join("");
  const streamDisplay = student.stream ?? student.current_stream ?? student.stream_name ?? "N/A";
  const reportDateDisplay = (() => {
    const raw = examSet.date ?? student.report_date ?? student.summary?.reportDate;
    if (!raw) return "N/A";
    const d = new Date(raw);
    return isNaN(d.getTime()) ? String(raw) : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  })();
  const classTeacherComment = student.comments?.class_teacher_text ?? student.comments?.class_teacher_comment ?? "";
  const headTeacherComment = student.comments?.headteacher_text ?? student.comments?.head_teacher_text ?? "";
  const summary = student.summary || {};
  const totalMarks = summary.totalMarks ?? summary.total_marks ?? "N/A";
  const avg = formatAverageForPdf(summary.average);
  const position = summary.classPosition != null && summary.totalStudents != null ? `${summary.classPosition} of ${summary.totalStudents}` : summary.classPosition ?? "\u2014";
  let division = summary.division ?? "\u2014";
  if (typeof division === "string" && division.toLowerCase().startsWith("division")) {
    division = division.replace(/division\s*/i, "").trim() || division;
  }
  const aggregate = summary.aggregate != null && summary.aggregate !== void 0 ? summary.aggregate : "N/A";
  const attendance = summary.attendanceDetails || summary.attendance_details || {};
  const daysPresent = attendance.presentDays ?? attendance.present_days ?? "N/A";
  const daysAbsent = attendance.absentDays ?? attendance.absent_days ?? "N/A";
  const totalDays = attendance.totalSchoolDays ?? attendance.total_school_days ?? attendance.total_days ?? "N/A";
  const attendancePct = summary.attendancePercentage != null ? String(summary.attendancePercentage) + "%" : "";
  const attendanceFallback = daysPresent === "N/A" && daysAbsent === "N/A" && totalDays === "N/A" && attendancePct ? attendancePct + " (days not recorded)" : null;
  const nextTermBegins = student.next_term_begins_date ? new Date(student.next_term_begins_date).toLocaleDateString() : "TBA";
  const feesBalance = student.feesBalance ?? student.fees?.balance ?? 0;
  const feesFormatted = typeof feesBalance === "number" ? new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(feesBalance) : String(feesBalance);
  const photoUrl = student.profile_photo ?? student.photo_url ?? student.student_photo_url ?? reportData.student_photo_url ?? "";
  const effectiveLogo = pickPrimaryPdfImageSrc(pdfImageEmbed, "logo", String(logoUrl ?? ""));
  const effectivePhoto = pickPrimaryPdfImageSrc(pdfImageEmbed, "photo", String(photoUrl ?? ""));
  const hasLogo = effectiveLogo.length > 0;
  const hasPhoto = effectivePhoto.length > 0;
  const pdfHdrRoot = pdfPrimaryHeaderRootVars(school);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Student Report - Upper Section</title>
  <style>
    @page { size: A4; margin: 0; }
    ${pdfHdrRoot}
    * { box-sizing: border-box; }
    /* No height:100% \u2014 merged class PDFs paginate incorrectly in Chromium. */
    html, body { margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 10.2pt; line-height: 1.3; color: #1e293b; background: #fff; }
    .report-page { width: 100%; max-width: 210mm; margin: 0 auto; padding: 4mm 5mm 4mm 5mm; box-sizing: border-box; }
    .header-wrap { display: flex; align-items: flex-start; margin-bottom: 3mm; }
    .logo-cell { width: 132px; height: 132px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; background: #f8fafc; }
    .logo-cell img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .school-center { flex: 1; text-align: center; margin-left: 12px; }
    .school-name { font-size: 20pt; font-weight: 700; font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.04em; color: var(--pdf-hdr-name); margin-bottom: 3px; }
    .school-subtitle { font-size: 11pt; color: var(--pdf-hdr-subtitle); margin-bottom: 2px; }
    .school-address { font-size: 11pt; font-weight: 600; color: var(--pdf-hdr-address); margin-bottom: 2px; }
    .school-contact { font-size: 11pt; font-weight: 600; color: var(--pdf-hdr-contact); margin-bottom: 2px; }
    .school-motto { font-size: 9.8pt; font-style: italic; font-weight: 600; color: var(--pdf-hdr-motto); }
    .divider { height: 1px; background: linear-gradient(to right, var(--pdf-hdr-divider) 0%, var(--pdf-hdr-divider-mid) 50%, var(--pdf-hdr-divider) 100%); margin: 3mm 0 3mm; }
    .badge-wrap { text-align: center; margin-bottom: 3mm; }
    .badge { display: inline-block; padding: 6px 18px; border-radius: 16px; font-size: 9pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: var(--pdf-hdr-chip-text); background: var(--pdf-hdr-chip-bg); border: 1px solid var(--pdf-hdr-chip-border); }
    .exam-sub { font-size: 7.4pt; color: var(--pdf-hdr-meta); margin-top: 2px; }
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
    .summary-3col { width: 100%; border-collapse: separate; border-spacing: 4px; margin-bottom: 3mm; table-layout: fixed; font-size: 8.7pt; }
    .summary-3col td { width: 33.33%; vertical-align: top; padding: 5px 8px; border: 1px solid #bfdbfe; border-radius: 8px; background: #fff; }
    .summary-3col strong { color: #1e3a8a; }
    .grading-section { margin-bottom: 3mm; font-size: 8.6pt; overflow: visible; }
    .grading-section h3 { font-size: 9.2pt; font-weight: 600; margin: 0 0 4px 0; color: #1e3a8a; }
    .grading-pair { width: 100%; border-collapse: separate; border-spacing: 6px 0; margin-bottom: 0; table-layout: fixed; }
    .grading-pair td { width: 50%; vertical-align: top; padding: 0; }
    .grading-table { border: 1px solid #bfdbfe; border-radius: 8px; overflow: hidden; }
    .grading-table .head { background: #dbeafe; padding: 4px 8px; font-weight: 600; text-align: center; text-transform: uppercase; font-size: 7.8pt; color: #1e3a8a; }
    .grading-table table { width: 100%; margin-bottom: 0; font-size: 8pt; }
    .grading-table th, .grading-table td { padding: 3px 5px; line-height: 1.25; }
    .grading-table tbody tr:nth-child(even) { background: #f0f9ff; }
    .comments-box { border: 1px solid #bfdbfe; border-radius: 8px; padding: 8px 10px; margin-bottom: 3mm; font-size: 8.5pt; background: #fff; overflow: visible; }
    .comment-block { display: block; margin: 0 0 10px 0; padding: 0 0 6px 0; }
    .comments-box h3 { font-size: 9pt; font-weight: 600; text-transform: uppercase; margin: 0 0 4px 0; color: #1e3a8a; }
    .comments-box .comment-p { margin: 0 0 6px 0; line-height: 1.35; color: #334155; }
    .comments-box .signature { font-size: 8pt; margin: 0; color: #64748b; display: block; }
    .fee-footer-row { width: 100%; margin-top: 8px; padding-top: 8px; border-top: 1px solid #bfdbfe; font-size: 8.1pt; border-collapse: collapse; }
    .fee-footer-row td { vertical-align: top; padding: 2px 4px 0 0; }
    .fee-footer-row td.fee-right { text-align: right; white-space: nowrap; }
    .fee-footer-row strong { color: #1e3a8a; }
    .report-footer { text-align: center; font-size: 7pt; margin-top: 3mm; padding-top: 6px; border-top: 1px solid #bfdbfe; color: #64748b; clear: both; }
    .summary-row { font-size: 9.5pt; margin-bottom: 3mm; padding: 5px 8px; border: 1px solid #e2e8f0; border-radius: 6px; background: #f8fafc; }
    .summary-row strong { color: #1e3a8a; }
    .comments-section { font-size: 9.5pt; }
    .comment-title { font-weight: 600; margin-bottom: 2px; color: #1e293b; }
    .comment-text { min-height: 20px; border-bottom: 1px solid #cbd5e1; padding-bottom: 2px; margin-bottom: 3px; }
  </style>
</head>
<body>
  <div class="report-page" style="position:relative;">
  <div class="header-wrap">
    <div class="logo-cell">
      ${hasLogo ? `<img src="${pdfImageSrcAttributeEscape(effectiveLogo)}" alt="School Logo" />` : '<span style="font-size:9pt;color:#94a3b8">School<br/>Logo</span>'}
    </div>
    <div class="school-center">
      <div class="school-name">${schoolName}</div>
      ${schoolSubtitle ? `<div class="school-subtitle">${schoolSubtitle}</div>` : ""}
      ${schoolAddress || schoolPobox ? `<div class="school-address">${schoolAddress}${schoolAddress && schoolPobox ? " " : ""}${schoolPobox}</div>` : ""}
      ${schoolContactHtml}
      ${schoolMotto ? `<div class="school-motto">"${schoolMotto}"</div>` : ""}
    </div>
  </div>
  <div class="divider"></div>
  <div class="badge-wrap">
    <div class="badge">${isMidTermOnly(examName) ? "Mid Term Report \u2013 Upper Section" : "End of Term Report \u2013 Upper Section"}</div>
    ${examName || year ? `<div class="exam-sub">${examName || "Term Report"} - ${year || (/* @__PURE__ */ new Date()).getFullYear()}</div>` : ""}
  </div>
  <div class="student-block">
    <div class="student-grid">
      <div><strong>Name:</strong> ${student.name ?? ""}</div>
      <div><strong>Class:</strong> ${student.current_class ?? ""}</div>
      <div><strong>Age (years):</strong> ${pdfStudentAgeYearsLabel(student, examSet)}</div>
      <div><strong>Admission No:</strong> ${student.admission_number ?? student.student_id ?? "N/A"}</div>
      <div><strong>Term:</strong> ${term || "N/A"} / ${year || (/* @__PURE__ */ new Date()).getFullYear()}</div>
      <div><strong>Stream:</strong> ${streamDisplay}</div>
      <div><strong>Date:</strong> ${reportDateDisplay}</div>
    </div>
    <div class="photo-cell">
      ${hasPhoto ? `<img src="${pdfImageSrcAttributeEscape(effectivePhoto)}" alt="Student photo" width="80" height="105" style="object-fit:cover;display:block;" />` : '<span style="font-size:8pt;color:#94a3b8">Photo</span>'}
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Subject</th>
        <th class="tc">MID</th>
        ${showENDColumn ? '<th class="tc">END</th>' : ""}
        <th class="tc">Grade</th>
        <th>Teacher's Comment</th>
        <th>Teacher</th>
      </tr>
    </thead>
    <tbody>
      ${subjectRows || (showENDColumn ? '<tr><td colspan="6" class="tc">No subject results.</td></tr>' : '<tr><td colspan="5" class="tc">No subject results.</td></tr>')}
    </tbody>
  </table>
  <table class="summary-3col" role="presentation">
    <tr>
      <td>
        <div><strong>Total Marks:</strong> ${totalMarks}</div>
        <div><strong>Average:</strong> ${avg}</div>
        <div><strong>Aggregates:</strong> ${aggregate}</div>
        <div><strong>Division:</strong> ${division}</div>
      </td>
      <td>
        <div><strong>Class Position:</strong> ${summary.classPosition ?? "N/A"}</div>
        <div><strong>Out of:</strong> ${summary.totalStudents ?? "N/A"} students</div>
      </td>
      <td>
        <div style="font-weight: 600; color: #1e3a8a;">Attendance:</div>
        ${attendanceFallback ? `<div>${attendanceFallback}</div>` : `<div>Days Present: ${daysPresent}</div>
        <div>Days Absent: ${daysAbsent}</div>
        <div>Total Days: ${totalDays}</div>`}
      </td>
    </tr>
  </table>
  <div class="grading-section">
    <h3>Grading System</h3>
    <table class="grading-pair" role="presentation">
      <tr>
        <td>
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
        </td>
        <td>
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
        </td>
      </tr>
    </table>
  </div>
  <div class="comments-box">
    <div class="comment-block">
      <h3>Class Teacher's Comments</h3>
      <p class="comment-p">${classTeacherComment}</p>
      <div class="signature">Signature: ____________________</div>
    </div>
    <div class="comment-block">
      <h3>Headteacher's Comments</h3>
      <p class="comment-p">${headTeacherComment}</p>
      <div class="signature">Signature: ____________________</div>
    </div>
    <table class="fee-footer-row" role="presentation" width="100%">
      <tr>
        <td><strong>Next Term Begins:</strong> ${nextTermBegins}</td>
        <td class="fee-right"><strong>Fees Balance:</strong> ${feesFormatted}</td>
      </tr>
    </table>
  </div>
  <div class="report-footer">Generated by PwezaCore School Management System</div>
  </div>
</body>
</html>`;
}
function buildTemplate3LowerSectionHTML(reportData, pdfImageEmbed) {
  const student = reportData.students?.[0];
  const school = reportData.school || {};
  const examSet = reportData.examSet || {};
  if (!student) throw new Error("No student in report data");
  const schoolName = school.name ?? "School Name";
  const schoolSubtitle = school.subtitle ?? "";
  const schoolAddress = school.address ?? "";
  const schoolPobox = school.pobox ?? "";
  const schoolMotto = school.motto ?? "";
  const logoUrl = school.logo_url ?? school.logo ?? "";
  const schoolContactHtmlLower = schoolContactBlockHtml(school);
  const term = examSet.term ?? "";
  const year = examSet.year ?? "";
  const examName = examSet.name ?? "";
  const isMid = (name) => /mid|midterm|mid-term/i.test(String(name || "").trim());
  const isEnd = (name) => /end|eot|final/i.test(String(name || "").trim());
  const preSubjects = Array.isArray(student.subjects) ? student.subjects : [];
  const bySubject = /* @__PURE__ */ new Map();
  const results = Array.isArray(student.results) ? student.results : [];
  if (preSubjects.length > 0) {
    for (const s of preSubjects) {
      const sub = (s.subject_name ?? "").toString().trim();
      if (!sub) continue;
      const matchingResult = results.find(
        (r) => (r.subject ?? "").toString().trim() === sub
      );
      const remark = (matchingResult?.teacher_comment ?? matchingResult?.remarks ?? s.teacher_comment ?? "").toString();
      const initials = (matchingResult?.teacher_initials ?? s.teacher_name ?? "").toString();
      bySubject.set(sub, {
        subject: sub,
        total_marks: Number(s.total_marks ?? 100),
        mid: s.mot_marks ?? "",
        end: s.eot_marks ?? "",
        remarks: remark,
        initials
      });
    }
  } else {
    for (const r of results) {
      const sub = (r.subject ?? "").toString().trim();
      if (!sub) continue;
      const examSetName = (r.exam_set_name ?? examName ?? "").toString();
      const marks = r.marks_obtained ?? r.final_score ?? "";
      const total = Number(r.total_marks ?? 100);
      const remark = (r.teacher_comment ?? r.remarks ?? r.teacher_remark ?? r.overall_remark ?? "").toString();
      const initials = (r.teacher_initials ?? "").toString();
      if (!bySubject.has(sub)) {
        bySubject.set(sub, { subject: sub, total_marks: total, mid: "", end: "", remarks: remark, initials });
      }
      const row = bySubject.get(sub);
      if (isMid(examSetName)) row.mid = marks;
      else if (isEnd(examSetName)) row.end = marks;
      else {
        row.mid = marks;
        row.end = marks;
      }
      if (remark) row.remarks = remark;
      if (initials) row.initials = initials;
    }
  }
  const rows = Array.from(bySubject.values());
  const hasMotData = rows.some((r) => r.mid !== "" && r.mid != null);
  const hasEotData = rows.some((r) => r.end !== "" && r.end != null);
  let showMidTermColumn;
  let showEndOfTermColumn;
  if (hasMotData || hasEotData) {
    showMidTermColumn = hasMotData;
    showEndOfTermColumn = hasEotData || !hasMotData;
  } else {
    showMidTermColumn = true;
    showEndOfTermColumn = true;
    if (examName) {
      const n = String(examName).toLowerCase();
      if (n.includes("mid") && !n.includes("end")) {
        showEndOfTermColumn = false;
      } else if (n.includes("end") || n.includes("eot") || n.includes("final")) {
        showMidTermColumn = false;
      }
    }
  }
  const sortedLowerRows = sortPrimarySubjectNamesForPdf(Array.from(bySubject.values()));
  const subjectRows = sortedLowerRows.map((row) => {
    const midD = pdfMarkCellDisplay(row.mid, "");
    const endD = pdfMarkCellDisplay(row.end, "");
    const midCell = showMidTermColumn ? `<td class="tc">${midD}</td>` : "";
    const endCell = showEndOfTermColumn ? `<td class="tc">${endD}</td>` : "";
    return `<tr><td class="subj-name">${row.subject}</td><td class="tc">${row.total_marks}</td>${midCell}${endCell}<td class="comment">${row.remarks}</td><td class="teacher">${row.initials}</td></tr>`;
  }).join("");
  const summary = student.summary || {};
  const totalMarks = summary.totalMarks ?? summary.total_marks ?? "N/A";
  const avg = formatAverageForPdf(summary.average);
  const position = summary.classPosition != null && summary.totalStudents != null ? `${summary.classPosition} of ${summary.totalStudents}` : summary.classPosition ?? "\u2014";
  const attendance = summary.attendanceDetails || summary.attendance_details || {};
  const daysPresent = attendance.presentDays ?? attendance.present_days ?? "N/A";
  const daysAbsent = attendance.absentDays ?? attendance.absent_days ?? "N/A";
  const totalDays = attendance.totalSchoolDays ?? attendance.total_school_days ?? attendance.total_days ?? "N/A";
  const attendancePct = summary.attendancePercentage != null ? String(summary.attendancePercentage) + "%" : "";
  const attendanceFallback = daysPresent === "N/A" && daysAbsent === "N/A" && totalDays === "N/A" && attendancePct ? attendancePct + " (days not recorded)" : null;
  const resultsForComments = Array.isArray(student.results) ? student.results : [];
  const endResultsForComments = resultsForComments.filter((r) => {
    const name = String(r.exam_set_name || r.exam_set || "").toLowerCase();
    return name.includes("end") || name.includes("final") || name.includes("eot");
  });
  const endOfTermResultForPdf = endResultsForComments.find((r) => r.headteacher_comment || r.class_teacher_comment) || endResultsForComments[0] || resultsForComments[0] || null;
  const classTeacherCommentRaw = (endOfTermResultForPdf?.class_teacher_comment ?? student.comments?.class_teacher_text ?? student.comments?.class_teacher_comment ?? student.class_teacher_comment ?? "").toString().trim();
  const headTeacherCommentRaw = (endOfTermResultForPdf?.headteacher_comment ?? student.comments?.head_teacher_text ?? student.comments?.head_teacher_comment ?? student.comments?.headteacher_text ?? student.head_teacher_comment ?? "").toString().trim();
  const classTeacherComment = classTeacherCommentRaw;
  const headTeacherComment = headTeacherCommentRaw;
  const nextTermBegins = student.next_term_begins_date ? new Date(student.next_term_begins_date).toLocaleDateString() : "TBA";
  const feesBalance = student.feesBalance ?? student.fees?.balance ?? 0;
  const feesFormatted = typeof feesBalance === "number" ? new Intl.NumberFormat("en-UG", {
    style: "currency",
    currency: "UGX",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(feesBalance) : String(feesBalance);
  const photoUrl = student.profile_photo ?? student.photo_url ?? student.student_photo_url ?? "";
  const effectiveLogo = pickPrimaryPdfImageSrc(pdfImageEmbed, "logo", String(logoUrl ?? ""));
  const effectivePhoto = pickPrimaryPdfImageSrc(pdfImageEmbed, "photo", String(photoUrl ?? ""));
  const hasLogo = effectiveLogo.length > 0;
  const hasPhoto = effectivePhoto.length > 0;
  const reportDateDisplay = (() => {
    const raw = examSet.date ?? student.report_date ?? student.summary?.reportDate;
    if (!raw) return "N/A";
    const d = new Date(raw);
    return isNaN(d.getTime()) ? String(raw) : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  })();
  const colspan = 3 + (showMidTermColumn ? 1 : 0) + (showEndOfTermColumn ? 1 : 0) + 2;
  const midTh = showMidTermColumn ? '<th class="tc">MID TERM</th>' : "";
  const endTh = showEndOfTermColumn ? '<th class="tc">END OF TERM</th>' : "";
  const emptyRow = `<tr><td colspan="${colspan}" class="tc">No subject results.</td></tr>`;
  const pdfHdrRoot = pdfPrimaryHeaderRootVars(school);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Student Report - Lower Section</title>
  <style>
    @page { size: A4; margin: 0; }
    ${pdfHdrRoot}
    * { box-sizing: border-box; }
    /* Lower Section only: compact vertical rhythm so comments + footer stay on one A4 (Chromium PDF). */
    html, body { margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 9.7pt; line-height: 1.22; color: #1e293b; background: #fff; }
    .report-page { width: 100%; max-width: 210mm; margin: 0 auto; padding: 3mm 4mm 5mm 4mm; box-sizing: border-box; }
    .header-wrap { display: flex; align-items: flex-start; margin-bottom: 2mm; }
    .logo-cell { width: 118px; height: 118px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; background: #f8fafc; }
    .logo-cell img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .school-center { flex: 1; text-align: center; margin-left: 10px; }
    .school-name { font-size: 18pt; font-weight: 700; font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.04em; color: var(--pdf-hdr-name); margin-bottom: 2px; }
    .school-subtitle { font-size: 10.5pt; color: var(--pdf-hdr-subtitle); margin-bottom: 1px; }
    .school-address { font-size: 10.5pt; font-weight: 600; color: var(--pdf-hdr-address); margin-bottom: 1px; }
    .school-contact { font-size: 10.5pt; font-weight: 600; color: var(--pdf-hdr-contact); margin-bottom: 1px; }
    .school-motto { font-size: 9pt; font-style: italic; font-weight: 600; color: var(--pdf-hdr-motto); }
    .divider { height: 1px; background: linear-gradient(to right, var(--pdf-hdr-divider) 0%, var(--pdf-hdr-divider-mid) 50%, var(--pdf-hdr-divider) 100%); margin: 2mm 0 2mm; }
    .badge-wrap { text-align: center; margin-bottom: 2mm; }
    .badge { display: inline-block; padding: 5px 14px; border-radius: 14px; font-size: 8.5pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: var(--pdf-hdr-chip-text); background: var(--pdf-hdr-chip-bg); border: 1px solid var(--pdf-hdr-chip-border); }
    .exam-sub { font-size: 7pt; color: var(--pdf-hdr-meta); margin-top: 1px; }
    .student-block { display: flex; justify-content: space-between; align-items: flex-start; padding: 4px 8px; border: 1px solid #bfdbfe; border-radius: 6px; margin-bottom: 2mm; background: #f8fafc; min-height: 22mm; }
    .student-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 8px; font-size: 9.5pt; }
    .student-grid strong { color: #1e3a8a; }
    .photo-cell { width: 2cm; height: 2.65cm; border: 1px solid #bfdbfe; border-radius: 4px; background: #fff; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
    .photo-cell img { width: 100%; height: 100%; object-fit: cover; }
    table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 2mm; }
    th, td { border: 1px solid #bfdbfe; padding: 2px 4px; }
    thead tr { background: #dbeafe; color: #1e3a8a; text-transform: uppercase; font-weight: 600; }
    th { text-align: left; }
    th.tc, td.tc { text-align: center; }
    td.subj-name { font-weight: 600; color: #0f172a; }
    td.comment, td.teacher { font-size: 8.5pt; color: #475569; }
    tbody tr:nth-child(even) { background: #f0f9ff; }
    /* Tables instead of CSS grid \u2014 Chromium PDF often stacks grid/flex children on top of each other. */
    .summary-3col { width: 100%; border-collapse: separate; border-spacing: 4px; margin-bottom: 3mm; table-layout: fixed; font-size: 8.1pt; }
    .summary-3col td { width: 33.33%; vertical-align: top; padding: 4px 6px; border: 1px solid #bfdbfe; border-radius: 6px; background: #fff; }
    .summary-3col strong { color: #1e3a8a; }
    .grading-section { margin-bottom: 3mm; font-size: 7.8pt; overflow: visible; min-height: 48mm; }
    .grading-section h3 { font-size: 8.2pt; font-weight: 600; margin: 0 0 3px 0; color: #1e3a8a; }
    .grading-pair { width: 100%; border-collapse: separate; border-spacing: 6px 0; margin-bottom: 0; table-layout: fixed; }
    .grading-pair td { width: 50%; vertical-align: top; padding: 0; }
    .grading-table { border: 1px solid #bfdbfe; border-radius: 6px; overflow: hidden; }
    .grading-table .head { background: #dbeafe; padding: 2px 6px; font-weight: 600; text-align: center; text-transform: uppercase; font-size: 7pt; color: #1e3a8a; }
    .grading-table table { width: 100%; margin-bottom: 0; font-size: 7.3pt; }
    .grading-table th, .grading-table td { padding: 1px 3px; line-height: 1.2; }
    .grading-table tbody tr:nth-child(even) { background: #f0f9ff; }
    .comments-box { border: 1px solid #bfdbfe; border-radius: 6px; padding: 8px 10px 10px; margin-bottom: 0; font-size: 7.8pt; background: #fff; overflow: visible; min-height: 58mm; }
    .comment-block { display: block; margin: 0 0 8px 0; padding: 0 0 6px 0; border-bottom: 0; }
    .comment-block:last-of-type { margin-bottom: 4px; }
    .comments-box h3 { font-size: 8pt; font-weight: 600; text-transform: uppercase; margin: 0 0 4px 0; padding: 0; color: #1e3a8a; }
    .comments-box .comment-p { margin: 0 0 6px 0; line-height: 1.35; color: #334155; }
    .comments-box .signature { font-size: 7pt; margin: 0 0 0 0; color: #64748b; display: block; }
    .fee-footer-row { width: 100%; margin-top: 6px; padding-top: 6px; border-top: 1px solid #bfdbfe; font-size: 7.4pt; border-collapse: collapse; }
    .fee-footer-row td { vertical-align: top; padding: 2px 4px 0 0; }
    .fee-footer-row td.fee-right { text-align: right; white-space: nowrap; }
    .fee-footer-row strong { color: #1e3a8a; }
    .report-footer-in-card { text-align: center; font-size: 6pt; line-height: 1.25; margin: 6px 0 0; padding-top: 6px; border-top: 1px solid #bfdbfe; color: #64748b; }
  </style>
</head>
<body>
  <div class="report-page">
  <div class="header-wrap">
    <div class="logo-cell">${hasLogo ? `<img src="${pdfImageSrcAttributeEscape(effectiveLogo)}" alt="School Logo" />` : '<span style="font-size:9pt;color:#94a3b8">School<br/>Logo</span>'}</div>
    <div class="school-center">
      <div class="school-name">${schoolName}</div>
      ${schoolSubtitle ? `<div class="school-subtitle">${schoolSubtitle}</div>` : ""}
      ${schoolAddress || schoolPobox ? `<div class="school-address">${schoolAddress}${schoolAddress && schoolPobox ? " " : ""}${schoolPobox}</div>` : ""}
      ${schoolContactHtmlLower}
      ${schoolMotto ? `<div class="school-motto">"${schoolMotto}"</div>` : ""}
    </div>
  </div>
  <div class="divider"></div>
  <div class="badge-wrap">
    <div class="badge">${examName && /mid/i.test(examName) && !/end|eot/i.test(examName) ? "Mid Term Report" : "End of Term Report"}</div>
    <div class="exam-sub">${examName || "Term Report"} - ${year || (/* @__PURE__ */ new Date()).getFullYear()}</div>
  </div>
  <div class="student-block">
    <div class="student-grid">
      <div><strong>Name:</strong> ${student.name ?? ""}</div>
      <div><strong>Class:</strong> ${student.current_class ?? ""}</div>
      <div><strong>Age (years):</strong> ${pdfStudentAgeYearsLabel(student, examSet)}</div>
      <div><strong>Admission No:</strong> ${student.admission_number ?? student.student_id ?? "N/A"}</div>
      <div><strong>Term:</strong> ${term || "N/A"} / ${year || (/* @__PURE__ */ new Date()).getFullYear()}</div>
      <div><strong>Date:</strong> ${reportDateDisplay}</div>
    </div>
    <div class="photo-cell">${hasPhoto ? `<img src="${pdfImageSrcAttributeEscape(effectivePhoto)}" alt="Student photo" width="80" height="105" style="object-fit:cover;display:block;" />` : '<span style="font-size:8pt;color:#94a3b8">Photo</span>'}</div>
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
  <table class="summary-3col" role="presentation">
    <tr>
      <td><div><strong>Total Marks:</strong> ${totalMarks}</div><div><strong>Average:</strong> ${avg}</div></td>
      <td><div><strong>Class Position:</strong> ${position}</div><div><strong>Out of:</strong> ${summary.totalStudents ?? "N/A"} students</div></td>
      <td>
        <div style="font-weight: 600; color: #1e3a8a;">Attendance:</div>
        ${attendanceFallback ? `<div>${attendanceFallback}</div>` : `<div>Days Present: ${daysPresent}</div><div>Days Absent: ${daysAbsent}</div><div>Total Days: ${totalDays}</div>`}
      </td>
    </tr>
  </table>
  <div class="grading-section">
    <h3>Grading System</h3>
    <table class="grading-pair" role="presentation">
      <tr>
        <td>
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
        </td>
        <td>
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
        </td>
      </tr>
    </table>
  </div>
  <div class="comments-box">
    <div class="comment-block">
      <h3>Class Teacher's Comments</h3>
      <p class="comment-p">${classTeacherComment}</p>
      <div class="signature">Signature: ____________________</div>
    </div>
    <div class="comment-block">
      <h3>Headteacher's Comments</h3>
      <p class="comment-p">${headTeacherComment}</p>
      <div class="signature">Signature: ____________________</div>
    </div>
    <table class="fee-footer-row" role="presentation" width="100%">
      <tr>
        <td><strong>Next term begins on:</strong> ${nextTermBegins}</td>
        <td class="fee-right"><strong>Fees Balance:</strong> ${feesFormatted}</td>
      </tr>
    </table>
    <div class="report-footer-in-card">Generated by PwezaCore School Management System</div>
  </div>
  </div>
</body>
</html>`;
}
var REPORT_HEADER_DEFAULTS, PRIORITY_PRIMARY_SUBJECT_NAMES;
var init_primaryPdfBuiltins = __esm({
  "src/services/primaryPdfBuiltins.ts"() {
    "use strict";
    REPORT_HEADER_DEFAULTS = {
      schoolName: "#000000",
      subtitle: "#3b82f6",
      address: "#1e40af",
      contact: "#1e40af",
      motto: "#2563eb",
      divider: "#1e3a8a",
      chipText: "#1e3a8a",
      chipBackground: "#eff6ff",
      chipBorder: "#bfdbfe",
      metaLine: "#64748b",
      contactSeparator: "#64748b"
    };
    PRIORITY_PRIMARY_SUBJECT_NAMES = ["English", "Mathematics", "Science"];
  }
});

// src/templates/primary/nurseryPerformance.ts
var NURSERY_PERFORMANCE_OPTIONS, NURSERY_PERFORMANCE_COLOR_MAP;
var init_nurseryPerformance = __esm({
  "src/templates/primary/nurseryPerformance.ts"() {
    "use strict";
    NURSERY_PERFORMANCE_OPTIONS = [
      { label: "Very Good", color: "#4CAF50" },
      { label: "Good", color: "#42A5F5" },
      { label: "Tries", color: "#FFEB3B" },
      { label: "Still a Problem", color: "#FF7043" },
      { label: "Promising", color: "#BA68C8" }
    ];
    NURSERY_PERFORMANCE_COLOR_MAP = NURSERY_PERFORMANCE_OPTIONS.reduce((acc, option) => {
      acc[option.label] = option.color;
      return acc;
    }, {});
  }
});

// src/templates/primary/prePrimaryHolisticRatings.ts
function prePrimaryHolisticLabelToEnum(label) {
  return PRE_PRIMARY_HOLISTIC_RATING_TO_ENUM[label];
}
function prePrimaryGradeEnumToDisplayLabel(grade, ratingLevels) {
  const row = ratingLevels?.find((r) => r.grade_enum === grade);
  if (row) return row.display_label;
  return LEGACY_GRADE_TO_LABEL[grade];
}
function prePrimaryGradeEnumToColorHex(grade, ratingLevels) {
  const row = ratingLevels?.find((r) => r.grade_enum === grade);
  if (row) return row.color_hex;
  const legacy = FALLBACK_PRE_PRIMARY_HOLISTIC_RATINGS.find((r) => prePrimaryHolisticLabelToEnum(r.label) === grade);
  return legacy?.color;
}
function normalizePrePrimaryHolisticGrade(value, ratingLevels) {
  if (value === null || value === void 0) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const asEnumKey = raw.toUpperCase().replace(/\s+/g, "_");
  if (PRE_PRIMARY_HOLISTIC_GRADE_ENUMS.includes(asEnumKey)) {
    return asEnumKey;
  }
  if (ratingLevels?.length) {
    const low = raw.toLowerCase().replace(/\s+/g, " ").trim();
    const byLabel = ratingLevels.find((r) => r.display_label.trim().toLowerCase() === low);
    if (byLabel) return byLabel.grade_enum;
    const collapsed2 = low.replace(/\s/g, "");
    const byLabelCollapsed = ratingLevels.find(
      (r) => r.display_label.trim().toLowerCase().replace(/\s/g, "") === collapsed2
    );
    if (byLabelCollapsed) return byLabelCollapsed.grade_enum;
  }
  const legacyLabel = raw;
  if (legacyLabel in PRE_PRIMARY_HOLISTIC_RATING_TO_ENUM) {
    return PRE_PRIMARY_HOLISTIC_RATING_TO_ENUM[legacyLabel];
  }
  const collapsed = raw.toLowerCase().replace(/\s+/g, " ");
  const alias = RATING_ALIASES.get(collapsed.replace(/\s/g, "")) ?? RATING_ALIASES.get(collapsed);
  if (alias) return alias;
  return null;
}
function isPrePrimaryNurseryClass(className) {
  const t = String(className || "").trim().toLowerCase();
  return t === "baby class" || t === "middle class" || t === "top class";
}
function parsePrePrimaryGradeFromPerformanceJson(perf, skillKey, ratingLevels) {
  if (!perf || typeof perf !== "object" || Array.isArray(perf)) return null;
  const p = perf;
  const legacyKey = Object.entries(PRE_PRIMARY_HOLISTIC_SKILL_KEY_LEGACY_ALIASES).find(([, v]) => v === skillKey)?.[0];
  const raw = p[skillKey] ?? (legacyKey ? p[legacyKey] : void 0) ?? (skillKey === "writing" ? p.attendance : void 0) ?? (skillKey === "drawing" ? p.development_and_using_language : void 0);
  return normalizePrePrimaryHolisticGrade(raw, ratingLevels);
}
var PRE_PRIMARY_HOLISTIC_GRADE_ENUMS, PRE_PRIMARY_HOLISTIC_RATING_TO_ENUM, FALLBACK_PRE_PRIMARY_HOLISTIC_RATINGS, LEGACY_GRADE_TO_LABEL, PRE_PRIMARY_HOLISTIC_SKILL_KEY_LEGACY_ALIASES, FALLBACK_PRE_PRIMARY_HOLISTIC_STRANDS, ALL_PRE_PRIMARY_HOLISTIC_STRAND_SUBJECTS, RATING_ALIASES, ALL_PRE_PRIMARY_HOLISTIC_SKILL_KEYS;
var init_prePrimaryHolisticRatings = __esm({
  "src/templates/primary/prePrimaryHolisticRatings.ts"() {
    "use strict";
    init_nurseryPerformance();
    PRE_PRIMARY_HOLISTIC_GRADE_ENUMS = ["VERY_GOOD", "GOOD", "NEEDS_IMPROVEMENT", "TRIES"];
    PRE_PRIMARY_HOLISTIC_RATING_TO_ENUM = {
      "Very Good": "VERY_GOOD",
      Good: "GOOD",
      "Needs Improvement": "NEEDS_IMPROVEMENT",
      Tries: "TRIES"
    };
    FALLBACK_PRE_PRIMARY_HOLISTIC_RATINGS = [
      { label: "Very Good", color: "#c0392b" },
      { label: "Good", color: "#d4ac0d" },
      { label: "Needs Improvement", color: "#1a7a35" },
      { label: "Tries", color: "#1a5fa0" }
    ];
    LEGACY_GRADE_TO_LABEL = {
      VERY_GOOD: "Very Good",
      GOOD: "Good",
      NEEDS_IMPROVEMENT: "Needs Improvement",
      TRIES: "Tries"
    };
    PRE_PRIMARY_HOLISTIC_SKILL_KEY_LEGACY_ALIASES = {
      attendance: "writing",
      development_and_using_language: "drawing"
    };
    FALLBACK_PRE_PRIMARY_HOLISTIC_STRANDS = [
      {
        subject: "Relating with others (Social development)",
        skills: [
          { key: "relating_with_others", label: "Relating with others" },
          { key: "games", label: "Games" },
          { key: "helping", label: "Helping others" }
        ]
      },
      {
        subject: "Relating and knowing my environment (Language I)",
        skills: [
          { key: "naming", label: "Naming" },
          { key: "cleanliness", label: "Cleanliness" },
          { key: "caring_for_the_environment", label: "Caring for the environment" }
        ]
      },
      {
        subject: "Taking care of myself (Health habits)",
        skills: [
          { key: "taking_care_of_myself", label: "Taking care of myself" },
          { key: "toilet_habits", label: "Toilet habits" },
          { key: "body_hygiene", label: "Body hygiene" }
        ]
      },
      {
        subject: "Development and using mathematical concepts",
        skills: [
          { key: "reciting_numbers", label: "Reciting numbers" },
          { key: "counting_concepts", label: "Counting concepts" },
          { key: "addition_concepts", label: "Additional concepts" }
        ]
      },
      {
        subject: "Development and using language (Language II)",
        skills: [
          { key: "drawing", label: "Drawing" },
          { key: "reading", label: "Reading" },
          { key: "writing", label: "Writing" }
        ]
      },
      {
        subject: "Writing",
        skills: [
          { key: "writing", label: "Writing" }
        ]
      }
    ];
    ALL_PRE_PRIMARY_HOLISTIC_STRAND_SUBJECTS = FALLBACK_PRE_PRIMARY_HOLISTIC_STRANDS.map((s) => s.subject);
    RATING_ALIASES = /* @__PURE__ */ new Map([
      ["very good", "VERY_GOOD"],
      ["verygood", "VERY_GOOD"],
      ["vg", "VERY_GOOD"],
      ["good", "GOOD"],
      ["g", "GOOD"],
      ["needs improvement", "NEEDS_IMPROVEMENT"],
      ["needsimprovement", "NEEDS_IMPROVEMENT"],
      ["ni", "NEEDS_IMPROVEMENT"],
      ["tries", "TRIES"],
      ["t", "TRIES"]
    ]);
    ALL_PRE_PRIMARY_HOLISTIC_SKILL_KEYS = new Set(
      FALLBACK_PRE_PRIMARY_HOLISTIC_STRANDS.flatMap((s) => s.skills.map((sk) => sk.key))
    );
  }
});

// src/templates/primary/prePrimaryDetailedCommentMapping.ts
function getItemKeyForSkillKey(skillKey) {
  return PRE_PRIMARY_SKILL_KEY_TO_ITEM_KEY[skillKey];
}
function getResponseTextForGrade(row, grade) {
  const field = PRE_PRIMARY_RATING_TO_RESPONSE_FIELD[grade];
  const raw = field === "response_good" ? row.response_good ?? row.response_tries : field === "response_needs_improvement" ? row.response_needs_improvement ?? row.response_tries : field === "response_yes" ? row.response_yes : field === "response_never" ? row.response_never : row.response_tries;
  return (raw ?? "").trim();
}
var PRE_PRIMARY_SKILL_KEY_TO_ITEM_KEY, ALL_MAPPED_PRE_PRIMARY_ITEM_KEYS, PRE_PRIMARY_RATING_TO_RESPONSE_FIELD;
var init_prePrimaryDetailedCommentMapping = __esm({
  "src/templates/primary/prePrimaryDetailedCommentMapping.ts"() {
    "use strict";
    PRE_PRIMARY_SKILL_KEY_TO_ITEM_KEY = {
      relating_with_others: "relating_with_others",
      games: "games",
      helping: "helping",
      naming: "naming",
      cleanliness: "cleanliness",
      caring_for_the_environment: "caring_for_the_environment",
      taking_care_of_myself: "taking_care_of_myself",
      toilet_habits: "toilet_habits",
      body_hygiene: "body_hygiene",
      reciting_numbers: "reciting_numbers",
      counting_concepts: "counting_concepts",
      addition_concepts: "addition_concepts",
      drawing: "drawing",
      reading: "reading",
      writing: "writing"
    };
    ALL_MAPPED_PRE_PRIMARY_ITEM_KEYS = [
      ...new Set(Object.values(PRE_PRIMARY_SKILL_KEY_TO_ITEM_KEY))
    ];
    PRE_PRIMARY_RATING_TO_RESPONSE_FIELD = {
      VERY_GOOD: "response_yes",
      GOOD: "response_good",
      NEEDS_IMPROVEMENT: "response_needs_improvement",
      TRIES: "response_never"
    };
  }
});

// src/lib/publicAssetUrl.ts
function publicAssetUrl(pathFromPublicRoot) {
  const trimmed = pathFromPublicRoot.replace(/^\/+/, "");
  const base = import.meta.env.BASE_URL || "/";
  if (base.endsWith("/")) {
    return `${base}${trimmed}`;
  }
  return `${base}/${trimmed}`;
}
var init_publicAssetUrl = __esm({
  "src/lib/publicAssetUrl.ts"() {
    "use strict";
  }
});

// src/templates/primary/prePrimarySkillIllustrations.tsx
import React from "react";
import { jsx, jsxs } from "react/jsx-runtime";
function normalizePrePrimarySkillArtKey(skillKey) {
  return skillKey.trim().toLowerCase().replace(/-/g, "_");
}
function SvgFrame({ children, size }) {
  return /* @__PURE__ */ jsx(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 100 100",
      style: { display: "block", flexShrink: 0 },
      "aria-hidden": true,
      children
    }
  );
}
function RasterPlaceholder({ compact }) {
  const h = compact ? 48 : 56;
  return /* @__PURE__ */ jsx(
    "div",
    {
      style: {
        width: "65%",
        height: h,
        maxHeight: "100%",
        background: "#f1f5f9",
        borderRadius: 6,
        border: "1px dashed #cbd5e1",
        flexShrink: 0,
        boxSizing: "border-box"
      },
      "aria-hidden": true
    }
  );
}
function PrePrimarySkillIllustration({
  skillKey,
  size = 76,
  pdfEmbedSrc,
  rasterOnly = false,
  checklistLayout = false
}) {
  if (pdfEmbedSrc !== void 0) {
    if (pdfEmbedSrc) {
      return /* @__PURE__ */ jsx(
        "img",
        {
          src: pdfEmbedSrc,
          alt: "",
          ...checklistLayout ? {} : { width: size, height: size },
          style: checklistLayout ? CHECKLIST_IMG_STYLE : {
            display: "block",
            width: size,
            height: size,
            objectFit: "contain",
            flexShrink: 0
          }
        }
      );
    }
    return checklistLayout ? /* @__PURE__ */ jsx(RasterPlaceholder, {}) : /* @__PURE__ */ jsx(
      "div",
      {
        style: {
          width: size,
          height: size,
          background: "#f1f5f9",
          borderRadius: 6,
          border: "1px dashed #cbd5e1",
          flexShrink: 0
        },
        "aria-hidden": true
      }
    );
  }
  const key = normalizePrePrimarySkillArtKey(skillKey);
  const [extIdx, setExtIdx] = React.useState(0);
  React.useEffect(() => {
    setExtIdx(0);
  }, [skillKey]);
  if (extIdx >= SKILL_ART_EXT_TRIES.length) {
    if (rasterOnly) {
      return checklistLayout ? /* @__PURE__ */ jsx(RasterPlaceholder, {}) : /* @__PURE__ */ jsx(
        "div",
        {
          style: {
            width: size,
            height: size,
            background: "#f1f5f9",
            borderRadius: 6,
            border: "1px dashed #cbd5e1",
            flexShrink: 0
          },
          "aria-hidden": true
        }
      );
    }
    return /* @__PURE__ */ jsx(PrePrimarySkillSvgIllustration, { skillKey, size });
  }
  const ext = SKILL_ART_EXT_TRIES[extIdx];
  const src = publicAssetUrl(`${PRE_PRIMARY_SKILL_ART_PUBLIC_DIR}/${key}.${ext}`);
  return /* @__PURE__ */ jsx(
    "img",
    {
      src,
      alt: "",
      ...checklistLayout ? {} : { width: size, height: size },
      loading: "lazy",
      decoding: "async",
      style: checklistLayout ? CHECKLIST_IMG_STYLE : {
        display: "block",
        width: size,
        height: size,
        objectFit: "contain",
        flexShrink: 0
      },
      onError: () => setExtIdx((i) => i + 1)
    },
    src
  );
}
function PrePrimarySkillSvgIllustration({ skillKey, size = 76 }) {
  const k = skillKey.trim().toLowerCase().replace(/-/g, "_");
  switch (k) {
    case "relating_with_others":
      return /* @__PURE__ */ jsxs(SvgFrame, { size, children: [
        /* @__PURE__ */ jsx("circle", { cx: "28", cy: "36", r: "11", fill: "#fbbf24", stroke: STROKE, strokeWidth: SW }),
        /* @__PURE__ */ jsx("path", { d: "M18 52 Q28 46 38 52 L42 78 L14 78 Z", fill: "#38bdf8", stroke: STROKE, strokeWidth: SW, strokeLinejoin: "round" }),
        /* @__PURE__ */ jsx("circle", { cx: "50", cy: "30", r: "12", fill: "#fb7185", stroke: STROKE, strokeWidth: SW }),
        /* @__PURE__ */ jsx("path", { d: "M38 48 Q50 40 62 48 L68 78 L32 78 Z", fill: "#a78bfa", stroke: STROKE, strokeWidth: SW, strokeLinejoin: "round" }),
        /* @__PURE__ */ jsx("circle", { cx: "72", cy: "36", r: "11", fill: "#4ade80", stroke: STROKE, strokeWidth: SW }),
        /* @__PURE__ */ jsx("path", { d: "M62 52 Q72 46 82 52 L86 78 L58 78 Z", fill: "#f472b6", stroke: STROKE, strokeWidth: SW, strokeLinejoin: "round" }),
        /* @__PURE__ */ jsx("path", { d: "M34 62 Q50 58 66 62", fill: "none", stroke: STROKE, strokeWidth: 2.2, strokeLinecap: "round" })
      ] });
    case "games":
      return /* @__PURE__ */ jsxs(SvgFrame, { size, children: [
        /* @__PURE__ */ jsx("circle", { cx: "50", cy: "48", r: "22", fill: "#fde047", stroke: STROKE, strokeWidth: SW }),
        /* @__PURE__ */ jsx("path", { d: "M38 48 L44 54 L62 36", fill: "none", stroke: STROKE, strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" }),
        /* @__PURE__ */ jsx("circle", { cx: "72", cy: "28", r: "8", fill: "#f97316", stroke: STROKE, strokeWidth: 2.4 }),
        /* @__PURE__ */ jsx("rect", { x: "22", y: "68", width: "56", height: "10", rx: "3", fill: "#22c55e", stroke: STROKE, strokeWidth: 2.2 })
      ] });
    case "helping":
      return /* @__PURE__ */ jsxs(SvgFrame, { size, children: [
        /* @__PURE__ */ jsx(
          "path",
          {
            d: "M28 72 L28 48 Q28 32 42 32 Q50 32 50 40 L50 72 Z",
            fill: "#fdba74",
            stroke: STROKE,
            strokeWidth: SW,
            strokeLinejoin: "round"
          }
        ),
        /* @__PURE__ */ jsx("circle", { cx: "42", cy: "22", r: "12", fill: "#fcd34d", stroke: STROKE, strokeWidth: SW }),
        /* @__PURE__ */ jsx(
          "path",
          {
            d: "M58 72 L58 52 Q72 44 78 56 L74 72 Z",
            fill: "#93c5fd",
            stroke: STROKE,
            strokeWidth: SW,
            strokeLinejoin: "round"
          }
        ),
        /* @__PURE__ */ jsx("circle", { cx: "68", cy: "38", r: "10", fill: "#fca5a5", stroke: STROKE, strokeWidth: SW }),
        /* @__PURE__ */ jsx("path", { d: "M48 56 L62 50", fill: "none", stroke: STROKE, strokeWidth: 2.6, strokeLinecap: "round" }),
        /* @__PURE__ */ jsx("path", { d: "M52 24 Q56 18 62 20", fill: "none", stroke: "#ef4444", strokeWidth: 2.2, strokeLinecap: "round" })
      ] });
    case "naming":
      return /* @__PURE__ */ jsxs(SvgFrame, { size, children: [
        /* @__PURE__ */ jsx("rect", { x: "18", y: "28", width: "64", height: "44", rx: "6", fill: "#fef08a", stroke: STROKE, strokeWidth: SW }),
        /* @__PURE__ */ jsx("rect", { x: "26", y: "38", width: "22", height: "14", rx: "2", fill: "#fb923c", stroke: STROKE, strokeWidth: 2.2 }),
        /* @__PURE__ */ jsx("rect", { x: "52", y: "38", width: "22", height: "14", rx: "2", fill: "#4ade80", stroke: STROKE, strokeWidth: 2.2 }),
        /* @__PURE__ */ jsx("circle", { cx: "34", cy: "66", r: "5", fill: "#2563eb", stroke: STROKE, strokeWidth: 2 }),
        /* @__PURE__ */ jsx("circle", { cx: "50", cy: "66", r: "5", fill: "#dc2626", stroke: STROKE, strokeWidth: 2 }),
        /* @__PURE__ */ jsx("circle", { cx: "66", cy: "66", r: "5", fill: "#16a34a", stroke: STROKE, strokeWidth: 2 })
      ] });
    case "cleanliness":
      return /* @__PURE__ */ jsxs(SvgFrame, { size, children: [
        /* @__PURE__ */ jsx("rect", { x: "38", y: "22", width: "24", height: "40", rx: "4", fill: "#e0f2fe", stroke: STROKE, strokeWidth: SW }),
        /* @__PURE__ */ jsx("ellipse", { cx: "50", cy: "24", rx: "14", ry: "6", fill: "#bae6fd", stroke: STROKE, strokeWidth: 2.2 }),
        /* @__PURE__ */ jsx("path", { d: "M44 38 L56 38 M44 48 L56 48 M44 58 L56 58", stroke: STROKE, strokeWidth: 2, strokeLinecap: "round" }),
        /* @__PURE__ */ jsx("circle", { cx: "72", cy: "36", r: "6", fill: "#fef08a", stroke: STROKE, strokeWidth: 2 }),
        /* @__PURE__ */ jsx("circle", { cx: "78", cy: "52", r: "5", fill: "#fef08a", stroke: STROKE, strokeWidth: 2 }),
        /* @__PURE__ */ jsx("path", { d: "M24 68 L32 58 L28 72 Z", fill: "#22c55e", stroke: STROKE, strokeWidth: 2, strokeLinejoin: "round" })
      ] });
    case "caring_for_the_environment":
      return /* @__PURE__ */ jsxs(SvgFrame, { size, children: [
        /* @__PURE__ */ jsx("path", { d: "M50 78 L30 58 L38 58 L38 42 L62 42 L62 58 L70 58 Z", fill: "#86efac", stroke: STROKE, strokeWidth: SW, strokeLinejoin: "round" }),
        /* @__PURE__ */ jsx("circle", { cx: "50", cy: "28", r: "16", fill: "#22c55e", stroke: STROKE, strokeWidth: SW }),
        /* @__PURE__ */ jsx("path", { d: "M50 18 L50 40 M42 24 L58 24 M44 32 L56 20 M56 32 L44 20", stroke: "#ecfccb", strokeWidth: 2.4, strokeLinecap: "round" }),
        /* @__PURE__ */ jsx("ellipse", { cx: "24", cy: "70", rx: "10", ry: "6", fill: "#38bdf8", stroke: STROKE, strokeWidth: 2 })
      ] });
    case "taking_care_of_myself":
      return /* @__PURE__ */ jsxs(SvgFrame, { size, children: [
        /* @__PURE__ */ jsx("rect", { x: "40", y: "30", width: "20", height: "36", rx: "4", fill: "#fce7f3", stroke: STROKE, strokeWidth: SW }),
        /* @__PURE__ */ jsx("path", { d: "M42 30 L50 18 L58 30", fill: "#f9a8d4", stroke: STROKE, strokeWidth: 2.2, strokeLinejoin: "round" }),
        /* @__PURE__ */ jsx("line", { x1: "46", y1: "44", x2: "54", y2: "52", stroke: STROKE, strokeWidth: 2.6, strokeLinecap: "round" }),
        /* @__PURE__ */ jsx("line", { x1: "54", y1: "44", x2: "46", y2: "52", stroke: STROKE, strokeWidth: 2.6, strokeLinecap: "round" }),
        /* @__PURE__ */ jsx("circle", { cx: "68", cy: "48", r: "10", fill: "#fef08a", stroke: STROKE, strokeWidth: 2.4 })
      ] });
    case "toilet_habits":
      return /* @__PURE__ */ jsxs(SvgFrame, { size, children: [
        /* @__PURE__ */ jsx("rect", { x: "30", y: "26", width: "40", height: "44", rx: "6", fill: "#f1f5f9", stroke: STROKE, strokeWidth: SW }),
        /* @__PURE__ */ jsx("ellipse", { cx: "50", cy: "32", rx: "16", ry: "8", fill: "#cbd5e1", stroke: STROKE, strokeWidth: 2.2 }),
        /* @__PURE__ */ jsx("rect", { x: "36", y: "48", width: "28", height: "18", rx: "3", fill: "#bfdbfe", stroke: STROKE, strokeWidth: 2 }),
        /* @__PURE__ */ jsx("circle", { cx: "72", cy: "58", r: "8", fill: "#4ade80", stroke: STROKE, strokeWidth: 2 }),
        /* @__PURE__ */ jsx("path", { d: "M69 58 L71 60 L75 54", fill: "none", stroke: STROKE, strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round" })
      ] });
    case "body_hygiene":
      return /* @__PURE__ */ jsxs(SvgFrame, { size, children: [
        /* @__PURE__ */ jsx("path", { d: "M38 78 L38 50 L46 42 L54 42 L62 50 L62 78 Z", fill: "#7dd3fc", stroke: STROKE, strokeWidth: SW, strokeLinejoin: "round" }),
        /* @__PURE__ */ jsx("circle", { cx: "50", cy: "30", r: "12", fill: "#fde047", stroke: STROKE, strokeWidth: SW }),
        /* @__PURE__ */ jsx("path", { d: "M28 48 Q22 58 28 68 Q34 62 32 52", fill: "#38bdf8", stroke: STROKE, strokeWidth: 2, strokeLinejoin: "round" }),
        /* @__PURE__ */ jsx("path", { d: "M72 48 Q78 58 72 68 Q66 62 68 52", fill: "#38bdf8", stroke: STROKE, strokeWidth: 2, strokeLinejoin: "round" })
      ] });
    case "reciting_numbers":
      return /* @__PURE__ */ jsxs(SvgFrame, { size, children: [
        /* @__PURE__ */ jsx("rect", { x: "16", y: "34", width: "68", height: "36", rx: "6", fill: "#fef9c3", stroke: STROKE, strokeWidth: SW }),
        /* @__PURE__ */ jsx("rect", { x: "28", y: "44", width: "10", height: "16", rx: "2", fill: "#e879f9", stroke: STROKE, strokeWidth: 2 }),
        /* @__PURE__ */ jsx("rect", { x: "45", y: "40", width: "10", height: "20", rx: "2", fill: "#c026d3", stroke: STROKE, strokeWidth: 2 }),
        /* @__PURE__ */ jsx("rect", { x: "62", y: "46", width: "10", height: "14", rx: "2", fill: "#a855f7", stroke: STROKE, strokeWidth: 2 }),
        /* @__PURE__ */ jsx("circle", { cx: "26", cy: "26", r: "7", fill: "#fb923c", stroke: STROKE, strokeWidth: 2 }),
        /* @__PURE__ */ jsx("circle", { cx: "74", cy: "26", r: "7", fill: "#22c55e", stroke: STROKE, strokeWidth: 2 })
      ] });
    case "counting_concepts":
      return /* @__PURE__ */ jsxs(SvgFrame, { size, children: [
        /* @__PURE__ */ jsx("rect", { x: "22", y: "52", width: "16", height: "16", rx: "3", fill: "#fb923c", stroke: STROKE, strokeWidth: 2.2 }),
        /* @__PURE__ */ jsx("rect", { x: "42", y: "52", width: "16", height: "16", rx: "3", fill: "#facc15", stroke: STROKE, strokeWidth: 2.2 }),
        /* @__PURE__ */ jsx("rect", { x: "62", y: "52", width: "16", height: "16", rx: "3", fill: "#4ade80", stroke: STROKE, strokeWidth: 2.2 }),
        /* @__PURE__ */ jsx("circle", { cx: "34", cy: "58", r: "3", fill: "#0f172a" }),
        /* @__PURE__ */ jsx("circle", { cx: "50", cy: "58", r: "3", fill: "#0f172a" }),
        /* @__PURE__ */ jsx("circle", { cx: "66", cy: "58", r: "3", fill: "#0f172a" }),
        /* @__PURE__ */ jsx("path", { d: "M18 30 L82 30", stroke: STROKE, strokeWidth: 2.4, strokeLinecap: "round" })
      ] });
    case "addition_concepts":
      return /* @__PURE__ */ jsxs(SvgFrame, { size, children: [
        /* @__PURE__ */ jsx("rect", { x: "18", y: "40", width: "64", height: "36", rx: "6", fill: "#ffedd5", stroke: STROKE, strokeWidth: SW }),
        /* @__PURE__ */ jsx("rect", { x: "26", y: "50", width: "14", height: "18", rx: "3", fill: "#fb923c", stroke: STROKE, strokeWidth: 2 }),
        /* @__PURE__ */ jsx("path", { d: "M48 52 V68 M41 60 H55", stroke: STROKE, strokeWidth: 3, strokeLinecap: "round" }),
        /* @__PURE__ */ jsx("rect", { x: "60", y: "50", width: "14", height: "18", rx: "3", fill: "#fb923c", stroke: STROKE, strokeWidth: 2 }),
        /* @__PURE__ */ jsx("rect", { x: "40", y: "22", width: "20", height: "10", rx: "2", fill: "#86efac", stroke: STROKE, strokeWidth: 2 })
      ] });
    case "drawing":
      return /* @__PURE__ */ jsxs(SvgFrame, { size, children: [
        /* @__PURE__ */ jsx("rect", { x: "24", y: "22", width: "52", height: "40", rx: "4", fill: "#fffbeb", stroke: STROKE, strokeWidth: SW }),
        /* @__PURE__ */ jsx("path", { d: "M32 50 L40 38 L48 46 L58 32 L68 48", fill: "none", stroke: "#ec4899", strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" }),
        /* @__PURE__ */ jsx("circle", { cx: "44", cy: "34", r: "5", fill: "#38bdf8", stroke: STROKE, strokeWidth: 2 }),
        /* @__PURE__ */ jsx("line", { x1: "72", y1: "28", x2: "84", y2: "40", stroke: STROKE, strokeWidth: 3, strokeLinecap: "round" }),
        /* @__PURE__ */ jsx("polygon", { points: "84,40 78,38 80,34", fill: "#f97316", stroke: STROKE, strokeWidth: 2, strokeLinejoin: "round" })
      ] });
    case "reading":
      return /* @__PURE__ */ jsxs(SvgFrame, { size, children: [
        /* @__PURE__ */ jsx(
          "path",
          {
            d: "M50 78 L28 68 L28 32 Q50 24 72 32 L72 68 Z",
            fill: "#fecdd3",
            stroke: STROKE,
            strokeWidth: SW,
            strokeLinejoin: "round"
          }
        ),
        /* @__PURE__ */ jsx("line", { x1: "50", y1: "30", x2: "50", y2: "76", stroke: STROKE, strokeWidth: 2.4, strokeLinecap: "round" }),
        /* @__PURE__ */ jsx("path", { d: "M36 44 H48 M36 52 H62 M36 60 H54", stroke: STROKE, strokeWidth: 2, strokeLinecap: "round" }),
        /* @__PURE__ */ jsx("circle", { cx: "62", cy: "26", r: "6", fill: "#fde047", stroke: STROKE, strokeWidth: 2 })
      ] });
    case "writing":
      return /* @__PURE__ */ jsxs(SvgFrame, { size, children: [
        /* @__PURE__ */ jsx("rect", { x: "20", y: "28", width: "56", height: "44", rx: "4", fill: "#f8fafc", stroke: STROKE, strokeWidth: SW }),
        /* @__PURE__ */ jsx("path", { d: "M32 48 Q40 40 48 48 T64 44", fill: "none", stroke: "#2563eb", strokeWidth: 2.8, strokeLinecap: "round" }),
        /* @__PURE__ */ jsx("path", { d: "M34 58 L44 54 L52 60 L68 50", fill: "none", stroke: "#2563eb", strokeWidth: 2.6, strokeLinecap: "round" }),
        /* @__PURE__ */ jsx("line", { x1: "70", y1: "34", x2: "86", y2: "50", stroke: STROKE, strokeWidth: 2.8, strokeLinecap: "round" }),
        /* @__PURE__ */ jsx("polygon", { points: "86,50 80,48 82,42", fill: "#1e293b", stroke: STROKE, strokeWidth: 1.8, strokeLinejoin: "round" })
      ] });
    default:
      return /* @__PURE__ */ jsxs(SvgFrame, { size, children: [
        /* @__PURE__ */ jsx(
          "path",
          {
            d: "M50 22 L58 42 L78 42 L62 54 L68 74 L50 62 L32 74 L38 54 L22 42 L42 42 Z",
            fill: "#fbbf24",
            stroke: STROKE,
            strokeWidth: SW,
            strokeLinejoin: "round"
          }
        ),
        /* @__PURE__ */ jsx("circle", { cx: "50", cy: "44", r: "6", fill: "#fff7ed", stroke: STROKE, strokeWidth: 2 })
      ] });
  }
}
var STROKE, SW, PRE_PRIMARY_SKILL_ART_PUBLIC_DIR, SKILL_ART_EXT_TRIES, CHECKLIST_IMG_STYLE;
var init_prePrimarySkillIllustrations = __esm({
  "src/templates/primary/prePrimarySkillIllustrations.tsx"() {
    "use strict";
    init_publicAssetUrl();
    STROKE = "#0f172a";
    SW = 2.8;
    PRE_PRIMARY_SKILL_ART_PUBLIC_DIR = "pre-primary-skill-art";
    SKILL_ART_EXT_TRIES = ["png", "webp", "jpg", "jpeg"];
    CHECKLIST_IMG_STYLE = {
      display: "block",
      width: "65%",
      height: "auto",
      maxHeight: "100%",
      objectFit: "contain",
      flexShrink: 0
    };
  }
});

// src/lib/prePrimaryHolisticDb.ts
function runtimeStrandsToHolisticStrands(strands) {
  return strands.map((st) => ({
    subject: st.subject,
    skills: [...st.skills].sort((a, b) => a.sort_order - b.sort_order).map((sk) => ({ key: sk.skill_key, label: sk.label }))
  }));
}
var init_prePrimaryHolisticDb = __esm({
  "src/lib/prePrimaryHolisticDb.ts"() {
    "use strict";
  }
});

// src/templates/primary/prePrimarySkillRemarkDefaults.ts
function defaultTeacherRemarkForSkill(skillKey, grade) {
  const block = DEFAULT_SKILL_TEACHER_REMARKS[skillKey];
  return block?.[grade] ?? "";
}
var DEFAULT_SKILL_TEACHER_REMARKS;
var init_prePrimarySkillRemarkDefaults = __esm({
  "src/templates/primary/prePrimarySkillRemarkDefaults.ts"() {
    "use strict";
    DEFAULT_SKILL_TEACHER_REMARKS = {
      relating_with_others: {
        VERY_GOOD: "Shows good teamwork. And positive interaction.",
        GOOD: "Works well with others most of the time.",
        NEEDS_IMPROVEMENT: "Still learning to work smoothly with peers; reminders help.",
        TRIES: "Beginning to join in; small steps with the group."
      },
      games: {
        VERY_GOOD: "Shows excellent participation and teamwork in games.",
        GOOD: "Joins games well; plays fairly most of the time.",
        NEEDS_IMPROVEMENT: "Joins with encouragement; skills still growing.",
        TRIES: "Starting to take part in games; needs time to settle."
      },
      helping: {
        VERY_GOOD: "Helps others willingly and shows care.",
        GOOD: "Often helps classmates; care is growing.",
        NEEDS_IMPROVEMENT: "Helps when prompted; habit still forming.",
        TRIES: "Small kind gestures appear; more practice ahead."
      },
      naming: {
        VERY_GOOD: "Identifies and names objects correctly.",
        GOOD: "Names most objects with a little cue.",
        NEEDS_IMPROVEMENT: "Names some items; confidence still building.",
        TRIES: "Beginning to name familiar things; praise helps."
      },
      cleanliness: {
        VERY_GOOD: "Keep self and surroundings clean all times.",
        GOOD: "Usually tidy; odd slip on busy days.",
        NEEDS_IMPROVEMENT: "Needs gentle reminders; slow steady progress.",
        TRIES: "Learning tidiness routines; small gains each week."
      },
      caring_for_the_environment: {
        VERY_GOOD: "Keeps environment clean and tidy.",
        GOOD: "Cares for shared space most of the time.",
        NEEDS_IMPROVEMENT: "Still learning daily care for shared areas.",
        TRIES: "Shows interest; guided practice will help."
      },
      taking_care_of_myself: {
        VERY_GOOD: "Performs simple, independent skills. Like cleaning the nose.",
        GOOD: "Does many self-care tasks with light help.",
        NEEDS_IMPROVEMENT: "Tries self-care; often still needs adult support.",
        TRIES: "Early self-care steps; celebrate small wins."
      },
      toilet_habits: {
        VERY_GOOD: "Take self to the toilet on own.",
        GOOD: "Mostly manages; occasional reminders.",
        NEEDS_IMPROVEMENT: "Routine improving; regular prompts still help.",
        TRIES: "Learning independence; patience and habit help."
      },
      body_hygiene: {
        VERY_GOOD: "Maintains personal cleanliness.",
        GOOD: "Usually clean; forgets a step now and then.",
        NEEDS_IMPROVEMENT: "Habits forming; gentle follow-ups help.",
        TRIES: "Noticing cleanliness with support; building routine."
      },
      reciting_numbers: {
        VERY_GOOD: "Can recite all those numbers.",
        GOOD: "Recites most with a starter cue.",
        NEEDS_IMPROVEMENT: "Reciting still shaky; short daily practice helps.",
        TRIES: "Beginning to recite familiar numbers; praise helps."
      },
      counting_concepts: {
        VERY_GOOD: "Can match numbers to pictures.",
        GOOD: "Matches well with a cue sometimes.",
        NEEDS_IMPROVEMENT: "Still learning number\u2013picture links alone.",
        TRIES: "First tries at matching; praise small rights."
      },
      addition_concepts: {
        VERY_GOOD: "Is able to add numbers. From one to 10.",
        GOOD: "Adds with counters or light help.",
        NEEDS_IMPROVEMENT: "Addition fuzzy without support; practice will help.",
        TRIES: "Trying simple adding; confidence growing slowly."
      },
      drawing: {
        VERY_GOOD: "Draws big and self explanatory pictures.",
        GOOD: "Clear pictures most of the time.",
        NEEDS_IMPROVEMENT: "Pictures still small or unclear; room to grow.",
        TRIES: "Enjoys trying; detail comes with time."
      },
      reading: {
        VERY_GOOD: "Can read correct words /sounds.",
        GOOD: "Reads many words/sounds; slips when tired.",
        NEEDS_IMPROVEMENT: "Reading building slowly; little reads daily help.",
        TRIES: "Beginning to sound out; praise tiny steps."
      },
      writing: {
        VERY_GOOD: "Can write words / sounds.",
        GOOD: "Writes many words/sounds; spacing uneven.",
        NEEDS_IMPROVEMENT: "Writing still forming; practice and fine-motor help.",
        TRIES: "Starting to copy letters; effort shows."
      }
    };
  }
});

// src/templates/primary/prePrimaryHolisticRemarkLookup.ts
function normalizePrePrimaryRemarkSubjectKey(subject) {
  return String(subject || "").trim().replace(/\s+/g, " ").toLowerCase();
}
function prePrimaryTeacherRemarkStorageKey(subject, skillKey) {
  return `${normalizePrePrimaryRemarkSubjectKey(subject)}::${String(skillKey || "").trim()}`;
}
function prePrimaryTeacherRemarkLookupKeyVariants(strandSubject, skillKey) {
  const sk = String(skillKey || "").trim();
  const t = String(strandSubject || "").trim();
  const base = t.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const set = /* @__PURE__ */ new Set();
  set.add(`${t}::${sk}`);
  set.add(prePrimaryTeacherRemarkStorageKey(t, sk));
  if (base && base !== t) {
    set.add(`${base}::${sk}`);
    set.add(prePrimaryTeacherRemarkStorageKey(base, sk));
  }
  return [...set];
}
function lookupPrePrimaryTeacherRemarkLine(map, strandSubject, skillKey, grade) {
  if (!map || !grade) return null;
  for (const k of prePrimaryTeacherRemarkLookupKeyVariants(strandSubject, skillKey)) {
    const line = map[k]?.[grade];
    const s = typeof line === "string" ? line.trim() : "";
    if (s) return s;
  }
  return null;
}
function findNurseryResultRowForStrand(results, strandSubject) {
  if (!results?.length) return void 0;
  const t = String(strandSubject || "").trim();
  const exact = results.find((r) => String(r.subject || "").trim() === t);
  if (exact) return exact;
  const want = normalizePrePrimaryRemarkSubjectKey(t);
  const baseWant = t.replace(/\s*\([^)]*\)\s*$/, "").trim();
  const baseNorm = normalizePrePrimaryRemarkSubjectKey(baseWant);
  return results.find((r) => {
    const s = String(r.subject || "").trim();
    if (!s) return false;
    if (normalizePrePrimaryRemarkSubjectKey(s) === want) return true;
    const sb = s.replace(/\s*\([^)]*\)\s*$/, "").trim();
    return normalizePrePrimaryRemarkSubjectKey(sb) === baseNorm;
  });
}
var init_prePrimaryHolisticRemarkLookup = __esm({
  "src/templates/primary/prePrimaryHolisticRemarkLookup.ts"() {
    "use strict";
    init_prePrimaryHolisticDb();
    init_prePrimaryHolisticRatings();
    init_prePrimarySkillRemarkDefaults();
  }
});

// src/templates/primary/prePrimaryHolisticReportGrid.tsx
import { useMemo } from "react";
import { jsx as jsx2, jsxs as jsxs2 } from "react/jsx-runtime";
function strandSubtitleFromSubject(subject) {
  const m = String(subject || "").match(/\(([^)]+)\)\s*$/);
  return m ? m[1].trim() : null;
}
function PrePrimaryHolisticColourGrid({
  holisticStrands,
  results,
  ratingLevels,
  fontFamily,
  observationItemsByKey = null,
  teacherSkillRemarksByStrandSkill = null,
  prePrimarySkillImageDataUrlsByKey = null,
  pdfCompact = false
}) {
  const cells = useMemo(() => {
    const out = [];
    for (const strand of holisticStrands) {
      strand.skills.forEach((skill, i) => {
        out.push({
          strandSubject: strand.subject,
          skill,
          isFirstInStrand: i === 0
        });
      });
    }
    return out;
  }, [holisticStrands]);
  const isPdfContext = prePrimarySkillImageDataUrlsByKey != null;
  const rowHeight = pdfCompact ? ROW_HEIGHT_COMPACT_PX : ROW_HEIGHT_PX;
  const titleFontPx = isPdfContext ? 11 : 12;
  const indicatorSize = pdfCompact ? 13 : 15;
  const gridStyle = {
    display: "grid",
    gridTemplateColumns: `repeat(${N_COLS}, minmax(0, 1fr))`,
    gridAutoRows: `${rowHeight}px`,
    gap: `${GRID_GAP_PX}px`,
    width: "100%",
    backgroundColor: "transparent",
    WebkitPrintColorAdjust: "exact",
    printColorAdjust: "exact"
  };
  return /* @__PURE__ */ jsx2("div", { style: gridStyle, children: cells.map(({ strandSubject, skill, isFirstInStrand }) => {
    const resultRow = findNurseryResultRowForStrand(results, strandSubject);
    const gradeEnum = parsePrePrimaryGradeFromPerformanceJson(
      resultRow?.nursery_skill_performance,
      skill.key,
      ratingLevels
    );
    const ratingLabel = gradeEnum ? prePrimaryGradeEnumToDisplayLabel(gradeEnum, ratingLevels) : null;
    const teacherConfigured = gradeEnum != null ? lookupPrePrimaryTeacherRemarkLine(
      teacherSkillRemarksByStrandSkill,
      strandSubject,
      skill.key,
      gradeEnum
    ) : null;
    const catalogueComment = gradeEnum && observationItemsByKey && Object.keys(observationItemsByKey).length > 0 ? (() => {
      const itemKey = getItemKeyForSkillKey(skill.key);
      const row = itemKey ? observationItemsByKey[itemKey] : void 0;
      if (!row) return null;
      const t = getResponseTextForGrade(row, gradeEnum);
      return t || null;
    })() : null;
    const codeFallback = gradeEnum != null ? defaultTeacherRemarkForSkill(skill.key, gradeEnum).trim() || null : null;
    const remark = teacherConfigured ?? catalogueComment ?? codeFallback;
    const fillColor = gradeEnum ? prePrimaryGradeEnumToColorHex(gradeEnum, ratingLevels) ?? "#e2e8f0" : null;
    const subtitle = strandSubtitleFromSubject(strandSubject);
    const titleLines = [];
    if (isFirstInStrand) titleLines.push(strandSubject);
    titleLines.push(skill.label);
    if (subtitle && !isFirstInStrand) titleLines.push(`(${subtitle})`);
    const titleText = titleLines.join(" \xB7 ");
    const labelBesideCircle = remark;
    const tooltip = [ratingLabel, remark].filter(Boolean).join(" \u2014 ") || void 0;
    return /* @__PURE__ */ jsxs2(
      "div",
      {
        title: tooltip,
        style: {
          minWidth: 0,
          height: "100%",
          minHeight: 0,
          maxHeight: `${rowHeight}px`,
          boxSizing: "border-box",
          padding: "5px 6px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          overflow: "hidden",
          backgroundColor: "#ffffff",
          borderRadius: "8px",
          border: "1px solid rgba(148,163,184,0.5)",
          WebkitPrintColorAdjust: "exact",
          printColorAdjust: "exact"
        },
        children: [
          /* @__PURE__ */ jsx2(
            "div",
            {
              style: {
                flexShrink: 0,
                width: "100%",
                fontFamily,
                fontSize: `${titleFontPx}px`,
                fontWeight: 800,
                lineHeight: 1.15,
                textAlign: "center",
                color: "#020617",
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                wordBreak: "break-word",
                textOverflow: "ellipsis",
                WebkitFontSmoothing: "antialiased",
                textShadow: LABEL_TEXT_SHADOW
              },
              children: titleText
            }
          ),
          /* @__PURE__ */ jsx2(
            "div",
            {
              style: {
                flex: "1 1 0",
                minHeight: 0,
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden"
              },
              children: /* @__PURE__ */ jsx2(
                PrePrimarySkillIllustration,
                {
                  skillKey: skill.key,
                  rasterOnly: true,
                  checklistLayout: true,
                  pdfEmbedSrc: prePrimarySkillImageDataUrlsByKey != null ? prePrimarySkillImageDataUrlsByKey[skill.key] ?? "" : void 0
                }
              )
            }
          ),
          /* @__PURE__ */ jsxs2(
            "div",
            {
              style: {
                flexShrink: 0,
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: pdfCompact ? "6px" : "8px",
                minHeight: 0,
                marginTop: "2px",
                paddingLeft: "1px",
                boxSizing: "border-box"
              },
              children: [
                /* @__PURE__ */ jsx2(
                  "div",
                  {
                    style: {
                      width: `${indicatorSize}px`,
                      height: `${indicatorSize}px`,
                      borderRadius: "50%",
                      border: "2px solid #0f172a",
                      backgroundColor: fillColor || "#f1f5f9",
                      flexShrink: 0,
                      boxShadow: fillColor ? `0 0 0 1px rgba(15,23,42,0.12), 0 0 4px #fff` : "0 0 4px #fff",
                      WebkitPrintColorAdjust: "exact",
                      printColorAdjust: "exact"
                    }
                  }
                ),
                /* @__PURE__ */ jsx2(
                  "span",
                  {
                    style: {
                      fontFamily,
                      fontSize: pdfCompact ? "7.2pt" : "7.8pt",
                      fontWeight: 700,
                      color: labelBesideCircle ? "#020617" : "#94a3b8",
                      lineHeight: 1.15,
                      overflow: "hidden",
                      display: "-webkit-box",
                      WebkitLineClamp: pdfCompact ? 3 : 4,
                      WebkitBoxOrient: "vertical",
                      wordBreak: "break-word",
                      minWidth: 0,
                      flex: "1 1 0",
                      textAlign: "left"
                    },
                    children: labelBesideCircle || "\u2014"
                  }
                )
              ]
            }
          )
        ]
      },
      `${strandSubject}-${skill.key}`
    );
  }) });
}
var N_COLS, ROW_HEIGHT_PX, ROW_HEIGHT_COMPACT_PX, GRID_GAP_PX, LABEL_TEXT_SHADOW;
var init_prePrimaryHolisticReportGrid = __esm({
  "src/templates/primary/prePrimaryHolisticReportGrid.tsx"() {
    "use strict";
    init_prePrimaryHolisticRatings();
    init_prePrimaryDetailedCommentMapping();
    init_prePrimarySkillIllustrations();
    init_prePrimaryHolisticRemarkLookup();
    init_prePrimarySkillRemarkDefaults();
    N_COLS = 3;
    ROW_HEIGHT_PX = 130;
    ROW_HEIGHT_COMPACT_PX = 120;
    GRID_GAP_PX = 10;
    LABEL_TEXT_SHADOW = "0 0 4px #fff, 0 0 10px #fff, 0 1px 2px rgba(255,255,255,0.95), 0 0 1px #fff";
  }
});

// src/lib/reportImageDataUrl.ts
var reportImageDataUrl_exports = {};
__export(reportImageDataUrl_exports, {
  PDF_REPORT_EMBED_MAX_EDGE_PX: () => PDF_REPORT_EMBED_MAX_EDGE_PX,
  PDF_SKILL_ART_EMBED_MAX_EDGE_PX: () => PDF_SKILL_ART_EMBED_MAX_EDGE_PX,
  dataUrlForPdfImgSrc: () => dataUrlForPdfImgSrc,
  fetchImageUrlToDataUrlForReport: () => fetchImageUrlToDataUrlForReport,
  imageUrlToDataUrlForReport: () => imageUrlToDataUrlForReport,
  normalizeReportImageSourceForFetch: () => normalizeReportImageSourceForFetch,
  reencodeDataUrlForReportPdf: () => reencodeDataUrlForReportPdf,
  reencodePrePrimarySkillDataUrlForPdf: () => reencodePrePrimarySkillDataUrlForPdf,
  resolveSchoolAndStudentPhotosForReportData: () => resolveSchoolAndStudentPhotosForReportData
});
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}
function dataUrlEncodedSizeKB(dataUrl) {
  const i = dataUrl.indexOf(",");
  const b64 = i >= 0 ? dataUrl.slice(i + 1) : dataUrl;
  return b64.length * 0.75 / 1024;
}
function sniffMimeFromRawBase64(b64) {
  const clean = b64.replace(/\s/g, "");
  try {
    const slice = clean.slice(0, 24);
    const bin = atob(slice);
    const a = bin.charCodeAt(0);
    const b = bin.charCodeAt(1);
    const c = bin.charCodeAt(2);
    const d = bin.charCodeAt(3);
    if (a === 255 && b === 216 && c === 255) return "image/jpeg";
    if (a === 137 && b === 80 && c === 78 && d === 71) return "image/png";
    if (a === 71 && b === 73 && c === 70 && d === 56) return "image/gif";
    if (a === 82 && b === 73 && c === 70 && d === 70) return "image/webp";
  } catch {
  }
  return "image/jpeg";
}
function normalizeReportImageSourceForFetch(raw) {
  const t = String(raw ?? "").trim();
  if (!t) return t;
  if (t.startsWith("data:") || /^https?:\/\//i.test(t) || t.startsWith("blob:") || t.startsWith("file:") || t.startsWith("//")) {
    return t;
  }
  const compact = t.replace(/\s/g, "");
  if (/^[A-Za-z0-9+/]+=*$/.test(compact) && compact.length >= 80) {
    return `data:${sniffMimeFromRawBase64(compact)};base64,${compact}`;
  }
  return t;
}
function dataUrlForPdfImgSrc(value) {
  const v = typeof value === "string" ? value.trim() : "";
  if (!v) return null;
  if (v.startsWith("data:")) return v;
  return `data:${sniffMimeFromRawBase64(v)};base64,${v}`;
}
function loadImageFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (/^https?:\/\//i.test(dataUrl)) {
      img.crossOrigin = "anonymous";
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to decode image for PDF embed"));
    img.src = dataUrl;
  });
}
function scaleToMaxEdge(width, height, maxEdge) {
  const longest = Math.max(width, height, 1);
  const scale = Math.min(1, maxEdge / longest);
  return {
    w: Math.max(1, Math.round(width * scale)),
    h: Math.max(1, Math.round(height * scale))
  };
}
async function dataUrlToJpegDataUrlWithOptions(dataUrl, options) {
  if (typeof document === "undefined") return dataUrl;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  const img = await loadImageFromDataUrl(dataUrl);
  const { w, h } = scaleToMaxEdge(img.naturalWidth || img.width, img.naturalHeight || img.height, options.maxEdge);
  canvas.width = w;
  canvas.height = h;
  if (options.compositeOnWhite) {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, w, h);
  }
  ctx.drawImage(img, 0, 0, w, h);
  let quality = options.qualityStart;
  let attempts = 0;
  const maxAttempts = 10;
  while (attempts < maxAttempts) {
    const out = canvas.toDataURL("image/jpeg", quality);
    const kb = dataUrlEncodedSizeKB(out);
    if (kb <= options.maxSizeKB || quality <= options.qualityMin + 1e-3) {
      return out;
    }
    quality = Math.max(options.qualityMin, quality * 0.88);
    attempts++;
  }
  return canvas.toDataURL("image/jpeg", options.qualityMin);
}
async function reencodeDataUrlForReportPdf(dataUrl) {
  if (typeof document === "undefined" || !dataUrl.startsWith("data:")) return dataUrl;
  try {
    return await dataUrlToJpegDataUrlWithOptions(dataUrl, {
      maxEdge: PDF_REPORT_EMBED_MAX_EDGE_PX,
      qualityStart: PDF_REPORT_EMBED_QUALITY_START,
      qualityMin: PDF_REPORT_EMBED_QUALITY_MIN,
      maxSizeKB: PDF_REPORT_EMBED_MAX_SIZE_KB
    });
  } catch {
    return dataUrl;
  }
}
async function reencodePrePrimarySkillDataUrlForPdf(dataUrl) {
  if (typeof document === "undefined" || !dataUrl.startsWith("data:")) return dataUrl;
  try {
    return await dataUrlToJpegDataUrlWithOptions(dataUrl, {
      maxEdge: PDF_SKILL_ART_EMBED_MAX_EDGE_PX,
      qualityStart: PDF_SKILL_ART_QUALITY_START,
      qualityMin: PDF_SKILL_ART_QUALITY_MIN,
      maxSizeKB: PDF_SKILL_ART_MAX_SIZE_KB,
      compositeOnWhite: true
    });
  } catch {
    return dataUrl;
  }
}
async function fetchImageUrlToDataUrlForReport(url) {
  const u = normalizeReportImageSourceForFetch(String(url || ""));
  if (!u) return null;
  if (u.startsWith("data:")) return u;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(u, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; PwezaCore/1.0)" }
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength === 0) return null;
    const contentType = res.headers.get("content-type") || "image/jpeg";
    return `data:${contentType};base64,${arrayBufferToBase64(buf)}`;
  } catch {
    return null;
  }
}
async function imageUrlToDataUrlForReport(url) {
  const u = normalizeReportImageSourceForFetch(String(url || ""));
  if (!u) return null;
  if (u.startsWith("data:")) {
    if (typeof document !== "undefined") {
      return reencodeDataUrlForReportPdf(u);
    }
    return u;
  }
  const dataUrl = await fetchImageUrlToDataUrlForReport(u);
  if (typeof document !== "undefined" && dataUrl) {
    return reencodeDataUrlForReportPdf(dataUrl);
  }
  return dataUrl;
}
async function resolveSchoolAndStudentPhotosForReportData(reportData) {
  const school = reportData.school || {};
  const student = Array.isArray(reportData.students) && reportData.students.length > 0 ? reportData.students[0] : void 0;
  const logoUrl = String(school.logo_url ?? school.logo ?? "").trim();
  const photoUrl = String(
    student?.profile_photo ?? student?.photo_url ?? student?.student_photo_url ?? ""
  ).trim();
  const [logo, photo] = await Promise.all([
    logoUrl ? imageUrlToDataUrlForReport(logoUrl) : Promise.resolve(null),
    photoUrl ? imageUrlToDataUrlForReport(photoUrl) : Promise.resolve(null)
  ]);
  return { logo, photo };
}
var FETCH_TIMEOUT_MS, PDF_REPORT_EMBED_MAX_EDGE_PX, PDF_REPORT_EMBED_QUALITY_START, PDF_REPORT_EMBED_QUALITY_MIN, PDF_REPORT_EMBED_MAX_SIZE_KB, PDF_SKILL_ART_EMBED_MAX_EDGE_PX, PDF_SKILL_ART_QUALITY_START, PDF_SKILL_ART_QUALITY_MIN, PDF_SKILL_ART_MAX_SIZE_KB;
var init_reportImageDataUrl = __esm({
  "src/lib/reportImageDataUrl.ts"() {
    "use strict";
    FETCH_TIMEOUT_MS = process.env.VERCEL === "1" ? 8e3 : 12e3;
    PDF_REPORT_EMBED_MAX_EDGE_PX = 480;
    PDF_REPORT_EMBED_QUALITY_START = 0.52;
    PDF_REPORT_EMBED_QUALITY_MIN = 0.42;
    PDF_REPORT_EMBED_MAX_SIZE_KB = 55;
    PDF_SKILL_ART_EMBED_MAX_EDGE_PX = 110;
    PDF_SKILL_ART_QUALITY_START = 0.34;
    PDF_SKILL_ART_QUALITY_MIN = 0.22;
    PDF_SKILL_ART_MAX_SIZE_KB = 12;
  }
});

// src/lib/prePrimarySkillArtForPdf.ts
function extToMime(ext) {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  return "image/png";
}
async function tryReadPublicDisk(key, ext) {
  if (typeof window !== "undefined") return null;
  try {
    const [{ readFile }, { join }] = await Promise.all([import("fs/promises"), import("path")]);
    const filePath = join(process.cwd(), "public", PRE_PRIMARY_SKILL_ART_PUBLIC_DIR, `${key}.${ext}`);
    const buf = await readFile(filePath);
    if (buf.length === 0) return null;
    return `data:${extToMime(ext)};base64,${buf.toString("base64")}`;
  } catch {
    return null;
  }
}
async function fetchPrePrimarySkillRasterDataUrl(skillKey) {
  const key = normalizePrePrimarySkillArtKey(skillKey);
  for (const ext of SKILL_ART_EXT_TRIES) {
    const fromDisk = await tryReadPublicDisk(key, ext);
    if (fromDisk) return fromDisk;
    const rel = `${PRE_PRIMARY_SKILL_ART_PUBLIC_DIR}/${key}.${ext}`;
    const pathPart = publicAssetUrl(rel).replace(/^\.\//, "");
    if (typeof window !== "undefined" && window.location?.href) {
      try {
        const abs = new URL(publicAssetUrl(rel), window.location.href).href;
        const d = await fetchImageUrlToDataUrlForReport(abs);
        if (d) return d;
      } catch {
      }
    }
    const origin = typeof process !== "undefined" && process.env?.PWEZA_PDF_ASSET_ORIGIN?.replace(/\/$/, "") || (typeof process !== "undefined" && process.env?.VERCEL_URL ? `https://${String(process.env.VERCEL_URL).replace(/^https?:\/\//, "")}` : "") || (typeof process !== "undefined" ? process.env?.VITE_APP_URL?.replace(/\/$/, "") : "") || "";
    if (origin) {
      const d = await fetchImageUrlToDataUrlForReport(`${origin}/${pathPart}`);
      if (d) return d;
    }
  }
  return null;
}
async function buildPrePrimarySkillImageDataUrlMap(skillKeys) {
  const unique = [...new Set(skillKeys.map((k) => k.trim()).filter(Boolean))];
  const out = {};
  await Promise.all(
    unique.map(async (rawKey) => {
      const data = await fetchPrePrimarySkillRasterDataUrl(rawKey);
      if (!data) return;
      out[rawKey] = typeof document !== "undefined" ? await reencodePrePrimarySkillDataUrlForPdf(data) : data;
    })
  );
  return out;
}
var init_prePrimarySkillArtForPdf = __esm({
  "src/lib/prePrimarySkillArtForPdf.ts"() {
    "use strict";
    init_publicAssetUrl();
    init_reportImageDataUrl();
    init_prePrimarySkillIllustrations();
  }
});

// src/services/prePrimaryHolisticPdfMarkup.tsx
import { renderToStaticMarkup } from "react-dom/server";
import { jsx as jsx3, jsxs as jsxs3 } from "react/jsx-runtime";
async function injectPrePrimarySkillImageDataUrlsForPdf(reportData) {
  const cfg = reportData.prePrimaryHolisticRuntimeConfig ?? null;
  const holisticStrands = cfg ? runtimeStrandsToHolisticStrands(cfg.strands) : FALLBACK_PRE_PRIMARY_HOLISTIC_STRANDS;
  const keys = [];
  for (const s of holisticStrands) {
    for (const sk of s.skills) keys.push(sk.key);
  }
  const map = await buildPrePrimarySkillImageDataUrlMap(keys);
  reportData.prePrimarySkillImageDataUrlsByKey = {
    ...reportData.prePrimarySkillImageDataUrlsByKey ?? {},
    ...map
  };
}
function prePrimaryHolisticChecklistToStaticHtml(reportData) {
  const student = reportData.students?.[0];
  const cfg = reportData.prePrimaryHolisticRuntimeConfig ?? null;
  const holisticStrands = cfg ? runtimeStrandsToHolisticStrands(cfg.strands) : FALLBACK_PRE_PRIMARY_HOLISTIC_STRANDS;
  const ratingLevels = cfg?.ratingLevels ?? null;
  const legendRatings = ratingLevels?.length ? [...ratingLevels].sort((a, b) => a.sort_order - b.sort_order).map((r) => ({ label: r.display_label, color: r.color_hex })) : FALLBACK_PRE_PRIMARY_HOLISTIC_RATINGS.map((r) => ({ label: r.label, color: r.color }));
  const compact = reportData.pdfCompactHolisticGrid !== false;
  const gridHtml = renderToStaticMarkup(
    /* @__PURE__ */ jsx3(
      PrePrimaryHolisticColourGrid,
      {
        holisticStrands,
        results: student?.results,
        ratingLevels,
        fontFamily: KIDS_FONT,
        observationItemsByKey: reportData.detailedObservationItemsByKey ?? null,
        teacherSkillRemarksByStrandSkill: reportData.teacherSkillRemarksByStrandSkill ?? null,
        prePrimarySkillImageDataUrlsByKey: reportData.prePrimarySkillImageDataUrlsByKey ?? {},
        pdfCompact: compact
      }
    )
  );
  const legendHtml = renderToStaticMarkup(
    /* @__PURE__ */ jsx3(
      "div",
      {
        style: {
          display: "flex",
          flexWrap: "wrap",
          gap: compact ? "6px 12px" : "18px",
          alignItems: "center",
          marginTop: compact ? "8px" : "16px",
          fontSize: compact ? "8pt" : "9.6pt",
          background: "rgba(255,255,255,0.8)",
          borderRadius: compact ? "10px" : "16px",
          padding: compact ? "6px 10px" : "10px 14px",
          border: "2px dashed rgba(30,64,175,0.24)",
          boxShadow: compact ? "0 4px 12px rgba(30,64,175,0.1)" : "0 8px 18px rgba(30,64,175,0.12)",
          fontFamily: KIDS_FONT,
          lineHeight: 1.2
        },
        children: legendRatings.map(({ label, color }) => /* @__PURE__ */ jsxs3(
          "div",
          {
            style: {
              display: "flex",
              alignItems: "center",
              gap: compact ? "6px" : "8px",
              fontWeight: 600
            },
            children: [
              /* @__PURE__ */ jsx3(
                "div",
                {
                  style: {
                    width: compact ? 14 : 18,
                    height: compact ? 14 : 18,
                    border: compact ? "1.5px solid #0f172a" : "2px solid #0f172a",
                    borderRadius: "50%",
                    background: color,
                    WebkitPrintColorAdjust: "exact",
                    printColorAdjust: "exact",
                    flexShrink: 0
                  }
                }
              ),
              /* @__PURE__ */ jsx3("span", { children: label })
            ]
          },
          label
        ))
      }
    )
  );
  return { gridHtml, legendHtml };
}
var KIDS_FONT;
var init_prePrimaryHolisticPdfMarkup = __esm({
  "src/services/prePrimaryHolisticPdfMarkup.tsx"() {
    "use strict";
    init_prePrimaryHolisticReportGrid();
    init_prePrimaryHolisticDb();
    init_prePrimaryHolisticRatings();
    init_prePrimarySkillArtForPdf();
    KIDS_FONT = "'Baloo 2', 'Comic Sans MS', 'Comic Neue', 'Poppins', 'sans-serif'";
  }
});

// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";
function envStr(key) {
  if (typeof process !== "undefined" && process.env && typeof process.env[key] === "string") {
    const v = process.env[key];
    if (v) return v;
  }
  return void 0;
}
function getServiceRoleKey() {
  if (typeof window !== "undefined") return void 0;
  return envStr("SUPABASE_SERVICE_ROLE_KEY") || import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
}
function getOrCreateTabId() {
  if (!isBrowser) return "server";
  const tabKey = "pwezacore_tab_id";
  try {
    let tabId = window.sessionStorage.getItem(tabKey);
    if (!tabId) {
      tabId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      window.sessionStorage.setItem(tabKey, tabId);
    }
    return tabId;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}
function createSupabaseClient() {
  if (_supabaseInstance) {
    return _supabaseInstance;
  }
  _supabaseInstance = isBrowser ? createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== "undefined" ? isDesktopBuild ? window.localStorage : window.sessionStorage : void 0,
      storageKey: isDesktopBuild ? DESKTOP_AUTH_STORAGE_KEY : `pwezacore-auth:${getOrCreateTabId()}`
    }
  }) : createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      // On the server, do not persist or auto-refresh
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
  return _supabaseInstance;
}
function createSupabaseAdmin() {
  if (!supabaseServiceKey) return null;
  if (_supabaseAdminInstance) {
    return _supabaseAdminInstance;
  }
  _supabaseAdminInstance = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  return _supabaseAdminInstance;
}
var supabaseUrl, supabaseAnonKey, supabaseServiceKey, isBrowser, isDesktopBuild, DESKTOP_AUTH_STORAGE_KEY, _supabaseInstance, supabase, _supabaseAdminInstance, supabaseAdmin;
var init_supabase = __esm({
  "src/lib/supabase.ts"() {
    "use strict";
    supabaseUrl = envStr("NEXT_PUBLIC_SUPABASE_URL") || envStr("VITE_SUPABASE_URL") || envStr("SUPABASE_URL") || import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
    supabaseAnonKey = envStr("NEXT_PUBLIC_SUPABASE_ANON_KEY") || envStr("VITE_SUPABASE_ANON_KEY") || envStr("SUPABASE_ANON_KEY") || import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    supabaseServiceKey = getServiceRoleKey();
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase environment variables");
    }
    isBrowser = typeof window !== "undefined";
    isDesktopBuild = import.meta.env.VITE_DESKTOP_MODE === "true";
    DESKTOP_AUTH_STORAGE_KEY = "pwezacore-auth";
    _supabaseInstance = null;
    supabase = createSupabaseClient();
    _supabaseAdminInstance = null;
    supabaseAdmin = createSupabaseAdmin();
  }
});

// src/lib/reportHeaderBrandingDefaults.ts
var REPORT_HEADER_DEFAULTS2;
var init_reportHeaderBrandingDefaults = __esm({
  "src/lib/reportHeaderBrandingDefaults.ts"() {
    "use strict";
    REPORT_HEADER_DEFAULTS2 = {
      schoolName: "#000000",
      subtitle: "#3b82f6",
      address: "#1e40af",
      contact: "#1e40af",
      motto: "#2563eb",
      divider: "#1e3a8a",
      chipText: "#1e3a8a",
      chipBackground: "#eff6ff",
      chipBorder: "#bfdbfe",
      metaLine: "#64748b",
      contactSeparator: "#64748b"
    };
  }
});

// src/lib/studentAttendanceRow.ts
var init_studentAttendanceRow = __esm({
  "src/lib/studentAttendanceRow.ts"() {
    "use strict";
  }
});

// src/lib/uaceGradeBands.ts
function formatUaceMinMaxRangeForReport(min_pct, max_pct) {
  if (!Number.isFinite(min_pct) || !Number.isFinite(max_pct)) return "";
  if (max_pct < 40 && min_pct <= 1e-3) return "Below 40%";
  const rlo = Math.round(min_pct * 1e3) / 1e3;
  const rhi = Math.round(max_pct * 1e3) / 1e3;
  const fmt = (n) => Number.isInteger(n) ? String(Math.round(n)) : n.toFixed(2).replace(/\.?0+$/, "");
  return `${fmt(rlo)}\u2013${fmt(rhi)}%`;
}
function uaceBandFinalPercentDisplayForReport(b) {
  const g = String(b.grade || "").trim().toUpperCase();
  const defRow = DEFAULT_UACE_PERCENT_BANDS.find((d) => d.grade === g);
  if (defRow && Math.abs(Number(b.min_pct) - defRow.min_pct) < 0.02 && Math.abs(Number(b.max_pct) - defRow.max_pct) < 0.02) {
    return DEFAULT_UACE_FINAL_PCT_LABELS[g] ?? formatUaceMinMaxRangeForReport(b.min_pct, b.max_pct);
  }
  return formatUaceMinMaxRangeForReport(b.min_pct, b.max_pct);
}
function uacePointsFromGrade(grade) {
  const g = String(grade || "").trim().toUpperCase();
  switch (g) {
    case "A":
      return 6;
    case "B":
      return 5;
    case "C":
      return 4;
    case "D":
      return 3;
    case "E":
      return 2;
    case "O":
      return 1;
    case "F":
      return 0;
    default:
      return 0;
  }
}
var DEFAULT_UACE_PERCENT_BANDS, DEFAULT_UACE_FINAL_PCT_LABELS;
var init_uaceGradeBands = __esm({
  "src/lib/uaceGradeBands.ts"() {
    "use strict";
    DEFAULT_UACE_PERCENT_BANDS = [
      { grade: "A", min_pct: 80, max_pct: 100 },
      { grade: "B", min_pct: 70, max_pct: 79.999 },
      { grade: "C", min_pct: 60, max_pct: 69.999 },
      { grade: "D", min_pct: 50, max_pct: 59.999 },
      { grade: "E", min_pct: 45, max_pct: 49.999 },
      { grade: "O", min_pct: 40, max_pct: 44.999 },
      { grade: "F", min_pct: 0, max_pct: 39.999 }
    ];
    DEFAULT_UACE_FINAL_PCT_LABELS = {
      A: "80\u2013100%",
      B: "70\u201379%",
      C: "60\u201369%",
      D: "50\u201359%",
      E: "45\u201349%",
      O: "40\u201344%",
      F: "Below 40%"
    };
  }
});

// src/lib/reportUtils.ts
function formatAverageWhole(value, emptyLabel = "N/A") {
  if (value === null || value === void 0 || value === "") return emptyLabel;
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return emptyLabel;
  return String(Math.round(n));
}
var init_reportUtils = __esm({
  "src/lib/reportUtils.ts"() {
    "use strict";
    init_studentAttendanceRow();
    init_uaceGradeBands();
  }
});

// src/components/reports/templates/helpers.ts
function isOLevelClass(className) {
  if (!className) return false;
  const trimmed = className.trim();
  return /^(senior\s*[1-4]|s\.?\s*[1-4])\b/i.test(trimmed);
}
function isALevelClass(className) {
  if (!className) return false;
  const trimmed = className.trim();
  return /^(senior\s*[56]|s\.?\s*[56])\b/i.test(trimmed);
}
function lightenColor2(hex) {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const lighten = (color) => Math.min(255, Math.round(color + (255 - color) * 0.5));
  const toHex = (n) => {
    const h = n.toString(16);
    return h.length === 1 ? "0" + h : h;
  };
  return `#${toHex(lighten(r))}${toHex(lighten(g))}${toHex(lighten(b))}`;
}
var init_helpers = __esm({
  "src/components/reports/templates/helpers.ts"() {
    "use strict";
  }
});

// src/services/secondaryLowerSectionHeaderHtml.ts
function streamDisplayForSecondaryStudentBlock(student) {
  return String(
    student?.stream ?? student?.current_stream ?? student?.stream_name ?? student?.class_stream ?? student?.section ?? "N/A"
  );
}
function formatSecondaryReportDateDisplayForStudentBlock(examSet, student) {
  const raw = examSet?.date ?? examSet?.exam_date ?? student?.report_date ?? student?.summary?.reportDate;
  if (raw == null || raw === "") return "N/A";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return String(raw);
  return parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
function studentBlockPhotoInnerHtml(student, studentPhotoBase64, escAttrFn) {
  const fromArg = studentPhotoBase64 != null && String(studentPhotoBase64).trim() !== "" ? String(studentPhotoBase64) : "";
  const fromProfile = student?.profile_photo != null && String(student.profile_photo).trim() !== "" ? String(student.profile_photo) : "";
  const raw = fromArg || fromProfile;
  if (raw) {
    return `<img src="${escAttrFn(raw)}" alt="Student Photo" />`;
  }
  return '<span style="font-size:8pt;color:#94a3b8">Photo</span>';
}
function buildSecondaryUpperSectionStyleStudentBlockHtml(student, examSet, studentPhotoBase64) {
  const name = escText(student?.name ?? "");
  const cls = escText(student?.current_class ?? "");
  const adm = escText(student?.admission_number ?? student?.student_id ?? "N/A");
  const term = examSet?.term ?? "N/A";
  const year = examSet?.year ?? (/* @__PURE__ */ new Date()).getFullYear();
  const stream = escText(streamDisplayForSecondaryStudentBlock(student));
  const dateStr = escText(formatSecondaryReportDateDisplayForStudentBlock(examSet, student));
  const photo = studentBlockPhotoInnerHtml(student, studentPhotoBase64, escAttr);
  return `
      <div class="secondary-upper-student-block" style="margin-top:0.08cm;">
        <div class="secondary-upper-student-grid">
          <div><strong>Name:</strong> ${name}</div>
          <div><strong>Class:</strong> ${cls}</div>
          <div><strong>Admission No:</strong> ${adm}</div>
          <div><strong>Term:</strong> ${escText(term)} / ${escText(year)}</div>
          <div><strong>Stream:</strong> ${stream}</div>
          <div><strong>Date:</strong> ${dateStr}</div>
        </div>
        <div class="secondary-upper-photo-cell">
          ${photo}
        </div>
      </div>`;
}
function escText(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function escAttr(s) {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
function examSetNameNorm(examSet) {
  return String(examSet?.name ?? "").trim().toLowerCase();
}
function secondaryOlevelStandardReportChipTitle(examSet) {
  const term = examSet?.term ?? 1;
  const year = examSet?.year ?? (/* @__PURE__ */ new Date()).getFullYear();
  const n = examSetNameNorm(examSet);
  if (/beginning|(^|\s)bot(\s|$)|b\.?\s*o\.?\s*t\b/.test(n)) {
    return `Learner's beginning of term report card for term ${term}, ${year}`;
  }
  if (/mid\s*term|midterm|mid-term/.test(n) || /\bmid\b/.test(n)) {
    return `Learner's mid term report card for term ${term}, ${year}`;
  }
  if (/\bend\s+of\s+term\b|\beot\b/.test(n) || /\bend\b/.test(n) && /\bterm\b/.test(n)) {
    return `Learner's end of term report card for term ${term}, ${year}`;
  }
  const name = String(examSet?.name ?? "").trim();
  if (name) {
    return `Learner's report card \u2014 ${name} (term ${term}, ${year})`;
  }
  return `Learner's report card for term ${term}, ${year}`;
}
function logoInnerHtml(school, schoolLogoBase64) {
  if (schoolLogoBase64 != null && String(schoolLogoBase64).trim() !== "") {
    const raw = String(schoolLogoBase64);
    const src = raw.startsWith("data:") ? raw : raw;
    return `<img src="${escAttr(src)}" alt="School Logo" style="max-width:100%;max-height:100%;object-fit:contain;" />`;
  }
  const url = school?.logo_url || school?.logo;
  if (url) {
    return `<img src="${escAttr(String(url))}" alt="School Logo" style="max-width:100%;max-height:100%;object-fit:contain;" />`;
  }
  return `<div style="width:100%;height:100%;border:1px solid #d1d5db;border-radius:4px;display:flex;align-items:center;justify-content:center;background:#f9fafb;"><span style="font-size:9pt;color:#9ca3af;text-align:center;padding:8px;">School<br/>Logo</span></div>`;
}
function buildSecondaryLowerSectionHeaderHtml(school, schoolLogoBase64, banner) {
  const schoolNameColor = school?.header_school_name_color || REPORT_HEADER_DEFAULTS2.schoolName;
  const subtitleColor = school?.header_subtitle_color || REPORT_HEADER_DEFAULTS2.subtitle;
  const addressColor = school?.header_address_color || REPORT_HEADER_DEFAULTS2.address;
  const contactColor = school?.header_contact_color || REPORT_HEADER_DEFAULTS2.contact;
  const mottoColor = school?.header_motto_color || REPORT_HEADER_DEFAULTS2.motto;
  const dividerColor = school?.header_divider_color || REPORT_HEADER_DEFAULTS2.divider;
  const dividerMid = lightenColor2(String(dividerColor).replace(/\s/g, "") || REPORT_HEADER_DEFAULTS2.divider);
  const dividerGradient = `linear-gradient(to right, ${escAttr(String(dividerColor))} 0%, ${escAttr(String(dividerMid))} 50%, ${escAttr(String(dividerColor))} 100%)`;
  const chipText = school?.header_chip_text_color || REPORT_HEADER_DEFAULTS2.chipText;
  const chipBg = school?.header_chip_background_color || REPORT_HEADER_DEFAULTS2.chipBackground;
  const chipBorder = school?.header_chip_border_color || REPORT_HEADER_DEFAULTS2.chipBorder;
  const contactSep = school?.header_contact_separator_color || REPORT_HEADER_DEFAULTS2.contactSeparator;
  const contactEmail = school?.contact_email ?? school?.email ?? "";
  const contactPhone = school?.contact_phone ?? school?.phone ?? "";
  const addressLine = [school?.address, school?.pobox].filter(Boolean).join(" ").trim();
  const chip = escText(String(banner.chipTitle ?? "").toUpperCase());
  let centerHtml = "";
  if (school?.name) {
    centerHtml += `<h1 style="font-size:16.5pt;font-weight:700;font-family:Arial,Helvetica,sans-serif;text-transform:uppercase;letter-spacing:0.04em;line-height:1.06;margin:0 0 0.22cm 0;color:${escAttr(String(schoolNameColor))};white-space:nowrap;">${escText(school.name)}</h1>`;
  }
  if (school?.subtitle) {
    centerHtml += `<div style="font-size:11pt;font-family:'Times New Roman',Georgia,serif;font-weight:400;color:${escAttr(String(subtitleColor))};margin-bottom:0.18cm;line-height:1.32;">${escText(school.subtitle)}</div>`;
  }
  if (addressLine) {
    centerHtml += `<div style="font-size:11pt;font-family:'Times New Roman',Georgia,serif;font-weight:600;color:${escAttr(String(addressColor))};margin-bottom:0.16cm;line-height:1.32;">${escText(addressLine)}</div>`;
  }
  if (contactEmail || contactPhone) {
    centerHtml += `<div style="font-size:11pt;font-family:'Times New Roman',Georgia,serif;font-weight:600;color:${escAttr(String(contactColor))};margin-bottom:0.16cm;line-height:1.32;">`;
    if (contactEmail) centerHtml += `<span>${escText(contactEmail)}</span>`;
    if (contactEmail && contactPhone) centerHtml += `<span style="margin:0 8px;color:${escAttr(String(contactSep))};">|</span>`;
    if (contactPhone) centerHtml += `<span>${escText(contactPhone)}</span>`;
    centerHtml += `</div>`;
  }
  if (school?.motto) {
    centerHtml += `<div style="font-size:9.8pt;font-family:'Times New Roman',Georgia,serif;font-style:italic;font-weight:600;color:${escAttr(String(mottoColor))};margin-bottom:0.22cm;line-height:1.32;letter-spacing:0.02em;">&quot;${escText(school.motto)}&quot;</div>`;
  }
  return `
    <div class="print-header-container" style="padding-top:0.28cm;padding-bottom:0.05cm;padding-left:0;padding-right:0.32cm;background:transparent;-webkit-print-color-adjust:exact;print-color-adjust:exact;page-break-inside:avoid;break-inside:avoid;">
      <div style="display:flex;align-items:center;min-height:2.1cm;position:relative;">
        <div style="width:132px;height:132px;display:flex;align-items:center;justify-content:center;position:absolute;left:0;margin-left:0;">
          ${logoInnerHtml(school, schoolLogoBase64)}
        </div>
        <div style="flex:1;text-align:center;font-family:'Times New Roman',serif;margin-left:132px;padding-left:0.3cm;">
          ${centerHtml}
        </div>
      </div>
      <div style="height:1px;background:${dividerGradient};margin-top:0.22cm;margin-bottom:0.12cm;-webkit-print-color-adjust:exact;print-color-adjust:exact;"></div>
      <div style="text-align:center;margin-bottom:0.15cm;">
        <div style="display:inline-block;padding:6px 20px;border-radius:18px;font-size:9pt;font-weight:600;text-transform:uppercase;letter-spacing:0.07em;color:${escAttr(String(chipText))};background:${escAttr(String(chipBg))};border:1px solid ${escAttr(String(chipBorder))};-webkit-print-color-adjust:exact;print-color-adjust:exact;">
          ${chip}
        </div>
      </div>
    </div>`;
}
function secondaryReportEscHtml(s) {
  return escText(s);
}
function formatNextTermBeginsLongDisplay(raw) {
  if (raw == null) return "";
  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? "" : raw.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }
  const s = String(raw).trim();
  if (!s) return "";
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString("en-GB", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });
  }
  return s;
}
function formatSecondaryFeesBalanceForReport(student) {
  const raw = student?.progressiveFeesBalance ?? student?.feesBalance ?? student?.fees?.balance;
  if (raw === void 0 || raw === null || raw === "") {
    return "\u2014";
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
      maximumFractionDigits: 0
    }).format(raw);
  }
  const n = Number(String(raw).replace(/,/g, ""));
  if (Number.isFinite(n)) {
    return new Intl.NumberFormat("en-UG", {
      style: "currency",
      currency: "UGX",
      maximumFractionDigits: 0
    }).format(n);
  }
  return String(raw).trim() || "\u2014";
}
function buildSecondaryOlevelCommentsNextTermPanelHtml(opts) {
  const ct = secondaryReportEscHtml(opts.classTeacherComment);
  const ht = secondaryReportEscHtml(opts.headTeacherComment);
  const ctn = secondaryReportEscHtml(opts.classTeacherName);
  const htn = secondaryReportEscHtml(opts.headTeacherName);
  const ntd = secondaryReportEscHtml(opts.nextTermBeginsDisplay);
  const fees = secondaryReportEscHtml(opts.feesBalanceDisplay);
  const blank = "&nbsp;";
  return `
      <div class="secondary-ol-comments-panel">
        <div class="secondary-ol-comment-block">
          <div class="secondary-ol-comment-label">Class Teacher's Comment:</div>
          <div class="secondary-ol-comment-line"><span class="secondary-ol-comment-text">${ct || blank}</span></div>
          <div class="secondary-ol-comment-meta">
            <div class="secondary-ol-meta-field"><strong>Name:</strong> <span class="secondary-ol-dotted">${ctn || blank}</span></div>
            <div class="secondary-ol-meta-field"><strong>Signature:</strong> <span class="secondary-ol-dotted">${blank}</span></div>
          </div>
        </div>
        <div class="secondary-ol-comment-block">
          <div class="secondary-ol-comment-label">Head Teacher's Comment:</div>
          <div class="secondary-ol-comment-line"><span class="secondary-ol-comment-text">${ht || blank}</span></div>
          <div class="secondary-ol-comment-meta">
            <div class="secondary-ol-meta-field"><strong>Name:</strong> <span class="secondary-ol-dotted">${htn || blank}</span></div>
            <div class="secondary-ol-meta-field"><strong>Signature:</strong> <span class="secondary-ol-dotted">${blank}</span></div>
          </div>
        </div>
        <div class="secondary-ol-comment-block">
          <div class="secondary-ol-next-term-row">
            <div class="secondary-ol-next-term-col">
              <div class="secondary-ol-comment-label">Next Term Begins:</div>
              <div class="secondary-ol-comment-line"><span class="secondary-ol-comment-text">${ntd || blank}</span></div>
            </div>
            <div class="secondary-ol-fees-balance"><strong>Fees Balance:</strong> <span>${fees || "\u2014"}</span></div>
          </div>
        </div>
      </div>`;
}
var SECONDARY_LOWER_HEADER_PRINT_CSS, SECONDARY_A4_PAGE_SHELL_CSS, SECONDARY_UPPER_SECTION_STYLE_STUDENT_BLOCK_CSS, SECONDARY_UPPER_SECTION_RESULTS_TABLE_CSS, SECONDARY_OLEVEL_COMMENTS_NEXT_TERM_PANEL_CSS;
var init_secondaryLowerSectionHeaderHtml = __esm({
  "src/services/secondaryLowerSectionHeaderHtml.ts"() {
    "use strict";
    init_helpers();
    init_reportHeaderBrandingDefaults();
    SECONDARY_LOWER_HEADER_PRINT_CSS = `
          @media print {
            .print-header-container {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              page-break-inside: avoid !important;
              break-inside: avoid !important;
              margin-top: 0.28cm !important;
              margin-bottom: 0.18cm !important;
            }
          }
`;
    SECONDARY_A4_PAGE_SHELL_CSS = `
        @page {
          size: A4;
          margin: 0;
        }
        * {
          box-sizing: border-box;
        }
        html {
          margin: 0;
          padding: 0;
          overflow-x: hidden;
        }
        body {
          margin: 0 auto;
          width: 100%;
          max-width: 210mm;
          min-height: 297mm;
          padding: 0.08cm 0.2cm 0.25cm 0.2cm;
          font-family: 'Times New Roman', 'Times', serif;
          font-size: 10.2pt;
          line-height: 1.3;
          background: #ffffff;
          color: #0f172a;
          overflow-x: hidden;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        table {
          width: 100%;
          max-width: 100%;
          table-layout: fixed;
        }
        th, td {
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .pweza-footer {
          margin-top: 8px;
          padding-top: 4px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 7.5pt;
          color: #64748b;
          font-family: 'Times New Roman', Times, serif;
        }
`;
    SECONDARY_UPPER_SECTION_STYLE_STUDENT_BLOCK_CSS = `
        .secondary-upper-student-block {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 6px 10px;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          margin-bottom: 3mm;
          background: #f8fafc;
          min-height: 28mm;
          font-size: 10.2pt;
          line-height: 1.3;
          color: #1e293b;
          font-family: 'Times New Roman', Times, serif;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .secondary-upper-student-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          column-gap: 10px;
          row-gap: 4px;
          font-size: 10.2pt;
          flex: 1;
        }
        .secondary-upper-student-grid strong {
          color: #1e3a8a;
        }
        .secondary-upper-photo-cell {
          width: 2.1cm;
          height: 2.9cm;
          border: 1px solid #bfdbfe;
          border-radius: 4px;
          background: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
        }
        .secondary-upper-photo-cell img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
`;
    SECONDARY_UPPER_SECTION_RESULTS_TABLE_CSS = `
        table.upper-results {
          width: 100%;
          border-collapse: collapse;
          font-size: 9.8pt;
          margin-bottom: 3mm;
          font-family: 'Times New Roman', Times, serif;
          table-layout: auto;
          position: relative;
          z-index: 0;
          background: #ffffff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        table.upper-results th,
        table.upper-results td {
          border: 1px solid #bfdbfe;
          padding: 4px 6px;
          vertical-align: middle;
        }
        table.upper-results thead tr {
          color: #1e3a8a;
          text-transform: uppercase;
          font-weight: 600;
        }
        table.upper-results thead th {
          background: #dbeafe;
        }
        table.upper-results tbody td {
          background: #ffffff;
        }
        table.upper-results th {
          text-align: left;
        }
        table.upper-results th.c,
        table.upper-results td.c {
          text-align: center;
        }
        table.upper-results tbody td.subj {
          font-weight: 600;
          color: #0f172a;
          text-align: left;
        }
        table.upper-results td.grade-col {
          font-weight: 700;
          color: #1e3a8a;
        }
        table.upper-results td.note-cell {
          font-size: 9.2pt;
          color: #475569;
          text-align: center;
        }
        table.upper-results tbody tr:nth-child(even) td {
          background: #f0f9ff;
        }
        table.upper-results tbody tr.sum td {
          background: #e0f2fe;
          color: #1e3a8a;
          font-weight: 600;
        }
`;
    SECONDARY_OLEVEL_COMMENTS_NEXT_TERM_PANEL_CSS = `
        .secondary-ol-comments-panel {
          font-family: 'Times New Roman', Times, serif;
          font-size: 10.2pt;
          line-height: 1.32;
          background: #ffffff;
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 8px 10px;
          margin-bottom: 3mm;
          position: relative;
          z-index: 0;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .secondary-ol-comment-block {
          padding-bottom: 8px;
          margin-bottom: 8px;
          border-bottom: 1px solid #bfdbfe;
        }
        .secondary-ol-comment-block:last-child {
          margin-bottom: 0;
          padding-bottom: 0;
          border-bottom: none;
        }
        .secondary-ol-comment-label {
          font-size: 10.6pt;
          font-weight: 600;
          text-transform: uppercase;
          margin-bottom: 3px;
          color: #1e3a8a;
          letter-spacing: 0.02em;
        }
        .secondary-ol-comment-line {
          border-bottom: 1px solid #cbd5e1;
          min-height: 1.35em;
          padding-bottom: 3px;
          margin-bottom: 8px;
        }
        .secondary-ol-comment-text {
          font-style: italic;
          color: #334155;
        }
        .secondary-ol-comment-meta {
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
          gap: 12px 20px;
          align-items: flex-end;
        }
        .secondary-ol-comment-meta .secondary-ol-meta-field strong {
          color: #1e3a8a;
          font-size: 9.6pt;
          font-weight: 600;
        }
        .secondary-ol-meta-field {
          flex: 1;
          min-width: 160px;
          display: flex;
          align-items: baseline;
          gap: 6px;
          font-size: 9.6pt;
          color: #64748b;
        }
        .secondary-ol-dotted {
          flex: 1;
          border-bottom: 1px dotted #94a3b8;
          min-height: 1.15em;
          min-width: 72px;
        }
        .secondary-ol-next-term-row {
          display: flex;
          flex-direction: row;
          align-items: flex-end;
          justify-content: space-between;
          gap: 12px 20px;
          flex-wrap: wrap;
          padding-top: 0;
          margin-top: 0;
        }
        .secondary-ol-next-term-col {
          flex: 1;
          min-width: 180px;
        }
        .secondary-ol-fees-balance {
          font-weight: 600;
          font-size: 10pt;
          color: #334155;
          white-space: nowrap;
          padding-bottom: 3px;
        }
        .secondary-ol-fees-balance strong {
          color: #1e3a8a;
          font-weight: 600;
        }
`;
  }
});

// src/lib/secondaryOlevelReportCopy.ts
var OLEVEL_MISSING_RESULTS_REMARK, OLEVEL_MISSING_RESULTS_DESCRIPTOR;
var init_secondaryOlevelReportCopy = __esm({
  "src/lib/secondaryOlevelReportCopy.ts"() {
    "use strict";
    OLEVEL_MISSING_RESULTS_REMARK = "\u2014";
    OLEVEL_MISSING_RESULTS_DESCRIPTOR = "\u2014";
  }
});

// src/lib/secondaryOlevelPdfDensity.ts
function olevelPdfDensityBandFromClassName(className) {
  const t = String(className ?? "").trim().toLowerCase();
  const m = t.match(/(?:^|[\s,])(?:senior|s)\s*[.]?\s*([1-4])(?:\b|$)/i) || t.match(/\bs\.?\s*([1-4])\b/i);
  const n = m ? parseInt(m[1], 10) : NaN;
  if (n === 1 || n === 2) return "s1s2";
  if (n === 3 || n === 4) return "s3s4";
  return "s3s4";
}
function olevelPdfDensityBandResolved(className, subjectRowCount) {
  const fromClass = olevelPdfDensityBandFromClassName(className);
  if (fromClass === "s1s2") return "s1s2";
  if (subjectRowCount >= 12) return "s1s2";
  return "s3s4";
}
var init_secondaryOlevelPdfDensity = __esm({
  "src/lib/secondaryOlevelPdfDensity.ts"() {
    "use strict";
  }
});

// src/services/secondaryOlevelPlanSampleLayouts.ts
function esc(s) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function bandDigitFromAvgActivity(avg) {
  if (!Number.isFinite(avg)) return "";
  if (avg < 1) return "1";
  if (avg < 2.5) return "2";
  return "3";
}
function bandWordFromAvgActivity(avg) {
  if (!Number.isFinite(avg)) return "";
  if (avg < 1) return "Basic";
  if (avg < 2.5) return "Moderate";
  return "Outstanding";
}
function parseNum(v) {
  const n = parseFloat(String(v ?? ""));
  return Number.isFinite(n) ? n : NaN;
}
function generateTemplate2KasoziHTML(reportData, schoolLogoBase64, studentPhotoBase64) {
  const { school, examSet, students } = reportData;
  const student = students?.[0];
  if (!student) return "<html><body>Missing student</body></html>";
  const results = Array.isArray(student.results) ? student.results : [];
  const dash = "\u2014";
  const rows = results.map((r) => {
    const isMissing = r.result_missing_placeholder === true || r.result_missing_placeholder === "true";
    if (isMissing) {
      const rawDesc2 = r.descriptor != null && String(r.descriptor).trim() !== "" ? String(r.descriptor).trim() : OLEVEL_MISSING_RESULTS_DESCRIPTOR;
      return {
        subject: String(r.subject ?? ""),
        formative: dash,
        eoy: dash,
        total: dash,
        grade: dash,
        lo: dash,
        descriptor: rawDesc2,
        initials: dash,
        finalNum: NaN,
        missing: true
      };
    }
    const rawDesc = r.descriptor != null && String(r.descriptor).trim() !== "" ? String(r.descriptor).trim() : "";
    const lo = r.activity_score != null && String(r.activity_score).trim() !== "" ? String(r.activity_score).trim() : "";
    const formative = r.formative_score != null ? String(r.formative_score) : "";
    const eoy = r.exam_score != null ? String(r.exam_score) : "";
    const total = r.final_score != null ? String(r.final_score) : "";
    const finalNum = parseNum(r.final_score);
    const grade = r.grade != null && String(r.grade).trim() !== "" ? String(r.grade).trim() : "";
    return {
      subject: String(r.subject ?? ""),
      formative,
      eoy,
      total,
      grade,
      lo,
      descriptor: rawDesc,
      initials: String(r.teacher_initials ?? ""),
      finalNum: Number.isFinite(finalNum) ? finalNum : NaN
    };
  });
  const nRows = rows.length;
  const sumFinalAll = rows.reduce((s, r) => s + (Number.isFinite(r.finalNum) ? r.finalNum : 0), 0);
  const avgFinal = nRows ? (sumFinalAll / nRows).toFixed(1) : "";
  const sumActivityAll = results.reduce((s, r) => {
    if (r.result_missing_placeholder === true || r.result_missing_placeholder === "true") return s;
    const a = parseNum(r.activity_score);
    return s + (Number.isFinite(a) ? a : 0);
  }, 0);
  const avgActivity = nRows ? sumActivityAll / nRows : NaN;
  const avgLo = Number.isFinite(avgActivity) ? bandDigitFromAvgActivity(avgActivity) : "";
  const bandWord = Number.isFinite(avgActivity) ? bandWordFromAvgActivity(avgActivity) : "";
  const ct = student.comments?.class_teacher_text ?? student.comments?.class_teacher_comment ?? "";
  const ht = student.comments?.head_teacher_text ?? student.comments?.headteacher_text ?? "";
  const classTeacherName = String(student.comments?.class_teacher_name ?? "");
  const headTeacherName = String(student.comments?.head_teacher_name ?? "");
  const nextBeginsRaw = student.nextTermBegins ?? student.next_term_begins_date ?? student.processed?.nextTermBeginsDate ?? "";
  const commentsNextTermHtml = buildSecondaryOlevelCommentsNextTermPanelHtml({
    classTeacherComment: String(ct),
    headTeacherComment: String(ht),
    classTeacherName,
    headTeacherName,
    nextTermBeginsDisplay: formatNextTermBeginsLongDisplay(nextBeginsRaw),
    feesBalanceDisplay: formatSecondaryFeesBalanceForReport(student)
  });
  const headerHtml = buildSecondaryLowerSectionHeaderHtml(school, schoolLogoBase64 ?? null, {
    chipTitle: secondaryOlevelStandardReportChipTitle(examSet),
    metaLine: `${examSet?.name || "Term Report"} - ${examSet?.year ?? (/* @__PURE__ */ new Date()).getFullYear()}`
  });
  const studentBlockHtml = buildSecondaryUpperSectionStyleStudentBlockHtml(
    student,
    examSet,
    studentPhotoBase64 ?? null
  );
  const tbody = rows.length > 0 ? rows.map(
    (r) => `
          <tr${r.missing ? ' class="olevel-row-missing-results"' : ""}>
            <td class="subj">${esc(r.subject)}</td>
            <td class="c">${esc(r.formative)}</td>
            <td class="c">${esc(r.eoy)}</td>
            <td class="c">${esc(r.total)}</td>
            <td class="c grade-col">${esc(r.grade)}</td>
            <td class="c">${esc(r.lo)}</td>
            <td class="note-cell">${esc(r.descriptor)}</td>
            <td class="c note-cell">${esc(r.initials)}</td>
          </tr>`
  ).join("") + `
          <tr class="sum">
            <td colspan="3"><strong>OVERALL AVERAGE</strong></td>
            <td class="c"><strong>${esc(avgFinal)}</strong></td>
            <td class="c"></td>
            <td class="c"><strong>${esc(avgLo)}</strong></td>
            <td class="c"><strong>${esc(bandWord)}</strong></td>
            <td class="c"></td>
          </tr>` : `<tr><td colspan="8" class="c muted">No results available</td></tr>`;
  const densityBasic = olevelPdfDensityBandResolved(student.current_class, nRows);
  const wmBasic = typeof schoolLogoBase64 === "string" && schoolLogoBase64.length > 0 ? dataUrlForPdfImgSrc(schoolLogoBase64) ?? schoolLogoBase64 : "";
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Student Report</title>
  <link href="https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap" rel="stylesheet">
  <style>
    ${SECONDARY_A4_PAGE_SHELL_CSS}
    @page {
      margin: 0;
      size: auto;
    }
    ${SECONDARY_UPPER_SECTION_STYLE_STUDENT_BLOCK_CSS}
    ${SECONDARY_UPPER_SECTION_RESULTS_TABLE_CSS}
    body[data-olevel-basic-density="s1s2"] {
      font-size: 9.4pt;
      padding: 0.06cm 0.16cm 0.18cm 0.16cm;
    }
    body[data-olevel-basic-density="s1s2"] table.upper-results {
      font-size: 8.2pt;
      margin-bottom: 6px;
    }
    body[data-olevel-basic-density="s1s2"] table.upper-results th,
    body[data-olevel-basic-density="s1s2"] table.upper-results td {
      padding: 2px 4px;
    }
    body[data-olevel-basic-density="s1s2"] .summary-strip {
      margin-bottom: 6px;
      padding: 6px 8px;
      font-size: 9.2pt;
    }
    body[data-olevel-basic-density="s1s2"] .grades {
      margin: 6px 0;
      font-size: 8.2pt;
    }
    body[data-olevel-basic-density="s1s2"] table.upper-results.terms-key {
      margin: 4px 0;
    }
    body[data-olevel-basic-density="s1s2"] table.upper-results.terms-key tbody td {
      padding: 2px 6px;
      font-size: 8.5pt;
    }
    body[data-olevel-basic-density="s1s2"] .secondary-ol-comments-panel {
      margin-bottom: 2mm;
      padding: 6px 8px;
    }
    body[data-olevel-basic-density="s1s2"] .pweza-footer {
      margin-top: 4px;
      padding-top: 2px;
    }
    body[data-olevel-basic-density="s1s2"] .secondary-upper-student-block {
      margin-bottom: 2mm;
      min-height: 24mm;
    }
    .c { text-align: center; }
    tr.olevel-row-missing-results td { background: #fffbeb; }
    .olevel-missing-subline { font-size: 9pt; font-style: italic; color: #92400e; margin-top: 2px; }
    .muted { color: #555; }
    .summary-strip {
      display: grid;
      grid-template-columns: 92px 1fr auto;
      gap: 8px;
      align-items: center;
      border: 1px solid #bfdbfe;
      border-radius: 8px;
      margin-bottom: 10px;
      padding: 8px 10px;
      font-size: 10pt;
      font-family: 'Times New Roman', Times, serif;
      background: #ffffff;
      position: relative;
      z-index: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .id-cell { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; }
    .id-label { font-size: 7.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; color: #1e3a8a; }
    .id-box {
      border: 1px solid #bfdbfe;
      border-radius: 6px;
      background: #f0f9ff;
      width: 100%;
      text-align: center;
      font-weight: 700;
      font-size: 14pt;
      color: #1e3a8a;
      padding: 6px;
      min-height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .italic-note { font-style: italic; font-size: 9.2pt; color: #475569; }
    .bold-word { font-weight: 700; font-size: 11pt; color: #1e3a8a; }
    table.upper-results.terms-key {
      margin: 10px 0;
    }
    table.upper-results.terms-key thead th {
      text-align: center;
    }
    table.upper-results.terms-key tbody td:first-child {
      width: 18%;
      min-width: 4.5em;
      text-align: center;
      font-weight: 700;
      color: #1e3a8a;
      vertical-align: middle;
    }
    table.upper-results.terms-key tbody td:last-child {
      text-align: left;
      font-size: 9.2pt;
      color: #475569;
    }
    .grades { margin: 10px 0; font-size: 9pt; }
    .grades strong { display: block; margin-bottom: 4px; }
    ${SECONDARY_OLEVEL_COMMENTS_NEXT_TERM_PANEL_CSS}
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.1;
      z-index: -1;
      pointer-events: none;
    }
    .watermark img {
      width: 900px;
      height: 900px;
      object-fit: contain;
      display: block;
    }
    ${SECONDARY_LOWER_HEADER_PRINT_CSS}
  </style>
</head>
<body data-olevel-basic-density="${densityBasic}">
  ${wmBasic ? `<div class="watermark"><img src="${wmBasic}" alt="" /></div>` : ""}
  ${headerHtml}

  ${studentBlockHtml}

  <table class="upper-results">
    <thead>
      <tr>
        <th>Subject</th>
        <th class="c">Formative Score [20%]</th>
        <th class="c">Exam Score [80%]</th>
        <th class="c">Total 100%</th>
        <th class="c">Grade</th>
        <th class="c">Level of Achievement/3</th>
        <th class="c">Descriptor</th>
        <th class="c">TR'S Initial</th>
      </tr>
    </thead>
    <tbody>${tbody}</tbody>
  </table>

  ${commentsNextTermHtml}

  <div class="grades">
    <strong>Grade Scale</strong>
    A: 80+ &nbsp;|&nbsp; B: 70+ &nbsp;|&nbsp; C: 60+ &nbsp;|&nbsp; D: 50+ &nbsp;|&nbsp; E: 0\u201349
  </div>

  <table class="upper-results terms-key">
    <thead><tr><th colspan="2">Key to Terms Used</th></tr></thead>
    <tbody>
      <tr><td>\u2014</td><td>Learner does not do the subject/was absent</td></tr>
      <tr><td>0.9\u20131.49</td><td><strong>(Basic):</strong> Few learning outcomes achieved but not sufficient for overall learning achievement</td></tr>
      <tr><td>1.5\u20132.49</td><td><strong>(Moderate):</strong> Many learning outcomes achieved, enough for overall learning achievement</td></tr>
      <tr><td>2.5\u20133.00</td><td><strong>(Outstanding):</strong> Most or all learning outcomes achieved</td></tr>
    </tbody>
  </table>

  <div class="pweza-footer">
    <span>Printed from: Pwezacore</span>
  </div>
</body>
</html>`;
}
function progressiveIdentifierFromDescriptor(descriptor) {
  const raw = String(descriptor ?? "").trim();
  if (!raw) return "";
  const d = raw.toLowerCase();
  const first = (d.split(/[\s–—:]+/)[0] ?? d).trim();
  if (first === "outstanding" || first === "accomplished") return "3";
  if (first === "moderate") return "2";
  if (first === "basic") return "1";
  return "";
}
function generateTemplate3KyoteraHTML(reportData, schoolLogoBase64, studentPhotoBase64) {
  const { school, examSet, students } = reportData;
  const student = students?.[0];
  if (!student) return "<html><body>Missing student</body></html>";
  const results = Array.isArray(student.results) ? student.results : [];
  const rows = results.map((r) => {
    const isMissing = r.result_missing_placeholder === true || r.result_missing_placeholder === "true";
    if (isMissing) {
      return {
        subject: String(r.subject ?? ""),
        c1: "\u2014",
        c2: "\u2014",
        avg20: "\u2014",
        exam80: "\u2014",
        total: "\u2014",
        id: "\u2014",
        init: "\u2014",
        finalNum: NaN,
        avg20Num: NaN,
        missing: true
      };
    }
    const c1raw = r.continuous_c1 ?? r.c1 ?? null;
    const c2raw = r.continuous_c2 ?? r.c2 ?? null;
    const formative = parseNum(r.formative_score);
    const c1 = c1raw != null ? parseNum(c1raw) : NaN;
    const c2 = c2raw != null ? parseNum(c2raw) : NaN;
    const c1s = Number.isFinite(c1) ? String(Math.round(c1 * 10) / 10) : "";
    const c2s = Number.isFinite(c2) ? String(Math.round(c2 * 10) / 10) : "";
    const avg20Num = formative;
    const avg20 = Number.isFinite(avg20Num) ? String(Math.round(avg20Num * 10) / 10) : "";
    const exam80 = r.exam_score != null ? String(r.exam_score) : "";
    const total = r.final_score != null ? String(r.final_score) : "";
    const finalNum = parseNum(r.final_score);
    return {
      subject: String(r.subject ?? ""),
      c1: c1s,
      c2: c2s,
      avg20,
      exam80,
      total,
      id: progressiveIdentifierFromDescriptor(String(r.descriptor ?? "")),
      init: String(r.teacher_initials ?? ""),
      finalNum: Number.isFinite(finalNum) ? finalNum : NaN,
      avg20Num: Number.isFinite(avg20Num) ? avg20Num : NaN
    };
  });
  const nProg = rows.length;
  const sumFinalProg = rows.reduce((s, r) => s + (Number.isFinite(r.finalNum) ? r.finalNum : 0), 0);
  const sum20Prog = rows.reduce((s, r) => s + (Number.isFinite(r.avg20Num) ? r.avg20Num : 0), 0);
  const sumIdProg = rows.reduce((s, r) => {
    const id = parseInt(String(r.id), 10);
    return s + (r.missing || !Number.isFinite(id) ? 0 : id);
  }, 0);
  const sumRow = {
    avgScore: nProg ? (sumFinalProg / nProg).toFixed(1) : "",
    pts20: nProg ? (sum20Prog / nProg).toFixed(1) : "",
    id: nProg ? (sumIdProg / nProg).toFixed(0) : ""
  };
  const ct = student.comments?.class_teacher_text ?? student.comments?.class_teacher_comment ?? "";
  const ht = student.comments?.head_teacher_text ?? student.comments?.headteacher_text ?? "";
  const classTeacherNameP = String(student.comments?.class_teacher_name ?? "");
  const headTeacherNameP = String(student.comments?.head_teacher_name ?? "");
  const nextBeginsRawP = student.nextTermBegins ?? student.next_term_begins_date ?? student.processed?.nextTermBeginsDate ?? "";
  const commentsNextTermHtmlP = buildSecondaryOlevelCommentsNextTermPanelHtml({
    classTeacherComment: String(ct),
    headTeacherComment: String(ht),
    classTeacherName: classTeacherNameP,
    headTeacherName: headTeacherNameP,
    nextTermBeginsDisplay: formatNextTermBeginsLongDisplay(nextBeginsRawP),
    feesBalanceDisplay: formatSecondaryFeesBalanceForReport(student)
  });
  const headerHtml = buildSecondaryLowerSectionHeaderHtml(school, schoolLogoBase64 ?? null, {
    chipTitle: secondaryOlevelStandardReportChipTitle(examSet),
    metaLine: `${examSet?.name || "Term Report"} - ${examSet?.year ?? (/* @__PURE__ */ new Date()).getFullYear()}`
  });
  const studentBlockHtmlP = buildSecondaryUpperSectionStyleStudentBlockHtml(
    student,
    examSet,
    studentPhotoBase64 ?? null
  );
  const tbody = rows.length > 0 ? rows.map(
    (r) => `
        <tr${r.missing ? ' class="olevel-row-missing-results"' : ""}>
          <td class="subj">${esc(r.subject)}</td>
          <td class="c">${esc(r.c1)}</td>
          <td class="c">${esc(r.c2)}</td>
          <td class="c">${esc(r.avg20)}</td>
          <td class="c">${esc(r.exam80)}</td>
          <td class="c">${esc(r.total)}</td>
          <td class="c grade-col">${esc(r.id)}</td>
          <td class="c note-cell">${esc(r.init)}</td>
        </tr>`
  ).join("") + `
        <tr class="sum">
          <td colspan="3"><strong>Average score</strong></td>
          <td class="c"><strong>${esc(sumRow.pts20)}</strong><div class="sum-hint">Pts (out of 20)</div></td>
          <td class="c"></td>
          <td class="c"><strong>${esc(sumRow.avgScore)}</strong><div class="sum-hint">Total 100%</div></td>
          <td class="c"><strong>${esc(sumRow.id)}</strong><div class="sum-hint">Identifier</div></td>
          <td class="c"></td>
        </tr>` : `<tr><td colspan="8" class="c muted">No results available</td></tr>`;
  const densityProg = olevelPdfDensityBandResolved(student.current_class, rows.length);
  const wmProg = typeof schoolLogoBase64 === "string" && schoolLogoBase64.length > 0 ? dataUrlForPdfImgSrc(schoolLogoBase64) ?? schoolLogoBase64 : "";
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Student Report</title>
  <link href="https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap" rel="stylesheet">
  <style>
    ${SECONDARY_A4_PAGE_SHELL_CSS}
    @page {
      margin: 0;
      size: auto;
    }
    ${SECONDARY_UPPER_SECTION_STYLE_STUDENT_BLOCK_CSS}
    ${SECONDARY_UPPER_SECTION_RESULTS_TABLE_CSS}
    body[data-olevel-progressive-density="s1s2"] {
      font-size: 9.4pt;
      padding: 0.06cm 0.16cm 0.18cm 0.16cm;
    }
    body[data-olevel-progressive-density="s1s2"] table.upper-results {
      font-size: 8.1pt;
      margin-bottom: 4px;
    }
    body[data-olevel-progressive-density="s1s2"] table.upper-results th,
    body[data-olevel-progressive-density="s1s2"] table.upper-results td {
      padding: 2px 3px;
    }
    body[data-olevel-progressive-density="s1s2"] .grades {
      margin: 3px 0 4px;
      font-size: 8pt;
    }
    body[data-olevel-progressive-density="s1s2"] table.upper-results.lo-key {
      margin: 2px 0 4px;
    }
    body[data-olevel-progressive-density="s1s2"] table.upper-results.lo-key tbody td {
      padding: 2px 5px;
      font-size: 8pt;
    }
    body[data-olevel-progressive-density="s1s2"] .secondary-ol-comments-panel {
      margin-bottom: 2mm;
      padding: 6px 8px;
    }
    body[data-olevel-progressive-density="s1s2"] .pweza-footer {
      margin-top: 4px;
      padding-top: 2px;
    }
    body[data-olevel-progressive-density="s1s2"] .secondary-upper-student-block {
      margin-bottom: 2mm;
      min-height: 24mm;
    }
    .c { text-align: center; }
    .sum-hint { font-size: 7pt; font-weight: 400; text-transform: none; margin-top: 2px; }
    .muted { color: #555; }
    tr.olevel-row-missing-results td { background: #fffbeb; }
    .olevel-missing-subline { font-size: 8pt; font-style: italic; color: #92400e; margin-top: 1px; }
    table.upper-results.lo-key {
      margin: 4px 0 6px;
    }
    table.upper-results.lo-key thead th {
      text-align: center;
      padding: 3px 6px;
      font-size: 9pt;
    }
    table.upper-results.lo-key tbody td {
      padding: 2px 6px;
      font-size: 8.5pt;
    }
    table.upper-results.lo-key tbody td:first-child {
      width: 4.5em;
      text-align: center;
      font-weight: 700;
      color: #1e3a8a;
      vertical-align: middle;
    }
    table.upper-results.lo-key tbody td:last-child {
      text-align: left;
      color: #475569;
    }
    .grades { margin: 4px 0 6px; font-size: 8.5pt; }
    .grades strong { display: block; margin-bottom: 2px; }
    ${SECONDARY_OLEVEL_COMMENTS_NEXT_TERM_PANEL_CSS}
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      opacity: 0.1;
      z-index: -1;
      pointer-events: none;
    }
    .watermark img {
      width: 900px;
      height: 900px;
      object-fit: contain;
      display: block;
    }
    ${SECONDARY_LOWER_HEADER_PRINT_CSS}
  </style>
</head>
<body data-olevel-progressive-density="${densityProg}">
  ${wmProg ? `<div class="watermark"><img src="${wmProg}" alt="" /></div>` : ""}
  ${headerHtml}

  ${studentBlockHtmlP}

  <table class="upper-results">
    <thead>
      <tr>
        <th>Subject</th>
        <th class="c">C1</th>
        <th class="c">C2</th>
        <th class="c">Avg Score /20</th>
        <th class="c">Final Exam /80</th>
        <th class="c">Total Score 100%</th>
        <th class="c">Identifier</th>
        <th class="c">Init</th>
      </tr>
    </thead>
    <tbody>${tbody}</tbody>
  </table>

  ${commentsNextTermHtmlP}

  <div class="grades">
    <strong>Grade Scale</strong>
    A: 80+ &nbsp;|&nbsp; B: 70+ &nbsp;|&nbsp; C: 60+ &nbsp;|&nbsp; D: 50+ &nbsp;|&nbsp; E: 0\u201349
  </div>

  <table class="upper-results lo-key">
    <thead><tr><th colspan="2">Learning Outcomes Key</th></tr></thead>
    <tbody>
      <tr><td>\u2014</td><td>No Learning outcomes achieved (Learner was absent)</td></tr>
      <tr><td>1</td><td>Some LOs achieved but not sufficient for overall achievement \u2014 <strong>Basic</strong></td></tr>
      <tr><td>2</td><td>Most LOs achieved, enough for overall learning achievement \u2014 <strong>Moderate</strong></td></tr>
      <tr><td>3</td><td>All LOs achieved, achievement with ease \u2014 <strong>Accomplished</strong></td></tr>
    </tbody>
  </table>

  <div class="pweza-footer">
    <span>Printed from: Pwezacore</span>
  </div>
</body>
</html>`;
}
var init_secondaryOlevelPlanSampleLayouts = __esm({
  "src/services/secondaryOlevelPlanSampleLayouts.ts"() {
    "use strict";
    init_secondaryLowerSectionHeaderHtml();
    init_secondaryOlevelReportCopy();
    init_reportImageDataUrl();
    init_secondaryOlevelPdfDensity();
  }
});

// src/services/secondaryOlevelHtmlFromD082d5b.ts
function template1StandardGradeFromPct(percentage) {
  if (percentage >= 80) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 40) return "D";
  return "E";
}
function template1AchievementLevelUpper(letter) {
  const u = String(letter || "").trim().toUpperCase();
  const map = {
    A: "EXCEPTIONAL",
    B: "OUTSTANDING",
    C: "SATISFACTORY",
    D: "BASIC",
    E: "ELEMENTARY"
  };
  return map[u] || "";
}
function generateTemplate1OLevelHTML(reportData, schoolLogoBase64, studentPhotoBase64) {
  const { school, examSet, students } = reportData;
  const student = students[0];
  const attendance = student.summary.attendanceDetails || {};
  const daysPresent = attendance.presentDays ?? "";
  const totalDays = attendance.totalSchoolDays ?? "";
  const daysAbsent = typeof totalDays === "number" && typeof daysPresent === "number" ? Math.max(totalDays - daysPresent, 0) : "";
  const finalScores = (student.results || []).map((r) => parseFloat(String(r.final_score ?? ""))).filter((n) => Number.isFinite(n));
  const summaryAvgRaw = student.summary?.average;
  const summaryMean = summaryAvgRaw != null && summaryAvgRaw !== "" ? Number(summaryAvgRaw) : Number.NaN;
  let averageFinalDisplay = "";
  let averageGradeLetter = "";
  let overallAchievementUpper = "";
  if (Number.isFinite(summaryMean)) {
    averageFinalDisplay = summaryMean.toFixed(2);
    averageGradeLetter = template1StandardGradeFromPct(summaryMean);
    overallAchievementUpper = template1AchievementLevelUpper(averageGradeLetter);
  } else if (finalScores.length > 0) {
    const mean = finalScores.reduce((a, b) => a + b, 0) / finalScores.length;
    averageFinalDisplay = mean.toFixed(2);
    averageGradeLetter = template1StandardGradeFromPct(mean);
    overallAchievementUpper = template1AchievementLevelUpper(averageGradeLetter);
  }
  const classTeacherComment = student.comments?.class_teacher_text ?? student.comments?.class_teacher_comment ?? "";
  const headTeacherComment = student.comments?.headteacher_text ?? student.comments?.head_teacher_text ?? "";
  const classTeacherName = student.comments?.class_teacher_name ?? "";
  const headTeacherName = student.comments?.head_teacher_name ?? "";
  const nextTermRaw = student.nextTermBegins ?? student.next_term_begins_date ?? student.processed?.nextTermBeginsDate ?? "";
  const commentsNextTermHtml = buildSecondaryOlevelCommentsNextTermPanelHtml({
    classTeacherComment: String(classTeacherComment),
    headTeacherComment: String(headTeacherComment),
    classTeacherName: String(classTeacherName),
    headTeacherName: String(headTeacherName),
    nextTermBeginsDisplay: formatNextTermBeginsLongDisplay(nextTermRaw),
    feesBalanceDisplay: formatSecondaryFeesBalanceForReport(student)
  });
  const headerHtml = buildSecondaryLowerSectionHeaderHtml(school, schoolLogoBase64 ?? null, {
    chipTitle: secondaryOlevelStandardReportChipTitle(examSet),
    metaLine: `${examSet?.name || "Term Report"} - ${examSet?.year ?? (/* @__PURE__ */ new Date()).getFullYear()}`
  });
  const studentBlockHtml = buildSecondaryUpperSectionStyleStudentBlockHtml(
    student,
    examSet,
    studentPhotoBase64 ?? null
  );
  const olevelStandardDensity = olevelPdfDensityBandResolved(
    student?.current_class,
    Array.isArray(student.results) ? student.results.length : 0
  );
  const wmSrc = typeof schoolLogoBase64 === "string" && schoolLogoBase64.length > 0 ? dataUrlForPdfImgSrc(schoolLogoBase64) ?? schoolLogoBase64 : "";
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Student Report</title>
      <link href="https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap" rel="stylesheet">
      <style>
        ${SECONDARY_A4_PAGE_SHELL_CSS}
        /*
         * Template1 Standard only: shell sets @page { size: A4 }. Dynamic PDF passes explicit width/height mm;
         * Chromium merges that with a fixed A4 @page poorly (extra sheet, content shifted). Last @page wins.
         */
        @page {
          margin: 0;
          size: auto;
        }
        ${SECONDARY_UPPER_SECTION_STYLE_STUDENT_BLOCK_CSS}
        ${SECONDARY_UPPER_SECTION_RESULTS_TABLE_CSS}

        /* Template Standard: same table design language as Basic (upper-results); 9-column layout unchanged */
        table.upper-results.o-level-standard {
          margin-bottom: 3mm;
        }
        table.upper-results.o-level-standard thead th:first-child {
          text-align: left;
        }
        table.upper-results.o-level-standard thead th {
          text-align: center;
        }
        table.upper-results.o-level-standard td.center,
        table.upper-results.o-level-standard th.center {
          text-align: center;
        }
        table.upper-results.o-level-standard tbody td:first-child strong {
          font-weight: 600;
          color: #0f172a;
        }
        table.upper-results.o-level-standard .standard-topic {
          font-size: 9.2pt;
          line-height: 1.2;
          margin-top: 2px;
          color: #475569;
          font-weight: 400;
        }
        table.upper-results.o-level-standard td.remark-cell {
          font-size: 9.2pt;
          color: #475569;
          text-align: left;
          vertical-align: middle;
        }
        table.upper-results.o-level-standard tbody tr.summary-avg-row td,
        table.upper-results.o-level-standard tbody tr.summary-perf-row td {
          background: #e0f2fe;
          color: #1e3a8a;
          font-weight: 600;
        }

        tr.olevel-row-missing-results td {
          background: #fffbeb;
        }
        .olevel-missing-hint {
          font-style: italic;
          color: #92400e;
        }

        .muted { color: #555; }

        ${SECONDARY_OLEVEL_COMMENTS_NEXT_TERM_PANEL_CSS}

        .grading-system {
          margin-bottom: 20px;
          font-family: 'Times New Roman', Times, serif;
        }

        .grading-system h3 {
          font-size: 11pt;
          font-weight: 700;
          margin-bottom: 5px;
          color: #1e3a8a;
        }

        .grading-system p {
          font-size: 10pt;
          font-weight: 700;
          margin-bottom: 10px;
          color: #0f172a;
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
          vertical-align: middle;
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

        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 9pt;
          font-family: 'Times New Roman', Times, serif;
          color: #475569;
          margin-top: 20px;
          page-break-inside: avoid;
        }

        /* Template1 Standard only: screen watermark \u2014 not fixed/900px (breaks print scroll + layout). */
        body.template1-olevel-standard {
          position: relative;
          min-height: 0 !important;
        }
        body.template1-olevel-standard > *:not(.watermark) {
          position: relative;
          z-index: 1;
        }
        .watermark {
          position: absolute;
          left: 0;
          right: 0;
          top: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.1;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
        }
        .watermark img {
          max-width: min(72vw, 420px);
          max-height: min(72vh, 420px);
          width: auto;
          height: auto;
          object-fit: contain;
          display: block;
        }
        .watermark-placeholder {
          max-width: 320px;
          max-height: 320px;
          width: 72vw;
          height: 72vw;
          border: 2px solid #ccc;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f0f0;
          font-size: min(18vw, 72pt);
          font-weight: bold;
          color: #ccc;
          text-align: center;
          line-height: 1.2;
          box-sizing: border-box;
        }
        @media print {
          html,
          body.template1-olevel-standard {
            min-height: 0 !important;
            height: auto !important;
          }
          .watermark {
            display: none !important;
          }
          .grading-system {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          /* Template1 Standard: cancel global A4 shell min-height in print; keep grading with content above when possible. */
          body.template1-olevel-standard .grading-system {
            page-break-inside: auto !important;
            break-inside: auto !important;
            page-break-before: avoid !important;
            break-before: avoid-page !important;
          }
          /* Dense S1/S2: trim comments, grading, footer for one A4 when possible. */
          body.template1-olevel-standard[data-olevel-standard-density="s1s2"] .secondary-ol-comments-panel {
            padding: 4px 6px !important;
            margin-bottom: 1mm !important;
            font-size: 9pt !important;
          }
          body.template1-olevel-standard[data-olevel-standard-density="s1s2"] .grading-system {
            margin-bottom: 4px !important;
          }
          body.template1-olevel-standard[data-olevel-standard-density="s1s2"] .grading-system h3 {
            margin-bottom: 2px !important;
            font-size: 10pt !important;
          }
          body.template1-olevel-standard[data-olevel-standard-density="s1s2"] .grading-system p {
            margin-bottom: 4px !important;
            font-size: 9pt !important;
          }
          body.template1-olevel-standard[data-olevel-standard-density="s1s2"] .grading-system .description-table {
            font-size: 7.8pt !important;
          }
          body.template1-olevel-standard[data-olevel-standard-density="s1s2"] .grading-system .description-table th,
          body.template1-olevel-standard[data-olevel-standard-density="s1s2"] .grading-system .description-table td {
            padding: 2px 3px !important;
          }
          body.template1-olevel-standard[data-olevel-standard-density="s1s2"] .footer {
            margin-top: 4px !important;
            padding-top: 0 !important;
          }
        }
        body[data-olevel-standard-density="s1s2"] {
          font-size: 9.5pt;
          padding: 0.06cm 0.18cm 0.18cm 0.18cm;
        }
        body[data-olevel-standard-density="s1s2"] table.upper-results.o-level-standard {
          font-size: 8.3pt;
        }
        body[data-olevel-standard-density="s1s2"] table.upper-results.o-level-standard thead th {
          padding: 2px 3px;
          font-size: 7.8pt;
        }
        body[data-olevel-standard-density="s1s2"] table.upper-results.o-level-standard tbody td {
          padding: 2px 4px;
        }
        body[data-olevel-standard-density="s1s2"] .grading-system {
          margin-bottom: 8px;
        }
        body[data-olevel-standard-density="s1s2"] .grading-system .description-table {
          font-size: 8.1pt;
        }
        body[data-olevel-standard-density="s1s2"] .grading-system .description-table th,
        body[data-olevel-standard-density="s1s2"] .grading-system .description-table td {
          padding: 2px 4px;
        }
        body[data-olevel-standard-density="s1s2"] .secondary-ol-comments-panel {
          padding: 6px 8px;
          margin-bottom: 2mm;
          font-size: 9.5pt;
        }
        body[data-olevel-standard-density="s1s2"] .footer {
          margin-top: 8px;
        }
        body[data-olevel-standard-density="s1s2"] .secondary-upper-student-block {
          margin-bottom: 2mm;
          min-height: 24mm;
          padding: 4px 8px;
        }
        ${SECONDARY_LOWER_HEADER_PRINT_CSS}
      </style>
    </head>
    <body class="template1-olevel-standard" data-olevel-standard-density="${olevelStandardDensity}">
      <!-- WATERMARK (hidden in @media print \u2014 avoids Chromium PDF offset/extra pages) -->
      <div class="watermark">
        ${wmSrc ? `<img src="${wmSrc}" alt="" />` : '<div class="watermark-placeholder">SCHOOL<br/>LOGO</div>'}
      </div>

      ${headerHtml}

      ${studentBlockHtml}

      <!-- SUBJECTS TABLE -->
      <table class="upper-results o-level-standard">
        <thead>
          <tr>
            <th>Subjects & Topics Covered</th>
            <th>Activity Score [3]</th>
            <th>Descriptor</th>
            <th>Formative Score [20%]</th>
            <th>Exam Score [80%]</th>
            <th>Final Score [100%]</th>
            <th>Grade</th>
            <th>Overall Remark</th>
            <th>Subject Teacher</th>
          </tr>
        </thead>
        <tbody>
          ${(student.results || []).length > 0 ? (student.results || []).map((result) => {
    const isMissing = result.result_missing_placeholder === true || result.result_missing_placeholder === "true";
    const dash = "\u2014";
    const activity = isMissing ? dash : result.activity_score ?? "";
    const descriptor = result.descriptor != null && result.descriptor !== "" ? String(result.descriptor) : "";
    const formative = isMissing ? dash : result.formative_score ?? "";
    const exam = isMissing ? dash : result.exam_score ?? "";
    const finalScore = isMissing ? dash : result.final_score ?? "";
    const gradeText = isMissing ? dash : result.grade != null && result.grade !== "" ? String(result.grade) : "";
    const overallRemark = isMissing ? OLEVEL_MISSING_RESULTS_REMARK : result.overall_remark != null && String(result.overall_remark).trim() !== "" ? String(result.overall_remark) : "";
    const teacherInitials = isMissing ? dash : result.teacher_initials ?? "";
    const topic = result.topic || "";
    const topicBlock = isMissing ? "" : `<div class="standard-topic">${topic}</div>`;
    const rowClass = isMissing ? ' class="olevel-row-missing-results"' : "";
    return `
                <tr${rowClass}>
                  <td>
                    <strong>${result.subject}</strong>
                    ${topicBlock}
                  </td>
                  <td class="center">${activity}</td>
                  <td class="center note-cell">${descriptor}</td>
                  <td class="center">${formative}</td>
                  <td class="center">${exam}</td>
                  <td class="center">${finalScore}</td>
                  <td class="center grade-col">${gradeText}</td>
                  <td class="remark-cell">${overallRemark}</td>
                  <td class="center note-cell">${teacherInitials}</td>
                </tr>
              `;
  }).join("") : `
              <tr>
                <td colspan="9" class="center muted">N/A - Student did not sit for this term</td>
              </tr>
            `}
          ${averageFinalDisplay !== "" ? `
          <tr class="summary-avg-row">
            <td colspan="5">AVERAGE SCORES</td>
            <td class="center">${averageFinalDisplay}</td>
            <td class="center">${averageGradeLetter}</td>
            <td></td>
            <td></td>
          </tr>
          <tr class="summary-perf-row">
            <td colspan="5">OVERALL PERFORMANCE</td>
            <td colspan="2" class="center">${overallAchievementUpper}</td>
            <td colspan="2"></td>
          </tr>
` : ""}
        </tbody>
      </table>

      ${commentsNextTermHtml}

      <!-- Grading system & descriptions -->
      <div class="grading-system">
        <h3>Grading System</h3>
        <p><strong>80 - A | 70 - B | 50 - C | 40 - D | 0 - E</strong></p>
        
        <h3>Description</h3>
        <table class="description-table">
          <thead>
            <tr>
              <th>Grade</th>
              <th>Achievement Level</th>
              <th>Descriptor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>A</td>
              <td>Exceptional</td>
              <td>Demonstrates an extraordinary level of competence by applying innovatively and creatively the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td>B</td>
              <td>Outstanding</td>
              <td>Demonstrates a high level of competence by applying the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td>C</td>
              <td>Satisfactory</td>
              <td>Demonstrates an adequate level of competence by applying the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td>D</td>
              <td>Basic</td>
              <td>Demonstrates a minimum level of competence in applying the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td>E</td>
              <td>Elementary</td>
              <td>Demonstrates below the basic level of competence in applying the acquired knowledge and skills in real life situations</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div>Printed from: Pwezacore</div>
      </div>
    </body>
    </html>
  `;
}
var init_secondaryOlevelHtmlFromD082d5b = __esm({
  "src/services/secondaryOlevelHtmlFromD082d5b.ts"() {
    "use strict";
    init_secondaryLowerSectionHeaderHtml();
    init_secondaryOlevelReportCopy();
    init_reportImageDataUrl();
    init_secondaryOlevelPdfDensity();
    init_secondaryOlevelPlanSampleLayouts();
  }
});

// src/lib/reportStudentAge.ts
function normalizeStudentDobIsoFromRow(st) {
  if (!st || typeof st !== "object") return null;
  const raw = st.date_of_birth ?? st.dob;
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  if (!s) return null;
  return s.length >= 10 ? s.slice(0, 10) : s;
}
function studentAgeYearsAtReference(dobIso, refIso) {
  const dobStr = dobIso != null && String(dobIso).trim() ? String(dobIso).trim().slice(0, 10) : "";
  const refStr = refIso != null && String(refIso).trim() ? String(refIso).trim().slice(0, 10) : "";
  if (!dobStr) return null;
  const dob = /* @__PURE__ */ new Date(`${dobStr}T12:00:00`);
  const ref = refStr ? /* @__PURE__ */ new Date(`${refStr}T12:00:00`) : /* @__PURE__ */ new Date();
  if (Number.isNaN(dob.getTime()) || Number.isNaN(ref.getTime())) return null;
  let age = ref.getFullYear() - dob.getFullYear();
  const md = ref.getMonth() - dob.getMonth();
  if (md < 0 || md === 0 && ref.getDate() < dob.getDate()) age--;
  if (age < 0 || age > 120) return null;
  return age;
}
function studentAgeLabelForReport(student, examSet) {
  if (!student) return "\u2014";
  const cached = student.age_years;
  if (cached != null && cached !== "") {
    const n = Number(cached);
    if (!Number.isNaN(n) && n >= 0 && n <= 120) return String(n);
  }
  const dob = normalizeStudentDobIsoFromRow(student);
  const refRaw = student.summary && typeof student.summary === "object" && student.summary !== null ? student.summary.reportDate : void 0;
  const ref = refRaw != null && String(refRaw).trim() ? String(refRaw).slice(0, 10) : examSet?.date != null && String(examSet.date).trim() ? String(examSet.date).slice(0, 10) : void 0;
  const a = studentAgeYearsAtReference(dob, ref ?? null);
  return a != null ? String(a) : "\u2014";
}
var init_reportStudentAge = __esm({
  "src/lib/reportStudentAge.ts"() {
    "use strict";
  }
});

// src/services/legacySecondaryPdfTemplatesFrom3918d26.ts
function lightenColor3(hex) {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const lighten = (color) => Math.min(255, Math.round(color + (255 - color) * 0.5));
  const toHex = (n) => {
    const hex2 = n.toString(16);
    return hex2.length === 1 ? "0" + hex2 : hex2;
  };
  return `#${toHex(lighten(r))}${toHex(lighten(g))}${toHex(lighten(b))}`;
}
function generateTemplate1OLevelHTML2(reportData, schoolLogoBase64, studentPhotoBase64) {
  return generateTemplate1OLevelHTML(reportData, schoolLogoBase64, studentPhotoBase64);
}
function generateTemplate2KasoziHTML2(reportData, schoolLogoBase64, studentPhotoBase64) {
  const cls = String(reportData?.students?.[0]?.current_class || "");
  if (isOLevelClass(cls) || isALevelClass(cls)) {
    return generateTemplate2KasoziHTML(reportData, schoolLogoBase64, studentPhotoBase64);
  }
  return generateTemplate2KasoziPrimaryNurseryHTML(reportData, schoolLogoBase64, studentPhotoBase64);
}
function generateTemplate2KasoziPrimaryNurseryHTML(reportData, schoolLogoBase64, studentPhotoBase64) {
  const { school, examSet, students } = reportData;
  const student = students[0];
  const plainNurseryA4 = isPrePrimaryNurseryClass(student?.current_class);
  const reportBannerTitle = plainNurseryA4 ? `${String(student?.current_class || "Pre-primary").toUpperCase()} - TERMLY REPORT` : "MIDDLE &amp; TOP CLASS - TERMLY REPORT";
  const streamDisplay = student?.stream || student?.current_stream || student?.stream_name || student?.class_stream || student?.section || "N/A";
  const reportDateDisplay = (() => {
    const raw = examSet?.date || student?.report_date || student?.summary?.reportDate;
    if (!raw) return "N/A";
    const parsed = new Date(raw);
    return isNaN(parsed.getTime()) ? String(raw) : parsed.toLocaleDateString();
  })();
  const feesBalance = student?.feesBalance ?? 0;
  const contactEmail = school?.contact_email || school?.email || "";
  const contactPhone = school?.contact_phone || school?.phone || "";
  const addressLine = [school?.address, school?.pobox].filter(Boolean).join(" ");
  const headerMetaItems = [
    student?.current_class ? `Class: ${student.current_class}` : null,
    streamDisplay && streamDisplay !== "N/A" ? `Stream: ${streamDisplay}` : null,
    examSet?.term ? `Term: ${examSet.term}` : null,
    examSet?.year ? `Year: ${examSet.year}` : null
  ].filter(Boolean);
  const headerMetaLine = headerMetaItems.join(" \u2022 ");
  const headerDividerColor = school?.header_divider_color || "#1e3a8a";
  const headerDividerLight = school?.header_divider_color ? lightenColor3(school.header_divider_color) : "#60a5fa";
  const studentPhotoSrc = (() => {
    if (typeof studentPhotoBase64 === "string" && studentPhotoBase64.length > 0) {
      return studentPhotoBase64.startsWith("data:") ? studentPhotoBase64 : `data:image/png;base64,${studentPhotoBase64}`;
    }
    if (typeof student?.profile_photo === "string" && student.profile_photo.length > 0) {
      return student.profile_photo;
    }
    return null;
  })();
  const nurserySkillRowsHtml = NURSERY_SKILL_GRID.map((row) => {
    const cells = row.map((skill) => {
      if (!skill.label) {
        return '<td style="border: 2px solid rgba(148,163,184,0.35); padding: 8px 6px; min-height: 42px; background: #ffffff;">&nbsp;</td>';
      }
      const performanceWord = resolveNurseryPerformanceValue(student, skill);
      const fallbackColor = "#e2e8f0";
      const hasPerformance = Boolean(performanceWord);
      const accentColor = performanceWord ? NURSERY_PERFORMANCE_COLOR_MAP2[performanceWord] : fallbackColor;
      const textColor = getReadableTextColor(accentColor);
      const cellBackground = hasPerformance ? accentColor : "#f8fafc";
      const labelColor = hasPerformance ? textColor === "#ffffff" ? "rgba(255,255,255,0.88)" : "rgba(15,23,42,0.92)" : "#1f2937";
      const cellBorderColor = hasPerformance ? accentColor : "rgba(148,163,184,0.45)";
      const cellShadow = hasPerformance ? `0 16px 32px ${applyAlphaToHex(accentColor, 0.35)}` : "inset 0 0 0 1px rgba(148,163,184,0.25)";
      const cellBaseStyles = [
        `border: 2px solid ${cellBorderColor}`,
        "padding: 8px 6px",
        "min-height: 48px",
        "text-align: center",
        "vertical-align: middle",
        "font-weight: 600",
        `background: ${cellBackground}`,
        `box-shadow: ${cellShadow}`
      ];
      return `
        <td style="${cellBaseStyles.join("; ")}">
          <div class="nursery-skill-cell">
            <span class="nursery-skill-label" style="color: ${labelColor};">${skill.label}</span>
          </div>
        </td>
      `;
    }).join("");
    return `<tr>${cells}</tr>`;
  }).join("");
  const nurseryLegendHtml = NURSERY_PERFORMANCE_OPTIONS2.map(({ label, color }) => `
    <div class="nursery-legend-item">
      <span class="nursery-legend-swatch" style="background: ${color}"></span>
      <span>${label}</span>
    </div>
  `).join("");
  const prePrimaryMode = reportData.prePrimaryReportMode ?? "colour";
  const useHolisticColourPdf = plainNurseryA4 && prePrimaryMode !== "detailed";
  const classTeacherCommentPdf = escapeHtmlText(
    student?.comments?.class_teacher_text ?? student?.comments?.class_teacher_comment ?? ".............................................................."
  );
  const headTeacherCommentPdf = escapeHtmlText(
    student?.comments?.head_teacher_text ?? student?.comments?.headteacher_text ?? ".............................................................."
  );
  const nextTermPdf = student?.results?.[0]?.next_term_begins_date ? escapeHtmlText(new Date(String(student.results[0].next_term_begins_date)).toLocaleDateString()) : "____________________";
  const nurseryCommentsCardsHtml = plainNurseryA4 ? `
      <div style="margin-top:2px;margin-bottom:2px;font-size:7.8pt;background:linear-gradient(135deg,rgba(219,228,255,0.95) 0%,rgba(255,230,242,0.95) 100%);border:1px solid rgba(30,64,175,0.1);border-radius:8px;padding:4px 7px;font-family:'Baloo 2','Comic Sans MS','Comic Neue','Poppins',sans-serif;">
        <h3 style="font-size:8pt;font-weight:600;margin:0 0 1px;color:#1e3a8a;">Class Teacher's Comments:</h3>
        <p style="margin:0 0 1px;line-height:1.18;">${classTeacherCommentPdf}</p>
        <p style="margin:0 0 3px;font-size:7.5pt;">Signature: ______________________</p>
        <h3 style="font-size:8pt;font-weight:600;margin:4px 0 1px;color:#1e3a8a;">Headteacher's Comments:</h3>
        <p style="margin:0 0 1px;line-height:1.18;">${headTeacherCommentPdf}</p>
        <p style="margin:0;font-size:7.5pt;">Signature: ______________________</p>
      </div>
      <div style="margin-bottom:2px;font-size:7.8pt;background:linear-gradient(135deg,rgba(207,255,226,0.92) 0%,rgba(223,255,204,0.92) 100%);border:1px solid rgba(30,64,175,0.1);border-radius:8px;padding:3px 7px;font-family:'Baloo 2','Comic Sans MS','Comic Neue','Poppins',sans-serif;">
        <p style="margin:0;line-height:1.2;"><strong>Next term begins on:</strong> ${nextTermPdf}</p>
      </div>` : `
      <div style="margin-top:18px;margin-bottom:18px;font-size:10pt;background:linear-gradient(135deg,rgba(219,228,255,0.95) 0%,rgba(255,230,242,0.95) 100%);border:3px solid rgba(30,64,175,0.12);border-radius:18px;padding:12px 16px;font-family:'Baloo 2','Comic Sans MS','Comic Neue','Poppins',sans-serif;">
        <h3 style="font-size:11pt;font-weight:600;margin:0 0 6px;color:#1e3a8a;">Class Teacher's Comments:</h3>
        <p style="margin:0 0 8px;">${classTeacherCommentPdf}</p>
        <p style="margin:0 0 12px;">Signature: ______________________</p>
        <h3 style="font-size:11pt;font-weight:600;margin:16px 0 6px;color:#1e3a8a;">Headteacher's Comments:</h3>
        <p style="margin:0 0 8px;">${headTeacherCommentPdf}</p>
        <p style="margin:0;">Signature: ______________________</p>
      </div>
      <div style="margin-bottom:18px;font-size:10pt;background:linear-gradient(135deg,rgba(207,255,226,0.92) 0%,rgba(223,255,204,0.92) 100%);border:3px solid rgba(30,64,175,0.12);border-radius:18px;padding:12px 16px;font-family:'Baloo 2','Comic Sans MS','Comic Neue','Poppins',sans-serif;">
        <p style="margin:0;"><strong>Next term begins on:</strong> ${nextTermPdf}</p>
      </div>`;
  let middleContent;
  if (useHolisticColourPdf) {
    const holisticReportData = plainNurseryA4 ? { ...reportData, pdfCompactHolisticGrid: true } : reportData;
    const { gridHtml, legendHtml: holisticLegendHtml } = prePrimaryHolisticChecklistToStaticHtml(holisticReportData);
    const holisticFrameStyle = plainNurseryA4 ? "padding:4px;background:linear-gradient(135deg,rgba(255,244,209,0.94) 0%,rgba(204,238,255,0.94) 100%);border:2px solid rgba(30,64,175,0.16);border-radius:12px;box-shadow:0 8px 16px rgba(30,64,175,0.12);" : "padding:8px;background:linear-gradient(135deg,rgba(255,244,209,0.94) 0%,rgba(204,238,255,0.94) 100%);border:4px solid rgba(30,64,175,0.18);border-radius:20px;box-shadow:0 20px 36px rgba(30,64,175,0.18);";
    middleContent = `
      <div class="nursery-skill-section">
        <div class="nursery-skill-frame" style="${holisticFrameStyle}">
          ${gridHtml}
        </div>
        ${holisticLegendHtml}
      </div>
      ${nurseryCommentsCardsHtml}`;
  } else {
    middleContent = `
      <!-- SUBJECTS TABLE -->
      <table>
        <thead>
          <tr>
            <th>SUBJECT</th>
            <th>FULL MARKS</th>
            <th>MID TERM</th>
            <th>END OF TERM</th>
            <th>TEACHER'S REMARKS</th>
            <th>INITIALS</th>
          </tr>
        </thead>
        <tbody>
          ${(student.results ?? []).length > 0 ? (() => {
      const all = Array.isArray(student.results) ? student.results : [];
      const isMid = (name) => {
        const n = String(name || "").trim().toLowerCase();
        return n === "mid term" || n === "midterm" || n.includes("mid") || n.includes("mid-term");
      };
      const isEnd = (name) => {
        const n = String(name || "").trim().toLowerCase();
        return n === "end of term" || n === "end of term" || n.includes("end") || n.includes("final") || n.includes("eot");
      };
      const subjectGroups = {};
      all.forEach((r) => {
        const subject = r.subject ?? "";
        const examSetName = r.exam_set_name || "";
        if (!subjectGroups[subject]) {
          subjectGroups[subject] = {
            subject,
            total_marks: r.total_marks ?? 100,
            remarks: "",
            initials: ""
          };
        }
        if (isMid(examSetName)) {
          subjectGroups[subject].mid = r.grade === "MISSED" ? "MISSED" : r.marks_obtained ?? "";
          if (!subjectGroups[subject].remarks) {
            subjectGroups[subject].remarks = r.teacher_remark || "";
            subjectGroups[subject].initials = r.teacher_initials ?? "";
          }
        } else if (isEnd(examSetName)) {
          subjectGroups[subject].end = r.grade === "MISSED" ? "MISSED" : r.marks_obtained ?? "";
          subjectGroups[subject].remarks = r.teacher_remark || "";
          subjectGroups[subject].initials = r.teacher_initials ?? "";
        }
      });
      Object.values(subjectGroups).forEach((group) => {
        if (!group.remarks) {
          const anyResult = all.find((r) => r.subject === group.subject);
          if (anyResult) {
            group.remarks = anyResult.teacher_remark || "";
            group.initials = anyResult.teacher_initials ?? "";
          }
        }
      });
      const subjects = Object.values(subjectGroups);
      return subjects.map((group, idx) => `
                <tr>
                  <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">${group.subject}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${group.total_marks}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${group.mid ?? ""}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${group.end ?? ""}</td>
                  <td style="border: 1px solid #000; padding: 6px;">${group.remarks}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${group.initials}</td>
                </tr>
              `).join("");
    })() : `
              <tr>
                <td colspan="6" style="border: 1px solid #000; padding: 8px; text-align: center; color: #555;">No results available</td>
              </tr>
            `}
        </tbody>
      </table>

      <!-- DEVELOPMENTAL SKILLS TABLE -->
      <div class="nursery-skill-section">
        <div class="nursery-skill-frame">
          <table class="nursery-skill-table">
            <tbody>
              ${nurserySkillRowsHtml}
            </tbody>
          </table>
        </div>
        <div class="nursery-legend">
          ${nurseryLegendHtml}
        </div>
      </div>
      ${nurseryCommentsCardsHtml}`;
  }
  const ageLabelPdf = escapeHtmlText(studentAgeLabelForReport(student, examSet));
  return `
    <!DOCTYPE html>
    <html${plainNurseryA4 ? ' class="nursery-plain-html"' : ""}>
    <head>
      <meta charset="utf-8">
      <title>Student Report</title>
      <link href="https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4;
          margin: 0;
        }

        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@400;600;700&display=swap');

        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Baloo 2', 'Comic Sans MS', 'Comic Neue', 'Poppins', sans-serif;
          width: 210mm;
          min-height: 297mm;
          margin: 0 auto;
          padding: 0;
          box-sizing: border-box;
          color: #1f2937;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* Nursery track only: plain white page + A4 margins; keep Baloo + coloured panels below. */
        html.nursery-plain-html,
        html.nursery-plain-html body {
          min-height: auto !important;
          height: auto !important;
        }
        body.nursery-plain-a4 {
          padding: 7mm 8mm 6mm 8mm;
          background: #ffffff;
        }
        body.nursery-plain-a4 .nursery-wrapper {
          min-height: 0;
          padding: 0.32cm;
        }
        body.nursery-plain-a4 .print-header-container {
          padding-top: 0.08cm;
          padding-bottom: 0.04cm;
        }
        body.nursery-plain-a4 .nursery-skill-section {
          margin-bottom: 4px;
        }
        body.nursery-plain-a4 .nursery-heading {
          font-size: 9.5pt;
          margin-bottom: 3px;
        }
        body.nursery-plain-a4 .nursery-paper {
          padding: 0.32cm 0.4cm 0.38cm;
        }
        @media print {
          html.nursery-plain-html,
          html.nursery-plain-html body.nursery-plain-a4 {
            min-height: auto !important;
            height: auto !important;
          }
        }

        body:not(.nursery-plain-a4) {
          background: linear-gradient(135deg, #fff7ad 0%, #ffd1dc 40%, #c8f5ff 75%, #e7deff 100%);
        }
        
        .print-header-container {
          padding-top: 0.3cm;
          padding-bottom: 0.12cm;
          padding-right: 0.32cm;
          background: transparent;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        .header-flex {
          display: flex;
          align-items: center;
          min-height: 2cm;
          position: relative;
        }
        
        .header-logo {
          width: 120px;
          height: 120px;
          position: absolute;
          left: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          flex-shrink: 0;
          border: none;
        }
        
        .header-logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        
        .header-logo-placeholder {
          width: 100%;
          height: 100%;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f9fafb;
          color: #9ca3af;
          font-size: 9pt;
          text-align: center;
          padding: 8px;
        }
        
        .header-center {
          flex: 1;
          margin-left: 120px;
          padding-left: 0.28cm;
          text-align: center;
          font-family: 'Times New Roman', 'Times', serif;
        }
        
        .school-name {
          font-weight: 700;
          font-size: 16pt;
          font-family: Arial, Helvetica, sans-serif;
          text-transform: uppercase;
          letter-spacing: 0.045em;
          line-height: 1.06;
          margin: 0 0 0.2cm 0;
          color: ${school?.header_school_name_color || "#1e3a8a"};
          white-space: nowrap;
        }
        
        .school-subtitle {
          font-size: 11pt;
          font-family: 'Times New Roman', Georgia, serif;
          font-weight: 400;
          color: ${school?.header_subtitle_color || "#3b82f6"};
          margin-bottom: 0.16cm;
          line-height: 1.3;
        }
        
        .school-address {
          font-size: 11pt;
          font-family: 'Times New Roman', Georgia, serif;
          font-weight: 600;
          color: ${school?.header_address_color || "#1e40af"};
          margin-bottom: 0.16cm;
          line-height: 1.28;
        }
        
        .school-contact {
          font-size: 10.8pt;
          font-family: 'Times New Roman', Georgia, serif;
          font-weight: 600;
          color: ${school?.header_contact_color || "#1e40af"};
          margin-bottom: 0.16cm;
          line-height: 1.28;
        }
        
        .school-motto {
          font-size: 9.8pt;
          font-family: 'Times New Roman', Georgia, serif;
          font-style: italic;
          font-weight: 600;
          color: ${school?.header_motto_color || "#2563eb"};
          margin-bottom: 0.2cm;
          line-height: 1.32;
        }
        
        .header-divider {
          height: 1px;
          background: linear-gradient(to right, ${headerDividerColor} 0%, ${headerDividerLight} 50%, ${headerDividerColor} 100%);
          margin-top: 0.2cm;
          margin-bottom: 0.18cm;
        }
        
        .report-banner {
          text-align: center;
          margin-bottom: 0.18cm;
        }
        
        .report-chip {
          display: inline-block;
          padding: 6px 22px;
          border-radius: 18px;
          font-size: 9.2pt;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.07em;
          color: #1e3a8a;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
        }
        
        .report-meta {
          font-size: 7.5pt;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-top: 4px;
          color: #1f2937;
        }
        
        .nursery-wrapper {
          position: relative;
          width: 210mm;
          min-height: 297mm;
          padding: 0.6cm;
          box-sizing: border-box;
          border-radius: 26px;
          overflow: hidden;
        }

        .nursery-overlay {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 12% 18%, rgba(255,255,255,0.6) 0%, transparent 60%), radial-gradient(circle at 80% 32%, rgba(255,255,255,0.45) 0%, transparent 55%);
          opacity: 0.65;
          pointer-events: none;
        }

        .nursery-paper {
          position: relative;
          z-index: 2;
          background: rgba(255,255,255,0.97);
          border-radius: 26px;
          padding: 0.45cm 0.55cm 0.55cm;
          box-shadow: 0 30px 48px rgba(30,64,175,0.22);
        }

        .student-info {
          margin-bottom: 18px;
          font-size: 10.4pt;
        }
        
        .nursery-student-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          background: linear-gradient(120deg, rgba(255,246,207,0.95) 0%, rgba(255,214,235,0.95) 100%);
          border: 4px solid rgba(30,64,175,0.18);
          border-radius: 20px;
          padding: 10px 16px;
          box-shadow: 0 16px 28px rgba(30,64,175,0.18);
        }

        .nursery-student-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px 22px;
        }

        .nursery-student-grid strong {
          color: #1e3a8a;
          font-weight: 700;
          letter-spacing: 0.02em;
        }

        .nursery-student-photo {
          width: 21mm;
          height: 29mm;
          border: 2px solid #60a5fa;
          background: #ffffff;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow: 0 6px 14px rgba(30,64,175,0.16);
        }

        .nursery-student-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 18px;
          font-size: 10pt;
        }
        
        th, td {
          border: 1px solid #000;
          padding: 6px;
          text-align: left;
        }
        
        th {
          background: #f8fafc;
          color: #0f172a;
          font-weight: 600;
          text-align: center;
        }
        
        .nursery-skill-section {
          margin-bottom: 12px;
        }
        
        .nursery-heading {
          font-size: 11pt;
          font-weight: 700;
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: #0f172a;
        }

        .nursery-skill-table td {
          border: 1px solid #000;
          padding: 0;
        }

        .nursery-skill-frame {
          background: linear-gradient(135deg, rgba(255,244,209,0.94) 0%, rgba(204,238,255,0.94) 100%);
          border: 4px solid rgba(30,64,175,0.18);
          border-radius: 20px;
          padding: 8px;
          box-shadow: 0 20px 36px rgba(30,64,175,0.18);
        }

        .nursery-skill-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 10pt;
          background: #ffffff;
          border-radius: 12px;
          overflow: hidden;
        }

        .nursery-paper .school-name,
        .nursery-paper .school-contact,
        .nursery-paper .report-title,
        .nursery-paper .report-chip,
        .nursery-paper .school-meta {
          font-family: 'Baloo 2', 'Comic Sans MS', 'Comic Neue', 'Poppins', sans-serif !important;
        }

        .nursery-paper .school-name {
          letter-spacing: 0.05em;
        }

        .nursery-skill-cell {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          min-height: 40px;
          padding: 10px 6px;
        }

        .nursery-skill-label {
          font-size: 8.5pt;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .nursery-skill-value {
          font-size: 10pt;
          font-weight: 700;
        }

        .nursery-legend {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 18px;
          margin-top: 16px;
          font-size: 9.5pt;
          background: rgba(255,255,255,0.9);
          border-radius: 16px;
          padding: 10px 14px;
          border: 2px dashed rgba(30,64,175,0.24);
          box-shadow: 0 8px 18px rgba(30,64,175,0.12);
        }
        
        .nursery-legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 600;
          letter-spacing: 0.02em;
        }
        
        .nursery-legend-swatch {
          width: 18px;
          height: 18px;
          border: 1px solid #0f172a;
          border-radius: 4px;
          display: inline-block;
        }
        
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-bottom: 16px;
          font-size: 10pt;
        }
        
        .summary-card {
          border: 1px solid #94a3b8;
          padding: 8px;
          border-radius: 6px;
        }
        
        .comments {
          margin-bottom: 18px;
          font-size: 10pt;
        }
        
        .comments h3 {
          font-size: 11pt;
          font-weight: 600;
          margin-bottom: 5px;
        }
        
        .comments p {
          margin-bottom: 5px;
        }
        
        .footer {
          text-align: center;
          font-size: 9pt;
          margin-top: 20px;
        }
        
        .watermark {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.15;
          z-index: 0;
          pointer-events: none;
        }
        
        .watermark img {
          width: 58%;
          max-width: 550px;
          object-fit: contain;
        }
      </style>
    </head>
    <body${plainNurseryA4 ? ' class="nursery-plain-a4"' : ""}>
      ${!plainNurseryA4 && (schoolLogoBase64 || school?.logo_url || school?.logo) ? `
      <div class="watermark">
              <img src="${schoolLogoBase64 ? dataUrlForPdfImgSrc(schoolLogoBase64) ?? "" : school.logo_url || school.logo}" alt="School Watermark" />
      </div>
          ` : ""}
      
      <div class="print-header-container">
        <div class="header-flex">
          <div class="header-logo">
            ${schoolLogoBase64 ? `<img src="${dataUrlForPdfImgSrc(schoolLogoBase64) ?? ""}" alt="School Logo" />` : school?.logo_url || school?.logo ? `<img src="${school.logo_url || school.logo}" alt="School Logo" />` : `<div class="header-logo-placeholder">School<br/>Logo</div>`}
        </div>
          <div class="header-center">
            ${school?.name ? `<div class="school-name">${school.name}</div>` : ""}
            ${school?.subtitle ? `<div class="school-subtitle">${school.subtitle}</div>` : ""}
            ${addressLine ? `<div class="school-address">${addressLine}</div>` : ""}
            ${contactEmail || contactPhone ? `
              <div class="school-contact">
                ${contactEmail ? `<span>${contactEmail}</span>` : ""}
                ${contactEmail && contactPhone ? `<span style="margin: 0 8px; color: #64748b;">|</span>` : ""}
                ${contactPhone ? `<span>${contactPhone}</span>` : ""}
        </div>
            ` : ""}
            ${school?.motto ? `<div class="school-motto">"${school.motto}"</div>` : ""}
      </div>
        </div>
        <div class="header-divider"></div>
        <div class="report-banner">
          <div class="report-chip">${reportBannerTitle}</div>
          ${!plainNurseryA4 && headerMetaLine ? `<div class="report-meta">${headerMetaLine}</div>` : ""}
        </div>
      </div>

      <!-- STUDENT INFO -->
      <div class="student-info nursery-student-info">
        <div class="nursery-student-row">
          <div class="nursery-student-grid">
            <div><strong>STUDENT'S NAME:</strong> ${student.name}</div>
            <div><strong>YEAR:</strong> ${examSet?.year || (/* @__PURE__ */ new Date()).getFullYear()}</div>
            <div><strong>STREAM:</strong> ${streamDisplay}</div>
            <div><strong>CLASS:</strong> ${student.current_class}</div>
            ${plainNurseryA4 ? `<div><strong>AGE (YEARS):</strong> ${ageLabelPdf}</div>` : ""}
            <div><strong>ADMISSION NO:</strong> ${student.admission_number || student.student_id}</div>
            <div><strong>TERM:</strong> ${examSet?.term || "N/A"}</div>
            <div><strong>REPORT DATE:</strong> ${reportDateDisplay}</div>
          </div>
          <div class="nursery-student-photo">
            ${studentPhotoSrc ? `<img src="${studentPhotoSrc}" alt="Student Photo" />` : '<div class="nursery-photo-placeholder">PHOTO</div>'}
          </div>
        </div>
      </div>

      ${middleContent}
    </body>
    </html>
  `;
}
function generateTemplate3KyoteraHTML2(reportData, schoolLogoBase64, studentPhotoBase64) {
  const cls = String(reportData?.students?.[0]?.current_class || "");
  if (isOLevelClass(cls) || isALevelClass(cls)) {
    return generateTemplate3KyoteraHTML(reportData, schoolLogoBase64, studentPhotoBase64);
  }
  return buildTemplate3LowerSectionHTML(reportData, {
    logo: schoolLogoBase64 ?? null,
    photo: studentPhotoBase64 ?? null
  });
}
function generateOLevelReportHTML(reportData, schoolLogoBase64, studentPhotoBase64) {
  const { school, examSet, students } = reportData;
  const student = students[0];
  const attendance = student.summary.attendanceDetails || {};
  const daysPresent = attendance.presentDays ?? "";
  const totalDays = attendance.totalSchoolDays ?? "";
  const daysAbsent = typeof totalDays === "number" && typeof daysPresent === "number" ? Math.max(totalDays - daysPresent, 0) : "";
  const avg = student.summary.average ?? "";
  const avgGrade = student.summary.division ?? "";
  const overallPerf = student.summary.performanceRemark ?? "";
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Student Report</title>
      <link href="https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Times New Roman', 'Times', serif;
          width: 210mm;
          min-height: 297mm;
          margin: 0;
          padding: 2mm 3mm 3mm;
          box-sizing: border-box;
          background: white;
          color: black;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        
        .school-logo {
          width: 120px;
          height: 120px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: none;
        }
        
        .school-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border: none;
        }
        
        .school-info {
          text-align: right;
          flex: 1;
        }
        
        .school-name {
          font-weight: bold;
          font-size: 14pt;
          text-transform: uppercase;
          margin-bottom: 4px;
        }
        
        .school-contact {
          font-size: 9pt;
          font-weight: normal;
          margin-bottom: 4px;
        }
        
        .school-motto {
          font-size: 10pt;
          font-weight: normal;
          font-style: italic;
          margin-bottom: 4px;
        }
        
        .student-photo {
          width: 54px;
          height: 72px;
          border: 2px solid #ccc;
          background: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        
        .student-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .report-title {
          background: #1e3a8a;
          color: white;
          text-align: center;
          padding: 5px 12px;
          margin: 6px 0 6px;
          font-size: 10.3pt;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .student-info {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 6px;
          padding: 5px 6px;
          font-size: 9.4pt;
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid rgba(191, 219, 254, 0.45);
          border-radius: 9px;
        }
        
        .student-info-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 5px;
        }
        
        .student-info div {
          margin-bottom: 3px;
        }
        
        .student-info strong {
          font-weight: bold;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8.5pt;
        }
        
        th, td {
          border: 1px solid rgba(191, 219, 254, 0.45);
          padding: 3.2px 4.8px;
          text-align: left;
        }
        
        th {
          background: rgba(191, 219, 254, 0.68);
          color: #1e3a8a;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          text-align: center;
        }
        
        .center {
          text-align: center;
        }
        
        .summary {
          margin-bottom: 10px;
          font-size: 9.5pt;
        }
        
        .summary p {
          margin-bottom: 5px;
        }
        
        .summary strong {
          font-weight: bold;
        }
        
        .comments {
          margin-bottom: 12px;
          font-size: 9pt;
        }
        
        .comments h3 {
          font-size: 10pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .comments p {
          margin-bottom: 5px;
        }
        
        .next-term {
          margin-bottom: 15px;
          font-size: 9pt;
        }
        
        .next-term strong {
          font-weight: bold;
        }
        
        .grading-system {
          margin-bottom: 15px;
          font-size: 9pt;
        }
        
        .grading-system h3 {
          font-size: 10pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .grading-system p {
          margin-bottom: 5px;
        }
        
        .description-table th {
          background: #f0f0f0;
          color: black;
        }
        
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 7.6pt;
          margin-top: 5px;
        }
        
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.1;
          z-index: -1;
          pointer-events: none;
        }
        
        .watermark img {
          width: 480px;
          height: 480px;
          object-fit: contain;
        }
        
        .watermark-placeholder {
          width: 480px;
          height: 480px;
          border: 2px solid #ccc;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f0f0;
          font-size: 108pt;
          font-weight: bold;
          color: #ccc;
          text-align: center;
          line-height: 1.2;
        }
      </style>
    </head>
    <body>
      <!-- WATERMARK -->
      <div class="watermark">
        ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Watermark" />` : '<div class="watermark-placeholder">SCHOOL<br/>LOGO</div>'}
      </div>
      
      <!-- HEADER - School Logo and Info -->
      <div class="header">
        <!-- School Logo -->
        <div class="school-logo">
          ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Logo" />` : '<div style="text-align: center; font-size: 8px; display: flex; flex-direction: column; justify-content: center; height: 100%;"><div style="font-weight: bold;">SCHOOL</div><div style="font-weight: bold;">LOGO</div></div>'}
        </div>
        
        <!-- School Name and Contact -->
        <div class="school-info">
          <div class="school-name">${school?.name || "EMIRATES COLLEGE SCHOOL"}</div>
          <div class="school-contact">TEL :: ${school?.phone || "0701395594"} | EMAIL :: ${school?.email || "info@emiratescollege.sc.ug"} | ${school?.address || "P.O.BOX 31175, KAMPALA, UGANDA"}</div>
          <div class="school-motto">SCHOOL MOTTO: ${school?.motto || "Education the Future"}</div>
        </div>
        
      </div>

      <!-- REPORT TITLE -->
      <div class="report-title">
        LEARNER'S END OF TERM REPORT CARD FOR TERM ${examSet?.term || "2"}, ${examSet?.year || "2025"}
      </div>

      <!-- Student Info and Photo - Side by side -->
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
        <!-- LEARNER INFO - Left side -->
        <div class="student-info" style="margin-bottom: 0;">
          <div><strong>LNo.:</strong> ${student.admission_number || student.student_id}</div>
          <div><strong>NAME:</strong> ${student.name}</div>
          <div><strong>CLASS & STREAM:</strong> ${student.current_class}</div>
        </div>
        
        <!-- Student Photo - Right side -->
        <div class="student-photo">
          ${studentPhotoBase64 ? `<img src="${studentPhotoBase64}" alt="Student Photo" />` : '<div style="font-size: 10px; color: #666; display: flex; align-items: center; justify-content: center; height: 100%; border: 1px solid #ddd; background: #f9f9f9;">STUDENT<br/>PHOTO</div>'}
        </div>
      </div>

      <!-- SUBJECTS TABLE -->
      <table>
        <thead>
          <tr>
            <th>Subjects & Topics Covered</th>
            <th>Activity Score [3]</th>
            <th>Descriptor</th>
            <th>Formative Score [20%]</th>
            <th>Exam Score [80%]</th>
            <th>Final Score [100%]</th>
            <th>Grade</th>
            <th>Overall Remark</th>
            <th>Subject Teacher</th>
          </tr>
        </thead>
        <tbody>
          ${student.results.length > 0 ? student.results.map((result) => {
    const activity = result.activity_score ?? "";
    const descriptor = result.descriptor != null && result.descriptor !== "" ? String(result.descriptor) : "";
    const formative = result.formative_score ?? "";
    const exam = result.exam_score ?? "";
    const finalScore = result.final_score ?? "";
    const gradeText = result.grade != null && result.grade !== "" ? String(result.grade) : "";
    const overallRemark = result.overall_remark != null ? String(result.overall_remark) : "";
    const teacherInitials = result.teacher_initials ?? "";
    const topic = result.topic || "";
    return `
                <tr>
                  <td>
                    <strong>${result.subject}</strong>
                    <div style="font-size: 9pt; line-height: 1.2; margin-top: 2px;">
                      ${topic}
                    </div>
                  </td>
                  <td class="center">${activity}</td>
                  <td class="center">${descriptor}</td>
                  <td class="center">${formative}</td>
                  <td class="center">${exam}</td>
                  <td class="center">${finalScore}</td>
                  <td class="center">${gradeText}</td>
                  <td style="font-size: 9pt;">${overallRemark}</td>
                  <td class="center">${teacherInitials}</td>
                </tr>
              `;
  }).join("") : `
              <tr>
                <td colspan="9" class="center" style="color: #555;">N/A - Student did not sit for this term</td>
              </tr>
            `}
        </tbody>
      </table>

      <!-- PERFORMANCE SUMMARY -->
      <div class="summary">
        <p><strong>AVERAGE SCORES:</strong> ${avg} ${avgGrade}</p>
        <p><strong>OVERALL PERFORMANCE:</strong> ${overallPerf}</p>
      </div>

      <!-- COMMENTS -->
      <div class="comments">
        <h3>Class Teacher's Comment</h3>
        <p>${student.comments?.class_teacher_text || "Shafic is progressing well but needs to focus more on specific subject for better results."}</p>
        <p>Name: ${student.comments?.class_teacher_name || "__________"} | Signature: ${student.comments?.class_teacher_signature || "__________"} | Date: ${student.comments?.class_teacher_date || "17 September, 2025"}</p>

        <h3>Head Teacher's Comment</h3>
        <p>${student.comments?.head_teacher_text || "Shafic needs to engage the subject teachers to assist in topics which were not properly grasped. There is potential for improvement."}</p>
        <p>Name: ${student.comments?.head_teacher_name || "NAKIYINGI MARIAM"} | Signature: ${student.comments?.head_teacher_signature || "__________"} | Date: ${student.comments?.head_teacher_date || "17 September, 2025"}</p>
      </div>

      <div class="next-term">
        <strong>Next Term Begins:</strong> ${student?.nextTermBegins || "Saturday, 13 September, 2025"}
      </div>

      <!-- Grading system & descriptions -->
      <div class="grading-system">
        <h3>Grading System</h3>
        <p><strong>80 - A | 70 - B | 50 - C | 40 - D | 0 - E</strong></p>
        
        <h3>Description</h3>
        <table class="description-table">
          <thead>
            <tr>
              <th>Grade</th>
              <th>Achievement Level</th>
              <th>Descriptor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>A</td>
              <td>Exceptional</td>
              <td>Demonstrates an extraordinary level of competence by applying innovatively and creatively the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td>B</td>
              <td>Outstanding</td>
              <td>Demonstrates a high level of competence by applying the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td>C</td>
              <td>Satisfactory</td>
              <td>Demonstrates an adequate level of competence by applying the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td>D</td>
              <td>Basic</td>
              <td>Demonstrates a minimum level of competence in applying the acquired knowledge and skills in real life situations</td>
            </tr>
            <tr>
              <td>E</td>
              <td>Elementary</td>
              <td>Demonstrates below the basic level of competence in applying the acquired knowledge and skills in real life situations</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        <div>Printed from: Pwezacore</div>
      </div>
    </body>
    </html>
  `;
}
function generateSecondaryReportHTML(reportData, schoolLogoBase64, studentPhotoBase64) {
  const { school, examSet, students } = reportData;
  const student = students[0];
  const nextTermBegins = student?.nextTermBegins || reportData?.nextTermBegins || "______________________";
  const avg = student.summary.average != null ? String(student.summary.average) : "N/A";
  const avgGrade = student.summary.division != null ? String(student.summary.division) : "N/A";
  const overallPerf = student.summary.performanceRemark != null ? String(student.summary.performanceRemark) : "N/A";
  const projects = Array.isArray(student.projects) ? student.projects : [];
  const comments = student.comments || null;
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Student Report</title>
      <link href="https://fonts.googleapis.com/css2?family=Times+New+Roman:wght@400;700&display=swap" rel="stylesheet">
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Times New Roman', 'Times', serif;
          width: 210mm;
          min-height: 297mm;
          margin: 0;
          padding: 15mm;
          box-sizing: border-box;
          background: white;
          color: black;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        
        .school-logo {
          width: 200px;
          height: 200px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          border: none;
          flex-shrink: 0;
        }
        
        .school-logo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          border: none;
        }
        
        .school-info {
          text-align: right;
          flex: 1;
        }
        
        .school-name {
          font-weight: bold;
          font-size: 18pt;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        
        .school-contact {
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .school-motto {
          font-size: 11pt;
          font-weight: bold;
          font-style: italic;
        }
        
        .report-title {
          text-align: center;
          margin: 20px 0;
          font-size: 14pt;
          font-weight: bold;
          text-transform: uppercase;
        }
        
        .student-meta {
          margin-bottom: 20px;
          font-size: 11pt;
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        
        .student-info {
          display: flex;
          flex-wrap: wrap;
          gap: 20px;
        }
        
        .student-photo {
          width: 80px;
          height: 96px;
          border: 2px solid #ccc;
          background: #f0f0f0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        
        .student-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 20px;
          font-size: 9pt;
        }
        
        th, td {
          border: 1px solid #000;
          padding: 4px;
          text-align: left;
        }
        
        th {
          background: #f0f0f0;
          font-weight: bold;
          text-align: center;
        }
        
        .center {
          text-align: center;
        }
        
        .summary {
          margin-bottom: 20px;
          font-size: 11pt;
        }
        
        .summary strong {
          font-weight: bold;
        }
        
        .comments {
          margin-bottom: 20px;
          font-size: 10pt;
        }
        
        .comments h3 {
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .comments p {
          margin-bottom: 5px;
        }
        
        .next-term {
          margin-bottom: 20px;
          font-size: 10pt;
        }
        
        .next-term strong {
          font-weight: bold;
        }
        
        .grading-system {
          margin-bottom: 20px;
          font-size: 10pt;
        }
        
        .grading-system h3 {
          font-size: 11pt;
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .grading-system p {
          margin-bottom: 5px;
        }
        
        .footer {
          text-align: center;
          font-size: 9pt;
          margin-top: 20px;
        }
        
        .watermark {
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          opacity: 0.1;
          z-index: -1;
          pointer-events: none;
        }
        
        .watermark img {
          width: 900px;
          height: 900px;
          object-fit: contain;
        }
        
        .watermark-placeholder {
          width: 900px;
          height: 900px;
          border: 2px solid #ccc;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f0f0f0;
          font-size: 108pt;
          font-weight: bold;
          color: #ccc;
          text-align: center;
          line-height: 1.2;
        }
      </style>
    </head>
    <body>
      <!-- WATERMARK -->
      <div class="watermark">
        ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Watermark" />` : '<div class="watermark-placeholder">SCHOOL<br/>LOGO</div>'}
      </div>
      
      <!-- HEADER -->
      <div class="header">
        <!-- School Logo -->
        <div class="school-logo">
          ${schoolLogoBase64 ? `<img src="${schoolLogoBase64}" alt="School Logo" />` : '<div style="text-align: center; font-size: 8px; display: flex; flex-direction: column; justify-content: center; height: 100%;"><div style="font-weight: bold;">SCHOOL</div><div style="font-weight: bold;">LOGO</div></div>'}
        </div>
        
        <!-- School Info -->
        <div class="school-info">
          <div class="school-name">${school?.name || "School Name"}</div>
          <div class="school-contact">TEL: ${school?.phone || "Phone"} | EMAIL: ${school?.email || "Email"} | ${school?.address || "Address"}</div>
          <div class="school-motto">SCHOOL MOTTO: ${school?.motto || "Education the Future"}</div>
        </div>
      </div>

      <!-- TITLE -->
      <div class="report-title">
        LEARNER'S END OF TERM REPORT CARD FOR TERM ${examSet?.term || ""}, ${examSet?.year || ""}
      </div>

      <!-- STUDENT META -->
      <div class="student-meta">
        <div class="student-info">
          <div><strong>LNo.</strong> ${student.admission_number || student.student_id}</div>
          <div><strong>NAME:</strong> ${student.name}</div>
          <div><strong>CLASS & STREAM:</strong> ${student.current_class}</div>
        </div>
        
        <!-- Student Photo -->
        <div class="student-photo">
          ${studentPhotoBase64 ? `<img src="${studentPhotoBase64}" alt="Student Photo" />` : '<div style="font-size: 10px; color: #666; display: flex; align-items: center; justify-content: center; height: 100%; border: 1px solid #ddd; background: #f9f9f9;">PHOTO</div>'}
        </div>
      </div>

      <!-- ATTENDANCE TABLE REMOVED PER REQUIREMENT -->

      <!-- SUBJECTS TABLE -->
      <table>
        <thead>
          <tr>
            <th>SUBJECT & PAPER</th>
            <th>MARKS OBTAINED</th>
            <th>TOTAL MARKS</th>
            <th>GRADE</th>
            <th>REMARK</th>
            <th>INITIALS</th>
          </tr>
        </thead>
        <tbody>
          ${(() => {
    const coreNames = ["english", "mathematics", "science", "social studies", "sst"];
    const core = (student.results || []).filter((r) => coreNames.includes(String(r.subject || "").toLowerCase())).slice(0, 4);
    return core.length > 0 ? core.map((result) => {
      const subject = result.subject ?? "";
      const marksObtained = result.marks_obtained != null ? String(result.marks_obtained) : "";
      const totalMarks = result.total_marks != null ? String(result.total_marks) : "";
      const grade = result.grade ?? "";
      const remark = result.remark ?? result.overall_remark ?? "";
      const initials = result.teacher_initials ?? result.teacher_name ?? "";
      return `
                <tr>
                  <td style="border: 1px solid #000; padding: 6px; font-weight: bold;">${subject}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${marksObtained}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${totalMarks}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${grade}</td>
                  <td style="border: 1px solid #000; padding: 6px;">${remark}</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;">${initials}</td>
                </tr>
              `;
    }).join("") : `
              <tr>
                <td colspan="6" style="border: 1px solid #000; padding: 8px; text-align: center; color: #555;">N/A - Student did not sit for this term</td>
              </tr>
            `;
  })()}
        </tbody>
      </table>

      <!-- PERFORMANCE SUMMARY -->
      <div class="summary">
        <p><strong>OVERALL PERFORMANCE:</strong> ${overallPerf}</p>
      </div>


      <!-- COMMENTS -->
      <div class="comments">
        <h3>Class Teacher's Comment</h3>
        <p>${comments?.class_teacher_text ?? ".............................................................."}</p>
        <p>Name: ${comments?.class_teacher_name ?? "__________"} | Signature: ${comments?.class_teacher_signature ?? "__________"} | Date: ${comments?.class_teacher_date ?? "__________"}</p>

        <h3>Head Teacher's Comment</h3>
        <p>${comments?.head_teacher_text ?? ".............................................................."}</p>
        <p>Name: ${comments?.head_teacher_name ?? "__________"} | Signature: ${comments?.head_teacher_signature ?? "__________"} | Date: ${comments?.head_teacher_date ?? "__________"}</p>
      </div>

      <!-- NEXT TERM & GRADING -->
      <div class="next-term">
        <strong>Next Term Begins:</strong> ${nextTermBegins}
      </div>

      <div class="grading-system">
        <h3>Grading System</h3>
        <p><strong>A (80\u2013100) | B (70\u201379) | C (50\u201369) | D (40\u201349) | E (0\u201339)</strong></p>
        
        <h3>Grade Descriptions</h3>
        <p>A: Excellent mastery and application of concepts.</p>
        <p>B: Very good understanding with minor gaps.</p>
        <p>C: Satisfactory performance with notable room for improvement.</p>
        <p>D: Below average; needs significant improvement.</p>
        <p>E: Poor performance; urgent intervention required.</p>
      </div>

      <!-- FOOTER -->
      <div class="footer">
        Printed from: Pwezacore
      </div>
    </body>
    </html>
  `;
}
var NURSERY_PERFORMANCE_OPTIONS2, NURSERY_PERFORMANCE_COLOR_MAP2, NURSERY_PERFORMANCE_NORMALIZED_MAP, NURSERY_SKILL_GRID, sanitizeNurseryKey2, normalizeNurseryPerformanceWord, getNurserySkillKeyVariants, gatherNurseryPerformanceSources, extractPerformanceFromSource, resolveNurseryPerformanceValue, getReadableTextColor, applyAlphaToHex;
var init_legacySecondaryPdfTemplatesFrom3918d26 = __esm({
  "src/services/legacySecondaryPdfTemplatesFrom3918d26.ts"() {
    "use strict";
    init_reportHeaderBrandingDefaults();
    init_helpers();
    init_prePrimaryHolisticRatings();
    init_secondaryOlevelHtmlFromD082d5b();
    init_primaryPdfBuiltins();
    init_prePrimaryHolisticPdfMarkup();
    init_reportImageDataUrl();
    init_reportStudentAge();
    NURSERY_PERFORMANCE_OPTIONS2 = [
      { label: "Very Good", color: "#4CAF50" },
      { label: "Good", color: "#42A5F5" },
      { label: "Tries", color: "#FFEB3B" },
      { label: "Still a Problem", color: "#FF7043" },
      { label: "Promising", color: "#BA68C8" }
    ];
    NURSERY_PERFORMANCE_COLOR_MAP2 = NURSERY_PERFORMANCE_OPTIONS2.reduce((acc, option) => {
      acc[option.label] = option.color;
      return acc;
    }, {});
    NURSERY_PERFORMANCE_NORMALIZED_MAP = (() => {
      const map = /* @__PURE__ */ new Map();
      const addVariant = (label, ...variants) => {
        variants.forEach((variant) => {
          map.set(variant, label);
        });
      };
      NURSERY_PERFORMANCE_OPTIONS2.forEach(({ label }) => {
        const normalized = label.trim().toLowerCase();
        const collapsed = normalized.replace(/\s+/g, "");
        addVariant(label, normalized, collapsed);
      });
      addVariant("Very Good", "vg");
      addVariant("Good", "g");
      addVariant("Tries", "t");
      addVariant("Still a Problem", "stillaproblem", "still_problem", "sap", "problem", "needsattention");
      addVariant("Promising", "p", "promising", "prom", "progressing");
      return map;
    })();
    NURSERY_SKILL_GRID = [
      [
        { key: "toilet", label: "Toilet" },
        { key: "recognition_of_numbers", label: "Recognition of numbers" },
        { key: "property_care", label: "Property care" },
        { key: "handling_of_pencil", label: "Handling of pencil" },
        { key: "re_sighting_alphabet", label: "Re-sighting Alphabet" },
        { key: "attention_span", label: "Attention span" },
        { key: "punctuality", label: "Punctuality" },
        { key: "shading", label: "Shading" }
      ],
      [
        { key: "nose_care", label: "Nose care" },
        { key: "recognition_of_shapes", label: "Recognition of shapes" },
        { key: "respect", label: "Respect" },
        { key: "arrival_time", label: "Arrival time" },
        { key: "counting_number_sequence", label: "Counting number sequence" },
        { key: "re_sighting_poems", label: "Re-sighting Poems" },
        { key: "love_or_interest", label: "Love or Interest" },
        { key: "drawing", label: "Drawing" }
      ],
      [
        { key: "recognition_of_letters", label: "Recognition of letters" },
        { key: "sharing", label: "Sharing" },
        { key: "friendship", label: "Friendship" },
        { key: "colours", label: "Colours" },
        { key: "playing", label: "Playing" },
        { key: "emotional", label: "Emotional" },
        { key: "smartness", label: "Smartness" },
        { key: "placeholder", label: "" }
      ]
    ];
    sanitizeNurseryKey2 = (value) => {
      if (value === null || value === void 0) return "";
      return String(value).trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
    };
    normalizeNurseryPerformanceWord = (value) => {
      if (value === null || value === void 0) return null;
      const raw = String(value).trim();
      if (!raw) return null;
      const normalized = raw.toLowerCase();
      const collapsed = normalized.replace(/\s+/g, "");
      if (NURSERY_PERFORMANCE_NORMALIZED_MAP.has(normalized)) {
        return NURSERY_PERFORMANCE_NORMALIZED_MAP.get(normalized);
      }
      if (NURSERY_PERFORMANCE_NORMALIZED_MAP.has(collapsed)) {
        return NURSERY_PERFORMANCE_NORMALIZED_MAP.get(collapsed);
      }
      for (const [key, canonical] of NURSERY_PERFORMANCE_NORMALIZED_MAP.entries()) {
        if (key === normalized || key === collapsed) {
          return canonical;
        }
      }
      return null;
    };
    getNurserySkillKeyVariants = (skill) => {
      const label = skill.label || "";
      const key = skill.key || "";
      const cleanedLabel = label.replace(/&/g, "and");
      const variants = [
        key,
        cleanedLabel,
        label,
        key.replace(/_/g, " "),
        key.replace(/_/g, ""),
        cleanedLabel.toLowerCase(),
        label.toLowerCase(),
        cleanedLabel.replace(/\s+/g, "_"),
        cleanedLabel.replace(/\s+/g, ""),
        key.toLowerCase(),
        key.replace(/_/g, "-"),
        cleanedLabel.replace(/\s+/g, "-")
      ];
      const unique = /* @__PURE__ */ new Set();
      variants.forEach((variant) => {
        const sanitized = sanitizeNurseryKey2(variant);
        if (sanitized) {
          unique.add(sanitized);
        }
      });
      return Array.from(unique);
    };
    gatherNurseryPerformanceSources = (student) => {
      const sources = [];
      const pushIfPresent = (value) => {
        if (value !== null && value !== void 0) {
          sources.push(value);
        }
      };
      pushIfPresent(student?.nursery_performance);
      pushIfPresent(student?.nurseryPerformance);
      pushIfPresent(student?.nursery_skills);
      pushIfPresent(student?.nurserySkills);
      pushIfPresent(student?.developmentalSkills);
      pushIfPresent(student?.developmental_skills);
      pushIfPresent(student?.skillAssessments);
      pushIfPresent(student?.skillsChecklist);
      pushIfPresent(student?.skills_checklist);
      pushIfPresent(student?.skills);
      pushIfPresent(student?.summary?.nurserySkills);
      pushIfPresent(student?.summary?.nursery_skills);
      pushIfPresent(student?.summary?.developmentalSkills);
      pushIfPresent(student?.summary?.developmental_skills);
      pushIfPresent(student?.summary?.skillsChecklist);
      pushIfPresent(student?.summary?.skills_checklist);
      if (Array.isArray(student?.results)) {
        student.results.forEach((result) => {
          pushIfPresent(result?.nurserySkills);
          pushIfPresent(result?.nursery_skills);
          pushIfPresent(result?.developmentalSkills);
          pushIfPresent(result?.developmental_skills);
          pushIfPresent(result?.skillsChecklist);
          pushIfPresent(result?.skills_checklist);
        });
      }
      return sources;
    };
    extractPerformanceFromSource = (source, targetKeys) => {
      const tryPush = (rawKey, rawValue) => {
        const key = sanitizeNurseryKey2(rawKey);
        if (!key || !targetKeys.has(key)) return null;
        const normalizedValue = normalizeNurseryPerformanceWord(rawValue);
        return normalizedValue;
      };
      if (Array.isArray(source)) {
        for (const entry of source) {
          if (!entry) continue;
          if (typeof entry === "string") {
            const parts = entry.split(/[:\-]/);
            if (parts.length >= 2) {
              const keyCandidate = parts[0];
              const valueCandidate = parts.slice(1).join("-").trim();
              const result = tryPush(keyCandidate, valueCandidate);
              if (result) return result;
            }
            continue;
          }
          if (typeof entry === "object") {
            const keyCandidates = [
              entry.key,
              entry.skill,
              entry.skill_name,
              entry.skillName,
              entry.name,
              entry.label,
              entry.title,
              entry.description,
              entry.field
            ];
            const valueCandidates = [
              entry.value,
              entry.performance,
              entry.status,
              entry.level,
              entry.assessment,
              entry.rating,
              entry.result,
              entry.word,
              entry.selection,
              entry.score
            ];
            for (const keyCandidate of keyCandidates) {
              if (!keyCandidate) continue;
              for (const valueCandidate of valueCandidates) {
                const result = tryPush(keyCandidate, valueCandidate);
                if (result) return result;
              }
            }
            if (entry.text) {
              const parts = String(entry.text).split(/[:\-]/);
              if (parts.length >= 2) {
                const keyCandidate = parts[0];
                const valueCandidate = parts.slice(1).join("-").trim();
                const result = tryPush(keyCandidate, valueCandidate);
                if (result) return result;
              }
            }
          }
        }
        return null;
      }
      if (typeof source === "object" && source !== null) {
        for (const [rawKey, rawValue] of Object.entries(source)) {
          const result = tryPush(rawKey, rawValue);
          if (result) return result;
        }
        return null;
      }
      if (typeof source === "string") {
        try {
          const parsed = JSON.parse(source);
          return extractPerformanceFromSource(parsed, targetKeys);
        } catch {
          const parts = source.split(/[:\-]/);
          if (parts.length >= 2) {
            const keyCandidate = parts[0];
            const valueCandidate = parts.slice(1).join("-").trim();
            return tryPush(keyCandidate, valueCandidate);
          }
        }
      }
      return null;
    };
    resolveNurseryPerformanceValue = (student, skill) => {
      if (!skill.label) return null;
      const targetKeys = new Set(getNurserySkillKeyVariants(skill));
      const sources = gatherNurseryPerformanceSources(student);
      for (const source of sources) {
        const value = extractPerformanceFromSource(source, targetKeys);
        if (value) return value;
      }
      return null;
    };
    getReadableTextColor = (hex) => {
      let normalized = hex.replace("#", "");
      if (normalized.length === 3) {
        normalized = normalized.split("").map((char) => char + char).join("");
      }
      const r = parseInt(normalized.substring(0, 2), 16);
      const g = parseInt(normalized.substring(2, 4), 16);
      const b = parseInt(normalized.substring(4, 6), 16);
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      return luminance > 0.6 ? "#111827" : "#ffffff";
    };
    applyAlphaToHex = (hex, alpha) => {
      if (!hex) return `rgba(255,255,255,${alpha})`;
      let normalized = hex.replace("#", "");
      if (normalized.length === 3) {
        normalized = normalized.split("").map((char) => char + char).join("");
      }
      const r = parseInt(normalized.substring(0, 2), 16);
      const g = parseInt(normalized.substring(2, 4), 16);
      const b = parseInt(normalized.substring(4, 6), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    };
  }
});

// src/lib/secondarySubjectTeacherDisplay.ts
function formatTeacherShortNameForReport(raw) {
  const s = String(raw ?? "").trim().replace(/\s+/g, " ");
  if (!s) return "";
  const parts = s.split(" ").filter(Boolean);
  const cap = (w) => w.length === 0 ? "" : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
  if (parts.length === 1) return cap(parts[0]);
  return `${cap(parts[0])} ${parts[parts.length - 1].charAt(0).toUpperCase()}`;
}
var init_secondarySubjectTeacherDisplay = __esm({
  "src/lib/secondarySubjectTeacherDisplay.ts"() {
    "use strict";
  }
});

// src/services/template4AlevelHtml.ts
function generateTemplate4AlevelHTML(reportData, schoolLogoBase64, studentPhotoBase64) {
  const { school, examSet, students } = reportData || {};
  const student = students?.[0];
  if (!student) {
    throw new Error("generateTemplate4AlevelHTML: no student in reportData");
  }
  const year = examSet?.year ?? (/* @__PURE__ */ new Date()).getFullYear();
  const results = Array.isArray(student.results) ? student.results : [];
  const sorted = [...results].sort((a, b) => {
    const sa = String(a.subject ?? "").localeCompare(String(b.subject ?? ""), void 0, { sensitivity: "base" });
    if (sa !== 0) return sa;
    return String(a.paper_code ?? a.paper_number ?? "").localeCompare(
      String(b.paper_code ?? b.paper_number ?? ""),
      void 0,
      { sensitivity: "base" }
    );
  });
  const alevel = reportData.alevel;
  const tableRows = alevel?.paperRows?.length ? alevel.paperRows : sorted.map((r) => ({
    subjectLabel: String(r.subject ?? ""),
    paperCode: String(r.paper_code ?? r.paper_number ?? "\u2014"),
    marksPercent: r.marks_obtained != null && r.total_marks != null ? Number(r.marks_obtained) / Number(r.total_marks || 100) * 100 : null,
    gradeDisplay: String(r.grade ?? "\u2014"),
    comment: r.overall_remark ?? r.remarks ?? r.teacher_comment ?? "",
    teacherDisplayName: (() => {
      const raw = String(r.teacher_initials ?? r.teacher_name ?? "").trim();
      if (!raw) return "";
      if (raw.includes(" ")) return formatTeacherShortNameForReport(raw);
      return raw;
    })()
  }));
  const rowHtml = tableRows.map(
    (row) => `
          <tr>
            <td><strong>${escapeHtml(row.subjectLabel)}</strong></td>
            <td class="center">${row.marksPercent != null && !Number.isNaN(row.marksPercent) ? `${Math.round(row.marksPercent)}%` : "\u2014"}</td>
            <td class="center grade-col">${escapeHtml(row.gradeDisplay)}</td>
            <td class="remark-cell">${escapeHtml(row.comment ?? "")}</td>
            <td class="center note-cell">${escapeHtml(row.teacherDisplayName ?? "")}</td>
          </tr>`
  ).join("");
  const pp = alevel?.principalPasses != null ? String(alevel.principalPasses) : "\u2014";
  const sp = alevel?.subsidiaryPasses != null ? String(alevel.subsidiaryPasses) : "\u2014";
  const pts = alevel?.totalPointsNumerator != null && alevel?.totalPointsDenominator ? `${alevel.totalPointsNumerator}/${alevel.totalPointsDenominator}` : "\u2014";
  const chartSection = (() => {
    const line = alevel?.lineChartStudentVsClass;
    if (!line || line.length === 0) return "";
    const maxY = Math.max(1, ...line.map((p) => Math.max(p.studentMetric, p.classMetric)));
    const points = line.map((p, i) => {
      const x = 40 + i * (220 / Math.max(1, line.length - 1));
      const ys = 120 - p.studentMetric / maxY * 90;
      const yc = 120 - p.classMetric / maxY * 90;
      return { x, ys, yc, label: p.xLabel };
    }).filter((_, i) => i < 12);
    const polyStudent = points.map((p) => `${p.x},${p.ys}`).join(" ");
    const polyClass = points.map((p) => `${p.x},${p.yc}`).join(" ");
    return `
      <div class="chart-card">
        <div class="chart-title">Subject performance \u2014 Student vs Class</div>
        <svg viewBox="0 0 280 140" width="100%" height="120" xmlns="http://www.w3.org/2000/svg">
          <polyline fill="none" stroke="#00838f" stroke-width="2.5" points="${polyStudent}" />
          <polyline fill="none" stroke="#558b2f" stroke-width="2" stroke-dasharray="5 3" points="${polyClass}" />
        </svg>
        <div class="chart-legend"><span class="lg s">Student</span><span class="lg c">Class</span></div>
      </div>`;
  })();
  const barSection = (() => {
    const bars = alevel?.barChartByPeriod;
    if (!bars || bars.length === 0) return "";
    const maxV = Math.max(1, ...bars.map((b) => b.studentMetric));
    return `
      <div class="chart-card bar-card">
        <div class="chart-title">Performance over time</div>
        <div class="bars">
          ${bars.map(
      (b) => `
            <div class="bar-wrap">
              <div class="bar" style="height:${b.studentMetric / maxV * 76}px"></div>
              <div class="bar-lbl">${escapeHtml(b.periodLabel)}</div>
            </div>`
    ).join("")}
        </div>
      </div>`;
  })();
  const headerHtml = buildSecondaryLowerSectionHeaderHtml(school, schoolLogoBase64 ?? null, {
    chipTitle: secondaryOlevelStandardReportChipTitle(examSet),
    metaLine: `${examSet?.name || "Term Report"} - ${year}`
  });
  const studentBlockHtml = buildSecondaryUpperSectionStyleStudentBlockHtml(
    student,
    examSet,
    studentPhotoBase64 ?? null
  );
  const rawSt = student;
  const classTeacherComment = String(
    student.comments?.class_teacher_text ?? student.comments?.class_teacher_comment ?? rawSt.class_teacher_comment ?? ""
  );
  const headTeacherComment = String(
    student.comments?.headteacher_text ?? student.comments?.head_teacher_text ?? rawSt.headteacher_comment ?? rawSt.head_teacher_comment ?? ""
  );
  const classTeacherNamePanel = String(
    alevel?.classTeacherName ?? student.comments?.class_teacher_name ?? ""
  );
  const headTeacherNamePanel = String(
    alevel?.principalName ?? student.comments?.head_teacher_name ?? ""
  );
  const nextTermRaw = student.nextTermBegins ?? student.next_term_begins_date ?? student.processed?.nextTermBeginsDate ?? "";
  const commentsNextTermHtml = buildSecondaryOlevelCommentsNextTermPanelHtml({
    classTeacherComment: String(classTeacherComment),
    headTeacherComment: String(headTeacherComment),
    classTeacherName: classTeacherNamePanel,
    headTeacherName: headTeacherNamePanel,
    nextTermBeginsDisplay: formatNextTermBeginsLongDisplay(nextTermRaw),
    feesBalanceDisplay: formatSecondaryFeesBalanceForReport(student)
  });
  const savedBandsRaw = reportData?.uace_percent_bands;
  const savedBands = Array.isArray(savedBandsRaw) ? savedBandsRaw.map((el) => {
    if (!el || typeof el !== "object") return null;
    const o = el;
    const grade = String(o.grade ?? "").trim();
    const min_pct = Number(o.min_pct);
    const max_pct = Number(o.max_pct);
    if (!grade || !Number.isFinite(min_pct) || !Number.isFinite(max_pct)) return null;
    return { grade: grade.toUpperCase(), min_pct, max_pct };
  }).filter((x) => x != null) : [];
  const displayBands = savedBands.length > 0 ? savedBands : DEFAULT_UACE_PERCENT_BANDS.map((b) => ({ ...b }));
  const usingSchoolBands = savedBands.length > 0;
  const bandsRowsHtml = displayBands.map((b) => {
    const g = String(b.grade || "").trim().toUpperCase();
    const pct = uaceBandFinalPercentDisplayForReport({
      grade: g,
      min_pct: b.min_pct,
      max_pct: b.max_pct
    });
    const pts2 = uacePointsFromGrade(g);
    return `<tr>
              <td>${escapeHtml(pct)}</td>
              <td class="col-grade">${escapeHtml(g)}</td>
              <td class="col-points">${escapeHtml(String(pts2))}</td>
            </tr>`;
  }).join("");
  const classLineForBands = String(student.current_class ?? "").trim();
  const innerTitle = usingSchoolBands ? classLineForBands || "This class" : "Default UACE-style bands (typical UNEB ranges)";
  const innerBody = usingSchoolBands ? "Marks out of 100 are converted to a letter grade using these bands." : "Marks out of 100 are converted to a letter grade using these bands. UNEB may adjust boundaries by year; new schools use this mapping until a class teacher saves custom ranges in Grading System.";
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
        <p class="alevel-printed-from">Printed from: Pwezacore</p>
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
    @page {
      margin: 0;
      size: auto;
    }
    ${SECONDARY_UPPER_SECTION_STYLE_STUDENT_BLOCK_CSS}
    ${SECONDARY_UPPER_SECTION_RESULTS_TABLE_CSS}
    /* A-Level marks table: same header/body rules as Template Standard (.o-level-standard) */
    table.upper-results.alevel-marks {
      margin-bottom: 2mm;
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
      gap: 8px;
      margin-bottom: 6px;
    }
    .chart-card {
      flex: 1 1 auto;
      min-width: 0;
      max-width: 100%;
      padding: 5px 7px;
      background: #fffef8;
      border: 1px solid #00897b;
      box-shadow: 0 1px 2px rgba(0,0,0,.06);
    }
    .chart-title {
      font-weight: 700;
      font-size: 8.5pt;
      color: #006064;
      margin-bottom: 4px;
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
      gap: 8px;
      margin-bottom: 6px;
    }
    .stat-pill {
      background: #e0f2f1;
      border: 1px solid #00897b;
      padding: 4px 8px;
      font-size: 9pt;
      font-weight: 600;
      color: #004d40;
    }
    .stat-pill strong { color: #006064; margin-right: 6px; }
    ${SECONDARY_OLEVEL_COMMENTS_NEXT_TERM_PANEL_CSS}
    .uace-exam-bands-block {
      margin-top: 6px;
      margin-bottom: 4px;
      font-family: 'Times New Roman', Times, serif;
    }
    .uace-bands-card {
      border: 1px solid #00897b;
      background: #f0fdfa;
      padding: 6px 8px;
      border-radius: 2px;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .uace-bands-card-title {
      font-size: 9pt;
      font-weight: 600;
      color: #006064;
      margin: 0 0 4px;
    }
    .uace-bands-card-body {
      font-size: 8pt;
      color: #37474f;
      margin: 0 0 4px;
      line-height: 1.3;
    }
    .uace-bands-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 8.5pt;
    }
    .uace-bands-table th,
    .uace-bands-table td {
      border: 1px solid #90cbc4;
      padding: 2px 5px;
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
    .alevel-printed-from {
      text-align: center;
      font-size: 7.5pt;
      color: #64748b;
      margin: 4px 0 0;
      padding-top: 4px;
      border-top: 1px solid #e2e8f0;
    }
    body.alevel-pdf {
      position: relative;
    }
    body.alevel-pdf .sheet {
      min-height: 0;
    }
    body.alevel-pdf .secondary-ol-comments-panel {
      margin-bottom: 6px;
    }
    @media print {
      html, body.alevel-pdf {
        min-height: auto !important;
        height: auto !important;
      }
    }
    ${SECONDARY_LOWER_HEADER_PRINT_CSS}
  </style>
</head>
<body class="alevel-pdf">
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
function escapeHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
var init_template4AlevelHtml = __esm({
  "src/services/template4AlevelHtml.ts"() {
    "use strict";
    init_secondaryLowerSectionHeaderHtml();
    init_uaceGradeBands();
    init_secondarySubjectTeacherDisplay();
  }
});

// src/services/reportSecondaryBuiltinGuards.ts
function normalizeSchoolLevel(school) {
  if (!school) return "";
  const raw = school.school_level ?? school.level ?? school.school_type ?? "";
  return String(raw).trim().toLowerCase();
}
function assertSecondaryBuiltinTemplatesAllowed(school, context) {
  const v = normalizeSchoolLevel(school);
  if (!v) return;
  const allowed = /* @__PURE__ */ new Set(["secondary", "mixed", "o-level", "olevel", "a-level", "alevel", "senior"]);
  const blocked = /* @__PURE__ */ new Set([
    "nursery",
    "pre-primary",
    "pre_primary",
    "preprimary",
    "baby",
    "daycare",
    "infant"
  ]);
  if (allowed.has(v)) return;
  if (blocked.has(v) || v.includes("nursery") || v.includes("pre-primary") || v.includes("preprimary")) {
    const msg = `[reports:${context}] Refusing secondary built-in templates: school level is "${school?.school_level ?? school?.level ?? school.school_type}". Expected secondary/mixed or unset.`;
    console.error(msg);
    throw new Error(msg);
  }
  if (v === "primary" || v === "elementary") {
    const msg = `[reports:${context}] Refusing secondary built-in templates: school level is "${v}". Use primary report layouts for this school.`;
    console.error(msg);
    throw new Error(msg);
  }
}
var init_reportSecondaryBuiltinGuards = __esm({
  "src/services/reportSecondaryBuiltinGuards.ts"() {
    "use strict";
  }
});

// src/services/templateHTMLGenerator.ts
var templateHTMLGenerator_exports = {};
__export(templateHTMLGenerator_exports, {
  NURSERY_PERFORMANCE_OPTIONS: () => NURSERY_PERFORMANCE_OPTIONS3,
  NURSERY_SKILL_GRID: () => NURSERY_SKILL_GRID2,
  convertImageToBase64: () => convertImageToBase64,
  generateOLevelReportHTML: () => generateOLevelReportHTML,
  generatePrimaryReportHTML: () => generatePrimaryReportHTML,
  generateSecondaryReportHTML: () => generateSecondaryReportHTML,
  generateTemplate1OLevelHTML: () => generateTemplate1OLevelHTML2,
  generateTemplate2KasoziHTML: () => generateTemplate2KasoziHTML2,
  generateTemplate3KyoteraHTML: () => generateTemplate3KyoteraHTML2,
  generateTemplate4UpperSectionHTML: () => generateTemplate4UpperSectionHTML,
  generateTemplateNurseryCindrelinahHTML: () => generateTemplateNurseryCindrelinahHTML,
  loadCustomTemplate: () => loadCustomTemplate,
  loadNurseryAutoComments: () => loadNurseryAutoComments,
  renderTemplateHTML: () => renderTemplateHTML,
  replaceTemplatePlaceholders: () => replaceTemplatePlaceholders
});
async function loadNurseryAutoComments() {
  const base = {
    class_teacher: {},
    head_teacher: {}
  };
  try {
    const { data, error } = await supabase.from("nursery_auto_comments").select("role, grade_letter, comment");
    if (error || !data) {
      if (error) {
        console.warn("Failed to load nursery auto comments:", error);
      }
      return base;
    }
    data.forEach((row) => {
      const role = (row.role || "").trim().toLowerCase();
      const grade = (row.grade_letter || "").trim().toUpperCase();
      if (!role || !grade) return;
      if (role !== "class_teacher" && role !== "head_teacher") return;
      base[role][grade] = row.comment || "";
    });
    return base;
  } catch (err) {
    console.warn("Error loading nursery auto comments:", err);
    return base;
  }
}
async function loadCustomTemplate(schoolId, templateId) {
  try {
    let query = supabase.from("report_templates").select("html_content, css_content").eq("school_id", schoolId);
    if (templateId) {
      query = query.eq("id", templateId);
    } else {
      query = query.eq("is_default", true);
    }
    const { data, error } = await query.single();
    if (error || !data) {
      console.log("No custom template found, using default");
      return null;
    }
    return {
      html: data.html_content,
      css: data.css_content || ""
    };
  } catch (error) {
    console.error("Error loading custom template:", error);
    return null;
  }
}
function replaceTemplatePlaceholders(html, css, reportData, schoolLogoBase64, studentPhotoBase64) {
  const { school, examSet, students } = reportData;
  const student = students[0];
  let processedHtml = html.replace(/\[SCHOOL_NAME\]/g, school?.name || "School Name").replace(/\[SCHOOL_ADDRESS\]/g, school?.address || "Address").replace(/\[SCHOOL_PHONE\]/g, school?.phone || "Phone").replace(/\[SCHOOL_EMAIL\]/g, school?.email || "Email").replace(/\[SCHOOL_MOTTO\]/g, school?.motto || "Motto").replace(/\[STUDENT_ID\]/g, student.admission_number || student.student_id || "").replace(/\[STUDENT_NAME\]/g, student.name || "").replace(/\[STUDENT_CLASS\]/g, student.current_class || "").replace(/\[TERM\]/g, examSet?.term || "").replace(/\[YEAR\]/g, examSet?.year || "").replace(/\[AVERAGE_SCORE\]/g, formatAverageWhole(student.summary?.average, "")).replace(/\[OVERALL_GRADE\]/g, student.summary?.division || "").replace(/\[POSITION\]/g, student.summary?.position || "").replace(/\[TEACHER_COMMENT\]/g, student.comments?.class_teacher_text || "").replace(/\[TEACHER_NAME\]/g, student.comments?.class_teacher_name || "").replace(/\[DATE\]/g, (/* @__PURE__ */ new Date()).toLocaleDateString());
  if (schoolLogoBase64) {
    processedHtml = processedHtml.replace(
      /<div[^>]*class="[^"]*school-logo[^"]*"[^>]*>[\s\S]*?<\/div>/g,
      `<div class="school-logo"><img src="${schoolLogoBase64}" alt="School Logo" /></div>`
    );
  }
  if (studentPhotoBase64) {
    processedHtml = processedHtml.replace(
      /<div[^>]*class="[^"]*student-photo[^"]*"[^>]*>[\s\S]*?<\/div>/g,
      `<div class="student-photo"><img src="${studentPhotoBase64}" alt="Student Photo" /></div>`
    );
  }
  if (student.results && student.results.length > 0) {
    const resultsRows = student.results.map((result) => `
      <tr>
        <td>${result.subject || ""}</td>
        <td>${result.marks_obtained || result.exam_score || ""}</td>
        <td>${result.total_marks || "100"}</td>
        <td>${result.grade || ""}</td>
        <td>${result.remark || result.overall_remark || ""}</td>
      </tr>
    `).join("");
    processedHtml = processedHtml.replace(
      /<tbody>[\s\S]*?<\/tbody>/g,
      `<tbody>${resultsRows}</tbody>`
    );
  }
  try {
    const cls = student.current_class || "";
    const isPrimary = !isOLevelClass(cls) && !isALevelClass(cls);
    if (isPrimary) {
      processedHtml = processedHtml.replace(/\[DAYS_PRESENT\]/g, "").replace(/\[DAYS_ABSENT\]/g, "").replace(/\[TOTAL_DAYS\]/g, "");
      processedHtml = processedHtml.replace(/<table[\s\S]*?<thead>[\s\S]*?<tr>[\s\S]*?<th>\s*Days\s*Present\s*<\/th>[\s\S]*?<th>\s*Days\s*Absent\s*<\/th>[\s\S]*?<th>\s*Total\s*<\/th>[\s\S]*?<\/tr>[\s\S]*?<\/thead>[\s\S]*?<\/table>/i, "");
    }
  } catch {
  }
  return processedHtml;
}
async function convertImageToBase64(url) {
  try {
    if (!url || url.trim() === "") {
      console.log("No image URL provided");
      return null;
    }
    console.log("Converting image to base64:", url);
    const controller = new AbortController();
    const timeout = 3e3;
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      console.log("Image fetch failed:", response.status, response.statusText);
      return null;
    }
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength === 0) {
      console.log("Image buffer is empty");
      return null;
    }
    const base64 = Buffer.from(buffer).toString("base64");
    const contentType = response.headers.get("content-type") || "image/jpeg";
    console.log("Image converted successfully, size:", buffer.byteLength, "bytes, type:", contentType);
    return `data:${contentType};base64,${base64}`;
  } catch (error) {
    console.error("Error converting image to base64:", error);
    return null;
  }
}
function generateTemplate4UpperSectionHTML(reportData, schoolLogoBase64, studentPhotoBase64) {
  const student = reportData?.students?.[0];
  const className = student?.current_class || "";
  if (isALevelClass(className)) {
    return generateTemplate4AlevelHTML(reportData, schoolLogoBase64, studentPhotoBase64);
  }
  return buildTemplate4UpperSectionHTML(reportData, {
    logo: schoolLogoBase64 ?? null,
    photo: studentPhotoBase64 ?? null
  });
}
function generateTemplateNurseryCindrelinahHTML(reportData, schoolLogoBase64, studentPhotoBase64, nurseryAutoComments) {
  void reportData;
  void schoolLogoBase64;
  void studentPhotoBase64;
  void nurseryAutoComments;
  throw new Error(
    "generateTemplateNurseryCindrelinahHTML \u2014 full HTML not yet ported from historical route"
  );
}
function generatePrimaryReportHTML(reportData, schoolLogoBase64, studentPhotoBase64) {
  void reportData;
  void schoolLogoBase64;
  void studentPhotoBase64;
  throw new Error("generatePrimaryReportHTML \u2014 use primary built-in PDF path");
}
function renderTemplateHTML(reportData, templateKey, schoolLogoBase64, studentPhotoBase64) {
  const student = reportData.students[0];
  const className = student?.current_class || "";
  const isLowerSection = /(primary\s*[123]|p\.\s*[123]|p[123])/i.test(className);
  const isUpperSection = /(primary\s*[4567]|p\.\s*[4567]|p[4567])/i.test(className);
  const schoolObj = reportData?.school;
  const usesD082d5bSeniorCards = isOLevelClass(className) || isALevelClass(className) && (templateKey === "template2" || templateKey === "template3");
  if (usesD082d5bSeniorCards) {
    assertSecondaryBuiltinTemplatesAllowed(schoolObj, "renderTemplateHTML");
  }
  if (isOLevelClass(className)) {
    switch (templateKey) {
      case "template1":
        return generateTemplate1OLevelHTML2(reportData, schoolLogoBase64, studentPhotoBase64);
      case "template2":
        return generateTemplate2KasoziHTML2(reportData, schoolLogoBase64, studentPhotoBase64);
      case "template3":
        return generateTemplate3KyoteraHTML2(reportData, schoolLogoBase64, studentPhotoBase64);
      default:
        return generateTemplate1OLevelHTML2(reportData, schoolLogoBase64, studentPhotoBase64);
    }
  }
  if (isALevelClass(className)) {
    if (templateKey === "template6") {
      return generateTemplateNurseryCindrelinahHTML(reportData, schoolLogoBase64, studentPhotoBase64);
    }
    if (templateKey === "template4" || isUpperSection && templateKey !== "template3") {
      return generateTemplate4UpperSectionHTML(reportData, schoolLogoBase64, studentPhotoBase64);
    }
    if (templateKey === "template3" || isLowerSection) {
      return generateTemplate3KyoteraHTML2(reportData, schoolLogoBase64, studentPhotoBase64);
    }
    if (templateKey === "template2") {
      return generateTemplate2KasoziHTML2(reportData, schoolLogoBase64, studentPhotoBase64);
    }
    return generateSecondaryReportHTML(reportData, schoolLogoBase64, studentPhotoBase64);
  }
  if (templateKey === "template6") {
    return generateTemplate2KasoziHTML2(reportData, schoolLogoBase64, studentPhotoBase64);
  }
  if (templateKey === "template4" || isUpperSection) {
    return generateTemplate4UpperSectionHTML(reportData, schoolLogoBase64, studentPhotoBase64);
  }
  if (templateKey === "template3" || isLowerSection) {
    return generateTemplate3KyoteraHTML2(reportData, schoolLogoBase64, studentPhotoBase64);
  }
  if (templateKey === "template2") {
    return generateTemplate2KasoziHTML2(reportData, schoolLogoBase64, studentPhotoBase64);
  }
  return generateSecondaryReportHTML(reportData, schoolLogoBase64, studentPhotoBase64);
}
var NURSERY_PERFORMANCE_OPTIONS3, NURSERY_PERFORMANCE_COLOR_MAP3, NURSERY_PERFORMANCE_NORMALIZED_MAP2, NURSERY_SKILL_GRID2;
var init_templateHTMLGenerator = __esm({
  "src/services/templateHTMLGenerator.ts"() {
    "use strict";
    init_supabase();
    init_reportHeaderBrandingDefaults();
    init_reportUtils();
    init_helpers();
    init_legacySecondaryPdfTemplatesFrom3918d26();
    init_template4AlevelHtml();
    init_reportSecondaryBuiltinGuards();
    init_primaryPdfBuiltins();
    init_legacySecondaryPdfTemplatesFrom3918d26();
    NURSERY_PERFORMANCE_OPTIONS3 = [
      { label: "Very Good", color: "#4CAF50" },
      { label: "Good", color: "#42A5F5" },
      { label: "Tries", color: "#FFEB3B" },
      { label: "Still a Problem", color: "#FF7043" },
      { label: "Promising", color: "#BA68C8" }
    ];
    NURSERY_PERFORMANCE_COLOR_MAP3 = NURSERY_PERFORMANCE_OPTIONS3.reduce((acc, option) => {
      acc[option.label] = option.color;
      return acc;
    }, {});
    NURSERY_PERFORMANCE_NORMALIZED_MAP2 = (() => {
      const map = /* @__PURE__ */ new Map();
      const addVariant = (label, ...variants) => {
        variants.forEach((variant) => {
          map.set(variant, label);
        });
      };
      NURSERY_PERFORMANCE_OPTIONS3.forEach(({ label }) => {
        const normalized = label.trim().toLowerCase();
        const collapsed = normalized.replace(/\s+/g, "");
        addVariant(label, normalized, collapsed);
      });
      addVariant("Very Good", "vg");
      addVariant("Good", "g");
      addVariant("Tries", "t");
      addVariant("Still a Problem", "stillaproblem", "still_problem", "sap", "problem", "needsattention");
      addVariant("Promising", "p", "promising", "prom", "progressing");
      return map;
    })();
    NURSERY_SKILL_GRID2 = [
      [
        { key: "toilet", label: "Toilet" },
        { key: "recognition_of_numbers", label: "Recognition of numbers" },
        { key: "property_care", label: "Property care" },
        { key: "handling_of_pencil", label: "Handling of pencil" },
        { key: "re_sighting_alphabet", label: "Re-sighting Alphabet" },
        { key: "attention_span", label: "Attention span" },
        { key: "punctuality", label: "Punctuality" },
        { key: "shading", label: "Shading" }
      ],
      [
        { key: "nose_care", label: "Nose care" },
        { key: "recognition_of_shapes", label: "Recognition of shapes" },
        { key: "respect", label: "Respect" },
        { key: "arrival_time", label: "Arrival time" },
        { key: "counting_number_sequence", label: "Counting number sequence" },
        { key: "re_sighting_poems", label: "Re-sighting Poems" },
        { key: "love_or_interest", label: "Love or Interest" },
        { key: "drawing", label: "Drawing" }
      ],
      [
        { key: "recognition_of_letters", label: "Recognition of letters" },
        { key: "sharing", label: "Sharing" },
        { key: "friendship", label: "Friendship" },
        { key: "colours", label: "Colours" },
        { key: "playing", label: "Playing" },
        { key: "emotional", label: "Emotional" },
        { key: "smartness", label: "Smartness" },
        { key: "placeholder", label: "" }
      ]
    ];
  }
});

// api/pdf/_generate.ts
init_primaryPdfBuiltins();
init_prePrimaryHolisticPdfMarkup();
init_reportImageDataUrl();
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import { createClient as createClient2 } from "@supabase/supabase-js";

// src/lib/reportImagePdfOptimize.node.ts
import sharp from "sharp";
var REPORT_EMBED_MAX_EDGE = 480;
var REPORT_EMBED_QUALITY_START = 52;
var REPORT_EMBED_QUALITY_FLOOR = 42;
var SKILL_EMBED_MAX_EDGE = 110;
var SKILL_EMBED_QUALITY_START = 34;
var SKILL_EMBED_QUALITY_FLOOR = 22;
function parseDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl.trim());
  if (!m) return null;
  const mime = m[1].trim();
  const b64 = m[2].replace(/\s/g, "");
  try {
    return { mime, buffer: Buffer.from(b64, "base64") };
  } catch {
    return null;
  }
}
async function resizeToJpegEdge(input, maxEdge, qualityStart, qualityFloor, targetMaxBytes, options) {
  const meta = await sharp(input).metadata();
  const w = meta.width ?? maxEdge;
  const h = meta.height ?? maxEdge;
  const scale = Math.min(1, maxEdge / Math.max(w, h));
  const tw = Math.max(1, Math.round(w * scale));
  const th = Math.max(1, Math.round(h * scale));
  let q = qualityStart;
  let lastBuf = null;
  for (let i = 0; i < 10; i++) {
    let pipeline = sharp(input).rotate().resize(tw, th, { fit: "inside", withoutEnlargement: true });
    if (options?.flattenAlphaToWhite) {
      pipeline = pipeline.flatten({ background: { r: 255, g: 255, b: 255 } });
    }
    lastBuf = await pipeline.jpeg({ quality: q, mozjpeg: true }).toBuffer();
    if (lastBuf.length <= targetMaxBytes || q <= qualityFloor) break;
    q = Math.max(qualityFloor, Math.floor(q * 0.88));
  }
  const b64 = (lastBuf ?? Buffer.alloc(0)).toString("base64");
  return `data:image/jpeg;base64,${b64}`;
}
var REPORT_EMBED_TARGET_BYTES = 70 * 1024;
async function optimizeDataUrlForReportPdfNode(dataUrl) {
  if (dataUrl == null || String(dataUrl).trim() === "") return dataUrl;
  const parsed = parseDataUrl(String(dataUrl));
  if (!parsed?.buffer.length) return dataUrl;
  try {
    return await resizeToJpegEdge(
      parsed.buffer,
      REPORT_EMBED_MAX_EDGE,
      REPORT_EMBED_QUALITY_START,
      REPORT_EMBED_QUALITY_FLOOR,
      REPORT_EMBED_TARGET_BYTES
    );
  } catch {
    return dataUrl;
  }
}
async function optimizeReportPhotosForPdfNode(data) {
  const [logo, photo] = await Promise.all([
    optimizeDataUrlForReportPdfNode(data.logo),
    optimizeDataUrlForReportPdfNode(data.photo)
  ]);
  return { logo, photo };
}
var SKILL_EMBED_TARGET_BYTES = 11 * 1024;
async function optimizePrePrimarySkillDataUrlForPdfNode(dataUrl) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed?.buffer.length) return dataUrl;
  try {
    return await resizeToJpegEdge(
      parsed.buffer,
      SKILL_EMBED_MAX_EDGE,
      SKILL_EMBED_QUALITY_START,
      SKILL_EMBED_QUALITY_FLOOR,
      SKILL_EMBED_TARGET_BYTES,
      { flattenAlphaToWhite: true }
    );
  } catch {
    return dataUrl;
  }
}
async function optimizePrePrimarySkillImageDataUrlMapNode(map) {
  const keys = Object.keys(map);
  const out = { ...map };
  await Promise.all(
    keys.map(async (k) => {
      const v = map[k];
      if (typeof v === "string" && v.startsWith("data:")) {
        out[k] = await optimizePrePrimarySkillDataUrlForPdfNode(v);
      }
    })
  );
  return out;
}

// api/pdf/_generate.ts
function cssPxToMm(px) {
  return px * 25.4 / 96;
}
function isOLevelClassNameForPdf(className) {
  if (!className || typeof className !== "string") return false;
  return /^(senior\s*[1-4]|s\.?\s*[1-4])\b/i.test(className.trim());
}
function isALevelClassNameForPdf(className) {
  if (!className || typeof className !== "string") return false;
  return /^(senior\s*[56]|s\.?\s*[56])\b/i.test(className.trim());
}
function normalizeSecondaryTemplateKeyForPdf(className, templateKey) {
  const t = typeof templateKey === "string" && /^template[1-6]$/.test(templateKey) ? templateKey : "template1";
  if (isALevelClassNameForPdf(className)) {
    return "template4";
  }
  if (isOLevelClassNameForPdf(className)) {
    if (t === "template2" || t === "template3") return t;
    return "template1";
  }
  return "template1";
}
async function pdfOptionsOlevelPerCardPage(page, n) {
  try {
    if (typeof page.emulateMediaType === "function") {
      await page.emulateMediaType("print");
      await new Promise((r) => setTimeout(r, 75));
    }
  } catch {
  }
  const dims = await page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    const width = Math.max(body.scrollWidth, html.scrollWidth, body.offsetWidth, 1);
    const height = Math.max(body.scrollHeight, html.scrollHeight, body.offsetHeight, 1);
    return { width, height };
  });
  const widthMm = Math.min(Math.max(Math.ceil(cssPxToMm(dims.width)), 210), 220);
  const perCardHeightPx = dims.height / Math.max(n, 1);
  const heightMm = Math.ceil(cssPxToMm(perCardHeightPx)) + 16;
  return {
    width: `${widthMm}mm`,
    height: `${heightMm}mm`,
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" }
  };
}
var config = { maxDuration: 60 };
function renderReportHTML(templateHtml, templateCss, reportData) {
  const student = reportData.students?.[0];
  const school = reportData.school || {};
  const examSet = reportData.examSet || {};
  if (!student) throw new Error("No student in report data");
  let subjectsHtml = "";
  if (Array.isArray(student.results)) {
    subjectsHtml = student.results.map(
      (r) => `<tr><td>${r.subject ?? ""}</td><td>${r.marks_obtained ?? ""}</td><td>${r.total_marks ?? 100}</td><td>${r.grade ?? ""}</td><td>${r.remarks ?? ""}</td></tr>`
    ).join("");
  }
  const placeholders = {
    SCHOOL_NAME: school.name ?? "",
    SCHOOL_ADDRESS: school.address ?? "",
    SCHOOL_PHONE: school.phone ?? school.contact_phone ?? "",
    SCHOOL_EMAIL: school.email ?? school.contact_email ?? "",
    SCHOOL_MOTTO: school.motto ?? "",
    STUDENT_NAME: student.name ?? "",
    STUDENT_ID: student.admission_number ?? student.student_id ?? "",
    STUDENT_CLASS: student.current_class ?? "",
    EXAM_SET_NAME: examSet.name ?? "",
    EXAM_TERM: examSet.term ?? "",
    EXAM_YEAR: examSet.year ?? "",
    TOTAL_MARKS: student.summary?.totalMarks ?? "",
    AVERAGE: student.summary?.average != null && student.summary?.average !== "" ? formatAverageForPdf(student.summary.average) : "",
    AGGREGATE: student.summary?.aggregate != null ? String(student.summary.aggregate) : "",
    DIVISION: student.summary?.division ?? "",
    POSITION: student.summary?.classPosition ?? "",
    TOTAL_STUDENTS: student.summary?.totalStudents ?? "",
    ATTENDANCE_PERCENTAGE: student.summary?.attendancePercentage ?? "",
    FEES_BALANCE: student.fees?.balance ?? 0,
    FEES_PAID: student.fees?.paid ?? 0,
    FEES_EXPECTED: student.fees?.expected ?? 0,
    CLASS_TEACHER_COMMENT: student.comments?.class_teacher_text ?? "",
    HEADTEACHER_COMMENT: student.comments?.headteacher_text ?? "",
    SUBJECTS_TABLE: subjectsHtml
  };
  let processedHtml = templateHtml;
  let processedCss = templateCss || "";
  for (const [key, value] of Object.entries(placeholders)) {
    const regex = new RegExp(`\\[${key}\\]`, "g");
    const str = value !== null && value !== void 0 ? String(value) : "";
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
var PDF_NURSERY_FALLBACK_STRANDS = [
  {
    subject: "Relating with others (Social development)",
    skills: [
      { key: "relating_with_others", label: "Relating with others" },
      { key: "games", label: "Games" },
      { key: "helping", label: "Helping others" }
    ]
  },
  {
    subject: "Relating and knowing my environment (Language I)",
    skills: [
      { key: "naming", label: "Naming" },
      { key: "cleanliness", label: "Cleanliness" },
      { key: "caring_for_the_environment", label: "Caring for the environment" }
    ]
  },
  {
    subject: "Taking care of myself (Health habits)",
    skills: [
      { key: "taking_care_of_myself", label: "Taking care of myself" },
      { key: "toilet_habits", label: "Toilet habits" },
      { key: "body_hygiene", label: "Body hygiene" }
    ]
  },
  {
    subject: "Development and using mathematical concepts",
    skills: [
      { key: "reciting_numbers", label: "Reciting numbers" },
      { key: "counting_concepts", label: "Counting concepts" },
      { key: "addition_concepts", label: "Additional concepts" }
    ]
  },
  {
    subject: "Development and using language (Language II)",
    skills: [
      { key: "drawing", label: "Drawing" },
      { key: "reading", label: "Reading" },
      { key: "writing", label: "Writing" }
    ]
  }
];
var PDF_NURSERY_GRADE_ENUMS = /* @__PURE__ */ new Set(["VERY_GOOD", "GOOD", "NEEDS_IMPROVEMENT", "TRIES"]);
var PDF_NURSERY_ENUM_LABEL = {
  VERY_GOOD: "Very Good",
  GOOD: "Good",
  NEEDS_IMPROVEMENT: "Needs Improvement",
  TRIES: "Tries"
};
var PDF_NURSERY_ENUM_COLOR = {
  VERY_GOOD: "#c0392b",
  GOOD: "#d4ac0d",
  NEEDS_IMPROVEMENT: "#1a7a35",
  TRIES: "#1a5fa0"
};
var PDF_NURSERY_LEGACY_SKILL_ALIASES = {
  attendance: "writing",
  development_and_using_language: "drawing"
};
function pdfNormalizeNurseryGrade(raw) {
  if (raw === null || raw === void 0) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const asEnum = s.toUpperCase().replace(/\s+/g, "_");
  if (PDF_NURSERY_GRADE_ENUMS.has(asEnum)) return asEnum;
  const low = s.toLowerCase();
  const direct = {
    "very good": "VERY_GOOD",
    good: "GOOD",
    "needs improvement": "NEEDS_IMPROVEMENT",
    tries: "TRIES"
  };
  if (direct[low]) return direct[low];
  const collapsed = low.replace(/\s/g, "");
  const alias = {
    verygood: "VERY_GOOD",
    needsimprovement: "NEEDS_IMPROVEMENT"
  };
  return alias[collapsed] ?? null;
}
function pdfParseNurserySkillGrade(perf, skillKey) {
  if (!perf || typeof perf !== "object" || Array.isArray(perf)) return null;
  const p = perf;
  const legacyKey = Object.entries(PDF_NURSERY_LEGACY_SKILL_ALIASES).find(([, v]) => v === skillKey)?.[0];
  const raw = p[skillKey] ?? (legacyKey ? p[legacyKey] : void 0) ?? (skillKey === "writing" ? p.attendance : void 0) ?? (skillKey === "drawing" ? p.development_and_using_language : void 0);
  return pdfNormalizeNurseryGrade(raw);
}
function isDefaultPlaceholderTemplate(htmlContent) {
  if (!htmlContent || typeof htmlContent !== "string") return true;
  const t = htmlContent.trim();
  return t.length < 400 || /default\s*report\s*template|this is a default template created automatically/i.test(t);
}
async function primaryTemplateHtmlWithOptimizedPhotos(reportData, which) {
  let { logo, photo } = await resolveSchoolAndStudentPhotosForReportData(reportData);
  ({ logo, photo } = await optimizeReportPhotosForPdfNode({ logo, photo }));
  const embed = { logo, photo };
  return which === "lower" ? buildTemplate3LowerSectionHTML(reportData, embed) : buildTemplate4UpperSectionHTML(reportData, embed);
}
async function buildPrePrimaryNurseryPDFHTML(reportData) {
  const student = reportData.students?.[0];
  const school = reportData.school || {};
  const examSet = reportData.examSet || {};
  if (!student) throw new Error("No student in report data");
  let { logo: schoolLogoDataUrl, photo: studentPhotoDataUrl } = await resolveSchoolAndStudentPhotosForReportData(
    reportData
  );
  ({ logo: schoolLogoDataUrl, photo: studentPhotoDataUrl } = await optimizeReportPhotosForPdfNode({
    logo: schoolLogoDataUrl,
    photo: studentPhotoDataUrl
  }));
  const schoolName = school.name ?? "School Name";
  const schoolSubtitle = school.subtitle ?? "";
  const schoolAddress = school.address ?? "";
  const schoolPobox = school.pobox ?? "";
  const schoolMotto = school.motto ?? "";
  const logoUrl = school.logo_url ?? school.logo ?? "";
  const logoSrcForPdf = (typeof schoolLogoDataUrl === "string" && schoolLogoDataUrl.trim() ? schoolLogoDataUrl : typeof logoUrl === "string" && String(logoUrl).trim() ? String(logoUrl) : "") || "";
  const schoolContactHtmlLower = schoolContactBlockHtml(school);
  const term = examSet.term ?? "";
  const year = examSet.year ?? "";
  const examName = examSet.name ?? "";
  const streamDisplay = student.stream ?? student.current_stream ?? student.stream_name ?? student.class_stream ?? "N/A";
  const reportDateDisplay = (() => {
    const raw = examSet.date ?? student.report_date ?? student.summary?.reportDate;
    if (!raw) return "N/A";
    const d = new Date(raw);
    return isNaN(d.getTime()) ? String(raw) : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  })();
  const photoUrl = student.profile_photo ?? student.photo_url ?? student.student_photo_url ?? "";
  const photoSrcForPdf = (typeof studentPhotoDataUrl === "string" && studentPhotoDataUrl.trim() ? studentPhotoDataUrl : typeof photoUrl === "string" && photoUrl.trim() ? photoUrl : "") || "";
  const hasPhoto = photoSrcForPdf.length > 0;
  const imgAttr = (src) => src.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  const resultsForComments = Array.isArray(student.results) ? student.results : [];
  const endResultsForComments = resultsForComments.filter((r) => {
    const name = String(r.exam_set_name || r.exam_set || "").toLowerCase();
    return name.includes("end") || name.includes("final") || name.includes("eot");
  });
  const endOfTermResultForPdf = endResultsForComments.find((r) => r.headteacher_comment || r.class_teacher_comment) || endResultsForComments[0] || resultsForComments[0] || null;
  const classTeacherCommentRaw = (endOfTermResultForPdf?.class_teacher_comment ?? student.comments?.class_teacher_text ?? student.comments?.class_teacher_comment ?? student.class_teacher_comment ?? "").toString().trim();
  const headTeacherCommentRaw = (endOfTermResultForPdf?.headteacher_comment ?? student.comments?.head_teacher_text ?? student.comments?.head_teacher_comment ?? student.comments?.headteacher_text ?? student.head_teacher_comment ?? "").toString().trim();
  const classTeacherComment = classTeacherCommentRaw;
  const headTeacherComment = headTeacherCommentRaw;
  const nextTermBegins = student.next_term_begins_date ? new Date(student.next_term_begins_date).toLocaleDateString() : "TBA";
  const feesBalance = student.feesBalance ?? student.fees?.balance ?? 0;
  const feesFormatted = typeof feesBalance === "number" ? new Intl.NumberFormat("en-UG", { style: "currency", currency: "UGX", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(feesBalance) : String(feesBalance);
  const results = Array.isArray(student.results) ? student.results : [];
  const prePrimaryMode = reportData.prePrimaryReportMode ?? "colour";
  let checklistHtml;
  let legendHtml;
  if (prePrimaryMode === "detailed") {
    const flatCells = [];
    for (const strand of PDF_NURSERY_FALLBACK_STRANDS) {
      strand.skills.forEach((skill, i) => {
        flatCells.push({ strand: strand.subject, skill, isFirst: i === 0 });
      });
    }
    checklistHtml = flatCells.map(({ strand, skill, isFirst }) => {
      const row = results.find((r) => String(r.subject || "").trim() === strand.trim());
      const gradeEnum = pdfParseNurserySkillGrade(row?.nursery_skill_performance, skill.key);
      const label = gradeEnum ? PDF_NURSERY_ENUM_LABEL[gradeEnum] ?? "\u2014" : "\u2014";
      const fill = gradeEnum ? PDF_NURSERY_ENUM_COLOR[gradeEnum] ?? "#e2e8f0" : "#f8fafc";
      const dot = gradeEnum ? PDF_NURSERY_ENUM_COLOR[gradeEnum] ?? "#94a3b8" : "#cbd5e1";
      const strandHdr = isFirst ? `<div style="font-size:6.5pt;font-weight:700;color:#1e40af;margin:0 0 2px;line-height:1.15">${escapeHtmlText(strand)}</div>` : "";
      return `<div class="nursery-cell" style="background:${fill};">
      ${strandHdr}
      <div class="nursery-skill-name">${escapeHtmlText(skill.label)}</div>
      <div class="nursery-rating"><span class="nursery-dot" style="background:${dot};"></span>${escapeHtmlText(label)}</div>
    </div>`;
    }).join("");
    legendHtml = ["VERY_GOOD", "GOOD", "NEEDS_IMPROVEMENT", "TRIES"].map((e) => {
      const col = PDF_NURSERY_ENUM_COLOR[e];
      const lab = PDF_NURSERY_ENUM_LABEL[e];
      return `<span><span class="nursery-dot" style="background:${col};"></span>${escapeHtmlText(lab)}</span>`;
    }).join("");
  } else {
    await injectPrePrimarySkillImageDataUrlsForPdf(reportData);
    if (reportData.prePrimarySkillImageDataUrlsByKey) {
      reportData.prePrimarySkillImageDataUrlsByKey = await optimizePrePrimarySkillImageDataUrlMapNode(
        reportData.prePrimarySkillImageDataUrlsByKey
      );
    }
    const o = prePrimaryHolisticChecklistToStaticHtml(reportData);
    checklistHtml = o.gridHtml;
    legendHtml = o.legendHtml;
  }
  const pdfHdrRoot = pdfPrimaryHeaderRootVars(school);
  const badgeTitle = `${String(student.current_class || "Pre-primary").toUpperCase()} \u2013 TERMLY REPORT`;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Student Report - Pre-primary</title>
  <style>
    @page { size: A4; margin: 0; }
    ${pdfHdrRoot}
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 10.2pt; line-height: 1.3; color: #1e293b; background: #fff; }
    .report-page { width: 100%; max-width: 210mm; margin: 0 auto; padding: 3mm 4.5mm 3mm 4.5mm; box-sizing: border-box; }
    .header-wrap { display: flex; align-items: flex-start; margin-bottom: 3mm; }
    .logo-cell { width: 132px; height: 132px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border: 1px solid #e2e8f0; border-radius: 4px; overflow: hidden; background: #f8fafc; }
    .logo-cell img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .school-center { flex: 1; text-align: center; margin-left: 12px; }
    .school-name { font-size: 20pt; font-weight: 700; font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: 0.04em; color: var(--pdf-hdr-name); margin-bottom: 3px; }
    .school-subtitle { font-size: 11pt; color: var(--pdf-hdr-subtitle); margin-bottom: 2px; }
    .school-address { font-size: 11pt; font-weight: 600; color: var(--pdf-hdr-address); margin-bottom: 2px; }
    .school-contact { font-size: 11pt; font-weight: 600; color: var(--pdf-hdr-contact); margin-bottom: 2px; }
    .school-motto { font-size: 9.8pt; font-style: italic; font-weight: 600; color: var(--pdf-hdr-motto); }
    .divider { height: 1px; background: linear-gradient(to right, var(--pdf-hdr-divider) 0%, var(--pdf-hdr-divider-mid) 50%, var(--pdf-hdr-divider) 100%); margin: 3mm 0 3mm; }
    .badge-wrap { text-align: center; margin-bottom: 2mm; }
    .badge { display: inline-block; padding: 6px 18px; border-radius: 16px; font-size: 9pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: var(--pdf-hdr-chip-text); background: var(--pdf-hdr-chip-bg); border: 1px solid var(--pdf-hdr-chip-border); }
    .exam-sub { font-size: 7.4pt; color: var(--pdf-hdr-meta); margin-top: 2px; }
    .student-block { display: flex; justify-content: space-between; align-items: flex-start; padding: 6px 10px; border: 1px solid #bfdbfe; border-radius: 8px; margin-bottom: 2mm; background: #f8fafc; min-height: 26mm; }
    .student-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 10px; font-size: 9.6pt; }
    .student-grid strong { color: #1e3a8a; }
    .photo-cell { width: 2.1cm; height: 2.9cm; border: 1px solid #bfdbfe; border-radius: 4px; background: #fff; display: flex; align-items: center; justify-content: center; overflow: hidden; flex-shrink: 0; }
    .photo-cell img { width: 100%; height: 100%; object-fit: cover; }
    .nursery-section-title { font-size: 8.6pt; font-weight: 700; color: #1e3a8a; margin: 1mm 0 1mm; text-transform: uppercase; }
    .nursery-checklist { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px; margin-bottom: 2mm; }
    .nursery-cell { border: 1px solid #bfdbfe; border-radius: 4px; padding: 3px 4px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .nursery-skill-name { font-weight: 600; color: #0f172a; font-size: 6.8pt; text-transform: uppercase; margin-bottom: 2px; line-height: 1.12; }
    .nursery-rating { font-size: 6.6pt; font-weight: 600; color: #0f172a; line-height: 1.2; }
    .nursery-dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 3px; vertical-align: middle; border: 1px solid rgba(15,23,42,0.35); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .nursery-legend { display: flex; flex-wrap: wrap; gap: 8px 14px; font-size: 6.8pt; margin-bottom: 2mm; font-weight: 600; color: #0f172a; }
    .nursery-legend span { display: inline-flex; align-items: center; gap: 3px; }
    .comments-box { border: 1px solid #bfdbfe; border-radius: 8px; padding: 6px 8px; margin-bottom: 0; font-size: 8.1pt; background: #fff; }
    .comments-box h3 { font-size: 8.4pt; font-weight: 600; text-transform: uppercase; margin-bottom: 2px; color: #1e3a8a; }
    .comments-box .comment-p { margin-bottom: 2px; line-height: 1.2; color: #334155; }
    .comments-box .signature { font-size: 7.5pt; margin-top: 2px; color: #64748b; }
    .next-term-fees { display: flex; justify-content: space-between; align-items: center; flex-wrap: nowrap; width: 100%; padding-top: 4px; margin-top: 4px; border-top: 1px solid #bfdbfe; font-size: 7.9pt; box-sizing: border-box; }
    .next-term-fees strong { color: #1e3a8a; }
    .report-footer-in-card { text-align: center; font-size: 6.4pt; line-height: 1.15; margin: 3px 0 0; padding-top: 3px; border-top: 1px solid #bfdbfe; color: #64748b; }
  </style>
</head>
<body>
  <div class="report-page">
  <div class="header-wrap">
    <div class="logo-cell">${logoSrcForPdf ? `<img src="${imgAttr(logoSrcForPdf)}" alt="School Logo" />` : '<span style="font-size:9pt;color:#94a3b8">School<br/>Logo</span>'}</div>
    <div class="school-center">
      <div class="school-name">${escapeHtmlText(schoolName)}</div>
      ${schoolSubtitle ? `<div class="school-subtitle">${escapeHtmlText(schoolSubtitle)}</div>` : ""}
      ${schoolAddress || schoolPobox ? `<div class="school-address">${escapeHtmlText([schoolAddress, schoolPobox].filter(Boolean).join(" "))}</div>` : ""}
      ${schoolContactHtmlLower}
      ${schoolMotto ? `<div class="school-motto">"${escapeHtmlText(schoolMotto)}"</div>` : ""}
    </div>
  </div>
  <div class="divider"></div>
  <div class="badge-wrap">
    <div class="badge">${escapeHtmlText(badgeTitle)}</div>
    <div class="exam-sub">${escapeHtmlText(examName || "Term Report")} - ${escapeHtmlText(String(year || (/* @__PURE__ */ new Date()).getFullYear()))}</div>
  </div>
  <div class="student-block">
    <div class="student-grid">
      <div><strong>Name:</strong> ${escapeHtmlText(student.name ?? "")}</div>
      <div><strong>Class:</strong> ${escapeHtmlText(student.current_class ?? "")}</div>
      <div><strong>Age (years):</strong> ${escapeHtmlText(pdfStudentAgeYearsLabel(student, examSet))}</div>
      <div><strong>Admission No:</strong> ${escapeHtmlText(String(student.admission_number ?? student.student_id ?? "N/A"))}</div>
      <div><strong>Term:</strong> ${escapeHtmlText(String(term || "N/A"))} / ${escapeHtmlText(String(year || (/* @__PURE__ */ new Date()).getFullYear()))}</div>
      <div><strong>Stream:</strong> ${escapeHtmlText(String(streamDisplay))}</div>
      <div><strong>Date:</strong> ${escapeHtmlText(reportDateDisplay)}</div>
    </div>
    <div class="photo-cell">${hasPhoto ? `<img src="${imgAttr(photoSrcForPdf)}" alt="Student photo" width="80" height="105" style="object-fit:cover;display:block;" />` : '<span style="font-size:8pt;color:#94a3b8">Photo</span>'}</div>
  </div>
  <div class="nursery-checklist-wrap" style="margin-bottom:2mm;">${checklistHtml}</div>
  <div class="nursery-legend-wrap" style="margin-bottom:2mm;">${legendHtml}</div>
  <div class="comments-box">
    <h3>Class Teacher's Comments</h3>
    <p class="comment-p">${escapeHtmlText(classTeacherComment)}</p>
    <div class="signature">Signature: ____________________</div>
    <h3>Headteacher's Comments</h3>
    <p class="comment-p">${escapeHtmlText(headTeacherComment)}</p>
    <div class="signature">Signature: ____________________</div>
    <div class="next-term-fees">
      <div><strong>Next term begins on:</strong> ${escapeHtmlText(nextTermBegins)}</div>
      <div><strong>Fees Balance:</strong> ${escapeHtmlText(feesFormatted)}</div>
    </div>
    <div class="report-footer-in-card">Generated by PwezaCore School Management System</div>
  </div>
  </div>
</body>
</html>`;
}
function buildMinimalReportHTML(reportData) {
  const student = reportData.students?.[0];
  const school = reportData.school || {};
  const examSet = reportData.examSet || {};
  if (!student) throw new Error("No student in report data");
  const schoolName = school.name ?? "School Name";
  const schoolAddress = school.address ?? "";
  const schoolPhone = String(
    school.contact_phone ?? school.phone ?? school.school_phone ?? ""
  ).trim();
  const schoolEmail = String(
    school.contact_email ?? school.email ?? school.school_email ?? ""
  ).trim();
  const schoolMotto = school.motto ?? "";
  const term = examSet.term ?? "";
  const year = examSet.year ?? "";
  const examName = examSet.name ?? "";
  const summary = student.summary || {};
  const avg = summary.average != null && summary.average !== void 0 && summary.average !== "" ? `${formatAverageForPdf(summary.average)}%` : "\u2014";
  const position = summary.classPosition != null && summary.totalStudents != null ? `${summary.classPosition} of ${summary.totalStudents}` : summary.classPosition ?? "\u2014";
  const division = summary.division ?? "\u2014";
  const aggregate = summary.aggregate != null ? summary.aggregate : "\u2014";
  let rows = "";
  if (Array.isArray(student.results)) {
    rows = student.results.map((r) => {
      const marks = r.marks_obtained ?? r.final_score ?? "";
      const total = r.total_marks ?? 100;
      const grade = r.grade ?? "";
      const remark = r.overall_remark ?? r.teacher_remark ?? r.remarks ?? "";
      const teacher = r.teacher_initials ?? "";
      return `
          <tr>
            <td>${r.subject ?? ""}</td>
            <td class="text-center">${marks}</td>
            <td class="text-center">${total}</td>
            <td class="text-center">${grade}</td>
            <td>${remark}</td>
            <td class="text-center">${teacher}</td>
          </tr>
        `;
    }).join("");
  }
  const fees = student.fees || {};
  const feesExpected = fees.expected ?? "";
  const feesPaid = fees.paid ?? "";
  const feesBalance = fees.balance ?? "";
  const classTeacherComment = student.comments?.class_teacher_text ?? student.comments?.class_teacher_comment ?? "";
  const headTeacherComment = student.comments?.headteacher_text ?? student.comments?.head_teacher_text ?? student.comments?.head_teacher_comment ?? "";
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
        ${schoolAddress ? `<span>${schoolAddress}</span>` : ""}
        ${(schoolPhone || schoolEmail) && schoolAddress ? " \xB7 " : ""}
        ${schoolPhone ? `<span>Tel: ${schoolPhone}</span>` : ""}
        ${schoolPhone && schoolEmail ? " \xB7 " : ""}
        ${schoolEmail ? `<span>${schoolEmail}</span>` : ""}
      </div>
      ${schoolMotto ? `<div class="school-motto">"${schoolMotto}"</div>` : ""}
    </div>

    <div class="report-title">
      STUDENT'S PROGRESS REPORT ${term && year ? `- TERM ${term}, ${year}` : ""}
      ${examName ? `<span class="badge">${examName}</span>` : ""}
    </div>

    <div class="two-col">
      <div class="info-block">
        <div><span class="info-label">Student:</span> ${student.name ?? ""}</div>
        <div><span class="info-label">Class:</span> ${student.current_class ?? ""}</div>
        <div><span class="info-label">Adm. No:</span> ${student.admission_number ?? student.student_id ?? ""}</div>
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
        <div class="comment-box">${classTeacherComment || ""}</div>
      </div>
      <div class="comment-block">
        <div class="comment-title">Head Teacher's Comment</div>
        <div class="comment-box">${headTeacherComment || ""}</div>
      </div>
    </div>

    <div class="footer-note">
      Generated by PwezaCore \xB7 ${(/* @__PURE__ */ new Date()).toLocaleDateString()}
    </div>
  </div>
</body>
</html>`;
}
var PDF_MULTI_STUDENT_SHEET_HEAD = `
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
function extractBodyContent(fullHtml) {
  const match = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1].trim() : fullHtml;
}
function extractHeadContent(fullHtml) {
  const match = fullHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  return match ? match[1].trim() : "";
}
function sanitizeReportPdfFilenamePart(raw) {
  const s = String(raw ?? "").trim();
  if (!s) return "";
  return s.replace(/[\\/:*?"<>|]+/g, " ").replace(/\s+/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "").slice(0, 80);
}
function buildSingleStudentReportPdfFilename(reportData) {
  const stList = reportData.students;
  const student = Array.isArray(stList) && stList.length > 0 ? stList[0] : void 0;
  const examSet = reportData.examSet || {};
  const name = sanitizeReportPdfFilenamePart(student?.name) || "Student";
  const cls = sanitizeReportPdfFilenamePart(student?.current_class) || "Class";
  const termRaw = examSet.term;
  const term = termRaw != null && termRaw !== "" ? `Term_${sanitizeReportPdfFilenamePart(termRaw)}` : "";
  const examName = sanitizeReportPdfFilenamePart(examSet.name);
  const year = examSet.year != null && examSet.year !== "" ? sanitizeReportPdfFilenamePart(examSet.year) : "";
  const parts = [name, cls, term, examName, year].filter(Boolean);
  const base = (parts.join("_") || "report").slice(0, 180);
  return base.endsWith(".pdf") ? base : `${base}.pdf`;
}
function buildClassBundleReportPdfFilename(reportDataList) {
  const first = reportDataList[0];
  if (!first) return `class_reports_${Date.now()}.pdf`;
  const stList = first.students;
  const student = Array.isArray(stList) && stList.length > 0 ? stList[0] : void 0;
  const examSet = first.examSet || {};
  const cls = sanitizeReportPdfFilenamePart(student?.current_class) || "Class";
  const examSetName = sanitizeReportPdfFilenamePart(examSet.name) || "Exam";
  const termRaw = examSet.term;
  const term = termRaw != null && termRaw !== "" ? sanitizeReportPdfFilenamePart(termRaw) : "";
  const year = examSet.year != null && examSet.year !== "" ? sanitizeReportPdfFilenamePart(examSet.year) : "";
  const pieces = [
    cls,
    "reports",
    examSetName,
    ...term ? [`term_${term}`] : [],
    ...year ? [year] : []
  ];
  const base = pieces.join("_").slice(0, 180);
  const withExt = base.endsWith(".pdf") ? base : `${base}.pdf`;
  return withExt;
}
async function launchBrowser() {
  const safeArgs = [
    ...chromium.args,
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage"
  ];
  const executablePath = await chromium.executablePath().catch(() => void 0);
  try {
    return await puppeteer.launch({ args: safeArgs, executablePath, headless: true });
  } catch {
    return puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-gpu", "--disable-dev-shm-usage"], headless: true });
  }
}
async function generatePDF(options) {
  const { snapshotId, studentIds, templateId, reportData: inlineReportData, schoolId: inlineSchoolId, reportDataList: inlineReportDataList } = options;
  const supabaseUrl2 = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl2 || !supabaseKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in Vercel env.");
  }
  const supabase2 = createClient2(supabaseUrl2, supabaseKey);
  let reportData;
  let schoolIdForTemplate;
  let useBuiltIn;
  let htmlContent = null;
  let cssContent = "";
  let allCachedReports = null;
  if (inlineReportDataList && inlineReportDataList.length > 0) {
    reportData = inlineReportDataList[0];
    schoolIdForTemplate = inlineSchoolId ?? inlineReportDataList[0]?.school?.school_id ?? "";
    allCachedReports = inlineReportDataList.map((rd) => {
      const st = rd.students;
      const first = Array.isArray(st) && st.length > 0 ? st[0] : void 0;
      return {
        report_data: rd,
        student_id: first?.student_id ?? ""
      };
    });
    if (schoolIdForTemplate) {
      const { data: template } = await supabase2.from("report_templates").select("html_content, css_content").eq("school_id", schoolIdForTemplate).eq("is_default", true).limit(1).maybeSingle();
      htmlContent = template?.html_content ?? null;
      cssContent = template?.css_content ?? "";
    } else {
      htmlContent = null;
      cssContent = "";
    }
    useBuiltIn = !htmlContent || typeof htmlContent !== "string" || !htmlContent.trim() || isDefaultPlaceholderTemplate(htmlContent);
  } else if (inlineReportData && Array.isArray(inlineReportData.students) && inlineReportData.students.length > 0) {
    reportData = inlineReportData;
    schoolIdForTemplate = inlineSchoolId ?? inlineReportData.school?.school_id ?? "";
    if (schoolIdForTemplate) {
      const { data: template } = await supabase2.from("report_templates").select("html_content, css_content").eq("school_id", schoolIdForTemplate).eq("is_default", true).limit(1).maybeSingle();
      htmlContent = template?.html_content ?? null;
      cssContent = template?.css_content ?? "";
    } else {
      htmlContent = null;
      cssContent = "";
    }
    useBuiltIn = !htmlContent || typeof htmlContent !== "string" || !htmlContent.trim() || isDefaultPlaceholderTemplate(htmlContent);
  } else {
    if (!snapshotId || typeof snapshotId !== "string") {
      throw new Error("snapshotId is required when reportData is not provided.");
    }
    let q = supabase2.from("generated_reports").select("report_data, student_id").eq("snapshot_id", snapshotId);
    if (studentIds && studentIds.length > 0) q = q.in("student_id", studentIds);
    if (templateId) q = q.eq("template_id", templateId);
    const { data: cachedReports, error: reportsError } = await q;
    if (reportsError) throw reportsError;
    if (!cachedReports || cachedReports.length === 0) {
      throw new Error("No cached reports found. Generate reports first.");
    }
    const first = cachedReports[0];
    reportData = first.report_data;
    allCachedReports = cachedReports;
    const { data: snapshot } = await supabase2.from("report_snapshots").select("school_id").eq("id", snapshotId).single();
    if (!snapshot) throw new Error("Snapshot not found");
    schoolIdForTemplate = snapshot.school_id;
    let templateQuery = supabase2.from("report_templates").select("html_content, css_content").eq("school_id", schoolIdForTemplate);
    if (templateId) templateQuery = templateQuery.eq("id", templateId);
    else templateQuery = templateQuery.eq("is_default", true);
    const { data: template } = await templateQuery.single();
    htmlContent = template?.html_content ?? null;
    cssContent = template?.css_content ?? "";
    useBuiltIn = !htmlContent || typeof htmlContent !== "string" || !htmlContent.trim() || isDefaultPlaceholderTemplate(htmlContent);
    const stList = reportData?.students;
    const student2 = Array.isArray(stList) && stList.length > 0 ? stList[0] : void 0;
    const studentId = first.student_id;
    if (student2 && schoolIdForTemplate) {
      const hasPhoto = student2.profile_photo && String(student2.profile_photo).trim() || student2.photo_url && String(student2.photo_url).trim() || student2.student_photo_url && String(student2.student_photo_url).trim();
      if (!hasPhoto) {
        const { data: photoRow } = await supabase2.from("student_photos").select("photo_url").eq("school_id", schoolIdForTemplate).eq("student_id", studentId).maybeSingle();
        const url = photoRow?.photo_url;
        if (url && String(url).trim()) student2.profile_photo = url;
      }
      const currentBalance = student2.fees?.balance ?? student2.feesBalance ?? null;
      const needsFees = currentBalance == null || currentBalance === 0;
      if (needsFees && studentId) {
        const [studentRes, paymentsRes] = await Promise.all([
          supabase2.from("students").select("expected_fee_amount").eq("student_id", studentId).eq("school_id", schoolIdForTemplate).maybeSingle(),
          supabase2.from("student_payments").select("amount_paid").eq("student_id", studentId).eq("school_id", schoolIdForTemplate)
        ]);
        const expected = Number(studentRes?.data?.expected_fee_amount ?? 0);
        const payments = paymentsRes?.data ?? [];
        const paid = payments.reduce((sum, p) => sum + Number(p?.amount_paid ?? 0), 0);
        const balance = Math.max(0, expected - paid);
        if (!student2.fees) student2.fees = {};
        student2.fees.expected = expected;
        student2.fees.paid = paid;
        student2.fees.balance = balance;
        student2.feesBalance = balance;
      }
    }
    if (allCachedReports.length > 1 && schoolIdForTemplate) {
      const allIds = allCachedReports.map((r) => r.student_id);
      const { data: photoRows } = await supabase2.from("student_photos").select("student_id, photo_url").eq("school_id", schoolIdForTemplate).in("student_id", allIds);
      const photosByStudent = {};
      (photoRows || []).forEach((row) => {
        if (row.photo_url && String(row.photo_url).trim()) photosByStudent[row.student_id] = row.photo_url;
      });
      const { data: studentsRows } = await supabase2.from("students").select("student_id, expected_fee_amount").eq("school_id", schoolIdForTemplate).in("student_id", allIds);
      const expectedByStudent = {};
      (studentsRows || []).forEach((row) => {
        expectedByStudent[row.student_id] = Number(row.expected_fee_amount ?? 0);
      });
      const { data: paymentsRows } = await supabase2.from("student_payments").select("student_id, amount_paid").eq("school_id", schoolIdForTemplate).in("student_id", allIds);
      const paidByStudent = {};
      (paymentsRows || []).forEach((row) => {
        paidByStudent[row.student_id] = (paidByStudent[row.student_id] || 0) + Number(row.amount_paid ?? 0);
      });
      allCachedReports.forEach((item) => {
        const sid = item.student_id;
        const rd = item.report_data;
        const rdStudents = rd.students;
        const st = Array.isArray(rdStudents) && rdStudents.length > 0 ? rdStudents[0] : void 0;
        if (!st) return;
        if (!st.profile_photo && !st.photo_url && !st.student_photo_url && photosByStudent[sid]) {
          st.profile_photo = photosByStudent[sid];
        }
        const currentBal = st.fees?.balance ?? st.feesBalance ?? null;
        if ((currentBal == null || currentBal === 0) && (expectedByStudent[sid] != null || paidByStudent[sid] != null)) {
          const expected = expectedByStudent[sid] ?? 0;
          const paid = paidByStudent[sid] ?? 0;
          const balance = Math.max(0, expected - paid);
          if (!st.fees) st.fees = {};
          st.fees.expected = expected;
          st.fees.paid = paid;
          st.fees.balance = balance;
          st.feesBalance = balance;
        }
      });
    }
  }
  const stListFinal = reportData?.students;
  const student = Array.isArray(stListFinal) && stListFinal.length > 0 ? stListFinal[0] : void 0;
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    const className = student?.current_class ?? "";
    let html;
    if (allCachedReports && allCachedReports.length > 1 && useBuiltIn) {
      const chunks = await Promise.all(
        allCachedReports.map(async (item) => {
          const rd = item.report_data;
          const rdSt = rd.students;
          const rdFirst = Array.isArray(rdSt) && rdSt.length > 0 ? rdSt[0] : void 0;
          const cls = rdFirst?.current_class ?? className;
          return isUpperSectionClass(cls) ? await primaryTemplateHtmlWithOptimizedPhotos(
            rd,
            "upper"
          ) : isLowerSectionPrimary(cls) ? await primaryTemplateHtmlWithOptimizedPhotos(
            rd,
            "lower"
          ) : isPrePrimaryNurseryClassForPdf(cls) ? await buildPrePrimaryNurseryPDFHTML(rd) : buildMinimalReportHTML(rd);
        })
      );
      const firstFullHtml = chunks[0];
      const head = extractHeadContent(firstFullHtml) + PDF_MULTI_STUDENT_SHEET_HEAD;
      const bodyContents = chunks.map(extractBodyContent);
      const combinedBody = bodyContents.map((body) => `<div class="pdf-student-sheet">${body}</div>`).join("\n");
      html = `<!DOCTYPE html>
<html>
<head>
${head}
</head>
<body>
${combinedBody}
</body>
</html>`;
    } else {
      html = useBuiltIn ? isUpperSectionClass(className) ? await primaryTemplateHtmlWithOptimizedPhotos(
        reportData,
        "upper"
      ) : isLowerSectionPrimary(className) ? await primaryTemplateHtmlWithOptimizedPhotos(
        reportData,
        "lower"
      ) : isPrePrimaryNurseryClassForPdf(className) ? await buildPrePrimaryNurseryPDFHTML(reportData) : buildMinimalReportHTML(reportData) : renderReportHTML(htmlContent, cssContent, reportData);
    }
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 3e4 });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "4mm", right: "5mm", bottom: "4mm", left: "5mm" }
    });
    const buffer = Buffer.from(pdf);
    const multiReports = allCachedReports && allCachedReports.length > 1 ? allCachedReports : null;
    const filename = multiReports ? buildClassBundleReportPdfFilename(multiReports.map((r) => r.report_data)) : buildSingleStudentReportPdfFilename(reportData);
    return { buffer, filename };
  } finally {
    await browser.close();
  }
}
function isOLevelClassForSecondaryPdf(className) {
  if (!className || typeof className !== "string") return false;
  return /^(senior\s*[1-4]|s\.?\s*[1-4])\b/i.test(className.trim());
}
function isALevelClassForSecondaryPdf(className) {
  if (!className || typeof className !== "string") return false;
  return /^(senior\s*[56]|s\.?\s*[56])\b/i.test(className.trim());
}
async function generateSecondaryPipelinePdfResponse(reportDataList, templateKey) {
  const [{ renderTemplateHTML: renderTemplateHTML2 }, { resolveSchoolAndStudentPhotosForReportData: resolveSchoolAndStudentPhotosForReportData2 }] = await Promise.all([
    Promise.resolve().then(() => (init_templateHTMLGenerator(), templateHTMLGenerator_exports)),
    Promise.resolve().then(() => (init_reportImageDataUrl(), reportImageDataUrl_exports))
  ]);
  const first = reportDataList[0];
  const st0 = first?.students;
  const student0 = Array.isArray(st0) && st0.length > 0 ? st0[0] : void 0;
  const className0 = String(student0?.current_class ?? "");
  if (!isOLevelClassForSecondaryPdf(className0) && !isALevelClassForSecondaryPdf(className0)) {
    throw new Error("Secondary pipeline supports O-Level / A-Level classes only");
  }
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    const chunks = await Promise.all(
      reportDataList.map(async (rd) => {
        const sts = rd.students;
        const st = Array.isArray(sts) && sts.length > 0 ? sts[0] : void 0;
        const cls = String(st?.current_class ?? className0);
        const key = normalizeSecondaryTemplateKeyForPdf(cls, templateKey);
        let { logo, photo } = await resolveSchoolAndStudentPhotosForReportData2(
          rd
        );
        ({ logo, photo } = await optimizeReportPhotosForPdfNode({ logo, photo }));
        return renderTemplateHTML2(rd, key, logo, photo);
      })
    );
    const firstFullHtml = chunks[0];
    const head = extractHeadContent(firstFullHtml) + PDF_MULTI_STUDENT_SHEET_HEAD;
    const bodyContents = chunks.map(extractBodyContent);
    const combinedBody = bodyContents.map((body) => `<div class="pdf-student-sheet">${body}</div>`).join("\n");
    const html = `<!DOCTYPE html>
<html>
<head>
${head}
</head>
<body>
${combinedBody}
</body>
</html>`;
    await page.setContent(html, { waitUntil: "domcontentloaded", timeout: 3e4 });
    const normalizedKey = normalizeSecondaryTemplateKeyForPdf(className0, templateKey);
    const useOlevelCustomPage = isOLevelClassNameForPdf(className0) || isALevelClassNameForPdf(className0);
    const pdf = await page.pdf(
      useOlevelCustomPage ? await pdfOptionsOlevelPerCardPage(page, reportDataList.length) : {
        format: "A4",
        printBackground: true,
        margin: { top: "0", right: "0", bottom: "0", left: "0" }
      }
    );
    const buffer = Buffer.from(pdf);
    const filename = reportDataList.length > 1 ? buildClassBundleReportPdfFilename(reportDataList) : buildSingleStudentReportPdfFilename(reportDataList[0]);
    return { buffer, filename };
  } finally {
    await browser.close();
  }
}
async function handler(req, res) {
  const sendError = (status, error) => {
    try {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.status(status).json({ error });
    } catch (_) {
    }
  };
  try {
    let isAllowedPdfNavigateOrigin2 = function(origin) {
      try {
        const u = new URL(origin);
        if (u.username || u.password) return false;
        if (u.protocol === "https:") return true;
        if (u.protocol === "http:" && (u.hostname === "localhost" || u.hostname === "127.0.0.1")) return true;
        return false;
      } catch {
        return false;
      }
    };
    var isAllowedPdfNavigateOrigin = isAllowedPdfNavigateOrigin2;
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
    if (req.method !== "POST") {
      return sendError(405, "Method not allowed");
    }
    const body = req.body || {};
    const pdfRenderSessionId = typeof body.pdfRenderSessionId === "string" ? body.pdfRenderSessionId.trim() : "";
    const pdfRenderToken = typeof body.pdfRenderToken === "string" ? body.pdfRenderToken.trim() : "";
    const appOriginNav = typeof body.appOrigin === "string" ? body.appOrigin.trim() : "";
    if (pdfRenderSessionId && pdfRenderToken && appOriginNav) {
      if (!isAllowedPdfNavigateOrigin2(appOriginNav)) {
        return sendError(400, "Invalid appOrigin for PDF navigation");
      }
      const supabaseUrl2 = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl2 || !supabaseKey) {
        return sendError(500, "Missing Supabase configuration");
      }
      const supabase2 = createClient2(supabaseUrl2, supabaseKey);
      const { data: peek, error: peekErr } = await supabase2.from("pdf_render_sessions").select("payload, expires_at").eq("id", pdfRenderSessionId).eq("read_token", pdfRenderToken).maybeSingle();
      if (peekErr) {
        console.error("pdf_render_sessions peek:", peekErr.message);
        return sendError(500, "Failed to validate PDF session");
      }
      if (!peek) {
        return sendError(404, "PDF render session not found");
      }
      const expAt = peek.expires_at ? new Date(String(peek.expires_at)).getTime() : 0;
      if (expAt && expAt < Date.now()) {
        return sendError(410, "PDF render session expired");
      }
      let outName = typeof body.pdfFilename === "string" && body.pdfFilename.trim() ? body.pdfFilename.trim() : "class_reports.pdf";
      outName = outName.replace(/[/\\?%*:|"<>]/g, "_").slice(0, 180);
      if (!outName.toLowerCase().endsWith(".pdf")) {
        outName += ".pdf";
      }
      const browser = await launchBrowser();
      try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 1600, deviceScaleFactor: 1 });
        const printUrl = `${appOriginNav.replace(/\/$/, "")}/print/heritage-pdf?sessionId=${encodeURIComponent(
          pdfRenderSessionId
        )}&token=${encodeURIComponent(pdfRenderToken)}`;
        await page.goto(printUrl, { waitUntil: "load", timeout: 12e4 });
        await page.waitForSelector('html[data-pdf-ready="1"]', { timeout: 12e4 });
        await page.waitForFunction(
          () => {
            const el = document.querySelector("#report-preview-doc-surface");
            if (!el) return false;
            const h = el.getBoundingClientRect().height;
            const t = (el.textContent || "").replace(/\s+/g, " ").trim().length;
            return h > 80 && t > 30;
          },
          { timeout: 45e3, polling: 200 }
        );
        await page.emulateMediaType("screen");
        const pdf = await page.pdf({
          format: "A4",
          printBackground: true,
          margin: { top: "0", right: "0", bottom: "0", left: "0" }
        });
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${outName.replace(/"/g, "")}"`);
        res.status(200).end(Buffer.from(pdf));
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("PDF heritage navigate error:", message);
        return sendError(500, message || "PDF generation failed");
      } finally {
        await browser.close();
      }
    }
    if (body.htmlContent && typeof body.htmlContent === "string") {
      const browser = await launchBrowser();
      try {
        const page = await browser.newPage();
        await page.setContent(body.htmlContent, { waitUntil: "domcontentloaded", timeout: 3e4 });
        const templateKeyRaw = typeof body.templateKey === "string" && /^template[1-6]$/.test(body.templateKey) ? body.templateKey : "template1";
        const rd = body.reportData ?? (Array.isArray(body.reportDataList) && body.reportDataList.length > 0 ? body.reportDataList[0] : void 0);
        const stList = rd?.students;
        const stFirst = Array.isArray(stList) && stList.length > 0 ? stList[0] : void 0;
        const cls = String(stFirst?.current_class ?? "");
        const reportCountForHtmlPdf = typeof body.htmlPdfReportCount === "number" && body.htmlPdfReportCount >= 1 ? body.htmlPdfReportCount : Array.isArray(body.reportDataList) && body.reportDataList.length > 0 ? body.reportDataList.length : 1;
        const normalizedKey = normalizeSecondaryTemplateKeyForPdf(cls, templateKeyRaw);
        const useOlevelCustomPage = isOLevelClassNameForPdf(cls) || isALevelClassNameForPdf(cls);
        const pdf = await page.pdf(
          useOlevelCustomPage ? await pdfOptionsOlevelPerCardPage(page, reportCountForHtmlPdf) : {
            format: "A4",
            printBackground: true,
            margin: { top: "0", right: "0", bottom: "0", left: "0" }
          }
        );
        const listForBundleFilename = Array.isArray(body.reportDataList) && body.reportDataList.length > 0 ? body.reportDataList : rd ? [rd] : [];
        const filename2 = rd ? reportCountForHtmlPdf > 1 ? buildClassBundleReportPdfFilename(listForBundleFilename) : buildSingleStudentReportPdfFilename(rd) : "report.pdf";
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename2.replace(/"/g, "")}"`);
        res.status(200).end(Buffer.from(pdf));
        return;
      } finally {
        await browser.close();
      }
    }
    const snapshotId = body.snapshotId;
    const reportData = body.reportData;
    const reportDataList = body.reportDataList;
    const schoolId = body.schoolId;
    const templateKey = typeof body.templateKey === "string" && /^template[1-6]$/.test(body.templateKey) ? body.templateKey : "template1";
    if (body.secondaryPipeline === true) {
      if (!reportDataList || !Array.isArray(reportDataList) || reportDataList.length === 0) {
        return sendError(400, "reportDataList is required for secondary pipeline");
      }
      try {
        const { buffer: pdfBuffer2, filename: filename2 } = await generateSecondaryPipelinePdfResponse(
          reportDataList,
          templateKey
        );
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename2.replace(/"/g, "")}"`);
        res.status(200).end(pdfBuffer2);
        return;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("PDF secondary pipeline error:", message);
        const clientErr = message.includes("Secondary pipeline supports") || message.includes("O-Level / A-Level");
        return sendError(clientErr ? 400 : 500, message);
      }
    }
    if (reportDataList && Array.isArray(reportDataList) && reportDataList.length > 0) {
      const { buffer: pdfBuffer2, filename: filename2 } = await generatePDF({
        reportDataList,
        schoolId: schoolId ?? reportDataList[0]?.school?.school_id
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename2.replace(/"/g, "")}"`);
      res.status(200).end(pdfBuffer2);
      return;
    }
    const bodyStudents = reportData?.students;
    if (reportData && Array.isArray(bodyStudents) && bodyStudents.length > 0) {
      const { buffer: pdfBuffer2, filename: filename2 } = await generatePDF({
        reportData,
        schoolId,
        templateId: body.templateId
      });
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename2.replace(/"/g, "")}"`);
      res.status(200).end(pdfBuffer2);
      return;
    }
    if (!snapshotId || typeof snapshotId !== "string") {
      return sendError(400, "snapshotId is required when reportData is not provided");
    }
    const { buffer: pdfBuffer, filename } = await generatePDF({
      snapshotId,
      studentIds: body.studentIds,
      templateId: body.templateId
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename.replace(/"/g, "")}"`);
    res.status(200).end(pdfBuffer);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("PDF generate error:", message);
    sendError(500, message || "PDF generation failed");
  }
}
export {
  config,
  handler as default
};
