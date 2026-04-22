/**
 * Same naming as `api/pdf/generate.ts` for secondary PDF downloads (single student vs class bundle).
 */

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

export function buildSingleStudentReportPdfFilename(reportData: Record<string, unknown>): string {
  const stList = reportData.students;
  const student =
    Array.isArray(stList) && stList.length > 0 ? (stList[0] as Record<string, unknown>) : undefined;
  const examSet = (reportData.examSet || {}) as Record<string, unknown>;
  const name = sanitizeReportPdfFilenamePart(student?.name) || 'Student';
  const cls = sanitizeReportPdfFilenamePart(student?.current_class) || 'Class';
  const termRaw = examSet.term;
  const term =
    termRaw != null && termRaw !== '' ? `Term_${sanitizeReportPdfFilenamePart(termRaw)}` : '';
  const examName = sanitizeReportPdfFilenamePart(examSet.name);
  const year =
    examSet.year != null && examSet.year !== '' ? sanitizeReportPdfFilenamePart(examSet.year) : '';
  const parts = [name, cls, term, examName, year].filter(Boolean);
  const base = (parts.join('_') || 'report').slice(0, 180);
  return base.endsWith('.pdf') ? base : `${base}.pdf`;
}

/** Client download-as name for a published class ZIP (storage key stays `class_bundle.zip`). */
export function buildPublishedClassBundleZipDownloadFilename(input: {
  className: unknown;
  examName: unknown;
  term: unknown;
  year: unknown;
}): string {
  const cls = sanitizeReportPdfFilenamePart(input.className) || 'Class';
  const exam = sanitizeReportPdfFilenamePart(input.examName) || 'Exam';
  const termRaw = input.term;
  const termSuffix =
    termRaw != null && termRaw !== '' ? `T${sanitizeReportPdfFilenamePart(termRaw)}` : '';
  const year =
    input.year != null && input.year !== '' ? sanitizeReportPdfFilenamePart(input.year) : '';
  const pieces = [cls, 'published', exam, termSuffix, year].filter(Boolean);
  const base = pieces.join('_').slice(0, 180);
  return base.endsWith('.zip') ? base : `${base}.zip`;
}

export function buildClassBundleReportPdfFilename(reportDataList: Record<string, unknown>[]): string {
  const first = reportDataList[0];
  if (!first) return `class_reports_${Date.now()}.pdf`;
  const stList = first.students;
  const student =
    Array.isArray(stList) && stList.length > 0 ? (stList[0] as Record<string, unknown>) : undefined;
  const examSet = (first.examSet || {}) as Record<string, unknown>;
  const cls = sanitizeReportPdfFilenamePart(student?.current_class) || 'Class';
  const examSetName = sanitizeReportPdfFilenamePart(examSet.name) || 'Exam';
  const termRaw = examSet.term;
  const term = termRaw != null && termRaw !== '' ? sanitizeReportPdfFilenamePart(termRaw) : '';
  const year =
    examSet.year != null && examSet.year !== '' ? sanitizeReportPdfFilenamePart(examSet.year) : '';
  const pieces = [cls, 'reports', examSetName, ...(term ? [`term_${term}`] : []), ...(year ? [year] : [])];
  const base = pieces.join('_').slice(0, 180);
  const withExt = base.endsWith('.pdf') ? base : `${base}.pdf`;
  return withExt;
}
