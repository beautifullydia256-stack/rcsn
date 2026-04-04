/**
 * Vercel serverless: POST /api/admin/resend-portal-credentials
 * Issue a new one-time password and email it (parent / teacher) when they never got welcome mail or forgot it.
 */
'use strict';

const { createClient } = require('@supabase/supabase-js');
const { createServerClient } = require('@supabase/ssr');

const { sendResendInnerHtml } = require('../../lib/resendSend.js');
const { buildCredentialInnerHtml, buildCredentialEmailSubject } = require('../../lib/credentialInnerHtml.js');
const { getPublicSiteOrigin } = require('../../lib/emailHtml.js');
const { isValidRealEmail } = require('../../lib/realEmail.js');

const MIN_PWD_LEN = 8;
const MAX_PWD_LEN = 72;
const OTP_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

function generateOneTimePassword(length = 8) {
  const n = Math.min(Math.max(length, MIN_PWD_LEN), MAX_PWD_LEN);
  let s = '';
  for (let i = 0; i < n; i += 1) {
    s += OTP_CHARSET[Math.floor(Math.random() * OTP_CHARSET.length)];
  }
  return s;
}

function getCookieString(req) {
  const h = req.headers;
  if (!h) return undefined;
  if (typeof h.cookie === 'string') return h.cookie;
  if (typeof h.get === 'function') return h.get('cookie') ?? undefined;
  return undefined;
}

function parseCookies(cookieHeader) {
  const map = new Map();
  if (cookieHeader) {
    for (const part of cookieHeader.split(';')) {
      const [key, ...v] = part.trim().split('=');
      if (key) map.set(key.trim(), decodeURIComponent((v.join('=') || '').trim()));
    }
  }
  return (name) => map.get(name);
}

function parseBody(req) {
  const b = req.body;
  if (b == null) return {};
  if (typeof b === 'object' && !Array.isArray(b)) return b;
  if (typeof b === 'string') {
    try {
      return JSON.parse(b || '{}');
    } catch {
      return {};
    }
  }
  return {};
}

function getBearerToken(req) {
  try {
    let raw;
    const h = req.headers;
    if (!h) return null;
    if (typeof h.get === 'function') {
      raw = h.get('authorization') || h.get('Authorization');
    } else {
      raw = h.authorization || h.Authorization;
    }
    if (typeof raw !== 'string' || !raw) return null;
    const m = raw.match(/^Bearer\s+(\S+)/i);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

function normalizeManagerRole(role) {
  return String(role ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
}

const MANAGER_ROLES = ['admin', 'owner', 'head_teacher'];
const CRED_ROLES = new Set(['parent', 'teacher']);

module.exports = async function handler(req, res) {
  const origin = process.env.CORS_ORIGIN || 'https://www.pwezacore.com';
  const cors = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
  const setCors = () => Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));

  try {
    if (req.method === 'OPTIONS') {
      setCors();
      res.status(204).end();
      return;
    }

    if (req.method !== 'POST') {
      setCors();
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnon =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnon || !supabaseServiceKey) {
      setCors();
      res.status(500).json({ error: 'Server configuration error. Please contact support.' });
      return;
    }

    const cookieStr = getCookieString(req);
    const getCookie = parseCookies(cookieStr);
    let supabase;
    try {
      supabase = createServerClient(supabaseUrl, supabaseAnon, {
        cookies: {
          get(name) {
            return getCookie(name) ?? undefined;
          },
          set() {},
          remove() {},
        },
      });
    } catch (e) {
      setCors();
      res.status(500).json({ error: e instanceof Error ? e.message : 'Server error' });
      return;
    }

    let adminUser = null;
    const fromCookie = await supabase.auth.getUser();
    if (fromCookie.data?.user && !fromCookie.error) {
      adminUser = fromCookie.data.user;
    } else {
      const bearer = getBearerToken(req);
      if (bearer) {
        const fromJwt = await supabase.auth.getUser(bearer);
        if (fromJwt.data?.user && !fromJwt.error) {
          adminUser = fromJwt.data.user;
        }
      }
    }
    if (!adminUser) {
      setCors();
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: adminData, error: adminRowErr } = await supabaseAdmin
      .from('users')
      .select('school_id, role')
      .eq('user_id', adminUser.id)
      .maybeSingle();

    const adminRoleKey = normalizeManagerRole(adminData?.role);
    if (adminRowErr || !adminData || !MANAGER_ROLES.includes(adminRoleKey)) {
      setCors();
      res.status(403).json({ error: 'Unauthorized - Admin access required' });
      return;
    }

    const body = parseBody(req);
    const targetUserId = body.userId != null ? String(body.userId).trim() : '';
    const emailOverride = body.email != null ? String(body.email).trim() : '';

    if (!targetUserId) {
      setCors();
      res.status(400).json({ error: 'userId is required.' });
      return;
    }

    const { data: profile, error: profErr } = await supabaseAdmin
      .from('users')
      .select('user_id, email, name, role, school_id, linked_teacher_id')
      .eq('user_id', targetUserId)
      .maybeSingle();

    if (profErr || !profile) {
      setCors();
      res.status(400).json({ error: 'User profile not found.' });
      return;
    }
    if (String(profile.school_id) !== String(adminData.school_id)) {
      setCors();
      res.status(403).json({ error: 'That account is not in your school.' });
      return;
    }

    const roleKey = normalizeManagerRole(profile.role);
    if (!CRED_ROLES.has(roleKey)) {
      setCors();
      res.status(400).json({
        error: 'Only parent or teacher accounts can receive a portal password email from here.',
      });
      return;
    }

    let deliverEmail = profile.email ? String(profile.email).trim() : '';
    if (emailOverride) {
      if (!isValidRealEmail(emailOverride)) {
        setCors();
        res.status(400).json({ error: 'Enter a valid email address.' });
        return;
      }
      const { data: clash } = await supabaseAdmin
        .from('users')
        .select('user_id')
        .eq('email', emailOverride)
        .neq('user_id', targetUserId)
        .maybeSingle();
      if (clash?.user_id) {
        setCors();
        res.status(400).json({ error: 'That email is already used by another account.' });
        return;
      }
      deliverEmail = emailOverride;
    }

    if (!deliverEmail || !isValidRealEmail(deliverEmail)) {
      setCors();
      res.status(400).json({
        error:
          'This account has no email on file. Add a valid email in the form, then send again — we will save it before mailing.',
      });
      return;
    }

    const oneTimePassword = generateOneTimePassword();
    const { data: authUserData, error: getAuthErr } = await supabaseAdmin.auth.admin.getUserById(targetUserId);
    if (getAuthErr || !authUserData?.user) {
      setCors();
      res.status(400).json({ error: 'No authentication record for this user. Contact support.' });
      return;
    }

    const prevMeta = authUserData.user.user_metadata || {};
    const nextMeta = {
      ...prevMeta,
      must_change_password: true,
      role: roleKey,
      name: profile.name || prevMeta.name,
      school_id: adminData.school_id,
    };

    const updatePayload = {
      password: oneTimePassword,
      user_metadata: nextMeta,
    };
    if (deliverEmail !== authUserData.user.email) {
      updatePayload.email = deliverEmail;
    }

    const { error: updAuthErr } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, updatePayload);
    if (updAuthErr) {
      setCors();
      res.status(400).json({ error: updAuthErr.message || 'Could not update sign-in credentials.' });
      return;
    }

    const { error: updProfErr } = await supabaseAdmin
      .from('users')
      .update({ email: deliverEmail })
      .eq('user_id', targetUserId);
    if (updProfErr) {
      console.error('[resend-portal-credentials] users email sync:', updProfErr);
    }

    if (roleKey === 'parent') {
      try {
        await supabaseAdmin
          .from('parents')
          .update({ email: deliverEmail })
          .eq('school_id', adminData.school_id)
          .eq('parent_id', targetUserId);
      } catch (e) {
        console.warn('[resend-portal-credentials] parents email sync:', e);
      }
    } else if (roleKey === 'teacher' && profile.linked_teacher_id) {
      try {
        await supabaseAdmin
          .from('teachers')
          .update({ email: deliverEmail })
          .eq('school_id', adminData.school_id)
          .eq('teacher_id', profile.linked_teacher_id);
      } catch (e) {
        console.warn('[resend-portal-credentials] teachers email sync:', e);
      }
    }

    const name =
      `${String(profile.name || '').trim()}`.trim() || deliverEmail.split('@')[0] || 'there';
    const loginUrl = `${getPublicSiteOrigin()}/login?email=${encodeURIComponent(String(deliverEmail))}&first_login=1`;

    try {
      const mailResult = await sendResendInnerHtml({
        to: String(deliverEmail),
        subject: buildCredentialEmailSubject(roleKey, '', { isPasswordReset: true }),
        innerHtml: buildCredentialInnerHtml({
          recipientName: name,
          email: String(deliverEmail),
          password: oneTimePassword,
          role: roleKey,
          roleLabel: roleKey,
          loginUrl,
          firstLoginEnforced: true,
          isPasswordReset: true,
        }),
      });
      if (!mailResult || mailResult.success !== true) {
        console.error('[resend-portal-credentials] email failed:', mailResult?.error);
        setCors();
        res.status(502).json({
          error:
            mailResult?.error ||
            'The password was reset but the email could not be sent. Try again, or check RESEND_API_KEY.',
        });
        return;
      }
    } catch (mailErr) {
      console.error('[resend-portal-credentials] email exception:', mailErr);
      setCors();
      res.status(502).json({
        error:
          'The password was reset but the email could not be sent. Try Send again, or check email configuration.',
      });
      return;
    }

    setCors();
    res.status(200).json({
      success: true,
      message:
        'A new one-time password was emailed. They should sign in with it once, then set a new password.',
    });
  } catch (err) {
    setCors();
    console.error('[resend-portal-credentials]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'A server error has occurred' });
  }
};
