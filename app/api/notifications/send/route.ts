import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEgoSms } from '@/lib/sms';

export const maxDuration = 300; // seconds — Vercel Pro; WaSender needs 5s between messages

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const SMS_BATCH_SIZE = 20;
const WA_BATCH_SIZE  = 20;
const WA_DELAY_MS    = 5500; // WaSender account protection: 1 message per 5 seconds

async function sendSMS(to: string, message: string) {
  const result = await sendEgoSms(to, message);
  if (!result.success) console.warn('[SMS] failed', to, result.error);
  return result;
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

export async function POST(_request: NextRequest) {
  try {
    let smsSent = 0, smsFailed = 0, waSent = 0, waFailed = 0;

    // --- Process up to SMS_BATCH_SIZE pending SMS ---
    const { data: pendingSms } = await supabaseAdmin
      .from('notification_logs')
      .select('log_id, recipient, message, subject')
      .eq('status', 'pending')
      .eq('notification_type', 'sms')
      .order('created_at', { ascending: true })
      .limit(SMS_BATCH_SIZE);

    for (const notif of pendingSms || []) {
      const result = await sendSMS(notif.recipient, notif.message);
      if (result.success) {
        await supabaseAdmin.from('notification_logs').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('log_id', notif.log_id);
        smsSent++;
      } else {
        await supabaseAdmin.from('notification_logs').update({ status: 'failed', error_message: result.error || 'Unknown error' }).eq('log_id', notif.log_id);
        smsFailed++;
      }
    }

    // --- Process up to WA_BATCH_SIZE pending WhatsApp ---
    const { data: pendingWa } = await supabaseAdmin
      .from('notification_logs')
      .select('log_id, recipient, message')
      .eq('status', 'pending')
      .eq('notification_type', 'whatsapp')
      .order('created_at', { ascending: true })
      .limit(WA_BATCH_SIZE);

    for (let i = 0; i < (pendingWa || []).length; i++) {
      const notif = pendingWa![i];
      // 5.5-second gap: WaSender "account protection" enforces 1 msg per 5 seconds
      if (i > 0) await new Promise((res) => setTimeout(res, WA_DELAY_MS));
      const result = await sendWhatsApp(notif.recipient, notif.message);
      if (result.success) {
        await supabaseAdmin.from('notification_logs').update({ status: 'sent', sent_at: new Date().toISOString() }).eq('log_id', notif.log_id);
        waSent++;
      } else {
        console.warn('[WA] failed', notif.recipient, result.error);
        await supabaseAdmin.from('notification_logs').update({ status: 'failed', error_message: result.error || 'Unknown error' }).eq('log_id', notif.log_id);
        waFailed++;
      }
    }

    // Check if more messages remain (either channel)
    const { count: waRemaining } = await supabaseAdmin
      .from('notification_logs')
      .select('log_id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('notification_type', 'whatsapp');

    const { count: smsRemaining } = await supabaseAdmin
      .from('notification_logs')
      .select('log_id', { count: 'exact', head: true })
      .eq('status', 'pending')
      .eq('notification_type', 'sms');

    return NextResponse.json({
      success: true,
      sms_sent: smsSent,
      sms_failed: smsFailed,
      whatsapp_sent: waSent,
      whatsapp_failed: waFailed,
      whatsapp_remaining: waRemaining ?? 0,
      sms_remaining: smsRemaining ?? 0,
      hasMore: (waRemaining ?? 0) > 0 || (smsRemaining ?? 0) > 0,
    });
  } catch (error) {
    console.error('Notification processing error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');

    let query = supabaseAdmin
      .from('notification_logs')
      .select('status, notification_type, category', { count: 'exact' });

    if (schoolId) query = query.eq('school_id', schoolId);

    const { data, count } = await query;

    const stats = {
      total: count || 0,
      pending: data?.filter((n) => n.status === 'pending').length || 0,
      sent: data?.filter((n) => n.status === 'sent').length || 0,
      failed: data?.filter((n) => n.status === 'failed').length || 0,
      byType: {
        sms: data?.filter((n) => n.notification_type === 'sms').length || 0,
        whatsapp: data?.filter((n) => n.notification_type === 'whatsapp').length || 0,
      },
    };

    return NextResponse.json({ success: true, stats });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
