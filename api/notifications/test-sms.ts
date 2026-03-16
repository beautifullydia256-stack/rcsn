import { sendAfricaTalkingSMS } from '../../src/lib/africastalking';

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

