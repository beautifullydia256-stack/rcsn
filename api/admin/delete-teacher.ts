import { createClient } from '@supabase/supabase-js';

export const config = { runtime: 'nodejs' };

type Req = {
  method?: string;
  headers?: Record<string, string | string[] | undefined>;
  body?: Record<string, unknown>;
};
type Res = {
  status: (n: number) => Res;
  json: (x: unknown) => void;
};

function getHeader(req: Req, name: string): string | undefined {
  const v = req.headers?.[name.toLowerCase()];
  return Array.isArray(v) ? v[0] : v;
}

function getSupabase() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env vars not configured');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export default async function handler(req: Req, res: Res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const supabase = getSupabase();
    const authHeader = getHeader(req, 'authorization');
    const token = authHeader?.replace('Bearer ', '') ?? '';
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !caller) return res.status(401).json({ error: 'Unauthorized' });

    const { data: callerProfile } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('user_id', caller.id)
      .single();

    if (!callerProfile?.school_id || !['admin', 'owner', 'head_teacher'].includes(callerProfile.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { teacher_id } = (req.body ?? {}) as { teacher_id?: string };
    if (!teacher_id) return res.status(400).json({ error: 'teacher_id is required' });

    const { data: teacher } = await supabase
      .from('teachers')
      .select('teacher_id, name, email')
      .eq('teacher_id', teacher_id)
      .eq('school_id', callerProfile.school_id)
      .single();

    if (!teacher) return res.status(404).json({ error: 'Teacher not found' });

    const { data: linkedUsers } = await supabase
      .from('users')
      .select('user_id')
      .eq('linked_teacher_id', teacher_id);

    await supabase.from('attendance').update({ teacher_id: null }).eq('teacher_id', teacher_id);

    const { error: deleteErr } = await supabase
      .from('teachers')
      .delete()
      .eq('teacher_id', teacher_id)
      .eq('school_id', callerProfile.school_id);

    if (deleteErr) return res.status(400).json({ error: deleteErr.message });

    if (linkedUsers && linkedUsers.length > 0) {
      for (const u of linkedUsers) {
        await supabase.from('users').delete().eq('user_id', u.user_id);
        await supabase.auth.admin.deleteUser(u.user_id);
      }
    }

    return res.status(200).json({ success: true, deleted: teacher.name });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Delete failed';
    return res.status(500).json({ error: msg });
  }
}
