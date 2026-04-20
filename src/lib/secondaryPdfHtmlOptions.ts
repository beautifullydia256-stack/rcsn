/**
 * Mirrors `api/pdf/generate.ts` (htmlContent fast-path) so desktop Puppeteer uses the same
 * page size rules as Vercel (O-Level template1 single-student → dynamic height).
 */

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

function shouldUseOlevelStandardDynamicPdf(
  templateKey: string | undefined,
  className: string,
  reportCount: number
): boolean {
  return reportCount === 1 && templateKey === 'template1' && isOLevelClassNameForPdf(className);
}

/**
 * When true, Puppeteer should use dynamic width/height (single-page O-Level standard card)
 * instead of plain A4 — same condition as `api/pdf/generate.ts`.
 */
export function computeSecondaryHtmlPdfUseOlevelStandardDynamic(
  reportData: Record<string, unknown> | undefined,
  templateKeyRaw: string,
  htmlPdfReportCount: number
): boolean {
  const stList = reportData?.students;
  const stFirst =
    Array.isArray(stList) && stList.length > 0 ? (stList[0] as Record<string, unknown>) : undefined;
  const cls = String(stFirst?.current_class ?? '');
  const normalizedKey = normalizeSecondaryTemplateKeyForPdf(cls, templateKeyRaw);
  return shouldUseOlevelStandardDynamicPdf(normalizedKey, cls, htmlPdfReportCount);
}
