export const config = { runtime: 'nodejs' };

import * as https from 'node:https';
import { Buffer } from 'node:buffer';

function normalizePhone(to: string): string {
  const digits = to.replace(/\D/g, '').replace(/^0/, '254');
  return digits.startsWith('254') ? `+${digits}` : `+254${digits}`;
}

async function httpsRequest(
  url: string,
  opts: { method: 'POST'; headers: Record<string, string> },
  body: string
): Promise<{ status: number; text: string }> {
  return await new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port ? Number(u.port) : undefined,
        path: `${u.pathname}${u.search}`,
        method: opts.method,
        headers: { ...opts.headers, 'Content-Length': Buffer.byteLength(body).toString() },
      },
      (res) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode || 0, text: data }));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function sendAfricaTalkingSMS(to: string, message: string): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AFRICASTALKING_USERNAME;
  const senderId = process.env.AFRICASTALKING_SENDER_ID || 'AFRICASTKNG';
  const isSandbox = process.env.AFRICASTALKING_SANDBOX === 'true';

  if (!apiKey || !username) {
    return { success: false, error: 'SMS provider not configured. Set AFRICASTALKING_API_KEY and AFRICASTALKING_USERNAME.' };
  }

  const normalized = normalizePhone(to);

  const url = isSandbox
    ? 'https://api.sandbox.africastalking.com/version1/messaging'
    : 'https://api.africastalking.com/version1/messaging/bulk';

  if (isSandbox) {
    const body = new URLSearchParams({ username, to: normalized, message, from: senderId }).toString();
    const r = await httpsRequest(
      url,
      { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', apiKey } },
      body
    );
    let data: any = {};
    try {
      data = JSON.parse(r.text || '{}');
    } catch {
      data = {};
    }
    const rec = data?.SMSMessageData?.Recipients?.[0];
    const ok = rec && (rec.statusCode === 100 || rec.statusCode === 101 || rec.statusCode === 102);
    return ok ? { success: true } : { success: false, error: rec?.status ?? `HTTP ${r.status}` };
  }

  const r = await httpsRequest(
    url,
    { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json', apiKey } },
    JSON.stringify({ username, phoneNumbers: [normalized], message, senderId })
  );
  let data: any = {};
  try {
    data = JSON.parse(r.text || '{}');
  } catch {
    data = {};
  }
  const rec = data?.SMSMessageData?.Recipients?.[0];
  const ok = rec && (rec.statusCode === 100 || rec.statusCode === 101 || rec.statusCode === 102);
  return ok ? { success: true } : { success: false, error: rec?.status ?? `HTTP ${r.status}` };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    const body =
      typeof req.body === 'string'
        ? JSON.parse(req.body || '{}')
        : (req.body ?? {});

    const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
    const message = typeof body?.message === 'string' ? body.message.trim() : '';

    if (!phone || !message) {
      res.status(400).json({
        success: false,
        error: 'Missing phone or message. Send JSON: { "phone": "+254...", "message": "..." }',
      });
      return;
    }

    const result = await sendAfricaTalkingSMS(phone, message);
    res.status(result.success ? 200 : 400).json(result);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Test SMS error:', error);
    res.status(500).json({ success: false, error: String(error) });
  }
}

