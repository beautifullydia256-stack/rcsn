import { createServiceRoleClient } from '../supabaseServiceRole.js';
import { decryptSchoolPaySecret } from './crypto.js';
import { ingestSchoolPayPayment } from './ingest.js';
import { getSchoolPaySettingsByWebhookToken } from './settings.js';
import { verifySchoolPayWebhookSignature } from './verifySignature.js';
import type { SchoolPayWebhookPayload } from './types.js';

function mapWebhookTypeToKind(t: string | undefined): 'SCHOOL_FEES' | 'OTHER_FEES' | null {
  const u = (t || '').toUpperCase();
  if (u === 'SCHOOL_FEES') return 'SCHOOL_FEES';
  if (u === 'OTHER_FEES') return 'OTHER_FEES';
  return null;
}

export async function runSchoolPayWebhookPost(
  webhookToken: string | undefined,
  body: SchoolPayWebhookPayload
): Promise<{ status: number; json: Record<string, unknown> }> {
  const token = webhookToken?.trim();
  if (!token) {
    return { status: 404, json: { error: 'missing_token' } };
  }

  const service = createServiceRoleClient();
  const settings = await getSchoolPaySettingsByWebhookToken(service, token);
  if (!settings || !settings.enabled) {
    return { status: 404, json: { error: 'unknown_or_disabled' } };
  }

  const receipt = String(body.payment?.schoolpayReceiptNumber ?? '').trim();
  const sig = String(body.signature ?? '').trim();
  if (!receipt || !sig) {
    return { status: 400, json: { error: 'missing_signature_or_receipt' } };
  }

  let apiPassword: string;
  try {
    if (!settings.api_password_encrypted) {
      return { status: 503, json: { error: 'api_password_not_configured' } };
    }
    apiPassword = decryptSchoolPaySecret(settings.api_password_encrypted);
  } catch (e) {
    console.error('[schoolpay webhook] decrypt/config', e);
    return { status: 500, json: { error: 'server_misconfigured' } };
  }

  if (!verifySchoolPayWebhookSignature(apiPassword, receipt, sig)) {
    return { status: 401, json: { error: 'invalid_signature' } };
  }

  const kind = mapWebhookTypeToKind(body.type);
  if (!kind || !body.payment) {
    return { status: 200, json: { ok: false, code: 'unsupported_type' } };
  }

  const result = await ingestSchoolPayPayment(service, {
    schoolId: settings.school_id,
    kind,
    payment: body.payment,
  });

  if (result.ok) {
    return {
      status: 200,
      json: { ok: true, duplicate: result.duplicate ?? false, paymentIds: result.paymentIds },
    };
  }

  console.warn('[schoolpay webhook] ingest failed', settings.school_id, result);
  return {
    status: 200,
    json: { ok: false, code: result.code, message: result.message },
  };
}

export default { runSchoolPayWebhookPost };
