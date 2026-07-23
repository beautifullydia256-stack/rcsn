/**
 * EgoSMS (Pahappa Comms platform) — Uganda bulk SMS.
 * @see https://developers.pahappa.com (SDK source used as the API reference:
 *      https://github.com/Pahappa-LTD/comms-sdk/blob/main/js/src/v1/CommsSDK.ts)
 *
 * Implemented as a direct HTTP call rather than the `comms-sdk` npm package so the same
 * logic can be mirrored exactly in the CommonJS Vercel function (api/notifications/send.js),
 * which can't reliably `require()` an ESM-only package.
 */

const EGOSMS_URL = 'https://comms.egosms.co/api/v1/json/';

type EgoSmsResponse = {
  Status?: 'OK' | 'Failed' | string;
  Message?: string;
  Cost?: number;
  Currency?: string;
  MsgFollowUpUniqueCode?: string;
};

export type SendSmsOptions = {
  /** '0' (highest) through '4' (lowest). Defaults to '1' (high) for ordinary notifications. */
  priority?: '0' | '1' | '2' | '3' | '4';
  /** Included on the second header line, under "PwezaCore", when provided. */
  schoolName?: string;
};

/** Uganda-only phone normalization to E.164 (+256...). */
export function normalizeUgandaPhone(to: string): string {
  let digits = to.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 9 && !digits.startsWith('254') && !digits.startsWith('256')) {
    digits = `256${digits}`;
  }
  return digits.startsWith('+') ? digits : `+${digits}`;
}

export function isUgandaNumber(normalized: string): boolean {
  return /^\+256\d{9}$/.test(normalized);
}

/** Every outgoing SMS must lead with the company name — applied here so no caller can forget it. */
function buildBrandedMessage(message: string, schoolName?: string): string {
  const body = schoolName ? `${schoolName}\n${message}` : message;
  return `PwezaCore:\n\n${body}`;
}

export async function sendEgoSms(
  to: string,
  message: string,
  opts: SendSmsOptions = {}
): Promise<{ success: boolean; error?: string }> {
  const username = process.env.EGOSMS_USERNAME?.trim();
  const apiKey = process.env.EGOSMS_API_KEY?.trim();
  const senderId = process.env.EGOSMS_SENDER_ID?.trim() || 'EgoSMS';
  const priority = opts.priority ?? '1';

  if (!username || !apiKey) {
    return { success: false, error: 'SMS provider not configured. Set EGOSMS_USERNAME and EGOSMS_API_KEY.' };
  }

  const normalized = normalizeUgandaPhone(to);
  if (!isUgandaNumber(normalized)) {
    return { success: false, error: 'Only Uganda (+256) numbers are supported.' };
  }

  try {
    const res = await fetch(EGOSMS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        method: 'SendSms',
        userdata: { username, password: apiKey },
        msgdata: [
          {
            number: normalized,
            message: buildBrandedMessage(message, opts.schoolName),
            senderid: senderId,
            priority,
          },
        ],
      }),
    });
    const data = (await res.json().catch(() => ({}))) as EgoSmsResponse;
    if (res.ok && data.Status === 'OK') return { success: true };
    return { success: false, error: data.Message || `HTTP ${res.status}` };
  } catch (error) {
    console.error('EgoSMS send error:', error);
    return { success: false, error: String(error) };
  }
}
