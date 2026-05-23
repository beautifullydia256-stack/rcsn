import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const WHATSAPP_BATCH_SIZE = 20;

async function sendSMS(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AFRICASTALKING_USERNAME || 'sandbox';
  const senderId = process.env.AFRICASTALKING_SENDER_ID || '';
  if (!apiKey) return { success: false, error: 'AFRICASTALKING_API_KEY not configured' };

  const params = new URLSearchParams({ username, to, message });
  if (senderId) params.append('from', senderId);

  try {
    const res = await fetch('https://api.africastalking.com/version1/messaging', {
      method: 'POST',
      headers: { apiKey, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });
    const json = (await res.json().catch(() => ({}))) as { SMSMessageData?: { Recipients?: { status: string }[] } };
    const recipient = json?.SMSMessageData?.Recipients?.[0];
    if (!res.ok || (recipient && recipient.status !== 'Success')) {
      return { success: false, error: `AT status: ${recipient?.status ?? res.status}` };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

async function sendWhatsApp(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  const token = process.env.WASENDER_BEARER_TOKEN;
  if (!token) return { success: false, error: 'WASENDER_BEARER_TOKEN not configured' };
  try {
    const base = (process.env.WASENDER_API_BASE || 'https://www.wasenderapi.com').replace(/\/$/, '');
    const res = await fetch(`${base}/api/send-message`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, text: message }),
    });
    const json = (await res.json().catch(() => ({}))) as { success?: boolean; message?: string; error?: string };
    if (!res.ok || json.success === false) {
      return { success: false, error: json?.message || json?.error || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : String(e) };
  }
}

export default async function handler(request: NextRequest) {
  if (request.method === 'GET') {
    try {
      const { searchParams } = new URL(request.url);
      const schoolId = searchParams.get('school_id');

      let query = supabase.from('notification_logs').select('status, notification_type, category', { count: 'exact' });
      if (schoolId) query = query.eq('school_id', schoolId);

      const { data, count } = await query;

      return NextResponse.json({
        success: true,
        stats: {
          total: count || 0,
          pending: data?.filter((n) => n.status === 'pending').length || 0,
          sent: data?.filter((n) => n.status === 'sent').length || 0,
          failed: data?.filter((n) => n.status === 'failed').length || 0,
          byType: {
            sms: data?.filter((n) => n.notification_type === 'sms').length || 0,
            whatsapp: data?.filter((n) => n.notification_type === 'whatsapp').length || 0,
          },
        },
      });
    } catch (error) {
      return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
  }

  if (request.method === 'POST') {
    try {
      let smsSent = 0, smsFailed = 0, waSent = 0, waFailed = 0;

      const { data: pendingSms } = await supabase
        .from('notification_logs')
        .select('log_id, recipient, message')
        .eq('status', 'pending')
        .eq('notification_type', 'sms')
        .order('created_at', { ascending: true })
        .limit(200);

      for (const notif of pendingSms || []) {
        const result = await sendSMS(notif.recipient, notif.message);
        if (result.success) {
          await supabase.from('notification_logs').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('log_id', notif.log_id);
          smsSent++;
        } else {
          await supabase.from('notification_logs').update({ status: 'failed', error_message: result.error || 'Unknown error' }).eq('log_id', notif.log_id);
          smsFailed++;
        }
      }

      const { data: pendingWa } = await supabase
        .from('notification_logs')
        .select('log_id, recipient, message')
        .eq('status', 'pending')
        .eq('notification_type', 'whatsapp')
        .order('created_at', { ascending: true })
        .limit(WHATSAPP_BATCH_SIZE);

      for (const notif of pendingWa || []) {
        const result = await sendWhatsApp(notif.recipient, notif.message);
        if (result.success) {
          await supabase.from('notification_logs').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('log_id', notif.log_id);
          waSent++;
        } else {
          await supabase.from('notification_logs').update({ status: 'failed', error_message: result.error || 'Unknown error' }).eq('log_id', notif.log_id);
          waFailed++;
        }
      }

      const { count: waRemaining } = await supabase
        .from('notification_logs')
        .select('log_id', { count: 'exact', head: true })
        .eq('status', 'pending')
        .eq('notification_type', 'whatsapp');

      return NextResponse.json({
        success: true,
        sms_sent: smsSent,
        sms_failed: smsFailed,
        whatsapp_sent: waSent,
        whatsapp_failed: waFailed,
        whatsapp_remaining: waRemaining ?? 0,
        hasMore: (waRemaining ?? 0) > 0,
      });
    } catch (error) {
      return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
