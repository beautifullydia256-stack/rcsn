'use strict';
/**
 * Vercel serverless: POST /api/admin/create-student-login
 * Creates auth + users record for a student (e.g. after Add Student).
 */

const { createClient } = require('@supabase/supabase-js');
const { createServerClient } = require('@supabase/ssr');
const { isValidRealEmail } = require('../../lib/realEmail.js');
const { generateOneTimePassword, validatePasswordLength } = require('../../lib/passwordPolicy');
const { sendResendInnerHtml } = require('../../lib/resendSend.js');
const { buildCredentialInnerHtml, buildCredentialEmailSubject } = require('../../lib/credentialInnerHtml.js');
const { getPublicSiteOrigin } = require('../../lib/emailHtml.js');

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
    try { return JSON.parse(b || '{}'); } catch { return {}; }
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
  };
  const setCors = () => Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));

  try {
    if (req.method === 'OPTIONS') { setCors(); res.status(204).end(); return; }
    if (req.method !== 'POST') { setCors(); res.status(405).json({ error: 'Method not allowed' }); return; }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnon || !supabaseServiceKey) {
      setCors(); res.status(500).json({ error: 'Server configuration error. Please contact support.' }); return;
    }

    const cookieStr = getCookieString(req);
    const getCookie = parseCookies(cookieStr);
    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: { get(name) { return getCookie(name) ?? undefined; }, set() {}, remove() {} },
    });

    let adminUser = null;
    const fromCookie = await supabase.auth.getUser();
    if (fromCookie.data?.user && !fromCookie.error) {
      adminUser = fromCookie.data.user;
    } else {
      const h = req.headers || {};
      const raw = typeof h.get === 'function' ? (h.get('authorization') || '') : (h.authorization || '');
      const m = typeof raw === 'string' ? raw.match(/^Bearer\s+(\S+)/i) : null;
      const token = m ? m[1] : null;
      if (token) {
        const fromJwt = await supabase.auth.getUser(token);
        if (fromJwt.data?.user && !fromJwt.error) adminUser = fromJwt.data.user;
      }
    }
    if (!adminUser) { setCors(); res.status(401).json({ error: 'Unauthorized' }); return; }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: adminRow } = await supabaseAdmin
      .from('users').select('school_id, role').eq('user_id', adminUser.id).maybeSingle();

    if (!adminRow || !['admin', 'owner'].includes(String(adminRow.role || ''))) {
      setCors(); res.status(403).json({ error: 'Admin access required' }); return;
    }

    const body = parseBody(req);
    const { admission_number, student_id, email, password } = body;

    if (!student_id && !admission_number) {
      setCors(); res.status(400).json({ error: 'Provide either student_id or admission_number to create a student login.' }); return;
    }

    let studentData = null;
    if (student_id) {
      const { data, error } = await supabaseAdmin.from('students').select('*').eq('student_id', String(student_id)).single();
      if (!error) studentData = data;
    }
    if (!studentData && admission_number) {
      const { data, error } = await supabaseAdmin.from('students').select('*').eq('admission_number', String(admission_number)).single();
      if (!error) studentData = data;
    }

    const fromBody = email && String(email).trim() ? String(email).trim() : '';
    const fromStudent = studentData?.student_email ? String(studentData.student_email).trim() : '';
    const candidate =
      fromBody && isValidRealEmail(fromBody) ? fromBody
      : fromStudent && isValidRealEmail(fromStudent) ? fromStudent
      : null;
    if (!candidate) {
      setCors();
      res.status(400).json({ error: 'Set a real email address on the student record (or pass a valid email in the request) before creating a login.' });
      return;
    }
    const studentEmail = candidate;

    let studentPassword;
    if (password != null && String(password).trim() !== '') {
      const err = validatePasswordLength(password);
      if (err) { setCors(); res.status(400).json({ error: err }); return; }
      studentPassword = String(password).trim();
    } else {
      studentPassword = generateOneTimePassword();
    }

    const canonicalStudentId = studentData?.student_id;
    const canonicalAdmission = studentData?.admission_number || admission_number || 'N/A';

    const { data: existingUser } = await supabaseAdmin.from('users').select('user_id').eq('email', studentEmail).single();
    if (existingUser) {
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(existingUser.user_id);
        if (authUser?.user) {
          setCors(); res.status(400).json({ error: 'An account with this email already exists. Please use a different email address.' }); return;
        }
      } catch {
        await supabaseAdmin.from('users').delete().eq('user_id', existingUser.user_id);
      }
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: studentEmail,
      password: studentPassword,
      email_confirm: true,
      user_metadata: {
        admission_number: canonicalAdmission,
        student_id: canonicalStudentId,
        role: 'student',
        student_name: studentData?.name || canonicalAdmission || 'Student User',
        current_class: studentData?.current_class || 'N/A',
        school_id: studentData?.school_id || null,
        status: studentData?.status || 'active',
      },
    });

    if (error) {
      setCors();
      if (error.message?.toLowerCase().includes('already') || error.message?.toLowerCase().includes('duplicate')) {
        res.status(400).json({ error: 'Student already has a login account. Use "Reset Password" to change password instead.' });
        return;
      }
      res.status(400).json({ error: error.message });
      return;
    }

    const { error: userInsertError } = await supabaseAdmin.from('users').insert({
      user_id: data.user.id,
      email: studentEmail,
      role: 'student',
      name: studentData?.name || canonicalAdmission || 'Student User',
      school_id: studentData?.school_id || null,
      student_id: canonicalStudentId,
    });

    if (userInsertError) {
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      setCors();
      res.status(500).json({ error: `Failed to create user record: ${userInsertError.message}` });
      return;
    }

    if (isValidRealEmail(studentEmail) && studentPassword) {
      try {
        const loginUrl = `${getPublicSiteOrigin()}/login`;
        const displayName = studentData?.name || canonicalAdmission || 'Student';
        await sendResendInnerHtml({
          to: studentEmail,
          subject: buildCredentialEmailSubject('student', 'Student'),
          innerHtml: buildCredentialInnerHtml({
            recipientName: displayName,
            email: studentEmail,
            password: studentPassword,
            role: 'student',
            roleLabel: 'Student',
            loginUrl,
          }),
        });
      } catch (mailErr) {
        console.warn('Could not send student credential email:', mailErr);
      }
    }

    setCors();
    res.status(200).json({ success: true, message: 'Student login created successfully!', user: data.user });
  } catch (err) {
    const origin = process.env.CORS_ORIGIN || 'https://www.pwezacore.com';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.status(500).json({ error: err instanceof Error ? err.message : 'A server error has occurred' });
  }
};
