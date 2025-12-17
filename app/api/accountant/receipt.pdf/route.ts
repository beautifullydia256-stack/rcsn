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

    // Load payment + student
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

    // Load school details
    const { data: school } = await supabase
      .from('schools')
      .select('name, motto, phone, email, address, logo')
      .eq('school_id', school_id)
      .maybeSingle();

    // Load student balance for this term
    const { data: balance } = await supabase
      .from('student_balances')
      .select('total_fees, total_paid, balance')
      .eq('student_id', pay.student_id)
      .eq('term_id', pay.term_id)
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
    const totalPaid = Number(p.amount_paid || 0);
    const notes = p.notes || 'School Fees Payment';
    
    const totalFees = Number(bal.total_fees || 0);
    const previousPaid = Number(bal.total_paid || 0) - totalPaid;
    const remainingBalance = Number(bal.balance || 0);

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Payment Receipt - ${rcptNo}</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary: #1e40af;
      --primary-light: #3b82f6;
      --accent: #059669;
      --danger: #dc2626;
      --muted: #6b7280;
      --light: #f8fafc;
      --border: #e2e8f0;
    }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      height: 100%;
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background: #f1f5f9;
      color: #1e293b;
    }
    .page {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: white;
      padding: 20mm;
    }
    
    /* Header with school info */
    .header {
      display: flex;
      align-items: center;
      gap: 20px;
      padding-bottom: 20px;
      border-bottom: 3px solid var(--primary);
      margin-bottom: 24px;
    }
    .logo-container {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      overflow: hidden;
      border: 3px solid var(--primary);
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--light);
      flex-shrink: 0;
    }
    .logo-container img {
      max-width: 100%;
      max-height: 100%;
      object-fit: contain;
    }
    .logo-placeholder {
      font-size: 24px;
      font-weight: 700;
      color: var(--primary);
    }
    .school-info {
      flex: 1;
      text-align: center;
    }
    .school-name {
      font-family: 'Playfair Display', serif;
      font-size: 28px;
      font-weight: 700;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .school-motto {
      font-size: 12px;
      color: var(--muted);
      font-style: italic;
      margin-top: 4px;
    }
    .school-contact {
      font-size: 11px;
      color: var(--muted);
      margin-top: 8px;
    }
    
    /* Receipt title */
    .receipt-title {
      text-align: center;
      margin-bottom: 24px;
    }
    .receipt-title h1 {
      font-size: 22px;
      font-weight: 700;
      color: var(--primary);
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 8px;
    }
    .receipt-badge {
      display: inline-block;
      background: var(--accent);
      color: white;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
    }
    
    /* Info grid */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-bottom: 24px;
    }
    .info-box {
      background: var(--light);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
    }
    .info-box h3 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--muted);
      margin-bottom: 12px;
      font-weight: 600;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      font-size: 13px;
    }
    .info-row:last-child { margin-bottom: 0; }
    .info-label { color: var(--muted); }
    .info-value { font-weight: 600; color: #1e293b; }
    
    /* Payment details table */
    .payment-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .payment-table th {
      background: var(--primary);
      color: white;
      padding: 12px 16px;
      text-align: left;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .payment-table th:last-child { text-align: right; }
    .payment-table td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border);
      font-size: 14px;
    }
    .payment-table td:last-child { text-align: right; font-weight: 600; }
    .payment-table tbody tr:hover { background: var(--light); }
    
    /* Summary section */
    .summary-section {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 30px;
    }
    .summary-box {
      width: 280px;
      background: var(--light);
      border: 2px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 16px;
      font-size: 13px;
      border-bottom: 1px solid var(--border);
    }
    .summary-row:last-child { border-bottom: none; }
    .summary-row.total {
      background: var(--primary);
      color: white;
      font-weight: 700;
      font-size: 16px;
    }
    .summary-row.balance {
      background: ${remainingBalance > 0 ? '#fef2f2' : '#f0fdf4'};
      color: ${remainingBalance > 0 ? 'var(--danger)' : 'var(--accent)'};
      font-weight: 600;
    }
    
    /* Footer */
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      padding-top: 30px;
      border-top: 1px dashed var(--border);
    }
    .signature-box {
      text-align: center;
    }
    .signature-line {
      width: 180px;
      border-bottom: 1px solid #1e293b;
      margin-bottom: 8px;
      height: 40px;
    }
    .signature-label {
      font-size: 11px;
      color: var(--muted);
    }
    .stamp-area {
      width: 100px;
      height: 100px;
      border: 2px dashed var(--border);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--muted);
      font-size: 10px;
      text-align: center;
    }
    .footer-note {
      text-align: center;
      font-size: 10px;
      color: var(--muted);
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid var(--border);
    }
    
    @page { size: A4; margin: 0; }
    @media print {
      html, body { background: white; }
      .page { box-shadow: none; margin: 0; padding: 15mm; }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="logo-container">
        ${logoImg ? `<img src="${logoImg}" alt="School Logo">` : `<span class="logo-placeholder">${schoolName.charAt(0)}</span>`}
      </div>
      <div class="school-info">
        <div class="school-name">${schoolName}</div>
        ${schoolMotto ? `<div class="school-motto">"${schoolMotto}"</div>` : ''}
        <div class="school-contact">
          ${schoolAddress ? `${schoolAddress}` : ''}
          ${schoolPhone ? ` | Tel: ${schoolPhone}` : ''}
          ${schoolEmail ? ` | Email: ${schoolEmail}` : ''}
        </div>
      </div>
      <div class="logo-container" style="visibility: hidden;">
        <!-- Placeholder for symmetry -->
      </div>
    </div>
    
    <!-- Receipt Title -->
    <div class="receipt-title">
      <h1>Official Payment Receipt</h1>
      <span class="receipt-badge">✓ Payment Confirmed</span>
    </div>
    
    <!-- Info Grid -->
    <div class="info-grid">
      <div class="info-box">
        <h3>Receipt Information</h3>
        <div class="info-row">
          <span class="info-label">Receipt No:</span>
          <span class="info-value">${rcptNo}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Date:</span>
          <span class="info-value">${rcptDate}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Time:</span>
          <span class="info-value">${rcptTime}</span>
        </div>
        <div class="info-row">
          <span class="info-label">Received By:</span>
          <span class="info-value">${receivedBy}</span>
        </div>
      </div>
      <div class="info-box">
        <h3>Student Information</h3>
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
        <div class="info-row">
          <span class="info-label">Payment Method:</span>
          <span class="info-value">${payMethod}</span>
        </div>
      </div>
    </div>
    
    <!-- Payment Details Table -->
    <table class="payment-table">
      <thead>
        <tr>
          <th style="width: 60%">Description</th>
          <th style="width: 20%">Reference</th>
          <th style="width: 20%">Amount (UGX)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${notes.replace(/</g, '&lt;')}</td>
          <td>${txRef.replace(/</g, '&lt;')}</td>
          <td>${totalPaid.toLocaleString()}</td>
        </tr>
      </tbody>
    </table>
    
    <!-- Summary Section -->
    <div class="summary-section">
      <div class="summary-box">
        <div class="summary-row">
          <span>Total Term Fees:</span>
          <span>UGX ${totalFees.toLocaleString()}</span>
        </div>
        <div class="summary-row">
          <span>Previously Paid:</span>
          <span>UGX ${Math.max(0, previousPaid).toLocaleString()}</span>
        </div>
        <div class="summary-row total">
          <span>Amount Paid Now:</span>
          <span>UGX ${totalPaid.toLocaleString()}</span>
        </div>
        <div class="summary-row balance">
          <span>Outstanding Balance:</span>
          <span>UGX ${Math.max(0, remainingBalance).toLocaleString()}</span>
        </div>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Accountant / Cashier Signature</div>
      </div>
      <div class="stamp-area">
        Official<br>School<br>Stamp
      </div>
      <div class="signature-box">
        <div class="signature-line"></div>
        <div class="signature-label">Parent / Guardian Signature</div>
      </div>
    </div>
    
    <div class="footer-note">
      This is an official computer-generated receipt. Please retain for your records.<br>
      For any queries, contact the school accounts office.
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
      format: 'A4', 
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

