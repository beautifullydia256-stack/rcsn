import { renderTemplateHTML } from '../services/templateHTMLGenerator';
import { resolveSchoolAndStudentPhotosForReportData } from './reportImageDataUrl';
import { injectPrePrimarySkillImageDataUrlsForPdf } from '../services/prePrimaryHolisticPdfMarkup';
import { isPrePrimaryNurseryClass } from '../templates/primary/prePrimaryHolisticRatings';
import { getTemplateForClass } from '../templates/primary';
import { getDefaultSecondaryTemplateKey } from '../templates/secondary';
import { isALevelClass, isOLevelClass } from '../components/reports/templates/helpers';
import { htmlContentToPdfBlob } from './desktopPdf';
import { computeSecondaryHtmlPdfUseOlevelStandardDynamic } from './secondaryPdfHtmlOptions';
import { buildSingleStudentReportPdfFilename } from './reportPdfFilenames';

/**
 * Build a PDF Blob from a `generated_reports` row (`report_data` JSON), using the same
 * `renderTemplateHTML` + Puppeteer path as the report generator — **Electron only** (`htmlContentToPdfBlob`).
 */
export async function generatePdfBlobFromCachedGeneratedReport(report: {
  report_data: unknown;
}): Promise<{ blob: Blob; filename: string }> {
  const rd = report.report_data as Record<string, unknown>;
  if (!rd || typeof rd !== 'object') {
    throw new Error('Missing report data');
  }
  const stList = rd.students;
  const className =
    Array.isArray(stList) && stList.length > 0
      ? String((stList[0] as Record<string, unknown>).current_class ?? '')
      : '';

  const templateKey =
    isOLevelClass(className) || isALevelClass(className)
      ? getDefaultSecondaryTemplateKey(className)
      : getTemplateForClass(className);

  if (isPrePrimaryNurseryClass(className)) {
    await injectPrePrimarySkillImageDataUrlsForPdf(
      rd as Parameters<typeof injectPrePrimarySkillImageDataUrlsForPdf>[0]
    );
  }
  const { logo, photo } = await resolveSchoolAndStudentPhotosForReportData(
    rd as { school?: Record<string, unknown>; students?: unknown[] }
  );
  const html = renderTemplateHTML(rd, templateKey, logo, photo);
  const useDynamic = computeSecondaryHtmlPdfUseOlevelStandardDynamic(rd, templateKey, 1);
  const blob = await htmlContentToPdfBlob({
    htmlContent: html,
    useOlevelStandardDynamic: useDynamic,
  });
  const filename = buildSingleStudentReportPdfFilename(rd);
  return { blob, filename };
}
