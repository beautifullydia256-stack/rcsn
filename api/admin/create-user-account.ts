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

    if (!adminData || !['admin', 'owner'].includes(adminData.role)) {
      setCors();
      res.status(403).json({ error: 'Unauthorized - Admin access required' });
      return;
    }

    const body = parseBody(req);

    const { email, firstName, lastName, role, phone, password, sendEmailInvite, department, position } = body as Record<string, unknown>;
    const name = `${firstName || ''} ${lastName || ''}`.toString().trim();

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    try {
      const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingAuthUser = existingAuthUsers?.users?.find((u: { email?: string }) => u.email === email);
      if (existingAuthUser) {
        const { data: existingUserRecord } = await supabaseAdmin.from('users').select('user_id').eq('user_id', existingAuthUser.id).single();
        if (existingUserRecord) {
          setCors();
          res.status(400).json({ error: 'A user with this email address has already been registered' });
          return;
        }
        await supabaseAdmin.auth.admin.deleteUser(existingAuthUser.id);
      }
    } catch {
      // continue
    }

    let authUserId: string | null = null;
    const meta = { name, role, school_id: adminData.school_id, department: department ?? null, position: position ?? null, phone: phone ?? null };

    if (sendEmailInvite) {
      const { data, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(String(email), { data: meta });
      if (inviteError) {
        if (inviteError.message?.toLowerCase().includes('already') || inviteError.message?.toLowerCase().includes('registered')) {
          try {
            const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
            const orphaned = authUsers?.users?.find((u: { email?: string }) => u.email === email);
            if (orphaned) {
              const { data: ur } = await supabaseAdmin.from('users').select('user_id').eq('user_id', orphaned.id).single();
              if (!ur) {
                await supabaseAdmin.auth.admin.deleteUser(orphaned.id);
                const retry = await supabaseAdmin.auth.admin.inviteUserByEmail(String(email), { data: meta });
                if (retry.error) throw retry.error;
                authUserId = retry.data.user?.id ?? null;
              } else throw inviteError;
            } else throw inviteError;
          } catch (e) {
            setCors();
            res.status(400).json({ error: inviteError.message });
            return;
          }
        } else {
          setCors();
          res.status(400).json({ error: inviteError.message });
          return;
        }
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
          try {
            const { data: authUsers } = await supabaseAdmin.auth.admin.listUsers();
            const orphaned = authUsers?.users?.find((u: { email?: string }) => u.email === email);
            if (orphaned) {
              const { data: ur } = await supabaseAdmin.from('users').select('user_id').eq('user_id', orphaned.id).single();
              if (!ur) {
                await supabaseAdmin.auth.admin.deleteUser(orphaned.id);
                const retry = await supabaseAdmin.auth.admin.createUser({ email: String(email), password: String(password), email_confirm: true, user_metadata: meta });
                if (retry.error) throw retry.error;
                authUserId = retry.data.user?.id ?? null;
              } else throw signupError;
            } else throw signupError;
          } catch (e) {
            setCors();
            res.status(400).json({ error: signupError.message });
            return;
          }
        } else {
          setCors();
          res.status(400).json({ error: signupError.message });
          return;
        }
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

    const { error: rpcError } = await supabaseAdmin.rpc('insert_user_with_school', {
      p_user_id: authUserId,
      p_email: String(email),
      p_name: name,
      p_role: String(role ?? 'teacher'),
      p_school_id: adminData.school_id,
      p_phone: phone != null ? String(phone) : null,
      p_department: department != null ? String(department) : null,
      p_position: position != null ? String(position) : null,
    });

    let profileError = rpcError;
    if (rpcError) {
      const msg = (rpcError.message || '').toLowerCase();
      if (msg.includes('function') && (msg.includes('does not exist') || msg.includes('schema cache'))) {
        const { error: insertError } = await supabaseAdmin.from('users').insert({
          user_id: authUserId,
          email,
          name,
          role: role ?? 'teacher',
          school_id: adminData.school_id,
          phone: phone ?? null,
          department: department ?? null,
          position: position ?? null,
        });
        profileError = insertError;
      }
    }

    if (profileError) {
      if (authUserId) {
        try { await supabaseAdmin.auth.admin.deleteUser(authUserId); } catch {}
      }
      setCors();
      res.status(500).json({ error: profileError.message || 'Failed to create user profile', details: profileError.message });
      return;
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
