/**
 * Vercel serverless: POST /api/admin/create-user-account
 * Same logic as app/api/admin/create-user-account/route.ts but runs on www.pwezacore.com
 * so the frontend can call same-origin and avoid CORS. Set env: NEXT_PUBLIC_SUPABASE_URL,
 * NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
 */

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

type Req = {
  method?: string;
  headers?: { cookie?: string; get?: (name: string) => string | null };
  body?: string | Record<string, unknown>;
};
type Res = {
  setHeader: (k: string, v: string | number) => void;
  status: (n: number) => Res;
  json: (x: unknown) => void;
  end: (body?: string) => void;
};

function getCookieString(req: Req): string | undefined {
  const h = req.headers;
  if (!h) return undefined;
  if (typeof h.cookie === 'string') return h.cookie;
  if (typeof (h as { get?: (n: string) => string | null }).get === 'function') {
    return (h as { get: (n: string) => string | null }).get('cookie') ?? undefined;
  }
  return undefined;
}

function parseCookies(cookieHeader: string | undefined): (name: string) => string | undefined {
  const map = new Map<string, string>();
  if (cookieHeader) {
    for (const part of cookieHeader.split(';')) {
      const [key, ...v] = part.trim().split('=');
      if (key) map.set(key.trim(), decodeURIComponent((v.join('=') || '').trim()));
    }
  }
  return (name: string) => map.get(name);
}

function parseBody(req: Req): Record<string, unknown> {
  const b = req.body;
  if (b == null) return {};
  if (typeof b === 'object' && !Array.isArray(b)) return b as Record<string, unknown>;
  if (typeof b === 'string') {
    try { return JSON.parse(b || '{}') as Record<string, unknown>; } catch { return {}; }
  }
  return {};
}

export default async function handler(req: Req, res: Res) {
  const origin = process.env.CORS_ORIGIN || 'https://www.pwezacore.com';
  const cors: Record<string, string> = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
  const setCors = () => Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));

  const send500 = (err: unknown) => {
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

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnon || !supabaseServiceKey) {
      setCors();
      res.status(500).json({ error: 'Server configuration error. Please contact support.' });
      return;
    }

    const cookieStr = getCookieString(req);
    const getCookie = parseCookies(cookieStr);
    let supabase: ReturnType<typeof createServerClient>;
    try {
      supabase = createServerClient(supabaseUrl, supabaseAnon, {
        cookies: {
          get(name: string) { return getCookie(name) ?? undefined; },
          set() {},
          remove() {},
        },
      });
    } catch (e) {
      send500(e);
      return;
    }

    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser();
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
    const { phone, password, department, position } = body as Record<string, unknown>;
    let sendEmailInvite = Boolean(body.sendEmailInvite);

    const teacherId = body.teacherId != null ? String(body.teacherId).trim() : '';
    const otherStaffId = body.otherStaffId != null ? String(body.otherStaffId).trim() : '';

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Link invite to an existing teacher or other_staff roster row (invite-only)
    if (teacherId || otherStaffId) {
      sendEmailInvite = true;
      if (body.password != null && String(body.password).trim() !== '') {
        setCors();
        res.status(400).json({ error: 'Roster invites use email only — remove password from the request.' });
        return;
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { validatePasswordLength } = require('../../lib/passwordPolicy') as {
      validatePasswordLength: (p: unknown) => string | null;
    };
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
      const full = String((t as { name?: string }).name || '').trim();
      const parts = full.split(/\s+/).filter(Boolean);
      firstName = parts[0] || 'Teacher';
      lastName = parts.slice(1).join(' ') || '';
      if (!emailIn) emailIn = (t as { email?: string }).email ? String((t as { email?: string }).email).trim() : '';
      if (!emailIn) {
        setCors();
        res.status(400).json({ error: 'This teacher has no email. Add an email in the invitation form, then send again.' });
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
      if ((o as { linked_user_id?: string }).linked_user_id) {
        setCors();
        res.status(400).json({ error: 'This person already has a login linked.' });
        return;
      }
      const sr = String((o as { staff_role?: string }).staff_role || '').trim();
      if (!sr) {
        setCors();
        res.status(400).json({ error: 'Set a dashboard role (Staff role) on the Staff page before inviting.' });
        return;
      }
      roleOut = sr;
      const full = String((o as { full_name?: string }).full_name || '').trim();
      const parts = full.split(/\s+/).filter(Boolean);
      firstName = parts[0] || 'Staff';
      lastName = parts.slice(1).join(' ') || '';
      if (!emailIn) emailIn = (o as { email?: string }).email ? String((o as { email?: string }).email).trim() : '';
      if (!emailIn) {
        setCors();
        res.status(400).json({ error: 'This person has no email. Add an email in the invitation form, then send again.' });
        return;
      }
    }

    const email = emailIn;
    const name = `${firstName || ''} ${lastName || ''}`.toString().trim() || email;

    // Check if email already exists in public.users (fast) - avoid listUsers() which can timeout on serverless
    const { data: existingUserByEmail } = await supabaseAdmin
      .from('users')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();

    if (existingUserByEmail) {
      setCors();
      res.status(400).json({ error: 'A user with this email address has already been registered' });
      return;
    }

    let authUserId: string | null = null;
    const meta: Record<string, unknown> = {
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
      const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(String(email), { data: meta });
      if (inviteError) {
        if (inviteError.message?.toLowerCase().includes('already') || inviteError.message?.toLowerCase().includes('registered')) {
          setCors();
          res.status(400).json({ error: 'A user with this email address has already been registered' });
          return;
        }
        setCors();
        res.status(400).json({ error: inviteError.message });
        return;
      } else {
        authUserId = data?.user?.id ?? null;
      }
    } else {
      const { data, error: signupError } = await supabaseAdmin.auth.admin.createUser({
        email: String(email),
        password: String(password),
        email_confirm: true,
        user_metadata: meta,
      });
      if (signupError) {
        if (signupError.message?.toLowerCase().includes('already') || signupError.message?.toLowerCase().includes('registered')) {
          setCors();
          res.status(400).json({ error: 'A user with this email address has already been registered' });
          return;
        }
        setCors();
        res.status(400).json({ error: signupError.message });
        return;
      } else {
        authUserId = data?.user?.id ?? null;
      }
    }

    if (!adminData.school_id) {
      if (authUserId) await supabaseAdmin.auth.admin.deleteUser(authUserId);
      setCors();
      res.status(400).json({ error: 'Admin user does not have a school_id. Please contact support.' });
      return;
    }

    const { data: schoolCheck, error: schoolCheckError } = await supabaseAdmin.from('schools').select('school_id').eq('school_id', adminData.school_id).single();
    if (schoolCheckError || !schoolCheck) {
      if (authUserId) await supabaseAdmin.auth.admin.deleteUser(authUserId);
      setCors();
      res.status(400).json({ error: `The school_id does not exist in the schools table.`, details: schoolCheckError?.message });
      return;
    }

    // Create user profile in users table - direct upsert (no RPC), same as create-teacher-login / app route
    try {
      const { error: userInsertError } = await supabaseAdmin
        .from('users')
        .upsert({
          user_id: authUserId,
          email: String(email),
          name,
          role: String(roleOut ?? 'teacher'),
          school_id: adminData.school_id,
          phone: phone != null ? String(phone) : null,
          department: department != null ? String(department) : null,
          position: position != null ? String(position) : null,
        }, { onConflict: 'user_id' });

      if (userInsertError) {
        console.warn('Failed to create user record:', userInsertError.message);
        // Don't fail the entire operation; auth user can still log in
      }
    } catch (userErr: unknown) {
      console.warn('Error creating user record:', userErr);
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

    if (!sendEmailInvite && password) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { sendResendInnerHtml } = require('../../lib/resendSend');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { buildCredentialInnerHtml, buildCredentialEmailSubject } = require('../../lib/credentialInnerHtml');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { getPublicSiteOrigin } = require('../../lib/emailHtml');
        const loginUrl = `${getPublicSiteOrigin()}/login`;
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
        ? 'User invited successfully! They will receive an email to set up their account.'
        : 'User created successfully! They can now log in with their credentials.',
    });
  } catch (err: unknown) {
    send500(err);
  }
}
