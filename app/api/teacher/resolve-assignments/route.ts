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

    let teacherId: string | null = null;
    const metaTeacherId = session.user.user_metadata?.teacher_id;
    if (metaTeacherId) {
      const { data: trow } = await supabase
        .from('teachers')
        .select('teacher_id')
        .eq('school_id', userRow.school_id)
        .eq('teacher_id', metaTeacherId)
        .maybeSingle();
      if (trow) teacherId = trow.teacher_id;
    }
    if (!teacherId && userRow.email) {
      const { data: trow } = await supabase
        .from('teachers')
        .select('teacher_id')
        .eq('school_id', userRow.school_id)
        .ilike('email', userRow.email.trim())
        .maybeSingle();
      if (trow) teacherId = trow.teacher_id;
    }
    if (!teacherId && userRow.name) {
      const { data: trow } = await supabase
        .from('teachers')
        .select('teacher_id')
        .eq('school_id', userRow.school_id)
        .ilike('name', userRow.name.trim())
        .maybeSingle();
      if (trow) teacherId = trow.teacher_id;
    }
    if (!teacherId) teacherId = session.user.id;

    const { data: rows, error: tcsErr } = await supabase
      .from('teacher_class_subjects')
      .select('class_name, subject')
      .eq('school_id', userRow.school_id)
      .eq('teacher_id', teacherId);
    if (tcsErr) return NextResponse.json({ error: tcsErr.message }, { status: 500 });

    return NextResponse.json({ assignments: rows || [], resolved_teacher_id: teacherId });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}


