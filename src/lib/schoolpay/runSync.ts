import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchSchoolPayDay, fetchSchoolPayRange } from './api.js';
import { ingestSchoolPayPayment } from './ingest.js';
import type { SchoolPayPaymentRecord, SchoolPaySyncResponse } from './types.js';

export type SyncDayResult = {
  ok: boolean;
  transactionDate?: string;
  regularPosted: number;
  regularDup: number;
  regularFailed: number;
  suppPosted: number;
  suppDup: number;
  suppFailed: number;
  error?: string;
};

function isSyncOk(res: SchoolPaySyncResponse): boolean {
  return res.returnCode === 0;
}

async function ingestList(
  service: SupabaseClient,
  schoolId: string,
  items: SchoolPayPaymentRecord[] | undefined,
  kind: 'SCHOOL_FEES' | 'OTHER_FEES'
): Promise<{ posted: number; dup: number; failed: number }> {
  let posted = 0;
  let dup = 0;
  let failed = 0;
  for (const p of items || []) {
    const r = await ingestSchoolPayPayment(service, { schoolId, kind, payment: p });
    if (r.ok) {
      if (r.duplicate) dup += 1;
      else posted += 1;
    } else {
      failed += 1;
    }
  }
  return { posted, dup, failed };
}

export async function syncSchoolPayForSchoolDay(
  service: SupabaseClient,
  schoolId: string,
  schoolCode: string,
  apiPassword: string,
  transactionDate: string
): Promise<SyncDayResult> {
  let res: SchoolPaySyncResponse;
  try {
    res = await fetchSchoolPayDay(schoolCode, transactionDate, apiPassword);
  } catch (e) {
    return {
      ok: false,
      transactionDate,
      regularPosted: 0,
      regularDup: 0,
      regularFailed: 0,
      suppPosted: 0,
      suppDup: 0,
      suppFailed: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  if (!isSyncOk(res)) {
    return {
      ok: false,
      transactionDate,
      regularPosted: 0,
      regularDup: 0,
      regularFailed: 0,
      suppPosted: 0,
      suppDup: 0,
      suppFailed: 0,
      error: res.returnMessage || `returnCode ${res.returnCode}`,
    };
  }

  const reg = await ingestList(service, schoolId, res.transactions, 'SCHOOL_FEES');
  const sup = await ingestList(service, schoolId, res.supplementaryFeePayments, 'OTHER_FEES');

  return {
    ok: true,
    transactionDate,
    regularPosted: reg.posted,
    regularDup: reg.dup,
    regularFailed: reg.failed,
    suppPosted: sup.posted,
    suppDup: sup.dup,
    suppFailed: sup.failed,
  };
}

export async function syncSchoolPayRange(
  service: SupabaseClient,
  schoolId: string,
  schoolCode: string,
  apiPassword: string,
  fromDate: string,
  toDate: string
): Promise<SyncDayResult & { fromDate: string; toDate: string }> {
  let res: SchoolPaySyncResponse;
  try {
    res = await fetchSchoolPayRange(schoolCode, fromDate, toDate, apiPassword);
  } catch (e) {
    return {
      ok: false,
      fromDate,
      toDate,
      regularPosted: 0,
      regularDup: 0,
      regularFailed: 0,
      suppPosted: 0,
      suppDup: 0,
      suppFailed: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }

  if (!isSyncOk(res)) {
    return {
      ok: false,
      fromDate,
      toDate,
      regularPosted: 0,
      regularDup: 0,
      regularFailed: 0,
      suppPosted: 0,
      suppDup: 0,
      suppFailed: 0,
      error: res.returnMessage || `returnCode ${res.returnCode}`,
    };
  }

  const reg = await ingestList(service, schoolId, res.transactions, 'SCHOOL_FEES');
  const sup = await ingestList(service, schoolId, res.supplementaryFeePayments, 'OTHER_FEES');

  return {
    ok: true,
    fromDate,
    toDate,
    regularPosted: reg.posted,
    regularDup: reg.dup,
    regularFailed: reg.failed,
    suppPosted: sup.posted,
    suppDup: sup.dup,
    suppFailed: sup.failed,
  };
}
