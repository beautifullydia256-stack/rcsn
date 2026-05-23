import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export default async function handler(request: NextRequest) {
  if (request.method !== 'DELETE') {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const supabase = getSupabase();
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') ?? '';
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { user: caller }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: callerProfile } = await supabase
      .from('users')
      .select('school_id, role')
      .eq('user_id', caller.id)
      .single();

    if (!callerProfile?.school_id || !['admin', 'owner', 'head_teacher'].includes(callerProfile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { teacher_id } = (await request.json()) as { teacher_id?: string };
    if (!teacher_id) return NextResponse.json({ error: 'teacher_id is required' }, { status: 400 });

    const { data: teacher } = await supabase
      .from('teachers')
      .select('teacher_id, name, email')
      .eq('teacher_id', teacher_id)
      .eq('school_id', callerProfile.school_id)
      .single();

    if (!teacher) return NextResponse.json({ error: 'Teacher not found' }, { status: 404 });

    // Capture linked user accounts BEFORE delete (FK is SET NULL on teacher delete)
    const { data: linkedUsers } = await supabase
      .from('users')
      .select('user_id')
      .eq('linked_teacher_id', teacher_id);

    // attendance.teacher_id is nullable + NO ACTION — null it out first
    await supabase.from('attendance').update({ teacher_id: null }).eq('teacher_id', teacher_id);

    const { error: deleteErr } = await supabase
      .from('teachers')
      .delete()
      .eq('teacher_id', teacher_id)
      .eq('school_id', callerProfile.school_id);

    if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 400 });

    if (linkedUsers && linkedUsers.length > 0) {
      for (const u of linkedUsers) {
        await supabase.from('users').delete().eq('user_id', u.user_id);
        await supabase.auth.admin.deleteUser(u.user_id);
      }
    }

    return NextResponse.json({ success: true, deleted: teacher.name });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Delete failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
