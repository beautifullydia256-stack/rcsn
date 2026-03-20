/**
 * Vercel serverless: POST /api/admin/create-student-login
 * Creates auth + users record for a student (e.g. after Add Student).
 * Runs on www.pwezacore.com so the frontend can call same-origin.
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
    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        get(name: string) { return getCookie(name) ?? undefined; },
        set() {},
        remove() {},
      },
    });

    const { data: { user: adminUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !adminUser) {
      setCors();
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { data: adminRow } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('user_id', adminUser.id)
      .single();

    if (!adminRow || !['admin', 'owner'].includes(adminRow.role)) {
      setCors();
      res.status(403).json({ error: 'Admin access required' });
      return;
    }

    const body = parseBody(req);
    const { admission_number, student_id, email, password } = body as { admission_number?: string; student_id?: string; email?: string; password?: string };

    if (!student_id && !admission_number) {
      setCors();
      res.status(400).json({ error: 'Provide either student_id or admission_number to create a student login.' });
      return;
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    let studentData: Record<string, unknown> | null = null;
    if (student_id) {
      const { data, error } = await supabaseAdmin.from('students').select('*').eq('student_id', student_id).single();
      if (!error) studentData = data;
    }
    if (!studentData && admission_number) {
      const { data, error } = await supabaseAdmin.from('students').select('*').eq('admission_number', admission_number).single();
      if (!error) studentData = data;
    }

    const studentEmail = (email && String(email).includes('@'))
      ? String(email)
      : (admission_number ? `${admission_number}@school.local` : null);
    if (!studentEmail) {
      setCors();
      res.status(400).json({ error: 'Email or admission_number is required to create a student login.' });
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {
      generateOneTimePassword,
      validatePasswordLength,
    } = require('../../lib/passwordPolicy') as {
      generateOneTimePassword: () => string;
      validatePasswordLength: (p: unknown) => string | null;
    };

    let studentPassword: string;
    if (password != null && String(password).trim() !== '') {
      const err = validatePasswordLength(password);
      if (err) {
        setCors();
        res.status(400).json({ error: err });
        return;
      }
      studentPassword = String(password).trim();
    } else {
      // Never reuse admission number as password (guessable). Admin UI omits password for this path.
      studentPassword = generateOneTimePassword();
    }
    const canonicalStudentId = studentData?.student_id as string;
    const canonicalAdmission = (studentData?.admission_number as string) || admission_number || 'N/A';

    const { data: existingUser } = await supabaseAdmin.from('users').select('user_id').eq('email', studentEmail).single();
    if (existingUser) {
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(existingUser.user_id);
        if (authUser?.user) {
          setCors();
          res.status(400).json({ error: 'An account with this email already exists. Please use a different email address.' });
          return;
        }
      } catch {
        // Orphaned record - clean up
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
      name: (studentData?.name as string) || canonicalAdmission || 'Student User',
      school_id: studentData?.school_id || null,
      student_id: canonicalStudentId,
    });

    if (userInsertError) {
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      setCors();
      res.status(500).json({ error: `Failed to create user record: ${userInsertError.message}` });
      return;
    }

    const canEmail = studentEmail.includes('@') && !studentEmail.toLowerCase().endsWith('@school.local');
    if (canEmail && studentPassword) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { sendResendInnerHtml } = require('../../lib/resendSend');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { buildCredentialInnerHtml, buildCredentialEmailSubject } = require('../../lib/credentialInnerHtml');
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { getPublicSiteOrigin } = require('../../lib/emailHtml');
        const loginUrl = `${getPublicSiteOrigin()}/login`;
        const displayName = (studentData?.name as string) || canonicalAdmission || 'Student';
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
  } catch (err: unknown) {
    const origin = process.env.CORS_ORIGIN || 'https://www.pwezacore.com';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.status(500).json({ error: err instanceof Error ? err.message : 'A server error has occurred' });
  }
}
