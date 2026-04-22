/**
 * Shared PDF generation from admin report preview data (same pipelines as GenerateReportsPage /
 * SecondaryGenerateReportsPage download handlers, without triggering a browser download).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { isPrePrimaryNurseryClass } from '@/templates/primary/prePrimaryHolisticRatings';
import { injectPrePrimarySkillImageDataUrlsForPdf } from '@/services/prePrimaryHolisticPdfMarkup';
import { isElectronDesktop, htmlChunksToMergedPdfBlob } from '@/lib/desktopPdf';
import { computeSecondaryHtmlPdfUseOlevelStandardDynamic } from '@/lib/secondaryPdfHtmlOptions';
import {
  buildSingleStudentReportPdfFilename,
  buildClassBundleReportPdfFilename,
} from '@/lib/reportPdfFilenames';
import { pdfDownloadFilenameFromResponse } from '@/lib/pdfAttachmentFilename';
import { renderTemplateHTML } from '@/services/templateHTMLGenerator';
import { resolveSchoolAndStudentPhotosForReportData } from '@/lib/reportImageDataUrl';
import { pdfApiHttpErrorMessage } from '@/lib/pdfApiErrorMessage';

function getPdfBaseUrl(): string {
  return (
    import.meta.env.VITE_PDF_API_URL ?? (import.meta.env.DEV ? 'http://localhost:3001' : '')
  );
}

export type PrimaryReportPdfContext = {
  supabase: SupabaseClient;
  schoolId: string;
  selectedClass: string;
  reportTemplateKey: string;
  isSecondaryLayoutChoice: boolean;
  prePrimaryHolisticRuntimeConfig: unknown | null;
  teacherSkillRemarksByStrandSkill: unknown | null;
  reportType: 'single' | 'class';
  selectedStudent: string;
  onStatus?: (msg: string) => void;
};

export type AdminReportPdfBlobResult = {
  reportData: Record<string, unknown>;
  filename: string;
  blob: Blob;
};

function enrichPrimaryNurseryForPdf(
  rd: Record<string, unknown>,
  selectedClass: string,
  prePrimaryHolisticRuntimeConfig: unknown | null,
  teacherSkillRemarksByStrandSkill: unknown | null
): Record<string, unknown> {
  if (!isPrePrimaryNurseryClass(selectedClass)) return rd;
  return {
    ...rd,
    prePrimaryHolisticRuntimeConfig: prePrimaryHolisticRuntimeConfig ?? null,
    prePrimaryReportMode: 'colour' as const,
    teacherSkillRemarksByStrandSkill: teacherSkillRemarksByStrandSkill ?? null,
  };
}

/** Same branches as GenerateReportsPage handleDownloadSavedPdf (merged or single-student PDF bytes). */
export async function primaryGeneratePdfFromReports(
  reportsForPdf: Record<string, unknown>[],
  ctx: PrimaryReportPdfContext
): Promise<{ blob: Blob; filename: string }> {
  const {
    supabase,
    schoolId,
    selectedClass,
    reportTemplateKey,
    isSecondaryLayoutChoice,
    prePrimaryHolisticRuntimeConfig,
    teacherSkillRemarksByStrandSkill,
    reportType,
    selectedStudent,
    onStatus,
  } = ctx;
  if (isSecondaryLayoutChoice) {
    throw new Error('Use secondaryGeneratePdfFromReports for O/A-Level reports.');
  }
  const baseUrl = getPdfBaseUrl();
  const set = (msg: string) => {
    onStatus?.(msg);
  };

  if (!reportsForPdf.length) throw new Error('No reports to download');

  if (isElectronDesktop()) {
    set('Rendering HTML…');
    const htmlChunks = await Promise.all(
      reportsForPdf.map(async (rd: Record<string, unknown>) => {
        if (isPrePrimaryNurseryClass(selectedClass)) {
          await injectPrePrimarySkillImageDataUrlsForPdf(
            rd as Parameters<typeof injectPrePrimarySkillImageDataUrlsForPdf>[0]
          );
        }
        const { logo, photo } = await resolveSchoolAndStudentPhotosForReportData(
          rd as { school?: Record<string, unknown>; students?: unknown[] }
        );
        return renderTemplateHTML(rd, reportTemplateKey, logo, photo);
      })
    );

    set('Generating PDF…');
    const blob = await htmlChunksToMergedPdfBlob({
      htmlChunks,
      useOlevelStandardDynamic: false,
      onChunk: (i, t) =>
        set(t > 1 ? `Generating PDF (${i}/${t})…` : 'Generating PDF…'),
    });
    const filename =
      reportsForPdf.length > 1
        ? buildClassBundleReportPdfFilename(reportsForPdf as Record<string, unknown>[])
        : buildSingleStudentReportPdfFilename(reportsForPdf[0] as Record<string, unknown>);
    return { blob, filename };
  }

  const useBabyClassHeritageUrlPdf =
    reportTemplateKey === 'template6' && isPrePrimaryNurseryClass(selectedClass);

  if (!useBabyClassHeritageUrlPdf) {
    set('Preparing PDF…');
    const response = await fetch(`${baseUrl}/api/pdf/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportDataList: reportsForPdf,
        schoolId,
        templateKey: reportTemplateKey,
      }),
    });
    if (!response.ok) {
      let errBody: { error?: string } = {};
      const contentType = response.headers.get('Content-Type') || '';
      if (contentType.includes('application/json')) {
        errBody = await response.json().catch(() => ({}));
      } else {
        await response.text();
      }
      throw new Error(
        pdfApiHttpErrorMessage(response.status, {
          serverErrorText: typeof errBody?.error === 'string' ? errBody.error : undefined,
        })
      );
    }
    const blob = await response.blob();
    const fallbackName =
      reportType === 'single' && selectedStudent ? 'student_report.pdf' : 'class_reports.pdf';
    const filename = pdfDownloadFilenameFromResponse(response, fallbackName);
    return { blob, filename };
  }

  set('Staging report for PDF…');
  const readToken = (() => {
    const a = new Uint8Array(32);
    crypto.getRandomValues(a);
    return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('');
  })();

  const reportRows = reportsForPdf.map((rd: Record<string, unknown>) => ({ report_data: rd }));
  const sessionPayload = {
    version: 1 as const,
    reportRows,
    templateKey: reportTemplateKey,
    prePrimaryReportMode: 'colour' as const,
    prePrimaryHolisticRuntimeConfig: prePrimaryHolisticRuntimeConfig ?? null,
    teacherSkillRemarksByStrandSkill: teacherSkillRemarksByStrandSkill ?? null,
  };

  const { data: sessionId, error: insertErr } = await supabase.rpc('insert_pdf_render_session', {
    p_read_token: readToken,
    p_payload: sessionPayload,
  });

  if (insertErr || !sessionId) {
    throw new Error(
      insertErr?.message ||
        'Could not stage the PDF session. Apply the latest Supabase migration for insert_pdf_render_session and pdf_render_sessions policies.'
    );
  }

  set('Preparing PDF…');
  const fallbackName =
    reportType === 'single' && selectedStudent ? 'student_report.pdf' : 'class_reports.pdf';

  const response = await fetch(`${baseUrl}/api/pdf/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      pdfRenderSessionId: sessionId,
      pdfRenderToken: readToken,
      appOrigin: typeof window !== 'undefined' ? window.location.origin : '',
      pdfFilename: fallbackName,
      templateKey: reportTemplateKey,
    }),
  });

  if (!response.ok) {
    let errBody: { error?: string } = {};
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      errBody = await response.json().catch(() => ({}));
    } else {
      await response.text();
    }
    throw new Error(
      pdfApiHttpErrorMessage(response.status, {
        serverErrorText: typeof errBody?.error === 'string' ? errBody.error : undefined,
      })
    );
  }

  const blob = await response.blob();
  const filename = pdfDownloadFilenameFromResponse(response, fallbackName);
  return { blob, filename };
}

/** One PDF per student; inner filenames from buildSingleStudentReportPdfFilename (ZIP / online publish). */
export async function adminReportPdfBlobsFromPreviewPrimary(
  reports: unknown[],
  ctx: PrimaryReportPdfContext
): Promise<AdminReportPdfBlobResult[]> {
  const { selectedClass, prePrimaryHolisticRuntimeConfig, teacherSkillRemarksByStrandSkill } = ctx;
  const enriched = reports.map((r) =>
    enrichPrimaryNurseryForPdf(
      r as Record<string, unknown>,
      selectedClass,
      prePrimaryHolisticRuntimeConfig,
      teacherSkillRemarksByStrandSkill
    )
  );
  const out: AdminReportPdfBlobResult[] = [];
  for (const rd of enriched) {
    const { blob } = await primaryGeneratePdfFromReports([rd], ctx);
    out.push({
      reportData: rd,
      filename: buildSingleStudentReportPdfFilename(rd),
      blob,
    });
  }
  return out;
}

export type SecondaryReportPdfContext = {
  reportTemplateKey: string;
  reportType: 'single' | 'class';
  selectedStudent: string;
  onStatus?: (msg: string) => void;
};

/** Same as SecondaryGenerateReportsPage handleDownloadSavedPdf (merged PDF). */
export async function secondaryGeneratePdfFromReports(
  reports: Record<string, unknown>[],
  ctx: SecondaryReportPdfContext
): Promise<{ blob: Blob; filename: string }> {
  const { reportTemplateKey, reportType, selectedStudent, onStatus } = ctx;
  const baseUrl = getPdfBaseUrl();
  const set = (msg: string) => onStatus?.(msg);

  if (!reports.length) throw new Error('No reports to download');

  set('Rendering HTML…');
  const htmlChunks = await Promise.all(
    reports.map(async (rd) => {
      const { logo, photo } = await resolveSchoolAndStudentPhotosForReportData(
        rd as { school?: Record<string, unknown>; students?: unknown[] }
      );
      return renderTemplateHTML(rd, reportTemplateKey, logo, photo);
    })
  );

  set('Preparing PDF…');

  if (isElectronDesktop()) {
    set('Generating PDF…');
    const useDynamic = computeSecondaryHtmlPdfUseOlevelStandardDynamic(
      reports[0] as Record<string, unknown>,
      reportTemplateKey,
      reports.length
    );
    const blob = await htmlChunksToMergedPdfBlob({
      htmlChunks,
      useOlevelStandardDynamic: useDynamic,
      onChunk: (i, t) =>
        set(t > 1 ? `Generating PDF (${i}/${t})…` : 'Generating PDF…'),
    });
    const filename =
      reports.length > 1
        ? buildClassBundleReportPdfFilename(reports as Record<string, unknown>[])
        : buildSingleStudentReportPdfFilename(reports[0] as Record<string, unknown>);
    return { blob, filename };
  }

  const extractHead = (html: string) => {
    const m = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    return m ? m[1] : '';
  };
  const extractBody = (html: string) => {
    const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return m ? m[1] : html;
  };
  const combinedHtml =
    htmlChunks.length === 1
      ? htmlChunks[0]
      : `<!DOCTYPE html><html><head>${extractHead(htmlChunks[0])}<style>.pdf-student-sheet{page-break-after:always;}</style></head><body>${htmlChunks.map((h) => `<div class="pdf-student-sheet">${extractBody(h)}</div>`).join('\n')}</body></html>`;

  const response = await fetch(`${baseUrl}/api/pdf/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      htmlContent: combinedHtml,
      reportData: reports[0],
      htmlPdfReportCount: reports.length,
      templateKey: reportTemplateKey,
    }),
  });

  if (!response.ok) {
    let errBody: { error?: string } = {};
    const contentType = response.headers.get('Content-Type') || '';
    if (contentType.includes('application/json')) {
      errBody = await response.json().catch(() => ({}));
    } else {
      await response.text();
    }
    throw new Error(
      pdfApiHttpErrorMessage(response.status, {
        serverErrorText: typeof errBody?.error === 'string' ? errBody.error : undefined,
      })
    );
  }

  const blob = await response.blob();
  const fallbackName =
    reportType === 'single' && selectedStudent ? 'student_report.pdf' : 'class_reports.pdf';
  const filename = pdfDownloadFilenameFromResponse(response, fallbackName);
  return { blob, filename };
}

export async function adminReportPdfBlobsFromPreviewSecondary(
  reports: unknown[],
  ctx: SecondaryReportPdfContext
): Promise<AdminReportPdfBlobResult[]> {
  const list = reports as Record<string, unknown>[];
  const out: AdminReportPdfBlobResult[] = [];
  for (const rd of list) {
    const { blob } = await secondaryGeneratePdfFromReports([rd], ctx);
    out.push({
      reportData: rd,
      filename: buildSingleStudentReportPdfFilename(rd),
      blob,
    });
  }
  return out;
}
