import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const startDate = url.searchParams.get('start');
    const endDate = url.searchParams.get('end');
    const category = url.searchParams.get('category') || '';
    const status = url.searchParams.get('status') || '';

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
    
    const { data: userRow } = await supabase
      .from('users')
      .select('school_id, name')
      .eq('user_id', user.id)
      .single();
    
    const school_id = userRow?.school_id as string | undefined;
    if (!school_id) return NextResponse.json({ error: 'School not found' }, { status: 400 });

    // Get school info
    const { data: schoolData } = await supabase
      .from('schools')
      .select('name')
      .eq('school_id', school_id)
      .single();

    // Build query for expenses
    let query = supabase
      .from('school_expenses')
      .select(`
        expense_id,
        category_name,
        description,
        amount,
        expense_date,
        reference_number,
        status,
        payment_method,
        created_at
      `)
      .eq('school_id', school_id)
      .order('expense_date', { ascending: false });

    // Apply filters
    if (startDate) query = query.gte('expense_date', startDate);
    if (endDate) query = query.lte('expense_date', endDate);
    if (category) query = query.eq('category_name', category);
    if (status) query = query.eq('status', status);

    const { data: expensesData, error: expensesError } = await query;
    
    if (expensesError) return NextResponse.json({ error: expensesError.message }, { status: 500 });

    // Calculate totals
    const totalAmount = (expensesData || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const approvedAmount = (expensesData || [])
      .filter(e => e.status === 'approved' || e.status === 'paid')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const pendingAmount = (expensesData || [])
      .filter(e => e.status === 'pending')
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);

    // Generate title and subtitle
    const title = 'School Expenses Report';
    const filters = [];
    if (startDate) filters.push(`From ${startDate}`);
    if (endDate) filters.push(`To ${endDate}`);
    if (category) filters.push(`Category: ${category}`);
    if (status) filters.push(`Status: ${status.charAt(0).toUpperCase() + status.slice(1)}`);
    const subtitle = filters.join(' • ') || 'All Expenses';

    // Generate table rows
    const tableRows = (expensesData || []).map((e: any) => {
      const statusColor = 
        e.status === 'approved' || e.status === 'paid' ? '#10b981' :
        e.status === 'pending' ? '#f59e0b' :
        '#ef4444';
      
      return `
        <tr>
          <td>${new Date(e.expense_date).toLocaleDateString()}</td>
          <td>${e.reference_number}</td>
          <td>${e.category_name}</td>
          <td>${e.description || '-'}</td>
          <td style="text-align:right">${Number(e.amount || 0).toLocaleString()}</td>
          <td>${e.payment_method}</td>
          <td style="color:${statusColor};font-weight:600">${e.status.charAt(0).toUpperCase() + e.status.slice(1)}</td>
        </tr>
      `;
    }).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: Arial, sans-serif; color: #111; }
    .header { margin-bottom: 20px; }
    h1 { font-size: 20px; margin: 0 0 4px; color: #1e40af; }
    .school-name { font-size: 14px; color: #666; margin-bottom: 8px; }
    .sub { color: #555; font-size: 12px; margin-bottom: 12px; }
    .summary { 
      display: flex; 
      justify-content: space-around; 
      margin: 16px 0; 
      padding: 12px; 
      background: #f9fafb; 
      border-radius: 8px;
      border: 1px solid #e5e7eb;
    }
    .summary-item { text-align: center; }
    .summary-label { font-size: 11px; color: #666; text-transform: uppercase; margin-bottom: 4px; }
    .summary-value { font-size: 18px; font-weight: 700; }
    .summary-value.total { color: #1e40af; }
    .summary-value.approved { color: #10b981; }
    .summary-value.pending { color: #f59e0b; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    th, td { border: 1px solid #ddd; padding: 8px; }
    th { background: #1e40af; color: white; text-align: left; font-weight: 600; }
    tbody tr:nth-child(even) { background: #f9fafb; }
    .footer { 
      margin-top: 20px; 
      padding-top: 12px; 
      border-top: 1px solid #ddd; 
      font-size: 10px; 
      color: #666; 
      text-align: center;
    }
  </style>
  <title>${title}</title>
</head>
<body>
  <div class="header">
    <h1>${title}</h1>
    <div class="school-name">${schoolData?.name || 'School'}</div>
    <div class="sub">${subtitle}</div>
  </div>

  <div class="summary">
    <div class="summary-item">
      <div class="summary-label">Total Expenses</div>
      <div class="summary-value total">UGX ${totalAmount.toLocaleString()}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Approved/Paid</div>
      <div class="summary-value approved">UGX ${approvedAmount.toLocaleString()}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Pending</div>
      <div class="summary-value pending">UGX ${pendingAmount.toLocaleString()}</div>
    </div>
    <div class="summary-item">
      <div class="summary-label">Total Records</div>
      <div class="summary-value">${(expensesData || []).length}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Reference</th>
        <th>Category</th>
        <th>Description</th>
        <th style="text-align:right">Amount (UGX)</th>
        <th>Payment Method</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows || '<tr><td colspan="7" style="text-align:center;color:#777;padding:20px">No expenses found</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    Generated on ${new Date().toLocaleString()} by ${userRow?.name || 'System'} • ${schoolData?.name || 'School'}
  </div>
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
    const pdf = await page.pdf({ 
      format: 'A4', 
      landscape: true,
      printBackground: true, 
      margin: { top: '12mm', right: '12mm', bottom: '12mm', left: '12mm' }
    });
    await page.close();
    await browser.close();

    return new NextResponse(pdf as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="school-expenses.pdf"'
      }
    });
  } catch (e) {
    console.error('Error generating expenses PDF:', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

