/**
 * Vercel serverless: POST /api/admin/create-user-account
 * Intentionally CommonJS (.js) so Node loads it without "Cannot use import statement outside a module"
 * (Vite project's package.json has no "type": "module"; compiled .ts was emitting ESM import syntax.)
 */
'use strict';

const { createClient } = require('@supabase/supabase-js');
const { createServerClient } = require('@supabase/ssr');

const { sendResendInnerHtml } = require('../../lib/resendSend.js');
const {
  buildCredentialInnerHtml,
  buildCredentialEmailSubject,
} = require('../../lib/credentialInnerHtml.js');
const { getPublicSiteOrigin } = require('../../lib/emailHtml.js');
const { isValidRealEmail } = require('../../lib/realEmail.js');
const { sendEgoSms, normalizePhone, isUgandaNumber, candidatePhoneFormats } = require('../../lib/sms.js');
const { issuePhoneVerificationCode } = require('../../lib/phoneVerification.js');

const MIN_PWD_LEN = 8;
const MAX_PWD_LEN = 72;
const OTP_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';

/** Same rules as lib/passwordPolicy.js — inlined so the function never resolves to the .ts file on the server. */
function generateOneTimePassword(length = 8) {
  const n = Math.min(Math.max(length, MIN_PWD_LEN), MAX_PWD_LEN);
  let s = '';
  for (let i = 0; i < n; i += 1) {
    s += OTP_CHARSET[Math.floor(Math.random() * OTP_CHARSET.length)];
  }
  return s;
}

function validatePasswordLength(password) {
  const p = String(password ?? '');
  if (p.length < MIN_PWD_LEN) return `Password must be at least ${MIN_PWD_LEN} characters.`;
  if (p.length > MAX_PWD_LEN) return `Password must be at most ${MAX_PWD_LEN} characters.`;
  return null;
}

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escAttr(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
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

/** When inviting by phone instead of email, synthesize a placeholder auth-identity email —
 *  same idea as the existing `{admission_number}@school.local` convention used for students —
 *  and validate the phone. Mutates nothing; caller applies the result. */
function resolvePhoneInvite(phoneRaw) {
  if (!phoneRaw) return { error: 'Enter a phone number to invite by SMS.' };
  const normalized = normalizePhone(String(phoneRaw).trim());
  if (!isUgandaNumber(normalized)) return { error: 'Enter a valid Uganda phone number.' };
  const digits = normalized.replace(/\D/g, '');
  return { normalizedPhone: normalized, syntheticEmail: `${digits}@phone.pwezacore.local` };
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

/** Vite SPA stores auth in sessionStorage, not cookies — client must send Authorization: Bearer <access_token>. */
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

/** Match public.users.role to manager allow-list (handles "Head Teacher", HEAD_TEACHER, etc.). */
function normalizeManagerRole(role) {
  return String(role ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
}

const CRED_RESEND_ROLES = new Set(['parent', 'teacher']);

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

  const send500 = (err) => {
    setCors();
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: msg || 'A server error has occurred' });
  };

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
      send500(e);
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

    const MANAGER_ROLES = ['admin', 'owner', 'head_teacher', 'secretary'];
    const adminRoleKey = normalizeManagerRole(adminData?.role);
    if (adminRowErr || !adminData || !MANAGER_ROLES.includes(adminRoleKey)) {
      setCors();
      res.status(403).json({ error: 'Unauthorized - Admin access required' });
      return;
    }

    const body = parseBody(req);

    /** Same as former POST /api/admin/resend-portal-credentials — kept inside this function to stay under Vercel Hobby serverless count. */
    if (body.resendPortalCredentials === true || body.resendPortalCredentials === 'true') {
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
      if (!CRED_RESEND_ROLES.has(roleKey)) {
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
      const emailChanged = deliverEmail !== authUserData.user.email;
      const updatePayload = {
        password: oneTimePassword,
        user_metadata: nextMeta,
        ...(emailChanged ? { email: deliverEmail } : {}),
      };
      let { error: updAuthErr } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, updatePayload);
      // Supabase auth hooks (send_email / custom_access_token) occasionally fail
      // with FUNCTION_INVOCATION_FAILED when the hook's edge function is unhealthy.
      // In that case retry without the email field — the password reset is the
      // critical part; the email column in auth can be fixed separately.
      if (updAuthErr && /FUNCTION_INVOCATION_FAILED/i.test(updAuthErr.message) && emailChanged) {
        console.warn('[create-user-account] resend: auth hook failed on combined update, retrying password-only:', updAuthErr.message);
        const { error: retryErr } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
          password: oneTimePassword,
          user_metadata: nextMeta,
        });
        updAuthErr = retryErr ?? null;
      }
      if (updAuthErr) {
        const isHookError = /FUNCTION_INVOCATION_FAILED/i.test(updAuthErr.message);
        setCors();
        res.status(400).json({
          error: isHookError
            ? 'Could not update sign-in credentials (a Supabase auth hook is misconfigured). Check Authentication → Hooks in the Supabase dashboard.'
            : updAuthErr.message || 'Could not update sign-in credentials.',
        });
        return;
      }
      const { error: updProfErr } = await supabaseAdmin
        .from('users')
        .update({ email: deliverEmail })
        .eq('user_id', targetUserId);
      if (updProfErr) {
        console.error('[create-user-account] resend users email sync:', updProfErr);
      }
      if (roleKey === 'parent') {
        try {
          await supabaseAdmin
            .from('parents')
            .update({ email: deliverEmail })
            .eq('school_id', adminData.school_id)
            .eq('parent_id', targetUserId);
        } catch (e) {
          console.warn('[create-user-account] resend parents email sync:', e);
        }
      } else if (roleKey === 'teacher' && profile.linked_teacher_id) {
        try {
          await supabaseAdmin
            .from('teachers')
            .update({ email: deliverEmail })
            .eq('school_id', adminData.school_id)
            .eq('teacher_id', profile.linked_teacher_id);
        } catch (e) {
          console.warn('[create-user-account] resend teachers email sync:', e);
        }
      }
      const displayName =
        `${String(profile.name || '').trim()}`.trim() || deliverEmail.split('@')[0] || 'there';
      const loginUrl = `${getPublicSiteOrigin()}/login?email=${encodeURIComponent(String(deliverEmail))}&first_login=1`;
      try {
        const mailResult = await sendResendInnerHtml({
          to: String(deliverEmail),
          subject: buildCredentialEmailSubject(roleKey, '', { isPasswordReset: true }),
          innerHtml: buildCredentialInnerHtml({
            recipientName: displayName,
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
          console.error('[create-user-account] resend email failed:', mailResult?.error);
          setCors();
          res.status(502).json({
            error:
              mailResult?.error ||
              'The password was reset but the email could not be sent. Try again, or check RESEND_API_KEY.',
          });
          return;
        }
      } catch (mailErr) {
        console.error('[create-user-account] resend email exception:', mailErr);
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
      return;
    }

    let emailIn = body.email != null ? String(body.email).trim() : '';
    let firstName = body.firstName != null ? String(body.firstName) : '';
    let lastName = body.lastName != null ? String(body.lastName) : '';
    let roleOut = body.role != null ? String(body.role) : 'teacher';
    let phone =
      body.phone != null && String(body.phone).trim() !== '' ? String(body.phone).trim() : null;
    const { password, department, position } = body;
    let sendEmailInvite = Boolean(body.sendEmailInvite);
    const inviteChannel = body.inviteChannel === 'phone' ? 'phone' : 'email';

    const teacherId = body.teacherId != null ? String(body.teacherId).trim() : '';
    const otherStaffId = body.otherStaffId != null ? String(body.otherStaffId).trim() : '';
    const parentIdForInvite = body.parentId != null ? String(body.parentId).trim() : '';

    const rosterKeyCount = (teacherId ? 1 : 0) + (otherStaffId ? 1 : 0) + (parentIdForInvite ? 1 : 0);
    if (rosterKeyCount > 1) {
      setCors();
      res.status(400).json({ error: 'Specify only one of teacherId, otherStaffId, or parentId.' });
      return;
    }

    if (teacherId || otherStaffId || parentIdForInvite) {
      sendEmailInvite = true;
      if (body.password != null && String(body.password).trim() !== '') {
        setCors();
        res.status(400).json({ error: 'Roster invites use email only — remove password from the request.' });
        return;
      }
    }

    if (!sendEmailInvite) {
      const pwdErr = validatePasswordLength(password);
      if (pwdErr) {
        setCors();
        res.status(400).json({ error: pwdErr });
        return;
      }
    }

    if (teacherId) {
      const { data: t, error: tErr } = await supabaseAdmin
        .from('teachers')
        .select('teacher_id, school_id, name, email, phone')
        .eq('teacher_id', teacherId)
        .single();
      if (tErr || !t || String(t.school_id) !== String(adminData.school_id)) {
        setCors();
        res.status(400).json({ error: 'Teacher not found or not in your school.' });
        return;
      }
      roleOut = 'teacher';
      const full = String(t.name || '').trim();
      const parts = full.split(/\s+/).filter(Boolean);
      firstName = parts[0] || 'Teacher';
      lastName = parts.slice(1).join(' ') || '';
      if (inviteChannel === 'phone') {
        const resolved = resolvePhoneInvite(phone);
        if (resolved.error) {
          setCors();
          res.status(400).json({ error: resolved.error });
          return;
        }
        phone = resolved.normalizedPhone;
        emailIn = resolved.syntheticEmail;
      } else {
        if (!emailIn) emailIn = t.email ? String(t.email).trim() : '';
        if (!emailIn) {
          setCors();
          res
            .status(400)
            .json({ error: 'This teacher has no email. Add an email in the invitation form, then send again.' });
          return;
        }
      }
      const { data: existingT } = await supabaseAdmin
        .from('users')
        .select('user_id')
        .eq('school_id', adminData.school_id)
        .eq('role', 'teacher')
        .ilike('email', emailIn)
        .maybeSingle();
      if (existingT?.user_id) {
        setCors();
        res.status(400).json({ error: 'A teacher account with this email already exists for your school.' });
        return;
      }
    } else if (otherStaffId) {
      const { data: o, error: oErr } = await supabaseAdmin
        .from('other_staff_members')
        .select('id, school_id, full_name, email, staff_role, linked_user_id')
        .eq('id', otherStaffId)
        .single();
      if (oErr || !o || String(o.school_id) !== String(adminData.school_id)) {
        setCors();
        res.status(400).json({ error: 'Staff member not found or not in your school.' });
        return;
      }
      if (o.linked_user_id) {
        setCors();
        res.status(400).json({ error: 'This person already has a login linked.' });
        return;
      }
      const sr = String(o.staff_role || '').trim();
      if (!sr) {
        setCors();
        res.status(400).json({ error: 'Set a dashboard role (Staff role) on the Staff page before inviting.' });
        return;
      }
      roleOut = sr;
      const full = String(o.full_name || '').trim();
      const parts = full.split(/\s+/).filter(Boolean);
      firstName = parts[0] || 'Staff';
      lastName = parts.slice(1).join(' ') || '';
      if (inviteChannel === 'phone') {
        const resolved = resolvePhoneInvite(phone);
        if (resolved.error) {
          setCors();
          res.status(400).json({ error: resolved.error });
          return;
        }
        phone = resolved.normalizedPhone;
        emailIn = resolved.syntheticEmail;
      } else {
        if (!emailIn) emailIn = o.email ? String(o.email).trim() : '';
        if (!emailIn) {
          setCors();
          res
            .status(400)
            .json({ error: 'This person has no email. Add an email in the invitation form, then send again.' });
          return;
        }
      }
    } else if (parentIdForInvite) {
      const { data: prowRows, error: pErr } = await supabaseAdmin
        .from('parents')
        .select('parent_id, name, email, phone, is_primary_contact')
        .eq('school_id', adminData.school_id)
        .eq('parent_id', parentIdForInvite);
      if (pErr || !prowRows || prowRows.length === 0) {
        setCors();
        res.status(400).json({ error: 'Parent not found or not in your school.' });
        return;
      }
      const { data: keyUser } = await supabaseAdmin
        .from('users')
        .select('user_id, role, extra_roles, email')
        .eq('user_id', parentIdForInvite)
        .maybeSingle();
      if (keyUser) {
        const rk = normalizeManagerRole(keyUser.role);
        if (rk === 'parent') {
          setCors();
          res.status(400).json({ error: 'This parent already has a portal account.' });
          return;
        }
        const currentExtraRoles = keyUser.extra_roles || [];
        if (currentExtraRoles.includes('parent')) {
          setCors();
          res.status(400).json({ error: 'This person already has a parent role linked to their account.' });
          return;
        }
        // Staff member — add parent role without creating a new auth account
        const newExtraRoles = Array.from(new Set([...currentExtraRoles, 'parent']));
        await supabaseAdmin.from('users').update({ extra_roles: newExtraRoles }).eq('user_id', keyUser.user_id);
        // Also sync the parent role into the user_school_memberships row for THIS school,
        // so it survives school switches (the membership is the authoritative fallback
        // when users.school_id points to a different school).
        try {
          const { data: existingMem } = await supabaseAdmin
            .from('user_school_memberships')
            .select('id, role, extra_roles')
            .eq('user_id', keyUser.user_id)
            .eq('school_id', adminData.school_id)
            .maybeSingle();
          if (existingMem && String(existingMem.role) !== 'parent') {
            const memExtras = Array.isArray(existingMem.extra_roles) ? existingMem.extra_roles : [];
            if (!memExtras.includes('parent')) {
              await supabaseAdmin.from('user_school_memberships')
                .update({ extra_roles: Array.from(new Set([...memExtras, 'parent'])) })
                .eq('id', existingMem.id);
            }
          }
        } catch (e) {
          console.error('[create-user-account] membership parent-role sync:', e);
        }
        try {
          await supabaseAdmin
            .from('parents')
            .update({ parent_id: keyUser.user_id, email: String(emailIn || keyUser.email || '') })
            .eq('school_id', adminData.school_id)
            .eq('parent_id', parentIdForInvite);
        } catch (e) {
          console.error('Failed to link parent record for multi-role:', e);
        }
        setCors();
        res.status(200).json({
          message: 'Parent role added to existing staff account. They will see a role picker on next login.',
          multiRole: true,
          userId: keyUser.user_id,
        });
        return;
      }
      roleOut = 'parent';
      const primary = prowRows.find((r) => r.is_primary_contact === true) || prowRows[0];
      const full = String((primary && primary.name) || '').trim();
      const parts = full.split(/\s+/).filter(Boolean);
      firstName = parts[0] || 'Parent';
      lastName = parts.slice(1).join(' ') || '';
      if (!phone && primary && primary.phone) phone = String(primary.phone).trim() || null;
      if (inviteChannel === 'phone') {
        const resolved = resolvePhoneInvite(phone);
        if (resolved.error) {
          setCors();
          res.status(400).json({ error: resolved.error });
          return;
        }
        phone = resolved.normalizedPhone;
        emailIn = resolved.syntheticEmail;
      } else {
        if (!emailIn) emailIn = primary && primary.email ? String(primary.email).trim() : '';
        if (!emailIn) {
          setCors();
          res.status(400).json({
            error:
              'This guardian has no email on file. Add an email on their profile (or in the invite form), then send again.',
          });
          return;
        }
      }
      const { data: existingP } = await supabaseAdmin
        .from('users')
        .select('user_id')
        .eq('school_id', adminData.school_id)
        .eq('role', 'parent')
        .ilike('email', emailIn)
        .maybeSingle();
      if (existingP?.user_id) {
        setCors();
        res.status(400).json({ error: 'A parent account with this email already exists for your school.' });
        return;
      }
    }

    const email = emailIn;
    const name = `${firstName || ''} ${lastName || ''}`.toString().trim() || email;

    const { data: existingUserByEmail } = await supabaseAdmin
      .from('users')
      .select('user_id, role, extra_roles, school_id, email, name, phone')
      .ilike('email', email)
      .maybeSingle();

    // Phone is a stronger cross-invite-channel signal than email: a phone-invited account
    // gets a synthetic placeholder email, so it won't match a real-email lookup even though
    // it's the same real person. Only consulted when the email lookup came up empty.
    let existingUserByPhone = null;
    if (!existingUserByEmail && phone) {
      const normalizedLookupPhone = normalizePhone(phone);
      if (isUgandaNumber(normalizedLookupPhone)) {
        const { data } = await supabaseAdmin
          .from('users')
          .select('user_id, role, extra_roles, school_id, email, name, phone')
          .in('phone', candidatePhoneFormats(normalizedLookupPhone))
          .maybeSingle();
        existingUserByPhone = data || null;
      }
    }

    const existingIdentity = existingUserByEmail || existingUserByPhone;

    if (existingIdentity) {
      const existingUserSchoolId = String(existingIdentity.school_id ?? '');
      const adminSchoolId = String(adminData.school_id ?? '');

      // ── CROSS-SCHOOL: user's primary record belongs to a different school ──
      if (existingUserSchoolId !== adminSchoolId) {
        const { data: existingMembership } = await supabaseAdmin
          .from('user_school_memberships')
          .select('id, role, is_active')
          .eq('user_id', existingIdentity.user_id)
          .eq('school_id', adminSchoolId)
          .maybeSingle();

        if (existingMembership?.is_active) {
          setCors();
          res.status(400).json({ error: 'This person is already a member of your school.' });
          return;
        }

        if (existingMembership) {
          // Re-invite: was previously revoked, or still pending from an earlier invite.
          // Stays inactive until the person explicitly accepts it themselves.
          const { error: reactivateErr } = await supabaseAdmin
            .from('user_school_memberships')
            .update({ role: roleOut, extra_roles: [], is_active: false, linked_teacher_id: teacherId || null })
            .eq('id', existingMembership.id);
          if (reactivateErr) {
            setCors();
            res.status(500).json({ error: 'Failed to re-invite: ' + reactivateErr.message });
            return;
          }
        } else {
          // Brand-new membership for this school — pending until the person accepts it.
          const { error: membershipErr } = await supabaseAdmin
            .from('user_school_memberships')
            .insert({
              user_id: existingIdentity.user_id,
              school_id: adminSchoolId,
              role: roleOut,
              extra_roles: [],
              is_active: false,
              invited_by: adminUser.id,
              linked_teacher_id: teacherId || null,
            });
          if (membershipErr) {
            setCors();
            res.status(500).json({ error: 'Failed to invite: ' + membershipErr.message });
            return;
          }
        }

        if (teacherId) {
          try {
            await supabaseAdmin
              .from('teachers')
              .update({ email: String(email) })
              .eq('teacher_id', teacherId)
              .eq('school_id', adminSchoolId);
          } catch (e) {
            console.warn('Could not link teacher record for cross-school add:', e);
          }
        }

        const { data: schoolRow } = await supabaseAdmin
          .from('schools')
          .select('name')
          .eq('school_id', adminSchoolId)
          .maybeSingle();
        const schoolNameStr = String(schoolRow?.name ?? 'Your new school');
        const recipientFirst = String(existingIdentity.name ?? email.split('@')[0] ?? 'there').split(' ')[0];
        const roleLabel = String(roleOut).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

        // SMS notification — their phone was already verified when their account was first
        // created, so no new OTP is needed; accepting from their existing logged-in session
        // is the actual consent step.
        if (existingIdentity.phone) {
          try {
            await sendEgoSms(
              existingIdentity.phone,
              `${schoolNameStr} has added you to PwezaCore as ${roleLabel}. Log in to your existing account to review and accept this invitation.`,
              { priority: '1' }
            );
          } catch (smsErr) {
            console.warn('[create-user-account] cross-school notification SMS failed:', smsErr);
          }
        }

        // Best-effort email notification too, if a real (non-synthetic) email is on file.
        try {
          const notifyEmail = String(existingIdentity.email || '');
          if (notifyEmail && isValidRealEmail(notifyEmail)) {
            const loginUrl = `${getPublicSiteOrigin()}/login?email=${encodeURIComponent(notifyEmail)}`;
            await sendResendInnerHtml({
              to: notifyEmail,
              subject: `You've been invited to ${schoolNameStr} on PwezaCore`,
              innerHtml: `<p>Hi ${esc(recipientFirst)},</p>
<p><strong>${esc(schoolNameStr)}</strong> has added you to <strong>PwezaCore</strong> as a <strong>${esc(roleLabel)}</strong>.</p>
<p>Log in with your existing email and password, then accept this invitation to gain access. Your data from each school is kept completely separate.</p>
<p style="margin-top:24px"><a href="${escAttr(loginUrl)}" style="background:#10b981;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Open sign-in</a></p>`,
            });
          }
        } catch (mailErr) {
          console.warn('[create-user-account] cross-school notification email failed:', mailErr);
          // Non-fatal — membership created; email is best-effort
        }

        setCors();
        res.status(200).json({
          message: `${existingIdentity.name || email} has been invited to your school as ${roleOut}. They've been notified and must accept the invitation from their existing account before it takes effect.`,
          crossSchool: true,
          pending: true,
          userId: existingIdentity.user_id,
        });
        return;
      }

      // ── SAME SCHOOL: existing multi-role logic ────────────────────────────
      const existingRoleKey = normalizeManagerRole(existingIdentity.role);
      const incomingRoleKey = normalizeManagerRole(roleOut);

      if (existingRoleKey === incomingRoleKey) {
        setCors();
        res.status(400).json({ error: 'A user with this email or phone number has already been registered' });
        return;
      }

      // Different role — add the new role to extra_roles without creating a second auth account
      const existingUserId = existingIdentity.user_id;
      const currentExtraRoles = existingIdentity.extra_roles || [];
      if (currentExtraRoles.includes(incomingRoleKey)) {
        setCors();
        res.status(400).json({ error: `This person already has a ${incomingRoleKey} role linked to their account.` });
        return;
      }
      const newExtraRoles = Array.from(new Set([...currentExtraRoles, incomingRoleKey]));
      const { error: updateErr } = await supabaseAdmin
        .from('users')
        .update({ extra_roles: newExtraRoles })
        .eq('user_id', existingUserId);
      if (updateErr) {
        setCors();
        res.status(500).json({ error: 'Failed to link roles: ' + updateErr.message });
        return;
      }
      if (teacherId) {
        try {
          await supabaseAdmin
            .from('teachers')
            .update({ email: String(email) })
            .eq('teacher_id', teacherId)
            .eq('school_id', adminData.school_id);
          await supabaseAdmin
            .from('users')
            .update({ linked_teacher_id: teacherId })
            .eq('user_id', existingUserId);
        } catch (e) {
          console.warn('Could not link teacher record for multi-role:', e);
        }
      }
      if (parentIdForInvite) {
        try {
          await supabaseAdmin
            .from('parents')
            .update({ parent_id: existingUserId, email: String(email) })
            .eq('school_id', adminData.school_id)
            .eq('parent_id', parentIdForInvite);
        } catch (e) {
          console.error('Failed to link parent record for multi-role:', e);
        }
      }
      setCors();
      res.status(200).json({
        message: `Role "${incomingRoleKey}" added to existing ${existingRoleKey} account. They will see a role picker on next login.`,
        multiRole: true,
        userId: existingUserId,
      });
      return;
    }

    let authUserId = null;
    /** Set when sendEmailInvite: one-time password + welcome email (not Supabase magic link). */
    let oneTimeInvitePassword = null;

    const meta = {
      name,
      role: roleOut,
      school_id: adminData.school_id,
      department: department ?? null,
      position: position ?? null,
      phone: phone != null ? String(phone) : null,
    };
    if (teacherId) meta.teacher_id = teacherId;
    if (otherStaffId) meta.other_staff_id = otherStaffId;

    if (sendEmailInvite) {
      oneTimeInvitePassword = generateOneTimePassword();
      const authMeta = { ...meta, must_change_password: true };
      const { data, error: signupError } = await supabaseAdmin.auth.admin.createUser({
        email: String(email),
        password: oneTimeInvitePassword,
        email_confirm: true,
        user_metadata: authMeta,
      });
      if (signupError) {
        if (
          signupError.message?.toLowerCase().includes('already') ||
          signupError.message?.toLowerCase().includes('registered')
        ) {
          setCors();
          res.status(400).json({ error: 'A user with this email address has already been registered' });
          return;
        }
        setCors();
        res.status(400).json({ error: signupError.message });
        return;
      }
      authUserId = data?.user?.id ?? null;
    } else {
      const { data, error: signupError } = await supabaseAdmin.auth.admin.createUser({
        email: String(email),
        password: String(password),
        email_confirm: true,
        user_metadata: meta,
      });
      if (signupError) {
        if (
          signupError.message?.toLowerCase().includes('already') ||
          signupError.message?.toLowerCase().includes('registered')
        ) {
          setCors();
          res.status(400).json({ error: 'A user with this email address has already been registered' });
          return;
        }
        setCors();
        res.status(400).json({ error: signupError.message });
        return;
      }
      authUserId = data?.user?.id ?? null;
    }

    if (!adminData.school_id) {
      if (authUserId) await supabaseAdmin.auth.admin.deleteUser(authUserId);
      setCors();
      res.status(400).json({ error: 'Admin user does not have a school_id. Please contact support.' });
      return;
    }

    const { data: schoolCheck, error: schoolCheckError } = await supabaseAdmin
      .from('schools')
      .select('school_id')
      .eq('school_id', adminData.school_id)
      .single();
    if (schoolCheckError || !schoolCheck) {
      if (authUserId) await supabaseAdmin.auth.admin.deleteUser(authUserId);
      setCors();
      res.status(400).json({
        error: `The school_id does not exist in the schools table.`,
        details: schoolCheckError?.message,
      });
      return;
    }

    if (!authUserId) {
      setCors();
      res.status(502).json({
        error:
          'Could not complete signup: authentication did not return a user id. Check Supabase Auth configuration and try again.',
      });
      return;
    }

    const upsertPayload = {
      user_id: authUserId,
      email: String(email),
      name,
      role: String(roleOut ?? 'teacher'),
      school_id: adminData.school_id,
      phone: phone != null ? String(phone) : null,
      department: department != null ? String(department) : null,
      position: position != null ? String(position) : null,
    };
    if (teacherId) upsertPayload.linked_teacher_id = teacherId;

    const { error: userInsertError } = await supabaseAdmin.from('users').upsert(upsertPayload, { onConflict: 'user_id' });

    if (userInsertError) {
      console.error('Failed to create user record:', userInsertError.message);
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
      } catch {
        /* best-effort rollback */
      }
      setCors();
      res.status(400).json({
        error:
          userInsertError.message ||
          'Could not save the user profile. The invitation was rolled back; nothing was created.',
      });
      return;
    }

    if (authUserId && teacherId) {
      try {
        // Phone invites don't write the synthetic placeholder email into the teacher's
        // visible contact info — it only needs to exist as the Supabase Auth identity.
        const teacherSync = inviteChannel === 'phone' ? { phone: String(phone) } : { email: String(email) };
        await supabaseAdmin
          .from('teachers')
          .update(teacherSync)
          .eq('teacher_id', teacherId)
          .eq('school_id', adminData.school_id);
      } catch (e) {
        console.warn('Could not sync teacher contact info:', e);
      }
    }
    if (authUserId && otherStaffId) {
      try {
        const staffSync =
          inviteChannel === 'phone' ? { linked_user_id: authUserId } : { email: String(email), linked_user_id: authUserId };
        await supabaseAdmin
          .from('other_staff_members')
          .update(staffSync)
          .eq('id', otherStaffId);
      } catch (e) {
        console.warn('Could not link other_staff:', e);
      }
    }

    if (authUserId && parentIdForInvite) {
      try {
        const parentSync =
          inviteChannel === 'phone'
            ? { parent_id: authUserId, phone: String(phone) }
            : { parent_id: authUserId, email: String(email) };
        const { error: migErr } = await supabaseAdmin
          .from('parents')
          .update(parentSync)
          .eq('school_id', adminData.school_id)
          .eq('parent_id', parentIdForInvite);
        if (migErr) throw migErr;
      } catch (e) {
        console.error('Failed to migrate parents.parent_id:', e);
        try {
          await supabaseAdmin.auth.admin.deleteUser(authUserId);
        } catch {
          /* best-effort */
        }
        try {
          await supabaseAdmin.from('users').delete().eq('user_id', authUserId);
        } catch {
          /* best-effort */
        }
        setCors();
        res.status(400).json({
          error:
            'Could not link guardian records to the new account. The invitation was rolled back; nothing was created.',
        });
        return;
      }
    }

    if (inviteChannel === 'phone' && oneTimeInvitePassword) {
      try {
        const issued = await issuePhoneVerificationCode(supabaseAdmin, { userId: authUserId, phone: String(phone) });
        if (issued.rateLimited) {
          throw new Error('This phone number requested a code too recently. Try again in a minute.');
        }
        const smsResult = await sendEgoSms(
          String(phone),
          `Welcome to PwezaCore! Your account is ready. Enter this code to set your password and log in: ${issued.code}\n\nIt expires in 10 minutes.`,
          { priority: '0' }
        );
        if (!smsResult.success) {
          throw new Error(smsResult.error || 'Could not send the verification SMS.');
        }
      } catch (smsErr) {
        console.error('[create-user-account] Phone invite SMS failed:', smsErr);
        try {
          await supabaseAdmin.auth.admin.deleteUser(authUserId);
        } catch {
          /* ignore */
        }
        try {
          await supabaseAdmin.from('users').delete().eq('user_id', authUserId);
        } catch {
          /* ignore */
        }
        if (otherStaffId) {
          try {
            await supabaseAdmin.from('other_staff_members').update({ linked_user_id: null }).eq('id', otherStaffId);
          } catch {
            /* ignore */
          }
        }
        if (parentIdForInvite) {
          try {
            await supabaseAdmin
              .from('parents')
              .update({ parent_id: parentIdForInvite })
              .eq('school_id', adminData.school_id)
              .eq('parent_id', authUserId);
          } catch {
            /* ignore */
          }
        }
        setCors();
        res.status(502).json({
          error: smsErr instanceof Error ? smsErr.message : 'Could not send the verification SMS. The account was not created.',
        });
        return;
      }
    } else if (sendEmailInvite && oneTimeInvitePassword) {
      try {
        const loginUrl = `${getPublicSiteOrigin()}/login?email=${encodeURIComponent(String(email))}&first_login=1`;
        const mailResult = await sendResendInnerHtml({
          to: String(email),
          subject: buildCredentialEmailSubject(String(roleOut ?? ''), ''),
          innerHtml: buildCredentialInnerHtml({
            recipientName: name || String(firstName ?? '') || 'there',
            email: String(email),
            password: oneTimeInvitePassword,
            role: String(roleOut ?? ''),
            roleLabel: String(roleOut ?? ''),
            loginUrl,
            firstLoginEnforced: true,
          }),
        });
        if (!mailResult || mailResult.success !== true) {
          console.error('[create-user-account] Welcome email failed:', mailResult?.error);
          try {
            await supabaseAdmin.auth.admin.deleteUser(authUserId);
          } catch {
            /* ignore */
          }
          try {
            await supabaseAdmin.from('users').delete().eq('user_id', authUserId);
          } catch {
            /* ignore */
          }
          if (otherStaffId) {
            try {
              await supabaseAdmin.from('other_staff_members').update({ linked_user_id: null }).eq('id', otherStaffId);
            } catch {
              /* ignore */
            }
          }
          if (parentIdForInvite) {
            try {
              await supabaseAdmin
                .from('parents')
                .update({ parent_id: parentIdForInvite })
                .eq('school_id', adminData.school_id)
                .eq('parent_id', authUserId);
            } catch {
              /* ignore */
            }
          }
          setCors();
          res.status(502).json({
            error:
              mailResult?.error ||
              'Could not send the welcome email. The account was not created. Check RESEND_API_KEY and try again.',
          });
          return;
        }
      } catch (mailErr) {
        console.error('[create-user-account] Welcome email exception:', mailErr);
        try {
          await supabaseAdmin.auth.admin.deleteUser(authUserId);
        } catch {
          /* ignore */
        }
        try {
          await supabaseAdmin.from('users').delete().eq('user_id', authUserId);
        } catch {
          /* ignore */
        }
        if (otherStaffId) {
          try {
            await supabaseAdmin.from('other_staff_members').update({ linked_user_id: null }).eq('id', otherStaffId);
          } catch {
            /* ignore */
          }
        }
        if (parentIdForInvite) {
          try {
            await supabaseAdmin
              .from('parents')
              .update({ parent_id: parentIdForInvite })
              .eq('school_id', adminData.school_id)
              .eq('parent_id', authUserId);
          } catch {
            /* ignore */
          }
        }
        setCors();
        res.status(502).json({ error: 'Could not send the welcome email. The account was not created.' });
        return;
      }
    }

    if (!sendEmailInvite && password) {
      try {
        const loginUrl = `${getPublicSiteOrigin()}/login?email=${encodeURIComponent(String(email))}`;
        await sendResendInnerHtml({
          to: String(email),
          subject: buildCredentialEmailSubject(String(roleOut ?? ''), ''),
          innerHtml: buildCredentialInnerHtml({
            recipientName: name || String(firstName ?? '') || 'there',
            email: String(email),
            password: String(password),
            role: String(roleOut ?? ''),
            roleLabel: String(roleOut ?? ''),
            loginUrl,
          }),
        });
      } catch (mailErr) {
        console.warn('Could not send credential email:', mailErr);
      }
    }

    setCors();
    res.status(200).json({
      success: true,
      ...(parentIdForInvite ? { userId: authUserId } : {}),
      message: sendEmailInvite
        ? 'Invitation sent! They will receive an email with a one-time password and a sign-in button.'
        : 'User created successfully! They can now log in with their credentials.',
    });
  } catch (err) {
    send500(err);
  }
};
