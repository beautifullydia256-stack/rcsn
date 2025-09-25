import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

    const res = NextResponse.next();
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

    // Resolve user's school_id and email
    const { data: userRow, error: userErr } = await supabase
      .from('users')
      .select('school_id,email')
      .eq('user_id', session.user.id)
      .maybeSingle();
    if (userErr || !userRow?.school_id) {
      return NextResponse.json({ error: 'User not linked to a school' }, { status: 400 });
    }

    // Resolve teacher_id from the teachers table
    const { data: teacher, error: teacherErr } = await supabase
      .from('teachers')
      .select('teacher_id')
      .eq('school_id', userRow.school_id)
      .ilike('email', userRow.email || '')
      .maybeSingle();

    if (teacherErr || !teacher?.teacher_id) {
      return NextResponse.json({ error: 'Teacher not found' }, { status: 400 });
    }

    // Fetch assignments for this teacher only
    const { data: rows, error: tcsErr } = await supabase
      .from('teacher_class_subjects')
      .select('class_name, subject')
      .eq('school_id', userRow.school_id)
      .eq('teacher_id', teacher.teacher_id);

    if (tcsErr) {
      return NextResponse.json({ error: tcsErr.message }, { status: 500 });
    }

    return NextResponse.json({ assignments: rows || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Internal error' }, { status: 500 });
  }
}
