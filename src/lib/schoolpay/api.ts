import { schoolPayMd5Upper } from './hash';
import type { SchoolPaySyncResponse } from './types';

const BASE = 'https://schoolpay.co.ug/paymentapi/AndroidRS';

export function buildSyncSchoolTransactionsUrl(schoolCode: string, transactionDate: string, password: string): string {
  const hash = schoolPayMd5Upper(`${schoolCode}${transactionDate}${password}`);
  const enc = encodeURIComponent;
  return `${BASE}/SyncSchoolTransactions/${enc(schoolCode)}/${enc(transactionDate)}/${enc(hash)}`;
}

export function buildSchoolRangeTransactionsUrl(
  schoolCode: string,
  fromDate: string,
  toDate: string,
  password: string
): string {
  const hash = schoolPayMd5Upper(`${schoolCode}${fromDate}${password}`);
  const enc = encodeURIComponent;
  return `${BASE}/SchoolRangeTransactions/${enc(schoolCode)}/${enc(fromDate)}/${enc(toDate)}/${enc(hash)}`;
}

export async function fetchSchoolPayDay(schoolCode: string, transactionDate: string, password: string): Promise<SchoolPaySyncResponse> {
  const url = buildSyncSchoolTransactionsUrl(schoolCode, transactionDate, password);
  const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`SchoolPay HTTP ${res.status}`);
  }
  return (await res.json()) as SchoolPaySyncResponse;
}

export async function fetchSchoolPayRange(
  schoolCode: string,
  fromDate: string,
  toDate: string,
  password: string
): Promise<SchoolPaySyncResponse> {
  const url = buildSchoolRangeTransactionsUrl(schoolCode, fromDate, toDate, password);
  const res = await fetch(url, { method: 'GET', headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`SchoolPay HTTP ${res.status}`);
  }
  return (await res.json()) as SchoolPaySyncResponse;
}
