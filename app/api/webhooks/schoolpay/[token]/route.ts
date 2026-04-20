import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabaseServiceRole';
import { decryptSchoolPaySecret } from '@/lib/schoolpay/crypto';
import { ingestSchoolPayPayment } from '@/lib/schoolpay/ingest';
import { getSchoolPaySettingsByWebhookToken } from '@/lib/schoolpay/settings';
import { verifySchoolPayWebhookSignature } from '@/lib/schoolpay/verifySignature';
import type { SchoolPayWebhookPayload } from '@/lib/schoolpay/types';

export const runtime = 'nodejs';

function mapWebhookTypeToKind(t: string | undefined): 'SCHOOL_FEES' | 'OTHER_FEES' | null {
  const u = (t || '').toUpperCase();
  if (u === 'SCHOOL_FEES') return 'SCHOOL_FEES';
  if (u === 'OTHER_FEES') return 'OTHER_FEES';
  return null;
}

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ token: string }> | { token: string } }
) {
  const p = await Promise.resolve(ctx.params);
  const { token } = p;
  const webhookToken = token?.trim();
  if (!webhookToken) {
    return NextResponse.json({ error: 'missing_token' }, { status: 404 });
  }

  let body: SchoolPayWebhookPayload;
  try {
    body = (await request.json()) as SchoolPayWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const service = createServiceRoleClient();
  const settings = await getSchoolPaySettingsByWebhookToken(service, webhookToken);
  if (!settings || !settings.enabled) {
    return NextResponse.json({ error: 'unknown_or_disabled' }, { status: 404 });
  }

  const receipt = String(body.payment?.schoolpayReceiptNumber ?? '').trim();
  const sig = String(body.signature ?? '').trim();
  if (!receipt || !sig) {
    return NextResponse.json({ error: 'missing_signature_or_receipt' }, { status: 400 });
  }

  let apiPassword: string;
  try {
    if (!settings.api_password_encrypted) {
      return NextResponse.json({ error: 'api_password_not_configured' }, { status: 503 });
    }
    apiPassword = decryptSchoolPaySecret(settings.api_password_encrypted);
  } catch (e) {
    console.error('[schoolpay webhook] decrypt/config', e);
    return NextResponse.json({ error: 'server_misconfigured' }, { status: 500 });
  }

  if (!verifySchoolPayWebhookSignature(apiPassword, receipt, sig)) {
    return NextResponse.json({ error: 'invalid_signature' }, { status: 401 });
  }

  const kind = mapWebhookTypeToKind(body.type);
  if (!kind || !body.payment) {
    return NextResponse.json({ ok: false, code: 'unsupported_type' }, { status: 200 });
  }

  const result = await ingestSchoolPayPayment(service, {
    schoolId: settings.school_id,
    kind,
    payment: body.payment,
  });

  if (result.ok) {
    return NextResponse.json({ ok: true, duplicate: result.duplicate ?? false, paymentIds: result.paymentIds });
  }

  console.warn('[schoolpay webhook] ingest failed', settings.school_id, result);
  return NextResponse.json({ ok: false, code: result.code, message: result.message }, { status: 200 });
}
