import { digitsOnly } from './normalizePhone';

/** Parse Wasender / Baileys-style webhook body for a single inbound text from a user (not group, not fromMe). */
export function extractInboundPayload(body: unknown): { fromDigits: string; text: string } | null {
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
