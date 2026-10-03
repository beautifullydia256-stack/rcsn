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
      storage: typeof window !== "undefined" ? isDesktopBuild || isPWAStandalone ? window.localStorage : window.sessionStorage : void 0,
      storageKey: isDesktopBuild || isPWAStandalone ? PERSISTENT_AUTH_KEY : `pwezacore-auth:${getOrCreateTabId()}`
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
var DEFAULT_SUPABASE_URL, DEFAULT_SUPABASE_ANON_KEY, supabaseUrl, supabaseAnonKey, supabaseServiceKey, isBrowser, isDesktopBuild, isPWAStandalone, PERSISTENT_AUTH_KEY, _supabaseInstance, supabase, _supabaseAdminInstance, supabaseAdmin;
var init_supabase = __esm({
  "src/lib/supabase.ts"() {
    "use strict";
    DEFAULT_SUPABASE_URL = "https://npqjrtspgxhuwrljbemz.supabase.co";
    DEFAULT_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wcWpydHNwZ3hodXdybGpiZW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5NjgwNDcsImV4cCI6MjEwNjU0NDA0N30.vyip6RbWLuVGgj1ZrvBqDErpVjCIAPUkNy6VP0fccis";
    supabaseUrl = envStr("NEXT_PUBLIC_SUPABASE_URL") || envStr("VITE_SUPABASE_URL") || envStr("SUPABASE_URL") || import.meta.env.VITE_SUPABASE_URL || import.meta.env.NEXT_PUBLIC_SUPABASE_URL || DEFAULT_SUPABASE_URL;
    supabaseAnonKey = envStr("NEXT_PUBLIC_SUPABASE_ANON_KEY") || envStr("VITE_SUPABASE_ANON_KEY") || envStr("SUPABASE_ANON_KEY") || import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || DEFAULT_SUPABASE_ANON_KEY;
    supabaseServiceKey = getServiceRoleKey();
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Missing Supabase environment variables");
    }
    isBrowser = typeof window !== "undefined";
    isDesktopBuild = import.meta.env.VITE_DESKTOP_MODE === "true";
    isPWAStandalone = isBrowser && !isDesktopBuild && (window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true);
    PERSISTENT_AUTH_KEY = "pwezacore-auth";
    _supabaseInstance = null;
    supabase = createSupabaseClient();
    _supabaseAdminInstance = null;
    supabaseAdmin = createSupabaseAdmin();
  }
});

// src/lib/reportHeaderBrandingDefaults.ts
var init_reportHeaderBrandingDefaults = __esm({
  "src/lib/reportHeaderBrandingDefaults.ts"() {
    "use strict";
  }
});

// src/lib/studentAttendanceRow.ts
var init_studentAttendanceRow = __esm({
  "src/lib/studentAttendanceRow.ts"() {
    "use strict";
  }
});

// src/lib/uaceGradeBands.ts
var init_uaceGradeBands = __esm({
  "src/lib/uaceGradeBands.ts"() {
    "use strict";
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
var init_helpers = __esm({
  "src/components/reports/templates/helpers.ts"() {
    "use strict";
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
  NURSERY_PERFORMANCE_OPTIONS: () => NURSERY_PERFORMANCE_OPTIONS,
  NURSERY_SKILL_GRID: () => NURSERY_SKILL_GRID,
  convertImageToBase64: () => convertImageToBase64,
  generateOLevelReportHTML: () => generateOLevelReportHTML,
  generatePrimaryReportHTML: () => generatePrimaryReportHTML,
  generateSecondaryReportHTML: () => generateSecondaryReportHTML,
  generateTemplate1OLevelHTML: () => generateTemplate1OLevelHTML,
  generateTemplate2KasoziHTML: () => generateTemplate2KasoziHTML,
  generateTemplate3KyoteraHTML: () => generateTemplate3KyoteraHTML,
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
        return generateTemplate1OLevelHTML(reportData, schoolLogoBase64, studentPhotoBase64);
      case "template2":
        return generateTemplate2KasoziHTML(reportData, schoolLogoBase64, studentPhotoBase64);
      case "template3":
        return generateTemplate3KyoteraHTML(reportData, schoolLogoBase64, studentPhotoBase64);
      default:
        return generateTemplate1OLevelHTML(reportData, schoolLogoBase64, studentPhotoBase64);
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
      return generateTemplate3KyoteraHTML(reportData, schoolLogoBase64, studentPhotoBase64);
    }
    if (templateKey === "template2") {
      return generateTemplate2KasoziHTML(reportData, schoolLogoBase64, studentPhotoBase64);
    }
    return generateSecondaryReportHTML(reportData, schoolLogoBase64, studentPhotoBase64);
  }
  if (templateKey === "template6") {
    return generateTemplate2KasoziHTML(reportData, schoolLogoBase64, studentPhotoBase64);
  }
  if (templateKey === "template4" || isUpperSection) {
    return generateTemplate4UpperSectionHTML(reportData, schoolLogoBase64, studentPhotoBase64);
  }
  if (templateKey === "template3" || isLowerSection) {
    return generateTemplate3KyoteraHTML(reportData, schoolLogoBase64, studentPhotoBase64);
  }
  if (templateKey === "template2") {
    return generateTemplate2KasoziHTML(reportData, schoolLogoBase64, studentPhotoBase64);
  }
  return generateSecondaryReportHTML(reportData, schoolLogoBase64, studentPhotoBase64);
}
var generateTemplate1OLevelHTML, generateTemplate2KasoziHTML, generateTemplate3KyoteraHTML, generateSecondaryReportHTML, generateTemplate4AlevelHTML, NURSERY_PERFORMANCE_OPTIONS, NURSERY_PERFORMANCE_COLOR_MAP, NURSERY_PERFORMANCE_NORMALIZED_MAP, NURSERY_SKILL_GRID, generateOLevelReportHTML;
var init_templateHTMLGenerator = __esm({
  "src/services/templateHTMLGenerator.ts"() {
    "use strict";
    init_supabase();
    init_reportHeaderBrandingDefaults();
    init_reportUtils();
    init_helpers();
    init_reportSecondaryBuiltinGuards();
    init_primaryPdfBuiltins();
    generateTemplate1OLevelHTML = (..._args) => "";
    generateTemplate2KasoziHTML = (..._args) => "";
    generateTemplate3KyoteraHTML = (..._args) => "";
    generateSecondaryReportHTML = (..._args) => "";
    generateTemplate4AlevelHTML = (..._args) => "";
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
    NURSERY_PERFORMANCE_NORMALIZED_MAP = (() => {
      const map = /* @__PURE__ */ new Map();
      const addVariant = (label, ...variants) => {
        variants.forEach((variant) => {
          map.set(variant, label);
        });
      };
      NURSERY_PERFORMANCE_OPTIONS.forEach(({ label }) => {
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
    generateOLevelReportHTML = (..._args) => "";
  }
});

// api/pdf/_generate.ts
init_primaryPdfBuiltins();
init_reportImageDataUrl();
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";
import fs from "fs";
import { createClient as createClient2 } from "@supabase/supabase-js";

// src/lib/reportImagePdfOptimize.node.ts
import sharp from "sharp";
var REPORT_EMBED_MAX_EDGE = 480;
var REPORT_EMBED_QUALITY_START = 52;
var REPORT_EMBED_QUALITY_FLOOR = 42;
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
    checklistHtml = "";
    legendHtml = "";
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
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage"
  ];
  let executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || (fs.existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : void 0) || (fs.existsSync("/usr/bin/google-chrome-stable") ? "/usr/bin/google-chrome-stable" : void 0) || (fs.existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : void 0) || (fs.existsSync("/usr/bin/chromium-browser") ? "/usr/bin/chromium-browser" : void 0);
  if (!executablePath) {
    try {
      executablePath = await chromium.executablePath();
    } catch {
      executablePath = void 0;
    }
  }
  return await puppeteer.launch({
    args: safeArgs,
    executablePath,
    headless: true
  });
}
async function generatePDF(options) {
  const { snapshotId, studentIds, templateId, reportData: inlineReportData, schoolId: inlineSchoolId, reportDataList: inlineReportDataList } = options;
  const supabaseUrl2 = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ibnyclqobbrnjyxbbfsg.supabase.co";
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlibnljbHFvYmJybmp5eGJiZnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMzA4NTksImV4cCI6MjA3MzYwNjg1OX0.JR5mcF3o8zDsl65KUgeAsPDDAf8qVhla_wm6gTadeVw";
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
      const supabaseUrl2 = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://ibnyclqobbrnjyxbbfsg.supabase.co";
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlibnljbHFvYmJybmp5eGJiZnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMzA4NTksImV4cCI6MjA3MzYwNjg1OX0.JR5mcF3o8zDsl65KUgeAsPDDAf8qVhla_wm6gTadeVw";
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
        const navBase = process.env.PORT ? `http://127.0.0.1:${process.env.PORT}` : appOriginNav.replace(/\/$/, "");
        const printUrl = `${navBase}/print/heritage-pdf?sessionId=${encodeURIComponent(
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
