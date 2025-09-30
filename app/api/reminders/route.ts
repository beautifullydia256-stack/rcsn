import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => ({}));

    // In a real integration, dispatch to SMS/Email/WhatsApp providers here.
    // For now, just acknowledge receipt so the UI can proceed.
    return NextResponse.json({ ok: true, received: payload }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message || 'Unknown error' }, { status: 500 });
  }
}


