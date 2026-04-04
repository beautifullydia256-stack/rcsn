/**
 * Inner HTML for admin-created account emails (wrapped by lib/emailHtml.js).
 * Role-specific copy (teacher, student, …), transactional tone for deliverability.
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

/** Plain text for hidden preheader (no HTML entities) */
function preheaderSafeName(name) {
  return String(name || 'there')
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 80);
}

/**
 * Normalize role slug from API or display label.
 * @param {string | undefined} role
 * @param {string | undefined} roleLabel
 */
function normalizeRoleKey(role, roleLabel) {
  const r = String(role || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
  if (r && ROLE_CONFIG[r]) return r;
  const lbl = String(roleLabel || '')
    .trim()
    .toLowerCase();
  const fromLabel = {
    teacher: 'teacher',
    student: 'student',
    parent: 'parent',
    accountant: 'accountant',
    librarian: 'librarian',
    'lab technician': 'lab_technician',
    lab_technician: 'lab_technician',
    'school clinician': 'clinician',
    clinician: 'clinician',
    'head teacher': 'head_teacher',
    head_teacher: 'head_teacher',
    admin: 'admin',
    administrator: 'admin',
    owner: 'owner',
    staff: 'staff',
  }[lbl];
  if (fromLabel && ROLE_CONFIG[fromLabel]) return fromLabel;
  return 'staff';
}

const ROLE_CONFIG = {
  teacher: {
    tag: 'Teacher',
    subjectNoun: 'teacher',
    headline: (name) => `Welcome, ${name}`,
    body: (name) =>
      `Your school has added you to <strong>PwezaCore</strong> as a <strong>teacher</strong>. Tap <strong>Sign in to PwezaCore</strong> below — your email is filled in on the sign-in page. Enter the <strong>one-time password</strong> from this email. Right after you sign in, you will set and confirm a new password before you reach your dashboard.`,
  },
  student: {
    tag: 'Student',
    subjectNoun: 'student',
    headline: (name) => `Welcome, ${name}`,
    body: (name) =>
      `Your school has created your <strong>student</strong> account on <strong>PwezaCore</strong>. Use the one-time password below to sign in. After you sign in, you can set your own password in your account settings.`,
  },
  parent: {
    tag: 'Parent',
    subjectNoun: 'parent',
    headline: (name) => `Welcome, ${name}`,
    body: (name) =>
      `Your school has added you to <strong>PwezaCore</strong> with <strong>parent portal</strong> access. Tap <strong>Sign in to PwezaCore</strong> below — your email is filled in on the sign-in page. Enter the <strong>one-time password</strong> from this email. Right after you sign in, you will set and confirm a new password before you reach your dashboard.`,
  },
  accountant: {
    tag: 'Accountant',
    subjectNoun: 'accountant',
    headline: (name) => `Welcome, ${name}`,
    body: (name) =>
      `Your school has set up your <strong>accountant</strong> access on <strong>PwezaCore</strong>. Use the one-time password below to sign in, then set a new password you choose in your account settings.`,
  },
  librarian: {
    tag: 'Librarian',
    subjectNoun: 'librarian',
    headline: (name) => `Welcome, ${name}`,
    body: (name) =>
      `Your school has added you to <strong>PwezaCore</strong> as a <strong>librarian</strong>. Use the one-time password below to sign in, then choose your own password in your account settings.`,
  },
  lab_technician: {
    tag: 'Lab technician',
    subjectNoun: 'lab technician',
    headline: (name) => `Welcome, ${name}`,
    body: (name) =>
      `Your school has added you to <strong>PwezaCore</strong> as a <strong>lab technician</strong>. Use the one-time password below to sign in, then choose your own password in your account settings.`,
  },
  clinician: {
    tag: 'School clinician',
    subjectNoun: 'school clinician',
    headline: (name) => `Welcome, ${name}`,
    body: (name) =>
      `Your school has added you to <strong>PwezaCore</strong> as a <strong>school clinician</strong>. Use the one-time password below to sign in, then choose your own password in your account settings.`,
  },
  head_teacher: {
    tag: 'Head teacher',
    subjectNoun: 'head teacher',
    headline: (name) => `Welcome, ${name}`,
    body: (name) =>
      `Your school has created your <strong>head teacher</strong> account on <strong>PwezaCore</strong>. Use the one-time password below to sign in, then set your own password in your account settings.`,
  },
  admin: {
    tag: 'School admin',
    subjectNoun: 'school admin',
    headline: (name) => `Welcome, ${name}`,
    body: (name) =>
      `You have been granted <strong>school administrator</strong> access to <strong>PwezaCore</strong>. Use the one-time password below to sign in, then choose a strong password in your account settings.`,
  },
  owner: {
    tag: 'Owner',
    subjectNoun: 'owner',
    headline: (name) => `Welcome, ${name}`,
    body: (name) =>
      `Your <strong>PwezaCore</strong> owner account is ready. Use the one-time password below to sign in, then set your own password in your account settings.`,
  },
  staff: {
    tag: 'Team member',
    subjectNoun: 'account',
    headline: (name) => `Welcome, ${name}`,
    body: (name) =>
      `Your school has created your <strong>PwezaCore</strong> account. Use the button below to open sign-in (your email is prefilled). Enter the <strong>one-time password</strong> shown here, then create and confirm your new password before you access your dashboard.`,
  },
};

/**
 * Short, neutral subject line (helps inbox placement — avoid ALL CAPS and spam triggers).
 * @param {string | undefined} role
 * @param {string | undefined} roleLabel
 */
function buildCredentialEmailSubject(role, roleLabel) {
  const key = normalizeRoleKey(role, roleLabel);
  const cfg = ROLE_CONFIG[key] || ROLE_CONFIG.staff;
  return `Your PwezaCore ${cfg.subjectNoun} login`;
}

/**
 * @param {{ recipientName: string; email: string; password: string; role?: string; roleLabel?: string; loginUrl: string; firstLoginEnforced?: boolean }} p
 */
function buildCredentialInnerHtml(p) {
  const rawName = String(p.recipientName || 'there').trim() || 'there';
  const name = escapeHtml(rawName);
  const email = escapeHtml(p.email);
  const password = escapeHtml(p.password);
  const href = escapeAttr(p.loginUrl);

  const key = normalizeRoleKey(p.role, p.roleLabel);
  const cfg = ROLE_CONFIG[key] || ROLE_CONFIG.staff;
  const headlineText = typeof cfg.headline === 'function' ? cfg.headline(name) : `Welcome, ${name}`;
  const bodyHtml = typeof cfg.body === 'function' ? cfg.body(name) : ROLE_CONFIG.staff.body(name);

  const tagEscaped = escapeHtml(cfg.tag);
  const pre = `PwezaCore ${cfg.tag} — ${preheaderSafeName(rawName)} — one-time password inside`;

  const ctaLabel = p.firstLoginEnforced ? 'Open sign-in (email ready)' : 'Sign in to PwezaCore';

  return `${preheaderDiv(pre)}
<p style="margin:0 0 6px 0;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:#5f6368;">${tagEscaped} account</p>
<h1 style="margin:0 0 14px 0;font-size:20px;font-weight:600;line-height:1.3;color:#202124;letter-spacing:-0.02em;">${headlineText}</h1>
<p style="margin:0 0 18px 0;font-size:15px;line-height:1.65;color:#202124;">${bodyHtml}</p>
${credentialTable(email, password)}
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="left" style="margin:20px 0 0 0;border-collapse:separate;">
  <tr>
    <td align="center" bgcolor="#1a73e8" style="border-radius:999px;background-color:#1a73e8;border:1px solid #1557b0;">
      <a href="${href}" style="display:inline-block;padding:14px 28px;font-family:inherit;font-size:15px;font-weight:600;line-height:1.25;color:#ffffff !important;text-decoration:none;border-radius:999px;">${escapeHtml(ctaLabel)}</a>
    </td>
  </tr>
</table>
<p style="margin:16px 0 0 0;font-size:12px;line-height:1.5;color:#80868b;">If the button does not work, copy this address into your browser: <span style="word-break:break-all;color:#5f6368;">${escapeHtml(String(p.loginUrl || '').replace(/^https?:\/\//i, ''))}</span></p>
<p style="margin:20px 0 0 0;font-size:13px;line-height:1.55;color:#5f6368;">This message was sent because an administrator at your school created your login. If you were not expecting it, contact your school office.</p>
<p style="margin:12px 0 0 0;font-size:13px;line-height:1.55;color:#5f6368;">Do not share this email. After you set a new password, you may delete this message.</p>`;
}

function preheaderDiv(text) {
  const t = escapeHtml(text);
  return `<div style="display:none;font-size:1px;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;mso-hide:all;">${t}</div>`;
}

function credentialTable(email, password) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;background-color:#f8f9fa;border:1px solid #e8eaed;border-radius:8px;margin:0;">
  <tr>
    <td style="padding:18px 20px;font-family:inherit;">
      <p style="margin:0 0 6px 0;font-size:12px;font-weight:600;color:#5f6368;letter-spacing:0.04em;text-transform:uppercase;">Sign-in email</p>
      <p style="margin:0 0 14px 0;font-size:15px;font-weight:600;color:#202124;word-break:break-all;">${email}</p>
      <p style="margin:0 0 6px 0;font-size:12px;font-weight:600;color:#5f6368;letter-spacing:0.04em;text-transform:uppercase;">One-time password</p>
      <p style="margin:0;font-family:Consolas,'Courier New',monospace;font-size:18px;font-weight:700;letter-spacing:0.08em;color:#202124;">${password}</p>
    </td>
  </tr>
</table>`;
}

module.exports = {
  buildCredentialInnerHtml,
  buildCredentialEmailSubject,
  normalizeRoleKey,
  escapeHtml,
};
