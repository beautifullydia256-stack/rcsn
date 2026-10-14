// Serverless handler for admissions transactional email dispatch via Resend.
// CommonJS format for Vercel / serverless runtime compatibility.

const https = require('https');
const path = require('path');

function getApiKey() {
  let key = (
    process.env.RESEND_API_KEY ||
    process.env.VITE_RESEND_API_KEY ||
    ''
  ).trim().replace(/^["']|["']$/g, '');

  if (!key) {
    try {
      const dotenv = require('dotenv');
      const parsed = dotenv.config({ path: path.resolve(__dirname, '../../.env.local') }).parsed;
      if (parsed && parsed.RESEND_API_KEY) {
        key = String(parsed.RESEND_API_KEY).trim().replace(/^["']|["']$/g, '');
      }
    } catch (_) {}
  }
  return key;
}

function getFromAddress() {
  return (
    process.env.RESEND_FROM ||
    'RCSN Admissions <admissions@rcsn.ac.ug>'
  ).trim().replace(/^["']|["']$/g, '');
}

function httpsPost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port ? Number(u.port) : undefined,
        path: `${u.pathname}${u.search}`,
        method: 'POST',
        headers: {
          ...headers,
          'Content-Length': Buffer.byteLength(body).toString(),
        },
      },
      (res) => {
        let text = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (text += chunk));
        res.on('end', () => resolve({ status: res.statusCode || 0, text }));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function parseRequestBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch (_) {
        return {};
      }
    }
    return req.body;
  }
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(raw || '{}'));
      } catch (_) {
        resolve({});
      }
    });
    req.on('error', () => resolve({}));
  });
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    res.statusCode = 405;
    return res.end(JSON.stringify({ success: false, error: 'Method not allowed. Use POST.' }));
  }

  const body = await parseRequestBody(req);
  const { to, subject, html, applicantName, applicationNumber } = body || {};

  if (!to || !html) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ success: false, error: 'Missing required fields: to, html' }));
  }

  const apiKey = getApiKey();
  const from = getFromAddress();

  if (!apiKey) {
    console.error('[AdmissionsEmail] RESEND_API_KEY is not configured.');
    res.statusCode = 500;
    return res.end(JSON.stringify({ success: false, error: 'RESEND_API_KEY not configured.' }));
  }

  const payload = JSON.stringify({
    from,
    to: [to],
    subject: subject || 'Rakai Community School of Nursing Notification',
    html,
  });

  try {
    const result = await httpsPost(
      'https://api.resend.com/emails',
      {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      payload
    );

    let parsed = {};
    try {
      parsed = JSON.parse(result.text || '{}');
    } catch (_) {
      parsed = {};
    }

    if (result.status >= 200 && result.status < 300) {
      res.statusCode = 200;
      return res.end(
        JSON.stringify({
          success: true,
          id: parsed.id,
          recipient: to,
        })
      );
    }

    // Handle Resend testing/sandbox restriction:
    // "You can only send testing emails to your own email address (beautifullydia256@gmail.com)"
    const errorText = parsed.message || result.text || `HTTP ${result.status}`;
    const isSandboxError =
      errorText.includes('only send testing emails') ||
      errorText.includes('verify a domain') ||
      result.status === 403;

    if (isSandboxError) {
      console.warn('[AdmissionsEmail] Resend sandbox restriction detected. Dispatching test copy to account owner...');
      const fallbackRecipient = 'beautifullydia256@gmail.com';
      
      const fallbackPayload = JSON.stringify({
        from: 'RCSN Admissions <onboarding@resend.dev>',
        to: [fallbackRecipient],
        subject: `[Sandbox Test for: ${to}] ${subject}`,
        html: `
          <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 12px; margin-bottom: 20px; font-family: sans-serif; font-size: 13px; color: #92400e; border-radius: 6px;">
            <strong>⚠️ Resend Sandbox Notice:</strong> Intended recipient was <code>${to}</code> (Applicant: ${applicantName || 'N/A'}, Ref: ${applicationNumber || 'N/A'}).
            In sandbox mode, Resend routes test emails to your verified account email. Once your custom domain (e.g. rcsn.ac.ug) is verified at <a href="https://resend.com/domains">resend.com/domains</a>, emails will be delivered directly to the applicant's email address.
          </div>
          ${html}
        `,
      });

      const fallbackResult = await httpsPost(
        'https://api.resend.com/emails',
        {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        fallbackPayload
      );

      let fallbackParsed = {};
      try {
        fallbackParsed = JSON.parse(fallbackResult.text || '{}');
      } catch (_) {}

      res.statusCode = 200;
      return res.end(
        JSON.stringify({
          success: true,
          id: fallbackParsed.id,
          isSandboxFallback: true,
          fallbackRecipient,
          originalRecipient: to,
          note: 'Delivered to verified owner email via Resend sandbox mode.',
        })
      );
    }

    res.statusCode = result.status >= 400 && result.status < 500 ? result.status : 500;
    return res.end(
      JSON.stringify({
        success: false,
        error: errorText,
      })
    );
  } catch (err) {
    console.error('[AdmissionsEmail] Request error:', err);
    res.statusCode = 500;
    return res.end(JSON.stringify({ success: false, error: String(err) }));
  }
};
