import { createServiceRoleClient } from '../supabaseServiceRole.js';
import { decryptSchoolPaySecret } from './crypto.js';
import { syncSchoolPayForSchoolDay, syncSchoolPayRange } from './runSync.js';
import type { SchoolPayApiSessionOk } from '../schoolpayResolveSession.js';

function yesterdayIso(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export async function runSchoolPaySyncPost(
  session: SchoolPayApiSessionOk,
  body: { transactionDate?: string; fromDate?: string; toDate?: string }
): Promise<{ status: number; json: Record<string, unknown> }> {
  const service = createServiceRoleClient();
  const { data: settings, error: sErr } = await service
    .from('schoolpay_school_settings')
    .select('*')
    .eq('school_id', session.schoolId)
    .maybeSingle();

  if (sErr || !settings?.enabled) {
    return { status: 400, json: { error: 'SchoolPay is not enabled for this school' } };
  }

  const code = String(settings.schoolpay_school_code || '').trim();
  if (!code || !settings.api_password_encrypted) {
    return { status: 400, json: { error: 'Configure school code and API password first' } };
  }

  let password: string;
  try {
    password = decryptSchoolPaySecret(settings.api_password_encrypted as string);
  } catch (e) {
    console.error('[schoolpay sync] decrypt', e);
    return { status: 500, json: { error: 'Could not read stored API password' } };
  }

  const fromDate = body.fromDate?.trim();
  const toDate = body.toDate?.trim();

  let result: Awaited<ReturnType<typeof syncSchoolPayForSchoolDay>> | Awaited<ReturnType<typeof syncSchoolPayRange>>;

  if (fromDate && toDate) {
    const start = new Date(fromDate);
    const end = new Date(toDate);
    const days = (end.getTime() - start.getTime()) / (86400 * 1000);
    if (days < 0 || days > 31) {
      return { status: 400, json: { error: 'Invalid range (max 31 days)' } };
    }
    result = await syncSchoolPayRange(service, session.schoolId, code, password, fromDate, toDate);
  } else {
    const transactionDate = body.transactionDate?.trim() || yesterdayIso();
    result = await syncSchoolPayForSchoolDay(service, session.schoolId, code, password, transactionDate);
  }

  const errMsg = result.ok ? null : result.error || 'sync_failed';
  await service
    .from('schoolpay_school_settings')
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_error: errMsg,
    })
    .eq('school_id', session.schoolId);

  return { status: 200, json: { ...result } };
}

export default { runSchoolPaySyncPost };
