import { NextRequest, NextResponse } from 'next/server';
import { sendEgoSms } from '@/lib/sms';

/**
 * POST /api/notifications/test-sms
 * Body: { "phone": "+256711XXXYYY", "message": "Test from PwezaCore" }
 * Sends one SMS via EgoSMS for testing.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    if (!phone || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing phone or message. Send JSON: { "phone": "+256...", "message": "..." }' },
        { status: 400 }
      );
    }

    const result = await sendEgoSms(phone, message);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Test SMS error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
