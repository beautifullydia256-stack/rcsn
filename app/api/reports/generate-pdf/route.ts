/**
 * POST /api/reports/generate-pdf
 * Used by the dashboard report generator (PrimaryReportGenerator, SecondaryReportGenerator).
 * When htmlContent is sent, we convert that exact HTML to PDF so the PDF matches the preview
 * (including header: school name, address, contact line, motto).
 * Single report: body.htmlContent + body.reportData (for filename).
 * Class report: body.reportData + body.type 'class' — currently not supported; client may need to send combined htmlContent or use another flow.
 */
import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';
import {
  normalizeSecondaryTemplateKeyForPdf,
  pdfOptionsOlevelStandardSinglePage,
  shouldUseOlevelStandardDynamicPdf,
} from '../../../../src/lib/pdfOlevelStandardPage';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      htmlContent,
      reportData,
      reportDataList,
      templateKey: bodyTemplateKey,
      type = 'single',
      template: _template,
    } = body || {};

    // Prefer htmlContent so PDF matches the preview (including header with contact line, address, motto)
    if (htmlContent && typeof htmlContent === 'string') {
      const isVercel = process.env.VERCEL === '1';
      let browser: Awaited<ReturnType<typeof puppeteer.launch>>;
      try {
        browser = await puppeteer.launch(
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
      } catch (e) {
        browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
      }

      try {
        const page = await browser.newPage();
        await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 30000 });
        await page.waitForSelector('body', { timeout: 5000 }).catch(() => {});
        await new Promise((r) => setTimeout(r, 500));

        const templateKeyRaw =
          typeof bodyTemplateKey === 'string' && /^template[1-6]$/.test(bodyTemplateKey)
            ? bodyTemplateKey
            : 'template1';
        const rd = reportData;
        const stList = rd?.students as unknown[] | undefined;
        const stFirst =
          Array.isArray(stList) && stList.length > 0 ? (stList[0] as Record<string, unknown>) : undefined;
        const cls = String(stFirst?.current_class ?? '');
        const reportCount =
          Array.isArray(reportDataList) && reportDataList.length > 0 ? reportDataList.length : 1;
        const normalizedKey = normalizeSecondaryTemplateKeyForPdf(cls, templateKeyRaw);
        const useStandardDynamic = shouldUseOlevelStandardDynamicPdf(normalizedKey, cls, reportCount);

        const pdf = await page.pdf(
          useStandardDynamic
            ? await pdfOptionsOlevelStandardSinglePage(page)
            : {
                format: 'A4',
                printBackground: true,
                margin: { top: '4mm', right: '5mm', bottom: '4mm', left: '5mm' },
              }
        );
        await page.close();

        const student = reportData?.students?.[0];
        const examSet = reportData?.examSet;
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

        return new NextResponse(pdf, {
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="${filename}.pdf"`,
          },
        });
      } finally {
        await browser.close();
      }
    }

    // Class PDF without htmlContent: not implemented here; client could send combined HTML or use Vercel PDF API with reportDataList
    if (type === 'class') {
      return NextResponse.json(
        { error: 'Class PDF requires htmlContent. Generate preview first, then download.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'htmlContent is required to generate PDF that matches the preview.' },
      { status: 400 }
    );
  } catch (e) {
    console.error('Reports generate-pdf error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
