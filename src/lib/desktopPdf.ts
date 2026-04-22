import { PDFDocument } from 'pdf-lib';
import { getAuthSessionStorageSnapshot } from './supabase';

/** Electron: max students per `printToPDF` HTML payload before merging PDFs (IPC + Chromium). */
export const DESKTOP_CLASS_PDF_CHUNK_STUDENTS = 75;

/** Join per-student full HTML documents into one print document (page breaks between students). */
export function combineMultiStudentReportHtmlForPdf(htmlChunks: string[]): string {
  if (htmlChunks.length === 0) return '';
  if (htmlChunks.length === 1) return htmlChunks[0];
  const extractHead = (html: string) => {
    const m = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
    return m ? m[1] : '';
  };
  const extractBody = (html: string) => {
    const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    return m ? m[1] : html;
  };
  return `<!DOCTYPE html><html><head>${extractHead(htmlChunks[0])}<style>.pdf-student-sheet{page-break-after:always;break-after:page;}</style></head><body>${htmlChunks.map((h) => `<div class="pdf-student-sheet">${extractBody(h)}</div>`).join('\n')}</body></html>`;
}

function desktopApi() {
  return typeof window !== 'undefined' ? window.pwezaDesktop : undefined;
}

export function isElectronDesktop(): boolean {
  return !!desktopApi()?.isElectron;
}

/**
 * Renders full HTML via Chromium printToPDF in the Electron main process (no Vercel).
 * Callers should build HTML in the renderer with the same helpers as web (`reportImageDataUrl`,
 * `injectPrePrimarySkillImageDataUrlsForPdf`, etc.) so logos, photos, and skill art are already
 * embedded as optimized data URLs before IPC — layout matches web; bytes stay small for IPC.
 */
export async function htmlContentToPdfBlob(payload: {
  htmlContent: string;
  /** Same as Vercel: O-Level template1 + single student → dynamic page dimensions */
  useOlevelStandardDynamic: boolean;
}): Promise<Blob> {
  const api = desktopApi();
  if (!api?.htmlContentToPdf) {
    throw new Error('Desktop PDF API is not available (open the Electron app).');
  }
  const r = await api.htmlContentToPdf({
    htmlContent: payload.htmlContent,
    useOlevelStandardDynamic: payload.useOlevelStandardDynamic,
  });
  if (!r.ok || !r.pdfBase64) {
    throw new Error(r.error || 'PDF generation failed');
  }
  const binary = atob(r.pdfBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'application/pdf' });
}

async function mergePdfBlobs(blobs: Blob[]): Promise<Blob> {
  const merged = await PDFDocument.create();
  for (const blob of blobs) {
    const src = await PDFDocument.load(await blob.arrayBuffer());
    const pages = await merged.copyPages(src, src.getPageIndices());
    pages.forEach((p) => merged.addPage(p));
  }
  const pdfBytes = await merged.save();
  return new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
}

/**
 * Large classes (500+): print in chunks and merge so one IPC payload and one Chromium layout stay bounded.
 */
export async function htmlChunksToMergedPdfBlob(options: {
  htmlChunks: string[];
  useOlevelStandardDynamic: boolean;
  chunkSize?: number;
  onChunk?: (batchIndex: number, batchTotal: number) => void;
}): Promise<Blob> {
  const {
    htmlChunks,
    useOlevelStandardDynamic,
    chunkSize = DESKTOP_CLASS_PDF_CHUNK_STUDENTS,
    onChunk,
  } = options;
  if (htmlChunks.length === 0) {
    throw new Error('No report HTML to print');
  }
  if (htmlChunks.length <= chunkSize) {
    const combined =
      htmlChunks.length === 1 ? htmlChunks[0] : combineMultiStudentReportHtmlForPdf(htmlChunks);
    return htmlContentToPdfBlob({ htmlContent: combined, useOlevelStandardDynamic });
  }
  const parts: Blob[] = [];
  const totalBatches = Math.ceil(htmlChunks.length / chunkSize);
  for (let i = 0; i < totalBatches; i++) {
    onChunk?.(i + 1, totalBatches);
    const slice = htmlChunks.slice(i * chunkSize, (i + 1) * chunkSize);
    const combined =
      slice.length === 1 ? slice[0] : combineMultiStudentReportHtmlForPdf(slice);
    parts.push(await htmlContentToPdfBlob({ htmlContent: combined, useOlevelStandardDynamic }));
  }
  return mergePdfBlobs(parts);
}

export async function printHashRouteToPdfBlob(hashRoute: string): Promise<Blob> {
  const api = desktopApi();
  if (!api?.printHashRouteToPdf) {
    throw new Error('Desktop PDF API is not available (open the Electron app).');
  }
  const { storageKey, storageJson } = getAuthSessionStorageSnapshot();
  const appUrl =
    import.meta.env.DEV
      ? `http://127.0.0.1:${import.meta.env.VITE_DEV_PORT ?? '3000'}`
      : undefined;

  const r = await api.printHashRouteToPdf({
    hashRoute,
    storageKey,
    storageJson,
    appUrl,
  });

  if (!r.ok || !r.pdfBase64) {
    throw new Error(r.error || 'PDF generation failed');
  }

  const binary = atob(r.pdfBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: 'application/pdf' });
}
