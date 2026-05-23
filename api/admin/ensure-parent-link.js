/**
 * Vercel serverless: POST /api/admin/ensure-parent-link
 * CommonJS (.js) — same deployment pattern as create-user-account.js (avoids FUNCTION_INVOCATION_FAILED from bundled ESM .ts).
 */
'use strict';

const { randomUUID } = require('crypto');
const { createClient } = require('@supabase/supabase-js');
const { createServerClient } = require('@supabase/ssr');
const { isValidRealEmail } = require('../../lib/realEmail.js');

const CORS_ALLOWLIST = new Set([
  'https://pwezacore.com',
  'https://www.pwezacore.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
]);

function getRequestOrigin(req) {
  const h = req.headers;
  if (!h) return undefined;
  if (typeof h.get === 'function') {
    return h.get('origin') ?? h.get('Origin') ?? undefined;
  }
  const o = h.origin;
  if (Array.isArray(o)) return o[0];
  return typeof o === 'string' ? o : undefined;
}

function resolveCorsOrigin(req) {
  const ro = getRequestOrigin(req);
  const fallback = process.env.CORS_ORIGIN || 'https://www.pwezacore.com';
  if (ro && CORS_ALLOWLIST.has(ro)) return ro;
  const extra = (process.env.CORS_EXTRA_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (ro && extra.includes(ro)) return ro;
  return fallback;
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
    const h = req.headers;
    if (!h) return null;
    let raw;
    if (typeof h.get === 'function') {
      raw = h.get('authorization') ?? h.get('Authorization');
    } else {
      const a = h.authorization ?? h.Authorization;
      raw = Array.isArray(a) ? a[0] : typeof a === 'string' ? a : undefined;
    }
    if (!raw || typeof raw !== 'string') return null;
    const m = raw.match(/^Bearer\s+(\S+)/i);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

/** Same idea as create-user-account.js normalizeManagerRole + accountant (matches DB RPC intent). */
function normalizeStaffRole(role) {
  return String(role ?? '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_');
}

const STUDENT_MANAGE_ROLES = ['admin', 'owner', 'head_teacher', 'accountant', 'secretary'];

async function callerCanManageStudentsForSchool(supabaseAdmin, adminUserId, schoolId, adminRow) {
  const key = normalizeStaffRole(adminRow.role);
  if (STUDENT_MANAGE_ROLES.includes(key)) return true;
  const { data: perm } = await supabaseAdmin
    .from('user_school_permissions')
    .select('id')
    .eq('user_id', adminUserId)
    .eq('school_id', schoolId)
    .eq('permission_key', 'students.manage')
    .maybeSingle();
  return !!perm;
}

module.exports = async function handler(req, res) {
  const origin = resolveCorsOrigin(req);
  const cors = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  };
  const applyCors = () => {
    Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
  };

  try {
    if (req.method === 'OPTIONS') {
      applyCors();
      res.status(204).end();
      return;
    }
    if (req.method !== 'POST') {
      applyCors();
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnon =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnon || !supabaseServiceKey) {
      applyCors();
      res.status(500).json({ error: 'Server configuration error. Please contact support.' });
      return;
    }

    const cookieStr = getCookieString(req);
    const getCookie = parseCookies(cookieStr);
    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        get(name) {
          return getCookie(name) ?? undefined;
        },
        set() {},
        remove() {},
      },
    });

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
      applyCors();
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    // Same as create-user-account.js: read public.users with service role so RLS cannot hide the admin row.
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: adminRow } = await supabaseAdmin
      .from('users')
      .select('school_id, role')
      .eq('user_id', adminUser.id)
      .maybeSingle();

    const body = parseBody(req);
    const student_id = body.student_id != null ? String(body.student_id).trim() : '';
    const school_id = body.school_id != null ? String(body.school_id).trim() : '';
    const name = body.name != null ? String(body.name).trim() : '';
    const email = body.email != null ? String(body.email).trim() : '';
    const phone = body.phone != null ? String(body.phone).trim() : '';
    const relationship = body.relationship != null ? String(body.relationship).trim() : '';

    if (!student_id || !school_id || !name) {
      applyCors();
      res.status(400).json({ error: 'student_id, school_id, and name are required' });
      return;
    }

    if (!adminRow) {
      applyCors();
      res.status(403).json({
        error:
          'No staff profile was found for your login in this environment. Ask support to ensure public.users has a row for your account with the correct school_id.',
      });
      return;
    }
    if (!adminRow.school_id) {
      applyCors();
      res.status(403).json({
        error:
          'Your account has no school assigned in public.users. An admin must set school_id on your user before you can link parents.',
      });
      return;
    }
    if (String(adminRow.school_id) !== String(school_id)) {
      applyCors();
      res.status(403).json({
        error:
          'The school in this request does not match your account school. Try refreshing the page or signing out and back in. If you switched users without reloading, that can cause a stale school until the page reloads.',
      });
      return;
    }

    const canManage = await callerCanManageStudentsForSchool(
      supabaseAdmin,
      adminUser.id,
      school_id,
      adminRow
    );
    if (!canManage) {
      applyCors();
      res.status(403).json({
        error:
          'You do not have permission to link parents for students. Your role must be admin, owner, head teacher, or accountant, or you need the students.manage permission for this school.',
      });
      return;
    }

    // Same security as adding students: student must belong to this school (not another school's UUID).
    const { data: studentRow } = await supabaseAdmin
      .from('students')
      .select('student_id, school_id')
      .eq('student_id', student_id)
      .maybeSingle();
    if (!studentRow || String(studentRow.school_id) !== String(school_id)) {
      applyCors();
      res.status(403).json({
        error:
          'That student is not enrolled in your school. You can only link parents to students at your school.',
      });
      return;
    }

    const parentName = name;
    const parentEmailRaw = email ? email.trim() : '';
    const parentPhone = phone ? phone.trim() : null;
    const rel = relationship ? relationship.trim() : null;

    if (!parentEmailRaw) {
      const linkOnlyId = randomUUID();
      const { error: linkOnlyErr } = await supabaseAdmin.from('parents').insert({
        parent_id: linkOnlyId,
        student_id,
        school_id,
        name: parentName,
        email: null,
        phone: parentPhone || null,
        ...(rel ? { relationship: rel } : {}),
      });
      if (linkOnlyErr) {
        if (linkOnlyErr.code === '23505') {
          applyCors();
          res.status(200).json({
            success: true,
            message: 'Parent already linked to this student.',
          });
          return;
        }
        applyCors();
        res.status(400).json({ error: linkOnlyErr.message });
        return;
      }
      applyCors();
      res.status(200).json({
        success: true,
        message:
          'Guardian linked without a portal login. Add an email on their profile, then use Invite to portal to send credentials.',
        parent_id: linkOnlyId,
      });
      return;
    }

    if (!isValidRealEmail(parentEmailRaw)) {
      applyCors();
      res.status(400).json({
        error: 'Enter a valid email address, or leave email blank to save the guardian without portal access for now.',
      });
      return;
    }
    const parentEmail = parentEmailRaw;
    const authEmail = parentEmail;

    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('user_id')
      .eq('email', authEmail)
      .eq('role', 'parent')
      .maybeSingle();

    let parentUserId;

    if (existingUser?.user_id) {
      parentUserId = existingUser.user_id;
    } else {
      const password = `Parent${Math.random().toString(36).slice(2, 10)}`;
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
        user_metadata: { role: 'parent', name: parentName, school_id, student_id },
      });
      if (createError) {
        applyCors();
        res.status(400).json({ error: createError.message });
        return;
      }
      const newId = createData?.user?.id;
      if (!newId) {
        applyCors();
        res.status(502).json({ error: 'Auth did not return a user id. Parent account was not created.' });
        return;
      }
      parentUserId = newId;
      const { error: profileErr } = await supabaseAdmin.from('users').insert({
        user_id: parentUserId,
        email: authEmail,
        role: 'parent',
        name: parentName,
        school_id,
        phone: parentPhone || null,
      });
      if (profileErr) {
        try {
          await supabaseAdmin.auth.admin.deleteUser(parentUserId);
        } catch {
          /* best-effort */
        }
        applyCors();
        res.status(400).json({ error: profileErr.message || 'Could not save parent profile.' });
        return;
      }
    }

    const { error: linkError } = await supabaseAdmin.from('parents').insert({
      parent_id: parentUserId,
      student_id,
      school_id,
      name: parentName,
      email: parentEmail || null,
      phone: parentPhone || null,
      ...(rel ? { relationship: rel } : {}),
    });

    if (linkError) {
      if (linkError.code === '23505') {
        applyCors();
        res.status(200).json({
          success: true,
          message: 'Parent already linked to this student.',
          parent_id: parentUserId,
        });
        return;
      }
      applyCors();
      res.status(400).json({ error: linkError.message });
      return;
    }

    applyCors();
    res.status(200).json({
      success: true,
      message: existingUser ? 'Parent linked to student.' : 'Parent account created and linked.',
      parent_id: parentUserId,
    });
  } catch (err) {
    applyCors();
    console.error('[ensure-parent-link]', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'A server error has occurred' });
  }
};
