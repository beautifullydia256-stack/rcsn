import { NextRequest, NextResponse } from 'next/server';
import { createWasenderProvider } from '@/lib/whatsapp/wasenderClient';
import { processInboundMessage } from '@/lib/whatsapp/botEngine';
import { digitsOnly } from '@/lib/whatsapp/normalizePhone';
import { toUgandaE164FromDigits } from '@/lib/whatsapp/normalizePhone';
import { getSupabaseAdmin } from '@/lib/whatsapp/supabaseAdmin';

export const runtime = 'nodejs';

/**
 * Wasender inbound webhook. Configure URL + optional webhook secret in Wasender dashboard.
 * https://wasenderapi.com/api-docs/webhooks/webhook-setup
 */
export async function POST(req: NextRequest) {
  const secret = process.env.WASENDER_WEBHOOK_SECRET;
  if (secret) {
    const sig = req.headers.get('x-webhook-signature');
    if (sig !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const inbound = extractInboundPayload(body);
  if (!inbound) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const { fromDigits, text } = inbound;
  const waE164 = toUgandaE164FromDigits(fromDigits);

  try {
    const admin = getSupabaseAdmin();
    const msgs = await processInboundMessage(admin, fromDigits, waE164, text);
    const wa = createWasenderProvider();
    for (const m of msgs) {
      if (m.type === 'text') {
        const r = await wa.sendText({ toE164: waE164, text: m.text });
        if (!r.ok) console.warn('[wasender] sendText failed', r.error);
      } else {
        const r = await wa.sendDocument({
          toE164: waE164,
          documentUrl: m.url,
          fileName: m.fileName,
          caption: m.caption,
        });
        if (!r.ok) console.warn('[wasender] sendDocument failed', r.error);
      }
    }
  } catch (e) {
    console.error('[wasender webhook]', e);
  }

  return NextResponse.json({ ok: true });
}

function extractInboundPayload(body: unknown): { fromDigits: string; text: string } | null {
  const b = body as Record<string, unknown>;
  const ev = String(b.event || '');
  if (!ev.includes('message') && !ev.includes('upsert')) {
    return null;
  }

  const data = b.data as Record<string, unknown> | undefined;
  if (!data) return null;

  let rawMsg: unknown = data.messages;
  if (Array.isArray(rawMsg)) rawMsg = rawMsg[0];
  if (!rawMsg || typeof rawMsg !== 'object') return null;

  const msg = rawMsg as Record<string, unknown>;
  const key = msg.key as Record<string, unknown> | undefined;
  if (!key) return null;

  if (key.fromMe === true || key.fromMe === 'true') return null;

  const remoteJid = String(key.remoteJid || '');
  if (remoteJid.includes('@g.us')) return null;

  const bodyText = String(
    msg.messageBody ?? (msg.message as Record<string, unknown> | undefined)?.conversation ?? ''
  ).trim();
  if (!bodyText) return null;

  const cleaned = String(key.cleanedSenderPn || key.senderPn || remoteJid || '').replace(/@s\.whatsapp\.net/gi, '');
  const d = digitsOnly(cleaned);
  if (d.length < 9) return null;

  return { fromDigits: d, text: bodyText };
}
