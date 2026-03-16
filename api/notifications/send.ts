export const config = { runtime: 'nodejs' };

import { createClient } from '@supabase/supabase-js';
import * as https from 'node:https';
import { Buffer } from 'node:buffer';

function getEnvAny(keys: string[]): string | undefined {
  for (const k of keys) {
    const v = process.env[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}

function normalizePhone(to: string): string {
  const digits = to.replace(/\D/g, '').replace(/^0/, '254');
  return digits.startsWith('254') ? `+${digits}` : `+254${digits}`;
}

async function sendAfricaTalkingSMS(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AFRICASTALKING_USERNAME;
  const senderId = process.env.AFRICASTALKING_SENDER_ID || 'AFRICASTKNG';
  const isSandbox = process.env.AFRICASTALKING_SANDBOX === 'true';

  if (!apiKey || !username) {
    return { success: false, error: 'SMS provider not configured. Set AFRICASTALKING_API_KEY and AFRICASTALKING_USERNAME.' };
  }

  const normalized = normalizePhone(to);

  const url = isSandbox
    ? 'https://api.sandbox.africastalking.com/version1/messaging'
    : 'https://api.africastalking.com/version1/messaging/bulk';

  const httpsRequest = async (
    u: string,
    opts: { method: 'POST'; headers: Record<string, string> },
    body: string
  ): Promise<{ status: number; text: string }> => {
    return await new Promise((resolve, reject) => {
      const parsed = new URL(u);
      const req = https.request(
        {
          protocol: parsed.protocol,
          hostname: parsed.hostname,
          port: parsed.port ? Number(parsed.port) : undefined,
          path: `${parsed.pathname}${parsed.search}`,
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
  };

  if (isSandbox) {
    const body = new URLSearchParams({ username, to: normalized, message, from: senderId }).toString();
    const r = await httpsRequest(
      url,
      { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', apiKey } },
      body
    );
    let data: any = {};
    try {
      data = JSON.parse(r.text || '{}');
    } catch {
      data = {};
    }
    const rec = data?.SMSMessageData?.Recipients?.[0];
    const ok = rec && (rec.statusCode === 100 || rec.statusCode === 101 || rec.statusCode === 102);
    return ok ? { success: true } : { success: false, error: rec?.status ?? `HTTP ${r.status}` };
  }

  const r = await httpsRequest(
    url,
    { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', apiKey } },
    JSON.stringify({ username, phoneNumbers: [normalized], message, senderId })
  );
  let data: any = {};
  try {
    data = JSON.parse(r.text || '{}');
  } catch {
    data = {};
  }
  const rec = data?.SMSMessageData?.Recipients?.[0];
  const ok = rec && (rec.statusCode === 100 || rec.statusCode === 101 || rec.statusCode === 102);
  return ok ? { success: true } : { success: false, error: rec?.status ?? `HTTP ${r.status}` };
}

async function sendEmail(_to: string, _subject: string, _body: string) {
  // Placeholder; keep behavior consistent with existing route
  return { success: true as const };
}

async function sendWhatsApp(_to: string, _message: string) {
  // Placeholder; keep behavior consistent with existing route
  return { success: true as const };
}

export default async function handler(req: any, res: any) {
  try {
    const supabaseUrl = getEnvAny(['SUPABASE_URL', 'VITE_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_URL']);
    const serviceKey = getEnvAny(['SUPABASE_SERVICE_ROLE_KEY', 'VITE_SUPABASE_SERVICE_ROLE_KEY']);

    if (!supabaseUrl || !serviceKey) {
      res.status(500).json({
        success: false,
        error: 'Missing Supabase server env. Set SUPABASE_URL (or VITE_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.',
      });
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
        pending: data?.filter((n: any) => n.status === 'pending').length || 0,
        sent: data?.filter((n: any) => n.status === 'sent').length || 0,
        failed: data?.filter((n: any) => n.status === 'failed').length || 0,
        byType: {
          email: data?.filter((n: any) => n.notification_type === 'email').length || 0,
          sms: data?.filter((n: any) => n.notification_type === 'sms').length || 0,
          whatsapp: data?.filter((n: any) => n.notification_type === 'whatsapp').length || 0,
        },
        byCategory: {
          academic: data?.filter((n: any) => n.category === 'academic').length || 0,
          attendance: data?.filter((n: any) => n.category === 'attendance').length || 0,
          financial: data?.filter((n: any) => n.category === 'financial').length || 0,
          behavior: data?.filter((n: any) => n.category === 'behavior').length || 0,
          announcement: data?.filter((n: any) => n.category === 'announcement').length || 0,
          event: data?.filter((n: any) => n.category === 'event').length || 0,
        },
      };

      res.status(200).json({ success: true, stats });
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ success: false, error: 'Method not allowed. Use GET or POST.' });
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
      res.status(200).json({ success: true, message: 'No pending notifications', processed: 0 });
      return;
    }

    let sent = 0;
    let failed = 0;

    for (const notif of pendingNotifications as any[]) {
      try {
        let result: any = null;
        if (notif.notification_type === 'email') {
          result = await sendEmail(notif.recipient, notif.subject || 'School Notification', notif.message);
        } else if (notif.notification_type === 'sms') {
          result = await sendAfricaTalkingSMS(notif.recipient, notif.message);
        } else if (notif.notification_type === 'whatsapp') {
          result = await sendWhatsApp(notif.recipient, notif.message);
        }

        if (result?.success) {
          await supabaseAdmin
            .from('notification_logs')
            .update({ status: 'sent', sent_at: new Date().toISOString() })
            .eq('log_id', notif.log_id);
          sent++;
        } else {
          await supabaseAdmin
            .from('notification_logs')
            .update({ status: 'failed', error_message: result?.error || 'Unknown error' })
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

    res.status(200).json({ success: true, processed: pendingNotifications.length, sent, failed });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Notification send error:', err);
    res.status(500).json({ success: false, error: String(err) });
  }
}

