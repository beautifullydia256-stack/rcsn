/**
 * Send HTML email via Resend API (server-side only).
 */

const { buildEmailHtml, getPublicSiteOrigin } = require('./emailHtml');

async function sendResendInnerHtml({ to, subject, innerHtml }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.RESEND_FROM?.trim() || 'PwezaCore <noreply@pwezacore.com>';
  if (!apiKey) {
    console.warn('[resendSend] RESEND_API_KEY not set; email not sent');
    return { success: false, error: 'RESEND_API_KEY not configured' };
  }
  const html = buildEmailHtml(innerHtml);
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: subject || 'PwezaCore',
        html,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data.message || data.name || String(res.status) };
    }
    return { success: true, id: data.id };
  } catch (e) {
    console.error('[resendSend]', e);
    return { success: false, error: String(e) };
  }
}

function getDefaultLoginUrl() {
  return `${getPublicSiteOrigin()}/login`;
}

module.exports = { sendResendInnerHtml, getDefaultLoginUrl };
