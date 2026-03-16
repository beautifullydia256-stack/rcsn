// CommonJS serverless function for Vercel/Vasta
// Sends a single SMS via Africa's Talking (or returns a clear config error).

const https = require('https');

function normalizePhone(to) {
  const digits = to.replace(/\D/g, '').replace(/^0/, '254');
  return digits.startsWith('254') ? `+${digits}` : `+254${digits}`;
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

async function sendAfricaTalkingSMS(to, message) {
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AFRICASTALKING_USERNAME;
  const senderId = process.env.AFRICASTALKING_SENDER_ID || 'AFRICASTKNG';
  const isSandbox = process.env.AFRICASTALKING_SANDBOX === 'true';

  if (!apiKey || !username) {
    return {
      success: false,
      error: 'SMS provider not configured. Set AFRICASTALKING_API_KEY and AFRICASTALKING_USERNAME in your env.',
    };
  }

  const normalized = normalizePhone(to);

  const url = isSandbox
    ? 'https://api.sandbox.africastalking.com/version1/messaging'
    : 'https://api.africastalking.com/version1/messaging/bulk';

  try {
    if (isSandbox) {
      const body = new URLSearchParams({ username, to: normalized, message, from: senderId }).toString();
      const r = await httpsRequest(
        url,
        { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', apiKey } },
        body
      );
      let data = {};
      try {
        data = JSON.parse(r.text || '{}');
      } catch {
        data = {};
      }
      const rec = data?.SMSMessageData?.Recipients?.[0];
      const ok = rec && (rec.statusCode === 100 || rec.statusCode === 101 || rec.statusCode === 102);
      return ok ? { success: true } : { success: false, error: rec?.status || `HTTP ${r.status}` };
    }

    const r = await httpsRequest(
      url,
      { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', apiKey } },
      JSON.stringify({ username, phoneNumbers: [normalized], message, senderId })
    );
    let data = {};
    try {
      data = JSON.parse(r.text || '{}');
    } catch {
      data = {};
    }
    const rec = data?.SMSMessageData?.Recipients?.[0];
    const ok = rec && (rec.statusCode === 100 || rec.statusCode === 101 || rec.statusCode === 102);
    return ok ? { success: true } : { success: false, error: rec?.status || `HTTP ${r.status}` };
  } catch (err) {
    console.error('AfricaTalking SMS error', err);
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
      typeof req.body === 'string'
        ? JSON.parse(req.body || '{}')
        : req.body || {};

    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const message = typeof body.message === 'string' ? body.message.trim() : '';

    if (!phone || !message) {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          success: false,
          error: 'Missing phone or message. Send JSON: { "phone": "+254...", "message": "..." }',
        })
      );
      return;
    }

    const result = await sendAfricaTalkingSMS(phone, message);
    res.statusCode = result.success ? 200 : 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (err) {
    console.error('Test SMS handler error', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: String(err) }));
  }
};

