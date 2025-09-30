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
    const { data: u } = await supabase.from('users').select('school_id').eq('user_id', user.id).maybeSingle();
    const school_id = u?.school_id as string | undefined;
    if (!school_id) return NextResponse.json({ error: 'School not found' }, { status: 400 });

    // Load payment + student + school
    const { data: pay, error: perr } = await supabase
      .from('payments')
      .select('*, students(student_id,name,current_class,admission_number), schools:school_id(name,motto,phone,email,address,logo)')
      .eq('payment_id', payment_id)
      .eq('school_id', school_id)
      .maybeSingle();
    if (perr || !pay) return NextResponse.json({ error: 'Payment not found' }, { status: 404 });

    const p = pay as any;
    const student = p.students || {};
    const school = p.schools || {};

    const logoImg = school.logo || '';
    const schoolName = school.name || 'School Name';
    const schoolTag = school.motto || '';
    const rcptNo = p.payment_id;
    const rcptDate = new Date(p.created_at || new Date()).toLocaleString();
    const payerName = p.payer_name || 'Parent/Guardian';
    const studentInfo = `Student: ${student.name || ''} — ${student.current_class || ''} — ADM: ${student.admission_number || ''}`;
    const payMethod = p.payment_method || '-';
    const txRef = p.reference || p.description || '-';
    const receivedBy = (user.user_metadata?.name as string) || 'Cashier';
    const totalPaid = Number(p.amount || 0);

    const itemsHtml = `
      <tr>
        <td>${(p.description || 'School Fees').replace(/</g,'&lt;')}</td>
        <td>1</td>
        <td class="amount">UGX ${totalPaid.toLocaleString()}</td>
      </tr>
    `;

    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>Payment Receipt</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&family=Merriweather:wght@700&display=swap" rel="stylesheet">
  <style>
    :root{ --accent:#0b5fff; --muted:#6b7280; --bg:#f3f4f6; --max-width:840px; }
    html,body{height:100%;margin:0;background:var(--bg);font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial}
    .container{padding:28px;display:flex;justify-content:center}
    .receipt{width:100%;max-width:var(--max-width);background:#fff;padding:28px;border-radius:6px;box-shadow:0 8px 24px rgba(2,6,23,0.08);box-sizing:border-box}
    .header{display:flex;align-items:center;justify-content:space-between;gap:12px}
    .brand{display:flex;gap:14px;align-items:center}
    .logo{width:72px;height:72px;border-radius:8px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;overflow:hidden}
    .logo img{max-width:100%;max-height:100%;display:block}
    .school{line-height:1}
    .school .name{font-family:Merriweather,serif;font-size:20px;color:#0f172a;font-weight:700}
    .school .tag{font-size:12px;color:var(--muted);margin-top:2px}
    .rcpt-meta{text-align:right}
    .rcpt-meta .label{font-size:12px;color:var(--muted)}
    .rcpt-meta .value{font-weight:700;font-size:16px;margin-top:4px;color:var(--accent)}
    .rcpt-meta .small{font-size:12px;color:var(--muted);margin-top:6px}
    hr{border:none;border-top:1px solid #eef2ff;margin:18px 0}
    .info-row{display:flex;gap:16px;justify-content:space-between;align-items:flex-start}
    .payer{flex:1}
    .payer .title{font-weight:600;color:#111;margin-bottom:6px}
    .payer .muted{font-size:13px;color:var(--muted)}
    .payment-summary{width:320px;background:#f8fafc;padding:12px;border-radius:6px;border:1px solid #eef2ff}
    .payment-summary .line{display:flex;justify-content:space-between;font-size:13px;color:var(--muted);margin-bottom:6px}
    .payment-summary .total{font-size:18px;font-weight:700;color:#0f172a;margin-top:6px}
    table{width:100%;border-collapse:collapse;margin-top:14px}
    th,td{padding:10px 8px;text-align:left;font-size:14px;border-bottom:1px dashed #f1f5f9}
    th{font-weight:600;color:var(--muted);font-size:13px}
    td.amount{text-align:right;color:#0f172a}
    .totals{display:flex;justify-content:flex-end;margin-top:14px}
    .totals .box{width:320px}
    .totals .row{display:flex;justify-content:space-between;padding:6px 0;color:var(--muted);font-size:14px}
    .totals .row.total{font-weight:700;color:var(--accent);font-size:18px;border-top:1px solid #eef2ff;padding-top:10px;margin-top:8px}
    .footer{display:flex;justify-content:space-between;align-items:center;margin-top:22px;gap:12px}
    .signature{min-width:220px;text-align:center;font-size:13px;color:var(--muted)}
    .verify{font-size:12px;color:var(--muted);text-align:right}
    @page { size:A4; margin:16mm }
    @media print{ body{background:white} .receipt{box-shadow:none;border-radius:0;padding:16mm} }
  </style>
</head>
<body>
  <div class="container">
    <div class="receipt" id="receipt">
      <div class="header">
        <div class="brand">
          <div class="logo" id="logoWrap">${logoImg ? `<img src="${logoImg}" alt="logo">` : `<span style="font-weight:700;color:var(--accent)">SCHOOL</span>`}</div>
          <div class="school">
            <div class="name" id="schoolName">${schoolName}</div>
            <div class="tag" id="schoolTag">${schoolTag || ''}</div>
          </div>
        </div>
        <div class="rcpt-meta">
          <div class="label">Receipt</div>
          <div class="value" id="rcptNo">${rcptNo}</div>
          <div class="small" id="rcptDate">${rcptDate}</div>
        </div>
      </div>
      <hr/>
      <div class="info-row">
        <div class="payer">
          <div class="title">Received From</div>
          <div class="muted" id="payerName">${payerName}</div>
          <div class="muted" id="studentInfo">${studentInfo}</div>
        </div>
        <div class="payment-summary">
          <div class="line"><div>Payment Method</div><div id="payMethod">${payMethod}</div></div>
          <div class="line"><div>Transaction Ref</div><div id="txRef">${(txRef || '').replace(/</g,'&lt;')}</div></div>
          <div class="line"><div>Received by</div><div id="receivedBy">${receivedBy}</div></div>
          <div class="total">Total Paid<br/><span style="font-size:20px;color:var(--accent);font-weight:700" id="totalPaid">UGX ${totalPaid.toLocaleString()}</span></div>
        </div>
      </div>
      <table aria-label="payment details">
        <thead>
          <tr><th style="width:60%">Description</th><th style="width:10%">Qty</th><th style="width:30%;text-align:right">Amount</th></tr>
        </thead>
        <tbody id="items">${itemsHtml}</tbody>
      </table>
      <div class="totals">
        <div class="box">
          <div class="row"><div>Subtotal</div><div id="subtotal">UGX ${totalPaid.toLocaleString()}</div></div>
          <div class="row"><div>Discount</div><div id="discount">UGX 0</div></div>
          <div class="row"><div>Tax</div><div id="tax">UGX 0</div></div>
          <div class="row total"><div>Total Paid</div><div id="grandTotal">UGX ${totalPaid.toLocaleString()}</div></div>
          <div class="row"><div>Balance</div><div id="balance">UGX 0</div></div>
        </div>
      </div>
      <div class="footer">
        <div class="signature">___________________________<br/>Cashier / Authorized Signatory</div>
        <div class="verify">This is a computer-generated receipt.<br/>Verify at: <strong id="verifyUrl">https://your.school/verify/${rcptNo}</strong></div>
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
    await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 20000 });
    const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '16mm', right: '16mm', bottom: '16mm', left: '16mm' } });
    await page.close();
    await browser.close();

    return new NextResponse(pdf as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="receipt-${rcptNo}.pdf"`
      }
    });
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}


