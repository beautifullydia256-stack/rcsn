/**
 * POST /api/ai/generate-pdf — CommonJS only.
 */
'use strict';

const puppeteer = require('puppeteer-core');
const chromium = require('@sparticuz/chromium');
const {
  applyAiRouteCorsHeaders,
  handleAiRouteOptions,
  parseVercelJsonBody,
} = require('../../lib/aiVercelGrok.js');

async function handler(req, res) {
  applyAiRouteCorsHeaders(res);
  if (handleAiRouteOptions(req, res)) return;

  if (req.method !== 'POST') {
    res.setHeader('Content-Type', 'application/json');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = parseVercelJsonBody(req);
    const htmlContent = body.htmlContent;
    const filename = body.filename;

    if (!htmlContent) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(400).json({ error: 'HTML content is required' });
    }

    const executablePath = await chromium.executablePath();

    const browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();

    await page.setContent(htmlContent, {
      waitUntil: 'networkidle0',
    });

    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '0',
        right: '0',
        bottom: '0',
        left: '0',
      },
    });

    await browser.close();

    const safeName = String(filename || 'document').replace(/[^\w\-./]+/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="' + safeName + '.pdf"');
    return res.status(200).send(Buffer.from(pdfBuffer));
  } catch (error) {
    console.error('PDF generation error:', error);
    res.setHeader('Content-Type', 'application/json');
    const message = error instanceof Error ? error.message : 'Failed to generate PDF';
    return res.status(500).json({ error: message });
  }
}

handler.config = { runtime: 'nodejs', maxDuration: 30 };

module.exports = handler;
