import { NextRequest, NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { html } = await request.json();
    if (!html || typeof html !== 'string') {
      return NextResponse.json({ error: 'html is required' }, { status: 400 });
    }

    const isVercel = process.env.VERCEL === '1';
    let browser: any;
    try {
      browser = await puppeteer.launch(isVercel ? {
        args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: await chromium.executablePath(),
        headless: true,
      } : {
        headless: true,
        args: ['--no-sandbox','--disable-setuid-sandbox']
      });
    } catch (e) {
      // Fallback
      browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    }

    const page = await browser.newPage();
    
    // Ensure all assets including images are loaded
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Additional wait to ensure images are rendered
    await page.waitForSelector('img', { timeout: 5000 }).catch(() => {
      console.log('No images found or timeout waiting for images');
    });
    
    // Extra time for any remaining assets
    await new Promise(r => setTimeout(r, 1000));

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' },
    });

    await page.close();
    await browser.close();

    return new NextResponse(pdf as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="headed-paper.pdf"'
      }
    });
  } catch (e) {
    console.error('Headed paper PDF error:', e);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}


