/**
 * Vercel serverless: POST /api/admin/create-user-account
 * Intentionally CommonJS (.js) so Node loads it without "Cannot use import statement outside a module"
 * (Vite project's package.json has no "type": "module"; compiled .ts was emitting ESM import syntax.)
 */
'use strict';

const { createClient } = require('@supabase/supabase-js');
const { createServerClient } = require('@supabase/ssr');

const MIN_PWD_LEN = 8;
const MAX_PWD_LEN = 72;
function validatePasswordLength(password) {
  const p = String(password ?? '');
  if (p.length < MIN_PWD_LEN) return `Password must be at least ${MIN_PWD_LEN} characters.`;
  if (p.length > MAX_PWD_LEN) return `Password must be at most ${MAX_PWD_LEN} characters.`;
  return null;
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

    const {
      data: { user: adminUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !adminUser) {
      setCors();
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { data: adminData } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('user_id', adminUser.id)
      .single();

    const MANAGER_ROLES = ['admin', 'owner', 'head_teacher'];
    if (!adminData || !MANAGER_ROLES.includes(String(adminData.role ?? ''))) {
      setCors();
      res.status(403).json({ error: 'Unauthorized - Admin access required' });
      return;
    }

    const body = parseBody(req);

    let emailIn = body.email != null ? String(body.email).trim() : '';
    let firstName = body.firstName != null ? String(body.firstName) : '';
    let lastName = body.lastName != null ? String(body.lastName) : '';
    let roleOut = body.role != null ? String(body.role) : 'teacher';
    const { phone, password, department, position } = body;
    let sendEmailInvite = Boolean(body.sendEmailInvite);

    const teacherId = body.teacherId != null ? String(body.teacherId).trim() : '';
    const otherStaffId = body.otherStaffId != null ? String(body.otherStaffId).trim() : '';

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    if (teacherId || otherStaffId) {
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
      if (!emailIn) emailIn = t.email ? String(t.email).trim() : '';
      if (!emailIn) {
        setCors();
        res
          .status(400)
          .json({ error: 'This teacher has no email. Add an email in the invitation form, then send again.' });
        return;
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
      if (!emailIn) emailIn = o.email ? String(o.email).trim() : '';
      if (!emailIn) {
        setCors();
        res
          .status(400)
          .json({ error: 'This person has no email. Add an email in the invitation form, then send again.' });
        return;
      }
    }

    const email = emailIn;
    const name = `${firstName || ''} ${lastName || ''}`.toString().trim() || email;

    const { data: existingUserByEmail } = await supabaseAdmin.from('users').select('user_id').eq('email', email).maybeSingle();

    if (existingUserByEmail) {
      setCors();
      res.status(400).json({ error: 'A user with this email address has already been registered' });
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
      const { generateOneTimePassword } = require('../../lib/passwordPolicy');
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
        await supabaseAdmin
          .from('teachers')
          .update({ email: String(email) })
          .eq('teacher_id', teacherId)
          .eq('school_id', adminData.school_id);
      } catch (e) {
        console.warn('Could not sync teacher email:', e);
      }
    }
    if (authUserId && otherStaffId) {
      try {
        await supabaseAdmin
          .from('other_staff_members')
          .update({ email: String(email), linked_user_id: authUserId })
          .eq('id', otherStaffId);
      } catch (e) {
        console.warn('Could not link other_staff:', e);
      }
    }

    if (sendEmailInvite && oneTimeInvitePassword) {
      try {
        const { sendResendInnerHtml } = require('../../lib/resendSend');
        const { buildCredentialInnerHtml, buildCredentialEmailSubject } = require('../../lib/credentialInnerHtml');
        const { getPublicSiteOrigin } = require('../../lib/emailHtml');
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
        setCors();
        res.status(502).json({ error: 'Could not send the welcome email. The account was not created.' });
        return;
      }
    }

    if (!sendEmailInvite && password) {
      try {
        const { sendResendInnerHtml } = require('../../lib/resendSend');
        const { buildCredentialInnerHtml, buildCredentialEmailSubject } = require('../../lib/credentialInnerHtml');
        const { getPublicSiteOrigin } = require('../../lib/emailHtml');
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
      message: sendEmailInvite
        ? 'Invitation sent! They will receive an email with a one-time password and a sign-in button.'
        : 'User created successfully! They can now log in with their credentials.',
    });
  } catch (err) {
    send500(err);
  }
};
