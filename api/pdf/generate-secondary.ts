/**
 * Vercel: POST /api/pdf/generate-secondary
 * Senior secondary (O/A-Level) PDFs only — uses renderTemplateHTML.
 * Kept separate from api/pdf/generate so primary school PDFs stay on the proven code path.
 */

import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import { renderTemplateHTML } from '../../src/services/templateHTMLGenerator';

type Req = { method?: string; body: Record<string, unknown> };
type Res = {
  setHeader: (k: string, v: string) => void;
  status: (n: number) => Res;
  json: (x: unknown) => Res;
  end: (body?: Buffer | string) => void;
};

export const config = { maxDuration: 60 };

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

function extractBodyContent(fullHtml: string): string {
  const match = fullHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1].trim() : fullHtml;
}

function extractHeadContent(fullHtml: string): string {
  const match = fullHtml.match(/<head[^>]*>([\s\S]*?)<\/head>/i);
  return match ? match[1].trim() : '';
}

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
  return base.endsWith('.pdf') ? base : `${base}.pdf`;
}

function isOLevelClassPdf(className: string): boolean {
  if (!className || typeof className !== 'string') return false;
  return /^(senior\s*[1-4]|s\.?\s*[1-4])\b/i.test(className.trim());
}

function isALevelClassPdf(className: string): boolean {
  if (!className || typeof className !== 'string') return false;
  return /^(senior\s*[56]|s\.?\s*[56])\b/i.test(className.trim());
}

function normalizeSecondaryTemplateKey(className: string, templateKey: string): string {
  const t =
    typeof templateKey === 'string' && /^template[1-6]$/.test(templateKey) ? templateKey : 'template1';
  if (isALevelClassPdf(className)) {
    if (t === 'template2' || t === 'template3' || t === 'template4') return t;
    return 'template4';
  }
  if (t === 'template2' || t === 'template3') return t;
  return 'template1';
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
      reportDataList?: Record<string, unknown>[];
      templateKey?: string;
    };
    const reportDataList = body.reportDataList;
    const rawKey = body.templateKey;
    const templateKey =
      typeof rawKey === 'string' && /^template[1-6]$/.test(rawKey) ? rawKey : 'template1';

    if (!reportDataList || !Array.isArray(reportDataList) || reportDataList.length === 0) {
      return sendError(400, 'reportDataList is required');
    }

    const first = reportDataList[0];
    const st0 = first?.students;
    const student0 =
      Array.isArray(st0) && st0.length > 0 ? (st0[0] as Record<string, unknown>) : undefined;
    const className0 = String(student0?.current_class ?? '');

    if (!isOLevelClassPdf(className0) && !isALevelClassPdf(className0)) {
      return sendError(400, 'generate-secondary supports O-Level / A-Level classes only');
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

      const chunks = reportDataList.map((rd) => {
        const sts = rd.students;
        const st =
          Array.isArray(sts) && sts.length > 0 ? (sts[0] as Record<string, unknown>) : undefined;
        const cls = String(st?.current_class ?? className0);
        const key = normalizeSecondaryTemplateKey(cls, templateKey);
        return renderTemplateHTML(rd, key);
      });

      const firstFullHtml = chunks[0];
      const head = extractHeadContent(firstFullHtml) + PDF_MULTI_STUDENT_SHEET_HEAD;
      const bodyContents = chunks.map(extractBodyContent);
      const combinedBody = bodyContents.map((body) => `<div class="pdf-student-sheet">${body}</div>`).join('\n');
      const html = `<!DOCTYPE html>\n<html>\n<head>\n${head}\n</head>\n<body>\n${combinedBody}\n</body>\n</html>`;

      await page.setContent(html, { waitUntil: 'networkidle0' });
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '4mm', right: '5mm', bottom: '4mm', left: '5mm' },
      });
      const buffer = Buffer.from(pdf);
      const filename =
        reportDataList.length > 1
          ? buildClassBundleReportPdfFilename(reportDataList)
          : buildSingleStudentReportPdfFilename(reportDataList[0]);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/"/g, '')}"`);
      res.status(200).end(buffer);
    } finally {
      await browser.close();
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('PDF generate-secondary error:', message);
    sendError(500, message || 'PDF generation failed');
  }
}
