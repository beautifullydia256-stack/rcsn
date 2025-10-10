import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const start = url.searchParams.get('start');
    const end = url.searchParams.get('end');
    const className = url.searchParams.get('class') || '';

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set() {},
        remove() {},
      },
    });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: u } = await supabase.from('users').select('school_id').eq('user_id', user.id).single();
    const school_id = u?.school_id as string | undefined;
    if (!school_id) return NextResponse.json({ error: 'School not found' }, { status: 400 });

    // Query student_balances with real-time data
    const { data: balancesData, error: balError } = await supabase
      .from('student_balances')
      .select(`
        total_fees,
        total_paid,
        balance,
        last_payment_date,
        classes(class_name)
      `)
      .eq('school_id', school_id);
    
    if (balError) return NextResponse.json({ error: balError.message }, { status: 500 });

    // Aggregate data by date and class
    const aggregated: any = {};
    (balancesData || []).forEach((b: any) => {
      const currentClass = b.classes?.class_name || 'Unassigned';
      
      // Filter by class if specified
      if (className && currentClass !== className) return;
      
      const date = b.last_payment_date || 'No Payment';
      
      // Apply date filters
      if (start && date < start) return;
      if (end && date > end) return;
      
      const key = `${date}_${currentClass}`;
      if (!aggregated[key]) {
        aggregated[key] = {
          date: date,
          current_class: currentClass,
          expected_total: 0,
          collected_total: 0,
          outstanding_total: 0
        };
      }
      aggregated[key].expected_total += Number(b.total_fees || 0);
      aggregated[key].collected_total += Number(b.total_paid || 0);
      aggregated[key].outstanding_total += Number(b.balance || 0);
    });

    const rows = Object.values(aggregated);
    const title = 'Term Summary Report';
    const subtitle = [start ? `From ${start}` : '', end ? `To ${end}` : '', className ? `Class: ${className}` : ''].filter(Boolean).join(' • ');
    const tableRows = rows.map((r:any) => `
      <tr>
        <td>${r.date}</td>
        <td>${r.current_class || ''}</td>
        <td style="text-align:right">${Number(r.expected_total || 0).toLocaleString()}</td>
        <td style="text-align:right">${Number(r.collected_total || 0).toLocaleString()}</td>
        <td style="text-align:right">${Number(r.outstanding_total || 0).toLocaleString()}</td>
      </tr>
    `).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4; margin: 12mm; }
    body { font-family: Arial, sans-serif; color: #111; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .sub { color: #555; font-size: 12px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th, td { border: 1px solid #ddd; padding: 6px; }
    th { background: #f5f5f5; text-align: left; }
  </style>
  <title>${title}</title>
  </head>
  <body>
    <h1>${title}</h1>
    <div class="sub">${subtitle || ''}</div>
    <table>
      <thead>
        <tr>
          <th>Date</th>
          <th>Class</th>
          <th style="text-align:right">Expected</th>
          <th style="text-align:right">Collected</th>
          <th style="text-align:right">Outstanding</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows || '<tr><td colspan="5" style="text-align:center;color:#777">No data</td></tr>'}
      </tbody>
    </table>
  </body>
</html>`;

    const isVercel = process.env.VERCEL === '1';
    let browser: any;
    try {
      browser = await puppeteer.launch(isVercel ? {
        args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox'],
        executablePath: await chromium.executablePath(),
        headless: true,
      } : { headless: true, args: ['--no-sandbox'] });
    } catch (e) {
      browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
    }
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' }});
    await page.close();
    await browser.close();

    return new NextResponse(pdf as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="term-summary.pdf"'
      }
    });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


