import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { createServiceRoleClient } from '@/lib/supabaseServiceRole';
import { getSchoolPayApiSession } from '@/lib/schoolpayApiSession';
import { decryptSchoolPaySecret, encryptSchoolPaySecret } from '@/lib/schoolpay/crypto';
import { fetchSchoolPayDay } from '@/lib/schoolpay/api';
import { ensureSchoolPaySettingsRow } from '@/lib/schoolpay/settings';

export const runtime = 'nodejs';

function publicBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '');
  if (explicit) return explicit;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '');
  if (appUrl) return appUrl;
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel.replace(/\/$/, '')}`;
  return '';
}

export async function GET(request: NextRequest) {
  const session = await getSchoolPayApiSession(request);
  if ('error' in session) return session.error;

  const service = createServiceRoleClient();
  const row = await ensureSchoolPaySettingsRow(service, session.schoolId);
  const base = publicBaseUrl();
  const webhookUrl = base ? `${base}/api/webhooks/schoolpay/${row.webhook_token}` : `/api/webhooks/schoolpay/${row.webhook_token}`;

  return NextResponse.json({
    enabled: row.enabled,
    schoolpaySchoolCode: row.schoolpay_school_code,
    hasApiPassword: Boolean(row.api_password_encrypted),
    webhookUrl,
    webhookToken: row.webhook_token,
    lastSyncAt: row.last_sync_at,
    lastSyncError: row.last_sync_error,
  });
}

export async function POST(request: NextRequest) {
  const session = await getSchoolPayApiSession(request);
  if ('error' in session) return session.error;

  let body: {
    enabled?: boolean;
    schoolpaySchoolCode?: string;
    apiPassword?: string;
    regenerateWebhookToken?: boolean;
    testSyncDate?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const service = createServiceRoleClient();
  const row = await ensureSchoolPaySettingsRow(service, session.schoolId);

  const updates: Record<string, unknown> = {};

  if (typeof body.enabled === 'boolean') {
    updates.enabled = body.enabled;
  }

  if (typeof body.schoolpaySchoolCode === 'string') {
    updates.schoolpay_school_code = body.schoolpaySchoolCode.trim();
  }

  if (typeof body.apiPassword === 'string' && body.apiPassword.trim().length > 0) {
    try {
      updates.api_password_encrypted = encryptSchoolPaySecret(body.apiPassword.trim());
    } catch (e) {
      console.error('[schoolpay settings] encrypt', e);
      return NextResponse.json(
        { error: 'Server cannot encrypt credentials. Set SCHOOLPAY_CREDENTIALS_SECRET (min 16 chars).' },
        { status: 500 }
      );
    }
  }

  if (body.regenerateWebhookToken === true) {
    updates.webhook_token = randomBytes(24).toString('hex');
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await service.from('schoolpay_school_settings').update(updates).eq('school_id', session.schoolId);
    if (error) {
      console.error('[schoolpay settings] update', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  let testResult: { ok: boolean; message?: string } | undefined;
  if (typeof body.testSyncDate === 'string' && body.testSyncDate.trim()) {
    const { data: fresh } = await service
      .from('schoolpay_school_settings')
      .select('*')
      .eq('school_id', session.schoolId)
      .single();
    const r = fresh as typeof row;
    const code = String(r.schoolpay_school_code || '').trim();
    let pwd = '';
    try {
      if (r.api_password_encrypted) {
        pwd = decryptSchoolPaySecret(r.api_password_encrypted);
      }
    } catch {
      testResult = { ok: false, message: 'Could not decrypt stored password' };
    }
    if (!testResult && (!code || !pwd)) {
      testResult = { ok: false, message: 'Set school code and API password first' };
    }
    if (!testResult) {
      try {
        const res = await fetchSchoolPayDay(code, body.testSyncDate.trim(), pwd);
        testResult = {
          ok: res.returnCode === 0,
          message: res.returnMessage || `returnCode ${res.returnCode}`,
        };
      } catch (e) {
        testResult = { ok: false, message: e instanceof Error ? e.message : String(e) };
      }
    }
  }

  const { data: out } = await service.from('schoolpay_school_settings').select('*').eq('school_id', session.schoolId).single();
  const finalRow = out as typeof row;
  const base = publicBaseUrl();
  const webhookUrl = base ? `${base}/api/webhooks/schoolpay/${finalRow.webhook_token}` : `/api/webhooks/schoolpay/${finalRow.webhook_token}`;

  return NextResponse.json({
    ok: true,
    enabled: finalRow.enabled,
    schoolpaySchoolCode: finalRow.schoolpay_school_code,
    hasApiPassword: Boolean(finalRow.api_password_encrypted),
    webhookUrl,
    webhookToken: finalRow.webhook_token,
    lastSyncAt: finalRow.last_sync_at,
    lastSyncError: finalRow.last_sync_error,
    testResult,
  });
}
