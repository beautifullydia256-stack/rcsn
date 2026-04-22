import { NextRequest, NextResponse } from 'next/server';
import { getSchoolPayApiSession } from '@/lib/schoolpayApiSession';
import { runSchoolPaySettingsGet, runSchoolPaySettingsPost } from '@/lib/schoolpay/settingsHttp';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const session = await getSchoolPayApiSession(request);
  if ('error' in session) return session.error;
  return NextResponse.json(await runSchoolPaySettingsGet(session));
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

  const { status, json } = await runSchoolPaySettingsPost(session, body);
  return NextResponse.json(json, { status });
}
