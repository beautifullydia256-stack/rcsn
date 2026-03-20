/**
 * Inner HTML fragments for transactional emails (wrapped by lib/emailHtml.js).
 */

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s) {
  return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * New account with known password (admin-created users).
 * @param {{ recipientName: string; email: string; password: string; roleLabel?: string; loginUrl: string }} p
 */
function buildCredentialInnerHtml(p) {
  const name = escapeHtml(p.recipientName || 'there');
  const email = escapeHtml(p.email);
  const password = escapeHtml(p.password);
  const roleBlock =
    p.roleLabel && String(p.roleLabel).trim()
      ? `<p style="margin:0 0 14px 0"><strong>Role:</strong> ${escapeHtml(String(p.roleLabel).trim())}</p>`
      : '';
  const href = escapeAttr(p.loginUrl);

  return `<p style="margin:0 0 14px 0">Hi ${name},</p>
<p style="margin:0 0 14px 0">Your <strong>PwezaCore</strong> account is ready. Use these credentials to sign in:</p>
<p style="margin:0 0 8px 0"><strong>Email:</strong> ${email}</p>
<p style="margin:0 0 14px 0"><strong>Temporary password:</strong> ${password}</p>
${roleBlock}
<p style="margin:0 0 14px 0"><a href="${href}">Open sign-in page</a> — after you log in, change your password in your account or profile settings.</p>
<p style="margin:0;font-size:13px;color:#5f6368">For security, avoid sharing this email. You can delete it after you have saved your password somewhere safe.</p>`;
}

module.exports = { buildCredentialInnerHtml, escapeHtml };
