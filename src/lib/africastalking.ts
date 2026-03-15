/**
 * Africa's Talking SMS API
 * @see https://developers.africastalking.com/docs/sms/sending
 */
export async function sendAfricaTalkingSMS(
  to: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.AFRICASTALKING_API_KEY;
  const username = process.env.AFRICASTALKING_USERNAME;
  const senderId = process.env.AFRICASTALKING_SENDER_ID || 'AFRICASTKNG';
  const isSandbox = process.env.AFRICASTALKING_SANDBOX === 'true';

  if (!apiKey || !username) {
    return { success: false, error: 'SMS provider not configured. Set AFRICASTALKING_API_KEY and AFRICASTALKING_USERNAME.' };
  }

  const phone = to.replace(/\D/g, '').replace(/^0/, '254');
  const normalized = phone.startsWith('254') ? `+${phone}` : `+254${phone}`;

  try {
    const url = isSandbox
      ? 'https://api.sandbox.africastalking.com/version1/messaging'
      : 'https://api.africastalking.com/version1/messaging/bulk';

    if (isSandbox) {
      const body = new URLSearchParams({ username, to: normalized, message, from: senderId }).toString();
      const res = await fetch(url, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded', apiKey },
        body,
      });
      const data = (await res.json()) as { SMSMessageData?: { Recipients?: Array<{ statusCode: number; status: string }> } };
      const r = data?.SMSMessageData?.Recipients?.[0];
      const ok = r && (r.statusCode === 100 || r.statusCode === 101 || r.statusCode === 102);
      if (!ok) return { success: false, error: r?.status ?? `HTTP ${res.status}` };
      return { success: true };
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', apiKey },
      body: JSON.stringify({ username, phoneNumbers: [normalized], message, senderId }),
    });
    const data = (await res.json()) as { SMSMessageData?: { Recipients?: Array<{ statusCode: number; status: string }> } };
    const r = data?.SMSMessageData?.Recipients?.[0];
    const ok = r && (r.statusCode === 100 || r.statusCode === 101 || r.statusCode === 102);
    if (!ok) return { success: false, error: r?.status ?? `HTTP ${res.status}` };
    return { success: true };
  } catch (error) {
    console.error('SMS send error:', error);
    return { success: false, error: String(error) };
  }
}
