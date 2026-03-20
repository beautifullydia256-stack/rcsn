import { NextRequest, NextResponse } from 'next/server';

function escapeHtml(s: string) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * POST /api/notifications/test-email
 * Body: { "to": "you@example.com", "message": "...", "subject": "optional" }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const to = typeof body?.to === 'string' ? body.to.trim() : '';
    const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';
    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    if (!to || !message) {
      return NextResponse.json(
        { success: false, error: 'Missing to or message.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.RESEND_API_KEY?.trim();
    const from = process.env.RESEND_FROM?.trim() || 'PwezaCore <noreply@pwezacore.com>';
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'RESEND_API_KEY not configured.' },
        { status: 400 }
      );
    }

    const html = message.trim().startsWith('<') ? message : `<p>${escapeHtml(message)}</p>`;

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: subject || 'PwezaCore test',
        html,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: (data as { message?: string }).message || res.statusText },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, id: (data as { id?: string }).id });
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
