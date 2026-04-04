/**
 * Vercel serverless: POST /api/admin/ensure-parent-link
 * Links a parent to a student after enrollment (create or find parent, link via parents table).
 */

import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

type Req = {
  method?: string;
  headers?: {
    cookie?: string;
    origin?: string;
    get?: (name: string) => string | null;
  };
  body?: string | Record<string, unknown>;
};

const CORS_ALLOWLIST = new Set([
  'https://pwezacore.com',
  'https://www.pwezacore.com',
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
]);

function getRequestOrigin(req: Req): string | undefined {
  const h = req.headers as
    | { cookie?: string; origin?: string; get?: (name: string) => string | null }
    | Record<string, string | string[] | undefined>
    | undefined;
  if (!h) return undefined;
  if (typeof (h as { get?: (name: string) => string | null }).get === 'function') {
    const get = (h as { get: (name: string) => string | null }).get;
    return get('origin') ?? get('Origin') ?? undefined;
  }
  const o = (h as Record<string, string | string[] | undefined>).origin;
  if (Array.isArray(o)) return o[0];
  return typeof o === 'string' ? o : undefined;
}

function resolveCorsOrigin(req: Req): string {
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

/** Vite SPA: session in storage; cross-origin API must accept Bearer (cookies not sent). */
function getBearerToken(req: Req): string | null {
  try {
    const h = req.headers;
    if (!h) return null;
    let raw: string | undefined;
    if (typeof (h as { get?: (n: string) => string | null }).get === 'function') {
      raw =
        (h as { get: (n: string) => string | null }).get('authorization') ??
        (h as { get: (n: string) => string | null }).get('Authorization') ??
        undefined;
    } else {
      const rec = h as Record<string, string | string[] | undefined>;
      const a = rec.authorization ?? rec.Authorization;
      raw = Array.isArray(a) ? a[0] : typeof a === 'string' ? a : undefined;
    }
    if (!raw || typeof raw !== 'string') return null;
    const m = raw.match(/^Bearer\s+(\S+)/i);
    return m ? m[1]!.trim() : null;
  } catch {
    return null;
  }
}

export default async function handler(req: Req, res: Res) {
  const origin = resolveCorsOrigin(req);
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

    const { data: adminRow } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('user_id', adminUser.id)
      .maybeSingle();

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isValidRealEmail } = require('../../lib/realEmail.js') as {
      isValidRealEmail: (e: string) => boolean;
    };

    const body = parseBody(req);
    const { student_id, school_id, name, email, phone, relationship } = body as {
      student_id?: string;
      school_id?: string;
      name?: string;
      email?: string;
      phone?: string;
      relationship?: string;
    };

    if (!student_id || !school_id || !name) {
      setCors();
      res.status(400).json({ error: 'student_id, school_id, and name are required' });
      return;
    }

    if (!adminRow?.school_id || String(adminRow.school_id) !== String(school_id)) {
      setCors();
      res.status(403).json({ error: 'You can only manage parents for your own school.' });
      return;
    }

    const { data: canManage, error: rpcErr } = await supabase.rpc('current_user_can_manage_students');
    if (rpcErr || !canManage) {
      setCors();
      res.status(403).json({ error: 'You do not have permission to link parents for students.' });
      return;
    }

    const parentName = String(name).trim();
    const parentEmailRaw = email && String(email).trim() ? String(email).trim() : '';
    const parentPhone = phone && String(phone).trim() ? String(phone).trim() : null;
    const rel = relationship && String(relationship).trim() ? String(relationship).trim() : null;

    if (!parentEmailRaw || !isValidRealEmail(parentEmailRaw)) {
      setCors();
      res.status(400).json({
        error: 'A real parent email address is required (no auto-generated or placeholder addresses).',
      });
      return;
    }
    const parentEmail = parentEmailRaw;
    const authEmail = parentEmail;

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('user_id')
      .eq('email', authEmail)
      .eq('role', 'parent')
      .maybeSingle();

    let parentUserId: string;

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
        setCors();
        res.status(400).json({ error: createError.message });
        return;
      }
      const newId = createData?.user?.id;
      if (!newId) {
        setCors();
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
        setCors();
        res.status(400).json({ error: profileErr.message || 'Could not save parent profile.' });
        return;
      }
    }

    const { error: linkError } = await supabaseAdmin
      .from('parents')
      .insert({
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
        setCors();
        res.status(200).json({ success: true, message: 'Parent already linked to this student.', parent_id: parentUserId });
        return;
      }
      setCors();
      res.status(400).json({ error: linkError.message });
      return;
    }

    setCors();
    res.status(200).json({
      success: true,
      message: existingUser ? 'Parent linked to student.' : 'Parent account created and linked.',
      parent_id: parentUserId,
    });
  } catch (err: unknown) {
    res.setHeader('Access-Control-Allow-Origin', resolveCorsOrigin(req));
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.status(500).json({ error: err instanceof Error ? err.message : 'A server error has occurred' });
  }
}
