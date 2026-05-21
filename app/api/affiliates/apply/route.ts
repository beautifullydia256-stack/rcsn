import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

const OWNER_EMAIL = 'kimulitechug@gmail.com';

async function notifyOwner(name: string, email: string, phone: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // email notification requires RESEND_API_KEY in env

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'PwezaCore <noreply@pwezacore.com>',
      to: [OWNER_EMAIL],
      subject: `New Affiliate Application — ${name}`,
      html: `
        <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
          <h2 style="color:#1e293b;margin:0 0 16px">New Affiliate Application</h2>
          <p style="color:#475569;margin:0 0 24px">Someone has applied to join the PwezaCore affiliate program.</p>
          <table style="width:100%;border-collapse:collapse;background:#f8fafc;border-radius:8px;overflow:hidden;">
            <tr>
              <td style="padding:12px 16px;font-weight:600;color:#1e293b;border-bottom:1px solid #e2e8f0;width:120px;">Name</td>
              <td style="padding:12px 16px;color:#334155;border-bottom:1px solid #e2e8f0;">${name}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-weight:600;color:#1e293b;border-bottom:1px solid #e2e8f0;">Email</td>
              <td style="padding:12px 16px;color:#334155;border-bottom:1px solid #e2e8f0;">${email}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-weight:600;color:#1e293b;">WhatsApp</td>
              <td style="padding:12px 16px;color:#334155;">${phone || '—'}</td>
            </tr>
          </table>
          <p style="color:#94a3b8;font-size:13px;margin:24px 0 0;">
            Log in to your owner dashboard → Affiliates to review and invite them.
          </p>
        </div>
      `,
    }),
  }).catch(() => {}); // non-fatal
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Server not configured' }, { status: 500 });
    }

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = typeof body.phone === 'string' && body.phone.trim() ? body.phone.trim() : null;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 });
    }
    if (!/.+@.+\..+/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from('affiliates')
      .select('affiliate_id')
      .ilike('email', email)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'An application with this email already exists. Contact us if you need help.' },
        { status: 409 }
      );
    }

    const { data, error } = await supabaseAdmin
      .from('affiliates')
      .insert({ name, email, phone, status: 'PENDING' })
      .select('affiliate_id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Fire-and-forget email to owner
    void notifyOwner(name, email, phone ?? '');

    return NextResponse.json({ success: true, affiliate_id: data.affiliate_id });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 500 });
  }
}
