// CommonJS serverless: send one test email via Resend (same env as send.js).

const https = require('https');
const { buildEmailHtml } = require('../../lib/emailHtml');

function sanitizeHeaderValue(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/\r\n|\r|\n/g, '').trim();
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function httpsRequest(url, opts, body) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port ? Number(u.port) : undefined,
        path: `${u.pathname}${u.search}`,
        method: opts.method,
        headers: { ...opts.headers, 'Content-Length': Buffer.byteLength(body).toString() },
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode || 0, text: data }));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function sendResendEmail(to, subject, bodyText) {
  const apiKey = sanitizeHeaderValue(process.env.RESEND_API_KEY);
  const from = sanitizeHeaderValue(process.env.RESEND_FROM) || 'PwezaCore <noreply@pwezacore.com>';
  if (!apiKey) {
    return {
      success: false,
      error: 'RESEND_API_KEY not configured. Add it in Vercel and redeploy.',
    };
  }
  const inner = bodyText.trim().startsWith('<') ? bodyText : `<p>${escapeHtml(bodyText)}</p>`;
  const html = buildEmailHtml(inner);
  const payload = JSON.stringify({
    from,
    to: [to],
    subject: subject || 'PwezaCore test',
    html,
  });
  try {
    const r = await httpsRequest(
      'https://api.resend.com/emails',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      },
      payload
    );
    let data = {};
    try {
      data = JSON.parse(r.text || '{}');
    } catch {
      data = {};
    }
    if (r.status >= 200 && r.status < 300) {
      return { success: true, id: data.id };
    }
    return {
      success: false,
      error: data.message || data.name || r.text || `HTTP ${r.status}`,
    };
  } catch (err) {
    console.error('Resend test email error', err);
    return { success: false, error: String(err) };
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: 'Method not allowed. Use POST.' }));
    return;
  }

  try {
    const body =
      typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};

    const to = typeof body.to === 'string' ? body.to.trim() : '';
    const subject = typeof body.subject === 'string' ? body.subject.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!to || !message) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          success: false,
          error: 'Missing to or message. Send JSON: { "to": "you@example.com", "message": "...", "subject": "optional" }',
        })
      );
      return;
    }

    const result = await sendResendEmail(to, subject, message);
    res.statusCode = result.success ? 200 : 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (err) {
    console.error('Test email handler error', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: String(err) }));
  }
};
