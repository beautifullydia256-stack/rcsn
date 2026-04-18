/**
 * Standard O-Level (template1) PDF: one page whose height matches document content.
 * Lives under root `lib/` (not `api/`) so Vercel does not count it as a separate
 * Serverless Function — only `api/pdf/generate` should be an endpoint.
 * Included in that function via vercel.json `includeFiles`.
 */

export function cssPxToMm(px: number): number {
  return (px * 25.4) / 96;
}

export function isOLevelClassNameForPdf(className: string): boolean {
  if (!className || typeof className !== 'string') return false;
  return /^(senior\s*[1-4]|s\.?\s*[1-4])\b/i.test(className.trim());
}

function isALevelClassNameForPdf(className: string): boolean {
  if (!className || typeof className !== 'string') return false;
  return /^(senior\s*[56]|s\.?\s*[56])\b/i.test(className.trim());
}

/** Same rules as `getSecondaryTemplateKeysForClass`. */
export function normalizeSecondaryTemplateKeyForPdf(className: string, templateKey: string): string {
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

export async function pdfOptionsOlevelStandardSinglePage(page: {
  evaluate: <T>(pageFunction: () => T) => Promise<T>;
}): Promise<{
  width: string;
  height: string;
  printBackground: boolean;
  margin: { top: string; right: string; bottom: string; left: string };
}> {
  const dims = await page.evaluate(() => {
    const body = document.body;
    const html = document.documentElement;
    const width = Math.max(body.scrollWidth, html.scrollWidth, body.offsetWidth, 1);
    const height = Math.max(body.scrollHeight, html.scrollHeight, body.offsetHeight, 1);
    return { width, height };
  });
  const widthMm = Math.min(Math.max(Math.ceil(cssPxToMm(dims.width)), 210), 220);
  const heightMm = Math.ceil(cssPxToMm(dims.height)) + 3;
  return {
    width: `${widthMm}mm`,
    height: `${heightMm}mm`,
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  };
}

export function shouldUseOlevelStandardDynamicPdf(
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
