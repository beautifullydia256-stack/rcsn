/**
 * Vercel: POST /api/admin/create-teacher-login
 * Same-origin alternative to Edge Function create-teacher-login — sends credential email via Resend.
 */

const { createClient } = require('@supabase/supabase-js');
const { createServerClient } = require('@supabase/ssr');

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

const ALLOWED_ROLES = ['owner', 'admin', 'head_teacher'];

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
      res.statusCode = 204;
      res.end();
      return;
    }
    if (req.method !== 'POST') {
      setCors();
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnon || !supabaseServiceKey) {
      setCors();
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Server configuration error' }));
      return;
    }

    const getCookie = parseCookies(getCookieString(req));
    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        get(name) {
          return getCookie(name) ?? undefined;
        },
        set() {},
        remove() {},
      },
    });

    const {
      data: { user: callerUser },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !callerUser) {
      setCors();
      res.statusCode = 401;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    const { data: callerProfile } = await supabase.from('users').select('role, school_id').eq('user_id', callerUser.id).maybeSingle();
    const callerRole = callerProfile?.role ? String(callerProfile.role) : '';
    const callerSchoolId = callerProfile?.school_id ? String(callerProfile.school_id) : null;
    if (!ALLOWED_ROLES.includes(callerRole)) {
      setCors();
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Forbidden' }));
      return;
    }

    const body = parseBody(req);
    const email = String(body.email ?? '')
      .trim()
      .toLowerCase();
    const password = String(body.password ?? '');
    const teacherId = String(body.teacher_id ?? '');
    const schoolId = String(body.school_id ?? '');
    const name = body.name ? String(body.name) : 'Teacher User';

    if (!email || !password || !teacherId || !schoolId) {
      setCors();
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Missing required fields' }));
      return;
    }
    const { validatePasswordLength } = require('../../lib/passwordPolicy');
    const pwdErr = validatePasswordLength(password);
    if (pwdErr) {
      setCors();
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: pwdErr }));
      return;
    }

    if (callerRole !== 'owner' && callerSchoolId !== schoolId) {
      setCors();
      res.statusCode = 403;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Forbidden' }));
      return;
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: existingUser } = await supabaseAdmin.from('users').select('user_id').eq('email', email).maybeSingle();
    if (existingUser?.user_id) {
      setCors();
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'An account with this email already exists. Please use a different email address.' }));
      return;
    }

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        teacher_id: teacherId,
        role: 'teacher',
        name,
        school_id: schoolId,
        email,
        created_by: callerUser.id,
      },
    });

    if (createErr || !created?.user) {
      setCors();
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: createErr?.message || 'Failed to create user' }));
      return;
    }

    await supabaseAdmin
      .from('users')
      .upsert(
        { user_id: created.user.id, email, role: 'teacher', name, school_id: schoolId },
        { onConflict: 'user_id' },
      );

    try {
      await supabaseAdmin.from('teachers').update({ email }).eq('teacher_id', teacherId).eq('school_id', schoolId);
    } catch {
      // non-fatal
    }

    try {
      const { sendResendInnerHtml } = require('../../lib/resendSend');
      const { buildCredentialInnerHtml, buildCredentialEmailSubject } = require('../../lib/credentialInnerHtml');
      const { getPublicSiteOrigin } = require('../../lib/emailHtml');
      const loginUrl = `${getPublicSiteOrigin()}/login`;
      await sendResendInnerHtml({
        to: email,
        subject: buildCredentialEmailSubject('teacher', 'Teacher'),
        innerHtml: buildCredentialInnerHtml({
          recipientName: name,
          email,
          password,
          role: 'teacher',
          roleLabel: 'Teacher',
          loginUrl,
        }),
      });
    } catch (mailErr) {
      console.warn('Could not send teacher credential email:', mailErr);
    }

    setCors();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ success: true, user_id: created.user.id }));
  } catch (e) {
    console.error('create-teacher-login', e);
    setCors();
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: e instanceof Error ? e.message : 'Unexpected error' }));
  }
};
