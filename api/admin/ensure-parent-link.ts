/**
 * Vercel serverless: POST /api/admin/ensure-parent-link
 * Links a parent to a student after enrollment (create or find parent, link via parents table).
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
    const { student_id, school_id, name, email, phone } = body as { student_id?: string; school_id?: string; name?: string; email?: string; phone?: string };

    if (!student_id || !school_id || !name) {
      setCors();
      res.status(400).json({ error: 'student_id, school_id, and name are required' });
      return;
    }
    if (!email && !phone) {
      setCors();
      res.status(400).json({ error: 'At least one of email or phone is required to create or link parent login' });
      return;
    }

    const parentName = String(name).trim();
    const parentEmail = email && String(email).trim() ? String(email).trim() : null;
    const parentPhone = phone && String(phone).trim() ? String(phone).trim() : null;
    const authEmail = parentEmail || (parentPhone ? `p.${parentPhone.replace(/\D/g, '')}@school.parent` : null);
    if (!authEmail) {
      setCors();
      res.status(400).json({ error: 'Could not derive login identifier' });
      return;
    }

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
      parentUserId = createData!.user.id;
      await supabaseAdmin.from('users').insert({
        user_id: parentUserId,
        email: authEmail,
        role: 'parent',
        name: parentName,
        school_id,
        phone: parentPhone || null,
      });
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
    const origin = process.env.CORS_ORIGIN || 'https://www.pwezacore.com';
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.status(500).json({ error: err instanceof Error ? err.message : 'A server error has occurred' });
  }
}
