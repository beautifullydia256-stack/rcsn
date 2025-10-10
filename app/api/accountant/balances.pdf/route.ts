import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export const runtime = 'nodejs';
export const maxDuration = 60;
// Updated: Using admission numbers instead of UUIDs

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const className = url.searchParams.get('class') || '';
    const minBalance = parseFloat(url.searchParams.get('minBalance') || '0');

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
    const { data: balancesData, error } = await supabase
      .from('student_balances')
      .select(`
        balance_id,
        student_id,
        total_fees,
        total_paid,
        balance,
        students!inner(name, admission_number),
        classes!inner(class_name)
      `)
      .eq('school_id', school_id);
    
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Transform and filter data
    let rows = (balancesData || []).map((b: any) => ({
      student_id: b.students?.admission_number || 'N/A',
      name: b.students?.name || 'Unknown',
      current_class: b.classes?.class_name || 'N/A',
      expected_amount: b.total_fees,
      total_paid: b.total_paid,
      balance: b.balance
    }));

    // Debug logging
    console.log('PDF Generation - First 2 rows:', rows.slice(0, 2));

    if (className) {
      rows = rows.filter((r: any) => r.current_class === className);
    }
    
    rows = rows.filter((r: any) => (Number(r.balance) || 0) >= (minBalance || 0));
    const title = 'Balances & Arrears Report';
    const subtitle = [className ? `Class: ${className}` : '', minBalance ? `Min Balance: ${minBalance}` : ''].filter(Boolean).join(' • ');
    const tableRows = rows.map((r:any) => `
      <tr>
        <td>${r.student_id}</td>
        <td>${(r.name || '').replace(/</g,'&lt;')}</td>
        <td>${r.current_class || ''}</td>
        <td style="text-align:right">${Number(r.expected_amount || 0).toLocaleString()}</td>
        <td style="text-align:right">${Number(r.total_paid || 0).toLocaleString()}</td>
        <td style="text-align:right">${Number(r.balance || 0).toLocaleString()}</td>
      </tr>
    `).join('');
    const totalOutstanding = rows.reduce((s:any,r:any)=> s + Number(r.balance||0),0);

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
    .totals { margin-top: 10px; font-size: 13px; }
  </style>
  <title>${title}</title>
  </head>
  <body>
    <h1>${title}</h1>
    <div class="sub">${subtitle || ''}</div>
    <table>
      <thead>
        <tr>
          <th>Admission Number</th>
          <th>Name</th>
          <th>Class</th>
          <th style="text-align:right">Expected</th>
          <th style="text-align:right">Paid</th>
          <th style="text-align:right">Balance</th>
        </tr>
      </thead>
      <tbody>
        ${tableRows || '<tr><td colspan="6" style="text-align:center;color:#777">No data</td></tr>'}
      </tbody>
    </table>
    <div class="totals">Total Outstanding: UGX ${totalOutstanding.toLocaleString()}</div>
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
        'Content-Disposition': 'attachment; filename="balances.pdf"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


