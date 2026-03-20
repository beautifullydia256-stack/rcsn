/**
 * Shared HTML for transactional email (Resend).
 * Google-inspired layout: light gray canvas, white card, blue accent bar.
 * Logo must be an absolute https URL (email clients block relative paths).
 *
 * Typography: Inter when the client loads Google Fonts; otherwise Segoe UI / system UI.
 */

// Google Material-ish blues / grays (readable in Gmail, Apple Mail, Outlook.com)
const C = {
  pageBg: '#f5f5f5',
  cardBg: '#ffffff',
  border: '#dadce0',
  shadow: '0 1px 2px 0 rgba(60,64,67,0.15), 0 1px 3px 1px rgba(60,64,67,0.08)',
  accent: '#1a73e8',
  text: '#202124',
  textSecondary: '#5f6368',
  divider: '#e8eaed',
};

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** Public https URL for the logo image, or null to omit the header image */
function getEmailLogoUrl() {
  const raw = process.env.EMAIL_LOGO_URL;
  if (raw !== undefined && raw !== null) {
    const u = String(raw).trim();
    if (u === '' || u === '0' || u.toLowerCase() === 'none') return null;
    return u;
  }
  const base =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.VITE_APP_URL?.trim() ||
    process.env.PUBLIC_APP_URL?.trim() ||
    'https://www.pwezacore.com';
  return `${base.replace(/\/$/, '')}/logo.png`;
}

/** Inter first (loaded via Google Fonts); strong fallbacks for Outlook / plain clients */
const fontStack =
  "'Inter', 'Segoe UI', Roboto, -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica, Arial, sans-serif";

/**
 * @param {string} innerHtml - Already safe HTML for the message body
 */
function buildEmailHtml(innerHtml) {
  const logoUrl = getEmailLogoUrl();
  const logoBlock = logoUrl
    ? `<div style="text-align:center;padding:0 0 20px 0;border-bottom:1px solid ${C.divider};margin:0 0 20px 0">
  <img src="${escapeAttr(logoUrl)}" alt="PwezaCore" width="120" style="max-width:160px;height:auto;display:inline-block;border:0" />
</div>`
    : '';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="X-UA-Compatible" content="IE=edge" />
<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
<style type="text/css">
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
  a { color: ${C.accent}; text-decoration: none; font-weight: 500; }
  a:hover { text-decoration: underline !important; }
  .pw-body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
  .pw-body p { margin: 0 0 14px 0; font-size: 15px; line-height: 1.65; letter-spacing: -0.01em; color: ${C.text}; font-weight: 400; }
  .pw-body p:last-child { margin-bottom: 0; }
  .pw-body strong { font-weight: 600; color: ${C.text}; }
  .pw-body h1, .pw-body h2, .pw-body h3 { font-family: ${fontStack}; font-weight: 600; letter-spacing: -0.02em; color: ${C.text}; margin: 0 0 12px 0; line-height: 1.35; }
  .pw-body h1 { font-size: 20px; }
  .pw-body h2 { font-size: 17px; }
  .pw-body h3 { font-size: 15px; }
</style>
</head>
<body style="margin:0;padding:0;background-color:${C.pageBg};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.pageBg};border-collapse:collapse;">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;border-collapse:collapse;background-color:${C.cardBg};border-radius:8px;border:1px solid ${C.border};box-shadow:${C.shadow};overflow:hidden;">
        <tr>
          <td style="height:4px;background:${C.accent};line-height:4px;font-size:1px;">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:28px 36px 8px 36px;font-family:${fontStack};">
            ${logoBlock}
            <div class="pw-body" style="font-family:${fontStack};font-size:15px;line-height:1.65;letter-spacing:-0.01em;color:${C.text};">
${innerHtml}
            </div>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 36px 28px 36px;border-top:1px solid ${C.divider};font-family:${fontStack};font-size:12px;line-height:1.55;letter-spacing:0;color:${C.textSecondary};">
            <div style="margin-bottom:6px;font-weight:600;color:${C.text};font-size:13px;letter-spacing:-0.01em;">PwezaCore</div>
            <div style="font-weight:400;">School management platform · This message was sent to you by your school.</div>
          </td>
        </tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;border-collapse:collapse;">
        <tr>
          <td style="padding:16px 8px 0 8px;font-family:${fontStack};font-size:11px;line-height:1.45;color:#80868b;text-align:center;letter-spacing:0.01em;">
            © ${new Date().getFullYear()} PwezaCore. All rights reserved.
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

module.exports = { buildEmailHtml, getEmailLogoUrl };
