// CommonJS serverless function for Vercel/Vasta
// Sends a single WhatsApp message via Africa's Talking Chat API.

const https = require('https');

function normalizePhone(to) {
  let digits = to.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 9 && !digits.startsWith('254') && !digits.startsWith('256')) {
    digits = '256' + digits;
  }
  return digits.startsWith('+') ? digits : `+${digits}`;
}

function isUgandaNumber(normalized) {
  return /^\+256\d{9}$/.test(normalized);
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

function sanitizeHeaderValue(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/\r\n|\r|\n/g, '').trim();
}

async function sendAfricaTalkingWhatsApp(to, message) {
  const apiKey = sanitizeHeaderValue(process.env.AFRICASTALKING_API_KEY);
  const username = sanitizeHeaderValue(process.env.AFRICASTALKING_USERNAME);
  const waNumber = sanitizeHeaderValue(process.env.AFRICASTALKING_WHATSAPP_NUMBER);

  if (!apiKey || !username || !waNumber) {
    return {
      success: false,
      error:
        'WhatsApp not configured. Set AFRICASTALKING_API_KEY, AFRICASTALKING_USERNAME and AFRICASTALKING_WHATSAPP_NUMBER (your WhatsApp business number, e.g. +256...) in Vercel.',
    };
  }

  const normalized = normalizePhone(to);
  if (!isUgandaNumber(normalized)) {
    return {
      success: false,
      error: 'Only Uganda (+256) numbers are allowed. Use e.g. 0712345678 or +256712345678.',
    };
  }

  const url = 'https://chat.africastalking.com/whatsapp/message/send';

  try {
    const body = JSON.stringify({
      username,
      waNumber,
      phoneNumber: normalized,
      body: { message },
    });

    const r = await httpsRequest(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        apiKey,
      },
    }, body);

    let data = {};
    try {
      data = JSON.parse(r.text || '{}');
    } catch {
      data = {};
    }

    const status = (data.status || '').toUpperCase();
    const ok = (r.status === 200 || r.status === 201) && (status === 'SENT' || status === 'DELIVERED' || status === 'READ');

    return ok
      ? { success: true, status, messageId: data.messageId }
      : { success: false, error: data.status || data.message || `HTTP ${r.status}` };
  } catch (err) {
    console.error('AfricaTalking WhatsApp error', err);
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
      res.end(JSON.stringify({ success: false, error: 'Missing phone or message.' }));
      return;
    }

    const result = await sendAfricaTalkingWhatsApp(phone, message);
    res.statusCode = result.success ? 200 : 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (err) {
    console.error('Test WhatsApp handler error', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: String(err) }));
  }
};
