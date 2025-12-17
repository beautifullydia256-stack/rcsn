import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const payment_id = url.searchParams.get('payment_id');
    if (!payment_id) return NextResponse.json({ error: 'payment_id is required' }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        get(name: string) { return request.cookies.get(name)?.value; },
        set() {},
        remove() {},
      },
    });

    // Auth
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: userData } = await supabase.from('users').select('school_id, name').eq('user_id', user.id).maybeSingle();
    const school_id = userData?.school_id as string | undefined;
    if (!school_id) return NextResponse.json({ error: 'School not found' }, { status: 400 });

    // Load payment
    const { data: pay, error: perr } = await supabase
      .from('student_payments')
      .select('*')
      .eq('payment_id', payment_id)
      .eq('school_id', school_id)
      .maybeSingle();
    
    if (perr || !pay) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    // Load student details
    const { data: student } = await supabase
      .from('students')
      .select('student_id, name, current_class, admission_number')
      .eq('student_id', pay.student_id)
      .maybeSingle();

    // Load school details (only select columns that exist)
    const { data: school } = await supabase
      .from('schools')
      .select('*')
      .eq('school_id', school_id)
      .maybeSingle();

    // Load student balance (without term_id since it doesn't exist)
    const { data: balance } = await supabase
      .from('student_balances')
      .select('total_fees, total_paid, balance')
      .eq('student_id', pay.student_id)
      .eq('school_id', school_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const p = pay as any;
    const s = student || {} as any;
    const sch = school || {} as any;
    const bal = balance || { total_fees: 0, total_paid: 0, balance: 0 } as any;

    const logoImg = sch.logo || '';
    const schoolName = sch.name || 'School Name';
    const schoolMotto = sch.motto || '';
    const schoolPhone = sch.phone || '';
    const schoolEmail = sch.email || '';
    const schoolAddress = sch.address || '';
    
    const rcptNo = `RCP-${p.payment_id.slice(0, 8).toUpperCase()}`;
    const rcptDate = new Date(p.payment_date || p.created_at || new Date()).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });
    const rcptTime = new Date(p.created_at || new Date()).toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit'
    });
    
    const studentName = s.name || 'Student';
    const studentClass = s.current_class || '-';
    const admissionNo = s.admission_number || '-';
    const payMethod = (p.payment_method || 'cash').toUpperCase();
    const txRef = p.transaction_ref || '-';
    const receivedBy = userData?.name || 'Cashier';
    const totalPaid = Number(p.amount_paid || p.amount || 0);
    const description = p.description || 'School Fees Payment';
    
    const totalFees = Number(bal.total_fees || 0);
    const previousPaid = Math.max(0, Number(bal.total_paid || 0) - totalPaid);
    const remainingBalance = Number(bal.balance || 0);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Receipt ${rcptNo}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&family=Source+Sans+Pro:wght@300;400;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: 'Source Sans Pro', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f5f5f5;
      color: #333;
      line-height: 1.5;
    }
    
    .receipt {
      width: 210mm;
      min-height: 148mm;
      margin: 0 auto;
      background: #fff;
      position: relative;
      overflow: hidden;
    }
    
    /* Decorative border */
    .receipt::before {
      content: '';
      position: absolute;
      top: 8mm;
      left: 8mm;
      right: 8mm;
      bottom: 8mm;
      border: 2px solid #1a365d;
      pointer-events: none;
    }
    
    .receipt-inner {
      padding: 14mm 16mm;
    }
    
    /* Header */
    .header {
      display: flex;
      align-items: center;
      padding-bottom: 12px;
      border-bottom: 3px double #1a365d;
      margin-bottom: 16px;
    }
    
    .logo-section {
      width: 70px;
      height: 70px;
      border-radius: 50%;
      border: 2px solid #1a365d;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      background: #f8fafc;
      flex-shrink: 0;
    }
    
    .logo-section img {
      max-width: 90%;
      max-height: 90%;
      object-fit: contain;
    }
    
    .logo-placeholder {
      font-family: 'Crimson Pro', serif;
      font-size: 32px;
      font-weight: 700;
      color: #1a365d;
    }
    
    .school-details {
      flex: 1;
      text-align: center;
      padding: 0 20px;
    }
    
    .school-name {
      font-family: 'Crimson Pro', serif;
      font-size: 26px;
      font-weight: 700;
      color: #1a365d;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 2px;
    }
    
    .school-motto {
      font-size: 11px;
      color: #64748b;
      font-style: italic;
      margin-bottom: 4px;
    }
    
    .school-contact {
      font-size: 10px;
      color: #64748b;
    }
    
    /* Receipt Title */
    .receipt-header {
      text-align: center;
      margin-bottom: 20px;
    }
    
    .receipt-title {
      display: inline-block;
      background: linear-gradient(135deg, #1a365d 0%, #2d4a7c 100%);
      color: white;
      padding: 8px 32px;
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 3px;
      border-radius: 2px;
    }
    
    .receipt-number {
      margin-top: 8px;
      font-size: 13px;
      color: #475569;
    }
    
    .receipt-number strong {
      color: #1a365d;
      font-weight: 700;
    }
    
    /* Two Column Layout */
    .info-columns {
      display: flex;
      gap: 24px;
      margin-bottom: 20px;
    }
    
    .info-column {
      flex: 1;
    }
    
    .info-section {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 12px 14px;
    }
    
    .info-title {
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #1a365d;
      font-weight: 700;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      margin-bottom: 6px;
    }
    
    .info-row:last-child { margin-bottom: 0; }
    
    .info-label {
      color: #64748b;
    }
    
    .info-value {
      font-weight: 600;
      color: #1e293b;
      text-align: right;
    }
    
    /* Payment Table */
    .payment-section {
      margin-bottom: 16px;
    }
    
    .payment-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    
    .payment-table th {
      background: #1a365d;
      color: white;
      padding: 10px 12px;
      text-align: left;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 10px;
      letter-spacing: 0.5px;
    }
    
    .payment-table th:last-child {
      text-align: right;
    }
    
    .payment-table td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
      background: #fff;
    }
    
    .payment-table td:last-child {
      text-align: right;
      font-weight: 700;
      font-size: 14px;
      color: #1a365d;
    }
    
    /* Summary */
    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 20px;
    }
    
    .summary-box {
      width: 220px;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      overflow: hidden;
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 12px;
      font-size: 11px;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .summary-row:last-child { border-bottom: none; }
    
    .summary-row.highlight {
      background: #1a365d;
      color: white;
      font-weight: 700;
      font-size: 13px;
    }
    
    .summary-row.balance {
      background: ${remainingBalance > 0 ? '#fef2f2' : '#f0fdf4'};
      color: ${remainingBalance > 0 ? '#dc2626' : '#059669'};
      font-weight: 600;
    }
    
    /* Signatures */
    .signatures {
      display: flex;
      justify-content: space-between;
      padding-top: 16px;
      border-top: 1px dashed #cbd5e1;
    }
    
    .signature-block {
      text-align: center;
      width: 140px;
    }
    
    .signature-line {
      border-bottom: 1px solid #1e293b;
      height: 30px;
      margin-bottom: 4px;
    }
    
    .signature-label {
      font-size: 9px;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .stamp-box {
      width: 80px;
      height: 80px;
      border: 2px dashed #cbd5e1;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      color: #94a3b8;
      text-align: center;
      text-transform: uppercase;
    }
    
    /* Footer */
    .footer-note {
      text-align: center;
      font-size: 9px;
      color: #94a3b8;
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
    }
    
    @page { size: A5 landscape; margin: 0; }
    @media print {
      body { background: white; }
      .receipt { box-shadow: none; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="receipt-inner">
      <!-- Header -->
      <div class="header">
        <div class="logo-section">
          ${logoImg ? `<img src="${logoImg}" alt="Logo">` : `<span class="logo-placeholder">${schoolName.charAt(0)}</span>`}
        </div>
        <div class="school-details">
          <div class="school-name">${schoolName}</div>
          ${schoolMotto ? `<div class="school-motto">"${schoolMotto}"</div>` : ''}
          <div class="school-contact">
            ${[schoolAddress, schoolPhone ? `Tel: ${schoolPhone}` : '', schoolEmail].filter(Boolean).join(' • ')}
          </div>
        </div>
        <div class="logo-section" style="visibility: hidden;"></div>
      </div>
      
      <!-- Receipt Title -->
      <div class="receipt-header">
        <div class="receipt-title">Payment Receipt</div>
        <div class="receipt-number">Receipt No: <strong>${rcptNo}</strong> | Date: <strong>${rcptDate}</strong> | Time: <strong>${rcptTime}</strong></div>
      </div>
      
      <!-- Info Columns -->
      <div class="info-columns">
        <div class="info-column">
          <div class="info-section">
            <div class="info-title">Student Details</div>
            <div class="info-row">
              <span class="info-label">Name:</span>
              <span class="info-value">${studentName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Admission No:</span>
              <span class="info-value">${admissionNo}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Class:</span>
              <span class="info-value">${studentClass}</span>
            </div>
          </div>
        </div>
        <div class="info-column">
          <div class="info-section">
            <div class="info-title">Payment Details</div>
            <div class="info-row">
              <span class="info-label">Method:</span>
              <span class="info-value">${payMethod}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Reference:</span>
              <span class="info-value">${txRef}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Received By:</span>
              <span class="info-value">${receivedBy}</span>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Payment Table -->
      <div class="payment-section">
        <table class="payment-table">
          <thead>
            <tr>
              <th style="width: 70%">Description</th>
              <th style="width: 30%">Amount (UGX)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${description}</td>
              <td>${totalPaid.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <!-- Summary -->
      <div class="summary-section">
        <div class="summary-box">
          <div class="summary-row">
            <span>Term Fees:</span>
            <span>UGX ${totalFees.toLocaleString()}</span>
          </div>
          <div class="summary-row">
            <span>Previously Paid:</span>
            <span>UGX ${previousPaid.toLocaleString()}</span>
          </div>
          <div class="summary-row highlight">
            <span>Paid Now:</span>
            <span>UGX ${totalPaid.toLocaleString()}</span>
          </div>
          <div class="summary-row balance">
            <span>Balance:</span>
            <span>UGX ${Math.max(0, remainingBalance).toLocaleString()}</span>
          </div>
        </div>
      </div>
      
      <!-- Signatures -->
      <div class="signatures">
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-label">Cashier Signature</div>
        </div>
        <div class="stamp-box">Official<br>Stamp</div>
        <div class="signature-block">
          <div class="signature-line"></div>
          <div class="signature-label">Parent/Guardian</div>
        </div>
      </div>
      
      <div class="footer-note">
        This is a computer-generated receipt. Keep for your records. Contact accounts office for queries.
      </div>
    </div>
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
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    const pdf = await page.pdf({ 
      format: 'A5',
      landscape: true,
      printBackground: true, 
      margin: { top: '0', right: '0', bottom: '0', left: '0' } 
    });
    await page.close();
    await browser.close();

    return new NextResponse(pdf as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="receipt-${rcptNo}.pdf"`
      }
    });
  } catch (e: any) {
    console.error('Receipt generation error:', e);
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}
