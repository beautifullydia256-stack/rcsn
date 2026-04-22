import { NextRequest, NextResponse } from 'next/server';
import { getSchoolPayApiSession } from '@/lib/schoolpayApiSession';
import { runSchoolPaySyncPost } from '@/lib/schoolpay/syncHttp';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const session = await getSchoolPayApiSession(request);
  if ('error' in session) return session.error;

  let body: { transactionDate?: string; fromDate?: string; toDate?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const { status, json } = await runSchoolPaySyncPost(session, body);
  return NextResponse.json(json, { status });
}
