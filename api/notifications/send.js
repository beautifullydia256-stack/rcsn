// CommonJS serverless function for sending queued notifications.

const { createClient } = require('@supabase/supabase-js');
const https = require('https');

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

async function sendEmail(_to, _subject, _body) {
  return { success: true };
}

async function sendWhatsApp(_to, _message) {
  return { success: true };
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

    const { data: pendingNotifications, error } = await supabaseAdmin
      .from('notification_logs')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(100);

    if (error) throw error;

    if (!pendingNotifications || pendingNotifications.length === 0) {
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ success: true, message: 'No pending notifications', processed: 0 }));
      return;
    }

    let sent = 0;
    let failed = 0;

    for (const notif of pendingNotifications) {
      try {
        let result = null;
        if (notif.notification_type === 'email') {
          result = await sendEmail(notif.recipient, notif.subject || 'School Notification', notif.message);
        } else if (notif.notification_type === 'sms') {
          result = await sendAfricaTalkingSMS(notif.recipient, notif.message);
        } else if (notif.notification_type === 'whatsapp') {
          result = await sendWhatsApp(notif.recipient, notif.message);
        }

        if (result && result.success) {
          await supabaseAdmin
            .from('notification_logs')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('log_id', notif.log_id);
          sent++;
        } else {
          await supabaseAdmin
            .from('notification_logs')
            .update({ status: 'failed', error_message: (result && result.error) || 'Unknown error' })
            .eq('log_id', notif.log_id);
          failed++;
        }
      } catch (err) {
        await supabaseAdmin
          .from('notification_logs')
          .update({ status: 'failed', error_message: String(err) })
          .eq('log_id', notif.log_id);
        failed++;
      }
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, processed: pendingNotifications.length, sent, failed }));
  } catch (err) {
    console.error('Notification send handler error', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: false, error: String(err) }));
  }
};

