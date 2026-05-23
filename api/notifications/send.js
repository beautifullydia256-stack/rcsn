// CommonJS serverless function for sending queued notifications.

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const { buildEmailHtml } = require('../../lib/emailHtml');

function getEnvAny(keys) {
  for (const k of keys) {
    const v = process.env[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function sanitizeHeaderValue(s) {
  if (typeof s !== 'string') return '';
  return s.replace(/\r\n|\r|\n/g, '').trim();
}

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

async function sendAfricaTalkingSMS(to, message) {
  const apiKey = sanitizeHeaderValue(process.env.AFRICASTALKING_API_KEY);
  const username = sanitizeHeaderValue(process.env.AFRICASTALKING_USERNAME);
  const senderId = sanitizeHeaderValue(process.env.AFRICASTALKING_SENDER_ID) || 'AFRICASTKNG';
  const isSandbox = process.env.AFRICASTALKING_SANDBOX === 'true';

  if (!apiKey || !username) {
    return {
      success: false,
      error: 'SMS provider not configured. Set AFRICASTALKING_API_KEY and AFRICASTALKING_USERNAME in your env.',
    };
  }

  const normalized = normalizePhone(to);
  if (!isUgandaNumber(normalized)) {
    return { success: false, error: 'Only Uganda (+256) numbers are allowed.' };
  }

  const url = isSandbox
    ? 'https://api.sandbox.africastalking.com/version1/messaging'
    : 'https://api.africastalking.com/version1/messaging/bulk';

  try {
    if (isSandbox) {
      const body = new URLSearchParams({ username, to: normalized, message, from: senderId }).toString();
      const r = await httpsRequest(
        url,
        { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', apiKey: apiKey } },
        body
      );
      let data = {};
      try {
        data = JSON.parse(r.text || '{}');
      } catch {
        data = {};
      }
      const rec = data?.SMSMessageData?.Recipients?.[0];
      const code = rec?.statusCode;
      const ok = (r.status === 200 || r.status === 201) || (code === 100 || code === 101 || code === 102);
      return ok ? { success: true } : { success: false, error: rec?.status || `HTTP ${r.status}` };
    }

    const r = await httpsRequest(
      url,
      { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', apiKey: apiKey } },
      JSON.stringify({ username, phoneNumbers: [normalized], message, senderId })
    );
    let data = {};
    try {
      data = JSON.parse(r.text || '{}');
    } catch {
      data = {};
    }
    const rec = data?.SMSMessageData?.Recipients?.[0];
    const code = rec?.statusCode;
    const ok = (r.status === 200 || r.status === 201) || (code === 100 || code === 101 || code === 102);
    return ok ? { success: true } : { success: false, error: rec?.status || `HTTP ${r.status}` };
  } catch (err) {
    console.error('AfricaTalking SMS error', err);
    return { success: false, error: String(err) };
  }
}

async function sendWasenderWhatsApp(to, message) {
  const token = process.env.WASENDER_BEARER_TOKEN;
  if (!token) return { success: false, error: 'WASENDER_BEARER_TOKEN not configured' };
  const base = (process.env.WASENDER_API_BASE || 'https://www.wasenderapi.com').replace(/\/$/, '');
  try {
    const body = JSON.stringify({ to, text: message });
    const r = await httpsRequest(
      `${base}/api/send-message`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
      body
    );
    let data = {};
    try { data = JSON.parse(r.text || '{}'); } catch { data = {}; }
    if (r.status >= 200 && r.status < 300 && data.success !== false) return { success: true };
    return { success: false, error: data.message || data.error || `HTTP ${r.status}` };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendEmail(to, subject, body) {
  const apiKey = sanitizeHeaderValue(process.env.RESEND_API_KEY);
  const from = sanitizeHeaderValue(process.env.RESEND_FROM) || 'PwezaCore <noreply@pwezacore.com>';
  if (!apiKey) {
    console.warn('[EMAIL] RESEND_API_KEY not set');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }
  const raw = typeof body === 'string' ? body : String(body);
  const inner = raw.trim().startsWith('<') ? raw : `<p>${escapeHtml(raw)}</p>`;
  const html = buildEmailHtml(inner);
  const payload = JSON.stringify({
    from,
    to: [to],
    subject: subject || 'Notification',
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
      return { success: true };
    }
    return {
      success: false,
      error: data.message || data.name || r.text || `HTTP ${r.status}`,
    };
  } catch (err) {
    console.error('Resend email error', err);
    return { success: false, error: String(err) };
  }
}

async function sendWhatsApp(to, message) {
  return sendWasenderWhatsApp(to, message);
}

module.exports = async function handler(req, res) {
  try {
    const supabaseUrl = getEnvAny(['SUPABASE_URL', 'VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']);
    const serviceKey = getEnvAny(['SUPABASE_SERVICE_ROLE_KEY', 'VITE_SUPABASE_SERVICE_ROLE_KEY']);

    if (!supabaseUrl || !serviceKey) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          success: false,
          error: 'Missing Supabase server env. Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.',
        })
      );
      return;
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (req.method === 'GET') {
      const schoolId = typeof req.query?.school_id === 'string' ? req.query.school_id : undefined;

      let query = supabaseAdmin.from('notification_logs').select('status, notification_type, category', { count: 'exact' });
      if (schoolId) query = query.eq('school_id', schoolId);

      const { data, count, error } = await query;
      if (error) throw error;

      const stats = {
        total: count || 0,
        pending: data?.filter((n) => n.status === 'pending').length || 0,
        sent: data?.filter((n) => n.status === 'sent').length || 0,
        failed: data?.filter((n) => n.status === 'failed').length || 0,
        byType: {
          email: data?.filter((n) => n.notification_type === 'email').length || 0,
          sms: data?.filter((n) => n.notification_type === 'sms').length || 0,
          whatsapp: data?.filter((n) => n.notification_type === 'whatsapp').length || 0,
        },
        byCategory: {
          academic: data?.filter((n) => n.category === 'academic').length || 0,
          attendance: data?.filter((n) => n.category === 'attendance').length || 0,
          financial: data?.filter((n) => n.category === 'financial').length || 0,
          behavior: data?.filter((n) => n.category === 'behavior').length || 0,
          announcement: data?.filter((n) => n.category === 'announcement').length || 0,
          event: data?.filter((n) => n.category === 'event').length || 0,
        },
      };

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, stats }));
      return;
    }

    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: false, error: 'Method not allowed. Use GET or POST.' }));
      return;
    }

    const WHATSAPP_BATCH = 20;
    let smsSent = 0, smsFailed = 0, waSent = 0, waFailed = 0;

    // Process all pending SMS (up to 200)
    const { data: pendingSms } = await supabaseAdmin
      .from('notification_logs')
      .select('log_id, recipient, message, subject')
      .eq('status', 'pending')
      .eq('notification_type', 'sms')
      .order('created_at', { ascending: true })
      .limit(200);

    for (const notif of pendingSms || []) {
      try {
        const result = await sendAfricaTalkingSMS(notif.recipient, notif.message);
        if (result.success) {
          await supabaseAdmin.from('notification_logs').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('log_id', notif.log_id);
          smsSent++;
        } else {
          await supabaseAdmin.from('notification_logs').update({ status: 'failed', error_message: result.error || 'Unknown error' }).eq('log_id', notif.log_id);
          smsFailed++;
        }
      } catch (err) {
        await supabaseAdmin.from('notification_logs').update({ status: 'failed', error_message: String(err) }).eq('log_id', notif.log_id);
        smsFailed++;
      }
    }

    // Process pending WhatsApp in batches of 20
    const { data: pendingWa } = await supabaseAdmin
      .from('notification_logs')
      .select('log_id, recipient, message')
      .eq('status', 'pending')
      .eq('notification_type', 'whatsapp')
      .order('created_at', { ascending: true })
      .limit(WHATSAPP_BATCH);

    for (const notif of pendingWa || []) {
      try {
        const result = await sendWhatsApp(notif.recipient, notif.message);
        if (result.success) {
          await supabaseAdmin.from('notification_logs').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('log_id', notif.log_id);
          waSent++;
        } else {
          await supabaseAdmin.from('notification_logs').update({ status: 'failed', error_message: result.error || 'Unknown error' }).eq('log_id', notif.log_id);
          waFailed++;
        }
      } catch (err) {
        await supabaseAdmin.from('notification_logs').update({ status: 'failed', error_message: String(err) }).eq('log_id', notif.log_id);
        waFailed++;
      }
    }

    const { count: waRemaining } = await supabaseAdmin
      .from('notification_logs')
      .select('log_id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('notification_type', 'whatsapp');

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      success: true,
      sms_sent: smsSent,
      sms_failed: smsFailed,
      whatsapp_sent: waSent,
      whatsapp_failed: waFailed,
      whatsapp_remaining: waRemaining || 0,
      hasMore: (waRemaining || 0) > 0,
    }));
  } catch (err) {
    console.error('Notification send handler error', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: String(err) }));
  }
};

