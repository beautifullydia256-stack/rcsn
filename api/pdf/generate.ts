/**
 * Vercel serverless: POST /api/pdf/generate
 * Generates PDF from cached generated_reports (same logic as api-server).
 * Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel env.
 */

import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { createClient } from '@supabase/supabase-js';
import {
  buildTemplate3LowerSectionHTML,
  buildTemplate4UpperSectionHTML,
  escapeHtmlText,
  formatAverageForPdf,
  pdfStudentAgeYearsLabel,
  pdfPrimaryHeaderRootVars,
  schoolContactBlockHtml,
  isUpperSectionClass,
  isLowerSectionPrimary,
  isPrePrimaryNurseryClassForPdf,
} from '../../src/services/primaryPdfBuiltins';
import {
  injectPrePrimarySkillImageDataUrlsForPdf,
  prePrimaryHolisticChecklistToStaticHtml,
} from '../../src/services/prePrimaryHolisticPdfMarkup';
import { resolveSchoolAndStudentPhotosForReportData } from '../../src/lib/reportImageDataUrl';
import {
  optimizePrePrimarySkillImageDataUrlMapNode,
  optimizeReportPhotosForPdfNode,
} from '../../src/lib/reportImagePdfOptimize.node';

// Inlined from lib/pdfOlevelStandardPage.ts — Vercel bundles api/pdf as ESM and cannot resolve
// ../../lib/pdfOlevelStandardPage (includeFiles copies .ts but Node loads neither .ts nor extensionless).
function cssPxToMm(px: number): number {
  return (px * 25.4) / 96;
}

function isOLevelClassNameForPdf(className: string): boolean {
  if (!className || typeof className !== 'string') return false;
  return /^(senior\s*[1-4]|s\.?\s*[1-4])\b/i.test(className.trim());
}

function isALevelClassNameForPdf(className: string): boolean {
  if (!className || typeof className !== 'string') return false;
  return /^(senior\s*[56]|s\.?\s*[56])\b/i.test(className.trim());
}

function normalizeSecondaryTemplateKeyForPdf(className: string, templateKey: string): string {
  const t =
    typeof templateKey === 'string' && /^template[1-6]$/.test(templateKey) ? templateKey : 'template1';
  if (isALevelClassNameForPdf(className)) {
    return 'template4';
  }
  if (isOLevelClassNameForPdf(className)) {
    if (t === 'template2' || t === 'template3') return t;
    return 'template1';
  }
  return 'template1';
}

async function pdfOptionsOlevelStandardSinglePage(page: {
  emulateMediaType?: (media: 'screen' | 'print') => Promise<void>;
  evaluate: <T>(pageFunction: () => T) => Promise<T>;
}): Promise<{
  width: string;
  height: string;
  printBackground: boolean;
  margin: { top: string; right: string; bottom: string; left: string };
}> {
  try {
    if (typeof page.emulateMediaType === 'function') {
      await page.emulateMediaType('print');
      await new Promise<void>((r) => setTimeout(r, 75));
    }
  } catch {
    /* ignore */
  }
  const dims = await page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    const width = Math.max(body.scrollWidth, html.scrollWidth, body.offsetWidth, 1);
    const height = Math.max(body.scrollHeight, html.scrollHeight, body.offsetHeight, 1);
    return { width, height };
  });
  const widthMm = Math.min(Math.max(Math.ceil(cssPxToMm(dims.width)), 210), 220);
  /** Keep in sync with lib/pdfOlevelStandardPage.ts — extra mm avoids a second page from clipping. */
  const heightMm = Math.ceil(cssPxToMm(dims.height)) + 16;
  return {
    width: `${widthMm}mm`,
    height: `${heightMm}mm`,
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  };
}

function shouldUseOlevelStandardDynamicPdf(
  templateKey: string | undefined,
  className: string,
  reportCount: number
): boolean {
  return (
    reportCount === 1 &&
    templateKey === 'template1' &&
    isOLevelClassNameForPdf(className)
  );
}

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

type PdfNurseryStrand = { subject: string; skills: Array<{ key: string; label: string }> };

/** Mirrors `FALLBACK_PRE_PRIMARY_HOLISTIC_STRANDS` (keep in sync with src/templates/primary/prePrimaryHolisticRatings.ts). */
const PDF_NURSERY_FALLBACK_STRANDS: PdfNurseryStrand[] = [
  {
    subject: 'Relating with others (Social development)',
    skills: [
      { key: 'relating_with_others', label: 'Relating with others' },
      { key: 'games', label: 'Games' },
      { key: 'helping', label: 'Helping others' },
    ],
  },
  {
    subject: 'Relating and knowing my environment (Language I)',
    skills: [
      { key: 'naming', label: 'Naming' },
      { key: 'cleanliness', label: 'Cleanliness' },
      { key: 'caring_for_the_environment', label: 'Caring for the environment' },
    ],
  },
  {
    subject: 'Taking care of myself (Health habits)',
    skills: [
      { key: 'taking_care_of_myself', label: 'Taking care of myself' },
      { key: 'toilet_habits', label: 'Toilet habits' },
      { key: 'body_hygiene', label: 'Body hygiene' },
    ],
  },
  {
    subject: 'Development and using mathematical concepts',
    skills: [
      { key: 'reciting_numbers', label: 'Reciting numbers' },
      { key: 'counting_concepts', label: 'Counting concepts' },
      { key: 'addition_concepts', label: 'Additional concepts' },
    ],
  },
  {
    subject: 'Development and using language (Language II)',
    skills: [
      { key: 'drawing', label: 'Drawing' },
      { key: 'reading', label: 'Reading' },
      { key: 'writing', label: 'Writing' },
    ],
  },
];

const PDF_NURSERY_GRADE_ENUMS = new Set(['VERY_GOOD', 'GOOD', 'NEEDS_IMPROVEMENT', 'TRIES']);

const PDF_NURSERY_ENUM_LABEL: Record<string, string> = {
  VERY_GOOD: 'Very Good',
  GOOD: 'Good',
  NEEDS_IMPROVEMENT: 'Needs Improvement',
  TRIES: 'Tries',
};

const PDF_NURSERY_ENUM_COLOR: Record<string, string> = {
  VERY_GOOD: '#c0392b',
  GOOD: '#d4ac0d',
  NEEDS_IMPROVEMENT: '#1a7a35',
  TRIES: '#1a5fa0',
};

const PDF_NURSERY_LEGACY_SKILL_ALIASES: Record<string, string> = {
  attendance: 'writing',
  development_and_using_language: 'drawing',
};

function pdfNormalizeNurseryGrade(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim();
  if (!s) return null;
  const asEnum = s.toUpperCase().replace(/\s+/g, '_');
  if (PDF_NURSERY_GRADE_ENUMS.has(asEnum)) return asEnum;
  const low = s.toLowerCase();
  const direct: Record<string, string> = {
    'very good': 'VERY_GOOD',
    good: 'GOOD',
    'needs improvement': 'NEEDS_IMPROVEMENT',
    tries: 'TRIES',
  };
  if (direct[low]) return direct[low];
  const collapsed = low.replace(/\s/g, '');
  const alias: Record<string, string> = {
    verygood: 'VERY_GOOD',
    needsimprovement: 'NEEDS_IMPROVEMENT',
  };
  return alias[collapsed] ?? null;
}

function pdfParseNurserySkillGrade(perf: unknown, skillKey: string): string | null {
  if (!perf || typeof perf !== 'object' || Array.isArray(perf)) return null;
  const p = perf as Record<string, unknown>;
  const legacyKey = Object.entries(PDF_NURSERY_LEGACY_SKILL_ALIASES).find(([, v]) => v === skillKey)?.[0];
  const raw =
    p[skillKey] ??
    (legacyKey ? p[legacyKey] : undefined) ??
    (skillKey === 'writing' ? p.attendance : undefined) ??
    (skillKey === 'drawing' ? p.development_and_using_language : undefined);
  return pdfNormalizeNurseryGrade(raw);
}

/** True if DB template is the default placeholder (not a real custom design). */
function isDefaultPlaceholderTemplate(htmlContent: string | null | undefined): boolean {
  if (!htmlContent || typeof htmlContent !== 'string') return true;
  const t = htmlContent.trim();
  return t.length < 400 || /default\s*report\s*template|this is a default template created automatically/i.test(t);
}

/** P.1–P.7 built-ins: inline Sharp-compressed data URLs (same targets as nursery header photos). */
async function primaryTemplateHtmlWithOptimizedPhotos(
  reportData: { school?: Record<string, unknown>; students?: unknown[] },
  which: 'lower' | 'upper'
): Promise<string> {
  let { logo, photo } = await resolveSchoolAndStudentPhotosForReportData(reportData);
  ({ logo, photo } = await optimizeReportPhotosForPdfNode({ logo, photo }));
  const embed = { logo, photo };
  return which === 'lower'
    ? buildTemplate3LowerSectionHTML(reportData, embed)
    : buildTemplate4UpperSectionHTML(reportData, embed);
}

/**
 * Pre-primary (Baby / Middle / Top): same outer shell and typography as lower-primary Template 3 PDF
 * (branded header, student block, comments card) with a compact developmental checklist — one A4 page.
 */
async function buildPrePrimaryNurseryPDFHTML(reportData: any): Promise<string> {
  const student = reportData.students?.[0];
  const school = reportData.school || {};
  const examSet = reportData.examSet || {};
  if (!student) throw new Error('No student in report data');

  let { logo: schoolLogoDataUrl, photo: studentPhotoDataUrl } =
    await resolveSchoolAndStudentPhotosForReportData(
      reportData as { school?: Record<string, unknown>; students?: unknown[] }
    );
  ({ logo: schoolLogoDataUrl, photo: studentPhotoDataUrl } = await optimizeReportPhotosForPdfNode({
    logo: schoolLogoDataUrl,
    photo: studentPhotoDataUrl,
  }));

  const schoolName = (school as any).name ?? 'School Name';
  const schoolSubtitle = (school as any).subtitle ?? '';
  const schoolAddress = (school as any).address ?? '';
  const schoolPobox = (school as any).pobox ?? '';
  const schoolMotto = (school as any).motto ?? '';
  const logoUrl = (school as any).logo_url ?? (school as any).logo ?? '';
  const logoSrcForPdf =
    (typeof schoolLogoDataUrl === 'string' && schoolLogoDataUrl.trim()
      ? schoolLogoDataUrl
      : typeof logoUrl === 'string' && String(logoUrl).trim()
        ? String(logoUrl)
        : '') || '';
  const schoolContactHtmlLower = schoolContactBlockHtml(school as Record<string, unknown>);

  const term = (examSet as any).term ?? '';
  const year = (examSet as any).year ?? '';
  const examName = (examSet as any).name ?? '';

  const streamDisplay =
    (student as any).stream ??
    (student as any).current_stream ??
    (student as any).stream_name ??
    (student as any).class_stream ??
    'N/A';

  const reportDateDisplay = (() => {
    const raw = (examSet as any).date ?? (student as any).report_date ?? (student as any).summary?.reportDate;
    if (!raw) return 'N/A';
    const d = new Date(raw);
    return isNaN(d.getTime()) ? String(raw) : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  })();

  const photoUrl =
    (student as any).profile_photo ?? (student as any).photo_url ?? (student as any).student_photo_url ?? '';
  const photoSrcForPdf =
    (typeof studentPhotoDataUrl === 'string' && studentPhotoDataUrl.trim()
      ? studentPhotoDataUrl
      : typeof photoUrl === 'string' && photoUrl.trim()
        ? photoUrl
        : '') || '';
  const hasPhoto = photoSrcForPdf.length > 0;
  const imgAttr = (src: string) => src.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

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
  const nextTermBegins = (student as any).next_term_begins_date
    ? new Date((student as any).next_term_begins_date).toLocaleDateString()
    : 'TBA';
  const feesBalance = (student as any).feesBalance ?? (student as any).fees?.balance ?? 0;
  const feesFormatted =
    typeof feesBalance === 'number'
      ? new Intl.NumberFormat('en-UG', { style: 'currency', currency: 'UGX', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(feesBalance)
      : String(feesBalance);

  const results = Array.isArray(student.results) ? (student.results as any[]) : [];
  const prePrimaryMode = (reportData as { prePrimaryReportMode?: string }).prePrimaryReportMode ?? 'colour';

  let checklistHtml: string;
  let legendHtml: string;
  if (prePrimaryMode === 'detailed') {
    const flatCells: Array<{ strand: string; skill: { key: string; label: string }; isFirst: boolean }> = [];
    for (const strand of PDF_NURSERY_FALLBACK_STRANDS) {
      strand.skills.forEach((skill, i) => {
        flatCells.push({ strand: strand.subject, skill, isFirst: i === 0 });
      });
    }
    checklistHtml = flatCells
      .map(({ strand, skill, isFirst }) => {
        const row = results.find((r: any) => String(r.subject || '').trim() === strand.trim());
        const gradeEnum = pdfParseNurserySkillGrade(row?.nursery_skill_performance, skill.key);
        const label = gradeEnum ? PDF_NURSERY_ENUM_LABEL[gradeEnum] ?? '—' : '—';
        const fill = gradeEnum ? PDF_NURSERY_ENUM_COLOR[gradeEnum] ?? '#e2e8f0' : '#f8fafc';
        const dot = gradeEnum ? PDF_NURSERY_ENUM_COLOR[gradeEnum] ?? '#94a3b8' : '#cbd5e1';
        const strandHdr = isFirst
          ? `<div style="font-size:6.5pt;font-weight:700;color:#1e40af;margin:0 0 2px;line-height:1.15">${escapeHtmlText(strand)}</div>`
          : '';
        return `<div class="nursery-cell" style="background:${fill};">
      ${strandHdr}
      <div class="nursery-skill-name">${escapeHtmlText(skill.label)}</div>
      <div class="nursery-rating"><span class="nursery-dot" style="background:${dot};"></span>${escapeHtmlText(label)}</div>
    </div>`;
      })
      .join('');
    legendHtml = (['VERY_GOOD', 'GOOD', 'NEEDS_IMPROVEMENT', 'TRIES'] as const)
      .map((e) => {
        const col = PDF_NURSERY_ENUM_COLOR[e];
        const lab = PDF_NURSERY_ENUM_LABEL[e];
        return `<span><span class="nursery-dot" style="background:${col};"></span>${escapeHtmlText(lab)}</span>`;
      })
      .join('');
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

  const pdfHdrRoot = pdfPrimaryHeaderRootVars(school as Record<string, unknown>);
  const badgeTitle = `${String(student.current_class || 'Pre-primary').toUpperCase()} – TERMLY REPORT`;

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
      ${schoolSubtitle ? `<div class="school-subtitle">${escapeHtmlText(schoolSubtitle)}</div>` : ''}
      ${schoolAddress || schoolPobox ? `<div class="school-address">${escapeHtmlText([schoolAddress, schoolPobox].filter(Boolean).join(' '))}</div>` : ''}
      ${schoolContactHtmlLower}
      ${schoolMotto ? `<div class="school-motto">"${escapeHtmlText(schoolMotto)}"</div>` : ''}
    </div>
  </div>
  <div class="divider"></div>
  <div class="badge-wrap">
    <div class="badge">${escapeHtmlText(badgeTitle)}</div>
    <div class="exam-sub">${escapeHtmlText(examName || 'Term Report')} - ${escapeHtmlText(String(year || new Date().getFullYear()))}</div>
  </div>
  <div class="student-block">
    <div class="student-grid">
      <div><strong>Name:</strong> ${escapeHtmlText(student.name ?? '')}</div>
      <div><strong>Class:</strong> ${escapeHtmlText(student.current_class ?? '')}</div>
      <div><strong>Age (years):</strong> ${escapeHtmlText(pdfStudentAgeYearsLabel(student as Record<string, unknown>, examSet as { date?: unknown }))}</div>
      <div><strong>Admission No:</strong> ${escapeHtmlText(String(student.admission_number ?? student.student_id ?? 'N/A'))}</div>
      <div><strong>Term:</strong> ${escapeHtmlText(String(term || 'N/A'))} / ${escapeHtmlText(String(year || new Date().getFullYear()))}</div>
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
      const chunks = await Promise.all(
        allCachedReports.map(async (item) => {
          const rd = item.report_data;
          const rdSt = rd.students;
          const rdFirst =
            Array.isArray(rdSt) && rdSt.length > 0 ? (rdSt[0] as Record<string, unknown>) : undefined;
          const cls = (rdFirst?.current_class as string | undefined) ?? className;
          return isUpperSectionClass(cls)
            ? await primaryTemplateHtmlWithOptimizedPhotos(
                rd as { school?: Record<string, unknown>; students?: unknown[] },
                'upper'
              )
            : isLowerSectionPrimary(cls)
              ? await primaryTemplateHtmlWithOptimizedPhotos(
                  rd as { school?: Record<string, unknown>; students?: unknown[] },
                  'lower'
                )
              : isPrePrimaryNurseryClassForPdf(cls)
                ? await buildPrePrimaryNurseryPDFHTML(rd)
                : buildMinimalReportHTML(rd);
        })
      );
      const firstFullHtml = chunks[0];
      const head = extractHeadContent(firstFullHtml) + PDF_MULTI_STUDENT_SHEET_HEAD;
      const bodyContents = chunks.map(extractBodyContent);
      const combinedBody = bodyContents.map((body) => `<div class="pdf-student-sheet">${body}</div>`).join('\n');
      html = `<!DOCTYPE html>\n<html>\n<head>\n${head}\n</head>\n<body>\n${combinedBody}\n</body>\n</html>`;
    } else {
      html = useBuiltIn
        ? isUpperSectionClass(className)
          ? await primaryTemplateHtmlWithOptimizedPhotos(
              reportData as { school?: Record<string, unknown>; students?: unknown[] },
              'upper'
            )
          : isLowerSectionPrimary(className)
            ? await primaryTemplateHtmlWithOptimizedPhotos(
                reportData as { school?: Record<string, unknown>; students?: unknown[] },
                'lower'
              )
            : isPrePrimaryNurseryClassForPdf(className)
              ? await buildPrePrimaryNurseryPDFHTML(reportData)
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
        let { logo, photo } = await resolveSchoolAndStudentPhotosForReportData(
          rd as { school?: Record<string, unknown>; students?: unknown[] }
        );
        ({ logo, photo } = await optimizeReportPhotosForPdfNode({ logo, photo }));
        return renderTemplateHTML(rd, key, logo, photo);
      })
    );

    const firstFullHtml = chunks[0];
    const head = extractHeadContent(firstFullHtml) + PDF_MULTI_STUDENT_SHEET_HEAD;
    const bodyContents = chunks.map(extractBodyContent);
    const combinedBody = bodyContents.map((body) => `<div class="pdf-student-sheet">${body}</div>`).join('\n');
    const html = `<!DOCTYPE html>\n<html>\n<head>\n${head}\n</head>\n<body>\n${combinedBody}\n</body>\n</html>`;

    await page.setContent(html, { waitUntil: 'networkidle0' });

    const normalizedKey = normalizeSecondaryTemplateKeyForPdf(className0, templateKey);
    const useStandardDynamic = shouldUseOlevelStandardDynamicPdf(
      normalizedKey,
      className0,
      reportDataList.length
    );

    const pdf = await page.pdf(
      useStandardDynamic
        ? await pdfOptionsOlevelStandardSinglePage(page)
        : {
            format: 'A4',
            printBackground: true,
            margin: { top: '0', right: '0', bottom: '0', left: '0' },
          }
    );
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
      htmlContent?: string;
      /**
       * When sending htmlContent, omit heavy reportDataList and pass this instead (avoids HTTP 413 on Vercel).
       * Used for filename + O-Level single-page PDF detection.
       */
      htmlPdfReportCount?: number;
      /** Secondary built-in PDFs only; avoids a second Vercel serverless function (Hobby limit). */
      secondaryPipeline?: boolean;
      /** Baby Class Heritage: Puppeteer opens SPA print route; payload lives in pdf_render_sessions (not POST). */
      pdfRenderSessionId?: string;
      pdfRenderToken?: string;
      appOrigin?: string;
      pdfFilename?: string;
    };

    function isAllowedPdfNavigateOrigin(origin: string): boolean {
      try {
        const u = new URL(origin);
        if (u.username || u.password) return false;
        if (u.protocol === 'https:') return true;
        if (u.protocol === 'http:' && (u.hostname === 'localhost' || u.hostname === '127.0.0.1')) return true;
        return false;
      } catch {
        return false;
      }
    }

    const pdfRenderSessionId =
      typeof body.pdfRenderSessionId === 'string' ? body.pdfRenderSessionId.trim() : '';
    const pdfRenderToken = typeof body.pdfRenderToken === 'string' ? body.pdfRenderToken.trim() : '';
    const appOriginNav = typeof body.appOrigin === 'string' ? body.appOrigin.trim() : '';

    if (pdfRenderSessionId && pdfRenderToken && appOriginNav) {
      if (!isAllowedPdfNavigateOrigin(appOriginNav)) {
        return sendError(400, 'Invalid appOrigin for PDF navigation');
      }

      const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!supabaseUrl || !supabaseKey) {
        return sendError(500, 'Missing Supabase configuration');
      }

      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: peek, error: peekErr } = await supabase
        .from('pdf_render_sessions')
        .select('payload, expires_at')
        .eq('id', pdfRenderSessionId)
        .eq('read_token', pdfRenderToken)
        .maybeSingle();

      if (peekErr) {
        console.error('pdf_render_sessions peek:', peekErr.message);
        return sendError(500, 'Failed to validate PDF session');
      }
      if (!peek) {
        return sendError(404, 'PDF render session not found');
      }
      const expAt = peek.expires_at ? new Date(String(peek.expires_at)).getTime() : 0;
      if (expAt && expAt < Date.now()) {
        return sendError(410, 'PDF render session expired');
      }

      let outName =
        typeof body.pdfFilename === 'string' && body.pdfFilename.trim()
          ? body.pdfFilename.trim()
          : 'class_reports.pdf';
      outName = outName.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 180);
      if (!outName.toLowerCase().endsWith('.pdf')) {
        outName += '.pdf';
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
        await page.setViewport({ width: 1280, height: 1600, deviceScaleFactor: 1 });
        const printUrl = `${appOriginNav.replace(/\/$/, '')}/print/heritage-pdf?sessionId=${encodeURIComponent(
          pdfRenderSessionId
        )}&token=${encodeURIComponent(pdfRenderToken)}`;
        // SPA: avoid hanging on long-polling; load + client-side data-pdf-ready gates capture.
        await page.goto(printUrl, { waitUntil: 'load', timeout: 120000 });
        await page.waitForSelector('html[data-pdf-ready="1"]', { timeout: 120000 });
        await page.waitForFunction(
          () => {
            const el = document.querySelector('#report-preview-doc-surface');
            if (!el) return false;
            const h = el.getBoundingClientRect().height;
            const t = (el.textContent || '').replace(/\s+/g, ' ').trim().length;
            return h > 80 && t > 30;
          },
          { timeout: 45000, polling: 200 }
        );
        await page.emulateMediaType('screen');
        const pdf = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: { top: '0', right: '0', bottom: '0', left: '0' },
        });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${outName.replace(/"/g, '')}"`);
        res.status(200).end(Buffer.from(pdf));
        return;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('PDF heritage navigate error:', message);
        return sendError(500, message || 'PDF generation failed');
      } finally {
        await browser.close();
      }
    }

    // Fast-path: client rendered the HTML (same as app/api/reports/generate-pdf/route.ts).
    // Used by secondary pipeline to avoid src/ dynamic imports that fail on Vercel.
    if (body.htmlContent && typeof body.htmlContent === 'string') {
      const executablePath = await chromium.executablePath();
      const ch = chromium as typeof chromium & { defaultViewport?: { width: number; height: number }; headless?: boolean | 'shell' };
      const browser = await puppeteer.launch({
        args: chromium.args,
        defaultViewport: ch.defaultViewport,
        executablePath,
        headless: ch.headless,
      });
      try {
        const page = await browser.newPage();
        await page.setContent(body.htmlContent, { waitUntil: 'networkidle0' });
        const templateKeyRaw =
          typeof body.templateKey === 'string' && /^template[1-6]$/.test(body.templateKey)
            ? body.templateKey
            : 'template1';
        const rd = body.reportData ?? (Array.isArray(body.reportDataList) && body.reportDataList.length > 0 ? body.reportDataList[0] : undefined);
        const stList = rd?.students as unknown[] | undefined;
        const stFirst =
          Array.isArray(stList) && stList.length > 0 ? (stList[0] as Record<string, unknown>) : undefined;
        const cls = String(stFirst?.current_class ?? '');
        const reportCountForHtmlPdf =
          typeof body.htmlPdfReportCount === 'number' && body.htmlPdfReportCount >= 1
            ? body.htmlPdfReportCount
            : Array.isArray(body.reportDataList) && body.reportDataList.length > 0
              ? body.reportDataList.length
              : 1;
        const normalizedKey = normalizeSecondaryTemplateKeyForPdf(cls, templateKeyRaw);
        const useStandardDynamic = shouldUseOlevelStandardDynamicPdf(normalizedKey, cls, reportCountForHtmlPdf);
        const pdf = await page.pdf(
          useStandardDynamic
            ? await pdfOptionsOlevelStandardSinglePage(page)
            : {
                format: 'A4',
                printBackground: true,
                margin: { top: '0', right: '0', bottom: '0', left: '0' },
              }
        );
        const listForBundleFilename =
          Array.isArray(body.reportDataList) && body.reportDataList.length > 0
            ? body.reportDataList
            : rd
              ? [rd]
              : [];
        const filename = rd
          ? reportCountForHtmlPdf > 1
            ? buildClassBundleReportPdfFilename(listForBundleFilename)
            : buildSingleStudentReportPdfFilename(rd)
          : 'report.pdf';
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`);
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
