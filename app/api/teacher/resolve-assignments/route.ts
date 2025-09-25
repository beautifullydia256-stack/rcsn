export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

    const res = NextResponse.next();
    res.headers.set('Cache-Control', 'no-store');
    const supabase = createServerClient(supabaseUrl, supabaseAnon, {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          res.cookies.set({ name, value: '', ...options, maxAge: 0 });
        },
      },
    });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('school_id,email,name')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (userErr || !userRow?.school_id) {
      return NextResponse.json({ error: 'User not linked to a school' }, { status: 400 });
    }

    // Resolve teachers.teacher_id within this school (metadata → email → name), case-insensitive
    let resolvedTeacherIdFromTeachers: string | null = null;
    const metaTeacherId = session.user.user_metadata?.teacher_id as string | undefined;
    if (metaTeacherId) {
      const { data: tMeta } = await supabase
        .from('teachers')
        .select('teacher_id')
        .eq('school_id', userRow.school_id)
        .eq('teacher_id', metaTeacherId)
        .maybeSingle();
      if (tMeta) resolvedTeacherIdFromTeachers = tMeta.teacher_id;
    }
    if (!resolvedTeacherIdFromTeachers && userRow.email) {
      const { data: tEmail } = await supabase
        .from('teachers')
        .select('teacher_id')
        .eq('school_id', userRow.school_id)
        .ilike('email', (userRow.email || '').trim())
        .maybeSingle();
      if (tEmail) resolvedTeacherIdFromTeachers = tEmail.teacher_id;
    }
    if (!resolvedTeacherIdFromTeachers && userRow.name) {
      const { data: tName } = await supabase
        .from('teachers')
        .select('teacher_id')
        .eq('school_id', userRow.school_id)
        .ilike('name', (userRow.name || '').trim())
        .maybeSingle();
      if (tName) resolvedTeacherIdFromTeachers = tName.teacher_id;
    }

    // Try in order: teachers.teacher_id → auth user_id (legacy)
    const candidateTeacherIds: string[] = [];
    if (resolvedTeacherIdFromTeachers) candidateTeacherIds.push(resolvedTeacherIdFromTeachers);
    candidateTeacherIds.push(session.user.id);

    let usedTeacherId: string = session.user.id;
    let rows: { class_name: string; subject: string }[] = [];
    for (const candidate of candidateTeacherIds) {
      const { data, error } = await supabase
        .from('teacher_class_subjects')
        .select('class_name, subject')
        .eq('school_id', userRow.school_id)
        .eq('teacher_id', candidate);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      if (data && data.length > 0) {
        rows = data;
        usedTeacherId = candidate;
        break;
      }
    }

    return NextResponse.json({ assignments: rows || [], resolved_teacher_id: usedTeacherId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}


