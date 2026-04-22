import { NextRequest, NextResponse } from 'next/server';
import { runSchoolPayWebhookPost } from '@/lib/schoolpay/webhookHttp';
import type { SchoolPayWebhookPayload } from '@/lib/schoolpay/types';

export const runtime = 'nodejs';

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ token: string }> | { token: string } }
) {
  const p = await Promise.resolve(ctx.params);
  let body: SchoolPayWebhookPayload;
  try {
    body = (await request.json()) as SchoolPayWebhookPayload;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const { status, json } = await runSchoolPayWebhookPost(p.token, body);
  return NextResponse.json(json, { status });
}
