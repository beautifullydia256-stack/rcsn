/**
 * POST /api/reports/generate-pdf
 * Dashboard report downloads (Primary + Secondary).
 *
 * - htmlContent: same HTML as on-screen preview → PDF with zero extra margin (matches @page A4 in templates).
 * - reportData only (Secondary): builds HTML via renderTemplateHTML + inlined images — same path as preview.
 */
import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import JSZip from 'jszip';
import { renderTemplateHTML } from '../../../../src/services/templateHTMLGenerator';
import { resolveSchoolAndStudentPhotosForReportData } from '../../../../src/lib/reportImageDataUrl';
import { isALevelClass, isOLevelClass } from '../../../../src/components/reports/templates/helpers';

export const runtime = 'nodejs';
export const maxDuration = 60;

type PuppeteerBrowser = Awaited<ReturnType<typeof puppeteer.launch>>;

function normalizeSecondaryTemplateKey(templateKey: string): 'template1' | 'template2' | 'template3' {
  if (templateKey === 'template2' || templateKey === 'template3') return templateKey;
  return 'template1';
}

async function launchBrowser(): Promise<PuppeteerBrowser> {
  const isVercel = process.env.VERCEL === '1';
  try {
    return await puppeteer.launch(
      isVercel
        ? {
            args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
            executablePath: await chromium.executablePath(),
            headless: true,
          }
        : {
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
          }
    );
  } catch {
    return puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
  }
}

/** WYSIWYG with built-in report HTML: viewport + no Puppeteer margin (template controls padding). */
async function renderHtmlToPdfBuffer(browser: PuppeteerBrowser, html: string): Promise<Uint8Array> {
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 794, height: 1123, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.waitForSelector('body', { timeout: 5000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 500));
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
      preferCSSPageSize: false,
      scale: 1.0,
    });
    return pdf;
  } finally {
    await page.close();
  }
}

function buildSinglePdfFilename(reportData: { students?: unknown[]; examSet?: Record<string, unknown> }): string {
  const student = reportData?.students?.[0] as Record<string, unknown> | undefined;
  const examSet = reportData.examSet || {};
  let filename = 'report';
  if (student && examSet) {
    const parts = [student.name, student.current_class];
    if (examSet.term != null && examSet.term !== '') parts.push(`Term_${examSet.term}`);
    if (examSet.name) parts.push(examSet.name);
    if (examSet.year != null && examSet.year !== '') parts.push(String(examSet.year));
    filename =
      parts
        .join('_')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '') || 'report';
  }
  return filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
}

export async function POST(request: NextRequest) {
  let browser: PuppeteerBrowser | null = null;
  try {
    const body = await request.json();
    const { htmlContent, reportData, type = 'single', template: _template } = body || {};
    const template =
      typeof _template === 'string' && /^template[1-6]$/.test(_template) ? _template : 'template1';

    browser = await launchBrowser();

    if (htmlContent && typeof htmlContent === 'string') {
      const pdf = await renderHtmlToPdfBuffer(browser, htmlContent);
      const filename = buildSinglePdfFilename(reportData || {});

      return new NextResponse(Buffer.from(pdf), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    const students = reportData?.students;
    if (
      reportData &&
      Array.isArray(students) &&
      students.length > 0 &&
      typeof students[0] === 'object' &&
      students[0] !== null
    ) {
      const cls = String((students[0] as { current_class?: string }).current_class || '');
      if (isOLevelClass(cls) || isALevelClass(cls)) {
        const key = normalizeSecondaryTemplateKey(template);

        if (type === 'class' && students.length > 1) {
          const zip = new JSZip();
          for (const student of students as Record<string, unknown>[]) {
            const rd = {
              ...reportData,
              students: [student],
            };
            const { logo, photo } = await resolveSchoolAndStudentPhotosForReportData(rd);
            const html = renderTemplateHTML(rd, key, logo, photo);
            const pdf = await renderHtmlToPdfBuffer(browser, html);
            const innerName = buildSinglePdfFilename(rd);
            zip.file(innerName, Buffer.from(pdf));
          }
          const zipBuf = await zip.generateAsync({ type: 'nodebuffer' });
          const examSet = (reportData.examSet || {}) as Record<string, unknown>;
          const classLabel = String((students[0] as { current_class?: string }).current_class || 'Class').replace(
            /[^a-zA-Z0-9._-]/g,
            '_'
          );
          const zipName = `${classLabel}_Reports_${examSet.name ?? 'exam'}.zip`.replace(/[^a-zA-Z0-9._-]/g, '_');

          return new NextResponse(zipBuf, {
            headers: {
              'Content-Type': 'application/zip',
              'Content-Disposition': `attachment; filename="${zipName}"`,
            },
          });
        }

        const { logo, photo } = await resolveSchoolAndStudentPhotosForReportData(reportData);
        const html = renderTemplateHTML(reportData, key, logo, photo);
        const pdf = await renderHtmlToPdfBuffer(browser, html);
        const filename = buildSinglePdfFilename(reportData);

        return new NextResponse(Buffer.from(pdf), {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        });
      }
    }

    if (type === 'class') {
      return NextResponse.json(
        {
          error:
            'Class PDF: send htmlContent from the preview, or use Secondary O/A-Level with reportData (built-in templates).',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Send htmlContent (any school type) or Secondary reportData for built-in PDF.' },
      { status: 400 }
    );
  } catch (e) {
    console.error('Reports generate-pdf error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (_) {}
    }
  }
}
